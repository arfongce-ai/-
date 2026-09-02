const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const brace = html.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < html.length; i += 1) {
    if (html[i] === "{") depth += 1;
    else if (html[i] === "}" && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`${name} end not found`);
}
const context = { STANDARD_LANDSCAPE_ASPECT: 4 / 3, STANDARD_PORTRAIT_ASPECT: 3 / 4 };
vm.createContext(context);
vm.runInContext([
  extractFunction("standardMediaOrientation"),
  extractFunction("standardMediaAspect"),
  extractFunction("standardMediaSize"),
  "this.standardMediaOrientation = standardMediaOrientation;",
  "this.standardMediaAspect = standardMediaAspect;",
  "this.standardMediaSize = standardMediaSize;"
].join("\n"), context);
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(context.standardMediaOrientation(1920, 1080) === "landscape", "landscape orientation");
assert(context.standardMediaOrientation(1080, 1920) === "portrait", "portrait orientation");
assert(context.standardMediaAspect(1920, 1080).label === "4:3", "landscape standard aspect");
assert(context.standardMediaAspect(1080, 1920).label === "3:4", "portrait standard aspect");
const landscape = context.standardMediaSize(1920, 1080, 1280);
const portrait = context.standardMediaSize(1080, 1920, 1280);
assert(landscape.width === 1280 && landscape.height === 960, "landscape output size");
assert(portrait.width === 960 && portrait.height === 1280, "portrait output size");
assert(html.includes("capture-media-frame") && html.includes("applyStandardMediaAspect"), "standard frame wiring");
const rotationSource = extractFunction("captureRotationDeg");
const previewOrientationSource = extractFunction("syncCapturePreviewOrientation");
assert(/return 0;/.test(rotationSource), "camera preview must not be manually quarter-turned");
assert(!/rotate\(/.test(previewOrientationSource), "camera preview orientation must not apply CSS rotation");
assert(!/scale\(/.test(previewOrientationSource), "camera orientation sync must not resize the preview");
assert(/capturePreview\.style\.transform\s*=\s*"none"/.test(previewOrientationSource), "camera preview transform reset");
assert(/requestCaptureStream\(requestedLandscape\)/.test(html), "camera stream must request the current device orientation");
assert(/window\.addEventListener\("orientationchange", handleCaptureOrientationChange\)/.test(html), "orientation change handler wiring");
console.log("Orientation/aspect tests passed.");
