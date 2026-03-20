import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function MaintenanceRecords({ userId, onRecordAdded }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [formData, setFormData] = useState({
    feature_type: 'manhole',
    feature_id: '',
    maintenance_type: 'inspection',
    description: '',
    priority: 'medium',
    scheduled_date: '',
    completed_date: '',
    technician: '',
    cost: '',
    notes: ''
  });
  const [filter, setFilter] = useState('all'); // all, pending, completed

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [filter]);

  const fetchMaintenanceRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('maintenance_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.is('completed_date', null);
      } else if (filter === 'completed') {
        query = query.not('completed_date', 'is', null);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setRecords(data || []);
      
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!formData.feature_id) {
      alert('Please enter Feature ID');
      return;
    }

    try {
      const record = {
        ...formData,
        user_id: userId,
        created_at: new Date().toISOString(),
        status: formData.completed_date ? 'completed' : 'pending'
      };

      const { data, error } = await supabase
        .from('maintenance_records')
        .insert([record])
        .select();

      if (error) throw error;
      
      alert('✅ Maintenance record added successfully!');
      setShowAddForm(false);
      setFormData({
        feature_type: 'manhole',
        feature_id: '',
        maintenance_type: 'inspection',
        description: '',
        priority: 'medium',
        scheduled_date: '',
        completed_date: '',
        technician: '',
        cost: '',
        notes: ''
      });
      fetchMaintenanceRecords();
      
      if (onRecordAdded) onRecordAdded();
      
    } catch (error) {
      alert(`❌ Error adding record: ${error.message}`);
    }
  };

  const handleCompleteRecord = async (record) => {
    if (!confirm('Mark this maintenance as completed?')) return;
    
    try {
      const { error } = await supabase
        .from('maintenance_records')
        .update({
          completed_date: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', record.id);
      
      if (error) throw error;
      
      alert('✅ Record marked as completed!');
      fetchMaintenanceRecords();
      
    } catch (error) {
      alert(`❌ Error updating record: ${error.message}`);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusBadge = (record) => {
    if (record.completed_date) {
      return { text: 'Completed', color: '#28a745', bg: '#d4edda' };
    }
    if (new Date(record.scheduled_date) < new Date()) {
      return { text: 'Overdue', color: '#dc3545', bg: '#f8d7da' };
    }
    return { text: 'Pending', color: '#ffc107', bg: '#fff3cd' };
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "500px",
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
      backgroundColor: "#ff5722",
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
    filterBar: {
      padding: "0.75rem 1rem",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      gap: "0.5rem",
      backgroundColor: "#f8f9fa",
    },
    filterButton: {
      padding: "0.4rem 1rem",
      backgroundColor: "#e9ecef",
      border: "none",
      borderRadius: "20px",
      cursor: "pointer",
      fontSize: "0.85rem",
      transition: "all 0.2s",
    },
    activeFilter: {
      backgroundColor: "#ff5722",
      color: "white",
    },
    addButton: {
      marginLeft: "auto",
      padding: "0.4rem 1rem",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "20px",
      cursor: "pointer",
      fontSize: "0.85rem",
    },
    list: {
      flex: 1,
      overflowY: "auto",
      maxHeight: "400px",
    },
    recordItem: {
      padding: "1rem",
      borderBottom: "1px solid #f0f0f0",
      transition: "background 0.2s",
    },
    recordHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "0.5rem",
    },
    featureInfo: {
      display: "flex",
      gap: "0.5rem",
      alignItems: "center",
    },
    featureType: {
      fontWeight: "bold",
      color: "#333",
    },
    featureId: {
      fontSize: "0.85rem",
      color: "#666",
    },
    maintenanceType: {
      fontSize: "0.9rem",
      fontWeight: "500",
      color: "#ff5722",
    },
    priority: {
      padding: "0.2rem 0.5rem",
      borderRadius: "12px",
      fontSize: "0.7rem",
      fontWeight: "bold",
      color: "white",
    },
    description: {
      fontSize: "0.85rem",
      color: "#666",
      marginBottom: "0.5rem",
    },
    dateInfo: {
      fontSize: "0.75rem",
      color: "#999",
      display: "flex",
      gap: "1rem",
      marginBottom: "0.5rem",
    },
    statusBadge: {
      display: "inline-block",
      padding: "0.2rem 0.5rem",
      borderRadius: "12px",
      fontSize: "0.7rem",
      fontWeight: "bold",
    },
    completeButton: {
      marginTop: "0.5rem",
      padding: "0.3rem 0.8rem",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "0.8rem",
    },
    formContainer: {
      padding: "1rem",
      borderTop: "1px solid #e0e0e0",
      backgroundColor: "#fafafa",
    },
    formTitle: {
      fontWeight: "bold",
      marginBottom: "1rem",
      color: "#333",
    },
    formRow: {
      marginBottom: "0.75rem",
    },
    label: {
      display: "block",
      fontSize: "0.85rem",
      fontWeight: "500",
      marginBottom: "0.25rem",
      color: "#555",
    },
    input: {
      width: "100%",
      padding: "0.5rem",
      borderRadius: "6px",
      border: "1px solid #ddd",
      fontSize: "0.9rem",
    },
    select: {
      width: "100%",
      padding: "0.5rem",
      borderRadius: "6px",
      border: "1px solid #ddd",
      fontSize: "0.9rem",
    },
    textarea: {
      width: "100%",
      padding: "0.5rem",
      borderRadius: "6px",
      border: "1px solid #ddd",
      fontSize: "0.9rem",
      resize: "vertical",
      minHeight: "60px",
    },
    formButtons: {
      display: "flex",
      gap: "0.5rem",
      marginTop: "1rem",
    },
    submitButton: {
      flex: 1,
      padding: "0.5rem",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    },
    cancelButton: {
      flex: 1,
      padding: "0.5rem",
      backgroundColor: "#6c757d",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
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
        <span>🔧 Maintenance Records</span>
        <button style={styles.closeButton} onClick={() => onRecordAdded?.()}>
          ×
        </button>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <button
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.activeFilter : {})
          }}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filter === 'pending' ? styles.activeFilter : {})
          }}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filter === 'completed' ? styles.activeFilter : {})
          }}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          style={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '− Cancel' : '+ Add Record'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={styles.formContainer}>
          <div style={styles.formTitle}>Add Maintenance Record</div>
          
          <div style={styles.formRow}>
            <label style={styles.label}>Feature Type</label>
            <select
              style={styles.select}
              value={formData.feature_type}
              onChange={(e) => setFormData({...formData, feature_type: e.target.value})}
            >
              <option value="manhole">Manhole</option>
              <option value="pipeline">Pipeline</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Feature ID</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter Manhole or Pipe ID"
              value={formData.feature_id}
              onChange={(e) => setFormData({...formData, feature_id: e.target.value})}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Maintenance Type</label>
            <select
              style={styles.select}
              value={formData.maintenance_type}
              onChange={(e) => setFormData({...formData, maintenance_type: e.target.value})}
            >
              <option value="inspection">Inspection</option>
              <option value="cleaning">Cleaning</option>
              <option value="repair">Repair</option>
              <option value="replacement">Replacement</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Priority</label>
            <select
              style={styles.select}
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              placeholder="Describe the maintenance work needed"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Scheduled Date</label>
            <input
              style={styles.input}
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Technician</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Assigned technician"
              value={formData.technician}
              onChange={(e) => setFormData({...formData, technician: e.target.value})}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Estimated Cost</label>
            <input
              style={styles.input}
              type="text"
              placeholder="USD"
              value={formData.cost}
              onChange={(e) => setFormData({...formData, cost: e.target.value})}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={styles.textarea}
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div style={styles.formButtons}>
            <button style={styles.submitButton} onClick={handleAddRecord}>
              Save Record
            </button>
            <button style={styles.cancelButton} onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Records List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.emptyState}>Loading maintenance records...</div>
        ) : records.length === 0 ? (
          <div style={styles.emptyState}>
            No maintenance records found
          </div>
        ) : (
          records.map((record) => {
            const status = getStatusBadge(record);
            return (
              <div key={record.id} style={styles.recordItem}>
                <div style={styles.recordHeader}>
                  <div style={styles.featureInfo}>
                    <span style={styles.featureType}>
                      {record.feature_type === 'manhole' ? '🕳️ Manhole' : '📏 Pipeline'}
                    </span>
                    <span style={styles.featureId}>
                      ID: {record.feature_id}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.priority,
                      backgroundColor: getPriorityColor(record.priority)
                    }}
                  >
                    {record.priority}
                  </span>
                </div>

                <div style={styles.maintenanceType}>
                  {record.maintenance_type.toUpperCase()}
                </div>
                <div style={styles.description}>
                  {record.description}
                </div>
                
                <div style={styles.dateInfo}>
                  <span>📅 Scheduled: {record.scheduled_date || 'Not set'}</span>
                  {record.completed_date && (
                    <span>✓ Completed: {new Date(record.completed_date).toLocaleDateString()}</span>
                  )}
                </div>

                {record.technician && (
                  <div style={styles.dateInfo}>
                    <span>👤 Tech: {record.technician}</span>
                    {record.cost && <span>💰 {record.cost}</span>}
                  </div>
                )}

                <div style={{ marginTop: '0.5rem' }}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: status.bg,
                      color: status.color
                    }}
                  >
                    {status.text}
                  </span>
                </div>

                {!record.completed_date && (
                  <button
                    style={styles.completeButton}
                    onClick={() => handleCompleteRecord(record)}
                  >
                    Mark as Completed
                  </button>
                )}

                {record.notes && (
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                    📝 {record.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}