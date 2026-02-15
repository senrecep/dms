// DMS Service Worker
const CACHE_VERSION = "dms-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = ["/offline.html", "/logo.svg"];

const NEVER_CACHE = ["/api/sse", "/api/auth/", "/api/cron"];

function shouldNeverCache(url) {
  const path = new URL(url).pathname;
  return NEVER_CACHE.some((pattern) => path.startsWith(pattern));
}

function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return (
    path.startsWith("/_next/static/") ||
    path.match(/\.(woff2?|ttf|otf|eot)$/) ||
    path.match(/\.(png|jpg|jpeg|gif|webp|avif|ico|svg)$/) ||
    path.match(/\.(css|js)$/)
  );
}

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
}

// Install: pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy based on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Never cache SSE, auth, and cron endpoints
  if (shouldNeverCache(request.url)) return;

  // Static assets: cache-first
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // HTML pages and API calls: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && !shouldNeverCache(request.url)) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Offline fallback for navigation requests
          if (isNavigationRequest(request)) {
            return caches.match("/offline.html");
          }
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
      })
  );
});
