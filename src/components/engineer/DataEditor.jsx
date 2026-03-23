import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function DataEditor({ feature, onSave, onCancel }) {
  const [formData, setFormData] = useState(feature || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isManhole = feature?.type === 'manhole';

  const handleSave = async () => {
    setSaving(true);
    try {
      const table = isManhole ? 'waste_water_manhole' : 'waste_water_pipeline';
      const { error } = await supabase
        .from(table)
        .update(formData)
        .eq('gid', feature.gid);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => onSave(), 800);
    } catch (error) {
      alert('Error saving: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const editableKeys = Object.keys(formData).filter(
    k => k !== 'gid' && k !== 'geom' && k !== 'type'
  );

  // Group fields for layout: pairs side by side
  const pairs = [];
  for (let i = 0; i < editableKeys.length; i += 2) {
    pairs.push(editableKeys.slice(i, i + 2));
  }

  return (
    <div className="eng-panel" style={{ '--panel-color-bg': 'rgba(79,110,247,0.12)', '--panel-color-border': 'rgba(79,110,247,0.3)' }}>
      {/* Header */}
      <div className="eng-panel-header">
        <div className="eng-panel-header-icon">✏️</div>
        <div>
          <div className="eng-panel-title">Edit {isManhole ? 'Manhole' : 'Pipeline'}</div>
          <div className="eng-panel-sub">GID: {feature?.gid ?? '—'}</div>
        </div>
        <button className="eng-panel-close" onClick={onCancel}>×</button>
      </div>

      {/* Body */}
      <div className="eng-panel-body">
        {/* Feature info row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
        }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 8,
            background: isManhole ? 'rgba(79,110,247,0.12)' : 'rgba(14,165,233,0.12)',
            border: `1px solid ${isManhole ? 'rgba(79,110,247,0.3)' : 'rgba(14,165,233,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {isManhole ? '🕳️' : '📏'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-pri)' }}>
              {isManhole ? 'Manhole' : 'Pipeline'} Record
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)', marginTop: 2 }}>
              Modify attributes below — changes sync to Supabase
            </div>
          </div>
        </div>

        <div className="eng-section-head">Attributes</div>

        {pairs.map((pair, pi) => (
          <div key={pi} className="eng-field-row" style={{ marginBottom: 10 }}>
            {pair.map(key => (
              <div key={key}>
                <label className="eng-label">{key.replace(/_/g, ' ')}</label>
                <input
                  className="eng-input"
                  value={formData[key] ?? ''}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        ))}

        {saved && (
          <div className="eng-status ok" style={{ marginTop: 8 }}>
            ✓ Saved successfully
          </div>
        )}

        <div className="eng-btn-row">
          <button className="eng-btn eng-btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="eng-btn eng-btn-primary"
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saving ? '⏳ Saving…' : saved ? '✓ Saved' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
