// src/components/engineer/EngineerDashboard.jsx
import React, { useState, useRef, useEffect } from 'react';
import api from "../../api/api";
import MapView from '../MapView';
import DataEditor from './DataEditor';
import ShapefileUploader from './ShapefileUploader';
import DataSync from './DataSync';
import FlagManager from './FlagManager';
import HomePanel from './HomePanel';
import ProfilePanel from './ProfilePanel';
import SettingsPanel from './SettingsPanel';
import FormBuilder from './FormBuilder';
import FormList from './FormList';
import SubmissionsList from './SubmissionsList';
import PendingEdits from './PendingEdits';
import ConnectionsPanel from './ConnectionsPanel';     // NEW
import AnalyticsDashboard from './AnalyticsDashboard'; // NEW
import './Dashboard.css';

export default function EngineerDashboard({ manholes, pipes, userId, role, onDataRefresh, userProfile }) {
  const [activePanel, setActivePanel] = useState(null);
  const [selectedFeature, setFeature] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [pendingEditCount, setPendingEditCount] = useState(0);

  // Fetch pending edit count for badge
  useEffect(() => { fetchPendingCount(); }, []);
  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/asset-edits?status=pending');
      setPendingEditCount(res.data.length ?? 0);
    } catch (err) {
      console.error('Error fetching pending edit count', err);
      setPendingEditCount(0);
    }
  };

  const handleFeatureClick = (feature) => {
    setFeature(feature);
    setActivePanel('editor');
  };

  const toggle = (id) => {
    setActivePanel(prev => prev === id ? null : id);
    setSelectedForm(null);
  };

  const handleSelectForm = (form) => {
    setSelectedForm(form);
    setActivePanel('formBuilder');
  };

  const handleFormSaved = () => {
    setSelectedForm(null);
    onDataRefresh();
  };

  // Tool rail definitions – added Connections and Analytics
  const tools = [
    { id: 'home',        icon: '🏠', label: 'Home',        color: '#4aad4a', desc: 'Overview & stats' },
    { id: 'connections', icon: '🔌', label: 'Connections', color: '#22d3ee', desc: 'Manage DB & GeoServer' }, // NEW
    { id: 'analytics',   icon: '📊', label: 'Analytics',   color: '#f59e0b', desc: 'Reports & KPIs' },        // NEW
    { id: 'editor',      icon: '✏️', label: 'Edit',        color: '#8fdc00', desc: 'Edit manhole/pipeline' },
    { id: 'uploader',    icon: '📤', label: 'Upload',      color: '#4aad4a', desc: 'Import shapefile' },
    { id: 'sync',        icon: '🔄', label: 'Sync',        color: '#22d3ee', desc: 'Push / pull data' },
    { id: 'flags',       icon: '🚩', label: 'Flags',       color: '#f59e0b', desc: 'Review issues' },
    { id: 'formBuilder', icon: '📝', label: 'Forms',       color: '#8fdc00', desc: 'Create/edit forms' },
    { id: 'submissions', icon: '📋', label: 'Submissions', color: '#f59e0b', desc: 'Review submissions' },
    { id: 'pendingEdits',icon: '🔖', label: 'Edits',       color: '#f59e0b', desc: 'Pending asset edits', badge: pendingEditCount },
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
          <div className="wd-chip"><span className="dot dot-lime"  />{pipes?.length    ?? 0} Pipelines</div>
          <div className="wd-chip"><span className="dot dot-amber" />Live</div>
        </div>

        <div className="wd-topbar-actions">
          <button className={`wd-icon-btn${activePanel === 'profile'  ? ' active' : ''}`}
            onClick={() => toggle('profile')}  title="User Profile">👤</button>
          <button className={`wd-icon-btn${activePanel === 'settings' ? ' active' : ''}`}
            onClick={() => toggle('settings')} title="Settings">⚙️</button>
          <div className="wd-role-pill">{role ?? 'Engineer'}</div>
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
        />
      </div>

      {/* LEFT RAIL */}
      <nav className="wd-rail">
        {tools.map((t, i) => (
          <React.Fragment key={t.id}>
            {i === 2 && <div className="wd-rail-sep" />}  {/* separator after Analytics */}
            <button
              className={`wd-rail-btn${activePanel === t.id ? ' active' : ''}`}
              style={{ '--rail-color': t.color }}
              onClick={() => toggle(t.id)}
              title={`${t.label} — ${t.desc}`}
            >
              {t.badge > 0 && <span className="wd-rail-badge">{t.badge > 99 ? '99+' : t.badge}</span>}
              <span style={{ fontSize: 16, lineHeight: 1, display: 'block' }}>{t.icon}</span>
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: activePanel === t.id ? 'var(--text-pri)' : 'var(--text-dim)',
                marginTop: 1,
                lineHeight: 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maxWidth: '42px',
                textOverflow: 'ellipsis',
              }}>
                {t.label}
              </span>
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* PANELS */}
      {activePanel === 'home' && (
        <HomePanel
          manholes={manholes} pipes={pipes}
          onClose={() => setActivePanel(null)}
          onNavigate={toggle}
        />
      )}

      {activePanel === 'connections' && (
        <ConnectionsPanel onClose={() => setActivePanel(null)} onConnectionActivated={() => window.location.reload()} />
      )}

      {activePanel === 'analytics' && (
        <AnalyticsDashboard onClose={() => setActivePanel(null)} />
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

      {/* FORMS: list or builder */}
      {activePanel === 'formBuilder' && (
        <>
          {!selectedForm ? (
            <FormList
              onSelectForm={handleSelectForm}
              onClose={() => setActivePanel(null)}
              onCreateNew={() => setSelectedForm({})}
            />
          ) : (
            <FormBuilder
              form={selectedForm}
              onSaved={handleFormSaved}
              onCancel={() => setSelectedForm(null)}
            />
          )}
        </>
      )}

      {/* SUBMISSIONS REVIEW */}
      {activePanel === 'submissions' && (
        <SubmissionsList
          onClose={() => setActivePanel(null)}
          onRefresh={onDataRefresh}
        />
      )}

      {/* PENDING ASSET EDITS */}
      {activePanel === 'pendingEdits' && (
        <PendingEdits
          onClose={() => setActivePanel(null)}
          onEditProcessed={() => { fetchPendingCount(); onDataRefresh(); }}
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
