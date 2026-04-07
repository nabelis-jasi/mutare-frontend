// src/components/fieldCollector/FlagFeature.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from "../../api/api";
import L from 'leaflet';

// Helper to show temporary marker on map pick
const tempMarkerIcon = (color, label) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:22px;height:22px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:800;">${label}</div>
    <div style="width:2px;height:8px;background:${color};opacity:0.7"></div>
  </div>`,
  iconSize: [22, 32],
  iconAnchor: [11, 30],
  popupAnchor: [0, -32],
});

export default function FlagFeature({
  userId,
  manholes,
  pipes,
  map,
  onFeatureFlagged,
  onClose,
  onStartMapPick,
  onCancelMapPick,
}) {
  const [mode, setMode] = useState(null); // 'pick' or 'select'
  const [featureType, setFeatureType] = useState('manhole');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    severity: 'medium',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [msgCls, setMsgCls] = useState('info');
  const markerRef = useRef(null);

  // List of available features for dropdown selection
  const featuresList = featureType === 'manhole' ? manholes : pipes;
  const getFeatureLabel = (f) => featureType === 'manhole'
    ? `🕳️ ${f.manhole_id || f.gid}`
    : `📏 ${f.pipe_id || f.gid}`;

  // Map pick mode
  const startMapPick = () => {
    onStartMapPick(async (lat, lng) => {
      // Find nearest feature (simplified – in real app you'd query backend)
      let nearest = null;
      let minDist = Infinity;
      const features = featureType === 'manhole' ? manholes : pipes;
      features.forEach(f => {
        if (f.geom?.coordinates) {
          const [flng, flat] = f.geom.coordinates;
          const d = Math.hypot(flat - lat, flng - lng);
          if (d < minDist) {
            minDist = d;
            nearest = f;
          }
        }
      });
      if (nearest && minDist < 0.0005) { // ~50 meters
        setSelectedFeature(nearest);
        // Show temporary marker
        if (markerRef.current) map.removeLayer(markerRef.current);
        markerRef.current = L.marker([lat, lng], { icon: tempMarkerIcon('#f59e0b', '🚩') }).addTo(map);
        setTimeout(() => {
          if (markerRef.current) map.removeLayer(markerRef.current);
        }, 3000);
        setMessage(`Selected ${featureType}: ${getFeatureLabel(nearest)}`);
        setMsgCls('ok');
      } else {
        setMessage('No feature found near that location. Please try again or use the dropdown.');
        setMsgCls('err');
      }
      onCancelMapPick();
    });
    setMode('pick');
  };

  const handleSelectChange = (e) => {
    const id = e.target.value;
    const feat = featuresList.find(f => (f.gid?.toString() === id) || (f.manhole_id === id) || (f.pipe_id === id));
    setSelectedFeature(feat);
    if (feat) setMessage(`Selected ${featureType}: ${getFeatureLabel(feat)}`);
    else setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeature) {
      setMessage('Please select a feature to flag.');
      setMsgCls('err');
      return;
    }
    setSubmitting(true);
    const payload = {
      feature_type: featureType,
      feature_id: selectedFeature.gid || selectedFeature.manhole_id || selectedFeature.pipe_id,
      reason: formData.reason,
      severity: formData.severity,
      notes: formData.notes,
      reported_by: userId,
      created_at: new Date().toISOString(),
    };

    if (navigator.onLine) {
      try {
        await api.post('/flags', payload);
        setMessage('Flag submitted successfully.');
        setMsgCls('ok');
        setTimeout(() => {
          if (onFeatureFlagged) onFeatureFlagged();
          onClose();
        }, 1500);
      } catch (err) {
        setMessage(`Error: ${err.response?.data?.error || err.message}`);
        setMsgCls('err');
      }
    } else {
      // Offline: store in localStorage
      const pendingFlags = JSON.parse(localStorage.getItem('pending_flags') || '[]');
      pendingFlags.push({
        ...payload,
        queuedAt: new Date().toISOString(),
      });
      localStorage.setItem('pending_flags', JSON.stringify(pendingFlags));
      setMessage('Flag saved offline. It will sync when online.');
      setMsgCls('ok');
      setTimeout(() => {
        if (onFeatureFlagged) onFeatureFlagged();
        onClose();
      }, 1500);
    }
    setSubmitting(false);
  };

  // Cleanup temporary marker on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current && map) map.removeLayer(markerRef.current);
    };
  }, [map]);

  return (
    <div className="fc-panel" style={{ width: 380 }}>
      <div className="fc-panel-header" style={{ '--panel-icon-bg': 'rgba(245,158,11,0.08)', '--panel-icon-border': 'rgba(245,158,11,0.25)' }}>
        <div className="fc-panel-icon">🚩</div>
        <div>
          <div className="fc-panel-title">Flag Issue</div>
          <div className="fc-panel-sub">Report a problem on the network</div>
        </div>
        <button className="fc-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="fc-panel-body">
        {/* Feature type toggle */}
        <div className="fc-section">Feature Type</div>
        <div className="fc-type-toggle">
          <button
            className={`fc-type-btn ${featureType === 'manhole' ? 'active' : ''}`}
            onClick={() => { setFeatureType('manhole'); setSelectedFeature(null); }}
          >
            🕳️ Manhole
          </button>
          <button
            className={`fc-type-btn ${featureType === 'pipeline' ? 'active' : ''}`}
            onClick={() => { setFeatureType('pipeline'); setSelectedFeature(null); }}
          >
            📏 Pipeline
          </button>
        </div>

        {/* Selection method */}
        <div className="fc-section">Select Feature</div>
        <div className="fc-btn-row" style={{ marginBottom: 12 }}>
          <button className="fc-btn fc-btn-ghost" onClick={startMapPick}>
            🗺️ Pick from map
          </button>
          <span style={{ padding: '0 8px', color: 'var(--text-dim)' }}>or</span>
          <select className="fc-select" onChange={handleSelectChange} value={selectedFeature?.gid || ''}>
            <option value="">Choose from list</option>
            {featuresList.map(f => (
              <option key={f.gid} value={f.gid}>
                {getFeatureLabel(f)}
              </option>
            ))}
          </select>
        </div>

        {/* Selected feature display */}
        {selectedFeature && (
          <div className="fc-queue-card" style={{ marginBottom: 16, background: 'var(--bg-raised)' }}>
            <div className="qc-icon">{featureType === 'manhole' ? '🕳️' : '📏'}</div>
            <div className="qc-info">
              <div className="qc-title">{getFeatureLabel(selectedFeature)}</div>
              <div className="qc-meta">
                {selectedFeature.location && `📍 ${selectedFeature.location.lat?.toFixed(4)}, ${selectedFeature.location.lng?.toFixed(4)}`}
              </div>
            </div>
          </div>
        )}

        {/* Flag details form */}
        <div className="fc-section">Issue Details</div>
        <form onSubmit={handleSubmit}>
          <div className="fc-field">
            <label className="fc-label">Reason *</label>
            <input
              className="fc-input"
              required
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Blocked, Damaged, Missing cover"
            />
          </div>
          <div className="fc-field">
            <label className="fc-label">Severity</label>
            <select
              className="fc-select"
              value={formData.severity}
              onChange={e => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value="low">Low – cosmetic</option>
              <option value="medium">Medium – needs attention</option>
              <option value="high">High – urgent / hazard</option>
            </select>
          </div>
          <div className="fc-field">
            <label className="fc-label">Additional Notes</label>
            <textarea
              className="fc-textarea"
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any extra information..."
            />
          </div>

          {message && <div className={`fc-status ${msgCls}`}>{message}</div>}

          <div className="fc-btn-row" style={{ marginTop: 16 }}>
            <button type="button" className="fc-btn fc-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="fc-btn fc-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : '🚩 Submit Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
