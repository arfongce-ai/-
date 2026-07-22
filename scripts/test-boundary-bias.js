// 학습된 경계 타이밍 보정 기능 회귀 테스트.
// 배경: "학습 리포트"에서 관리자가 승인한 위치별 보정값(초)을 실제 경계 배열에 적용하는
// applyLearnedBoundaryBias/getBoundaryBias가 (1) 안전 상한을 지키고 (2) 이웃 경계와의
// 최소 간격을 지키며 (3) 보정값이 없으면 기존과 완전히 동일하게 동작하는지 확인한다.
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

// _remoteBoundaryBias는 실제 코드에서 모듈 스코프 let이므로, 테스트 harness에서도 같은
// 이름의 let으로 감싸 getBoundaryBias/applyLearnedBoundaryBias가 그대로 참조하게 한다.
const body =
  "let _remoteBoundaryBias = null;\n" +
  extractConst("const BOUNDARY_BIAS_MAX_SHIFT =") + "\n" +
  extractFn("function clampBiasValue(v)") + "\n" +
  extractFn("function getBoundaryBias(poomsaeKey") + "\n" +
  extractFn("function applyLearnedBoundaryBias(boundaries") + "\n" +
  "return { " +
  "setBias: (v) => { _remoteBoundaryBias = v; }, " +
  "getBoundaryBias, applyLearnedBoundaryBias, clampBiasValue, MAX: BOUNDARY_BIAS_MAX_SHIFT };";
const fns = new Function("clamp", body)(clamp);

let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// 1) 보정값이 아예 없으면(null) 원본 경계와 완전히 동일해야 한다(기존 동작 보존).
{
  fns.setBias(null);
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(JSON.stringify(out) === JSON.stringify(b), "보정값 없음(null) → 원본과 동일");
}

// 2) 보정값이 빈 객체({})여도 동일해야 한다.
{
  fns.setBias({});
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(JSON.stringify(out) === JSON.stringify(b), "보정값 없음({}) → 원본과 동일");
}

// 3) 정상 범위 보정값은 그대로 반영된다.
{
  fns.setBias({ "taegeuk_1#2": 0.5 });
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(Math.abs(out[2] - 7.5) < 0.001, `경계[2]가 +0.5초 반영됨(실제: ${out[2]})`);
  check(out[0] === 0 && out[1] === 3 && out[3] === 12 && out[4] === 18, "다른 경계는 영향 없음");
}

// 4) 안전 상한(±1.5초) 밖의 큰 값이 게시돼 있어도 상한에서 잘린다.
{
  fns.setBias({ "taegeuk_1#2": 9 });
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(Math.abs(out[2] - (7 + fns.MAX)) < 0.001, `상한(${fns.MAX}초)에서 잘림(실제: ${out[2]})`);
}
{
  fns.setBias({ "taegeuk_1#2": -9 });
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(Math.abs(out[2] - (7 - fns.MAX)) < 0.001, `음수 상한에서도 잘림(실제: ${out[2]})`);
}

// 5) 이웃 경계를 절대 앞지르지 않는다(최소 0.1초 간격 유지) — 아무리 큰 보정이라도.
{
  fns.setBias({ "taegeuk_1#1": 9 }); // 경계[1]=3을 +9 하면 경계[2]=7을 넘어서려 함
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(out[1] <= out[2] - 0.1 + 1e-6, `경계[1](${out[1]})이 경계[2](${out[2]}) 앞에서 최소 간격 유지`);
}
{
  fns.setBias({ "taegeuk_1#3": -9 }); // 경계[3]=12를 -9 하면 경계[2]=7보다 앞서려 함
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(out[3] >= out[2] + 0.1 - 1e-6, `경계[3](${out[3]})이 경계[2](${out[2]}) 뒤에서 최소 간격 유지`);
}

// 6) 다른 품새(poomsaeKey)의 보정값은 섞이지 않는다(위치키에 품새가 포함되므로).
{
  fns.setBias({ "taegeuk_2#2": 0.8 }); // taegeuk_1이 아니라 taegeuk_2용 값
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 20);
  check(JSON.stringify(out) === JSON.stringify(b), "다른 품새용 보정값은 적용되지 않음");
}

// 7) 마지막 경계는 영상 길이(duration)를 넘지 않는다.
{
  fns.setBias({ "taegeuk_1#4": 9 });
  const b = [0, 3, 7, 12, 18];
  const out = fns.applyLearnedBoundaryBias(b, "taegeuk_1", 18.5);
  check(out[4] <= 18.5 + 1e-6, `마지막 경계가 영상 길이(18.5s) 이내로 유지(실제: ${out[4]})`);
}

// 8) clampBiasValue 자체의 경계값 동작.
{
  check(fns.clampBiasValue(0.3) === 0.3, "정상 범위 값은 그대로");
  check(fns.clampBiasValue(100) === fns.MAX, "큰 양수는 상한으로 잘림");
  check(fns.clampBiasValue(-100) === -fns.MAX, "큰 음수는 하한으로 잘림");
  check(fns.clampBiasValue(NaN) === 0, "NaN은 0으로 처리");
}

console.log(fail ? `\n실패 ${fail}건` : "\n경계 타이밍 학습 보정 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
