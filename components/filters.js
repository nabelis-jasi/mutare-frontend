// components/filters.js
// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Cascading Filter System
//
// Key design decisions:
//   • ALL filters are independent — a null column value never disqualifies a row
//     unless the user explicitly filters on that field.
//   • After Apply, the map is re-fetched with the filter params so only matching
//     features are highlighted (the full map layer is NOT cleared — unmatched
//     features are dimmed to 20% opacity, matched ones pulse at full colour).
//   • loadDynamicFilterOptions() drives all dropdowns from real DB data.
//   • Cascading fires on suburb / township / zone change but never wipes a
//     selection the user already made.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:5000/api';

// ─── State ──────────────────────────────────────────────────────────────────

let currentFilters = {
    suburb_nam:         'all',
    township:           'all',
    zone:               'all',
    ward:               'all',
    op_zone:            'all',
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
    suburbs:              [],
    townships:            [],
    zones:                [],
    wards:                [],
    op_zones:             [],
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

// ─── DOM refs (populated in initFilters) ─────────────────────────────────────

let $suburb, $township, $zone, $ward, $opZone;
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
        suburb:     filters.suburb_nam,
        township:   filters.township,
        zone:       filters.zone,
        ward:       filters.ward,
        op_zone:    filters.op_zone,
        status:     filters.manhole_status,     // for manholes
        depth_min:  filters.manhole_depth_min,
        depth_max:  filters.manhole_depth_max,
        material:   filters.pipe_material,
        size:       filters.pipe_size,
        // pipe status handled separately in pipeline call
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
        'suburb_nam','township','zone','ward','op_zone',
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

        filterOptions = {
            suburbs:             data.suburbs             || [],
            townships:           data.townships           || [],
            zones:               data.zones               || [],
            wards:               data.wards               || [],
            op_zones:            data.op_zones            || [],
            inspectors:          data.inspectors          || [],
            manhole_statuses:    data.manhole_statuses    || [],
            pipe_materials:      data.pipe_materials      || [],
            pipe_sizes:          data.pipe_sizes          || [],
            pipe_statuses:       data.pipe_statuses       || [],
            manhole_depth_range: data.manhole_depth_range || { min: null, max: null },
            pipe_length_range:   data.pipe_length_range   || { min: null, max: null },
        };

        // Apply sensible fallbacks for empty lists (so dropdowns never look broken)
        if (!filterOptions.manhole_statuses.length) filterOptions.manhole_statuses = ['good','warning','critical','blocked','partial'];
        if (!filterOptions.pipe_statuses.length)    filterOptions.pipe_statuses    = ['good','warning','critical','blocked','partial'];
        if (!filterOptions.pipe_materials.length)   filterOptions.pipe_materials   = ['PVC','Concrete','Cast Iron','HDPE','EW'];
        if (!filterOptions.pipe_sizes.length)       filterOptions.pipe_sizes       = [100,150,200,250,300,375,450,525,600];

        optionsLoaded = true;
        console.log('✅ Filter options loaded:', {
            suburbs:   filterOptions.suburbs.length,
            statuses:  filterOptions.manhole_statuses,
            materials: filterOptions.pipe_materials.length,
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
    el.innerHTML = `<option value="all">${placeholder}</option>` +
        items.map(v => `<option value="${esc(v)}">${esc(labelFn ? labelFn(v) : v)}</option>`).join('');
    // Restore previous selection if still available
    if (prev && prev !== 'all' && items.includes(prev)) el.value = prev;
}

function updateAllDropdowns() {
    populateSelect($suburb,      filterOptions.suburbs,          'ALL SUBURBS');
    populateSelect($township,    filterOptions.townships,        'ALL TOWNSHIPS');
    populateSelect($zone,        filterOptions.zones,            'ALL ZONES',      z => `Zone ${z}`);
    populateSelect($ward,        filterOptions.wards,            'ALL WARDS',      w => `Ward ${w}`);
    populateSelect($opZone,      filterOptions.op_zones,         'ALL OP ZONES',   o => `Op Zone ${o}`);
    populateSelect($manholeStatus,filterOptions.manhole_statuses,'ALL STATUSES',   s => s.toUpperCase());
    populateSelect($pipeStatus,  filterOptions.pipe_statuses,    'ALL PIPE STATUS', s => s.toUpperCase());
    populateSelect($pipeMaterial,filterOptions.pipe_materials,   'ALL MATERIALS');
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
// CASCADING FILTERS
// ─────────────────────────────────────────────────────────────────────────────

async function updateCascadingOptions() {
    const suburb   = $suburb?.value   || 'all';
    const township = $township?.value || 'all';
    const zone     = $zone?.value     || 'all';

    const p = new URLSearchParams();
    if (suburb   !== 'all') p.append('suburb',   suburb);
    if (township !== 'all') p.append('township', township);
    if (zone     !== 'all') p.append('zone',     zone);

    try {
        const res = await fetch(`${API_BASE_URL}/filters/cascade?${p}`);
        if (!res.ok) return;
        const data = await res.json();

        if (township === 'all' && data.townships?.length)
            populateSelect($township, data.townships, 'ALL TOWNSHIPS');
        if (zone === 'all' && data.zones?.length)
            populateSelect($zone, data.zones, 'ALL ZONES', z => `Zone ${z}`);
        if (data.wards?.length)
            populateSelect($ward, data.wards, 'ALL WARDS', w => `Ward ${w}`);
        if (data.op_zones?.length)
            populateSelect($opZone, data.op_zones, 'ALL OP ZONES', o => `Op Zone ${o}`);
    } catch (err) {
        console.warn('Cascade update failed (non-fatal):', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH FILTERED DATA
// ─────────────────────────────────────────────────────────────────────────────

async function getFilteredManholes(filters) {
    const p = buildParams(filters);
    // Manhole status key is 'status' in the API
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
    // Pipeline status key is 'status' in the API, but 'pipe_status' in filters obj
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

// Fetch GeoJSON for map highlight (separate from the tabular list)
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
// APPLY FILTERS — fetch data AND update map
// ─────────────────────────────────────────────────────────────────────────────

async function triggerFilterChange() {
    if (isFiltering) return;
    isFiltering = true;
    showFilterLoading(true);

    try {
        const filtersAreActive = countActiveFilters(currentFilters) > 0;

        // Always fetch tabular data
        const [manholes, pipelines] = await Promise.all([
            getFilteredManholes(currentFilters),
            getFilteredPipelines(currentFilters),
        ]);

        currentData.manholes  = manholes;
        currentData.pipelines = pipelines;

        // Fetch GeoJSON so the map can highlight filtered results
        let manholeGeoJSON = null, pipelineGeoJSON = null;
        if (filtersAreActive) {
            [manholeGeoJSON, pipelineGeoJSON] = await Promise.all([
                getFilteredManholesGeoJSON(currentFilters),
                getFilteredPipelinesGeoJSON(currentFilters),
            ]);
        }

        // Dispatch event — mapview.js listens to this
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
            }
        }));

        updateFilterResultCount(manholes.length + pipelines.length);
        updateFilterButtonText();
        console.log(`✅ Filter applied — ${manholes.length} manholes, ${pipelines.length} pipelines`);

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
// MODAL: OPEN / CLOSE / SYNC
// ─────────────────────────────────────────────────────────────────────────────

function openFilterModal() {
    // Sync tempFilters from currentFilters
    tempFilters = { ...currentFilters };

    // Push to DOM
    if ($suburb)        $suburb.value        = tempFilters.suburb_nam;
    if ($township)      $township.value      = tempFilters.township;
    if ($zone)          $zone.value          = tempFilters.zone;
    if ($ward)          $ward.value          = tempFilters.ward;
    if ($opZone)        $opZone.value        = tempFilters.op_zone;
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
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'none';
}

function readTempFiltersFromDOM() {
    if ($suburb)        tempFilters.suburb_nam        = $suburb.value;
    if ($township)      tempFilters.township          = $township.value;
    if ($zone)          tempFilters.zone              = $zone.value;
    if ($ward)          tempFilters.ward              = $ward.value;
    if ($opZone)        tempFilters.op_zone           = $opZone.value;
    if ($manholeStatus) tempFilters.manhole_status    = $manholeStatus.value;
    if ($inspector)     tempFilters.inspector         = $inspector.value;
    if ($depthMin)      tempFilters.manhole_depth_min = $depthMin.value.trim();
    if ($depthMax)      tempFilters.manhole_depth_max = $depthMax.value.trim();
    if ($pipeMaterial)  tempFilters.pipe_material     = $pipeMaterial.value;
    if ($pipeSize)      tempFilters.pipe_size         = $pipeSize.value;
    if ($pipeStatus)    tempFilters.pipe_status       = $pipeStatus.value;
    if ($lengthMin)     tempFilters.length_min        = $lengthMin.value.trim();
    if ($lengthMax)     tempFilters.length_max        = $lengthMax.value.trim();
    if ($dateFrom)      tempFilters.date_from         = $dateFrom.value;
    if ($dateTo)        tempFilters.date_to           = $dateTo.value;
    if ($search)        tempFilters.search_text       = $search.value.trim();
}

async function applyFilters() {
    readTempFiltersFromDOM();
    currentFilters = { ...tempFilters };
    closeFilterModal();
    await triggerFilterChange();
}

async function resetFilters() {
    const blank = {
        suburb_nam: 'all', township: 'all', zone: 'all', ward: 'all', op_zone: 'all',
        manhole_status: 'all', manhole_depth_min: '', manhole_depth_max: '',
        pipe_material: 'all', pipe_size: 'all', pipe_status: 'all',
        length_min: '', length_max: '', inspector: 'all',
        date_from: '', date_to: '', search_text: '',
    };
    tempFilters    = { ...blank };
    currentFilters = { ...blank };

    // Reset DOM
    if ($suburb)        $suburb.value        = 'all';
    if ($township)      $township.value      = 'all';
    if ($zone)          $zone.value          = 'all';
    if ($ward)          $ward.value          = 'all';
    if ($opZone)        $opZone.value        = 'all';
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
// EXPORT
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

      <!-- LOCATION -->
      <section style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:bold;color:#7cb342;letter-spacing:.06em;margin-bottom:8px">📍 LOCATION</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          ${_fieldGroup('Suburb',           'suburbSelect',   'select')}
          ${_fieldGroup('Township',         'townshipSelect', 'select')}
          ${_fieldGroup('Zone',             'zoneSelect',     'select')}
          ${_fieldGroup('Ward',             'wardSelect',     'select')}
          ${_fieldGroup('Operational Zone', 'opZoneSelect',   'select')}
        </div>
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
        💡 Dropdowns show only values present in the database. Empty range inputs are ignored.
        When filters are active, matching features are highlighted on the map.
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

    // Cascade on location changes
    ['suburbSelect','townshipSelect','zoneSelect'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateCascadingOptions);
    });

    // Close on backdrop click
    document.getElementById('filterModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeFilterModal();
    });
}

function assignDOMRefs() {
    $suburb        = document.getElementById('suburbSelect');
    $township      = document.getElementById('townshipSelect');
    $zone          = document.getElementById('zoneSelect');
    $ward          = document.getElementById('wardSelect');
    $opZone        = document.getElementById('opZoneSelect');
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
    console.log('🚀 Initialising dynamic filters …');

    // Inject modal if needed
    if (!document.getElementById('filterModal')) {
        document.body.insertAdjacentHTML('beforeend', renderModal());
    }

    attachModalEvents();
    assignDOMRefs();

    // Wire main filter button
    document.getElementById('mainFilterBtn')
        ?.addEventListener('click', openFilterModal);

    // Load options
    await loadDynamicFilterOptions();
    updateAllDropdowns();
    updateFilterButtonText();

    // Initial full data load (no filters = all data)
    await triggerFilterChange();

    console.log('✅ Filters ready.');
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
