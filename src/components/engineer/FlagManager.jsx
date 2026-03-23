import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function FlagManager({ onFlagManaged, onClose }) {
  const [flaggedFeatures, setFlaggedFeatures] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedFeature, setSelected]  = useState(null);
  const [actionType, setActionType]     = useState('resolve');
  const [resolutionNote, setNote]       = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [stats, setStats]               = useState({ total: 0, resolved: 0, pending: 0 });
  const [working, setWorking]           = useState(false);

  useEffect(() => { fetchFlagged(); }, [filterType]);

  const fetchFlagged = async () => {
    setLoading(true);
    try {
      let manholes = [], pipelines = [];
      if (filterType !== 'pipelines') {
        const { data, error } = await supabase.from('waste_water_manhole').select('*').eq('flagged', true);
        if (!error) manholes = data.map(m => ({ ...m, feature_type: 'manhole' }));
      }
      if (filterType !== 'manholes') {
        const { data, error } = await supabase.from('waste_water_pipeline').select('*').eq('flagged', true);
        if (!error) pipelines = data.map(p => ({ ...p, feature_type: 'pipeline' }));
      }
      const all = [...manholes, ...pipelines];
      setFlaggedFeatures(all);
      const resolved = all.filter(f => f.flag_resolved).length;
      setStats({ total: all.length, resolved, pending: all.length - resolved });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedFeature) return;
    setWorking(true);
    try {
      const table = selectedFeature.feature_type === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
      const { error } = await supabase.from(table).update({
        flagged: false,
        flag_resolved: true,
        flag_resolved_at: new Date().toISOString(),
        flag_resolution_note: resolutionNote,
        flag_resolved_by: localStorage.getItem('user_id'),
      }).eq('gid', selectedFeature.gid);
      if (error) throw error;
      setSelected(null);
      setNote('');
      fetchFlagged();
      onFlagManaged?.();
    } catch (err) {
      alert('Error resolving flag: ' + err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFeature || !confirm(`Permanently delete this ${selectedFeature.feature_type}?`)) return;
    setWorking(true);
    try {
      const table = selectedFeature.feature_type === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
      const { error } = await supabase.from(table).delete().eq('gid', selectedFeature.gid);
      if (error) throw error;
      setSelected(null);
      fetchFlagged();
      onFlagManaged?.();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    } finally {
      setWorking(false);
    }
  };

  const getSevClass = (feature) => {
    if (feature.flag_resolved) return 'sev-resolved';
    if (feature.flag_severity === 'high')   return 'sev-high';
    if (feature.flag_severity === 'medium') return 'sev-medium';
    return 'sev-low';
  };

  const getSevLabel = (feature) => {
    if (feature.flag_resolved)              return 'Resolved';
    return feature.flag_severity || 'Low';
  };

  const filters = [
    { id: 'all',       label: 'All' },
    { id: 'manholes',  label: '🕳️ Manholes' },
    { id: 'pipelines', label: '📏 Pipelines' },
  ];

  return (
    <div className="eng-panel" style={{ '--panel-color-bg': 'rgba(245,158,11,0.1)', '--panel-color-border': 'rgba(245,158,11,0.3)' }}>
      {/* Header */}
      <div className="eng-panel-header">
        <div className="eng-panel-header-icon">🏁</div>
        <div>
          <div className="eng-panel-title">Flag Manager</div>
          <div className="eng-panel-sub">{stats.pending} pending · {stats.resolved} resolved</div>
        </div>
        <button className="eng-panel-close" onClick={onClose}>×</button>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', gap: 8 }}>
        {[
          { label: 'Total',    val: stats.total,    cls: 'blue' },
          { label: 'Pending',  val: stats.pending,  cls: stats.pending > 0 ? 'amber' : 'green' },
          { label: 'Resolved', val: stats.resolved, cls: 'green' },
        ].map(s => (
          <div key={s.label} className={`eng-stat-card ${s.cls}`} style={{ flex: 1 }}>
            <div className="sc-num">{s.val}</div>
            <div className="sc-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="eng-filter-tabs">
        {filters.map(f => (
          <button
            key={f.id}
            className={`eng-tab${filterType === f.id ? ' active' : ''}`}
            onClick={() => setFilterType(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="eng-panel-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-sec)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            ⟳ Loading flags…
          </div>
        ) : flaggedFeatures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: 13 }}>No flags found</div>
            <div style={{ color: 'var(--text-sec)', fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 4 }}>All clear for current filter</div>
          </div>
        ) : (
          flaggedFeatures.map(feature => (
            <div
              key={`${feature.feature_type}-${feature.gid}`}
              className={`eng-flag-item${selectedFeature?.gid === feature.gid ? ' selected' : ''}${feature.flag_resolved ? ' resolved' : ''}`}
              onClick={() => setSelected(feature)}
            >
              <div className="fi-top">
                <span className="fi-type">
                  {feature.feature_type === 'manhole' ? '🕳️' : '📏'}
                  {feature.feature_type === 'manhole' ? 'Manhole' : 'Pipeline'}
                </span>
                <span className={`sev-badge ${getSevClass(feature)}`}>{getSevLabel(feature)}</span>
              </div>
              <div className="fi-id">
                ID: {feature.manhole_id || feature.pipe_id || feature.gid}
              </div>
              <div className="fi-reason">
                🚩 {feature.flag_reason || 'No reason provided'}
              </div>
              <div className="fi-date">
                {feature.flagged_at ? new Date(feature.flagged_at).toLocaleString() : 'Unknown date'}
                {feature.flag_resolved && ` · ✓ ${feature.flag_resolution_note || 'Resolved'}`}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action panel */}
      {selectedFeature && !selectedFeature.flag_resolved && (
        <div className="eng-action-panel">
          <div className="ap-heading">
            Actions — {selectedFeature.feature_type} · ID {selectedFeature.manhole_id || selectedFeature.pipe_id || selectedFeature.gid}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['resolve', 'delete'].map(a => (
              <button
                key={a}
                className={`eng-btn ${a === 'resolve' ? 'eng-btn-success' : 'eng-btn-ghost'}`}
                style={{
                  flex: 1,
                  borderColor: actionType === a ? (a === 'resolve' ? 'var(--accent-green)' : 'var(--accent-red)') : undefined,
                  color: actionType === a && a === 'delete' ? 'var(--accent-red)' : undefined,
                }}
                onClick={() => setActionType(a)}
              >
                {a === 'resolve' ? '✓ Resolve' : '🗑 Delete'}
              </button>
            ))}
          </div>

          {actionType === 'resolve' && (
            <>
              <label className="eng-label">Resolution Note</label>
              <textarea
                className="eng-textarea"
                rows={2}
                placeholder="Describe how this was resolved…"
                value={resolutionNote}
                onChange={e => setNote(e.target.value)}
              />
              <div className="eng-btn-row">
                <button className="eng-btn eng-btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                <button className="eng-btn eng-btn-success" onClick={handleResolve} disabled={working}>
                  {working ? '⏳ Resolving…' : '✓ Confirm Resolution'}
                </button>
              </div>
            </>
          )}

          {actionType === 'delete' && (
            <div className="eng-btn-row">
              <button className="eng-btn eng-btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="eng-btn eng-btn-danger" onClick={handleDelete} disabled={working}>
                {working ? '⏳ Deleting…' : '🗑 Permanently Delete'}
              </button>
            </div>
          )}
        </div>
      )}

      {selectedFeature && selectedFeature.flag_resolved && (
        <div className="eng-action-panel">
          <div className="eng-resolved-notice">
            ✓ This flag has been resolved
            {selectedFeature.flag_resolution_note && (
              <p>{selectedFeature.flag_resolution_note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
