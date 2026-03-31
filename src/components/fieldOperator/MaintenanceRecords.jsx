import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function MaintenanceRecords({ userId, selectedAsset, onClose }) {
  const [activeTab, setActiveTab] = useState(selectedAsset ? 'edit' : 'assets'); // show edit tab if asset selected
  const [manholes, setManholes] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Edit form state
  const [editAsset, setEditAsset] = useState(selectedAsset);
  const [editForm, setEditForm] = useState({
    condition_status: '',
    inspector: '',
    last_inspection_date: '',
    depth: '',
    invert_level: '',
    ground_level: ''
  });
  const [editMessage, setEditMessage] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Maintenance request state (unchanged)
  const [featureType, setFeatureType] = useState('manhole');
  const [featureId, setFeatureId] = useState('');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [formData, setFormData] = useState({
    maintenance_type: 'inspection',
    description: '',
    priority: 'medium',
    scheduled_date: '',
    technician: '',
    notes: ''
  });

  // Initialize edit form when selectedAsset changes
  useEffect(() => {
    if (selectedAsset) {
      setEditAsset(selectedAsset);
      setEditForm({
        condition_status: selectedAsset.condition_status || '',
        inspector: selectedAsset.inspector || '',
        last_inspection_date: selectedAsset.last_inspection_date || '',
        depth: selectedAsset.depth || '',
        invert_level: selectedAsset.invert_level || '',
        ground_level: selectedAsset.ground_level || ''
      });
      setActiveTab('edit');
    } else {
      setActiveTab('assets');
    }
  }, [selectedAsset]);

  // Fetch all assets for the list tab
  useEffect(() => {
    if (activeTab === 'assets') fetchAllAssets();
  }, [activeTab]);

  const fetchAllAssets = async () => {
    setLoadingAssets(true);
    const { data: manholeData } = await supabase.from('waste_water_manhole').select('*');
    const { data: pipeData } = await supabase.from('waste_water_pipeline').select('*');
    if (manholeData) setManholes(manholeData);
    if (pipeData) setPipelines(pipeData);
    setLoadingAssets(false);
  };

  // Maintenance request functions (unchanged from your previous version)
  useEffect(() => {
    if (featureId && featureId.trim() !== '') fetchAsset();
    else setAsset(null);
  }, [featureId, featureType]);

  useEffect(() => { fetchMyRecords(); }, []);

  const fetchAsset = async () => {
    setLoading(true);
    const table = featureType === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
    const { data, error } = await supabase.from(table).select('*').eq('id', featureId).single();
    if (error) setAsset(null);
    else setAsset(data);
    setLoading(false);
  };

  const fetchMyRecords = async () => {
    const { data } = await supabase.from('maintenance_records').select('*').eq('created_by', userId).order('created_at', { ascending: false });
    if (data) setRecords(data);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!asset) { setMessage('Please select a valid asset'); return; }
    setSaving(true);
    const record = { feature_type: featureType, feature_id: featureId, ...formData, created_by: userId, status: 'pending', synced: false };
    const { error } = await supabase.from('maintenance_records').insert([record]);
    if (error) setMessage(`❌ Error: ${error.message}`);
    else {
      setMessage('✅ Maintenance request submitted for approval.');
      setFormData({ maintenance_type: 'inspection', description: '', priority: 'medium', scheduled_date: '', technician: '', notes: '' });
      setFeatureId(''); setAsset(null); fetchMyRecords();
    }
    setSaving(false);
  };

  // Edit asset submission
  const handleEditSubmit = async () => {
    if (!editAsset) return;
    const proposed = {};
    if (editForm.condition_status !== editAsset.condition_status) proposed.condition_status = editForm.condition_status;
    if (editForm.inspector !== editAsset.inspector) proposed.inspector = editForm.inspector;
    if (editForm.last_inspection_date !== editAsset.last_inspection_date) proposed.last_inspection_date = editForm.last_inspection_date;
    if (editForm.depth !== editAsset.depth) proposed.depth = parseFloat(editForm.depth);
    if (editForm.invert_level !== editAsset.invert_level) proposed.invert_level = parseFloat(editForm.invert_level);
    if (editForm.ground_level !== editAsset.ground_level) proposed.ground_level = parseFloat(editForm.ground_level);

    if (Object.keys(proposed).length === 0) {
      setEditMessage('No changes to submit');
      return;
    }
    setEditSaving(true);
    const { error } = await supabase.from('asset_edits').insert([{
      feature_type: editAsset.table_name || (editAsset.hasOwnProperty('depth') ? 'manhole' : 'pipeline'),
      feature_id: editAsset.id,
      proposed_data: proposed,
      created_by: userId,
      status: 'pending'
    }]);
    if (error) setEditMessage(`❌ Error: ${error.message}`);
    else {
      setEditMessage('✅ Edit submitted for engineer approval.');
      setTimeout(() => { if (onClose) onClose(); }, 1500);
    }
    setEditSaving(false);
  };

  // Helper functions
  const getStatusStyle = (condition) => {
    if (!condition) return { color: '#6c757d', bg: '#e9ecef', label: 'Unknown' };
    const s = String(condition).toLowerCase();
    if (s === 'good' || s === 'normal') return { color: '#6f2da8', bg: '#e9d8fd', label: 'Normal' };
    if (s === 'fair' || s === 'pending') return { color: '#2e7d32', bg: '#c8e6c9', label: 'Pending' };
    if (s === 'poor' || s === 'critical' || s === 'blocked') return { color: '#c62828', bg: '#ffcdd2', label: 'Blocked' };
    return { color: '#6c757d', bg: '#e9ecef', label: s };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Styles (same as before, plus edit form styles)
  const styles = {
    container: {
      position: "absolute", top: "80px", right: "20px", width: "750px", maxWidth: "90vw",
      maxHeight: "calc(100vh - 100px)", backgroundColor: "white", borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, overflow: "hidden", display: "flex", flexDirection: "column"
    },
    header: {
      padding: "1rem", backgroundColor: "#ff9800", color: "white", fontWeight: "bold",
      display: "flex", justifyContent: "space-between", alignItems: "center"
    },
    closeBtn: { background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
    tabBar: { display: "flex", borderBottom: "1px solid #e0e0e0", backgroundColor: "#f8f9fa" },
    tab: { flex: 1, padding: "0.75rem", textAlign: "center", cursor: "pointer", fontWeight: "bold", borderBottom: "2px solid transparent" },
    activeTab: { borderBottom: "2px solid #ff9800", color: "#ff9800" },
    content: { padding: "1rem", overflowY: "auto", flex: 1 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
    th: { textAlign: "left", padding: "0.5rem", backgroundColor: "#f0f0f0", borderBottom: "1px solid #ddd" },
    td: { padding: "0.5rem", borderBottom: "1px solid #eee" },
    statusBadge: { display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "bold" },
    row: { marginBottom: "1rem" },
    label: { display: "block", fontWeight: "bold", marginBottom: "0.25rem", color: "#555" },
    input: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
    select: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
    textarea: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px" },
    readonly: { backgroundColor: "#f0f0f0", padding: "0.5rem", borderRadius: "6px", color: "#666" },
    button: { padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" },
    submitBtn: { backgroundColor: "#4caf50", color: "white", width: "100%" },
    message: { marginTop: "1rem", padding: "0.5rem", borderRadius: "4px", textAlign: "center" },
    recordItem: { border: "1px solid #eee", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem", backgroundColor: "#fafafa" },
    recordHeader: { display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" },
    recordStatus: { fontSize: "0.7rem", padding: "2px 8px", borderRadius: "12px", textTransform: "uppercase" },
    pendingBadge: { backgroundColor: "#ff9800", color: "white" },
    approvedBadge: { backgroundColor: "#4caf50", color: "white" },
    rejectedBadge: { backgroundColor: "#f44336", color: "white" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>🔧 Maintenance & Assets</span>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <div style={{ ...styles.tab, ...(activeTab === 'edit' ? styles.activeTab : {}) }} onClick={() => setActiveTab('edit')}>✏️ Edit Asset</div>
        <div style={{ ...styles.tab, ...(activeTab === 'assets' ? styles.activeTab : {}) }} onClick={() => setActiveTab('assets')}>📋 Asset List</div>
        <div style={{ ...styles.tab, ...(activeTab === 'requests' ? styles.activeTab : {}) }} onClick={() => setActiveTab('requests')}>📝 Maintenance Requests</div>
      </div>

      <div style={styles.content}>
        {/* Edit Asset Tab */}
        {activeTab === 'edit' && editAsset && (
          <>
            <h4>Edit Asset: {editAsset.id}</h4>
            <div style={styles.row}>
              <label style={styles.label}>Condition Status</label>
              <select style={styles.select} value={editForm.condition_status} onChange={e => setEditForm({...editForm, condition_status: e.target.value})}>
                <option value="">-- Select --</option>
                <option value="good">Good (Normal)</option>
                <option value="fair">Fair (Pending)</option>
                <option value="poor">Poor (Blocked)</option>
                <option value="critical">Critical (Blocked)</option>
              </select>
            </div>
            <div style={styles.row}>
              <label style={styles.label}>Inspector</label>
              <input style={styles.input} type="text" value={editForm.inspector} onChange={e => setEditForm({...editForm, inspector: e.target.value})} />
            </div>
            <div style={styles.row}>
              <label style={styles.label}>Inspection Date</label>
              <input style={styles.input} type="date" value={editForm.last_inspection_date} onChange={e => setEditForm({...editForm, last_inspection_date: e.target.value})} />
            </div>
            {editAsset.hasOwnProperty('depth') && (
              <>
                <div style={styles.row}>
                  <label style={styles.label}>Depth (m)</label>
                  <input style={styles.input} type="number" step="0.01" value={editForm.depth} onChange={e => setEditForm({...editForm, depth: e.target.value})} />
                </div>
                <div style={styles.row}>
                  <label style={styles.label}>Invert Level (m)</label>
                  <input style={styles.input} type="number" step="0.01" value={editForm.invert_level} onChange={e => setEditForm({...editForm, invert_level: e.target.value})} />
                </div>
                <div style={styles.row}>
                  <label style={styles.label}>Ground Level (m)</label>
                  <input style={styles.input} type="number" step="0.01" value={editForm.ground_level} onChange={e => setEditForm({...editForm, ground_level: e.target.value})} />
                </div>
              </>
            )}
            <button style={{ ...styles.button, ...styles.submitBtn }} onClick={handleEditSubmit} disabled={editSaving}>
              {editSaving ? 'Submitting...' : 'Submit for Approval'}
            </button>
            {editMessage && <div style={styles.message}>{editMessage}</div>}
          </>
        )}

        {/* Asset List Tab (same as before, but we'll keep it simple) */}
        {activeTab === 'assets' && (
          // ... your existing asset list JSX (manholes/pipelines table) ...
          <div>Asset list – reuse from previous version</div>
        )}

        {/* Maintenance Requests Tab (same as before) */}
        {activeTab === 'requests' && (
          // ... your existing maintenance request form and list ...
          <div>Maintenance requests – reuse from previous version</div>
        )}
      </div>
    </div>
  );
}
