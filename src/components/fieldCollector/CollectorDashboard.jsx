import React, { useState } from 'react';
import MapView from '../MapView';
import DataCollection from './DataCollection';
import SyncData from './SyncData';
import FlagFeature from './FlagFeature';

export default function CollectorDashboard({ manholes, pipes, userId, role, onDataRefresh }) {
  const [showDataCollection, setShowDataCollection] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showFlag, setShowFlag] = useState(false);

  const handleDataCollected = () => {
    setShowDataCollection(false);
    onDataRefresh();
  };

  const handleFlagged = () => {
    setShowFlag(false);
    onDataRefresh();
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapView 
        manholes={manholes} 
        pipes={pipes} 
        role={role} 
        userId={userId}
        showDataCollection={showDataCollection}
        onAddPoint={() => {}}
      />
      
      {/* Toolbar for Field Collector */}
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
            setShowDataCollection(!showDataCollection);
            setShowSync(false);
            setShowFlag(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          📍 Collect Data
        </button>
        <button
          onClick={() => {
            setShowSync(!showSync);
            setShowDataCollection(false);
            setShowFlag(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🔄 Sync Data
        </button>
        <button
          onClick={() => {
            setShowFlag(!showFlag);
            setShowDataCollection(false);
            setShowSync(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ff9800",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🚩 Flag Issue
        </button>
      </div>

      {showDataCollection && <DataCollection userId={userId} onDataCollected={handleDataCollected} />}
      {showSync && <SyncData userId={userId} />}
      {showFlag && <FlagFeature onFeatureFlagged={handleFlagged} />}
    </div>
  );
    }