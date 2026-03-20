import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function DataSync({ userId, onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');
  const [syncType, setSyncType] = useState('all'); // 'all', 'manholes', 'pipelines', 'pending'
  const [progress, setProgress] = useState(0);
  const [syncHistory, setSyncHistory] = useState([]);

  const syncManholes = async () => {
    try {
      setStatus('Syncing manholes...');
      setProgress(25);
      
      // Get local pending changes from localStorage
      const pendingManholes = JSON.parse(localStorage.getItem('pending_manholes') || '[]');
      
      if (pendingManholes.length > 0) {
        for (let i = 0; i < pendingManholes.length; i++) {
          const manhole = pendingManholes[i];
          const { error } = await supabase
            .from('waste_water_manhole')
            .upsert([manhole], { onConflict: 'gid' });
          
          if (error) throw error;
          setProgress(25 + (i / pendingManholes.length) * 25);
        }
        
        // Clear synced data
        localStorage.setItem('pending_manholes', '[]');
      }
      
      return pendingManholes.length;
    } catch (error) {
      throw new Error(`Manhole sync failed: ${error.message}`);
    }
  };

  const syncPipelines = async () => {
    try {
      setStatus('Syncing pipelines...');
      setProgress(50);
      
      // Get local pending changes from localStorage
      const pendingPipelines = JSON.parse(localStorage.getItem('pending_pipelines') || '[]');
      
      if (pendingPipelines.length > 0) {
        for (let i = 0; i < pendingPipelines.length; i++) {
          const pipeline = pendingPipelines[i];
          const { error } = await supabase
            .from('waste_water_pipeline')
            .upsert([pipeline], { onConflict: 'gid' });
          
          if (error) throw error;
          setProgress(50 + (i / pendingPipelines.length) * 25);
        }
        
        // Clear synced data
        localStorage.setItem('pending_pipelines', '[]');
      }
      
      return pendingPipelines.length;
    } catch (error) {
      throw new Error(`Pipeline sync failed: ${error.message}`);
    }
  };

  const syncRemoteToLocal = async () => {
    try {
      setStatus('Downloading remote data...');
      setProgress(75);
      
      // Fetch latest data from server
      const { data: manholes, error: manholesError } = await supabase
        .from('waste_water_manhole')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (manholesError) throw manholesError;
      
      const { data: pipelines, error: pipelinesError } = await supabase
        .from('waste_water_pipeline')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (pipelinesError) throw pipelinesError;
      
      // Save to localStorage for offline access
      localStorage.setItem('offline_manholes', JSON.stringify(manholes));
      localStorage.setItem('offline_pipelines', JSON.stringify(pipelines));
      localStorage.setItem('last_sync_time', new Date().toISOString());
      
      setProgress(100);
      return { manholes: manholes.length, pipelines: pipelines.length };
    } catch (error) {
      throw new Error(`Remote sync failed: ${error.message}`);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setStatus('Starting sync...');
    setProgress(0);
    
    try {
      const results = {
        manholesSynced: 0,
        pipelinesSynced: 0,
        remoteSynced: false
      };
      
      if (syncType === 'all' || syncType === 'manholes') {
        results.manholesSynced = await syncManholes();
      }
      
      if (syncType === 'all' || syncType === 'pipelines') {
        results.pipelinesSynced = await syncPipelines();
      }
      
      if (syncType === 'all' || syncType === 'pending') {
        const remote = await syncRemoteToLocal();
        results.remoteSynced = true;
      }
      
      // Save sync history
      const syncRecord = {
        timestamp: new Date().toISOString(),
        type: syncType,
        results,
        userId
      };
      
      setSyncHistory([syncRecord, ...syncHistory.slice(0, 9)]);
      localStorage.setItem('sync_history', JSON.stringify(syncHistory));
      
      setStatus(`✅ Sync completed! Manholes: ${results.manholesSynced}, Pipelines: ${results.pipelinesSynced}`);
      
      if (onSyncComplete) {
        onSyncComplete();
      }
      
    } catch (error) {
      setStatus(`❌ Sync failed: ${error.message}`);
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
      setTimeout(() => {
        if (status.includes('completed')) {
          setStatus('');
        }
      }, 5000);
    }
  };

  const handleForceResync = async () => {
    if (!confirm('This will force a full resync of all data. Are you sure?')) return;
    
    setSyncing(true);
    setStatus('Force resync initiated...');
    
    try {
      // Clear all local pending data
      localStorage.removeItem('pending_manholes');
      localStorage.removeItem('pending_pipelines');
      
      // Force full download
      const { data: manholes, error: manholesError } = await supabase
        .from('waste_water_manhole')
        .select('*');
      
      if (manholesError) throw manholesError;
      
      const { data: pipelines, error: pipelinesError } = await supabase
        .from('waste_water_pipeline')
        .select('*');
      
      if (pipelinesError) throw pipelinesError;
      
      localStorage.setItem('offline_manholes', JSON.stringify(manholes));
      localStorage.setItem('offline_pipelines', JSON.stringify(pipelines));
      localStorage.setItem('last_sync_time', new Date().toISOString());
      
      setStatus(`✅ Force resync completed! Loaded ${manholes.length} manholes and ${pipelines.length} pipelines.`);
      
      if (onSyncComplete) {
        onSyncComplete();
      }
      
    } catch (error) {
      setStatus(`❌ Force resync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const getLastSyncTime = () => {
    const lastSync = localStorage.getItem('last_sync_time');
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

  const getPendingCount = () => {
    const pendingManholes = JSON.parse(localStorage.getItem('pending_manholes') || '[]');
    const pendingPipelines = JSON.parse(localStorage.getItem('pending_pipelines') || '[]');
    return pendingManholes.length + pendingPipelines.length;
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "380px",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
      animation: "slideIn 0.3s ease-out",
    },
    header: {
      padding: "1rem 1.5rem",
      backgroundColor: "#2196f3",
      color: "white",
      fontWeight: "bold",
      fontSize: "1.1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeButton: {
      background: "none",
      border: "none",
      color: "white",
      fontSize: "1.5rem",
      cursor: "pointer",
      padding: "0",
      width: "30px",
      height: "30px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: "1.5rem",
    },
    syncTypeSection: {
      marginBottom: "1.5rem",
    },
    label: {
      display: "block",
      marginBottom: "0.5rem",
      fontWeight: "500",
      color: "#333",
    },
    radioGroup: {
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap",
    },
    radioLabel: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      cursor: "pointer",
    },
    infoSection: {
      backgroundColor: "#f8f9fa",
      padding: "1rem",
      borderRadius: "8px",
      marginBottom: "1.5rem",
    },
    infoRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "0.5rem",
      fontSize: "0.9rem",
    },
    infoLabel: {
      color: "#666",
    },
    infoValue: {
      fontWeight: "500",
      color: "#333",
    },
    progressBar: {
      width: "100%",
      height: "8px",
      backgroundColor: "#e0e0e0",
      borderRadius: "4px",
      overflow: "hidden",
      marginBottom: "1rem",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#4caf50",
      transition: "width 0.3s ease",
      width: `${progress}%`,
    },
    status: {
      marginBottom: "1rem",
      padding: "0.75rem",
      borderRadius: "6px",
      fontSize: "0.9rem",
      textAlign: "center",
      backgroundColor: "#f5f5f5",
      color: "#666",
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
      fontWeight: "500",
      marginBottom: "0.75rem",
      transition: "all 0.2s",
    },
    forceButton: {
      backgroundColor: "#ff9800",
    },
    historySection: {
      marginTop: "1rem",
      borderTop: "1px solid #e0e0e0",
      paddingTop: "1rem",
    },
    historyTitle: {
      fontSize: "0.9rem",
      fontWeight: "600",
      marginBottom: "0.5rem",
      color: "#333",
    },
    historyList: {
      maxHeight: "200px",
      overflowY: "auto",
    },
    historyItem: {
      fontSize: "0.8rem",
      padding: "0.5rem",
      borderBottom: "1px solid #f0f0f0",
      color: "#666",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>🔄 Data Synchronization</span>
        <button style={styles.closeButton} onClick={() => onSyncComplete?.()}>
          ×
        </button>
      </div>
      
      <div style={styles.content}>
        {/* Sync Type Selection */}
        <div style={styles.syncTypeSection}>
          <label style={styles.label}>Sync Options:</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="all"
                checked={syncType === 'all'}
                onChange={(e) => setSyncType(e.target.value)}
                disabled={syncing}
              />
              All Data
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="manholes"
                checked={syncType === 'manholes'}
                onChange={(e) => setSyncType(e.target.value)}
                disabled={syncing}
              />
              Manholes Only
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="pipelines"
                checked={syncType === 'pipelines'}
                onChange={(e) => setSyncType(e.target.value)}
                disabled={syncing}
              />
              Pipelines Only
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="pending"
                checked={syncType === 'pending'}
                onChange={(e) => setSyncType(e.target.value)}
                disabled={syncing}
              />
              Download Remote
            </label>
          </div>
        </div>

        {/* Info Section */}
        <div style={styles.infoSection}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Last Sync:</span>
            <span style={styles.infoValue}>{getLastSyncTime()}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Pending Items:</span>
            <span style={styles.infoValue}>{getPendingCount()}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>User ID:</span>
            <span style={styles.infoValue}>{userId?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Progress Bar */}
        {syncing && (
          <div style={styles.progressBar}>
            <div style={styles.progressFill} />
          </div>
        )}

        {/* Status Message */}
        {status && (
          <div style={styles.status}>
            {status}
          </div>
        )}

        {/* Action Buttons */}
        <button 
          style={styles.button} 
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : "Start Sync"}
        </button>
        
        <button 
          style={{...styles.button, ...styles.forceButton}} 
          onClick={handleForceResync}
          disabled={syncing}
        >
          🔄 Force Full Resync
        </button>

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div style={styles.historySection}>
            <div style={styles.historyTitle}>Recent Syncs</div>
            <div style={styles.historyList}>
              {syncHistory.slice(0, 5).map((item, index) => (
                <div key={index} style={styles.historyItem}>
                  {new Date(item.timestamp).toLocaleString()}: {item.type} sync - 
                  {item.results.manholesSynced > 0 && ` ${item.results.manholesSynced} manholes`}
                  {item.results.pipelinesSynced > 0 && ` ${item.results.pipelinesSynced} pipelines`}
                  {item.results.remoteSynced && ' remote data updated'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}