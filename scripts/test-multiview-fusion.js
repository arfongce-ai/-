const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} 함수를 찾지 못했습니다.`);
  const brace = html.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = brace; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

const context = {
  console,
  stableRound: (value) => Number(Number(value).toFixed(3)),
  labelFor: (score) => ({ type: score >= 70 ? "good" : "caution", label: score >= 70 ? "좋음" : "주의" })
};
vm.createContext(context);
vm.runInContext([
  extractFunction("alignFusedSegmentToFront"),
  extractFunction("fuseSegments"),
  extractFunction("fuseSegmentsTriple"),
  "this.alignFusedSegmentToFront = alignFusedSegmentToFront;",
  "this.fuseSegments = fuseSegments;",
  "this.fuseSegmentsTriple = fuseSegmentsTriple;"
].join("\n"), context);

function segment(view, order, startTime, endTime, detectionRate, suffix = "") {
  return {
    cameraView: view,
    order,
    orderLabel: String(order),
    id: `${view}-${order}`,
    name: `${view}-${order}${suffix}`,
    movementType: "test",
    movementNumbers: [order],
    mergedMovementCount: 1,
    mergedMovementNumbers: `${order}번`,
    startTime,
    endTime,
    snapshot: `${view}-${order}.jpg`,
    detectionRate,
    viewConfidence: 1,
    visibilityScore: 90,
    velocityScore: view === "side" ? 88 : 70,
    snapScore: view === "side" ? 86 : 68,
    stillnessScore: 80,
    stanceScore: view === "front" ? 92 : 70,
    gangyu: { classification: "강" }
  };
}

const front = [
  segment("front", 1, 0, 2, 0.95),
  segment("front", 2, 2, 4, 0.55),
  segment("front", 3, 4, 6, 0.95)
];
const side = [
  segment("side", 1, 0.3, 1.8, 0.70),
  segment("side", 2, 1.8, 5.4, 1.00),
  segment("side", 3, 5.4, 7.0, 0.70)
];
const diagonal = [
  segment("diagonal", 1, 0.2, 2.1, 0.80),
  segment("diagonal", 2, 2.1, 5.0, 0.98),
  segment("diagonal", 3, 5.0, 6.8, 0.80)
];

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  console.log(`OK  ${message}`);
}

function assertFrontTimeline(results, label) {
  assert(results.length === front.length, `${label}: 정면 기준 구간 수 유지`);
  results.forEach((result, index) => {
    assert(result.startTime === front[index].startTime && result.endTime === front[index].endTime,
      `${label}: ${index + 1}번 시간이 정면 영상 기준`);
    assert(result.order === front[index].order && result.id === front[index].id && result.name === front[index].name,
      `${label}: ${index + 1}번 동작 정체성이 정면 기준`);
    if (index > 0) assert(results[index - 1].endTime <= result.startTime, `${label}: ${index + 1}번 시간 단조 증가`);
  });
}

const dual = context.fuseSegments(front, side);
assertFrontTimeline(dual, "2대 융합");
assert(dual[1].velocityScore === side[1].velocityScore, "2대 융합: 측면 속도 강점은 유지");

const triple = context.fuseSegmentsTriple(front, side, diagonal);
assertFrontTimeline(triple, "3대 융합");

console.log("\n다중 카메라 융합 시간축 회귀 테스트 통과");
