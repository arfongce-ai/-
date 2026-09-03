const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "www", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const rules = fs.readFileSync(path.join(__dirname, "..", "firebase", "firestore.rules"), "utf8");

function assertContains(pattern, message) {
  if (!pattern.test(html)) throw new Error(message);
}

assertContains(/findWidestCaptureCamera/, "초광각 후면 카메라 선택 로직이 없습니다.");
if (/id="captureZoomWide"/.test(html)) throw new Error("촬영 화면에 최대 축소 버튼이 남아 있습니다.");
if (/id="captureZoomRange"|id="captureZoomText"|capture-zoom-controls/.test(html)) {
  throw new Error("촬영 화면에 카메라 배율 HUD가 남아 있습니다.");
}
assertContains(/setWidestCaptureCameraZoom/, "카메라 전체 화각 적용 로직이 없습니다.");
assertContains(/function captureNativeZoomForFactor\(/, "표시 배율을 실제 카메라 줌으로 변환하는 로직이 없습니다.");
assertContains(/captureZoomFactor\s*=\s*Math\.max\(0\.5, Math\.min\(1,/, "카메라 배율이 0.5x~1.0x로 제한되지 않았습니다.");
assertContains(/track\.applyConstraints\(\{ advanced: \[\{ zoom: target \}\] \}\)/, "실제 카메라 트랙에 줌 배율을 적용하지 않습니다.");
assertContains(/bindCaptureCameraPinchZoom\(captureStage\)/, "HUD 없이 카메라 배율을 조절하는 핀치 줌이 없습니다.");
assertContains(/function captureZoomScale\(\)\s*\{[\s\S]*?return 1;/, "카메라 줌을 화면 요소 크기로 다시 적용하고 있습니다.");
if (/capturePreview\.style\.transform\s*=\s*`[^`]*scale\(/.test(html)) {
  throw new Error("카메라 미리보기에 CSS 확대/축소가 남아 있습니다.");
}
assertContains(/body\[data-app-page="capture"\][\s\S]*?\.capture-stage video[\s\S]*?object-fit:\s*contain/, "촬영 미리보기가 전체 화각을 보존하지 않습니다.");
assertContains(/cameraZoomGesture\s*=\s*"disabled"/, "촬영 화면에서 줌인 제스처가 비활성화되지 않았습니다.");
assertContains(/captureZoomFactor\s*=\s*0\.5/, "촬영 시작 시 0.5x 광각 고정이 적용되지 않았습니다.");
assertContains(/--capture-top-letterbox:\s*clamp\(/, "촬영 화면의 좁은 위쪽 레터박스가 없습니다.");
assertContains(/--capture-preview-height:\s*calc\(100vw \* 4 \/ 3\)/, "세로 촬영 화면이 3:4 비율이 아닙니다.");
assertContains(/top:\s*var\(--capture-preview-bottom\)[\s\S]*?background:\s*#000/, "카메라 아래쪽의 넓은 조작 레터박스가 분리되지 않았습니다.");
assertContains(/--capture-overlay-row-1:[\s\S]*?--capture-overlay-row-2:[\s\S]*?--capture-overlay-row-3:/, "촬영 오버레이가 겹치지 않도록 행이 분리되지 않았습니다.");
assertContains(/\.capture-focus-ring\s*\{\s*display:\s*none;/, "녹화 버튼과 겹치는 장식 오버레이가 남아 있습니다.");
assertContains(/numPoses:\s*3/, "Pose Landmarker가 3인 검출로 설정되지 않았습니다.");
assertContains(/collectCaptureLandmarks/, "분할 화면 3인 보강 검출이 없습니다.");
assertContains(/id="capturePairPose"[^>]*>복식전 · 2명/, "복식전 2인 촬영 선택이 없습니다.");
assertContains(/capturePoseMode\s*=\s*mode === "single" \? "single" : mode === "pair" \? "pair" : "multi"/, "복식전 촬영 모드가 연결되지 않았습니다.");
assertContains(/captureExpectedAthletes\(\)/, "촬영 경기 유형별 기대 인원 계산이 없습니다.");
assertContains(/스켈레톤 동시 인식 안정/, "복식·단체 스켈레톤 동시 인식 상태 표시가 없습니다.");
assertContains(/capture_mode:\s*captureCompetitionEvent\(\)/, "개인·복식·단체 촬영 메타데이터가 기록되지 않습니다.");
assertContains(/competitionEvent\s*=\s*selectedCaptureSessionMeta\.capture_mode/, "개인·복식·단체 촬영과 경기 분석이 자동 연결되지 않습니다.");
assertContains(/data-event="pair"/, "경기 분석에 복식전 선택이 없습니다.");
assertContains(/buildGroupConcurrentProfile/, "복식·단체 동시 인식 분석이 없습니다.");
assertContains(/timing_sync_score/, "복식·단체 동작 타이밍 일치 분석이 없습니다.");
assertContains(/athleteMetrics/, "복식·단체 선수별 분석 결과가 없습니다.");
assertContains(/INDIVIDUAL_ANALYSIS_POSE_OPTIONS/, "개인전 전용 Pose 신뢰도 설정이 없습니다.");
assertContains(/PAIR_ANALYSIS_POSE_OPTIONS/, "복식전 전용 Pose 신뢰도 설정이 없습니다.");
assertContains(/TEAM_ANALYSIS_POSE_OPTIONS/, "단체전 전용 Pose 신뢰도 설정이 없습니다.");
assertContains(/detectAnalysisPosesAt/, "다인 분석의 작은 선수 크롭 재검출이 없습니다.");
assertContains(/stabilizeAnalysisPoseTracks/, "복식·단체 선수 추적 순서 안정화가 없습니다.");
assertContains(/track_stability/, "선수별 추적 안정성 기록이 없습니다.");
assertContains(/poomsae-pair-analysis-v1/, "복식전 저장 스키마가 없습니다.");
assertContains(/LOCAL_PAIR_REPORT_HISTORY_KEY/, "복식전 로컬 기록 저장소가 없습니다.");
assertContains(/pair_data:/, "클라우드 학습 리포트에 복식전 데이터가 없습니다.");
assertContains(/savePairReportLocally/, "복식전 분석 기록 저장 함수가 없습니다.");
assertContains(/poomsae-team-analysis-v1/, "단체전 저장 스키마가 없습니다.");
assertContains(/LOCAL_TEAM_REPORT_HISTORY_KEY/, "단체전 로컬 기록 저장소가 없습니다.");
assertContains(/team_data:/, "클라우드 학습 리포트에 단체전 데이터가 없습니다.");
assertContains(/athlete_detection_ratios/, "선수별 검출 데이터가 기록되지 않습니다.");
assertContains(/LOCAL_INDIVIDUAL_REPORT_HISTORY_KEY/, "개인전 로컬 기록 저장소가 없습니다.");
assertContains(/individual_data:/, "클라우드 학습 리포트에 개인전 데이터가 없습니다.");
assertContains(/poomsae-individual-analysis-v1/, "개인전 저장 스키마가 없습니다.");
assertContains(/saveIndividualReportLocally/, "개인전 로컬 저장 함수가 없습니다.");
assertContains(/LOCAL_EVENT_REPORT_HISTORY_KEY/, "세 종목 통합 로컬 데이터 저장소가 없습니다.");
assertContains(/saveEventReportLocally/, "세 종목 통합 리포트 저장 함수가 없습니다.");
assertContains(/poomsae-event-quality-v1/, "세 종목 공통 데이터 품질 스키마가 없습니다.");
assertContains(/usable_for_learning/, "낮은 품질 데이터를 학습에서 제외하는 게이트가 없습니다.");
assertContains(/flushPendingCloudReports\(\);/, "앱 재실행 시 대기 중인 학습 리포트를 자동 전송하지 않습니다.");
assertContains(/capture_mode === "individual"/, "개인 촬영과 개인전 분석이 자동 연결되지 않습니다.");
assertContains(/CAPTURE_TRAIL_DURATION_MS\s*=\s*2400/, "촬영 잔상이 2초 이상 유지되지 않습니다.");
assertContains(/function captureTrailGradient\(key, age\)/, "촬영 잔상 그라데이션 함수가 없습니다.");
assertContains(/Math\.pow\(1 - clampedAge, 1\.6\)/, "촬영 잔상이 시간에 따라 부드럽게 사라지지 않습니다.");
assertContains(/ctx\.lineWidth\s*=\s*4\.5\s*\+\s*gradient\.freshness/, "실시간 잔상 선 굵기 그라데이션이 없습니다.");
assertContains(/Math\.max\(6, width \/ 140\).*gradient\.freshness/, "저장 영상 잔상 선 굵기 그라데이션이 없습니다.");
assertContains(/ctx\.shadowBlur\s*=\s*gradient\.freshness/, "촬영 잔상의 최신 위치 강조 효과가 없습니다.");
assertContains(/analysis_link_id:/, "촬영·분석·비교 연결용 분석 ID가 없습니다.");
assertContains(/registerAnalysisForComparison/, "분석 결과를 비교 이력에 연결하지 않습니다.");
assertContains(/id="resultCompareBtn"/, "분석 결과에서 비교로 이동하는 버튼이 없습니다.");
assertContains(/before_analysis:/, "비교 리포트에 이전 분석 연결 정보가 없습니다.");
assertContains(/after_analysis:/, "비교 리포트에 현재 분석 연결 정보가 없습니다.");
assertContains(/id="compareEventSelect"/, "비교 화면에 개인·복식·단체 선택이 없습니다.");
assertContains(/detectComparePoses/, "비교 화면에서 복수 선수 스켈레톤을 확인하지 않습니다.");
assertContains(/compareAnalysisCompatibility/, "서로 다른 경기 유형이나 품새의 비교 차단이 없습니다.");
assertContains(/analysisReliabilitySummary/, "다중 카메라 분석 신뢰도 요약이 없습니다.");
assertContains(/confidence_gain_vs_best_single/, "카메라 증가에 따른 신뢰도 향상값이 없습니다.");
assertContains(/function previewAdjustedSegment\(/, "수동 시간 수정 후 구간 미리보기 갱신이 없습니다.");
assertContains(/modalReplayRange\s*=\s*\{/, "수동 시간 수정 후 팝업 재생 범위 갱신이 없습니다.");
if (!rules.includes("poomsae-learning-report-v3")
  || !rules.includes("poomsae-event-quality-v1")
  || !rules.includes("poomsae-team-analysis-v1")
  || !rules.includes("poomsae-pair-analysis-v1")
  || !rules.includes("poomsae-individual-analysis-v1")) {
  throw new Error("Firestore 규칙이 개인전·복식전·단체전 v3 저장 스키마를 허용하지 않습니다.");
}
if (!rules.includes("d.camera_count is number") || !rules.includes("d.analysis_confidence is number")) {
  throw new Error("Firestore 규칙이 카메라 수와 분석 신뢰도 저장을 검증하지 않습니다.");
}

const inlineScripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source, index) => {
  const parseableSource = source.replace(/^\s*import\s+[^;]+;\s*$/gm, "");
  try { new Function(parseableSource); }
  catch (error) { throw new Error(`인라인 스크립트 ${index + 1} 문법 오류: ${error.message}`); }
});

console.log("Individual, pair, and team capture checks passed.");
