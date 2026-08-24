const DEFAULT_SEQUENCE_LENGTH = 24;
const LANDMARK_COUNT = 33;

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizeLandmarks(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < LANDMARK_COUNT) return null;
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) return null;

  const center = {
    x: (finite(leftHip.x) + finite(rightHip.x)) / 2,
    y: (finite(leftHip.y) + finite(rightHip.y)) / 2,
    z: (finite(leftHip.z) + finite(rightHip.z)) / 2,
  };
  const shoulderCenter = {
    x: (finite(leftShoulder.x) + finite(rightShoulder.x)) / 2,
    y: (finite(leftShoulder.y) + finite(rightShoulder.y)) / 2,
    z: (finite(leftShoulder.z) + finite(rightShoulder.z)) / 2,
  };
  const torso = Math.hypot(
    shoulderCenter.x - center.x,
    shoulderCenter.y - center.y,
    shoulderCenter.z - center.z,
  );
  const shoulderWidth = Math.hypot(
    finite(leftShoulder.x) - finite(rightShoulder.x),
    finite(leftShoulder.y) - finite(rightShoulder.y),
    finite(leftShoulder.z) - finite(rightShoulder.z),
  );
  const scale = Math.max(torso, shoulderWidth, 0.04);

  return landmarks.slice(0, LANDMARK_COUNT).map((point) => [
    Number(((finite(point?.x) - center.x) / scale).toFixed(5)),
    Number(((finite(point?.y) - center.y) / scale).toFixed(5)),
    Number(((finite(point?.z) - center.z) / scale).toFixed(5)),
    Number(finite(point?.visibility, 0).toFixed(4)),
  ]);
}

function interpolateVector(a, b, ratio) {
  return a.map((value, index) => value + (b[index] - value) * ratio);
}

function flattenPose(pose) {
  const vector = [];
  for (const point of pose) vector.push(point[0], point[1], point[2], point[3]);
  return vector;
}

export function resampleSequence(frames, targetLength = DEFAULT_SEQUENCE_LENGTH) {
  const valid = (frames || [])
    .map((frame) => ({ time: finite(frame.time), pose: normalizeLandmarks(frame.landmarks) }))
    .filter((frame) => frame.pose)
    .sort((a, b) => a.time - b.time);
  if (valid.length < 2) return null;
  const vectors = valid.map((frame) => flattenPose(frame.pose));
  const output = [];
  for (let index = 0; index < targetLength; index += 1) {
    const position = (index / Math.max(targetLength - 1, 1)) * (vectors.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(vectors.length - 1, Math.ceil(position));
    output.push(interpolateVector(vectors[lower], vectors[upper], position - lower).map((v) => Number(v.toFixed(5))));
  }
  return output;
}

export function sequenceDistance(sequence, prototype) {
  if (!Array.isArray(sequence) || !Array.isArray(prototype) || sequence.length !== prototype.length) return null;
  let weighted = 0;
  let weightTotal = 0;
  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const frame = sequence[frameIndex];
    const reference = prototype[frameIndex];
    if (!frame || !reference || frame.length !== reference.length) return null;
    for (let offset = 0; offset < frame.length; offset += 4) {
      const visibility = Math.max(0, Math.min(1, Math.min(frame[offset + 3], reference[offset + 3])));
      const weight = visibility >= 0.35 ? visibility : 0;
      if (!weight) continue;
      const dx = frame[offset] - reference[offset];
      const dy = frame[offset + 1] - reference[offset + 1];
      const dz = frame[offset + 2] - reference[offset + 2];
      weighted += Math.sqrt(dx * dx + dy * dy + dz * dz) * weight;
      weightTotal += weight;
    }
  }
  return weightTotal ? weighted / weightTotal : null;
}

export function scoreActionSequence(model, movementId, frames, view = "front") {
  const entry = model?.movements?.[movementId];
  if (!entry || !Array.isArray(entry.prototype) || Number(entry.sample_count) < Number(model.minimum_samples || 5)) {
    return { available: false, score: null, confidence: 0, reason: "insufficient_verified_samples" };
  }
  const sequence = resampleSequence(frames, model.sequence_length || DEFAULT_SEQUENCE_LENGTH);
  if (!sequence) return { available: false, score: null, confidence: 0, reason: "insufficient_pose_frames" };
  const distance = sequenceDistance(sequence, entry.prototype);
  if (distance == null) return { available: false, score: null, confidence: 0, reason: "unmeasurable" };
  const threshold = Math.max(Number(entry.accept_distance) || 0.22, 0.05);
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - distance / (threshold * 1.7)))));
  const sampleConfidence = Math.min(1, Number(entry.sample_count) / Math.max(Number(model.reliable_samples || 20), 1));
  const viewConfidence = entry.views?.[view] ? 1 : 0.8;
  return {
    available: true,
    score,
    confidence: Number((sampleConfidence * viewConfidence).toFixed(2)),
    distance: Number(distance.toFixed(5)),
    threshold: Number(threshold.toFixed(5)),
    sample_count: Number(entry.sample_count),
    method: "normalized_full_body_temporal_prototype",
  };
}

export function buildDatasetCandidate({ report, frames, segments, poomsaeKey, poomsaeName, view = "front" }) {
  const sourceFrames = Array.isArray(frames) ? frames : [];
  const sourceSegments = Array.isArray(segments) ? segments : [];
  return {
    schema: "poomsae-action-sequence-v1",
    created_at: new Date().toISOString(),
    poomsae: { id: poomsaeKey, name: poomsaeName },
    source_file: report?.file || null,
    camera_view: view,
    coordinate_definition: {
      detector: "MediaPipe Pose Landmarker lite (33 landmarks)",
      normalization: "pelvis-centered, torso-or-shoulder-width scaled",
      sequence_length: DEFAULT_SEQUENCE_LENGTH,
      note: "좌표는 원천 관측값이며 전문가가 동작명·순서·궤적·완성자세를 승인하기 전에는 정답이 아닙니다.",
    },
    review: {
      status: "pending_expert_review",
      reviewer_role: null,
      reviewed_at: null,
      boundary_reviewed: false,
      action_labels_reviewed: false,
    },
    segments: sourceSegments.map((segment) => {
      const segmentFrames = sourceFrames.filter((frame) => frame.time >= segment.startTime && frame.time <= segment.endTime);
      return {
        order: segment.order,
        movement_id: segment.id,
        movement_name: segment.name,
        start_time: segment.startTime,
        end_time: segment.endTime,
        view,
        label: { action_correct: null, error_codes: [], note: "전문가 검수 필요" },
        pose_frame_count: segmentFrames.filter((frame) => frame.landmarks).length,
        sequence: resampleSequence(segmentFrames, DEFAULT_SEQUENCE_LENGTH),
      };
    }),
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function medianPrototype(sequences) {
  return sequences[0].map((frame, frameIndex) => frame.map((_, valueIndex) =>
    Number(median(sequences.map((sequence) => sequence[frameIndex][valueIndex])).toFixed(5))
  ));
}

export function trainActionModel(datasets, options = {}) {
  const minimumSamples = Number(options.minimumSamples || 5);
  const reliableSamples = Number(options.reliableSamples || 20);
  const grouped = new Map();
  for (const dataset of datasets || []) {
    if (dataset?.review?.status !== "expert_approved" || dataset?.review?.action_labels_reviewed !== true) continue;
    for (const segment of dataset.segments || []) {
      if (segment?.label?.action_correct !== true || !Array.isArray(segment.sequence)) continue;
      const key = segment.movement_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(segment);
    }
  }
  const movements = {};
  for (const [movementId, samples] of grouped.entries()) {
    if (samples.length < minimumSamples) continue;
    const prototype = medianPrototype(samples.map((sample) => sample.sequence));
    const distances = samples.map((sample) => sequenceDistance(sample.sequence, prototype)).filter((v) => v != null);
    const medianDistance = median(distances);
    const mad = median(distances.map((value) => Math.abs(value - medianDistance)));
    movements[movementId] = {
      movement_name: samples[0].movement_name,
      sample_count: samples.length,
      views: Object.fromEntries([...new Set(samples.map((sample) => sample.view || "front"))].map((view) => [view, true])),
      accept_distance: Number(Math.max(0.08, medianDistance + Math.max(0.03, mad * 3)).toFixed(5)),
      prototype,
    };
  }
  return {
    schema: "poomsae-action-quality-model-v1",
    created_at: new Date().toISOString(),
    method: "normalized_full_body_temporal_prototype",
    sequence_length: DEFAULT_SEQUENCE_LENGTH,
    minimum_samples: minimumSamples,
    reliable_samples: reliableSamples,
    movements,
    training_summary: {
      approved_datasets: (datasets || []).filter((dataset) => dataset?.review?.status === "expert_approved").length,
      trained_movements: Object.keys(movements).length,
      note: "관절 각도 하나가 아니라 33개 관절의 전체 시간축 궤적과 완성 자세를 학습합니다.",
    },
  };
}
