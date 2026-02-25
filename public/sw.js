const CACHE_NAME = 'studyleaf-v1';
const STATIC_ASSETS = [
    '/',
    '/styles/main.css',
    '/scripts/main.js',
    '/scripts/editor.js',
    '/images/favicon-32x32.png',
    '/images/apple-touch-icon.png',
    '/manifest.json'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: Network-first for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests (POST for login, create, etc.)
    if (request.method !== 'GET') return;

    // Skip API routes and admin routes
    if (request.url.includes('/api/') || request.url.includes('/admin')) return;

    // Cache-first for static assets (CSS, JS, images)
    if (request.url.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/)) {
        event.respondWith(
            caches.match(request).then(cached => {
                return cached || fetch(request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Network-first for HTML pages (notes, home, etc.)
    event.respondWith(
        fetch(request)
            .then(response => {
                // Cache successful page responses for offline reading
                if (response.ok && request.url.includes('/note/')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => {
                // Serve from cache if offline
                return caches.match(request).then(cached => {
                    return cached || caches.match('/');
                });
            })
    );
});
