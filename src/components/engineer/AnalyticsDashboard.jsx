// src/components/engineer/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard({ onClose, uploadedLayers = [] }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [maintenanceStats, setMaintenanceStats] = useState([]);
  const [assetEditsStats, setAssetEditsStats] = useState([]);
  const [operatorActivity, setOperatorActivity] = useState([]);
  const [resolutionTime, setResolutionTime] = useState(null);
  const [flagHotspots, setFlagHotspots] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [filters, setFilters] = useState({ status: '', feature_type: '', start_date: '', end_date: '' });

  // Compute spatial counts from uploaded GeoJSON layers
  const computeSpatialCounts = () => {
    let manholes = 0, pipelines = 0, suburbs = 0;
    uploadedLayers.forEach(layer => {
      const count = layer.geojson.features.length;
      if (layer.type === 'manhole') manholes += count;
      else if (layer.type === 'pipeline') pipelines += count;
      else if (layer.type === 'suburb') suburbs += count;
    });
    return { manholes, pipelines, suburbs };
  };
  const spatialCounts = computeSpatialCounts();

  useEffect(() => {
    fetchNonSpatialData();
  }, []);

  const fetchNonSpatialData = async () => {
    setLoading(true);
    try {
      const [maintRes, editsRes, activityRes, timeRes, hotspotsRes, recordsRes] = await Promise.all([
        api.get('/analytics/maintenance-stats'),
        api.get('/analytics/asset-edits-stats'),
        api.get('/analytics/operator-activity'),
        api.get('/analytics/resolution-time'),
        api.get('/analytics/flag-hotspots'),
        api.get('/analytics/maintenance-records', { params: filters })
      ]);
      setMaintenanceStats(maintRes.data);
      setAssetEditsStats(editsRes.data);
      setOperatorActivity(activityRes.data);
      setResolutionTime(timeRes.data.avg_hours);
      setFlagHotspots(hotspotsRes.data);
      setMaintenanceRecords(recordsRes.data);
    } catch (err) {
      console.error('Error fetching analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => fetchNonSpatialData();
  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  if (loading) return <div className="loading">Loading analytics...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>📊 Analytics Dashboard</span>
        <button style={styles.closeBtn} onClick={onClose}>×</button>
      </div>
      <div style={styles.content}>
        {/* Tab bar */}
        <div style={styles.tabBar}>
          <button style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {}) }} onClick={() => setActiveTab('overview')}>Overview</button>
          <button style={{ ...styles.tab, ...(activeTab === 'maintenance' ? styles.activeTab : {}) }} onClick={() => setActiveTab('maintenance')}>Maintenance</button>
          <button style={{ ...styles.tab, ...(activeTab === 'flags' ? styles.activeTab : {}) }} onClick={() => setActiveTab('flags')}>Flags</button>
          <button style={{ ...styles.tab, ...(activeTab === 'operator' ? styles.activeTab : {}) }} onClick={() => setActiveTab('operator')}>Operator Activity</button>
        </div>

        {/* Overview tab with KPI cards from uploaded layers */}
        {activeTab === 'overview' && (
          <>
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}><h3>Manholes</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{spatialCounts.manholes}</p></div>
              <div style={styles.kpiCard}><h3>Pipelines</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{spatialCounts.pipelines}</p></div>
              <div style={styles.kpiCard}><h3>Suburbs</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{spatialCounts.suburbs}</p></div>
              <div style={styles.kpiCard}><h3>Avg Resolution Time</h3><p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resolutionTime} hrs</p></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <h3>Maintenance Requests by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={maintenanceStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                      {maintenanceStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3>Asset Edits by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={assetEditsStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                      {assetEditsStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3>Operator Activity (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={operatorActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Maintenance tab (unchanged) */}
        {activeTab === 'maintenance' && (
          <div>
            <h3>Maintenance Records</h3>
            <div style={styles.filterBar}>
              <input style={styles.filterInput} type="text" name="status" placeholder="Status" value={filters.status} onChange={handleFilterChange} />
              <input style={styles.filterInput} type="text" name="feature_type" placeholder="Feature type" value={filters.feature_type} onChange={handleFilterChange} />
              <input style={styles.filterInput} type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
              <input style={styles.filterInput} type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
              <button style={{ ...styles.filterInput, backgroundColor: '#4caf50', color: 'white', cursor: 'pointer' }} onClick={applyFilters}>Apply</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.dataTable}>
                <thead>
                  <tr><th>ID</th><th>Type</th><th>Feature ID</th><th>Maintenance Type</th><th>Status</th><th>Created At</th></tr>
                </thead>
                <tbody>
                  {maintenanceRecords.map(rec => (
                    <tr key={rec.id}>
                      <td>{rec.id}</td><td>{rec.feature_type}</td><td>{rec.feature_id}</td><td>{rec.maintenance_type}</td><td>{rec.status}</td><td>{new Date(rec.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {maintenanceRecords.length === 0 && <tr><td colSpan="6">No records found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flags tab */}
        {activeTab === 'flags' && (
          <div>
            <h3>Flag Hotspots</h3>
            <table style={styles.dataTable}>
              <thead><tr><th>Feature ID</th><th>Type</th><th>Flag Count</th></tr></thead>
              <tbody>
                {flagHotspots.map((h, i) => (
                  <tr key={i}><td>{h.feature_id}</td><td>{h.feature_type}</td><td>{h.flag_count}</td></tr>
                ))}
                {flagHotspots.length === 0 && <tr><td colSpan="3">No flags reported</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Operator Activity tab */}
        {activeTab === 'operator' && (
          <div>
            <h3>Operator Job Logs</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.dataTable}>
                <thead><tr><th>Timestamp</th><th>Operator</th><th>Action</th><th>Feature Type</th><th>Feature ID</th></tr></thead>
                <tbody>
                  {operatorActivity.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.day || '—'}</td>
                      <td>{log.operator_name || '—'}</td>
                      <td>{log.action_type || '—'}</td>
                      <td>{log.feature_type || '—'}</td>
                      <td>{log.feature_id || '—'}</td>
                    </tr>
                  ))}
                  {operatorActivity.length === 0 && <tr><td colSpan="5">No activity logs found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles (same as before – keep your existing styles object)
const styles = {
  container: {
    position: 'absolute', top: '80px', right: '20px', width: '90vw', maxWidth: '1200px',
    maxHeight: 'calc(100vh - 100px)', backgroundColor: 'white', borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
  },
  header: { padding: '1rem', backgroundColor: '#f59e0b', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' },
  content: { padding: '1rem', overflowY: 'auto', flex: 1 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
  kpiCard: { backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  filterBar: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterInput: { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem' },
  dataTable: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  tableHeader: { backgroundColor: '#f0f0f0', padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' },
  tableCell: { padding: '0.5rem', borderBottom: '1px solid #eee' },
  tabBar: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' },
  tab: { padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#f0f0f0', border: 'none' },
  activeTab: { backgroundColor: '#f59e0b', color: 'white' },
};
