// src/components/fieldCollector/SyncData.jsx
import React, { useState, useEffect } from 'react';
import api from "../../api/api"; // adjust path

export default function SyncData({ userId, onSyncComplete, onClose }) {
  const [syncing,   setSyncing]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState('');
  const [stCls,     setStCls]     = useState('info');
  const [queue,     setQueue]     = useState([]);
  const [flagQueue, setFlagQueue] = useState([]);
  const [history,   setHistory]   = useState([]);

  useEffect(() => { loadQueues(); }, []);

  const loadQueues = () => {
    try {
      const q  = JSON.parse(localStorage.getItem('pending_sync')  || '[]');
      const fq = JSON.parse(localStorage.getItem('pending_flags') || '[]');
      const h  = JSON.parse(localStorage.getItem('sync_history')  || '[]');
      setQueue(q); setFlagQueue(fq); setHistory(h);
    } catch { /* */ }
  };

  const totalPending = queue.length + flagQueue.length;

  const handleSync = async () => {
    if (totalPending === 0) {
      setStatus('No pending items — all up to date.'); setStCls('ok'); return;
    }
    setSyncing(true); setProgress(0); setStatus('Starting sync…'); setStCls('info');

    let done = 0;
    const total = totalPending;
    const errors = [];

    // ── Sync data features (manholes / pipelines) ─────────────────────────────
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const endpoint = item.type === 'manhole' ? '/manholes' : '/pipelines';
        await api.post(endpoint, item.data);
        done++;
        setProgress(Math.round((done / total) * 80));
        setStatus(`Syncing ${item.type}s… (${done}/${total})`);
      } catch (e) {
        errors.push(`${item.type}: ${e.response?.data?.error || e.message}`);
      }
    }

    // ── Sync flag updates ──────────────────────────────────────────────
    for (let i = 0; i < flagQueue.length; i++) {
      const item = flagQueue[i];
      try {
        // Determine endpoint: /manholes/{gid} or /pipelines/{gid}
        const endpoint = item.table === 'waste_water_manhole' 
          ? `/manholes/${item.gid}` 
          : `/pipelines/${item.gid}`;
        await api.put(endpoint, item.updates);
        done++;
        setProgress(Math.round((done / total) * 80));
        setStatus(`Syncing flags… (${done}/${total})`);
      } catch (e) {
        errors.push(`flag: ${e.response?.data?.error || e.message}`);
      }
    }

    setProgress(90);
    setStatus('Refreshing remote data…');

    // ── Clear successful syncs ─────────────────────────────────────────
    if (errors.length === 0) {
      localStorage.setItem('pending_sync',  '[]');
      localStorage.setItem('pending_flags', '[]');
    }

    setProgress(100);

    const record = {
      timestamp: new Date().toISOString(),
      features:  queue.length,
      flags:     flagQueue.length,
      errors:    errors.length,
      userId,
    };
    const newHistory = [record, ...history].slice(0, 10);
    localStorage.setItem('sync_history', JSON.stringify(newHistory));
    setHistory(newHistory);

    if (errors.length > 0) {
      setStatus(`⚠️ ${done} synced, ${errors.length} failed. Check connection.`);
      setStCls('warn');
    } else {
      setStatus(`✓ All ${done} item${done !== 1 ? 's' : ''} synced successfully.`);
      setStCls('ok');
    }

    loadQueues();
    setSyncing(false);
    onSyncComplete?.();
  };

  const clearQueue = () => {
    if (!confirm('Discard all pending local data? This cannot be undone.')) return;
    localStorage.setItem('pending_sync',  '[]');
    localStorage.setItem('pending_flags', '[]');
    loadQueues();
    setStatus('Queue cleared.'); setStCls('warn');
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000)   return `${Math.round(diff/1000)}s ago`;
    if (diff < 3600000) return `${Math.round(diff/60000)}m ago`;
    return `${Math.round(diff/3600000)}h ago`;
  };

  return (
    <div className="fc-panel right" style={{ width: 380, bottom: 98, right: 14, left: 'auto', transform: 'none', animation: 'fc-panel-right-in 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="fc-panel-header" style={{ '--panel-icon-bg': 'rgba(34,211,238,0.08)', '--panel-icon-border': 'rgba(34,211,238,0.25)' }}>
        <div className="fc-panel-icon">🔄</div>
        <div>
          <div className="fc-panel-title">Sync Data</div>
          <div className="fc-panel-sub">Upload collected field data to server</div>
        </div>
        <button className="fc-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="fc-panel-body">

        {/* Stats */}
        <div className="fc-field-stats">
          <div className={`fc-fstat ${totalPending > 0 ? 'amber' : 'green'}`}>
            <div className="fs-num">{totalPending}</div>
            <div className="fs-lbl">Pending</div>
          </div>
          <div className={`fc-fstat ${queue.length > 0 ? 'lime' : 'green'}`}>
            <div className="fs-num">{queue.length}</div>
            <div className="fs-lbl">Features</div>
          </div>
          <div className={`fc-fstat ${flagQueue.length > 0 ? 'amber' : 'green'}`}>
            <div className="fs-num">{flagQueue.length}</div>
            <div className="fs-lbl">Flags</div>
          </div>
        </div>

        {/* Connection info */}
        <div className="fc-gps-ring">
          <div className="gr-dot" />
          <div className="gr-text">
            {navigator.onLine ? 'Online — ready to sync' : 'Offline — data will queue locally'}
          </div>
        </div>

        {/* Progress */}
        {syncing && (
          <>
            <div className="fc-progress-track">
              <div className="fc-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(122,184,122,0.7)', marginBottom: 8 }}>
              {progress}%
            </div>
          </>
        )}

        {status && <div className={`fc-status ${stCls}`}>{status}</div>}

        {/* Queue preview */}
        {queue.length > 0 && (
          <>
            <div className="fc-section">Pending Features</div>
            {queue.slice(0, 4).map((item, i) => (
              <div key={i} className="fc-queue-card">
                <div className="qc-icon">{item.type === 'manhole' ? '🕳️' : '📏'}</div>
                <div className="qc-info">
                  <div className="qc-title">{item.type === 'manhole' ? 'Manhole' : 'Pipeline'}</div>
                  <div className="qc-meta">
                    Queued {timeAgo(item.queuedAt || new Date().toISOString())}
                  </div>
                </div>
                <span className="qc-status pending">Pending</span>
              </div>
            ))}
            {queue.length > 4 && (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(122,184,122,0.5)', textAlign: 'center', padding: '4px 0', marginBottom: 8 }}>
                +{queue.length - 4} more pending…
              </div>
            )}
          </>
        )}

        {flagQueue.length > 0 && (
          <>
            <div className="fc-section">Pending Flags</div>
            {flagQueue.slice(0, 3).map((item, i) => (
              <div key={i} className="fc-queue-card">
                <div className="qc-icon">🚩</div>
                <div className="qc-info">
                  <div className="qc-title">Flag — GID {item.gid}</div>
                  <div className="qc-meta">{item.updates?.flag_severity} severity · {timeAgo(item.queuedAt || new Date().toISOString())}</div>
                </div>
                <span className="qc-status pending">Pending</span>
              </div>
            ))}
          </>
        )}

        {totalPending === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4aad4a' }}>
              All synced
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(122,184,122,0.6)', marginTop: 4 }}>
              No pending data — queue is empty
            </div>
          </div>
        )}

        {/* Sync history */}
        {history.length > 0 && (
          <>
            <div className="fc-section" style={{ marginTop: 20 }}>Sync History</div>
            {history.slice(0, 4).map((h, i) => (
              <div key={i} className="fc-queue-card" style={{ marginBottom: 6 }}>
                <div className="qc-icon">📡</div>
                <div className="qc-info">
                  <div className="qc-title">{h.features} features · {h.flags} flags</div>
                  <div className="qc-meta">{new Date(h.timestamp).toLocaleString()}</div>
                </div>
                <span className={`qc-status ${h.errors > 0 ? 'error' : 'synced'}`}>
                  {h.errors > 0 ? `${h.errors} err` : 'Done'}
                </span>
              </div>
            ))}
          </>
        )}

        {/* Actions */}
        <div className="fc-btn-row" style={{ marginTop: 16 }}>
          {totalPending > 0 && (
            <button className="fc-btn fc-btn-ghost" onClick={clearQueue} disabled={syncing}
              style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
              🗑 Clear
            </button>
          )}
          <button className="fc-btn fc-btn-lime" onClick={handleSync} disabled={syncing}>
            {syncing ? `⏳ ${progress}%…` : totalPending > 0 ? `🔄 Sync ${totalPending} Items` : '🔄 Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
