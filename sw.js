// sw.js - Service Worker for UrbanCity PWA
// ============================================
// VERSION: Increment this when you make changes
// ============================================
const CACHE_VERSION = 'urbancity-v4'; // Incremented from v3 to v4
const urlsToCache = [
  '/',
  '/index.html',
  '/menu.html',
  '/checkout.html',
  '/cart.js',
  '/manifest.json',
  '/logo.jpg',
  '/logo1.jpg',
  '/logo2.jpg'
];

// ============================================
// INSTALL EVENT - Force activate new version
// ============================================
self.addEventListener('install', function(event) {
  console.log('🔄 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function(cache) {
        console.log('✅ Cache opened for:', CACHE_VERSION);
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
  );
});

// ============================================
// ACTIVATE EVENT - Delete old caches
// ============================================
self.addEventListener('activate', function(event) {
  console.log('🔄 Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete any caches that don't match the current version
          if (cacheName !== CACHE_VERSION) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all clients immediately
      console.log('✅ Service Worker activated, controlling all clients');
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH EVENT - Network first with cache fallback
// ============================================
self.addEventListener('fetch', function(event) {
  const request = event.request;
  
  // Skip cross-origin requests (like Supabase API calls)
  if (request.url.includes('supabase.co') || 
      request.url.includes('googleapis.com') ||
      request.url.includes('fontawesome.com')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ============================================
  // NETWORK FIRST STRATEGY - Always try network first
  // ============================================
  event.respondWith(
    fetch(request)
      .then(function(networkResponse) {
        // If the network request succeeds, update the cache
        const responseClone = networkResponse.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(request, responseClone);
        });
        return networkResponse;
      })
      .catch(function() {
        // If network fails, try the cache
        return caches.match(request)
          .then(function(cachedResponse) {
            if (cachedResponse) {
              console.log('📦 Serving from cache:', request.url);
              return cachedResponse;
            }
            // If not in cache, show offline page or fallback
            console.warn('⚠️ No cache for:', request.url);
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ============================================
// MESSAGE EVENT - Handle messages from main thread
// ============================================
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Force check for updates
    self.skipWaiting();
  }
});

console.log('✅ UrbanCity Service Worker loaded! Version:', CACHE_VERSION);