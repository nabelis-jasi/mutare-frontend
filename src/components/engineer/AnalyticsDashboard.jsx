// src/components/engineer/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/api';

export default function AnalyticsDashboard({ onClose }) {
    const [counts, setCounts] = useState({ manholes: 0, pipelines: 0, suburbs: 0 });
    const [maintenanceStats, setMaintenanceStats] = useState([]);
    const [assetEditsStats, setAssetEditsStats] = useState([]);
    const [operatorActivity, setOperatorActivity] = useState([]);
    const [resolutionTime, setResolutionTime] = useState(null);
    const [flagHotspots, setFlagHotspots] = useState([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [filters, setFilters] = useState({ status: '', feature_type: '', start_date: '', end_date: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [countsRes, maintRes, editsRes, activityRes, timeRes, hotspotsRes, recordsRes] = await Promise.all([
                api.get('/analytics/counts'),
                api.get('/analytics/maintenance-stats'),
                api.get('/analytics/asset-edits-stats'),
                api.get('/analytics/operator-activity'),
                api.get('/analytics/resolution-time'),
                api.get('/analytics/flag-hotspots'),
                api.get('/analytics/maintenance-records', { params: filters })
            ]);
            setCounts(countsRes.data);
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

    const applyFilters = () => {
        fetchAllData();
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const styles = {
        container: {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "90vw",
            maxWidth: "1200px",
            maxHeight: "calc(100vh - 100px)",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
        },
        header: {
            padding: "1rem",
            backgroundColor: "#f59e0b",
            color: "white",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },
        closeBtn: { background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
        content: { padding: "1rem", overflowY: "auto", flex: 1 },
        kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
        kpiCard: { backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
        filterBar: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
        filterInput: { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' },
        dataTable: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
        tableHeader: { backgroundColor: '#f0f0f0', padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' },
        tableCell: { padding: '0.5rem', borderBottom: '1px solid #eee' },
    };

    if (loading) return <div style={styles.container}><div style={styles.header}><span>Analytics Dashboard</span><button style={styles.closeBtn} onClick={onClose}>×</button></div><div style={styles.content}>Loading analytics...</div></div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span>📊 Analytics Dashboard</span>
                <button style={styles.closeBtn} onClick={onClose}>×</button>
            </div>
            <div style={styles.content}>
                {/* KPI Cards */}
                <div style={styles.kpiGrid}>
                    <div style={styles.kpiCard}><h3>Manholes</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{counts.manholes}</p></div>
                    <div style={styles.kpiCard}><h3>Pipelines</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{counts.pipelines}</p></div>
                    <div style={styles.kpiCard}><h3>Suburbs</h3><p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{counts.suburbs}</p></div>
                    <div style={styles.kpiCard}><h3>Avg Resolution Time</h3><p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resolutionTime} hrs</p></div>
                </div>

                {/* Charts Row */}
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

                {/* Operator Activity Chart */}
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

                {/* Flag Hotspots Table */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3>Flag Hotspots</h3>
                    <table style={styles.dataTable}>
                        <thead>
                            <tr><th style={styles.tableHeader}>Suburb</th><th style={styles.tableHeader}>Feature ID</th><th style={styles.tableHeader}>Flag Count</th></tr>
                        </thead>
                        <tbody>
                            {flagHotspots.map((h, i) => (
                                <tr key={i}>
                                    <td style={styles.tableCell}>{h.suburb}</td>
                                    <td style={styles.tableCell}>{h.feature_id}</td>
                                    <td style={styles.tableCell}>{h.flag_count}</td>
                                </tr>
                            ))}
                            {flagHotspots.length === 0 && <tr><td colSpan="3" style={styles.tableCell}>No flags reported</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Maintenance Records with Filters */}
                <div>
                    <h3>Maintenance Records</h3>
                    <div style={styles.filterBar}>
                        <input style={styles.filterInput} type="text" name="status" placeholder="Status (pending/approved/rejected)" value={filters.status} onChange={handleFilterChange} />
                        <input style={styles.filterInput} type="text" name="feature_type" placeholder="Feature type (manhole/pipeline)" value={filters.feature_type} onChange={handleFilterChange} />
                        <input style={styles.filterInput} type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
                        <input style={styles.filterInput} type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
                        <button style={{ ...styles.filterInput, backgroundColor: '#4caf50', color: 'white', cursor: 'pointer' }} onClick={applyFilters}>Apply Filters</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th style={styles.tableHeader}>ID</th><th style={styles.tableHeader}>Type</th><th style={styles.tableHeader}>Feature ID</th>
                                    <th style={styles.tableHeader}>Maintenance Type</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Created At</th>
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
                                {maintenanceRecords.length === 0 && <tr><td colSpan="6" style={styles.tableCell}>No records found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
