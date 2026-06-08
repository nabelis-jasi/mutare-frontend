// main.js - Main orchestrator for Mutare Sewer Dashboard
// Connects to Python Flask backend on port 5000

import Header from './components/header.js';
import Filters from './components/filters.js';
import LayerManager from './components/layermanager.js';
import MapView from './components/mapview.js';
import Statistics from './components/statistics.js';
import Hotspots from './components/hotspots.js';
import Reports from './components/reports.js';
import ReportProcessor from './components/reportprocessor.js';

// ============================================
// API CONFIGURATION – PYTHON BACKEND
// ============================================

const API_BASE_URL = 'http://localhost:5000/api';

console.log('Imports loaded:', {
    Header: !!Header,
    Filters: !!Filters,
    LayerManager: !!LayerManager,
    MapView: !!MapView,
    Statistics: !!Statistics,
    Hotspots: !!Hotspots,
    Reports: !!Reports,
    ReportProcessor: !!ReportProcessor,
});

// ============================================
// RENDER ALL COMPONENTS
// ============================================

function renderComponents() {
    console.log('Rendering components...');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer && Header && Header.render) {
        headerContainer.innerHTML = Header.render();
        console.log('Header rendered');
    }

    const layermanagerContainer = document.getElementById('layermanager-container');
    if (layermanagerContainer && LayerManager && LayerManager.render) {
        layermanagerContainer.innerHTML = LayerManager.render();
        console.log('LayerManager rendered');
    }

    const filtersContainer = document.getElementById('filters-container');
    if (filtersContainer && Filters && Filters.render) {
        filtersContainer.innerHTML = Filters.render();
        console.log('Filters HTML rendered');
    } else {
        console.error('Filters container or render method not found!');
    }

    const reportProcessorContainer = document.getElementById('reportprocessor-container');
    if (reportProcessorContainer && ReportProcessor && ReportProcessor.render) {
        reportProcessorContainer.innerHTML = ReportProcessor.render();
        console.log('ReportProcessor rendered');
    } else {
        console.error('ReportProcessor container or render method not found!');
    }

    const toolbarContainer = document.getElementById('toolbar-container');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = `
            <div class="toolbar">
                <div id="menu-container" class="toolbar-menu-container"></div>
                <button id="fitBoundsBtn" title="Fit map to all assets">🎯 FIT ALL</button>
                <button id="heatmapBtn" title="Show heatmap of blockages">🔥 SHOW HEATMAP</button>
                <button id="clearHeatmapBtn" title="Clear heatmap">❌ CLEAR HEATMAP</button>
                <button id="exportGeoJSONBtn" title="Export current view as GeoJSON">📎 EXPORT GEOJSON</button>
                <button id="printMapBtn" title="Print map">🖨️ PRINT MAP</button>
            </div>
        `;
    }

    const menuContainer = document.getElementById('menu-container');
    if (menuContainer && LayerManager && LayerManager.renderMenuIcon) {
        menuContainer.innerHTML = LayerManager.renderMenuIcon();
    }

    const mapContainer = document.getElementById('map-container');
    if (mapContainer && !document.getElementById('map')) {
        mapContainer.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';
    }

    const statusContainer = document.getElementById('status-container');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="status-bar">
                <span id="coordStatus">📍 Ready | Map loading...</span>
            </div>
        `;
    }

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
// DATA FETCHING
// ============================================

async function fetchAllManholes() {
    try {
        const res = await fetch(`${API_BASE_URL}/manholes_all`);

        if (!res.ok) throw new Error('Failed to fetch manholes');

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            id: f.properties.manhole_id || f.properties.id,
            type: 'manhole'
        }));

    } catch (err) {
        console.error('fetchAllManholes error:', err);
        return [];
    }
}

async function fetchAllPipelines() {
    try {
        const res = await fetch(`${API_BASE_URL}/pipelines_all`);

        if (!res.ok) throw new Error('Failed to fetch pipelines');

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            geometry: f.geometry,
            type: 'pipeline',
            lat: f.geometry.coordinates[0]?.[1] || f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]?.[0] || f.geometry.coordinates[0]
        }));

    } catch (err) {
        console.error('fetchAllPipelines error:', err);
        return [];
    }
}

async function fetchAllSuburbs() {
    try {
        const res = await fetch(`${API_BASE_URL}/suburbs_all`);

        if (!res.ok) throw new Error('Failed to fetch suburbs');

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            geometry: f.geometry,
            type: 'suburb'
        }));

    } catch (err) {
        console.error('fetchAllSuburbs error:', err);
        return [];
    }
}

async function fetchAllJobs() {
    try {
        const res = await fetch(`${API_BASE_URL}/jobs_all`);

        if (!res.ok) return [];

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            type: 'job'
        }));

    } catch (err) {
        console.warn('Job logs not available:', err);
        return [];
    }
}

async function fetchAllComplaints() {
    try {
        const res = await fetch(`${API_BASE_URL}/complaints_all`);

        if (!res.ok) return [];

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            type: 'complaint'
        }));

    } catch (err) {
        console.warn('Complaints not available:', err);
        return [];
    }
}

// ============================================
// INITIALIZE COMPONENTS
// ============================================

async function initComponents() {

    console.log('Initializing components...');

    // MAP
    if (MapView && typeof MapView.init === 'function') {

        console.log('Initializing map...');

        const map = MapView.init(-18.9735, 32.6705, 13);

        if (map) {
            console.log('Map initialized');
        } else {
            console.error('Map initialization failed');
        }

    } else {
        console.error('MapView.init is not a function!', MapView);
    }

    // FILTERS
    if (Filters && typeof Filters.init === 'function') {
        console.log('Initializing filters...');
        Filters.init();
    }

    // REPORT PROCESSOR
    if (ReportProcessor && typeof ReportProcessor.init === 'function') {
        console.log('Initializing report processor...');
        ReportProcessor.init();
    }

    // LAYER MANAGER
    if (LayerManager && typeof LayerManager.init === 'function') {
        console.log('Initializing layer manager...');
        LayerManager.init();
    }

    // STATISTICS
    if (Statistics && typeof Statistics.init === 'function') {
        console.log('Initializing statistics...');
        await Statistics.init();
    }

    // HOTSPOTS
    if (Hotspots && typeof Hotspots.init === 'function') {
        console.log('Initializing hotspots...');
        Hotspots.init();

        const manholes = await fetchAllManholes();

        if (Hotspots.update) {
            Hotspots.update(manholes);
        }
    }

    // REPORTS
    if (Reports && typeof Reports.init === 'function') {
        console.log('Initializing reports...');
        await Reports.init();
    }

    console.log('All components initialized');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {

    const fitBoundsBtn = document.getElementById('fitBoundsBtn');

    if (fitBoundsBtn) {
        fitBoundsBtn.addEventListener('click', () => {
            if (MapView && MapView.fitToBounds) {
                MapView.fitToBounds();
            }
        });
    }

    const heatmapBtn = document.getElementById('heatmapBtn');

    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', async () => {

            const manholes = await fetchAllManholes();

            if (MapView && MapView.showHeatmapFromManholes) {
                MapView.showHeatmapFromManholes(manholes);
            }
        });
    }

    const clearHeatmapBtn = document.getElementById('clearHeatmapBtn');

    if (clearHeatmapBtn) {
        clearHeatmapBtn.addEventListener('click', () => {
            if (MapView && MapView.clearHeatmap) {
                MapView.clearHeatmap();
            }
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
            alert('GeoJSON export coming soon');
        });
    }

    // BASE MAP SWITCHER
    document.addEventListener('change', function(e) {

        if (e.target && e.target.id === 'baseMapSelect') {

            if (MapView && MapView.switchBaseMap) {
                MapView.switchBaseMap(e.target.value);
            }
        }
    });

    // FILTER CHANGES
    document.addEventListener('filtersChanged', async (event) => {

        console.log('Filters changed:', event.detail);

        const manholes = await fetchAllManholes();

        if (Hotspots && Hotspots.update) {
            Hotspots.update(manholes);
        }

        if (Statistics && Statistics.update) {
            Statistics.update();
        }
    });

    // ZOOM TO LOCATION
    document.addEventListener('zoomToLocation', (event) => {

        const { lat, lng, zoom } = event.detail;

        if (MapView && MapView.getMap) {

            const map = MapView.getMap();

            if (map && map.setView) {
                map.setView([lat, lng], zoom || 18);
            }
        }
    });

    // LAYER TOGGLED
    document.addEventListener('layerToggled', async (event) => {
        console.log(`Layer ${event.detail.layerId} toggled: ${event.detail.visible}`);
    });

    // MAP DATA REFRESHED
    document.addEventListener('mapDataRefreshed', (event) => {
        console.log('Map data refreshed:', event.detail);
    });

    // SHOW COMPLAINT BUFFERS
    document.addEventListener('showComplaintBuffers', (event) => {

        console.log('Received showComplaintBuffers event:', event.detail);

        if (MapView && MapView.showComplaintsWithBuffers) {

            MapView.showComplaintsWithBuffers(
                event.detail.complaints,
                event.detail.reportDate
            );

        } else {
            console.warn('MapView.showComplaintsWithBuffers not available');
        }
    });
}

// ============================================
// MAIN INIT
// ============================================

async function init() {

    console.log('Initializing Mutare Sewer Dashboard...');

    if (typeof L === 'undefined') {

        console.error('Leaflet (L) is not loaded!');
        alert('Leaflet library not found. Please check network.');

        return;
    }

    renderComponents();

    await initComponents();

    setupEventListeners();

    console.log('Dashboard ready! Backend API:', API_BASE_URL);
}

// ============================================
// START APP
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}