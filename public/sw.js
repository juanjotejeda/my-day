// v2. The service worker makes the app installable and takes over at once.
// It caches nothing: every navigation goes to the network, so the app can never
// show a stale screen. Any cache a previous version or the browser left behind
// is deleted on activate. Push and notificationclick handlers arrive with milestone 7.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});
