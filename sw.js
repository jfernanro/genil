var CACHE_NAME = 'genil-v1.6.2';

var STATIC_ASSETS = [
    './index.html',
    './manifest.json',
    './css/variables.css',
    './css/base.css',
    './css/animations.css',
    './css/components.css',
    './js/config.js',
    './js/utils.js',
    './js/api.js',
    './js/chart.js',
    './js/ui.js',
    './js/app.js',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names
                    .filter(function (name) { return name !== CACHE_NAME; })
                    .map(function (name) { return caches.delete(name); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    var isData = url.pathname.endsWith('datos.json') || url.pathname.endsWith('historico.json');

    if (isData) {
        event.respondWith(
            fetch(event.request)
                .then(function (response) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(function () {
                    return caches.match(event.request);
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (cached) {
            if (cached) return cached;
            return fetch(event.request).then(function (response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});
