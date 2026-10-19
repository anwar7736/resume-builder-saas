const CACHE_PREFIX = "resumecraft-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icon.svg",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const contentType = response.headers.get("content-type") || "";
          const cacheControl = response.headers.get("cache-control") || "";
          if (
            response.ok &&
            contentType.includes("text/html") &&
            !response.headers.has("set-cookie") &&
            !/\b(private|no-store)\b/i.test(cacheControl)
          ) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)),
            );
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          return cachedPage || (await caches.match(OFFLINE_URL));
        }),
    );
    return;
  }

  const isBuildAsset = url.pathname.startsWith("/_next/static/");
  const isPublicPwaAsset =
    url.pathname === "/icon.svg" ||
    url.pathname === "/icon-192x192.png" ||
    url.pathname === "/icon-512x512.png" ||
    url.pathname === OFFLINE_URL;
  if (!isBuildAsset && !isPublicPwaAsset) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)),
            );
          }
          return response;
        }),
    ),
  );
});
