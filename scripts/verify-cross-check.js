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
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n") : "";
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
  // movements:[...].map 형식(품새선 데이터 포함 형식)을 쓰는 모든 품새를 일반적으로 처리.
  // 이전에는 taegeuk_1 하나만 하드코딩되어 있었으나, 다른 품새도 같은 형식으로
  // 전환될 수 있으므로 키에 관계없이 동작하도록 일반화함(2026-07-21).
  for (const match of html.matchAll(/([a-z_0-9]+):\s*\{[^}]*?count:\s*(\d+)[^}]*?movements:\s*\[([\s\S]*?)\]\s*\.map/g)) {
    const key = match[1];
    const arraySource = match[3];
    const rows = [...arraySource.matchAll(/\[([^\[\]]*)\]/g)];
  const numberedRows = rows.filter((row) => {
    const firstString = row[1].match(/"([^"]*)"/);
    const first = firstString ? firstString[1] : "";
    const isPreparationRow = row === rows[0];
    return !isPreparationRow && first !== "ready_stance" && first !== "준비서기" && first !== "기합" && !first.startsWith("kihap_");
  });
    result.set(key, {
      count: Number(match[2]),
      actual: numberedRows.length,
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

function assertFileExists(filePath, label) {
  if (fs.existsSync(filePath)) pass(label);
  else fail(`${label}: ${path.relative(root, filePath)} 없음`);
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
    // new Function은 ESM import를 파싱하지 못하므로 정적 import 줄만 제거한 뒤
    // 기존 인라인 본문 문법을 검사한다. action-model.mjs 자체 문법은 전용 테스트가 검증한다.
    const inlineBody = scriptMatch[1].replace(/^\s*import\s+[^;]+;\s*$/gm, "");
    new Function(inlineBody);
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
assertContains(webHtml, "품새 분석 시작", "모바일 친화형 분석 시작 제목 존재");
assertContains(webHtml, "<summary>도움말 보기</summary>", "접을 수 있는 간단한 도움말 버튼 존재");
assertContains(webHtml, "program-guide-steps", "프로그램 사용 순서 목록 존재");
assertContains(webHtml, "이 앱은 수련생과 지도자를 위한 보조 도우미입니다.", "프로그램 사용 설명서 하단 보조 도우미 안내 존재");
assertContains(webHtml, "안드로이드는 브라우저 메뉴에서 '앱 설치/홈 화면에 추가'", "폰 및 태블릿 홈 화면 추가 안내 존재");
assertContains(webHtml, "① 분석 방식을 골라요:", "설명서에 첫 번째 사용 단계 존재");
assertContains(webHtml, "⑥ 동작별 결과를 확인해요:", "설명서에 핵심 확인 단계 존재");
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
assertContains(webHtml, "<h1>태권도 품새수련 <span class=\"header-beta\">Beta</span></h1>", "앱 이름과 모바일에서 숨길 수 있는 Beta 표기 적용");
assertNotContains(webHtml, "태권도 품새 수련 훈련", "이전 앱 이름 제거");
assertContains(readUtf8(capacitorConfigPath), "\"appName\": \"태권도 품새수련 Beta\"", "Android 앱 이름도 태권도 품새수련 Beta로 통일");
assertContains(webHtml, "--brand-strong", "세련된 통합 브랜드 컬러 토큰 존재");
assertContains(webHtml, "--shadow", "통합 패널 그림자 토큰 존재");
assertContains(webHtml, "수련 보조 · Beta", "헤더 베타 목적 배지 적용");
assertContains(webHtml, "내 품새 영상을 동작별로 쉽게 확인해요 · v4.14", "짧은 헤더 설명 문구 적용(버전 표시는 배포마다 갱신 필요)");
assertContains(webHtml, "data-mode=\"exam\"", "수련품새 모드 버튼 존재");
assertContains(webHtml, "data-mode=\"competition\"", "경기품새 모드 버튼 존재");
assertContains(webHtml, "mode-tabs", "훈련 목적 모드 탭 전용 스타일 존재");
assertContains(webHtml, "mode-tab", "훈련 목적 카드형 버튼 스타일 존재");
assertContains(webHtml, "동작과 고칠 점을 쉽게 봐요", "기본 분석의 어린이용 설명 문구 존재");
assertContains(webHtml, "연습용 점수도 함께 봐요", "경기 점수 참고의 어린이용 설명 문구 존재");
assertContains(webHtml, "수련생과 지도자가 함께 확인할 고칠 점", "수련 동작 분석은 점수 없이 공동 확인 중심");
assertContains(webHtml, "let trainingMode = \"exam\"", "기본 모드는 수련 동작 분석");
assertContains(webHtml, "동작 구간 바로잡기", "잘못 나뉜 시작·끝 구간 수정 기능 노출");
assertContains(webHtml, "필요 훈련", "경기품새 필요 훈련 문구 존재");
assertContains(webHtml, "stableAnalysisCache", "동일 영상 반복 측정 안정화 캐시 존재");
assertContains(webHtml, "same_file_same_poomsae_reuses_segment_metrics", "반복 측정 안정화 전략 기록 존재");
assertContains(webHtml, "4단계만 따라 하면 돼요.", "간단한 4단계 시작 안내 존재");
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
assertContains(webHtml, "동작 하나씩 자세히 보기", "결과지 전체 영역 존재");
assertContains(webHtml, "analysisTimestampOffsetMs", "재분석 MediaPipe 타임스탬프 보정 존재");
assertContains(webHtml, "이미 분석 중입니다", "분석 중 중복 클릭 방지 안내 존재");
assertContains(webHtml, "poomsae-tab", "v3 품새 구분 탭 UI 존재");
assertContains(webHtml, "data-group=\"yugeup\"", "유급자 탭 존재");
assertContains(webHtml, "data-group=\"yupum\"", "유품자 탭 존재");
assertContains(webHtml, "data-group=\"yudan\"", "유단자 탭 존재");
assertContains(webHtml, "poomsaeGroups", "유급자/유품자/유단자 데이터 그룹 존재");
assertContains(webHtml, "movements:", "교본 참고 구조화 동작 배열 존재");
assertContains(webHtml, "[\"오른앞굽이 오른얼굴등주먹앞치기\", \"라①\", \"서기 그대로\", null]", "태극 8장 26번 교본 명칭 반영");
assertContains(webHtml, "[\"오른뒷굽이 왼손날거들어바깥막기\", \"나\", \"오른발 돌아 디뎌\", \"가\"]", "태극 8장 9번 교본 명칭 반영");
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
assertContains(webHtml, "const actualTime = await waitForSeek(requestedTime, true)", "요청 시각 대신 실제 분석 시각 사용");
assertContains(webHtml, "completion_snapshot_time: Number(snapshotTime.toFixed(3))", "완료 스냅샷 실제 시각 기록");
assertContains(webHtml, "COMPETITION_RULES_2026", "2026 경기규칙 피드백 기준 존재");
assertContains(webHtml, "OFFICIAL_RULE_REFERENCES", "심사규칙과 WT 2024 경기규칙의 분리된 공식 근거 존재");
assertContains(webHtml, "kukkiwon_exam_2024", "국기원 심사규칙 완성도·숙련도·품위 기준 존재");
assertContains(webHtml, "wt_competition_2024", "WT 2024 정확성·연출성 교차검증 기준 존재");
assertContains(webHtml, "activeRuleReferenceProfile", "분석 목적별 공식 규정 선택 구조 존재");
assertContains(webHtml, "rule_reference_profile", "분석 결과 JSON에 적용 규정 프로필 저장");
assertContains(webHtml, "국기원 태권도 교본 3 품새 천권 254~273쪽 원문 대조", "천권 교본 원문 대조 이력 존재");
assertContains(webHtml, 'readyTechnique: "모아서기 겹손준비"', "천권 겹손준비 존재");
assertContains(webHtml, "공중 360° 얼굴표적안차고 금강옆지르기", "천권 22번 복합동작 존재");
assertContains(webHtml, "cheonkwon_m${i}", "천권 26번까지 구조화된 동작 ID 생성 구조 존재");
assertContains(webHtml, "천권 8번 옆차기·아래막기", "천권 기합 동작 내부 단계 존재");
assertContains(webHtml, "천권 25번 태산밀기", "천권 태산밀기 복합 단계 존재");
assertContains(webHtml, "국기원 태권도 교본 3 품새 한수 276~289쪽 원문 대조", "한수 교본 원문 대조 이력 존재");
assertContains(webHtml, "물의 흐름을 형상화한 여섯 방향 품새선", "한수 품새선 정보 존재");
assertContains(webHtml, "hansu_m${i}", "한수 27번까지 구조화된 동작 ID 생성 구조 존재");
assertContains(webHtml, "한수 16번 앞차기·등주먹 앞치기", "한수 첫 번째 기합 복합동작 존재");
assertContains(webHtml, "한수 25번 앞차기·등주먹 앞치기", "한수 두 번째 기합 복합동작 존재");
assertContains(webHtml, "왼 얼굴 등주먹 앞치기(기합)", "한수 25번 기합 기술명 존재");
assertContains(webHtml, "국기원 태권도 교본 3 품새 일여 292~303쪽 원문 대조", "일여 교본 원문 대조 이력 존재");
assertContains(webHtml, "만(卍)자 형태의 품새선", "일여 품새선 정보 존재");
assertContains(webHtml, "ilyeo_m${i}", "일여 23번까지 구조화된 동작 ID 생성 구조 존재");
assertContains(webHtml, "일여 9번 팔목 비틀어 잡아당기며 오른 지르기", "일여 팔목 잡아당기기 복합동작 존재");
assertContains(webHtml, "일여 19번 바꾸어 뛰어옆차기·얼굴 엇걸어막기", "일여 첫 번째 뛰어옆차기 복합동작 존재");
assertContains(webHtml, "일여 23번 바꾸어 뛰어옆차기·얼굴 엇걸어막기", "일여 두 번째 뛰어옆차기 복합동작 존재");
assertContains(webHtml, "오른오금서기 오른 거들어 세워 지르기(기합)", "일여 13번 기합 기술명 존재");
assertContains(webHtml, "POOMSAE_REFERENCE_META", "태권도 교본 참고문헌 출처 메타데이터 존재");
assertContains(webHtml, 'sourcePage: "304쪽"', "태권도 교본 참고문헌 페이지 기록");
assertContains(webHtml, "강익필(2015). 태권도 공인품새 해설 Ⅱ. 상아기획.", "공인품새 해설 참고문헌 존재");
assertContains(webHtml, "국기원(1987). 국기 태권도교본. 삼훈출판사.", "1987 국기 태권도교본 참고문헌 존재");
assertContains(webHtml, "국기원(2019). 태권도 용어사전.", "2019 태권도 용어사전 참고문헌 존재");
assertContains(webHtml, "competitionScoreFromMetrics", "WT 정확성 4.0 및 연출 6.0 참고점수 환산 함수 존재");
assertContains(webHtml, "accuracy_score_4", "정확성 4.0점 기준 결과 저장");
assertContains(webHtml, "presentation_score_6", "연출 6.0점 기준 결과 저장");
assertContains(webHtml, "setupBackNavigationGuard", "브라우저 뒤로가기 앱 이탈 방지 로직 존재");
assertContains(webHtml, "./manifest.webmanifest", "홈 화면 설치용 PWA manifest 연결");
assertContains(webHtml, "./assets/app-icon-1024.png", "폰 및 태블릿 홈 화면 아이콘 연결");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "poomsae-training-v97-learning-stats", "www 직접 배포용 오프라인 엔진 캐시 적용");
assertContains(rootHtml, "./manifest.webmanifest", "저장소 최상단 배포용 manifest 연결");
assertContains(rootHtml, "./www/assets/app-icon-1024.png", "저장소 최상단 배포용 아이콘 연결");
assertContains(readUtf8(rootManifestPath), "\"start_url\": \"./www/index.html\"", "최상단 아이콘 실행 시 실제 프로그램 주소 연결");
assertContains(readUtf8(rootServiceWorkerPath), "poomsae-training-root-v29-learning-stats", "최상단 배포용 오프라인 엔진 서비스워커 존재");
assertContains(webHtml, 'import { buildDatasetCandidate, scoreActionSequence } from "./action-model.mjs"', "별도 동작 시퀀스 모델 모듈 연결");
assertContains(webHtml, 'import { compareTextbookPose } from "./textbook-pose-match.mjs"', "교본 관절선 비교 모듈 연결");
assertContains(webHtml, 'import { compareVideoReference } from "./video-reference-match.mjs"', "영상 관절 흐름 비교 모듈 연결");
assertContains(webHtml, "교본 자세 일치:", "동작 카드에 교본 자세 일치도 표시");
assertContains(webHtml, "textbookMatch.confidenceBoost", "높은 교본 일치도를 동작 신뢰도에 반영");
assertContains(webHtml, "videoMotionMatch.confidenceBoost", "높은 영상 흐름 일치도를 동작 신뢰도에 반영");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-1-textbook-reference.json", "교본 관절 좌표 오프라인 캐시 등록");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-2-textbook-reference.json", "태극 2장 교본 관절 좌표 오프라인 캐시 등록");
assertContains(webHtml, '["taegeuk_2", "./models/taegeuk-2-textbook-reference.json"]', "태극 2장 교본 자세 선택 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-3-textbook-reference.json", "태극 3장 교본 관절 좌표 오프라인 캐시 등록");
assertContains(webHtml, '["taegeuk_3", "./models/taegeuk-3-textbook-reference.json"]', "태극 3장 교본 자세 선택 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-4-textbook-reference.json", "태극 4장 교본 관절 좌표 오프라인 캐시 등록");
assertContains(webHtml, '["taegeuk_4", "./models/taegeuk-4-textbook-reference.json"]', "태극 4장 교본 자세 선택 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-5-textbook-reference.json", "태극 5장 교본 관절 좌표 오프라인 캐시 등록");
assertContains(webHtml, '["taegeuk_5", "./models/taegeuk-5-textbook-reference.json"]', "태극 5장 교본 자세 선택 로딩");
assertContains(webHtml, '"./models/taegeuk-5-video-reference.json"', "태극 5장 영상 관절 흐름 선택 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-5-video-reference.json", "태극 5장 영상 관절 흐름 오프라인 캐시 등록");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-6-textbook-reference.json", "태극 6장 교본 관절 좌표 오프라인 캐시 등록");
assertContains(webHtml, '["taegeuk_6", "./models/taegeuk-6-textbook-reference.json"]', "태극 6장 교본 자세 선택 로딩");
assertContains(webHtml, '"./models/taegeuk-6-video-reference.json"', "태극 6장 영상 관절 흐름 선택 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/taegeuk-6-video-reference.json", "태극 6장 영상 관절 흐름 오프라인 캐시 등록");
assertContains(webHtml, '["koryo", "./models/koryo-textbook-reference.json"]', "고려 교본 자세 선택 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/koryo-textbook-reference.json", "고려 교본 관절 좌표 오프라인 캐시 등록");
assertContains(webHtml, '"./models/koryo-video-reference.json"', "고려 영상 자세 기준 로딩");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "./models/koryo-video-reference.json", "고려 영상 자세 기준 오프라인 캐시 등록");
assertContains(webHtml, "KORYO_KICK_STAGES", "고려 발차기 세부 명칭 매핑");
assertContains(webHtml, "kickStages: KORYO_KICK_STAGES[i] || []", "고려 발차기 세부 명칭 배정");
assertContains(webHtml, "learning_dataset_candidate", "분석 JSON에 전문가 검수용 관절좌표 시퀀스 포함");
assertContains(webHtml, "actionAccuracyConfidence >= 0.65", "충분한 신뢰도에서만 동작 모델을 정확도 점수에 적용");
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
assertContains(webHtml, "skeleton-angle-kta-semantic-scenes-revision-18-video-pose-koryo-", "연결 장면 방식과 민감도를 캐시 키에 반영");
assertContains(webHtml, "selectReusableSegmentFrames", "경계 탐색 포즈 프레임의 안전한 구간 평가 재사용");
assertContains(webHtml, "nearest.gap > maxGap", "재사용 프레임 최대 시각 오차 안전장치");
assertContains(webHtml, "sample_source: reusableFrames.length === sampleCount ? \"boundary_scan_reused\" : \"precise_fallback\"", "구간별 재사용 또는 정밀 폴백 기록");
assertContains(webHtml, "reliability_guard:", "분석 속도 최적화 신뢰성 안전장치 기록");
assertContains(webHtml, "total_elapsed_ms:", "분석 실제 소요시간 기록");
assertContains(webHtml, "prep_reserved_plus_n_segments_for_unity", "영상-분석 통일성: 준비 구간과 N동작 1:1 기초 매핑");
assertContains(webHtml, 'primary.isKihap || primary.type === "kihap"', "기합 장면은 공식 동작 번호 대신 기합으로 표시");
assertContains(webHtml, "semanticConnectionRules", "품새별 의미상 연결동작 규칙 존재");
assertContains(webHtml, "connectionEvidenceFromMotion", "시간·속도 기반 연결 신뢰도 계산 존재");
assertContains(webHtml, "applySemanticSceneRules", "연결동작 장면 통합 처리 존재");
assertContains(webHtml, "compoundMovementRules", "복합동작 내부 단계 규칙 존재");
assertContains(webHtml, "앱 분석용 · 공식 번호 아님", "복합동작 내부 단계 안전 안내 존재");
assertContains(webHtml, "function detectNaturalBoundaries", "자연 경계 탐지 함수 존재");
assertContains(webHtml, "function allocateMovementsToSegments", "구간 길이비례 동작 배분 함수 존재");
assertContains(webHtml, "개선 A:", "준비자세(긴 정지) 시작 제외 개선 적용");
assertContains(webHtml, "개선 B:", "긴 구간 실제 valley 추가 분할 개선 적용");
assertContains(webHtml, "remainingValleys", "긴 구간 분할용 잔여 valley 활용");
assertContains(webHtml, "merged_segments", "여러 동작이 묶인 구간 수 기록");
assertContains(webHtml, "mergedMovementNumbers", "구간별 묶인 동작 번호 표시");
assertContains(webHtml, "여러 동작이 함께 들어감", "동작 묶음 안내 존재");
assertContains(webHtml, "function movementCertainty", "수련품새 동작 확실성 판정 함수 존재");
assertContains(webHtml, "function keyFixPoint", "경기품새 핵심 수정 포인트 함수 존재");
assertContains(webHtml, "동작이 잘 보이나요?", "수련품새 동작 확실성 표시 존재");
assertContains(webHtml, "<b>가감점:</b>", "경기품새 구간별 가감점 명시 존재");
assertContains(webHtml, "<b>핵심 수정:</b>", "경기품새 구간별 핵심 수정 포인트 존재");
assertContains(webHtml, "참고 감점 합계(추정)", "경기품새 가감점 합계 요약 존재");
assertContains(webHtml, "function computeGangyu", "강유(剛柔) 판별 함수 존재");
assertContains(webHtml, "function gangyuSummary", "강유 종합·리듬 체크리스트 함수 존재");
assertContains(webHtml, "힘 있게·부드럽게 움직이는 것도 볼래요.", "접힌 고급 분석 안의 강유 토글 존재");
assertContains(webHtml, "정점 간격이 일정한가", "리듬 체크리스트 1번 존재");
assertContains(webHtml, "준비는 느리고 끝은 빠른가", "리듬 체크리스트 2번(가속 대비) 존재");
assertContains(webHtml, "전체에 강약 물결이 보이는가", "리듬 체크리스트 5번 존재");
assertContains(webHtml, "function fileLooksHevc", "HEVC 코덱 감지 함수 존재");
assertContains(webHtml, "function browserCanPlayHevc", "브라우저 HEVC 재생 가능 여부 확인 존재");
assertContains(webHtml, "hvc1|hev1|hvcC", "HEVC 박스 마커 검사 존재");
assertContains(webHtml, "file.size - tailLen", "파일 끝(moov)까지 HEVC 검사 존재");
assertContains(webHtml, "HEVC(H.265)", "HEVC 미지원 안내 문구 존재");
assertContains(webHtml, "이 영상은 HEVC 형식이라 분석할 수 없어요. H.264 영상으로 바꾼 후 다시 선택해 주세요.", "HEVC 분석 불가 쉬운 안내 문구 존재");
assertContains(webHtml, "PC는 Clipchamp 또는 HandBrake에서 H.264 MP4로 내보내세요.", "HEVC PC 변환 방법 안내 존재");
assertContains(webHtml, "안드로이드는 카메라 설정에서 고효율 동영상(HEVC)을 끄면", "HEVC 휴대폰 촬영 설정 안내 존재");
assertContains(webHtml, "async function probeSeekReliability()", "영상 중~후반 탐색 신뢰성 사전 점검 함수 존재(첫 프레임만으로는 불충분한 HEVC 사례 대응)");
assertContains(webHtml, "function tinyFrameSample(", "프레임 비교용 픽셀 샘플 함수 존재");
assertContains(webHtml, "function framesLookIdentical(", "픽셀 단위 프레임 동일성 비교 함수 존재");
assertContains(webHtml, "const hasMain = !!selectedFile && videoDecodeReady(video) && seekProbeChecked && seekProbeOk", "탐색 신뢰성 점검 완료 및 성공 후에만 분석 버튼 활성화");
assertContains(webHtml, "!isAnalyzing && !seekProbeChecked && isSelectedMainSource", "분석 중 멀티뷰 소스의 중복 탐색 점검 방지");
// 회귀 방지(2026-07-22): 이전 배포분은 탐색 신뢰성 점검이 "문제 없음"으로 끝났을 때 버튼 상태를
// 다시 계산하지 않아, 점검 도중 seek 때문에 낮아진 videoDecodeReady가 회복돼도 분석 버튼이 계속
// 비활성으로 남는 버그가 있었다(정상 영상인데도 분석을 시작할 수 없었음). 성공/실패 어느 쪽이든
// updateAnalyzeButtonState()를 호출해야 한다.
assertContains(webHtml, "성공/실패 어느 쪽이든 탐색이 끝난 뒤 버튼 상태를 다시 계산한다", "탐색 신뢰성 점검 성공 시에도 분석 버튼 상태 재계산(2026-07-22 되막힘 버그 회귀 방지)");
assertContains(webHtml, "samples[0] != null && samples[1] != null && framesLookIdentical(samples[0], samples[1])", "탐색 신뢰성 점검이 두 표본을 서로 비교(첫 프레임과만 비교하지 않음)");
assertContains(webHtml, "probeSeekReliability().catch((error) =>", "loadeddata 시점에 탐색 신뢰성 점검과 오류 복구가 실제로 연결됨");
assertContains(webHtml, "또렷하게 잘 된 동작", "수련품새 동작 확실성 요약 존재");
assertContains(webHtml, ".scene-card.priority .scene-shot", "우선 확인 카드의 캡처를 상단 중앙에 배치");
assertContains(webHtml, ".scene-card.report-full .scene-shot", "수련품새와 경기품새 전체 부분 카드의 캡처를 상단 중앙에 배치");
assertContains(webHtml, "isPriority ? \"priority\" : \"report-full\"", "전체 부분에 공통 세로형 카드 적용");
assertContains(webHtml, "function briefIssueText(segment)", "전체 부분의 간략한 문제점 생성 함수 존재");
assertContains(webHtml, "확인할 문제:", "전체 부분의 간략한 문제점 문구 존재");
assertContains(webHtml, "function segmentIssueDetails(segment, limit = 2)", "리포트 카드 핵심 문제 선별 함수 존재");
assertContains(webHtml, ".slice(0, 4)", "우선 확인 구간을 최대 4개로 제한");
assertContains(webHtml, "async function saveJpgReport()", "A4 카드 리포트 생성 시 캡처 이미지 로드를 기다리는 비동기 처리 적용");
assertContains(webHtml, "function loadImageAsync(src)", "캡처 이미지 사전 로드 함수 존재");
assertContains(webHtml, "function shot(img, x, y, w, h", "A4 카드 리포트에 동작별 캡처 프레임 표시 함수 존재");
assertContains(webHtml, "topWeakShots[index]", "우선 보완할 구간 카드에 캡처 프레임 연결");
assertContains(webHtml, "async function buildFilmstrip(", "경계·분할 지점 프레임 필름스트립 생성 함수 존재");
assertContains(webHtml, "async function captureThumbAt(", "필름스트립용 썸네일 캡처 함수 존재");
assertContains(webHtml, "function classifyStanceFromLandmarks(", "서기 자동 분류 함수 존재");
assertContains(webHtml, "async function cascadeAdjustBoundary(", "뒤 구간 연쇄 재조정 함수 존재");
assertContains(webHtml, "class=\"seg-time-input\"", "동작 카드 시작/종료 초 직접 입력란 존재");
assertContains(webHtml, "cascadeAdjustBoundary(Number(input.dataset.boundary)", "동작 카드 초 입력이 연쇄 재조정 함수와 연결됨");
assertContains(webHtml, "async function findStanceMatch(", "서기 자동 탐색 함수 존재");
assertContains(webHtml, "class=\"secondary seg-find-match\"", "맞는 위치 찾기 버튼 존재");
assertContains(webHtml, "const cached = (lastBoundaryCache?.frames || [])", "맞는 위치 찾기가 화면 영상을 탐색하지 않고 캐시 프레임 사용");
assertContains(webHtml, "const previousSegments = Array.isArray(latestReport.segments)", "수동 시간 수정 시 기존 대표 사진 재사용");
assertContains(webHtml, "video.addEventListener(\"pointerdown\", releaseManualReplayRange)", "수동 직접 재생 시 남은 구간 반복 자동 해제");
assertContains(webHtml, "const prepStart = (junbiMatch && Number.isFinite(junbiMatch.time))", "준비자세 포즈 매칭 성공 지점부터 준비 구간이 시작하도록 처리(박수 기반 아님)");
assertContains(webHtml, "function getEffectiveTrimStart(", "박수 이전 재생 잠금용 실질 시작점 함수 존재");
assertContains(webHtml, "준비자세 지점 · 잘못됐으면 여기서 고치세요", "준비 구간(준비자세 인식 지점) 시작 시각도 수정 가능하도록 안내 문구 존재");
assertContains(webHtml, "const lo = i === 0 ? 0 : b[i - 1] + 0.1", "0번 경계(준비자세 인식 지점) 연쇄 조정 지원");
assertContains(webHtml, "if (!manualEditMode && trimStart > 0", "수동 조정 모드에서는 준비자세 인식 이전 재생 잠금이 해제되어 직접 확인 가능");
assertContains(webHtml, "function findEnergySpike(", "오디오 에너지 스파이크 탐지(순수) 함수 존재");
assertContains(webHtml, "async function detectClapMomentFromAudio(", "오디오 파형 기반 박수 감지 함수 존재");
assertContains(webHtml, "clapTime = await detectClapMomentFromAudio(selectedFile", "오디오 기반 박수 감지가 1순위로 먼저 시도됨");
assertContains(webHtml, "clapTime = detectClapMoment(frames, clapSearchEnd);\n          if (clapTime != null) clapSource", "오디오 실패 시 손동작 기반 감지로 대체(폴백) 로직 존재");
assertContains(webHtml, "async function findKihapAudioMatch(", "기합(음성) 오디오 위치 탐색 함수 존재");
assertContains(webHtml, "async function computeAudioEnergyEnvelope(", "박수·기합 공용 오디오 에너지 계산 함수 존재");
assertContains(webHtml, "class=\"secondary seg-find-kihap\"", "기합 구간 소리 확인 버튼 존재");
assertContains(webHtml, "실제 기합 소리는", "기합 위치 불일치 안내 문구 존재");
assertContains(webHtml, "video.currentTime < trimStart - 0.05", "박수 이전으로 탐색 시 자동으로 앞으로 밀어내는 로직 존재");
assertContains(webHtml, "video.currentTime = trimStart;\n          video.play", "전체 반복재생이 0초가 아닌 박수 시점으로 되돌아가도록 처리");
assertContains(webHtml, "segmentsEl.dataset.applyMatchDelegated", "동적 적용 버튼에 이벤트 위임 적용(직접 바인딩 시 늦게 생긴 버튼은 반응 안 함)");
assertContains(webHtml, "function expectedStanceFor(", "동작명에서 기대 서기 추출 함수 존재");
assertContains(webHtml, "function checkStanceMatch(", "서기 교차검증 함수 존재");
assertContains(webHtml, "stanceCheck = checkStanceMatch(", "구간 평가에 서기 교차검증 연결");
assertContains(webHtml, "서기 불일치", "서기 불일치 경고 배지 존재");
assertContains(webHtml, "function bannerShouldBeVisible(", "파트너 배너 노출 판정 함수 존재");
assertContains(webHtml, "function parseKSTLocalInput(", "한국시간 입력 파싱 함수 존재");
assertContains(webHtml, "id=\"adminBannerImageFile\"", "관리자 배너 이미지 파일 선택 입력 존재");
assertContains(webHtml, "accept=\"image/*\"", "배너 파일 선택은 이미지 형식으로 제한");
assertContains(webHtml, "accept=\"image/*\" multiple", "배너 이미지 여러 장 동시 선택 지원");
assertContains(webHtml, "한 장씩 추가해도 됩니다", "광고 이미지를 한 장씩 쉽게 추가할 수 있다고 안내");
assertContains(webHtml, "id=\"adminCampaignEditorList\"", "광고마다 별도 설정을 입력하는 목록 존재");
assertContains(webHtml, "12개월(1년)", "각 광고의 노출 기간을 최대 1년까지 선택");
assertContains(webHtml, "function addKSTMonths(", "배너 종료일을 한국 시간 기준 개월 수로 자동 계산");
assertContains(webHtml, "campaign.endAt = addKSTMonths(", "광고별 개월 수를 실제 저장 종료일에 반영");
assertNotContains(webHtml, "id=\"adminBannerEnd\"", "어려운 종료 날짜 직접 입력 제거");
assertContains(webHtml, "async function readBannerImageFiles(", "배너 이미지 파일 준비 함수 존재");
assertContains(webHtml, "fileList.length > 10", "배너 이미지 최대 10장 제한 존재");
assertContains(webHtml, "totalSize > 600 * 1024", "Firestore 문서 크기를 보호하는 전체 600KB 제한 존재");
assertContains(webHtml, "reader.readAsDataURL(file)", "유료 Storage 없이 배너 이미지를 Firestore용 data URL로 변환");
assertContains(webHtml, "banner_save_timeout", "배너 저장이 무한 대기하지 않는 시간 제한 존재");
assertContains(webHtml, "이 사진을 누르면 이동할 사이트", "광고 이미지마다 개별 사이트 주소 입력 존재");
assertNotContains(webHtml, "id=\"adminBannerImage\"", "배너 이미지 URL 직접 입력 제거");
assertContains(webHtml, "id=\"partnerBanner\" class=\"app-footer-campaign-group\"", "관리자 배너 여러 장이 기존 하단 흰색 광고 띠 안에 배치됨");
assertContains(webHtml, "id=\"partnerBannerClone\"", "끊김 없는 자동 이동용 광고 묶음 존재");
assertContains(webHtml, "function bannerCampaigns(", "기존 한 장과 새 광고별 저장 형식 모두 읽기");
assertContains(webHtml, "JSON.stringify({ version: 2, campaigns: draftCampaigns })", "각 광고의 이미지·사이트·기간을 기존 Firestore 필드에 함께 저장");
assertNotContains(webHtml, "class=\"partner-banner\"", "관리자 배너가 별도 검은 띠를 만들지 않음");
assertContains(webHtml, "@keyframes footer-partner-marquee-right", "광고판 왼쪽에서 오른쪽 자동 이동 정의");
assertContains(webHtml, "id=\"adminModeTrigger\"", "관리자 모드 진입 버튼 존재");
assertContains(webHtml, "class=\"admin-logo-trigger\"", "관리자 진입을 몸가짐운동센터 로고 버튼에 연결");
assertNotContains(webHtml, "class=\"admin-mode-trigger\">관리자 모드</button>", "화면에 보이는 관리자 모드 글자 버튼 제거");
assertContains(webHtml, "pinInput.value === ADMIN_PIN", "관리자 PIN 확인 로직 존재");
assertContains(webHtml, "function detectClapMoment(", "박수 시점 감지 함수 존재");
assertContains(webHtml, "activeRange.clapDetected = clapTime != null", "박수 감지 결과는 기록만 하고(참고용) 시작점 판정에는 관여하지 않음");
assertNotContains(webHtml, "activeRange.start = clamp(clapTime + 0.15", "박수가 정점 기반 동작1 온셋(activeRange.start)을 덮어쓰던 예전 버그 재발 방지");
assertContains(webHtml, "function scoreJunbiPose(", "국기원 준비서기 기준 포즈 매칭 점수 함수 존재");
assertContains(webHtml, "function getPointLenient(", "준비자세 손목 판정용 완화된 visibility 임계값 함수 존재(실측: 손이 겹쳐 가려지는 손목 대응)");
assertContains(webHtml, "function videoFingerprint(", "영상별 보정 저장용 지문(파일명+크기) 함수 존재");
assertContains(webHtml, "function saveVideoCorrection(", "영상별 보정 로컬 저장 함수 존재");
assertContains(webHtml, "function getVideoCorrection(", "영상별 보정 로컬 조회 함수 존재");
assertContains(webHtml, "async function loadSavedVideoCorrection()", "저장된 영상별 보정을 불러와 적용하는 함수 존재");
assertContains(webHtml, "const cached = cacheKey && !savedCorrectionForRun", "저장 보정이 있는 영상은 보정 전 빠른 캐시를 사용하지 않음");
assertContains(webHtml, "if (cacheKey && savedCorrectionForRun) stableAnalysisCache.delete(cacheKey)", "같은 영상 재분석 시 오래된 자동 결과 캐시 제거");
assertContains(webHtml, "function analyzeCorrectionRecords(", "보정 기록 분석 함수(analyze-corrections.js 이식) 존재");
assertContains(webHtml, "function buildCorrectionRuleSuggestions(", "규칙 개선 제안 생성 함수 존재");
assertContains(webHtml, "async function loadAndRenderCorrectionReport()", "학습 리포트 조회·렌더 함수 존재");
assertContains(webHtml, "_fbSignIn = authMod.signInWithEmailAndPassword", "관리자 이메일/비밀번호 로그인 연동 존재(배너 PIN과 별개의 진짜 인증)");
assertContains(webHtml, 'id="adminEmailInput"', "학습 리포트 로그인 폼 존재");
assertContains(webHtml, 'id="adminReportPanel"', "학습 리포트 패널 존재");
assertContains(webHtml, "loadSavedVideoCorrection();\n            }, 300);", "저장된 영상별 보정이 재분석 시 자동으로(클릭 없이) 적용됨");
assertContains(webHtml, "saveVideoCorrection(videoFingerprint(selectedFile), selectedPoomsaeKey, boundaries, rebuiltMoveIndexBoundaries)", "수동 조정이 반영될 때마다 영상별 보정이 자동 저장됨");
assertContains(webHtml, 'id="loadSavedCorrectionBtn"', "저장된 보정 불러오기 버튼 존재");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "allow update, delete: if false", "corrections 컬렉션은 그 누구도 고치거나 지울 수 없음(무결성 보호)");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "request.auth != null && request.auth.token.email in ADMIN_EMAILS()", "corrections 컬렉션 읽기는 인증된 관리자로만 제한됨(익명 읽기 차단, 학습 리포트 기능용)");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "'cascade_adjust'", "연쇄 시작점·경계 보정 기록이 클라우드 학습 데이터로 허용됨");
assertContains(webHtml, "function findJunbiPoseStart(", "준비자세(이미지1) 매칭으로 품새 시작점을 찾는 함수 존재");
assertContains(webHtml, "const JUNBI_MATCH_THRESHOLD = 0.8", "준비자세 인식 임계값(80%) 존재");
assertContains(webHtml, "준비자세를 뚜렷하게 인식하지 못해", "준비자세 미인식 시 안내 문구 존재");
assertContains(webHtml, "const onsetCandidate = detectActionOnset(motionSamples, activeRange, duration)", "첫 동작 시작점 급상승·정점 교차검증이 실제 분석 경로에 연결됨");
assertContains(webHtml, "onsetCandidate <= coarseOnset + maxOnsetRefine", "시작점 교차검증 이동량 안전 제한 존재");
assertContains(webHtml, "function interpolateLandmarksAt(", "스켈레톤 좌표 보간 함수 존재");
assertContains(webHtml, "function drawSkeletonFrame(", "스켈레톤 그리기 함수 존재");
assertContains(webHtml, "function skeletonRenderLoop(", "스켈레톤 렌더 루프 함수 존재");
assertContains(webHtml, "id=\"skeletonToggle\"", "스켈레톤 ON/OFF 스위치 존재");
assertContains(webHtml, "poomsae-skeleton", "스켈레톤 설정 자동 저장(localStorage) 존재");
assertContains(webHtml, "id=\"replaySkeletonCanvas\"", "구간 반복 재생 창에도 스켈레톤 캔버스 존재");
assertContains(webHtml, "function summarize(results, view, rangeInfo)", "summarize 함수가 준비자세·박수 판정 정보를 매개변수로 받음(범위 밖 변수 참조 버그 방지)");
assertContains(webHtml, "summarize(results, fusedView, boundaryDetectionForRun ? boundaryDetectionForRun.activeRange : null)", "summarize 호출부에서 박수 정보를 명시적으로 전달");
assertContains(webHtml, "동작명 자동 추정", "동작명과 영상 불일치 가능성 안내 존재");
assertContains(webHtml, "skeletonMotionScore", "관절 각도와 중심 이동을 포함한 스켈레톤 움직임 분석");
assertContains(webHtml, "chooseCompletionSnapshotTimes", "구간 후반 가장 안정적인 스켈레톤 자세를 대표 장면으로 선택");
assertContains(webHtml, "detectActiveMotionRange", "영상 앞뒤 대기 시간을 제외한 실제 품새 활성 구간 탐색");
assertContains(webHtml, "duration * 2.6", "구간 감지를 초당 2.6회 수준으로 유지");
assertContains(webHtml, "./assets/momgagym-logo.jpg", "앱 하단 몸가짐운동센터 로고 존재");
assertContains(webHtml, "제작: 울산 몸가짐운동센터", "앱 하단 제작 정보 존재");
assertContains(webHtml, "https://blog.naver.com/posture_gym/222560486461", "김동규 센터장 소개 링크 존재");
assertContains(webHtml, ">김동규 센터장</a>", "김동규 센터장 이름에 소개 링크 연결");
assertContains(webHtml, "@posture_gym_official", "앱 하단 인스타그램 정보 존재");
assertContains(webHtml, "blog.naver.com/posture_gym", "앱 하단 블로그 정보 존재");
assertContains(webHtml, "0507-1366-0466", "앱 하단 문의 전화번호 존재");
assertContains(webHtml, "./assets/partner-taekwondo-logos.png", "새 가로형 파트너 로고 존재");
assertContains(webHtml, "제작: 울산 몸가짐운동센터</p>\n          <p>제작자: <a", "제작자 링크 정보를 한 줄 아래에 표시");
assertContains(webHtml, "<div class=\"app-footer-partner-block\">\n          <div class=\"app-footer-partner-track\">", "파트너 광고판을 운동센터 로고와 제작 정보 위에 표시");
assertContains(webHtml, "flex: 0 0 clamp(96px, 14vw, 150px)", "광고 로고를 가까운 고정 너비로 배치");
assertContains(webHtml, "gap: 2px", "광고 사이 간격을 가깝게 적용");
assertContains(webHtml, "class=\"app-footer-marquee-copy\"", "광고와 고정 로고를 같은 폭의 반복 묶음으로 구성");
assertContains(webHtml, "@media (hover: hover) and (pointer: fine)", "터치 기기에서는 광고 자동 이동을 멈추지 않음");
  assertContains(webHtml, "from { transform: translate3d(var(--footer-marquee-shift), 0, 0); }", "광고가 왼쪽에서 오른쪽으로 이동");
assertContains(webHtml, "#segmentsSection:has(#segments:empty) { display: none; }", "분석 전 비어 있는 빨간 표시 영역 제거");
assertContains(webHtml, "border: 0;", "하단 광고 로고 테두리 제거");
assertContains(webHtml, "https://www.instagram.com/yongin_kr", "용인대 국가대표태권도 인스타그램 링크 존재");
assertContains(webHtml, "aria-label=\"용인대 국가대표태권도 인스타그램 @yongin_kr 새 창으로 열기\"", "용인대 로고 클릭 접근성 설명 존재");
assertContains(webHtml, ".yongin-logo-link", "용인대 국가대표태권도 로고 전용 클릭 영역 존재");
assertNotContains(webHtml, "class=\"partner-instagram\"", "파트너 로고 아래 인스타그램 문구 제거");
assertNotContains(webHtml, "용인대 국가대표태권도 인스타그램: <a", "파트너 로고 아래 텍스트 링크 제거");
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

// ── 이번 개정(로컬 명조·테마·순방향 스캔·쉬운 피드백) 검증 ──
assertContains(webHtml, "@font-face", "로컬 명조 @font-face 선언 존재");
assertContains(webHtml, "./assets/fonts/NotoSerifKR-SemiBold.woff2", "로컬 명조 SemiBold 연결");
assertContains(webHtml, "./assets/fonts/NotoSerifKR-Bold.woff2", "로컬 명조 Bold 연결");
assertContains(webHtml, "./assets/fonts/NotoSerifKR-Black.woff2", "로컬 명조 Black 연결");
assertNotContains(webHtml, "fonts.googleapis.com", "외부 Google Fonts CSS 의존성 제거");
assertNotContains(webHtml, "fonts.gstatic.com", "외부 Google Fonts 폰트 호스트 의존성 제거");
assertFileExists(path.join(root, "www", "assets", "fonts", "NotoSerifKR-SemiBold.woff2"), "로컬 명조 SemiBold 파일 존재");
assertFileExists(path.join(root, "www", "assets", "fonts", "NotoSerifKR-Bold.woff2"), "로컬 명조 Bold 파일 존재");
assertFileExists(path.join(root, "www", "assets", "fonts", "NotoSerifKR-Black.woff2"), "로컬 명조 Black 파일 존재");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "assets/fonts/NotoSerifKR-Bold.woff2", "서비스워커에 로컬 명조 오프라인 캐시 등록");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "models/pose_landmarker_lite.task", "www 서비스워커에 포즈 모델 오프라인 캐시 등록");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "vision_wasm_internal.wasm", "www 서비스워커에 MediaPipe WASM 오프라인 캐시 등록");
assertContains(readUtf8(rootServiceWorkerPath), "www/models/pose_landmarker_lite.task", "최상단 서비스워커에 포즈 모델 오프라인 캐시 등록");
assertContains(readUtf8(rootServiceWorkerPath), "vision_wasm_internal.wasm", "최상단 서비스워커에 MediaPipe WASM 오프라인 캐시 등록");
assertContains(readUtf8(path.join(root, "www", "service-worker.js")), "cache.put(event.request", "오프라인 엔진 런타임 캐시 저장 로직 존재");
assertContains(webHtml, "id=\"themeToggle\"", "다크·라이트 테마 토글 버튼 존재");
assertContains(webHtml, "poomsae-theme", "테마 선택 저장 키 존재");
assertContains(webHtml, "data-theme=\"light\"", "라이트 테마 토큰 정의 존재");
assertContains(webHtml, "await waitForSeek(requestedTime, true)", "경계 탐색은 빠른 seek 경로로 프레임 수집");
assertContains(webHtml, "function detectPoseAt", "단조 증가 타임스탬프 검출 래퍼 존재");
assertContains(webHtml, "ts <= lastDetectTimestampMs", "검출 타임스탬프 단조 증가 보정 존재");
assertContains(webHtml, "lastDetectTimestampMs = timestampBaseMs - 1", "분석 시작 시 검출 타임스탬프 하한 초기화");
assertNotContains(webHtml, "forwardScanFrames", "불안정한 순방향 재생 스캔 제거");
assertContains(webHtml, "kidProblem", "수련품새 쉬운 말 문제 설명 존재");
assertContains(webHtml, "kidFix", "수련품새 쉬운 말 수정 설명 존재");
assertContains(webHtml, "이렇게 고쳐요", "수련품새 카드의 쉬운 수정 안내 문구 존재");
assertContains(webHtml, "수정 우선순위", "경기품새 수정 우선순위 안내 존재");
assertContains(webHtml, "순위 —", "경기품새 우선순위 번호 표기 존재");

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
assertNotContainsInFiles("· v2", [webIndexPath, androidIndexPath], "이전 앱 버전 v2 문구 제거");
assertNotContainsInFiles("C:\\Users\\MOMGAGYM", [webIndexPath, androidIndexPath, buildStepsPath], "배포 코드/문서의 개인 PC 샘플 경로 제거");
assertNotContainsInFiles("AI 품새 코치", [webIndexPath, androidIndexPath], "이전 앱 이름 'AI 품새 코치' 제거");
assertNotContainsInFiles("품새 분석 AI플그램", [webIndexPath, androidIndexPath], "오타 앱 이름 '품새 분석 AI플그램' 제거");
assertNotContainsInFiles("감점 확정", [webIndexPath, androidIndexPath], "공식 판정처럼 보이는 표현 '감점 확정' 금지");
assertNotContainsInFiles("공식 판정", [webIndexPath, androidIndexPath], "공식 판정 표현 금지");
assertNotContainsInFiles("합격", [webIndexPath, androidIndexPath], "합격 판정 표현 금지");
assertNotContainsInFiles("불합격", [webIndexPath, androidIndexPath], "불합격 판정 표현 금지");
assertNotContainsInFiles("실격", [webIndexPath, androidIndexPath], "실격 판정 표현 금지");

// ── 학습된 경계 타이밍 보정(원격, 공개 읽기) ──
assertContains(webHtml, "function loadBoundaryBias(", "경계 보정값 로드 함수 존재");
assertContains(webHtml, "function getBoundaryBias(", "경계 보정값 조회 함수 존재");
assertContains(webHtml, "function applyLearnedBoundaryBias(", "경계 보정 적용 함수 존재");
assertContains(webHtml, "function buildCollectiveLearningProfiles(", "여러 기기의 최종 보정을 품새별 집단 학습값으로 모음");
assertContains(webHtml, "const LEARNING_STATS_SCHEMA = \"poomsae-learning-stats-v1\"", "누적 학습 통계 스키마 존재");
assertContains(webHtml, "function buildLearningStatsSnapshot(", "여러 기기 보정 데이터를 개인정보 없는 DB 요약으로 축적");
assertContains(webHtml, "async function publishLearningStatsSnapshot(", "관리자 백그라운드 반영 시 누적 학습 통계를 Firestore에 게시");
assertContains(webHtml, "async function loadLearningStats(", "앱이 누적 학습 통계를 읽어 신뢰도 안내에 반영");
assertContains(webHtml, "_fbDoc(_fbDB, \"app_config\", \"learning_stats\")", "학습 통계 Firestore 경로가 앱 코드에 연결됨");
assertContains(webHtml, "review_session_id: correctionSessionId", "한 영상의 여러 클릭을 하나의 검토 세션으로 구분");
assertContains(webHtml, "result_boundary_ratios", "기기와 영상 길이가 달라도 비교 가능한 최종 경계 비율을 수집");
assertContains(webHtml, "function applyCollectiveBoundaryProfile(", "공개 집단 학습 프로필을 다음 분석 경계에 반영");
assertContains(webHtml, "collectiveProfileApplied", "집단 학습 실제 적용 여부를 분석 결과에 기록");
assertContains(webHtml, "function buildLocalBoundaryBias(", "반복 사용 시 기기별 경계 보정 학습 함수 존재");
assertContains(webHtml, "refreshLocalBoundaryBias(log)", "사용자 보정 직후 기기별 학습값 자동 갱신");
assertContains(webHtml, "LOCAL_BOUNDARY_BIAS_MIN_SAMPLES = 3", "기기별 학습 최소 표본 안전장치 존재");
assertContains(webHtml, "LOCAL_BOUNDARY_BIAS_MAX_SHIFT = 0.6", "기기별 학습 이동량 제한 존재");
assertContains(webHtml, "target_total_bias_seconds", "잔차가 아닌 사용자 최종 목표 보정값 기록");
assertContains(webHtml, "targetCenter - remote", "전역 보정 게시 후 개인 보정 중복 적용 방지");
assertContains(webHtml, "CLOUD_CORRECTION_QUEUE_KEY", "오프라인 클라우드 학습 기록 재전송 대기열 존재");
assertContains(webHtml, "flushPendingCloudCorrections(); // 오프라인 때 쌓인 기록을 연결 즉시 재전송", "Firebase 연결 후 대기 학습 기록 자동 재전송");
assertContains(webHtml, "async function publishBoundaryBiasEntry(", "관리자용 보정값 게시 함수 존재");
assertContains(webHtml, "async function removeBoundaryBiasEntry(", "관리자용 보정값 제거 함수 존재");
assertContains(webHtml, "const BOUNDARY_BIAS_MAX_SHIFT = 1.5", "경계 보정 안전 상한(±1.5초) 존재");
assertContains(webHtml, "boundaries = applyLearnedBoundaryBias(boundaries, selectedPoomsaeKey, duration)", "감지된 경계에 학습 보정이 실제로 적용됨");
assertContains(webHtml, "apply-bias-btn", "학습 리포트에 보정 적용 버튼 존재");
assertContains(webHtml, "remove-bias-btn", "학습 리포트에 보정 제거 버튼 존재");
assertContains(webHtml, "bodyEl.dataset.biasDelegated", "보정 버튼 이벤트 위임 처리(동적 생성 버튼 대응)");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "match /app_config/boundary_bias", "경계 보정값 문서 규칙 존재");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "allow write: if request.auth != null && request.auth.token.email in ADMIN_EMAILS()", "경계 보정값 쓰기는 인증된 관리자로만 제한됨");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "&& request.resource.data.size() < 200", "경계 보정값 문서 크기 제한 존재");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "match /app_config/learning_stats", "누적 학습 통계 문서 규칙 존재");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "function isValidLearningStats(d)", "학습 통계 쓰기 검증 함수 존재");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "d.schema == 'poomsae-learning-stats-v1'", "학습 통계 스키마 검증 존재");

// ── 관리자 비밀번호 재설정 ──
assertContains(webHtml, "id=\"adminForgotPasswordBtn\"", "비밀번호 재설정 버튼 존재");
assertContains(webHtml, "_fbSendPasswordReset = authMod.sendPasswordResetEmail", "비밀번호 재설정 함수 임포트됨");
assertContains(webHtml, "await _fbSendPasswordReset(_fbAuth, email)", "재설정 버튼이 실제로 Firebase 재설정 메일 발송을 호출함");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "return ['momgagym@naver.com']", "관리자 이메일이 실제 값으로 설정됨(플레이스홀더 아님)");

// ── "이 결과 정확해요" 확인(confirm_all) — 안 고친 정상 케이스도 데이터로 수집 ──
assertNotContains(webHtml, "id=\"confirmAccurateBtn\"", "번거로운 '확인' 버튼이 제거되고 자동 확인으로 대체됨(UX 단순화)");
assertContains(webHtml, "function autoConfirmIfUnedited(", "자동 확인 함수 존재(버튼 없이 다음 영상으로 넘어갈 때 기록)");
assertContains(webHtml, "autoConfirmIfUnedited(); // 직전 영상이 안 고쳐진 채였다면", "새 영상 선택 시 자동 확인이 실제로 호출됨");
assertContains(webHtml, "document.addEventListener(\"visibilitychange\"", "탭 닫기 등에도 자동 확인이 누락되지 않도록 안전망 존재");
assertContains(webHtml, "recordCorrection(\"confirm_all\"", "확인 버튼이 confirm_all 액션으로 기록함");
assertContains(webHtml, "function expandConfirmRecords(records)", "확인 신호를 위치별로 펼치는 함수 존재(브라우저)");
assertContains(webHtml, "accuracy_rate: e.total > 0", "위치별 정확도(정확도=확인/전체) 계산 존재");
assertContains(readUtf8(path.join(root, "scripts", "analyze-corrections.js")), "function expandConfirmRecords(records)", "확인 신호를 위치별로 펼치는 함수 존재(Node)");
assertContains(readUtf8(path.join(root, "firebase", "firestore.rules")), "'merge', 'split', 'adjust', 'cascade_adjust', 'confirm_all'", "confirm_all 및 연쇄 보정 액션이 유효한 학습 기록으로 허용됨");

// ── 고신뢰 경계 타이밍 제안 자동 반영(버튼 없이) ──
assertContains(webHtml, "async function autoPublishHighConfidenceSuggestions(", "자동 반영 함수 존재");
assertContains(webHtml, "autoPublishHighConfidenceSuggestions(); // 관리자로 인식되면", "관리자 인증 확인 시 자동 반영이 실제로 호출됨");
assertContains(webHtml, "const AUTO_PUBLISH_MIN_INTERVAL_MS = 12 * 3600 * 1000", "자동 반영 확인 주기(12시간) 제한 존재(과도한 읽기 방지)");
assertContains(webHtml, ".filter((s) => s.type === \"boundary_shift\")", "자동 반영은 안전한 타이밍 보정 제안으로만 한정됨(분류·명칭 변경 제안 제외)");
assertContains(webHtml, "e.counts.adjust >= 5", "전 사용자 보정은 실제 수정 5건 이상일 때만 허용");
assertContains(webHtml, "e.counts.adjust / Math.max(e.total, 1) >= 0.3", "전 사용자 보정은 전체 리뷰 대비 수정률 30% 이상일 때만 허용");
assertContains(webHtml, "AUTO_PUBLISH_LOG_KEY", "자동 반영 이력이 로컬에 남아 리포트 화면에서 확인 가능함(투명성)");

// ── 관리자 모드 진입을 몸가짐운동센터 로고에 숨김 ──
assertContains(webHtml, "aria-label=\"관리자 설정 열기\"", "몸가짐운동센터 로고에 관리자 진입 접근성 이름 존재");
assertContains(webHtml, ".admin-logo-trigger:hover .app-footer-main-logo", "관리자 로고 버튼의 키보드·마우스 피드백 존재");
assertContains(webHtml, "document.body.dataset.wizardStep = String(wizardStep)", "모바일에서 현재 설정 단계만 집중 표시");
assertContains(webHtml, "body[data-wizard-step=\"1\"] #videoSection", "모바일 초기 단계에서 영상 영역 숨김");
assertContains(webHtml, ".camera-view-guide,\n        .camera-view-checklist,\n        .multi-device-panel", "모바일에서 긴 촬영 설명 기본 숨김");
assertContains(webHtml, ".wizard-nav {\n          /* 휴대폰의 하단 고정 메뉴와 겹치면", "모바일 단계 버튼이 품새 선택·분석 시작을 가리지 않음");
assertContains(webHtml, "position: static;\n          bottom: auto;", "모바일 단계 버튼을 문서 흐름에 배치");
assertContains(webHtml, "4단계만 따라 하면 돼요.", "초등학생용 짧은 시작 안내 적용");

if (failures.length) {
  console.error(`\nCross-check failed: ${failures.length} issue(s)`);
  process.exit(1);
}

console.log(`\nCross-check passed with ${warnings.length} warning(s).`);
