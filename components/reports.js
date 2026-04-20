// components/reports.js - Reports Component
// Handles PDF, CSV, JSON, and Shapefile (SHP) exports
// Includes Mutare City Council logo and sewer job log data

// ============================================
// MOCK DATA (will be replaced with API data)
// ============================================

// Pipeline data (waste_water_pipeline)
const mockPipelines = [
    { id: 1, pipe_id: '13373', start_mh: 'SKBMH267', end_mh: 'SKBSP018', pipe_mat: 'E/W', pipe_size: 150, class: 'Primary', block_stat: 'Partial', length: 4.35, lat: -18.9735, lng: 32.6705 },
    { id: 2, pipe_id: '36047', start_mh: 'GGMH001', end_mh: 'GGMH002', pipe_mat: 'PVC', pipe_size: 200, class: 'Secondary', block_stat: 'Clear', length: 12.5, lat: -18.9750, lng: 32.6720 },
    { id: 3, pipe_id: '45218', start_mh: 'MH-045', end_mh: 'MH-046', pipe_mat: 'Concrete', pipe_size: 300, class: 'Trunk', block_stat: 'Blocked', length: 25.8, lat: -18.9700, lng: 32.6660 }
];

// Manhole data (waste_water_manhole)
const mockManholes = [
    { manhole_id: 'GGMH001', mh_depth: 2.5, ground_lv: 1250.0, inv_lev: 1247.5, pipe_id: '36047', bloc_stat: 'Clear', class: 'Standard', inspector: 'John Smith', type: 'Access', suburb_nam: 'BORDERVALE 1', lat: -18.9735, lng: 32.6705 },
    { manhole_id: 'GGMH002', mh_depth: 3.2, ground_lv: 1252.0, inv_lev: 1248.8, pipe_id: '36047', bloc_stat: 'Partial', class: 'Deep', inspector: 'Mary Jones', type: 'Junction', suburb_nam: 'BORDERVALE 1', lat: -18.9750, lng: 32.6720 },
    { manhole_id: 'MH-045', mh_depth: 4.0, ground_lv: 1245.0, inv_lev: 1241.0, pipe_id: '45218', bloc_stat: 'Blocked', class: 'Standard', inspector: 'Peter Moyo', type: 'Drop', suburb_nam: 'CBD', lat: -18.9700, lng: 32.6660 }
];

// Job Logs (Sewer maintenance jobs)
const mockJobLogs = [
    { id: 1, job_number: 'JOB-001', asset_id: 'MH-001', asset_type: 'manhole', job_type: 'unblocking', description: 'Cleared severe blockage', priority: 'high', status: 'completed', assigned_to: 'John Doe', performed_by: 'John Doe', started_at: '2026-04-15T08:00:00', completed_at: '2026-04-15T10:30:00', resolution_hours: 2.5, notes: 'Used high-pressure jetter', lat: -18.9735, lng: 32.6705, suburb: 'CBD' },
    { id: 2, job_number: 'JOB-002', asset_id: 'PL-001', asset_type: 'pipeline', job_type: 'inspection', description: 'CCTV inspection', priority: 'normal', status: 'completed', assigned_to: 'Mary Smith', performed_by: 'Mary Smith', started_at: '2026-04-14T09:00:00', completed_at: '2026-04-14T11:00:00', resolution_hours: 2.0, notes: 'Found cracks in pipe', lat: -18.9750, lng: 32.6720, suburb: 'Sakubva' },
    { id: 3, job_number: 'JOB-003', asset_id: 'MH-003', asset_type: 'manhole', job_type: 'repair', description: 'Replace manhole cover', priority: 'medium', status: 'in_progress', assigned_to: 'Peter Moyo', performed_by: null, started_at: '2026-04-16T07:00:00', completed_at: null, resolution_hours: null, notes: 'Waiting for materials', lat: -18.9780, lng: 32.6750, suburb: 'Dangamvura' },
    { id: 4, job_number: 'JOB-004', asset_id: 'PL-002', asset_type: 'pipeline', job_type: 'unblocking', description: 'Emergency blockage', priority: 'critical', status: 'pending', assigned_to: 'Emergency Team', performed_by: null, started_at: null, completed_at: null, resolution_hours: null, notes: 'Urgent response needed', lat: -18.9700, lng: 32.6660, suburb: 'CBD' }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCurrentData() {
    return {
        pipelines: window.pipelineData || mockPipelines,
        manholes: window.manholeData || mockManholes,
        jobLogs: window.jobLogData || mockJobLogs
    };
}

// Get logo as base64 (Mutare City Council logo placeholder)
// In production, replace with actual logo file
function getLogoBase64() {
    // This is a placeholder - replace with actual Mutare City Council logo
    // You can load an actual image file and convert to base64
    return null;
}

// Add logo to PDF
function addLogoToPDF(doc, x, y, width, height) {
    try {
        // Try to load logo from assets
        const logoImg = document.getElementById('mutare-logo');
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
            doc.addImage(logoImg.src, 'PNG', x, y, width, height);
            return true;
        }
    } catch(e) {}
    return false;
}

// ============================================
// PDF GENERATION WITH LOGO
// ============================================

function generatePipelineReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const data = getCurrentData();
    
    // Add Logo (top left)
    try {
        const logoInput = document.createElement('img');
        logoInput.src = '/assets/mutare_logo.png';
        doc.addImage(logoInput, 'PNG', 20, 10, 30, 20);
    } catch(e) {}
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare City Council', 60, 20);
    
    doc.setFontSize(16);
    doc.text('Waste Water Pipeline Report', 60, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 60, 40);
    doc.text(`Total Pipelines: ${data.pipelines.length}`, 60, 47);
    
    // Pipeline Table with Lat/Lon
    const pipelineTableData = [
        ['Pipe ID', 'Start MH', 'End MH', 'Material', 'Size', 'Status', 'Length (m)', 'Latitude', 'Longitude']
    ];
    
    data.pipelines.forEach(p => {
        pipelineTableData.push([
            p.pipe_id || '—',
            p.start_mh || '—',
            p.end_mh || '—',
            p.pipe_mat || '—',
            p.pipe_size || '—',
            p.block_stat || 'Normal',
            p.length ? p.length.toFixed(2) : '—',
            p.lat ? p.lat.toFixed(6) : '—',
            p.lng ? p.lng.toFixed(6) : '—'
        ]);
    });
    
    doc.autoTable({
        startY: 55,
        head: [pipelineTableData[0]],
        body: pipelineTableData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] },
        bodyStyles: { textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [240, 255, 240] }
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare City Council - Sewer Management Department', 20, finalY);
    doc.text(`Report ID: PIPE-${new Date().toISOString().slice(0,10).replace(/-/g, '')}`, 20, finalY + 5);
    
    doc.save(`pipeline_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

function generateManholeReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const data = getCurrentData();
    
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare City Council', 20, 20);
    doc.setFontSize(16);
    doc.text('Waste Water Manhole Report', 20, 35);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Total Manholes: ${data.manholes.length}`, 20, 52);
    
    const manholeTableData = [
        ['ID', 'Depth (m)', 'Pipe ID', 'Status', 'Type', 'Suburb', 'Inspector', 'Latitude', 'Longitude']
    ];
    
    data.manholes.forEach(m => {
        manholeTableData.push([
            m.manhole_id || '—',
            m.mh_depth ? m.mh_depth + 'm' : '—',
            m.pipe_id || '—',
            m.bloc_stat || 'Normal',
            m.type || '—',
            m.suburb_nam || '—',
            m.inspector || '—',
            m.lat ? m.lat.toFixed(6) : '—',
            m.lng ? m.lng.toFixed(6) : '—'
        ]);
    });
    
    doc.autoTable({
        startY: 60,
        head: [manholeTableData[0]],
        body: manholeTableData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] }
    });
    
    doc.save(`manhole_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

function generateJobLogReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const data = getCurrentData();
    
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare City Council', 20, 20);
    doc.setFontSize(16);
    doc.text('Sewer Job Log Report', 20, 35);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    
    const jobTableData = [
        ['Job #', 'Asset ID', 'Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Started', 'Completed', 'Hours', 'Latitude', 'Longitude', 'Suburb']
    ];
    
    data.jobLogs.forEach(j => {
        jobTableData.push([
            j.job_number || '—',
            j.asset_id || '—',
            j.asset_type || '—',
            (j.description || '').substring(0, 30),
            j.priority || '—',
            j.status || '—',
            j.assigned_to || '—',
            j.started_at ? new Date(j.started_at).toLocaleDateString() : '—',
            j.completed_at ? new Date(j.completed_at).toLocaleDateString() : '—',
            j.resolution_hours || '—',
            j.lat ? j.lat.toFixed(6) : '—',
            j.lng ? j.lng.toFixed(6) : '—',
            j.suburb || '—'
        ]);
    });
    
    doc.autoTable({
        startY: 55,
        head: [jobTableData[0]],
        body: jobTableData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] }
    });
    
    // Summary stats
    const finalY = doc.lastAutoTable.finalY + 10;
    const completed = data.jobLogs.filter(j => j.status === 'completed').length;
    const inProgress = data.jobLogs.filter(j => j.status === 'in_progress').length;
    const pending = data.jobLogs.filter(j => j.status === 'pending').length;
    
    doc.setFontSize(10);
    doc.setTextColor(34, 139, 34);
    doc.text('Summary', 20, finalY);
    doc.setTextColor(50, 50, 50);
    doc.text(`✓ Completed: ${completed}`, 20, finalY + 7);
    doc.text(`🔄 In Progress: ${inProgress}`, 20, finalY + 14);
    doc.text(`⏳ Pending: ${pending}`, 20, finalY + 21);
    
    doc.save(`joblog_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ============================================
// CSV EXPORT (with Lat/Lon)
// ============================================

function exportPipelinesCSV() {
    const data = getCurrentData();
    const headers = ['Pipe ID', 'Start MH', 'End MH', 'Material', 'Size (mm)', 'Class', 'Block Status', 'Length (m)', 'Latitude', 'Longitude'];
    const rows = data.pipelines.map(p => [
        p.pipe_id || '',
        p.start_mh || '',
        p.end_mh || '',
        p.pipe_mat || '',
        p.pipe_size || '',
        p.class || '',
        p.block_stat || '',
        p.length || '',
        p.lat || '',
        p.lng || ''
    ]);
    
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `pipelines_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportManholesCSV() {
    const data = getCurrentData();
    const headers = ['Manhole ID', 'Depth (m)', 'Ground LV', 'Invert LV', 'Pipe ID', 'Block Status', 'Class', 'Type', 'Suburb', 'Inspector', 'Latitude', 'Longitude'];
    const rows = data.manholes.map(m => [
        m.manhole_id || '',
        m.mh_depth || '',
        m.ground_lv || '',
        m.inv_lev || '',
        m.pipe_id || '',
        m.bloc_stat || '',
        m.class || '',
        m.type || '',
        m.suburb_nam || '',
        m.inspector || '',
        m.lat || '',
        m.lng || ''
    ]);
    
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `manholes_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportJobLogCSV() {
    const data = getCurrentData();
    const headers = ['Job Number', 'Asset ID', 'Asset Type', 'Job Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Performed By', 'Started At', 'Completed At', 'Resolution Hours', 'Notes', 'Latitude', 'Longitude', 'Suburb'];
    const rows = data.jobLogs.map(j => [
        j.job_number || '',
        j.asset_id || '',
        j.asset_type || '',
        j.job_type || '',
        j.description || '',
        j.priority || '',
        j.status || '',
        j.assigned_to || '',
        j.performed_by || '',
        j.started_at || '',
        j.completed_at || '',
        j.resolution_hours || '',
        (j.notes || '').replace(/,/g, ';'),
        j.lat || '',
        j.lng || '',
        j.suburb || ''
    ]);
    
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `joblog_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

// ============================================
// JSON EXPORT
// ============================================

function exportPipelinesJSON() {
    const data = getCurrentData();
    const exportData = {
        report_type: 'pipelines',
        generated_at: new Date().toISOString(),
        total_count: data.pipelines.length,
        data: data.pipelines
    };
    downloadFile(JSON.stringify(exportData, null, 2), `pipelines_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportManholesJSON() {
    const data = getCurrentData();
    const exportData = {
        report_type: 'manholes',
        generated_at: new Date().toISOString(),
        total_count: data.manholes.length,
        data: data.manholes
    };
    downloadFile(JSON.stringify(exportData, null, 2), `manholes_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportJobLogJSON() {
    const data = getCurrentData();
    const exportData = {
        report_type: 'job_logs',
        generated_at: new Date().toISOString(),
        total_count: data.jobLogs.length,
        summary: {
            completed: data.jobLogs.filter(j => j.status === 'completed').length,
            in_progress: data.jobLogs.filter(j => j.status === 'in_progress').length,
            pending: data.jobLogs.filter(j => j.status === 'pending').length
        },
        data: data.jobLogs
    };
    downloadFile(JSON.stringify(exportData, null, 2), `joblog_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

// ============================================
// SHAPEFILE (SHP) EXPORT - GeoJSON format (convertible to SHP)
// ============================================

function exportPipelinesGeoJSON() {
    const data = getCurrentData();
    const features = data.pipelines.filter(p => p.lat && p.lng).map(p => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [parseFloat(p.lng), parseFloat(p.lat)]
        },
        properties: {
            pipe_id: p.pipe_id,
            start_mh: p.start_mh,
            end_mh: p.end_mh,
            material: p.pipe_mat,
            size_mm: p.pipe_size,
            status: p.block_stat,
            length_m: p.length
        }
    }));
    
    const geoJSON = {
        type: 'FeatureCollection',
        name: 'mutare_pipelines',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: features
    };
    
    downloadFile(JSON.stringify(geoJSON, null, 2), `pipelines_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile (.shp) if needed.');
}

function exportManholesGeoJSON() {
    const data = getCurrentData();
    const features = data.manholes.filter(m => m.lat && m.lng).map(m => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [parseFloat(m.lng), parseFloat(m.lat)]
        },
        properties: {
            manhole_id: m.manhole_id,
            depth_m: m.mh_depth,
            pipe_id: m.pipe_id,
            status: m.bloc_stat,
            type: m.type,
            suburb: m.suburb_nam,
            inspector: m.inspector
        }
    }));
    
    const geoJSON = {
        type: 'FeatureCollection',
        name: 'mutare_manholes',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: features
    };
    
    downloadFile(JSON.stringify(geoJSON, null, 2), `manholes_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile (.shp) if needed.');
}

function exportJobLogGeoJSON() {
    const data = getCurrentData();
    const features = data.jobLogs.filter(j => j.lat && j.lng).map(j => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [parseFloat(j.lng), parseFloat(j.lat)]
        },
        properties: {
            job_number: j.job_number,
            asset_id: j.asset_id,
            job_type: j.job_type,
            description: j.description,
            priority: j.priority,
            status: j.status,
            assigned_to: j.assigned_to,
            resolution_hours: j.resolution_hours,
            suburb: j.suburb
        }
    }));
    
    const geoJSON = {
        type: 'FeatureCollection',
        name: 'mutare_job_logs',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: features
    };
    
    downloadFile(JSON.stringify(geoJSON, null, 2), `joblog_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile (.shp) if needed.');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// ATTACH EVENTS
// ============================================

function attachEvents() {
    // PDF Reports
    document.getElementById('pipelineReportBtn')?.addEventListener('click', generatePipelineReport);
    document.getElementById('manholeReportBtn')?.addEventListener('click', generateManholeReport);
    document.getElementById('jobLogReportBtn')?.addEventListener('click', generateJobLogReport);
    
    // CSV Exports
    document.getElementById('exportPipelinesCSV')?.addEventListener('click', exportPipelinesCSV);
    document.getElementById('exportManholesCSV')?.addEventListener('click', exportManholesCSV);
    document.getElementById('exportJobLogCSV')?.addEventListener('click', exportJobLogCSV);
    
    // JSON Exports
    document.getElementById('exportPipelinesJSON')?.addEventListener('click', exportPipelinesJSON);
    document.getElementById('exportManholesJSON')?.addEventListener('click', exportManholesJSON);
    document.getElementById('exportJobLogJSON')?.addEventListener('click', exportJobLogJSON);
    
    // Shapefile (GeoJSON) Exports
    document.getElementById('exportPipelinesSHP')?.addEventListener('click', exportPipelinesGeoJSON);
    document.getElementById('exportManholesSHP')?.addEventListener('click', exportManholesGeoJSON);
    document.getElementById('exportJobLogSHP')?.addEventListener('click', exportJobLogGeoJSON);
}

// ============================================
// RENDER HTML
// ============================================

function render() {
    return `
        <div class="reports-container">
            <!-- Pipelines Section -->
            <div class="chart-container">
                <h4>📏 PIPELINES</h4>
                <div class="report-buttons">
                    <button id="pipelineReportBtn" class="report-btn">📊 PDF Report</button>
                    <button id="exportPipelinesCSV" class="report-btn">📎 CSV</button>
                    <button id="exportPipelinesJSON" class="report-btn">🔗 JSON</button>
                    <button id="exportPipelinesSHP" class="report-btn">🗺️ SHP (GeoJSON)</button>
                </div>
            </div>
            
            <!-- Manholes Section -->
            <div class="chart-container">
                <h4>🕳️ MANHOLES</h4>
                <div class="report-buttons">
                    <button id="manholeReportBtn" class="report-btn">📊 PDF Report</button>
                    <button id="exportManholesCSV" class="report-btn">📎 CSV</button>
                    <button id="exportManholesJSON" class="report-btn">🔗 JSON</button>
                    <button id="exportManholesSHP" class="report-btn">🗺️ SHP (GeoJSON)</button>
                </div>
            </div>
            
            <!-- Job Logs Section -->
            <div class="chart-container">
                <h4>📋 SEWER JOB LOGS</h4>
                <div class="report-buttons">
                    <button id="jobLogReportBtn" class="report-btn">📊 PDF Report</button>
                    <button id="exportJobLogCSV" class="report-btn">📎 CSV</button>
                    <button id="exportJobLogJSON" class="report-btn">🔗 JSON</button>
                    <button id="exportJobLogSHP" class="report-btn">🗺️ SHP (GeoJSON)</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    attachEvents();
}

function updateReports(pipelines, manholes, jobLogs) {
    if (pipelines) window.pipelineData = pipelines;
    if (manholes) window.manholeData = manholes;
    if (jobLogs) window.jobLogData = jobLogs;
}

// ============================================
// EXPORTS
// ============================================

export default {
    render,
    init,
    update: updateReports
};
