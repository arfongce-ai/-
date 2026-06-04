const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "www/index.html",
  "www/models/pose_landmarker_lite.task",
  "www/vendor/mediapipe/tasks-vision/vision_bundle.mjs",
  "www/vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm",
  "www/vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.js"
];

let ok = true;

for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    ok = false;
    console.error(`MISSING ${rel}`);
    continue;
  }
  const size = fs.statSync(full).size;
  if (size <= 0) {
    ok = false;
    console.error(`EMPTY ${rel}`);
    continue;
  }
  console.log(`OK ${rel} (${size} bytes)`);
}

if (!ok) {
  console.error("\nOffline assets are incomplete. Run: npm run assets:download");
  process.exit(1);
}

console.log("\nOffline assets are ready.");
