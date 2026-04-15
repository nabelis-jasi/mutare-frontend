// src/components/MapView.jsx
import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Tile definitions – correct syntax
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

// Custom manhole icon
const manholeIcon = (color, size = 20) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color:${color}; width:${size}px; height:${size}px; border-radius:50%; border:3px solid white; box-shadow:0 4px 8px rgba(0,0,0,0.3); display:flex; justify-content:center; align-items:center; font-size:${size / 2}px;">🕳️</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });

// Style functions
const getPointColor = (props) => "#28a745";

const pointToLayer = (feature, latlng, type) => {
  if (type === "manhole") return L.marker(latlng, { icon: manholeIcon(getPointColor(feature.properties), 20) });
  return L.marker(latlng);
};

const styleForFeature = (feature, type) => {
  if (type === "pipeline") return { color: "#2b7bff", weight: 4, opacity: 0.8 };
  if (type === "suburb") return { color: "#f4a261", weight: 2, fillColor: "#f4a261", fillOpacity: 0.3 };
  return {};
};

const onEachFeature = (feature, layer, type, onFeatureClick) => {
  if (feature.properties) {
    let popupContent = `<b>${type}</b><br/>`;
    for (const [k, v] of Object.entries(feature.properties)) popupContent += `${k}: ${v}<br/>`;
    layer.bindPopup(popupContent);
  }
  if (onFeatureClick) layer.on("click", () => onFeatureClick(feature.properties));
};

// Tile Manager component
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

// Map events
function MapBootstrap({ onMapReady, setCoords, pickMode, onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  useMapEvents({
    mousemove(e) {
      setCoords(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
    },
    click(e) {
      if (pickMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = pickMode ? "crosshair" : "";
  }, [map, pickMode]);

  return null;
}

// Zoom control
function ZoomReposition() {
  const map = useMap();
  useEffect(() => {
    map.zoomControl?.remove();
    L.control.zoom({ position: "bottomright" }).addTo(map);
  }, [map]);
  return null;
}

// Tile selector (unchanged)
function TileSelector({ activeTiles, setActiveTiles }) {
  const [expanded, setExpanded] = useState(false);
  const toggleTile = (id) =>
    setActiveTiles((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1000,
        background: "rgba(7,20,7,0.88)",
        borderRadius: 8,
        padding: 6,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 12,
          color: "#8fdc00",
          background: "transparent",
          border: "1px solid rgba(74,173,74,0.3)",
          borderRadius: 6,
          padding: "4px 6px",
        }}
      >
        🌐 Maps {expanded ? "▲" : "▼"}
      </button>
      {expanded &&
        Object.values(TILES).map((t) => (
          <button
            key={t.id}
            onClick={() => toggleTile(t.id)}
            style={{
              cursor: "pointer",
              fontSize: 11,
              textAlign: "left",
              padding: "4px 6px",
              borderRadius: 6,
              background: activeTiles.includes(t.id) ? "#4aad4a" : "transparent",
              color: activeTiles.includes(t.id) ? "#011001" : "#7ab87a",
              border: "none",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
    </div>
  );
}

// Main MapView component
export default function MapView({ uploadedLayers = [], onFeatureClick }) {
  const [coords, setCoords] = useState("");
  const [activeTiles, setActiveTiles] = useState(["osm"]);
  const [showLegend, setShowLegend] = useState(true);

  const glass = {
    background: "rgba(7,20,7,0.88)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(45,138,45,0.25)",
    borderRadius: 10,
    color: "#e8f5e8",
    fontFamily: "'Barlow',sans-serif",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={[-18.97, 32.67]}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        scrollWheelZoom
      >
        <ZoomReposition />
        <MapBootstrap onMapReady={() => {}} setCoords={setCoords} pickMode={false} onMapClick={() => {}} />
        <TileManager activeTiles={activeTiles} />

        {uploadedLayers.map((layer) => (
          <GeoJSON
            key={layer.id}
            data={layer.geojson}
            pointToLayer={(feature, latlng) => pointToLayer(feature, latlng, layer.type)}
            style={(feature) => styleForFeature(feature, layer.type)}
            onEachFeature={(feature, layerObj) => onEachFeature(feature, layerObj, layer.type, onFeatureClick)}
          />
        ))}
      </MapContainer>

      <TileSelector activeTiles={activeTiles} setActiveTiles={setActiveTiles} />

      {showLegend && (
        <div
          style={{
            ...glass,
            position: "absolute",
            bottom: 36,
            left: 12,
            padding: 10,
            minWidth: 210,
            zIndex: 900,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 11, color: "#8fdc00" }}>Legend</span>
            <button
              onClick={() => setShowLegend(false)}
              style={{ background: "none", border: "none", color: "#3d6e3d", cursor: "pointer" }}
            >
              ×
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#28a745" }} />
            <span style={{ fontSize: 11, color: "#b8dcb8" }}>Manhole — Normal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 22, height: 4, background: "#2b7bff" }} />
            <span style={{ fontSize: 11, color: "#b8dcb8" }}>Pipeline — Normal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 22, height: 4, background: "#dc3545" }} />
            <span style={{ fontSize: 11, color: "#b8dcb8" }}>Pipeline — Blocked</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 16, height: 16, background: "#f4a261" }} />
            <span style={{ fontSize: 11, color: "#b8dcb8" }}>Suburb</span>
          </div>
        </div>
      )}

      {coords && (
        <div
          style={{
            ...glass,
            position: "absolute",
            bottom: 8,
            right: 90,
            padding: "4px 12px",
            fontSize: 11,
            color: "#7ab87a",
          }}
        >
          📍 {coords}
        </div>
      )}
    </div>
  );
}
