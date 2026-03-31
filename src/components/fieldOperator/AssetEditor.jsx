import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AssetEditor({ userId, onEditSubmitted, onCancel, initialFeatureType = 'manhole', initialFeatureId = '' }) {
  const [featureType, setFeatureType] = useState(initialFeatureType);
  const [featureId, setFeatureId] = useState(initialFeatureId);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editableData, setEditableData] = useState({
    inspector: '',
    last_inspection_date: '',
    condition_status: '',
    location_lat: '',
    location_lng: '',
    // Additional manhole fields
    depth: '',
    invert_level: '',
    ground_level: ''
  });

  // Fetch asset when featureId changes
  useEffect(() => {
    if (featureId && featureId.trim() !== '') {
      fetchAsset();
    } else {
      setAsset(null);
      resetEditable();
    }
  }, [featureId, featureType]);

  const fetchAsset = async () => {
    setLoading(true);
    const table = featureType === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', featureId)
      .single();
    if (error) {
      setAsset(null);
      setMessage('❌ Asset not found');
    } else {
      setAsset(data);
      // Populate editable fields with current values
      setEditableData({
        inspector: data.inspector || '',
        last_inspection_date: data.last_inspection_date || '',
        condition_status: data.condition_status || '',
        location_lat: data.location?.coordinates?.[1] || '',
        location_lng: data.location?.coordinates?.[0] || '',
        depth: data.depth || '',
        invert_level: data.invert_level || '',
        ground_level: data.ground_level || ''
      });
      setMessage('');
    }
    setLoading(false);
  };

  const resetEditable = () => {
    setEditableData({
      inspector: '',
      last_inspection_date: '',
      condition_status: '',
      location_lat: '',
      location_lng: '',
      depth: '',
      invert_level: '',
      ground_level: ''
    });
  };

  const handleChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!asset) {
      setMessage('No asset selected');
      return;
    }

    // Build the proposed changes (only editable fields)
    const proposed = {
      inspector: editableData.inspector,
      last_inspection_date: editableData.last_inspection_date,
      condition_status: editableData.condition_status,
      location: editableData.location_lat && editableData.location_lng
        ? `POINT(${editableData.location_lng} ${editableData.location_lat})`
        : null
    };

    // Add manhole-specific fields if applicable
    if (featureType === 'manhole') {
      if (editableData.depth !== '') proposed.depth = parseFloat(editableData.depth);
      if (editableData.invert_level !== '') proposed.invert_level = parseFloat(editableData.invert_level);
      if (editableData.ground_level !== '') proposed.ground_level = parseFloat(editableData.ground_level);
    }

    // Remove nulls (don't update if empty)
    Object.keys(proposed).forEach(key => {
      if (proposed[key] === '' || proposed[key] === null) delete proposed[key];
    });

    if (Object.keys(proposed).length === 0) {
      setMessage('No changes to submit');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('asset_edits')
      .insert([{
        feature_type: featureType,
        feature_id: featureId,
        proposed_data: proposed,
        created_by: userId,
        status: 'pending'
      }]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage('✅ Edit submitted for approval. Engineer will review.');
      if (onEditSubmitted) onEditSubmitted();
    }
    setSaving(false);
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "500px",
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
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeBtn: { background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
    content: { padding: "1rem", maxHeight: "70vh", overflowY: "auto" },
    row: { marginBottom: "1rem" },
    label: { display: "block", fontWeight: "bold", marginBottom: "0.25rem", color: "#555" },
    input: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
    select: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
    readonly: { backgroundColor: "#f0f0f0", padding: "0.5rem", borderRadius: "6px", color: "#666" },
    button: { padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" },
    submitBtn: { backgroundColor: "#4caf50", color: "white", width: "100%" },
    message: { marginTop: "1rem", padding: "0.5rem", borderRadius: "4px", textAlign: "center" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>✏️ Edit Asset</span>
        <button style={styles.closeBtn} onClick={onCancel}>✕</button>
      </div>
      <div style={styles.content}>
        <div style={styles.row}>
          <label style={styles.label}>Asset Type</label>
          <select
            style={styles.select}
            value={featureType}
            onChange={(e) => { setFeatureType(e.target.value); setFeatureId(''); setAsset(null); }}
          >
            <option value="manhole">Manhole</option>
            <option value="pipeline">Pipeline</option>
          </select>
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Asset ID</label>
          <input
            style={styles.input}
            type="text"
            placeholder={`Enter ${featureType} ID`}
            value={featureId}
            onChange={(e) => setFeatureId(e.target.value)}
          />
        </div>

        {loading && <div>Loading asset...</div>}

        {asset && (
          <>
            <div style={styles.row}>
              <label style={styles.label}>Current Location (read‑only)</label>
              <div style={styles.readonly}>
                {asset.location ? `${asset.location.coordinates[1]}, ${asset.location.coordinates[0]}` : 'Not set'}
              </div>
            </div>

            <div style={styles.row}>
              <label style={styles.label}>New Location (optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  style={{ ...styles.input, width: '50%' }}
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={editableData.location_lat}
                  onChange={(e) => handleChange('location_lat', e.target.value)}
                />
                <input
                  style={{ ...styles.input, width: '50%' }}
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={editableData.location_lng}
                  onChange={(e) => handleChange('location_lng', e.target.value)}
                />
              </div>
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Inspector</label>
              <input
                style={styles.input}
                type="text"
                value={editableData.inspector}
                onChange={(e) => handleChange('inspector', e.target.value)}
              />
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Inspection Date</label>
              <input
                style={styles.input}
                type="date"
                value={editableData.last_inspection_date}
                onChange={(e) => handleChange('last_inspection_date', e.target.value)}
              />
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Condition Status</label>
              <select
                style={styles.select}
                value={editableData.condition_status}
                onChange={(e) => handleChange('condition_status', e.target.value)}
              >
                <option value="">-- Select --</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {featureType === 'manhole' && (
              <>
                <div style={styles.row}>
                  <label style={styles.label}>Depth (m)</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={editableData.depth}
                    onChange={(e) => handleChange('depth', e.target.value)}
                  />
                </div>
                <div style={styles.row}>
                  <label style={styles.label}>Invert Level (m)</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={editableData.invert_level}
                    onChange={(e) => handleChange('invert_level', e.target.value)}
                  />
                </div>
                <div style={styles.row}>
                  <label style={styles.label}>Ground Level (m)</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={editableData.ground_level}
                    onChange={(e) => handleChange('ground_level', e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              style={{ ...styles.button, ...styles.submitBtn }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </>
        )}

        {message && (
          <div style={{ ...styles.message, backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da', color: message.includes('✅') ? '#155724' : '#721c24' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
