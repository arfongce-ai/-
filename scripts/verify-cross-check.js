const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webIndexPath = path.join(root, "www", "index.html");
const androidIndexPath = path.join(root, "android", "app", "src", "main", "assets", "public", "index.html");
const buildStepsPath = path.join(root, "APK-BUILD-STEPS.md");

const expectedVisiblePoomsae = [
  "taegeuk_1",
  "taegeuk_2",
  "taegeuk_3",
  "taegeuk_4",
  "taegeuk_5",
  "taegeuk_6",
  "taegeuk_7",
  "taegeuk_8",
];

const failures = [];
const warnings = [];

function readUtf8(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function pass(label) {
  console.log(`OK  ${label}`);
}

function fail(label) {
  failures.push(label);
  console.error(`ERR ${label}`);
}

function warn(label) {
  warnings.push(label);
  console.warn(`WARN ${label}`);
}

function extractSelectOptions(html) {
  const selectMatch = html.match(/<select id="poomsaeSelect"[\s\S]*?<\/select>/);
  if (!selectMatch) return [];
  return [...selectMatch[0].matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
}

function countArrayItems(arraySource) {
  return [...arraySource.matchAll(/"([^"]+)"/g)].length;
}

function extractPoomsaeDefinitions(html) {
  const result = new Map();
  const oneStart = html.indexOf("taegeuk_1:");
  const twoStart = html.indexOf("taegeuk_2:", oneStart);
  if (oneStart >= 0 && twoStart > oneStart) {
    const oneBlock = html.slice(oneStart, twoStart);
    const countMatch = oneBlock.match(/count:\s*(\d+)/);
    result.set("taegeuk_1", {
      count: countMatch ? Number(countMatch[1]) : NaN,
      actual: [...oneBlock.matchAll(/\["/g)].length,
      source: "movements",
    });
  }

  for (const match of html.matchAll(/(taegeuk_[2-8]):\s*\{[^}]*?count:\s*(\d+)[^}]*?pattern:\s*\[([^\]]*)\]/g)) {
    result.set(match[1], {
      count: Number(match[2]),
      actual: countArrayItems(match[3]),
      source: "pattern",
    });
  }

  for (const match of html.matchAll(/([a-z_]+):\s*\{[^}]*?count:\s*(\d+)[^}]*?pattern:\s*makeMvpPattern\((\d+)/g)) {
    if (!result.has(match[1])) {
      result.set(match[1], {
        count: Number(match[2]),
        actual: Number(match[3]),
        source: "makeMvpPattern",
      });
    }
  }

  return result;
}

function assertContains(html, token, label) {
  if (html.includes(token)) pass(label);
  else fail(label);
}

function assertNotContainsInFiles(token, files, label) {
  const matches = files.filter((filePath) => readUtf8(filePath).includes(token));
  if (matches.length === 0) pass(label);
  else fail(`${label}: ${matches.map((filePath) => path.relative(root, filePath)).join(", ")}`);
}

const webHtml = readUtf8(webIndexPath);
const androidHtml = readUtf8(androidIndexPath);
const hasAndroidProject = fs.existsSync(path.join(root, "android"));

if (!webHtml) fail("www/index.html 파일을 읽을 수 없습니다.");
if (!androidHtml && hasAndroidProject) fail("Android public index.html 파일을 읽을 수 없습니다. npm run android:sync가 필요합니다.");
if (!androidHtml && !hasAndroidProject) warn("GitHub/Cloudflare 업로드용 폴더라 Android assets 검사를 건너뜁니다.");

if (webHtml && androidHtml) {
  if (webHtml === androidHtml) pass("웹 index.html과 Android assets index.html 일치");
  else fail("웹 index.html과 Android assets index.html 불일치: npm run android:sync 필요");
}

const scriptMatch = webHtml.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  fail("inline module script 누락");
} else {
  try {
    new Function(scriptMatch[1]);
    pass("inline module script 문법 파싱 성공");
  } catch (error) {
    fail(`inline module script 문법 오류: ${error.message}`);
  }
}

const visibleOptions = extractSelectOptions(webHtml);
if (JSON.stringify(visibleOptions) === JSON.stringify(expectedVisiblePoomsae)) {
  pass("1차 MVP 선택 품새는 태극 1장~8장만 노출");
} else {
  fail(`선택 품새 불일치: ${visibleOptions.join(", ")}`);
}

const definitions = extractPoomsaeDefinitions(webHtml);
for (const key of expectedVisiblePoomsae) {
  const data = definitions.get(key);
  if (!data) {
    fail(`${key} 데이터 정의 누락`);
    continue;
  }
  if (data.count === data.actual) {
    pass(`${key} count=${data.count}, ${data.source}=${data.actual} 일치`);
  } else {
    fail(`${key} count=${data.count}, ${data.source}=${data.actual} 불일치`);
  }
}

for (const key of definitions.keys()) {
  if (!expectedVisiblePoomsae.includes(key)) {
    warn(`${key} 데이터는 내부에 남아 있지만 1차 MVP 선택창에서는 숨김`);
  }
}

assertContains(webHtml, "const SEEK_TIMEOUT_MS", "waitForSeek 타임아웃 상수 존재");
assertContains(webHtml, "SEEK_EPSILON_SECONDS", "waitForSeek 동일 시간 즉시 처리 상수 존재");
assertContains(webHtml, "let loadModelPromise = null", "loadModel 동시 호출 방지 플래그 존재");
assertContains(webHtml, "createPoseLandmarkerWithFallback", "GPU 실패 시 CPU 폴백 함수 존재");
assertContains(webHtml, "delegate)", "PoseLandmarker delegate 파라미터화");
assertContains(webHtml, "const totalSegments = results.length", "리포트 구간 수 동적 계산");
assertContains(webHtml, "setupLayout()", "UI 레이아웃 초기화 호출 존재");
assertContains(webHtml, "resultPage", "결과지 별도 페이지 구조 존재");
assertContains(webHtml, "video-dock", "리플레이 고정 패널 CSS/DOM 구조 존재");
assertContains(webHtml, "side-panel", "우측 작업 패널 CSS/DOM 구조 존재");

assertNotContainsInFiles("18개 구간", [webIndexPath, androidIndexPath], "고정 문구 '18개 구간' 제거");
assertNotContainsInFiles("C:\\Users\\MOMGAGYM", [webIndexPath, androidIndexPath, buildStepsPath], "배포 코드/문서의 개인 PC 샘플 경로 제거");

if (failures.length) {
  console.error(`\nCross-check failed: ${failures.length} issue(s)`);
  process.exit(1);
}

console.log(`\nCross-check passed with ${warnings.length} warning(s).`);
