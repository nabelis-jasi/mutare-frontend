// ============================================
// MAPVIEW.JS - Handles all map operations
// ============================================

let map = null;
let currentMarkers = [];
let currentLines = [];
let currentPolygons = [];
let heatLayer = null;
let activeTileLayer = null;

// Initialize map
function initMap(centerLat = -18.9735, centerLng = 32.6705, zoom = 13) {
    console.log('initMap called with:', centerLat, centerLng, zoom);
    
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
        console.error('Leaflet (L) is not defined! Make sure Leaflet JS is loaded.');
        return null;
    }
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element with id "map" not found!');
        return null;
    }
    
    // Check if map already exists
    if (map) {
        console.log('Map already exists, removing old map...');
        map.remove();
        map = null;
    }
    
    try {
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
        
        console.log('Map initialized successfully');
        return map;
        
    } catch (error) {
        console.error('Error initializing map:', error);
        return null;
    }
}

// Switch base map
function switchBaseMap(tileType) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
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
    if (!map) {
        console.error('Map not initialized, cannot load manholes');
        return;
    }
    
    // Clear existing markers safely
    for (let i = 0; i < currentMarkers.length; i++) {
        if (currentMarkers[i] && map.hasLayer(currentMarkers[i])) {
            map.removeLayer(currentMarkers[i]);
        }
    }
    currentMarkers = [];
    
    if (!manholes || manholes.length === 0) {
        console.log('No manholes to display');
        return;
    }
    
    console.log(`Loading ${manholes.length} manholes...`);
    
    for (let i = 0; i < manholes.length; i++) {
        const m = manholes[i];
        if (!m.lat || !m.lng) {
            console.warn('Manhole missing coordinates:', m);
            continue;
        }
        
        let color = '#28a745';
        if (m.status === 'critical') color = '#dc3545';
        else if (m.status === 'warning') color = '#ffc107';
        
        try {
            const marker = L.circleMarker([m.lat, m.lng], {
                radius: Math.min(8 + ((m.blockages || 0) / 3), 16),
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.7
            });
            
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <b>🕳️ ${m.name || 'Manhole'}</b><br>
                    Suburb: ${m.suburb || 'N/A'}<br>
                    Diameter: ${m.diameter || 'N/A'}mm<br>
                    Status: <span style="color:${color}">${(m.status || 'unknown').toUpperCase()}</span><br>
                    Blockages: ${m.blockages || 0}
                </div>
            `);
            
            marker.addTo(map);
            currentMarkers.push(marker);
        } catch (error) {
            console.error('Error adding marker:', error, m);
        }
    }
    
    console.log(`Loaded ${currentMarkers.length} manhole markers`);
}

// Load pipelines (line layer)
function loadPipelines(pipelines) {
    if (!map) {
        console.error('Map not initialized, cannot load pipelines');
        return;
    }
    
    // Clear existing lines safely
    for (let i = 0; i < currentLines.length; i++) {
        if (currentLines[i] && map.hasLayer(currentLines[i])) {
            map.removeLayer(currentLines[i]);
        }
    }
    currentLines = [];
    
    if (!pipelines || pipelines.length === 0) {
        console.log('No pipelines to display');
        return;
    }
    
    console.log(`Loading ${pipelines.length} pipelines...`);
    
    for (let i = 0; i < pipelines.length; i++) {
        const p = pipelines[i];
        if (!p.coordinates || p.coordinates.length < 2) {
            console.warn('Pipeline missing coordinates:', p);
            continue;
        }
        
        let color = '#2b7bff';
        if (p.status === 'critical') color = '#dc3545';
        else if (p.status === 'warning') color = '#ffc107';
        
        try {
            const line = L.polyline(p.coordinates, {
                color: color,
                weight: 5,
                opacity: 0.8
            });
            
            line.bindPopup(`
                <div>
                    <b>📏 ${p.name || 'Pipeline'}</b><br>
                    Status: ${(p.status || 'normal').toUpperCase()}
                </div>
            `);
            
            line.addTo(map);
            currentLines.push(line);
        } catch (error) {
            console.error('Error adding pipeline:', error, p);
        }
    }
    
    console.log(`Loaded ${currentLines.length} pipeline lines`);
}

// Load suburbs (polygon layer)
function loadSuburbs(suburbs) {
    if (!map) {
        console.error('Map not initialized, cannot load suburbs');
        return;
    }
    
    // Clear existing polygons safely
    for (let i = 0; i < currentPolygons.length; i++) {
        if (currentPolygons[i] && map.hasLayer(currentPolygons[i])) {
            map.removeLayer(currentPolygons[i]);
        }
    }
    currentPolygons = [];
    
    if (!suburbs || suburbs.length === 0) return;
    
    for (let i = 0; i < suburbs.length; i++) {
        const s = suburbs[i];
        if (!s.coordinates || s.coordinates.length < 3) continue;
        
        try {
            const polygon = L.polygon(s.coordinates, {
                color: '#ffc107',
                weight: 2,
                fillColor: '#ffc107',
                fillOpacity: 0.15
            });
            
            polygon.bindPopup(`
                <div>
                    <b>🏘️ ${s.name || 'Suburb'}</b><br>
                    Area: ${s.area || 'N/A'} km²<br>
                    Blockages: ${s.blockages || 0}
                </div>
            `);
            
            polygon.addTo(map);
            currentPolygons.push(polygon);
        } catch (error) {
            console.error('Error adding polygon:', error, s);
        }
    }
}

// Update all layers at once
function updateLayers(manholes, pipelines) {
    console.log('updateLayers called with:', { 
        manholesCount: manholes ? manholes.length : 0, 
        pipelinesCount: pipelines ? pipelines.length : 0 
    });
    
    loadManholes(manholes || []);
    loadPipelines(pipelines || []);
}

// Add heatmap
function addHeatmap(heatPoints) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    
    if (!heatPoints || heatPoints.length === 0) {
        console.log('No heatmap points to display');
        return;
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
    if (!manholes || manholes.length === 0) {
        console.log('No manholes for heatmap');
        return;
    }
    const heatPoints = manholes.map(m => [m.lat, m.lng, m.blockages || 1]);
    addHeatmap(heatPoints);
}

// Clear heatmap
function clearHeatmap() {
    if (heatLayer && map && map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
}

// Fit map to show all assets
function fitToBounds() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    const allPoints = [];
    for (let i = 0; i < currentMarkers.length; i++) {
        if (currentMarkers[i] && currentMarkers[i].getLatLng) {
            const latlng = currentMarkers[i].getLatLng();
            allPoints.push([latlng.lat, latlng.lng]);
        }
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
