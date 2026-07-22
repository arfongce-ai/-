// "이 결과 정확해요" 확인(confirm_all) 신호가 위치별 정확도 계산에 올바르게 반영되는지
// 검증한다. 배경(2026-07-22 사용자 확인): 지금까지는 "고친" 기록만 데이터가 됐다 — 이제
// 확인도 데이터가 되어 위치별 진짜 정확도(확인/전체)를 계산할 수 있어야 한다.
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");
function extractFn(sig) {
  const s = html.indexOf(sig);
  if (s === -1) { console.error("함수를 찾지 못함:", sig); process.exit(1); }
  let d = 0, i = html.indexOf("{", s), e = -1;
  for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}") { d--; if (d === 0) { e = i + 1; break; } } }
  return html.slice(s, e);
}
function extractConst(sig) {
  const s = html.indexOf(sig);
  if (s === -1) { console.error("상수를 찾지 못함:", sig); process.exit(1); }
  const e = html.indexOf(";", s);
  return html.slice(s, e + 1);
}

const fns = new Function(
  extractConst("const REPORT_MIN_SAMPLES_RULE =") + "\n" +
  extractConst("const REPORT_MIN_SAMPLES_ML =") + "\n" +
  extractConst("const REPORT_BIAS_THRESHOLD_SEC =") + "\n" +
  extractFn("function expandConfirmRecords(records)") + "\n" +
  extractFn("function reportLocationKey(r)") + "\n" +
  extractFn("function analyzeCorrectionRecords(rawRecords)") + "\n" +
  extractFn("function buildCorrectionRuleSuggestions(locations)") + "\n" +
  "return { expandConfirmRecords, reportLocationKey, analyzeCorrectionRecords, buildCorrectionRuleSuggestions };"
)();

let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// 1) confirm_all 1건(boundary_count=5)이 정확히 5개의 위치별 confirm으로 펼쳐진다.
{
  const out = fns.expandConfirmRecords([{ action: "confirm_all", poomsae: "taegeuk_1", boundary_count: 5, ts: "t" }]);
  check(out.length === 5, `confirm_all 1건 → confirm ${out.length}건(기대 5)`);
  check(out.every((r) => r.action === "confirm"), "펼쳐진 기록은 모두 action=confirm");
  check(new Set(out.map((r) => r.boundary_index)).size === 5, "boundary_index가 0~4로 각각 다름");
}

// 2) confirm_all이 아닌 기록은 그대로 통과한다(다른 액션 오염 없음).
{
  const out = fns.expandConfirmRecords([{ action: "adjust", boundary_index: 2, poomsae: "taegeuk_1" }]);
  check(out.length === 1 && out[0].action === "adjust", "confirm_all이 아닌 기록은 그대로 통과");
}

// 3) 한 위치가 여러 번 확인만 됐으면(수정 없음) 정확도 100%, 규칙 제안은 안 생긴다.
{
  const records = [
    { action: "confirm_all", poomsae: "taegeuk_1", boundary_count: 3, ts: "t1" },
    { action: "confirm_all", poomsae: "taegeuk_1", boundary_count: 3, ts: "t2" },
    { action: "confirm_all", poomsae: "taegeuk_1", boundary_count: 3, ts: "t3" },
    { action: "confirm_all", poomsae: "taegeuk_1", boundary_count: 3, ts: "t4" },
  ];
  const { locations } = fns.analyzeCorrectionRecords(records);
  const loc0 = locations.find((l) => l.location === "taegeuk_1#0");
  check(loc0.total === 4, `위치#0 표본 4건(실제: ${loc0.total})`);
  check(loc0.accuracy_rate === 1, `위치#0 정확도 100%(실제: ${loc0.accuracy_rate})`);
  const suggestions = fns.buildCorrectionRuleSuggestions(locations);
  check(suggestions.length === 0, "전부 확인만 됐으면 규칙 제안 없음");
}

// 4) 확인과 조정이 섞이면 정확도가 비율대로 계산된다(2 조정 + 8 확인 = 10건 중 8건 정확 → 80%).
{
  const records = [];
  for (let i = 0; i < 2; i += 1) records.push({ action: "adjust", boundary_index: 5, poomsae: "taegeuk_3", delta_seconds: 0.4, ts: `a${i}` });
  for (let i = 0; i < 8; i += 1) records.push({ action: "confirm_all", poomsae: "taegeuk_3", boundary_count: 6, ts: `c${i}` }); // 위치 0~5, #5도 포함
  const { locations } = fns.analyzeCorrectionRecords(records);
  const loc5 = locations.find((l) => l.location === "taegeuk_3#5");
  check(loc5.total === 10, `위치#5 표본 10건(실제: ${loc5.total})`);
  check(Math.abs(loc5.accuracy_rate - 0.8) < 0.001, `위치#5 정확도 80%(실제: ${loc5.accuracy_rate})`);
  check(loc5.confidence === "rule_ready", `표본 10건이면 규칙 보정 가능 등급(실제: ${loc5.confidence})`);
}

// 5) 제안 카드에 accuracy_rate/total_reviews가 실려서 화면에 표시할 수 있어야 한다.
{
  const records = [];
  for (let i = 0; i < 8; i += 1) records.push({ action: "adjust", boundary_index: 2, poomsae: "taegeuk_4", delta_seconds: 0.3, ts: `a${i}` });
  for (let i = 0; i < 2; i += 1) records.push({ action: "confirm_all", poomsae: "taegeuk_4", boundary_count: 3, ts: `c${i}` });
  const { locations } = fns.analyzeCorrectionRecords(records);
  const suggestions = fns.buildCorrectionRuleSuggestions(locations);
  const s = suggestions.find((x) => x.location === "taegeuk_4#2");
  check(!!s, "체계적 치우침이 제안으로 생성됨");
  check(s.accuracy_rate != null, "제안 객체에 accuracy_rate 포함됨(화면 배지용)");
  check(s.total_reviews === 10, `제안 객체에 total_reviews=10 포함(실제: ${s.total_reviews})`);
}

// 6) Node용 scripts/analyze-corrections.js와 동일 입력에 대해 같은 정확도를 내야 한다
//    (두 곳에 로직이 있으므로 계속 동기화돼야 함 — 코드 주석에 명시된 제약).
{
  const { execFileSync } = require("child_process");
  const tmpIn = path.join(require("os").tmpdir(), `confirm-cross-check-${Date.now()}.json`);
  const tmpOutDir = path.join(require("os").tmpdir(), `confirm-cross-check-out-${Date.now()}`);
  const records = [
    { action: "adjust", boundary_index: 7, poomsae: "taegeuk_5", delta_seconds: 0.2, ts: "a1" },
    { action: "adjust", boundary_index: 7, poomsae: "taegeuk_5", delta_seconds: 0.25, ts: "a2" },
    { action: "confirm_all", poomsae: "taegeuk_5", boundary_count: 9, ts: "c1" },
  ];
  fs.writeFileSync(tmpIn, JSON.stringify(records));
  execFileSync("node", [path.join(__dirname, "analyze-corrections.js"), tmpIn, tmpOutDir]);
  const nodeResult = JSON.parse(fs.readFileSync(path.join(tmpOutDir, "correction-analysis.json"), "utf8"));
  const nodeLoc7 = nodeResult.locations.find((l) => l.location === "taegeuk_5#7");
  const { locations: browserLocations } = fns.analyzeCorrectionRecords(records);
  const browserLoc7 = browserLocations.find((l) => l.location === "taegeuk_5#7");
  check(nodeLoc7.accuracy_rate === browserLoc7.accuracy_rate,
    `Node/브라우저 정확도 일치(Node: ${nodeLoc7.accuracy_rate}, 브라우저: ${browserLoc7.accuracy_rate})`);
  check(nodeLoc7.total === browserLoc7.total, `Node/브라우저 표본수 일치(${nodeLoc7.total} vs ${browserLoc7.total})`);
  fs.rmSync(tmpIn, { force: true });
  fs.rmSync(tmpOutDir, { recursive: true, force: true });
}

console.log(fail ? `\n실패 ${fail}건` : "\n확인 신호·정확도 계산 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
