// src/components/engineer/EngineerDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from "../../api/api";
import MapView from '../MapView';
import ConnectionsPanel from './ConnectionsPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import DataEditor from './DataEditor';
import ShapefileUploader from './ShapefileUploader';
import DataSync from './DataSync';
import FlagManager from './FlagManager';
import FormList from './FormList';
import FormBuilder from './FormBuilder';
import SubmissionsList from './SubmissionsList';
import PendingEdits from './PendingEdits';
import HomePanel from './HomePanel';
import ProfilePanel from './ProfilePanel';
import SettingsPanel from './SettingsPanel';
import './style/Dashboard.css';  

export default function EngineerDashboard({ user, onLogout }) {
  const userId = user?.id;
  const role = user?.role || 'engineer';
  const userProfile = user;

  const [activeTab, setActiveTab] = useState('home');
  const [selectedFeature, setFeature] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [manholes, setManholes] = useState([]);
  const [pipes, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionActive, setConnectionActive] = useState(false);
  const [pendingEditCount, setPendingEditCount] = useState(0);

  useEffect(() => {
    checkConnection();
    fetchPendingCount();
  }, []);

  useEffect(() => {
    if (connectionActive) fetchData();
  }, [connectionActive]);

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/asset-edits?status=pending');
      setPendingEditCount(res.data.length ?? 0);
    } catch {
      setPendingEditCount(0);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [manholesRes, pipelinesRes] = await Promise.all([
        api.get('/manholes'),
        api.get('/pipelines')
      ]);
      setManholes(manholesRes.data || []);
      setPipelines(pipelinesRes.data || []);
    } catch (err) {
      if (err.response?.status === 503) setConnectionActive(false);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      await api.get('/connections/active');
      setConnectionActive(true);
    } catch {
      setConnectionActive(false);
    }
  };

  const handleDataRefresh = () => {
    fetchData();
    fetchPendingCount();
  };

  const handleConnectionActivated = () => {
    checkConnection();
    fetchData();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePanel manholes={manholes} pipes={pipes} onNavigate={setActiveTab} onClose={() => {}} />;
      case 'connections':
        return <ConnectionsPanel onClose={() => setActiveTab('home')} onConnectionActivated={handleConnectionActivated} />;
      case 'analytics':
        return <AnalyticsDashboard onClose={() => setActiveTab('home')} />;
      case 'editor':
        return <DataEditor feature={selectedFeature} onSave={() => { setActiveTab('home'); handleDataRefresh(); }} onCancel={() => setActiveTab('home')} />;
      case 'uploader':
        return <ShapefileUploader onUploadComplete={handleDataRefresh} onClose={() => setActiveTab('home')} />;
      case 'sync':
        return <DataSync userId={userId} onSyncComplete={handleDataRefresh} onClose={() => setActiveTab('home')} />;
      case 'flags':
        return <FlagManager onFlagManaged={handleDataRefresh} onClose={() => setActiveTab('home')} />;
      case 'forms':
        return !selectedForm ? (
          <FormList onSelectForm={setSelectedForm} onClose={() => setActiveTab('home')} onCreateNew={() => setSelectedForm({})} />
        ) : (
          <FormBuilder form={selectedForm} onSaved={() => { setSelectedForm(null); handleDataRefresh(); }} onCancel={() => setSelectedForm(null)} />
        );
      case 'submissions':
        return <SubmissionsList onClose={() => setActiveTab('home')} onRefresh={handleDataRefresh} />;
      case 'edits':
        return <PendingEdits onClose={() => setActiveTab('home')} onEditProcessed={() => { fetchPendingCount(); handleDataRefresh(); }} />;
      case 'profile':
        return <ProfilePanel userId={userId} role={role} userProfile={userProfile} onClose={() => setActiveTab('home')} onLogout={onLogout} />;
      case 'settings':
        return <SettingsPanel onClose={() => setActiveTab('home')} />;
      default:
        return <HomePanel manholes={manholes} pipes={pipes} onNavigate={setActiveTab} onClose={() => {}} />;
    }
  };

  return (
    <div className="wd-root">
      {/* Top Bar */}
      <header className="wd-topbar">
        <div className="wd-brand">
          <div className="wd-brand-logo">🪣</div>
          <div>
            <div className="wd-brand-name">WWGIS</div>
            <div className="wd-brand-tagline">Engineer Dashboard</div>
          </div>
        </div>
        <div className="wd-chips">
          <div className="wd-chip"><span className="dot dot-green" />{manholes?.length ?? 0} Manholes</div>
          <div className="wd-chip"><span className="dot dot-lime" />{pipes?.length ?? 0} Pipelines</div>
          <div className="wd-chip"><span className="dot dot-amber" />{connectionActive ? 'Connected' : 'No DB'}</div>
        </div>
        <div className="wd-topbar-actions">
          <button className={`wd-icon-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤</button>
          <button className={`wd-icon-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️</button>
          <button className="wd-icon-btn" onClick={onLogout}>⎋</button>
          <div className="wd-role-pill">{role}</div>
        </div>
      </header>

      <div className="wd-main-layout">
        {/* Map */}
        <div className="wd-map-container">
          <MapView
            manholes={manholes}
            pipes={pipes}
            role={role}
            userId={userId}
            onFeatureClick={(f) => { setFeature(f); setActiveTab('editor'); }}
          />
        </div>

        {/* Right Panel with Tabs */}
        <div className="wd-panel-container">
          <div className="wd-tab-bar">
            <button className={`wd-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>🏠 Home</button>
            <button className={`wd-tab ${activeTab === 'connections' ? 'active' : ''}`} onClick={() => setActiveTab('connections')}>🔌 Connections</button>
            <button className={`wd-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
            <button className={`wd-tab ${activeTab === 'forms' ? 'active' : ''}`} onClick={() => setActiveTab('forms')}>📝 Forms</button>
            <button className={`wd-tab ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => setActiveTab('submissions')}>📋 Submissions</button>
            <button className={`wd-tab ${activeTab === 'edits' ? 'active' : ''}`} onClick={() => setActiveTab('edits')}>
              ✏️ Edits {pendingEditCount > 0 && <span className="badge">{pendingEditCount}</span>}
            </button>
            <button className={`wd-tab ${activeTab === 'flags' ? 'active' : ''}`} onClick={() => setActiveTab('flags')}>🚩 Flags</button>
            <button className={`wd-tab ${activeTab === 'uploader' ? 'active' : ''}`} onClick={() => setActiveTab('uploader')}>📤 Upload</button>
            <button className={`wd-tab ${activeTab === 'sync' ? 'active' : ''}`} onClick={() => setActiveTab('sync')}>🔄 Sync</button>
          </div>
          <div className="wd-panel-content">
            {loading && activeTab === 'home' ? <div className="wd-loading">Loading data...</div> : renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
