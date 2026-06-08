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
};
vm.createContext(context);
vm.runInContext(extractFunction("chooseSampleCount"), context);
vm.runInContext(extractFunction("selectReusableSegmentFrames"), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`OK  ${message}`);
}

function simulate(duration, movementCount, missingEvery = 0) {
  const scanCount = context.clamp(Math.round(duration * 3.5), movementCount * 5, 320);
  const scanFrames = Array.from({ length: scanCount }, (_, index) => ({
    time: (duration - 0.04) * (index / Math.max(scanCount - 1, 1)),
    landmarks: missingEvery && index % missingEvery === 0 ? null : { detected: true },
  }));
  let legacySegmentDetections = 0;
  let preciseFallbackDetections = 0;
  let reused = 0;
  let largestGap = 0;
  for (let index = 0; index < movementCount; index += 1) {
    const start = duration * (index / movementCount);
    const end = duration * ((index + 1) / movementCount);
    const sampleCount = context.chooseSampleCount(end - start);
    legacySegmentDetections += sampleCount;
    const selected = context.selectReusableSegmentFrames(scanFrames, start, end, sampleCount);
    if (selected.length === sampleCount) {
      reused += sampleCount;
      selected.forEach((frame, sampleIndex) => {
        const ratio = 0.08 + (0.84 * sampleIndex) / Math.max(sampleCount - 1, 1);
        const target = start + (end - start) * ratio;
        largestGap = Math.max(largestGap, Math.abs(frame.time - target));
      });
    } else {
      preciseFallbackDetections += sampleCount;
    }
  }
  return {
    scanCount,
    legacySegmentDetections,
    preciseFallbackDetections,
    reused,
    largestGap,
    reduction: reused / (scanCount + legacySegmentDetections),
  };
}

const commonCases = [
  simulate(45, 18),
  simulate(60, 18),
  simulate(75, 25),
  simulate(90, 30),
];
assert(commonCases.every((item) => item.preciseFallbackDetections === 0), "normal videos reuse all segment pose frames");
assert(commonCases.every((item) => item.largestGap <= 0.18), "all reused frames remain within the 0.18-second reliability guard");
assert(commonCases.every((item) => item.reduction >= 0.20), "normal videos avoid at least 20% of total pose detections");

const missingPoseCase = simulate(60, 18, 3);
assert(missingPoseCase.preciseFallbackDetections > 0, "missing scan poses trigger precise fallback");
assert(missingPoseCase.reused + missingPoseCase.preciseFallbackDetections === missingPoseCase.legacySegmentDetections, "reuse and fallback preserve the requested segment sample count");

const averageReduction = commonCases.reduce((sum, item) => sum + item.reduction, 0) / commonCases.length;
console.log(`Estimated pose-detection reduction across common cases: ${(averageReduction * 100).toFixed(1)}%`);
