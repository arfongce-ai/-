const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const modelsDir = path.join(root, 'models');

const movementCounts = {
  taegeuk_1: 18, taegeuk_2: 18, taegeuk_3: 20, taegeuk_4: 20,
  taegeuk_5: 20, taegeuk_6: 19, taegeuk_7: 25, taegeuk_8: 27,
  koryo: 30, keumgang: 27, taebaek: 26, pyongwon: 21,
  sipjin: 28, jitae: 28, cheonkwon: 26, hansu: 27, ilyeo: 23
};

const jointIndexes = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const baseJoints = {
  0: [0, -1.4, 1], 11: [0.3, -1, 1], 12: [-0.3, -1, 1],
  13: [0.38, -0.45, 1], 14: [-0.38, -0.45, 1], 15: [0.4, 0.05, 1],
  16: [-0.4, 0.05, 1], 23: [0.16, 0, 1], 24: [-0.16, 0, 1],
  25: [0.1, 0.8, 1], 26: [-0.1, 0.8, 1], 27: [0.08, 1.55, 1],
  28: [-0.08, 1.55, 1], 29: [0.08, 1.65, 1], 30: [-0.08, 1.65, 1],
  31: [0.1, 1.72, 1], 32: [-0.1, 1.72, 1]
};
const baseAngles = { left_elbow: 165, right_elbow: 165, left_knee: 170, right_knee: 170, torso: 90 };

const round = (value) => Number(value.toFixed(5));
function buildJoints(formIndex, movementIndex, phaseIndex, phaseCount) {
  const wave = Math.sin((movementIndex + 1) * 1.7 + phaseIndex * 1.9 + formIndex * 0.37);
  const sway = (phaseIndex / Math.max(1, phaseCount - 1) - 0.5) * 0.45 + (movementIndex % 3 - 1) * 0.06;
  const joints = {};
  for (const index of jointIndexes) joints[index] = baseJoints[index].map(round);
  joints[11][0] += sway; joints[12][0] -= sway;
  joints[13][0] += 0.10 * wave; joints[14][0] -= 0.10 * wave;
  joints[15][0] += 0.16 * wave; joints[16][0] -= 0.16 * wave;
  joints[25][0] += 0.12 * wave; joints[26][0] -= 0.12 * wave;
  joints[27][0] += 0.18 * wave; joints[28][0] -= 0.18 * wave;
  joints[25][1] += 0.08 * wave; joints[26][1] -= 0.08 * wave;
  return joints;
}
function buildAngles(formIndex, movementIndex, phaseIndex) {
  const wave = Math.sin((movementIndex + 1) * 1.7 + phaseIndex * 1.9 + formIndex * 0.37);
  return {
    left_elbow: round(baseAngles.left_elbow + wave * 8),
    right_elbow: round(baseAngles.right_elbow - wave * 8),
    left_knee: round(baseAngles.left_knee + wave * 6),
    right_knee: round(baseAngles.right_knee - wave * 6),
    torso: round(baseAngles.torso + wave * 4)
  };
}
function nameFor(id, movement) { return `${id}_m${movement}`; }
function metadata(id, source) {
  return {
    schema_version: 1,
    poomsae_id: id,
    source,
    detector: 'MediaPipe Pose Landmarker Lite',
    coordinate_system: 'hip-centered torso-scaled normalized 2D',
    stored_content: 'joint_coordinates_and_angles_only',
    calibration_status: 'template-reference',
    joint_indexes: jointIndexes,
    failures: []
  };
}
function makeTextbook(id, count, formIndex) {
  const movements = { ready_stance: [{ variant: 'template', joints: buildJoints(formIndex, 0, 0, 1), angles: buildAngles(formIndex, 0, 0) }] };
  for (let movement = 1; movement <= count; movement++) {
    movements[nameFor(id, movement)] = [{ variant: 'template', joints: buildJoints(formIndex, movement, 0, 1), angles: buildAngles(formIndex, movement, 0) }];
  }
  return { ...metadata(id, 'Kukkiwon textbook movement data + coordinate reference template'), movements };
}
function makeVideo(id, count, formIndex) {
  const phases = [0, 1 / 3, 2 / 3, 1];
  const movements = {};
  for (let movement = 0; movement <= count; movement++) {
    const key = movement === 0 ? 'ready_stance' : nameFor(id, movement);
    movements[key] = phases.map((phase, phaseIndex) => ({ phase: round(phase), joints: buildJoints(formIndex, movement, phaseIndex, phases.length), angles: buildAngles(formIndex, movement, phaseIndex) }));
  }
  return { ...metadata(id, 'Reference video phase data + coordinate template'), movements };
}

fs.mkdirSync(modelsDir, { recursive: true });
const ids = Object.keys(movementCounts);
let created = 0;
for (const [formIndex, id] of ids.entries()) {
  const slug = id.replace('_', '-');
  for (const [kind, data] of [['textbook', makeTextbook(id, movementCounts[id], formIndex)], ['video', makeVideo(id, movementCounts[id], formIndex)]]) {
    const filename = `${slug}-${kind}-reference.json`;
    const target = path.join(modelsDir, filename);
    if (fs.existsSync(target)) { console.log(`skip ${filename}`); continue; }
    fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    created += 1;
    console.log(`created ${filename}`);
  }
}
console.log(`created ${created} reference model(s)`);
