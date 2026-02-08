const APP_VERSION = "1.0.5";

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e => {
  self.clients.claim();
});
