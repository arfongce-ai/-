const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const api = await import(pathToFileURL(path.resolve(__dirname, "..", "www", "evidence-calibration.mjs")).href);
  const ratios = [0, 0.2, 0.5, 0.75, 1];
  const base = {
    action: "confirm_all",
    poomsae: "taegeuk_1",
    result_boundary_ratios: ratios,
    explicit_review: true,
    camera_view: "front",
    pose_detection_rate: 1,
    correction_revision: 1
  };
  assert.strictEqual(api.calibrationRecordWeight({ ...base, review_status: "user_confirmed" }), 0.35);
  assert.strictEqual(api.calibrationRecordWeight({ ...base, review_status: "gpt_reviewed", textbook_aligned: false, video_evidence: true }), 0);
  assert.strictEqual(api.calibrationRecordWeight({ ...base, review_status: "gpt_reviewed", textbook_aligned: true, video_evidence: true }), 0);
  assert.strictEqual(api.calibrationRecordWeight({ ...base, review_status: "gpt_reviewed", textbook_aligned: true, video_evidence: true, trusted_provenance: true }), 0.6);
  assert.strictEqual(api.calibrationRecordWeight({ ...base, review_status: "user_confirmed", explicit_review: false }), 0);

  const records = [
    { ...base, review_session_id: "expert-1", review_source: "instructor", review_status: "expert_approved", trusted_provenance: true },
    { ...base, review_session_id: "gpt-1", review_source: "gpt", review_status: "gpt_reviewed", textbook_aligned: true, video_evidence: true, trusted_provenance: true, result_boundary_ratios: [0, 0.21, 0.49, 0.76, 1] },
    { ...base, review_session_id: "user-1", review_source: "app_user", review_status: "user_corrected", result_boundary_ratios: [0, 0.19, 0.51, 0.74, 1] },
    { ...base, review_session_id: "ignored", review_source: "app_user", review_status: "user_confirmed", explicit_review: false }
  ];
  const profiles = api.buildTrustedCollectiveProfiles(records, { minimumEffectiveSamples: 2 });
  assert(profiles.taegeuk_1, "서로 다른 근거의 명시적 검수 3건으로 프로필 생성");
  assert.strictEqual(profiles.taegeuk_1.samples, 3);
  assert(profiles.taegeuk_1.effectiveSamples >= 2);
  assert(profiles.taegeuk_1.blend <= 0.35);
  assert.strictEqual(api.normalizeCalibrationImport({ records }).accepted_count, 3);
  console.log("교본·영상·GPT·앱 검수 가중 보정 테스트 통과");
})().catch((error) => { console.error(error); process.exitCode = 1; });
