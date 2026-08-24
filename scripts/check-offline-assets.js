const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const POOMSAE_VIDEO_FILES = [
  "품새_태극1장.mp4",
  "품새_태극2장.mp4",
  "품새_태극3장.mp4",
  "품새_태극4장.mp4",
  "품새_태극5장.mp4",
  "품새_태극6장.mp4",
  "품새_태극7장.mp4",
  "품새_태극8장.mp4",
  "품새_금강.mp4",
  "품새_태백.mp4",
  "품새_평원.mp4",
  "품새_십진.mp4",
  "품새_지태.mp4",
  "품새_천권.mp4",
  "품새_한수.mp4",
  "품새_일여.mp4",
  "품새_고려.mp4",
];
const required = [
  ...POOMSAE_VIDEO_FILES.map((file) => `videos/${file}`),
  ...POOMSAE_VIDEO_FILES.map((file) => `www/videos/${file}`),
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
  "www/index.html",
  "www/assets/momgagym-logo.jpg",
  "www/assets/partner-taekwondo-logos.png",
  "www/assets/app-icon-192.png",
  "www/assets/app-icon-512.png",
  "www/assets/app-icon-1024.png",
  "www/assets/fonts/NotoSerifKR-SemiBold.woff2",
  "www/assets/fonts/NotoSerifKR-Bold.woff2",
  "www/assets/fonts/NotoSerifKR-Black.woff2",
  "www/manifest.webmanifest",
  "www/service-worker.js",
  "www/models/pose_landmarker_lite.task",
  "www/models/action-quality-v1.json",
  "www/models/taegeuk-1-textbook-reference.json",
  "www/models/taegeuk-2-textbook-reference.json",
  "www/models/taegeuk-3-textbook-reference.json",
  "www/models/taegeuk-4-textbook-reference.json",
  "www/models/taegeuk-5-textbook-reference.json",
  "www/models/taegeuk-5-video-reference.json",
  "www/models/taegeuk-6-textbook-reference.json",
  "www/models/taegeuk-6-video-reference.json",
  "www/models/koryo-textbook-reference.json",
  "www/models/koryo-video-reference.json",
  "www/models/taegeuk-7-textbook-reference.json",
  "www/models/taegeuk-7-video-reference.json",
  "www/models/taegeuk-8-textbook-reference.json",
  "www/models/taegeuk-8-video-reference.json",
  "www/models/keumgang-textbook-reference.json",
  "www/models/keumgang-video-reference.json",
  "www/models/taebaek-textbook-reference.json",
  "www/models/taebaek-video-reference.json",
  "www/models/pyongwon-textbook-reference.json",
  "www/models/pyongwon-video-reference.json",
  "www/models/sipjin-textbook-reference.json",
  "www/models/sipjin-video-reference.json",
  "www/models/jitae-textbook-reference.json",
  "www/models/jitae-video-reference.json",
  "www/models/cheonkwon-textbook-reference.json",
  "www/models/cheonkwon-video-reference.json",
  "www/models/hansu-textbook-reference.json",
  "www/models/hansu-video-reference.json",
  "www/models/ilyeo-textbook-reference.json",
  "www/models/ilyeo-video-reference.json",
  "www/action-model.mjs",
  "www/textbook-pose-match.mjs",
  "www/video-reference-match.mjs",
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
