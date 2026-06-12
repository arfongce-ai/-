// 경계 탐지(valley prominence) 정확도 회귀 테스트.
// index.html의 refineSegmentBoundaries와 동일한 로직을 합성 데이터로 검증한다.
const fs = require("fs");
const path = require("path");

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// index.html에서 refineSegmentBoundaries 본문을 추출해 실행(소스 드리프트 방지).
const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");
const startMarker = "function refineSegmentBoundaries(duration";
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) { console.error("refineSegmentBoundaries 함수를 찾지 못했습니다."); process.exit(1); }
// 함수 끝(균형 잡힌 중괄호) 찾기
let depth = 0, i = html.indexOf("{", startIdx), end = -1;
for (; i < html.length; i++) {
  if (html[i] === "{") depth++;
  else if (html[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
const fnSource = html.slice(startIdx, end);
// eslint-disable-next-line no-new-func
const refineSegmentBoundaries = new Function("clamp", `${fnSource}; return refineSegmentBoundaries;`)(clamp);

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
function maxErr(pred, truth) {
  const tIn = truth.slice(1, -1), pIn = pred.slice(1, -1);
  let max = 0;
  for (const tb of tIn) { const nearest = Math.min(...pIn.map((p) => Math.abs(p - tb))); max = Math.max(max, nearest); }
  return max;
}
function avgErr(pred, truth) {
  const tIn = truth.slice(1, -1), pIn = pred.slice(1, -1);
  let sum = 0;
  for (const tb of tIn) sum += Math.min(...pIn.map((p) => Math.abs(p - tb)));
  return sum / tIn.length;
}

let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// 불균등 동작에서 평균 경계오차가 충분히 작아야 한다(여러 번 평균).
// 임계값은 스캔 밀도(3.5/초 ≈ 0.29초 간격)의 물리적 한계를 반영한 정직한 값이며,
// 옛 균등분할 알고리즘으로 되돌리면 평균오차가 커져 실패하도록 설정했다.
const scenarios = [
  { name: "균등", b: [0, 2, 4, 6, 8, 10], dur: 10, thresh: 0.25 },
  { name: "앞 길고 뒤 짧음", b: [0, 4, 5, 6, 7, 10], dur: 10, thresh: 0.25 },
  { name: "중간에 긴 동작", b: [0, 1.5, 3, 7, 8.5, 10], dur: 10, thresh: 0.20 },
  { name: "극단적 불균등", b: [0, 0.8, 1.6, 7, 8, 10], dur: 10, thresh: 0.28 },
];
const runs = 200;
for (const sc of scenarios) {
  let total = 0;
  for (let r = 0; r < runs; r++) {
    const samples = synth(sc.b, sc.dur, 3.5, 0.05, 0.55);
    const pred = refineSegmentBoundaries(sc.dur, sc.b.length - 1, samples, 0.95, 0, sc.dur);
    total += avgErr(pred, sc.b);
  }
  const mean = total / runs;
  check(mean <= sc.thresh, `[${sc.name}] 평균 경계오차 ${mean.toFixed(2)}s ≤ ${sc.thresh}s`);
}

// 폴백: 정지가 거의 없어도 정확히 segmentCount+1개 경계를 단조 증가로 반환해야 한다(절대 실패 금지).
for (const stop of [0.5, 0.2, 0.05, 0.0]) {
  const b = [0, 4, 5, 6, 7, 10];
  const samples = synth(b, 10, 3.5, 0.05, stop);
  const pred = refineSegmentBoundaries(10, 5, samples, 0.95, 0, 10);
  const monotonic = pred.every((v, k) => k === 0 || v > pred[k - 1]);
  check(pred.length === 6 && monotonic, `정지깊이 ${stop}: 경계 6개·단조 증가 보장`);
}

// 경계 신뢰도 메타가 기록되어야 한다.
const samples = synth([0, 2, 4, 6, 8, 10], 10, 3.5, 0.05, 0.55);
refineSegmentBoundaries(10, 5, samples, 0.95, 0, 10);
const conf = refineSegmentBoundaries.lastConfidence;
check(conf && Number.isFinite(conf.strongValleys) && Number.isFinite(conf.filledUniform), "경계 신뢰도(valley 수·균등 추정 수) 기록");

console.log(fail ? `\n실패 ${fail}건` : "\n경계 탐지 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
