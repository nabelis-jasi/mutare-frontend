// src/components/engineer/ConnectionsPanel.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/api';

export default function ConnectionsPanel({ onClose, onConnectionActivated }) {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        name: '',
        pg_host: '',
        pg_port: 5432,
        pg_database: '',
        pg_user: '',
        pg_password: '',
        geoserver_url: ''
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        setLoading(true);
        try {
            const res = await api.get('/connections');
            setConnections(res.data);
        } catch (err) {
            console.error('Error fetching connections', err);
            setMessage('Failed to load connections');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            if (editingId) {
                await api.put(`/connections/${editingId}`, form);
                setMessage('Connection updated successfully');
            } else {
                await api.post('/connections', form);
                setMessage('Connection created successfully');
            }
            setForm({
                name: '',
                pg_host: '',
                pg_port: 5432,
                pg_database: '',
                pg_user: '',
                pg_password: '',
                geoserver_url: ''
            });
            setEditingId(null);
            await fetchConnections();
        } catch (err) {
            setMessage(err.response?.data?.error || 'Error saving connection');
        } finally {
            setSaving(false);
        }
    };

    const activateConnection = async (id) => {
        try {
            await api.put(`/connections/${id}/activate`);
            setMessage('Connection activated');
            await fetchConnections();
            if (onConnectionActivated) onConnectionActivated();
        } catch (err) {
            setMessage('Error activating connection');
        }
    };

    const deleteConnection = async (id) => {
        if (!confirm('Delete this connection?')) return;
        try {
            await api.delete(`/connections/${id}`);
            setMessage('Connection deleted');
            await fetchConnections();
        } catch (err) {
            setMessage('Error deleting connection');
        }
    };

    const editConnection = (conn) => {
        setEditingId(conn.id);
        setForm({
            name: conn.name,
            pg_host: conn.pg_host,
            pg_port: conn.pg_port,
            pg_database: conn.pg_database,
            pg_user: conn.pg_user,
            pg_password: conn.pg_password,
            geoserver_url: conn.geoserver_url
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({
            name: '',
            pg_host: '',
            pg_port: 5432,
            pg_database: '',
            pg_user: '',
            pg_password: '',
            geoserver_url: ''
        });
    };

    const styles = {
        container: {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "600px",
            maxWidth: "90vw",
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
            backgroundColor: "#22d3ee",
            color: "white",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },
        closeBtn: { background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
        content: { padding: "1rem", overflowY: "auto", flex: 1 },
        formRow: { marginBottom: "1rem" },
        label: { display: "block", fontWeight: "bold", marginBottom: "0.25rem", color: "#555" },
        input: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
        select: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
        button: { padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", marginRight: "0.5rem" },
        submitBtn: { backgroundColor: "#4caf50", color: "white" },
        cancelBtn: { backgroundColor: "#f44336", color: "white" },
        activateBtn: { backgroundColor: "#2196f3", color: "white", padding: "0.25rem 0.75rem", fontSize: "0.8rem" },
        editBtn: { backgroundColor: "#ff9800", color: "white", padding: "0.25rem 0.75rem", fontSize: "0.8rem" },
        deleteBtn: { backgroundColor: "#f44336", color: "white", padding: "0.25rem 0.75rem", fontSize: "0.8rem" },
        connectionItem: {
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "0.75rem",
            marginBottom: "0.75rem",
            backgroundColor: "#fafafa",
        },
        activeBadge: {
            backgroundColor: "#4caf50",
            color: "white",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "0.7rem",
            marginLeft: "0.5rem",
        },
        message: {
            marginTop: "1rem",
            padding: "0.5rem",
            borderRadius: "4px",
            textAlign: "center",
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span>🔌 Database & GeoServer Connections</span>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            <div style={styles.content}>
                {/* Add/Edit Form */}
                <form onSubmit={handleSubmit}>
                    <h4>{editingId ? 'Edit Connection' : 'New Connection'}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div style={styles.formRow}>
                            <label style={styles.label}>Connection Name</label>
                            <input style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                        </div>
                        <div style={styles.formRow}>
                            <label style={styles.label}>PostgreSQL Host</label>
                            <input style={styles.input} value={form.pg_host} onChange={e => setForm({...form, pg_host: e.target.value})} required />
                        </div>
                        <div style={styles.formRow}>
                            <label style={styles.label}>PostgreSQL Port</label>
                            <input style={styles.input} type="number" value={form.pg_port} onChange={e => setForm({...form, pg_port: parseInt(e.target.value)})} required />
                        </div>
                        <div style={styles.formRow}>
                            <label style={styles.label}>Database Name</label>
                            <input style={styles.input} value={form.pg_database} onChange={e => setForm({...form, pg_database: e.target.value})} required />
                        </div>
                        <div style={styles.formRow}>
                            <label style={styles.label}>Database User</label>
                            <input style={styles.input} value={form.pg_user} onChange={e => setForm({...form, pg_user: e.target.value})} required />
                        </div>
                        <div style={styles.formRow}>
                            <label style={styles.label}>Database Password</label>
                            <input style={styles.input} type="password" value={form.pg_password} onChange={e => setForm({...form, pg_password: e.target.value})} required />
                        </div>
                        <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                            <label style={styles.label}>GeoServer WMS URL</label>
                            <input style={styles.input} placeholder="http://localhost:8080/geoserver/wms" value={form.geoserver_url} onChange={e => setForm({...form, geoserver_url: e.target.value})} required />
                        </div>
                    </div>
                    <div>
                        <button type="submit" style={{ ...styles.button, ...styles.submitBtn }} disabled={saving}>
                            {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                        </button>
                        {editingId && <button type="button" style={{ ...styles.button, ...styles.cancelBtn }} onClick={cancelEdit}>Cancel</button>}
                    </div>
                </form>

                {message && <div style={{ ...styles.message, backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da', color: message.includes('success') ? '#155724' : '#721c24' }}>{message}</div>}

                <hr style={{ margin: '1rem 0' }} />

                <h4>Saved Connections</h4>
                {loading ? (
                    <div>Loading connections...</div>
                ) : connections.length === 0 ? (
                    <div>No connections yet. Create one above.</div>
                ) : (
                    connections.map(conn => (
                        <div key={conn.id} style={styles.connectionItem}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div>
                                    <strong>{conn.name}</strong>
                                    {conn.is_active && <span style={styles.activeBadge}>Active</span>}
                                </div>
                                <div>
                                    {!conn.is_active && (
                                        <button style={{ ...styles.button, ...styles.activateBtn }} onClick={() => activateConnection(conn.id)}>Activate</button>
                                    )}
                                    <button style={{ ...styles.button, ...styles.editBtn }} onClick={() => editConnection(conn)}>Edit</button>
                                    <button style={{ ...styles.button, ...styles.deleteBtn }} onClick={() => deleteConnection(conn.id)}>Delete</button>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                <div>PostgreSQL: {conn.pg_host}:{conn.pg_port}/{conn.pg_database}</div>
                                <div>GeoServer: {conn.geoserver_url}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
