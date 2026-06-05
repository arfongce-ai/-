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

console.log("Analysis engine synthetic checks passed.");
