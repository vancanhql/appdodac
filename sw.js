/* ===== SERVICE WORKER – AUTO UPDATE ===== */

// 👇 TĂNG SỐ NÀY MỖI LẦN UPDATE APP
const APP_VERSION = "1.0.3";
const CACHE_NAME = "do-dac-vuon-cay-" + APP_VERSION;

// Cài đặt service worker mới
self.addEventListener("install", event => {
  console.log("[SW] Install version:", APP_VERSION);
  self.skipWaiting();
});

// Kích hoạt & xóa cache cũ
self.addEventListener("activate", event => {
  console.log("[SW] Activate version:", APP_VERSION);

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Fetch – hiện chưa cache (để trống vẫn OK)
self.addEventListener("fetch", event => {
  // Có thể bổ sung cache sau
});


