// main.js - Main orchestrator for Mutare Sewer Dashboard

import Header from './components/header.js';
import Filters from './components/filters.js';
import LayerManager from './components/layermanager.js';
import MapView from './components/mapview.js';
import Statistics from './components/statistics.js';
import Hotspots from './components/hotspots.js';
import Reports from './components/reports.js';

// Mock data for testing
const mockManholes = [
    { id: 1, name: 'MH-001', suburb: 'CBD', diameter: 150, status: 'critical', blockages: 12, lat: -18.9735, lng: 32.6705 },
    { id: 2, name: 'MH-002', suburb: 'Sakubva', diameter: 100, status: 'warning', blockages: 5, lat: -18.9750, lng: 32.6720 },
    { id: 3, name: 'MH-003', suburb: 'Dangamvura', diameter: 80, status: 'good', blockages: 3, lat: -18.9780, lng: 32.6750 },
    { id: 4, name: 'MH-004', suburb: 'CBD', diameter: 120, status: 'critical', blockages: 15, lat: -18.9700, lng: 32.6660 },
    { id: 5, name: 'MH-005', suburb: 'Chikanga', diameter: 130, status: 'warning', blockages: 7, lat: -18.9650, lng: 32.6600 }
];

const mockPipelines = [
    { id: 1, name: 'PL-001', status: 'warning', coordinates: [[-18.9735, 32.6705], [-18.9750, 32.6720]] },
    { id: 2, name: 'PL-002', status: 'good', coordinates: [[-18.9750, 32.6720], [-18.9780, 32.6750]] },
    { id: 3, name: 'PL-003', status: 'critical', coordinates: [[-18.9735, 32.6705], [-18.9700, 32.6660]] }
];

console.log('Imports loaded:', {
    Header: !!Header,
    Filters: !!Filters,
    LayerManager: !!LayerManager,
    MapView: !!MapView,
    Statistics: !!Statistics,
    Hotspots: !!Hotspots,
    Reports: !!Reports
});

// ============================================
// RENDER ALL COMPONENTS
// ============================================

function renderComponents() {
    console.log('Rendering components...');
    
    // LEFT PANEL - Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer && Header && Header.render) {
        headerContainer.innerHTML = Header.render();
        console.log('Header rendered');
    }
    
    // LEFT PANEL - Filters (IMPORTANT: This renders the FILTER button and modal)
    const filtersContainer = document.getElementById('filters-container');
    if (filtersContainer && Filters && Filters.render) {
        filtersContainer.innerHTML = Filters.render();
        console.log('Filters HTML rendered - Filter button should appear');
    } else {
        console.error('Filters container or render method not found!');
    }
    
    // LEFT PANEL - Layer Manager
    const layermanagerContainer = document.getElementById('layermanager-container');
    if (layermanagerContainer && LayerManager && LayerManager.render) {
        layermanagerContainer.innerHTML = LayerManager.render();
        console.log('LayerManager rendered');
    }
    
    // TOOLBAR WITH MENU ICON
    const toolbarContainer = document.getElementById('toolbar-container');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = `
            <div class="toolbar">
                <div id="menu-container" class="toolbar-menu-container"></div>
                <button id="fitBoundsBtn">🎯 FIT ALL</button>
                <button id="heatmapBtn">🔥 SHOW HEATMAP</button>
                <button id="clearHeatmapBtn">❌ CLEAR HEATMAP</button>
                <button id="exportGeoJSONBtn">📎 EXPORT GEOJSON</button>
                <button id="printMapBtn">🖨️ PRINT MAP</button>
            </div>
        `;
    }
    
    // Add Menu Icon to the toolbar container
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer && LayerManager && LayerManager.renderMenuIcon) {
        menuContainer.innerHTML = LayerManager.renderMenuIcon();
    }
    
    // MAP CONTAINER
    const mapContainer = document.getElementById('map-container');
    if (mapContainer && !document.getElementById('map')) {
        mapContainer.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';
    }
    
    // STATUS BAR
    const statusContainer = document.getElementById('status-container');
    if (statusContainer) {
        statusContainer.innerHTML = '<div class="status-bar"><span id="coordStatus">📍 Ready | Map loaded</span></div>';
    }
    
    // RIGHT PANEL
    const statisticsContainer = document.getElementById('statistics-container');
    if (statisticsContainer && Statistics && Statistics.render) {
        statisticsContainer.innerHTML = Statistics.render();
    }
    
    const hotspotsContainer = document.getElementById('hotspots-container');
    if (hotspotsContainer && Hotspots && Hotspots.render) {
        hotspotsContainer.innerHTML = Hotspots.render();
    }
    
    const reportsContainer = document.getElementById('reports-container');
    if (reportsContainer && Reports && Reports.render) {
        reportsContainer.innerHTML = Reports.render();
    }
    
    console.log('Components rendered');
}

// ============================================
// INITIALIZE ALL COMPONENTS
// ============================================

function initComponents() {
    console.log('Initializing components...');
    
    // Initialize Map (MUST BE FIRST)
    if (MapView && typeof MapView.init === 'function') {
        console.log('Initializing map...');
        const map = MapView.init(-18.9735, 32.6705, 13);
        if (map) {
            console.log('Map initialized successfully');
            MapView.loadManholes(mockManholes);
            MapView.loadPipelines(mockPipelines);
        } else {
            console.error('Map initialization failed');
        }
    } else {
        console.error('MapView.init is not a function!', MapView);
    }
    
    // Initialize Filters (THIS ATTACHES THE CLICK EVENT TO THE FILTER BUTTON)
    if (Filters && typeof Filters.init === 'function') {
        console.log('Initializing filters - this attaches the click event to the FILTER button');
        Filters.init();
    } else {
        console.error('Filters.init is not a function!', Filters);
    }
    
    // Initialize Layer Manager
    if (LayerManager && typeof LayerManager.init === 'function') {
        console.log('Initializing layer manager...');
        LayerManager.init();
    } else {
        console.error('LayerManager.init is not a function!', LayerManager);
    }
    
    // Initialize Statistics
    if (Statistics && typeof Statistics.init === 'function') {
        console.log('Initializing statistics...');
        Statistics.init();
        Statistics.update(mockManholes, mockPipelines, []);
    }
    
    // Initialize Hotspots
    if (Hotspots && typeof Hotspots.init === 'function') {
        console.log('Initializing hotspots...');
        Hotspots.init();
        Hotspots.update(mockManholes);
    }
    
    // Initialize Reports
    if (Reports && typeof Reports.init === 'function') {
        console.log('Initializing reports...');
        Reports.init();
    }
    
    console.log('All components initialized');
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Toolbar buttons
    const fitBoundsBtn = document.getElementById('fitBoundsBtn');
    if (fitBoundsBtn) {
        fitBoundsBtn.addEventListener('click', () => {
            if (MapView && MapView.fitToBounds) MapView.fitToBounds();
        });
    }
    
    const heatmapBtn = document.getElementById('heatmapBtn');
    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', () => {
            let manholes = mockManholes;
            if (Filters && Filters.getFilteredManholes) {
                const filtered = Filters.getFilteredManholes();
                if (filtered && filtered.length > 0) manholes = filtered;
            }
            if (MapView && MapView.showHeatmapFromManholes) {
                MapView.showHeatmapFromManholes(manholes);
            }
        });
    }
    
    const clearHeatmapBtn = document.getElementById('clearHeatmapBtn');
    if (clearHeatmapBtn) {
        clearHeatmapBtn.addEventListener('click', () => {
            if (MapView && MapView.clearHeatmap) MapView.clearHeatmap();
        });
    }
    
    const printMapBtn = document.getElementById('printMapBtn');
    if (printMapBtn) {
        printMapBtn.addEventListener('click', () => window.print());
    }
    
    const exportGeoJSONBtn = document.getElementById('exportGeoJSONBtn');
    if (exportGeoJSONBtn) {
        exportGeoJSONBtn.addEventListener('click', () => {
            alert('Export GeoJSON - Will export current map data');
        });
    }
    
    // Base map switcher
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'baseMapSelect') {
            if (MapView && MapView.switchBaseMap) MapView.switchBaseMap(e.target.value);
        }
    });
    
    // Listen for filter changes
    document.addEventListener('filtersChanged', (event) => {
        console.log('Filters changed:', event.detail);
        let { manholes, pipelines } = event.detail;
        if (!manholes || manholes.length === 0) manholes = mockManholes;
        if (!pipelines || pipelines.length === 0) pipelines = mockPipelines;
        
        if (MapView && MapView.updateLayers) MapView.updateLayers(manholes, pipelines);
        if (Statistics && Statistics.update) Statistics.update(manholes, pipelines, []);
        if (Hotspots && Hotspots.update) Hotspots.update(manholes);
    });
    
    // Zoom to location event
    document.addEventListener('zoomToLocation', (event) => {
        const { lat, lng, zoom } = event.detail;
        if (MapView && MapView.getMap) {
            const map = MapView.getMap();
            if (map && typeof map.setView === 'function') map.setView([lat, lng], zoom || 18);
        }
    });
    
    // Listen for layer toggles
    document.addEventListener('layerToggled', (event) => {
        const { layerId, visible } = event.detail;
        console.log(`Layer ${layerId} toggled: ${visible}`);
        if (Filters && Filters.getFilteredManholes) {
            const manholes = Filters.getFilteredManholes();
            const pipelines = Filters.getFilteredPipelines();
            if (MapView && MapView.updateLayers) MapView.updateLayers(manholes, pipelines);
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    console.log('Initializing Mutare Sewer Dashboard...');
    
    if (typeof L === 'undefined') {
        console.error('Leaflet (L) is not loaded!');
        alert('Leaflet library not loaded. Please refresh the page.');
        return;
    }
    
    renderComponents();
    initComponents();
    setupEventListeners();
    
    console.log('Dashboard ready!');
    console.log('Click the "🔍 FILTER" button in the left panel to open the filter modal');
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
