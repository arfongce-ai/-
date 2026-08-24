import { normalizePoseForTextbook } from "./textbook-pose-match.mjs";

const DEFAULT_JOINT_INDEXES = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const PHASE_WEIGHTS = [0.8, 0.9, 1, 1.2];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scorePosePair(pose, reference, jointIndexes) {
  let squaredDistance = 0;
  let coordinateWeight = 0;
  let visibleWeight = 0;
  for (const index of jointIndexes) {
    const point = pose.joints && pose.joints[index];
    const target = reference.joints && reference.joints[index];
    if (!(point && target)) continue;
    const visibility = Math.min(point[2] ?? 0.5, target[2] ?? 0.5);
    if (visibility < 0.2) continue;
    const importance = index === 0 ? 0.55 : (index >= 29 ? 0.7 : 1);
    const weight = visibility * importance;
    const dx = point[0] - target[0];
    const dy = point[1] - target[1];
    squaredDistance += (dx * dx + dy * dy) * weight;
    coordinateWeight += weight;
    visibleWeight += visibility;
  }
  if (!(coordinateWeight > 4)) return null;

  const coordinateRmse = Math.sqrt(squaredDistance / coordinateWeight);
  const coordinateScore = 100 * Math.exp(-coordinateRmse / 0.62);
  let angleDifference = 0;
  let angleCount = 0;
  for (const [name, value] of Object.entries(pose.angles || {})) {
    const target = reference.angles && reference.angles[name];
    if (!Number.isFinite(value) || !Number.isFinite(target)) continue;
    angleDifference += Math.min(90, Math.abs(value - target));
    angleCount += 1;
  }
  const meanAngleDifference = angleCount ? angleDifference / angleCount : null;
  const angleScore = meanAngleDifference == null
    ? coordinateScore
    : 100 * Math.exp(-meanAngleDifference / 36);
  const coverage = clamp(coordinateWeight / 14, 0, 1);
  const meanVisibility = clamp(
    visibleWeight / Math.max(Object.keys(pose.joints || {}).length, 1),
    0,
    1
  );
  return {
    similarity: clamp(coordinateScore * 0.62 + angleScore * 0.38, 0, 100),
    coordinateScore,
    angleScore,
    coordinateRmse,
    meanAngleDifference,
    referenceConfidence: clamp(coverage * (0.55 + meanVisibility * 0.45), 0, 1)
  };
}

export function scoreNormalizedVideoSequence(referencePhases, normalizedPoses, jointIndexes = DEFAULT_JOINT_INDEXES) {
  if (!Array.isArray(referencePhases) || !referencePhases.length || !Array.isArray(normalizedPoses)) {
    return null;
  }
  const usablePoses = normalizedPoses.filter(Boolean);
  if (!usablePoses.length) return null;

  const phaseScores = [];
  let weightedScore = 0;
  let totalWeight = 0;
  let confidenceTotal = 0;
  for (let index = 0; index < referencePhases.length; index += 1) {
    const reference = referencePhases[index];
    const phase = Number.isFinite(reference.phase)
      ? clamp(reference.phase, 0, 1)
      : (index + 1) / referencePhases.length;
    const poseIndex = Math.min(
      usablePoses.length - 1,
      Math.max(0, Math.round((usablePoses.length - 1) * phase))
    );
    const measured = scorePosePair(usablePoses[poseIndex], reference, jointIndexes);
    if (!measured) continue;
    const weight = PHASE_WEIGHTS[index] || 1;
    weightedScore += measured.similarity * weight;
    totalWeight += weight;
    confidenceTotal += measured.referenceConfidence;
    phaseScores.push({
      phase: Number(phase.toFixed(2)),
      score: Math.round(measured.similarity),
      coordinateScore: Math.round(measured.coordinateScore),
      angleScore: Math.round(measured.angleScore)
    });
  }
  if (!phaseScores.length || !(totalWeight > 0)) return null;
  return {
    score: weightedScore / totalWeight,
    phaseScores,
    phaseCoverage: phaseScores.length / referencePhases.length,
    referenceConfidence: confidenceTotal / phaseScores.length
  };
}

export function compareVideoReference(referenceData, poomsaeId, movementId, frames, view = "front") {
  if (!referenceData || referenceData.poomsae_id !== poomsaeId || !movementId) {
    return { available: false, reason: "reference_unavailable" };
  }
  const references = referenceData.movements && referenceData.movements[movementId];
  if (!Array.isArray(references) || !references.length) {
    return { available: false, reason: "movement_reference_unavailable" };
  }
  const detected = (Array.isArray(frames) ? frames : [])
    .filter((frame) => frame && frame.landmarks)
    .map((frame) => normalizePoseForTextbook(
      frame.landmarks,
      referenceData.joint_indexes || DEFAULT_JOINT_INDEXES
    ))
    .filter(Boolean);
  if (detected.length < 4) return { available: false, reason: "insufficient_sequence_frames" };

  const result = scoreNormalizedVideoSequence(
    references,
    detected,
    referenceData.joint_indexes || DEFAULT_JOINT_INDEXES
  );
  if (!result) return { available: false, reason: "insufficient_visible_joints" };

  const similarity = Math.round(result.score);
  const viewWeight = view === "front" ? 1 : 0.55;
  const confidenceBoost = similarity >= 70
    ? clamp(
        ((similarity - 70) / 30) *
          0.16 *
          result.phaseCoverage *
          result.referenceConfidence *
          viewWeight,
        0,
        0.16
      )
    : 0;
  return {
    available: true,
    score: similarity,
    phaseScores: result.phaseScores,
    matchedPhases: result.phaseScores.length,
    totalPhases: references.length,
    phaseCoverage: Number(result.phaseCoverage.toFixed(2)),
    referenceConfidence: Number(result.referenceConfidence.toFixed(2)),
    confidenceBoost: Number(confidenceBoost.toFixed(3)),
    confidenceRaised: confidenceBoost > 0
  };
}
