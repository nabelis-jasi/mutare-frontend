import React, { useState, useRef, useEffect } from 'react';
import MapView from '../MapView';
import DataCollection from './DataCollection';
import FlagFeature from './FlagFeature';
import SyncData from './SyncData';
import CollectorHome from './CollectorHome';
import './Collector.css';

export default function CollectorDashboard({ manholes, pipes, userId, role, onDataRefresh, onLogout }) {
  const [activePanel, setActivePanel] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  // ── Profile dropdown ─────────────────────────────
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Map pick-mode ───────────────────────────────
  const [pickMode, setPickMode] = useState(false);
  const [pickCallback, setPickCb] = useState(null);

  const [pendingCount, setPendingCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pending_sync') || '[]').length; } catch { return 0; }
  });

  const refreshPending = () => {
    try { setPendingCount(JSON.parse(localStorage.getItem('pending_sync') || '[]').length); } catch {}
  };

  const handleDataRefreshed = () => {
    refreshPending();
    onDataRefresh();
  };

  const toggle = (id) => setActivePanel(prev => prev === id ? null : id);

  const startMapPick = (cb) => {
    setPickCb(() => cb);
    setPickMode(true);
    setActivePanel(null);
  };

  const cancelMapPick = () => {
    setPickMode(false);
    setPickCb(null);
  };

  const handleNavMapClick = (lat, lng) => {
    if (pickCallback) {
      pickCallback(lat, lng);
      setPickMode(false);
      setPickCb(null);
      setActivePanel(prev => prev ?? 'collect');
    }
  };

  const tools = [
    { id: 'home',    icon: '🏠', label: 'Home',    color: '#4aad4a' },
    { id: 'collect', icon: '📍', label: 'Collect', color: '#8fdc00' },
    { id: 'flag',    icon: '🚩', label: 'Flag',    color: '#f59e0b' },
    { id: 'sync',    icon: '🔄', label: 'Sync',    color: '#22d3ee', badge: pendingCount },
  ];

  return (
    <div className="fc-root">

      {/* ── TOP BAR ───────────────────────────────── */}
      <header className="fc-topbar">
        <div className="wd-brand">
          <div className="wd-brand-logo">🦺</div>
          <div>
            <div className="wd-brand-name">WWGIS</div>
            <div className="wd-brand-tagline">Field Collector · Wastewater Network</div>
          </div>
        </div>

        <div className="wd-topbar-sep" />

        <div className="wd-chips">
          <div className="wd-chip"><span className="dot dot-green" />{manholes?.length ?? 0} Manholes</div>
          <div className="wd-chip"><span className="dot dot-lime" />{pipes?.length ?? 0} Pipelines</div>

          {pickMode && (
            <div className="wd-chip" style={{ borderColor: 'rgba(143,220,0,0.5)', color: '#8fdc00' }}>
              <span className="dot dot-lime" /> Pick Mode
            </div>
          )}
        </div>

        {/* ── PROFILE / LOGOUT ───────────────────── */}
        <div className="wd-topbar-actions" style={{ position: 'relative' }} ref={menuRef}>

          <button
            className="wd-icon-btn"
            onClick={() => setShowMenu(prev => !prev)}
            title="Profile"
          >
            👤
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '115%',
              right: 0,
              background: 'rgba(15,23,42,0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              minWidth: 160,
              overflow: 'hidden',
              boxShadow: '0 15px 35px rgba(0,0,0,0.35)',
              zIndex: 999
            }}>

              <div style={{
                padding: '10px 14px',
                fontSize: 11,
                color: '#94a3b8',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {role ?? 'Field Collector'}
              </div>

              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                ⎋ Logout
              </button>

            </div>
          )}

        </div>
      </header>

      {/* ── MAP ─────────────────────────────────── */}
      <div className="fc-map-wrap">
        <MapView
          manholes={manholes}
          pipes={pipes}
          role={role}
          userId={userId}
          onMapReady={setMapInstance}
          navPickMode={pickMode}
          onNavMapClick={handleNavMapClick}
        />
      </div>

      {/* ── PICK MODE INDICATOR ─────────────────── */}
      {pickMode && (
        <div className="fc-mode-indicator">
          <div className="mi-dot" />
          <span className="mi-text">Click map to place point</span>
          <button onClick={cancelMapPick}>Cancel</button>
        </div>
      )}

      {/* ── PANELS ─────────────────────────────── */}
      {activePanel === 'home' && (
        <CollectorHome
          manholes={manholes}
          pipes={pipes}
          pendingCount={pendingCount}
          onClose={() => setActivePanel(null)}
          onNavigate={toggle}
        />
      )}

      {activePanel === 'collect' && (
        <DataCollection
          userId={userId}
          map={mapInstance}
          onDataCollected={handleDataRefreshed}
          onClose={() => setActivePanel(null)}
          onStartMapPick={startMapPick}
          onCancelMapPick={cancelMapPick}
        />
      )}

      {activePanel === 'flag' && (
        <FlagFeature
          userId={userId}
          manholes={manholes}
          pipes={pipes}
          map={mapInstance}
          onFeatureFlagged={handleDataRefreshed}
          onClose={() => setActivePanel(null)}
          onStartMapPick={startMapPick}
        />
      )}

      {activePanel === 'sync' && (
        <SyncData
          userId={userId}
          onSyncComplete={handleDataRefreshed}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* ── BOTTOM DOCK ────────────────────────── */}
      <nav className="fc-dock">
        {tools.map((t, i) => (
          <button
            key={t.id}
            className={`fc-dock-btn${activePanel === t.id ? ' active' : ''}`}
            onClick={() => toggle(t.id)}
          >
            {t.badge > 0 && <span className="db-badge">{t.badge}</span>}
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
