// Minimal service worker: enables PWA installability and handles web-push
// notification display/clicks. Deliberately no offline caching of API data
// (prices must always be fresh), only the app shell is cache-friendly via
// the browser's normal HTTP cache.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'DealsBotTracker', body: event.data.text() };
  }
  const title = payload.title || 'DealsBotTracker';
  const options = {
    body: payload.body || 'A new deal was found.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/deals' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/deals';
  event.waitUntil(self.clients.openWindow(url));
});
