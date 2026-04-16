let map, heatLayer, markersLayer;

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

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (targetId === 'map-tab' && map) map.invalidateSize();
  });
});

async function initMap() {
  if (map) map.remove();
  map = L.map('map').setView([-18.9735, 32.6705], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
  }).addTo(map);

  // Heatmap from job_logs (last 30 days)
  const hotspots = await window.electronAPI.query(`
    SELECT latitude, longitude, COUNT(*) as intensity
    FROM job_logs
    WHERE date > NOW() - INTERVAL '30 days'
    GROUP BY latitude, longitude
  `);
  const heatPoints = hotspots.map(h => [h.latitude, h.longitude, h.intensity]);
  heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 17 });
  heatLayer.addTo(map);

  // Markers for each manhole
  const manholes = await window.electronAPI.query(`
    SELECT DISTINCT manhole_id, latitude, longitude FROM job_logs
  `);
  markersLayer = L.layerGroup().addTo(map);
  for (const mh of manholes) {
    const marker = L.circleMarker([mh.latitude, mh.longitude], {
      radius: 6,
      color: 'forestgreen',
      fillOpacity: 0.8,
    });
    marker.bindPopup(`Manhole ${mh.manhole_id}`);
    marker.on('click', async () => {
      const profile = await window.electronAPI.getAssetProfile(mh.manhole_id);
      if (profile) {
        document.getElementById('asset-profile').innerHTML = `
          <h3>Asset: Manhole ${profile.asset.id}</h3>
          <p><strong>Installed:</strong> ${profile.asset.installation_date || 'Unknown'}</p>
          <p><strong>Material:</strong> ${profile.asset.material || 'Cast Iron'}</p>
          <p><strong>Risk Score:</strong> 
            <span style="color: ${profile.risk > 70 ? '#ff8888' : '#88ff88'}">${profile.risk}%</span>
          </p>
          <h4>Maintenance History</h4>
          <ul>${profile.logs.map(log => `<li>${new Date(log.date).toLocaleDateString()}: ${log.action || 'Cleared'}</li>`).join('') || '<li>None</li>'}</ul>
        `;
      } else {
        document.getElementById('asset-profile').innerHTML = `<p>No asset data found for ID ${mh.manhole_id}</p>`;
      }
    });
    marker.addTo(markersLayer);
  }
}

async function generatePDFReport() {
  const jobs = await window.electronAPI.query(`
    SELECT manhole_id, resolution_time, date
    FROM job_logs
    WHERE date >= NOW() - INTERVAL '7 days'
    ORDER BY date DESC
  `);
  if (!jobs.length) {
    alert('No jobs in the last 7 days.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(34, 139, 34);
  doc.text('🏛️ Mutare City Council', 20, 20);
  doc.setFontSize(12);
  doc.text('Weekly Maintenance Report', 20, 30);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);

  doc.autoTable({
    startY: 50,
    head: [['Manhole ID', 'Resolution (hrs)', 'Date']],
    body: jobs.map(j => [j.manhole_id, j.resolution_time, new Date(j.date).toLocaleDateString()]),
    theme: 'striped',
    headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] },
    bodyStyles: { textColor: [34, 139, 34] },
    alternateRowStyles: { fillColor: [240, 255, 240] },
  });
  const total = jobs.length;
  const avg = jobs.reduce((a,b) => a + b.resolution_time, 0) / total;
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Total blockages cleared: ${total}`, 20, finalY);
  doc.text(`Average resolution time: ${avg.toFixed(1)} hours`, 20, finalY + 10);
  doc.save(`Weekly_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

async function syncOfflineLogs() {
  const statusSpan = document.getElementById('sync-status');
  statusSpan.textContent = '🔄 Syncing...';
  statusSpan.style.color = 'orange';
  try {
    await window.electronAPI.syncNow();
    statusSpan.textContent = '✅ Synced';
    statusSpan.style.color = 'forestgreen';
    // Refresh map data
    if (document.querySelector('.tab.active').dataset.tab === 'map-tab') initMap();
  } catch (err) {
    statusSpan.textContent = '❌ Sync failed';
    statusSpan.style.color = 'red';
    console.error(err);
  }
}

async function initApp() {
  await initMap();
  document.getElementById('sync-btn').onclick = syncOfflineLogs;
  document.getElementById('pdf-report-btn').onclick = generatePDFReport;
}

checkFirstRun();
