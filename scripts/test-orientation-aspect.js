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
const orientationPluginSource = extractFunction("captureOrientationPlugin");
const requestLandscapeSource = extractFunction("requestLandscape");
const releaseOrientationSource = extractFunction("releaseOrientation");
assert(/return 0;/.test(rotationSource), "camera video must not be manually quarter-turned inside the rotated screen");
assert(!/rotate\(/.test(previewOrientationSource), "camera preview must not use CSS rotation");
assert(!/scale\(/.test(previewOrientationSource), "camera preview must not be resized to fake a wider angle");
assert(/capturePreview\.style\.transform\s*=\s*"none"/.test(previewOrientationSource), "camera preview transform reset");
assert(/ScreenOrientation/.test(orientationPluginSource), "native screen-orientation plugin wiring");
assert(/plugin\.lock\(\{ orientation: "landscape-primary" \}\)/.test(requestLandscapeSource), "camera screen 90-degree landscape lock");
assert(/plugin\.unlock\(\)/.test(releaseOrientationSource), "camera screen orientation unlock");
assert(/await requestLandscape\(\);[\s\S]*?startCamera\(\)/.test(html), "camera must open after the 90-degree screen turn");
assert(/requestCaptureStream\(requestedLandscape\)/.test(html), "camera stream must request the current device orientation");
assert(/window\.addEventListener\("orientationchange", handleCaptureOrientationChange\)/.test(html), "orientation change handler wiring");
const manifest = fs.readFileSync(path.join(__dirname, "..", "android", "app", "src", "main", "AndroidManifest.xml"), "utf8");
assert(/uses-permission\s+android:name="android\.permission\.CAMERA"/.test(manifest), "Android camera permission declaration");
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
assert(packageJson.dependencies?.["@capacitor/screen-orientation"], "Capacitor screen-orientation dependency");
console.log("Orientation/aspect tests passed.");
