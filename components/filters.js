// components/filters.js
// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Cascading Filter System
//
// Key design decisions:
//   • HIERARCHICAL CASCADING: op_zone → township → ward → suburb
//   • ALL filters are independent — a null column value never disqualifies a row
//     unless the user explicitly filters on that field.
//   • After Apply, the map is re-fetched with the filter params so only matching
//     features are highlighted in NEON YELLOW (#FFFF00) with pulse effect
//   • loadDynamicFilterOptions() drives all dropdowns from real DB data.
//   • Cascading respects parent-child relationships and never wipes a
//     selection the user already made.
//   • HARDCODED AREA DATA is injected into dropdowns for predefined zones/suburbs
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:5000/api';

// ─── HARDCODED AREA DATA ────────────────────────────────────────────────────
// Format: id | zone_code | area_name | township | ward | min_depth | max_depth | op_zone
// This data will be used to populate dropdowns and map area selection
const HARDCODED_AREAS = [
    { id: 25, zone_code: 7, area_name: "AVENUES", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 33, zone_code: 18, area_name: "BEIRA CORRIDOR", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 18, zone_code: 38, area_name: "BERNWIN", township: "CHIKANGA", ward: "", min_depth: 16.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 1, zone_code: 4, area_name: "BORDERVALE 1", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 6, zone_code: 17, area_name: "BORDERVALE 2", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 26, zone_code: 8, area_name: "CBD", township: "UTALI", ward: "", min_depth: 10.0, max_depth: null, op_zone: "TOWN" },
    { id: 45, zone_code: 42, area_name: "CHIKANGA", township: "CHIKANGA", ward: "", min_depth: 16.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 44, zone_code: 41, area_name: "CHIKANGA", township: "CHIKANGA", ward: "DREAMHOUSE", min_depth: 8.0, max_depth: 13.0, op_zone: "CHIKANGA" },
    { id: 19, zone_code: 40, area_name: "CHIKANGA", township: "CHIKANGA", ward: "DATVEST", min_depth: null, max_depth: 13.0, op_zone: "CHIKANGA" },
    { id: 5, zone_code: 16, area_name: "CHIPANDA", township: "UTALI", ward: "", min_depth: 10.0, max_depth: null, op_zone: "TOWN" },
    { id: 14, zone_code: 30, area_name: "DANGAMVURA", township: "DANGAMVURA", ward: "", min_depth: 18.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 20, zone_code: 43, area_name: "DANGAMVURA", township: "DANGAMVURA", ward: "AREA13", min_depth: null, max_depth: 9.0, op_zone: "DANGAMVURA" },
    { id: 46, zone_code: 44, area_name: "DANGAMVURA", township: "DANGAMVURA", ward: "", min_depth: 8.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 24, zone_code: 6, area_name: "DARLINGTON", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 21, zone_code: 39, area_name: "DARLINGTON EXT", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 12, zone_code: 28, area_name: "DORA", township: "DORA", ward: "33", min_depth: null, max_depth: 33.0, op_zone: "DANGAMVURA" },
    { id: 31, zone_code: 45, area_name: "DORA", township: "DORA", ward: "REMAINDER", min_depth: null, max_depth: 33.0, op_zone: "DANGAMVURA" },
    { id: 30, zone_code: 15, area_name: "FAIRBRIDGE", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 41, zone_code: 34, area_name: "FERNHILL", township: "FERNHILL", ward: "", min_depth: 19.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 39, zone_code: 32, area_name: "FERNVALLEY SOUTH", township: "FERNVALLEY", ward: "", min_depth: 19.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 32, zone_code: 46, area_name: "FERNVALLEY NORTH", township: "FERNVALLEY", ward: "", min_depth: 19.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 4, zone_code: 14, area_name: "FLORIDA", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 36, zone_code: 21, area_name: "GARIKAYI", township: "UTALI", ward: "", min_depth: null, max_depth: null, op_zone: "CHIKANGA" },
    { id: 38, zone_code: 31, area_name: "GIMBOKI", township: "DANGAMVURA", ward: "", min_depth: 15.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 23, zone_code: 5, area_name: "GREENSIDE", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 35, zone_code: 20, area_name: "HOBHOUSE", township: "HOBHOUSE", ward: "", min_depth: 17.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 28, zone_code: 10, area_name: "HOSPITAL HILL", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 42, zone_code: 35, area_name: "KENTUCKY", township: "KENTUCKY", ward: "", min_depth: 7.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 40, zone_code: 33, area_name: "LINK ROAD", township: "UTALI", ward: "", min_depth: 19.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 22, zone_code: 3, area_name: "MORNINGSIDE", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 34, zone_code: 19, area_name: "MUNENI", township: "UTALI", ward: "", min_depth: 10.0, max_depth: null, op_zone: "SAKUBVA" },
    { id: 16, zone_code: 1, area_name: "MURAMBI", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 9, zone_code: 24, area_name: "NATVEST", township: "UTALI", ward: "", min_depth: 3.0, max_depth: null, op_zone: "SAKUBVA" },
    { id: 7, zone_code: 22, area_name: "NATVIEW", township: "UTALI", ward: "", min_depth: 17.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 43, zone_code: 36, area_name: "NYAKAMETE", township: "UTALI", ward: "", min_depth: 10.0, max_depth: null, op_zone: "SAKUBVA" },
    { id: 27, zone_code: 9, area_name: "PALMERSTONE", township: "UTALI", ward: "", min_depth: 11.0, max_depth: null, op_zone: "TOWN" },
    { id: 10, zone_code: 25, area_name: "RAHEEN", township: "HOBHOUSE", ward: "", min_depth: 17.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 37, zone_code: 26, area_name: "SAKUBVA", township: "SAKUBVA", ward: "", min_depth: 1.0, max_depth: null, op_zone: "SAKUBVA" },
    { id: 8, zone_code: 23, area_name: "ST JOSEPH", township: "UTALI", ward: "", min_depth: 17.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 17, zone_code: 2, area_name: "TIGERS KLOOF", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 13, zone_code: 29, area_name: "TRIANG", township: "DANGAMVURA", ward: "", min_depth: 18.0, max_depth: null, op_zone: "DANGAMVURA" },
    { id: 29, zone_code: 11, area_name: "UTOPIA", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 11, zone_code: 27, area_name: "WEIRMOUTH", township: "WEIRMOUTH", ward: "", min_depth: 13.0, max_depth: null, op_zone: "CHIKANGA" },
    { id: 3, zone_code: 13, area_name: "WESTLEA", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 2, zone_code: 12, area_name: "YEOVIL", township: "UTALI", ward: "", min_depth: 12.0, max_depth: null, op_zone: "TOWN" },
    { id: 15, zone_code: 37, area_name: "ZIMTA", township: "CHIKANGA", ward: "", min_depth: 16.0, max_depth: null, op_zone: "CHIKANGA" }
];

// Extract unique values from hardcoded areas for dropdowns
const HARDCODED_OP_ZONES = [...new Set(HARDCODED_AREAS.map(area => area.op_zone))].filter(Boolean).sort();
const HARDCODED_TOWNSHIPS = [...new Set(HARDCODED_AREAS.map(area => area.township))].filter(Boolean).sort();
const HARDCODED_WARDS = [...new Set(HARDCODED_AREAS.map(area => area.ward).filter(w => w && w !== ""))].sort();
const HARDCODED_SUBURBS = [...new Set(HARDCODED_AREAS.map(area => area.area_name))].filter(Boolean).sort();

// ─── State ──────────────────────────────────────────────────────────────────

let currentFilters = {
    op_zone:            'all',
    township:           'all',
    ward:               'all',
    suburb_nam:         'all',
    zone:               'all',
    manhole_status:     'all',
    manhole_depth_min:  '',
    manhole_depth_max:  '',
    pipe_material:      'all',
    pipe_size:          'all',
    pipe_status:        'all',
    length_min:         '',
    length_max:         '',
    inspector:          'all',
    date_from:          '',
    date_to:            '',
    search_text:        '',
    // Hardcoded area selection
    hardcoded_area:     'all',
};

let filterOptions = {
    op_zones:             [],
    townships:            [],
    wards:                [],
    suburbs:              [],
    zones:                [],
    inspectors:           [],
    manhole_statuses:     [],
    pipe_materials:       [],
    pipe_sizes:           [],
    pipe_statuses:        [],
    manhole_depth_range:  { min: null, max: null },
    pipe_length_range:    { min: null, max: null },
    // Hardcoded area options
    hardcoded_areas:      HARDCODED_AREAS,
    hardcoded_op_zones:   HARDCODED_OP_ZONES,
    hardcoded_townships:  HARDCODED_TOWNSHIPS,
    hardcoded_wards:      HARDCODED_WARDS,
    hardcoded_suburbs:    HARDCODED_SUBURBS,
};

let tempFilters   = { ...currentFilters };
let currentData   = { manholes: [], pipelines: [] };
let isFiltering   = false;
let optionsLoaded = false;
let isCascading   = false;

// ─── DOM refs ────────────────────────────────────────────────────────────────

let $opZone, $township, $ward, $suburb, $zone;
let $manholeStatus, $inspector, $depthMin, $depthMax;
let $pipeMaterial, $pipeSize, $pipeStatus, $lengthMin, $lengthMax;
let $dateFrom, $dateTo, $search;
let $hardcodedArea; // New dropdown for hardcoded area selection

// ─────────────────────────────────────────────────────────────────────────────
// UTIL
// ─────────────────────────────────────────────────────────────────────────────

function esc(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}

function buildParams(filters) {
    const p = new URLSearchParams();
    const map = {
        op_zone:    filters.op_zone,
        township:   filters.township,
        ward:       filters.ward,
        suburb:     filters.suburb_nam,
        zone:       filters.zone,
        status:     filters.manhole_status,
        depth_min:  filters.manhole_depth_min,
        depth_max:  filters.manhole_depth_max,
        material:   filters.pipe_material,
        size:       filters.pipe_size,
        length_min: filters.length_min,
        length_max: filters.length_max,
        inspector:  filters.inspector,
        date_from:  filters.date_from,
        date_to:    filters.date_to,
        search:     filters.search_text,
    };
    for (const [key, val] of Object.entries(map)) {
        if (val && val !== 'all') p.append(key, val);
    }
    
    // Add hardcoded area filter if selected
    if (filters.hardcoded_area && filters.hardcoded_area !== 'all') {
        p.append('hardcoded_area', filters.hardcoded_area);
    }
    
    return p;
}

function countActiveFilters(f) {
    const keys = [
        'op_zone','township','ward','suburb_nam','zone',
        'manhole_status','pipe_material','pipe_size','pipe_status','inspector',
    ];
    let n = keys.filter(k => f[k] && f[k] !== 'all').length;
    if (f.search_text)        n++;
    if (f.manhole_depth_min)  n++;
    if (f.manhole_depth_max)  n++;
    if (f.length_min)         n++;
    if (f.length_max)         n++;
    if (f.date_from)          n++;
    if (f.date_to)            n++;
    if (f.hardcoded_area && f.hardcoded_area !== 'all') n++;
    return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD DYNAMIC OPTIONS FROM BACKEND + HARDCODED DATA
// ─────────────────────────────────────────────────────────────────────────────

async function loadDynamicFilterOptions() {
    console.log('🔄 Loading dynamic filter options …');
    try {
        const res = await fetch(`${API_BASE_URL}/filters/dynamic-options`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        console.log('📦 Raw data from backend:', {
            op_zones_count: data.op_zones?.length || 0,
            op_zones_sample: data.op_zones?.slice(0, 5),
            townships_count: data.townships?.length || 0,
            wards_count: data.wards?.length || 0,
            suburbs_count: data.suburbs?.length || 0
        });

        // Merge backend data with hardcoded data
        const allOpZones = [...new Set([...(data.op_zones || []), ...HARDCODED_OP_ZONES])].sort();
        const allTownships = [...new Set([...(data.townships || []), ...HARDCODED_TOWNSHIPS])].sort();
        const allWards = [...new Set([...(data.wards || []), ...HARDCODED_WARDS])].sort();
        const allSuburbs = [...new Set([...(data.suburbs || []), ...HARDCODED_SUBURBS])].sort();

        filterOptions = {
            op_zones:            allOpZones,
            townships:           allTownships,
            wards:               allWards,
            suburbs:             allSuburbs,
            zones:               data.zones               || [],
            inspectors:          data.inspectors          || [],
            manhole_statuses:    data.manhole_statuses    || [],
            pipe_materials:      data.pipe_materials      || [],
            pipe_sizes:          data.pipe_sizes          || [],
            pipe_statuses:       data.pipe_statuses       || [],
            manhole_depth_range: data.manhole_depth_range || { min: null, max: null },
            pipe_length_range:   data.pipe_length_range   || { min: null, max: null },
            // Hardcoded data
            hardcoded_areas:      HARDCODED_AREAS,
            hardcoded_op_zones:   HARDCODED_OP_ZONES,
            hardcoded_townships:  HARDCODED_TOWNSHIPS,
            hardcoded_wards:      HARDCODED_WARDS,
            hardcoded_suburbs:    HARDCODED_SUBURBS,
        };

        // Apply sensible fallbacks for empty lists
        if (!filterOptions.manhole_statuses.length) filterOptions.manhole_statuses = ['good','warning','critical','blocked','partial'];
        if (!filterOptions.pipe_statuses.length)    filterOptions.pipe_statuses    = ['good','warning','critical','blocked','partial'];
        if (!filterOptions.pipe_materials.length)   filterOptions.pipe_materials   = ['PVC','Concrete','Cast Iron','HDPE','EW'];
        if (!filterOptions.pipe_sizes.length)       filterOptions.pipe_sizes       = [100,150,200,250,300,375,450,525,600];

        optionsLoaded = true;
        console.log('✅ Filter options loaded (including hardcoded areas):', {
            op_zones:  filterOptions.op_zones,
            townships: filterOptions.townships.slice(0, 5),
            wards:     filterOptions.wards.slice(0, 5),
            suburbs:   filterOptions.suburbs.slice(0, 5),
            hardcoded_areas_count: filterOptions.hardcoded_areas.length,
        });
        return true;
    } catch (err) {
        console.error('Filter options load failed:', err);
        // Even if backend fails, we still have hardcoded data
        filterOptions.op_zones = HARDCODED_OP_ZONES;
        filterOptions.townships = HARDCODED_TOWNSHIPS;
        filterOptions.wards = HARDCODED_WARDS;
        filterOptions.suburbs = HARDCODED_SUBURBS;
        filterOptions.hardcoded_areas = HARDCODED_AREAS;
        optionsLoaded = true;
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POPULATE DROPDOWNS
// ─────────────────────────────────────────────────────────────────────────────

function populateSelect(el, items, placeholder, labelFn) {
    if (!el) return;
    const prev = el.value;
    
    console.log(`📋 Populating ${el.id} with ${items.length} items:`, items.slice(0, 5));
    
    if (!items || items.length === 0) {
        el.innerHTML = `<option value="all">${placeholder}</option>`;
        if (prev && prev !== 'all') el.value = prev;
        return;
    }
    
    el.innerHTML = `<option value="all">${placeholder}</option>` +
        items.map(v => `<option value="${esc(v)}">${esc(labelFn ? labelFn(v) : v)}</option>`).join('');
    
    // Restore previous selection if still available
    if (prev && prev !== 'all' && items.includes(prev)) {
        el.value = prev;
        console.log(`  ✅ Restored previous selection: ${prev}`);
    }
}

function populateHardcodedAreaSelect() {
    if (!$hardcodedArea) return;
    const prev = $hardcodedArea.value;
    
    const areas = HARDCODED_AREAS;
    console.log(`📋 Populating hardcoded area dropdown with ${areas.length} areas`);
    
    if (!areas.length) {
        $hardcodedArea.innerHTML = `<option value="all">SELECT PREDEFINED AREA</option>`;
        return;
    }
    
    $hardcodedArea.innerHTML = `<option value="all">📌 SELECT PREDEFINED AREA</option>` +
        areas.map(area => `<option value="${esc(area.area_name)}" data-area='${JSON.stringify(area)}'>📍 ${esc(area.area_name)} - ${esc(area.township)} (Zone ${area.zone_code})</option>`).join('');
    
    if (prev && prev !== 'all' && areas.some(a => a.area_name === prev)) {
        $hardcodedArea.value = prev;
    }
}

function updateAllDropdowns() {
    console.log('🎨 Updating all dropdowns with loaded options...');
    
    populateSelect($opZone,      filterOptions.op_zones,     'ALL OP ZONES');
    populateSelect($township,    filterOptions.townships,    'ALL TOWNSHIPS');
    populateSelect($ward,        filterOptions.wards,        'ALL WARDS',      w => `Ward ${w}`);
    populateSelect($suburb,      filterOptions.suburbs,      'ALL SUBURBS');
    populateSelect($zone,        filterOptions.zones,        'ALL ZONES',      z => `Zone ${z}`);
    populateSelect($manholeStatus, filterOptions.manhole_statuses, 'ALL STATUSES', s => s.toUpperCase());
    populateSelect($pipeStatus,  filterOptions.pipe_statuses,    'ALL PIPE STATUS', s => s.toUpperCase());
    populateSelect($pipeMaterial, filterOptions.pipe_materials,   'ALL MATERIALS');
    populateSelect($pipeSize,    filterOptions.pipe_sizes,       'ALL SIZES',      s => `${s} mm`);
    populateSelect($inspector,   filterOptions.inspectors,       'ALL INSPECTORS');
    
    // Populate hardcoded area dropdown
    populateHardcodedAreaSelect();

    // Range placeholder hints
    if ($depthMin && filterOptions.manhole_depth_range.min != null)
        $depthMin.placeholder = `Min (${filterOptions.manhole_depth_range.min} m)`;
    if ($depthMax && filterOptions.manhole_depth_range.max != null)
        $depthMax.placeholder = `Max (${filterOptions.manhole_depth_range.max} m)`;
    if ($lengthMin && filterOptions.pipe_length_range.min != null)
        $lengthMin.placeholder = `Min (${Math.round(filterOptions.pipe_length_range.min)} m)`;
    if ($lengthMax && filterOptions.pipe_length_range.max != null)
        $lengthMax.placeholder = `Max (${Math.round(filterOptions.pipe_length_range.max)} m)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HARDCODED AREA SELECTION HANDLER - SELECTS AREA ON MAPVIEW
// ─────────────────────────────────────────────────────────────────────────────

function onHardcodedAreaChange() {
    if (!$hardcodedArea) return;
    const selectedAreaName = $hardcodedArea.value;
    
    if (selectedAreaName === 'all') {
        console.log('📌 Hardcoded area cleared');
        // Clear the area selection from currentFilters
        currentFilters.hardcoded_area = 'all';
        tempFilters.hardcoded_area = 'all';
        return;
    }
    
    const selectedArea = HARDCODED_AREAS.find(area => area.area_name === selectedAreaName);
    if (!selectedArea) return;
    
    console.log('📍 Hardcoded area selected:', selectedArea);
    
    // Update filters with the selected area's data
    if (selectedArea.op_zone) {
        currentFilters.op_zone = selectedArea.op_zone;
        tempFilters.op_zone = selectedArea.op_zone;
        if ($opZone) $opZone.value = selectedArea.op_zone;
    }
    
    if (selectedArea.township) {
        currentFilters.township = selectedArea.township;
        tempFilters.township = selectedArea.township;
        if ($township) $township.value = selectedArea.township;
    }
    
    if (selectedArea.ward && selectedArea.ward !== "") {
        currentFilters.ward = selectedArea.ward;
        tempFilters.ward = selectedArea.ward;
        if ($ward) $ward.value = selectedArea.ward;
    }
    
    if (selectedArea.area_name) {
        currentFilters.suburb_nam = selectedArea.area_name;
        tempFilters.suburb_nam = selectedArea.area_name;
        if ($suburb) $suburb.value = selectedArea.area_name;
    }
    
    // Store the hardcoded area selection
    currentFilters.hardcoded_area = selectedArea.area_name;
    tempFilters.hardcoded_area = selectedArea.area_name;
    
    // Trigger cascading updates to refresh dependent dropdowns
    updateCascadingOptions().then(() => {
        // Dispatch map selection event so the mapview can zoom to/focus on the selected area
        document.dispatchEvent(new CustomEvent('hardcodedAreaSelected', {
            detail: {
                area: selectedArea,
                filters: {
                    op_zone: selectedArea.op_zone,
                    township: selectedArea.township,
                    ward: selectedArea.ward,
                    suburb: selectedArea.area_name
                }
            }
        }));
        
        // Optionally auto-apply filters
        triggerFilterChange();
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HIERARCHICAL CASCADING FILTERS
// Hierarchy: op_zone → township → ward → suburb
// ─────────────────────────────────────────────────────────────────────────────

async function updateCascadingOptions() {
    if (isCascading) return;
    isCascading = true;

    const opZone   = $opZone?.value   || 'all';
    const township = $township?.value || 'all';
    const ward     = $ward?.value     || 'all';

    console.log('🔄 Cascading with:', { opZone, township, ward });

    const p = new URLSearchParams();
    if (opZone   !== 'all') p.append('op_zone',   opZone);
    if (township !== 'all') p.append('township', township);
    if (ward     !== 'all') p.append('ward',     ward);

    try {
        const res = await fetch(`${API_BASE_URL}/filters/cascade?${p}`);
        if (!res.ok) {
            console.warn('Cascade API returned:', res.status);
            // Fallback to hardcoded filtered data
            const filtered = getHardcodedAreasFiltered(opZone, township, ward);
            updateDropdownsFromHardcoded(filtered);
            return;
        }
        const data = await res.json();
        console.log('📊 Cascade data received:', data);

        // Update townships based on selected op_zone
        if (data.townships && data.townships.length > 0) {
            const currentTownship = $township?.value;
            populateSelect($township, data.townships, 'ALL TOWNSHIPS');
            if (currentTownship && currentTownship !== 'all' && data.townships.includes(currentTownship)) {
                $township.value = currentTownship;
            }
        } else if (opZone !== 'all' && data.townships && data.townships.length === 0) {
            populateSelect($township, [], 'NO TOWNSHIPS AVAILABLE');
        }

        // Update wards based on selected op_zone + township
        if (data.wards && data.wards.length > 0) {
            const currentWard = $ward?.value;
            populateSelect($ward, data.wards, 'ALL WARDS', w => `Ward ${w}`);
            if (currentWard && currentWard !== 'all' && data.wards.includes(currentWard)) {
                $ward.value = currentWard;
            }
        } else if ((opZone !== 'all' || township !== 'all') && data.wards && data.wards.length === 0) {
            populateSelect($ward, [], 'NO WARDS AVAILABLE');
        }

        // Update suburbs based on all selected filters
        if (data.suburbs && data.suburbs.length > 0) {
            const currentSuburb = $suburb?.value;
            populateSelect($suburb, data.suburbs, 'ALL SUBURBS');
            if (currentSuburb && currentSuburb !== 'all' && data.suburbs.includes(currentSuburb)) {
                $suburb.value = currentSuburb;
            }
        }

        // Update zones if available
        if (data.zones && data.zones.length > 0) {
            const currentZone = $zone?.value;
            populateSelect($zone, data.zones, 'ALL ZONES', z => `Zone ${z}`);
            if (currentZone && currentZone !== 'all' && data.zones.includes(currentZone)) {
                $zone.value = currentZone;
            }
        }

    } catch (err) {
        console.warn('Cascade update failed, using hardcoded fallback:', err);
        const filtered = getHardcodedAreasFiltered(opZone, township, ward);
        updateDropdownsFromHardcoded(filtered);
    } finally {
        isCascading = false;
    }
}

// Helper function to filter hardcoded areas based on selection
function getHardcodedAreasFiltered(opZone, township, ward) {
    let filtered = [...HARDCODED_AREAS];
    
    if (opZone && opZone !== 'all') {
        filtered = filtered.filter(area => area.op_zone === opZone);
    }
    if (township && township !== 'all') {
        filtered = filtered.filter(area => area.township === township);
    }
    if (ward && ward !== 'all') {
        filtered = filtered.filter(area => area.ward === ward);
    }
    
    return {
        townships: [...new Set(filtered.map(a => a.township).filter(Boolean))],
        wards: [...new Set(filtered.map(a => a.ward).filter(w => w && w !== ""))],
        suburbs: [...new Set(filtered.map(a => a.area_name).filter(Boolean))],
        zones: [...new Set(filtered.map(a => a.zone_code).filter(Boolean))]
    };
}

function updateDropdownsFromHardcoded(filtered) {
    if (filtered.townships.length > 0) {
        const currentTownship = $township?.value;
        populateSelect($township, filtered.townships, 'ALL TOWNSHIPS');
        if (currentTownship && currentTownship !== 'all' && filtered.townships.includes(currentTownship)) {
            $township.value = currentTownship;
        }
    }
    
    if (filtered.wards.length > 0) {
        const currentWard = $ward?.value;
        populateSelect($ward, filtered.wards, 'ALL WARDS', w => `Ward ${w}`);
        if (currentWard && currentWard !== 'all' && filtered.wards.includes(currentWard)) {
            $ward.value = currentWard;
        }
    }
    
    if (filtered.suburbs.length > 0) {
        const currentSuburb = $suburb?.value;
        populateSelect($suburb, filtered.suburbs, 'ALL SUBURBS');
        if (currentSuburb && currentSuburb !== 'all' && filtered.suburbs.includes(currentSuburb)) {
            $suburb.value = currentSuburb;
        }
    }
    
    if (filtered.zones.length > 0) {
        const currentZone = $zone?.value;
        populateSelect($zone, filtered.zones, 'ALL ZONES', z => `Zone ${z}`);
        if (currentZone && currentZone !== 'all' && filtered.zones.includes(Number(currentZone))) {
            $zone.value = currentZone;
        }
    }
}

async function onParentFilterChange(changedField) {
    if (isCascading) return;

    console.log('📌 Parent changed:', changedField);

    const opZone   = $opZone?.value   || 'all';
    const township = $township?.value || 'all';
    const ward     = $ward?.value     || 'all';

    if (changedField === 'op_zone') {
        if ($township && $township.value !== 'all') $township.value = 'all';
        if ($ward && $ward.value !== 'all') $ward.value = 'all';
        if ($suburb && $suburb.value !== 'all') $suburb.value = 'all';
    } else if (changedField === 'township') {
        if ($ward && $ward.value !== 'all') $ward.value = 'all';
        if ($suburb && $suburb.value !== 'all') $suburb.value = 'all';
    } else if (changedField === 'ward') {
        if ($suburb && $suburb.value !== 'all') $suburb.value = 'all';
    }
    
    // Clear hardcoded area selection when manual filters change
    if ($hardcodedArea && $hardcodedArea.value !== 'all') {
        $hardcodedArea.value = 'all';
        currentFilters.hardcoded_area = 'all';
        tempFilters.hardcoded_area = 'all';
    }

    await updateCascadingOptions();
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH FILTERED DATA
// ─────────────────────────────────────────────────────────────────────────────

async function getFilteredManholes(filters) {
    const p = buildParams(filters);
    if (filters.manhole_status && filters.manhole_status !== 'all') {
        if (!p.has('status')) p.append('status', filters.manhole_status);
    }
    p.append('limit', '15000');

    try {
        const res = await fetch(`${API_BASE_URL}/manholes/list?${p}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('getFilteredManholes failed:', err);
        return [];
    }
}

async function getFilteredPipelines(filters) {
    const p = buildParams(filters);
    if (filters.pipe_status && filters.pipe_status !== 'all') {
        p.set('status', filters.pipe_status);
    }
    p.append('limit', '15000');

    try {
        const res = await fetch(`${API_BASE_URL}/pipelines/list?${p}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('getFilteredPipelines failed:', err);
        return [];
    }
}

async function getFilteredManholesGeoJSON(filters) {
    const p = buildParams(filters);
    if (filters.manhole_status && filters.manhole_status !== 'all') {
        if (!p.has('status')) p.append('status', filters.manhole_status);
    }
    p.append('limit', '15000');
    try {
        const res = await fetch(`${API_BASE_URL}/manholes/geojson?${p}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('getFilteredManholesGeoJSON failed:', err);
        return { type: 'FeatureCollection', features: [] };
    }
}

async function getFilteredPipelinesGeoJSON(filters) {
    const p = buildParams(filters);
    if (filters.pipe_status && filters.pipe_status !== 'all') {
        p.set('status', filters.pipe_status);
    }
    p.append('limit', '15000');
    try {
        const res = await fetch(`${API_BASE_URL}/pipelines/geojson?${p}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('getFilteredPipelinesGeoJSON failed:', err);
        return { type: 'FeatureCollection', features: [] };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY FILTERS — fetches data and dispatches event with NEON YELLOW highlight flag
// ─────────────────────────────────────────────────────────────────────────────

async function triggerFilterChange() {
    if (isFiltering) return;
    isFiltering = true;
    showFilterLoading(true);

    try {
        const filtersAreActive = countActiveFilters(currentFilters) > 0;

        const [manholes, pipelines] = await Promise.all([
            getFilteredManholes(currentFilters),
            getFilteredPipelines(currentFilters),
        ]);

        currentData.manholes  = manholes;
        currentData.pipelines = pipelines;

        let manholeGeoJSON = null, pipelineGeoJSON = null;
        if (filtersAreActive) {
            [manholeGeoJSON, pipelineGeoJSON] = await Promise.all([
                getFilteredManholesGeoJSON(currentFilters),
                getFilteredPipelinesGeoJSON(currentFilters),
            ]);
        }

        // Dispatch event with highlight color preference for filtered results
        document.dispatchEvent(new CustomEvent('filtersChanged', {
            detail: {
                manholes:         manholes,
                pipelines:        pipelines,
                manholeGeoJSON:   manholeGeoJSON,
                pipelineGeoJSON:  pipelineGeoJSON,
                filters:          { ...currentFilters },
                filtersAreActive: filtersAreActive,
                manholeCount:     manholes.length,
                pipelineCount:    pipelines.length,
                totalCount:       manholes.length + pipelines.length,
                highlightColor:   '#FFFF00',  // NEON YELLOW for filtered results
                highlightStyle:   'pulse',     // Pulse animation effect
            }
        }));

        updateFilterResultCount(manholes.length + pipelines.length);
        updateFilterButtonText();
        console.log(`✅ Filter applied — ${manholes.length} manholes, ${pipelines.length} pipelines (Highlighting: NEON YELLOW)`);

    } catch (err) {
        console.error('triggerFilterChange error:', err);
        showFilterError('Failed to apply filters. Please try again.');
    } finally {
        isFiltering = false;
        showFilterLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function showFilterLoading(show) {
    const btn    = document.getElementById('mainFilterBtn');
    const applyBtn = document.getElementById('applyFiltersBtn');

    if (btn) {
        btn.innerHTML = show ? '⏳ FILTERING…' : buildFilterBtnLabel();
        btn.disabled  = show;
    }
    if (applyBtn) {
        applyBtn.innerHTML = show ? '⏳ APPLYING…' : '✅ APPLY FILTERS';
        applyBtn.disabled  = show;
    }
}

function buildFilterBtnLabel() {
    const n = countActiveFilters(currentFilters);
    return n > 0 ? `🔍 FILTERS (${n})` : '🔍 FILTERS';
}

function updateFilterButtonText() {
    const btn = document.getElementById('mainFilterBtn');
    if (!btn) return;
    const n = countActiveFilters(currentFilters);
    btn.innerHTML = n > 0 ? `🔍 FILTERS (${n})` : '🔍 FILTERS';
    btn.classList.toggle('active-filter', n > 0);
}

function updateFilterResultCount(count) {
    const el = document.getElementById('filterResultCount');
    if (el) {
        el.innerHTML     = `📊 ${count.toLocaleString()} features`;
        el.style.display = 'inline-block';
    }
}

function showFilterError(msg) {
    const el = document.getElementById('filterError');
    if (el) {
        el.textContent   = msg;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function openFilterModal() {
    tempFilters = { ...currentFilters };

    if ($opZone)        $opZone.value        = tempFilters.op_zone;
    if ($township)      $township.value      = tempFilters.township;
    if ($ward)          $ward.value          = tempFilters.ward;
    if ($suburb)        $suburb.value        = tempFilters.suburb_nam;
    if ($zone)          $zone.value          = tempFilters.zone;
    if ($manholeStatus) $manholeStatus.value = tempFilters.manhole_status;
    if ($inspector)     $inspector.value     = tempFilters.inspector;
    if ($depthMin)      $depthMin.value      = tempFilters.manhole_depth_min;
    if ($depthMax)      $depthMax.value      = tempFilters.manhole_depth_max;
    if ($pipeMaterial)  $pipeMaterial.value  = tempFilters.pipe_material;
    if ($pipeSize)      $pipeSize.value      = tempFilters.pipe_size;
    if ($pipeStatus)    $pipeStatus.value    = tempFilters.pipe_status;
    if ($lengthMin)     $lengthMin.value     = tempFilters.length_min;
    if ($lengthMax)     $lengthMax.value     = tempFilters.length_max;
    if ($dateFrom)      $dateFrom.value      = tempFilters.date_from;
    if ($dateTo)        $dateTo.value        = tempFilters.date_to;
    if ($search)        $search.value        = tempFilters.search_text;
    if ($hardcodedArea) $hardcodedArea.value = tempFilters.hardcoded_area || 'all';

    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'flex';
    
    setTimeout(() => updateCascadingOptions(), 50);
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'none';
}

function readTempFiltersFromDOM() {
    if ($opZone)        tempFilters.op_zone            = $opZone.value;
    if ($township)      tempFilters.township            = $township.value;
    if ($ward)          tempFilters.ward                = $ward.value;
    if ($suburb)        tempFilters.suburb_nam          = $suburb.value;
    if ($zone)          tempFilters.zone                = $zone.value;
    if ($manholeStatus) tempFilters.manhole_status      = $manholeStatus.value;
    if ($inspector)     tempFilters.inspector           = $inspector.value;
    if ($depthMin)      tempFilters.manhole_depth_min   = $depthMin.value.trim();
    if ($depthMax)      tempFilters.manhole_depth_max   = $depthMax.value.trim();
    if ($pipeMaterial)  tempFilters.pipe_material       = $pipeMaterial.value;
    if ($pipeSize)      tempFilters.pipe_size           = $pipeSize.value;
    if ($pipeStatus)    tempFilters.pipe_status         = $pipeStatus.value;
    if ($lengthMin)     tempFilters.length_min          = $lengthMin.value.trim();
    if ($lengthMax)     tempFilters.length_max          = $lengthMax.value.trim();
    if ($dateFrom)      tempFilters.date_from           = $dateFrom.value;
    if ($dateTo)        tempFilters.date_to             = $dateTo.value;
    if ($search)        tempFilters.search_text         = $search.value.trim();
    if ($hardcodedArea) tempFilters.hardcoded_area      = $hardcodedArea.value;
}

async function applyFilters() {
    readTempFiltersFromDOM();
    currentFilters = { ...tempFilters };
    closeFilterModal();
    await triggerFilterChange();
}

async function resetFilters() {
    const blank = {
        op_zone: 'all', township: 'all', ward: 'all', suburb_nam: 'all', zone: 'all',
        manhole_status: 'all', manhole_depth_min: '', manhole_depth_max: '',
        pipe_material: 'all', pipe_size: 'all', pipe_status: 'all',
        length_min: '', length_max: '', inspector: 'all',
        date_from: '', date_to: '', search_text: '', hardcoded_area: 'all',
    };
    tempFilters    = { ...blank };
    currentFilters = { ...blank };

    if ($opZone)        $opZone.value        = 'all';
    if ($township)      $township.value      = 'all';
    if ($ward)          $ward.value          = 'all';
    if ($suburb)        $suburb.value        = 'all';
    if ($zone)          $zone.value          = 'all';
    if ($manholeStatus) $manholeStatus.value = 'all';
    if ($inspector)     $inspector.value     = 'all';
    if ($depthMin)      $depthMin.value      = '';
    if ($depthMax)      $depthMax.value      = '';
    if ($pipeMaterial)  $pipeMaterial.value  = 'all';
    if ($pipeSize)      $pipeSize.value      = 'all';
    if ($pipeStatus)    $pipeStatus.value    = 'all';
    if ($lengthMin)     $lengthMin.value     = '';
    if ($lengthMax)     $lengthMax.value     = '';
    if ($dateFrom)      $dateFrom.value      = '';
    if ($dateTo)        $dateTo.value        = '';
    if ($search)        $search.value        = '';
    if ($hardcodedArea) $hardcodedArea.value = 'all';

    updateFilterButtonText();
    await updateCascadingOptions();
    await triggerFilterChange();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function exportToJSON() {
    const blob = new Blob([JSON.stringify({
        filters: currentFilters,
        data:    currentData,
        exported_at:    new Date().toISOString(),
        total_features: currentData.manholes.length + currentData.pipelines.length,
        hardcoded_areas_used: HARDCODED_AREAS,
    }, null, 2)], { type: 'application/json' });
    _downloadBlob(blob, `sewer_export_${_ts()}.json`);
}

function exportToCSV() {
    const rows = [
        ['Type','ID','Suburb','Status','Material','Size_mm','Depth_m','Length_m','Inspector','Date'].join(',')
    ];
    for (const m of currentData.manholes)
        rows.push(['Manhole', m.manhole_id, _q(m.suburb), _q(m.status), '', '', m.depth ?? '', '', _q(m.inspector), _q(m.inspection_date)].join(','));
    for (const p of currentData.pipelines)
        rows.push(['Pipeline', p.pipe_id, '', _q(p.status), _q(p.material), p.diameter ?? '', '', p.length ?? '', '', ''].join(','));

    _downloadBlob(new Blob([rows.join('\n')], { type: 'text/csv' }), `sewer_export_${_ts()}.csv`);
}

function exportToPDF()  { window.print(); }
function exportToSHP()  { alert('Shapefile export — coming soon'); }

function _q(v)  { return v ? `"${String(v).replace(/"/g,'""')}"` : ''; }
function _ts()  { return new Date().toISOString().slice(0, 19).replace(/:/g, '-'); }
function _downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL HTML
// ─────────────────────────────────────────────────────────────────────────────

function renderModal() {
    return `
<div id="filterModal" class="filter-modal" style="display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;background:rgba(0,0,0,.6)">
  <div style="background:#0d1f0d;border:1px solid #2e7d32;border-radius:10px;width:min(96vw,860px);max-height:92vh;display:flex;flex-direction:column;font-family:'Segoe UI',monospace;color:#a5d6a7">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #2e7d32;flex-shrink:0">
      <h3 style="margin:0;color:#69f0ae;font-size:1rem;letter-spacing:.08em">🔍 DYNAMIC FILTERS</h3>
      <div style="display:flex;gap:10px;align-items:center">
        <span id="filterResultCount" style="display:none;font-size:11px;color:#8fdc00;background:#1a3a1a;padding:3px 10px;border-radius:12px"></span>
        <button id="closeFilterModal" style="background:none;border:1px solid #555;border-radius:5px;color:#ccc;cursor:pointer;padding:4px 10px;font-size:14px">✕</button>
      </div>
    </div>

    <!-- Error banner -->
    <div id="filterError" style="display:none;background:#5c1a1a;color:#ff8a80;padding:8px 20px;font-size:12px;flex-shrink:0"></div>

    <!-- Scrollable body -->
    <div style="overflow-y:auto;padding:16px 20px;flex:1">

      <!-- EXPORT -->
      <section style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">📤 EXPORT CURRENT DATA</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${['JSON','CSV','PDF','SHP'].map(t => `<button id="export${t}Btn" style="background:#1a472a;border:1px solid #2e7d32;border-radius:5px;color:#69f0ae;cursor:pointer;padding:5px 14px;font-size:12px;transition:background .2s" onmouseover="this.style.background='#2e5c2e'" onmouseout="this.style.background='#1a472a'">${t}</button>`).join('')}
        </div>
      </section>

      <!-- HARDCODED AREA SELECTION - Predefined areas that select on map -->
      <section style="margin-bottom:18px;background:#1a2e1a;border:1px solid #2e7d32;border-radius:6px;padding:10px">
        <div style="font-size:11px;font-weight:bold;color:#ffd54f;letter-spacing:.06em;margin-bottom:8px">📌 PREDEFINED AREAS (Quick Select)</div>
        <div style="display:grid;grid-template-columns:1fr;gap:10px">
          ${_fieldGroup('Select Area to Focus Map', 'hardcodedAreaSelect', 'select')}
        </div>
        <p style="font-size:9px;color:#ffb74d;margin:8px 0 0 0">
          🗺️ Select a predefined area to automatically set location filters and focus the map view on that area.
        </p>
      </section>

      <!-- LOCATION - HIERARCHICAL -->
      <section style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">📍 LOCATION (Hierarchical)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          ${_fieldGroup('Operational Zone', 'opZoneSelect',     'select')}
          ${_fieldGroup('Township',         'townshipSelect',   'select')}
          ${_fieldGroup('Ward',             'wardSelect',       'select')}
          ${_fieldGroup('Suburb',           'suburbSelect',     'select')}
          ${_fieldGroup('Zone',             'zoneSelect',       'select')}
        </div>
        <p style="font-size:9px;color:#558b2f;margin:8px 0 0 0">
          🔽 Hierarchy: Operational Zone → Township → Ward → Suburb
        </p>
      </section>

      <!-- MANHOLES -->
      <section style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">🕳️ MANHOLES</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          ${_fieldGroup('Blockage Status', 'manholeStatusSelect', 'select')}
          ${_fieldGroup('Inspector',       'inspectorSelect',     'select')}
          ${_fieldGroup('Min Depth (m)',   'depthMinInput',       'number', 'step="0.1" min="0"')}
          ${_fieldGroup('Max Depth (m)',   'depthMaxInput',       'number', 'step="0.1" min="0"')}
        </div>
      </section>

      <!-- PIPELINES -->
      <section style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">📏 PIPELINES</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          ${_fieldGroup('Pipe Material',   'pipeMaterialSelect', 'select')}
          ${_fieldGroup('Pipe Size (mm)',  'pipeSizeSelect',     'select')}
          ${_fieldGroup('Pipe Status',     'pipeStatusSelect',   'select')}
          ${_fieldGroup('Min Length (m)',  'lengthMinInput',     'number', 'step="1" min="0"')}
          ${_fieldGroup('Max Length (m)',  'lengthMaxInput',     'number', 'step="1" min="0"')}
        </div>
      </section>

      <!-- DATES -->
      <section style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">📅 INSPECTION DATE</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          ${_fieldGroup('From', 'dateFromInput', 'date')}
          ${_fieldGroup('To',   'dateToInput',   'date')}
        </div>
      </section>

      <!-- SEARCH -->
      <section style="margin-bottom:8px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">🔎 SEARCH</div>
        <input id="searchTextInput" type="text" placeholder="Manhole ID, suburb, pipe ID …"
          style="width:100%;box-sizing:border-box;background:#0a1f0a;border:1px solid #2e5c2e;border-radius:5px;color:#a5d6a7;padding:7px 10px;font-size:12px">
      </section>

      <p style="font-size:10px;color:#558b2f;margin:10px 0 0">
        💡 Dropdowns cascade hierarchically: Select Operational Zone → then Township → then Ward → then Suburb.
        🟡 Filtered results will highlight in NEON YELLOW on the map.
        📌 Predefined areas let you quickly focus on specific zones like AVENUES, CBD, CHIKANGA, etc.
      </p>
    </div>

    <!-- Footer -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-top:1px solid #2e7d32;flex-shrink:0">
      <button id="resetFiltersBtn"
        style="background:#37474f;border:none;border-radius:5px;color:#cfd8dc;cursor:pointer;padding:7px 16px;font-size:12px">
        🗑️ RESET ALL
      </button>
      <button id="applyFiltersBtn"
        style="background:#2e7d32;border:none;border-radius:5px;color:#fff;cursor:pointer;padding:7px 18px;font-size:12px;font-weight:bold">
        ✅ APPLY FILTERS
      </button>
    </div>
  </div>
</div>`;
}

function _fieldGroup(label, id, type, attrs = '') {
    const inputStyle = `width:100%;box-sizing:border-box;background:#0a1f0a;border:1px solid #2e5c2e;border-radius:5px;color:#a5d6a7;padding:6px 8px;font-size:12px`;
    const el = type === 'select'
        ? `<select id="${id}" style="${inputStyle}"><option value="all">Loading…</option></select>`
        : `<input id="${id}" type="${type}" ${attrs} style="${inputStyle}">`;
    return `<div><label style="display:block;font-size:10px;color:#7cb342;margin-bottom:4px">${esc(label)}</label>${el}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// WIRE EVENTS
// ─────────────────────────────────────────────────────────────────────────────

function attachModalEvents() {
    document.getElementById('closeFilterModal') ?.addEventListener('click', closeFilterModal);
    document.getElementById('applyFiltersBtn')  ?.addEventListener('click', applyFilters);
    document.getElementById('resetFiltersBtn')  ?.addEventListener('click', resetFilters);
    document.getElementById('exportJSONBtn')    ?.addEventListener('click', exportToJSON);
    document.getElementById('exportCSVBtn')     ?.addEventListener('click', exportToCSV);
    document.getElementById('exportPDFBtn')     ?.addEventListener('click', exportToPDF);
    document.getElementById('exportSHPBtn')     ?.addEventListener('click', exportToSHP);
    
    // Hardcoded area change event
    if ($hardcodedArea) {
        $hardcodedArea.addEventListener('change', onHardcodedAreaChange);
    }

    if ($opZone) {
        $opZone.addEventListener('change', async () => {
            await onParentFilterChange('op_zone');
        });
    }
    if ($township) {
        $township.addEventListener('change', async () => {
            await onParentFilterChange('township');
        });
    }
    if ($ward) {
        $ward.addEventListener('change', async () => {
            await onParentFilterChange('ward');
        });
    }

    document.getElementById('filterModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeFilterModal();
    });
}

function assignDOMRefs() {
    $opZone        = document.getElementById('opZoneSelect');
    $township      = document.getElementById('townshipSelect');
    $ward          = document.getElementById('wardSelect');
    $suburb        = document.getElementById('suburbSelect');
    $zone          = document.getElementById('zoneSelect');
    $manholeStatus = document.getElementById('manholeStatusSelect');
    $inspector     = document.getElementById('inspectorSelect');
    $depthMin      = document.getElementById('depthMinInput');
    $depthMax      = document.getElementById('depthMaxInput');
    $pipeMaterial  = document.getElementById('pipeMaterialSelect');
    $pipeSize      = document.getElementById('pipeSizeSelect');
    $pipeStatus    = document.getElementById('pipeStatusSelect');
    $lengthMin     = document.getElementById('lengthMinInput');
    $lengthMax     = document.getElementById('lengthMaxInput');
    $dateFrom      = document.getElementById('dateFromInput');
    $dateTo        = document.getElementById('dateToInput');
    $search        = document.getElementById('searchTextInput');
    $hardcodedArea = document.getElementById('hardcodedAreaSelect');
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

async function initFilters() {
    console.log('🚀 Initialising dynamic filters (Hierarchical: op_zone → township → ward → suburb) …');
    console.log('📌 Hardcoded areas loaded:', HARDCODED_AREAS.length);

    if (!document.getElementById('filterModal')) {
        document.body.insertAdjacentHTML('beforeend', renderModal());
    }

    attachModalEvents();
    assignDOMRefs();

    document.getElementById('mainFilterBtn')
        ?.addEventListener('click', openFilterModal);

    await loadDynamicFilterOptions();
    updateAllDropdowns();
    updateFilterButtonText();

    await triggerFilterChange();

    console.log('✅ Filters ready with hierarchical cascading and hardcoded area selection. Filtered results will highlight in NEON YELLOW.');
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export default {
    init:            initFilters,
    getFilteredManholes,
    getFilteredPipelines,
    getCurrentFilters: () => ({ ...currentFilters }),
    getCurrentData:    () => currentData,
    exportToJSON,
    exportToCSV,
    exportToPDF,
    exportToSHP,
    triggerFilterChange,
    refreshOptions:  loadDynamicFilterOptions,
    openModal:       openFilterModal,
    closeModal:      closeFilterModal,
    resetFilters,
    // Expose hardcoded areas for external use (map focusing)
    getHardcodedAreas: () => [...HARDCODED_AREAS],
    selectHardcodedArea: (areaName) => {
        if ($hardcodedArea) {
            $hardcodedArea.value = areaName;
            onHardcodedAreaChange();
        }
    }
};