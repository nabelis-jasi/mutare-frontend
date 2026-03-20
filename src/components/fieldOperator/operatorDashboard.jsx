import React, { useState } from 'react';
import MapView from '../MapView';
import StatusUpdater from './StatusUpdater';
import MaintenanceRecords from './MaintenanceRecords';

export default function OperatorDashboard({ manholes, pipes, userId, role, onDataRefresh }) {
  const [showStatusUpdater, setShowStatusUpdater] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapView 
        manholes={manholes} 
        pipes={pipes} 
        role={role} 
        userId={userId}
      />
      
      <div style={{
        position: "absolute",
        top: "80px",
        right: "20px",
        display: "flex",
        gap: "10px",
        zIndex: 1000,
      }}>
        <button
          onClick={() => {
            setShowStatusUpdater(!showStatusUpdater);
            setShowMaintenance(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#9c27b0",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📝 Update Status
        </button>
        <button
          onClick={() => {
            setShowMaintenance(!showMaintenance);
            setShowStatusUpdater(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ff5722",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🔧 Maintenance Records
        </button>
      </div>

      {showStatusUpdater && <StatusUpdater onUpdateComplete={onDataRefresh} />}
      {showMaintenance && <MaintenanceRecords userId={userId} />}
    </div>
  );
}