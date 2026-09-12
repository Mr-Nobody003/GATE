const CACHE_NAME = 'gate-pwa-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './manifest.webmanifest',
        './icon-192x192.png',
        './icon-512x512.png',
      ]);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Ignore non-GET requests
  if (e.request.method !== 'GET') return;
  
  // Basic Network First, falling back to cache strategy
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Clone and cache the response for future offline use
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
