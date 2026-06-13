// 강유(剛柔) 판별 회귀 테스트: 속도 곡선 모양에 따라 강/유/전환을 정확히 분류하는지.
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");
function extract(sig) {
  const s = html.indexOf(sig);
  if (s === -1) { console.error("함수 못 찾음:", sig); process.exit(1); }
  let d = 0, i = html.indexOf("{", s), e = -1;
  for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}") { d--; if (d === 0) { e = i + 1; break; } } }
  return html.slice(s, e);
}
const computeGangyu = new Function(extract("function computeGangyu(speeds") + "\nreturn computeGangyu;")();

let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// 가파른 정점 = 강
const sharp = computeGangyu([0.1, 0.12, 0.15, 0.9, 0.3, 0.1, 0.08]);
check(sharp.classification === "강", `가파른 정점 → 강 (가속 ${sharp.accelRatio}배, 정점 ${sharp.framesToPeak}프레임)`);
check(sharp.accelRatio >= 2.2, "강은 가속 대비 2.2배 이상");

// 완만한 흐름 = 유
const flow = computeGangyu([0.3, 0.32, 0.35, 0.34, 0.33, 0.31, 0.3]);
check(flow.classification === "유", `완만한 흐름 → 유 (가속 ${flow.accelRatio}배)`);
check(flow.accelRatio < 1.5, "유는 가속 대비 1.5배 미만");

// 중간 = 전환
const mid = computeGangyu([0.2, 0.3, 0.45, 0.5, 0.4, 0.3, 0.25]);
check(mid.classification === "전환", `중간 곡선 → 전환 (가속 ${mid.accelRatio}배)`);

// 표본 부족 = 판정보류
const few = computeGangyu([0.3, 0.4]);
check(few.classification === "판정보류", "표본 부족 → 판정보류(안전)");

// accelRatio/framesToPeak가 항상 유효 범위
check(sharp.framesToPeak >= 0 && Number.isFinite(sharp.accelRatio), "지표 값이 유효 범위");

console.log(fail ? `\n실패 ${fail}건` : "\n강유 판별 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
