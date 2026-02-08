let myLocationMarker = null;
let myAccuracyCircle = null;

// ===== MAP =====
const map = L.map("map").setView([11.5, 106.9], 16);

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
const sat = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
);

sat.addTo(map);
let base = "sat";

// ===== DATA =====
const drawn = new L.FeatureGroup().addTo(map);
let labels = [];
let gpsWatch = null;
let gpsPts = [];
let drawCtrl = null;

// ===== BASE MAP =====
function doiNen() {
  if (base === "sat") {
    map.removeLayer(sat); osm.addTo(map); base = "osm";
  } else {
    map.removeLayer(osm); sat.addTo(map); base = "sat";
  }
}

// ===== LOCATION =====
function dinhVi() {
  navigator.geolocation.getCurrentPosition(p => {
    map.setView([p.coords.latitude, p.coords.longitude], 18);
  });
}

// ===== DRAW HAND =====
function batVe() {
  if (drawCtrl) map.removeControl(drawCtrl);
  drawCtrl = new L.Control.Draw({
    edit: { featureGroup: drawn },
    draw: { polygon: true, polyline: true, rectangle: false, circle: false, marker: false }
  });
  map.addControl(drawCtrl);
}

map.on(L.Draw.Event.CREATED, e => {
  drawn.clearLayers();
  clearLabels();
  drawn.addLayer(e.layer);
  thongKe(e.layer);
  hienCanh(e.layer);
});

// ===== GPS =====
function batGPS() {
  gpsPts = [];
  gpsWatch = navigator.geolocation.watchPosition(p => {
    gpsPts.push([p.coords.latitude, p.coords.longitude]);
    drawn.clearLayers();
    L.polyline(gpsPts, { color: "red" }).addTo(drawn);
  }, null, { enableHighAccuracy: true });
}

function ketThucGPS() {
  if (!gpsWatch) return;
  navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch = null;

  drawn.clearLayers();
  clearLabels();

  const pts = lamThang(gpsPts);
  const layer = pts.length > 2
    ? L.polygon(pts, { color: "green" })
    : L.polyline(pts, { color: "blue" });

  drawn.addLayer(layer);
  thongKe(layer);
  hienCanh(layer);
}

// ===== GPS SMOOTH =====
function lamThang(arr) {
  const r = [arr[0]];
  for (let i = 1; i < arr.length; i++)
    if (map.distance(r[r.length - 1], arr[i]) > 3) r.push(arr[i]);
  return r;
}

// ===== EDGE LABEL =====
function hienCanh(layer) {
  let pts = layer instanceof L.Polygon ? layer.getLatLngs()[0] : layer.getLatLngs();
  if (layer instanceof L.Polygon) pts = [...pts, pts[0]];

  for (let i = 1; i < pts.length; i++) {
    const d = pts[i - 1].distanceTo(pts[i]).toFixed(1);
    const mid = L.latLng(
      (pts[i - 1].lat + pts[i].lat) / 2,
      (pts[i - 1].lng + pts[i].lng) / 2
    );
    labels.push(
      L.marker(mid, {
        icon: L.divIcon({ className: "label", html: `${d} m` })
      }).addTo(map)
    );
  }
}

function clearLabels() {
  labels.forEach(l => map.removeLayer(l));
  labels = [];
}

// ===== STATS =====
function thongKe(layer) {
  rsArea.innerText = rsPerimeter.innerText = rsLength.innerText = "-";

  if (layer instanceof L.Polygon) {
    const pts = layer.getLatLngs()[0];
    rsArea.innerText = (L.GeometryUtil.geodesicArea(pts) / 10000).toFixed(3);
    rsPerimeter.innerText = tong([...pts, pts[0]]).toFixed(1);
  } else {
    rsLength.innerText = tong(layer.getLatLngs()).toFixed(1);
  }
}

function tong(arr) {
  let d = 0;
  for (let i = 1; i < arr.length; i++) d += arr[i - 1].distanceTo(arr[i]);
  return d;
}

// ===== EXCEL (CHUẨN, KHÔNG LỖI) =====
function xuatExcel() {
  if (drawn.getLayers().length === 0) {
    alert("Chưa có dữ liệu đo");
    return;
  }

  const layer = drawn.getLayers()[0];
  const tenLoEl = document.getElementById("tenLo");
  const tenLo = tenLoEl && tenLoEl.value ? tenLoEl.value.trim() : "Chua_dat_ten";

  let area = "-", peri = "-", len = "-";
  let pts = [];

  if (layer instanceof L.Polygon) {
    pts = layer.getLatLngs()[0];
    area = (L.GeometryUtil.geodesicArea(pts) / 10000).toFixed(3);
    peri = tong([...pts, pts[0]]).toFixed(1);
  } else {
    pts = layer.getLatLngs();
    len = tong(pts).toFixed(1);
  }

  const sheetInfo = [
    ["Tên lô", tenLo],
    ["Diện tích (ha)", area],
    ["Chu vi (m)", peri],
    ["Chiều dài (m)", len],
    ["Thời gian", new Date().toLocaleString()]
  ];

  const sheetCoord = [["STT", "Latitude", "Longitude"]];
  pts.forEach((p, i) => sheetCoord.push([i + 1, p.lat, p.lng]));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetInfo), "ThongTinDo");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetCoord), "ToaDoGPS");

  XLSX.writeFile(wb, `DoDac_${tenLo}.xlsx`);
}
// ================== CUSTOM MAP CONTROLS ==================

// --- NÚT ĐỊNH VỊ (ICON PHỔ BIẾN) ---
const locateControl = L.control({ position: "topright" });
locateControl.onAdd = function () {
  const btn = L.DomUtil.create("button", "map-btn locate-btn");
  btn.title = "Vị trí của tôi";

  // Icon dạng crosshair (giống Google Maps)
  btn.innerHTML = `
    <span class="locate-icon">
      <span class="dot"></span>
    </span>
  `;

  L.DomEvent.on(btn, "click", function (e) {
    L.DomEvent.stop(e);
    dinhVi();
  });

  return btn;
};
locateControl.addTo(map);


// --- NÚT CHUYỂN BẢN ĐỒ NỀN ---
const basemapControl = L.control({ position: "topright" });
basemapControl.onAdd = function () {
  const btn = L.DomUtil.create("button", "map-btn");
  btn.innerHTML = "🛰️";
  btn.title = "Bật / tắt vệ tinh";

  L.DomEvent.on(btn, "click", function (e) {
    L.DomEvent.stop(e);
    doiNen();
  });

  return btn;
};
basemapControl.addTo(map);
// ===== ĐĂNG KÝ SERVICE WORKER =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
let deferredPrompt;
const btnInstall = document.getElementById("btnInstall");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.style.display = "block";
});

btnInstall.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  btnInstall.style.display = "none";
});

// ===== PWA AUTO UPDATE =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {

    // Có service worker mới
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          hienThongBaoUpdate();
        }
      });
    });

  });
}
// HIỂN THỊ VERSION RA FOOTER
fetch("sw.js")
  .then(r => r.text())
  .then(t => {
    const m = t.match(/APP_VERSION\s*=\s*"([^"]+)"/);
    if (m) document.getElementById("appVersion").innerText = "v" + m[1];
  });

