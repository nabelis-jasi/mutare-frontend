// ============================================
// FILTERS.JS - Handles all filtering logic
// ============================================

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
    { id: 1, name: 'PL-001', start_mh: 'MH-001', end_mh: 'MH-002', diameter: 200, material: 'concrete', status: 'warning', coordinates: [[-18.9735, 32.6705], [-18.9750, 32.6720]] },
    { id: 2, name: 'PL-002', start_mh: 'MH-002', end_mh: 'MH-003', diameter: 150, material: 'PVC', status: 'good', coordinates: [[-18.9750, 32.6720], [-18.9780, 32.6750]] },
    { id: 3, name: 'PL-003', start_mh: 'MH-001', end_mh: 'MH-004', diameter: 250, material: 'concrete', status: 'critical', coordinates: [[-18.9735, 32.6705], [-18.9700, 32.6660]] },
    { id: 4, name: 'PL-004', start_mh: 'MH-004', end_mh: 'MH-005', diameter: 180, material: 'PVC', status: 'warning', coordinates: [[-18.9700, 32.6660], [-18.9650, 32.6600]] }
];

// Initialize filters
function initFilters() {
    // Suburb filter
    document.querySelectorAll('#suburbFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilters.suburb = this.getAttribute('data-suburb');
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Diameter filter
    document.querySelectorAll('#diameterFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilters.diameter = this.getAttribute('data-diameter');
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Material filter
    document.querySelectorAll('#materialFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilters.material = this.getAttribute('data-material');
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Status filter
    document.querySelectorAll('#statusFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilters.status = this.getAttribute('data-status');
            updateFilterUI();
            triggerFilterChange();
        });
    });
    
    // Clear all
    document.getElementById('clearAllFilters')?.addEventListener('click', function() {
        currentFilters = { suburb: 'all', diameter: 'all', material: 'all', status: 'all' };
        updateFilterUI();
        triggerFilterChange();
    });
}

function updateFilterUI() {
    // Update suburb buttons
    document.querySelectorAll('#suburbFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-suburb') === currentFilters.suburb);
    });
    
    // Update diameter buttons
    document.querySelectorAll('#diameterFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-diameter') === currentFilters.diameter);
    });
    
    // Update material buttons
    document.querySelectorAll('#materialFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-material') === currentFilters.material);
    });
    
    // Update status buttons
    document.querySelectorAll('#statusFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-status') === currentFilters.status);
    });
    
    // Update display text
    const activeList = [];
    if (currentFilters.suburb !== 'all') activeList.push(`Suburb: ${currentFilters.suburb}`);
    if (currentFilters.diameter !== 'all') activeList.push(`Diameter: ${currentFilters.diameter}`);
    if (currentFilters.material !== 'all') activeList.push(`Material: ${currentFilters.material}`);
    if (currentFilters.status !== 'all') activeList.push(`Status: ${currentFilters.status}`);
    
    const activeDiv = document.getElementById('activeFilters');
    if (activeDiv) {
        activeDiv.innerHTML = activeList.length === 0 ? 'No active filters (showing all)' : activeList.join(' | ');
    }
}

function triggerFilterChange() {
    const filteredManholes = getFilteredManholes();
    const filteredPipelines = getFilteredPipelines();
    
    const event = new CustomEvent('filtersChanged', {
        detail: {
            manholes: filteredManholes,
            pipelines: filteredPipelines,
            filters: currentFilters
        }
    });
    document.dispatchEvent(event);
}

function getFilteredManholes() {
    return allManholes.filter(asset => {
        if (currentFilters.suburb !== 'all' && asset.suburb !== currentFilters.suburb) return false;
        
        if (currentFilters.diameter !== 'all') {
            if (currentFilters.diameter === 'small' && asset.diameter >= 100) return false;
            if (currentFilters.diameter === 'medium' && (asset.diameter < 100 || asset.diameter > 150)) return false;
            if (currentFilters.diameter === 'large' && asset.diameter <= 150) return false;
        }
        
        if (currentFilters.material !== 'all' && asset.material !== currentFilters.material) return false;
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

// Export for use in other files
window.Filters = {
    init: initFilters,
    getFilteredManholes: getFilteredManholes,
    getFilteredPipelines: getFilteredPipelines,
    getAllManholes: getAllManholes,
    getAllPipelines: getAllPipelines,
    getCurrent: function() { return currentFilters; }
};
