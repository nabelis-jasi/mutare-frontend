import React, { useState } from 'react';
import MapView from '../MapView';
import StatusUpdater from './StatusUpdater';
import MaintenanceRecords from './MaintenanceRecords';
import './Dashboard.css';  // Import the CSS file

export default function OperatorDashboard({ manholes, pipes, userId, role, onDataRefresh }) {
  const [showStatusUpdater, setShowStatusUpdater] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);

  const openStatusUpdater = () => {
    setShowStatusUpdater(true);
    setShowMaintenance(false);
  };

  const openMaintenance = () => {
    setShowMaintenance(true);
    setShowStatusUpdater(false);
  };

  const closeAllPanels = () => {
    setShowStatusUpdater(false);
    setShowMaintenance(false);
  };

  const handleStatusUpdateComplete = () => {
    if (onDataRefresh) onDataRefresh();
    closeAllPanels();
  };

  return (
    <div className="wd-root">
      <div className="wd-map-wrap">
        <MapView
          manholes={manholes}
          pipes={pipes}
          role={role}
          userId={userId}
        />
      </div>

      <div className="wd-float-actions">
        <button
          className={`wd-btn wd-btn-primary ${showStatusUpdater ? 'active' : ''}`}
          onClick={openStatusUpdater}
          data-tip="Update status"
        >
          📝 Update Status
        </button>
        <button
          className={`wd-btn wd-btn-amber ${showMaintenance ? 'active' : ''}`}
          onClick={openMaintenance}
          data-tip="Maintenance records"
        >
          🔧 Maintenance Records
        </button>
      </div>

      {showStatusUpdater && (
        <div className="wd-panel">
          <div className="wd-panel-header">
            <div
              className="wd-panel-icon"
              style={{ '--panel-icon-bg': 'var(--glow-green)', '--panel-icon-border': 'var(--accent-primary)' }}
            >
              📝
            </div>
            <div>
              <div className="wd-panel-title">Update Status</div>
              <div className="wd-panel-sub">Report current condition</div>
            </div>
            <button className="wd-panel-close" onClick={closeAllPanels}>✕</button>
          </div>
          <div className="wd-panel-body">
            <StatusUpdater onUpdateComplete={handleStatusUpdateComplete} />
          </div>
        </div>
      )}

      {showMaintenance && (
        <div className="wd-panel">
          <div className="wd-panel-header">
            <div
              className="wd-panel-icon"
              style={{ '--panel-icon-bg': 'var(--glow-amber)', '--panel-icon-border': 'var(--accent-amber)' }}
            >
              🔧
            </div>
            <div>
              <div className="wd-panel-title">Maintenance Records</div>
              <div className="wd-panel-sub">History & scheduled work</div>
            </div>
            <button className="wd-panel-close" onClick={closeAllPanels}>✕</button>
          </div>
          <div className="wd-panel-body">
            <MaintenanceRecords userId={userId} />
          </div>
        </div>
      )}
    </div>
  );
}
