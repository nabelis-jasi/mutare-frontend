// ============================================
// MAIN DASHBOARD LOGIC - UPDATED VERSION
// Integrates with Flask backend and all components
// ============================================

// API Configuration
const API_BASE_URL = 'http://192.168.0.195:5000/api';

// Global data stores (will be populated from API)
let allManholes = [];
let allPipelines = [];
let allSuburbs = [];
let allComplaints = [];
let allJobs = [];

// Layer visibility (managed by layermanager but kept for compatibility)
var showManholes = true;
var showPipelines = true;
var showSuburbs = false;

// Charts
var suburbChart, jobsChart;

// ============================================
// DATA FETCHING FROM FLASK BACKEND
// ============================================

async function fetchAllData() {
    console.log('Fetching all data from API...');
    
    try {
        // Fetch all datasets in parallel
        const [manholesRes, pipelinesRes, suburbsRes, complaintsRes, jobsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/manholes_all`),
            fetch(`${API_BASE_URL}/pipelines_all`),
            fetch(`${API_BASE_URL}/suburbs_all`),
            fetch(`${API_BASE_URL}/complaints_all`),
            fetch(`${API_BASE_URL}/jobs_all`)
        ]);
        
        // Process manholes
        if (manholesRes.ok) {
            const geojson = await manholesRes.json();
            allManholes = geojson.features.map(f => ({
                id: f.properties.manhole_id || f.properties.id,
                asset_code: f.properties.manhole_id || `MH-${f.properties.id}`,
                suburb: f.properties.suburb_nam || f.properties.suburb || 'Unknown',
                suburb_id: f.properties.suburb_id,
                diameter: f.properties.diameter || f.properties.mh_diameter || 150,
                depth: f.properties.mh_depth,
                material: f.properties.material || 'concrete',
                status: f.properties.status || 'good',
                blockages: f.properties.blockage_count || f.properties.blockages || 0,
                inspector: f.properties.inspector,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                type: 'manhole'
            }));
            console.log(`Loaded ${allManholes.length} manholes`);
        }
        
        // Process pipelines
        if (pipelinesRes.ok) {
            const geojson = await pipelinesRes.json();
            allPipelines = geojson.features.map(f => ({
                id: f.properties.pipe_id || f.properties.id,
                asset_code: f.properties.pipe_id || `PL-${f.properties.id}`,
                diameter: f.properties.diameter || f.properties.pipe_size,
                material: f.properties.material || f.properties.pipe_mat,
                status: f.properties.status || f.properties.block_stat || 'good',
                length: f.properties.shape_length || f.properties.length,
                coordinates: f.geometry.coordinates,
                type: 'pipeline'
            }));
            console.log(`Loaded ${allPipelines.length} pipelines`);
        }
        
        // Process suburbs
        if (suburbsRes.ok) {
            const geojson = await suburbsRes.json();
            allSuburbs = geojson.features.map(f => ({
                id: f.properties.suburb_id || f.properties.id,
                name: f.properties.suburb_nam || f.properties.name,
                area: f.properties.area_km2,
                asset_count: f.properties.asset_count || 0,
                blockages: f.properties.blockages || 0,
                geometry: f.geometry,
                type: 'suburb'
            }));
            console.log(`Loaded ${allSuburbs.length} suburbs`);
        }
        
        // Process complaints
        if (complaintsRes.ok) {
            const geojson = await complaintsRes.json();
            allComplaints = geojson.features.map(f => ({
                id: f.properties.id,
                address: f.properties.address,
                original_text: f.properties.original_text,
                status: f.properties.status || 'pending',
                report_date: f.properties.report_date,
                attended_date: f.properties.attended_date,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                type: 'complaint'
            }));
            console.log(`Loaded ${allComplaints.length} complaints`);
        }
        
        // Process jobs
        if (jobsRes.ok) {
            const geojson = await jobsRes.json();
            allJobs = geojson.features.map(f => ({
                id: f.properties.job_id || f.properties.id,
                job_number: f.properties.job_number,
                asset_id: f.properties.asset_id,
                asset_type: f.properties.asset_type,
                description: f.properties.description,
                priority: f.properties.priority,
                status: f.properties.status,
                assigned_to: f.properties.assigned_to,
                resolution_hours: f.properties.resolution_hours,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                type: 'job'
            }));
            console.log(`Loaded ${allJobs.length} jobs`);
        }
        
        // Update global window references for legacy compatibility
        window.allManholes = allManholes;
        window.allPipelines = allPipelines;
        window.allSuburbs = allSuburbs;
        window.allComplaints = allComplaints;
        window.allJobs = allJobs;
        
        return true;
    } catch (error) {
        console.error('Error fetching data:', error);
        return false;
    }
}

// ============================================
// FILTERED LAYER LOADING
// ============================================

function loadFilteredLayers() {
    if (!window.MapView) return;
    
    // Get current filters
    const filters = window.Filters ? window.Filters.getCurrent() : { status: 'all', suburb: 'all', priority: 'all' };
    
    // Filter manholes based on status and suburb
    let filteredManholes = [...allManholes];
    if (filters.status !== 'all') {
        filteredManholes = filteredManholes.filter(m => m.status === filters.status);
    }
    if (filters.suburb !== 'all') {
        filteredManholes = filteredManholes.filter(m => m.suburb === filters.suburb);
    }
    
    // Filter pipelines based on status
    let filteredPipelines = [...allPipelines];
    if (filters.status !== 'all') {
        filteredPipelines = filteredPipelines.filter(p => p.status === filters.status);
    }
    
    // Load layers based on visibility
    if (showManholes) {
        MapView.loadManholes(filteredManholes);
    } else {
        MapView.loadManholes([]);
    }
    
    if (showPipelines) {
        // Convert pipelines to GeoJSON format if needed
        const pipelinesGeoJSON = {
            type: 'FeatureCollection',
            features: filteredPipelines.map(p => ({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: p.coordinates
                },
                properties: {
                    pipe_id: p.asset_code,
                    diameter: p.diameter,
                    material: p.material,
                    status: p.status,
                    length: p.length
                }
            }))
        };
        MapView.loadPipelinesFromGeoJSON(pipelinesGeoJSON);
    } else {
        MapView.clearPipelines();
    }
    
    if (showSuburbs) {
        const suburbsGeoJSON = {
            type: 'FeatureCollection',
            features: allSuburbs.map(s => ({
                type: 'Feature',
                geometry: s.geometry,
                properties: {
                    suburb_nam: s.name,
                    area: s.area,
                    asset_count: s.asset_count
                }
            }))
        };
        MapView.loadSuburbsFromGeoJSON(suburbsGeoJSON);
    } else {
        MapView.clearSuburbs();
    }
    
    // Update summary statistics
    updateSummaryStats(filteredManholes, filteredPipelines);
    
    // Update problem assets list
    updateProblemAssetsList(filteredManholes);
}

function updateSummaryStats(manholes, pipelines) {
    const totalManholesEl = document.getElementById('totalManholes');
    const totalPipelinesEl = document.getElementById('totalPipelines');
    const criticalAssetsEl = document.getElementById('criticalAssets');
    const totalBlockagesEl = document.getElementById('totalBlockages');
    const avgBlockagesEl = document.getElementById('avgBlockages');
    
    if (totalManholesEl) totalManholesEl.innerText = manholes.length;
    if (totalPipelinesEl) totalPipelinesEl.innerText = pipelines.length;
    
    const criticalCount = manholes.filter(m => m.status === 'critical').length;
    if (criticalAssetsEl) criticalAssetsEl.innerText = criticalCount;
    
    const totalBlockages = manholes.reduce((sum, m) => sum + (m.blockages || 0), 0);
    if (totalBlockagesEl) totalBlockagesEl.innerText = totalBlockages;
    
    const avgBlockages = manholes.length > 0 ? (totalBlockages / manholes.length).toFixed(1) : 0;
    if (avgBlockagesEl) avgBlockagesEl.innerText = avgBlockages;
}

function updateProblemAssetsList(manholes) {
    const sorted = [...manholes].sort((a, b) => (b.blockages || 0) - (a.blockages || 0)).slice(0, 5);
    const problemList = document.getElementById('problemAssetsList');
    if (problemList) {
        problemList.innerHTML = '';
        for (const asset of sorted) {
            const div = document.createElement('div');
            div.className = 'stat-row';
            div.innerHTML = `
                <span>${asset.asset_code} - ${asset.suburb}</span>
                <span style="color: ${asset.blockages > 10 ? '#dc3545' : asset.blockages > 5 ? '#ffc107' : '#28a745'}">
                    ${asset.blockages || 0} blockages
                </span>
            `;
            problemList.appendChild(div);
        }
    }
}

// ============================================
// CHART INITIALIZATION AND UPDATES
// ============================================

function initCharts() {
    const suburbCtx = document.getElementById('suburbChart')?.getContext('2d');
    const jobsCtx = document.getElementById('jobsChart')?.getContext('2d');
    
    if (suburbCtx) {
        suburbChart = new Chart(suburbCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Blockages',
                    data: [],
                    backgroundColor: '#228B22',
                    borderColor: '#2d8a2d',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Blockages' } },
                    x: { title: { display: true, text: 'Suburb' } }
                }
            }
        });
    }
    
    if (jobsCtx) {
        jobsChart = new Chart(jobsCtx, {
            type: 'pie',
            data: {
                labels: ['Unblocking', 'Inspection', 'Repair', 'Maintenance'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#228B22', '#44aa44', '#66cc66', '#88dd88'],
                    borderColor: '#0a1f0a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

function updateChartsAndSummary() {
    // Get current filters
    const filters = window.Filters ? window.Filters.getCurrent() : { status: 'all', suburb: 'all' };
    
    // Filter manholes
    let filteredManholes = [...allManholes];
    if (filters.status !== 'all') {
        filteredManholes = filteredManholes.filter(m => m.status === filters.status);
    }
    if (filters.suburb !== 'all') {
        filteredManholes = filteredManholes.filter(m => m.suburb === filters.suburb);
    }
    
    // Update suburb chart
    if (suburbChart) {
        const suburbMap = new Map();
        for (const m of filteredManholes) {
            const suburb = m.suburb;
            const blockages = m.blockages || 0;
            suburbMap.set(suburb, (suburbMap.get(suburb) || 0) + blockages);
        }
        
        const suburbs = Array.from(suburbMap.keys());
        const blockages = Array.from(suburbMap.values());
        
        suburbChart.data.labels = suburbs;
        suburbChart.data.datasets[0].data = blockages;
        suburbChart.update();
    }
    
    // Update summary stats
    updateSummaryStats(filteredManholes, allPipelines);
    updateProblemAssetsList(filteredManholes);
}

// ============================================
// PDF GENERATION
// ============================================

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare City Sewer Report', 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    // Manholes table
    const manholeData = allManholes.map(m => [
        m.asset_code,
        m.suburb,
        m.status,
        m.blockages || 0,
        m.lat?.toFixed(4) || 'N/A',
        m.lng?.toFixed(4) || 'N/A'
    ]);
    
    doc.autoTable({
        startY: 40,
        head: [['Asset Code', 'Suburb', 'Status', 'Blockages', 'Latitude', 'Longitude']],
        body: manholeData,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] }
    });
    
    doc.save(`sewer_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================
// CSV EXPORT
// ============================================

function exportCSV() {
    const headers = ['Asset Code', 'Suburb', 'Status', 'Blockages', 'Latitude', 'Longitude'];
    const rows = allManholes.map(m => [
        m.asset_code,
        m.suburb,
        m.status,
        m.blockages || 0,
        m.lat,
        m.lng
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sewer_data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Base map switcher
    const baseMapSelect = document.getElementById('baseMapSelect');
    if (baseMapSelect) {
        baseMapSelect.addEventListener('change', (e) => {
            if (window.MapView) MapView.switchBaseMap(e.target.value);
        });
    }
    
    // Layer toggle buttons (if they exist)
    const toggleManholes = document.getElementById('toggleManholesBtn');
    if (toggleManholes) {
        toggleManholes.addEventListener('click', () => {
            showManholes = !showManholes;
            loadFilteredLayers();
        });
    }
    
    const togglePipelines = document.getElementById('togglePipelinesBtn');
    if (togglePipelines) {
        togglePipelines.addEventListener('click', () => {
            showPipelines = !showPipelines;
            loadFilteredLayers();
        });
    }
    
    const toggleSuburbs = document.getElementById('toggleSuburbsBtn');
    if (toggleSuburbs) {
        toggleSuburbs.addEventListener('click', () => {
            showSuburbs = !showSuburbs;
            loadFilteredLayers();
        });
    }
    
    // Toolbar buttons
    const fitBoundsBtn = document.getElementById('fitBoundsBtn');
    if (fitBoundsBtn) {
        fitBoundsBtn.addEventListener('click', () => {
            if (window.MapView && MapView.fitToBounds) MapView.fitToBounds();
        });
    }
    
    const heatmapBtn = document.getElementById('heatmapBtn');
    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', () => {
            const heatPoints = allManholes.map(m => [m.lat, m.lng, m.blockages || 1]);
            if (window.MapView && MapView.showHeatmapFromManholes) {
                MapView.showHeatmapFromManholes(heatPoints);
            }
        });
    }
    
    const clearHeatmapBtn = document.getElementById('clearHeatmapBtn');
    if (clearHeatmapBtn) {
        clearHeatmapBtn.addEventListener('click', () => {
            if (window.MapView && MapView.clearHeatmap) MapView.clearHeatmap();
        });
    }
    
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportCSV);
    
    const printMapBtn = document.getElementById('printMapBtn');
    if (printMapBtn) printMapBtn.addEventListener('click', () => window.print());
    
    // Listen for filter changes
    document.addEventListener('filtersChanged', () => {
        loadFilteredLayers();
        updateChartsAndSummary();
    });
    
    // Listen for report processed events
    document.addEventListener('reportProcessed', async () => {
        await fetchAllData();
        loadFilteredLayers();
        updateChartsAndSummary();
    });
}

// ============================================
// INITIALIZATION
// ============================================

async function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Fetch all data from backend
    await fetchAllData();
    
    // Initialize map if MapView exists
    if (window.MapView && MapView.init) {
        MapView.init(-18.9735, 32.6705, 13);
    }
    
    // Initialize filters if they exist
    if (window.Filters && Filters.init) {
        Filters.init();
    }
    
    // Initialize charts
    initCharts();
    
    // Load initial layers
    setTimeout(() => {
        loadFilteredLayers();
        updateChartsAndSummary();
    }, 500);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Dashboard initialized with real API data');
}

// Start the dashboard
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}