
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import DataTable from '../../containers/table/DataTable';
import PARAMETERS from '../../config/parameters';

export default function SubmissionsList({ onClose, onRefresh, onViewEntry, onDeleteEntry, onEditEntry, onOpenDrawer }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', form_id: '', start_date: '', end_date: '' });
  const [forms, setForms] = useState([]);
  const [headers, setHeaders] = useState([]);

  useEffect(() => {
    fetchForms();
    fetchSubmissions();
  }, [filters]);

  const fetchForms = async () => {
    try {
      const res = await api.get('/forms');
      setForms(res.data || []);
    } catch (err) {
      console.error('Error fetching forms', err);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.form_id) params.form_id = filters.form_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const res = await api.get('/submissions', { params });
      const data = res.data || [];

      // Transform submissions into rows for DataTable
      const rows = data.map(sub => buildSubmissionRow(sub));
      setSubmissions(rows);

      // Build headers from first submission's answers (if any)
      if (data.length > 0 && data[0].data) {
        const answerKeys = Object.keys(data[0].data);
        const dynamicHeaders = answerKeys.map(key => ({
          question: key,
          inputRef: key,
        }));
        setHeaders(dynamicHeaders);
      }
    } catch (err) {
      console.error('Error fetching submissions', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to flatten a submission into the row format expected by DataTable
  const buildSubmissionRow = (sub) => {
    // Fixed columns: View, Delete, Edit, ChildForm (not used), Title, CreatedAt
    const fixedCols = [
      { cellType: 'CellView', entryUuid: sub.id, singleEntryFlat: flattenAnswers(sub) },
      { cellType: 'CellDelete', entryUuid: sub.id },
      { cellType: 'CellEdit', entryUuid: sub.id },
      null, // child form column (if any)
      { answer: sub.form_title || `Submission ${sub.id.slice(0, 8)}` }, // title column
      { answer: new Date(sub.submitted_at).toLocaleString() }, // created at column
    ];

    // Dynamic columns: answers from the submission data
    const dynamicCols = [];
    if (sub.data) {
      Object.entries(sub.data).forEach(([key, value]) => {
        dynamicCols.push({ answer: typeof value === 'object' ? JSON.stringify(value) : String(value) });
      });
    }

    return [...fixedCols, ...dynamicCols];
  };

  // Helper to flatten answers for view modal
  const flattenAnswers = (sub) => {
    const flat = [];
    if (sub.data) {
      Object.entries(sub.data).forEach(([key, value]) => {
        flat.push({ label: key, answer: typeof value === 'object' ? JSON.stringify(value) : String(value) });
      });
    }
    return flat;
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchSubmissions();
  };

  const clearFilters = () => {
    setFilters({ status: '', form_id: '', start_date: '', end_date: '' });
  };

  // Handlers for DataTable actions
  const handleView = (entryUuid, entryHeaders, answers, entryTitle) => {
    // Build headers and answers arrays for the modal
    const headerList = answers.map(a => a.label);
    const answerList = answers.map(a => a.answer);
    onViewEntry(headerList, answerList, entryTitle);
  };

  const handleDelete = (entryUuid, entryTitle) => {
    onDeleteEntry(entryUuid, entryTitle);
  };

  const handleEdit = (entryUuid) => {
    onEditEntry(entryUuid);
  };

  if (loading && submissions.length === 0) {
    return <div className="loading-container">Loading submissions...</div>;
  }

  return (
    <div className="submissions-list">
      <div className="submissions-header">
        <h3>Form Submissions</h3>
        <div className="submissions-actions">
          <button onClick={() => onOpenDrawer('download')} className="btn btn-secondary">📥 Download</button>
          <button onClick={() => onOpenDrawer('upload')} className="btn btn-secondary">📤 Bulk Upload</button>
          <button onClick={onClose} className="btn btn-ghost">✕ Close</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select name="form_id" value={filters.form_id} onChange={handleFilterChange}>
          <option value="">All Forms</option>
          {forms.map(form => (
            <option key={form.id} value={form.id}>{form.title}</option>
          ))}
        </select>
        <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} placeholder="Start Date" />
        <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} placeholder="End Date" />
        <button onClick={applyFilters} className="btn btn-primary">Apply Filters</button>
        <button onClick={clearFilters} className="btn btn-secondary">Clear</button>
      </div>

      {/* Data Table */}
      <DataTable
        rows={submissions}
        headers={headers}
        isBranchTable={false}
        projectUser={{ id: localStorage.getItem('user_id'), role: 'engineer' }}
        onView={handleView}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onChildFormClick={() => {}}
        containerWidth={800}
        containerHeight={500}
      />

      <style jsx>{`
        .submissions-list {
          padding: 0.5rem;
        }
        .submissions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .submissions-header h3 {
          margin: 0;
        }
        .submissions-actions {
          display: flex;
          gap: 0.5rem;
        }
        .filters-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .filters-bar select, .filters-bar input, .filters-bar button {
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #ddd;
          background: white;
        }
        .btn-primary {
          background: #2c7da0;
          color: white;
          border: none;
        }
        .btn-secondary {
          background: #eef2f5;
          color: #333;
          border: none;
        }
        .btn-ghost {
          background: none;
          border: 1px solid #ddd;
        }
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          color: #666;
        }
      `}</style>
    </div>
  );
}
