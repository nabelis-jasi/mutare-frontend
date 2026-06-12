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
import Heatmap from './components/heatmap.js';  // NEW - Import heatmap module

// ============================================
// API CONFIGURATION – PYTHON BACKEND
// ============================================

const API_BASE_URL = 'http://192.168.0.195:5000/api';

console.log('Imports loaded:', {
    Header: !!Header,
    Filters: !!Filters,
    LayerManager: !!LayerManager,
    MapView: !!MapView,
    Statistics: !!Statistics,
    Hotspots: !!Hotspots,
    Reports: !!Reports,
    ReportProcessor: !!ReportProcessor,
    Heatmap: !!Heatmap,
});

// Global references
window.mapViewRef = null;
window.statisticsComponent = null;
window.hotspotsComponent = null;
window.heatmapModule = null;  // NEW - Global heatmap reference

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
        console.log('📡 Fetching manholes from:', `${API_BASE_URL}/manholes/geojson?limit=20000`);
        
        const res = await fetch(`${API_BASE_URL}/manholes/geojson?limit=20000`);

        if (!res.ok) {
            console.error('Failed to fetch manholes:', res.status);
            return [];
        }

        const geojson = await res.json();
        console.log('📊 Raw manholes GeoJSON:', {
            features: geojson.features?.length || 0,
            sample: geojson.features?.[0]
        });

        if (!geojson.features || geojson.features.length === 0) {
            console.warn('No manhole features found');
            return [];
        }

        const manholes = geojson.features.map(f => {
            const coords = f.geometry?.coordinates || [];
            return {
                id: f.properties?.manhole_id || f.properties?.id || `mh_${Math.random()}`,
                manhole_id: f.properties?.manhole_id || f.properties?.id,
                lat: coords[1] || 0,
                lng: coords[0] || 0,
                suburb: f.properties?.suburb || f.properties?.suburb_nam || 'Unknown',
                suburb_nam: f.properties?.suburb_nam || f.properties?.suburb || 'Unknown',
                status: f.properties?.status || f.properties?.bloc_stat || 'good',
                bloc_stat: f.properties?.bloc_stat || f.properties?.status || 'good',
                depth: f.properties?.depth || f.properties?.mh_depth,
                inspector: f.properties?.inspector,
                inspection_date: f.properties?.inspection_date
            };
        }).filter(m => m.lat && m.lng && m.lat !== 0 && m.lng !== 0);

        console.log(`✅ Fetched ${manholes.length} valid manholes`);
        return manholes;

    } catch (err) {
        console.error('fetchAllManholes error:', err);
        return [];
    }
}

async function fetchAllPipelines() {
    try {
        const res = await fetch(`${API_BASE_URL}/pipelines/geojson?limit=20000`);

        if (!res.ok) throw new Error('Failed to fetch pipelines');

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            geometry: f.geometry,
            type: 'pipeline',
            lat: f.geometry?.coordinates?.[0]?.[1] || f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0]?.[0] || f.geometry?.coordinates?.[0] || 0
        }));

    } catch (err) {
        console.error('fetchAllPipelines error:', err);
        return [];
    }
}

async function fetchAllSuburbs() {
    try {
        const res = await fetch(`${API_BASE_URL}/suburbs/geojson`);

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
            lat: f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0] || 0,
            type: 'job'
        }));

    } catch (err) {
        console.warn('Job logs not available:', err);
        return [];
    }
}

async function fetchAllComplaints() {
    try {
        const res = await fetch(`${API_BASE_URL}/complaints/geojson`);

        if (!res.ok) return [];

        const geojson = await res.json();

        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0] || 0,
            type: 'complaint'
        }));

    } catch (err) {
        console.warn('Complaints not available:', err);
        return [];
    }
}

// ============================================
// UPDATE STATISTICS FROM MAPVIEW
// ============================================

function updateStatisticsFromMapView() {
    console.log('📊 Updating statistics from mapview...');
    
    if (window.mapViewRef && window.statisticsComponent) {
        // Get current statistics from mapview
        const stats = window.mapViewRef.getCurrentStatistics();
        
        // Update the statistics component DOM directly
        const totalManholesEl = document.getElementById('totalManholes');
        const totalPipelinesEl = document.getElementById('totalPipelines');
        const criticalAssetsEl = document.getElementById('criticalAssets');
        const warningAssetsEl = document.getElementById('warningAssets');
        
        if (totalManholesEl) totalManholesEl.innerText = stats.manholesCount.toLocaleString();
        if (totalPipelinesEl) totalPipelinesEl.innerText = stats.pipelinesCount.toLocaleString();
        if (criticalAssetsEl) criticalAssetsEl.innerText = stats.criticalCount.toLocaleString();
        if (warningAssetsEl) warningAssetsEl.innerText = stats.warningCount.toLocaleString();
        
        console.log('📊 Statistics updated:', stats);
    } else {
        console.warn('MapView or Statistics not available yet');
    }
}

// ============================================
// CONNECT MAPVIEW TO STATISTICS
// ============================================

function connectMapviewToStatistics() {
    console.log('🔗 Connecting MapView to Statistics...');
    
    if (window.mapViewRef && window.statisticsComponent) {
        // Set up event listeners for statistics updates
        document.addEventListener('mapDataRefreshed', () => {
            console.log('🗺️ mapDataRefreshed - updating statistics');
            setTimeout(updateStatisticsFromMapView, 500);
        });
        
        document.addEventListener('filtersChanged', () => {
            console.log('🔍 filtersChanged - updating statistics');
            setTimeout(updateStatisticsFromMapView, 500);
        });
        
        document.addEventListener('statisticsUpdate', () => {
            updateStatisticsFromMapView();
        });
        
        // Initial update
        setTimeout(updateStatisticsFromMapView, 2000);
        
        console.log('✅ MapView connected to Statistics');
    } else {
        console.warn('MapView or Statistics not available, retrying...');
        setTimeout(connectMapviewToStatistics, 1000);
    }
}

// ============================================
// INITIALIZE HEATMAP MODULE
// ============================================

function initHeatmapModule() {
    console.log('🔥 Initializing heatmap module...');
    
    if (window.mapViewRef && window.mapViewRef.getMap()) {
        const map = window.mapViewRef.getMap();
        window.heatmapModule = Heatmap;
        window.heatmapModule.init(map);
        console.log('✅ Heatmap module initialized and ready');
    } else {
        console.warn('Map not ready for heatmap, retrying...');
        setTimeout(initHeatmapModule, 1000);
    }
}

// ============================================
// INITIALIZE COMPONENTS
// ============================================

async function initComponents() {
    console.log('Initializing components...');

    // MAP (initialize first)
    if (MapView && typeof MapView.init === 'function') {
        console.log('Initializing map...');
        const map = MapView.init(-18.9735, 32.6705, 13);
        if (map) {
            console.log('Map initialized');
            window.mapViewRef = MapView;
            
            // Initialize heatmap after map is ready
            setTimeout(initHeatmapModule, 500);
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
        window.statisticsComponent = Statistics;
        console.log('✅ Statistics component registered');
    }

    // HOTSPOTS
    if (Hotspots && typeof Hotspots.init === 'function') {
        console.log('Initializing hotspots...');
        Hotspots.init();
        window.hotspotsComponent = Hotspots;
        console.log('✅ Hotspots component registered');

        const manholes = await fetchAllManholes();
        console.log(`📊 Fetched ${manholes.length} manholes for hotspots`);

        if (manholes.length > 0) {
            if (Hotspots.update) {
                Hotspots.update(manholes);
                console.log(`🔥 Hotspots updated with ${manholes.length} manholes`);
            }
        } else {
            console.warn('⚠️ No manhole data available for hotspots');
        }
    }

    // REPORTS
    if (Reports && typeof Reports.init === 'function') {
        console.log('Initializing reports...');
        await Reports.init();
    }

    console.log('All components initialized');
    
    // Connect mapview to statistics after everything is loaded
    setTimeout(connectMapviewToStatistics, 1500);
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
            console.log(`🔥 Hotspots updated after filter with ${manholes.length} manholes`);
        }
        updateStatisticsFromMapView();
    });

    // ZOOM TO LOCATION
    document.addEventListener('zoomToLocation', (event) => {
        const { lat, lng, zoom } = event.detail;
        if (MapView && MapView.getMap) {
            const map = MapView.getMap();
            if (map && map.setView) {
                map.setView([lat, lng], zoom || 18);
                console.log(`📍 Zoomed to location: ${lat}, ${lng}`);
            }
        }
    });

    // LAYER TOGGLED
    document.addEventListener('layerToggled', async (event) => {
        console.log(`Layer ${event.detail.layerId} toggled: ${event.detail.visible}`);
        setTimeout(updateStatisticsFromMapView, 500);
    });

    // MAP DATA REFRESHED
    document.addEventListener('mapDataRefreshed', (event) => {
        console.log('Map data refreshed:', event.detail);
        setTimeout(updateStatisticsFromMapView, 500);
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
    
    // ASSET HIGHLIGHT from hotspots
    document.addEventListener('highlightAsset', (event) => {
        console.log('🔴 Highlight asset event received:', event.detail);
        const { lat, lng, isCritical, assetId } = event.detail;
        if (MapView && MapView.getMap) {
            const map = MapView.getMap();
            if (map && lat && lng) {
                map.setView([lat, lng], 18);
            }
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

    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('dataRefreshed', {
            detail: { timestamp: new Date().toISOString() }
        }));
    }, 2000);

    console.log('Dashboard ready! Backend API:', API_BASE_URL);
    console.log('🔥 Heatmap module available:', !!window.heatmapModule);
}

// ============================================
// START APP
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}