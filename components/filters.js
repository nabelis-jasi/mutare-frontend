// components/filters.js - Enhanced Filter with Modal Popup
// Includes: Suburb, Diameter, Material, Status, Pipe Size, Depth Range, Date Range, Inspector, Block Status, Priority

let currentFilters = {
    // Location filters
    suburb: 'all',
    township: 'all',
    ward: 'all',
    op_zone: 'all',
    
    // Physical filters
    diameter: 'all',
    diameter_min: '',
    diameter_max: '',
    material: 'all',
    pipe_size: 'all',
    length_range: 'all',
    depth_range: 'all',
    
    // Status filters
    status: 'all',
    block_status: 'all',
    priority: 'all',
    
    // Personnel filters
    inspector: 'all',
    assigned_to: 'all',
    
    // Date filters
    date_from: '',
    date_to: '',
    
    // Search
    search_text: '',
    
    // Multiple selection
    selected_suburbs: [],
    selected_materials: []
};

// Mock data
const allManholes = [
    { id: 1, name: 'MH-001', suburb: 'CBD', township: 'Central', ward: 1, op_zone: 'A', diameter: 150, material: 'concrete', status: 'critical', block_status: 'blocked', priority: 'high', inspector: 'John Smith', blockages: 12, lat: -18.9735, lng: 32.6705, last_inspected: '2024-03-15', depth: 3.5 },
    { id: 2, name: 'MH-002', suburb: 'Sakubva', township: 'East', ward: 2, op_zone: 'B', diameter: 100, material: 'PVC', status: 'warning', block_status: 'partial', priority: 'medium', inspector: 'Mary Jones', blockages: 5, lat: -18.9750, lng: 32.6720, last_inspected: '2024-02-10', depth: 2.8 },
    { id: 3, name: 'MH-003', suburb: 'Dangamvura', township: 'West', ward: 3, op_zone: 'C', diameter: 80, material: 'asbestos', status: 'good', block_status: 'clear', priority: 'low', inspector: 'Peter Moyo', blockages: 3, lat: -18.9780, lng: 32.6750, last_inspected: '2024-01-20', depth: 2.2 },
    { id: 4, name: 'MH-004', suburb: 'CBD', township: 'Central', ward: 1, op_zone: 'A', diameter: 120, material: 'concrete', status: 'critical', block_status: 'blocked', priority: 'urgent', inspector: 'John Smith', blockages: 15, lat: -18.9700, lng: 32.6660, last_inspected: '2024-03-01', depth: 4.0 },
    { id: 5, name: 'MH-005', suburb: 'Chikanga', township: 'North', ward: 4, op_zone: 'D', diameter: 130, material: 'concrete', status: 'warning', block_status: 'partial', priority: 'high', inspector: 'Tendai Ncube', blockages: 7, lat: -18.9650, lng: 32.6600, last_inspected: '2024-02-25', depth: 3.0 },
    { id: 6, name: 'MH-006', suburb: 'Yeovil', township: 'South', ward: 5, op_zone: 'E', diameter: 90, material: 'clay', status: 'good', block_status: 'clear', priority: 'low', inspector: 'Mary Jones', blockages: 2, lat: -18.9680, lng: 32.6550, last_inspected: '2024-03-10', depth: 2.5 }
];

const allPipelines = [
    { id: 1, name: 'PL-001', pipe_id: '13373', pipe_mat: 'E/W', pipe_size: 150, block_stat: 'partial', class: 'Primary', inspector: 'John Smith', status: 'warning', length: 4.35, coordinates: [[-18.9735, 32.6705], [-18.9750, 32.6720]] },
    { id: 2, name: 'PL-002', pipe_id: '36047', pipe_mat: 'PVC', pipe_size: 200, block_stat: 'clear', class: 'Secondary', inspector: 'Mary Jones', status: 'good', length: 12.5, coordinates: [[-18.9750, 32.6720], [-18.9780, 32.6750]] },
    { id: 3, name: 'PL-003', pipe_id: '45218', pipe_mat: 'Concrete', pipe_size: 300, block_stat: 'blocked', class: 'Trunk', inspector: 'Peter Moyo', status: 'critical', length: 25.8, coordinates: [[-18.9735, 32.6705], [-18.9700, 32.6660]] }
];

// Filter options
const filterOptions = {
    suburbs: ['CBD', 'Sakubva', 'Dangamvura', 'Chikanga', 'Yeovil', 'Bordervale', 'Westlea', 'Hillside'],
    townships: ['Central', 'East', 'West', 'North', 'South'],
    wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    op_zones: ['A', 'B', 'C', 'D', 'E', 'F'],
    materials: ['concrete', 'PVC', 'asbestos', 'clay', 'cast_iron', 'HDPE', 'steel'],
    statuses: ['critical', 'warning', 'good'],
    block_statuses: ['blocked', 'partial', 'clear', 'unknown'],
    priorities: ['urgent', 'high', 'medium', 'low'],
    inspectors: ['John Smith', 'Mary Jones', 'Peter Moyo', 'Tendai Ncube', 'Charles Dube'],
    pipe_materials: ['E/W', 'PVC', 'Concrete', 'Cast Iron', 'HDPE'],
    pipe_sizes: [50, 75, 100, 150, 200, 250, 300, 375, 450, 525, 600],
    length_ranges: [
        { value: 'short', label: '< 50 m', min: 0, max: 50 },
        { value: 'medium', label: '50 - 100 m', min: 50, max: 100 },
        { value: 'long', label: '> 100 m', min: 100, max: 9999 }
    ],
    depth_ranges: [
        { value: 'shallow', label: '< 2 m', min: 0, max: 2 },
        { value: 'medium', label: '2 - 4 m', min: 2, max: 4 },
        { value: 'deep', label: '> 4 m', min: 4, max: 100 }
    ]
};

// ============================================
// FILTER FUNCTIONS
// ============================================

function getFilteredManholes() {
    let filtered = [...allManholes];
    
    // Location filters
    if (currentFilters.suburb !== 'all') {
        filtered = filtered.filter(m => m.suburb === currentFilters.suburb);
    }
    if (currentFilters.township !== 'all') {
        filtered = filtered.filter(m => m.township === currentFilters.township);
    }
    if (currentFilters.ward !== 'all') {
        filtered = filtered.filter(m => m.ward == currentFilters.ward);
    }
    if (currentFilters.op_zone !== 'all') {
        filtered = filtered.filter(m => m.op_zone === currentFilters.op_zone);
    }
    
    // Physical filters
    if (currentFilters.diameter !== 'all') {
        filtered = filtered.filter(m => {
            if (currentFilters.diameter === 'small') return m.diameter < 100;
            if (currentFilters.diameter === 'medium') return m.diameter >= 100 && m.diameter <= 150;
            if (currentFilters.diameter === 'large') return m.diameter > 150;
            return true;
        });
    }
    if (currentFilters.diameter_min) {
        filtered = filtered.filter(m => m.diameter >= parseInt(currentFilters.diameter_min));
    }
    if (currentFilters.diameter_max) {
        filtered = filtered.filter(m => m.diameter <= parseInt(currentFilters.diameter_max));
    }
    if (currentFilters.material !== 'all') {
        filtered = filtered.filter(m => m.material === currentFilters.material);
    }
    if (currentFilters.depth_range !== 'all') {
        filtered = filtered.filter(m => {
            if (currentFilters.depth_range === 'shallow') return m.depth < 2;
            if (currentFilters.depth_range === 'medium') return m.depth >= 2 && m.depth <= 4;
            if (currentFilters.depth_range === 'deep') return m.depth > 4;
            return true;
        });
    }
    
    // Status filters
    if (currentFilters.status !== 'all') {
        filtered = filtered.filter(m => m.status === currentFilters.status);
    }
    if (currentFilters.block_status !== 'all') {
        filtered = filtered.filter(m => m.block_status === currentFilters.block_status);
    }
    if (currentFilters.priority !== 'all') {
        filtered = filtered.filter(m => m.priority === currentFilters.priority);
    }
    
    // Personnel filters
    if (currentFilters.inspector !== 'all') {
        filtered = filtered.filter(m => m.inspector === currentFilters.inspector);
    }
    
    // Date filters
    if (currentFilters.date_from) {
        filtered = filtered.filter(m => m.last_inspected >= currentFilters.date_from);
    }
    if (currentFilters.date_to) {
        filtered = filtered.filter(m => m.last_inspected <= currentFilters.date_to);
    }
    
    // Text search
    if (currentFilters.search_text) {
        const search = currentFilters.search_text.toLowerCase();
        filtered = filtered.filter(m => 
            m.name.toLowerCase().includes(search) ||
            m.suburb.toLowerCase().includes(search) ||
            m.material.toLowerCase().includes(search)
        );
    }
    
    // Multiple selection filters
    if (currentFilters.selected_suburbs.length > 0) {
        filtered = filtered.filter(m => currentFilters.selected_suburbs.includes(m.suburb));
    }
    if (currentFilters.selected_materials.length > 0) {
        filtered = filtered.filter(m => currentFilters.selected_materials.includes(m.material));
    }
    
    return filtered;
}

function getFilteredPipelines() {
    let filtered = [...allPipelines];
    
    if (currentFilters.pipe_size !== 'all') {
        filtered = filtered.filter(p => p.pipe_size == currentFilters.pipe_size);
    }
    if (currentFilters.pipe_mat !== 'all') {
        filtered = filtered.filter(p => p.pipe_mat === currentFilters.pipe_mat);
    }
    if (currentFilters.block_status !== 'all') {
        filtered = filtered.filter(p => p.block_stat === currentFilters.block_status);
    }
    if (currentFilters.length_range !== 'all') {
        filtered = filtered.filter(p => {
            const range = filterOptions.length_ranges.find(r => r.value === currentFilters.length_range);
            if (range) return p.length >= range.min && p.length <= range.max;
            return true;
        });
    }
    
    return filtered;
}

function getCurrentFilters() {
    return currentFilters;
}

function getAllManholes() {
    return allManholes;
}

function getAllPipelines() {
    return allPipelines;
}

// ============================================
// MODAL FUNCTIONS - FIXED
// ============================================

let tempFilters = { ...currentFilters };

function openFilterModal() {
    console.log('Opening filter modal...');
    tempFilters = JSON.parse(JSON.stringify(currentFilters));
    updateModalUI();
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('Modal displayed');
    } else {
        console.error('Modal element not found!');
        // Try to create modal if not exists
        createModalIfNotExists();
    }
}

function createModalIfNotExists() {
    const existingModal = document.getElementById('filterModal');
    if (!existingModal) {
        console.log('Creating modal dynamically...');
        const modalHtml = `
            <div id="filterModal" class="filter-modal" style="display:none;">
                <div class="filter-modal-content">
                    <div class="filter-modal-header">
                        <h3>🔍 ADVANCED FILTERS</h3>
                        <button id="closeFilterModal" class="close-modal">&times;</button>
                    </div>
                    <div class="filter-modal-body">
                        <p>Filter options will appear here. Please refresh the page.</p>
                    </div>
                    <div class="filter-modal-footer">
                        <button id="resetFiltersBtn" class="reset-btn">RESET ALL</button>
                        <button id="applyFiltersBtn" class="apply-btn">APPLY FILTERS</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        attachEvents();
        document.getElementById('filterModal').style.display = 'flex';
    }
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function applyFilters() {
    console.log('Applying filters:', tempFilters);
    currentFilters = JSON.parse(JSON.stringify(tempFilters));
    updateFilterButtonText();
    closeFilterModal();
    triggerFilterChange();
}

function resetFilters() {
    console.log('Resetting filters');
    tempFilters = {
        suburb: 'all', township: 'all', ward: 'all', op_zone: 'all',
        diameter: 'all', diameter_min: '', diameter_max: '', material: 'all',
        pipe_size: 'all', length_range: 'all', depth_range: 'all',
        status: 'all', block_status: 'all', priority: 'all',
        inspector: 'all', assigned_to: 'all',
        date_from: '', date_to: '',
        search_text: '',
        selected_suburbs: [], selected_materials: []
    };
    updateModalUI();
}

function updateTempFilter(filterType, value) {
    console.log('Updating filter:', filterType, value);
    tempFilters[filterType] = value;
    updateModalUI();
}

function toggleArrayFilter(filterType, value) {
    if (!tempFilters[filterType]) tempFilters[filterType] = [];
    const index = tempFilters[filterType].indexOf(value);
    if (index === -1) {
        tempFilters[filterType].push(value);
    } else {
        tempFilters[filterType].splice(index, 1);
    }
    updateModalUI();
}

function updateModalUI() {
    // Update all filter button states
    updateButtonGroup('#modalSuburbFilters', 'data-suburb', tempFilters.suburb);
    updateButtonGroup('#modalTownshipFilters', 'data-township', tempFilters.township);
    updateButtonGroup('#modalWardFilters', 'data-ward', tempFilters.ward);
    updateButtonGroup('#modalOpZoneFilters', 'data-op_zone', tempFilters.op_zone);
    updateButtonGroup('#modalDiameterFilters', 'data-diameter', tempFilters.diameter);
    updateButtonGroup('#modalMaterialFilters', 'data-material', tempFilters.material);
    updateButtonGroup('#modalStatusFilters', 'data-status', tempFilters.status);
    updateButtonGroup('#modalBlockStatusFilters', 'data-block_status', tempFilters.block_status);
    updateButtonGroup('#modalPriorityFilters', 'data-priority', tempFilters.priority);
    updateButtonGroup('#modalInspectorFilters', 'data-inspector', tempFilters.inspector);
    updateButtonGroup('#modalPipeSizeFilters', 'data-pipe_size', tempFilters.pipe_size);
    updateButtonGroup('#modalPipeMaterialFilters', 'data-pipe_mat', tempFilters.pipe_mat);
    updateButtonGroup('#modalLengthRangeFilters', 'data-length_range', tempFilters.length_range);
    updateButtonGroup('#modalDepthRangeFilters', 'data-depth_range', tempFilters.depth_range);
    
    // Update input values
    const diameterMin = document.getElementById('diameterMinInput');
    if (diameterMin) diameterMin.value = tempFilters.diameter_min;
    const diameterMax = document.getElementById('diameterMaxInput');
    if (diameterMax) diameterMax.value = tempFilters.diameter_max;
    const dateFrom = document.getElementById('dateFromInput');
    if (dateFrom) dateFrom.value = tempFilters.date_from;
    const dateTo = document.getElementById('dateToInput');
    if (dateTo) dateTo.value = tempFilters.date_to;
    const searchText = document.getElementById('searchTextInput');
    if (searchText) searchText.value = tempFilters.search_text;
}

function updateButtonGroup(selector, attribute, activeValue) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => {
        const value = btn.getAttribute(attribute);
        if (value === activeValue) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateFilterButtonText() {
    const filterBtn = document.getElementById('mainFilterBtn');
    if (!filterBtn) return;
    
    const activeCount = Object.entries(currentFilters).filter(([key, value]) => {
        if (key === 'selected_suburbs' || key === 'selected_materials') return value.length > 0;
        return value && value !== 'all' && value !== '';
    }).length;
    
    if (activeCount === 0) {
        filterBtn.innerHTML = '🔍 FILTER';
        filterBtn.classList.remove('active-filter');
    } else {
        filterBtn.innerHTML = `🔍 FILTER (${activeCount})`;
        filterBtn.classList.add('active-filter');
    }
}

function triggerFilterChange() {
    const event = new CustomEvent('filtersChanged', {
        detail: {
            manholes: getFilteredManholes(),
            pipelines: getFilteredPipelines(),
            filters: currentFilters
        }
    });
    document.dispatchEvent(event);
}

// ============================================
// RENDER HTML
// ============================================

function render() {
    return `
        <div class="filter-section">
            <button id="mainFilterBtn" class="filter-main-btn">🔍 FILTER</button>
        </div>
        
        <div id="filterModal" class="filter-modal" style="display:none;">
            <div class="filter-modal-content">
                <div class="filter-modal-header">
                    <h3>🔍 ADVANCED FILTERS</h3>
                    <button id="closeFilterModal" class="close-modal">&times;</button>
                </div>
                
                <div class="filter-modal-body">
                    <!-- LOCATION SECTION -->
                    <div class="filter-section-group">
                        <h4>📍 LOCATION</h4>
                        
                        <div class="filter-group">
                            <label>Suburb</label>
                            <div class="filter-buttons" id="modalSuburbFilters">
                                <button class="filter-btn active" data-suburb="all">ALL</button>
                                ${filterOptions.suburbs.map(s => `<button class="filter-btn" data-suburb="${s}">${s}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Township</label>
                            <div class="filter-buttons" id="modalTownshipFilters">
                                <button class="filter-btn active" data-township="all">ALL</button>
                                ${filterOptions.townships.map(t => `<button class="filter-btn" data-township="${t}">${t}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-row">
                            <div class="filter-group half">
                                <label>Ward</label>
                                <div class="filter-buttons" id="modalWardFilters">
                                    <button class="filter-btn active" data-ward="all">ALL</button>
                                    ${filterOptions.wards.map(w => `<button class="filter-btn" data-ward="${w}">${w}</button>`).join('')}
                                </div>
                            </div>
                            <div class="filter-group half">
                                <label>Operational Zone</label>
                                <div class="filter-buttons" id="modalOpZoneFilters">
                                    <button class="filter-btn active" data-op_zone="all">ALL</button>
                                    ${filterOptions.op_zones.map(z => `<button class="filter-btn" data-op_zone="${z}">${z}</button>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- PHYSICAL ATTRIBUTES SECTION -->
                    <div class="filter-section-group">
                        <h4>📐 PHYSICAL ATTRIBUTES</h4>
                        
                        <div class="filter-group">
                            <label>Diameter Range</label>
                            <div class="filter-buttons" id="modalDiameterFilters">
                                <button class="filter-btn active" data-diameter="all">ALL</button>
                                <button class="filter-btn" data-diameter="small">&lt; 100 mm</button>
                                <button class="filter-btn" data-diameter="medium">100 - 150 mm</button>
                                <button class="filter-btn" data-diameter="large">&gt; 150 mm</button>
                            </div>
                        </div>
                        
                        <div class="filter-row">
                            <div class="filter-group half">
                                <label>Min Diameter (mm)</label>
                                <input type="number" id="diameterMinInput" class="filter-input" placeholder="e.g., 100">
                            </div>
                            <div class="filter-group half">
                                <label>Max Diameter (mm)</label>
                                <input type="number" id="diameterMaxInput" class="filter-input" placeholder="e.g., 300">
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Material</label>
                            <div class="filter-buttons" id="modalMaterialFilters">
                                <button class="filter-btn active" data-material="all">ALL</button>
                                ${filterOptions.materials.map(m => `<button class="filter-btn" data-material="${m}">${m.toUpperCase()}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Depth Range</label>
                            <div class="filter-buttons" id="modalDepthRangeFilters">
                                <button class="filter-btn active" data-depth_range="all">ALL</button>
                                ${filterOptions.depth_ranges.map(d => `<button class="filter-btn" data-depth_range="${d.value}">${d.label}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- STATUS SECTION -->
                    <div class="filter-section-group">
                        <h4>⚠️ STATUS</h4>
                        
                        <div class="filter-group">
                            <label>Risk Status</label>
                            <div class="filter-buttons" id="modalStatusFilters">
                                <button class="filter-btn active" data-status="all">ALL</button>
                                ${filterOptions.statuses.map(s => `<button class="filter-btn" data-status="${s}">${s.toUpperCase()}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Blockage Status</label>
                            <div class="filter-buttons" id="modalBlockStatusFilters">
                                <button class="filter-btn active" data-block_status="all">ALL</button>
                                ${filterOptions.block_statuses.map(b => `<button class="filter-btn" data-block_status="${b}">${b.toUpperCase()}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Priority</label>
                            <div class="filter-buttons" id="modalPriorityFilters">
                                <button class="filter-btn active" data-priority="all">ALL</button>
                                ${filterOptions.priorities.map(p => `<button class="filter-btn" data-priority="${p}">${p.toUpperCase()}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- PIPELINE SPECIFIC SECTION -->
                    <div class="filter-section-group">
                        <h4>📏 PIPELINE SPECIFIC</h4>
                        
                        <div class="filter-group">
                            <label>Pipe Size (mm)</label>
                            <div class="filter-buttons" id="modalPipeSizeFilters">
                                <button class="filter-btn active" data-pipe_size="all">ALL</button>
                                ${filterOptions.pipe_sizes.map(s => `<button class="filter-btn" data-pipe_size="${s}">${s}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Pipe Material</label>
                            <div class="filter-buttons" id="modalPipeMaterialFilters">
                                <button class="filter-btn active" data-pipe_mat="all">ALL</button>
                                ${filterOptions.pipe_materials.map(m => `<button class="filter-btn" data-pipe_mat="${m}">${m}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>Length Range</label>
                            <div class="filter-buttons" id="modalLengthRangeFilters">
                                <button class="filter-btn active" data-length_range="all">ALL</button>
                                ${filterOptions.length_ranges.map(l => `<button class="filter-btn" data-length_range="${l.value}">${l.label}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- PERSONNEL SECTION -->
                    <div class="filter-section-group">
                        <h4>👤 PERSONNEL</h4>
                        
                        <div class="filter-group">
                            <label>Inspector</label>
                            <div class="filter-buttons" id="modalInspectorFilters">
                                <button class="filter-btn active" data-inspector="all">ALL</button>
                                ${filterOptions.inspectors.map(i => `<button class="filter-btn" data-inspector="${i}">${i}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- DATE SECTION -->
                    <div class="filter-section-group">
                        <h4>📅 INSPECTION DATE</h4>
                        
                        <div class="filter-row">
                            <div class="filter-group half">
                                <label>From Date</label>
                                <input type="date" id="dateFromInput" class="filter-input">
                            </div>
                            <div class="filter-group half">
                                <label>To Date</label>
                                <input type="date" id="dateToInput" class="filter-input">
                            </div>
                        </div>
                    </div>
                    
                    <!-- SEARCH SECTION -->
                    <div class="filter-section-group">
                        <h4>🔎 TEXT SEARCH</h4>
                        
                        <div class="filter-group">
                            <input type="text" id="searchTextInput" class="filter-input" placeholder="Search by ID, suburb, material...">
                        </div>
                    </div>
                </div>
                
                <div class="filter-modal-footer">
                    <button id="resetFiltersBtn" class="reset-btn">RESET ALL</button>
                    <button id="applyFiltersBtn" class="apply-btn">APPLY FILTERS</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ATTACH EVENTS
// ============================================

function attachEvents() {
    const mainBtn = document.getElementById('mainFilterBtn');
    if (mainBtn) {
        mainBtn.addEventListener('click', openFilterModal);
        console.log('Main filter button attached');
    }
    
    const closeBtn = document.getElementById('closeFilterModal');
    if (closeBtn) closeBtn.addEventListener('click', closeFilterModal);
    
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    
    // Close on outside click
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeFilterModal();
        });
    }
    
    // Attach all filter button events
    attachButtonEvents('#modalSuburbFilters', 'data-suburb', 'suburb');
    attachButtonEvents('#modalTownshipFilters', 'data-township', 'township');
    attachButtonEvents('#modalWardFilters', 'data-ward', 'ward');
    attachButtonEvents('#modalOpZoneFilters', 'data-op_zone', 'op_zone');
    attachButtonEvents('#modalDiameterFilters', 'data-diameter', 'diameter');
    attachButtonEvents('#modalMaterialFilters', 'data-material', 'material');
    attachButtonEvents('#modalStatusFilters', 'data-status', 'status');
    attachButtonEvents('#modalBlockStatusFilters', 'data-block_status', 'block_status');
    attachButtonEvents('#modalPriorityFilters', 'data-priority', 'priority');
    attachButtonEvents('#modalInspectorFilters', 'data-inspector', 'inspector');
    attachButtonEvents('#modalPipeSizeFilters', 'data-pipe_size', 'pipe_size');
    attachButtonEvents('#modalPipeMaterialFilters', 'data-pipe_mat', 'pipe_mat');
    attachButtonEvents('#modalLengthRangeFilters', 'data-length_range', 'length_range');
    attachButtonEvents('#modalDepthRangeFilters', 'data-depth_range', 'depth_range');
    
    // Input events
    const diamMin = document.getElementById('diameterMinInput');
    if (diamMin) diamMin.addEventListener('input', (e) => updateTempFilter('diameter_min', e.target.value));
    
    const diamMax = document.getElementById('diameterMaxInput');
    if (diamMax) diamMax.addEventListener('input', (e) => updateTempFilter('diameter_max', e.target.value));
    
    const dateFrom = document.getElementById('dateFromInput');
    if (dateFrom) dateFrom.addEventListener('input', (e) => updateTempFilter('date_from', e.target.value));
    
    const dateTo = document.getElementById('dateToInput');
    if (dateTo) dateTo.addEventListener('input', (e) => updateTempFilter('date_to', e.target.value));
    
    const searchText = document.getElementById('searchTextInput');
    if (searchText) searchText.addEventListener('input', (e) => updateTempFilter('search_text', e.target.value));
}

function attachButtonEvents(selector, attribute, filterType) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.getAttribute(attribute);
            updateTempFilter(filterType, value);
        });
    });
}

// ============================================
// INITIALIZATION
// ============================================

function initFilters() {
    console.log('Initializing enhanced filters...');
    attachEvents();
    updateFilterButtonText();
    console.log('Filters initialized');
}

// ============================================
// EXPORTS
// ============================================

export default {
    render: render,
    init: initFilters,
    getFilteredManholes: getFilteredManholes,
    getFilteredPipelines: getFilteredPipelines,
    getAllManholes: () => allManholes,
    getAllPipelines: () => allPipelines,
    getCurrent: getCurrentFilters
};
