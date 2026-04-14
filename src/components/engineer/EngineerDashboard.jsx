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

// Import new containers
import DrawerDownload from '../../containers/DrawerDownload';
import DrawerUpload from '../../containers/DrawerUpload';
import DrawerMap from '../../containers/DrawerMap';
import DrawerEntry from '../../containers/DrawerEntry';
import ModalDeleteEntry from '../../containers/ModalDeleteEntry';
import ModalViewEntry from '../../containers/ModalViewEntry';
import WaitOverlay from '../../containers/WaitOverlay';

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

  // New state for drawers and modals
  const [drawerOpen, setDrawerOpen] = useState(null); // 'download', 'upload', 'map', 'entry'
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalDelete, setModalDelete] = useState({ isOpen: false, entryUuid: null, entryTitle: '' });
  const [modalView, setModalView] = useState({ isOpen: false, headers: [], answers: [], entryTitle: '' });
  const [isLoading, setIsLoading] = useState(false);

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

  // Handlers for drawers and modals
  const handleDownload = async (format, includeMedia) => {
    setIsLoading(true);
    try {
      // Build download URL with current filters (you need to manage filters state)
      const params = new URLSearchParams({ format, include_media: includeMedia });
      // You may also pass date range, etc.
      const response = await api.get(`/analytics/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wastewater_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      setIsLoading(false);
      setDrawerOpen(null);
    }
  };

  const handleUpload = async (file) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/upload/bulk', formData);
      handleDataRefresh(); // refresh submissions list
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsLoading(false);
      setDrawerOpen(null);
    }
  };

  const handleViewEntry = (headers, answers, entryTitle) => {
    setModalView({ isOpen: true, headers, answers, entryTitle });
  };

  const handleDeleteEntry = (entryUuid, entryTitle) => {
    setModalDelete({ isOpen: true, entryUuid, entryTitle });
  };

  const confirmDelete = async () => {
    const { entryUuid } = modalDelete;
    try {
      await api.delete(`/submissions/${entryUuid}`);
      handleDataRefresh();
      setModalDelete({ isOpen: false, entryUuid: null, entryTitle: '' });
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const handleEditEntry = (entryUuid) => {
    // Implement edit logic (e.g., open a drawer or navigate)
    console.log('Edit entry', entryUuid);
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
        return (
          <SubmissionsList
            onClose={() => setActiveTab('home')}
            onRefresh={handleDataRefresh}
            onViewEntry={handleViewEntry}
            onDeleteEntry={handleDeleteEntry}
            onEditEntry={handleEditEntry}
            onOpenDrawer={setDrawerOpen}
          />
        );
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

  // Inline styles (unchanged)
  const styles = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    topbar: {
      background: 'white',
      borderBottom: '1px solid #ddd',
      padding: '0 1.5rem',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      zIndex: 10
    },
    mainLayout: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden'
    },
    mapContainer: {
      flex: 2,
      position: 'relative',
      background: '#e9ecef'
    },
    panelContainer: {
      flex: 1,
      minWidth: '380px',
      maxWidth: '480px',
      background: 'white',
      borderLeft: '1px solid #ddd',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    tabBar: {
      display: 'flex',
      background: '#f8fafc',
      borderBottom: '1px solid #ddd',
      padding: '0.5rem 0.75rem 0',
      gap: '0.25rem',
      overflowX: 'auto'
    },
    tab: {
      padding: '0.5rem 1rem',
      background: 'white',
      border: '1px solid #ddd',
      borderBottom: 'none',
      borderRadius: '8px 8px 0 0',
      fontSize: '0.85rem',
      fontWeight: 500,
      color: '#6c757d',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s'
    },
    activeTab: {
      color: '#2c7da0',
      borderColor: '#2c7da0',
      borderBottomColor: 'white',
      background: 'white',
      position: 'relative',
      zIndex: 1
    },
    panelContent: {
      flex: 1,
      overflowY: 'auto',
      padding: '1.25rem'
    },
    badge: {
      background: '#e76f51',
      color: 'white',
      borderRadius: '12px',
      padding: '0.1rem 0.4rem',
      fontSize: '0.7rem',
      marginLeft: '0.3rem'
    }
  };

  return (
    <div style={styles.root}>
      {/* TOP BAR (unchanged) */}
      <header style={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🪣</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#2c7da0' }}>WWGIS</div>
            <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>Engineer Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ background: '#eef2f5', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2a9d8f', marginRight: '0.4rem' }}></span>
            {manholes?.length ?? 0} Manholes
          </div>
          <div style={{ background: '#eef2f5', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a7c957', marginRight: '0.4rem' }}></span>
            {pipes?.length ?? 0} Pipelines
          </div>
          <div style={{ background: '#eef2f5', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: connectionActive ? '#2a9d8f' : '#e76f51', marginRight: '0.4rem' }}></span>
            {connectionActive ? 'Connected' : 'No DB'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveTab('profile')}>👤</button>
          <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveTab('settings')}>⚙️</button>
          <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={onLogout}>⎋</button>
          <div style={{ background: '#2c7da0', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem' }}>{role}</div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={styles.mainLayout}>
        {/* MAP */}
        <div style={styles.mapContainer}>
          <MapView
            manholes={manholes}
            pipes={pipes}
            role={role}
            userId={userId}
            onFeatureClick={(f) => { setFeature(f); setActiveTab('editor'); }}
          />
        </div>

        {/* RIGHT PANEL WITH TABS */}
        <div style={styles.panelContainer}>
          <div style={styles.tabBar}>
            <button style={{ ...styles.tab, ...(activeTab === 'home' ? styles.activeTab : {}) }} onClick={() => setActiveTab('home')}>🏠 Home</button>
            <button style={{ ...styles.tab, ...(activeTab === 'connections' ? styles.activeTab : {}) }} onClick={() => setActiveTab('connections')}>🔌 Connections</button>
            <button style={{ ...styles.tab, ...(activeTab === 'analytics' ? styles.activeTab : {}) }} onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
            <button style={{ ...styles.tab, ...(activeTab === 'forms' ? styles.activeTab : {}) }} onClick={() => setActiveTab('forms')}>📝 Forms</button>
            <button style={{ ...styles.tab, ...(activeTab === 'submissions' ? styles.activeTab : {}) }} onClick={() => setActiveTab('submissions')}>📋 Submissions</button>
            <button style={{ ...styles.tab, ...(activeTab === 'edits' ? styles.activeTab : {}) }} onClick={() => setActiveTab('edits')}>
              ✏️ Edits {pendingEditCount > 0 && <span style={styles.badge}>{pendingEditCount}</span>}
            </button>
            <button style={{ ...styles.tab, ...(activeTab === 'flags' ? styles.activeTab : {}) }} onClick={() => setActiveTab('flags')}>🚩 Flags</button>
            <button style={{ ...styles.tab, ...(activeTab === 'uploader' ? styles.activeTab : {}) }} onClick={() => setActiveTab('uploader')}>📤 Upload</button>
            <button style={{ ...styles.tab, ...(activeTab === 'sync' ? styles.activeTab : {}) }} onClick={() => setActiveTab('sync')}>🔄 Sync</button>
          </div>
          <div style={styles.panelContent}>
            {loading && activeTab === 'home' ? <div>Loading data...</div> : renderContent()}
          </div>
        </div>
      </div>

      {/* Drawers and Modals */}
      {drawerOpen === 'download' && (
        <DrawerDownload onClose={() => setDrawerOpen(null)} onDownload={handleDownload} />
      )}
      {drawerOpen === 'upload' && (
        <DrawerUpload onClose={() => setDrawerOpen(null)} onUpload={handleUpload} />
      )}
      {drawerOpen === 'map' && selectedEntry && (
        <DrawerMap entries={[selectedEntry]} onClose={() => setDrawerOpen(null)} />
      )}
      {drawerOpen === 'entry' && selectedEntry && (
        <DrawerEntry entry={selectedEntry} onClose={() => setDrawerOpen(null)} />
      )}

      <ModalDeleteEntry
        isOpen={modalDelete.isOpen}
        onClose={() => setModalDelete({ isOpen: false, entryUuid: null, entryTitle: '' })}
        onConfirm={confirmDelete}
        entryTitle={modalDelete.entryTitle}
      />

      <ModalViewEntry
        isOpen={modalView.isOpen}
        onClose={() => setModalView({ isOpen: false, headers: [], answers: [], entryTitle: '' })}
        headers={modalView.headers}
        answers={modalView.answers}
        entryTitle={modalView.entryTitle}
      />

      <WaitOverlay isVisible={isLoading} message="Processing..." />
    </div>
  );
}
