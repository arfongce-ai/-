// 준비자세(기본 준비서기, 이미지1) 포즈 매칭 회귀 테스트.
// 배경: 박수는 다중 카메라 동기화 참고용 신호일 뿐 품새 시작점이 아니므로(2026-07-22
// 사용자 확인), 실제 시작점은 국기원 준비서기 기준과의 포즈 일치도로 판별한다. 이 스크립트는
// index.html의 실제 함수(scoreJunbiPose/findJunbiPoseStart/rangeScore)를 추출해 합성
// MediaPipe 랜드마크로 검증한다.
const fs = require("fs");
const path = require("path");

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");

function extractFn(sig) {
  const s = html.indexOf(sig);
  if (s === -1) { console.error("함수를 찾지 못함:", sig); process.exit(1); }
  let d = 0, i = html.indexOf("{", s), e = -1;
  for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}") { d--; if (d === 0) { e = i + 1; break; } } }
  return html.slice(s, e);
}
function extractConst(sig) {
  const s = html.indexOf(sig);
  if (s === -1) { console.error("상수를 찾지 못함:", sig); process.exit(1); }
  const e = html.indexOf(";", s);
  return html.slice(s, e + 1);
}

const fns = new Function("clamp",
  extractConst("const JUNBI_MATCH_THRESHOLD =") + "\n" +
  extractConst("const JUNBI_SUSTAIN_WINDOW =") + "\n" +
  extractConst("const JUNBI_SUSTAIN_MIN_PASS =") + "\n" +
  extractFn("function getPoint(landmarks") + "\n" +
  extractFn("function getPointLenient(landmarks") + "\n" +
  extractFn("function distance(a, b)") + "\n" +
  extractFn("function bodyScale(landmarks)") + "\n" +
  extractFn("function jointAngleDeg(a, b, c)") + "\n" +
  extractFn("function rangeScore(value") + "\n" +
  extractFn("function scoreJunbiPose(landmarks)") + "\n" +
  extractFn("function findJunbiPoseStart(frames") + "\n" +
  "return { scoreJunbiPose, findJunbiPoseStart, rangeScore };"
)(clamp);

let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// ── 합성 랜드마크(MediaPipe 33포인트 중 이 판정에 쓰이는 인덱스만) ──
// 기본값 = 이미지1과 같은 표준 준비자세: 다리를 펴고 서서(무릎 각도 180°),
// 두 손목을 몸 중심선의 단전 높이(골반선 부근)에 가까이 모은 자세.
function makeLandmarks(overrides = {}) {
  const base = {
    11: { x: 0.42, y: 0.30 }, 12: { x: 0.58, y: 0.30 }, // 어깨
    23: { x: 0.44, y: 0.55 }, 24: { x: 0.56, y: 0.55 }, // 골반
    25: { x: 0.44, y: 0.75 }, 26: { x: 0.56, y: 0.75 }, // 무릎
    27: { x: 0.44, y: 0.95 }, 28: { x: 0.56, y: 0.95 }, // 발목
    15: { x: 0.47, y: 0.56 }, 16: { x: 0.53, y: 0.56 }, // 손목(단전 앞에 모음)
  };
  const merged = { ...base, ...overrides };
  const arr = [];
  for (let i = 0; i <= 32; i += 1) arr[i] = { x: 0.5, y: 0.5, visibility: 0 };
  for (const k of Object.keys(merged)) arr[k] = { ...merged[k], visibility: merged[k].visibility ?? 1 };
  return arr;
}

// 1) 이미지1과 같은 표준 준비자세 → 임계값(0.8) 이상, 사실상 만점.
{
  const r = fns.scoreJunbiPose(makeLandmarks());
  check(r.score >= 0.8, `표준 준비자세 점수 ${r.score} ≥ 0.8(임계값)`);
}

// 2) 무릎을 깊이 굽힌 동작 중 자세(다리 펴짐 조건 위반) → 임계값 미만.
{
  const r = fns.scoreJunbiPose(makeLandmarks({ 25: { x: 0.20, y: 0.72 } }));
  check(r.score < 0.8, `무릎 굽힌 자세 점수 ${r.score} < 0.8(준비자세 아님)`);
}

// 3) 차렷(손을 몸 양옆에 늘어뜨림) → 무릎·손높이·좌우대칭·발너비는 우연히 준비자세와
//    비슷해도, 손이 모여있지 않으므로(gapScore) 임계값 미만이어야 한다.
{
  const r = fns.scoreJunbiPose(makeLandmarks({ 15: { x: 0.40, y: 0.55 }, 16: { x: 0.60, y: 0.55 } }));
  check(r.score < 0.8, `차렷(손 옆으로) 점수 ${r.score} < 0.8(준비자세와 구분됨)`);
}

// 4) 한쪽 팔을 들어올린 동작 중(지르기·막기 등) → 손목 높이·간격·대칭 모두 무너져 낮은 점수.
{
  const r = fns.scoreJunbiPose(makeLandmarks({ 15: { x: 0.50, y: 0.20 } }));
  check(r.score < 0.8, `한쪽 팔을 든 동작 중 점수 ${r.score} < 0.8`);
}

// 5) findJunbiPoseStart: 영상 초반(카메라 준비 중 등)은 자세가 흐트러져 있다가 이후
//    준비자세로 안정되는 합성 프레임에서, 안정화가 시작된 시점을 정확히 찾아야 한다.
{
  const messyWrist = { 15: { x: 0.30, y: 0.40 }, 16: { x: 0.70, y: 0.60 } };
  const frames = [];
  for (let i = 0; i < 5; i += 1) frames.push({ time: Number((i * 0.2).toFixed(2)), landmarks: makeLandmarks(messyWrist) });
  for (let i = 5; i < 20; i += 1) frames.push({ time: Number((i * 0.2).toFixed(2)), landmarks: makeLandmarks() });
  const result = fns.findJunbiPoseStart(frames, 4.0);
  check(result.time != null, "안정된 준비자세 구간에서 시작 시각을 찾음(null 아님)");
  check(result.time != null && result.time >= 0.95 && result.time <= 1.4, `시작 시각(${result.time})이 자세 안정화 직후 구간에 위치`);
}

// 6) 준비자세와 계속 불일치(끊임없이 움직임)하면 시작점을 null로 반환한다(과잉 확신 방지 —
//    실제 앱에서는 이 경우 prepStart가 0초로 안전하게 폴백된다).
{
  const frames = [];
  for (let i = 0; i < 15; i += 1) {
    const t = i * 0.2;
    frames.push({
      time: Number(t.toFixed(2)),
      landmarks: makeLandmarks({ 15: { x: 0.20 + t * 0.05, y: 0.40 }, 16: { x: 0.80 - t * 0.05, y: 0.60 } })
    });
  }
  const result = fns.findJunbiPoseStart(frames, 3.0);
  check(result.time == null, "준비자세 불일치가 계속되면 시작점 null(안전한 미판정)");
}

// 7) rangeScore: 이상 구간 내부는 만점, 하드 리밋 밖은 0점, 그 사이는 선형 감쇠.
{
  check(fns.rangeScore(100, 90, 110, 80, 120) === 1, "이상 구간 내부는 만점(1)");
  check(fns.rangeScore(70, 90, 110, 80, 120) === 0, "하드 리밋 밖은 0점");
  const mid = fns.rangeScore(85, 90, 110, 80, 120);
  check(mid > 0 && mid < 1, `이상~하드 리밋 사이는 선형 감쇠(${mid})`);
}

// 8) 실측 검증(2026-07-22, 실제 촬영본)에서 발견한 케이스: 완전히 정지된 준비자세인데도
//    한 손목의 visibility가 0.35 경계값 부근에서 흔들려 프레임 하나가 순간적으로 0점(랜드마크
//    결측)이 되는 경우가 있었다. 5프레임 중 4프레임 이상 통과 기준이 이 1프레임 결측을
//    허용하면서도 시작 시각(첫 통과 프레임)을 정확히 찾아야 한다.
{
  const frames = [];
  for (let i = 0; i < 3; i += 1) frames.push({ time: Number((i * 0.2).toFixed(2)), landmarks: makeLandmarks({ 15: { x: 0.30, y: 0.40 }, 16: { x: 0.70, y: 0.60 } }) });
  for (let i = 3; i < 10; i += 1) {
    // 4번째 프레임(인덱스 4)만 왼손목 visibility를 낮춰 결측(0점) 프레임을 흉내낸다.
    const overrides = i === 4 ? { 15: { x: 0.47, y: 0.56, visibility: 0.1 } } : {};
    frames.push({ time: Number((i * 0.2).toFixed(2)), landmarks: makeLandmarks(overrides) });
  }
  const result = fns.findJunbiPoseStart(frames, 2.0);
  check(result.time != null, "1프레임 순간 결측이 섞여도 시작 시각을 찾음(과민 반응 아님)");
  check(result.time != null && Math.abs(result.time - 0.6) < 0.01, `시작 시각(${result.time})이 준비자세 첫 통과 프레임(0.6s)과 일치`);
}

// 9) 실측 검증(2026-07-22, 실제 촬영본)에서 발견한 두 번째 케이스: 1프레임의 순간 결측이
//    아니라, 준비자세를 유지하는 내내(수 초간) 한쪽 손목의 visibility가 지속적으로 0.27~0.36
//    사이(표준 임계 0.35 부근/미만)로 나왔다 — 실측값 그대로 재현. getPointLenient(0.15)
//    덕분에 좌표는 여전히 유효하게 읽혀 정상적으로 준비자세로 인식돼야 한다.
{
  const observedLeftWristVisibility = [0.288, 0.315, 0.308, 0.351, 0.338, 0.333, 0.359, 0.306, 0.354];
  const frames = observedLeftWristVisibility.map((vis, i) => ({
    time: Number((i * 0.3).toFixed(2)),
    landmarks: makeLandmarks({ 15: { x: 0.47, y: 0.56, visibility: vis } })
  }));
  const result = fns.findJunbiPoseStart(frames, 3.0);
  check(result.time != null, "지속적인 낮은 손목 visibility(실측값)에도 준비자세를 인식함");
  check(result.time === 0, `시작 시각(${result.time})이 첫 프레임(0초)과 일치 — 처음부터 준비자세였음을 정확히 반영`);
}

// 10) 실제 태극 6장 정면+측면 영상에서 확인된 회귀: 영상 시작 직후 0~2초의 짧은 자세가
//     준비서기처럼 보였지만, 지도자 정답은 6~10초 동안 유지된 준비자세였다. 가장 이른
//     매칭이 아니라 가장 오래 유지된 매칭 구간을 선택해야 한다.
{
  const bad = { 15: { x: 0.25, y: 0.38 }, 16: { x: 0.75, y: 0.62 } };
  const frames = [];
  for (let i = 0; i <= 50; i += 1) {
    const time = Number((i * 0.25).toFixed(2));
    const shortFalseMatch = time >= 0.25 && time <= 1.5;
    const trueJunbi = time >= 6 && time <= 10;
    frames.push({ time, landmarks: makeLandmarks(shortFalseMatch || trueJunbi ? {} : bad) });
  }
  const result = fns.findJunbiPoseStart(frames, 12.5);
  check(result.time >= 5.9 && result.time <= 6.25, `짧은 초기 오인을 버리고 실제 준비자세 시작(${result.time}초) 선택`);
  check(result.endTime >= 9.75 && result.endTime <= 10.1, `실제 준비자세 종료(${result.endTime}초)까지 지속 구간 확인`);
  check(result.passCount >= 16, `실제 준비자세 지속 표본 수(${result.passCount}) 확보`);
}

console.log(fail ? `\n실패 ${fail}건` : "\n준비자세 포즈 매칭 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
