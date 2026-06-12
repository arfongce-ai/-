// detectPoseAt 로직을 그대로 재현해 단조 증가 보장과 오류 내성을 검증한다.
let lastDetectTimestampMs = -1;
let throwOnce = false;
const calls = [];
const mockLandmarker = {
  detectForVideo(video, ts) {
    // MediaPipe 실제 동작 모사: ts가 이전 이하이면 throw
    if (calls.length && ts <= calls[calls.length-1]) {
      throw new Error("INPUT_TIMESTAMP_MUST_BE_MONOTONICALLY_INCREASING");
    }
    if (throwOnce) { throwOnce=false; throw new Error("WASM transient"); }
    calls.push(ts);
    return { landmarks: [[{x:0.5,y:0.5}]] };
  }
};
function detectPoseAt(suggestedTimestampMs) {
  let ts = Math.round(Number.isFinite(suggestedTimestampMs) ? suggestedTimestampMs : 0);
  if (ts <= lastDetectTimestampMs) ts = lastDetectTimestampMs + 1;
  lastDetectTimestampMs = ts;
  try { return mockLandmarker.detectForVideo(null, ts); }
  catch(e){ console.warn("skip frame:", e.message.slice(0,40)); return { landmarks: [] }; }
}

let fail=0;
function check(cond,msg){ console.log((cond?"OK  ":"FAIL ")+msg); if(!cond) fail++; }

// 시나리오 1: 단조 증가하는 정상 타임스탬프
lastDetectTimestampMs=-1; calls.length=0;
[100,200,300,400].forEach(t=>detectPoseAt(t));
check(calls.length===4, "정상 증가 4프레임 모두 검출");

// 시나리오 2: 같은/역행 타임스탬프(같은 프레임에 두 번 seek) — 오류 없이 보정
lastDetectTimestampMs=-1; calls.length=0;
const before=calls.length;
[1000,1000,1000,999,1001].forEach(t=>detectPoseAt(t));
const strictlyIncreasing = calls.every((v,i)=> i===0 || v>calls[i-1]);
check(strictlyIncreasing, "동일/역행 입력에도 내부 타임스탬프 단조 증가");
check(calls.length===5, "동일/역행 입력 5프레임 모두 검출(오류 없음)");

// 시나리오 3: 경계스캔 후 세그먼트(별도 베이스) 경계 넘나듦
lastDetectTimestampMs=-1; calls.length=0;
// boundary: base 0, times 0..12s
for(let i=0;i<=12;i++) detectPoseAt(0 + i*1000 * 0.04*25); // 0..12000
const boundaryEnd=calls.length;
// segment base = 0 + 12000 + 5000 = 17000, but simulate overlap: a low actualTime
detectPoseAt(17000 + 100); detectPoseAt(17000 + 50); // 역행 시도
check(calls.every((v,i)=> i===0 || v>calls[i-1]), "경계→세그먼트 베이스 전환에도 단조 증가");

// 시나리오 4: 일시적 WASM 오류 한 번 — 분석 중단 없이 빈 결과
lastDetectTimestampMs=-1; calls.length=0; throwOnce=true;
const r1=detectPoseAt(500);
const r2=detectPoseAt(600);
check(Array.isArray(r1.landmarks) && r1.landmarks.length===0, "일시 검출 오류는 빈 결과로 대체");
check(r2.landmarks.length===1, "오류 이후 프레임은 정상 검출 지속");

console.log(fail? `\n실패 ${fail}건` : "\n전체 통과: 타임스탬프 단조 증가 및 오류 내성 검증 완료");
process.exit(fail?1:0);
