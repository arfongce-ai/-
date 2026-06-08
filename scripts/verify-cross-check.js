const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webIndexPath = path.join(root, "www", "index.html");
const androidIndexPath = path.join(root, "android", "app", "src", "main", "assets", "public", "index.html");
const buildStepsPath = path.join(root, "APK-BUILD-STEPS.md");
const capacitorConfigPath = path.join(root, "capacitor.config.json");
const rootIndexPath = path.join(root, "index.html");
const rootManifestPath = path.join(root, "manifest.webmanifest");
const rootServiceWorkerPath = path.join(root, "service-worker.js");

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

function assertNotContains(html, token, label) {
  if (!html.includes(token)) pass(label);
  else fail(label);
}

function assertNotContainsInFiles(token, files, label) {
  const matches = files.filter((filePath) => readUtf8(filePath).includes(token));
  if (matches.length === 0) pass(label);
  else fail(`${label}: ${matches.map((filePath) => path.relative(root, filePath)).join(", ")}`);
}

const webHtml = readUtf8(webIndexPath);
const rootHtml = readUtf8(rootIndexPath);
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
assertContains(webHtml, "<summary>프로그램 사용 설명서</summary>", "홈 훈련 시작 아래 프로그램 사용 설명서 버튼 존재");
assertContains(webHtml, "program-guide-steps", "프로그램 사용 순서 목록 존재");
assertContains(webHtml, "본 프로그램은 개인품새 수련을 위한 참고용입니다.", "프로그램 사용 설명서 하단 참고용 안내 존재");
assertContains(webHtml, "Android는 브라우저 메뉴의 앱 설치·홈 화면 추가", "폰 및 태블릿 홈 화면 추가 안내 존재");
assertContains(webHtml, "훈련 목적 선택:", "설명서에 첫 번째 사용 단계 존재");
assertContains(webHtml, "훈련 확인:", "설명서에 마지막 사용 단계 존재");
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
assertContains(webHtml, "<h1>태권도 품새 수련</h1>", "앱 이름 '태권도 품새 수련' 적용");
assertNotContains(webHtml, "태권도 품새 수련 훈련", "이전 앱 이름 제거");
assertContains(readUtf8(capacitorConfigPath), "\"appName\": \"태권도 품새 수련\"", "Android 앱 이름도 태권도 품새 수련으로 통일");
assertContains(webHtml, "--brand-strong", "세련된 통합 브랜드 컬러 토큰 존재");
assertContains(webHtml, "--shadow", "통합 패널 그림자 토큰 존재");
assertContains(webHtml, "수련품새 · 경기품새", "헤더 훈련 목적 배지 적용");
assertContains(webHtml, "태권도 품새 수련인을 위한 영상 기반 AI 분석 코치 · v3.29", "헤더 설명 문구 적용");
assertContains(webHtml, "data-mode=\"exam\"", "수련품새 모드 버튼 존재");
assertContains(webHtml, "data-mode=\"competition\"", "경기품새 모드 버튼 존재");
assertContains(webHtml, "mode-tabs", "훈련 목적 모드 탭 전용 스타일 존재");
assertContains(webHtml, "mode-tab", "훈련 목적 카드형 버튼 스타일 존재");
assertContains(webHtml, "점수 없이 문제점과 수정 포인트 확인", "수련품새 모드 설명 문구 존재");
assertContains(webHtml, "10점 만점 참고점수, 반복 문제, 필요 훈련 확인", "경기품새 모드 설명 문구 존재");
assertContains(webHtml, "점수 없이 문제점 확인", "수련품새는 점수 없이 문제점 확인 중심");
assertContains(webHtml, "필요 훈련", "경기품새 필요 훈련 문구 존재");
assertContains(webHtml, "stableAnalysisCache", "동일 영상 반복 측정 안정화 캐시 존재");
assertContains(webHtml, "same_file_same_poomsae_reuses_segment_metrics", "반복 측정 안정화 전략 기록 존재");
assertContains(webHtml, "선택 순서는 자유롭습니다", "품새/영상 선택 순서 자유 안내 존재");
assertContains(webHtml, "경기품새 참고점수", "WT 구조 기반 10점 만점 참고점수 표기 존재");
assertContains(webHtml, "latestReport.summary.competition_score_10", "결과지 경기품새 10점 참고점수 표시 구조 존재");
assertContains(webHtml, "score_100", "100점 기준 점수 데이터 존재");
assertContains(webHtml, "scoreStance", "서기 안정성 평가 함수 존재");
assertContains(webHtml, "stanceScore", "서기 안정성 점수 데이터 존재");
assertContains(webHtml, "scoreStillness(finalSpeed, endJitter, type)", "정지 안정성은 잔여 속도와 흔들림을 함께 평가");
assertContains(webHtml, "remainingMotion = finalSpeed + endJitter * 0.5", "일정 속도 연속 움직임의 정지 오판 방지");
assertContains(webHtml, "chooseSampleCount(segmentLength)", "저사양 보호 분석 표본 제한 함수 존재");
assertContains(webHtml, "getPoint(landmarks, 11)", "신체 크기 계산 시 랜드마크 신뢰도 확인");
assertContains(webHtml, "captureVideoSnapshot", "구간 장면 사진 캡처 함수 존재");
assertContains(webHtml, "1. 구간별 상세 분석 및", "요청 형식의 구간별 상세 분석 영역 존재");
assertContains(webHtml, "2. 핵심 모션 매칭 피드백", "요청 형식의 핵심 모션 피드백 영역 존재");
assertContains(webHtml, "3. 지도자 추천 피드백 및 훈련법", "요청 형식의 지도자 훈련법 영역 존재");
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
assertContains(webHtml, "<h2>리포트</h2>", "결과 페이지 이름을 리포트로 통일");
assertContains(webHtml, "A4 요약 JPG 만들기", "A4 리포트 JPG 기능 존재");
assertContains(webHtml, "let mainReplayRange = null", "메인 영상 구간 재생 상태 분리");
assertContains(webHtml, "let modalReplayRange = null", "팝업 영상 구간 재생 상태 분리");
assertContains(webHtml, "video.pause();\n        clearReplayRange();\n        modalReplayRange", "팝업 재생 시작 시 메인 영상 중복 재생 방지");
assertContains(webHtml, "segment_sample_range: { min: 4, max: 8 }", "적응형 샘플 수 범위 기록");
assertContains(webHtml, "sampling_strategy: \"adaptive_device_safe\"", "적응형 샘플링 전략 기록");
assertContains(webHtml, "window.addEventListener(\"pagehide\"", "페이지 종료 시 영상 메모리 정리");
assertContains(webHtml, "requestVideoFrameCallback", "실제 표시 프레임 기준 분석 지원");
assertContains(webHtml, "meta.mediaTime", "표시 프레임의 실제 mediaTime 기록");
assertContains(webHtml, "const actualTime = await waitForSeek(requestedTime)", "요청 시각 대신 실제 분석 시각 사용");
assertContains(webHtml, "completion_snapshot_time: Number(snapshotTime.toFixed(3))", "완료 스냅샷 실제 시각 기록");
assertContains(webHtml, "COMPETITION_RULES_2026", "2026 경기규칙 피드백 기준 존재");
assertContains(webHtml, "competitionScoreFromMetrics", "WT 정확성 4.0 및 연출 6.0 참고점수 환산 함수 존재");
assertContains(webHtml, "accuracy_score_4", "정확성 4.0점 기준 결과 저장");
assertContains(webHtml, "presentation_score_6", "연출 6.0점 기준 결과 저장");
assertContains(webHtml, "setupBackNavigationGuard", "브라우저 뒤로가기 앱 이탈 방지 로직 존재");
assertContains(webHtml, "./manifest.webmanifest", "홈 화면 설치용 PWA manifest 연결");
assertContains(webHtml, "./assets/app-icon-1024.png", "폰 및 태블릿 홈 화면 아이콘 연결");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "poomsae-training-v4-calligraphy-icon", "www 직접 배포용 붓글씨 아이콘 캐시 적용");
assertContains(rootHtml, "./manifest.webmanifest", "저장소 최상단 배포용 manifest 연결");
assertContains(rootHtml, "./www/assets/app-icon-1024.png", "저장소 최상단 배포용 아이콘 연결");
assertContains(readUtf8(rootManifestPath), "\"start_url\": \"./www/index.html\"", "최상단 아이콘 실행 시 실제 프로그램 주소 연결");
assertContains(readUtf8(rootServiceWorkerPath), "poomsae-training-root-calligraphy-icon-v2", "최상단 배포용 붓글씨 아이콘 서비스워커 존재");
assertContains(readUtf8(rootManifestPath), "app-icon-192.png", "최상단 manifest에 192 아이콘 등록");
assertContains(readUtf8(rootManifestPath), "app-icon-512.png", "최상단 manifest에 512 아이콘 등록");
assertContains(readUtf8(path.join(root, "www", "manifest.webmanifest")), "app-icon-192.png", "www manifest에 192 아이콘 등록");
assertContains(readUtf8(path.join(root, "www", "manifest.webmanifest")), "app-icon-512.png", "www manifest에 512 아이콘 등록");
assertContains(readUtf8(rootServiceWorkerPath), "caches.match(APP_URL)", "아이콘 실행 시 오프라인 프로그램 화면 폴백 존재");
assertContains(webHtml, "minor_error: 0.1", "정확성 경미한 오류 감점 참고값 존재");
assertContains(webHtml, "major_error: 0.3", "정확성 큰 오류 감점 참고값 존재");
assertContains(webHtml, "competitionRuleCue", "기술 종류별 경기규칙 확인 피드백 존재");
assertContains(webHtml, "evidenceScopeFor", "확인 가능·추정·지도자 확인 필요 판정 범위 존재");
assertContains(webHtml, "referenceDeductionFor", "KTA -0.1/-0.3 참고 감점 가능성 분류 존재");
assertContains(webHtml, "판정 보류 · 촬영/지도자 확인", "낮은 감지율의 감점 판정 보류 존재");
assertContains(webHtml, "현재 Pose 모델에는 눈동자·얼굴 방향 판정 정보가 없어", "시선 처리 과잉 판정 방지 안내 존재");
assertContains(webHtml, "boundarySensitivitySelect", "구간 감지 민감도 선택 UI 존재");
assertContains(webHtml, "detectMotionBoundaries", "영상 움직임 기반 구간 경계 탐색 존재");
assertContains(webHtml, "refineSegmentBoundaries", "예상 경계를 가까운 정지점으로 보정하는 로직 존재");
assertContains(webHtml, "sample.valid !== false", "관절 미검출 장면을 거짓 정지점 후보에서 제외");
assertContains(webHtml, "skeleton-angle-kta-scan-reuse-revision-7-", "스캔 프레임 재사용 방식과 민감도를 캐시 키에 반영");
assertContains(webHtml, "selectReusableSegmentFrames", "경계 탐색 포즈 프레임의 안전한 구간 평가 재사용");
assertContains(webHtml, "nearest.gap > maxGap", "재사용 프레임 최대 시각 오차 안전장치");
assertContains(webHtml, "sample_source: reusableFrames.length === sampleCount ? \"boundary_scan_reused\" : \"precise_fallback\"", "구간별 재사용 또는 정밀 폴백 기록");
assertContains(webHtml, "reliability_guard:", "분석 속도 최적화 신뢰성 안전장치 기록");
assertContains(webHtml, "total_elapsed_ms:", "분석 실제 소요시간 기록");
assertContains(webHtml, "skeleton_joint_angle_center_motion_local_minimum", "관절 각도와 중심 이동의 최저점을 구간 경계로 우선 선택");
assertContains(webHtml, ".scene-card.priority .scene-shot", "우선 확인 카드의 캡처를 상단 중앙에 배치");
assertContains(webHtml, ".scene-card.report-full .scene-shot", "수련품새와 경기품새 전체 부분 카드의 캡처를 상단 중앙에 배치");
assertContains(webHtml, "isPriority ? \"priority\" : \"report-full\"", "전체 부분에 공통 세로형 카드 적용");
assertContains(webHtml, "function briefIssueText(segment)", "전체 부분의 간략한 문제점 생성 함수 존재");
assertContains(webHtml, "확인할 문제:", "전체 부분의 간략한 문제점 문구 존재");
assertContains(webHtml, "function segmentIssueDetails(segment, limit = 2)", "리포트 카드 핵심 문제 선별 함수 존재");
assertContains(webHtml, ".slice(0, 4)", "우선 확인 구간을 최대 4개로 제한");
assertContains(webHtml, "동작명 자동 추정", "동작명과 영상 불일치 가능성 안내 존재");
assertContains(webHtml, "skeletonMotionScore", "관절 각도와 중심 이동을 포함한 스켈레톤 움직임 분석");
assertContains(webHtml, "chooseCompletionSnapshotTimes", "구간 후반 가장 안정적인 스켈레톤 자세를 대표 장면으로 선택");
assertContains(webHtml, "detectActiveMotionRange", "영상 앞뒤 대기 시간을 제외한 실제 품새 활성 구간 탐색");
assertContains(webHtml, "duration * 3.5", "구간 감지를 초당 3.5회 수준으로 유지");
assertContains(webHtml, "./assets/momgagym-logo.jpg", "앱 하단 몸가짐운동센터 로고 존재");
assertContains(webHtml, "제작: 울산 몸가짐운동센터", "앱 하단 제작 정보 존재");
assertContains(webHtml, "https://blog.naver.com/posture_gym/222560486461", "김동규 센터장 소개 링크 존재");
assertContains(webHtml, ">김동규 센터장</a>", "김동규 센터장 이름에 소개 링크 연결");
assertContains(webHtml, "@posture_gym_official", "앱 하단 인스타그램 정보 존재");
assertContains(webHtml, "blog.naver.com/posture_gym", "앱 하단 블로그 정보 존재");
assertContains(webHtml, "0507-1366-0466", "앱 하단 문의 전화번호 존재");
assertContains(webHtml, "./assets/partner-taekwondo-logos.png", "새 가로형 파트너 로고 존재");
assertContains(webHtml, "제작: 울산 몸가짐운동센터</p>\n          <p>제작자: <a", "제작자 링크 정보를 한 줄 아래에 표시");
assertContains(webHtml, "<div class=\"app-footer-partner-block\">\n          <img class=\"app-footer-partners\"", "파트너 로고를 운동센터 로고와 제작 정보 위에 표시");
assertContains(webHtml, "https://www.instagram.com/yongin_kr", "용인대 국가대표태권도 인스타그램 링크 존재");
assertContains(webHtml, "aria-label=\"용인대 국가대표태권도 인스타그램 @yongin_kr 새 창으로 열기\"", "용인대 로고 클릭 접근성 설명 존재");
assertContains(webHtml, ".yongin-logo-link", "용인대 국가대표태권도 로고 전용 클릭 영역 존재");
assertContains(webHtml, "grid-column: 1 / -1", "파트너 로고를 하단 전체 너비로 표시");
assertContains(webHtml, ".primary-actions button", "분석 시작 버튼 전용 정렬 구조 존재");
assertNotContains(webHtml, "훈련 분석 요약", "이전 결과 페이지 명칭 제거");
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
assertNotContainsInFiles("segment_samples: 8", [webIndexPath, androidIndexPath], "실제 동작과 다른 고정 샘플 수 기록 제거");
assertNotContainsInFiles("let replayRange = null", [webIndexPath, androidIndexPath], "메인 영상과 팝업 영상의 공유 재생 상태 제거");
assertNotContainsInFiles("const segmentStart = video.duration * (i / movements.length)", [webIndexPath, androidIndexPath], "단순 균등 구간 시작값 제거");
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
