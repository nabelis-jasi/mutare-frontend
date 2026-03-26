import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function SubmissionsList({ onClose, onRefresh }) {
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchForms();
    fetchSubmissions();
  }, [selectedFormId]);

  const fetchForms = async () => {
    const { data } = await supabase
      .from('forms')
      .select('id, title')
      .order('created_at', { ascending: false });
    setForms(data || []);
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    let query = supabase
      .from('form_submissions')
      .select(`
        id,
        form_id,
        collector_id,
        data,
        location,
        submitted_at,
        status,
        cleaned_data,
        engineer_notes
      `)
      .order('submitted_at', { ascending: false });

    if (selectedFormId) {
      query = query.eq('form_id', selectedFormId);
    }

    const { data, error } = await query;
    if (!error) {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id, newStatus, cleanedData = null) => {
    setUpdating(id);
    const update = { status: newStatus };
    if (cleanedData) update.cleaned_data = cleanedData;

    const { error } = await supabase
      .from('form_submissions')
      .update(update)
      .eq('id', id);

    if (!error) {
      if (onRefresh) onRefresh();
      fetchSubmissions();
    } else {
      alert('Error updating: ' + error.message);
    }
    setUpdating(null);
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "500px",
      maxWidth: "90vw",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
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
    content: {
      padding: "1rem",
      maxHeight: "70vh",
      overflowY: "auto",
    },
    filterBar: {
      marginBottom: "1rem",
      display: "flex",
      gap: "0.5rem",
    },
    select: {
      flex: 1,
      padding: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ccc",
    },
    submissionItem: {
      border: "1px solid #eee",
      borderRadius: "8px",
      padding: "0.75rem",
      marginBottom: "0.75rem",
      backgroundColor: "#fafafa",
    },
    meta: {
      fontSize: "0.8rem",
      color: "#666",
      marginBottom: "0.5rem",
      display: "flex",
      justifyContent: "space-between",
    },
    dataPreview: {
      fontSize: "0.85rem",
      marginBottom: "0.5rem",
      background: "#f0f0f0",
      padding: "0.5rem",
      borderRadius: "4px",
      whiteSpace: "pre-wrap",
    },
    actions: {
      display: "flex",
      gap: "0.5rem",
      marginTop: "0.5rem",
    },
    button: {
      padding: "0.25rem 0.75rem",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    },
    approveBtn: { backgroundColor: "#4caf50", color: "white" },
    rejectBtn: { backgroundColor: "#f44336", color: "white" },
    pendingBtn: { backgroundColor: "#ff9800", color: "white" },
    closeBtn: { background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
    statusBadge: {
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "0.7rem",
      fontWeight: "bold",
      textTransform: "uppercase",
    },
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: { background: "#ff9800", color: "white" },
      approved: { background: "#4caf50", color: "white" },
      rejected: { background: "#f44336", color: "white" },
      cleaned: { background: "#2196f3", color: "white" },
    };
    const style = colors[status] || colors.pending;
    return <span style={{ ...styles.statusBadge, ...style }}>{status}</span>;
  };

  const getFormTitle = (formId) => {
    const form = forms.find(f => f.id === formId);
    return form ? form.title : 'Unknown form';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>📋 Submissions</span>
        {onClose && <button style={styles.closeBtn} onClick={onClose}>✕</button>}
      </div>
      <div style={styles.content}>
        <div style={styles.filterBar}>
          <select
            style={styles.select}
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
          >
            <option value="">All Forms</option>
            {forms.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div>Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div>No submissions found.</div>
        ) : (
          submissions.map(sub => (
            <div key={sub.id} style={styles.submissionItem}>
              <div style={styles.meta}>
                <strong>{getFormTitle(sub.form_id)}</strong>
                {getStatusBadge(sub.status)}
              </div>
              <div style={styles.meta}>
                <span>Submitted: {new Date(sub.submitted_at).toLocaleString()}</span>
                <span>Collector ID: {sub.collector_id?.slice(0,8)}…</span>
              </div>
              <div style={styles.dataPreview}>
                <strong>Data:</strong><br />
                {JSON.stringify(sub.data, null, 2)}
              </div>
              {sub.cleaned_data && (
                <div style={styles.dataPreview}>
                  <strong>Cleaned Data:</strong><br />
                  {JSON.stringify(sub.cleaned_data, null, 2)}
                </div>
              )}
              <div style={styles.actions}>
                {sub.status === 'pending' && (
                  <>
                    <button
                      style={{ ...styles.button, ...styles.approveBtn }}
                      onClick={() => updateStatus(sub.id, 'approved', sub.data)}
                      disabled={updating === sub.id}
                    >
                      Approve
                    </button>
                    <button
                      style={{ ...styles.button, ...styles.rejectBtn }}
                      onClick={() => updateStatus(sub.id, 'rejected')}
                      disabled={updating === sub.id}
                    >
                      Reject
                    </button>
                    {/* Optionally add a "Clean" button that opens a modal */}
                  </>
                )}
                {sub.status === 'approved' && (
                  <span>✅ Approved</span>
                )}
                {sub.status === 'rejected' && (
                  <span>❌ Rejected</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
