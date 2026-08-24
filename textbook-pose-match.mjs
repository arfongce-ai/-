const DEFAULT_JOINT_INDEXES = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const ANGLE_DEFINITIONS = {
  left_elbow: [11, 13, 15],
  right_elbow: [12, 14, 16],
  left_shoulder: [13, 11, 23],
  right_shoulder: [14, 12, 24],
  left_hip: [11, 23, 25],
  right_hip: [12, 24, 26],
  left_knee: [23, 25, 27],
  right_knee: [24, 26, 28]
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDeg(a, b, c) {
  if (!(a && b && c)) return null;
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;
  const denominator = Math.hypot(abX, abY) * Math.hypot(cbX, cbY);
  if (!(denominator > 0)) return null;
  const cosine = clamp((abX * cbX + abY * cbY) / denominator, -1, 1);
  return Math.acos(cosine) * 180 / Math.PI;
}

export function normalizePoseForTextbook(landmarks, jointIndexes = DEFAULT_JOINT_INDEXES) {
  if (!Array.isArray(landmarks) || landmarks.length < 29) return null;
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  if (!(leftHip && rightHip && leftShoulder && rightShoulder)) return null;
  const hip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2
  };
  const shoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };
  const scale = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
  if (!(scale > 0.015)) return null;
  const joints = {};
  for (const index of jointIndexes) {
    const point = landmarks[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    joints[index] = [
      (point.x - hip.x) / scale,
      (point.y - hip.y) / scale,
      Number.isFinite(point.visibility) ? point.visibility : 0.5
    ];
  }
  const angles = {};
  for (const [name, [a, b, c]] of Object.entries(ANGLE_DEFINITIONS)) {
    angles[name] = angleDeg(landmarks[a], landmarks[b], landmarks[c]);
  }
  angles.torso_lean = Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y) * 180 / Math.PI;
  return { joints, angles };
}

function scorePosePair(pose, reference, jointIndexes) {
  let squaredDistance = 0;
  let coordinateWeight = 0;
  let visibleWeight = 0;
  for (const index of jointIndexes) {
    const point = pose.joints[index];
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
  for (const [name, value] of Object.entries(pose.angles)) {
    const target = reference.angles && reference.angles[name];
    if (!Number.isFinite(value) || !Number.isFinite(target)) continue;
    angleDifference += Math.min(90, Math.abs(value - target));
    angleCount += 1;
  }
  const meanAngleDifference = angleCount ? angleDifference / angleCount : null;
  const angleScore = meanAngleDifference == null ? coordinateScore : 100 * Math.exp(-meanAngleDifference / 36);
  const coverage = clamp(coordinateWeight / 14, 0, 1);
  const meanVisibility = clamp(visibleWeight / Math.max(Object.keys(pose.joints).length, 1), 0, 1);
  const similarity = clamp(coordinateScore * 0.62 + angleScore * 0.38, 0, 100);
  return {
    similarity,
    coordinateScore,
    angleScore,
    coordinateRmse,
    meanAngleDifference,
    referenceConfidence: clamp(coverage * (0.55 + meanVisibility * 0.45), 0, 1)
  };
}

export function compareTextbookPose(referenceData, poomsaeId, movementId, frames) {
  if (!referenceData || referenceData.poomsae_id !== poomsaeId || !movementId) {
    return { available: false, reason: "reference_unavailable" };
  }
  const references = referenceData.movements && referenceData.movements[movementId];
  if (!Array.isArray(references) || !references.length) {
    return { available: false, reason: "movement_reference_unavailable" };
  }
  const detected = (Array.isArray(frames) ? frames : []).filter((frame) => frame && frame.landmarks);
  if (!detected.length) return { available: false, reason: "pose_unavailable" };
  const start = Math.max(0, Math.floor(detected.length * 0.35));
  const candidates = detected.slice(start).map((frame) => ({
    time: frame.time,
    pose: normalizePoseForTextbook(frame.landmarks, referenceData.joint_indexes || DEFAULT_JOINT_INDEXES)
  })).filter((candidate) => candidate.pose);
  if (!candidates.length) return { available: false, reason: "pose_unmeasurable" };

  let best = null;
  for (const candidate of candidates) {
    for (const reference of references) {
      const measured = scorePosePair(candidate.pose, reference, referenceData.joint_indexes || DEFAULT_JOINT_INDEXES);
      if (!measured || (best && measured.similarity <= best.similarity)) continue;
      best = { ...measured, variant: reference.variant || "default", frameTime: candidate.time };
    }
  }
  if (!best) return { available: false, reason: "insufficient_visible_joints" };
  const similarity = Math.round(best.similarity);
  // 시점 차이 때문에 낮게 나온 일치도는 감점에 쓰지 않는다. 충분히 닮은 경우에만
  // 기존 영상 검출 신뢰도를 보강한다.
  const confidenceBoost = similarity >= 70
    ? clamp(((similarity - 70) / 30) * 0.28 * best.referenceConfidence, 0, 0.28)
    : 0;
  return {
    available: true,
    score: similarity,
    variant: best.variant,
    frameTime: Number.isFinite(best.frameTime) ? Number(best.frameTime.toFixed(3)) : null,
    coordinateScore: Math.round(best.coordinateScore),
    angleScore: Math.round(best.angleScore),
    coordinateRmse: Number(best.coordinateRmse.toFixed(3)),
    meanAngleDifference: best.meanAngleDifference == null ? null : Number(best.meanAngleDifference.toFixed(1)),
    referenceConfidence: Number(best.referenceConfidence.toFixed(2)),
    confidenceBoost: Number(confidenceBoost.toFixed(3)),
    confidenceRaised: confidenceBoost > 0
  };
}
