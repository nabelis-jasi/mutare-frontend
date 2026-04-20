// components/layermanager.js - Layer Manager Component
// Menu as dropdown icon at top, Layer list in left panel

let availableLayers = [
    { id: 'manholes', name: 'waste_water_manhole', type: 'point', visible: true, color: '#28a745' },
    { id: 'pipelines', name: 'waste_water_pipeline', type: 'line', visible: true, color: '#2b7bff' },
    { id: 'suburbs', name: 'suburbs_boundary', type: 'polygon', visible: false, color: '#ffc107' },
    { id: 'roads', name: 'roads_access', type: 'line', visible: false, color: '#aaaaaa' }
];

let layerVisibility = {
    manholes: true,
    pipelines: true,
    suburbs: false,
    roads: false
};

// ============================================
// RENDER FUNCTIONS
// ============================================

// Render the menu icon (dropdown) - goes at top
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

// Render the layer list (goes in left panel)
function renderLayerList() {
    if (availableLayers.length === 0) {
        return '<div class="layer-item">No layers added</div>';
    }
    
    return availableLayers.map(layer => `
        <div class="layer-item" data-layer="${layer.id}">
            <input type="checkbox" class="layer-checkbox" data-layer="${layer.id}" ${layer.visible ? 'checked' : ''}>
            <span class="layer-name">${layer.type === 'point' ? '📍' : layer.type === 'line' ? '📏' : '🔷'} ${layer.name}</span>
            <div class="layer-controls">
                <button class="layer-zoom" data-layer="${layer.id}" title="Zoom to layer">🔍</button>
                <button class="layer-style" data-layer="${layer.id}" title="Change style">🎨</button>
                <button class="layer-remove" data-layer="${layer.id}" title="Remove layer">✖️</button>
            </div>
        </div>
    `).join('');
}

// Full render for left panel section
function render() {
    return `
        <div class="section">
            <h3>🗺️ MAP LAYERS</h3>
            <div id="layer-list" class="layer-list">
                ${renderLayerList()}
            </div>
            <button id="addLayerBtn" class="add-layer-btn">+ ADD POSTGIS LAYER</button>
        </div>
    `;
}

// ============================================
// INITIALIZE FUNCTIONS
// ============================================

function initMenuDropdown() {
    const menuBtn = document.getElementById('menuIconBtn');
    const dropdown = document.getElementById('menuDropdown');
    
    if (!menuBtn || !dropdown) return;
    
    // Toggle dropdown on button click
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Menu item clicks
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            handleMenuAction(action);
            dropdown.style.display = 'none';
        });
    });
}

function handleMenuAction(action) {
    console.log('Menu action:', action);
    
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
            alert('Export map as image');
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
            alert('Connect to PostgreSQL/PostGIS database');
            break;
        case 'zoomIn':
            if (MapView && MapView.getMap) {
                const map = MapView.getMap();
                if (map) map.zoomIn();
            }
            break;
        case 'zoomOut':
            if (MapView && MapView.getMap) {
                const map = MapView.getMap();
                if (map) map.zoomOut();
            }
            break;
        case 'refresh':
            location.reload();
            break;
        default:
            alert(`Action: ${action} (Coming soon)`);
    }
}

// ============================================
// LAYER MANAGEMENT FUNCTIONS
// ============================================

function refreshLayerList() {
    const layerList = document.getElementById('layer-list');
    if (layerList) {
        layerList.innerHTML = renderLayerList();
        attachLayerEvents();
    }
}

function attachLayerEvents() {
    // Checkbox events
    document.querySelectorAll('.layer-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const layerId = this.dataset.layer;
            toggleLayer(layerId, this.checked);
        });
    });
    
    // Zoom buttons
    document.querySelectorAll('.layer-zoom').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layerId = btn.dataset.layer;
            zoomToLayer(layerId);
            e.stopPropagation();
        });
    });
    
    // Style buttons
    document.querySelectorAll('.layer-style').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layerId = btn.dataset.layer;
            changeLayerStyle(layerId);
            e.stopPropagation();
        });
    });
    
    // Remove buttons
    document.querySelectorAll('.layer-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layerId = btn.dataset.layer;
            removeLayer(layerId);
            e.stopPropagation();
        });
    });
    
    // Add layer button
    const addLayerBtn = document.getElementById('addLayerBtn');
    if (addLayerBtn) {
        addLayerBtn.addEventListener('click', openAddLayerDialog);
    }
}

function toggleLayer(layerId, visible) {
    layerVisibility[layerId] = visible;
    const layer = availableLayers.find(l => l.id === layerId);
    if (layer) layer.visible = visible;
    
    const event = new CustomEvent('layerToggled', { detail: { layerId, visible } });
    document.dispatchEvent(event);
}

function zoomToLayer(layerId) {
    alert(`Zoom to ${layerId} layer`);
}

function changeLayerStyle(layerId) {
    const newColor = prompt('Enter color (hex code or name):', '#28a745');
    if (newColor) {
        const layer = availableLayers.find(l => l.id === layerId);
        if (layer) layer.color = newColor;
        alert(`Style for ${layerId} changed to ${newColor}`);
    }
}

function removeLayer(layerId) {
    if (confirm(`Remove layer "${layerId}" from map?`)) {
        const index = availableLayers.findIndex(l => l.id === layerId);
        if (index !== -1) availableLayers.splice(index, 1);
        delete layerVisibility[layerId];
        refreshLayerList();
        
        const event = new CustomEvent('layerRemoved', { detail: { layerId } });
        document.dispatchEvent(event);
    }
}

function openAddLayerDialog() {
    const layerName = prompt('Enter PostGIS table name:', 'waste_water_manhole');
    if (layerName) {
        const layerId = layerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        availableLayers.push({
            id: layerId,
            name: layerName,
            type: 'point',
            visible: true,
            color: '#28a745'
        });
        layerVisibility[layerId] = true;
        refreshLayerList();
        alert(`Layer "${layerName}" added.`);
    }
}

// ============================================
// PROJECT FUNCTIONS
// ============================================

function resetProject() {
    availableLayers = [
        { id: 'manholes', name: 'waste_water_manhole', type: 'point', visible: true, color: '#28a745' },
        { id: 'pipelines', name: 'waste_water_pipeline', type: 'line', visible: true, color: '#2b7bff' },
        { id: 'suburbs', name: 'suburbs_boundary', type: 'polygon', visible: false, color: '#ffc107' }
    ];
    layerVisibility = { manholes: true, pipelines: true, suburbs: false };
    refreshLayerList();
    alert('Project reset to default');
}

function saveProject() {
    const project = { layers: availableLayers, visibility: layerVisibility, savedAt: new Date().toISOString() };
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
    refreshLayerList();
    initMenuDropdown();
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
    toggleLayer: toggleLayer
};
