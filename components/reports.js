// components/reports.js - Reports Component
// Single tab with "SEWER REPORTS" main heading and collapsible sections
// Includes PDF, CSV, JSON, and Shapefile (SHP/GeoJSON) exports with lat/lon

// ============================================
// MOCK DATA (will be replaced with API data)
// ============================================

const mockPipelines = [
    { id: 1, pipe_id: '13373', start_mh: 'SKBMH267', end_mh: 'SKBSP018', pipe_mat: 'E/W', pipe_size: 150, class: 'Primary', block_stat: 'Partial', length: 4.35, lat: -18.9735, lng: 32.6705 },
    { id: 2, pipe_id: '36047', start_mh: 'GGMH001', end_mh: 'GGMH002', pipe_mat: 'PVC', pipe_size: 200, class: 'Secondary', block_stat: 'Clear', length: 12.5, lat: -18.9750, lng: 32.6720 },
    { id: 3, pipe_id: '45218', start_mh: 'MH-045', end_mh: 'MH-046', pipe_mat: 'Concrete', pipe_size: 300, class: 'Trunk', block_stat: 'Blocked', length: 25.8, lat: -18.9700, lng: 32.6660 }
];

const mockManholes = [
    { manhole_id: 'GGMH001', mh_depth: 2.5, ground_lv: 1250.0, inv_lev: 1247.5, pipe_id: '36047', bloc_stat: 'Clear', class: 'Standard', inspector: 'John Smith', type: 'Access', suburb_nam: 'BORDERVALE 1', lat: -18.9735, lng: 32.6705 },
    { manhole_id: 'GGMH002', mh_depth: 3.2, ground_lv: 1252.0, inv_lev: 1248.8, pipe_id: '36047', bloc_stat: 'Partial', class: 'Deep', inspector: 'Mary Jones', type: 'Junction', suburb_nam: 'BORDERVALE 1', lat: -18.9750, lng: 32.6720 },
    { manhole_id: 'MH-045', mh_depth: 4.0, ground_lv: 1245.0, inv_lev: 1241.0, pipe_id: '45218', bloc_stat: 'Blocked', class: 'Standard', inspector: 'Peter Moyo', type: 'Drop', suburb_nam: 'CBD', lat: -18.9700, lng: 32.6660 }
];

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
// PDF GENERATION
// ============================================

function generatePipelineReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const data = getCurrentData();
    
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34);
    doc.text('Mutare City Council', 20, 20);
    doc.setFontSize(16);
    doc.text('Waste Water Pipeline Report', 20, 35);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Total Pipelines: ${data.pipelines.length}`, 20, 52);
    
    const tableData = [['Pipe ID', 'Start MH', 'End MH', 'Material', 'Size', 'Status', 'Length', 'Latitude', 'Longitude']];
    data.pipelines.forEach(p => {
        tableData.push([
            p.pipe_id || '—', p.start_mh || '—', p.end_mh || '—', p.pipe_mat || '—',
            p.pipe_size || '—', p.block_stat || 'Normal', p.length ? p.length.toFixed(2) : '—',
            p.lat ? p.lat.toFixed(6) : '—', p.lng ? p.lng.toFixed(6) : '—'
        ]);
    });
    
    doc.autoTable({ startY: 60, head: [tableData[0]], body: tableData.slice(1), theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } });
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
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    doc.text(`Total Manholes: ${data.manholes.length}`, 20, 52);
    
    const tableData = [['ID', 'Depth', 'Pipe ID', 'Status', 'Type', 'Suburb', 'Inspector', 'Latitude', 'Longitude']];
    data.manholes.forEach(m => {
        tableData.push([
            m.manhole_id || '—', m.mh_depth ? m.mh_depth + 'm' : '—', m.pipe_id || '—',
            m.bloc_stat || 'Normal', m.type || '—', m.suburb_nam || '—', m.inspector || '—',
            m.lat ? m.lat.toFixed(6) : '—', m.lng ? m.lng.toFixed(6) : '—'
        ]);
    });
    
    doc.autoTable({ startY: 60, head: [tableData[0]], body: tableData.slice(1), theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } });
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
    
    const tableData = [['Job #', 'Asset ID', 'Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Hours', 'Latitude', 'Longitude', 'Suburb']];
    data.jobLogs.forEach(j => {
        tableData.push([
            j.job_number || '—', j.asset_id || '—', j.asset_type || '—',
            (j.description || '').substring(0, 25), j.priority || '—', j.status || '—',
            j.assigned_to || '—', j.resolution_hours || '—',
            j.lat ? j.lat.toFixed(6) : '—', j.lng ? j.lng.toFixed(6) : '—', j.suburb || '—'
        ]);
    });
    
    doc.autoTable({ startY: 55, head: [tableData[0]], body: tableData.slice(1), theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } });
    
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
// CSV EXPORT
// ============================================

function exportPipelinesCSV() {
    const data = getCurrentData();
    const headers = ['Pipe ID', 'Start MH', 'End MH', 'Material', 'Size', 'Status', 'Length', 'Latitude', 'Longitude'];
    const rows = data.pipelines.map(p => [p.pipe_id, p.start_mh, p.end_mh, p.pipe_mat, p.pipe_size, p.block_stat, p.length, p.lat, p.lng]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `pipelines_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportManholesCSV() {
    const data = getCurrentData();
    const headers = ['Manhole ID', 'Depth', 'Pipe ID', 'Status', 'Type', 'Suburb', 'Inspector', 'Latitude', 'Longitude'];
    const rows = data.manholes.map(m => [m.manhole_id, m.mh_depth, m.pipe_id, m.bloc_stat, m.type, m.suburb_nam, m.inspector, m.lat, m.lng]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `manholes_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportJobLogCSV() {
    const data = getCurrentData();
    const headers = ['Job #', 'Asset ID', 'Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Hours', 'Latitude', 'Longitude', 'Suburb'];
    const rows = data.jobLogs.map(j => [j.job_number, j.asset_id, j.asset_type, j.description, j.priority, j.status, j.assigned_to, j.resolution_hours, j.lat, j.lng, j.suburb]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `joblog_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

// ============================================
// JSON EXPORT
// ============================================

function exportPipelinesJSON() {
    const data = getCurrentData();
    downloadFile(JSON.stringify({ report_type: 'pipelines', generated_at: new Date().toISOString(), total: data.pipelines.length, data: data.pipelines }, null, 2), `pipelines_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportManholesJSON() {
    const data = getCurrentData();
    downloadFile(JSON.stringify({ report_type: 'manholes', generated_at: new Date().toISOString(), total: data.manholes.length, data: data.manholes }, null, 2), `manholes_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportJobLogJSON() {
    const data = getCurrentData();
    downloadFile(JSON.stringify({ report_type: 'job_logs', generated_at: new Date().toISOString(), total: data.jobLogs.length, data: data.jobLogs }, null, 2), `joblog_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

// ============================================
// SHAPEFILE (GeoJSON) EXPORT
// ============================================

function exportPipelinesGeoJSON() {
    const data = getCurrentData();
    const features = data.pipelines.filter(p => p.lat && p.lng).map(p => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(p.lng), parseFloat(p.lat)] },
        properties: { pipe_id: p.pipe_id, start_mh: p.start_mh, end_mh: p.end_mh, material: p.pipe_mat, size: p.pipe_size, status: p.block_stat, length: p.length }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'mutare_pipelines', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features: features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `pipelines_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile (.shp).');
}

function exportManholesGeoJSON() {
    const data = getCurrentData();
    const features = data.manholes.filter(m => m.lat && m.lng).map(m => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(m.lng), parseFloat(m.lat)] },
        properties: { manhole_id: m.manhole_id, depth: m.mh_depth, pipe_id: m.pipe_id, status: m.bloc_stat, type: m.type, suburb: m.suburb_nam, inspector: m.inspector }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'mutare_manholes', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features: features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `manholes_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile (.shp).');
}

function exportJobLogGeoJSON() {
    const data = getCurrentData();
    const features = data.jobLogs.filter(j => j.lat && j.lng).map(j => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(j.lng), parseFloat(j.lat)] },
        properties: { job_number: j.job_number, asset_id: j.asset_id, job_type: j.job_type, description: j.description, priority: j.priority, status: j.status, assigned_to: j.assigned_to, hours: j.resolution_hours, suburb: j.suburb }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'mutare_job_logs', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features: features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `joblog_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile (.shp).');
}

// ============================================
// ACCORDION TOGGLE
// ============================================

function toggleAccordion(sectionId) {
    const content = document.getElementById(sectionId);
    const header = content?.previousElementSibling;
    if (content && header) {
        content.classList.toggle('active');
        header.classList.toggle('active');
    }
}

// ============================================
// ATTACH EVENTS
// ============================================

function attachEvents() {
    // Accordion headers
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            this.classList.toggle('active');
            if (content) content.classList.toggle('active');
        });
    });
    
    // PDF buttons
    document.getElementById('pipelineReportBtn')?.addEventListener('click', generatePipelineReport);
    document.getElementById('manholeReportBtn')?.addEventListener('click', generateManholeReport);
    document.getElementById('jobLogReportBtn')?.addEventListener('click', generateJobLogReport);
    
    // CSV buttons
    document.getElementById('exportPipelinesCSV')?.addEventListener('click', exportPipelinesCSV);
    document.getElementById('exportManholesCSV')?.addEventListener('click', exportManholesCSV);
    document.getElementById('exportJobLogCSV')?.addEventListener('click', exportJobLogCSV);
    
    // JSON buttons
    document.getElementById('exportPipelinesJSON')?.addEventListener('click', exportPipelinesJSON);
    document.getElementById('exportManholesJSON')?.addEventListener('click', exportManholesJSON);
    document.getElementById('exportJobLogJSON')?.addEventListener('click', exportJobLogJSON);
    
    // SHP (GeoJSON) buttons
    document.getElementById('exportPipelinesSHP')?.addEventListener('click', exportPipelinesGeoJSON);
    document.getElementById('exportManholesSHP')?.addEventListener('click', exportManholesGeoJSON);
    document.getElementById('exportJobLogSHP')?.addEventListener('click', exportJobLogGeoJSON);
}

// ============================================
// RENDER HTML (With "SEWER REPORTS" Main Heading)
// ============================================

function render() {
    const data = getCurrentData();
    const completedCount = data.jobLogs.filter(j => j.status === 'completed').length;
    const inProgressCount = data.jobLogs.filter(j => j.status === 'in_progress').length;
    const pendingCount = data.jobLogs.filter(j => j.status === 'pending').length;
    
    return `
        <div class="reports-container">
            <!-- MAIN HEADING -->
            <div class="reports-main-header">
                <h3>📑 SEWER REPORTS</h3>
                <p>Generate and export sewer asset reports in multiple formats</p>
            </div>
            
            <!-- PIPELINES ACCORDION -->
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>📏 PIPELINES <span class="badge">${data.pipelines.length}</span></span>
                    <span class="arrow">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="report-buttons-group">
                        <button id="pipelineReportBtn" class="report-btn pdf-btn">📊 PDF</button>
                        <button id="exportPipelinesCSV" class="report-btn csv-btn">📎 CSV</button>
                        <button id="exportPipelinesJSON" class="report-btn json-btn">🔗 JSON</button>
                        <button id="exportPipelinesSHP" class="report-btn shp-btn">🗺️ SHP</button>
                    </div>
                    <div class="report-info">
                        <span class="info-text">📍 ${data.pipelines.length} pipelines with coordinates</span>
                    </div>
                </div>
            </div>
            
            <!-- MANHOLES ACCORDION -->
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>🕳️ MANHOLES <span class="badge">${data.manholes.length}</span></span>
                    <span class="arrow">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="report-buttons-group">
                        <button id="manholeReportBtn" class="report-btn pdf-btn">📊 PDF</button>
                        <button id="exportManholesCSV" class="report-btn csv-btn">📎 CSV</button>
                        <button id="exportManholesJSON" class="report-btn json-btn">🔗 JSON</button>
                        <button id="exportManholesSHP" class="report-btn shp-btn">🗺️ SHP</button>
                    </div>
                    <div class="report-info">
                        <span class="info-text">📍 ${data.manholes.length} manholes with coordinates</span>
                    </div>
                </div>
            </div>
            
            <!-- JOB LOGS ACCORDION -->
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>📋 JOB LOGS <span class="badge">${data.jobLogs.length}</span></span>
                    <span class="arrow">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="report-buttons-group">
                        <button id="jobLogReportBtn" class="report-btn pdf-btn">📊 PDF</button>
                        <button id="exportJobLogCSV" class="report-btn csv-btn">📎 CSV</button>
                        <button id="exportJobLogJSON" class="report-btn json-btn">🔗 JSON</button>
                        <button id="exportJobLogSHP" class="report-btn shp-btn">🗺️ SHP</button>
                    </div>
                    <div class="report-stats">
                        <span class="stat-completed">✓ Completed: ${completedCount}</span>
                        <span class="stat-progress">🔄 In Progress: ${inProgressCount}</span>
                        <span class="stat-pending">⏳ Pending: ${pendingCount}</span>
                    </div>
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

export default {
    render,
    init,
    update: updateReports
};
