import React, { useState, useRef } from 'react';
import MapView from '../MapView';
import DataEditor from './DataEditor';
import ShapefileUploader from './ShapefileUploader';
import DataSync from './DataSync';
import FlagManager from './FlagManager';
import NavigationTool from './NavigationTool';
import HomePanel from './HomePanel';
import ProfilePanel from './ProfilePanel';
import SettingsPanel from './SettingsPanel';
import './Dashboard.css';
import FormBuilder from './FormBuilder';
import ReviewForm from './ReviewForm';

export default function EngineerDashboard({ manholes, pipes, userId, role, onDataRefresh, userProfile }) {
  const [activePanel,   setActivePanel]   = useState(null);
  const [selectedFeature, setFeature]     = useState(null);
  const [mapInstance,   setMapInstance]   = useState(null);

  // ── Navigation pick-mode bridge ────────────────────────────────────────
  // When NavigationTool wants the user to click the map, it calls
  // onPickModeChange(true, wpIndex). We set navPickMode which MapView
  // reads to change cursor + fire onNavMapClick on every map click.
  const [navPickMode,   setNavPickMode]   = useState(false);
  const navToolRef = useRef(null); // ref to call NavigationTool.handleMapClick

  const handlePickModeChange = (active, idx) => {
    setNavPickMode(active);
  };

  const handleNavMapClick = async (lat, lng) => {
    // Delegate to NavigationTool's static handler
    if (NavigationTool.handleMapClick) {
      await NavigationTool.handleMapClick(lat, lng);
    }
    setNavPickMode(false);
  };

  const handleFeatureClick = (feature) => {
    setFeature(feature);
    setActivePanel('editor');
  };

  const toggle = (id) => setActivePanel(prev => prev === id ? null : id);

  // ── Tool rail definitions ──────────────────────────────────────────────
  const tools = [
    { id: 'home',     icon: '🏠', label: 'Home',     color: '#4aad4a', desc: 'Overview & stats'    },
    { id: 'nav',      icon: '🧭', label: 'Navigate', color: '#22d3ee', desc: 'GPS routing'          },
    { id: 'editor',   icon: '✏️', label: 'Edit',     color: '#8fdc00', desc: 'Edit manhole/pipeline'},
    { id: 'uploader', icon: '📤', label: 'Upload',   color: '#4aad4a', desc: 'Import shapefile'     },
    { id: 'sync',     icon: '🔄', label: 'Sync',     color: '#22d3ee', desc: 'Push / pull data'     },
    { id: 'flags',    icon: '🚩', label: 'Flags',    color: '#f59e0b', desc: 'Review issues'        },
  ];

  return (
    <div className="wd-root">

      {/* ── TOP BAR ───────────────────────────────────────────────────── */}
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
          <div className="wd-chip"><span className="dot dot-lime"  />{pipes?.length    ?? 0} Pipelines</div>
          <div className="wd-chip"><span className="dot dot-amber" />Live</div>
          {navPickMode && (
            <div className="wd-chip" style={{ borderColor: 'rgba(143,220,0,0.5)', color: '#8fdc00', animation: 'pulse-dot 0.8s infinite' }}>
              <span className="dot dot-lime" style={{ animationDuration: '0.5s' }} /> Pick Mode Active
            </div>
          )}
        </div>

        <div className="wd-topbar-actions">
          <button className={`wd-icon-btn${activePanel === 'profile'  ? ' active' : ''}`}
            onClick={() => toggle('profile')}  title="User Profile">👤</button>
          <button className={`wd-icon-btn${activePanel === 'settings' ? ' active' : ''}`}
            onClick={() => toggle('settings')} title="Settings">⚙️</button>
          <div className="wd-role-pill">{role ?? 'Engineer'}</div>
        </div>
      </header>

      {/* ── MAP ───────────────────────────────────────────────────────── */}
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

      {/* ── LEFT RAIL — with labels for new users ─────────────────────── */}
      <nav className="wd-rail">
        {tools.map((t, i) => (
          <React.Fragment key={t.id}>
            {i === 2 && <div className="wd-rail-sep" />}
            <button
              className={`wd-rail-btn${activePanel === t.id ? ' active' : ''}`}
              style={{ '--rail-color': t.color }}
              onClick={() => toggle(t.id)}
              title={`${t.label} — ${t.desc}`}
            >
              {/* Icon */}
              <span style={{ fontSize: 18, lineHeight: 1, display: 'block' }}>{t.icon}</span>
              {/* Label — always visible for new users */}
              <span style={{
                display:        'block',
                fontFamily:     'var(--font-display)',
                fontSize:       8,
                fontWeight:     700,
                letterSpacing:  '0.08em',
                textTransform:  'uppercase',
                color:          activePanel === t.id ? 'var(--text-pri)' : 'var(--text-dim)',
                marginTop:      2,
                lineHeight:     1,
                textAlign:      'center',
              }}>
                {t.label}
              </span>
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* ── PANELS ────────────────────────────────────────────────────── */}

      {activePanel === 'home' && (
        <HomePanel
          manholes={manholes} pipes={pipes}
          onClose={() => setActivePanel(null)}
          onNavigate={toggle}
        />
      )}

      {activePanel === 'nav' && (
        <NavigationTool
          map={mapInstance}
          onClose={() => { setActivePanel(null); setNavPickMode(false); }}
          onPickModeChange={handlePickModeChange}
        />
      )}

      {activePanel === 'editor' && (
        <DataEditor
          feature={selectedFeature}
          onSave={() => { setActivePanel(null); onDataRefresh(); }}
          onCancel={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'uploader' && (
        <ShapefileUploader
          onUploadComplete={onDataRefresh}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'sync' && (
        <DataSync
          userId={userId}
          onSyncComplete={onDataRefresh}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'flags' && (
        <FlagManager
          onFlagManaged={onDataRefresh}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'profile' && (
        <ProfilePanel
          userId={userId} role={role} userProfile={userProfile}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'settings' && (
        <SettingsPanel onClose={() => setActivePanel(null)} />
      )}
    </div>
  );
}
