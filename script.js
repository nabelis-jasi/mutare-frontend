// ============================================
// MAIN DASHBOARD LOGIC
// Integrates with mapview.js
// ============================================

// Mock data
var mockManholes = [
    { id: 1, asset_code: 'MH-001', suburb: 'CBD', diameter: 150, status: 'critical', blockages: 12, lat: -18.9735, lng: 32.6705, depth: 3.5 },
    { id: 2, asset_code: 'MH-002', suburb: 'Sakubva', diameter: 100, status: 'warning', blockages: 5, lat: -18.9750, lng: 32.6720, depth: 2.8 },
    { id: 3, asset_code: 'MH-003', suburb: 'Dangamvura', diameter: 80, status: 'good', blockages: 3, lat: -18.9780, lng: 32.6750, depth: 2.2 },
    { id: 4, asset_code: 'MH-004', suburb: 'CBD', diameter: 120, status: 'critical', blockages: 15, lat: -18.9700, lng: 32.6660, depth: 4.0 },
    { id: 5, asset_code: 'MH-005', suburb: 'Chikanga', diameter: 130, status: 'warning', blockages: 7, lat: -18.9650, lng: 32.6600, depth: 3.0 }
];

var mockPipelines = [
    { id: 1, asset_code: 'PL-001', diameter: 200, material: 'concrete', status: 'warning', coordinates: [[-18.9735, 32.6705], [-18.9750, 32.6720]] },
    { id: 2, asset_code: 'PL-002', diameter: 150, material: 'PVC', status: 'good', coordinates: [[-18.9750, 32.6720], [-18.9780, 32.6750]] },
    { id: 3, asset_code: 'PL-003', diameter: 250, material: 'concrete', status: 'critical', coordinates: [[-18.9735, 32.6705], [-18.9700, 32.6660]] }
];

var mockSuburbs = [
    { name: 'CBD', area: 5.2, asset_count: 25, blockages: 45, coordinates: [[-18.9760, 32.6670], [-18.9740, 32.6720], [-18.9690, 32.6690], [-18.9710, 32.6650], [-18.9760, 32.6670]] }
];

// Layer visibility
var showManholes = true;
var showPipelines = true;
var showSuburbs = false;

// Charts
var suburbChart, jobsChart;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    MapView.init(-18.9735, 32.6705, 13);
    
    // Load initial layers
    loadAllLayers();
    
    // Initialize charts
    initCharts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Base map switcher
    document.getElementById('baseMapSelect').addEventListener('change', function(e) {
        MapView.switchBaseMap(e.target.value);
    });
    
    // Layer toggles
    document.getElementById('toggleManholesBtn').addEventListener('click', function() {
        showManholes = !showManholes;
        loadAllLayers();
    });
    
    document.getElementById('togglePipelinesBtn').addEventListener('click', function() {
        showPipelines = !showPipelines;
        loadAllLayers();
    });
    
    document.getElementById('toggleSuburbsBtn').addEventListener('click', function() {
        showSuburbs = !showSuburbs;
        loadAllLayers();
    });
    
    // Fit bounds
    document.getElementById('fitBoundsBtn').addEventListener('click', function() {
        MapView.fitToBounds();
    });
    
    // Heatmap
    document.getElementById('heatmapBtn').addEventListener('click', function() {
        var heatPoints = [];
        for (var i = 0; i < mockManholes.length; i++) {
            heatPoints.push([mockManholes[i].lat, mockManholes[i].lng, mockManholes[i].blockages]);
        }
        MapView.addHeatmap(heatPoints);
    });
    
    document.getElementById('clearHeatmapBtn').addEventListener('click', function() {
        MapView.clearHeatmap();
    });
    
    // Filters
    initFilters();
});

function loadAllLayers() {
    if (showManholes) {
        MapView.loadManholes(mockManholes);
    } else {
        MapView.loadManholes([]);
    }
    
    if (showPipelines) {
        MapView.loadPipelines(mockPipelines);
    } else {
        MapView.loadPipelines([]);
    }
    
    if (showSuburbs) {
        MapView.loadSuburbs(mockSuburbs);
    } else {
        MapView.loadSuburbs([]);
    }
}

function initCharts() {
    var suburbCtx = document.getElementById('suburbChart').getContext('2d');
    var jobsCtx = document.getElementById('jobsChart').getContext('2d');
    
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
    // Suburb filters
    var suburbBtns = document.querySelectorAll('#suburbFilters .filter-btn');
    for (var i = 0; i < suburbBtns.length; i++) {
        suburbBtns[i].addEventListener('click', function() {
            for (var j = 0; j < suburbBtns.length; j++) {
                suburbBtns[j].classList.remove('active');
            }
            this.classList.add('active');
            var suburb = this.getAttribute('data-suburb');
            if (suburb === 'all') {
                MapView.loadManholes(mockManholes);
                document.getElementById('activeFilters').innerHTML = 'No active filters';
            } else {
                var filtered = [];
                for (var k = 0; k < mockManholes.length; k++) {
                    if (mockManholes[k].suburb === suburb) {
                        filtered.push(mockManholes[k]);
                    }
                }
                MapView.loadManholes(filtered);
                document.getElementById('activeFilters').innerHTML = 'Suburb: ' + suburb;
            }
        });
    }
    
    // Clear all filters
    document.getElementById('clearAllFilters').addEventListener('click', function() {
        for (var i = 0; i < suburbBtns.length; i++) {
            suburbBtns[i].classList.remove('active');
        }
        document.querySelector('#suburbFilters .filter-btn[data-suburb="all"]').classList.add('active');
        MapView.loadManholes(mockManholes);
        document.getElementById('activeFilters').innerHTML = 'No active filters';
    });
}

function setupEventListeners() {
    document.getElementById('weeklyReportBtn').addEventListener('click', generatePDF);
    document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
    document.getElementById('printMapBtn').addEventListener('click', function() {
        window.print();
    });
    document.getElementById('exportGeoJSONBtn').addEventListener('click', function() {
        alert('Export GeoJSON feature coming soon');
    });
    
    // Tabs
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            var tabId = this.getAttribute('data-tab');
            var allTabs = document.querySelectorAll('.tab');
            for (var j = 0; j < allTabs.length; j++) {
                allTabs[j].classList.remove('active');
            }
            this.classList.add('active');
            
            var allContents = document.querySelectorAll('.tab-content');
            for (var k = 0; k < allContents.length; k++) {
                allContents[k].style.display = 'none';
            }
            document.getElementById(tabId + '-tab').style.display = 'block';
        });
    }
}

function generatePDF() {
    var { jsPDF } = window.jspdf;
    var doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare Sewer Report', 20, 20);
    doc.setFontSize(10);
    doc.text('Generated: ' + new Date().toLocaleString(), 20, 35);
    
    var tableData = [];
    for (var i = 0; i < mockManholes.length; i++) {
        tableData.push([mockManholes[i].asset_code, mockManholes[i].suburb, mockManholes[i].blockages, mockManholes[i].status]);
    }
    
    doc.autoTable({
        startY: 45,
        head: [['Asset', 'Suburb', 'Blockages', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] }
    });
    
    doc.save('sewer_report_' + new Date().toISOString().slice(0,10) + '.pdf');
}

function exportCSV() {
    var csvRows = [['ID', 'Asset Code', 'Suburb', 'Diameter', 'Status', 'Blockages', 'Lat', 'Lng']];
    for (var i = 0; i < mockManholes.length; i++) {
        var m = mockManholes[i];
        csvRows.push([m.id, m.asset_code, m.suburb, m.diameter, m.status, m.blockages, m.lat, m.lng]);
    }
    
    var csvContent = '';
    for (var j = 0; j < csvRows.length; j++) {
        csvContent += csvRows[j].join(',') + '\n';
    }
    
    var blob = new Blob([csvContent], { type: 'text/csv' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sewer_assets.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}
