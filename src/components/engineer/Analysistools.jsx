// src/components/engineer/AnalysisTools.jsx
import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function AnalysisTools({ onClose }) {
  const map = useMap();
  const [tool, setTool] = useState('buffer');
  const [radius, setRadius] = useState(100);
  const [unit, setUnit] = useState('meters');
  const [result, setResult] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Helper to get click coordinates
  const startPointPicker = () => {
    map.getContainer().style.cursor = 'crosshair';
    map.once('click', (e) => {
      map.getContainer().style.cursor = '';
      setSelectedPoint([e.latlng.lng, e.latlng.lat]);
    });
  };

  const runBuffer = () => {
    if (!selectedPoint) return;
    const point = turf.point(selectedPoint);
    const buffered = turf.buffer(point, radius, { units: unit });
    // Add to map
    if (map) {
      const layer = L.geoJSON(buffered, { color: '#ff7800', weight: 2 }).addTo(map);
      // Optionally store layer for removal later
      setResult({ type: 'buffer', layer });
    }
  };

  const runDistance = () => {
    // Simple distance between two picked points
    alert('Pick first point');
    map.getContainer().style.cursor = 'crosshair';
    let points = [];
    map.once('click', (e1) => {
      points.push([e1.latlng.lng, e1.latlng.lat]);
      alert('Pick second point');
      map.once('click', (e2) => {
        points.push([e2.latlng.lng, e2.latlng.lat]);
        const from = turf.point(points[0]);
        const to = turf.point(points[1]);
        const distance = turf.distance(from, to, { units: 'kilometers' });
        alert(`Distance: ${distance.toFixed(2)} km`);
        map.getContainer().style.cursor = '';
      });
    });
  };

  const runPointInPolygon = () => {
    // For simplicity, assume there's a drawn polygon or existing layer
    alert('Select a polygon on the map (draw tool not implemented)');
  };

  return (
    <div className="wd-panel" style={{ width: 350 }}>
      <div className="wd-panel-header">
        <span>🧠 Spatial Analysis</span>
        <button className="wd-panel-close" onClick={onClose}>×</button>
      </div>
      <div className="wd-panel-body">
        <div className="wd-form-group">
          <label>Tool</label>
          <select value={tool} onChange={e => setTool(e.target.value)}>
            <option value="buffer">Buffer</option>
            <option value="distance">Distance</option>
            <option value="pointInPolygon">Point in Polygon</option>
          </select>
        </div>
        {tool === 'buffer' && (
          <>
            <div className="wd-form-group">
              <label>Radius</label>
              <input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} />
            </div>
            <div className="wd-form-group">
              <label>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="meters">meters</option>
                <option value="kilometers">kilometers</option>
                <option value="miles">miles</option>
              </select>
            </div>
            <button className="wd-btn wd-btn-primary" onClick={startPointPicker}>Pick Point on Map</button>
            {selectedPoint && <div>Point: {selectedPoint[0].toFixed(4)}, {selectedPoint[1].toFixed(4)}</div>}
            <button className="wd-btn wd-btn-secondary" onClick={runBuffer} disabled={!selectedPoint}>Run Buffer</button>
          </>
        )}
        {tool === 'distance' && (
          <button className="wd-btn wd-btn-primary" onClick={runDistance}>Pick Two Points</button>
        )}
        {tool === 'pointInPolygon' && (
          <button className="wd-btn wd-btn-primary" onClick={runPointInPolygon}>Check Point in Polygon</button>
        )}
        {result && <div className="wd-status ok">Result added to map</div>}
      </div>
    </div>
  );
}
