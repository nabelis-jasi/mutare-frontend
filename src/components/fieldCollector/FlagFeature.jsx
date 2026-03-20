import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function FlagFeature({ onFeatureFlagged }) {
  const [featureType, setFeatureType] = useState('manhole');
  const [featureId, setFeatureId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFlag = async () => {
    if (!featureId) {
      setStatus('Please enter Feature ID');
      return;
    }

    setLoading(true);
    
    try {
      const table = featureType === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
      
      const { error } = await supabase
        .from(table)
        .update({ flagged: true, flag_reason: reason, flagged_at: new Date().toISOString() })
        .eq('gid', featureId);

      if (error) throw error;
      
      setStatus(`✅ ${featureType} flagged successfully!`);
      setFeatureId('');
      setReason('');
      onFeatureFlagged();
      
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
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
      backgroundColor: "#ff9800",
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
    textarea: {
      width: "100%",
      padding: "0.5rem",
      marginBottom: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ddd",
      minHeight: "60px",
    },
    button: {
      width: "100%",
      padding: "0.75rem",
      backgroundColor: "#ff9800",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "1rem",
    },
    status: {
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
        🚩 Flag Feature
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
        
        <textarea
          style={styles.textarea}
          placeholder="Reason for flagging (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        
        <button 
          style={styles.button} 
          onClick={handleFlag}
          disabled={loading}
        >
          {loading ? "Flagging..." : "Flag Feature"}
        </button>
        
        {status && (
          <div style={styles.status}>{status}</div>
        )}
      </div>
    </div>
  );
}