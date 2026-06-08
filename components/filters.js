// components/filters.js - Complete Working Cascading Filter
// Updated to match actual database column names (pipe_mat, pipe_size, bloc_stat, insp_date)

const API_BASE_URL = 'http://localhost:5000/api';

// Current active filters
let currentFilters = {
    suburb_nam: 'all',
    township: 'all',
    zone: 'all',
    ward: 'all',
    op_zone: 'all',
    manhole_status: 'all',
    manhole_depth_min: '',
    manhole_depth_max: '',
    pipe_material: 'all',
    pipe_size: 'all',
    pipe_status: 'all',
    length_min: '',
    length_max: '',
    inspector: 'all',
    date_from: '',
    date_to: '',
    search_text: ''
};

// Filter options data - will be populated from backend
let filterData = {
    suburbs: [],
    townships: [],
    zones: [],
    wards: [],
    op_zones: [],
    inspectors: [],
    manhole_statuses: [],
    pipe_materials: [],
    pipe_sizes: [],
    pipe_statuses: []
};

let tempFilters = { ...currentFilters };
let currentData = { manholes: [], pipelines: [] };

// DOM Element references (will be set after render)
let suburbSelect = null;
let townshipSelect = null;
let zoneSelect = null;
let wardSelect = null;
let opZoneSelect = null;
let manholeStatusSelect = null;
let pipeMaterialSelect = null;
let pipeSizeSelect = null;
let pipeStatusSelect = null;
let inspectorSelect = null;
let depthMinInput = null;
let depthMaxInput = null;
let lengthMinInput = null;
let lengthMaxInput = null;
let dateFromInput = null;
let dateToInput = null;
let searchTextInput = null;

// Loading state
let isFiltering = false;

// ============================================
// LOAD DATA FROM BACKEND
// ============================================

async function loadFilterData() {
    console.log('Loading filter data from backend...');
    
    try {
        // Load filter options from backend
        const response = await fetch(`${API_BASE_URL}/suburbs/filter-options`);
        if (response.ok) {
            const data = await response.json();
            filterData.suburbs = data.suburbs || [];
            filterData.townships = data.townships || [];
            filterData.zones = data.zones || [];
            filterData.wards = data.wards || [];
            filterData.op_zones = data.op_zones || [];
            console.log('Location filters loaded:', {
                suburbs: filterData.suburbs.length,
                townships: filterData.townships.length,
                zones: filterData.zones.length,
                wards: filterData.wards.length,
                op_zones: filterData.op_zones.length
            });
        } else {
            console.warn('Failed to load filter options:', response.status);
        }
        
        // Load manhole filter options (statuses, inspectors, depth range)
        try {
            const manholeOptionsRes = await fetch(`${API_BASE_URL}/manholes/filter-options`);
            if (manholeOptionsRes.ok) {
                const data = await manholeOptionsRes.json();
                if (data.statuses && data.statuses.length) {
                    filterData.manhole_statuses = data.statuses;
                }
                if (data.inspectors && data.inspectors.length) {
                    filterData.inspectors = data.inspectors;
                }
                console.log('Manhole filters loaded:', {
                    statuses: filterData.manhole_statuses.length,
                    inspectors: filterData.inspectors.length
                });
            }
        } catch (e) {
            console.warn('Could not load manhole options:', e);
            // Fallback defaults
            filterData.manhole_statuses = ['good', 'warning', 'critical', 'blocked', 'partial'];
        }
        
        // Load pipeline filter options (materials, sizes, statuses)
        try {
            const pipelineOptionsRes = await fetch(`${API_BASE_URL}/pipelines/filter-options`);
            if (pipelineOptionsRes.ok) {
                const data = await pipelineOptionsRes.json();
                if (data.materials && data.materials.length) {
                    filterData.pipe_materials = data.materials;
                }
                if (data.sizes && data.sizes.length) {
                    filterData.pipe_sizes = data.sizes;
                }
                if (data.statuses && data.statuses.length) {
                    filterData.pipe_statuses = data.statuses;
                }
                console.log('Pipeline filters loaded:', {
                    materials: filterData.pipe_materials.length,
                    sizes: filterData.pipe_sizes.length,
                    statuses: filterData.pipe_statuses.length
                });
            }
        } catch (e) {
            console.warn('Could not load pipeline options:', e);
            // Fallback defaults
            filterData.pipe_materials = ['E/W', 'PVC', 'Concrete', 'Cast Iron', 'HDPE'];
            filterData.pipe_sizes = [50, 75, 100, 150, 200, 250, 300, 375, 450, 525, 600];
            filterData.pipe_statuses = ['good', 'warning', 'critical', 'blocked', 'partial'];
        }
        
        // Also load inspectors from manholes list as backup
        try {
            const manholesRes = await fetch(`${API_BASE_URL}/manholes/list?limit=1000`);
            if (manholesRes.ok) {
                const manholes = await manholesRes.json();
                const inspectorsFromList = [...new Set(manholes.map(m => m.inspector).filter(i => i && i !== 'all'))];
                if (inspectorsFromList.length > filterData.inspectors.length) {
                    filterData.inspectors = inspectorsFromList;
                    console.log(`Loaded ${filterData.inspectors.length} inspectors from manholes list`);
                }
            }
        } catch (e) {
            console.warn('Could not load inspectors from list:', e);
        }
        
    } catch (error) {
        console.error('Error loading filter data:', error);
    }
}

// ============================================
// CASCADING FILTERS
// ============================================

async function updateCascadingOptions(suburb) {
    if (!suburb || suburb === 'all') {
        // Reset to all options - load from main filter options
        try {
            const response = await fetch(`${API_BASE_URL}/suburbs/filter-options`);
            if (response.ok) {
                const data = await response.json();
                filterData.townships = data.townships || [];
                filterData.zones = data.zones || [];
                filterData.wards = data.wards || [];
                filterData.op_zones = data.op_zones || [];
            }
        } catch (error) {
            console.error('Error resetting cascading options:', error);
        }
    } else {
        // Get options filtered by suburb
        try {
            const response = await fetch(`${API_BASE_URL}/suburbs/cascade?suburb=${encodeURIComponent(suburb)}`);
            if (response.ok) {
                const data = await response.json();
                filterData.townships = data.townships || [];
                filterData.zones = data.zones || [];
                filterData.wards = data.wards || [];
                filterData.op_zones = data.op_zones || [];
                console.log(`Cascading options for ${suburb}:`, {
                    townships: filterData.townships.length,
                    zones: filterData.zones.length,
                    wards: filterData.wards.length,
                    op_zones: filterData.op_zones.length
                });
            }
        } catch (error) {
            console.error('Error updating cascading options:', error);
        }
    }
    
    // Update dropdown UIs
    if (townshipSelect) {
        townshipSelect.innerHTML = '<option value="all">ALL</option>' + 
            filterData.townships.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    if (zoneSelect) {
        zoneSelect.innerHTML = '<option value="all">ALL</option>' + 
            filterData.zones.map(z => `<option value="${z}">Zone ${z}</option>`).join('');
    }
    if (wardSelect) {
        wardSelect.innerHTML = '<option value="all">ALL</option>' + 
            filterData.wards.map(w => `<option value="${w}">Ward ${w}</option>`).join('');
    }
    if (opZoneSelect) {
        opZoneSelect.innerHTML = '<option value="all">ALL</option>' + 
            filterData.op_zones.map(oz => `<option value="${oz}">Op Zone ${oz}</option>`).join('');
    }
}

// ============================================
// API FUNCTIONS - Using correct column names
// ============================================

async function getFilteredManholes() {
    const params = new URLSearchParams();
    
    // Add all active filters - matches backend column names
    if (currentFilters.suburb_nam && currentFilters.suburb_nam !== 'all') 
        params.append('suburb', currentFilters.suburb_nam);
    if (currentFilters.township && currentFilters.township !== 'all') 
        params.append('township', currentFilters.township);
    if (currentFilters.zone && currentFilters.zone !== 'all') 
        params.append('zone', currentFilters.zone);
    if (currentFilters.ward && currentFilters.ward !== 'all') 
        params.append('ward', currentFilters.ward);
    if (currentFilters.op_zone && currentFilters.op_zone !== 'all') 
        params.append('op_zone', currentFilters.op_zone);
    if (currentFilters.manhole_status !== 'all') 
        params.append('status', currentFilters.manhole_status);
    if (currentFilters.manhole_depth_min) 
        params.append('depth_min', currentFilters.manhole_depth_min);
    if (currentFilters.manhole_depth_max) 
        params.append('depth_max', currentFilters.manhole_depth_max);
    if (currentFilters.inspector !== 'all') 
        params.append('inspector', currentFilters.inspector);
    if (currentFilters.date_from) 
        params.append('date_from', currentFilters.date_from);
    if (currentFilters.date_to) 
        params.append('date_to', currentFilters.date_to);
    if (currentFilters.search_text) 
        params.append('search', currentFilters.search_text);
    
    params.append('limit', 5000);
    
    console.log('Fetching manholes with params:', params.toString());
    
    try {
        const response = await fetch(`${API_BASE_URL}/manholes/list?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        currentData.manholes = data;
        console.log(`✅ Filtered to ${data.length} manholes`);
        return data;
    } catch (error) {
        console.error('Error fetching manholes:', error);
        return [];
    }
}

async function getFilteredPipelines() {
    const params = new URLSearchParams();
    
    // Add all active filters - matches backend column names (pipe_mat, pipe_size, block_stat)
    if (currentFilters.suburb_nam && currentFilters.suburb_nam !== 'all') 
        params.append('suburb', currentFilters.suburb_nam);
    if (currentFilters.township && currentFilters.township !== 'all') 
        params.append('township', currentFilters.township);
    if (currentFilters.pipe_material !== 'all') 
        params.append('material', currentFilters.pipe_material);
    if (currentFilters.pipe_size !== 'all') 
        params.append('size', currentFilters.pipe_size);
    if (currentFilters.pipe_status !== 'all') 
        params.append('status', currentFilters.pipe_status);
    if (currentFilters.length_min) 
        params.append('length_min', currentFilters.length_min);
    if (currentFilters.length_max) 
        params.append('length_max', currentFilters.length_max);
    if (currentFilters.search_text) 
        params.append('search', currentFilters.search_text);
    
    params.append('limit', 5000);
    
    console.log('Fetching pipelines with params:', params.toString());
    
    try {
        const response = await fetch(`${API_BASE_URL}/pipelines/list?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        currentData.pipelines = data;
        console.log(`✅ Filtered to ${data.length} pipelines`);
        return data;
    } catch (error) {
        console.error('Error fetching pipelines:', error);
        return [];
    }
}

// ============================================
// FILTER TRIGGER WITH LOADING STATES
// ============================================

async function triggerFilterChange() {
    if (isFiltering) {
        console.log('Filter already in progress, skipping...');
        return;
    }
    
    isFiltering = true;
    showFilterLoading(true);
    
    try {
        // Fetch both filtered datasets in parallel
        const [manholes, pipelines] = await Promise.all([
            getFilteredManholes(), 
            getFilteredPipelines()
        ]);
        
        // Dispatch custom event for map and list to update
        document.dispatchEvent(new CustomEvent('filtersChanged', { 
            detail: { 
                manholes: manholes, 
                pipelines: pipelines, 
                filters: currentFilters,
                manholeCount: manholes.length,
                pipelineCount: pipelines.length,
                totalCount: manholes.length + pipelines.length
            }
        }));
        
        console.log(`✅ Filter applied: ${manholes.length} manholes, ${pipelines.length} pipelines`);
        
        // Update UI with result count
        updateFilterResultCount(manholes.length + pipelines.length);
        
    } catch (err) {
        console.error('Error applying filters:', err);
        showFilterError('Failed to apply filters. Please try again.');
    } finally {
        isFiltering = false;
        showFilterLoading(false);
    }
}

function showFilterLoading(show) {
    const filterBtn = document.getElementById('mainFilterBtn');
    const applyBtn = document.getElementById('applyFiltersBtn');
    
    if (filterBtn) {
        if (show) {
            filterBtn.innerHTML = '⏳ FILTERING...';
            filterBtn.disabled = true;
            filterBtn.style.opacity = '0.7';
        } else {
            updateFilterButtonText();
            filterBtn.disabled = false;
            filterBtn.style.opacity = '1';
        }
    }
    
    if (applyBtn) {
        if (show) {
            applyBtn.innerHTML = '⏳ APPLYING...';
            applyBtn.disabled = true;
        } else {
            applyBtn.innerHTML = '✅ APPLY';
            applyBtn.disabled = false;
        }
    }
}

function showFilterError(message) {
    const errorDiv = document.getElementById('filterError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    } else {
        console.error(message);
    }
}

function updateFilterResultCount(count) {
    const resultSpan = document.getElementById('filterResultCount');
    if (resultSpan) {
        resultSpan.innerHTML = `📊 ${count} features shown`;
        resultSpan.style.display = 'inline-block';
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToJSON() {
    const exportData = { 
        filters: currentFilters, 
        data: currentData, 
        exported_at: new Date().toISOString(),
        total_features: currentData.manholes.length + currentData.pipelines.length
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sewer_export_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Exported data to JSON');
}

function exportToCSV() {
    const rows = [['Type', 'ID', 'Name', 'Suburb', 'Township', 'Status', 'Material', 'Size', 'Depth/Length', 'Inspector', 'Date'].join(',')];
    
    currentData.manholes.forEach(m => {
        rows.push(['Manhole', m.manhole_id || m.id, m.name || '', m.suburb || '', '', m.status || '', '', '', m.depth || '', m.inspector || '', m.inspection_date || ''].join(','));
    });
    
    currentData.pipelines.forEach(p => {
        rows.push(['Pipeline', p.pipe_id || p.id, p.name || '', '', '', p.status || '', p.material || '', p.diameter || '', p.length || '', '', ''].join(','));
    });
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sewer_export_${new Date().toISOString().slice(0,19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Exported data to CSV');
}

function exportToPDF() { 
    window.print(); 
}

function exportToSHP() { 
    alert('Shapefile export - Feature coming soon'); 
}

// ============================================
// RENDER MODAL
// ============================================

function renderModal() {
    return `
        <div id="filterModal" class="filter-modal">
            <div class="filter-modal-content">
                <div class="filter-modal-header">
                    <h3>🔍 FILTERS</h3>
                    <button id="closeFilterModal" class="close-modal">✕</button>
                </div>
                <div class="filter-modal-body">
                    <!-- ERROR DISPLAY -->
                    <div id="filterError" class="filter-error" style="display: none; background: #dc3545; color: white; padding: 8px; border-radius: 4px; margin-bottom: 10px;"></div>
                    
                    <!-- EXPORT SECTION -->
                    <div class="filter-section-group">
                        <h4>📤 EXPORT DATA</h4>
                        <div class="export-buttons">
                            <button id="exportJSONBtn" class="export-btn json">JSON</button>
                            <button id="exportCSVBtn" class="export-btn csv">CSV</button>
                            <button id="exportPDFBtn" class="export-btn pdf">PDF</button>
                            <button id="exportSHPBtn" class="export-btn shp">SHP</button>
                        </div>
                    </div>
                    
                    <!-- LOCATION SECTION -->
                    <div class="filter-section-group">
                        <h4>📍 LOCATION</h4>
                        <div class="filter-group">
                            <label>Suburb</label>
                            <select id="suburbSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.suburbs.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Township</label>
                            <select id="townshipSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.townships.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-row">
                            <div class="filter-group half">
                                <label>Zone</label>
                                <select id="zoneSelect" class="filter-input">
                                    <option value="all">ALL</option>
                                    ${filterData.zones.map(z => `<option value="${z}">Zone ${z}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group half">
                                <label>Ward</label>
                                <select id="wardSelect" class="filter-input">
                                    <option value="all">ALL</option>
                                    ${filterData.wards.map(w => `<option value="${w}">Ward ${w}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="filter-group">
                            <label>Operational Zone</label>
                            <select id="opZoneSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.op_zones.map(oz => `<option value="${oz}">Op Zone ${oz}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <!-- MANHOLE SECTION -->
                    <div class="filter-section-group">
                        <h4>🕳️ MANHOLES</h4>
                        <div class="filter-group">
                            <label>Blockage Status</label>
                            <select id="manholeStatusSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.manhole_statuses.map(s => `<option value="${s}">${String(s).toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-row">
                            <div class="filter-group half">
                                <label>Min Depth (m)</label>
                                <input type="number" id="depthMinInput" class="filter-input" step="0.1" placeholder="e.g., 1.5">
                            </div>
                            <div class="filter-group half">
                                <label>Max Depth (m)</label>
                                <input type="number" id="depthMaxInput" class="filter-input" step="0.1" placeholder="e.g., 5">
                            </div>
                        </div>
                    </div>
                    
                    <!-- PIPELINE SECTION -->
                    <div class="filter-section-group">
                        <h4>📏 PIPELINES</h4>
                        <div class="filter-group">
                            <label>Pipe Material</label>
                            <select id="pipeMaterialSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.pipe_materials.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Pipe Size (mm)</label>
                            <select id="pipeSizeSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.pipe_sizes.map(s => `<option value="${s}">${s} mm</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Blockage Status</label>
                            <select id="pipeStatusSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.pipe_statuses.map(s => `<option value="${s}">${String(s).toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-row">
                            <div class="filter-group half">
                                <label>Min Length (m)</label>
                                <input type="number" id="lengthMinInput" class="filter-input" step="1" placeholder="e.g., 10">
                            </div>
                            <div class="filter-group half">
                                <label>Max Length (m)</label>
                                <input type="number" id="lengthMaxInput" class="filter-input" step="1" placeholder="e.g., 100">
                            </div>
                        </div>
                    </div>
                    
                    <!-- INSPECTOR SECTION -->
                    <div class="filter-section-group">
                        <h4>👤 INSPECTOR</h4>
                        <div class="filter-group">
                            <select id="inspectorSelect" class="filter-input">
                                <option value="all">ALL</option>
                                ${filterData.inspectors.map(i => `<option value="${i}">${i}</option>`).join('')}
                            </select>
                        </div>
                        <div class="date-range">
                            <input type="date" id="dateFromInput" class="filter-input" placeholder="From Date">
                            <input type="date" id="dateToInput" class="filter-input" placeholder="To Date">
                        </div>
                    </div>
                    
                    <!-- SEARCH SECTION -->
                    <div class="filter-section-group">
                        <h4>🔎 SEARCH</h4>
                        <div class="filter-group">
                            <input type="text" id="searchTextInput" class="filter-input" placeholder="Search by ID, suburb, pipe ID...">
                        </div>
                    </div>
                    
                    <!-- ACTIVE FILTERS SUMMARY -->
                    <div id="filterSummary" class="filter-summary" style="display: none;">
                        <div class="filter-summary-title">Active Filters:</div>
                        <div id="filterTags" class="filter-tags"></div>
                    </div>
                </div>
                <div class="filter-modal-footer">
                    <span id="filterResultCount" class="filter-result-count" style="display: none;"></span>
                    <button id="resetFiltersBtn" class="reset-btn">🗑️ RESET</button>
                    <button id="applyFiltersBtn" class="apply-btn">✅ APPLY</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// UPDATE UI FUNCTIONS
// ============================================

function updateFilterSummary() {
    const activeFilters = [];
    if (tempFilters.suburb_nam && tempFilters.suburb_nam !== 'all') activeFilters.push(`Suburb: ${tempFilters.suburb_nam}`);
    if (tempFilters.township && tempFilters.township !== 'all') activeFilters.push(`Township: ${tempFilters.township}`);
    if (tempFilters.zone && tempFilters.zone !== 'all') activeFilters.push(`Zone: ${tempFilters.zone}`);
    if (tempFilters.ward && tempFilters.ward !== 'all') activeFilters.push(`Ward: ${tempFilters.ward}`);
    if (tempFilters.op_zone && tempFilters.op_zone !== 'all') activeFilters.push(`Op Zone: ${tempFilters.op_zone}`);
    if (tempFilters.manhole_status && tempFilters.manhole_status !== 'all') activeFilters.push(`Manhole: ${tempFilters.manhole_status}`);
    if (tempFilters.pipe_material && tempFilters.pipe_material !== 'all') activeFilters.push(`Material: ${tempFilters.pipe_material}`);
    if (tempFilters.pipe_size && tempFilters.pipe_size !== 'all') activeFilters.push(`Size: ${tempFilters.pipe_size}mm`);
    if (tempFilters.inspector && tempFilters.inspector !== 'all') activeFilters.push(`Inspector: ${tempFilters.inspector}`);
    if (tempFilters.date_from) activeFilters.push(`From: ${tempFilters.date_from}`);
    if (tempFilters.date_to) activeFilters.push(`To: ${tempFilters.date_to}`);
    if (tempFilters.search_text) activeFilters.push(`Search: ${tempFilters.search_text}`);
    
    const summaryDiv = document.getElementById('filterSummary');
    const tagsDiv = document.getElementById('filterTags');
    
    if (summaryDiv && tagsDiv) {
        if (activeFilters.length > 0) {
            summaryDiv.style.display = 'block';
            tagsDiv.innerHTML = activeFilters.map(f => `<span class="filter-tag">${f}</span>`).join('');
        } else {
            summaryDiv.style.display = 'none';
        }
    }
}

function updateFilterButtonText() {
    const filterBtn = document.getElementById('mainFilterBtn');
    if (!filterBtn) return;
    
    let activeCount = 0;
    const keys = ['suburb_nam', 'township', 'zone', 'ward', 'op_zone', 'manhole_status', 'pipe_material', 'pipe_size', 'inspector'];
    keys.forEach(k => { if (currentFilters[k] && currentFilters[k] !== 'all') activeCount++; });
    if (currentFilters.search_text) activeCount++;
    if (currentFilters.manhole_depth_min) activeCount++;
    if (currentFilters.length_min) activeCount++;
    if (currentFilters.date_from) activeCount++;
    
    if (activeCount === 0) {
        filterBtn.innerHTML = '🔍 FILTERS';
        filterBtn.classList.remove('active-filter');
    } else {
        filterBtn.innerHTML = `🔍 FILTERS (${activeCount})`;
        filterBtn.classList.add('active-filter');
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openFilterModal() {
    tempFilters = JSON.parse(JSON.stringify(currentFilters));
    
    // Set dropdown values
    if (suburbSelect) suburbSelect.value = tempFilters.suburb_nam;
    if (townshipSelect) townshipSelect.value = tempFilters.township;
    if (zoneSelect) zoneSelect.value = tempFilters.zone;
    if (wardSelect) wardSelect.value = tempFilters.ward;
    if (opZoneSelect) opZoneSelect.value = tempFilters.op_zone;
    if (manholeStatusSelect) manholeStatusSelect.value = tempFilters.manhole_status;
    if (pipeMaterialSelect) pipeMaterialSelect.value = tempFilters.pipe_material;
    if (pipeSizeSelect) pipeSizeSelect.value = tempFilters.pipe_size;
    if (pipeStatusSelect) pipeStatusSelect.value = tempFilters.pipe_status;
    if (inspectorSelect) inspectorSelect.value = tempFilters.inspector;
    if (depthMinInput) depthMinInput.value = tempFilters.manhole_depth_min;
    if (depthMaxInput) depthMaxInput.value = tempFilters.manhole_depth_max;
    if (lengthMinInput) lengthMinInput.value = tempFilters.length_min;
    if (lengthMaxInput) lengthMaxInput.value = tempFilters.length_max;
    if (dateFromInput) dateFromInput.value = tempFilters.date_from;
    if (dateToInput) dateToInput.value = tempFilters.date_to;
    if (searchTextInput) searchTextInput.value = tempFilters.search_text;
    
    updateFilterSummary();
    
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'flex';
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'none';
}

async function applyFilters() {
    // Get values from dropdowns
    if (suburbSelect) tempFilters.suburb_nam = suburbSelect.value;
    if (townshipSelect) tempFilters.township = townshipSelect.value;
    if (zoneSelect) tempFilters.zone = zoneSelect.value;
    if (wardSelect) tempFilters.ward = wardSelect.value;
    if (opZoneSelect) tempFilters.op_zone = opZoneSelect.value;
    if (manholeStatusSelect) tempFilters.manhole_status = manholeStatusSelect.value;
    if (pipeMaterialSelect) tempFilters.pipe_material = pipeMaterialSelect.value;
    if (pipeSizeSelect) tempFilters.pipe_size = pipeSizeSelect.value;
    if (pipeStatusSelect) tempFilters.pipe_status = pipeStatusSelect.value;
    if (inspectorSelect) tempFilters.inspector = inspectorSelect.value;
    if (depthMinInput) tempFilters.manhole_depth_min = depthMinInput.value;
    if (depthMaxInput) tempFilters.manhole_depth_max = depthMaxInput.value;
    if (lengthMinInput) tempFilters.length_min = lengthMinInput.value;
    if (lengthMaxInput) tempFilters.length_max = lengthMaxInput.value;
    if (dateFromInput) tempFilters.date_from = dateFromInput.value;
    if (dateToInput) tempFilters.date_to = dateToInput.value;
    if (searchTextInput) tempFilters.search_text = searchTextInput.value;
    
    currentFilters = JSON.parse(JSON.stringify(tempFilters));
    updateFilterButtonText();
    closeFilterModal();
    await triggerFilterChange();
}

function resetFilters() {
    tempFilters = {
        suburb_nam: 'all', township: 'all', zone: 'all', ward: 'all', op_zone: 'all',
        manhole_status: 'all', manhole_depth_min: '', manhole_depth_max: '',
        pipe_material: 'all', pipe_size: 'all', pipe_status: 'all',
        length_min: '', length_max: '', inspector: 'all',
        date_from: '', date_to: '', search_text: ''
    };
    
    // Reset all dropdowns
    if (suburbSelect) suburbSelect.value = 'all';
    if (townshipSelect) townshipSelect.value = 'all';
    if (zoneSelect) zoneSelect.value = 'all';
    if (wardSelect) wardSelect.value = 'all';
    if (opZoneSelect) opZoneSelect.value = 'all';
    if (manholeStatusSelect) manholeStatusSelect.value = 'all';
    if (pipeMaterialSelect) pipeMaterialSelect.value = 'all';
    if (pipeSizeSelect) pipeSizeSelect.value = 'all';
    if (pipeStatusSelect) pipeStatusSelect.value = 'all';
    if (inspectorSelect) inspectorSelect.value = 'all';
    if (depthMinInput) depthMinInput.value = '';
    if (depthMaxInput) depthMaxInput.value = '';
    if (lengthMinInput) lengthMinInput.value = '';
    if (lengthMaxInput) lengthMaxInput.value = '';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    if (searchTextInput) searchTextInput.value = '';
    
    updateFilterSummary();
    
    // Reset cascading options
    updateCascadingOptions(null);
}

// ============================================
// EVENT HANDLERS
// ============================================

function attachModalEvents() {
    document.getElementById('closeFilterModal')?.addEventListener('click', closeFilterModal);
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);
    document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportToJSON);
    document.getElementById('exportCSVBtn')?.addEventListener('click', exportToCSV);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportToPDF);
    document.getElementById('exportSHPBtn')?.addEventListener('click', exportToSHP);
    
    // Cascading: when suburb changes, update other dropdowns
    document.getElementById('suburbSelect')?.addEventListener('change', (e) => {
        updateCascadingOptions(e.target.value);
    });
}

// ============================================
// INITIALIZATION
// ============================================

async function initFilters() {
    console.log('Initializing cascading filters...');
    
    await loadFilterData();
    
    // Create modal if not exists
    if (!document.getElementById('filterModal')) {
        document.body.insertAdjacentHTML('beforeend', renderModal());
        attachModalEvents();
    }
    
    // Initialize DOM element references AFTER modal is rendered
    suburbSelect = document.getElementById('suburbSelect');
    townshipSelect = document.getElementById('townshipSelect');
    zoneSelect = document.getElementById('zoneSelect');
    wardSelect = document.getElementById('wardSelect');
    opZoneSelect = document.getElementById('opZoneSelect');
    manholeStatusSelect = document.getElementById('manholeStatusSelect');
    pipeMaterialSelect = document.getElementById('pipeMaterialSelect');
    pipeSizeSelect = document.getElementById('pipeSizeSelect');
    pipeStatusSelect = document.getElementById('pipeStatusSelect');
    inspectorSelect = document.getElementById('inspectorSelect');
    depthMinInput = document.getElementById('depthMinInput');
    depthMaxInput = document.getElementById('depthMaxInput');
    lengthMinInput = document.getElementById('lengthMinInput');
    lengthMaxInput = document.getElementById('lengthMaxInput');
    dateFromInput = document.getElementById('dateFromInput');
    dateToInput = document.getElementById('dateToInput');
    searchTextInput = document.getElementById('searchTextInput');
    
    // Update filter button
    const filterBtn = document.getElementById('mainFilterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', openFilterModal);
    }
    
    updateFilterButtonText();
    console.log('Filters ready!');
}

// ============================================
// EXPORTS
// ============================================

export default {
    init: initFilters,
    getFilteredManholes,
    getFilteredPipelines,
    getCurrentFilters: () => currentFilters,
    exportToJSON,
    exportToCSV,
    exportToPDF,
    exportToSHP,
    triggerFilterChange
};