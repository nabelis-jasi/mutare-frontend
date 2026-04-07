// src/components/fieldCollector/DataCollection.jsx
import React, { useState, useRef, useEffect } from 'react';
import api from "../../api/api";
import L from 'leaflet';

// ── Haversine distance ─────────────────────────────────────────────────────
const haversine = (a, b) => {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
};

const m2h = (m) => m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`;

// ── Temp marker icon ───────────────────────────────────────────────────────
const tempIcon = (color, label) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:22px;height:22px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:800;font-family:'JetBrains Mono',monospace">${label}</div>
    <div style="width:2px;height:8px;background:${color};opacity:0.7"></div>
  </div>`,
  iconSize: [22, 32], iconAnchor: [11, 30], popupAnchor: [0, -32],
});

const previewLineLayer = (map, pts, color = '#8fdc00') => {
  if (pts.length < 2) return null;
  return L.polyline(pts.map(p => [p.lat, p.lng]), {
    color, weight: 4, opacity: 0.8, dashArray: '8 6', lineJoin: 'round',
  }).addTo(map);
};

export default function DataCollection({ userId, map, onDataCollected, onClose, onStartMapPick, onCancelMapPick }) {
  const [mode, setMode] = useState(null); // 'manhole' | 'pipeline' | null
  const [step, setStep] = useState(1);
  const [points, setPoints] = useState([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('');
  const [stCls, setStCls] = useState('info');

  // ── Dynamic form from backend
  const [dynamicForm, setDynamicForm] = useState([]);
  const [answers, setAnswers] = useState({});

  const markerRefs = useRef([]);
  const lineRef = useRef(null);

  // ── Fetch engineer-defined questions
  useEffect(() => {
    const fetchSchema = async () => {
      if (!mode) return;
      try {
        const res = await api.get('/collector-schema', { params: { mode } });
        const data = res.data;
        if (data && data.length) {
          setDynamicForm(data);
          const initialAnswers = {};
          data.forEach(q => { initialAnswers[q.id] = ''; });
          setAnswers(initialAnswers);
        }
      } catch (err) {
        console.error('Error fetching schema:', err);
      }
    };
    fetchSchema();
  }, [mode]);

  const clearMapLayers = () => {
    if (!map) return;
    markerRefs.current.forEach(m => map.removeLayer(m));
    markerRefs.current = [];
    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }
  };

  const reset = () => {
    clearMapLayers();
    setMode(null); setStep(1); setPoints([]);
    setSaved(false); setStatus(''); setStCls('info');
    setDynamicForm([]);
    setAnswers({});
  };

  const handleClose = () => { clearMapLayers(); onCancelMapPick?.(); onClose(); };

  // ── GPS
  const getGPS = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
        addPoint(lat, lng);
        setLocating(false);
        setStatus(`📍 GPS acquired — accuracy ±${Math.round(accuracy)}m`);
        setStCls('ok');
      },
      () => { setStatus('GPS denied. Use map click instead.'); setStCls('warn'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const addPoint = (lat, lng) => {
    const newPt = { lat, lng };
    setPoints(prev => {
      const updated = [...prev, newPt];

      // Draw marker on map
      if (map) {
        const colors  = ['#4aad4a', '#3b82f6', '#f59e0b', '#ef4444'];
        const color   = colors[prev.length % colors.length];
        const label   = mode === 'manhole' ? '🕳' : String(prev.length + 1);
        const mk = L.marker([lat, lng], { icon: tempIcon(color, label) }).addTo(map);
        markerRefs.current.push(mk);
        map.panTo([lat, lng]);

        // pipeline line
        if (mode === 'pipeline' && updated.length >= 2) {
          if (lineRef.current) map.removeLayer(lineRef.current);
          lineRef.current = previewLineLayer(map, updated);
        }
      }

      return updated;
    });
  };

  const requestMapPick = () => {
    onStartMapPick((lat, lng) => {
      addPoint(lat, lng);
      if (mode === 'manhole') setStep(2);
      if (mode === 'pipeline' && points.length + 1 >= 2) setStep(2);
    });
  };

  const pipelineDistance = points.length >= 2
    ? points.reduce((acc, pt, i) => i === 0 ? 0 : acc + haversine(points[i-1], pt), 0)
    : 0;

  // ── Save dynamic answers + GPS
  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      if ((mode === 'manhole' && points.length < 1) || (mode === 'pipeline' && points.length < 2)) {
        throw new Error('Not enough points set on map.');
      }

      const payload = {
        user_id: userId,
        mode,
        geom: mode === 'manhole'
          ? { type: 'Point', coordinates: [points[0].lng, points[0].lat] }
          : { type: 'LineString', coordinates: points.map(p => [p.lng, p.lat]) },
        answers,
        created_at: new Date().toISOString(),
      };

      await api.post('/collector-submissions', payload);

      setSaved(true);
      setStatus('✓ Saved successfully!');
      setStCls('ok');
      clearMapLayers();
      setTimeout(() => { onDataCollected(); reset(); }, 1500);

    } catch (err) {
      setStatus(err.response?.data?.error || err.message);
      setStCls('err');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────
  return (
    <div className="fc-panel" style={{ width: 420 }}>
      <div className="fc-panel-header">
        <div className="fc-panel-icon">📍</div>
        <div>
          <div className="fc-panel-title">Data Collection</div>
          <div className="fc-panel-sub">
            {!mode ? 'Select feature type' : mode === 'manhole' ? `Manhole — Step ${step}/2` : `Pipeline — Step ${step}/2`}
          </div>
        </div>
        <button className="fc-panel-close" onClick={handleClose}>×</button>
      </div>

      <div className="fc-panel-body">
        {!mode && (
          <div className="fc-type-grid">
            <div className="fc-type-card" onClick={() => { setMode('manhole'); setStep(1); }}>Manhole</div>
            <div className="fc-type-card" onClick={() => { setMode('pipeline'); setStep(1); }}>Pipeline</div>
          </div>
        )}

        {/* ── STEP 1: Map Points */}
        {step === 1 && mode && (
          <>
            <div style={{ marginBottom: 12 }}>
              {mode === 'manhole' ? 'Set Manhole location' : 'Mark pipeline points'}
            </div>

            {points.map((pt,i) => (
              <div key={i}>{pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}</div>
            ))}

            <button onClick={getGPS}>📍 GPS</button>
            <button onClick={requestMapPick}>🗺️ Click Map</button>

            <div style={{ marginTop: 12 }}>
              <button onClick={reset}>← Back</button>
              <button onClick={() => setStep(2)} disabled={mode==='manhole' ? points.length<1 : points.length<2}>Next →</button>
            </div>
          </>
        )}

        {/* ── STEP 2: Dynamic Form */}
        {step === 2 && (
          <>
            <div className="fc-section">{mode === 'manhole' ? 'Manhole Details' : 'Pipeline Details'}</div>
            {dynamicForm.map(q => (
              <div className="fc-field" key={q.id}>
                <label className="fc-label">{q.label}</label>
                {q.type === 'text' && (
                  <input className="fc-input"
                    value={answers[q.id] || ''}
                    placeholder={q.placeholder || ''}
                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />
                )}
                {q.type === 'select' && (
                  <select className="fc-select"
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})}>
                    <option value="">-- Select --</option>
                    {q.options.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <button onClick={() => setStep(1)}>← Back</button>
              <button onClick={save} disabled={saving || saved}>
                {saving ? '⏳ Saving…' : saved ? '✓ Saved!' : '💾 Save'}
              </button>
            </div>

            {status && <div className={`fc-status ${stCls}`}>{status}</div>}
          </>
        )}
      </div>
    </div>
  );
}
