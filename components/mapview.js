// components/mapview.js
// ─────────────────────────────────────────────────────────────────────────────
// Map component — Leaflet-based.
//
// FILTER INTEGRATION:
//   Listens to the 'filtersChanged' event fired by filters.js.
//   When filters are active:
//     • All existing manhole markers are dimmed to opacity 0.15 (grey).
//     • Matched manholes are re-drawn at full colour with a highlight ring.
//     • All pipeline segments are dimmed; matched ones are re-styled bright.
//   When filters are cleared all layers return to normal opacity/colour.
//
// COLOUR SCHEME:
//   Manholes  — Normal: #9b59b6 (purple) | Warning: #ffc107 | Critical: #dc3545
//   Pipelines — Normal: #32cd32 (lime)   | Warning: #ffc107 | Critical: #dc3545
//   Highlight ring: #00d4ff (cyan)
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:5000/api';

// ─── Leaflet map instance & layer references ──────────────────────────────────
let map = null;

// Full-data layers (always present, may be dimmed)
let allManholeMarkers   = [];   // L.circleMarker[]
let allPipelineLayer    = null; // L.geoJSON
let currentSuburbLayer  = null;
let currentCadastreLayer = null;
let suburbLabels        = [];
let cadastreLabels      = [];
let currentComplaintMarkers = [];
let heatLayer           = null;

// Highlight overlay layers (exist only when filters are active)
let highlightManholeLayer  = null;  // L.layerGroup of highlighted markers
let highlightPipelineLayer = null;  // L.geoJSON of highlighted pipes
let currentComplaintBuffers = [];

// Suburb stats (filled after all data loads)
let suburbStats         = {};
let suburbPipelineStats = {};
let suburbGeometries    = [];

// Store current manhole data for hotspots
let currentManholesData = [];

// Tile definitions
const TILES = {
    osm:       { label: 'Street',      icon: '🗺️', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                   attr: '© OpenStreetMap',    maxZoom: 19 },
    satellite: { label: 'Satellite',   icon: '🛰️', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',          attr: '© Esri',             maxZoom: 19 },
    hybrid:    { label: 'Hybrid',      icon: '🌍', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',          attr: '© Esri | © OSM',    maxZoom: 19, overlay: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    topo:      { label: 'Topographic', icon: '⛰️', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                      attr: '© OSM | OpenTopoMap', maxZoom: 17 },
};
let currentTileLayer = null;
let currentOverlay   = null;

// Suburb polygon styles
const SUBURB_DEFAULT = { color: '#000', weight: 2.5, opacity: 1, fill: false, fillOpacity: 0 };
const SUBURB_HOVER   = { color: '#ff7800', weight: 4, opacity: 1, fill: true, fillColor: '#00d4ff', fillOpacity: 0.25 };

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function statusColor(raw) {
    if (!raw) return '#9b59b6';
    const s = String(raw).toLowerCase();
    if (s === 'critical') return '#dc3545';
    if (s === 'warning')  return '#ffc107';
    return '#9b59b6';   // purple = normal manhole
}

function pipeStatusColor(raw) {
    if (!raw) return '#32cd32';
    const s = String(raw).toLowerCase();
    if (s === 'critical') return '#dc3545';
    if (s === 'warning')  return '#ffc107';
    return '#32cd32';   // lime green = normal pipeline
}

// ─────────────────────────────────────────────────────────────────────────────
// POINT-IN-POLYGON (Ray Casting)
// ─────────────────────────────────────────────────────────────────────────────

function isPointInPolygon(lng, lat, geom) {
    const rings = geom.type === 'Polygon'
        ? [geom.coordinates[0]]
        : geom.coordinates.map(p => p[0]);

    let inside = false;
    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [xi, yi] = ring[i];
            const [xj, yj] = ring[j];
            if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi) / (yj - yi) + xi))
                inside = !inside;
        }
    }
    return inside;
}

function findSuburbForPoint(lng, lat) {
    for (const s of suburbGeometries) {
        const b = s.bounds;
        if (lng < b.minX || lng > b.maxX || lat < b.minY || lat > b.maxY) continue;
        if (isPointInPolygon(lng, lat, s.geometry)) return s.name;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBURB GEOMETRIES LOADER
// ─────────────────────────────────────────────────────────────────────────────

async function loadSuburbGeometries() {
    try {
        const res  = await fetch(`${API_BASE_URL}/suburbs/geojson`);
        if (!res.ok) return;
        const data = await res.json();
        suburbGeometries = [];

        for (const f of data.features || []) {
            const g = f.geometry;
            const name = (f.properties?.name || f.properties?.suburb_nam || 'Unknown').toUpperCase();
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            const walk = coords => {
                if (typeof coords[0] === 'number') {
                    minX = Math.min(minX, coords[0]); maxX = Math.max(maxX, coords[0]);
                    minY = Math.min(minY, coords[1]); maxY = Math.max(maxY, coords[1]);
                } else coords.forEach(walk);
            };
            walk(g.coordinates);
            suburbGeometries.push({ name, geometry: g, bounds: { minX, maxX, minY, maxY } });
        }
        console.log(`✅ Suburb geometries: ${suburbGeometries.length}`);
    } catch (e) {
        console.error('loadSuburbGeometries:', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// API FETCH HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function fetchGeoJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`fetchGeoJSON(${url}):`, e);
        return { type: 'FeatureCollection', features: [] };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBURB STATS
// ─────────────────────────────────────────────────────────────────────────────

async function calculateSuburbStatistics() {
    const initStats = () => ({ total: 0, critical: 0, warning: 0, good: 0 });

    for (const s of suburbGeometries) {
        suburbStats[s.name]         = initStats();
        suburbPipelineStats[s.name] = initStats();
    }
    suburbStats['UNKNOWN']         = initStats();
    suburbPipelineStats['UNKNOWN'] = initStats();

    const [mhData, plData] = await Promise.all([
        fetchGeoJSON(`${API_BASE_URL}/manholes/geojson?limit=20000`),
        fetchGeoJSON(`${API_BASE_URL}/pipelines/geojson?limit=20000`),
    ]);

    for (const f of mhData.features || []) {
        const [lng, lat] = f.geometry?.coordinates || [];
        if (!lng || !lat) continue;
        const suburb = findSuburbForPoint(lng, lat) || 'UNKNOWN';
        if (!suburbStats[suburb]) suburbStats[suburb] = initStats();
        suburbStats[suburb].total++;
        const s = f.properties?.status || 'good';
        if (s === 'critical') suburbStats[suburb].critical++;
        else if (s === 'warning') suburbStats[suburb].warning++;
        else suburbStats[suburb].good++;
    }

    for (const f of plData.features || []) {
        const g = f.geometry;
        let coords = null;
        if (g?.type === 'LineString') coords = g.coordinates[0];
        else if (g?.type === 'MultiLineString') coords = g.coordinates[0]?.[0];
        if (!coords) continue;
        const suburb = findSuburbForPoint(coords[0], coords[1]) || 'UNKNOWN';
        if (!suburbPipelineStats[suburb]) suburbPipelineStats[suburb] = initStats();
        suburbPipelineStats[suburb].total++;
        const s = f.properties?.status || 'good';
        if (s === 'critical') suburbPipelineStats[suburb].critical++;
        else if (s === 'warning') suburbPipelineStats[suburb].warning++;
        else suburbPipelineStats[suburb].good++;
    }

    updateSuburbPopups();
    console.log('✅ Suburb stats calculated');
}

// ─────────────────────────────────────────────────────────────────────────────
// POPUP BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildSuburbPopup(name, props) {
    const mh = suburbStats[name]         || { total: 0, critical: 0, warning: 0, good: 0 };
    const pl = suburbPipelineStats[name] || { total: 0, critical: 0, warning: 0, good: 0 };
    return `
<div style="min-width:300px;font-family:monospace;font-size:12px">
  <b style="font-size:14px;color:#00d4ff">🏘️ ${name}</b>
  <hr style="border-color:#333;margin:6px 0">
  <div style="color:#9b59b6;font-weight:bold;margin-bottom:4px">🕳️ MANHOLES</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">
    <tr><td>Total</td><td style="text-align:right;color:#69f0ae;font-weight:bold">${mh.total}</td></tr>
    <tr><td style="color:#dc3545">🔴 Critical</td><td style="text-align:right;color:#dc3545;font-weight:bold">${mh.critical}</td></tr>
    <tr><td style="color:#ffc107">🟡 Warning</td> <td style="text-align:right;color:#ffc107;font-weight:bold">${mh.warning}</td></tr>
    <tr><td style="color:#9b59b6">🟣 Normal</td>  <td style="text-align:right;color:#9b59b6;font-weight:bold">${mh.good}</td></tr>
   </table>
  <div style="color:#32cd32;font-weight:bold;margin-bottom:4px">📏 PIPELINES</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <tr><td>Total</td><td style="text-align:right;color:#69f0ae;font-weight:bold">${pl.total}</td></tr>
    <tr><td style="color:#dc3545">🔴 Critical</td><td style="text-align:right;color:#dc3545;font-weight:bold">${pl.critical}</td></tr>
    <tr><td style="color:#ffc107">🟡 Warning</td> <td style="text-align:right;color:#ffc107;font-weight:bold">${pl.warning}</td></tr>
    <tr><td style="color:#32cd32">🟢 Normal</td>  <td style="text-align:right;color:#32cd32;font-weight:bold">${pl.good}</td></tr>
   </table>
  <hr style="border-color:#333;margin:6px 0">
  <div style="font-size:10px;color:#888;text-align:center">Ward: ${props?.ward || 'N/A'} | Zone: ${props?.zone || 'N/A'}</div>
</div>`;
}

function buildManholePopup(props, suburbName) {
    const col = statusColor(props.status);
    const statusLabel = props.status === 'critical' ? 'Critical' : props.status === 'warning' ? 'Warning' : 'Normal';
    return `
<div style="min-width:200px;font-family:monospace;font-size:12px">
  <b>🕳️ ${props.manhole_id || 'Manhole'}</b>
  <hr style="border-color:#333;margin:5px 0">
  <div>📍 <b style="color:#00d4ff">Suburb:</b> <span style="color:#00d4ff">${suburbName || props.suburb || 'Unknown'}</span></div>
  <div>📊 <b>Status:</b> <span style="color:${col};font-weight:bold">${statusLabel}</span></div>
  <div>📏 <b>Depth:</b> ${props.depth != null ? props.depth + ' m' : 'N/A'}</div>
  <div>🔧 <b>Inspector:</b> ${props.inspector || 'N/A'}</div>
  <div>📅 <b>Inspected:</b> ${props.inspection_date || 'N/A'}</div>
</div>`;
}

function buildPipelinePopup(props, suburbName) {
    const col = pipeStatusColor(props.status);
    const statusLabel = props.status === 'critical' ? 'Critical' : props.status === 'warning' ? 'Warning' : 'Normal';
    return `
<div style="min-width:220px;font-family:monospace;font-size:12px">
  <b>📏 ${props.pipe_id || 'Pipeline'}</b>
  <hr style="border-color:#333;margin:5px 0">
  <div>📍 <b style="color:#00d4ff">Suburb:</b> <span style="color:#00d4ff">${suburbName || 'Unknown'}</span></div>
  <div>📊 <b>Status:</b> <span style="color:${col};font-weight:bold">${statusLabel}</span></div>
  <div>🔧 <b>Material:</b> ${props.material || 'N/A'}</div>
  <div>📏 <b>Length:</b> ${props.length != null ? props.length.toFixed(1) + ' m' : 'N/A'}</div>
  <div>📐 <b>Diameter:</b> ${props.diameter || 'N/A'} mm</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD FULL LAYERS (initial load / reset)
// ─────────────────────────────────────────────────────────────────────────────

function loadManholesFromGeoJSON(geojson) {
    if (!map) return;

    // Remove existing markers
    allManholeMarkers.forEach(m => map.hasLayer(m) && map.removeLayer(m));
    allManholeMarkers = [];
    
    // Store current manhole data for hotspots
    currentManholesData = [];

    for (const f of geojson?.features || []) {
        const [lng, lat] = f.geometry?.coordinates || [];
        if (!lng || !lat) continue;

        const props  = f.properties || {};
        const color  = statusColor(props.status);
        const suburb = findSuburbForPoint(lng, lat);

        const marker = L.circleMarker([lat, lng], {
            radius: 6, color, fillColor: color, fillOpacity: 0.85, weight: 1.5, opacity: 1,
        }).bindPopup(buildManholePopup(props, suburb));

        marker._filterStatus = props.status || 'good';
        marker._lng = lng; marker._lat = lat;
        marker._props = props;
        marker._id = props.manhole_id;

        marker.addTo(map);
        allManholeMarkers.push(marker);
        
        // Store for hotspots
        currentManholesData.push({
            id: props.manhole_id,
            manhole_id: props.manhole_id,
            name: props.manhole_id,
            lat: lat,
            lng: lng,
            suburb: suburb || props.suburb || 'Unknown',
            suburb_nam: suburb || props.suburb || 'Unknown',
            status: props.status || 'good',
            bloc_stat: props.status || 'good',
            depth: props.depth,
            inspector: props.inspector,
            inspection_date: props.inspection_date
        });
    }
    
    // Update hotspots component with the data
    if (window.hotspotsComponent && currentManholesData.length) {
        window.hotspotsComponent.update(currentManholesData);
        console.log(`🔥 Hotspots component updated with ${currentManholesData.length} manholes`);
    }
    
    console.log(`✅ Manhole markers: ${allManholeMarkers.length}`);
}

function loadPipelinesFromGeoJSON(geojson) {
    if (!map) return;

    if (allPipelineLayer) {
        map.hasLayer(allPipelineLayer) && map.removeLayer(allPipelineLayer);
        allPipelineLayer = null;
    }

    allPipelineLayer = L.geoJSON(geojson, {
        style: f => {
            const col = pipeStatusColor(f.properties?.status);
            return { color: col, weight: 2.5, opacity: 0.9 };
        },
        onEachFeature: (f, layer) => {
            const g = f.geometry;
            let startCoords = null;
            if (g?.type === 'LineString') startCoords = g.coordinates[0];
            else if (g?.type === 'MultiLineString') startCoords = g.coordinates[0]?.[0];
            const suburb = startCoords ? findSuburbForPoint(startCoords[0], startCoords[1]) : null;
            layer.bindPopup(buildPipelinePopup(f.properties || {}, suburb));
            layer._featureId = f.properties?.pipe_id;
        }
    }).addTo(map);

    console.log(`✅ Pipeline features: ${geojson?.features?.length || 0}`);
}

function loadSuburbsFromGeoJSON(geojson) {
    if (!map) return;

    // Remove old
    suburbLabels.forEach(l => map.hasLayer(l) && map.removeLayer(l));
    suburbLabels = [];
    if (currentSuburbLayer) { map.hasLayer(currentSuburbLayer) && map.removeLayer(currentSuburbLayer); currentSuburbLayer = null; }

    currentSuburbLayer = L.geoJSON(geojson, {
        style: () => SUBURB_DEFAULT,
        onEachFeature: (f, layer) => {
            const name = (f.properties?.name || f.properties?.suburb_nam || 'Unknown').toUpperCase();
            layer.bindPopup(buildSuburbPopup(name, f.properties));

            layer.on('mouseover', () => { layer.setStyle(SUBURB_HOVER); });
            layer.on('mouseout',  () => { layer.setStyle(SUBURB_DEFAULT); });

            try {
                const centre = layer.getBounds().getCenter();
                const label = L.marker(centre, {
                    icon: L.divIcon({
                        html: `<div style="font-family:monospace;font-size:9px;font-weight:bold;color:#000;background:rgba(255,255,255,.8);padding:1px 5px;border-radius:3px;border:1px solid #555;white-space:nowrap">${name}</div>`,
                        iconSize: [null, null],
                    }),
                    interactive: false,
                });
                label.suburbName = name;
                label.addTo(map);
                suburbLabels.push(label);
            } catch (_) { /* bounds error — skip label */ }
        }
    }).addTo(map);

    console.log(`✅ Suburbs: ${geojson?.features?.length || 0}`);
}

function loadComplaintsFromGeoJSON(geojson) {
    if (!map) return;
    currentComplaintMarkers.forEach(m => map.hasLayer(m) && map.removeLayer(m));
    currentComplaintMarkers = [];

    for (const f of geojson?.features || []) {
        const [lng, lat] = f.geometry?.coordinates || [];
        if (!lng || !lat) continue;
        const props = f.properties || {};
        const color = props.status === 'resolved' ? '#28a745' : '#dc3545';

        L.circleMarker([lat, lng], { radius: 8, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
            .bindPopup(`<b>⚠️ Complaint</b><br>📍 ${props.address || 'Unknown'}<br>Status: ${props.status || 'pending'}`)
            .addTo(map).let?.(m => currentComplaintMarkers.push(m));

        // .let is not standard — push manually:
        const m = L.circleMarker([lat, lng], { radius: 8, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
            .bindPopup(`<b>⚠️ Complaint</b><br>📍 ${props.address || 'Unknown'}<br>Status: ${props.status || 'pending'}`);
        m.addTo(map);
        currentComplaintMarkers.push(m);
    }
}

// deduplicate complaint markers (we add twice above - fix:)
// Actually let's redo complaints loading cleanly:
function _loadComplaints(geojson) {
    if (!map) return;
    currentComplaintMarkers.forEach(m => map.hasLayer(m) && map.removeLayer(m));
    currentComplaintMarkers = [];
    for (const f of geojson?.features || []) {
        const [lng, lat] = f.geometry?.coordinates || [];
        if (!lng || !lat) continue;
        const props = f.properties || {};
        const color = props.status === 'resolved' ? '#28a745' : '#dc3545';
        const m = L.circleMarker([lat, lng], { radius: 8, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
            .bindPopup(`<b>⚠️ Complaint</b><br>📍 ${props.address || 'Unknown'}<br>Status: ${props.status || 'pending'}`);
        m.addTo(map);
        currentComplaintMarkers.push(m);
    }
}

function loadCadastreFromGeoJSON(geojson) {
    if (!map) return;
    cadastreLabels.forEach(l => map.hasLayer(l) && map.removeLayer(l));
    cadastreLabels = [];
    if (currentCadastreLayer) { map.hasLayer(currentCadastreLayer) && map.removeLayer(currentCadastreLayer); currentCadastreLayer = null; }

    currentCadastreLayer = L.geoJSON(geojson, {
        style: { color: '#2e7d52', weight: 1, opacity: 0.4, fill: false },
        onEachFeature: (f, layer) => {
            const sn = f.properties?.stand_number;
            if (sn) {
                try {
                    const c = layer.getBounds().getCenter();
                    const lbl = L.marker(c, {
                        icon: L.divIcon({ html: `<div style="font-size:7px;background:rgba(255,255,255,.7);padding:1px 3px;border-radius:2px">${sn}</div>`, iconSize: [null, null] }),
                        interactive: false,
                    }).addTo(map);
                    cadastreLabels.push(lbl);
                } catch (_) {}
            }
        }
    }).addTo(map);
}

// Update suburb popups with calculated stats
function updateSuburbPopups() {
    if (!currentSuburbLayer) return;
    currentSuburbLayer.eachLayer(layer => {
        const props = layer.feature?.properties || {};
        const name  = (props.name || props.suburb_nam || 'Unknown').toUpperCase();
        layer.setPopupContent(buildSuburbPopup(name, props));
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER HIGHLIGHT  ← THE KEY NEW FEATURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called when the 'filtersChanged' event fires.
 *
 * If filtersAreActive:
 *   1. Build a Set of matched manhole IDs and pipe IDs.
 *   2. Dim ALL existing markers / pipelines.
 *   3. Re-draw matched ones at full brightness with a cyan highlight ring.
 *
 * If no filters are active: restore everything to normal opacity/colour.
 */
function applyFilterHighlight(detail) {
    const { manholeGeoJSON, pipelineGeoJSON, manholes, pipelines, filtersAreActive } = detail;

    // ── Clean up previous highlight layers ───────────────────────────────────
    if (highlightManholeLayer)  { map.hasLayer(highlightManholeLayer)  && map.removeLayer(highlightManholeLayer);  highlightManholeLayer  = null; }
    if (highlightPipelineLayer) { map.hasLayer(highlightPipelineLayer) && map.removeLayer(highlightPipelineLayer); highlightPipelineLayer = null; }

    if (!filtersAreActive) {
        // Restore all base layers to full opacity
        allManholeMarkers.forEach(m => {
            m.setStyle({ opacity: 1, fillOpacity: 0.85, radius: 6 });
        });
        if (allPipelineLayer) {
            allPipelineLayer.eachLayer(l => {
                const col = pipeStatusColor(l.feature?.properties?.status);
                l.setStyle({ color: col, opacity: 0.9, weight: 2.5 });
            });
        }
        return;
    }

    // ── Build ID sets ─────────────────────────────────────────────────────────
    const matchedManholeIds  = new Set((manholeGeoJSON?.features || manholes || []).map(f => String((f.properties || f).manhole_id ?? f.manhole_id)));
    const matchedPipeIds     = new Set((pipelineGeoJSON?.features || pipelines || []).map(f => String((f.properties || f).pipe_id ?? f.pipe_id)));

    // ── Dim all base manhole markers ─────────────────────────────────────────
    allManholeMarkers.forEach(m => {
        const id = String(m._props?.manhole_id || '');
        if (matchedManholeIds.has(id)) {
            // Matched: keep full colour, enlarge slightly
            const col = statusColor(m._props?.status);
            m.setStyle({ color: '#00d4ff', fillColor: col, opacity: 1, fillOpacity: 0.95, weight: 2.5, radius: 8 });
        } else {
            // Unmatched: dim to near-invisible grey
            m.setStyle({ color: '#555', fillColor: '#444', opacity: 0.15, fillOpacity: 0.12, radius: 5, weight: 1 });
        }
    });

    // ── Dim / highlight pipeline segments ────────────────────────────────────
    if (allPipelineLayer) {
        allPipelineLayer.eachLayer(l => {
            const id = String(l._featureId || l.feature?.properties?.pipe_id || '');
            if (matchedPipeIds.has(id)) {
                const col = pipeStatusColor(l.feature?.properties?.status);
                l.setStyle({ color: col, opacity: 1, weight: 4 });
            } else {
                l.setStyle({ color: '#333', opacity: 0.12, weight: 1.5 });
            }
        });
    }

    // ── Counts in console ────────────────────────────────────────────────────
    console.log(`🗺️ Highlight — ${matchedManholeIds.size} manholes, ${matchedPipeIds.size} pipelines`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL REFRESH
// ─────────────────────────────────────────────────────────────────────────────

async function refreshAllLayers() {
    if (!map) return;
    showLoadingIndicator(true);

    try {
        await loadSuburbGeometries();

        const [mhGeo, plGeo, sbGeo, cpGeo, cdGeo] = await Promise.all([
            fetchGeoJSON(`${API_BASE_URL}/manholes/geojson?limit=10000`),
            fetchGeoJSON(`${API_BASE_URL}/pipelines/geojson?limit=10000`),
            fetchGeoJSON(`${API_BASE_URL}/suburbs/geojson`),
            fetchGeoJSON(`${API_BASE_URL}/complaints/geojson`),
            fetchGeoJSON(`${API_BASE_URL}/cadastre/all`),
        ]);

        loadSuburbsFromGeoJSON(sbGeo);
        loadManholesFromGeoJSON(mhGeo);
        loadPipelinesFromGeoJSON(plGeo);
        _loadComplaints(cpGeo);
        loadCadastreFromGeoJSON(cdGeo);

        await calculateSuburbStatistics();

        document.dispatchEvent(new CustomEvent('mapDataRefreshed', {
            detail: {
                manholes:  allManholeMarkers.length,
                pipelines: plGeo.features?.length || 0,
                suburbs:   sbGeo.features?.length || 0,
            }
        }));

    } catch (e) {
        console.error('refreshAllLayers:', e);
    } finally {
        showLoadingIndicator(false);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

let _loadingEl = null;
function showLoadingIndicator(show) {
    if (!_loadingEl) {
        _loadingEl = document.createElement('div');
        _loadingEl.style.cssText = 'position:absolute;bottom:24px;right:16px;background:rgba(0,0,0,.75);color:#8fdc00;padding:5px 12px;border-radius:5px;font-size:12px;font-family:monospace;z-index:1000;display:none';
        document.querySelector('.map-container')?.appendChild(_loadingEl);
    }
    if (show) {
        _loadingEl.textContent  = '🔄 Loading …';
        _loadingEl.style.display = 'block';
    } else {
        _loadingEl.textContent  = '✅ Loaded';
        setTimeout(() => { _loadingEl.style.display = 'none'; }, 1500);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE SWITCHER
// ─────────────────────────────────────────────────────────────────────────────

function switchBaseMap(type) {
    if (!map) return;
    const t = TILES[type];
    if (!t) return;
    if (currentTileLayer) map.removeLayer(currentTileLayer);
    if (currentOverlay)   map.removeLayer(currentOverlay);
    currentTileLayer = L.tileLayer(t.url, { attribution: t.attr, maxZoom: t.maxZoom }).addTo(map);
    if (t.overlay) currentOverlay = L.tileLayer(t.overlay, { opacity: 0.5 }).addTo(map);

    const btn = document.getElementById('selectedTileText');
    if (btn) btn.innerHTML = `${t.icon} ${t.label}`;
}

function addDropdownTileSelector() {
    const container = document.querySelector('.map-container');
    if (!container) return;
    document.querySelector('.tile-dropdown-wrapper')?.remove();

    const wrap = document.createElement('div');
    wrap.className  = 'tile-dropdown-wrapper';
    wrap.style.cssText = 'position:absolute;top:10px;right:10px;z-index:1000;font-family:monospace';
    wrap.innerHTML = `
<div style="position:relative">
  <button id="tileDropdownBtn" style="background:rgba(10,26,10,.95);border:1px solid forestgreen;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:bold;color:#8fdc00;display:flex;align-items:center;gap:8px;min-width:130px">
    <span id="selectedTileText">🗺️ Street</span><span style="font-size:10px">▼</span>
  </button>
  <div id="tileMenu" style="display:none;position:absolute;top:110%;right:0;background:rgba(10,26,10,.97);border:1px solid forestgreen;border-radius:6px;min-width:150px;overflow:hidden;z-index:1001">
    ${Object.entries(TILES).map(([k,t]) => `
      <div class="tile-opt" data-tile="${k}" style="padding:8px 12px;cursor:pointer;font-size:12px;color:#7ab87a;display:flex;align-items:center;gap:8px;border-bottom:1px solid #1a3a1a">
        ${t.icon} ${t.label}
      </div>`).join('')}
  </div>
</div>`;

    container.appendChild(wrap);

    document.getElementById('tileDropdownBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        const m = document.getElementById('tileMenu');
        m.style.display = m.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => { document.getElementById('tileMenu').style.display = 'none'; });
    wrap.querySelectorAll('.tile-opt').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            switchBaseMap(el.dataset.tile);
            document.getElementById('tileMenu').style.display = 'none';
        });
        el.addEventListener('mouseover', () => { el.style.background = '#1a3a1a'; });
        el.addEventListener('mouseout',  () => { el.style.background = 'transparent'; });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM TO LOCATION FOR HOTSPOTS
// ─────────────────────────────────────────────────────────────────────────────

function zoomToLocation(lat, lng, zoom = 18) {
    if (map && lat && lng) {
        map.setView([lat, lng], zoom);
        
        // Add temporary highlight marker
        if (window.tempHighlightMarker) {
            map.removeLayer(window.tempHighlightMarker);
        }
        window.tempHighlightMarker = L.circleMarker([lat, lng], {
            radius: 12,
            color: '#ff4444',
            weight: 3,
            fillColor: '#ff0000',
            fillOpacity: 0.5,
            className: 'hotspot-highlight'
        }).addTo(map);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            if (window.tempHighlightMarker) {
                map.removeLayer(window.tempHighlightMarker);
                window.tempHighlightMarker = null;
            }
        }, 3000);
    }
}

// Add hotspot event listeners
function addHotspotEventListeners() {
    document.addEventListener('zoomToLocation', (e) => {
        const { lat, lng, zoom } = e.detail;
        zoomToLocation(lat, lng, zoom || 18);
    });
    
    document.addEventListener('highlightAsset', (e) => {
        const { assetId, lat, lng, isCritical } = e.detail;
        if (map && lat && lng) {
            map.setView([lat, lng], 18);
            
            if (window.highlightMarker) {
                map.removeLayer(window.highlightMarker);
            }
            
            const highlightColor = isCritical ? '#ff0000' : '#ff6600';
            window.highlightMarker = L.circleMarker([lat, lng], {
                radius: 14,
                color: highlightColor,
                weight: 4,
                fillColor: highlightColor,
                fillOpacity: 0.4,
                className: 'asset-highlight-pulse'
            }).addTo(map);
            
            // Add pulsing animation via CSS
            if (!document.querySelector('#hotspot-pulse-style')) {
                const style = document.createElement('style');
                style.id = 'hotspot-pulse-style';
                style.textContent = `
                    .asset-highlight-pulse {
                        animation: pulse 1.5s ease-in-out infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 0.7; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.3); }
                        100% { opacity: 0.7; transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            setTimeout(() => {
                if (window.highlightMarker) {
                    map.removeLayer(window.highlightMarker);
                    window.highlightMarker = null;
                }
            }, 5000);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT MAP
// ─────────────────────────────────────────────────────────────────────────────

function initMap(centerLat = -18.9735, centerLng = 32.6705, zoom = 13) {
    const el = document.getElementById('map');
    if (!el || typeof L === 'undefined') {
        console.error('Map element or Leaflet not found');
        return null;
    }

    map = L.map('map').setView([centerLat, centerLng], zoom);
    currentTileLayer = L.tileLayer(TILES.osm.url, {
        attribution: TILES.osm.attr,
        maxZoom:     TILES.osm.maxZoom,
    }).addTo(map);

    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

    // Coordinate display
    map.on('mousemove', e => {
        const el = document.getElementById('coordStatus');
        if (el) el.innerHTML = `📍 ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)} | Zoom: ${map.getZoom()}`;
    });

    // ── Listen for filter events ──────────────────────────────────────────────
    document.addEventListener('filtersChanged', e => {
        applyFilterHighlight(e.detail);
    });
    
    // ── Add hotspot event listeners ──────────────────────────────────────────
    addHotspotEventListeners();

    setTimeout(() => addDropdownTileSelector(), 200);
    setTimeout(() => refreshAllLayers(), 800);

    document.dispatchEvent(new CustomEvent('mapReady'));
    console.log('✅ Map initialised');
    return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function fitToBounds() {
    if (!map || !allManholeMarkers.length) return;
    const bounds = L.latLngBounds(allManholeMarkers.map(m => m.getLatLng()));
    if (bounds.isValid()) map.fitBounds(bounds);
}

function showComplaintsWithBuffers(complaints) {
    currentComplaintBuffers.forEach(({ marker, buffer }) => {
        map.hasLayer(marker) && map.removeLayer(marker);
        map.hasLayer(buffer) && map.removeLayer(buffer);
    });
    currentComplaintBuffers = [];

    for (const c of complaints || []) {
        if (!c.latitude || !c.longitude) continue;
        const color = '#ff9800';
        const r     = c.buffer_radius || 80;
        const marker = L.circleMarker([c.latitude, c.longitude], { radius: 10, color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.9, weight: 2 })
            .bindPopup(`<b>⚠️ Complaint</b><br>${c.address}`).addTo(map);
        const buffer = L.circle([c.latitude, c.longitude], { radius: r, color, fillColor: color, fillOpacity: 0.15, weight: 2 }).addTo(map);
        currentComplaintBuffers.push({ marker, buffer });
    }
}

function showHeatmapFromCurrentMarkers() {
    if (!map || !allManholeMarkers.length) return;
    if (heatLayer) map.removeLayer(heatLayer);
    heatLayer = L.heatLayer(allManholeMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng, 1]), { radius: 25, blur: 15 }).addTo(map);
}

function clearHeatmap() {
    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    heatLayer = null;
}

function clearPipelines() {
    if (allPipelineLayer && map.hasLayer(allPipelineLayer)) { map.removeLayer(allPipelineLayer); allPipelineLayer = null; }
}

function clearSuburbs() {
    suburbLabels.forEach(l => map.hasLayer(l) && map.removeLayer(l)); suburbLabels = [];
    if (currentSuburbLayer && map.hasLayer(currentSuburbLayer)) { map.removeLayer(currentSuburbLayer); currentSuburbLayer = null; }
}

function clearComplaints() {
    currentComplaintMarkers.forEach(m => map.hasLayer(m) && map.removeLayer(m));
    currentComplaintMarkers = [];
}

function clearCadastre() {
    cadastreLabels.forEach(l => map.hasLayer(l) && map.removeLayer(l)); cadastreLabels = [];
    if (currentCadastreLayer && map.hasLayer(currentCadastreLayer)) { map.removeLayer(currentCadastreLayer); currentCadastreLayer = null; }
}

function getMap() { return map; }
function getCurrentManholesData() { return currentManholesData; }

// Resolve complaint helper (called from popup)
window.markComplaintResolved = async id => {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/resolve`, { method: 'PUT' });
    if (res.ok) { alert('Resolved!'); refreshAllLayers(); document.dispatchEvent(new CustomEvent('dataRefreshed')); }
};
window.zoomToStand = (lat, lng) => map?.setView([lat, lng], 18);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
    init:                        initMap,
    getMap,
    getCurrentManholesData,
    switchBaseMap,
    refreshAllLayers,
    loadManholesFromGeoJSON,
    loadPipelinesFromGeoJSON,
    loadSuburbsFromGeoJSON,
    loadCadastreFromGeoJSON,
    clearPipelines,
    clearSuburbs,
    clearComplaints,
    clearCadastre,
    showComplaintsWithBuffers,
    showHeatmapFromCurrentMarkers,
    clearHeatmap,
    fitToBounds,
    applyFilterHighlight,
    zoomToLocation,
};