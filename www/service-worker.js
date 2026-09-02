const CACHE_NAME = "poomsae-training-camera-fix-v2";
const APP_URL = "./index.html";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/app-icon-1024.png",
  "./assets/momgagym-logo.jpg",
  "./assets/partner-taekwondo-logos.png",
  "./assets/fonts/NotoSerifKR-SemiBold.woff2",
  "./assets/fonts/NotoSerifKR-Bold.woff2",
  "./assets/fonts/NotoSerifKR-Black.woff2"
];
const ENGINE_ASSETS = [
  "./models/pose_landmarker_lite.task",
  "./models/action-quality-v1.json",
  "./models/taegeuk-1-textbook-reference.json",
  "./models/taegeuk-2-textbook-reference.json",
  "./models/taegeuk-3-textbook-reference.json",
  "./models/taegeuk-4-textbook-reference.json",
  "./models/taegeuk-5-textbook-reference.json",
  "./models/taegeuk-5-video-reference.json",
  "./models/taegeuk-6-textbook-reference.json",
  "./models/taegeuk-6-video-reference.json",
  "./models/koryo-textbook-reference.json",
  "./models/koryo-video-reference.json",
  "./action-model.mjs",
  "./textbook-pose-match.mjs",
  "./video-reference-match.mjs",
  "./vendor/mediapipe/tasks-vision/vision_bundle.mjs",
  "./vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.js",
  "./vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      // 엔진 파일(모델·WASM)은 용량이 커 일부 실패가 설치 전체를 막지 않도록 개별 캐시
      await Promise.all(
        ENGINE_ASSETS.map((url) =>
          cache.add(url).catch((error) => {
            console.warn("엔진 자산 사전 캐시 실패(런타임에 재시도):", url, error);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.registration.navigationPreload && self.registration.navigationPreload.enable
        ? self.registration.navigationPreload.enable().catch(() => {})
        : Promise.resolve()
    ])
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const preloaded = await event.preloadResponse;
        return preloaded || await fetch(event.request);
      } catch (error) {
        return caches.match(new URL(APP_URL, self.location).href);
      }
    })());
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 같은 출처의 정상 응답은 런타임 캐시에 저장해 다음 오프라인 사용을 보장한다(엔진 파일 포함).
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
