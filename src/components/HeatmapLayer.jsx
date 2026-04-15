// src/components/HeatmapLayer.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ points, radius = 25, blur = 15, maxZoom = 17, minOpacity = 0.5 }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heat = L.heatLayer(points, { radius, blur, maxZoom, minOpacity });
    heat.addTo(map);
    return () => map.removeLayer(heat);
  }, [map, points, radius, blur, maxZoom, minOpacity]);
  return null;
};

export default HeatmapLayer;
