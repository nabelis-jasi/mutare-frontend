// main.js - Main orchestrator for Mutare Sewer Dashboard

import Header from './components/header.js';
import Filters from './components/filters.js';
import LayerManager from './components/layermanager.js';
import MapView from './components/mapview.js';
import Statistics from './components/statistics.js';
import Hotspots from './components/hotspots.js';
import Reports from './components/reports.js';
import ReportProcessor from './components/reportprocessor.js';
import DBConfig from './components/dbconfig.js';

// ============================================
// API CONFIGURATION (adjust to your backend URL)
// ============================================
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://mutare-backend.onrender.com/api';   // change to your deployed backend

console.log('Imports loaded:', {
    Header: !!Header,
    Filters: !!Filters,
    LayerManager: !!LayerManager,
    MapView: !!MapView,
    Statistics: !!Statistics,
    Hotspots: !!Hotspots,
    Reports: !!Reports,
    ReportProcessor: !!ReportProcessor
});

// ============================================
// RENDER ALL COMPONENTS (unchanged)
// ============================================

function renderComponents() {
    console.log('Rendering components...');
    
    // LEFT PANEL - Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer && Header && Header.render) {
        headerContainer.innerHTML = Header.render();
        console.log('Header rendered');
    }
    
    // LEFT PANEL - Layer Manager
    const layermanagerContainer = document.getElementById('layermanager-container');
    if (layermanagerContainer && LayerManager && LayerManager.render) {
        layermanagerContainer.innerHTML = LayerManager.render();
        console.log('LayerManager rendered');
    }
    
    // LEFT PANEL - Filters (FILTER button and modal)
    const filtersContainer = document.getElementById('filters-container');
    if (filtersContainer && Filters && Filters.render) {
        filtersContainer.innerHTML = Filters.render();
        console.log('Filters HTML rendered - Filter button should appear');
    } else {
        console.error('Filters container or render method not found!');
    }
    
    // LEFT PANEL - Report Processor (BELOW FILTERS)
    const reportProcessorContainer = document.getElementById('reportprocessor-container');
    if (reportProcessorContainer && ReportProcessor && ReportProcessor.render) {
        reportProcessorContainer.innerHTML = ReportProcessor.render();
        console.log('ReportProcessor rendered');
    } else {
        console.error('ReportProcessor container or render method not found!');
    }
    
    // TOOLBAR (DBConfig is rendered inside)
    const toolbarContainer = document.getElementById('toolbar-container');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = `
            <div class="toolbar">
                <div id="menu-container" class="toolbar-menu-container"></div>
                ${DBConfig.render()}
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
// DATA FETCHING HELPERS
// ============================================

async function fetchAllAssets() {
    const response = await fetch(`${API_BASE_URL}/assets`);
    if (!response.ok) throw new Error('Failed to fetch assets');
    return await response.json();
}

async function fetchAllJobs() {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return await response.json();
}

async function loadInitialMapData() {
    try {
        const assets = await fetchAllAssets();
        const manholes = assets.filter(a => a.asset_type === 'manhole');
        const pipelines = assets.filter(a => a.asset_type === 'pipeline');
        
        if (MapView && MapView.loadManholes) MapView.loadManholes(manholes);
        if (MapView && MapView.loadPipelines) MapView.loadPipelines(pipelines);
        
        return { manholes, pipelines };
    } catch (err) {
        console.error('Failed to load initial map data:', err);
        return { manholes: [], pipelines: [] };
    }
}

// ============================================
// INITIALIZE ALL COMPONENTS
// ============================================

async function initComponents() {
    console.log('Initializing components...');
    
    // Initialize Map (MUST BE FIRST)
    if (MapView && typeof MapView.init === 'function') {
        console.log('Initializing map...');
        const map = MapView.init(-18.9735, 32.6705, 13);
        if (map) {
            console.log('Map initialized successfully');
            const { manholes, pipelines } = await loadInitialMapData();
            // If data is already loaded by loadInitialMapData, we can still call updateLayers
            if (MapView.updateLayers) MapView.updateLayers(manholes, pipelines);
        } else {
            console.error('Map initialization failed');
        }
    } else {
        console.error('MapView.init is not a function!', MapView);
    }
    
    // Initialize Filters
    if (Filters && typeof Filters.init === 'function') {
        console.log('Initializing filters...');
        Filters.init();
    } else {
        console.error('Filters.init is not a function!', Filters);
    }
    
    // Initialize Report Processor
    if (ReportProcessor && typeof ReportProcessor.init === 'function') {
        console.log('Initializing report processor...');
        ReportProcessor.init();
    } else {
        console.error('ReportProcessor.init is not a function!', ReportProcessor);
    }
    
    // Initialize DBConfig
    if (DBConfig && typeof DBConfig.init === 'function') {
        DBConfig.init();
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
        // Initial statistics will be populated after first filter change or data load
        const jobs = await fetchAllJobs().catch(() => []);
        const assets = await fetchAllAssets().catch(() => []);
        const manholes = assets.filter(a => a.asset_type === 'manhole');
        const pipelines = assets.filter(a => a.asset_type === 'pipeline');
        if (Statistics.update) Statistics.update(manholes, pipelines, jobs);
    }
    
    // Initialize Hotspots
    if (Hotspots && typeof Hotspots.init === 'function') {
        console.log('Initializing hotspots...');
        Hotspots.init();
        const assets = await fetchAllAssets().catch(() => []);
        const manholes = assets.filter(a => a.asset_type === 'manhole');
        if (Hotspots.update) Hotspots.update(manholes);
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
        heatmapBtn.addEventListener('click', async () => {
            let manholes = [];
            try {
                // Get currently filtered manholes (or all if no filter active)
                if (Filters && Filters.getFilteredManholes) {
                    manholes = await Filters.getFilteredManholes();
                } else {
                    const assets = await fetchAllAssets();
                    manholes = assets.filter(a => a.asset_type === 'manhole');
                }
            } catch (err) {
                console.error('Error fetching manholes for heatmap:', err);
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
    
    // Listen for filter changes (from Filters component)
    document.addEventListener('filtersChanged', async (event) => {
        console.log('Filters changed:', event.detail);
        let { manholes, pipelines } = event.detail;
        // The event already contains the filtered data from the Filters component (which now uses API)
        if (!manholes || manholes.length === 0) {
            // Fallback: fetch all manholes
            const assets = await fetchAllAssets().catch(() => []);
            manholes = assets.filter(a => a.asset_type === 'manhole');
        }
        if (!pipelines || pipelines.length === 0) {
            const assets = await fetchAllAssets().catch(() => []);
            pipelines = assets.filter(a => a.asset_type === 'pipeline');
        }
        
        if (MapView && MapView.updateLayers) MapView.updateLayers(manholes, pipelines);
        
        // Update statistics and hotspots with filtered data
        const jobs = await fetchAllJobs().catch(() => []);
        if (Statistics && Statistics.update) Statistics.update(manholes, pipelines, jobs);
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
    document.addEventListener('layerToggled', async (event) => {
        const { layerId, visible } = event.detail;
        console.log(`Layer ${layerId} toggled: ${visible}`);
        // Re-fetch current filtered data (could be expensive; you may want to cache)
        if (Filters && Filters.getFilteredManholes) {
            const manholes = await Filters.getFilteredManholes().catch(() => []);
            const pipelines = await Filters.getFilteredPipelines().catch(() => []);
            if (MapView && MapView.updateLayers) MapView.updateLayers(manholes, pipelines);
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    console.log('Initializing Mutare Sewer Dashboard...');
    
    if (typeof L === 'undefined') {
        console.error('Leaflet (L) is not loaded!');
        alert('Leaflet library not loaded. Please refresh the page.');
        return;
    }
    
    renderComponents();
    await initComponents();   // now async
    setupEventListeners();
    
    console.log('Dashboard ready!');
    console.log('Click the "🔍 FILTER" button in the left panel to open the filter modal');
    console.log('Click the "🔍 PROCESS REPORT" button to process daily reports');
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
