const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`${name} function not found`);
  const braceStart = html.indexOf("{", start);
  let depth = 0;
  for (let index = braceStart; index < html.length; index += 1) {
    if (html[index] === "{") depth += 1;
    if (html[index] === "}") depth -= 1;
    if (depth === 0) return html.slice(start, index + 1);
  }
  throw new Error(`${name} function is incomplete`);
}

const context = {
  Math,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  stableRound: (value, step = 5) => Math.round(value / step) * step,
  semanticConnectionRules: {
    taegeuk_1: [
      { id: "T1-C01", movements: [5, 6], title: "5~6번 연결동작", description: "막기 후 지르기", practice: "끝을 고정" },
      { id: "T1-C02", movements: [11, 12], title: "11~12번 연결동작", description: "막기 후 지르기", practice: "끝을 고정" },
    ],
  },
  compoundMovementRules: {
    taegeuk_1: {
      14: { title: "14번 복합동작", stages: ["14-1", "14-2", "14-3", "14-4"], practice: "회수 후 착지" },
      16: { title: "16번 복합동작", stages: ["16-1", "16-2", "16-3", "16-4"], practice: "회수 후 착지" },
    },
  },
};
vm.createContext(context);
vm.runInContext(extractFunction("countMotionPeaks"), context);
vm.runInContext(extractFunction("adaptiveConnectionThreshold"), context);
vm.runInContext(extractFunction("connectionEvidenceFromMotion"), context);
vm.runInContext(extractFunction("compoundStageAnalysis"), context);
vm.runInContext(extractFunction("competitionScoreFromMetrics"), context);
vm.runInContext(extractFunction("labelFor"), context);
vm.runInContext(extractFunction("mergeSemanticConnectionPair"), context);
vm.runInContext(extractFunction("applySemanticSceneRules"), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`OK  ${message}`);
}

const left = {
  startTime: 0,
  endTime: 1,
  stanceScore: 90,
  detectionRate: 0.95,
};
const right = {
  startTime: 1,
  endTime: 2,
  stanceScore: 88,
  detectionRate: 0.95,
};

const fastMotion = [
  { time: 0.0, motion: 0.1, valid: true },
  { time: 0.3, motion: 0.9, valid: true },
  { time: 0.6, motion: 0.4, valid: true },
  { time: 0.9, motion: 0.3, valid: true },
  { time: 1.1, motion: 0.4, valid: true },
  { time: 1.4, motion: 1.0, valid: true },
  { time: 1.7, motion: 0.4, valid: true },
  { time: 2.0, motion: 0.1, valid: true },
];
const longStopMotion = [
  { time: 0.0, motion: 0.1, valid: true },
  { time: 0.3, motion: 0.9, valid: true },
  { time: 0.6, motion: 0.4, valid: true },
  { time: 0.8, motion: 0.02, valid: true },
  { time: 1.0, motion: 0.01, valid: true },
  { time: 1.2, motion: 0.02, valid: true },
  { time: 1.5, motion: 1.0, valid: true },
  { time: 1.8, motion: 0.4, valid: true },
  { time: 2.0, motion: 0.1, valid: true },
];

const fast = context.connectionEvidenceFromMotion(left, right, fastMotion, 1);
const stopped = context.connectionEvidenceFromMotion(left, right, longStopMotion, 1);
const unavailable = context.connectionEvidenceFromMotion(
  { ...left, detectionRate: 0, stanceScore: 0 },
  { ...right, detectionRate: 0, stanceScore: 0 },
  [],
  1
);
const onePeak = context.connectionEvidenceFromMotion(
  left,
  right,
  fastMotion.map((sample) => ({ ...sample, motion: sample.time === 1.4 ? 1 : 0.3 })),
  1
);
assert(fast.motionPeaks >= 2, "fast block-punch connection keeps two motion peaks");
assert(fast.confidence > stopped.confidence, "long middle stop lowers connection confidence");
assert(stopped.estimatedStopSeconds > fast.estimatedStopSeconds, "middle stop duration is reflected in evidence");
assert(unavailable.evidenceAvailable === false, "missing pose samples mark connection evidence unavailable");
assert(unavailable.confidence < 0.3, "missing pose samples cannot create medium connection confidence");
assert(onePeak.motionPeaks < 2 && onePeak.confidence < 0.8, "single detected peak cannot create high connection confidence");
assert(context.adaptiveConnectionThreshold(0.5) === 0.18, "adaptive threshold keeps safe minimum");
assert(context.adaptiveConnectionThreshold(5) === 0.35, "adaptive threshold keeps safe maximum");

const compound = context.compoundStageAnalysis(
  { startTime: 10, endTime: 12, detectionRate: 0.95 },
  fastMotion.map((sample) => ({ ...sample, time: sample.time + 10 })),
  {
    title: "14번 복합동작",
    stages: ["14-1", "14-2", "14-3", "14-4"],
    practice: "회수 후 착지",
  }
);
assert(compound.internalOnly === true, "compound stage labels are marked as app-internal");
assert(compound.stages.length === 4, "compound movement exposes four analysis stages");
assert(compound.stages.every((stage, index) => index === 0 || stage.time > compound.stages[index - 1].time), "compound stage times increase");
assert(compound.stages.every((stage) => stage.time >= 10 && stage.time <= 12), "compound stage times remain inside scene");
assert(compound.stages.every((stage) => stage.estimated === true), "compound stage times are explicitly marked as estimates");

function resultFor(moveNo, startTime) {
  return {
    order: moveNo,
    orderLabel: String(moveNo),
    id: `m${moveNo}`,
    name: `동작 ${moveNo}`,
    movementType: "block",
    movementNumbers: [moveNo],
    mergedMovementCount: 1,
    mergedMovementNumbers: `${moveNo}번`,
    allocConfidence: 1,
    startTime,
    endTime: startTime + 1,
    snapshot: "",
    detected: true,
    detectionRate: 0.95,
    visibilityScore: 90,
    velocityScore: 80,
    snapScore: 80,
    stillnessScore: 80,
    stanceScore: 90,
    powerScore: 85,
    peakSpeed: 1,
    finalSpeed: 0.1,
    endJitter: 0.1,
    cameraView: "front",
    viewConfidence: 0.9,
  };
}

const semanticInput = [5, 6, 11, 12, 14, 16].map((moveNo, index) => resultFor(moveNo, index));
const semanticMotion = Array.from({ length: 49 }, (_, index) => ({
  time: index * 0.125,
  motion: index % 8 === 3 || index % 8 === 6 ? 1 : 0.35,
  valid: true,
}));
const semanticOutput = context.applySemanticSceneRules(semanticInput, semanticMotion, "taegeuk_1");
assert(semanticOutput.filter((segment) => segment.connectionTag).length === 4, "Taeguk 1 semantic rules tag two connection pairs");
assert(semanticOutput.some((segment) => segment.movementNumbers.includes(5) && segment.connectionTag === "5~6번 연결동작"), "5~6 connection keeps official movement 5 visible");
assert(semanticOutput.some((segment) => segment.movementNumbers.includes(6) && segment.connectionTag === "5~6번 연결동작"), "5~6 connection keeps official movement 6 visible");
assert(semanticOutput.filter((segment) => segment.compoundScene).length === 2, "Taeguk 1 compound rules annotate movements 14 and 16");
assert(semanticOutput.every((segment) => segment.referenceDeduction?.amount !== 0.1 && segment.referenceDeduction?.amount !== 0.3), "connection scenes do not auto-confirm individual deductions");

console.log("Semantic connection and compound scene checks passed.");
