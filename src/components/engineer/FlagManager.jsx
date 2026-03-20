import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function FlagManager({ onFlagManaged }) {
  const [flaggedFeatures, setFlaggedFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [actionType, setActionType] = useState('review'); // review, resolve, delete
  const [resolutionNote, setResolutionNote] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, manholes, pipelines
  const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0 });

  useEffect(() => {
    fetchFlaggedFeatures();
  }, [filterType]);

  const fetchFlaggedFeatures = async () => {
    setLoading(true);
    try {
      let manholes = [];
      let pipelines = [];

      if (filterType === 'all' || filterType === 'manholes') {
        const { data: manholesData, error: manholesError } = await supabase
          .from('waste_water_manhole')
          .select('*')
          .eq('flagged', true);
        
        if (!manholesError) {
          manholes = manholesData.map(m => ({ ...m, feature_type: 'manhole' }));
        }
      }

      if (filterType === 'all' || filterType === 'pipelines') {
        const { data: pipelinesData, error: pipelinesError } = await supabase
          .from('waste_water_pipeline')
          .select('*')
          .eq('flagged', true);
        
        if (!pipelinesError) {
          pipelines = pipelinesData.map(p => ({ ...p, feature_type: 'pipeline' }));
        }
      }

      const allFlagged = [...manholes, ...pipelines];
      setFlaggedFeatures(allFlagged);
      
      // Calculate stats
      const resolved = allFlagged.filter(f => f.flag_resolved).length;
      setStats({
        total: allFlagged.length,
        resolved: resolved,
        pending: allFlagged.length - resolved
      });
      
    } catch (error) {
      console.error('Error fetching flagged features:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFlag = async () => {
    if (!selectedFeature) return;
    
    try {
      const table = selectedFeature.feature_type === 'manhole' 
        ? 'waste_water_manhole' 
        : 'waste_water_pipeline';
      
      const updates = {
        flagged: false,
        flag_resolved: true,
        flag_resolved_at: new Date().toISOString(),
        flag_resolution_note: resolutionNote,
        flag_resolved_by: localStorage.getItem('user_id')
      };
      
      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq('gid', selectedFeature.gid);
      
      if (error) throw error;
      
      alert(`✅ Flag resolved for ${selectedFeature.feature_type} ${selectedFeature.gid}`);
      setSelectedFeature(null);
      setResolutionNote('');
      fetchFlaggedFeatures();
      
      if (onFlagManaged) onFlagManaged();
      
    } catch (error) {
      alert(`❌ Error resolving flag: ${error.message}`);
    }
  };

  const handleDeleteFlaggedFeature = async () => {
    if (!selectedFeature) return;
    
    if (!confirm(`Are you sure you want to delete this ${selectedFeature.feature_type}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const table = selectedFeature.feature_type === 'manhole' 
        ? 'waste_water_manhole' 
        : 'waste_water_pipeline';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('gid', selectedFeature.gid);
      
      if (error) throw error;
      
      alert(`✅ ${selectedFeature.feature_type} deleted successfully`);
      setSelectedFeature(null);
      fetchFlaggedFeatures();
      
      if (onFlagManaged) onFlagManaged();
      
    } catch (error) {
      alert(`❌ Error deleting feature: ${error.message}`);
    }
  };

  const getStatusColor = (feature) => {
    if (feature.flag_resolved) return '#d4edda';
    if (feature.flag_severity === 'high') return '#f8d7da';
    if (feature.flag_severity === 'medium') return '#fff3cd';
    return '#e2e3e5';
  };

  const getStatusTextColor = (feature) => {
    if (feature.flag_resolved) return '#155724';
    if (feature.flag_severity === 'high') return '#721c24';
    if (feature.flag_severity === 'medium') return '#856404';
    return '#383d41';
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "450px",
      maxHeight: "calc(100vh - 100px)",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "1rem 1.5rem",
      backgroundColor: "#ff9800",
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
    statsBar: {
      display: "flex",
      padding: "1rem",
      backgroundColor: "#f8f9fa",
      borderBottom: "1px solid #e0e0e0",
      gap: "1rem",
    },
    statCard: {
      flex: 1,
      textAlign: "center",
      padding: "0.5rem",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    statNumber: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      color: "#333",
    },
    statLabel: {
      fontSize: "0.8rem",
      color: "#666",
      marginTop: "0.25rem",
    },
    filterBar: {
      padding: "0.75rem 1rem",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      gap: "0.5rem",
    },
    filterButton: {
      padding: "0.4rem 1rem",
      backgroundColor: "#f0f0f0",
      border: "none",
      borderRadius: "20px",
      cursor: "pointer",
      fontSize: "0.85rem",
      transition: "all 0.2s",
    },
    activeFilter: {
      backgroundColor: "#ff9800",
      color: "white",
    },
    list: {
      flex: 1,
      overflowY: "auto",
      maxHeight: "400px",
    },
    featureItem: {
      padding: "1rem",
      borderBottom: "1px solid #f0f0f0",
      cursor: "pointer",
      transition: "background 0.2s",
    },
    selectedFeature: {
      backgroundColor: "#fff3e0",
      borderLeft: "3px solid #ff9800",
    },
    featureHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "0.5rem",
    },
    featureType: {
      fontWeight: "bold",
      color: "#333",
    },
    featureId: {
      fontSize: "0.85rem",
      color: "#666",
    },
    flagReason: {
      fontSize: "0.85rem",
      color: "#666",
      marginTop: "0.25rem",
      fontStyle: "italic",
    },
    flagDate: {
      fontSize: "0.7rem",
      color: "#999",
      marginTop: "0.25rem",
    },
    actionPanel: {
      padding: "1rem",
      borderTop: "1px solid #e0e0e0",
      backgroundColor: "#fafafa",
    },
    actionTitle: {
      fontWeight: "bold",
      marginBottom: "0.75rem",
      color: "#333",
    },
    actionButtons: {
      display: "flex",
      gap: "0.5rem",
      marginBottom: "0.75rem",
    },
    actionButton: {
      flex: 1,
      padding: "0.5rem",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "500",
    },
    resolveButton: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    deleteButton: {
      backgroundColor: "#dc3545",
      color: "white",
    },
    textarea: {
      width: "100%",
      padding: "0.5rem",
      borderRadius: "6px",
      border: "1px solid #ddd",
      marginTop: "0.5rem",
      fontSize: "0.85rem",
      fontFamily: "inherit",
      resize: "vertical",
    },
    emptyState: {
      padding: "2rem",
      textAlign: "center",
      color: "#999",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>🏁 Flag Manager</span>
        <button style={styles.closeButton} onClick={() => onFlagManaged?.()}>
          ×
        </button>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.total}</div>
          <div style={styles.statLabel}>Total Flags</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.pending}</div>
          <div style={styles.statLabel}>Pending</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.resolved}</div>
          <div style={styles.statLabel}>Resolved</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <button
          style={{
            ...styles.filterButton,
            ...(filterType === 'all' ? styles.activeFilter : {})
          }}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filterType === 'manholes' ? styles.activeFilter : {})
          }}
          onClick={() => setFilterType('manholes')}
        >
          🕳️ Manholes
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filterType === 'pipelines' ? styles.activeFilter : {})
          }}
          onClick={() => setFilterType('pipelines')}
        >
          📏 Pipelines
        </button>
      </div>

      {/* Flagged Features List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.emptyState}>Loading flagged features...</div>
        ) : flaggedFeatures.length === 0 ? (
          <div style={styles.emptyState}>
            🎉 No flagged features found!
          </div>
        ) : (
          flaggedFeatures.map((feature) => (
            <div
              key={`${feature.feature_type}-${feature.gid}`}
              style={{
                ...styles.featureItem,
                ...(selectedFeature?.gid === feature.gid ? styles.selectedFeature : {}),
                backgroundColor: getStatusColor(feature),
              }}
              onClick={() => setSelectedFeature(feature)}
            >
              <div style={styles.featureHeader}>
                <span style={styles.featureType}>
                  {feature.feature_type === 'manhole' ? '🕳️ Manhole' : '📏 Pipeline'}
                </span>
                <span style={styles.featureId}>
                  ID: {feature.manhole_id || feature.pipe_id || feature.gid}
                </span>
              </div>
              <div style={styles.flagReason}>
                🚩 {feature.flag_reason || 'No reason provided'}
              </div>
              <div style={styles.flagDate}>
                Flagged: {feature.flagged_at ? new Date(feature.flagged_at).toLocaleString() : 'Unknown'}
              </div>
              {feature.flag_resolved && (
                <div style={{ fontSize: '0.7rem', color: '#155724', marginTop: '0.25rem' }}>
                  ✓ Resolved: {feature.flag_resolution_note || 'No note'}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Panel */}
      {selectedFeature && !selectedFeature.flag_resolved && (
        <div style={styles.actionPanel}>
          <div style={styles.actionTitle}>
            Actions for {selectedFeature.feature_type === 'manhole' ? 'Manhole' : 'Pipeline'} ID: {selectedFeature.manhole_id || selectedFeature.pipe_id || selectedFeature.gid}
          </div>
          
          <div style={styles.actionButtons}>
            <button
              style={{...styles.actionButton, ...styles.resolveButton}}
              onClick={() => setActionType('resolve')}
            >
              ✓ Resolve Flag
            </button>
            <button
              style={{...styles.actionButton, ...styles.deleteButton}}
              onClick={() => setActionType('delete')}
            >
              🗑️ Delete Feature
            </button>
          </div>

          {actionType === 'resolve' && (
            <>
              <textarea
                style={styles.textarea}
                rows="2"
                placeholder="Resolution notes (optional)"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
              <button
                style={{
                  ...styles.actionButton,
                  ...styles.resolveButton,
                  marginTop: '0.5rem'
                }}
                onClick={handleResolveFlag}
              >
                Confirm Resolution
              </button>
            </>
          )}

          {actionType === 'delete' && (
            <button
              style={{
                ...styles.actionButton,
                ...styles.deleteButton,
                marginTop: '0.5rem'
              }}
              onClick={handleDeleteFlaggedFeature}
            >
              Confirm Delete (Permanent)
            </button>
          )}
        </div>
      )}

      {selectedFeature && selectedFeature.flag_resolved && (
        <div style={styles.actionPanel}>
          <div style={{ textAlign: 'center', color: '#155724' }}>
            ✓ This flag has been resolved
          </div>
          {selectedFeature.flag_resolution_note && (
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
              Note: {selectedFeature.flag_resolution_note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}