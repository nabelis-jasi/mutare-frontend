import React from 'react';

export default function CollectorSettingsPanel({ onClose }) {
  return (
    <div
      className="wd-panel"
      style={{
        '--panel-icon-bg': 'rgba(74,173,74,0.08)',
        '--panel-icon-border': 'rgba(74,173,74,0.25)',
      }}
    >
      {/* HEADER */}
      <div className="wd-panel-header">
        <div className="wd-panel-icon">⚙️</div>
        <div>
          <div className="wd-panel-title">Settings</div>
          <div className="wd-panel-sub">App configuration · Display · GPS</div>
        </div>
        <button className="wd-panel-close" onClick={onClose}>
          ×
        </button>
      </div>

      {/* BODY */}
      <div className="wd-panel-body">
        {/* Optional saved message */}
        <div className="wd-status ok" style={{ marginBottom: 12, visibility: 'hidden' }}>
          ✓ Settings saved
        </div>

        {/* App info */}
        <div className="wd-section" style={{ marginTop: 0 }}>
          About
        </div>
        <div className="wd-info-row">
          <span className="ir-k">Version</span>
          <span className="ir-v">2.1.0</span>
        </div>
        <div className="wd-info-row">
          <span className="ir-k">Build</span>
          <span className="ir-v" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            WasteGIS-2025-prod
          </span>
        </div>
        <div className="wd-info-row">
          <span className="ir-k">Basemap</span>
          <span className="ir-v">OpenStreetMap + Esri</span>
        </div>
        <div className="wd-info-row">
          <span className="ir-k">Routing</span>
          <span className="ir-v">OSRM Public API</span>
        </div>

        {/* Footer buttons */}
        <div className="wd-btn-row" style={{ marginTop: 20 }}>
          <button className="wd-btn wd-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
