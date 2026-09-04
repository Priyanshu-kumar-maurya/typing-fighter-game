// Typing Fighter - PWA Service Worker v37 (Live In-Game Chat, Emoji Reactions & Comic Speech Bubbles)

const CACHE_NAME = 'typing-fighter-v37';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './favicon.png',
    './favicon.svg',
    './apple-touch-icon.png',
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

// ── INSTALL: Cache essential assets & skip waiting for instant activation ──
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching all app files for offline play...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// ── ACTIVATE: Clean up older caches & take immediate control of clients ─────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache version:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ── FETCH: Network-First with Instant Offline Fallback (ignoreSearch enabled) ─
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);
    const isSameOrigin = url.origin === self.location.origin;

    // Handle cross-origin external CDNs (PeerJS, Razorpay, Google Fonts)
    if (!isSameOrigin) {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(e.request, { ignoreSearch: true }).then((cached) => {
                        if (cached) return cached;
                        // For external scripts when offline, return safe empty response so execution doesn't halt
                        if (url.pathname.endsWith('.js')) {
                            return new Response('/* Offline fallback for external script */', {
                                headers: { 'Content-Type': 'application/javascript' }
                            });
                        }
                        return new Response('', { status: 200 });
                    });
                })
        );
        return;
    }

    // Same-origin game files (Network-First -> Auto-Cache -> Offline Fallback)
    e.respondWith(
        fetch(e.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // OFFLINE FALLBACK: match cached assets ignoring version query params (?v=34)
                return caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;

                    // Fallback to index.html for page navigation
                    if (e.request.mode === 'navigate') {
                        return caches.match('./index.html', { ignoreSearch: true }) ||
                               caches.match('./', { ignoreSearch: true });
                    }
                });
            })
    );
});
