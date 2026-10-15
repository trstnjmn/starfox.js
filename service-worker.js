const CACHE_NAME = 'starfoxjs-v3';

const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './gameloop.js',
    './app.js',
    './game-config.json',
    './manifest.webmanifest',
    './assets/logo.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/icons/apple-touch-icon.png',
    'https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js'
];

const NETWORK_FIRST = [
    'index.html',
    'app.js',
    'gameloop.js',
    'styles.css',
    'manifest.webmanifest',
    'game-config.json'
];

function isNetworkFirst(url) {
    const p = new URL(url).pathname;
    return p.endsWith('/') || NETWORK_FIRST.some((f) => p.endsWith(f));
}

function networkFirst(req) {
    return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
    }).catch(() => caches.match(req));
}

function cacheFirst(req) {
    return caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            return res;
        }).catch(() => cached);
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    event.respondWith(isNetworkFirst(req.url) ? networkFirst(req) : cacheFirst(req));
});
