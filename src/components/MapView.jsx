import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// This import is enough; do not define HeatmapLayer again below!
import HeatmapLayer from "./HeatmapLayer"; 

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Tile definitions
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
