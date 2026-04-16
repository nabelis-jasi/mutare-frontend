// ----- Global state -----
let map, heatLayer, markersLayer;
let activeLayers = {}; // name -> L.geoJSON layer
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;

// ----- Wizard & Init -----
async function checkFirstRun() {
  const creds = await window.electronAPI.getCredentials();
  if (!creds) {
    document.getElementById('wizard').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  } else {
    document.getElementById('wizard').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    initApp();
  }
}

document.getElementById('save-creds')?.addEventListener('click', async () => {
  const creds = {
    host: document.getElementById('pg-host').value,
    port: document.getElementById('pg-port').value,
    user: document.getElementById('pg-user').value,
    password: document.getElementById('pg-password').value,
    database: document.getElementById('pg-db').value,
  };
  try {
    await window.electronAPI.saveCredentials(creds);
    checkFirstRun();
  } catch (err) {
    alert('Connection failed: ' + err.message);
  }
});

// ----- Tab switching -----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (targetId === 'map-tab' && map) map.invalidateSize();
    if (targetId === 'layers-tab') loadAvailableSpatialTables();
  });
});

// ----- Map & Heatmap -----
async function initMap() {
  if (map) map.remove();
  map = L.map('map').setView([-18.9735, 32.6705], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
  }).addTo(map);

  // Heatmap from job_logs (last 30 days)
  const hotspots = await window.electronAPI.query(`
    SELECT a.latitude, a.longitude, COUNT(jl.id) as intensity
    FROM job_logs jl
    JOIN assets a ON jl.asset_id = a.id
    WHERE jl.date > NOW() - INTERVAL '30 days'
    GROUP BY a.latitude, a.longitude
  `);
  const heatPoints = hotspots.map(h => [h.latitude, h.longitude, h.intensity]);
  heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 17 });
  heatLayer.addTo(map);

  // Asset markers
  const assets = await window.electronAPI.query(`
    SELECT id, asset_code, latitude, longitude FROM assets WHERE latitude IS NOT NULL
  `);
  markersLayer = L.layerGroup().addTo(map);
  for (const a of assets) {
    const marker = L.circleMarker([a.latitude, a.longitude], {
      radius: 6,
      color: 'forestgreen',
      fillOpacity: 0.8,
    });
    marker.bindPopup(`<b>${a.asset_code}</b>`);
    marker.on('click', async () => {
      const profile = await window.electronAPI.getAssetProfile(a.id);
      if (profile) {
        document.getElementById('asset-profile').innerHTML = `
          <h3>Asset: ${profile.asset.asset_code}</h3>
          <p><strong>Type:</strong> ${profile.asset.asset_type}</p>
          <p><strong>Installed:</strong> ${profile.asset.installation_date || 'Unknown'}</p>
          <p><strong>Material:</strong> ${profile.asset.material || 'N/A'}</p>
          <p><strong>Risk Score:</strong> 
            <span style="color: ${profile.risk > 70 ? '#ff8888' : '#88ff88'}">${profile.risk}%</span>
          </p>
          <h4>Maintenance History</h4>
          <ul>${profile.logs.map(log => `<li>${new Date(log.date).toLocaleDateString()}: ${log.job_type} - ${log.action || ''}</li>`).join('') || '<li>No logs</li>'}</ul>
        `;
      }
    });
    marker.addTo(markersLayer);
  }
}

// ----- Layer Manager (QGIS‑like) -----
async function loadAvailableSpatialTables() {
  const sql = `
    SELECT f_table_schema, f_table_name, f_geometry_column, srid, type
    FROM geometry_columns
    WHERE f_table_schema NOT IN ('information_schema', 'pg_catalog', 'topology', 'tiger')
    ORDER BY f_table_name
  `;
  const tables = await window.electronAPI.query(sql);
  const container = document.getElementById('available-layers-list');
  if (!container) return;
  container.innerHTML = '';
  for (const t of tables) {
    const div = document.createElement('div');
    div.className = 'layer-item';
    div.innerHTML = `
      <span>📐 ${t.f_table_schema}.${t.f_table_name} (${t.type})</span>
      <button class="add-layer-btn" data-schema="${t.f_table_schema}" data-table="${t.f_table_name}" data-geom="${t.f_geometry_column}">＋ Add</button>
    `;
    container.appendChild(div);
  }
  document.querySelectorAll('.add-layer-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const schema = btn.dataset.schema;
      const table = btn.dataset.table;
      const geomCol = btn.dataset.geom;
      await addLayerFromTable(schema, table, geomCol);
    });
  });
}

async function addLayerFromTable(schema, table, geomCol) {
  const layerName = `${schema}.${table}`;
  if (activeLayers[layerName]) {
    alert('Layer already added');
    return;
  }
  const sql = `
    SELECT ST_AsGeoJSON(${geomCol}) AS geojson, *
    FROM ${schema}.${table}
    WHERE ${geomCol} IS NOT NULL
  `;
  const rows = await window.electronAPI.query(sql);
  const features = rows.map(row => {
    const geojson = JSON.parse(row.geojson);
    delete row.geojson;
    return { type: 'Feature', geometry: geojson, properties: row };
  });
  const featureCollection = { type: 'FeatureCollection', features };
  const layer = L.geoJSON(featureCollection, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 5, color: 'forestgreen', fillOpacity: 0.6 }),
    onEachFeature: (feature, layer) => {
      if (feature.properties) {
        const popup = Object.entries(feature.properties).map(([k,v]) => `<b>${k}</b>: ${v}`).join('<br>');
        layer.bindPopup(popup);
      }
    }
  }).addTo(map);
  activeLayers[layerName] = layer;
  updateActiveLayersList();
}

function updateActiveLayersList() {
  const container = document.getElementById('active-layers-list');
  if (!container) return;
  container.innerHTML = '';
  for (const [name, layer] of Object.entries(activeLayers)) {
    const div = document.createElement('div');
    div.className = 'layer-item';
    div.innerHTML = `
      <span>👁️ ${name}</span>
      <div class="layer-controls">
        <button class="toggle-visibility" data-layer="${name}">👁️</button>
        <button class="remove-layer" data-layer="${name}">✖️</button>
      </div>
    `;
    container.appendChild(div);
  }
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const layerName = btn.dataset.layer;
      const layer = activeLayers[layerName];
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
        btn.textContent = '👁️‍🗨️';
      } else {
        map.addLayer(layer);
        btn.textContent = '👁️';
      }
    });
  });
  document.querySelectorAll('.remove-layer').forEach(btn => {
    btn.addEventListener('click', () => {
      const layerName = btn.dataset.layer;
      const layer = activeLayers[layerName];
      if (layer) {
        map.removeLayer(layer);
        delete activeLayers[layerName];
        updateActiveLayersList();
      }
    });
  });
}

// ----- PDF Generation (jsPDF) -----
async function generatePDFBlob() {
  const jobs = await window.electronAPI.query(`
    SELECT a.asset_code, jl.job_type, jl.resolution_time_hours, jl.date, jl.performed_by
    FROM job_logs jl
    JOIN assets a ON jl.asset_id = a.id
    WHERE jl.date >= NOW() - INTERVAL '7 days'
    ORDER BY jl.date DESC
  `);
  if (!jobs.length) {
    alert('No jobs in the last 7 days.');
    return null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(34, 139, 34);
  doc.text('Mutare City Council - Weekly Maintenance Report', 20, 20);
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
  doc.autoTable({
    startY: 40,
    head: [['Asset Code', 'Job Type', 'Resolution (hrs)', 'Date', 'Performed By']],
    body: jobs.map(j => [j.asset_code, j.job_type, j.resolution_time_hours || 'N/A', new Date(j.date).toLocaleDateString(), j.performed_by || '']),
    theme: 'striped',
    headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] },
    bodyStyles: { textColor: [34, 139, 34] },
  });
  const total = jobs.length;
  const avg = jobs.reduce((a,b) => a + (b.resolution_time_hours || 0), 0) / total;
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Total jobs: ${total}`, 20, finalY);
  doc.text(`Average resolution time: ${avg.toFixed(1)} hours`, 20, finalY + 10);
  return doc.output('arraybuffer');
}

// ----- PDF.js v5 Viewer -----
async function showPDF(pdfData) {
  const modal = document.getElementById('pdf-modal');
  modal.style.display = 'flex';
  const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
  pdfDoc = await loadingTask.promise;
  totalPages = pdfDoc.numPages;
  document.getElementById('page-num').innerText = `Page 1 / ${totalPages}`;
  currentPage = 1;
  await renderPage(currentPage);
}

async function renderPage(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.getElementById('pdf-canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  const renderContext = { canvasContext: context, viewport };
  await page.render(renderContext).promise;
  document.getElementById('page-num').innerText = `Page ${pageNum} / ${totalPages}`;
}

// ----- PDF Handlers -----
async function viewReport() {
  const pdfBuffer = await generatePDFBlob();
  if (pdfBuffer) await showPDF(pdfBuffer);
}
async function saveReport() {
  const pdfBuffer = await generatePDFBlob();
  if (pdfBuffer) {
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Weekly_Report_${new Date().toISOString().slice(0,10)}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

// PDF Modal Navigation
document.getElementById('pdf-prev')?.addEventListener('click', () => {
  if (currentPage <= 1) return;
  currentPage--;
  renderPage(currentPage);
});
document.getElementById('pdf-next')?.addEventListener('click', () => {
  if (currentPage >= totalPages) return;
  currentPage++;
  renderPage(currentPage);
});
document.getElementById('close-pdf-modal')?.addEventListener('click', () => {
  document.getElementById('pdf-modal').style.display = 'none';
  pdfDoc = null;
});

// ----- Offline Sync -----
async function syncOfflineLogs() {
  const statusSpan = document.getElementById('sync-status');
  statusSpan.textContent = '🔄 Syncing...';
  statusSpan.style.color = 'orange';
  try {
    await window.electronAPI.syncNow();
    statusSpan.textContent = '✅ Synced';
    statusSpan.style.color = 'forestgreen';
    if (document.querySelector('.tab.active').dataset.tab === 'map-tab') initMap();
  } catch (err) {
    statusSpan.textContent = '❌ Sync failed';
    statusSpan.style.color = 'red';
    console.error(err);
  }
}

// ----- Main init -----
async function initApp() {
  await initMap();
  document.getElementById('sync-btn').onclick = syncOfflineLogs;
  document.getElementById('pdf-view-btn').onclick = viewReport;
  document.getElementById('pdf-save-btn').onclick = saveReport;
  document.getElementById('refresh-layers-btn')?.addEventListener('click', loadAvailableSpatialTables);
  await loadAvailableSpatialTables();
}

checkFirstRun();
