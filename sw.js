// Typing Fighter - PWA Service Worker

const CACHE_NAME = 'typing-fighter-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './favicon.svg',
    './manifest.json',
    './js/config.js',
    './js/auth.js',
    './js/audio.js',
    './js/renderer.js',
    './js/p2p.js',
    './js/combat.js',
    './js/main.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell & Static Assets');
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
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
