const ALLOWED_POOMSAE = new Set([
  "taegeuk_1", "taegeuk_2", "taegeuk_3", "taegeuk_4", "taegeuk_5", "taegeuk_6", "taegeuk_7", "taegeuk_8",
  "koryo", "keumgang", "taebaek", "pyongwon", "sipjin", "jitae", "cheonkwon", "hansu", "ilyeo"
]);

const SOURCE_WEIGHTS = Object.freeze({
  expert_approved: 1,
  gpt_reviewed: 0.6,
  user_corrected: 0.55,
  user_confirmed: 0.35
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function validRatios(value) {
  return Array.isArray(value)
    && value.length >= 3
    && value.length <= 40
    && value.every((item, index) => Number.isFinite(Number(item))
      && Number(item) >= 0
      && Number(item) <= 1
      && (index === 0 || Number(item) > Number(value[index - 1])))
    && Math.abs(Number(value[0])) < 0.00001
    && Math.abs(Number(value[value.length - 1]) - 1) < 0.00001;
}

function weightedMedian(rows) {
  const sorted = rows
    .filter((row) => Number.isFinite(row.value) && row.weight > 0)
    .slice()
    .sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, row) => sum + row.weight, 0);
  if (!total) return 0;
  let seen = 0;
  for (const row of sorted) {
    seen += row.weight;
    if (seen >= total / 2) return row.value;
  }
  return sorted[sorted.length - 1].value;
}

export function calibrationRecordWeight(record) {
  if (!record || record.explicit_review !== true) return 0;
  const status = String(record.review_status || "");
  let weight = SOURCE_WEIGHTS[status] || 0;
  if (!weight) return 0;
  if ((status === "expert_approved" || status === "gpt_reviewed") && record.trusted_provenance !== true) return 0;
  if (status === "gpt_reviewed") {
    if (record.textbook_aligned !== true || record.video_evidence !== true) return 0;
  }
  const detectionRate = Number(record.pose_detection_rate);
  if (Number.isFinite(detectionRate)) weight *= clamp((detectionRate - 0.5) / 0.45, 0.25, 1);
  if (record.camera_view && !["front", "diagonal", "side", "dual", "triple"].includes(record.camera_view)) return 0;
  return Number(weight.toFixed(4));
}

export function isEligibleCalibrationRecord(record) {
  return ALLOWED_POOMSAE.has(String(record?.poomsae || ""))
    && ["merge", "split", "adjust", "cascade_adjust", "confirm_all"].includes(String(record?.action || ""))
    && !!String(record?.review_session_id || "")
    && validRatios(record?.result_boundary_ratios)
    && calibrationRecordWeight(record) > 0;
}

export function eligibleCalibrationRecords(records) {
  return (Array.isArray(records) ? records : []).filter(isEligibleCalibrationRecord);
}

export function buildTrustedCollectiveProfiles(records, options = {}) {
  const minimumRawSessions = Math.max(3, Number(options.minimumRawSessions) || 3);
  const minimumEffectiveSamples = Math.max(1.5, Number(options.minimumEffectiveSamples) || 2.5);
  const latestBySession = new Map();
  for (const record of eligibleCalibrationRecords(records)) {
    const poomsaeKey = String(record.poomsae);
    const sessionId = String(record.review_session_id);
    const ratios = record.result_boundary_ratios.map(Number);
    const revision = Math.max(0, Math.round(Number(record.correction_revision) || 0));
    const timestamp = Date.parse(record.ts || record.reviewed_at || "") || Number(record.createdAtMs) || 0;
    const key = `${poomsaeKey}|${sessionId}`;
    const previous = latestBySession.get(key);
    if (!previous || revision > previous.revision || (revision === previous.revision && timestamp >= previous.timestamp)) {
      latestBySession.set(key, {
        poomsaeKey,
        ratios,
        revision,
        timestamp,
        source: String(record.review_source || "unknown"),
        status: String(record.review_status),
        weight: calibrationRecordWeight(record)
      });
    }
  }

  const grouped = {};
  for (const row of latestBySession.values()) {
    const byLength = (grouped[row.poomsaeKey] ||= {});
    (byLength[String(row.ratios.length)] ||= []).push(row);
  }

  const profiles = {};
  for (const [poomsaeKey, lengthGroups] of Object.entries(grouped)) {
    const groups = Object.values(lengthGroups).sort((a, b) => b.length - a.length);
    const dominant = groups[0] || [];
    const totalSessions = groups.reduce((sum, group) => sum + group.length, 0);
    const effectiveSamples = dominant.reduce((sum, row) => sum + row.weight, 0);
    if (dominant.length < minimumRawSessions
        || dominant.length / Math.max(totalSessions, 1) < 0.67
        || effectiveSamples < minimumEffectiveSamples) continue;

    const boundaryCount = dominant[0].ratios.length;
    const ratios = Array.from({ length: boundaryCount }, (_, index) => Number(weightedMedian(
      dominant.map((row) => ({ value: row.ratios[index], weight: row.weight }))
    ).toFixed(5)));
    ratios[0] = 0;
    ratios[ratios.length - 1] = 1;
    if (!validRatios(ratios)) continue;

    const deviations = [];
    for (let index = 1; index < boundaryCount - 1; index += 1) {
      deviations.push(weightedMedian(dominant.map((row) => ({
        value: Math.abs(row.ratios[index] - ratios[index]),
        weight: row.weight
      }))));
    }
    const dispersion = deviations.length ? deviations.reduce((sum, value) => sum + value, 0) / deviations.length : 0;
    const sourceCounts = {};
    for (const row of dominant) sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
    const trustedAnchorCount = dominant.filter((row) => row.status === "expert_approved" || row.status === "gpt_reviewed").length;
    if (!trustedAnchorCount) continue;
    const sourceDiversity = Object.keys(sourceCounts).length;
    const confidence = clamp(
      Math.min(1, effectiveSamples / 10) * 0.5
        + Math.min(1, sourceDiversity / 3) * 0.2
        + clamp(1 - dispersion / 0.035, 0, 1) * 0.3,
      0,
      1
    );
    profiles[poomsaeKey] = {
      schema: "poomsae-boundary-profile-v2",
      boundaryCount,
      ratios,
      samples: dominant.length,
      effectiveSamples: Number(effectiveSamples.toFixed(2)),
      confidence: Number(confidence.toFixed(3)),
      dispersion: Number(dispersion.toFixed(5)),
      sourceCounts,
      trustedAnchorCount,
      blend: Number(Math.min(0.35, 0.06 + confidence * 0.24).toFixed(3)),
      updatedAtMs: Date.now()
    };
  }
  return profiles;
}

export function normalizeCalibrationImport(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.records)
      ? payload.records
      : (payload?.calibration_record ? [payload.calibration_record] : []));
  const valid = eligibleCalibrationRecords(rows);
  return {
    schema: "poomsae-calibration-import-result-v1",
    accepted: valid,
    accepted_count: valid.length,
    rejected_count: Math.max(0, rows.length - valid.length)
  };
}
