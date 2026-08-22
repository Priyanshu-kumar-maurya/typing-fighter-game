// Typing Fighter - PWA Service Worker v29 (Coin System, Character Shop & Upgrade Trees)

const CACHE_NAME = 'typing-fighter-v29';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './favicon.svg',
    './manifest.json',
    './js/icons.js',
    './js/config.js',
    './js/auth.js',
    './js/audio.js',
    './js/renderer.js',
    './js/p2p.js',
    './js/combat.js',
    './js/word-engine.js',
    './js/ui-manager.js',
    './js/main.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Network-first strategy for ALL JS files to guarantee immediate bugfix delivery!
self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/js/')) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
