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
assertContains(/track\.applyConstraints\(\{ advanced: \[\{ zoom: target \}\] \}\)/, "실제 카메라 트랙에 줌 배율을 적용하지 않습니다.");
assertContains(/bindCaptureCameraPinchZoom\(captureStage\)/, "HUD 없이 카메라 배율을 조절하는 핀치 줌이 없습니다.");
assertContains(/function captureZoomScale\(\)\s*\{[\s\S]*?return 1;/, "카메라 줌을 화면 요소 크기로 다시 적용하고 있습니다.");
if (/capturePreview\.style\.transform\s*=\s*`[^`]*scale\(/.test(html)) {
  throw new Error("카메라 미리보기에 CSS 확대/축소가 남아 있습니다.");
}
assertContains(/object-fit:\s*contain/, "촬영 미리보기가 센서 전체 화각을 사용하지 않습니다.");
assertContains(/numPoses:\s*3/, "Pose Landmarker가 3인 검출로 설정되지 않았습니다.");
assertContains(/collectCaptureLandmarks/, "분할 화면 3인 보강 검출이 없습니다.");
assertContains(/3\/3명 · 동시 인식 안정/, "3인 동시 인식 상태 표시가 없습니다.");
assertContains(/capture_mode:\s*capturePoseMode === "multi" \? "team"/, "단체 촬영 메타데이터가 기록되지 않습니다.");
assertContains(/competitionEvent\s*=\s*selectedCaptureSessionMeta\.capture_mode/, "개인·단체 촬영과 경기 분석이 자동 연결되지 않습니다.");
assertContains(/poomsae-team-analysis-v1/, "단체전 저장 스키마가 없습니다.");
assertContains(/LOCAL_TEAM_REPORT_HISTORY_KEY/, "단체전 로컬 기록 저장소가 없습니다.");
assertContains(/team_data:/, "클라우드 학습 리포트에 단체전 데이터가 없습니다.");
assertContains(/athlete_detection_ratios/, "선수별 검출 데이터가 기록되지 않습니다.");
assertContains(/LOCAL_INDIVIDUAL_REPORT_HISTORY_KEY/, "개인전 로컬 기록 저장소가 없습니다.");
assertContains(/individual_data:/, "클라우드 학습 리포트에 개인전 데이터가 없습니다.");
assertContains(/poomsae-individual-analysis-v1/, "개인전 저장 스키마가 없습니다.");
assertContains(/saveIndividualReportLocally/, "개인전 로컬 저장 함수가 없습니다.");
assertContains(/capture_mode === "individual"/, "개인 촬영과 개인전 분석이 자동 연결되지 않습니다.");
assertContains(/CAPTURE_TRAIL_DURATION_MS\s*=\s*2400/, "촬영 잔상이 2초 이상 유지되지 않습니다.");
assertContains(/ctx\.lineWidth\s*=\s*4\.5\s*\+/, "실시간 잔상 선 굵기가 확대되지 않았습니다.");
assertContains(/Math\.max\(6, width \/ 140\)/, "저장 영상 잔상 선 굵기가 확대되지 않았습니다.");
assertContains(/analysis_link_id:/, "촬영·분석·비교 연결용 분석 ID가 없습니다.");
assertContains(/registerAnalysisForComparison/, "분석 결과를 비교 이력에 연결하지 않습니다.");
assertContains(/id="resultCompareBtn"/, "분석 결과에서 비교로 이동하는 버튼이 없습니다.");
assertContains(/before_analysis:/, "비교 리포트에 이전 분석 연결 정보가 없습니다.");
assertContains(/after_analysis:/, "비교 리포트에 현재 분석 연결 정보가 없습니다.");
assertContains(/analysisReliabilitySummary/, "다중 카메라 분석 신뢰도 요약이 없습니다.");
assertContains(/confidence_gain_vs_best_single/, "카메라 증가에 따른 신뢰도 향상값이 없습니다.");
assertContains(/function previewAdjustedSegment\(/, "수동 시간 수정 후 구간 미리보기 갱신이 없습니다.");
assertContains(/modalReplayRange\s*=\s*\{/, "수동 시간 수정 후 팝업 재생 범위 갱신이 없습니다.");
if (!rules.includes("poomsae-learning-report-v2")
  || !rules.includes("poomsae-team-analysis-v1")
  || !rules.includes("poomsae-individual-analysis-v1")) {
  throw new Error("Firestore 규칙이 개인전·단체전 v2 저장 스키마를 허용하지 않습니다.");
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

console.log("Team capture checks passed.");
