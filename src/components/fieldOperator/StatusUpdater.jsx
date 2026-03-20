import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function StatusUpdater({ onUpdateComplete }) {
  const [featureType, setFeatureType] = useState('manhole');
  const [featureId, setFeatureId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const statusOptions = {
    manhole: ['Good', 'Needs Maintenance', 'Out of Service', 'Blocked', 'Under Repair'],
    pipeline: ['Good', 'Needs Inspection', 'Blocked', 'Leaking', 'Under Repair']
  };

  const handleUpdate = async () => {
    if (!featureId || !status) {
      setMessage('Please fill all fields');
      return;
    }

    setLoading(true);
    
    try {
      const table = featureType === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
      const statusField = featureType === 'manhole' ? 'bloc_stat' : 'block_stat';
      
      const { error } = await supabase
        .from(table)
        .update({ [statusField]: status, updated_at: new Date().toISOString() })
        .eq('gid', featureId);

      if (error) throw error;
      
      setMessage(`✅ ${featureType} status updated to "${status}"`);
      setFeatureId('');
      setStatus('');
      onUpdateComplete();
      
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
      backgroundColor: "#9c27b0",
      color: "white",
      fontWeight: "bold",
    },
    content: {
      padding: "1rem",
    },
    select: {
      width: "100%",
      padding: "0.5rem",
      marginBottom: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ddd",
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
      backgroundColor: "#9c27b0",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "1rem",
    },
    message: {
      marginTop: "1rem",
      padding: "0.5rem",
      borderRadius: "4px",
      fontSize: "0.9rem",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        📝 Update Status
      </div>
      <div style={styles.content}>
        <select 
          style={styles.select}
          value={featureType}
          onChange={(e) => setFeatureType(e.target.value)}
        >
          <option value="manhole">Manhole</option>
          <option value="pipeline">Pipeline</option>
        </select>
        
        <input
          style={styles.input}
          placeholder={`${featureType === 'manhole' ? 'Manhole' : 'Pipe'} ID`}
          value={featureId}
          onChange={(e) => setFeatureId(e.target.value)}
        />
        
        <select 
          style={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Select Status</option>
          {statusOptions[featureType].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        
        <button 
          style={styles.button} 
          onClick={handleUpdate}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Status"}
        </button>
        
        {message && (
          <div style={styles.message}>{message}</div>
        )}
      </div>
    </div>
  );
}