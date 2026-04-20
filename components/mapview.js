// ============================================
// MAPVIEW.JS - Working Map Component
// Tile types: OSM, Satellite, Hybrid, Topographic
// ============================================

let map = null;
let currentManholeMarkers = [];
let currentPipelineLines = [];
let heatLayer = null;

// Tile definitions
const TILES = {
    osm: {
        id: 'osm',
        label: 'Street',
        icon: '🗺️',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attr: '&copy; OpenStreetMap',
        maxZoom: 19
    },
    satellite: {
        id: 'satellite',
        label: 'Satellite',
        icon: '🛰️',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: 'Tiles &copy; Esri',
        maxZoom: 19
    },
    hybrid: {
        id: 'hybrid',
        label: 'Hybrid',
        icon: '🌍',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        overlayUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attr: 'Imagery &copy; Esri | Roads &copy; OSM',
        maxZoom: 19
    },
    topo: {
        id: 'topo',
        label: 'Topographic',
        icon: '⛰️',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attr: 'Map data &copy; OSM | Style &copy; OpenTopoMap',
        maxZoom: 17
    }
};

let currentTileLayer = null;
let currentOverlayLayer = null;

// Initialize map
function initMap(centerLat = -18.9735, centerLng = 32.6705, zoom = 13) {
    console.log('initMap called');
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found!');
        return null;
    }
    
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded!');
        return null;
    }
    
    try {
        // Create map
        map = L.map('map').setView([centerLat, centerLng], zoom);
        
        // Add default tile layer (OSM)
        currentTileLayer = L.tileLayer(TILES.osm.url, {
            attribution: TILES.osm.attr,
            maxZoom: TILES.osm.maxZoom
        }).addTo(map);
        
        // Add scale control
        L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
        
        // Mouse position tracking
        map.on('mousemove', function(e) {
            const coordStatus = document.getElementById('coordStatus');
            if (coordStatus) {
                coordStatus.innerHTML = `📍 ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)} | Zoom: ${map.getZoom()}`;
            }
        });
        
        console.log('Map created successfully');
        
        // Add tile selector after map is ready
        setTimeout(() => {
            addTileSelector();
        }, 100);
        
        return map;
        
    } catch (error) {
        console.error('Error creating map:', error);
        return null;
    }
}

// Switch base map
function switchBaseMap(tileType) {
    if (!map) return;
    
    const tile = TILES[tileType];
    if (!tile) return;
    
    // Remove current tile layer
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }
    if (currentOverlayLayer) {
        map.removeLayer(currentOverlayLayer);
        currentOverlayLayer = null;
    }
    
    // Add new tile layer
    currentTileLayer = L.tileLayer(tile.url, {
        attribution: tile.attr,
        maxZoom: tile.maxZoom
    }).addTo(map);
    
    // Add overlay for hybrid
    if (tileType === 'hybrid' && tile.overlayUrl) {
        currentOverlayLayer = L.tileLayer(tile.overlayUrl, {
            opacity: 0.5
        }).addTo(map);
    }
}

// Load manholes
function loadManholes(manholes) {
    if (!map) return;
    
    // Clear existing
    currentManholeMarkers.forEach(m => map.removeLayer(m));
    currentManholeMarkers = [];
    
    if (!manholes || manholes.length === 0) return;
    
    manholes.forEach(m => {
        if (!m.lat || !m.lng) return;
        
        let color = '#28a745';
        if (m.status === 'critical') color = '#dc3545';
        else if (m.status === 'warning') color = '#ffc107';
        
        const marker = L.circleMarker([m.lat, m.lng], {
            radius: 8,
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            weight: 2
        });
        
        marker.bindPopup(`
            <b>${m.name}</b><br>
            Suburb: ${m.suburb}<br>
            Status: ${m.status}<br>
            Blockages: ${m.blockages}
        `);
        
        marker.addTo(map);
        currentManholeMarkers.push(marker);
    });
    
    console.log(`Loaded ${currentManholeMarkers.length} manholes`);
}

// Load pipelines
function loadPipelines(pipelines) {
    if (!map) return;
    
    currentPipelineLines.forEach(l => map.removeLayer(l));
    currentPipelineLines = [];
    
    if (!pipelines || pipelines.length === 0) return;
    
    pipelines.forEach(p => {
        if (!p.coordinates || p.coordinates.length < 2) return;
        
        let color = '#2b7bff';
        if (p.status === 'critical') color = '#dc3545';
        else if (p.status === 'warning') color = '#ffc107';
        
        const line = L.polyline(p.coordinates, {
            color: color,
            weight: 4,
            opacity: 0.8
        });
        
        line.bindPopup(`<b>${p.name}</b><br>Status: ${p.status}`);
        line.addTo(map);
        currentPipelineLines.push(line);
    });
}

// Update layers
function updateLayers(manholes, pipelines) {
    loadManholes(manholes);
    loadPipelines(pipelines);
}

// Heatmap functions
function showHeatmapFromManholes(manholes) {
    if (!map || !manholes || manholes.length === 0) return;
    
    if (heatLayer) map.removeLayer(heatLayer);
    
    const points = manholes.map(m => [m.lat, m.lng, m.blockages || 1]);
    heatLayer = L.heatLayer(points, { radius: 25, blur: 15 });
    heatLayer.addTo(map);
}

function clearHeatmap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
}

function fitToBounds() {
    if (!map || currentManholeMarkers.length === 0) return;
    const bounds = L.latLngBounds(currentManholeMarkers.map(m => m.getLatLng()));
    map.fitBounds(bounds);
}

function getMap() {
    return map;
}

// ============================================
// TILE SELECTOR UI - Fixed Version
// ============================================

function addTileSelector() {
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    // Remove existing selector if any
    const existing = document.querySelector('.custom-tile-selector');
    if (existing) existing.remove();
    
    // Create selector div
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'custom-tile-selector';
    selectorDiv.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: rgba(10, 26, 10, 0.9);
        border-radius: 8px;
        padding: 5px;
        backdrop-filter: blur(5px);
        border: 1px solid forestgreen;
    `;
    
    // Create buttons for each tile type
    const buttonsHtml = Object.values(TILES).map(tile => `
        <button class="tile-btn" data-tile="${tile.id}" style="
            display: block;
            width: 100%;
            margin: 3px 0;
            padding: 6px 12px;
            background: #1a3a1a;
            border: 1px solid forestgreen;
            color: forestgreen;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            text-align: left;
        ">
            ${tile.icon} ${tile.label}
        </button>
    `).join('');
    
    selectorDiv.innerHTML = `
        <div style="padding: 3px;">
            <div style="font-size: 10px; color: #7cb342; text-align: center; margin-bottom: 5px;">MAP STYLES</div>
            ${buttonsHtml}
        </div>
    `;
    
    mapContainer.appendChild(selectorDiv);
    
    // Add event listeners to buttons
    document.querySelectorAll('.tile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tileId = btn.dataset.tile;
            switchBaseMap(tileId);
            
            // Highlight active button
            document.querySelectorAll('.tile-btn').forEach(b => {
                b.style.background = '#1a3a1a';
                b.style.color = 'forestgreen';
            });
            btn.style.background = 'forestgreen';
            btn.style.color = '#0a1f0a';
        });
    });
    
    // Highlight OSM as default
    const osmBtn = document.querySelector('.tile-btn[data-tile="osm"]');
    if (osmBtn) {
        osmBtn.style.background = 'forestgreen';
        osmBtn.style.color = '#0a1f0a';
    }
    
    console.log('Tile selector added');
}

// ============================================
// EXPORTS
// ============================================

export default {
    init: initMap,
    switchBaseMap: switchBaseMap,
    loadManholes: loadManholes,
    loadPipelines: loadPipelines,
    updateLayers: updateLayers,
    showHeatmapFromManholes: showHeatmapFromManholes,
    clearHeatmap: clearHeatmap,
    fitToBounds: fitToBounds,
    getMap: getMap
};
