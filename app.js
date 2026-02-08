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

// ===== BASE MAP =====
function doiNen() {
  if (base === "sat") {
    map.removeLayer(sat); osm.addTo(map); base = "osm";
  } else {
    map.removeLayer(osm); sat.addTo(map); base = "sat";
  }
}

// ===== LOCATION (GIỐNG GOOGLE MAPS) =====
let myMarker = null;
let myCircle = null;

function dinhVi() {
  navigator.geolocation.getCurrentPosition(pos => {
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    const acc = pos.coords.accuracy;

    map.setView(latlng, 18);

    if (myMarker) map.removeLayer(myMarker);
    if (myCircle) map.removeLayer(myCircle);

    myMarker = L.circleMarker(latlng, {
      radius: 8,
      color: "#1e88e5",
      fillColor: "#2196f3",
      fillOpacity: 1
    }).addTo(map);

    myCircle = L.circle(latlng, {
      radius: acc,
      color: "#1e88e5",
      fillColor: "#90caf9",
      fillOpacity: 0.25,
      weight: 1
    }).addTo(map);
  }, () => alert("Không lấy được vị trí GPS"), { enableHighAccuracy: true });
}

// ===== DRAW HAND =====
let drawCtrl = null;
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

// ===== GPS MEASURE =====
let gpsWatch = null;
let gpsPts = [];
let gpsDangDo = false;

function chonGPS() {
  gpsPts = [];
  gpsDangDo = false;
  document.getElementById("btnStartGPS").style.display = "block";
  document.getElementById("btnFinishGPS").style.display = "none";
}

function batDauGPS() {
  gpsDangDo = true;
  gpsPts = [];

  document.getElementById("btnStartGPS").style.display = "none";
  document.getElementById("btnFinishGPS").style.display = "block";

  gpsWatch = navigator.geolocation.watchPosition(p => {
    if (!gpsDangDo) return;
    gpsPts.push([p.coords.latitude, p.coords.longitude]);

    drawn.clearLayers();
    L.polyline(gpsPts, { color: "red" }).addTo(drawn);
  }, null, { enableHighAccuracy: true });
}

function ketThucGPS() {
  if (!gpsWatch) return;

  navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch = null;
  gpsDangDo = false;

  document.getElementById("btnStartGPS").style.display = "none";
  document.getElementById("btnFinishGPS").style.display = "none";

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

// ===== EXCEL =====
function xuatExcel() {
  if (drawn.getLayers().length === 0) {
    alert("Chưa có dữ liệu đo");
    return;
  }

  const layer = drawn.getLayers()[0];
  const tenLo = tenLo.value || "Chua_dat_ten";

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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Tên lô", tenLo],
    ["Diện tích (ha)", area],
    ["Chu vi (m)", peri],
    ["Chiều dài (m)", len],
    ["Thời gian", new Date().toLocaleString()]
  ]), "ThongTin");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["STT", "Latitude", "Longitude"],
    ...pts.map((p, i) => [i + 1, p.lat, p.lng])
  ]), "ToaDo");

  XLSX.writeFile(wb, `DoDac_${tenLo}.xlsx`);
}

// ===== MAP CONTROLS =====
L.control({ position: "topright" }).onAdd = () => {
  const b = L.DomUtil.create("button", "map-btn locate-btn");
  b.innerHTML = `<span class="locate-icon"><span class="dot"></span></span>`;
  b.onclick = dinhVi;
  return b;
}.addTo(map);

L.control({ position: "topright" }).onAdd = () => {
  const b = L.DomUtil.create("button", "map-btn");
  b.innerHTML = "🛰️";
  b.onclick = doiNen;
  return b;
}.addTo(map);

// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.style.display = "block";
});
btnInstall.onclick = () => {
  deferredPrompt.prompt();
  deferredPrompt = null;
  btnInstall.style.display = "none";
};

fetch("sw.js")
  .then(r => r.text())
  .then(t => {
    const m = t.match(/APP_VERSION\s*=\s*"([^"]+)"/);
    if (m) appVersion.innerText = "v" + m[1];
  });
