// src/components/engineer/PendingEdits.jsx
import React, { useEffect, useState } from 'react';
import api from "../../api/api"; // adjust path

export default function PendingEdits({ onClose, onEditProcessed }) {
  const [edits,      setEdits]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState(null);
  const [expanded,   setExpanded]   = useState(null);
  const [stats,      setStats]      = useState({ total: 0, manholes: 0, pipelines: 0 });

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/asset-edits');
      const rows = res.data || [];
      setEdits(rows);
      setStats({
        total:     rows.length,
        manholes:  rows.filter(e => e.feature_type === 'manhole').length,
        pipelines: rows.filter(e => e.feature_type === 'pipeline').length,
      });
    } catch (err) {
      console.error('Error fetching pending edits:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveEdit = async (edit) => {
    setProcessing(edit.id);
    try {
      await api.put(`/asset-edits/${edit.id}/approve`);
      await fetchPending();
      onEditProcessed?.();
    } catch (err) {
      alert(`Approval failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const rejectEdit = async (edit) => {
    if (!confirm('Reject this proposed edit?')) return;
    setProcessing(edit.id);
    try {
      // You need a reject endpoint in the backend. If not, you can use a generic update.
      // Example: await api.put(`/asset-edits/${edit.id}`, { status: 'rejected' });
      // I'll assume you have a reject endpoint:
      await api.put(`/asset-edits/${edit.id}/reject`);
      await fetchPending();
      onEditProcessed?.();
    } catch (err) {
      alert(`Rejection failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const typeIcon = (t) => t === 'manhole' ? '🕳️' : '📏';

  return (
    <div className="wd-panel" style={{ '--panel-icon-bg': 'rgba(245,158,11,0.1)', '--panel-icon-border': 'rgba(245,158,11,0.3)' }}>

      {/* Header */}
      <div className="wd-panel-header">
        <div className="wd-panel-icon">📋</div>
        <div>
          <div className="wd-panel-title">Pending Asset Edits</div>
          <div className="wd-panel-sub">
            {loading ? 'Loading…' : `${stats.total} pending · ${stats.manholes} manholes · ${stats.pipelines} pipelines`}
          </div>
        </div>
        <button className="wd-panel-close" onClick={onClose}>×</button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10,31,10,0.4)',
          display: 'flex',
          gap: 8,
        }}>
          {[
            { lbl: 'Total',     val: stats.total,     cls: stats.total > 0 ? 'amber' : 'green' },
            { lbl: 'Manholes',  val: stats.manholes,  cls: 'green' },
            { lbl: 'Pipelines', val: stats.pipelines, cls: 'sky'   },
          ].map(s => (
            <div key={s.lbl} className={`wd-stat ${s.cls}`} style={{ flex: 1 }}>
              <div className="s-num">{s.val}</div>
              <div className="s-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="wd-panel-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-sec)' }}>
            ⟳ Loading pending edits…
          </div>
        ) : edits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)' }}>
              All clear
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              No pending asset edits at this time
            </div>
          </div>
        ) : (
          edits.map(edit => {
            const isOpen = expanded === edit.id;
            const busy   = processing === edit.id;
            return (
              <div key={edit.id} className="wd-edit-item">
                <div className="ei-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 18 }}>{typeIcon(edit.feature_type)}</span>
                    <div>
                      <div className="ei-type">
                        {edit.feature_type === 'manhole' ? 'Manhole' : 'Pipeline'} Edit
                      </div>
                      <div className="ei-id">Feature ID: {edit.feature_id}</div>
                    </div>
                  </div>
                  <span className={`wd-edit-type-chip ${edit.feature_type}`}>
                    {edit.feature_type}
                  </span>
                </div>

                <div className="ei-time">
                  🕐 Submitted {new Date(edit.created_at).toLocaleString()}
                  {edit.submitted_by && ` · by ${edit.submitted_by.slice(0, 8)}…`}
                </div>

                <button
                  onClick={() => setExpanded(isOpen ? null : edit.id)}
                  style={{
                    background: 'none', border: 'none',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-sec)', cursor: 'pointer',
                    padding: '3px 0', marginBottom: isOpen ? 8 : 10,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isOpen ? '▲ Hide proposed changes' : '▼ View proposed changes'}
                </button>

                {isOpen && (
                  <div className="ei-data">
                    {JSON.stringify(edit.proposed_data, null, 2)}
                  </div>
                )}

                <div className="wd-edit-actions">
                  <button
                    className="wd-btn wd-btn-primary"
                    onClick={() => approveEdit(edit)}
                    disabled={busy}
                  >
                    {busy ? '⏳' : '✓ Approve'}
                  </button>
                  <button
                    className="wd-btn wd-btn-danger"
                    onClick={() => rejectEdit(edit)}
                    disabled={busy}
                  >
                    {busy ? '⏳' : '✗ Reject'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
