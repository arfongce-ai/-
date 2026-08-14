const assert = require("assert");
const fs = require("fs");
const path = require("path");

function strictlyIncreasing(values) {
  return values.every((value, index) => index === 0 || value > values[index - 1]);
}

(async () => {
  const {
    isEligibleCalibrationRecord,
    calibrationRecordWeight,
    buildTrustedCollectiveProfiles,
    normalizeCalibrationImport
  } = await import("../www/evidence-calibration.mjs");

  const cases = [
    { file: "taegeuk-1-gpt-review-v1.json", label: "Taegeuk 1", mae: 0.591, max: 1.595, within03: 7, weight: 0.6 },
    { file: "taegeuk-2-gpt-review-v1.json", label: "Taegeuk 2", mae: 0.449, max: 1.727, within03: 10, weight: 0.39 }
  ];

  for (const expected of cases) {
    const reviewPath = path.resolve("data/ground-truth", expected.file);
    const data = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
    const auto = data.app_analysis.boundaries_seconds;
    const reviewed = data.review.reviewed_boundaries_seconds;
    assert.equal(data.review.status, "gpt_reviewed");
    assert.equal(data.review.expert_approval, "pending");
    assert.equal(auto.length, 20);
    assert.equal(reviewed.length, 20);
    assert(strictlyIncreasing(auto));
    assert(strictlyIncreasing(reviewed));
    assert.equal(data.calibration_record.boundary_count, reviewed.length);
    assert.equal(data.calibration_record.result_boundary_ratios.length, reviewed.length);
    assert(isEligibleCalibrationRecord(data.calibration_record));
    assert.equal(calibrationRecordWeight(data.calibration_record), expected.weight);
    assert.deepEqual(buildTrustedCollectiveProfiles([data.calibration_record]), {}, "single GPT review must not be promoted");
    const importResult = normalizeCalibrationImport(data);
    assert.equal(importResult.accepted_count, 1, "ground-truth JSON must be directly importable by an admin");
    assert.equal(importResult.rejected_count, 0);

    const internalErrors = reviewed.slice(1, -1).map((value, index) => Math.abs(auto[index + 1] - value));
    const mae = internalErrors.reduce((sum, value) => sum + value, 0) / internalErrors.length;
    const maxError = Math.max(...internalErrors);
    const within03 = internalErrors.filter((value) => value <= 0.3).length;
    assert(Math.abs(mae - expected.mae) < 0.001);
    assert(Math.abs(maxError - expected.max) < 0.001);
    assert.equal(within03, expected.within03);
    console.log(`${expected.label} baseline: MAE ${mae.toFixed(3)}s, max ${maxError.toFixed(3)}s, <=0.3s ${within03}/${internalErrors.length}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
