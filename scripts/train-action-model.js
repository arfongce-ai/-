const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const args = process.argv.slice(2);
  const inputPaths = args.filter((value) => !value.startsWith("--"));
  const minimumArg = args.find((value) => value.startsWith("--min-samples="));
  const outputArg = args.find((value) => value.startsWith("--output="));
  if (!inputPaths.length) throw new Error("사용법: node scripts/train-action-model.js <검수완료 JSON...> [--min-samples=5] [--output=www/models/action-quality-v1.json]");
  const datasets = inputPaths.map((inputPath) => {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
    return parsed.learning_dataset_candidate || parsed;
  });
  const modulePath = pathToFileURL(path.resolve(__dirname, "..", "www", "action-model.mjs")).href;
  const { trainActionModel } = await import(modulePath);
  const model = trainActionModel(datasets, { minimumSamples: minimumArg ? Number(minimumArg.split("=")[1]) : 5 });
  const outputPath = path.resolve(outputArg ? outputArg.split("=")[1] : "www/models/action-quality-v1.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(model)}\n`);
  console.log(`승인 데이터 ${model.training_summary.approved_datasets}개, 학습된 동작 ${model.training_summary.trained_movements}개`);
  console.log(`저장: ${outputPath}`);
  if (!model.training_summary.trained_movements) {
    console.log("아직 동작별 승인 표본이 부족해 모델을 적용하지 않았습니다. 잘못된 확신을 막기 위한 정상 안전 동작입니다.");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
