import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function DataEditor({ feature, onSave, onCancel }) {
  const [formData, setFormData] = useState(feature);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const table = feature.type === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
      const { error } = await supabase
        .from(table)
        .update(formData)
        .eq('gid', feature.gid);

      if (error) throw error;
      onSave();
    } catch (error) {
      alert('Error saving: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const styles = {
    container: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "500px",
      maxWidth: "90vw",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      zIndex: 2000,
      overflow: "hidden",
    },
    header: {
      padding: "1rem",
      backgroundColor: "#2196f3",
      color: "white",
      fontWeight: "bold",
      fontSize: "1.2rem",
    },
    content: {
      padding: "1.5rem",
      maxHeight: "70vh",
      overflow: "auto",
    },
    field: {
      marginBottom: "1rem",
    },
    label: {
      display: "block",
      marginBottom: "0.25rem",
      fontWeight: "500",
    },
    input: {
      width: "100%",
      padding: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ddd",
    },
    buttons: {
      display: "flex",
      gap: "1rem",
      marginTop: "1.5rem",
    },
    saveButton: {
      flex: 1,
      padding: "0.75rem",
      backgroundColor: "#4caf50",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    },
    cancelButton: {
      flex: 1,
      padding: "0.75rem",
      backgroundColor: "#dc3545",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        ✏️ Edit {feature.type === 'manhole' ? 'Manhole' : 'Pipeline'}
      </div>
      <div style={styles.content}>
        {Object.keys(formData).map(key => {
          if (key === 'gid' || key === 'geom' || key === 'type') return null;
          return (
            <div key={key} style={styles.field}>
              <label style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</label>
              <input
                style={styles.input}
                value={formData[key] || ''}
                onChange={(e) => setFormData({...formData, [key]: e.target.value})}
              />
            </div>
          );
        })}
        
        <div style={styles.buttons}>
          <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}