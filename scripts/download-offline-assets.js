const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const www = path.join(root, "www");

const files = [
  {
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    target: path.join(www, "models", "pose_landmarker_lite.task")
  },
  {
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs",
    target: path.join(www, "vendor", "mediapipe", "tasks-vision", "vision_bundle.mjs")
  },
  {
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.wasm",
    target: path.join(www, "vendor", "mediapipe", "tasks-vision", "wasm", "vision_wasm_internal.wasm")
  },
  {
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.js",
    target: path.join(www, "vendor", "mediapipe", "tasks-vision", "wasm", "vision_wasm_internal.js")
  }
];

async function download(url, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed ${res.status} ${res.statusText}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(target, buf);
  console.log(`Saved ${path.relative(root, target)} (${buf.length} bytes)`);
}

(async () => {
  for (const file of files) {
    await download(file.url, file.target);
  }
  console.log("Offline assets downloaded.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
