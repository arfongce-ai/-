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
};
vm.createContext(context);
vm.runInContext(extractFunction("scoreStillness"), context);
vm.runInContext(extractFunction("chooseSampleCount"), context);
vm.runInContext(extractFunction("detectPoomsaeKeyFromFilename"), context);
vm.runInContext(extractFunction("refineSegmentBoundaries"), context);
vm.runInContext(extractFunction("chooseCompletionSnapshotTimes"), context);
vm.runInContext(extractFunction("detectActiveMotionRange"), context);
vm.runInContext(extractFunction("competitionScoreFromMetrics"), context);
vm.runInContext(extractFunction("referenceDeductionFor"), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`OK  ${message}`);
}

assert(context.scoreStillness(0, 0, "block") === 100, "fully stopped motion receives 100 stillness");
assert(context.scoreStillness(0.5, 0, "block") < 20, "constant continuous motion cannot receive a high stillness score");

const taegeukSamples = context.chooseSampleCount(60 / 18) * 18;
const koryoSamples = context.chooseSampleCount(90 / 30) * 30;
assert(taegeukSamples / 60 <= 2, "60-second Taeguk analysis remains at or below 2 samples/sec");
assert(koryoSamples / 90 <= 2, "90-second Koryo analysis remains at or below 2 samples/sec");
assert(context.chooseSampleCount(0.5) >= 4, "short segments retain enough frames for motion comparison");
assert(context.detectPoomsaeKeyFromFilename("태극2장-연습.mp4") === "taegeuk_2", "Korean Taeguk filename is recognized");
assert(context.detectPoomsaeKeyFromFilename("KORYO_training.mp4") === "koryo", "English poomsae filename is recognized");
assert(context.detectPoomsaeKeyFromFilename("practice-video.mp4") === "", "generic filename does not create a false mismatch warning");

const syntheticMotion = Array.from({ length: 41 }, (_, index) => {
  const time = index * 0.25;
  const nearStop = Math.min(Math.abs(time - 2.25), Math.abs(time - 5.25), Math.abs(time - 7.75));
  return { time, motion: nearStop < 0.15 ? 0.02 : 0.8 };
});
const refined = context.refineSegmentBoundaries(10, 4, syntheticMotion, 0.95);
assert(Math.abs(refined[1] - 2.25) < 0.3, "high sensitivity moves first boundary to nearby motion stop");
assert(Math.abs(refined[2] - 5.25) < 0.3, "high sensitivity moves middle boundary to nearby motion stop");
assert(refined.every((value, index) => index === 0 || value > refined[index - 1]), "refined boundaries remain strictly ordered");
const missingPoseTrap = [
  { time: 2.0, motion: 0.01, valid: false },
  { time: 2.25, motion: 0.3, valid: true },
  { time: 2.5, motion: 0.6, valid: true },
  { time: 5.0, motion: 0.02, valid: true },
  { time: 7.5, motion: 0.02, valid: true }
];
const missingPoseRefined = context.refineSegmentBoundaries(10, 4, missingPoseTrap, 0.95);
assert(missingPoseRefined[1] !== 2.0, "missing pose frame cannot be selected as a false stop boundary");

const localMinimumPreference = [
  { time: 2.0, motion: 0.16, valid: true },
  { time: 2.25, motion: 0.12, valid: true },
  { time: 2.5, motion: 0.14, valid: true },
  { time: 4.75, motion: 0.18, valid: true },
  { time: 5.0, motion: 0.11, valid: true },
  { time: 5.25, motion: 0.15, valid: true },
  { time: 7.25, motion: 0.17, valid: true },
  { time: 7.5, motion: 0.10, valid: true },
  { time: 7.75, motion: 0.16, valid: true }
];
const localMinimumRefined = context.refineSegmentBoundaries(10, 4, localMinimumPreference, 0.95);
assert(Math.abs(localMinimumRefined[1] - 2.25) < 0.01, "local motion minimum is preferred for the first boundary");
assert(Math.abs(localMinimumRefined[2] - 5.0) < 0.01, "local motion minimum is preferred for the middle boundary");
const completionTimes = context.chooseCompletionSnapshotTimes([0, 3, 6], [
  { time: 1.8, motion: 0.4, valid: true },
  { time: 2.3, motion: 0.08, valid: true },
  { time: 2.7, motion: 0.2, valid: true },
  { time: 4.7, motion: 0.3, valid: true },
  { time: 5.4, motion: 0.05, valid: true }
]);
assert(completionTimes[0] === 2.3, "first representative image uses the stillest late-segment skeleton pose");
assert(completionTimes[1] === 5.4, "second representative image uses the stillest late-segment skeleton pose");
const activeRange = context.detectActiveMotionRange(12, [
  { time: 0.5, motion: 0.01, valid: true },
  { time: 1.0, motion: 0.01, valid: true },
  { time: 2.0, motion: 0.8, valid: true },
  { time: 8.0, motion: 0.7, valid: true },
  { time: 10.5, motion: 0.01, valid: true }
]);
assert(activeRange.start > 1.5 && activeRange.start < 2.1, "leading idle time is excluded from movement-name alignment");
assert(activeRange.end > 8.0 && activeRange.end < 8.3, "trailing idle time is excluded from movement-name alignment");
const wtScore = context.competitionScoreFromMetrics({
  visibilityScore: 100, velocityScore: 100, snapScore: 100, stillnessScore: 100, stanceScore: 100
});
assert(wtScore.accuracyScore4 === 4, "perfect measurable accuracy indicators map to 4.0 points");
assert(wtScore.presentationScore6 === 6, "perfect measurable presentation indicators map to 6.0 points");
assert(wtScore.competitionScore10 === 10, "WT reference score is capped at 10.0 points");
const heldDeduction = context.referenceDeductionFor({
  visibilityScore: 55, velocityScore: 20, snapScore: 20, stillnessScore: 20, stanceScore: 20
});
assert(heldDeduction.amount === null, "low pose visibility postpones reference deduction classification");
const minorDeduction = context.referenceDeductionFor({
  visibilityScore: 90, velocityScore: 60, snapScore: 80, stillnessScore: 80, stanceScore: 80
});
assert(minorDeduction.amount === 0.1, "measurable mild weakness maps to a -0.1 reference possibility");
const majorDeduction = context.referenceDeductionFor({
  visibilityScore: 90, velocityScore: 30, snapScore: 80, stillnessScore: 80, stanceScore: 80
});
assert(majorDeduction.amount === 0.3, "measurable severe weakness maps to a -0.3 reference possibility");

console.log("Analysis engine synthetic checks passed.");
