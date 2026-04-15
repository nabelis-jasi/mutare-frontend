// src/components/engineer/EngineerDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from "../../api/api";
import MapView from '../MapView';
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
import AnalysisTools from './AnalysisTools';

// Drawers and modals
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
  const [uploadedLayers, setUploadedLayers] = useState([]);
  const [pendingEditCount, setPendingEditCount] = useState(0);
  const [mapInstance, setMapInstance] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalDelete, setModalDelete] = useState({ isOpen: false, entryUuid: null, entryTitle: '' });
  const [modalView, setModalView] = useState({ isOpen: false, headers: [], answers: [], entryTitle: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/asset-edits?status=pending');
      setPendingEditCount(res.data.length ?? 0);
    } catch {
      setPendingEditCount(0);
    }
  };

  const handleDataRefresh = () => {
    fetchPendingCount();
  };

  const handleGeoJsonLoaded = (geojson, layerType) => {
    const newLayer = {
      id: Date.now(),
      geojson,
      type: layerType,
      name: `${layerType} ${uploadedLayers.length + 1}`
    };
    setUploadedLayers(prev => [...prev, newLayer]);
  };

  const handleViewEntry = (headers, answers, entryTitle) => {
    setModalView({ isOpen: true, headers, answers, entryTitle });
  };

  const handleDeleteEntry = (entryUuid, entryTitle) => {
    setModalDelete({ isOpen: true, entryUuid, entryTitle });
  };

  const confirmDelete = async () => {
    setModalDelete({ isOpen: false, entryUuid: null, entryTitle: '' });
    handleDataRefresh();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomePanel manholes={[]} pipes={[]} onNavigate={setActiveTab} onClose={() => {}} />;
      case 'analytics': return <AnalyticsDashboard onClose={() => setActiveTab('home')} />;
      case 'editor': return <DataEditor feature={selectedFeature} onSave={() => { setActiveTab('home'); handleDataRefresh(); }} onCancel={() => setActiveTab('home')} />;
      case 'uploader': return <ShapefileUploader map={mapInstance} onUploadComplete={handleDataRefresh} onClose={() => setActiveTab('home')} onGeoJsonLoaded={handleGeoJsonLoaded} />;
      case 'analysis': return <AnalysisTools map={mapInstance} onClose={() => setActiveTab('home')} />;
      case 'sync': return <DataSync userId={userId} onSyncComplete={handleDataRefresh} onClose={() => setActiveTab('home')} />;
      case 'flags': return <FlagManager onFlagManaged={handleDataRefresh} onClose={() => setActiveTab('home')} />;
      case 'forms': return !selectedForm ? (
          <FormList onSelectForm={setSelectedForm} onClose={() => setActiveTab('home')} onCreateNew={() => setSelectedForm({})} />
        ) : (
          <FormBuilder form={selectedForm} onSaved={() => { setSelectedForm(null); handleDataRefresh(); }} onCancel={() => setSelectedForm(null)} />
        );
      case 'submissions': return <SubmissionsList onClose={() => setActiveTab('home')} onRefresh={handleDataRefresh} onViewEntry={handleViewEntry} onDeleteEntry={handleDeleteEntry} onOpenDrawer={setDrawerOpen} />;
      case 'edits': return <PendingEdits onClose={() => setActiveTab('home')} onEditProcessed={() => { fetchPendingCount(); handleDataRefresh(); }} />;
      case 'profile': return <ProfilePanel userId={userId} role={role} userProfile={userProfile} onClose={() => setActiveTab('home')} onLogout={onLogout} />;
      case 'settings': return <SettingsPanel onClose={() => setActiveTab('home')} />;
      default: return <HomePanel manholes={[]} pipes={[]} onNavigate={setActiveTab} onClose={() => {}} />;
    }
  };

  const styles = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#f0f2f0', // Soft grey-green background
      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    topbar: {
      background: '#0a4519', // Deep Forest Green
      color: 'white',
      padding: '0 1.5rem',
      height: '65px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
      zIndex: 100
    },
    mainLayout: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      padding: '12px',
      gap: '12px'
    },
    mapContainer: {
      flex: 2,
      position: 'relative',
      background: 'white',
      border: '1px solid #cdd3ce',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    panelContainer: {
      flex: 1,
      minWidth: '420px',
      maxWidth: '480px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #cdd3ce',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    tabBar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)', // Clean 3-column block grid
      gap: '4px',
      padding: '8px',
      background: '#f8faf9',
      borderBottom: '2px solid #0a4519'
    },
    tab: {
      padding: '12px 4px',
      background: 'white',
      border: '1px solid #e0e6e1',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '600',
      color: '#444',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transition: 'all 0.2s ease',
      position: 'relative'
    },
    activeTab: {
      background: '#0a4519',
      color: 'white',
      borderColor: '#0a4519',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    panelContent: {
      flex: 1,
      overflowY: 'auto',
      padding: '1.25rem'
    },
    badge: {
      background: '#d90429',
      color: 'white',
      borderRadius: '4px',
      padding: '2px 6px',
      fontSize: '0.65rem',
      position: 'absolute',
      top: '4px',
      right: '4px'
    },
    topLabel: {
      fontSize: '1.2rem',
      fontWeight: '800',
      letterSpacing: '0.5px',
      color: '#ffffff'
    },
    subLabel: {
      fontSize: '0.65rem',
      color: '#a7c957',
      textTransform: 'uppercase',
      fontWeight: 'bold'
    }
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'forms', label: 'Forms', icon: '📝' },
    { id: 'submissions', label: 'Records', icon: '📋' },
    { id: 'edits', label: 'Edits', icon: '✏️', badge: pendingEditCount },
    { id: 'flags', label: 'Flags', icon: '🚩' },
    { id: 'uploader', label: 'Upload', icon: '📤' },
    { id: 'analysis', label: 'Analysis', icon: '🧠' },
    { id: 'sync', label: 'Sync', icon: '🔄' },
  ];

  return (
    <div style={styles.root}>
      <header style={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}>🛠️</span>
          <div>
            <div style={styles.topLabel}>MUTARE <span style={{color: '#a7c957'}}>GIS</span></div>
            <div style={styles.subLabel}>Engineering Command Center</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '4px', fontSize: '0.8rem' }}>
            <span style={{ color: '#a7c957' }}>●</span> Network: Stable
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '4px', fontSize: '0.8rem' }}>
             Role: <span style={{fontWeight: 'bold'}}>{role.toUpperCase()}</span>
          </div>
          <button 
            onClick={onLogout}
            style={{ background: '#d90429', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <div style={styles.mainLayout}>
        <div style={styles.mapContainer}>
          <MapView
            uploadedLayers={uploadedLayers}
            onFeatureClick={(f) => { setFeature(f); setActiveTab('editor'); }}
            onMapReady={setMapInstance}
          />
        </div>

        <div style={styles.panelContainer}>
          <div style={styles.tabBar}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                style={{ ...styles.tab, ...(activeTab === tab.id ? styles.activeTab : {}) }}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={{ fontSize: '1.4rem' }}>{tab.icon}</span>
                {tab.label}
                {tab.badge > 0 && <span style={styles.badge}>{tab.badge}</span>}
              </button>
            ))}
          </div>
          <div style={styles.panelContent}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modals & Overlays */}
      {drawerOpen === 'download' && <DrawerDownload onClose={() => setDrawerOpen(null)} onDownload={() => {}} />}
      {drawerOpen === 'upload' && <DrawerUpload onClose={() => setDrawerOpen(null)} onUpload={() => {}} />}
      
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
      <WaitOverlay isVisible={isLoading} message="Processing GIS Data..." />
    </div>
  );
}
