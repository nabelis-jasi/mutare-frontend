// src/components/engineer/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/api';
import CustomChartBuilder from './CustomChartBuilder';
import '../style/Dashboard.css'; // 

export default function AnalyticsDashboard({ onClose }) {
    

    return (
        <div className="wd-panel" style={{ width: '90vw', maxWidth: '1200px' }}>
            <div className="wd-panel-header">
                <div className="wd-panel-icon">📊</div>
                <div>
                    <div className="wd-panel-title">Analytics Dashboard</div>
                    <div className="wd-panel-sub">Reports, logs, and custom charts</div>
                </div>
                <button className="wd-panel-close" onClick={onClose}>×</button>
            </div>

            <div className="wd-panel-body">
                {/* Tab Bar */}
                <div className="wd-tabs">
                    <button className={`wd-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={`wd-tab ${activeTab === 'joblogs' ? 'active' : ''}`} onClick={() => setActiveTab('joblogs')}>Job Logs</button>
                    <button className={`wd-tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Periodic Reports</button>
                    <button className={`wd-tab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>Custom Charts</button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        <div className="wd-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="wd-stat green"><div className="s-num">{counts.manholes}</div><div className="s-lbl">Manholes</div></div>
                            <div className="wd-stat lime"><div className="s-num">{counts.pipelines}</div><div className="s-lbl">Pipelines</div></div>
                            <div className="wd-stat sky"><div className="s-num">{counts.suburbs}</div><div className="s-lbl">Suburbs</div></div>
                            <div className="wd-stat amber"><div className="s-num">{resolutionTime} hrs</div><div className="s-lbl">Avg Resolution Time</div></div>
                        </div>

                        <div className="wd-section">Maintenance Requests by Status</div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={maintenanceStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                                    {maintenanceStats.map((entry, index) => <Cell key={`cell-${index}`} fill={['#0088FE','#00C49F','#FFBB28','#FF8042'][index % 4]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="wd-section">Asset Edits by Status</div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={assetEditsStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                                    {assetEditsStats.map((entry, index) => <Cell key={`cell-${index}`} fill={['#0088FE','#00C49F','#FFBB28','#FF8042'][index % 4]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="wd-section">Operator Activity (Last 30 Days)</div>
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

                        <div className="wd-section">Flag Hotspots</div>
                        <table className="wd-table">
                            <thead><tr><th>Suburb</th><th>Feature ID</th><th>Flag Count</th></tr></thead>
                            <tbody>
                                {flagHotspots.map((h, i) => <tr key={i}><td>{h.suburb}</td><td>{h.feature_id}</td><td>{h.flag_count}</td></tr>)}
                                {flagHotspots.length === 0 && <tr><td colSpan="3">No flags reported</td></tr>}
                            </tbody>
                        </table>

                        <div className="wd-section">Maintenance Records</div>
                        <div className="wd-filter-bar">
                            <input type="text" name="status" placeholder="Status" value={filters.status} onChange={handleFilterChange} />
                            <input type="text" name="feature_type" placeholder="Feature type" value={filters.feature_type} onChange={handleFilterChange} />
                            <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
                            <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
                            <button className="wd-btn wd-btn-primary" onClick={applyFilters}>Apply Filters</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="wd-table">
                                <thead><tr><th>ID</th><th>Type</th><th>Feature ID</th><th>Maintenance Type</th><th>Status</th><th>Created At</th></tr></thead>
                                <tbody>
                                    {maintenanceRecords.map(rec => <tr key={rec.id}><td>{rec.id}</td><td>{rec.feature_type}</td><td>{rec.feature_id}</td><td>{rec.maintenance_type}</td><td>{rec.status}</td><td>{new Date(rec.created_at).toLocaleString()}</td></tr>)}
                                    {maintenanceRecords.length === 0 && <tr><td colSpan="6">No records found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Job Logs Tab */}
                {activeTab === 'joblogs' && (
                    <>
                        <div className="wd-filter-bar">
                            <input type="date" name="start_date" value={jobLogFilters.start_date} onChange={handleJobLogFilterChange} />
                            <input type="date" name="end_date" value={jobLogFilters.end_date} onChange={handleJobLogFilterChange} />
                            <select name="operator_id" value={jobLogFilters.operator_id} onChange={handleJobLogFilterChange}>
                                <option value="">All Operators</option>
                                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                            </select>
                            <select name="action_type" value={jobLogFilters.action_type} onChange={handleJobLogFilterChange}>
                                <option value="">All Actions</option>
                                {actionTypes.map(act => <option key={act} value={act}>{act}</option>)}
                            </select>
                            <button className="wd-btn wd-btn-primary" onClick={applyJobLogFilters}>Filter</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="wd-table">
                                <thead><tr><th>Timestamp</th><th>Operator</th><th>Action</th><th>Feature Type</th><th>Feature ID</th><th>Details</th></tr></thead>
                                <tbody>
                                    {jobLogs.map(log => <tr key={log.id}>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                        <td>{log.operator_name}</td>
                                        <td>{log.action_type}</td>
                                        <td>{log.feature_type}</td>
                                        <td>{log.feature_id}</td>
                                        <td><pre>{JSON.stringify(log.details, null, 2)}</pre></td>
                                    </tr>)}
                                    {jobLogs.length === 0 && <tr><td colSpan="6">No job logs found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Periodic Reports Tab */}
                {activeTab === 'reports' && (
                    <>
                        <div className="wd-filter-bar">
                            <button className={`wd-btn ${reportPeriod === 'daily' ? 'active' : ''}`} onClick={() => setReportPeriod('daily')}>Daily</button>
                            <button className={`wd-btn ${reportPeriod === 'weekly' ? 'active' : ''}`} onClick={() => setReportPeriod('weekly')}>Weekly</button>
                            <button className={`wd-btn ${reportPeriod === 'monthly' ? 'active' : ''}`} onClick={() => setReportPeriod('monthly')}>Monthly</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="wd-table">
                                <thead><tr><th>Period</th><th>Maintenance Requests</th><th>Asset Edits</th><th>Flags Reported</th></tr></thead>
                                <tbody>
                                    {getUniqueReportData().map(row => <tr key={row.period}><td>{row.period}</td><td>{row.maintenance_count || 0}</td><td>{row.asset_edits_count || 0}</td><td>{row.flags_count || 0}</td></tr>)}
                                    {getUniqueReportData().length === 0 && <tr><td colSpan="4">No data available</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Custom Charts Tab */}
                {activeTab === 'custom' && (
                    <>
                        <div className="wd-section">Build Your Own Chart</div>
                        <CustomChartBuilder
                            data={chartData}
                            availableFields={chartFields}
                            onExport={(data) => console.log('Export chart', data)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
