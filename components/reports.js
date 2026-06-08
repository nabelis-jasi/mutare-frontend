// components/reports.js - Reports Component
// Fetches live data from Python Flask backend and integrates with map

const API_BASE_URL = 'http://localhost:5000/api';

// Store fetched data
let pipelinesData = [];
let manholesData = [];
let jobLogsData = [];
let complaintsData = [];
let vehicleData = { operational: [], workshop: [] }; // Store vehicle info

// ============================================
// FETCH FUNCTIONS (from backend)
// ============================================

async function fetchAllPipelines() {
    try {
        const res = await fetch(`${API_BASE_URL}/pipelines_all`);
        if (!res.ok) throw new Error('Failed to fetch pipelines');
        const geojson = await res.json();
        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
        }));
    } catch (error) {
        console.error('Error fetching pipelines:', error);
        return [];
    }
}

async function fetchAllManholes() {
    try {
        const res = await fetch(`${API_BASE_URL}/manholes_all`);
        if (!res.ok) throw new Error('Failed to fetch manholes');
        const geojson = await res.json();
        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
        }));
    } catch (error) {
        console.error('Error fetching manholes:', error);
        return [];
    }
}

async function fetchAllJobLogs() {
    try {
        const res = await fetch(`${API_BASE_URL}/jobs_all`);
        if (!res.ok) throw new Error('Failed to fetch job logs');
        const geojson = await res.json();
        return geojson.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
        }));
    } catch (error) {
        console.error('Error fetching job logs:', error);
        return [];
    }
}

async function fetchComplaints() {
    try {
        const res = await fetch(`${API_BASE_URL}/complaints/all`);
        if (!res.ok) throw new Error('Failed to fetch complaints');
        return await res.json();
    } catch (error) {
        console.error('Error fetching complaints:', error);
        return [];
    }
}

async function refreshAllData() {
    const [pipelines, manholes, jobs, complaints] = await Promise.all([
        fetchAllPipelines(),
        fetchAllManholes(),
        fetchAllJobLogs(),
        fetchComplaints()
    ]);
    pipelinesData = pipelines;
    manholesData = manholes;
    jobLogsData = jobs;
    complaintsData = complaints;
    
    // Also fetch vehicle data from backend if available
    try {
        const vehicleRes = await fetch(`${API_BASE_URL}/vehicles/latest`);
        if (vehicleRes.ok) {
            const vehicleInfo = await vehicleRes.json();
            if (vehicleInfo.operational) vehicleData.operational = vehicleInfo.operational;
            if (vehicleInfo.workshop) vehicleData.workshop = vehicleInfo.workshop;
        }
    } catch (err) {
        console.log('No vehicle endpoint, using existing data');
    }
    
    // Store globally for compatibility
    window.pipelineData = pipelinesData;
    window.manholeData = manholesData;
    window.jobLogData = jobLogsData;
    window.complaintsData = complaintsData;
    window.vehicleData = vehicleData;
    
    updateCountsInUI();
}

function updateCountsInUI() {
    const pipelineBadge = document.querySelector('.accordion-section:first-child .badge');
    const manholeBadge = document.querySelector('.accordion-section:nth-child(2) .badge');
    const jobBadge = document.querySelector('.accordion-section:nth-child(3) .badge');
    const complaintBadge = document.querySelector('.accordion-section:nth-child(4) .badge');
    
    if (pipelineBadge) pipelineBadge.textContent = pipelinesData.length;
    if (manholeBadge) manholeBadge.textContent = manholesData.length;
    if (jobBadge) jobBadge.textContent = jobLogsData.length;
    if (complaintBadge) complaintBadge.textContent = complaintsData.length;
    
    // Update job stats
    const completedCount = jobLogsData.filter(j => j.status === 'completed').length;
    const inProgressCount = jobLogsData.filter(j => j.status === 'in_progress').length;
    const pendingCount = jobLogsData.filter(j => j.status === 'pending').length;
    
    const statsSpan = document.querySelector('.job-stats');
    if (statsSpan) {
        statsSpan.innerHTML = `
            <span class="stat-completed">✓ Completed: ${completedCount}</span>
            <span class="stat-progress">🔄 In Progress: ${inProgressCount}</span>
            <span class="stat-pending">⏳ Pending: ${pendingCount}</span>
        `;
    }
    
    // Update complaint stats
    const resolvedCount = complaintsData.filter(c => c.status === 'resolved').length;
    const unresolvedCount = complaintsData.filter(c => c.status === 'pending' || c.status === 'unresolved').length;
    
    const complaintStats = document.querySelector('.complaint-stats');
    if (complaintStats) {
        complaintStats.innerHTML = `
            <span class="stat-resolved">✅ Resolved: ${resolvedCount}</span>
            <span class="stat-unresolved">⚠️ Unresolved: ${unresolvedCount}</span>
        `;
    }
    
    // Update vehicle stats - CAPTURE FROM reportprocessor
    const vehicleStats = document.querySelector('.vehicle-stats');
    if (vehicleStats) {
        if (vehicleData.operational.length > 0 || vehicleData.workshop.length > 0) {
            vehicleStats.innerHTML = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #2a4a2a;">
                    <div style="color: #28a745; font-size: 11px;">🚗 Operational: ${vehicleData.operational.map(v => `${v.brand} ${v.plate}`).join(', ') || 'None'}</div>
                    <div style="color: #ffc107; font-size: 11px;">🔧 Workshop: ${vehicleData.workshop.map(v => `${v.brand} ${v.plate}`).join(', ') || 'None'}</div>
                </div>
            `;
        } else {
            vehicleStats.innerHTML = '';
        }
    }
}

// ============================================
// HELPER FUNCTIONS
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

const LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Mutare_City_logo_2023.png';

function addLogoToPDF(doc, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = LOGO_URL;
    img.onload = function() {
        try {
            doc.addImage(img, 'PNG', 15, 8, 25, 25);
        } catch(e) {
            console.warn('Could not add image, using text fallback');
            doc.setFontSize(14);
            doc.setTextColor(34, 139, 34);
            doc.text('CITY OF MUTARE', 20, 25);
        }
        if (callback) callback();
    };
    img.onerror = function() {
        console.warn('Logo failed to load, using text fallback');
        doc.setFontSize(14);
        doc.setTextColor(34, 139, 34);
        doc.text('CITY OF MUTARE', 20, 25);
        if (callback) callback();
    };
    if (img.complete) img.onload();
}

// ============================================
// PDF GENERATION
// ============================================

function generatePipelineReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    addLogoToPDF(doc, () => {
        doc.setFontSize(20);
        doc.setTextColor(34, 139, 34);
        doc.text('Mutare City Council', 50, 20);
        doc.setFontSize(16);
        doc.text('Waste Water Pipeline Report', 50, 32);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 42);
        doc.text(`Total Pipelines: ${pipelinesData.length}`, 50, 49);
        
        const tableData = [['Pipe ID', 'Start MH', 'End MH', 'Material', 'Size', 'Status', 'Length', 'Latitude', 'Longitude']];
        pipelinesData.forEach(p => {
            tableData.push([
                p.pipe_id || '—', p.start_mh || '—', p.end_mh || '—', p.pipe_mat || '—',
                p.pipe_size || '—', p.block_stat || 'Normal', p.length ? p.length.toFixed(2) : '—',
                p.lat ? p.lat.toFixed(6) : '—', p.lng ? p.lng.toFixed(6) : '—'
            ]);
        });
        doc.autoTable({ 
            startY: 58, 
            head: [tableData[0]], 
            body: tableData.slice(1), 
            theme: 'striped',
            headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } 
        });
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(34, 139, 34);
        doc.text('Mutare City Council - Sewer Management Department', 20, finalY);
        doc.text(`Report ID: PIPE-${new Date().toISOString().slice(0,10).replace(/-/g, '')}`, 20, finalY + 5);
        doc.save(`pipeline_report_${new Date().toISOString().slice(0,10)}.pdf`);
    });
}

function generateManholeReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    addLogoToPDF(doc, () => {
        doc.setFontSize(20);
        doc.setTextColor(34, 139, 34);
        doc.text('Mutare City Council', 50, 20);
        doc.setFontSize(16);
        doc.text('Waste Water Manhole Report', 50, 32);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 42);
        doc.text(`Total Manholes: ${manholesData.length}`, 50, 49);
        
        const tableData = [['ID', 'Depth', 'Pipe ID', 'Status', 'Type', 'Suburb', 'Inspector', 'Latitude', 'Longitude']];
        manholesData.forEach(m => {
            tableData.push([
                m.manhole_id || '—', m.mh_depth ? m.mh_depth + 'm' : '—', m.pipe_id || '—',
                m.bloc_stat || 'Normal', m.type || '—', m.suburb_nam || '—', m.inspector || '—',
                m.lat ? m.lat.toFixed(6) : '—', m.lng ? m.lng.toFixed(6) : '—'
            ]);
        });
        doc.autoTable({ 
            startY: 58, 
            head: [tableData[0]], 
            body: tableData.slice(1), 
            theme: 'striped',
            headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } 
        });
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(34, 139, 34);
        doc.text('Mutare City Council - Sewer Management Department', 20, finalY);
        doc.text(`Report ID: MH-${new Date().toISOString().slice(0,10).replace(/-/g, '')}`, 20, finalY + 5);
        doc.save(`manhole_report_${new Date().toISOString().slice(0,10)}.pdf`);
    });
}

function generateJobLogReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    addLogoToPDF(doc, () => {
        doc.setFontSize(20);
        doc.setTextColor(34, 139, 34);
        doc.text('Mutare City Council', 50, 20);
        doc.setFontSize(16);
        doc.text('Sewer Job Log Report', 50, 32);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 42);
        
        const tableData = [['Job #', 'Asset ID', 'Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Hours', 'Latitude', 'Longitude', 'Suburb']];
        jobLogsData.forEach(j => {
            tableData.push([
                j.job_number || '—', j.asset_id || '—', j.asset_type || '—',
                (j.description || '').substring(0, 25), j.priority || '—', j.status || '—',
                j.assigned_to || '—', j.resolution_hours || '—',
                j.lat ? j.lat.toFixed(6) : '—', j.lng ? j.lng.toFixed(6) : '—', j.suburb || '—'
            ]);
        });
        doc.autoTable({ 
            startY: 50, 
            head: [tableData[0]], 
            body: tableData.slice(1), 
            theme: 'striped',
            headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } 
        });
        const finalY = doc.lastAutoTable.finalY + 10;
        const completed = jobLogsData.filter(j => j.status === 'completed').length;
        const inProgress = jobLogsData.filter(j => j.status === 'in_progress').length;
        const pending = jobLogsData.filter(j => j.status === 'pending').length;
        doc.setFontSize(10);
        doc.setTextColor(34, 139, 34);
        doc.text('Summary', 20, finalY);
        doc.setTextColor(50, 50, 50);
        doc.text(`✓ Completed: ${completed}`, 20, finalY + 7);
        doc.text(`🔄 In Progress: ${inProgress}`, 20, finalY + 14);
        doc.text(`⏳ Pending: ${pending}`, 20, finalY + 21);
        doc.save(`joblog_report_${new Date().toISOString().slice(0,10)}.pdf`);
    });
}

function generateComplaintReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    addLogoToPDF(doc, () => {
        doc.setFontSize(20);
        doc.setTextColor(34, 139, 34);
        doc.text('Mutare City Council', 50, 20);
        doc.setFontSize(16);
        doc.text('Sewer Complaints Report', 50, 32);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 42);
        doc.text(`Total Complaints: ${complaintsData.length}`, 50, 49);
        
        const tableData = [['ID', 'Address', 'Original Text', 'Status', 'Fuzzy Match', 'Buffer Radius', 'Report Date', 'Attended Date', 'Latitude', 'Longitude']];
        complaintsData.forEach(c => {
            tableData.push([
                c.id || '—', (c.address || '').substring(0, 25), (c.original_text || '').substring(0, 30),
                c.status || 'pending', c.fuzzy_match ? 'Yes' : 'No', c.buffer_radius || 50,
                c.report_date || '—', c.attended_date || '—',
                c.lat ? c.lat.toFixed(6) : '—', c.lng ? c.lng.toFixed(6) : '—'
            ]);
        });
        doc.autoTable({ 
            startY: 58, 
            head: [tableData[0]], 
            body: tableData.slice(1), 
            theme: 'striped',
            headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] } 
        });
        const finalY = doc.lastAutoTable.finalY + 10;
        const resolved = complaintsData.filter(c => c.status === 'resolved').length;
        const pending = complaintsData.filter(c => c.status === 'pending').length;
        
        doc.setFontSize(10);
        doc.setTextColor(34, 139, 34);
        doc.text('Summary', 20, finalY);
        doc.setTextColor(50, 50, 50);
        doc.text(`✅ Resolved: ${resolved}`, 20, finalY + 7);
        doc.text(`⚠️ Pending: ${pending}`, 20, finalY + 14);
        
        // Add vehicle information if available
        if (vehicleData.operational.length > 0 || vehicleData.workshop.length > 0) {
            const vehicleY = finalY + 25;
            doc.setFontSize(10);
            doc.setTextColor(34, 139, 34);
            doc.text('Vehicle Information', 20, vehicleY);
            doc.setTextColor(50, 50, 50);
            let vehicleLine = vehicleY + 7;
            if (vehicleData.operational.length > 0) {
                doc.text(`🚗 Operational: ${vehicleData.operational.map(v => v.brand + ' ' + v.plate).join(', ')}`, 20, vehicleLine);
                vehicleLine += 7;
            }
            if (vehicleData.workshop.length > 0) {
                doc.text(`🔧 Workshop: ${vehicleData.workshop.map(v => v.brand + ' ' + v.plate).join(', ')}`, 20, vehicleLine);
            }
        }
        
        doc.save(`complaints_report_${new Date().toISOString().slice(0,10)}.pdf`);
    });
}

// ============================================
// CSV, JSON, GEOJSON EXPORTS
// ============================================

function exportPipelinesCSV() {
    const headers = ['Pipe ID', 'Start MH', 'End MH', 'Material', 'Size', 'Status', 'Length', 'Latitude', 'Longitude'];
    const rows = pipelinesData.map(p => [p.pipe_id, p.start_mh, p.end_mh, p.pipe_mat, p.pipe_size, p.block_stat, p.length, p.lat, p.lng]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `pipelines_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportManholesCSV() {
    const headers = ['Manhole ID', 'Depth', 'Pipe ID', 'Status', 'Type', 'Suburb', 'Inspector', 'Latitude', 'Longitude'];
    const rows = manholesData.map(m => [m.manhole_id, m.mh_depth, m.pipe_id, m.bloc_stat, m.type, m.suburb_nam, m.inspector, m.lat, m.lng]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `manholes_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportJobLogCSV() {
    const headers = ['Job #', 'Asset ID', 'Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Hours', 'Latitude', 'Longitude', 'Suburb'];
    const rows = jobLogsData.map(j => [j.job_number, j.asset_id, j.asset_type, j.description, j.priority, j.status, j.assigned_to, j.resolution_hours, j.lat, j.lng, j.suburb]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `joblog_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportComplaintsCSV() {
    const headers = ['ID', 'Address', 'Original Text', 'Status', 'Fuzzy Match', 'Buffer Radius', 'Report Date', 'Attended Date', 'Latitude', 'Longitude'];
    const rows = complaintsData.map(c => [c.id, c.address, c.original_text, c.status, c.fuzzy_match ? 'Yes' : 'No', c.buffer_radius, c.report_date, c.attended_date, c.lat, c.lng]);
    const csvString = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvString, `complaints_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function exportPipelinesJSON() {
    downloadFile(JSON.stringify({ report_type: 'pipelines', generated_at: new Date().toISOString(), total: pipelinesData.length, data: pipelinesData }, null, 2), `pipelines_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportManholesJSON() {
    downloadFile(JSON.stringify({ report_type: 'manholes', generated_at: new Date().toISOString(), total: manholesData.length, data: manholesData }, null, 2), `manholes_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportJobLogJSON() {
    downloadFile(JSON.stringify({ report_type: 'job_logs', generated_at: new Date().toISOString(), total: jobLogsData.length, data: jobLogsData }, null, 2), `joblog_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportComplaintsJSON() {
    downloadFile(JSON.stringify({ report_type: 'complaints', generated_at: new Date().toISOString(), total: complaintsData.length, data: complaintsData, vehicles: vehicleData }, null, 2), `complaints_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
}

function exportPipelinesGeoJSON() {
    const features = pipelinesData.filter(p => p.lat && p.lng).map(p => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(p.lng), parseFloat(p.lat)] },
        properties: { pipe_id: p.pipe_id, start_mh: p.start_mh, end_mh: p.end_mh, material: p.pipe_mat, size: p.pipe_size, status: p.block_stat, length: p.length }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'mutare_pipelines', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `pipelines_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile.');
}

function exportManholesGeoJSON() {
    const features = manholesData.filter(m => m.lat && m.lng).map(m => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(m.lng), parseFloat(m.lat)] },
        properties: { manhole_id: m.manhole_id, depth: m.mh_depth, pipe_id: m.pipe_id, status: m.bloc_stat, type: m.type, suburb: m.suburb_nam, inspector: m.inspector }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'mutare_manholes', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `manholes_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile.');
}

function exportJobLogGeoJSON() {
    const features = jobLogsData.filter(j => j.lat && j.lng).map(j => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(j.lng), parseFloat(j.lat)] },
        properties: { job_number: j.job_number, asset_id: j.asset_id, job_type: j.job_type, description: j.description, priority: j.priority, status: j.status, assigned_to: j.assigned_to, hours: j.resolution_hours, suburb: j.suburb }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'mutare_job_logs', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `joblog_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile.');
}

function exportComplaintsGeoJSON() {
    const features = complaintsData.filter(c => c.lat && c.lng).map(c => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(c.lng), parseFloat(c.lat)] },
        properties: { id: c.id, address: c.address, original_text: c.original_text, status: c.status, fuzzy_match: c.fuzzy_match, buffer_radius: c.buffer_radius, report_date: c.report_date, attended_date: c.attended_date }
    }));
    const geoJSON = { type: 'FeatureCollection', name: 'sewer_complaints', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features };
    downloadFile(JSON.stringify(geoJSON, null, 2), `complaints_${new Date().toISOString().slice(0,10)}.geojson`, 'application/json');
    alert('GeoJSON exported. Use QGIS to convert to Shapefile.');
}

// ============================================
// ATTACH EVENTS
// ============================================

function attachEvents() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            this.classList.toggle('active');
            if (content) content.classList.toggle('active');
        });
    });
    
    // Pipeline events
    const pipelineBtn = document.getElementById('pipelineReportBtn');
    if (pipelineBtn) pipelineBtn.addEventListener('click', generatePipelineReport);
    
    const exportPipeCSV = document.getElementById('exportPipelinesCSV');
    if (exportPipeCSV) exportPipeCSV.addEventListener('click', exportPipelinesCSV);
    
    const exportPipeJSON = document.getElementById('exportPipelinesJSON');
    if (exportPipeJSON) exportPipeJSON.addEventListener('click', exportPipelinesJSON);
    
    const exportPipeSHP = document.getElementById('exportPipelinesSHP');
    if (exportPipeSHP) exportPipeSHP.addEventListener('click', exportPipelinesGeoJSON);
    
    // Manhole events
    const manholeBtn = document.getElementById('manholeReportBtn');
    if (manholeBtn) manholeBtn.addEventListener('click', generateManholeReport);
    
    const exportMhCSV = document.getElementById('exportManholesCSV');
    if (exportMhCSV) exportMhCSV.addEventListener('click', exportManholesCSV);
    
    const exportMhJSON = document.getElementById('exportManholesJSON');
    if (exportMhJSON) exportMhJSON.addEventListener('click', exportManholesJSON);
    
    const exportMhSHP = document.getElementById('exportManholesSHP');
    if (exportMhSHP) exportMhSHP.addEventListener('click', exportManholesGeoJSON);
    
    // Job Log events
    const jobLogBtn = document.getElementById('jobLogReportBtn');
    if (jobLogBtn) jobLogBtn.addEventListener('click', generateJobLogReport);
    
    const exportJobCSV = document.getElementById('exportJobLogCSV');
    if (exportJobCSV) exportJobCSV.addEventListener('click', exportJobLogCSV);
    
    const exportJobJSON = document.getElementById('exportJobLogJSON');
    if (exportJobJSON) exportJobJSON.addEventListener('click', exportJobLogJSON);
    
    const exportJobSHP = document.getElementById('exportJobLogSHP');
    if (exportJobSHP) exportJobSHP.addEventListener('click', exportJobLogGeoJSON);
    
    // Complaint events
    const complaintBtn = document.getElementById('complaintReportBtn');
    if (complaintBtn) complaintBtn.addEventListener('click', generateComplaintReport);
    
    const exportCompCSV = document.getElementById('exportComplaintsCSV');
    if (exportCompCSV) exportCompCSV.addEventListener('click', exportComplaintsCSV);
    
    const exportCompJSON = document.getElementById('exportComplaintsJSON');
    if (exportCompJSON) exportCompJSON.addEventListener('click', exportComplaintsJSON);
    
    const exportCompSHP = document.getElementById('exportComplaintsSHP');
    if (exportCompSHP) exportCompSHP.addEventListener('click', exportComplaintsGeoJSON);
}

// ============================================
// RENDER HTML
// ============================================

function render() {
    return `
        <div class="reports-container">
            <div class="reports-main-header">
                <h3>📑 SEWER REPORTS</h3>
                <p>Generate and export sewer asset reports in multiple formats</p>
            </div>
            
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>📏 PIPELINES <span class="badge">${pipelinesData.length}</span></span>
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
                        <span class="info-text">📍 ${pipelinesData.length} pipelines with coordinates</span>
                    </div>
                </div>
            </div>
            
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>🕳️ MANHOLES <span class="badge">${manholesData.length}</span></span>
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
                        <span class="info-text">📍 ${manholesData.length} manholes with coordinates</span>
                    </div>
                </div>
            </div>
            
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>📋 JOB LOGS <span class="badge">${jobLogsData.length}</span></span>
                    <span class="arrow">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="report-buttons-group">
                        <button id="jobLogReportBtn" class="report-btn pdf-btn">📊 PDF</button>
                        <button id="exportJobLogCSV" class="report-btn csv-btn">📎 CSV</button>
                        <button id="exportJobLogJSON" class="report-btn json-btn">🔗 JSON</button>
                        <button id="exportJobLogSHP" class="report-btn shp-btn">🗺️ SHP</button>
                    </div>
                    <div class="job-stats">
                        <span class="stat-completed">✓ Completed: ${jobLogsData.filter(j => j.status === 'completed').length}</span>
                        <span class="stat-progress">🔄 In Progress: ${jobLogsData.filter(j => j.status === 'in_progress').length}</span>
                        <span class="stat-pending">⏳ Pending: ${jobLogsData.filter(j => j.status === 'pending').length}</span>
                    </div>
                </div>
            </div>
            
            <div class="accordion-section">
                <div class="accordion-header">
                    <span>⚠️ COMPLAINTS <span class="badge">${complaintsData.length}</span></span>
                    <span class="arrow">▶</span>
                </div>
                <div class="accordion-content">
                    <div class="report-buttons-group">
                        <button id="complaintReportBtn" class="report-btn pdf-btn">📊 PDF</button>
                        <button id="exportComplaintsCSV" class="report-btn csv-btn">📎 CSV</button>
                        <button id="exportComplaintsJSON" class="report-btn json-btn">🔗 JSON</button>
                        <button id="exportComplaintsSHP" class="report-btn shp-btn">🗺️ SHP</button>
                    </div>
                    <div class="complaint-stats">
                        <span class="stat-resolved">✅ Resolved: ${complaintsData.filter(c => c.status === 'resolved').length}</span>
                        <span class="stat-unresolved">⚠️ Unresolved: ${complaintsData.filter(c => c.status === 'pending').length}</span>
                    </div>
                    <div class="vehicle-stats"></div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    await refreshAllData();
    attachEvents();
    console.log('Reports component initialized with live API data');
    console.log(`Loaded: ${pipelinesData.length} pipelines, ${manholesData.length} manholes, ${jobLogsData.length} jobs, ${complaintsData.length} complaints`);
}

function updateReports(pipelines, manholes, jobLogs, complaints, vehicles) {
    if (pipelines) pipelinesData = pipelines;
    if (manholes) manholesData = manholes;
    if (jobLogs) jobLogsData = jobLogs;
    if (complaints) complaintsData = complaints;
    if (vehicles) vehicleData = vehicles;
    
    window.pipelineData = pipelinesData;
    window.manholeData = manholesData;
    window.jobLogData = jobLogsData;
    window.complaintsData = complaintsData;
    window.vehicleData = vehicleData;
    
    updateCountsInUI();
}

// ============================================
// EVENT LISTENERS FOR REAL-TIME SYNC WITH MAP AND REPORTS
// ============================================

// Listen for report processed events - update data immediately
document.addEventListener('reportProcessed', async (e) => {
    console.log('📑 Reports: Report processed, refreshing data...', e.detail);
    
    // Store vehicle data from the report
    if (e.detail && e.detail.vehicles) {
        vehicleData = {
            operational: e.detail.vehicles.operational || [],
            workshop: e.detail.vehicles.workshop || []
        };
        window.vehicleData = vehicleData;
        console.log('📑 Reports: Vehicle data captured:', vehicleData);
    }
    
    // Add new complaints to the complaintsData array
    if (e.detail && e.detail.complaints && e.detail.complaints.length > 0) {
        const newComplaints = e.detail.complaints.map((c, idx) => ({
            id: Date.now() + idx,
            address: c.address,
            original_text: c.original_text,
            status: 'pending',
            fuzzy_match: c.confidence !== 'high',
            buffer_radius: c.buffer_radius || 50,
            report_date: e.detail.reportDate || new Date().toISOString().slice(0,10),
            lat: c.latitude,
            lng: c.longitude
        }));
        
        // Add to existing complaints (newest first)
        complaintsData = [...newComplaints, ...complaintsData];
        window.complaintsData = complaintsData;
        console.log('📑 Reports: Added', newComplaints.length, 'new complaints');
    }
    
    // Full refresh to ensure everything is in sync
    await refreshAllData();
});

// Listen for asset status changes (manholes/pipelines updated)
document.addEventListener('assetStatusChanged', async () => {
    console.log('📑 Reports: Asset status changed, refreshing data...');
    await refreshAllData();
});

// Listen for map data refreshes
document.addEventListener('mapDataRefreshed', async (e) => {
    console.log('📑 Reports: Map data refreshed, syncing reports...', e.detail);
    await refreshAllData();
});

// Listen for general data refreshes
document.addEventListener('dataRefreshed', async () => {
    console.log('📑 Reports: Data refreshed, updating...');
    await refreshAllData();
});

export default {
    render,
    init,
    update: updateReports,
    getData: () => ({ 
        pipelines: pipelinesData, 
        manholes: manholesData, 
        jobs: jobLogsData, 
        complaints: complaintsData, 
        vehicles: vehicleData 
    })
};