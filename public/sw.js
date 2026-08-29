/**
 * Evening Watch service worker.
 *
 * The previous version cached nothing — it existed only to make the app
 * installable, which meant "Install App" produced a PWA that showed a blank
 * page with no connection. This one makes the app genuinely offline-first.
 *
 * Strategy, by request type:
 *   navigation          → network first, fall back to cached shell
 *   /assets/* (hashed)  → cache first, immutable
 *   /bibles/*           → cache first, never precached in bulk
 *   /scribe-index.json  → cache first, fetched on first Scribe use
 *   everything else     → network, cache on success
 *
 * Bible text is deliberately NOT precached. There are ~34 MB across 15
 * languages and nobody needs more than one or two. Books cache as they are
 * read, and a whole language can be pulled down on request via the
 * CACHE_LANGUAGE message below.
 */

const VERSION = 'v2';
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const BIBLES = `bibles-${VERSION}`;

/** Small enough to fetch on install without hurting first load. */
const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined) // a missing shell file must not block install
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL, ASSETS, BIBLES]);
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('/index.html')) ?? (await cache.match('/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  // SPA navigation — always serve the shell so deep links work offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // Bible text, commentary, devotionals and the indexes are immutable and
  // potentially very large. Cached on read, never precached in bulk —
  // the Matthew Henry commentary alone is 33 MB.
  if (
    url.pathname.startsWith('/bibles/') ||
    url.pathname.startsWith('/commentary/') ||
    url.pathname.startsWith('/devotionals/') ||
    url.pathname === '/scribe-index.json' ||
    url.pathname === '/cross-references.json'
  ) {
    event.respondWith(cacheFirst(request, BIBLES));
    return;
  }

  // Vite emits content-hashed filenames, so these can be cached forever
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  event.respondWith(cacheFirst(request, SHELL));
});

/* -------------------------------------------------------------------------
 * On-demand language packs
 *
 * From the app:
 *   navigator.serviceWorker.controller.postMessage({
 *     type: 'CACHE_LANGUAGE', folder: 'italian', books: [...slugs]
 *   });
 *
 * Progress arrives back as { type: 'LANGUAGE_PROGRESS', folder, loaded, total }.
 * ---------------------------------------------------------------------- */

async function cacheLanguage(folder, books, client) {
  const cache = await caches.open(BIBLES);
  let loaded = 0;

  for (const book of books) {
    const url = `/bibles/${folder}/${book}.json`;
    try {
      if (!(await cache.match(url))) {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res.clone());
      }
    } catch {
      /* skip and keep going — a partial pack is still useful */
    }
    loaded += 1;
    client?.postMessage({ type: 'LANGUAGE_PROGRESS', folder, loaded, total: books.length });
  }

  client?.postMessage({ type: 'LANGUAGE_READY', folder });
}

async function deleteLanguage(folder) {
  const cache = await caches.open(BIBLES);
  const keys = await cache.keys();
  await Promise.all(
    keys.filter((k) => new URL(k.url).pathname.startsWith(`/bibles/${folder}/`)).map((k) => cache.delete(k)),
  );
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'CACHE_LANGUAGE' && data.folder && Array.isArray(data.books)) {
    event.waitUntil(cacheLanguage(data.folder, data.books, event.source));
  }

  if (data.type === 'DELETE_LANGUAGE' && data.folder) {
    event.waitUntil(deleteLanguage(data.folder));
  }

  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});
