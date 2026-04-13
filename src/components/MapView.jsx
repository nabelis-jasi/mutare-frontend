import React, { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
  LayersControl,
  WMSTileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "../api/api";

// ── Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ── Tile definitions
const TILES = {
  osm: {
    id: "osm",
    label: "Street",
    icon: "🗺️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    max: 19,
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles &copy; Esri",
    max: 19,
  },
  hybrid: {
    id: "hybrid",
    label: "Hybrid",
    icon: "🌍",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    overlayUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "Imagery &copy; Esri | Roads &copy; OSM",
    max: 19,
  },
  topo: {
    id: "topo",
    label: "Topo",
    icon: "⛰️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attr: "Map data &copy; OSM | Style &copy; OpenTopoMap",
    max: 17,
  },
};

// ── Colors
const manholeColor = (s) => {
  if (!s) return "#28a745";
  const v = s.toLowerCase();
  if (v.includes("block") || v.includes("service")) return "#dc3545";
  if (v.includes("maintenance")) return "#ffc107";
  return "#28a745";
};
const pipeColor = (s) => (!s ? "#2b7bff" : s.toLowerCase().includes("block") ? "#dc3545" : "#2b7bff");

// ── Manhole icon
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
      font-size:${size / 2}px;
    ">🕳️</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });

// ── Parse geometry
const parsePoint = (geom) => {
  try {
    const g = typeof geom === "string" ? JSON.parse(geom) : geom;
    if (!g) return null;
    if (g.type === "Point") return { lat: g.coordinates[1], lng: g.coordinates[0] };
    if (g.type === "MultiPoint") return { lat: g.coordinates[0][1], lng: g.coordinates[0][0] };
  } catch {}
  return null;
};
const parseLine = (geom) => {
  try {
    const g = typeof geom === "string" ? JSON.parse(geom) : geom;
    if (!g) return null;
    if (g.type === "LineString") return g.coordinates.map(([x, y]) => [y, x]);
    if (g.type === "MultiLineString") return g.coordinates.flatMap((seg) => seg.map(([x, y]) => [y, x]));
  } catch {}
  return null;
};

// ── Tile Manager
function TileManager({ activeTiles }) {
  const map = useMap();
  const layerRefs = useRef({});

  useEffect(() => {
    Object.values(layerRefs.current).forEach((l) => map.removeLayer(l));
    layerRefs.current = {};

    activeTiles.forEach((tid) => {
      const t = TILES[tid];
      if (!t) return;
      const baseLayer = L.tileLayer(t.url, { attribution: t.attr, maxZoom: t.max }).addTo(map);
      layerRefs.current[tid] = baseLayer;
      if (tid === "hybrid" && t.overlayUrl) {
        const overlayLayer = L.tileLayer(t.overlayUrl, { opacity: 0.42 }).addTo(map);
        layerRefs.current["hybridOverlay"] = overlayLayer;
      }
    });

    return () => Object.values(layerRefs.current).forEach((l) => map.removeLayer(l));
  }, [activeTiles, map]);

  return null;
}

// ── Map events
function MapBootstrap({ onMapReady, setCoords, pickMode, onMapClick }) {
  const map = useMap();
  useEffect(() => { if (onMapReady) onMapReady(map); }, [map, onMapReady]);

  useMapEvents({
    mousemove(e) { setCoords(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`); },
    click(e) { if (pickMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng); },
  });

  useEffect(() => { map.getContainer().style.cursor = pickMode ? "crosshair" : ""; }, [map, pickMode]);
  return null;
}

// ── Zoom control
function ZoomReposition() {
  const map = useMap();
  useEffect(() => { map.zoomControl?.remove(); L.control.zoom({ position: "bottomright" }).addTo(map); }, [map]);
  return null;
}

// ── TileSelector
function TileSelector({ activeTiles, setActiveTiles }) {
  const [expanded, setExpanded] = useState(false);
  const toggleTile = (id) => setActiveTiles((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", gap: 4, background: "rgba(7,20,7,0.88)", borderRadius: 8, padding: 6 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer", fontWeight: 700, fontSize: 12, color: "#8fdc00", background: "transparent", border: "1px solid rgba(74,173,74,0.3)", borderRadius: 6, padding: "4px 6px" }}>
        🌐 Maps {expanded ? "▲" : "▼"}
      </button>
      {expanded && Object.values(TILES).map((t) => (
        <button key={t.id} onClick={() => toggleTile(t.id)} style={{ cursor: "pointer", fontSize: 11, textAlign: "left", padding: "4px 6px", borderRadius: 6, background: activeTiles.includes(t.id) ? "#4aad4a" : "transparent", color: activeTiles.includes(t.id) ? "#011001" : "#7ab87a", border: "none" }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ── GeoServer Connection Component
function GeoServerLayers({ geoserverUrl, workspace }) {
  const [connectionActive, setConnectionActive] = useState(false);
  const [url, setUrl] = useState('http://localhost:8080/geoserver/wastewater/wms');
  const [ws, setWs] = useState(workspace || 'wastewater');

  useEffect(() => {
    if (geoserverUrl) {
      let baseUrl = geoserverUrl;
      if (!baseUrl.includes('/wastewater/wms')) {
        baseUrl = baseUrl.replace(/\/wms$/, '/wastewater/wms');
        if (!baseUrl.includes('/wastewater/wms')) {
          baseUrl = `${baseUrl}/wastewater/wms`;
        }
      }
      setUrl(baseUrl);
      setConnectionActive(true);
      return;
    }
    
    const fetchActiveConnection = async () => {
      try {
        const res = await api.get('/connections/active');
        if (res.data && res.data.geoserver_url) {
          let baseUrl = res.data.geoserver_url;
          if (!baseUrl.includes('/wastewater/wms')) {
            baseUrl = baseUrl.replace(/\/wms$/, '/wastewater/wms');
            if (!baseUrl.includes('/wastewater/wms')) {
              baseUrl = `${baseUrl}/wastewater/wms`;
            }
          }
          setUrl(baseUrl);
          setWs(res.data.workspace || 'wastewater');
          setConnectionActive(true);
        }
      } catch (err) {
        console.warn('No active GeoServer connection, using default', err);
        setConnectionActive(true);
      }
    };
    
    fetchActiveConnection();
  }, [geoserverUrl, workspace]);

  if (!connectionActive) return null;

  return (
    <LayersControl position="topright">
      <LayersControl.Overlay name="🗺️ Manholes (GeoServer)">
        <WMSTileLayer
          url={url}
          layers={`${ws}:waste_water_manhole`}
          format="image/png"
          transparent={true}
          opacity={0.7}
          version="1.1.0"
          srs="EPSG:4326"
        />
      </LayersControl.Overlay>
      <LayersControl.Overlay name="📏 Pipelines (GeoServer)">
        <WMSTileLayer
          url={url}
          layers={`${ws}:waste_water_pipeline`}
          format="image/png"
          transparent={true}
          opacity={0.7}
          version="1.1.0"
          srs="EPSG:4326"
        />
      </LayersControl.Overlay>
      <LayersControl.Overlay name="🏘️ Suburbs (GeoServer)">
        <WMSTileLayer
          url={url}
          layers={`${ws}:suburbs`}
          format="image/png"
          transparent={true}
          opacity={0.5}
          version="1.1.0"
          srs="EPSG:4326"
        />
      </LayersControl.Overlay>
    </LayersControl>
  );
}

// ── MapView
export default function MapView({ 
  manholes = [], 
  pipes = [], 
  role, 
  userId, 
  onFeatureClick, 
  onMapReady, 
  navPickMode = false, 
  onNavMapClick,
  geoserverUrl: propGeoserverUrl,
  workspace: propWorkspace
}) {
  const [coords, setCoords] = useState("");
  const [activeTiles, setActiveTiles] = useState(["osm"]);
  const [showLegend, setShowLegend] = useState(true);

  const glass = { background: "rgba(7,20,7,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(45,138,45,0.25)", borderRadius: 10, color: "#e8f5e8", fontFamily: "'Barlow',sans-serif" };

  const buildTable = (rows) => (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <tbody>
        {rows.filter(Boolean).map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: "3px 8px 3px 0", color: "#555", fontWeight: 600 }}>{k}</td>
            <td style={{ padding: "3px 0", color: "#111" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const editBtn = (feature) => onFeatureClick ? (
    <button onClick={() => onFeatureClick(feature)} style={{ marginTop: 10, width: "100%", background: "#1a4d1a", color: "white", border: "1px solid #2d8a2d", borderRadius: 6, padding: "7px 0", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>
      ✏️ Edit Record
    </button>
  ) : null;

  const popupHeader = (dot, label) => (<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>{dot}<span style={{ fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{label}</span></div>);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer center={[-18.97, 32.67]} zoom={13} style={{ width: "100%", height: "100%" }} zoomControl={false} scrollWheelZoom>
        <ZoomReposition />
        <MapBootstrap onMapReady={onMapReady} setCoords={setCoords} pickMode={navPickMode} onMapClick={onNavMapClick} />
        <TileManager activeTiles={activeTiles} />
        
        {/* GeoServer WMS Layers */}
        <GeoServerLayers geoserverUrl={propGeoserverUrl} workspace={propWorkspace} />

        {/* Existing Manhole Markers */}
        {manholes.map((m) => {
          const pt = parsePoint(m.geom);
          if (!pt) return null;
          const color = manholeColor(m.bloc_stat);
          return (
            <Marker key={m.gid} position={[pt.lat, pt.lng]} icon={manholeIcon(color, 20)}>
              <Popup maxWidth={280}>
                <div>
                  {popupHeader(<div style={{ width: 14, height: 14, borderRadius: "50%", background: color }} />, m.manhole_id || `MH-${m.gid}`)}
                  {buildTable([["Pipe ID", m.pipe_id || "—"], ["Depth", m.mh_depth ? `${m.mh_depth} m` : "—"], ["Status", m.bloc_stat || "Normal"]])}
                  {editBtn({ ...m, type: "manhole" })}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Existing Pipeline Polylines */}
        {pipes.map((p) => {
          const positions = parseLine(p.geom);
          if (!positions || positions.length < 2) return null;
          const color = pipeColor(p.block_stat);
          return (
            <Polyline key={p.gid} positions={positions} pathOptions={{ color, weight: 5, opacity: 1 }}>
              <Popup maxWidth={280}>
                <div>
                  {popupHeader(<div style={{ width: 22, height: 4, background: color }} />, p.pipe_id || `PL-${p.gid}`)}
                  {buildTable([["Start MH", p.start_mh || "—"], ["End MH", p.end_mh || "—"], ["Material", p.pipe_mat || "—"], ["Size", p.pipe_size || "—"], ["Status", p.block_stat || "Normal"]])}
                  {editBtn({ ...p, type: "pipeline" })}
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>

      <TileSelector activeTiles={activeTiles} setActiveTiles={setActiveTiles} />

      {showLegend && (
        <div style={{ ...glass, position: "absolute", bottom: 36, left: 12, padding: 10, minWidth: 210, zIndex: 900 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 11, color: "#8fdc00" }}>Legend</span>
            <button onClick={() => setShowLegend(false)} style={{ background: "none", border: "none", color: "#3d6e3d", cursor: "pointer" }}>×</button>
          </div>
          {[{ color: "#2b7bff", type: "line", label: "Pipeline — Normal" },
            { color: "#dc3545", type: "line", label: "Pipeline — Blocked" },
            { color: "#28a745", type: "manhole", label: "Manhole — Normal" },
            { color: "#ffc107", type: "manhole", label: "Manhole — Maintenance" },
            { color: "#dc3545", type: "manhole", label: "Manhole — Blocked" }].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ width: item.type === "line" ? 22 : 16, height: item.type === "line" ? 4 : 16, borderRadius: item.type === "line" ? 2 : "50%", background: item.color }} />
              <span style={{ fontSize: 11, color: "#b8dcb8" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {coords && <div style={{ ...glass, position: "absolute", bottom: 8, right: 90, padding: "4px 12px", fontSize: 11, color: "#7ab87a" }}>📍 {coords}</div>}
    </div>
  );
}
