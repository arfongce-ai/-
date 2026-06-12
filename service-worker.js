const CACHE_NAME = "poomsae-training-root-local-serif-v3";
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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
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
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
