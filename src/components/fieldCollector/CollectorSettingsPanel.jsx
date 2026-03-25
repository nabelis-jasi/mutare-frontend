import React, { useState } from 'react';

export default function CollectorSettingsPanel({ onClose }) {
  const [gpsAccuracy, setGpsAccuracy] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  return (
    <div className="wd-panel">

      {/* HEADER */}
      <div className="wd-panel-header">
        <h3>Settings</h3>
        <button onClick={onClose}>✖</button>
      </div>

      {/* CONTENT */}
      <div className="wd-panel-body">

        <div className="wd-section">
          <label>
            <input
              type="checkbox"
              checked={gpsAccuracy}
              onChange={() => setGpsAccuracy(!gpsAccuracy)}
            />
            High GPS Accuracy
          </label>
        </div>

        <div className="wd-section">
          <label>
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={() => setOfflineMode(!offlineMode)}
            />
            Offline Mode
          </label>
        </div>

        <div className="wd-section">
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            Offline mode stores collected data locally until synced.
          </p>
        </div>

      </div>

    </div>
  );
}
