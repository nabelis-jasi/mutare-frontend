import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function DataCollection({ userId, onDataCollected }) {
  const [collectionMode, setCollectionMode] = useState('point'); // 'point' or 'line'
  const [collecting, setCollecting] = useState(false);
  const [points, setPoints] = useState([]);
  const [formData, setFormData] = useState({
    status: 'Good',
    material: 'PVC',
    condition: 'Good',
    remarks: ''
  });

  const startCollection = () => {
    setCollecting(true);
    setPoints([]);
    alert(`Click on the map to add ${collectionMode}s. Double-click to finish.`);
  };

  const addPoint = (lat, lng) => {
    setPoints([...points, { lat, lng }]);
  };

  const finishCollection = async () => {
    if (collectionMode === 'point' && points.length === 1) {
      // Save point (manhole)
      const newManhole = {
        geom: {
          type: 'Point',
          coordinates: [points[0].lng, points[0].lat]
        },
        status: formData.status,
        material: formData.material,
        condition: formData.condition,
        remarks: formData.remarks,
        created_by: userId,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('waste_water_manhole').insert([newManhole]);
      if (error) {
        alert('Error saving manhole: ' + error.message);
      } else {
        alert('Manhole saved successfully!');
        onDataCollected();
      }
    } 
    else if (collectionMode === 'line' && points.length >= 2) {
      // Save line (pipeline)
      const newPipeline = {
        geom: {
          type: 'LineString',
          coordinates: points.map(p => [p.lng, p.lat])
        },
        status: formData.status,
        pipe_mat: formData.material,
        condition: formData.condition,
        remarks: formData.remarks,
        created_by: userId,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('waste_water_pipeline').insert([newPipeline]);
      if (error) {
        alert('Error saving pipeline: ' + error.message);
      } else {
        alert('Pipeline saved successfully!');
        onDataCollected();
      }
    } else {
      alert(`Please collect ${collectionMode === 'point' ? '1 point' : 'at least 2 points'} first`);
    }

    setCollecting(false);
    setPoints([]);
  };

  const cancelCollection = () => {
    setCollecting(false);
    setPoints([]);
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "300px",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
    },
    header: {
      padding: "1rem",
      backgroundColor: "#4caf50",
      color: "white",
      fontWeight: "bold",
    },
    content: {
      padding: "1rem",
    },
    modeSelector: {
      display: "flex",
      gap: "1rem",
      marginBottom: "1rem",
    },
    modeButton: {
      flex: 1,
      padding: "0.5rem",
      backgroundColor: "#e0e0e0",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    },
    activeMode: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    input: {
      width: "100%",
      padding: "0.5rem",
      marginBottom: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ddd",
    },
    button: {
      width: "100%",
      padding: "0.75rem",
      marginTop: "0.5rem",
      backgroundColor: "#4caf50",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#dc3545",
    },
    pointCount: {
      marginTop: "0.5rem",
      fontSize: "0.9rem",
      color: "#666",
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        📍 Data Collection
      </div>
      <div style={styles.content}>
        {!collecting ? (
          <>
            <div style={styles.modeSelector}>
              <button
                style={{
                  ...styles.modeButton,
                  ...(collectionMode === 'point' ? styles.activeMode : {})
                }}
                onClick={() => setCollectionMode('point')}
              >
                🟢 Point (Manhole)
              </button>
              <button
                style={{
                  ...styles.modeButton,
                  ...(collectionMode === 'line' ? styles.activeMode : {})
                }}
                onClick={() => setCollectionMode('line')}
              >
                🔵 Line (Pipeline)
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Status"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            />
            <input
              style={styles.input}
              placeholder="Material"
              value={formData.material}
              onChange={(e) => setFormData({...formData, material: e.target.value})}
            />
            <input
              style={styles.input}
              placeholder="Condition"
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value})}
            />
            <textarea
              style={{...styles.input, minHeight: "60px"}}
              placeholder="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
            />

            <button style={styles.button} onClick={startCollection}>
              Start Collecting
            </button>
          </>
        ) : (
          <>
            <p><strong>Mode:</strong> {collectionMode === 'point' ? 'Point (Manhole)' : 'Line (Pipeline)'}</p>
            <p><strong>Points collected:</strong> {points.length}</p>
            {points.length > 0 && (
              <div style={styles.pointCount}>
                {points.map((p, i) => (
                  <div key={i}>Point {i+1}: {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                ))}
              </div>
            )}
            <button style={styles.button} onClick={finishCollection}>
              ✓ Save
            </button>
            <button style={{...styles.button, ...styles.cancelButton}} onClick={cancelCollection}>
              ✗ Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}