const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const api = await import(pathToFileURL(path.resolve(__dirname, "..", "www", "action-model.mjs")).href);
  function landmarks(shift = 0) {
    return Array.from({ length: 33 }, (_, index) => ({
      x: 0.4 + (index % 5) * 0.02 + shift,
      y: 0.2 + index * 0.015,
      z: (index % 3) * 0.01,
      visibility: 0.95,
    }));
  }
  const frames = Array.from({ length: 12 }, (_, index) => ({ time: index / 10, landmarks: landmarks(index * 0.002) }));
  const sequence = api.resampleSequence(frames, 24);
  assert(sequence && sequence.length === 24, "시간축 좌표를 24프레임으로 정규화");
  const dataset = {
    review: { status: "expert_approved", action_labels_reviewed: true },
    segments: [{ movement_id: "taebaek_m1", movement_name: "왼범서기 아래손날헤쳐막기", view: "front", label: { action_correct: true }, sequence }],
  };
  const model = api.trainActionModel([dataset, dataset, dataset, dataset, dataset], { minimumSamples: 5 });
  assert(model.movements.taebaek_m1, "승인된 5개 표본으로 동작 모델 생성");
  const score = api.scoreActionSequence(model, "taebaek_m1", frames, "front");
  assert(score.available && score.score >= 90, "학습한 동일 동작 시퀀스를 높은 점수로 판별");
  const pending = { ...dataset, review: { status: "pending_expert_review", action_labels_reviewed: false } };
  assert(Object.keys(api.trainActionModel([pending], { minimumSamples: 1 }).movements).length === 0, "전문가 미승인 좌표는 학습에서 제외");
  console.log("동작 시퀀스 모델 테스트 통과");
})().catch((error) => { console.error(error); process.exitCode = 1; });
