// 경계 탐지(valley 자연 구간) + 동작 길이비례 배분 회귀 테스트.
// index.html의 실제 함수를 추출해 합성 데이터로 검증한다.
const fs = require("fs");
const path = require("path");

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");
function extract(sig) {
  const s = html.indexOf(sig);
  if (s === -1) { console.error("함수를 찾지 못함:", sig); process.exit(1); }
  let d = 0, i = html.indexOf("{", s), e = -1;
  for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}") { d--; if (d === 0) { e = i + 1; break; } } }
  return html.slice(s, e);
}
const fns = new Function("clamp",
  extract("function detectActiveMotionRange(duration") + "\n" +
  extract("function detectNaturalBoundaries(duration") + "\n" +
  extract("function allocateMovementsToSegments(boundaries") + "\n" +
  "return { detectActiveMotionRange, detectNaturalBoundaries, allocateMovementsToSegments };"
)(clamp);

function synth(trueBoundaries, dur, rate, noise, stopDepth) {
  const samples = [];
  const n = Math.round(dur * rate);
  for (let k = 0; k < n; k++) {
    const t = dur * k / (n - 1);
    let dmin = Infinity;
    for (const b of trueBoundaries) dmin = Math.min(dmin, Math.abs(t - b));
    const base = dmin < 0.25 ? (0.6 - stopDepth) : 0.6;
    samples.push({ time: t, motion: Math.max(0, base + (Math.random() - 0.5) * noise), valid: true });
  }
  return samples;
}

let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// 1) 자연 경계 수는 동작 수를 넘지 않고 단조 증가한다.
{
  const dur = 10, mv = 18;
  const samples = synth([0, 4, 5, 6, 7, 10], dur, 3.5, 0.05, 0.55);
  const ar = fns.detectActiveMotionRange(dur, samples);
  const b = fns.detectNaturalBoundaries(dur, samples, 0.95, ar.start, ar.end, mv);
  check(b.length - 1 <= mv && b.length - 1 >= 1, `자연 구간 수(${b.length - 1})가 1~${mv} 범위`);
  check(b.every((v, k) => k === 0 || v > b[k - 1]), "경계 단조 증가 보장");
}

// 2) 동작 배분: 합이 정확히 동작 수, 각 구간 최소 1개, 순서 보존.
{
  for (const segN of [3, 8, 14, 18]) {
    const bounds = Array.from({ length: segN + 1 }, (_, i) => i * (10 / segN));
    const alloc = fns.allocateMovementsToSegments(bounds, 18);
    const flat = alloc.flat();
    const sumOk = flat.length === 18;
    const minOne = alloc.every((a) => a.length >= 1);
    const ordered = flat.every((v, i) => i === 0 || v === flat[i - 1] + 1);
    check(sumOk && minOne && ordered, `구간 ${segN}개: 동작 18개 빠짐없이·순서대로·각 구간 최소1개 배분`);
  }
}

// 3) 긴 구간에 더 많은 동작이 배분된다(길이 비례).
{
  const bounds = [0, 6, 7, 8, 9, 10];
  const alloc = fns.allocateMovementsToSegments(bounds, 18);
  const longestGetsMost = alloc[0].length === Math.max(...alloc.map((a) => a.length));
  check(longestGetsMost, `긴 구간에 가장 많은 동작 배분(${alloc.map((a) => a.length).join(",")})`);
}

// 4) 멈춤이 거의 없어도 안전하게 구간 생성·전체 동작 배분(실패 금지).
{
  const dur = 10;
  for (const stop of [0.5, 0.2, 0.05, 0.0]) {
    const samples = synth([0, 4, 5, 6, 7, 10], dur, 3.5, 0.05, stop);
    const ar = fns.detectActiveMotionRange(dur, samples);
    const b = fns.detectNaturalBoundaries(dur, samples, 0.95, ar.start, ar.end, 18);
    const alloc = fns.allocateMovementsToSegments(b, 18);
    check(b.length >= 2 && alloc.flat().length === 18, `정지깊이 ${stop}: 구간 생성·동작 18개 전부 배분`);
  }
}


// 5) 하이브리드 B: 긴 구간에 얕은 valley가 있으면 추가 분할된다.
{
  const dur = 12;
  // 0~6s에 약한 멈춤(valley) 하나, 6~12s 정상 동작. 강한 임계는 못 넘지만 국소최저점은 존재.
  const samples = [];
  for (let t = 0; t <= dur; t += 0.29) {
    let m = 0.6;
    if (Math.abs(t - 3) < 0.3) m = 0.45;      // 얕은 valley @3s
    if (Math.abs(t - 8) < 0.3) m = 0.05;      // 깊은 valley @8s
    samples.push({ time: t, motion: m + (Math.random() - 0.5) * 0.03, valid: true });
  }
  const ar = fns.detectActiveMotionRange(dur, samples);
  const b = fns.detectNaturalBoundaries(dur, samples, 0.95, ar.start, ar.end, 6);
  // 깊은 valley(8s) + 얕은 valley(3s) 분할로 내부 경계가 2개 이상이어야 함
  const internal = b.length - 2;
  check(internal >= 2, `하이브리드 B: 긴 구간이 얕은 valley로 추가 분할됨(내부 경계 ${internal}개)`);
}

// 6) 하이브리드: valley가 전혀 없는 긴 연속 구간은 분할하지 않고 묶음으로 남긴다(가짜 경계 금지).
{
  const dur = 12;
  const samples = [];
  for (let t = 0; t <= dur; t += 0.29) {
    // 단조 증가 후 단조 감소(중간 valley 없음) — 가짜로 쪼개면 안 됨
    const m = 0.6 - Math.abs(t - 6) * 0.02;
    samples.push({ time: t, motion: Math.max(0.1, m), valid: true });
  }
  const ar = fns.detectActiveMotionRange(dur, samples);
  const b = fns.detectNaturalBoundaries(dur, samples, 0.95, ar.start, ar.end, 6);
  const alloc = fns.allocateMovementsToSegments(b, 6);
  // 동작은 6개 전부 배분되고(묶음 허용), 경계가 동작 수를 넘지 않음
  check(alloc.flat().length === 6 && (b.length - 1) <= 6, "하이브리드: valley 없는 연속구간은 가짜 분할 없이 묶음 처리");
}

console.log(fail ? `\n실패 ${fail}건` : "\n경계 탐지·동작 배분 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
