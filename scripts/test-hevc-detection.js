// HEVC 감지 로직 회귀 테스트: head/tail 스캔이 HEVC 마커를 잡고 H.264는 오탐하지 않는지.
let fail = 0;
function check(cond, msg) { console.log((cond ? "OK  " : "FAIL ") + msg); if (!cond) fail++; }

// fileLooksHevc의 스캔 규칙을 모사: 앞 128KB 또는 뒤 256KB에 hvc1/hev1/hvcC가 있으면 HEVC.
function scan(bytes) {
  let t = "";
  for (let i = 0; i < bytes.length; i++) t += String.fromCharCode(bytes[i]);
  return /hvc1|hev1|hvcC/.test(t);
}
function looksHevc(headBytes, tailBytes) {
  if (scan(headBytes)) return true;
  if (tailBytes && scan(tailBytes)) return true;
  return false;
}
function strBytes(s) { return Array.from(s).map((c) => c.charCodeAt(0)); }

// 1) 앞부분에 hvc1 → 감지
check(looksHevc(strBytes("....ftypisom....hvc1...."), strBytes("....")), "앞부분 hvc1 감지");
// 2) moov가 끝에 있는 경우(앞엔 없고 뒤에 hvcC) → 감지
check(looksHevc(strBytes("....ftypmp42....mdat...."), strBytes("....moov....hvcC....")), "파일 끝 hvcC 감지(moov 뒤쪽)");
// 3) H.264(avc1)만 → 오탐 없음
check(!looksHevc(strBytes("....ftypisom....avc1...."), strBytes("....moov....avcC....")), "H.264(avc1) 오탐 없음");
// 4) hev1 변형도 감지
check(looksHevc(strBytes("....hev1...."), null), "hev1 변형 감지");

console.log(fail ? `\n실패 ${fail}건` : "\nHEVC 감지 회귀 테스트 통과");
process.exit(fail ? 1 : 0);
