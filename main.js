// main.js - Main orchestrator for Mutare Sewer Dashboard
import Header from './components/header.js';
import Filters from './components/filters.js';
import LayerManager from './components/layermanager.js';
import MapView from './components/mapview.js';
import Statistics from './components/statistics.js';
import Hotspots from './components/hotspots.js';
import Reports from './components/reports.js';

// Render all components
function renderComponents() {
    // Left panel
    document.getElementById('header-container').innerHTML = Header.render();
    document.getElementById('filters-container').innerHTML = Filters.render();
    document.getElementById('layermanager-container').innerHTML = LayerManager.render();
    
    // Main content
    document.getElementById('toolbar-container').innerHTML = `
        <div class="toolbar">
            <button id="fitBoundsBtn">🎯 FIT ALL</button>
            <button id="heatmapBtn">🔥 SHOW HEATMAP</button>
            <button id="clearHeatmapBtn">❌ CLEAR HEATMAP</button>
            <button id="exportGeoJSONBtn">📎 EXPORT GEOJSON</button>
            <button id="printMapBtn">🖨️ PRINT MAP</button>
        </div>
    `;
    document.getElementById('map-container').innerHTML = '<div id="map"></div>';
    document.getElementById('status-container').innerHTML = '<div class="status-bar"><span id="coordStatus">READY | Map loaded</span></div>';
    
    // Right panel
    document.getElementById('statistics-container').innerHTML = Statistics.render();
    document.getElementById('hotspots-container').innerHTML = Hotspots.render();
    document.getElementById('reports-container').innerHTML = Reports.render();
}

// Initialize all functionality
function initComponents() {
    // Initialize map first
    if (MapView.init) MapView.init();
    
    // Initialize filters
    if (Filters.init) Filters.init();
    
    // Initialize layer manager
    if (LayerManager.init) LayerManager.init();
    
    // Initialize statistics
    if (Statistics.init) Statistics.init();
    
    // Initialize hotspots
    if (Hotspots.init) Hotspots.init();
    
    // Initialize reports
    if (Reports.init) Reports.init();
}

// Setup global event listeners
function setupEventListeners() {
    // Toolbar buttons
    document.getElementById('fitBoundsBtn')?.addEventListener('click', () => {
        if (MapView.fitToBounds) MapView.fitToBounds();
    });
    
    document.getElementById('heatmapBtn')?.addEventListener('click', () => {
        if (MapView.showHeatmap) MapView.showHeatmap();
    });
    
    document.getElementById('clearHeatmapBtn')?.addEventListener('click', () => {
        if (MapView.clearHeatmap) MapView.clearHeatmap();
    });
    
    document.getElementById('printMapBtn')?.addEventListener('click', () => {
        window.print();
    });
    
    // Listen for filter changes
    document.addEventListener('filtersChanged', (event) => {
        const { manholes, pipelines } = event.detail;
        if (MapView.updateLayers) MapView.updateLayers(manholes, pipelines);
        if (Statistics.update) Statistics.update(manholes);
        if (Hotspots.update) Hotspots.update(manholes);
    });
}

// Start the application
function init() {
    renderComponents();
    initComponents();
    setupEventListeners();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
