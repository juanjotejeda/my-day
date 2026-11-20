// Milestone 1: the service worker only makes the app installable and takes over at once.
// Push and notificationclick handlers arrive with milestone 7.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
