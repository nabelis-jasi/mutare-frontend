// src/components/engineer/FormList.jsx
import React, { useEffect, useState } from 'react';
import api from "../../api/api"; // adjust path to your api.js

export default function FormList({ onSelectForm, onClose, onCreateNew }) {
  const [forms,   setForms]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      const res = await api.get('/forms');
      setForms(res.data || []);
    } catch (err) {
      console.error('Error fetching forms', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (e, form) => {
    e.stopPropagation();
    try {
      await api.put(`/forms/${form.id}`, { is_active: !form.is_active });
      await fetchForms();
    } catch (err) {
      console.error('Error toggling active status', err);
    }
  };

  return (
    <div className="wd-panel" style={{ '--panel-icon-bg': 'rgba(143,220,0,0.1)', '--panel-icon-border': 'rgba(143,220,0,0.3)' }}>
      <div className="wd-panel-header">
        <div className="wd-panel-icon">📝</div>
        <div>
          <div className="wd-panel-title">Forms</div>
          <div className="wd-panel-sub">Create · Edit · Assign to collectors</div>
        </div>
        <button className="wd-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="wd-panel-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-sec)' }}>
            ⟳ Loading forms…
          </div>
        ) : forms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-sec)' }}>
              No forms yet
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              Create your first data collection form below
            </div>
          </div>
        ) : (
          forms.map(form => (
            <div
              key={form.id}
              className={`wd-form-item${!form.is_active ? ' inactive' : ''}`}
              onClick={() => onSelectForm(form)}
            >
              <div className="fi-icon">📋</div>
              <div className="fi-body">
                <div className="fi-title">{form.title}</div>
                {form.description && <div className="fi-desc">{form.description}</div>}
                <div className="fi-meta">
                  <span className={`fi-badge ${form.is_active ? 'active' : 'inactive'}`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
                    {new Date(form.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => toggleActive(e, form)}
                title={form.is_active ? 'Deactivate' : 'Activate'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 15, padding: '2px 4px', flexShrink: 0,
                  color: form.is_active ? 'var(--accent-primary)' : 'var(--text-dim)',
                  transition: 'color 0.15s',
                }}
              >
                {form.is_active ? '●' : '○'}
              </button>
              <span className="fi-arrow">›</span>
            </div>
          ))
        )}

        <button className="wd-btn wd-btn-lime" style={{ width: '100%', marginTop: 8 }} onClick={onCreateNew}>
          + New Form
        </button>
      </div>
    </div>
  );
}
