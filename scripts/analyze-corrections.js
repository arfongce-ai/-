#!/usr/bin/env node
/**
 * analyze-corrections.js
 * ──────────────────────────────────────────────────────────────────────────
 * 목적: 앱이 모은 '보정 기록(correction log)'을 읽어, 어떤 품새의 몇 번째
 *       동작에서 자동 분석이 자주·어느 방향으로 틀리는지 집계한다.
 *       이 결과는 "AI 학습"의 전 단계인 '규칙 보정(2단계)'의 직접 재료다.
 *
 * 입력: 앱 화면의 "보정 기록 내보내기"로 받은 JSON 파일
 *       (poomsae-corrections-YYYY-MM-DD.json), 형식은 기록 배열.
 *       Firestore에서 corrections 컬렉션을 통째로 export 한 JSON도 지원
 *       (배열이거나 {docId: record} 객체 형태 모두 허용).
 *
 * 사용:
 *   node scripts/analyze-corrections.js <입력.json> [출력디렉토리]
 *   node scripts/analyze-corrections.js exports/*.json out/
 *   (여러 파일을 주면 합쳐서 분석)
 *
 * 출력:
 *   - 콘솔: 사람이 읽을 요약(가장 문제 많은 동작 순)
 *   - out/correction-analysis.json : 기계가 읽을 집계 결과
 *   - out/rule-suggestions.json    : 규칙 보정 제안(동작별 권장 조정값)
 *
 * 학습 가능성 판단 임계치(자유롭게 조정):
 *   - 동작별 표본 N >= MIN_SAMPLES_RULE 이면 '규칙 보정' 신뢰 가능
 *   - 동작별 표본 N >= MIN_SAMPLES_ML   이면 'ML 검토' 후보
 */

const fs = require("fs");
const path = require("path");

// ── 신뢰 임계치 ─────────────────────────────────────────────────────────
const MIN_SAMPLES_RULE = 10; // 이 이상이면 규칙 보정 권고가 통계적으로 의미
const MIN_SAMPLES_ML = 200;  // 이 이상이면 그 동작은 ML 데이터셋 후보로 충분
// 평균 이동량이 이 값(초)을 넘으면 '자동 기본값이 치우쳐 있다'고 본다.
const BIAS_THRESHOLD_SEC = 0.15;

// ── 입력 파싱 ───────────────────────────────────────────────────────────
function loadRecords(files) {
  const all = [];
  for (const f of files) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(f, "utf8"));
    } catch (e) {
      console.error(`! 읽기 실패(건너뜀): ${f} — ${e.message}`);
      continue;
    }
    // 허용 형태: [ ... ]  또는  { docId: {...}, ... }  또는 { log:[...] }
    let arr;
    if (Array.isArray(raw)) arr = raw;
    else if (Array.isArray(raw.log)) arr = raw.log;
    else if (raw && typeof raw === "object") arr = Object.values(raw);
    else arr = [];
    arr.forEach((r) => { if (r && (r.action || r.kind)) all.push(r); });
  }
  return all;
}

// 최종확정형(kind:"final_boundaries") 기록을 동작별 경계 이동으로 펼친다.
// auto vs final 경계를 비교해, 위치가 바뀐 경계마다 가상의 'adjust' 기록을 만든다.
// 이렇게 하면 기존 동작별 집계 로직을 그대로 재사용할 수 있다.
function expandFinalRecords(records) {
  const out = [];
  for (const r of records) {
    if (r.kind !== "final_boundaries") { out.push(r); continue; }
    const auto = Array.isArray(r.auto_boundaries) ? r.auto_boundaries : [];
    const fin = Array.isArray(r.final_boundaries) ? r.final_boundaries : [];
    // 경계 개수가 같으면 같은 인덱스끼리 이동량 비교(adjust로 환산).
    if (auto.length === fin.length) {
      for (let i = 1; i < auto.length - 1; i += 1) { // 내부 경계만
        const delta = Number((fin[i] - auto[i]).toFixed(3));
        if (Math.abs(delta) < 0.001) continue;
        out.push({
          ts: r.ts, poomsae: r.poomsae, poomsae_name: r.poomsae_name,
          video_duration: r.video_duration, auto_method: r.auto_method,
          action: "adjust", boundary_index: i,
          auto_time: auto[i], user_time: fin[i], delta_seconds: delta,
          _from_final: true
        });
      }
    } else if (fin.length > auto.length) {
      // 경계가 늘었다 = 과소분할을 사용자가 나눴다(split 경향).
      out.push({ ts:r.ts, poomsae:r.poomsae, poomsae_name:r.poomsae_name,
        action:"split", segment_index:0, split_ratio:0.5, _from_final:true });
    } else {
      // 경계가 줄었다 = 과분할을 사용자가 합쳤다(merge 경향).
      out.push({ ts:r.ts, poomsae:r.poomsae, poomsae_name:r.poomsae_name,
        action:"merge", merged_segment_index:0, _from_final:true });
    }
  }
  return out;
}

// 동작을 식별하는 키. 자동 분석이 틀린 '위치'를 품새+세그먼트 인덱스로 잡는다.
// merge/split은 segment 기준, adjust는 boundary 기준이라 살짝 다르지만
// 둘 다 "i번째 경계/구간"이라는 위치 정보를 공유한다.
function locationKey(r) {
  const p = r.poomsae || r.poomsae_name || "unknown";
  let idx = "?";
  if (r.action === "adjust") idx = r.boundary_index;
  else if (r.action === "split") idx = r.segment_index;
  else if (r.action === "merge") idx = r.merged_segment_index;
  return `${p}#${idx}`;
}

function analyze(records) {
  const byLocation = new Map();   // locationKey -> 집계
  const byPoomsae = new Map();    // poomsae -> 카운트

  for (const r of records) {
    const key = locationKey(r);
    const p = r.poomsae || r.poomsae_name || "unknown";

    if (!byLocation.has(key)) {
      byLocation.set(key, {
        location: key,
        poomsae: p,
        poomsae_name: r.poomsae_name || "",
        segment_index: r.action === "adjust" ? r.boundary_index
                      : r.action === "split" ? r.segment_index
                      : r.merged_segment_index,
        counts: { merge: 0, split: 0, adjust: 0 },
        adjust_deltas: [],   // adjust의 delta_seconds 모음(부호 = 방향)
        split_ratios: [],    // split의 split_at 위치 비율
        total: 0
      });
    }
    const e = byLocation.get(key);
    e.counts[r.action] = (e.counts[r.action] || 0) + 1;
    e.total += 1;
    if (r.action === "adjust" && typeof r.delta_seconds === "number") {
      e.adjust_deltas.push(r.delta_seconds);
    }
    if (r.action === "split" && typeof r.split_ratio === "number") {
      e.split_ratios.push(r.split_ratio);
    }
    byPoomsae.set(p, (byPoomsae.get(p) || 0) + 1);
  }

  // 통계 계산
  const locations = [];
  for (const e of byLocation.values()) {
    const d = e.adjust_deltas;
    const mean = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
    const variance = d.length
      ? d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length : 0;
    const std = Math.sqrt(variance);
    // 같은 방향으로 일관되게 옮기는가? (부호 일치율)
    const pos = d.filter((x) => x > 0).length;
    const neg = d.filter((x) => x < 0).length;
    const directionAgreement = d.length
      ? Math.max(pos, neg) / d.length : 0;

    locations.push({
      ...e,
      adjust_mean_delta: Number(mean.toFixed(3)),
      adjust_std: Number(std.toFixed(3)),
      direction_agreement: Number(directionAgreement.toFixed(2)),
      // '치우침'이 분명한가: 평균 이동이 임계 넘고 방향이 일관될 때
      systematic_bias: Math.abs(mean) >= BIAS_THRESHOLD_SEC && directionAgreement >= 0.7,
      confidence: e.total >= MIN_SAMPLES_ML ? "ml_ready"
                : e.total >= MIN_SAMPLES_RULE ? "rule_ready"
                : "insufficient"
    });
  }

  // 문제 큰 순: 총 보정 수 기준 내림차순
  locations.sort((a, b) => b.total - a.total);

  return { locations, byPoomsae: Object.fromEntries(byPoomsae) };
}

// 규칙 보정 제안 생성: '체계적 치우침'이 확인된 동작에 대해 권장 조정값을 만든다.
function buildRuleSuggestions(locations) {
  const suggestions = [];
  for (const loc of locations) {
    if (loc.confidence === "insufficient") continue;

    // adjust 치우침 → 자동 경계 기본값을 mean만큼 옮기라는 제안
    if (loc.systematic_bias) {
      suggestions.push({
        location: loc.location,
        poomsae: loc.poomsae,
        segment_index: loc.segment_index,
        type: "boundary_shift",
        recommend_shift_seconds: loc.adjust_mean_delta,
        reason: `사용자 ${loc.counts.adjust}명이 이 경계를 평균 ${loc.adjust_mean_delta}s `
              + `${loc.adjust_mean_delta > 0 ? "뒤로" : "앞으로"} 옮김 `
              + `(방향 일치율 ${(loc.direction_agreement * 100).toFixed(0)}%). `
              + `자동 기본 경계를 그만큼 옮기는 것을 권장.`,
        confidence: loc.confidence,
        sample_size: loc.counts.adjust
      });
    }

    // merge 다발 → 자동이 한 동작을 둘로 과분할하는 경향
    if (loc.counts.merge >= MIN_SAMPLES_RULE && loc.counts.merge > loc.counts.split * 2) {
      suggestions.push({
        location: loc.location,
        poomsae: loc.poomsae,
        segment_index: loc.segment_index,
        type: "over_segmentation",
        reason: `이 위치에서 합치기 ${loc.counts.merge}건(나누기 ${loc.counts.split}건). `
              + `자동 분석이 한 동작을 둘로 쪼개는 경향 → 이 구간의 경계 민감도(sensitivity)를 낮추거나 `
              + `최소 구간 길이를 늘리는 것을 권장.`,
        confidence: loc.confidence,
        sample_size: loc.counts.merge
      });
    }

    // split 다발 → 자동이 두 동작을 하나로 합쳐 인식(과소분할)
    if (loc.counts.split >= MIN_SAMPLES_RULE && loc.counts.split > loc.counts.merge * 2) {
      const ratios = loc.split_ratios;
      const meanRatio = ratios.length
        ? Number((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(3)) : null;
      suggestions.push({
        location: loc.location,
        poomsae: loc.poomsae,
        segment_index: loc.segment_index,
        type: "under_segmentation",
        recommend_split_ratio: meanRatio,
        reason: `이 위치에서 나누기 ${loc.counts.split}건(합치기 ${loc.counts.merge}건). `
              + `자동 분석이 두 동작을 하나로 묶는 경향 → 경계 민감도를 높이거나, `
              + (meanRatio != null ? `구간의 ${Math.round(meanRatio * 100)}% 지점에 경계를 추가하는 것을 권장.` : "추가 경계 삽입을 권장."),
        confidence: loc.confidence,
        sample_size: loc.counts.split
      });
    }
  }
  return suggestions;
}

// ── 메인 ────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("사용법: node scripts/analyze-corrections.js <입력.json> [입력2.json ...] [출력디렉토리]");
    process.exit(1);
  }
  // 마지막 인자가 디렉토리(또는 .json이 아니면)면 출력 폴더로 본다.
  let outDir = "out";
  let files = args;
  const last = args[args.length - 1];
  if (!last.toLowerCase().endsWith(".json")) {
    outDir = last;
    files = args.slice(0, -1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const records = expandFinalRecords(loadRecords(files));
  if (records.length === 0) {
    console.error("! 유효한 보정 기록이 없습니다. 입력 파일을 확인하세요.");
    process.exit(2);
  }

  const { locations, byPoomsae } = analyze(records);
  const suggestions = buildRuleSuggestions(locations);

  // ── 콘솔 요약 ──
  const totalActions = records.reduce((a, r) => a, 0) + records.length;
  console.log("\n=== 보정 기록 분석 ===");
  console.log(`총 기록 수: ${records.length}건`);
  console.log(`품새 종류: ${Object.keys(byPoomsae).length}개`);
  console.log(`문제 위치(동작): ${locations.length}곳\n`);

  console.log("── 품새별 보정 건수 ──");
  Object.entries(byPoomsae)
    .sort((a, b) => b[1] - a[1])
    .forEach(([p, n]) => console.log(`  ${p.padEnd(16)} ${n}건`));

  console.log("\n── 보정이 가장 많은 동작 Top 15 ──");
  console.log("  위치               표본  합치기 나누기 이동  평균이동(s) 방향일치 신뢰도");
  locations.slice(0, 15).forEach((l) => {
    console.log(
      `  ${l.location.padEnd(18)} ${String(l.total).padStart(4)}`
      + ` ${String(l.counts.merge).padStart(5)}`
      + ` ${String(l.counts.split).padStart(5)}`
      + ` ${String(l.counts.adjust).padStart(5)}`
      + ` ${String(l.adjust_mean_delta).padStart(9)}`
      + ` ${String((l.direction_agreement * 100).toFixed(0) + "%").padStart(7)}`
      + `  ${l.confidence}`
    );
  });

  console.log(`\n── 규칙 보정 제안: ${suggestions.length}건 ──`);
  suggestions.slice(0, 20).forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.location} (${s.type}, ${s.confidence}, n=${s.sample_size})`);
    console.log(`      ${s.reason}`);
  });

  // ── 학습 가능성 판단 ──
  const mlReady = locations.filter((l) => l.confidence === "ml_ready");
  const ruleReady = locations.filter((l) => l.confidence === "rule_ready");
  console.log("\n── 다음 단계 판단 ──");
  console.log(`  규칙 보정 가능(표본>=${MIN_SAMPLES_RULE}): ${ruleReady.length + mlReady.length}곳`);
  console.log(`  ML 데이터셋 후보(표본>=${MIN_SAMPLES_ML}): ${mlReady.length}곳`);
  if (mlReady.length === 0) {
    console.log("  → 아직 ML 학습 단계는 이릅니다. 우선 위 규칙 보정 제안을 적용하세요.");
  } else {
    console.log("  → 일부 동작은 ML 후보 수준. 단, 관절좌표/영상 입력을 함께 수집해야 실제 학습 가능.");
  }

  // ── 파일 저장 ──
  const outAnalysis = path.join(outDir, "correction-analysis.json");
  const outRules = path.join(outDir, "rule-suggestions.json");
  fs.writeFileSync(outAnalysis, JSON.stringify({ summary: { total: records.length, byPoomsae }, locations }, null, 2));
  fs.writeFileSync(outRules, JSON.stringify(suggestions, null, 2));
  console.log(`\n저장: ${outAnalysis}`);
  console.log(`저장: ${outRules}\n`);
}

main();
