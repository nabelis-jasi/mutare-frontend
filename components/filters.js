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
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:5000/api';

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
    return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD DYNAMIC OPTIONS FROM BACKEND
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

        filterOptions = {
            op_zones:            data.op_zones            || [],
            townships:           data.townships           || [],
            wards:               data.wards               || [],
            suburbs:             data.suburbs             || [],
            zones:               data.zones               || [],
            inspectors:          data.inspectors          || [],
            manhole_statuses:    data.manhole_statuses    || [],
            pipe_materials:      data.pipe_materials      || [],
            pipe_sizes:          data.pipe_sizes          || [],
            pipe_statuses:       data.pipe_statuses       || [],
            manhole_depth_range: data.manhole_depth_range || { min: null, max: null },
            pipe_length_range:   data.pipe_length_range   || { min: null, max: null },
        };

        // Apply sensible fallbacks for empty lists
        if (!filterOptions.manhole_statuses.length) filterOptions.manhole_statuses = ['good','warning','critical','blocked','partial'];
        if (!filterOptions.pipe_statuses.length)    filterOptions.pipe_statuses    = ['good','warning','critical','blocked','partial'];
        if (!filterOptions.pipe_materials.length)   filterOptions.pipe_materials   = ['PVC','Concrete','Cast Iron','HDPE','EW'];
        if (!filterOptions.pipe_sizes.length)       filterOptions.pipe_sizes       = [100,150,200,250,300,375,450,525,600];

        optionsLoaded = true;
        console.log('✅ Filter options loaded:', {
            op_zones:  filterOptions.op_zones,
            townships: filterOptions.townships.slice(0, 5),
            wards:     filterOptions.wards.slice(0, 5),
            suburbs:   filterOptions.suburbs.slice(0, 5),
        });
        return true;
    } catch (err) {
        console.error('Filter options load failed:', err);
        optionsLoaded = false;
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
        console.warn('Cascade update failed:', err);
    } finally {
        isCascading = false;
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
        date_from: '', date_to: '', search_text: '',
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
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

async function initFilters() {
    console.log('🚀 Initialising dynamic filters (Hierarchical: op_zone → township → ward → suburb) …');

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

    console.log('✅ Filters ready with hierarchical cascading. Filtered results will highlight in NEON YELLOW.');
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
};