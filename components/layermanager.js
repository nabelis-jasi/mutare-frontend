// components/layermanager.js - OPTIMIZED VERSION (No Freezing)
// Integrated with Flask backend API and mapview module
// Manages: Manholes (Purple), Pipelines (Lime Green), Suburbs (Black border)

import MapView from './mapview.js';

// API base URL (Flask backend on port 5000)
const API_BASE_URL = 'http://192.168.0.195:5000/api';

// Performance settings
const MAX_FEATURES_PER_LAYER = 3000;  // Increased for better coverage
const USE_VIEWPORT_FILTERING = true;   // Only load visible area

// Layer definitions with CORRECT table names
let availableLayers = [
    { id: 'manholes', tableName: 'waste_water_manhole', type: 'point', visible: true, color: '#32cd32', apiEndpoint: '/manholes/geojson', useViewport: true },
    { id: 'pipelines', tableName: 'waste_water_pipeline', type: 'line', visible: true, color: '#32cd32', apiEndpoint: '/pipelines/geojson', useViewport: true },
    { id: 'suburbs', tableName: 'suburbs', type: 'polygon', visible: true, color: '#32cd32', apiEndpoint: '/suburbs/geojson', useViewport: false }
];

let layerVisibility = {
    manholes: true,
    pipelines: true,
    suburbs: true
};

// Store references to map layers
let layerLoaded = {
    manholes: false,
    pipelines: false,
    suburbs: false
};

// Debounce timer for viewport changes
let viewportDebounceTimer = null;
const VIEWPORT_DEBOUNCE_MS = 500;

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderMenuIcon() {
    return `
        <div class="menu-dropdown">
            <button id="menuIconBtn" class="menu-icon-btn">☰ MENU</button>
            <div id="menuDropdown" class="menu-dropdown-content">
                <div class="menu-section">
                    <div class="menu-section-title">📁 PROJECT</div>
                    <div class="menu-item" data-action="newProject">📄 New Project</div>
                    <div class="menu-item" data-action="openProject">📂 Open Project</div>
                    <div class="menu-item" data-action="saveProject">💾 Save Project</div>
                    <div class="menu-item" data-action="saveAsProject">📑 Save As</div>
                    <div class="menu-divider"></div>
                    <div class="menu-item" data-action="exportMap">📸 Export Map</div>
                    <div class="menu-item" data-action="printLayout">🖨️ Print Layout</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">✏️ EDIT</div>
                    <div class="menu-item" data-action="undo">↩️ Undo</div>
                    <div class="menu-item" data-action="redo">↪️ Redo</div>
                    <div class="menu-item" data-action="cut">✂️ Cut</div>
                    <div class="menu-item" data-action="copy">📋 Copy</div>
                    <div class="menu-item" data-action="paste">📎 Paste</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">👁️ VIEW</div>
                    <div class="menu-item" data-action="zoomIn">🔍 Zoom In</div>
                    <div class="menu-item" data-action="zoomOut">🔍 Zoom Out</div>
                    <div class="menu-item" data-action="fullscreen">🖥️ Full Screen</div>
                    <div class="menu-item" data-action="refresh">🔄 Refresh</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">🗺️ LAYER</div>
                    <div class="menu-item" data-action="addLayer">➕ Add Layer</div>
                    <div class="menu-item" data-action="removeLayer">➖ Remove Layer</div>
                    <div class="menu-item" data-action="layerProperties">⚙️ Layer Properties</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">⚙️ SETTINGS</div>
                    <div class="menu-item" data-action="options">🎛️ Options</div>
                    <div class="menu-item" data-action="projectProperties">📋 Project Properties</div>
                    <div class="menu-item" data-action="postgis">🗄️ PostGIS Connection</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">🧩 PLUGINS</div>
                    <div class="menu-item" data-action="pluginManager">🔌 Plugin Manager</div>
                    <div class="menu-item" data-action="pythonConsole">🐍 Python Console</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">📐 VECTOR</div>
                    <div class="menu-item" data-action="geometryTools">📐 Geometry Tools</div>
                    <div class="menu-item" data-action="analysisTools">📊 Analysis Tools</div>
                    <div class="menu-item" data-action="geoprocessing">🔄 Geoprocessing</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">🖼️ RASTER</div>
                    <div class="menu-item" data-action="rasterAnalysis">📈 Analysis</div>
                    <div class="menu-item" data-action="georeferencer">🗺️ Georeferencer</div>
                </div>
                <div class="menu-section">
                    <div class="menu-section-title">💾 DATABASES</div>
                    <div class="menu-item" data-action="dbManager">🗄️ DB Manager</div>
                    <div class="menu-item" data-action="importLayer">📥 Import Layer</div>
                    <div class="menu-item" data-action="exportLayer">📤 Export Layer</div>
                    <div class="menu-item" data-action="runSQL">📝 Run SQL Query</div>
                </div>
            </div>
        </div>
    `;
}

function renderLayerList() {
    if (availableLayers.length === 0) {
        return '<div class="layer-item">No layers added</div>';
    }
    
    return availableLayers.map(layer => `
        <div class="layer-item" data-layer-id="${layer.id}">
            <input type="checkbox" class="layer-checkbox" data-layer-id="${layer.id}" ${layer.visible ? 'checked' : ''}>
            <span class="layer-name" style="color: ${layer.color};">
                ${layer.type === 'point' ? '📍' : layer.type === 'line' ? '📏' : '🔷'} ${layer.tableName}
            </span>
            <div class="layer-controls">
                <button class="layer-zoom" data-layer-id="${layer.id}" title="Zoom to layer">🔍</button>
                <button class="layer-style" data-layer-id="${layer.id}" title="Change style">🎨</button>
                <button class="layer-remove" data-layer-id="${layer.id}" title="Remove layer">✖️</button>
            </div>
        </div>
    `).join('');
}

function render() {
    return `
        <div class="section">
            <h3>🗺️ MAP LAYERS</h3>
            <div id="layer-list" class="layer-list">
                ${renderLayerList()}
            </div>
            <button id="addLayerBtn" class="add-layer-btn">+ ADD POSTGIS LAYER</button>
            <div class="performance-info" style="font-size: 10px; color: #666; margin-top: 8px; text-align: center;">
                ⚡ Viewport filtering active | Max ${MAX_FEATURES_PER_LAYER} features/layer
            </div>
        </div>
    `;
}

// ============================================
// VIEWPORT HELPER FUNCTIONS
// ============================================

function getViewportBounds() {
    const map = MapView.getMap();
    if (!map) return null;
    
    const bounds = map.getBounds();
    return {
        min_lon: bounds.getWest(),
        max_lon: bounds.getEast(),
        min_lat: bounds.getSouth(),
        max_lat: bounds.getNorth()
    };
}

function buildViewportUrl(baseUrl, layer) {
    if (!layer.useViewport || !USE_VIEWPORT_FILTERING) {
        return `${API_BASE_URL}${baseUrl}?limit=${MAX_FEATURES_PER_LAYER}`;
    }
    
    const bounds = getViewportBounds();
    if (!bounds) {
        return `${API_BASE_URL}${baseUrl}?limit=${MAX_FEATURES_PER_LAYER}`;
    }
    
    return `${API_BASE_URL}${baseUrl}?min_lon=${bounds.min_lon}&max_lon=${bounds.max_lon}&min_lat=${bounds.min_lat}&max_lat=${bounds.max_lat}&limit=${MAX_FEATURES_PER_LAYER}`;
}

// ============================================
// LAYER MANAGEMENT FUNCTIONS
// ============================================

async function toggleLayer(layerId, visible) {
    console.log(`Toggling layer ${layerId} to ${visible}`);
    layerVisibility[layerId] = visible;
    const layer = availableLayers.find(l => l.id === layerId);
    if (layer) layer.visible = visible;
    
    if (visible) {
        await loadLayerFromAPI(layerId);
    } else {
        clearLayerFromMap(layerId);
    }
}

async function loadLayerFromAPI(layerId) {
    const layer = availableLayers.find(l => l.id === layerId);
    if (!layer) {
        console.error(`Layer ${layerId} not found`);
        return;
    }
    
    const url = buildViewportUrl(layer.apiEndpoint, layer);
    console.log(`Loading layer ${layerId} from ${url}`);
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        const featureCount = data.features?.length || 0;
        console.log(`Loaded ${featureCount} features for ${layerId}`);
        
        switch (layerId) {
            case 'manholes':
                if (MapView && MapView.loadManholesFromGeoJSON) {
                    MapView.loadManholesFromGeoJSON(data);
                    console.log(`✅ Loaded ${featureCount} manholes (🟣 Purple=Normal, 🔴 Red=Critical, 🟡 Yellow=Warning)`);
                }
                break;
            case 'pipelines':
                if (MapView && MapView.loadPipelinesFromGeoJSON) {
                    MapView.loadPipelinesFromGeoJSON(data);
                    console.log(`✅ Loaded ${featureCount} pipelines (🟢 Lime Green=Normal, 🔴 Red=Critical, 🟡 Yellow=Warning)`);
                }
                break;
            case 'suburbs':
                if (MapView && MapView.loadSuburbsFromGeoJSON) {
                    MapView.loadSuburbsFromGeoJSON(data);
                    console.log(`✅ Loaded ${featureCount} suburbs (Black border, no fill, hover cyan+orange)`);
                }
                break;
            default:
                console.warn('Unknown layer type', layerId);
        }
        layerLoaded[layerId] = true;
        
        updateLayerStatus(layerId, featureCount);
        
    } catch (error) {
        console.error(`Failed to load layer ${layerId}:`, error);
        layerLoaded[layerId] = false;
        updateLayerStatus(layerId, 0, true);
    }
}

function updateLayerStatus(layerId, featureCount, isError = false) {
    const layerItem = document.querySelector(`.layer-item[data-layer-id="${layerId}"]`);
    if (layerItem) {
        const existingStatus = layerItem.querySelector('.layer-status');
        if (existingStatus) existingStatus.remove();
        
        const statusSpan = document.createElement('span');
        statusSpan.className = 'layer-status';
        statusSpan.style.fontSize = '9px';
        statusSpan.style.marginLeft = '8px';
        statusSpan.style.opacity = '0.7';
        
        if (isError) {
            statusSpan.textContent = '⚠️';
            statusSpan.style.color = '#dc3545';
        } else if (featureCount > 0) {
            statusSpan.textContent = `${featureCount}`;
            statusSpan.style.color = '#28a745';
        }
        
        layerItem.querySelector('.layer-name')?.appendChild(statusSpan);
    }
}

function clearLayerFromMap(layerId) {
    console.log(`Clearing layer ${layerId} from map`);
    switch (layerId) {
        case 'manholes':
            if (MapView && MapView.loadManholesFromGeoJSON) {
                MapView.loadManholesFromGeoJSON({ type: 'FeatureCollection', features: [] });
            }
            break;
        case 'pipelines':
            if (MapView && MapView.clearPipelines) {
                MapView.clearPipelines();
            }
            break;
        case 'suburbs':
            if (MapView && MapView.clearSuburbs) {
                MapView.clearSuburbs();
            }
            break;
        default:
            break;
    }
    layerLoaded[layerId] = false;
}

async function refreshVisibleLayers(debounce = true) {
    if (debounce) {
        if (viewportDebounceTimer) clearTimeout(viewportDebounceTimer);
        viewportDebounceTimer = setTimeout(() => {
            doRefreshVisibleLayers();
        }, VIEWPORT_DEBOUNCE_MS);
    } else {
        await doRefreshVisibleLayers();
    }
}

async function doRefreshVisibleLayers() {
    console.log('Refreshing visible layers...');
    const visibleLayers = availableLayers.filter(l => l.visible);
    
    for (const layer of visibleLayers) {
        await loadLayerFromAPI(layer.id);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log('All visible layers refreshed');
}

function setupViewportListener() {
    const map = MapView.getMap();
    if (!map) return;
    
    map.on('moveend', () => {
        const viewportLayers = availableLayers.filter(l => l.visible && l.useViewport);
        if (viewportLayers.length > 0) {
            console.log('Viewport changed, refreshing layers...');
            refreshVisibleLayers(true);
        }
    });
}

// ============================================
// LAYER UI MANAGEMENT
// ============================================

function refreshLayerList() {
    const layerList = document.getElementById('layer-list');
    if (layerList) {
        layerList.innerHTML = renderLayerList();
        attachLayerEvents();
    }
}

function attachLayerEvents() {
    document.querySelectorAll('.layer-checkbox').forEach(cb => {
        cb.addEventListener('change', async function() {
            const layerId = this.dataset.layerId;
            await toggleLayer(layerId, this.checked);
        });
    });
    
    document.querySelectorAll('.layer-zoom').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const layerId = btn.dataset.layerId;
            await zoomToLayer(layerId);
            e.stopPropagation();
        });
    });
    
    document.querySelectorAll('.layer-style').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layerId = btn.dataset.layerId;
            changeLayerStyle(layerId);
            e.stopPropagation();
        });
    });
    
    document.querySelectorAll('.layer-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layerId = btn.dataset.layerId;
            removeLayer(layerId);
            e.stopPropagation();
        });
    });
    
    const addLayerBtn = document.getElementById('addLayerBtn');
    if (addLayerBtn) {
        addLayerBtn.removeEventListener('click', openAddLayerDialog);
        addLayerBtn.addEventListener('click', openAddLayerDialog);
    }
}

async function zoomToLayer(layerId) {
    const map = MapView.getMap();
    if (!map) return;
    
    const layer = availableLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    switch(layerId) {
        case 'suburbs':
            alert('Zoom to suburbs - Use map navigation or click "Refresh"');
            break;
        case 'manholes':
            alert('Zoom to manholes - Pan to areas with purple dots');
            break;
        case 'pipelines':
            alert('Zoom to pipelines - Pan to areas with green lines');
            break;
        default:
            alert(`Zoom to ${layerId} - Use map navigation`);
    }
}

function changeLayerStyle(layerId) {
    const layer = availableLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    const newColor = prompt(`Enter color for ${layer.tableName} (hex code):`, layer.color);
    if (newColor && newColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        layer.color = newColor;
        alert(`Style for ${layer.tableName} changed to ${newColor}`);
        if (layer.visible) {
            loadLayerFromAPI(layerId);
        }
    } else if (newColor) {
        alert('Please enter a valid hex color (e.g., #FF0000 for red)');
    }
}

function removeLayer(layerId) {
    if (layerId === 'manholes' || layerId === 'pipelines' || layerId === 'suburbs') {
        alert(`Cannot remove default layer: ${layerId}`);
        return;
    }
    
    if (confirm(`Remove layer "${layerId}" from map?`)) {
        const index = availableLayers.findIndex(l => l.id === layerId);
        if (index !== -1) {
            availableLayers.splice(index, 1);
            delete layerVisibility[layerId];
            clearLayerFromMap(layerId);
            refreshLayerList();
        }
    }
}

function openAddLayerDialog() {
    const tableName = prompt('Enter PostGIS table name (e.g., roads, catchments):');
    if (tableName && tableName.trim()) {
        addPostGISLayer(tableName.trim());
    }
}

async function addPostGISLayer(tableName) {
    const layerId = tableName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (availableLayers.some(l => l.id === layerId)) {
        alert(`Layer "${tableName}" already added.`);
        return;
    }
    
    const newLayer = {
        id: layerId,
        tableName: tableName,
        type: 'point',
        visible: true,
        color: '#3399ff',
        apiEndpoint: `/custom/${tableName}/geojson`,
        useViewport: true
    };
    
    availableLayers.push(newLayer);
    layerVisibility[layerId] = true;
    refreshLayerList();
    
    alert(`Layer "${tableName}" added. You may need to implement a custom API endpoint.`);
}

// ============================================
// MENU ACTIONS
// ============================================

function initMenuDropdown() {
    const menuBtn = document.getElementById('menuIconBtn');
    const dropdown = document.getElementById('menuDropdown');
    
    if (!menuBtn || !dropdown) return;
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    document.addEventListener('click', function(e) {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            handleMenuAction(action);
            dropdown.style.display = 'none';
        });
    });
}

async function handleMenuAction(action) {
    console.log('Menu action:', action);
    const map = MapView.getMap();
    switch(action) {
        case 'newProject':
            if(confirm('Create new project? Unsaved changes will be lost.')) resetProject();
            break;
        case 'saveProject':
            saveProject();
            break;
        case 'openProject':
            openProject();
            break;
        case 'exportMap':
            alert('Export map as image (feature coming soon)');
            break;
        case 'printLayout':
            window.print();
            break;
        case 'fullscreen':
            toggleFullScreen();
            break;
        case 'addLayer':
            openAddLayerDialog();
            break;
        case 'postgis':
            alert('PostGIS connection settings – modify .env on backend');
            break;
        case 'zoomIn':
            if (map) map.zoomIn();
            break;
        case 'zoomOut':
            if (map) map.zoomOut();
            break;
        case 'refresh':
            await refreshVisibleLayers(false);
            break;
        default:
            alert(`Action: ${action} (Coming soon)`);
    }
}

// ============================================
// PROJECT SAVE/LOAD
// ============================================

function resetProject() {
    availableLayers = [
        { id: 'manholes', tableName: 'waste_water_manhole', type: 'point', visible: true, color: '#9b59b6', apiEndpoint: '/manholes/geojson', useViewport: true },
        { id: 'pipelines', tableName: 'waste_water_pipeline', type: 'line', visible: true, color: '#32cd32', apiEndpoint: '/pipelines/geojson', useViewport: true },
        { id: 'suburbs', tableName: 'suburbs', type: 'polygon', visible: true, color: '#000000', apiEndpoint: '/suburbs/geojson', useViewport: false }
    ];
    layerVisibility = { manholes: true, pipelines: true, suburbs: true };
    refreshLayerList();
    refreshVisibleLayers(false);
    alert('Project reset to default');
}

function saveProject() {
    const project = { 
        layers: availableLayers, 
        visibility: layerVisibility, 
        savedAt: new Date().toISOString() 
    };
    localStorage.setItem('sewer_project', JSON.stringify(project));
    alert('Project saved!');
}

function openProject() {
    const saved = localStorage.getItem('sewer_project');
    if (saved) {
        const project = JSON.parse(saved);
        availableLayers = project.layers;
        layerVisibility = project.visibility;
        refreshLayerList();
        refreshVisibleLayers(false);
        alert('Project loaded!');
    } else {
        alert('No saved project found');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initLayerManager() {
    console.log('LayerManager initializing with performance optimizations...');
    refreshLayerList();
    initMenuDropdown();
    setupViewportListener();
    setTimeout(() => {
        refreshVisibleLayers(false);
    }, 500);
    console.log(`LayerManager ready - Max ${MAX_FEATURES_PER_LAYER} features per layer`);
    console.log('  📍 Manholes: Purple=Normal, Red=Critical, Yellow=Warning');
    console.log('  📏 Pipelines: Lime Green=Normal, Red=Critical, Yellow=Warning');
    console.log('  🔷 Suburbs: Black border, no fill, hover cyan+orange');
}

// ============================================
// GETTERS
// ============================================

function getLayerVisibility() {
    return layerVisibility;
}

function getAvailableLayers() {
    return availableLayers;
}

// ============================================
// EXPORTS
// ============================================

export default {
    render: render,
    renderMenuIcon: renderMenuIcon,
    init: initLayerManager,
    getLayerVisibility: getLayerVisibility,
    getAvailableLayers: getAvailableLayers,
    toggleLayer: toggleLayer,
    refreshVisibleLayers: refreshVisibleLayers
};