const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright-core");

const appRoot = path.resolve(__dirname, "..");
const webRoot = path.join(appRoot, "www");
const outputRoot = path.join(appRoot, "outputs", "sample-validation");
const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const videoPaths = process.argv.slice(2).map((item) => path.resolve(item));

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
};

function createServer() {
  return http.createServer((request, response) => {
    const requested = decodeURIComponent((request.url || "/").split("?")[0]);
    const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
    const filePath = path.resolve(webRoot, relative);
    if (!filePath.startsWith(webRoot)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(data);
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function summarize(report, consoleErrors) {
  const segments = Array.isArray(report.segments) ? report.segments : [];
  return {
    status: "completed",
    file: report.file,
    video: report.video,
    poomsae: report.poomsae,
    summary: report.summary,
    analysis_efficiency: report.analysis_efficiency,
    scene_count: segments.length,
    scenes: segments.map((segment) => ({
      order: segment.order,
      orderLabel: segment.orderLabel,
      id: segment.id,
      name: segment.name,
      movementNumbers: segment.movementNumbers,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: Number.isFinite(segment.startTime) && Number.isFinite(segment.endTime)
        ? Number((segment.endTime - segment.startTime).toFixed(3))
        : null,
      completion_snapshot_time: segment.completion_snapshot_time,
      connectionScene: segment.connectionScene,
      compoundScene: segment.compoundScene,
    })),
    console_error_count: consoleErrors.length,
    console_errors: consoleErrors.slice(0, 40),
  };
}

async function analyzeVideo(browser, baseUrl, videoPath) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.evaluate(() => {
      const select = document.querySelector("#poomsaeSelect");
      select.value = "taegeuk_1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.setInputFiles("#fileInput", videoPath);
    try {
      await page.waitForFunction(
        () => {
          const button = document.querySelector("#analyzeBtn");
          const video = document.querySelector("video");
          const text = document.querySelector("#progressText");
          const blocked = text && /해석하지 못했습니다|H\.264\(MP4\)로 변환/.test(text.textContent || "");
          return blocked || (button && video && !button.disabled && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2);
        },
        null,
        { timeout: 30_000 }
      );
    } catch (error) {
      consoleErrors.push(`readiness-timeout: ${error.message}`);
    }
    const readiness = await page.evaluate(() => {
      const button = document.querySelector("#analyzeBtn");
      const video = document.querySelector("video");
      const text = document.querySelector("#progressText");
      return {
        ready: !!button && !button.disabled && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState,
        progressText: text ? text.textContent : "",
      };
    });
    if (!readiness.ready) {
      const staleReportPath = path.join(outputRoot, `${path.parse(videoPath).name}-report.json`);
      if (fs.existsSync(staleReportPath)) fs.unlinkSync(staleReportPath);
      const summary = {
        status: "blocked_undecodable",
        file: { name: path.basename(videoPath), size_bytes: fs.statSync(videoPath).size },
        video: readiness,
        scene_count: 0,
        console_error_count: consoleErrors.length,
        console_errors: consoleErrors.slice(0, 40),
      };
      const summaryPath = path.join(outputRoot, `${path.parse(videoPath).name}-summary.json`);
      fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
      return summary;
    }
    await page.evaluate(() => document.querySelector("#analyzeBtn").click());
    await page.waitForFunction(
      () => {
        const download = document.querySelector("#downloadBtn");
        const progress = document.querySelector("#progress");
        return download && !download.disabled && Number(progress && progress.value) === 100;
      },
      null,
      { timeout: 600_000 }
    );

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.evaluate(() => document.querySelector("#downloadBtn").click());
    const download = await downloadPromise;
    const reportPath = path.join(
      outputRoot,
      `${path.parse(videoPath).name}-report.json`
    );
    await download.saveAs(reportPath);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const summary = summarize(report, consoleErrors);
    const summaryPath = path.join(
      outputRoot,
      `${path.parse(videoPath).name}-summary.json`
    );
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    return summary;
  } finally {
    await page.close();
  }
}

async function main() {
  if (!videoPaths.length) {
    throw new Error("Pass at least one video path.");
  }
  for (const videoPath of videoPaths) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video not found: ${videoPath}`);
    }
  }
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found: ${chromePath}`);
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  const server = createServer();
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-angle=swiftshader",
    ],
  });

  try {
    const summaries = [];
    for (const videoPath of videoPaths) {
      process.stdout.write(`Analyzing ${path.basename(videoPath)}...\n`);
      const summary = await analyzeVideo(browser, baseUrl, videoPath);
      summaries.push(summary);
      process.stdout.write(
        `${summary.status}: ${summary.scene_count} scenes, detection ${summary.summary && summary.summary.detection_rate}\n`
      );
    }
    const combinedPath = path.join(outputRoot, "combined-summary.json");
    fs.writeFileSync(combinedPath, `${JSON.stringify(summaries, null, 2)}\n`);
    process.stdout.write(`Saved ${combinedPath}\n`);
  } finally {
    await browser.close();
    await close(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
