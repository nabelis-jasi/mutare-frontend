import React, { useState, useRef } from 'react';
import MapView from '../MapView';
import StatusUpdater from './StatusUpdater';
import MaintenanceRecords from './MaintenanceRecords';
import NavigationTool from '../engineer/NavigationTool';   // adjust path if needed
import OperatorProfilePanel from './OperatorProfilePanel';
import OperatorSettingsPanel from './OperatorSettingsPanel';
import './Dashboard.css';

export default function OperatorDashboard({ manholes, pipes, userId, role, onDataRefresh }) {
  const [activePanel, setActivePanel] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [navPickMode, setNavPickMode] = useState(false);

  const handlePickModeChange = (active, idx) => {
    setNavPickMode(active);
  };

  const handleNavMapClick = async (lat, lng) => {
    if (NavigationTool.handleMapClick) {
      await NavigationTool.handleMapClick(lat, lng);
    }
    setNavPickMode(false);
  };

  const togglePanel = (panelId) => {
    setActivePanel(prev => (prev === panelId ? null : panelId));
    if (activePanel === panelId) setNavPickMode(false);
  };

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    setActivePanel('maintenance');
  };

  const handleStatusUpdateComplete = () => {
    if (onDataRefresh) onDataRefresh();
    setActivePanel(null);
    setSelectedFeature(null);
  };

  const handleMaintenanceClose = () => {
    setActivePanel(null);
    setSelectedFeature(null);
    if (onDataRefresh) onDataRefresh();
  };

  // Left rail tools – only core tools, profile/settings are in header
  const tools = [
    { id: 'status', label: 'STATUS', desc: 'Update manhole/pipeline condition', icon: '📝', color: 'var(--accent-primary)' },
    { id: 'nav', label: 'NAV', desc: 'GPS routing', icon: '🧭', color: '#22d3ee' },
    { id: 'maintenance', label: 'MAINT', desc: 'View maintenance history & schedule', icon: '🔧', color: 'var(--accent-amber)' },
  ];

  return (
    <div className="wd-root">
      {/* TOP BAR */}
      <header className="wd-topbar">
        <div className="wd-brand">
          <div className="wd-brand-logo">🪣</div>
          <div>
            <div className="wd-brand-name">WWGIS</div>
            <div className="wd-brand-tagline">Wastewater Network</div>
          </div>
        </div>

        <div className="wd-topbar-sep" />

        <div className="wd-chips">
          <div className="wd-chip"><span className="dot dot-green" />{manholes?.length ?? 0} Manholes</div>
          <div className="wd-chip"><span className="dot dot-lime" />{pipes?.length ?? 0} Pipelines</div>
          <div className="wd-chip"><span className="dot dot-amber" />Live</div>
          {navPickMode && (
            <div className="wd-chip" style={{ borderColor: 'rgba(143,220,0,0.5)', color: '#8fdc00', animation: 'pulse-dot 0.8s infinite' }}>
              <span className="dot dot-lime" style={{ animationDuration: '0.5s' }} />Pick Mode Active
            </div>
          )}
        </div>

        <div className="wd-topbar-actions">
          <button
            className={`wd-icon-btn ${activePanel === 'profile' ? 'active' : ''}`}
            onClick={() => togglePanel('profile')}
            title="User Profile"
          >👤</button>
          <button
            className={`wd-icon-btn ${activePanel === 'settings' ? 'active' : ''}`}
            onClick={() => togglePanel('settings')}
            title="Settings"
          >⚙️</button>
          <div className="wd-role-pill">{role ?? 'Field Operator'}</div>
        </div>
      </header>

      {/* MAP */}
      <div className="wd-map-wrap">
        <MapView
          manholes={manholes}
          pipes={pipes}
          role={role}
          userId={userId}
          onFeatureClick={handleFeatureClick}
          onMapReady={setMapInstance}
          navPickMode={navPickMode}
          onNavMapClick={handleNavMapClick}
        />
      </div>

      {/* LEFT RAIL – only status, nav, maintenance */}
      <nav className="wd-rail">
        {tools.map((tool, index) => (
          <React.Fragment key={tool.id}>
            {index === 1 && <div className="wd-rail-sep" />}
            <button
              className={`wd-rail-btn ${activePanel === tool.id ? 'active' : ''}`}
              style={{ '--rail-color': tool.color }}
              onClick={() => {
                if (tool.id === 'maintenance') setSelectedFeature(null);
                togglePanel(tool.id);
              }}
              title={`${tool.label} — ${tool.desc}`}
            >
              <span style={{ fontSize: 18, lineHeight: 1, display: 'block' }}>{tool.icon}</span>
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: activePanel === tool.id ? 'var(--text-pri)' : 'var(--text-dim)',
                marginTop: 2,
                lineHeight: 1,
                textAlign: 'center',
              }}>{tool.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* PANELS */}
      {activePanel === 'status' && (
        <div className="wd-panel">
          <div className="wd-panel-header">
            <div className="wd-panel-icon" style={{ '--panel-icon-bg': 'var(--glow-green)', '--panel-icon-border': 'var(--accent-primary)' }}>📝</div>
            <div>
              <div className="wd-panel-title">Update Status</div>
              <div className="wd-panel-sub">Report current condition</div>
            </div>
            <button className="wd-panel-close" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="wd-panel-body">
            <StatusUpdater onUpdateComplete={handleStatusUpdateComplete} />
          </div>
        </div>
      )}

      {activePanel === 'nav' && (
        <NavigationTool
          map={mapInstance}
          onClose={() => { setActivePanel(null); setNavPickMode(false); }}
          onPickModeChange={handlePickModeChange}
        />
      )}

      {activePanel === 'maintenance' && (
        <div className="wd-panel">
          <div className="wd-panel-header">
            <div className="wd-panel-icon" style={{ '--panel-icon-bg': 'var(--glow-amber)', '--panel-icon-border': 'var(--accent-amber)' }}>🔧</div>
            <div>
              <div className="wd-panel-title">Maintenance & Assets</div>
              <div className="wd-panel-sub">
                {selectedFeature ? (
                  <span style={{ fontWeight: 'bold', color: '#ff9800' }}>
                    ✏️ Editing: {selectedFeature.id} ({selectedFeature.hasOwnProperty('depth') ? 'Manhole' : 'Pipeline'})
                  </span>
                ) : (
                  'View assets or submit maintenance requests'
                )}
              </div>
            </div>
            <button className="wd-panel-close" onClick={handleMaintenanceClose}>✕</button>
          </div>
          <div className="wd-panel-body">
            <MaintenanceRecords
              userId={userId}
              selectedAsset={selectedFeature}
              onClose={handleMaintenanceClose}
            />
          </div>
        </div>
      )}

      {activePanel === 'profile' && (
        <OperatorProfilePanel
          userId={userId}
          role={role}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'settings' && (
        <OperatorSettingsPanel
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
