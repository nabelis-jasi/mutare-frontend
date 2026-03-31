import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Fix default marker icons ───────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ─────────────────────────────────────────────────────────────────────────
// TILE CATALOGUE
// Hybrid = Esri World Imagery (satellite) + OSM roads overlay @ 42% opacity.
// This is TOS-compliant and visually identical to Google Maps hybrid.
// ─────────────────────────────────────────────────────────────────────────
const TILES = {
  osm: {
    id:    "osm",
    label: "Street",
    icon:  "🗺️",
    url:   "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr:  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    sub:   "abc",
    max:   19,
  },
  satellite: {
    id:    "satellite",
    label: "Satellite",
    icon:  "🛰️",
    url:   "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr:  "Tiles &copy; Esri — Source: Esri, DigitalGlobe, GeoEye, USDA, USGS",
    sub:   "",
    max:   19,
  },
  hybrid: {
    id:         "hybrid",
    label:      "Hybrid",
    icon:       "🌍",
    url:        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    overlayUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr:       "Imagery &copy; Esri | Roads &copy; OpenStreetMap",
    sub:        "abc",
    max:        19,
  },
  topo: {
    id:    "topo",
    label: "Topo",
    icon:  "⛰️",
    url:   "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attr:  "Map data &copy; OpenStreetMap | Style &copy; OpenTopoMap",
    sub:   "abc",
    max:   17,
  },
};

// ── Status colour helpers ──────────────────────────────────────────────────
const manholeColor = (s) => {
  if (!s) return "#28a745";
  const v = s.toLowerCase();
  if (v.includes("block") || v.includes("service")) return "#dc3545";
  if (v.includes("maintenance"))                     return "#ffc107";
  return "#28a745";
};

const pipeColor = (s) => {
  if (!s) return "#2b7bff";
  return s.toLowerCase().includes("block") ? "#dc3545" : "#2b7bff";
};

// ── Restored original icon: coloured circle with emoji inside ─────────────
const manholeIcon = (color, size = 20) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color:${color};
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 4px 8px rgba(0,0,0,0.3);
      display:flex;
      justify-content:center;
      align-items:center;
      color:white;
      font-size:${size / 2}px;
    ">🕳️</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 4)],
  });

// ── Geometry parsers ───────────────────────────────────────────────────────
const parsePoint = (geom) => {
  try {
    const g = typeof geom === "string" ? JSON.parse(geom) : geom;
    if (!g) return null;
    if (g.type === "Point"      && g.coordinates) return { lat: g.coordinates[1], lng: g.coordinates[0] };
    if (g.type === "MultiPoint" && g.coordinates?.length)
      return { lat: g.coordinates[0][1], lng: g.coordinates[0][0] };
  } catch { /* ignore */ }
  return null;
};

const parseLine = (geom) => {
  try {
    const g = typeof geom === "string" ? JSON.parse(geom) : geom;
    if (!g) return null;
    if (g.type === "LineString"      && g.coordinates)
      return g.coordinates.map(([x, y]) => [y, x]);
    if (g.type === "MultiLineString" && g.coordinates)
      return g.coordinates.flatMap(seg => seg.map(([x, y]) => [y, x]));
  } catch { /* ignore */ }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────
// TileManager: imperative layer switching — removes old, adds new.
// Must sit inside <MapContainer>.
// ─────────────────────────────────────────────────────────────────────────
function TileManager({ tileId }) {
  const map     = useMap();
  const baseRef = useRef(null);
  const overRef = useRef(null);

  useEffect(() => {
    if (baseRef.current) { map.removeLayer(baseRef.current); baseRef.current = null; }
    if (overRef.current) { map.removeLayer(overRef.current); overRef.current = null; }

    const def = TILES[tileId] || TILES.osm;
    baseRef.current = L.tileLayer(def.url, {
      attribution: def.attr,
      subdomains:  def.sub || "",
      maxZoom:     def.max,
    }).addTo(map);

    if (tileId === "hybrid" && def.overlayUrl) {
      overRef.current = L.tileLayer(def.overlayUrl, {
        subdomains: "abc",
        maxZoom:    19,
        opacity:    0.42,
      }).addTo(map);
    }

    return () => {
      if (baseRef.current) map.removeLayer(baseRef.current);
      if (overRef.current) map.removeLayer(overRef.current);
    };
  }, [tileId, map]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// MapBootstrap: fires onMapReady + tracks mouse + handles nav-pick mode.
// ─────────────────────────────────────────────────────────────────────────
function MapBootstrap({ onMapReady, setCoords, pickMode, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  useMapEvents({
    mousemove(e) {
      setCoords(`${e.latlng.lat.toFixed(6)},  ${e.latlng.lng.toFixed(6)}`);
    },
    click(e) {
      if (pickMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  // Change cursor when in pick mode
  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = pickMode ? "crosshair" : "";
  }, [map, pickMode]);

  return null;
}

// ── Reposition zoom control ────────────────────────────────────────────────
function ZoomReposition() {
  const map = useMap();
  useEffect(() => {
    map.zoomControl?.remove();
    L.control.zoom({ position: "bottomright" }).addTo(map);
  }, [map]);
  return null;
}

// ═════════════════════════════════════════════════════════════════════════
export default function MapView({
  manholes      = [],
  pipes         = [],
  role,
  userId,
  onFeatureClick,
  onMapReady,
  // Navigation integration
  navPickMode   = false,   // when true, cursor becomes crosshair
  onNavMapClick,           // (lat, lng) => void — called when user clicks map in pick mode
}) {
  const [tileId,     setTileId]     = useState("osm");
  const [coords,     setCoords]     = useState("");
  const [showLegend, setShowLegend] = useState(true);

  const handleMapReady = useCallback(
    (map) => { if (onMapReady) onMapReady(map); },
    [onMapReady]
  );

  // ── Glass panel style shared by all overlays ───────────────────────────
  const glass = {
    background:           "rgba(7,20,7,0.88)",
    backdropFilter:       "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border:               "1px solid rgba(45,138,45,0.25)",
    borderRadius:         10,
    color:                "#e8f5e8",
    fontFamily:           "'Barlow',sans-serif",
  };

  // ── Shared popup table builder ─────────────────────────────────────────
  const buildTable = (rows) => (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <tbody>
        {rows.filter(Boolean).map(([k, v]) => (
          <tr key={k} style={{ borderBottom: "1px solid #f0f0f0" }}>
            <td style={{ padding: "3px 8px 3px 0", color: "#555", fontWeight: 600, whiteSpace: "nowrap" }}>{k}</td>
            <td style={{ padding: "3px 0", color: "#111" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const editBtn = (feature) => onFeatureClick ? (
    <button
      onClick={() => onFeatureClick(feature)}
      style={{
        marginTop: 10, width: "100%",
        background: "#1a4d1a", color: "white",
        border: "1px solid #2d8a2d", borderRadius: 6,
        padding: "7px 0", cursor: "pointer",
        fontFamily: "'Barlow Condensed',sans-serif",
        fontWeight: 700, fontSize: 12,
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}
    >
      ✏️ Edit Record
    </button>
  ) : null;

  const popupHeader = (dot, label) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #f0f7f0",
    }}>
      {dot}
      <span style={{
        fontFamily: "'Barlow Condensed',sans-serif",
        fontWeight: 800, fontSize: 14,
        textTransform: "uppercase", letterSpacing: "0.06em",
        color: "#0a1f0a",
      }}>{label}</span>
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── MAP ──────────────────────────────────────────────────────── */}
      <MapContainer
        center={[-18.97, 32.67]}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        scrollWheelZoom
      >
        <ZoomReposition />
        <MapBootstrap
          onMapReady={handleMapReady}
          setCoords={setCoords}
          pickMode={navPickMode}
          onMapClick={onNavMapClick}
        />
        <TileManager tileId={tileId} />

        {/* ── MANHOLES ── */}
        {manholes.map((m) => {
          const pt = parsePoint(m.geom);
          if (!pt) return null;
          const color = manholeColor(m.bloc_stat);
          return (
            <Marker
              key={`mh-${m.gid}`}
              position={[pt.lat, pt.lng]}
              icon={manholeIcon(color, 20)}
            >
              <Popup maxWidth={280}>
                <div style={{ fontFamily: "'Barlow',sans-serif", minWidth: 210, padding: 2 }}>
                  {popupHeader(
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: color, flexShrink: 0, border: "2px solid white", boxShadow: `0 0 0 2px ${color}44` }} />,
                    m.manhole_id || `MH-${m.gid}`
                  )}
                  {buildTable([
                    ["Pipe ID",  m.pipe_id    || "—"],
                    ["Depth",    m.mh_depth   ? `${m.mh_depth} m` : "—"],
                    ["Status",   m.bloc_stat  || "Normal"],
                    ["Type",     m.type       || "Standard"],
                    ["Suburb",   m.suburb_nam || "—"],
                    ["Coords",   `${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`],
                  ])}
                  {editBtn({ ...m, type: "manhole" })}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── PIPELINES ── */}
        {pipes.map((p) => {
          const positions = parseLine(p.geom);
          if (!positions || positions.length < 2) return null;
          const color = pipeColor(p.block_stat);
          return (
            <Polyline
              key={`pl-${p.gid}`}
              positions={positions}
              pathOptions={{ color, weight: 5, opacity: 1 }}
            >
              <Popup maxWidth={280}>
                <div style={{ fontFamily: "'Barlow',sans-serif", minWidth: 210, padding: 2 }}>
                  {popupHeader(
                    <div style={{ width: 22, height: 4, borderRadius: 2, background: color, flexShrink: 0 }} />,
                    p.pipe_id || `PL-${p.gid}`
                  )}
                  {buildTable([
                    ["Start MH", p.start_mh   || "—"],
                    ["End MH",   p.end_mh     || "—"],
                    ["Material", p.pipe_mat   || "—"],
                    ["Size",     p.pipe_size  || "—"],
                    ["Length",   p.length     ? `${p.length} m` : "—"],
                    ["Status",   p.block_stat || "Normal"],
                  ])}
                  {editBtn({ ...p, type: "pipeline" })}
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>

      {/* ── NAV PICK MODE BANNER ─────────────────────────────────────── */}
      {navPickMode && (
        <div style={{
          position:  "absolute",
          top:       "50%",
          left:      "50%",
          transform: "translate(-50%, -50%)",
          zIndex:    950,
          pointerEvents: "none",
          textAlign: "center",
        }}>
          <div style={{
            ...glass,
            padding:    "10px 20px",
            fontSize:   13,
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:      "#8fdc00",
            boxShadow:  "0 4px 24px rgba(0,0,0,0.5)",
            animation:  "pulse-pick 1.2s infinite",
          }}>
            📍 Click on the map to set your point
          </div>
        </div>
      )}

      {/* ── TILE SWITCHER ────────────────────────────────────────────── */}
      <div style={{
        ...glass,
        position: "absolute",
        top: 10, right: 10,
        zIndex: 900,
        display: "flex",
        gap: 3,
        padding: 4,
      }}>
        {Object.values(TILES).map((t) => {
          const active = tileId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTileId(t.id)}
              title={t.label}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           5,
                padding:       "5px 10px",
                borderRadius:  7,
                border:        "none",
                cursor:        "pointer",
                fontFamily:    "'Barlow Condensed',sans-serif",
                fontSize:      12,
                fontWeight:    700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transition:    "all 0.15s",
                background:    active ? "#4aad4a"     : "transparent",
                color:         active ? "#011001"     : "#7ab87a",
                boxShadow:     active ? "0 2px 10px rgba(74,173,74,0.4)" : "none",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── LEGEND ───────────────────────────────────────────────────── */}
      {showLegend ? (
        <div style={{
          ...glass,
          position:  "absolute",
          bottom:    16,
          left:      66,   /* clears the 46px rail + 10px margin + 10px gap */
          zIndex:    900,
          padding:   "10px 14px",
          minWidth:  210,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8fdc00" }}>
              Legend
            </span>
            <button onClick={() => setShowLegend(false)}
              style={{ background: "none", border: "none", color: "#3d6e3d", cursor: "pointer", fontSize: 14, padding: 0 }}>
              ×
            </button>
          </div>
          {[
            { color: "#2b7bff", type: "line",    label: "Pipeline — Normal"     },
            { color: "#dc3545", type: "line",    label: "Pipeline — Blocked"    },
            { color: "#28a745", type: "manhole", label: "Manhole — Normal"      },
            { color: "#ffc107", type: "manhole", label: "Manhole — Maintenance" },
            { color: "#dc3545", type: "manhole", label: "Manhole — Blocked"     },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              {item.type === "line"
                ? <div style={{ width: 22, height: 4, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                : <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: item.color,
                    border: "2px solid white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 7, flexShrink: 0,
                  }}>🕳️</div>
              }
              <span style={{ fontSize: 11, color: "#b8dcb8" }}>{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setShowLegend(true)}
          style={{
            ...glass,
            position: "absolute", bottom: 16, left: 66, zIndex: 900,
            padding: "5px 12px", cursor: "pointer",
            border: "1px solid rgba(45,138,45,0.25)",
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "#7ab87a",
          }}
        >
          📋 Legend
        </button>
      )}

      {/* ── COORDINATE READOUT ───────────────────────────────────────── */}
      {coords && (
        <div style={{
          ...glass,
          position:      "absolute",
          bottom:        8, right: 90,
          zIndex:        900,
          padding:       "4px 12px",
          fontSize:      11,
          fontFamily:    "'JetBrains Mono', monospace",
          color:         "#7ab87a",
          pointerEvents: "none",
          whiteSpace:    "nowrap",
        }}>
          📍 {coords}
        </div>
      )}
    </div>
  );
}
