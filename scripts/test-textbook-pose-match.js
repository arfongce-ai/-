const fs = require("fs");
const path = require("path");
const assert = require("assert");

(async () => {
  const { compareTextbookPose } = await import("../www/textbook-pose-match.mjs");
  const references = Object.fromEntries(["taegeuk_1", "taegeuk_2", "taegeuk_3", "taegeuk_4", "taegeuk_5", "taegeuk_6", "taegeuk_7", "taegeuk_8", "koryo", "keumgang", "taebaek", "pyongwon", "sipjin", "jitae", "cheonkwon", "hansu", "ilyeo"].map((poomsaeKey) => {
    const fileName = `${poomsaeKey.replace("_", "-")}-textbook-reference.json`;
    return [poomsaeKey, JSON.parse(fs.readFileSync(
      path.join(__dirname, "..", "www", "models", fileName),
      "utf8"
    ))];
  }));
  const expectedMovementCounts = { taegeuk_1: 19, taegeuk_2: 19, taegeuk_3: 21, taegeuk_4: 21, taegeuk_5: 21, taegeuk_6: 20, taegeuk_7: 26, taegeuk_8: 28, koryo: 31, keumgang: 28, taebaek: 27, pyongwon: 22, sipjin: 29, jitae: 29, cheonkwon: 27, hansu: 28, ilyeo: 24 };
  for (const [poomsaeKey, reference] of Object.entries(references)) {
    assert.strictEqual(reference.stored_content, "joint_coordinates_and_angles_only");
    assert.strictEqual(Object.keys(reference.movements).length, expectedMovementCounts[poomsaeKey]);
    assert.strictEqual(reference.failures.length, 0);
  }

  for (const [poomsaeKey, reference] of Object.entries(references)) {
    const movementKey = Object.keys(reference.movements || {})[0];
    const source = reference.movements[movementKey][0];
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
    for (const [index, [x, y, visibility]] of Object.entries(source.joints)) {
      landmarks[Number(index)] = { x, y, visibility };
    }
    const exact = compareTextbookPose(reference, poomsaeKey, movementKey, [
      { time: 1, landmarks },
      { time: 2, landmarks }
    ]);
    assert.strictEqual(exact.available, true);
    assert(exact.score >= 85, `${poomsaeKey}: expected near-exact match, got ${exact.score}`);
  }

  const reference = references.taegeuk_1;
  const source = reference.movements.ready_stance[0];
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(source.joints)) {
    landmarks[Number(index)] = { x, y, visibility };
  }
  const exact = compareTextbookPose(reference, "taegeuk_1", "ready_stance", [
    { time: 1, landmarks },
    { time: 2, landmarks }
  ]);
  assert.strictEqual(exact.available, true);
  assert(exact.score >= 95, `expected near-exact match, got ${exact.score}`);
  assert(exact.confidenceBoost > 0, "high textbook match must raise confidence");

  const changed = landmarks.map((point) => ({ ...point }));
  [13, 14, 15, 16, 25, 26, 27, 28].forEach((index, offset) => {
    changed[index].x += offset % 2 ? -1.2 : 1.2;
    changed[index].y += offset < 4 ? 0.9 : -0.8;
  });
  const mismatch = compareTextbookPose(reference, "taegeuk_1", "ready_stance", [
    { time: 1, landmarks: changed },
    { time: 2, landmarks: changed }
  ]);
  assert.strictEqual(mismatch.available, true);
  assert(mismatch.score < exact.score, "changed skeleton must score below the reference");
  assert.strictEqual(mismatch.confidenceBoost, 0, "low match must not lower or raise confidence");

  const taegeuk2Source = references.taegeuk_2.movements.taegeuk_2_m18[0];
  const taegeuk2Landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(taegeuk2Source.joints)) {
    taegeuk2Landmarks[Number(index)] = { x, y, visibility };
  }
  const taegeuk2Exact = compareTextbookPose(
    references.taegeuk_2,
    "taegeuk_2",
    "taegeuk_2_m18",
    [{ time: 1, landmarks: taegeuk2Landmarks }, { time: 2, landmarks: taegeuk2Landmarks }]
  );
  assert.strictEqual(taegeuk2Exact.available, true);
  assert(taegeuk2Exact.score >= 95, `expected Taegeuk 2 near-exact match, got ${taegeuk2Exact.score}`);
  assert(taegeuk2Exact.confidenceBoost > 0, "high Taegeuk 2 textbook match must raise confidence");

  const taegeuk3Source = references.taegeuk_3.movements.taegeuk_3_m20[0];
  const taegeuk3Landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(taegeuk3Source.joints)) {
    taegeuk3Landmarks[Number(index)] = { x, y, visibility };
  }
  const taegeuk3Exact = compareTextbookPose(
    references.taegeuk_3,
    "taegeuk_3",
    "taegeuk_3_m20",
    [{ time: 1, landmarks: taegeuk3Landmarks }, { time: 2, landmarks: taegeuk3Landmarks }]
  );
  assert.strictEqual(taegeuk3Exact.available, true);
  assert(taegeuk3Exact.score >= 95, `expected Taegeuk 3 near-exact match, got ${taegeuk3Exact.score}`);
  assert(taegeuk3Exact.confidenceBoost > 0, "high Taegeuk 3 textbook match must raise confidence");

  const taegeuk4Source = references.taegeuk_4.movements.taegeuk_4_m20[0];
  const taegeuk4Landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(taegeuk4Source.joints)) {
    taegeuk4Landmarks[Number(index)] = { x, y, visibility };
  }
  const taegeuk4Exact = compareTextbookPose(
    references.taegeuk_4,
    "taegeuk_4",
    "taegeuk_4_m20",
    [{ time: 1, landmarks: taegeuk4Landmarks }, { time: 2, landmarks: taegeuk4Landmarks }]
  );
  assert.strictEqual(taegeuk4Exact.available, true);
  assert(taegeuk4Exact.score >= 95, `expected Taegeuk 4 near-exact match, got ${taegeuk4Exact.score}`);
  assert(taegeuk4Exact.confidenceBoost > 0, "high Taegeuk 4 textbook match must raise confidence");

  const taegeuk5Source = references.taegeuk_5.movements.taegeuk_5_m20[0];
  const taegeuk5Landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(taegeuk5Source.joints)) {
    taegeuk5Landmarks[Number(index)] = { x, y, visibility };
  }
  const taegeuk5Exact = compareTextbookPose(
    references.taegeuk_5,
    "taegeuk_5",
    "taegeuk_5_m20",
    [{ time: 1, landmarks: taegeuk5Landmarks }, { time: 2, landmarks: taegeuk5Landmarks }]
  );
  assert.strictEqual(taegeuk5Exact.available, true);
  assert(taegeuk5Exact.score >= 95, `expected Taegeuk 5 near-exact match, got ${taegeuk5Exact.score}`);
  assert(taegeuk5Exact.confidenceBoost > 0, "high Taegeuk 5 textbook match must raise confidence");

  const taegeuk6Source = references.taegeuk_6.movements.taegeuk_6_m19[0];
  const taegeuk6Landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(taegeuk6Source.joints)) {
    taegeuk6Landmarks[Number(index)] = { x, y, visibility };
  }
  const taegeuk6Exact = compareTextbookPose(
    references.taegeuk_6,
    "taegeuk_6",
    "taegeuk_6_m19",
    [{ time: 1, landmarks: taegeuk6Landmarks }, { time: 2, landmarks: taegeuk6Landmarks }]
  );
  assert.strictEqual(taegeuk6Exact.available, true);
  assert(taegeuk6Exact.score >= 95, `expected Taegeuk 6 near-exact match, got ${taegeuk6Exact.score}`);
  assert(taegeuk6Exact.confidenceBoost > 0, "high Taegeuk 6 textbook match must raise confidence");

  const koryoSource = references.koryo.movements.koryo_m30[0];
  const koryoLandmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, [x, y, visibility]] of Object.entries(koryoSource.joints)) {
    koryoLandmarks[Number(index)] = { x, y, visibility };
  }
  const koryoExact = compareTextbookPose(
    references.koryo,
    "koryo",
    "koryo_m30",
    [{ time: 1, landmarks: koryoLandmarks }, { time: 2, landmarks: koryoLandmarks }]
  );
  assert.strictEqual(koryoExact.available, true);
  assert(koryoExact.score >= 95, `expected Koryo near-exact match, got ${koryoExact.score}`);
  assert(koryoExact.confidenceBoost > 0, "high Koryo textbook match must raise confidence");

  const missing = compareTextbookPose(reference, "taegeuk_2", "ready_stance", [{ time: 1, landmarks }]);
  assert.strictEqual(missing.available, false);
  console.log(`Textbook pose match OK: Taegeuk 1 ${exact.score}, Taegeuk 2 ${taegeuk2Exact.score}, Taegeuk 3 ${taegeuk3Exact.score}, Taegeuk 4 ${taegeuk4Exact.score}, Taegeuk 5 ${taegeuk5Exact.score}, Taegeuk 6 ${taegeuk6Exact.score}, Koryo ${koryoExact.score}, mismatch ${mismatch.score}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
