// src/components/engineer/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/api';
import CustomChartBuilder from './CustomChartBuilder';
import DistributionCharts from '../../containers/DistributionCharts';
import FilterEntriesControls from '../../containers/FilterEntriesControls';
import DrawerDownload from '../../containers/DrawerDownload';
import ModalPrepareDownload from '../../containers/ModalPrepareDownload';
import WaitOverlay from '../../containers/WaitOverlay';
import './Dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDownloadDrawer, setShowDownloadDrawer] = useState(false);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [counts, setCounts] = useState({ manholes: 0, pipelines: 0, suburbs: 0 });
  const [maintenanceStats, setMaintenanceStats] = useState([]);
  const [assetEditsStats, setAssetEditsStats] = useState([]);
  const [operatorActivity, setOperatorActivity] = useState([]);
  const [resolutionTime, setResolutionTime] = useState(null);
  const [flagHotspots, setFlagHotspots] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [filters, setFilters] = useState({ status: '', feature_type: '', start_date: '', end_date: '' });
  const [distributionData, setDistributionData] = useState([]);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
    fetchDistributionData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        countsRes,
        maintRes,
        editsRes,
        activityRes,
        timeRes,
        hotspotsRes,
        recordsRes,
        dailyRes,
        weeklyRes,
        monthlyRes
      ] = await Promise.all([
        api.get('/analytics/counts'),
        api.get('/analytics/maintenance-stats'),
        api.get('/analytics/asset-edits-stats'),
        api.get('/analytics/operator-activity'),
        api.get('/analytics/resolution-time'),
        api.get('/analytics/flag-hotspots'),
        api.get('/analytics/maintenance-records', { params: filters }),
        api.get('/analytics/daily-reports'),
        api.get('/analytics/weekly-reports'),
        api.get('/analytics/monthly-reports')
      ]);

      setCounts(countsRes.data);
      setMaintenanceStats(maintRes.data);
      setAssetEditsStats(editsRes.data);
      setOperatorActivity(activityRes.data);
      setResolutionTime(timeRes.data.avg_hours);
      setFlagHotspots(hotspotsRes.data);
      setMaintenanceRecords(recordsRes.data);
      setDailyReports(dailyRes.data);
      setWeeklyReports(weeklyRes.data);
      setMonthlyReports(monthlyRes.data);
    } catch (err) {
      console.error('Error fetching analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributionData = async () => {
    try {
      const res = await api.get('/analytics/distribution');
      setDistributionData(res.data);
    } catch (err) {
      console.error('Error fetching distribution data', err);
    }
  };

  const applyFilters = () => fetchAllData();
  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const getReportData = () => {
    switch (reportPeriod) {
      case 'daily': return dailyReports;
      case 'weekly': return weeklyReports;
      case 'monthly': return monthlyReports;
      default: return dailyReports;
    }
  };

  const handleDownload = async (format, includeMedia) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ format, include_media: includeMedia });
      const response = await api.get(`/analytics/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wastewater_analytics.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      setIsLoading(false);
      setShowDownloadDrawer(false);
    }
  };

  const handleFilterEntries = (filterParams) => {
    setFilters(prev => ({ ...prev, ...filterParams }));
    fetchAllData();
  };

  const styles = {
    container: {
      position: 'absolute',
      top: '80px',
      right: '20px',
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: 'calc(100vh - 100px)',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      padding: '1rem',
      backgroundColor: '#f59e0b',
      color: 'white',
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
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
    button: { padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' },
    buttonPrimary: { backgroundColor: '#2c7da0', color: 'white' },
    buttonSecondary: { backgroundColor: '#eef2f5', color: '#333' },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span>📊 Analytics Dashboard</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.content}>Loading analytics data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>📊 Analytics Dashboard</span>
        <div>
          <button style={{ ...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem' }} onClick={() => setShowDownloadDrawer(true)}>📥 Download</button>
          <button style={{ ...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem' }} onClick={() => setShowPrepareModal(true)}>📋 Prepare</button>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
      </div>
      <div style={styles.content}>
        {/* Tab Bar */}
        <div style={styles.tabBar}>
          <button style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {}) }} onClick={() => setActiveTab('overview')}>Overview</button>
          <button style={{ ...styles.tab, ...(activeTab === 'maintenance' ? styles.activeTab : {}) }} onClick={() => setActiveTab('maintenance')}>Maintenance</button>
          <button style={{ ...styles.tab, ...(activeTab === 'flags' ? styles.activeTab : {}) }} onClick={() => setActiveTab('flags')}>Flags</button>
          <button style={{ ...styles.tab, ...(activeTab === 'operator' ? styles.activeTab : {}) }} onClick={() => setActiveTab('operator')}>Operator Activity</button>
          <button style={{ ...styles.tab, ...(activeTab === 'reports' ? styles.activeTab : {}) }} onClick={() => setActiveTab('reports')}>Periodic Reports</button>
          <button style={{ ...styles.tab, ...(activeTab === 'distribution' ? styles.activeTab : {}) }} onClick={() => setActiveTab('distribution')}>Distribution</button>
          <button style={{ ...styles.tab, ...(activeTab === 'custom' ? styles.activeTab : {}) }} onClick={() => setActiveTab('custom')}>Custom Chart</button>
        </div>

        {/* Filter Controls */}
        <FilterEntriesControls onFilterChange={handleFilterEntries} />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}><h3>Manholes</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{counts.manholes}</p></div>
              <div style={styles.kpiCard}><h3>Pipelines</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{counts.pipelines}</p></div>
              <div style={styles.kpiCard}><h3>Suburbs</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{counts.suburbs}</p></div>
              <div style={styles.kpiCard}><h3>Avg Resolution Time</h3><p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resolutionTime} hrs</p></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <h3>Maintenance Requests by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={maintenanceStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                      {maintenanceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
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
                      {assetEditsStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
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

        {/* Maintenance Tab */}
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
                  <tr>
                    <th style={styles.tableHeader}>ID</th>
                    <th style={styles.tableHeader}>Type</th>
                    <th style={styles.tableHeader}>Feature ID</th>
                    <th style={styles.tableHeader}>Maintenance Type</th>
                    <th style={styles.tableHeader}>Status</th>
                    <th style={styles.tableHeader}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.map(rec => (
                    <tr key={rec.id}>
                      <td style={styles.tableCell}>{rec.id}</td>
                      <td style={styles.tableCell}>{rec.feature_type}</td>
                      <td style={styles.tableCell}>{rec.feature_id}</td>
                      <td style={styles.tableCell}>{rec.maintenance_type}</td>
                      <td style={styles.tableCell}>{rec.status}</td>
                      <td style={styles.tableCell}>{new Date(rec.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {maintenanceRecords.length === 0 && (
                    <tr>
                      <td colSpan="6" style={styles.tableCell}>No records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flags Tab */}
        {activeTab === 'flags' && (
          <div>
            <h3>Flag Hotspots</h3>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Suburb</th>
                  <th style={styles.tableHeader}>Feature ID</th>
                  <th style={styles.tableHeader}>Flag Count</th>
                </tr>
              </thead>
              <tbody>
                {flagHotspots.map((h, i) => (
                  <tr key={i}>
                    <td style={styles.tableCell}>{h.suburb}</td>
                    <td style={styles.tableCell}>{h.feature_id}</td>
                    <td style={styles.tableCell}>{h.flag_count}</td>
                  </tr>
                ))}
                {flagHotspots.length === 0 && (
                  <tr>
                    <td colSpan="3" style={styles.tableCell}>No flags reported</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Operator Activity Tab */}
        {activeTab === 'operator' && (
          <div>
            <h3>Operator Job Logs</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Timestamp</th>
                    <th style={styles.tableHeader}>Operator</th>
                    <th style={styles.tableHeader}>Action</th>
                    <th style={styles.tableHeader}>Feature Type</th>
                    <th style={styles.tableHeader}>Feature ID</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorActivity.map((log, idx) => (
                    <tr key={idx}>
                      <td style={styles.tableCell}>{log.day || '—'}</td>
                      <td style={styles.tableCell}>{log.operator_name || '—'}</td>
                      <td style={styles.tableCell}>{log.action_type || '—'}</td>
                      <td style={styles.tableCell}>{log.feature_type || '—'}</td>
                      <td style={styles.tableCell}>{log.feature_id || '—'}</td>
                    </tr>
                  ))}
                  {operatorActivity.length === 0 && (
                    <tr>
                      <td colSpan="5" style={styles.tableCell}>No activity logs found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Periodic Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h3>Periodic Reports</h3>
            <div style={styles.filterBar}>
              <button style={{ ...styles.tab, ...(reportPeriod === 'daily' ? styles.activeTab : {}) }} onClick={() => setReportPeriod('daily')}>Daily</button>
              <button style={{ ...styles.tab, ...(reportPeriod === 'weekly' ? styles.activeTab : {}) }} onClick={() => setReportPeriod('weekly')}>Weekly</button>
              <button style={{ ...styles.tab, ...(reportPeriod === 'monthly' ? styles.activeTab : {}) }} onClick={() => setReportPeriod('monthly')}>Monthly</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Period</th>
                    <th style={styles.tableHeader}>Maintenance Requests</th>
                    <th style={styles.tableHeader}>Asset Edits</th>
                    <th style={styles.tableHeader}>Flags Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {getReportData().map(row => (
                    <tr key={row.period}>
                      <td style={styles.tableCell}>{row.period}</td>
                      <td style={styles.tableCell}>{row.maintenance_count || 0}</td>
                      <td style={styles.tableCell}>{row.asset_edits_count || 0}</td>
                      <td style={styles.tableCell}>{row.flags_count || 0}</td>
                    </tr>
                  ))}
                  {getReportData().length === 0 && (
                    <tr>
                      <td colSpan="4" style={styles.tableCell}>No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Distribution Tab */}
        {activeTab === 'distribution' && (
          <div>
            <h3>Data Distribution</h3>
            <DistributionChart data={distributionData} onFilterChange={handleFilterEntries} />
          </div>
        )}

        {/* Custom Chart Tab */}
        {activeTab === 'custom' && (
          <div>
            <h3>Custom Chart Builder</h3>
            <CustomChartBuilder
              data={maintenanceRecords}
              availableFields={['maintenance_type', 'priority', 'status', 'feature_type']}
              onExport={(data) => console.log('Export chart data', data)}
            />
          </div>
        )}
      </div>

      {/* Download Drawer */}
      {showDownloadDrawer && (
        <DrawerDownload
          onClose={() => setShowDownloadDrawer(false)}
          onDownload={handleDownload}
        />
      )}

      {/* Prepare Download Modal */}
      {showPrepareModal && (
        <ModalPrepareDownload
          isOpen={showPrepareModal}
          onClose={() => setShowPrepareModal(false)}
          onDownload={(format, dateRange) => {
            console.log('Prepare download', format, dateRange);
            setShowPrepareModal(false);
          }}
        />
      )}

      {/* Wait Overlay */}
      <WaitOverlay isVisible={isLoading} message="Processing download..." />
    </div>
  );
}
