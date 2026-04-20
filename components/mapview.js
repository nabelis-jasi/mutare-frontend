// ============================================
// MAPVIEW.JS - Handles all map operations
// ============================================

let map;
let currentMarkers = [];
let currentLines = [];
let currentPolygons = [];
let heatLayer = null;
let activeTileLayer = null;

// Initialize map
function initMap(centerLat = -18.9735, centerLng = 32.6705, zoom = 13) {
    map = L.map('map').setView([centerLat, centerLng], zoom);
    
    activeTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    map.on('mousemove', function(e) {
        const coordStatus = document.getElementById('coordStatus');
        if (coordStatus) {
            coordStatus.innerHTML = 'LAT: ' + e.latlng.lat.toFixed(6) + ' | LNG: ' + e.latlng.lng.toFixed(6) + ' | ZOOM: ' + map.getZoom();
        }
    });
    
    return map;
}

// Switch base map
function switchBaseMap(tileType) {
    if (activeTileLayer) {
        map.removeLayer(activeTileLayer);
    }
    
    let url, attribution;
    if (tileType === 'satellite') {
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = 'Tiles &copy; Esri';
    } else if (tileType === 'topo') {
        url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attribution = 'Map data &copy; OSM | Style &copy; OpenTopoMap';
    } else {
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenStreetMap contributors';
    }
    
    activeTileLayer = L.tileLayer(url, { attribution: attribution, maxZoom: 19 }).addTo(map);
}

// Load manholes (point layer)
function loadManholes(manholes) {
    // Clear existing markers
    for (let i = 0; i < currentMarkers.length; i++) {
        map.removeLayer(currentMarkers[i]);
    }
    currentMarkers = [];
    
    if (!manholes || manholes.length === 0) return;
    
    for (let i = 0; i < manholes.length; i++) {
        const m = manholes[i];
        let color = '#28a745';
        if (m.status === 'critical') color = '#dc3545';
        else if (m.status === 'warning') color = '#ffc107';
        
        const marker = L.circleMarker([m.lat, m.lng], {
            radius: Math.min(8 + (m.blockages / 3), 16),
            color: color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.7
        });
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <b>🕳️ ${m.name}</b><br>
                Suburb: ${m.suburb}<br>
                Diameter: ${m.diameter}mm<br>
                Status: <span style="color:${color}">${m.status.toUpperCase()}</span><br>
                Blockages: ${m.blockages}
            </div>
        `);
        
        marker.addTo(map);
        currentMarkers.push(marker);
    }
}

// Load pipelines (line layer)
function loadPipelines(pipelines) {
    // Clear existing lines
    for (let i = 0; i < currentLines.length; i++) {
        map.removeLayer(currentLines[i]);
    }
    currentLines = [];
    
    if (!pipelines || pipelines.length === 0) return;
    
    for (let i = 0; i < pipelines.length; i++) {
        const p = pipelines[i];
        let color = '#2b7bff';
        if (p.status === 'critical') color = '#dc3545';
        else if (p.status === 'warning') color = '#ffc107';
        
        const line = L.polyline(p.coordinates, {
            color: color,
            weight: 5,
            opacity: 0.8
        });
        
        line.bindPopup(`
            <div>
                <b>📏 ${p.name}</b><br>
                Status: ${p.status.toUpperCase()}
            </div>
        `);
        
        line.addTo(map);
        currentLines.push(line);
    }
}

// Load suburbs (polygon layer)
function loadSuburbs(suburbs) {
    // Clear existing polygons
    for (let i = 0; i < currentPolygons.length; i++) {
        map.removeLayer(currentPolygons[i]);
    }
    currentPolygons = [];
    
    if (!suburbs || suburbs.length === 0) return;
    
    for (let i = 0; i < suburbs.length; i++) {
        const s = suburbs[i];
        const polygon = L.polygon(s.coordinates, {
            color: '#ffc107',
            weight: 2,
            fillColor: '#ffc107',
            fillOpacity: 0.15
        });
        
        polygon.bindPopup(`
            <div>
                <b>🏘️ ${s.name}</b><br>
                Area: ${s.area} km²<br>
                Blockages: ${s.blockages}
            </div>
        `);
        
        polygon.addTo(map);
        currentPolygons.push(polygon);
    }
}

// Update all layers at once (used when filters change)
function updateLayers(manholes, pipelines) {
    loadManholes(manholes);
    loadPipelines(pipelines);
}

// Add heatmap
function addHeatmap(heatPoints) {
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.3
    });
    heatLayer.addTo(map);
}

// Show heatmap from current manholes
function showHeatmapFromManholes(manholes) {
    if (!manholes || manholes.length === 0) return;
    
    const heatPoints = manholes.map(m => [m.lat, m.lng, m.blockages || 1]);
    addHeatmap(heatPoints);
}

// Clear heatmap
function clearHeatmap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
}

// Fit map to show all assets
function fitToBounds() {
    const allPoints = [];
    for (let i = 0; i < currentMarkers.length; i++) {
        const latlng = currentMarkers[i].getLatLng();
        allPoints.push([latlng.lat, latlng.lng]);
    }
    
    if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Get map instance
function getMap() {
    return map;
}

// ============================================
// EXPORTS (ES6 MODULE)
// ============================================

export default {
    init: initMap,
    switchBaseMap: switchBaseMap,
    loadManholes: loadManholes,
    loadPipelines: loadPipelines,
    loadSuburbs: loadSuburbs,
    updateLayers: updateLayers,
    addHeatmap: addHeatmap,
    showHeatmapFromManholes: showHeatmapFromManholes,
    clearHeatmap: clearHeatmap,
    fitToBounds: fitToBounds,
    getMap: getMap
};
