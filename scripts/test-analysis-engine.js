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

console.log("Analysis engine synthetic checks passed.");
