// ============================================
// MAPVIEW.JS - Advanced Map Component
// Tile types: OSM, Satellite, Hybrid, Topographic
// Custom markers with popups, no legend
// ============================================

let map = null;
let currentManholeMarkers = [];
let currentPipelineLines = [];
let heatLayer = null;
let activeTileLayers = {};
let currentCoords = '';

// ============================================
// TILE DEFINITIONS
// ============================================

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

// ============================================
// COLOR FUNCTIONS
// ============================================

function getManholeColor(status) {
    if (!status) return '#28a745';
    const v = status.toLowerCase();
    if (v.includes('block') || v.includes('critical') || v.includes('service')) return '#dc3545';
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

// ============================================
// CUSTOM MANHOLE ICON
// ============================================

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

// ============================================
// GEOMETRY PARSING
// ============================================

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
        
        // Zoom control reposition to bottom right
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
// TILE MANAGEMENT (Multiple layers support)
// ============================================

function setActiveTiles(tileIds) {
    if (!map) return;
    
    // Remove all existing tile layers
    Object.values(activeTileLayers).forEach(layer => {
        if (layer && map.hasLayer(layer)) {
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

function switchBaseMap(tileType) {
    // For single tile switching (backward compatibility)
    setActiveTiles([tileType]);
}

// ============================================
// LOAD MANHOLES (Point Layer)
// ============================================

function loadManholes(manholes) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    // Clear existing markers
    currentManholeMarkers.forEach(marker => {
        if (marker && map.hasLayer(marker)) map.removeLayer(marker);
    });
    currentManholeMarkers = [];
    
    if (!manholes || manholes.length === 0) return;
    
    manholes.forEach(manhole => {
        // Handle both direct lat/lng and geometry objects
        let lat, lng;
        if (manhole.geom) {
            const pt = parsePoint(manhole.geom);
            if (pt) { lat = pt.lat; lng = pt.lng; }
        } else if (manhole.lat && manhole.lng) {
            lat = manhole.lat;
            lng = manhole.lng;
        }
        
        if (!lat || !lng) return;
        
        const status = manhole.bloc_stat || manhole.status;
        const color = getManholeColor(status);
        const marker = L.marker([lat, lng], {
            icon: createManholeIcon(color, 22)
        });
        
        // Build popup content
        const popupContent = `
            <div style="min-width: 240px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color};"></div>
                    <span style="font-weight: 800; font-size: 15px; text-transform: uppercase;">${manhole.manhole_id || manhole.name || 'Manhole'}</span>
                </div>
                <table style="width:100%; font-size: 12px; border-collapse: collapse;">
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Pipe ID</td><td>${manhole.pipe_id || '—'}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Depth</td><td>${manhole.mh_depth ? manhole.mh_depth + ' m' : '—'}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Status</td><td style="color: ${color}; font-weight: bold;">${status || 'Normal'}</td></tr>
                </table>
                <button onclick="window.editFeature && window.editFeature({...${JSON.stringify(manhole)}, type: 'manhole'})" style="margin-top: 12px; width: 100%; background: #1a4d1a; color: white; border: 1px solid #2d8a2d; border-radius: 6px; padding: 7px 0; cursor: pointer; font-weight: 700; font-size: 12px;">
                    ✏️ Edit Record
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.addTo(map);
        currentManholeMarkers.push(marker);
    });
    
    console.log(`Loaded ${currentManholeMarkers.length} manholes`);
}

// ============================================
// LOAD PIPELINES (Line Layer)
// ============================================

function loadPipelines(pipelines) {
    if (!map) return;
    
    // Clear existing lines
    currentPipelineLines.forEach(line => {
        if (line && map.hasLayer(line)) map.removeLayer(line);
    });
    currentPipelineLines = [];
    
    if (!pipelines || pipelines.length === 0) return;
    
    pipelines.forEach(pipe => {
        let positions;
        if (pipe.geom) {
            positions = parseLine(pipe.geom);
        } else if (pipe.coordinates) {
            positions = pipe.coordinates;
        }
        
        if (!positions || positions.length < 2) return;
        
        const status = pipe.block_stat || pipe.status;
        const color = getPipeColor(status);
        
        const line = L.polyline(positions, {
            color: color,
            weight: 5,
            opacity: 0.9
        });
        
        // Build popup content
        const popupContent = `
            <div style="min-width: 240px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <div style="width: 22px; height: 4px; background: ${color};"></div>
                    <span style="font-weight: 800; font-size: 15px; text-transform: uppercase;">${pipe.pipe_id || pipe.name || 'Pipeline'}</span>
                </div>
                <table style="width:100%; font-size: 12px; border-collapse: collapse;">
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Start MH</td><td>${pipe.start_mh || '—'}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">End MH</td><td>${pipe.end_mh || '—'}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Material</td><td>${pipe.pipe_mat || pipe.material || '—'}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Size</td><td>${pipe.pipe_size || pipe.diameter || '—'}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; font-weight: 600;">Status</td><td style="color: ${color}; font-weight: bold;">${status || 'Normal'}</td></tr>
                </table>
                <button onclick="window.editFeature && window.editFeature({...${JSON.stringify(pipe)}, type: 'pipeline'})" style="margin-top: 12px; width: 100%; background: #1a4d1a; color: white; border: 1px solid #2d8a2d; border-radius: 6px; padding: 7px 0; cursor: pointer; font-weight: 700; font-size: 12px;">
                    ✏️ Edit Record
                </button>
            </div>
        `;
        
        line.bindPopup(popupContent);
        line.addTo(map);
        currentPipelineLines.push(line);
    });
    
    console.log(`Loaded ${currentPipelineLines.length} pipelines`);
}

// ============================================
// UPDATE LAYERS
// ============================================

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
    
    if (!heatPoints || heatPoints.length === 0) return;
    
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
            lat = m.lat;
            lng = m.lng;
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
    
    const allMarkers = currentManholeMarkers || [];
    if (allMarkers.length > 0) {
        const bounds = L.latLngBounds(allMarkers.map(m => m.getLatLng()));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function getMap() {
    return map;
}

// ============================================
// TILE SELECTOR UI (Dropdown Button)
// ============================================

function createTileSelector() {
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'tile-selector';
    selectorDiv.style.cssText = 'position: absolute; top: 12px; right: 12px; z-index: 1000;';
    selectorDiv.innerHTML = `
        <div style="background: rgba(7,20,7,0.88); backdrop-filter: blur(8px); border-radius: 8px; padding: 6px;">
            <button id="tileSelectorBtn" style="cursor: pointer; font-weight: 700; font-size: 12px; color: #8fdc00; background: transparent; border: 1px solid rgba(74,173,74,0.3); border-radius: 6px; padding: 4px 8px;">
                🌐 Maps ▼
            </button>
            <div id="tileDropdown" style="display: none; margin-top: 5px;">
                ${Object.values(TILES).map(t => `
                    <button class="tile-option" data-tile="${t.id}" style="cursor: pointer; font-size: 11px; text-align: left; padding: 5px 10px; border-radius: 6px; background: transparent; color: #7ab87a; border: none; display: block; width: 100%;">
                        ${t.icon} ${t.label}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    return selectorDiv;
}

function initTileSelector() {
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;
    
    // Remove existing selector if any
    const existingSelector = document.querySelector('.tile-selector');
    if (existingSelector) existingSelector.remove();
    
    const selector = createTileSelector();
    mapContainer.appendChild(selector);
    
    // Setup event listeners
    const btn = document.getElementById('tileSelectorBtn');
    const dropdown = document.getElementById('tileDropdown');
    let activeTiles = ['osm'];
    
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown) {
                const isVisible = dropdown.style.display === 'block';
                dropdown.style.display = isVisible ? 'none' : 'block';
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (dropdown && !selector.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Tile option clicks
    document.querySelectorAll('.tile-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
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
            
            // Update button text
            if (btn) {
                const activeCount = activeTiles.length;
                btn.innerHTML = `🌐 Maps (${activeCount}) ▼`;
            }
        });
    });
}

function injectTileSelector() {
    initTileSelector();
}

// ============================================
// EXPORTS
// ============================================

export default {
    init: initMap,
    switchBaseMap: switchBaseMap,
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
