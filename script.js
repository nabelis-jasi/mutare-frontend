// ============================================
// MAIN DASHBOARD LOGIC
// Integrates with mapview.js
// ============================================

// Mock data (replace with API calls)
const mockManholes = [
    { id: 1, asset_code: 'MH-001', suburb: 'CBD', diameter: 150, status: 'critical', blockages: 12, lat: -18.9735, lng: 32.6705, depth: 3.5 },
    { id: 2, asset_code: 'MH-002', suburb: 'Sakubva', diameter: 100, status: 'warning', blockages: 5, lat: -18.9750, lng: 32.6720, depth: 2.8 },
    { id: 3, asset_code: 'MH-003', suburb: 'Dangamvura', diameter: 80, status: 'good', blockages: 3, lat: -18.9780, lng: 32.6750, depth: 2.2 },
    { id: 4, asset_code: 'MH-004', suburb: 'CBD', diameter: 120, status: 'critical', blockages: 15, lat: -18.9700, lng: 32.6660, depth: 4.0 },
    { id: 5, asset_code: 'MH-005', suburb: 'Chikanga', diameter: 130, status: 'warning', blockages: 7, lat: -18.9650, lng: 32.6600, depth: 3.0 }
];

const mockPipelines = [
    { id: 1, asset_code: 'PL-001', start_manhole: 'MH-001', end_manhole: 'MH-002', diameter: 200, material: 'concrete', status: 'warning', coordinates: [[-18.9735, 32.6705], [-18.9750, 32.6720]] },
    { id: 2, asset_code: 'PL-002', start_manhole: 'MH-002', end_manhole: 'MH-003', diameter: 150, material: 'PVC', status: 'good', coordinates: [[-18.9750, 32.6720], [-18.9780, 32.6750]] },
    { id: 3, asset_code: 'PL-003', start_manhole: 'MH-001', end_manhole: 'MH-004', diameter: 250, material: 'concrete', status: 'critical', coordinates: [[-18.9735, 32.6705], [-18.9700, 32.6660]] }
];

const mockSuburbs = [
    { name: 'CBD', area: 5.2, asset_count: 25, blockages: 45, coordinates: [[-18.9760, 32.6670], [-18.9740, 32.6720], [-18.9690, 32.6690], [-18.9710, 32.6650], [-18.9760, 32.6670]] },
    { name: 'Sakubva', area: 8.1, asset_count: 18, blockages: 22, coordinates: [[-18.9770, 32.6730], [-18.9790, 32.6780], [-18.9740, 32.6800], [-18.9720, 32.6750], [-18.9770, 32.6730]] }
];

// Layer visibility toggles
let showManholes = true;
let showPipelines = true;
let showSuburbs = false;

// Charts
let suburbChart, jobsChart;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    MapView.init(-18.9735, 32.6705, 13);
    
    // Load initial layers
    loadAllLayers();
    
    // Initialize charts
    initCharts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Base map switcher
    document.getElementById('baseMapSelect').addEventListener('change', (e) => {
        MapView.switchBaseMap(e.target.value);
    });
    
    // Layer toggles
    document.getElementById('toggleManholesBtn').addEventListener('click', () => {
        showManholes = !showManholes;
        loadAllLayers();
    });
    
    document.getElementById('togglePipelinesBtn').addEventListener('click', () => {
        showPipelines = !showPipelines;
        loadAllLayers();
    });
    
    document.getElementById('toggleSuburbsBtn').addEventListener('click', () => {
        showSuburbs = !showSuburbs;
        loadAllLayers();
    });
    
    // Fit bounds
    document.getElementById('fitBoundsBtn').addEventListener('click', () => {
        MapView.fitToBounds();
    });
    
    // Heatmap
    document.getElementById('heatmapBtn').addEventListener('click', () => {
        const heatPoints = mockManholes.map(m => [m.lat, m.lng, m.blockages]);
        MapView.addHeatmap(heatPoints);
    });
    
    document.getElementById('clearHeatmapBtn').addEventListener('click', () => {
        MapView.clearHeatmap();
    });
    
    // Filters
    initFilters();
});

function loadAllLayers() {
    if (showManholes) MapView.loadManholes(mockManholes);
    else MapView.loadManholes([]);
    
    if (showPipelines) MapView.loadPipelines(mockPipelines);
    else MapView.loadPipelines([]);
    
    if (showSuburbs) MapView.loadSuburbs(mockSuburbs);
    else MapView.loadSuburbs([]);
}

function initCharts() {
    const suburbCtx = document.getElementById('suburbChart').getContext('2d');
    const jobsCtx = document.getElementById('jobsChart').getContext('2d');
    
    suburbChart = new Chart(suburbCtx, {
        type: 'bar',
        data: {
            labels: ['CBD', 'Sakubva', 'Dangamvura', 'Chikanga'],
            datasets: [{ label: 'Blockages', data: [45, 22, 8, 12], backgroundColor: '#228B22' }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    jobsChart = new Chart(jobsCtx, {
        type: 'pie',
        data: {
            labels: ['Unblocking', 'Inspection', 'Repair'],
            datasets: [{ data: [45, 23, 12], backgroundColor: ['#228B22', '#44aa44', '#66cc66'] }]
        },
        options: { responsive: true }
    });
}

function initFilters() {
    // Filter logic here (same as before)
    document.getElementById('clearAllFilters').addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.add('active'));
        document.getElementById('activeFilters').innerHTML = 'No active filters';
        loadAllLayers();
    });
}

function setupEventListeners() {
    document.getElementById('weeklyReportBtn').addEventListener('click', generatePDF);
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
    document.getElementById('printMapBtn').addEventListener('click', () => window.print());
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).style.display = 'block';
        });
    });
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare Sewer Report', 20, 20);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
    doc.save(`sewer_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

function exportCSV() {
    const csv = Papa.unparse(mockManholes);
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link
