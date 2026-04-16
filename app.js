const { ipcRenderer } = require('electron');

// 1. QGIS LOGIC: Map Display & Layer Control
const map = L.map('map').setView([-18.97, 32.65], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

async function loadMapLayers() {
    const assets = await ipcRenderer.invoke('query-db', "SELECT id, type, status, ST_AsGeoJSON(geom) as geo FROM assets");
    assets.forEach(asset => {
        const geo = JSON.parse(asset.geo);
        const color = asset.status === 'blocked' ? 'red' : 'green';
        L.circleMarker([geo.coordinates[1], geo.coordinates[0]], { color: color }).addTo(map)
         .bindPopup(`Asset ID: ${asset.id}<br>Status: ${asset.status}`);
    });
}

// 2. EPICOLLECT LOGIC: Saving a Job Log
async function saveJobLog() {
    const assetId = document.getElementById('asset-id').value;
    const operator = document.getElementById('operator').value;
    const action = document.getElementById('action').value;

    const sql = "INSERT INTO job_logs (asset_id, operator, action, status) VALUES ($1, $2, $3, 'completed')";
    await ipcRenderer.invoke('query-db', sql, [assetId, operator, action]);
    
    // Update asset status to operational after maintenance
    await ipcRenderer.invoke('query-db', "UPDATE assets SET status = 'operational' WHERE id = $1", [assetId]);
    
    alert("Maintenance Log Saved Successfully!");
    location.reload(); // Refresh the "Tableau" stats
}

// 3. TABLEAU LOGIC: Loading Analytics
async function loadAnalytics() {
    const data = await ipcRenderer.invoke('run-python-analytics');
    // Code to update Chart.js or HTML tables goes here
    console.log("Health Report:", data);
}

// Initialize everything
loadMapLayers();
loadAnalytics();
