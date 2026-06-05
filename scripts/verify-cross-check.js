const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webIndexPath = path.join(root, "www", "index.html");
const androidIndexPath = path.join(root, "android", "app", "src", "main", "assets", "public", "index.html");
const buildStepsPath = path.join(root, "APK-BUILD-STEPS.md");

const expectedInitialPoomsae = [
  "taegeuk_1",
  "taegeuk_2",
  "taegeuk_3",
  "taegeuk_4",
  "taegeuk_5",
  "taegeuk_6",
  "taegeuk_7",
  "taegeuk_8",
];

const expectedAllPoomsae = [
  ...expectedInitialPoomsae,
  "koryo",
  "keumgang",
  "taebaek",
  "pyongwon",
  "sipjin",
  "jitae",
  "cheonkwon",
  "hansu",
  "ilyeo",
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

  for (const match of html.matchAll(/([a-z_0-9]+):\s*\{[^}]*?count:\s*(\d+)[^}]*?techniques:\s*\[([\s\S]*?)\]\s*\}/g)) {
    result.set(match[1], {
      count: Number(match[2]),
      actual: countArrayItems(match[3]),
      source: "techniques",
    });
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
if (JSON.stringify(visibleOptions) === JSON.stringify(expectedInitialPoomsae)) {
  pass("초기 선택 품새는 유급자 태극 1장~8장으로 노출");
} else if (visibleOptions.length === 0 && webHtml.includes("renderPoomsaeOptions(selectedPoomsaeGroup, selectedPoomsaeKey)")) {
  pass("초기 선택 품새는 JS에서 유급자 태극 1장~8장으로 동적 생성");
} else {
  fail(`선택 품새 불일치: ${visibleOptions.join(", ")}`);
}

const definitions = extractPoomsaeDefinitions(webHtml);
for (const key of expectedAllPoomsae) {
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
  if (!expectedAllPoomsae.includes(key)) {
    warn(`${key} 데이터는 v3 범위 밖입니다`);
  }
}

assertContains(webHtml, "const SEEK_TIMEOUT_MS", "waitForSeek 타임아웃 상수 존재");
assertContains(webHtml, "SEEK_EPSILON_SECONDS", "waitForSeek 동일 시간 즉시 처리 상수 존재");
assertContains(webHtml, "let loadModelPromise = null", "loadModel 동시 호출 방지 플래그 존재");
assertContains(webHtml, "createPoseLandmarkerWithFallback", "GPU 실패 시 CPU 폴백 함수 존재");
assertContains(webHtml, "delegate)", "PoseLandmarker delegate 파라미터화");
assertContains(webHtml, "const totalSegments = results.length", "리포트 구간 수 동적 계산");
assertContains(webHtml, "setupLayout()", "UI 레이아웃 초기화 호출 존재");
assertContains(webHtml, "setupQuickNav()", "빠른 이동 UI 초기화 호출 존재");
assertContains(webHtml, "data-jump=\"video\"", "빠른 이동 영상 버튼 존재");
assertContains(webHtml, "data-jump=\"segments\"", "빠른 이동 전체 구간 버튼 존재");
assertContains(webHtml, "data-jump=\"result\"", "빠른 이동 결과지 버튼 존재");
assertContains(webHtml, "data-jump=\"setup\"", "앱형 하단 설정 메뉴 존재");
assertContains(webHtml, "훈련 시작", "앱형 훈련 시작 제목 존재");
assertContains(webHtml, "field-label", "단계별 입력 안내 스타일 존재");
assertContains(webHtml, "if (reportSection) reportSection.hidden = true", "훈련 화면 중복 분석 요약 숨김");
assertContains(webHtml, ".quick-nav button.active", "하단 메뉴 활성 상태 스타일 존재");
assertContains(webHtml, "class=\"utility-actions\" hidden", "상단 기술용 보조 버튼 영역 숨김");
assertContains(webHtml, "id=\"showReportBtn\" class=\"secondary\" disabled hidden", "상단 결과지 보기 버튼 숨김");
assertContains(webHtml, "playback-settings", "영상 아래 재생 설정 그룹 존재");
assertContains(webHtml, "repeat-options", "영상 아래 반복 설정 그룹 존재");
assertContains(webHtml, "replay-actions", "분석 후 재생 버튼 그룹 존재");
assertContains(webHtml, ".replay-actions button:disabled", "사용 불가능한 재생 버튼 숨김");
assertContains(webHtml, "segment-head", "구간 번호와 기술명 상단 배치 구조 존재");
assertContains(webHtml, "segment-feedback", "모바일 구간 피드백 축약 구조 존재");
assertContains(webHtml, "openVideoReplay", "구간 클릭 시 영상 리플레이 이동 함수 존재");
assertContains(webHtml, "replay-modal", "현재 위치에서 구간 영상을 확인하는 팝업 재생창 존재");
assertContains(webHtml, "closeReplayModal", "구간 영상 팝업 닫기 로직 존재");
assertContains(webHtml, "event.target.closest(\".segment\")", "구간 카드 전체 클릭 리플레이 존재");
assertContains(webHtml, "event.target.closest(\".scene-card\")", "결과지 장면 클릭 리플레이 존재");
assertContains(webHtml, "resultPage", "결과지 별도 페이지 구조 존재");
assertContains(webHtml, "video-dock", "리플레이 고정 패널 CSS/DOM 구조 존재");
assertContains(webHtml, "side-panel", "우측 작업 패널 CSS/DOM 구조 존재");
assertContains(webHtml, "태권도 품새 수련 훈련", "앱 이름 '태권도 품새 수련 훈련' 적용");
assertContains(webHtml, "--brand-strong", "세련된 통합 브랜드 컬러 토큰 존재");
assertContains(webHtml, "--shadow", "통합 패널 그림자 토큰 존재");
assertContains(webHtml, "수련품새 · 경기품새", "헤더 훈련 목적 배지 적용");
assertContains(webHtml, "태권도 품새 수련인을 위한 영상 기반 AI 분석 코치 · v3.16", "헤더 설명 문구 적용");
assertContains(webHtml, "data-mode=\"exam\"", "수련품새 모드 버튼 존재");
assertContains(webHtml, "data-mode=\"competition\"", "경기품새 모드 버튼 존재");
assertContains(webHtml, "mode-tabs", "훈련 목적 모드 탭 전용 스타일 존재");
assertContains(webHtml, "mode-tab", "훈련 목적 카드형 버튼 스타일 존재");
assertContains(webHtml, "점수 없이 문제점과 수정 포인트 확인", "수련품새 모드 설명 문구 존재");
assertContains(webHtml, "100점/평균, 반복 문제, 필요 훈련 확인", "경기품새 모드 설명 문구 존재");
assertContains(webHtml, "점수 없이 문제점 확인", "수련품새는 점수 없이 문제점 확인 중심");
assertContains(webHtml, "필요 훈련", "경기품새 필요 훈련 문구 존재");
assertContains(webHtml, "stableAnalysisCache", "동일 영상 반복 측정 안정화 캐시 존재");
assertContains(webHtml, "same_file_same_poomsae_reuses_segment_metrics", "반복 측정 안정화 전략 기록 존재");
assertContains(webHtml, "선택 순서는 자유롭습니다", "품새/영상 선택 순서 자유 안내 존재");
assertContains(webHtml, "100점/평균", "100점/평균 점수 표기 존재");
assertContains(webHtml, "latestReport.summary.average_power_finish_score)}</span></div>", "결과지 평균점 단일 표시 구조 존재");
assertContains(webHtml, "score_100", "100점 기준 점수 데이터 존재");
assertContains(webHtml, "scoreStance", "서기 안정성 평가 함수 존재");
assertContains(webHtml, "stanceScore", "서기 안정성 점수 데이터 존재");
assertContains(webHtml, "scoreStillness(finalSpeed, endJitter, type)", "정지 안정성은 잔여 속도와 흔들림을 함께 평가");
assertContains(webHtml, "remainingMotion = finalSpeed + endJitter * 0.5", "일정 속도 연속 움직임의 정지 오판 방지");
assertContains(webHtml, "chooseSampleCount(segmentLength)", "저사양 보호 분석 표본 제한 함수 존재");
assertContains(webHtml, "getPoint(landmarks, 11)", "신체 크기 계산 시 랜드마크 신뢰도 확인");
assertContains(webHtml, "captureVideoSnapshot", "구간 장면 사진 캡처 함수 존재");
assertContains(webHtml, "우선 확인할 부분", "결과지 우선 확인 영역 존재");
assertContains(webHtml, "전체 부분", "결과지 전체 영역 존재");
assertContains(webHtml, "analysisTimestampOffsetMs", "재분석 MediaPipe 타임스탬프 보정 존재");
assertContains(webHtml, "이미 분석 중입니다", "분석 중 중복 클릭 방지 안내 존재");
assertContains(webHtml, "poomsae-tab", "v3 품새 구분 탭 UI 존재");
assertContains(webHtml, "data-group=\"yugeup\"", "유급자 탭 존재");
assertContains(webHtml, "data-group=\"yupum\"", "유품자 탭 존재");
assertContains(webHtml, "data-group=\"yudan\"", "유단자 탭 존재");
assertContains(webHtml, "poomsaeGroups", "유급자/유품자/유단자 데이터 그룹 존재");
assertContains(webHtml, "techniques:", "이미지 참고 기술명 배열 존재");
assertContains(webHtml, "inferMovementType", "기술명 기반 분석 타입 추정 함수 존재");
assertContains(webHtml, "koryo", "유품자 고려 데이터 존재");
assertContains(webHtml, "pyongwon", "유단자 평원 데이터 존재");
assertContains(webHtml, "reanalyzeBtn", "재분석(초기화) 버튼 로직 존재");
assertContains(webHtml, "disabled hidden>재분석(초기화)</button>", "불필요한 재분석 버튼은 화면에서 숨김");
assertContains(webHtml, "detectPoomsaeKeyFromFilename", "파일명에서 품새를 확인하는 함수 존재");
assertContains(webHtml, "warnIfFilenamePoomsaeMismatch", "선택 품새와 파일명 불일치 경고 존재");
assertContains(webHtml, "훈련 분석 요약", "결과 페이지 이름을 훈련 분석 요약으로 통일");
assertContains(webHtml, "A4 요약 JPG 만들기", "A4 훈련 분석 요약 JPG 기능 존재");
assertContains(webHtml, "stableAnalysisCache.delete(cacheKey)", "초기화 시 기존 안정화 결과 제거");
assertContains(webHtml, "초기화했습니다. 같은 영상으로 다시 분석하려면 분석 시작을 누르세요.", "초기화 완료 안내 문구 존재");
assertContains(webHtml, "startAnalysis", "분석 시작 시 모델 자동 준비 로직 존재");
assertContains(webHtml, "hidden>모델 준비", "모델 준비 버튼은 사용자 화면에서 숨김");
assertContains(webHtml, "showReportBtn.addEventListener(\"click\", showResultPage)", "결과지 보기 버튼은 결과지 페이지로 이동");
assertContains(webHtml, "id=\"jpgBtn\" class=\"secondary\" disabled hidden", "훈련 화면 JPG 저장 버튼은 숨김");
assertContains(webHtml, "JPG 저장", "결과지 내부 JPG 저장 버튼 존재");
assertContains(webHtml, "movementCue", "동작명 기반 구체 피드백 규칙 존재");
assertContains(webHtml, "weakestMetric", "가장 약한 지표 1개만 보조 피드백으로 표시");
assertContains(webHtml, "summarizeRepeatedIssues", "반복 문제 요약 함수 존재");
assertContains(webHtml, "반복해서 보이는 문제", "연습포인트 반복 문제 요약 문구 존재");
assertContains(webHtml, "우선 연습 포인트", "반복을 줄인 우선 연습 포인트 문구 존재");
assertContains(webHtml, "아래막기", "아래막기 구체 피드백 규칙 존재");
assertContains(webHtml, "차기 뒤 착지 발", "발차기 구체 피드백 규칙 존재");
assertContains(webHtml, "앞굽이는 앞무릎", "서기 구체 피드백 규칙 존재");
assertContains(webHtml, "지르는 손의 어깨", "지르기 구체 피드백 규칙 존재");

assertNotContainsInFiles("18개 구간", [webIndexPath, androidIndexPath], "고정 문구 '18개 구간' 제거");
assertNotContainsInFiles("score_100)} /", [webIndexPath, androidIndexPath], "결과지 100점/평균 중복 표기 제거");
assertNotContainsInFiles("id=\"resetBtn\"", [webIndexPath, androidIndexPath], "독립 초기화 버튼 제거");
assertNotContainsInFiles("resetBtn.addEventListener", [webIndexPath, androidIndexPath], "독립 초기화 로직 제거");
assertNotContainsInFiles("JPG 결과지 생성", [webIndexPath, androidIndexPath], "이전 JPG 생성 문구 제거");
assertNotContainsInFiles("눌러 재생", [webIndexPath, androidIndexPath], "구간 카드의 눌러 재생 문구 제거");
assertNotContainsInFiles("video.scrollIntoView", [webIndexPath, androidIndexPath], "구간 재생 시 영상 위치로 자동 스크롤 제거");
assertNotContainsInFiles("태극 1~8장 테스트", [webIndexPath, androidIndexPath], "이전 제목 '태극 1~8장 테스트' 제거");
assertNotContainsInFiles("태극1~8장 테스트", [webIndexPath, androidIndexPath], "이전 제목 '태극1~8장 테스트' 제거");
assertNotContainsInFiles("v2", [webIndexPath, androidIndexPath], "이전 버전 v2 문구 제거");
assertNotContainsInFiles("C:\\Users\\MOMGAGYM", [webIndexPath, androidIndexPath, buildStepsPath], "배포 코드/문서의 개인 PC 샘플 경로 제거");
assertNotContainsInFiles("AI 품새 코치", [webIndexPath, androidIndexPath], "이전 앱 이름 'AI 품새 코치' 제거");
assertNotContainsInFiles("품새 분석 AI플그램", [webIndexPath, androidIndexPath], "오타 앱 이름 '품새 분석 AI플그램' 제거");
assertNotContainsInFiles("감점 확정", [webIndexPath, androidIndexPath], "공식 판정처럼 보이는 표현 '감점 확정' 금지");
assertNotContainsInFiles("공식 판정", [webIndexPath, androidIndexPath], "공식 판정 표현 금지");
assertNotContainsInFiles("합격", [webIndexPath, androidIndexPath], "합격 판정 표현 금지");
assertNotContainsInFiles("불합격", [webIndexPath, androidIndexPath], "불합격 판정 표현 금지");
assertNotContainsInFiles("실격", [webIndexPath, androidIndexPath], "실격 판정 표현 금지");

if (failures.length) {
  console.error(`\nCross-check failed: ${failures.length} issue(s)`);
  process.exit(1);
}

console.log(`\nCross-check passed with ${warnings.length} warning(s).`);
