// main.js - Main orchestrator for Mutare Sewer Dashboard (Web Version)

import Header from './components/header.js';
import Filters from './components/filters.js';
import LayerManager from './components/layermanager.js';
import MapView from './components/mapview.js';
import Statistics from './components/statistics.js';
import Hotspots from './components/hotspots.js';
import Reports from './components/reports.js';

// ============================================
// RENDER ALL COMPONENTS
// ============================================

function renderComponents() {
    // Left Panel
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = Header.render();
    
    // Filters container - filters.js builds its own UI inside this container
    const filtersContainer = document.getElementById('filters-container');
    if (filtersContainer) filtersContainer.innerHTML = '<div id="accordion-filters-container" class="accordion-filters"></div>';
    
    // Layer Manager Container
    const layermanagerContainer = document.getElementById('layermanager-container');
    if (layermanagerContainer) layermanagerContainer.innerHTML = LayerManager.render();
    
    // Main Content - Toolbar
    const toolbarContainer = document.getElementById('toolbar-container');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = `
            <div class="toolbar">
                <button id="fitBoundsBtn">🎯 FIT ALL</button>
                <button id="heatmapBtn">🔥 SHOW HEATMAP</button>
                <button id="clearHeatmapBtn">❌ CLEAR HEATMAP</button>
                <button id="exportGeoJSONBtn">📎 EXPORT GEOJSON</button>
                <button id="printMapBtn">🖨️ PRINT MAP</button>
            </div>
        `;
    }
    
    // Map Container
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) mapContainer.innerHTML = '<div id="map"></div>';
    
    // Status Container
    const statusContainer = document.getElementById('status-container');
    if (statusContainer) statusContainer.innerHTML = '<div class="status-bar"><span id="coordStatus">READY | Map loaded</span></div>';
    
    // Right Panel - Statistics, Hotspots, Reports
    const statisticsContainer = document.getElementById('statistics-container');
    if (statisticsContainer) statisticsContainer.innerHTML = Statistics.render();
    
    const hotspotsContainer = document.getElementById('hotspots-container');
    if (hotspotsContainer) hotspotsContainer.innerHTML = Hotspots.render();
    
    const reportsContainer = document.getElementById('reports-container');
    if (reportsContainer) reportsContainer.innerHTML = Reports.render();
}

// ============================================
// INITIALIZE ALL COMPONENTS
// ============================================

function initComponents() {
    // Initialize Map first
    if (MapView && MapView.init) {
        MapView.init(-18.9735, 32.6705, 13);
    }
    
    // Initialize Filters (this builds the accordion UI)
    if (Filters && Filters.init) {
        Filters.init();
    }
    
    // Initialize Layer Manager
    if (LayerManager && LayerManager.init) {
        LayerManager.init();
    }
    
    // Initialize Statistics
    if (Statistics && Statistics.init) {
        Statistics.init();
    }
    
    // Initialize Hotspots
    if (Hotspots && Hotspots.init) {
        Hotspots.init();
    }
    
    // Initialize Reports
    if (Reports && Reports.init) {
        Reports.init();
    }
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
            // Get current manholes from Filters module
            if (Filters && Filters.getFilteredManholes) {
                const manholes = Filters.getFilteredManholes();
                if (MapView && MapView.showHeatmapFromManholes) {
                    MapView.showHeatmapFromManholes(manholes);
                } else if (MapView && MapView.addHeatmap) {
                    const heatPoints = manholes.map(m => [m.lat, m.lng, m.blockages || 1]);
                    MapView.addHeatmap(heatPoints);
                }
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
        printMapBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    const exportGeoJSONBtn = document.getElementById('exportGeoJSONBtn');
    if (exportGeoJSONBtn) {
        exportGeoJSONBtn.addEventListener('click', () => {
            alert('Export GeoJSON - Will export current map data');
        });
    }
    
    // Base map switcher (delegated event)
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'baseMapSelect') {
            const tileType = e.target.value;
            if (MapView && MapView.switchBaseMap) MapView.switchBaseMap(tileType);
        }
    });
    
    // Listen for filter changes from Filters module
    document.addEventListener('filtersChanged', (event) => {
        const { manholes, pipelines } = event.detail;
        
        // Update map layers
        if (MapView && MapView.updateLayers) {
            MapView.updateLayers(manholes, pipelines);
        }
        
        // Update statistics
        if (Statistics && Statistics.update) {
            Statistics.update(manholes, pipelines, []);
        }
        
        // Update hotspots
        if (Hotspots && Hotspots.update) {
            Hotspots.update(manholes);
        }
        
        // Update reports data
        if (Reports && Reports.update) {
            Reports.update(manholes, pipelines);
        }
    });
    
    // Listen for layer toggles from LayerManager
    document.addEventListener('layerToggled', (event) => {
        const { layerId, visible } = event.detail;
        console.log(`Layer ${layerId} toggled: ${visible}`);
        // Re-filter and update map based on layer visibility
        if (Filters && Filters.getFilteredManholes) {
            const manholes = Filters.getFilteredManholes();
            const pipelines = Filters.getFilteredPipelines();
            if (MapView && MapView.updateLayers) {
                MapView.updateLayers(manholes, pipelines);
            }
        }
    });
}

// ============================================
// LOAD SAMPLE DATA (for testing)
// ============================================

function loadSampleData() {
    // Trigger initial filter change to load sample data
    setTimeout(() => {
        if (Filters && Filters.getFilteredManholes) {
            const manholes = Filters.getFilteredManholes();
            const pipelines = Filters.getFilteredPipelines();
            
            // Update map
            if (MapView && MapView.updateLayers) {
                MapView.updateLayers(manholes, pipelines);
            }
            
            // Update statistics
            if (Statistics && Statistics.update) {
                Statistics.update(manholes, pipelines, []);
            }
            
            // Update hotspots
            if (Hotspots && Hotspots.update) {
                Hotspots.update(manholes);
            }
        }
    }, 500);
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    console.log('Initializing Mutare Sewer Dashboard...');
    
    // Render all HTML components
    renderComponents();
    
    // Initialize all component logic
    initComponents();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load sample data
    loadSampleData();
    
    console.log('Dashboard ready!');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
