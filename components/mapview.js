// ============================================
// MAPVIEW.JS - Complete Working Map Component
// Supports: Points (manholes), Lines (pipelines), Polygons (suburbs & cadastre)
// Data fetched from Python Flask backend API
// Integrated with Report Processor and Statistics
// FEATURE: Suburb hover highlighting with statistics (REAL DATA)
// FEATURE: Manhole & Pipeline popups show correct suburb name in cyan blue
// FEATURE: Suburb popup shows table format with manhole AND pipeline statistics
// COLORS: Manholes Normal = Purple (#9b59b6) | Pipelines Normal = Lime Green (#32cd32)
// ============================================

let map = null;
let currentManholeMarkers = [];
let currentPipelineLayer = null;
let currentSuburbLayer = null;
let currentComplaintMarkers = [];
let currentComplaintLayer = null;
let heatLayer = null;
let currentBounds = null;
let suburbLabels = [];
let cadastreLabels = [];
let suburbStats = {}; // Store manhole statistics per suburb
let suburbPipelineStats = {}; // Store pipeline statistics per suburb
let suburbGeometries = []; // Store suburb geometries for point-in-polygon lookup
let suburbBounds = {}; // Store bounding boxes for quick lookup

// Store complaint buffers
let currentComplaintBuffers = [];
let originalPipelineColor = '#32cd32';

// Cadastre layer
let currentCadastreLayer = null;

// Suburb hover styling
let defaultSuburbStyle = {
    color: '#000000',      // Black border
    weight: 3,
    opacity: 1,
    fill: false,
    fillOpacity: 0
};

let hoverSuburbStyle = {
    color: '#ff7800',      // Dark orange border
    weight: 4,
    opacity: 1,
    fill: true,
    fillColor: '#00d4ff',  // Cyan blue fill
    fillOpacity: 0.3
};

// ---------- API CONFIGURATION ----------
const API_BASE_URL = 'http://localhost:5000/api';
const API_ENDPOINTS = {
    manholes: '/manholes/geojson',
    pipelines: '/pipelines/geojson',
    suburbs: '/suburbs/geojson',
    complaints: '/complaints/geojson',
    cadastre: '/cadastre/all'
};

// ---------- HELPER: Fetch GeoJSON from API ----------
async function fetchLayerFromAPI(endpoint, bounds = null, simplify = 0.001, limit = 5000) {
    let url;
    
    if (endpoint === '/suburbs/geojson' || endpoint === '/cadastre/all') {
        url = `${API_BASE_URL}${endpoint}`;
        try {
            console.log(`Fetching all data from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log(`Fetched ${data.features?.length || 0} features from ${endpoint}`);
            return data;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return { type: 'FeatureCollection', features: [] };
        }
    }
    
    if (bounds) {
        const params = new URLSearchParams({
            min_lon: bounds.getWest(),
            min_lat: bounds.getSouth(),
            max_lon: bounds.getEast(),
            max_lat: bounds.getNorth(),
            simplify: simplify,
            limit: limit
        });
        url = `${API_BASE_URL}${endpoint}?${params}`;
    } else {
        url = `${API_BASE_URL}${endpoint}?simplify=${simplify}&limit=${limit}`;
    }
    
    try {
        console.log(`Fetching from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const geojson = await response.json();
        console.log(`Fetched ${geojson.features?.length || 0} features from ${endpoint}`);
        return geojson;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return { type: 'FeatureCollection', features: [] };
    }
}

// ============================================
// HELPER: Check if point is inside polygon (Ray Casting Algorithm)
// ============================================

function isPointInPolygon(lng, lat, polygonCoords) {
    let inside = false;
    
    // Handle both Polygon and MultiPolygon
    let rings = [];
    if (polygonCoords.type === 'Polygon') {
        rings = [polygonCoords.coordinates[0]];
    } else if (polygonCoords.type === 'MultiPolygon') {
        for (const poly of polygonCoords.coordinates) {
            rings.push(poly[0]);
        }
    } else if (Array.isArray(polygonCoords)) {
        // Direct array of coordinates
        rings = [polygonCoords];
    }
    
    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0];
            const yi = ring[i][1];
            const xj = ring[j][0];
            const yj = ring[j][1];
            
            const intersect = ((yi > lat) != (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    }
    
    return inside;
}

// ============================================
// FIND SUBURB FOR A POINT - IMPROVED VERSION
// ============================================

function findSuburbForPoint(lng, lat) {
    if (!suburbGeometries.length) {
        console.warn('No suburb geometries loaded yet');
        return null;
    }
    
    // First check using bounding box for speed
    let candidates = [];
    for (const suburb of suburbGeometries) {
        const bounds = suburb.bounds;
        if (lng >= bounds.minX && lng <= bounds.maxX && 
            lat >= bounds.minY && lat <= bounds.maxY) {
            candidates.push(suburb);
        }
    }
    
    // Then do precise point-in-polygon check on candidates
    for (const suburb of candidates) {
        if (isPointInPolygon(lng, lat, suburb.geometry)) {
            return suburb.name;
        }
    }
    
    // If still not found, try all suburbs (slower but thorough)
    for (const suburb of suburbGeometries) {
        if (isPointInPolygon(lng, lat, suburb.geometry)) {
            return suburb.name;
        }
    }
    
    return null;
}

// ============================================
// LOAD SUBURB GEOMETRIES FIRST
// ============================================

async function loadSuburbGeometries() {
    try {
        const response = await fetch(`${API_BASE_URL}/suburbs/geojson`);
        if (response.ok) {
            const data = await response.json();
            suburbGeometries = [];
            suburbBounds = {};
            
            data.features.forEach(feature => {
                const props = feature.properties;
                const name = (props.name || props.suburb_nam || 'Unnamed').toUpperCase();
                const geometry = feature.geometry;
                
                // Calculate bounds
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                
                const updateBounds = (coords) => {
                    if (Array.isArray(coords[0])) {
                        coords.forEach(c => updateBounds(c));
                    } else if (typeof coords[0] === 'number') {
                        minX = Math.min(minX, coords[0]);
                        maxX = Math.max(maxX, coords[0]);
                        minY = Math.min(minY, coords[1]);
                        maxY = Math.max(maxY, coords[1]);
                    }
                };
                
                if (geometry.type === 'Polygon') {
                    updateBounds(geometry.coordinates);
                } else if (geometry.type === 'MultiPolygon') {
                    geometry.coordinates.forEach(poly => updateBounds(poly));
                }
                
                suburbGeometries.push({
                    name: name,
                    geometry: geometry,
                    bounds: { minX, maxX, minY, maxY }
                });
                
                suburbBounds[name] = { minX, maxX, minY, maxY };
            });
            
            console.log(`Loaded ${suburbGeometries.length} suburb geometries for point matching`);
            return true;
        }
    } catch (error) {
        console.error('Error loading suburb geometries:', error);
    }
    return false;
}

// ============================================
// CALCULATE SUBURB STATISTICS - REAL DATA
// ============================================

async function calculateSuburbStatistics() {
    try {
        // Ensure suburb geometries are loaded first
        if (suburbGeometries.length === 0) {
            await loadSuburbGeometries();
        }
        
        // Fetch all manholes
        const manholesResponse = await fetch(`${API_BASE_URL}/manholes/geojson?limit=20000`);
        // Fetch all pipelines
        const pipelinesResponse = await fetch(`${API_BASE_URL}/pipelines/geojson?limit=20000`);
        
        // Reset stats
        for (const suburb of suburbGeometries) {
            const name = suburb.name;
            suburbStats[name] = { total: 0, critical: 0, warning: 0, good: 0 };
            suburbPipelineStats[name] = { total: 0, critical: 0, warning: 0, good: 0 };
        }
        suburbStats['UNKNOWN'] = { total: 0, critical: 0, warning: 0, good: 0 };
        suburbPipelineStats['UNKNOWN'] = { total: 0, critical: 0, warning: 0, good: 0 };
        
        // Process manholes
        if (manholesResponse.ok) {
            const manholesData = await manholesResponse.json();
            
            manholesData.features.forEach(feature => {
                const coords = feature.geometry?.coordinates;
                if (!coords || coords.length < 2) return;
                
                const lng = coords[0];
                const lat = coords[1];
                const props = feature.properties;
                
                let foundSuburb = findSuburbForPoint(lng, lat);
                
                if (!foundSuburb) {
                    foundSuburb = 'UNKNOWN';
                }
                
                if (!suburbStats[foundSuburb]) {
                    suburbStats[foundSuburb] = { total: 0, critical: 0, warning: 0, good: 0 };
                }
                
                suburbStats[foundSuburb].total++;
                
                const status = props.status || 'good';
                if (status === 'critical') {
                    suburbStats[foundSuburb].critical++;
                } else if (status === 'warning') {
                    suburbStats[foundSuburb].warning++;
                } else {
                    suburbStats[foundSuburb].good++;
                }
            });
        }
        
        // Process pipelines
        if (pipelinesResponse.ok) {
            const pipelinesData = await pipelinesResponse.json();
            
            pipelinesData.features.forEach(feature => {
                // Get start point of pipeline
                let startCoords = null;
                if (feature.geometry.type === 'LineString') {
                    startCoords = feature.geometry.coordinates[0];
                } else if (feature.geometry.type === 'MultiLineString') {
                    startCoords = feature.geometry.coordinates[0][0];
                }
                
                if (startCoords && startCoords.length >= 2) {
                    const lng = startCoords[0];
                    const lat = startCoords[1];
                    const props = feature.properties;
                    
                    let foundSuburb = findSuburbForPoint(lng, lat);
                    
                    if (!foundSuburb) {
                        foundSuburb = 'UNKNOWN';
                    }
                    
                    if (!suburbPipelineStats[foundSuburb]) {
                        suburbPipelineStats[foundSuburb] = { total: 0, critical: 0, warning: 0, good: 0 };
                    }
                    
                    suburbPipelineStats[foundSuburb].total++;
                    
                    const status = props.status || 'good';
                    if (status === 'critical') {
                        suburbPipelineStats[foundSuburb].critical++;
                    } else if (status === 'warning') {
                        suburbPipelineStats[foundSuburb].warning++;
                    } else {
                        suburbPipelineStats[foundSuburb].good++;
                    }
                }
            });
        }
        
        console.log('Suburb Manhole Statistics:', suburbStats);
        console.log('Suburb Pipeline Statistics:', suburbPipelineStats);
        
        // Update suburb popups with real data
        updateSuburbPopups();
        
    } catch (error) {
        console.error('Error calculating suburb statistics:', error);
    }
}

// Update suburb popups with real statistics in TABLE FORMAT
function updateSuburbPopups() {
    if (!currentSuburbLayer) return;
    
    currentSuburbLayer.eachLayer(layer => {
        const props = layer.feature?.properties;
        if (props) {
            const suburbName = (props.name || props.suburb_nam || 'Unnamed').toUpperCase();
            const manholeStats = suburbStats[suburbName] || { total: 0, critical: 0, warning: 0, good: 0 };
            const pipelineStats = suburbPipelineStats[suburbName] || { total: 0, critical: 0, warning: 0, good: 0 };
            
            layer.bindPopup(`
                <div style="min-width: 320px; max-width: 400px;">
                    <b style="font-size: 16px; color: #00d4ff;">🏘️ ${suburbName}</b>
                    <hr style="margin: 8px 0; border-color: #333;">
                    
                    <!-- MANHOLES TABLE -->
                    <div style="margin-bottom: 12px;">
                        <div style="color: #9b59b6; font-weight: bold; margin-bottom: 5px;">🕳️ MANHOLES</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="border-bottom: 1px solid #333;">
                                <th style="text-align: left; padding: 4px;">Status</th>
                                <th style="text-align: right; padding: 4px;">Count</th>
                                <th style="text-align: left; padding: 4px;">Color</th>
                            </tr>
                            <tr>
                                <td style="padding: 4px;">Total</td>
                                <td style="text-align: right; padding: 4px; font-weight: bold; color: #69f0ae;">${manholeStats.total}</td>
                                <td style="padding: 4px;">-</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px; color: #dc3545;">🔴 Critical</td>
                                <td style="text-align: right; padding: 4px; color: #dc3545; font-weight: bold;">${manholeStats.critical}</td>
                                <td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 50%;"></span> Red</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px; color: #ffc107;">🟡 Warning</td>
                                <td style="text-align: right; padding: 4px; color: #ffc107; font-weight: bold;">${manholeStats.warning}</td>
                                <td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 50%;"></span> Yellow</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px; color: #9b59b6;">🟣 Normal</td>
                                <td style="text-align: right; padding: 4px; color: #9b59b6; font-weight: bold;">${manholeStats.good}</td>
                                <td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #9b59b6; border-radius: 50%;"></span> Purple</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- PIPELINES TABLE -->
                    <div style="margin-bottom: 8px;">
                        <div style="color: #32cd32; font-weight: bold; margin-bottom: 5px;">📏 PIPELINES</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="border-bottom: 1px solid #333;">
                                <th style="text-align: left; padding: 4px;">Status</th>
                                <th style="text-align: right; padding: 4px;">Count</th>
                                <th style="text-align: left; padding: 4px;">Color</th>
                            </tr>
                            <tr>
                                <td style="padding: 4px;">Total</td>
                                <td style="text-align: right; padding: 4px; font-weight: bold; color: #69f0ae;">${pipelineStats.total}</td>
                                <td style="padding: 4px;">-</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px; color: #dc3545;">🔴 Critical</td>
                                <td style="text-align: right; padding: 4px; color: #dc3545; font-weight: bold;">${pipelineStats.critical}</td>
                                <td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 2px;"></span> Red</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px; color: #ffc107;">🟡 Warning</td>
                                <td style="text-align: right; padding: 4px; color: #ffc107; font-weight: bold;">${pipelineStats.warning}</td>
                                <td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 2px;"></span> Yellow</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px; color: #32cd32;">🟢 Normal</td>
                                <td style="text-align: right; padding: 4px; color: #32cd32; font-weight: bold;">${pipelineStats.good}</td>
                                <td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #32cd32; border-radius: 2px;"></span> Lime Green</td>
                            </tr>
                        </table>
                    </div>
                    
                    <hr style="margin: 8px 0; border-color: #333;">
                    <div style="font-size: 10px; color: #888; text-align: center;">
                        Ward: ${props.ward || 'N/A'} | Zone: ${props.zone || 'N/A'}
                    </div>
                </div>
            `);
        }
    });
}

// ============================================
// REFRESH ALL LAYERS
// ============================================

async function refreshAllLayers() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    const bounds = map.getBounds();
    currentBounds = bounds;
    
    console.log('Refreshing all layers...');
    showLoadingIndicator(true);
    
    try {
        // Load suburb geometries first (needed for point matching)
        await loadSuburbGeometries();
        
        const [manholesGeoJSON, pipelinesGeoJSON, suburbsGeoJSON, complaintsGeoJSON, cadastreGeoJSON] = await Promise.all([
            fetchLayerFromAPI(API_ENDPOINTS.manholes, bounds),
            fetchLayerFromAPI(API_ENDPOINTS.pipelines, bounds),
            fetchLayerFromAPI(API_ENDPOINTS.suburbs, null),
            fetchLayerFromAPI(API_ENDPOINTS.complaints, bounds),
            fetchLayerFromAPI(API_ENDPOINTS.cadastre, null)
        ]);
        
        console.log('Manholes:', manholesGeoJSON.features?.length || 0);
        console.log('Pipelines:', pipelinesGeoJSON.features?.length || 0);
        console.log('Suburbs:', suburbsGeoJSON.features?.length || 0);
        
        // Load layers
        loadSuburbsFromGeoJSON(suburbsGeoJSON);
        loadManholesFromGeoJSON(manholesGeoJSON);
        loadPipelinesFromGeoJSON(pipelinesGeoJSON);
        loadComplaintsFromGeoJSON(complaintsGeoJSON);
        loadCadastreFromGeoJSON(cadastreGeoJSON);
        
        // Calculate statistics AFTER loading all data
        await calculateSuburbStatistics();
        
        document.dispatchEvent(new CustomEvent('mapDataRefreshed', {
            detail: {
                manholes: currentManholeMarkers.length,
                pipelines: pipelinesGeoJSON.features?.length || 0,
                suburbs: suburbsGeoJSON.features?.length || 0,
                complaints: complaintsGeoJSON.features?.length || 0,
                cadastre: cadastreGeoJSON.features?.length || 0
            }
        }));
        
        console.log('All layers refreshed successfully');
        
    } catch (error) {
        console.error('Error refreshing layers:', error);
    } finally {
        showLoadingIndicator(false);
    }
}

// Simple loading indicator
let loadingDiv = null;
function showLoadingIndicator(show) {
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'map-loading';
        loadingDiv.style.cssText = 'position: absolute; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; z-index: 1000; display: none;';
        document.querySelector('.map-container')?.appendChild(loadingDiv);
    }
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
        if (show) loadingDiv.innerHTML = '🔄 Loading sewer data...';
        else loadingDiv.innerHTML = '✅ Data loaded';
        setTimeout(() => {
            if (!show && loadingDiv) loadingDiv.style.display = 'none';
        }, 2000);
    }
}

// Tile definitions
const TILES = {
    osm: { id: 'osm', label: 'Street', icon: '🗺️', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', maxZoom: 19 },
    satellite: { id: 'satellite', label: 'Satellite', icon: '🛰️', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri', maxZoom: 19 },
    hybrid: { id: 'hybrid', label: 'Hybrid', icon: '🌍', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', overlayUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: 'Imagery &copy; Esri | Roads &copy; OSM', maxZoom: 19 },
    topo: { id: 'topo', label: 'Topographic', icon: '⛰️', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: 'Map data &copy; OSM | Style &copy; OpenTopoMap', maxZoom: 17 }
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
        map = L.map('map').setView([centerLat, centerLng], zoom);
        currentTileLayer = L.tileLayer(TILES.osm.url, {
            attribution: TILES.osm.attr,
            maxZoom: TILES.osm.maxZoom
        }).addTo(map);
        L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
        
        map.on('mousemove', function(e) {
            const coordStatus = document.getElementById('coordStatus');
            if (coordStatus) coordStatus.innerHTML = `📍 ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)} | Zoom: ${map.getZoom()}`;
        });
        
        let refreshTimeout;
        map.on('moveend', function() {
            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => refreshAllLayers(), 500);
        });
        
        console.log('Map created successfully');
        setTimeout(() => addDropdownTileSelector(), 100);
        
        setTimeout(() => {
            refreshAllLayers();
        }, 1000);
        
        document.dispatchEvent(new CustomEvent('mapReady'));
        addPulseAnimation();
        
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
    if (currentTileLayer) map.removeLayer(currentTileLayer);
    if (currentOverlayLayer) map.removeLayer(currentOverlayLayer);
    currentTileLayer = L.tileLayer(tile.url, { attribution: tile.attr, maxZoom: tile.maxZoom }).addTo(map);
    if (tileType === 'hybrid' && tile.overlayUrl) {
        currentOverlayLayer = L.tileLayer(tile.overlayUrl, { opacity: 0.5 }).addTo(map);
    }
    updateDropdownButtonText(tileType);
}

function updateDropdownButtonText(tileType) {
    const btnText = document.getElementById('selectedTileText');
    if (btnText && TILES[tileType]) btnText.innerHTML = `${TILES[tileType].icon} ${TILES[tileType].label}`;
}

function addDropdownTileSelector() {
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;
    const existing = document.querySelector('.dropdown-tile-selector');
    if (existing) existing.remove();
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown-tile-selector';
    dropdownDiv.style.cssText = `position: absolute; top: 10px; right: 10px; z-index: 1000; font-family: 'Segoe UI', monospace;`;
    dropdownDiv.innerHTML = `
        <div style="position: relative;">
            <button id="tileDropdownBtn" style="background: rgba(10, 26, 10, 0.95); backdrop-filter: blur(8px); border: 1px solid forestgreen; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px; font-weight: bold; color: #8fdc00; display: flex; align-items: center; gap: 8px; min-width: 130px;">
                <span id="selectedTileText">🗺️ Street</span>
                <span style="font-size: 10px;">▼</span>
            </button>
            <div id="tileDropdownMenu" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; background: rgba(10, 26, 10, 0.95); backdrop-filter: blur(8px); border: 1px solid forestgreen; border-radius: 6px; min-width: 150px; overflow: hidden; z-index: 1001;">
                ${Object.values(TILES).map(tile => `<div class="tile-dropdown-item" data-tile="${tile.id}" style="padding: 8px 12px; cursor: pointer; font-size: 12px; color: #7ab87a; display: flex; align-items: center; gap: 8px; transition: all 0.2s; border-bottom: 1px solid #1a3a1a;"><span>${tile.icon}</span><span>${tile.label}</span></div>`).join('')}
            </div>
        </div>
    `;
    mapContainer.appendChild(dropdownDiv);
    
    document.getElementById('tileDropdownBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('tileDropdownMenu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', function(e) {
        if (dropdownDiv && !dropdownDiv.contains(e.target)) document.getElementById('tileDropdownMenu').style.display = 'none';
    });
    document.querySelectorAll('.tile-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            switchBaseMap(item.dataset.tile);
            document.getElementById('tileDropdownMenu').style.display = 'none';
            document.querySelectorAll('.tile-dropdown-item').forEach(i => {
                i.style.background = 'transparent';
                i.style.color = '#7ab87a';
            });
            item.style.background = '#2a4a2a';
            item.style.color = '#8fdc00';
        });
    });
}

// ============================================
// LOAD MANHOLES - WITH CORRECT SUBURB NAME
// ============================================
function loadManholesFromGeoJSON(geojson) {
    if (!map) {
        console.error('Map not initialized, cannot load manholes');
        return;
    }
    
    currentManholeMarkers.forEach(m => {
        if (map.hasLayer(m)) map.removeLayer(m);
    });
    currentManholeMarkers = [];
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.log('No manholes data to load');
        return;
    }
    
    let criticalCount = 0;
    let warningCount = 0;
    let goodCount = 0;
    
    geojson.features.forEach(feature => {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const props = feature.properties;
        
        let color = '#9b59b6';
        let statusText = 'Normal';
        
        if (props.status === 'critical') {
            color = '#dc3545';
            statusText = 'Critical';
            criticalCount++;
        } else if (props.status === 'warning') {
            color = '#ffc107';
            statusText = 'Warning';
            warningCount++;
        } else {
            goodCount++;
        }
        
        const lng = coords[0];
        const lat = coords[1];
        
        // Find suburb name using point-in-polygon
        let suburbName = findSuburbForPoint(lng, lat);
        
        if (!suburbName) {
            suburbName = props.suburb || 'Unknown';
            if (suburbName === 'Unknown' || suburbName === 'N/A') {
                suburbName = 'Unknown Location';
            }
        }
        
        const marker = L.circleMarker([lat, lng], {
            radius: 7,
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            weight: 2
        });
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <b>🕳️ ${props.manhole_id || 'Manhole'}</b>
                <hr style="margin: 5px 0; border-color: #333;">
                <div style="font-size: 12px;">
                    <div>📍 <b style="color: #00d4ff;">Suburb:</b> <span style="color: #00d4ff;">${suburbName}</span></div>
                    <div>📊 <b>Status:</b> <span style="color:${color}; font-weight: bold;">${statusText}</span></div>
                    <div>📏 <b>Depth:</b> ${props.depth || props.mh_depth || 'N/A'} m</div>
                    <div>🔧 <b>Inspector:</b> ${props.inspector || 'N/A'}</div>
                </div>
            </div>
        `);
        
        marker.addTo(map);
        currentManholeMarkers.push(marker);
    });
    
    console.log(`Loaded ${currentManholeMarkers.length} manholes (${criticalCount} critical, ${warningCount} warning, ${goodCount} good)`);
}

// ============================================
// LOAD PIPELINES - WITH CORRECT SUBURB NAME
// ============================================
function loadPipelinesFromGeoJSON(geojson) {
    if (!map) {
        console.error('Map not initialized, cannot load pipelines');
        return;
    }
    
    if (currentPipelineLayer) {
        if (map.hasLayer(currentPipelineLayer)) map.removeLayer(currentPipelineLayer);
        currentPipelineLayer = null;
    }
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.log('No pipelines data to load');
        return;
    }
    
    currentPipelineLayer = L.geoJSON(geojson, {
        style: (feature) => {
            const status = feature.properties?.status;
            let color = '#32cd32';
            if (status === 'critical') color = '#dc3545';
            else if (status === 'warning') color = '#ffc107';
            return { color: color, weight: 3, opacity: 0.8 };
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const status = props.status || 'good';
            let statusText = 'Normal';
            let statusColor = '#32cd32';
            
            if (status === 'critical') {
                statusText = 'Critical';
                statusColor = '#dc3545';
            } else if (status === 'warning') {
                statusText = 'Warning';
                statusColor = '#ffc107';
            }
            
            // Get start point of pipeline to find suburb
            let startCoords = null;
            let suburbName = 'Unknown';
            
            if (feature.geometry.type === 'LineString') {
                startCoords = feature.geometry.coordinates[0];
            } else if (feature.geometry.type === 'MultiLineString') {
                startCoords = feature.geometry.coordinates[0][0];
            }
            
            if (startCoords && startCoords.length >= 2) {
                const foundSuburb = findSuburbForPoint(startCoords[0], startCoords[1]);
                if (foundSuburb) {
                    suburbName = foundSuburb;
                }
            }
            
            layer.bindPopup(`
                <div style="min-width: 220px;">
                    <b>📏 ${props.pipe_id || 'Pipeline'}</b>
                    <hr style="margin: 5px 0; border-color: #333;">
                    <div style="font-size: 12px;">
                        <div>📍 <b style="color: #00d4ff;">Suburb:</b> <span style="color: #00d4ff;">${suburbName}</span></div>
                        <div>📊 <b>Status:</b> <span style="color:${statusColor}; font-weight: bold;">${statusText}</span></div>
                        <div>🔧 <b>Material:</b> ${props.material || props.pipe_mat || 'N/A'}</div>
                        <div>📏 <b>Length:</b> ${props.length ? props.length.toFixed(2) : 'N/A'} m</div>
                        <div>📐 <b>Diameter:</b> ${props.diameter || props.pipe_size || 'N/A'} mm</div>
                    </div>
                </div>
            `);
        }
    }).addTo(map);
    console.log(`Loaded ${geojson.features.length} pipelines`);
}

// ============================================
// LOAD SUBURBS
// ============================================
function loadSuburbsFromGeoJSON(geojson) {
    if (!map) {
        console.error('Map not initialized, cannot load suburbs');
        return;
    }
    
    if (currentSuburbLayer) {
        if (suburbLabels.length) {
            suburbLabels.forEach(label => {
                if (map.hasLayer(label)) map.removeLayer(label);
            });
            suburbLabels = [];
        }
        if (map.hasLayer(currentSuburbLayer)) map.removeLayer(currentSuburbLayer);
        currentSuburbLayer = null;
    }
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.log('No suburbs data to load');
        return;
    }
    
    console.log(`Loading ${geojson.features.length} suburbs to map`);
    
    currentSuburbLayer = L.geoJSON(geojson, {
        style: defaultSuburbStyle,
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const suburbName = (props.name || props.suburb_nam || 'Unnamed').toUpperCase();
            
            const manholeStats = suburbStats[suburbName] || { total: 0, critical: 0, warning: 0, good: 0 };
            const pipelineStats = suburbPipelineStats[suburbName] || { total: 0, critical: 0, warning: 0, good: 0 };
            
            layer.bindPopup(`
                <div style="min-width: 320px; max-width: 400px;">
                    <b style="font-size: 16px; color: #00d4ff;">🏘️ ${suburbName}</b>
                    <hr style="margin: 8px 0; border-color: #333;">
                    
                    <div style="margin-bottom: 12px;">
                        <div style="color: #9b59b6; font-weight: bold; margin-bottom: 5px;">🕳️ MANHOLES</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="border-bottom: 1px solid #333;"><th style="text-align: left; padding: 4px;">Status</th><th style="text-align: right; padding: 4px;">Count</th><th style="text-align: left; padding: 4px;">Color</th></tr>
                            <tr><td style="padding: 4px;">Total</td><td style="text-align: right; padding: 4px; font-weight: bold; color: #69f0ae;">${manholeStats.total}</td><td style="padding: 4px;">-</td></tr>
                            <tr><td style="padding: 4px; color: #dc3545;">🔴 Critical</td><td style="text-align: right; padding: 4px; color: #dc3545; font-weight: bold;">${manholeStats.critical}</td><td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 50%;"></span> Red</td></tr>
                            <tr><td style="padding: 4px; color: #ffc107;">🟡 Warning</td><td style="text-align: right; padding: 4px; color: #ffc107; font-weight: bold;">${manholeStats.warning}</td><td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 50%;"></span> Yellow</td></tr>
                            <tr><td style="padding: 4px; color: #9b59b6;">🟣 Normal</td><td style="text-align: right; padding: 4px; color: #9b59b6; font-weight: bold;">${manholeStats.good}</td><td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #9b59b6; border-radius: 50%;"></span> Purple</td></tr>
                        </table>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <div style="color: #32cd32; font-weight: bold; margin-bottom: 5px;">📏 PIPELINES</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="border-bottom: 1px solid #333;"><th style="text-align: left; padding: 4px;">Status</th><th style="text-align: right; padding: 4px;">Count</th><th style="text-align: left; padding: 4px;">Color</th></tr>
                            <tr><td style="padding: 4px;">Total</td><td style="text-align: right; padding: 4px; font-weight: bold; color: #69f0ae;">${pipelineStats.total}</td><td style="padding: 4px;">-</td></tr>
                            <tr><td style="padding: 4px; color: #dc3545;">🔴 Critical</td><td style="text-align: right; padding: 4px; color: #dc3545; font-weight: bold;">${pipelineStats.critical}</td><td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 2px;"></span> Red</td></tr>
                            <tr><td style="padding: 4px; color: #ffc107;">🟡 Warning</td><td style="text-align: right; padding: 4px; color: #ffc107; font-weight: bold;">${pipelineStats.warning}</td><td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 2px;"></span> Yellow</td></tr>
                            <tr><td style="padding: 4px; color: #32cd32;">🟢 Normal</td><td style="text-align: right; padding: 4px; color: #32cd32; font-weight: bold;">${pipelineStats.good}</td><td style="padding: 4px;"><span style="display: inline-block; width: 12px; height: 12px; background: #32cd32; border-radius: 2px;"></span> Lime Green</td></tr>
                        </table>
                    </div>
                    
                    <hr style="margin: 8px 0; border-color: #333;">
                    <div style="font-size: 10px; color: #888; text-align: center;">
                        Ward: ${props.ward || 'N/A'} | Zone: ${props.zone || 'N/A'}
                    </div>
                </div>
            `);
            
            layer.on('mouseover', function() {
                layer.setStyle(hoverSuburbStyle);
                const label = suburbLabels.find(l => l.suburbName === suburbName);
                if (label && map.hasLayer(label)) {
                    label.setOpacity(1);
                    if (label.getElement()) label.getElement().style.fontWeight = 'bold';
                }
            });
            
            layer.on('mouseout', function() {
                layer.setStyle(defaultSuburbStyle);
                const label = suburbLabels.find(l => l.suburbName === suburbName);
                if (label && map.hasLayer(label)) {
                    label.setOpacity(0.85);
                    if (label.getElement()) label.getElement().style.fontWeight = 'normal';
                }
            });
            
            const center = layer.getBounds().getCenter();
            const label = L.marker(center, {
                icon: L.divIcon({
                    html: `<div style="font-family: monospace; font-size: 10px; font-weight: bold; color: black; background: rgba(255,255,255,0.8); padding: 2px 5px; border-radius: 3px; border: 1px solid black; white-space: nowrap;">${suburbName}</div>`,
                    iconSize: [null, null]
                }),
                interactive: false
            });
            label.suburbName = suburbName;
            label.setOpacity(0.85);
            label.addTo(map);
            suburbLabels.push(label);
        }
    }).addTo(map);
    
    console.log(`Suburbs layer added with ${suburbLabels.length} labels`);
}

// ============================================
// LOAD COMPLAINTS
// ============================================
function loadComplaintsFromGeoJSON(geojson) {
    if (!map) return;
    currentComplaintMarkers.forEach(m => {
        if (map.hasLayer(m)) map.removeLayer(m);
    });
    currentComplaintMarkers = [];
    
    if (!geojson || !geojson.features || geojson.features.length === 0) return;
    
    geojson.features.forEach(feature => {
        const coords = feature.geometry?.coordinates;
        if (!coords) return;
        const props = feature.properties;
        const color = props.status === 'resolved' ? '#28a745' : '#dc3545';
        const marker = L.circleMarker([coords[1], coords[0]], {
            radius: 8, color: color, fillColor: color, fillOpacity: 0.8, weight: 2
        });
        marker.bindPopup(`<b>⚠️ Complaint</b><br>Address: ${props.address || 'Unknown'}`);
        marker.addTo(map);
        currentComplaintMarkers.push(marker);
    });
    console.log(`Loaded ${currentComplaintMarkers.length} complaints`);
}

// ============================================
// LOAD CADASTRE
// ============================================
function loadCadastreFromGeoJSON(geojson) {
    if (!map) return;
    if (currentCadastreLayer) {
        if (cadastreLabels.length) {
            cadastreLabels.forEach(label => {
                if (map.hasLayer(label)) map.removeLayer(label);
            });
            cadastreLabels = [];
        }
        if (map.hasLayer(currentCadastreLayer)) map.removeLayer(currentCadastreLayer);
        currentCadastreLayer = null;
    }
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.log('No cadastre data');
        return;
    }
    
    console.log(`Loading ${geojson.features.length} cadastre stands`);
    
    currentCadastreLayer = L.geoJSON(geojson, {
        style: { color: '#2e7d52', weight: 1, opacity: 0.5, fill: false },
        onEachFeature: (feature, layer) => {
            const standNumber = feature.properties?.stand_number;
            if (standNumber) {
                const center = layer.getBounds().getCenter();
                const label = L.marker(center, {
                    icon: L.divIcon({
                        html: `<div style="font-family: monospace; font-size: 7px; background: rgba(255,255,255,0.7); padding: 1px 3px; border-radius: 2px;">${standNumber}</div>`,
                        iconSize: [null, null]
                    }),
                    interactive: false
                }).addTo(map);
                cadastreLabels.push(label);
            }
        }
    }).addTo(map);
}

// ============================================
// COMPLAINTS WITH BUFFERS
// ============================================
function showComplaintsWithBuffers(complaints, reportDate) {
    clearComplaintBuffers();
    if (!complaints?.length) return;
    
    complaints.forEach((complaint, idx) => {
        if (complaint.latitude && complaint.longitude) {
            const isExact = complaint.confidence === 'high';
            const bufferRadius = complaint.buffer_radius || (isExact ? 30 : 100);
            const markerColor = isExact ? '#dc3545' : '#ff9800';
            
            const marker = L.circleMarker([complaint.latitude, complaint.longitude], {
                radius: 10, color: markerColor, fillColor: markerColor, fillOpacity: 0.9, weight: 2
            });
            const bufferCircle = L.circle([complaint.latitude, complaint.longitude], {
                radius: bufferRadius, color: '#ff9800', fillColor: '#ff9800', fillOpacity: 0.15, weight: 2, className: 'pulse-circle'
            }).addTo(map);
            marker.bindPopup(`<b>⚠️ Complaint #${idx+1}</b><br>Address: ${complaint.address}<br>Buffer: ${bufferRadius}m`);
            marker.addTo(map);
            currentComplaintBuffers.push({ marker, buffer: bufferCircle });
        }
    });
    
    if (currentComplaintBuffers.length) {
        const bounds = L.latLngBounds(currentComplaintBuffers.map(c => c.marker.getLatLng()));
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
    }
}

function clearComplaintBuffers() {
    currentComplaintBuffers.forEach(item => {
        if (item.marker && map.hasLayer(item.marker)) map.removeLayer(item.marker);
        if (item.buffer && map.hasLayer(item.buffer)) map.removeLayer(item.buffer);
    });
    currentComplaintBuffers = [];
}

function clearComplaints() {
    currentComplaintMarkers.forEach(m => {
        if (map.hasLayer(m)) map.removeLayer(m);
    });
    currentComplaintMarkers = [];
}

function showComplaintMarkers(complaints) {
    clearComplaints();
    if (!complaints?.length) return;
    complaints.forEach(c => {
        const marker = L.circleMarker([c.latitude, c.longitude], {
            radius: 8, color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.8, weight: 2
        });
        marker.bindPopup(`<b>⚠️ Complaint</b><br>Address: ${c.address}`);
        marker.addTo(map);
        currentComplaintMarkers.push(marker);
    });
}

// ============================================
// CLEAR LAYERS
// ============================================
function clearPipelines() {
    if (currentPipelineLayer && map && map.hasLayer(currentPipelineLayer)) {
        map.removeLayer(currentPipelineLayer);
        currentPipelineLayer = null;
    }
}

function clearSuburbs() {
    if (currentSuburbLayer && map && map.hasLayer(currentSuburbLayer)) {
        suburbLabels.forEach(label => { if (map.hasLayer(label)) map.removeLayer(label); });
        suburbLabels = [];
        map.removeLayer(currentSuburbLayer);
        currentSuburbLayer = null;
    }
}

function clearCadastre() {
    if (currentCadastreLayer && map && map.hasLayer(currentCadastreLayer)) {
        cadastreLabels.forEach(label => { if (map.hasLayer(label)) map.removeLayer(label); });
        cadastreLabels = [];
        map.removeLayer(currentCadastreLayer);
        currentCadastreLayer = null;
    }
}

// ============================================
// HEATMAP FUNCTIONS
// ============================================
function showHeatmapFromCurrentMarkers() {
    if (!map || !currentManholeMarkers.length) return;
    const points = currentManholeMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng, 1]);
    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    heatLayer = L.heatLayer(points, { radius: 25, blur: 15 }).addTo(map);
}

function showHeatmapFromComplaints() {
    if (!map || !currentComplaintMarkers.length) return;
    const points = currentComplaintMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng, 1]);
    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    heatLayer = L.heatLayer(points, { radius: 30, blur: 20 }).addTo(map);
}

function clearHeatmap() {
    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    heatLayer = null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function fitToBounds() {
    if (!map) return;
    const allMarkers = [...currentManholeMarkers, ...currentComplaintMarkers];
    if (!allMarkers.length) return;
    const bounds = L.latLngBounds(allMarkers.map(m => m.getLatLng()));
    if (bounds.isValid()) map.fitBounds(bounds);
}

function fitToComplaints() {
    if (!map || !currentComplaintMarkers.length) return;
    const bounds = L.latLngBounds(currentComplaintMarkers.map(m => m.getLatLng()));
    if (bounds.isValid()) map.fitBounds(bounds);
}

function getMap() { return map; }

function addPulseAnimation() {
    if (!document.getElementById('pulse-style')) {
        const style = document.createElement('style');
        style.id = 'pulse-style';
        style.textContent = `@keyframes pulse{0%{stroke-width:2;stroke-opacity:1}50%{stroke-width:5;stroke-opacity:0.5}100%{stroke-width:2;stroke-opacity:1}}.pulse-circle{animation:pulse 1.5s ease-out infinite}`;
        document.head.appendChild(style);
    }
}

// ============================================
// EXPORTS
// ============================================
export default {
    init: initMap,
    switchBaseMap: switchBaseMap,
    getMap: getMap,
    refreshAllLayers: refreshAllLayers,
    loadManholesFromGeoJSON: loadManholesFromGeoJSON,
    loadPipelinesFromGeoJSON: loadPipelinesFromGeoJSON,
    loadSuburbsFromGeoJSON: loadSuburbsFromGeoJSON,
    loadComplaintsFromGeoJSON: loadComplaintsFromGeoJSON,
    loadCadastreFromGeoJSON: loadCadastreFromGeoJSON,
    clearPipelines: clearPipelines,
    clearSuburbs: clearSuburbs,
    clearComplaints: clearComplaints,
    clearCadastre: clearCadastre,
    showComplaintMarkers: showComplaintMarkers,
    showComplaintsWithBuffers: showComplaintsWithBuffers,
    clearComplaintBuffers: clearComplaintBuffers,
    showHeatmapFromCurrentMarkers: showHeatmapFromCurrentMarkers,
    showHeatmapFromComplaints: showHeatmapFromComplaints,
    clearHeatmap: clearHeatmap,
    fitToBounds: fitToBounds,
    fitToComplaints: fitToComplaints
};

window.markComplaintResolved = async (complaintId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/resolve`, { method: 'PUT' });
        if (response.ok) {
            alert('Complaint marked as resolved!');
            refreshAllLayers();
            document.dispatchEvent(new CustomEvent('dataRefreshed'));
        }
    } catch (error) {
        console.error('Error resolving complaint:', error);
    }
};

window.zoomToStand = (lat, lng) => { if (map) map.setView([lat, lng], 18); };