// Typing Fighter - PWA Service Worker v33 (Mobile HP Display & In-Arena Floating Health Bars)

const CACHE_NAME = 'typing-fighter-v33';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './favicon.svg',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    './js/icons.js',
    './js/config.js',
    './js/upgrades.js',
    './js/payment.js',
    './js/auth.js',
    './js/audio.js',
    './js/renderer.js',
    './js/p2p.js',
    './js/combat.js',
    './js/word-engine.js',
    './js/ui-manager.js',
    './js/main.js'
];

// ── INSTALL: Cache essential assets & take over immediately ──────────────────
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// ── ACTIVATE: Clean up older caches & claim clients ──────────────────────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache version:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ── FETCH: Network-First Strategy with Dynamic Cache Fallback ────────────────
// Ensures mobile phones and installed PWAs always receive the freshest updates
// when online, while still working seamlessly 100% offline!
self.addEventListener('fetch', (e) => {
    // Only handle GET requests
    if (e.request.method !== 'GET') return;

    // Ignore cross-origin non-game requests (e.g. PeerJS broker, analytics)
    const url = new URL(e.request.url);
    const isSameOrigin = url.origin === self.location.origin;

    if (!isSameOrigin) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    // Network-First for same-origin app files (HTML, JS, CSS, assets)
    e.respondWith(
        fetch(e.request)
            .then((networkResponse) => {
                // If response is valid, update the cache in the background
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Offline fallback: serve from local cache
                return caches.match(e.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    // Fallback to root index.html for navigation requests
                    if (e.request.mode === 'navigate') {
                        return caches.match('./index.html') || caches.match('./');
                    }
                });
            })
    );
});
