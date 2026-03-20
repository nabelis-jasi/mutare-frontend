import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function SyncData({ userId }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setStatus('Syncing data...');
    
    try {
      // Get pending data from local storage
      const pendingData = JSON.parse(localStorage.getItem('pending_sync') || '[]');
      
      if (pendingData.length === 0) {
        setStatus('No pending data to sync');
        setSyncing(false);
        return;
      }

      // Sync manholes
      const manholesToSync = pendingData.filter(d => d.type === 'manhole');
      for (const manhole of manholesToSync) {
        const { error } = await supabase.from('waste_water_manhole').insert([manhole.data]);
        if (error) throw error;
      }

      // Sync pipelines
      const pipelinesToSync = pendingData.filter(d => d.type === 'pipeline');
      for (const pipeline of pipelinesToSync) {
        const { error } = await supabase.from('waste_water_pipeline').insert([pipeline.data]);
        if (error) throw error;
      }

      // Clear synced data
      localStorage.setItem('pending_sync', '[]');
      setStatus(`✅ Synced ${pendingData.length} items successfully!`);
      
    } catch (error) {
      setStatus(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
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
      backgroundColor: "#2196f3",
      color: "white",
      fontWeight: "bold",
    },
    content: {
      padding: "1rem",
    },
    button: {
      width: "100%",
      padding: "0.75rem",
      backgroundColor: "#2196f3",
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
        🔄 Sync Data
      </div>
      <div style={styles.content}>
        <button 
          style={styles.button} 
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
        {status && (
          <div style={styles.status}>{status}</div>
        )}
      </div>
    </div>
  );
}