// ============================================
// MAPVIEW.JS - Advanced Map Component
// Converted from React to Vanilla JS
// Features: Multiple tile layers, custom markers, popups
// ============================================

let map = null;
let currentManholes = [];
let currentPipelines = [];
let activeTileLayers = {};
let heatLayer = null;
let currentCoords = '';

// Tile definitions
const TILES = {
    osm: {
        id: 'osm',
        label: 'Street',
        icon: '🗺️',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attr: '&copy; OpenStreetMap contributors',
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
        label: 'Topo',
        icon: '⛰️',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attr: 'Map data &copy; OSM | Style &copy; OpenTopoMap',
        maxZoom: 17
    }
};

// Color functions
function getManholeColor(status) {
    if (!status) return '#28a745';
    const v = status.toLowerCase();
    if (v.includes('block') || v.includes('critical')) return '#dc3545';
    if (v.includes('warning') || v.includes('maintenance')) return '#ffc107';
    return '#28a745';
}

function getPipeColor(status) {
    if (!status) return '#2b7bff';
    const v = status.toLowerCase();
    if (v.includes('block') || v.includes('critical')) return '#dc3545';
    if (v.includes('warning')) return '#ffc107';
    return '#2b7bff';
}

// Custom manhole icon
function createManholeIcon(color, size = 22) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: ${size / 2}px;
        ">🕳️</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)]
    });
}

// Parse geometry functions
function parsePoint(geom) {
    try {
        const g = typeof geom === 'string' ? JSON.parse(geom) : geom;
        if (!g) return null;
        if (g.type === 'Point') return { lat: g.coordinates[1], lng: g.coordinates[0] };
        if (g.type === 'MultiPoint') return { lat: g.coordinates[0][1], lng: g.coordinates[0][0] };
    } catch (e) {}
    return null;
}

function parseLine(geom) {
    try {
        const g = typeof geom === 'string' ? JSON.parse(geom) : geom;
        if (!g) return null;
        if (g.type === 'LineString') return g.coordinates.map(([x, y]) => [y, x]);
        if (g.type === 'MultiLineString') {
            return g.coordinates.flatMap(seg => seg.map(([x, y]) => [y, x]));
        }
    } catch (e) {}
    return null;
}

// ============================================
// MAP INITIALIZATION
// ============================================

function initMap(centerLat = -18.97, centerLng = 32.67, zoom = 13) {
    console.log('initMap called with:', centerLat, centerLng, zoom);
    
    if (typeof L === 'undefined') {
        console.error('Leaflet (L) is not defined!');
        return null;
    }
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found!');
        return null;
    }
    
    if (map) {
        map.remove();
        map = null;
    }
    
    try {
        map = L.map('map').setView([centerLat, centerLng], zoom);
        
        // Add default OSM layer
        activeTileLayers.osm = L.tileLayer(TILES.osm.url, {
            attribution: TILES.osm.attr,
            maxZoom: TILES.osm.maxZoom
        }).addTo(map);
        
        // Scale control
        L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
        
        // Zoom control reposition
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        // Track mouse position
        map.on('mousemove', function(e) {
            currentCoords = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
            const coordStatus = document.getElementById('coordStatus');
            if (coordStatus) {
                coordStatus.innerHTML = `📍 ${currentCoords} | ZOOM: ${map.getZoom()}`;
            }
        });
        
        console.log('Map initialized successfully');
        return map;
        
    } catch (error) {
        console.error('Error initializing map:', error);
        return null;
    }
}

// ============================================
// TILE MANAGEMENT
// ============================================

function setActiveTiles(tileIds) {
    // Remove all existing tile layers
    Object.values(activeTileLayers).forEach(layer => {
        if (layer && map && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    activeTileLayers = {};
    
    // Add selected tile layers
    tileIds.forEach(tileId => {
        const tile = TILES[tileId];
        if (tile && map) {
            const baseLayer = L.tileLayer(tile.url, {
                attribution: tile.attr,
                maxZoom: tile.maxZoom
            }).addTo(map);
            activeTileLayers[tileId] = baseLayer;
            
            // For hybrid, add overlay
            if (tileId === 'hybrid' && tile.overlayUrl) {
                const overlayLayer = L.tileLayer(tile.overlayUrl, {
                    opacity: 0.42
                }).addTo(map);
                activeTileLayers.hybridOverlay = overlayLayer;
            }
        }
    });
}

function getTileSelectorHTML() {
    return `
        <div class="tile-selector" style="position: absolute; top: 12px; right: 12px; z-index: 1000;">
            <div class="tile-selector-content" style="background: rgba(7,20,7,0.88); border-radius: 8px; padding: 6px;">
                <button id="tileSelectorBtn" style="cursor: pointer; font-weight: 700; font-size: 12px; color: #8fdc00; background: transparent; border: 1px solid rgba(74,173,74,0.3); border-radius: 6px; padding: 4px 6px;">
                    🌐 Maps ▼
                </button>
                <div id="tileDropdown" style="display: none; margin-top: 4px;">
                    ${Object.values(TILES).map(t => `
                        <button class="tile-option" data-tile="${t.id}" style="cursor: pointer; font-size: 11px; text-align: left; padding: 4px 6px; border-radius: 6px; background: transparent; color: #7ab87a; border: none; display: block; width: 100%;">
                            ${t.icon} ${t.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function initTileSelector() {
    const btn = document.getElementById('tileSelectorBtn');
    const dropdown = document.getElementById('tileDropdown');
    let activeTiles = ['osm'];
    
    if (btn) {
        btn.addEventListener('click', () => {
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    document.querySelectorAll('.tile-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const tileId = opt.dataset.tile;
            if (activeTiles.includes(tileId)) {
                activeTiles = activeTiles.filter(t => t !== tileId);
                opt.style.background = 'transparent';
                opt.style.color = '#7ab87a';
            } else {
                activeTiles.push(tileId);
                opt.style.background = '#4aad4a';
                opt.style.color = '#011001';
            }
            setActiveTiles(activeTiles);
        });
    });
}

// ============================================
// LOAD DATA LAYERS
// ============================================

function loadManholes(manholes) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    // Clear existing manhole markers
    if (window.manholeMarkers) {
        window.manholeMarkers.forEach(m => map.removeLayer(m));
    }
    window.manholeMarkers = [];
    
    if (!manholes || manholes.length === 0) return;
    
    manholes.forEach(m => {
        // Handle both direct lat/lng and geometry objects
        let lat, lng;
        if (m.geom) {
            const pt = parsePoint(m.geom);
            if (pt) { lat = pt.lat; lng = pt.lng; }
        } else if (m.lat && m.lng) {
            lat = m.lat; lng = m.lng;
        }
        
        if (!lat || !lng) return;
        
        const color = getManholeColor(m.bloc_stat || m.status);
        const marker = L.marker([lat, lng], {
            icon: createManholeIcon(color, 22)
        });
        
        const popupContent = `
            <div style="min-width: 220px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color};"></div>
                    <span style="font-weight: 800; font-size: 14px;">${m.manhole_id || m.name || 'Manhole'}</span>
                </div>
                <table style="width:100%; font-size: 12px; border-collapse: collapse;">
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Pipe ID</td><td>${m.pipe_id || '—'}</td></tr>
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Depth</td><td>${m.mh_depth ? m.mh_depth + ' m' : '—'}</td></tr>
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Status</td><td style="color:${color}">${m.bloc_stat || m.status || 'Normal'}</td></tr>
                </table>
                <button onclick="window.editFeature && window.editFeature({...${JSON.stringify(m)}, type: 'manhole'})" style="margin-top: 10px; width: 100%; background: #1a4d1a; color: white; border: 1px solid #2d8a2d; border-radius: 6px; padding: 7px 0; cursor: pointer; font-weight: 700; font-size: 12px;">
                    ✏️ Edit Record
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.addTo(map);
        window.manholeMarkers.push(marker);
    });
}

function loadPipelines(pipelines) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    // Clear existing pipeline lines
    if (window.pipelineLines) {
        window.pipelineLines.forEach(l => map.removeLayer(l));
    }
    window.pipelineLines = [];
    
    if (!pipelines || pipelines.length === 0) return;
    
    pipelines.forEach(p => {
        let positions;
        if (p.geom) {
            positions = parseLine(p.geom);
        } else if (p.coordinates) {
            positions = p.coordinates;
        }
        
        if (!positions || positions.length < 2) return;
        
        const color = getPipeColor(p.block_stat || p.status);
        const line = L.polyline(positions, {
            color: color,
            weight: 5,
            opacity: 0.9
        });
        
        const popupContent = `
            <div style="min-width: 220px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <div style="width: 22px; height: 4px; background: ${color};"></div>
                    <span style="font-weight: 800; font-size: 14px;">${p.pipe_id || p.name || 'Pipeline'}</span>
                </div>
                <table style="width:100%; font-size: 12px; border-collapse: collapse;">
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Start MH</td><td>${p.start_mh || '—'}</td></tr>
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">End MH</td><td>${p.end_mh || '—'}</td></tr>
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Material</td><td>${p.pipe_mat || p.material || '—'}</td></tr>
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Size</td><td>${p.pipe_size || p.diameter || '—'}</td></tr>
                    <tr><td style="padding: 3px 8px 3px 0; font-weight: 600;">Status</td><td style="color:${color}">${p.block_stat || p.status || 'Normal'}</td></tr>
                </table>
                <button onclick="window.editFeature && window.editFeature({...${JSON.stringify(p)}, type: 'pipeline'})" style="margin-top: 10px; width: 100%; background: #1a4d1a; color: white; border: 1px solid #2d8a2d; border-radius: 6px; padding: 7px 0; cursor: pointer; font-weight: 700; font-size: 12px;">
                    ✏️ Edit Record
                </button>
            </div>
        `;
        
        line.bindPopup(popupContent);
        line.addTo(map);
        window.pipelineLines.push(line);
    });
}

function updateLayers(manholes, pipelines) {
    loadManholes(manholes || []);
    loadPipelines(pipelines || []);
}

// ============================================
// HEATMAP FUNCTIONS
// ============================================

function addHeatmap(heatPoints) {
    if (!map) return;
    if (heatLayer) map.removeLayer(heatLayer);
    
    heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.3
    });
    heatLayer.addTo(map);
}

function showHeatmapFromManholes(manholes) {
    if (!manholes || manholes.length === 0) return;
    const heatPoints = manholes.map(m => {
        let lat, lng;
        if (m.geom) {
            const pt = parsePoint(m.geom);
            if (pt) { lat = pt.lat; lng = pt.lng; }
        } else if (m.lat && m.lng) {
            lat = m.lat; lng = m.lng;
        }
        return [lat, lng, m.blockages || m.bloc_count || 1];
    }).filter(p => p[0] && p[1]);
    addHeatmap(heatPoints);
}

function clearHeatmap() {
    if (heatLayer && map) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function fitToBounds() {
    if (!map) return;
    const allMarkers = window.manholeMarkers || [];
    if (allMarkers.length > 0) {
        const bounds = L.latLngBounds(allMarkers.map(m => m.getLatLng()));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function getMap() {
    return map;
}

function injectTileSelector() {
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer && !document.querySelector('.tile-selector')) {
        mapContainer.insertAdjacentHTML('beforeend', getTileSelectorHTML());
        initTileSelector();
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    init: initMap,
    setActiveTiles: setActiveTiles,
    loadManholes: loadManholes,
    loadPipelines: loadPipelines,
    updateLayers: updateLayers,
    addHeatmap: addHeatmap,
    showHeatmapFromManholes: showHeatmapFromManholes,
    clearHeatmap: clearHeatmap,
    fitToBounds: fitToBounds,
    getMap: getMap,
    injectTileSelector: injectTileSelector,
    parsePoint: parsePoint,
    parseLine: parseLine
};
