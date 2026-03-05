const CACHE_NAME = 'studyleaf-v2';
const STATIC_ASSETS = [
    '/',
    '/styles/main.css',
    '/scripts/main.js',
    '/scripts/editor.js',
    '/images/favicon-32x32.png',
    '/images/apple-touch-icon.png',
    '/manifest.json'
];

// Install: Cache static assets and activate immediately
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

// Fetch: Stale-while-revalidate for static assets, network-first for pages
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests (POST for login, create, etc.)
    if (request.method !== 'GET') return;

    // Skip API routes and admin routes
    if (request.url.includes('/api/') || request.url.includes('/admin')) return;

    // Stale-while-revalidate for static assets (CSS, JS, images)
    // Serves the cached version instantly, then fetches from network
    // and updates the cache so next load gets the fresh version.
    if (request.url.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(request).then(cached => {
                    const networkFetch = fetch(request).then(response => {
                        if (response.ok) {
                            cache.put(request, response.clone());
                        }
                        return response;
                    }).catch(() => cached); // fall back to cache if offline

                    // Return cached version immediately, or wait for network
                    return cached || networkFetch;
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
