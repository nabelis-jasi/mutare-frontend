// ============================================
// MAPVIEW.JS - Working Map Component
// Tile types: OSM, Satellite, Hybrid, Topographic
// Dropdown style tile selector
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
let currentTileId = 'osm';

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
        
        // Add dropdown tile selector after map is ready
        setTimeout(() => {
            addDropdownTileSelector();
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
    
    currentTileId = tileType;
    
    // Update dropdown button text
    updateDropdownButtonText(tileType);
}

// Update dropdown button text
function updateDropdownButtonText(tileType) {
    const btnText = document.getElementById('selectedTileText');
    if (btnText) {
        const tile = TILES[tileType];
        if (tile) {
            btnText.innerHTML = `${tile.icon} ${tile.label}`;
        }
    }
}

// ============================================
// DROPDOWN TILE SELECTOR
// ============================================

function addDropdownTileSelector() {
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    // Remove existing selector if any
    const existing = document.querySelector('.dropdown-tile-selector');
    if (existing) existing.remove();
    
    // Create dropdown container
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown-tile-selector';
    dropdownDiv.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        font-family: 'Segoe UI', monospace;
    `;
    
    // Dropdown HTML
    dropdownDiv.innerHTML = `
        <div style="position: relative;">
            <button id="tileDropdownBtn" style="
                background: rgba(10, 26, 10, 0.95);
                backdrop-filter: blur(8px);
                border: 1px solid forestgreen;
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                color: #8fdc00;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 130px;
            ">
                <span id="selectedTileText">🗺️ Street</span>
                <span style="font-size: 10px;">▼</span>
            </button>
            <div id="tileDropdownMenu" style="
                display: none;
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 4px;
                background: rgba(10, 26, 10, 0.95);
                backdrop-filter: blur(8px);
                border: 1px solid forestgreen;
                border-radius: 6px;
                min-width: 150px;
                overflow: hidden;
                z-index: 1001;
            ">
                ${Object.values(TILES).map(tile => `
                    <div class="tile-dropdown-item" data-tile="${tile.id}" style="
                        padding: 8px 12px;
                        cursor: pointer;
                        font-size: 12px;
                        color: #7ab87a;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                        border-bottom: 1px solid #1a3a1a;
                    ">
                        <span>${tile.icon}</span>
                        <span>${tile.label}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    mapContainer.appendChild(dropdownDiv);
    
    // Get elements
    const dropdownBtn = document.getElementById('tileDropdownBtn');
    const dropdownMenu = document.getElementById('tileDropdownMenu');
    
    // Toggle dropdown on button click
    if (dropdownBtn) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (dropdownDiv && !dropdownDiv.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
    
    // Add click handlers to dropdown items
    document.querySelectorAll('.tile-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const tileId = item.dataset.tile;
            switchBaseMap(tileId);
            dropdownMenu.style.display = 'none';
            
            // Update active style
            document.querySelectorAll('.tile-dropdown-item').forEach(i => {
                i.style.background = 'transparent';
                i.style.color = '#7ab87a';
            });
            item.style.background = '#2a4a2a';
            item.style.color = '#8fdc00';
        });
    });
    
    console.log('Dropdown tile selector added');
}

// ============================================
// LOAD MANHOLES
// ============================================

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
            <div style="min-width: 180px;">
                <b>🕳️ ${m.name}</b><br>
                Suburb: ${m.suburb}<br>
                Status: <span style="color:${color}">${m.status}</span><br>
                Blockages: ${m.blockages}
            </div>
        `);
        
        marker.addTo(map);
        currentManholeMarkers.push(marker);
    });
    
    console.log(`Loaded ${currentManholeMarkers.length} manholes`);
}

// ============================================
// LOAD PIPELINES
// ============================================

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
        
        line.bindPopup(`<b>📏 ${p.name}</b><br>Status: ${p.status}`);
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
