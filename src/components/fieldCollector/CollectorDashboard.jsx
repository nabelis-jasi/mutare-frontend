import React, { useState, useRef } from 'react';
import MapView from '../MapView';
import DataCollection from './DataCollection';
import FlagFeature from './FlagFeature';
import SyncData from './SyncData';
import CollectorHome from './CollectorHome';
import CollectorForm from './CollectorForm'/;

import CollectorProfilePanel from './CollectorProfilePanel';
import CollectorSettingsPanel from './CollectorSettingsPanel';

import './Collector.css';

export default function CollectorDashboard({
  manholes,
  pipes,
  userId,
  role,
  onDataRefresh,
  onLogout,
  userProfile
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  // ── PICK MODE ─────────────────────────────
  const [pickMode, setPickMode] = useState(false);
  const pickCallbackRef = useRef(null);

  const startMapPick = (cb) => {
    pickCallbackRef.current = cb;
    setPickMode(true);
    setActivePanel(null);
  };

  const handleMapClick = (lat, lng) => {
    if (pickCallbackRef.current) {
      pickCallbackRef.current(lat, lng);
      pickCallbackRef.current = null;
      setPickMode(false);
    }
  };

  const cancelMapPick = () => {
    pickCallbackRef.current = null;
    setPickMode(false);
  };

  const handleDataRefreshed = () => {
    onDataRefresh();
  };

  const toggle = (id) => setActivePanel(prev => prev === id ? null : id);

  const tools = [
    { id: 'home', icon: '🏠', label: 'Home', color: '#4aad4a' },
    { id: 'collect', icon: '📍', label: 'Collect', color: '#8fdc00' },
    { id: 'flag', icon: '🚩', label: 'Flag', color: '#f59e0b' },
    { id: 'sync', icon: '🔄', label: 'Sync', color: '#22d3ee' },
  ];

  return (
    <div className="wd-root">

      {/* ── TOP BAR ───────────────────────── */}
      <header className="wd-topbar">
        <div className="wd-brand">
          <div className="wd-brand-logo">🦺</div>
          <div>
            <div className="wd-brand-name">WWGIS</div>
            <div className="wd-brand-tagline">Field Collector · Wastewater Network</div>
          </div>
        </div>

        <div className="wd-topbar-sep" />

        <div className="wd-chips">
          <div className="wd-chip">
            <span className="dot dot-green" />{manholes?.length ?? 0} Manholes
          </div>
          <div className="wd-chip">
            <span className="dot dot-lime" />{pipes?.length ?? 0} Pipelines
          </div>

          {pickMode && (
            <div className="wd-chip" style={{
              borderColor: 'rgba(143,220,0,0.5)',
              color: '#8fdc00'
            }}>
              <span className="dot dot-lime" /> Pick Mode Active
            </div>
          )}
        </div>

        {/* ── ACTIONS (ENGINEER STYLE) ── */}
        <div className="wd-topbar-actions">

          <button
            className={`wd-icon-btn${activePanel === 'profile' ? ' active' : ''}`}
            onClick={() => toggle('profile')}
            title="Profile"
          >
            👤
          </button>

          <button
            className={`wd-icon-btn${activePanel === 'settings' ? ' active' : ''}`}
            onClick={() => toggle('settings')}
            title="Settings"
          >
            ⚙️
          </button>

          <button
            className="wd-icon-btn"
            onClick={onLogout}
            title="Logout"
          >
            ⎋
          </button>

          <div className="wd-role-pill">
            {role ?? 'field-collector'}
          </div>
        </div>
      </header>

      {/* ── MAP ───────────────────────── */}
      <div className="wd-map-wrap">
        <MapView
          manholes={manholes}
          pipes={pipes}
          role={role}
          userId={userId}
          onMapReady={setMapInstance}
          navPickMode={pickMode}
          onNavMapClick={handleMapClick}
        />
      </div>

      {/* ── LEFT TOOL RAIL ───────────── */}
      <nav className="wd-rail">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`wd-rail-btn${activePanel === t.id ? ' active' : ''}`}
            style={{ '--rail-color': t.color }}
            onClick={() => toggle(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── PANELS ───────────────────── */}

      {activePanel === 'home' && (
        <CollectorHome
          manholes={manholes}
          pipes={pipes}
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

      {/* 🔥 PROFILE PANEL */}
      {activePanel === 'profile' && (
        <CollectorProfilePanel
          userId={userId}
          role={role}
          userProfile={userProfile}
          onLogout={onLogout}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* 🔥 SETTINGS PANEL (YOUR CODE CONNECTED HERE) */}
      {activePanel === 'settings' && (
        <CollectorSettingsPanel
          onClose={() => setActivePanel(null)}
        />
      )}

    </div>
  );
}
