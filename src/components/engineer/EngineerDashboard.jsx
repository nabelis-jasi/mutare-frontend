import React, { useState } from 'react';
import MapView from '../MapView';
import DataEditor from './DataEditor';
import ShapefileUploader from './ShapefileUploader';
import DataSync from './DataSync';
import FlagManager from './FlagManager';

export default function EngineerDashboard({ manholes, pipes, userId, role, onDataRefresh }) {
  const [showEditor, setShowEditor] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showFlagManager, setShowFlagManager] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    setShowEditor(true);
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapView 
        manholes={manholes} 
        pipes={pipes} 
        role={role} 
        userId={userId}
        onFeatureClick={handleFeatureClick}
      />
      
      <div style={{
        position: "absolute",
        top: "80px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 1000,
      }}>
        <button
          onClick={() => {
            setShowEditor(!showEditor);
            setShowUploader(false);
            setShowSync(false);
            setShowFlagManager(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3f51b5",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ✏️ Edit Records
        </button>
        <button
          onClick={() => {
            setShowUploader(!showUploader);
            setShowEditor(false);
            setShowSync(false);
            setShowFlagManager(false);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📤 Upload Shapefile
        </button>
        <button
          onClick={() => {
            setShowSync(!showSync);
            setShowEditor(false);
            setShowUploader(false);
            setShowFlagManager(false);
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
            setShowFlagManager(!showFlagManager);
            setShowEditor(false);
            setShowUploader(false);
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
          🏁 Manage Flags
        </button>
      </div>

      {showEditor && selectedFeature && (
        <DataEditor 
          feature={selectedFeature} 
          onSave={() => {
            setShowEditor(false);
            onDataRefresh();
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
      {showUploader && <ShapefileUploader onUploadComplete={onDataRefresh} />}
      {showSync && <DataSync userId={userId} onSyncComplete={onDataRefresh} />}
      {showFlagManager && <FlagManager onFlagManaged={onDataRefresh} />}
    </div>
  );
}