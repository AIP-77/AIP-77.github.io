const CACHE_NAME = 'sais-panel-v2';

// Установка: кэшируем оболочку приложения
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(['./']))
            .then(() => self.skipWaiting())
    );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Стратегия "сначала сеть": данные и интерфейс всегда свежие,
// кэш используется только когда нет интернета (офлайн-режим PWA)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            })
            .catch(() => caches.match(event.request).then(m => m || caches.match('./')))
    );
});
