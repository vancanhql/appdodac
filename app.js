// ===== DOM =====
const tenLoInput = document.getElementById("tenLo");
const btnInstall = document.getElementById("btnInstall");
const appVersion = document.getElementById("appVersion");

// ===== MAP =====
const map = L.map("map").setView([11.5, 106.9], 16);

const sat = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
).addTo(map);

const drawn = new L.FeatureGroup().addTo(map);
let labels = [];

// ===== LOCATION =====
let myMarker, myCircle;

function dinhVi() {
  navigator.geolocation.getCurrentPosition(p => {
    const ll = [p.coords.latitude, p.coords.longitude];
    const acc = p.coords.accuracy;
    map.setView(ll, 18);

    if (myMarker) map.removeLayer(myMarker);
    if (myCircle) map.removeLayer(myCircle);

    myMarker = L.circleMarker(ll, {
      radius: 8,
      color: "#1e88e5",
      fillColor: "#2196f3",
      fillOpacity: 1
    }).addTo(map);

    myCircle = L.circle(ll, {
      radius: acc,
      color: "#1e88e5",
      fillOpacity: 0.25
    }).addTo(map);
  }, () => alert("Không lấy được GPS"), { enableHighAccuracy: true });
}

// ===== DRAW HAND =====
let drawCtrl;
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

function chonGPS() {
  gpsPts = [];
  document.getElementById("btnStartGPS").style.display = "block";
  document.getElementById("btnFinishGPS").style.display = "none";
}

function batDauGPS() {
  gpsPts = [];
  document.getElementById("btnStartGPS").style.display = "none";
  document.getElementById("btnFinishGPS").style.display = "block";

  gpsWatch = navigator.geolocation.watchPosition(p => {
    gpsPts.push([p.coords.latitude, p.coords.longitude]);
    drawn.clearLayers();
    L.polyline(gpsPts, { color: "red" }).addTo(drawn);
  }, null, { enableHighAccuracy: true });
}

function ketThucGPS() {
  if (gpsWatch) navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch = null;

  document.getElementById("btnFinishGPS").style.display = "none";

  drawn.clearLayers();
  clearLabels();

  const pts = gpsPts;
  const layer = pts.length > 2 ? L.polygon(pts) : L.polyline(pts);
  drawn.addLayer(layer);
  thongKe(layer);
  hienCanh(layer);
}

// ===== LABEL & STATS =====
function hienCanh(layer) {
  let pts = layer.getLatLngs();
  if (layer instanceof L.Polygon) pts = [...pts[0], pts[0][0]];

  for (let i = 1; i < pts.length; i++) {
    const d = pts[i - 1].distanceTo(pts[i]).toFixed(1);
    const mid = L.latLng(
      (pts[i - 1].lat + pts[i].lat) / 2,
      (pts[i - 1].lng + pts[i].lng) / 2
    );
    labels.push(L.marker(mid, {
      icon: L.divIcon({ className: "label", html: `${d} m` })
    }).addTo(map));
  }
}

function clearLabels() {
  labels.forEach(l => map.removeLayer(l));
  labels = [];
}

function thongKe(layer) {
  rsArea.innerText = rsPerimeter.innerText = rsLength.innerText = "-";
  if (layer instanceof L.Polygon) {
    const pts = layer.getLatLngs()[0];
    rsArea.innerText = (L.GeometryUtil.geodesicArea(pts) / 10000).toFixed(3);
    rsPerimeter.innerText = tinhTong([...pts, pts[0]]).toFixed(1);
  } else {
    rsLength.innerText = tinhTong(layer.getLatLngs()).toFixed(1);
  }
}

function tinhTong(a) {
  let d = 0;
  for (let i = 1; i < a.length; i++) d += a[i - 1].distanceTo(a[i]);
  return d;
}

// ===== EXCEL =====
function xuatExcel() {
  if (drawn.getLayers().length === 0) return alert("Chưa có dữ liệu");

  const layer = drawn.getLayers()[0];
  const tenLo = tenLoInput.value || "Chua_dat_ten";
  let pts = layer instanceof L.Polygon ? layer.getLatLngs()[0] : layer.getLatLngs();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Tên lô", tenLo],
    ["Thời gian", new Date().toLocaleString()]
  ]), "ThongTin");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["STT", "Lat", "Lng"],
    ...pts.map((p, i) => [i + 1, p.lat, p.lng])
  ]), "ToaDo");

  XLSX.writeFile(wb, `DoDac_${tenLo}.xlsx`);
}

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
