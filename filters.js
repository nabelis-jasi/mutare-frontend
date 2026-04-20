// ============================================
// FILTERS.JS - Accordion Filter Component
// Handles all filter folders and filtering logic
// ============================================

// Filter state
let currentFilters = {
    suburb: 'all',
    diameter: 'all',
    material: 'all',
    status: 'all'
};

// Available filter options
const filterOptions = {
    suburbs: ['CBD', 'Sakubva', 'Dangamvura', 'Chikanga', 'Yeovil'],
    diameters: [
        { value: 'small', label: '< 100 mm', min: 0, max: 100 },
        { value: 'medium', label: '100 - 150 mm', min: 100, max: 150 },
        { value: 'large', label: '> 150 mm', min: 150, max: 9999 }
    ],
    materials: ['concrete', 'PVC', 'asbestos', 'clay', 'cast_iron'],
    statuses: [
        { value: 'critical', label: 'CRITICAL (High Risk)', color: '#dc3545' },
        { value: 'warning', label: 'WARNING (Medium Risk)', color: '#ffc107' },
        { value: 'good', label: 'GOOD (Low Risk)', color: '#28a745' }
    ]
};

// Initialize all accordion filters
function initFilters() {
    buildAccordionFolders();
    attachFilterEvents();
    updateActiveFiltersDisplay();
}

// Build all accordion folders dynamically
function buildAccordionFolders() {
    const container = document.getElementById('filtersContainer');
    if (!container) return;
    
    const folders = [
        { id: 'suburb', title: '📍 FILTER BY SUBURB', icon: '🏘️', type: 'suburb' },
        { id: 'diameter', title: '📏 FILTER BY DIAMETER (mm)', icon: '📐', type: 'diameter' },
        { id: 'material', title: '🧱 FILTER BY MATERIAL', icon: '🧱', type: 'material' },
        { id: 'status', title: '⚠️ FILTER BY RISK STATUS', icon: '⚠️', type: 'status' }
    ];
    
    container.innerHTML = '';
    
    for (var i = 0; i < folders.length; i++) {
        var folder = folders[i];
        var section = document.createElement('div');
        section.className = 'accordion-section';
        
        // Header
        var header = document.createElement('div');
        header.className = 'accordion-header';
        header.setAttribute('data-accordion', folder.id);
        header.innerHTML = '<span>' + folder.icon + ' ' + folder.title + '</span><span class="arrow">▶</span>';
        
        // Content
        var content = document.createElement('div');
        content.className = 'accordion-content';
        content.setAttribute('data-content', folder.id);
        
        var inner = document.createElement('div');
        inner.className = 'accordion-content-inner';
        
        // Add filter buttons based on type
        var buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'filter-buttons';
        buttonsDiv.id = folder.id + 'Filters';
        
        // Add "ALL" button first
        var allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.setAttribute('data-' + folder.type, 'all');
        allBtn.textContent = 'ALL';
        buttonsDiv.appendChild(allBtn);
        
        // Add specific buttons
        if (folder.type === 'suburb') {
            for (var s = 0; s < filterOptions.suburbs.length; s++) {
                var btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.setAttribute('data-suburb', filterOptions.suburbs[s]);
                btn.textContent = filterOptions.suburbs[s];
                buttonsDiv.appendChild(btn);
            }
        }
        
        if (folder.type === 'diameter') {
            for (var d = 0; d < filterOptions.diameters.length; d++) {
                var btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.setAttribute('data-diameter', filterOptions.diameters[d].value);
                btn.textContent = filterOptions.diameters[d].label;
                buttonsDiv.appendChild(btn);
            }
        }
        
        if (folder.type === 'material') {
            for (var m = 0; m < filterOptions.materials.length; m++) {
                var btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.setAttribute('data-material', filterOptions.materials[m]);
                btn.textContent = filterOptions.materials[m].toUpperCase();
                buttonsDiv.appendChild(btn);
            }
        }
        
        if (folder.type === 'status') {
            for (var st = 0; st < filterOptions.statuses.length; st++) {
                var btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.setAttribute('data-status', filterOptions.statuses[st].value);
                btn.textContent = filterOptions.statuses[st].label;
                buttonsDiv.appendChild(btn);
            }
        }
        
        inner.appendChild(buttonsDiv);
        content.appendChild(inner);
        section.appendChild(header);
        section.appendChild(content);
        container.appendChild(section);
    }
    
    // Open first folder by default
    var firstHeader = document.querySelector('.accordion-header');
    if (firstHeader) {
        firstHeader.classList.add('active');
        var firstContent = document.querySelector('.accordion-content');
        if (firstContent) firstContent.classList.add('active');
    }
}

// Attach click events to accordion headers and filter buttons
function attachFilterEvents() {
    // Accordion toggle
    var headers = document.querySelectorAll('.accordion-header');
    for (var i = 0; i < headers.length; i++) {
        headers[i].addEventListener('click', function() {
            var accordionId = this.getAttribute('data-accordion');
            var content = document.querySelector('.accordion-content[data-content="' + accordionId + '"]');
            this.classList.toggle('active');
            content.classList.toggle('active');
        });
    }
    
    // Suburb filter buttons
    var suburbBtns = document.querySelectorAll('#suburbFilters .filter-btn');
    for (var i = 0; i < suburbBtns.length; i++) {
        suburbBtns[i].addEventListener('click', function() {
            var value = this.getAttribute('data-suburb');
            updateFilter('suburb', value, '#suburbFilters');
        });
    }
    
    // Diameter filter buttons
    var diameterBtns = document.querySelectorAll('#diameterFilters .filter-btn');
    for (var i = 0; i < diameterBtns.length; i++) {
        diameterBtns[i].addEventListener('click', function() {
            var value = this.getAttribute('data-diameter');
            updateFilter('diameter', value, '#diameterFilters');
        });
    }
    
    // Material filter buttons
    var materialBtns = document.querySelectorAll('#materialFilters .filter-btn');
    for (var i = 0; i < materialBtns.length; i++) {
        materialBtns[i].addEventListener('click', function() {
            var value = this.getAttribute('data-material');
            updateFilter('material', value, '#materialFilters');
        });
    }
    
    // Status filter buttons
    var statusBtns = document.querySelectorAll('#statusFilters .filter-btn');
    for (var i = 0; i < statusBtns.length; i++) {
        statusBtns[i].addEventListener('click', function() {
            var value = this.getAttribute('data-status');
            updateFilter('status', value, '#statusFilters');
        });
    }
    
    // Clear all filters button
    var clearBtn = document.getElementById('clearAllFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

// Update a specific filter
function updateFilter(filterType, value, selector) {
    // Update button active states
    var buttons = document.querySelectorAll(selector + ' .filter-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    event.target.classList.add('active');
    
    // Update filter state
    currentFilters[filterType] = value;
    
    // Update display
    updateActiveFiltersDisplay();
    
    // Trigger filter applied event for main app
    var filterEvent = new CustomEvent('filtersChanged', { detail: currentFilters });
    document.dispatchEvent(filterEvent);
}

// Clear all filters
function clearAllFilters() {
    currentFilters = {
        suburb: 'all',
        diameter: 'all',
        material: 'all',
        status: 'all'
    };
    
    // Reset all button active states
    var allFilterGroups = document.querySelectorAll('.filter-buttons');
    for (var i = 0; i < allFilterGroups.length; i++) {
        var btns = allFilterGroups[i].querySelectorAll('.filter-btn');
        for (var j = 0; j < btns.length; j++) {
            btns[j].classList.remove('active');
            if (btns[j].getAttribute('data-suburb') === 'all' ||
                btns[j].getAttribute('data-diameter') === 'all' ||
                btns[j].getAttribute('data-material') === 'all' ||
                btns[j].getAttribute('data-status') === 'all') {
                btns[j].classList.add('active');
            }
        }
    }
    
    updateActiveFiltersDisplay();
    
    // Trigger filter event
    var filterEvent = new CustomEvent('filtersChanged', { detail: currentFilters });
    document.dispatchEvent(filterEvent);
}

// Update the active filters display text
function updateActiveFiltersDisplay() {
    var activeList = [];
    if (currentFilters.suburb !== 'all') activeList.push('Suburb: ' + currentFilters.suburb);
    if (currentFilters.diameter !== 'all') {
        var diamLabel = '';
        for (var i = 0; i < filterOptions.diameters.length; i++) {
            if (filterOptions.diameters[i].value === currentFilters.diameter) {
                diamLabel = filterOptions.diameters[i].label;
                break;
            }
        }
        activeList.push('Diameter: ' + diamLabel);
    }
    if (currentFilters.material !== 'all') activeList.push('Material: ' + currentFilters.material.toUpperCase());
    if (currentFilters.status !== 'all') {
        var statusLabel = '';
        for (var i = 0; i < filterOptions.statuses.length; i++) {
            if (filterOptions.statuses[i].value === currentFilters.status) {
                statusLabel = filterOptions.statuses[i].label;
                break;
            }
        }
        activeList.push('Status: ' + statusLabel);
    }
    
    var displayDiv = document.getElementById('activeFilters');
    if (displayDiv) {
        if (activeList.length === 0) {
            displayDiv.innerHTML = 'No active filters (showing all)';
        } else {
            displayDiv.innerHTML = activeList.join(' | ');
        }
    }
}

// Apply filters to asset data
function applyFiltersToAssets(assets) {
    return assets.filter(function(asset) {
        // Suburb filter
        if (currentFilters.suburb !== 'all' && asset.suburb !== currentFilters.suburb) return false;
        
        // Diameter filter
        if (currentFilters.diameter !== 'all') {
            var diam = asset.diameter || 0;
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

// Get current filters
function getCurrentFilters() {
    return currentFilters;
}

// Export functions for use in main script
window.Filters = {
    init: initFilters,
    applyToAssets: applyFiltersToAssets,
    getCurrent: getCurrentFilters,
    clearAll: clearAllFilters
};
