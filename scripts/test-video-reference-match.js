const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const root = path.resolve(__dirname, "..");
  const { scoreNormalizedVideoSequence } = await import(
    pathToFileURL(path.join(root, "www", "video-reference-match.mjs")).href
  );
  const configs = [
    { id: "taegeuk-1", movements: 19 }, { id: "taegeuk-2", movements: 19 },
    { id: "taegeuk-3", movements: 21 }, { id: "taegeuk-4", movements: 21 },
    { id: "taegeuk-5", movements: 21 }, { id: "taegeuk-6", movements: 20 },
    { id: "taegeuk-7", movements: 26 }, { id: "taegeuk-8", movements: 28 },
    { id: "koryo", movements: 31 }, { id: "keumgang", movements: 28 },
    { id: "taebaek", movements: 27 }, { id: "pyongwon", movements: 22 },
    { id: "sipjin", movements: 29 }, { id: "jitae", movements: 29 },
    { id: "cheonkwon", movements: 27 }, { id: "hansu", movements: 28 },
    { id: "ilyeo", movements: 24 }
  ];
  for (const config of configs) {
    const reference = JSON.parse(
      fs.readFileSync(path.join(root, "www", "models", `${config.id}-video-reference.json`), "utf8")
    );
    const movementIds = Object.keys(reference.movements || {});
    if (movementIds.length !== config.movements) {
      throw new Error(`${config.id}: expected ${config.movements} movements, got ${movementIds.length}`);
    }
    let phaseCount = 0;
    for (const movementId of movementIds) {
      const phases = reference.movements[movementId];
      if (!Array.isArray(phases) || phases.length < 1) {
        throw new Error(`${movementId} must contain at least one ordered phase`);
      }
      if (reference.metadata?.calibration_status === "template-reference" && phases.length !== 4) {
        throw new Error(`${movementId} template reference must contain four ordered phases`);
      }
      if (phases.some((phase, index) => index > 0 && phases[index - 1].phase >= phase.phase)) {
        throw new Error(`${movementId} phases are not strictly ordered`);
      }
      phaseCount += phases.length;
      if (phases.some((phase) => phase.image || phase.video || phase.source_frame)) {
        throw new Error(`${movementId} contains forbidden image/video data`);
      }
      const exactSequence = Array.from({ length: 5 }, (_, index) => {
        const timelinePhase = index / 4;
        return phases.reduce((closest, phase) =>
          Math.abs(phase.phase - timelinePhase) < Math.abs(closest.phase - timelinePhase)
            ? phase
            : closest
        , phases[0]);
      });
      const exact = scoreNormalizedVideoSequence(phases, exactSequence, reference.joint_indexes);
      if (!exact || exact.score < 99.9 || exact.phaseScores.length !== phases.length) {
        throw new Error(`${movementId} exact sequence did not score as a full match`);
      }
    }

    if (phaseCount < config.movements) {
      throw new Error(`${config.id}: expected at least one stored phase per movement, got ${phaseCount}`);
    }
    console.log(`OK ${config.id} video reference: ${movementIds.length} movements, ${phaseCount} phases`);
  }
})();
