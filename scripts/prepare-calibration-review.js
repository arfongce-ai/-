const fs = require("fs");
const path = require("path");

function normalizeBoundaries(segments) {
  if (!Array.isArray(segments) || !segments.length) return null;
  const ordered = segments.slice().sort((a, b) => Number(a.startTime) - Number(b.startTime));
  const boundaries = [Number(ordered[0].startTime), ...ordered.map((segment) => Number(segment.endTime))];
  if (!boundaries.every(Number.isFinite)) return null;
  const first = boundaries[0];
  const span = boundaries[boundaries.length - 1] - first;
  if (!(span > 0.5)) return null;
  const ratios = boundaries.map((value) => Number(((value - first) / span).toFixed(5)));
  ratios[0] = 0;
  ratios[ratios.length - 1] = 1;
  return ratios.every((value, index) => index === 0 || value > ratios[index - 1]) ? ratios : null;
}

function reportRows(parsed) {
  if (Array.isArray(parsed)) return parsed.flatMap(reportRows);
  if (Array.isArray(parsed?.reports)) return parsed.reports.flatMap(reportRows);
  if (parsed?.latestReport) return [parsed.latestReport];
  if (parsed?.poomsae && Array.isArray(parsed?.segments)) return [parsed];
  return [];
}

function prepare(report, index) {
  const poomsae = String(report?.poomsae?.id || report?.poomsae || "");
  const ratios = normalizeBoundaries(report?.segments);
  if (!poomsae || !ratios) return null;
  return {
    action: "confirm_all",
    poomsae,
    poomsae_name: String(report?.poomsae?.name || ""),
    review_session_id: `gpt-review-${poomsae}-${Date.now()}-${index + 1}`,
    correction_revision: 1,
    boundary_count: ratios.length,
    result_boundary_ratios: ratios,
    review_source: "gpt",
    review_status: "pending_gpt_review",
    explicit_review: false,
    textbook_aligned: false,
    video_evidence: true,
    camera_view: String(report?.camera_view?.mode || report?.camera_view || "front"),
    pose_detection_rate: Number(report?.summary?.detection_rate) || null,
    reviewed_at: null,
    review_note: "교본 동작 순서와 실제 영상의 각 경계를 확인한 뒤 gpt_reviewed/explicit_review/textbook_aligned를 갱신하세요."
  };
}

const args = process.argv.slice(2);
const outputArg = args.find((arg) => arg.startsWith("--output="));
const inputs = args.filter((arg) => !arg.startsWith("--"));
if (!inputs.length) {
  console.error("사용법: node scripts/prepare-calibration-review.js <앱 분석 JSON...> [--output=검수대기.json]");
  process.exit(1);
}
const reports = inputs.flatMap((input) => reportRows(JSON.parse(fs.readFileSync(path.resolve(input), "utf8"))));
const records = reports.map(prepare).filter(Boolean);
const output = path.resolve(outputArg ? outputArg.split("=")[1] : "outputs/calibration-review-pending.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify({
  schema: "poomsae-calibration-review-import-v1",
  created_at: new Date().toISOString(),
  review_instructions: [
    "각 경계를 영상 프레임에서 확인한다.",
    "동작 번호와 기술명을 교본 데이터와 대조한다.",
    "확인 완료 후 review_status를 gpt_reviewed, explicit_review와 textbook_aligned를 true로 바꾼다.",
    "확인하지 못한 기록은 pending 상태로 두며 앱이 자동으로 제외한다."
  ],
  records
}, null, 2)}\n`);
console.log(`검수 대기 ${records.length}건 저장: ${output}`);

