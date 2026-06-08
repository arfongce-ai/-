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
vm.runInContext(extractFunction("refineSegmentBoundaries"), context);
vm.runInContext(extractFunction("chooseCompletionSnapshotTimes"), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let simulations = 0;
for (const movementCount of [18, 19, 20, 21, 23, 25, 26, 27, 28, 30]) {
  for (let variant = 0; variant < 38; variant += 1) {
    const duration = movementCount * (1.7 + (variant % 5) * 0.08);
    const step = 0.08;
    const samples = [];
    for (let time = 0; time <= duration; time += step) {
      const phase = (time / duration) * movementCount;
      const boundaryDistance = Math.abs(phase - Math.round(phase));
      const jitter = ((variant * 17 + Math.round(time * 100)) % 11) * 0.002;
      samples.push({
        time,
        valid: true,
        motion: boundaryDistance < 0.07 ? 0.02 + jitter : 0.55 + jitter,
      });
    }
    const boundaries = context.refineSegmentBoundaries(duration, movementCount, samples, 0.95);
    const snapshots = context.chooseCompletionSnapshotTimes(boundaries, samples);
    assert(boundaries.length === movementCount + 1, "boundary count must equal movement count plus one");
    assert(boundaries.every((value, index) => index === 0 || value > boundaries[index - 1]), "boundaries must increase");
    assert(snapshots.length === movementCount, "snapshot count must equal movement count");
    snapshots.forEach((time, index) => {
      assert(time >= boundaries[index] && time <= boundaries[index + 1], "snapshot must remain inside its segment");
    });
    simulations += 1;
  }
}

for (let variant = 0; variant < 4; variant += 1) {
  const duration = 18 * 2;
  const samples = Array.from({ length: 451 }, (_, index) => ({
    time: index * 0.08,
    valid: index % 31 !== variant,
    motion: index % 25 === 0 ? 0.02 : 0.6,
  }));
  const boundaries = context.refineSegmentBoundaries(duration, 18, samples, 0.95);
  const snapshots = context.chooseCompletionSnapshotTimes(boundaries, samples);
  assert(boundaries.length === 19, "missing-pose simulation boundary count must remain intact");
  assert(snapshots.every((time, index) => time >= boundaries[index] && time <= boundaries[index + 1]), "missing-pose snapshots must remain inside segments");
  simulations += 1;
}

assert(simulations === 384, "exactly 384 mapping simulations must run");
console.log(`Segment mapping cross-check passed: ${simulations} simulations.`);
