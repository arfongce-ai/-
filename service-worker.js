const CACHE_NAME = "poomsae-training-root-offline-engine-v4";
const APP_URL = "./www/index.html";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  APP_URL,
  "./www/assets/app-icon-192.png",
  "./www/assets/app-icon-512.png",
  "./www/assets/app-icon-1024.png",
  "./www/assets/momgagym-logo.jpg",
  "./www/assets/partner-taekwondo-logos.png",
  "./www/assets/fonts/NotoSerifKR-SemiBold.woff2",
  "./www/assets/fonts/NotoSerifKR-Bold.woff2",
  "./www/assets/fonts/NotoSerifKR-Black.woff2"
];
const ENGINE_ASSETS = [
  "./www/models/pose_landmarker_lite.task",
  "./www/vendor/mediapipe/tasks-vision/vision_bundle.mjs",
  "./www/vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.js",
  "./www/vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm"
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
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(APP_URL)));
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
