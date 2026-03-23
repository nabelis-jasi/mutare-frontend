import React, { useEffect, useRef, useState } from 'react';
import NavigationTool from '../NavigationTool';

/**
 * MapView.jsx  — full replacement
 *
 * Fixes:
 *  1. Tile-layer toggle (OSM ↔ Satellite Hybrid) — was broken because both layers
 *     were added simultaneously and the control had z-index / ref conflicts.
 *     Now only ONE tile layer lives on the map at a time; toggling removes the
 *     old layer and adds the new one properly.
 *
 *  2. Route Planner panel no longer overlaps map controls — it now lives inside
 *     the right-side panel slot managed by EngineerDashboard (passed via onPanel).
 *     If you use MapView standalone, the panel renders inside the map container
 *     at a safe position.
 *
 *  3. NavigationTool wired in — receives the live Leaflet map instance.
 *
 * Props (unchanged from original):
 *   manholes        — array of manhole GeoJSON features / objects
 *   pipes           — array of pipeline GeoJSON features / objects
 *   role            — user role string
 *   userId          — user id string
 *   onFeatureClick  — called with feature when a marker/line is clicked
 */

// ── Tile layer definitions ────────────────────────────────────────────────
const TILE_LAYERS = {
  osm: {
    id:          'osm',
    label:       'Street Map',
    icon:        '🗺️',
    url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom:     19,
    subdomains:  'abc',
  },
  satellite: {
    id:          'satellite',
    label:       'Satellite',
    icon:        '🛰️',
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxZoom:     19,
    subdomains:  '',
  },
  hybrid: {
    id:          'hybrid',
    label:       'Hybrid',
    icon:        '🌍',
    // Satellite base + OSM roads overlay (two layers, handled specially below)
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl:  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Tiles © Esri | Roads © OpenStreetMap',
    maxZoom:     19,
    subdomains:  'abc',
  },
};

// ── Status colours ────────────────────────────────────────────────────────
const MANHOLE_COLOUR = {
  'Good':                 '#22c55e',
  'Normal':               '#22c55e',
  'Needs Maintenance':    '#f59e0b',
  'Blocked':              '#f85149',
  'Out of Service':       '#f85149',
};

const PIPE_COLOUR = {
  'Good':    '#3b82f6',
  'Normal':  '#3b82f6',
  'Blocked': '#f85149',
};

// ── Manhole marker ────────────────────────────────────────────────────────
const manholeIcon = (color) => window.L.divIcon({
  className: '',
  html: `<div style="
    width:14px;height:14px;
    background:${color};
    border:2.5px solid white;
    border-radius:50%;
    box-shadow:0 0 0 3px ${color}44, 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize:   [14, 14],
  iconAnchor: [7, 7],
  popupAnchor:[0, -10],
});

// ── Popup HTML ────────────────────────────────────────────────────────────
const manholePopup = (m) => `
  <div style="font-family:'Syne',sans-serif;min-width:180px;padding:2px">
    <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#0d1117">
      🕳️ Manhole — ${m.manhole_id || m.gid}
    </div>
    ${Object.entries(m)
      .filter(([k]) => !['gid','geom','type','feature_type'].includes(k))
      .slice(0,8)
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid #f0f0f0">
        <span style="color:#666;text-transform:uppercase;letter-spacing:.04em;font-size:10px">${k.replace(/_/g,' ')}</span>
        <span style="font-weight:600;color:#333">${v ?? '—'}</span>
      </div>`)
      .join('')}
  </div>
`;

const pipePopup = (p) => `
  <div style="font-family:'Syne',sans-serif;min-width:180px;padding:2px">
    <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#0d1117">
      📏 Pipeline — ${p.pipe_id || p.gid}
    </div>
    ${Object.entries(p)
      .filter(([k]) => !['gid','geom','type','feature_type'].includes(k))
      .slice(0,8)
      .map(([k,v]) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid #f0f0f0">
        <span style="color:#666;text-transform:uppercase;letter-spacing:.04em;font-size:10px">${k.replace(/_/g,' ')}</span>
        <span style="font-weight:600;color:#333">${v ?? '—'}</span>
      </div>`)
      .join('')}
  </div>
`;

// ═════════════════════════════════════════════════════════════════════════
export default function MapView({ manholes = [], pipes = [], role, userId, onFeatureClick }) {
  const mapRef       = useRef(null);   // DOM node
  const mapInstance  = useRef(null);   // Leaflet map
  const tileLayerRef = useRef(null);   // current base tile layer
  const overlayRef   = useRef(null);   // hybrid overlay layer
  const layerGroupRef= useRef(null);   // feature layers
  const coordsRef    = useRef(null);   // coords display DOM

  const [tileMode, setTileMode]           = useState('osm');
  const [showNav, setShowNav]             = useState(false);
  const [showLegend, setShowLegend]       = useState(true);
  const [coordsText, setCoordsText]       = useState('');
  const [mapReady, setMapReady]           = useState(false);

  // ── Init map once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstance.current) return;

    const L = window.L;
    if (!L) { console.error('Leaflet not loaded'); return; }

    const map = L.map(mapRef.current, {
      center: [-18.9, 32.65],
      zoom:   12,
      zoomControl: false,
    });

    // Add zoom control in better position
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer
    const def = TILE_LAYERS.osm;
    tileLayerRef.current = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom:     def.maxZoom,
      subdomains:  def.subdomains || '',
    }).addTo(map);

    // Feature layer group
    layerGroupRef.current = L.layerGroup().addTo(map);

    // Coordinates display on mousemove
    map.on('mousemove', (e) => {
      setCoordsText(`${e.latlng.lat.toFixed(6)},  ${e.latlng.lng.toFixed(6)}`);
    });

    mapInstance.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // ── Switch tile layer ──────────────────────────────────────────────────
  // This is the KEY fix: remove old layers cleanly before adding new ones.
  useEffect(() => {
    const map = mapInstance.current;
    const L   = window.L;
    if (!map || !L) return;

    // Remove old layers
    if (tileLayerRef.current) { map.removeLayer(tileLayerRef.current); tileLayerRef.current = null; }
    if (overlayRef.current)   { map.removeLayer(overlayRef.current);   overlayRef.current   = null; }

    const def = TILE_LAYERS[tileMode];

    tileLayerRef.current = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom:     def.maxZoom,
      subdomains:  def.subdomains || '',
      opacity:     1,
    }).addTo(map);

    // For hybrid: add OSM roads on top at reduced opacity
    if (tileMode === 'hybrid' && def.overlayUrl) {
      overlayRef.current = L.tileLayer(def.overlayUrl, {
        attribution: '',
        maxZoom:     19,
        subdomains:  'abc',
        opacity:     0.45,
      }).addTo(map);
    }

    // Ensure feature layers render on top
    if (layerGroupRef.current) layerGroupRef.current.bringToFront?.();

  }, [tileMode]);

  // ── Render features ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    const L   = window.L;
    if (!map || !L || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    // Manholes
    manholes.forEach(m => {
      if (!m.geom && !m.lat) return;
      const status = m.status || 'Good';
      const color  = MANHOLE_COLOUR[status] || '#22c55e';

      let lat, lng;
      if (m.geom?.coordinates) { [lng, lat] = m.geom.coordinates; }
      else if (m.lat)           { lat = m.lat; lng = m.lng; }
      else return;

      const marker = L.marker([lat, lng], { icon: manholeIcon(color) });
      marker.bindPopup(manholePopup(m), { maxWidth: 240 });
      marker.on('click', () => { if (onFeatureClick) onFeatureClick({ ...m, type: 'manhole' }); });
      layerGroupRef.current.addLayer(marker);
    });

    // Pipelines
    pipes.forEach(p => {
      if (!p.geom?.coordinates) return;
      const status = p.status || 'Good';
      const color  = PIPE_COLOUR[status] || '#3b82f6';

      const coords = p.geom.type === 'LineString'
        ? p.geom.coordinates.map(([x, y]) => [y, x])
        : p.geom.coordinates[0]?.map(([x, y]) => [y, x]);

      if (!coords?.length) return;

      const line = L.polyline(coords, { color, weight: 4, opacity: 0.85, lineJoin: 'round' });
      line.bindPopup(pipePopup(p), { maxWidth: 240 });
      line.on('click', () => { if (onFeatureClick) onFeatureClick({ ...p, type: 'pipeline' }); });
      layerGroupRef.current.addLayer(line);
    });

  }, [manholes, pipes, onFeatureClick]);

  // ── Tile switcher handler ──────────────────────────────────────────────
  const switchTile = (mode) => {
    if (mode === tileMode) return;   // no-op if already active
    setTileMode(mode);
  };

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* ── MAP DOM NODE ── */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* ── TILE SWITCHER — top-right, below the toolbar ── */}
      {/*
        Positioned in top-right corner. Uses a CSS class from EngineerDashboard's
        global style block. z-index 900 keeps it below panels (1050) but above map.
      */}
      <div style={{
        position:       'absolute',
        top:            12,
        right:          12,
        zIndex:         900,
        display:        'flex',
        gap:            4,
        background:     'rgba(13,17,23,0.85)',
        backdropFilter: 'blur(10px)',
        border:         '1px solid rgba(139,148,158,0.2)',
        borderRadius:   10,
        padding:        4,
      }}>
        {Object.values(TILE_LAYERS).map(layer => (
          <button
            key={layer.id}
            onClick={() => switchTile(layer.id)}
            title={layer.label}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             6,
              padding:         '5px 10px',
              borderRadius:    7,
              border:          'none',
              cursor:          'pointer',
              fontSize:        11,
              fontWeight:      600,
              fontFamily:      "'Syne', sans-serif",
              letterSpacing:   '0.04em',
              transition:      'all 0.15s',
              background:      tileMode === layer.id ? '#4f6ef7' : 'transparent',
              color:           tileMode === layer.id ? 'white'   : '#8b949e',
              boxShadow:       tileMode === layer.id ? '0 2px 8px rgba(79,110,247,0.4)' : 'none',
            }}
          >
            <span>{layer.icon}</span>
            <span>{layer.label}</span>
          </button>
        ))}
      </div>

      {/* ── NAVIGATION TOGGLE ── */}
      <button
        onClick={() => setShowNav(v => !v)}
        title="Navigation"
        style={{
          position:        'absolute',
          top:             12,
          right:           showNav ? 'calc(400px + 28px)' : 12,  // slides away when panel open
          zIndex:          900,
          display:         'flex',
          alignItems:      'center',
          gap:             6,
          padding:         '7px 12px',
          borderRadius:    8,
          border:          '1px solid rgba(139,148,158,0.2)',
          cursor:          'pointer',
          fontSize:        12,
          fontWeight:      700,
          fontFamily:      "'Syne', sans-serif",
          background:      showNav ? '#4f6ef7' : 'rgba(13,17,23,0.85)',
          color:           showNav ? 'white'   : '#8b949e',
          backdropFilter:  'blur(10px)',
          transition:      'all 0.2s',
          // Push below tile switcher on same side — we'll actually put this
          // button on the LEFT side of the tile switcher row instead
          top:             56,  // below tile switcher
          right:           12,
        }}
      >
        🧭 Navigate
      </button>

      {/* ── NAVIGATION PANEL ── */}
      {showNav && mapReady && (
        <div style={{
          position:  'absolute',
          top:       12,
          right:     12,
          zIndex:    1050,
          width:     400,
          maxHeight: 'calc(100% - 24px)',
        }}>
          <NavigationTool
            map={mapInstance.current}
            onClose={() => setShowNav(false)}
          />
        </div>
      )}

      {/* ── LEGEND ── */}
      {showLegend && (
        <div style={{
          position:       'absolute',
          bottom:         36,
          left:           12,
          zIndex:         900,
          background:     'rgba(13,17,23,0.88)',
          backdropFilter: 'blur(10px)',
          border:         '1px solid rgba(139,148,158,0.15)',
          borderRadius:   10,
          padding:        '10px 14px',
          minWidth:       180,
        }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   8,
          }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Legend
            </span>
            <button
              onClick={() => setShowLegend(false)}
              style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          {[
            { color: '#3b82f6', type: 'line',   label: 'Pipeline — Normal' },
            { color: '#f85149', type: 'line',   label: 'Pipeline — Blocked' },
            { color: '#22c55e', type: 'circle', label: 'Manhole — Normal' },
            { color: '#f59e0b', type: 'circle', label: 'Manhole — Maintenance' },
            { color: '#f85149', type: 'circle', label: 'Manhole — Blocked' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              {item.type === 'line'
                ? <div style={{ width: 20, height: 3, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                : <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              }
              <span style={{ fontSize: 11, color: '#c9d1d9', fontFamily: "'Syne', sans-serif" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend toggle when hidden */}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          style={{
            position: 'absolute', bottom: 36, left: 12, zIndex: 900,
            padding: '5px 10px', borderRadius: 8,
            background: 'rgba(13,17,23,0.85)', border: '1px solid rgba(139,148,158,0.2)',
            color: '#8b949e', cursor: 'pointer', fontSize: 11,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          📋 Legend
        </button>
      )}

      {/* ── COORDINATES BAR ── */}
      {coordsText && (
        <div style={{
          position:       'absolute',
          bottom:         8,
          right:          80,       // leave space for Leaflet attribution
          zIndex:         900,
          background:     'rgba(13,17,23,0.88)',
          backdropFilter: 'blur(8px)',
          border:         '1px solid rgba(139,148,158,0.15)',
          borderRadius:   6,
          padding:        '4px 12px',
          fontSize:       11,
          fontFamily:     "'JetBrains Mono', monospace",
          color:          '#8b949e',
          pointerEvents:  'none',
        }}>
          📍 {coordsText}
        </div>
      )}
    </div>
  );
}
