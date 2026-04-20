// main.js - Main orchestrator for Mutare Sewer Dashboard

import Header from './components/header.js';
import Filters from './components/filters.js';
import LayerManager from './components/layermanager.js';
import MapView from './components/mapview.js';
import Statistics from './components/statistics.js';
import Hotspots from './components/hotspots.js';
import Reports from './components/reports.js';

// Log imports to verify they loaded
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
    
    // Left Panel
    const headerContainer = document.getElementById('header-container');
    if (headerContainer && Header && Header.render) {
        headerContainer.innerHTML = Header.render();
    }
    
    // Filters container
    const filtersContainer = document.getElementById('filters-container');
    if (filtersContainer) {
        filtersContainer.innerHTML = '<div id="accordion-filters-container" class="accordion-filters"></div>';
    }
    
    // Layer Manager Container
    const layermanagerContainer = document.getElementById('layermanager-container');
    if (layermanagerContainer && LayerManager && LayerManager.render) {
        layermanagerContainer.innerHTML = LayerManager.render();
    }
    
    // Toolbar
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
    if (mapContainer) {
        mapContainer.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';
    }
    
    // Status Container
    const statusContainer = document.getElementById('status-container');
    if (statusContainer) {
        statusContainer.innerHTML = '<div class="status-bar"><span id="coordStatus">READY | Map loading...</span></div>';
    }
    
    // Right Panel
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
        MapView.init(-18.9735, 32.6705, 13);
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
    
    // Initialize Layer Manager
    if (LayerManager && typeof LayerManager.init === 'function') {
        console.log('Initializing layer manager...');
        LayerManager.init();
    }
    
    // Initialize Statistics
    if (Statistics && typeof Statistics.init === 'function') {
        console.log('Initializing statistics...');
        Statistics.init();
    }
    
    // Initialize Hotspots
    if (Hotspots && typeof Hotspots.init === 'function') {
        console.log('Initializing hotspots...');
        Hotspots.init();
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
            if (Filters && Filters.getFilteredManholes) {
                const manholes = Filters.getFilteredManholes();
                if (MapView && MapView.showHeatmapFromManholes) {
                    MapView.showHeatmapFromManholes(manholes);
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
    
    // Base map switcher
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'baseMapSelect') {
            if (MapView && MapView.switchBaseMap) {
                MapView.switchBaseMap(e.target.value);
            }
        }
    });
    
    // Listen for filter changes
    document.addEventListener('filtersChanged', (event) => {
        console.log('Filters changed:', event.detail);
        const { manholes, pipelines } = event.detail;
        
        if (MapView && MapView.updateLayers) {
            MapView.updateLayers(manholes, pipelines);
        }
        
        if (Statistics && Statistics.update) {
            Statistics.update(manholes, pipelines, []);
        }
        
        if (Hotspots && Hotspots.update) {
            Hotspots.update(manholes);
        }
    });
}

// ============================================
// LOAD SAMPLE DATA
// ============================================

function loadSampleData() {
    setTimeout(() => {
        if (Filters && Filters.getFilteredManholes) {
            const manholes = Filters.getFilteredManholes();
            const pipelines = Filters.getFilteredPipelines();
            
            if (MapView && MapView.updateLayers) {
                MapView.updateLayers(manholes, pipelines);
            }
            
            if (Statistics && Statistics.update) {
                Statistics.update(manholes, pipelines, []);
            }
            
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
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet (L) is not loaded! Check your internet connection and Leaflet CDN.');
        alert('Leaflet library not loaded. Please check your internet connection.');
        return;
    }
    
    renderComponents();
    initComponents();
    setupEventListeners();
    loadSampleData();
    
    console.log('Dashboard ready!');
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
