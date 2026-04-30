// LifeStack Service Worker — Offline Mode
// Bump CACHE_VERSION on each deploy to invalidate old caches.
const CACHE_VERSION = "lifestack-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;

const PRECACHE_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  /\.(?:js|css|woff2?|ttf|eot|otf|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname);

const isAudio = (url) =>
  /\.(?:mp3|m4a|ogg|wav|webm)$/i.test(url.pathname) ||
  url.pathname.includes("/storage/v1/object/") && /audio|podcast/i.test(url.href);

const isSupabaseApi = (url) =>
  url.hostname.endsWith(".supabase.co") &&
  (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/functions/"));

// Cache-first for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Update in background
    fetch(request).then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
    }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

// Network-first for API calls
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok && request.method === "GET") cache.put(request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip cross-origin non-Supabase requests (e.g. analytics)
  if (url.origin !== self.location.origin && !url.hostname.endsWith(".supabase.co")) return;

  // Audio (podcast episodes) — cache first, persistent
  if (isAudio(url)) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Supabase API — network first
  if (isSupabaseApi(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets — cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigations — network first with cached shell fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  // Default — runtime cache
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// Allow page to trigger skipWaiting
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});