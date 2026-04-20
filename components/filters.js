// components/filters.js - Simplified Filter Component
// Click buttons only - no complex dropdowns

let currentFilters = {
    suburb: 'all',
    diameter: 'all',
    material: 'all',
    status: 'all'
};

// Mock data
const allManholes = [
    { id: 1, name: 'MH-001', suburb: 'CBD', diameter: 150, material: 'concrete', status: 'critical', blockages: 12, lat: -18.9735, lng: 32.6705 },
    { id: 2, name: 'MH-002', suburb: 'Sakubva', diameter: 100, material: 'PVC', status: 'warning', blockages: 5, lat: -18.9750, lng: 32.6720 },
    { id: 3, name: 'MH-003', suburb: 'Dangamvura', diameter: 80, material: 'asbestos', status: 'good', blockages: 3, lat: -18.9780, lng: 32.6750 },
    { id: 4, name: 'MH-004', suburb: 'CBD', diameter: 120, material: 'concrete', status: 'critical', blockages: 15, lat: -18.9700, lng: 32.6660 },
    { id: 5, name: 'MH-005', suburb: 'Chikanga', diameter: 130, material: 'concrete', status: 'warning', blockages: 7, lat: -18.9650, lng: 32.6600 },
    { id: 6, name: 'MH-006', suburb: 'Yeovil', diameter: 90, material: 'clay', status: 'good', blockages: 2, lat: -18.9680, lng: 32.6550 }
];

const allPipelines = [
    { id: 1, name: 'PL-001', status: 'warning', coordinates: [[-18.9735, 32.6705], [-18.9750, 32.6720]] },
    { id: 2, name: 'PL-002', status: 'good', coordinates: [[-18.9750, 32.6720], [-18.9780, 32.6750]] },
    { id: 3, name: 'PL-003', status: 'critical', coordinates: [[-18.9735, 32.6705], [-18.9700, 32.6660]] }
];

// ============================================
// FILTER FUNCTIONS
// ============================================

function getFilteredManholes() {
    return allManholes.filter(asset => {
        // Suburb filter
        if (currentFilters.suburb !== 'all' && asset.suburb !== currentFilters.suburb) return false;
        
        // Diameter filter
        if (currentFilters.diameter !== 'all') {
            const diam = asset.diameter;
            if (currentFilters.diameter === 'small' && diam >= 100) return false;
            if (currentFilters.diameter === 'medium' && (diam < 100 || diam > 150)) return false;
            if (currentFilters.diameter === 'large' && diam <= 150) return false;
        }
        
        // Material filter
        if (currentFilters.material !== 'all' && asset.material !== currentFilters.material) return false;
        
        // Status filter
        if (currentFilters.status !== 'all' && asset.status !== currentFilters.status) return false;
        
        return true;
    });
}

function getFilteredPipelines() {
    if (currentFilters.status === 'all') return allPipelines;
    return allPipelines.filter(p => p.status === currentFilters.status);
}

function getAllManholes() {
    return allManholes;
}

function getAllPipelines() {
    return allPipelines;
}

function getCurrentFilters() {
    return currentFilters;
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateFilterUI() {
    // Update suburb buttons
    document.querySelectorAll('#suburbFilters .filter-btn').forEach(btn => {
        const value = btn.getAttribute('data-suburb');
        if (value === currentFilters.suburb) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update diameter buttons
    document.querySelectorAll('#diameterFilters .filter-btn').forEach(btn => {
        const value = btn.getAttribute('data-diameter');
        if (value === currentFilters.diameter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update material buttons
    document.querySelectorAll('#materialFilters .filter-btn').forEach(btn => {
        const value = btn.getAttribute('data-material');
        if (value === currentFilters.material) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update status buttons
    document.querySelectorAll('#statusFilters .filter-btn').forEach(btn => {
        const value = btn.getAttribute('data-status');
        if (value === currentFilters.status) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update active filters display
    const activeList = [];
    if (currentFilters.suburb !== 'all') activeList.push(`Suburb: ${currentFilters.suburb}`);
    if (currentFilters.diameter !== 'all') activeList.push(`Diameter: ${currentFilters.diameter}`);
    if (currentFilters.material !== 'all') activeList.push(`Material: ${currentFilters.material}`);
    if (currentFilters.status !== 'all') activeList.push(`Status: ${currentFilters.status}`);
    
    const activeDiv = document.getElementById('activeFilters');
    if (activeDiv) {
        if (activeList.length === 0) {
            activeDiv.innerHTML = 'No active filters (showing all)';
        } else {
            activeDiv.innerHTML = activeList.join(' | ');
        }
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

function clearAllFilters() {
    currentFilters = {
        suburb: 'all',
        diameter: 'all',
        material: 'all',
        status: 'all'
    };
    
    // Reset all buttons to active state for 'all'
    document.querySelectorAll('#suburbFilters .filter-btn, #diameterFilters .filter-btn, #materialFilters .filter-btn, #statusFilters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-suburb') === 'all' ||
            btn.getAttribute('data-diameter') === 'all' ||
            btn.getAttribute('data-material') === 'all' ||
            btn.getAttribute('data-status') === 'all') {
            btn.classList.add('active');
        }
    });
    
    updateFilterUI();
    triggerFilterChange();
}

// ============================================
// ATTACH EVENTS
// ============================================

function attachFilterEvents() {
    // Suburb filter buttons
    document.querySelectorAll('#suburbFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-suburb');
            currentFilters.suburb = value;
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Diameter filter buttons
    document.querySelectorAll('#diameterFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-diameter');
            currentFilters.diameter = value;
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Material filter buttons
    document.querySelectorAll('#materialFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-material');
            currentFilters.material = value;
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Status filter buttons
    document.querySelectorAll('#statusFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-status');
            currentFilters.status = value;
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Clear all button
    const clearBtn = document.getElementById('clearAllFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

// ============================================
// RENDER FILTERS HTML
// ============================================

function render() {
    return `
        <div class="section">
            <h3>📍 FILTER BY SUBURB</h3>
            <div class="filter-buttons" id="suburbFilters">
                <button class="filter-btn active" data-suburb="all">ALL</button>
                <button class="filter-btn" data-suburb="CBD">CBD</button>
                <button class="filter-btn" data-suburb="Sakubva">SAKUBVA</button>
                <button class="filter-btn" data-suburb="Dangamvura">DANGAMVURA</button>
                <button class="filter-btn" data-suburb="Chikanga">CHIKANGA</button>
                <button class="filter-btn" data-suburb="Yeovil">YEOVIL</button>
            </div>
        </div>
        
        <div class="section">
            <h3>📏 FILTER BY DIAMETER (mm)</h3>
            <div class="filter-buttons" id="diameterFilters">
                <button class="filter-btn active" data-diameter="all">ALL</button>
                <button class="filter-btn" data-diameter="small">&lt; 100 mm</button>
                <button class="filter-btn" data-diameter="medium">100 - 150 mm</button>
                <button class="filter-btn" data-diameter="large">&gt; 150 mm</button>
            </div>
        </div>
        
        <div class="section">
            <h3>🧱 FILTER BY MATERIAL</h3>
            <div class="filter-buttons" id="materialFilters">
                <button class="filter-btn active" data-material="all">ALL</button>
                <button class="filter-btn" data-material="concrete">CONCRETE</button>
                <button class="filter-btn" data-material="PVC">PVC</button>
                <button class="filter-btn" data-material="asbestos">ASBESTOS</button>
                <button class="filter-btn" data-material="clay">CLAY</button>
            </div>
        </div>
        
        <div class="section">
            <h3>⚠️ FILTER BY RISK STATUS</h3>
            <div class="filter-buttons" id="statusFilters">
                <button class="filter-btn active" data-status="all">ALL</button>
                <button class="filter-btn" data-status="critical">CRITICAL (High Risk)</button>
                <button class="filter-btn" data-status="warning">WARNING (Medium Risk)</button>
                <button class="filter-btn" data-status="good">GOOD (Low Risk)</button>
            </div>
        </div>
        
        <div class="section">
            <h3>🔍 ACTIVE FILTERS</h3>
            <div id="activeFilters" class="active-filter">No active filters (showing all)</div>
            <button id="clearAllFilters" style="width:100%; margin-top:10px;">🗑️ CLEAR ALL FILTERS</button>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

function initFilters() {
    attachFilterEvents();
    updateFilterUI();
}

// ============================================
// EXPORTS
// ============================================

export default {
    render: render,
    init: initFilters,
    getFilteredManholes: getFilteredManholes,
    getFilteredPipelines: getFilteredPipelines,
    getAllManholes: getAllManholes,
    getAllPipelines: getAllPipelines,
    getCurrent: getCurrentFilters,
    clearAll: clearAllFilters
};
