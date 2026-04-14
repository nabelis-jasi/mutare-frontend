// src/components/engineer/UploadTableControls.jsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

export default function UploadTableControls({
  responses,        // array of response objects (each may have errors)
  uploadedRows,     // original data rows (same length as responses / 2)
  failedReverseEntries, // array of failed entries (or empty)
  onFilterByFailed, // callback when filter checkbox toggles
  projectSlug = 'wastewater',
  formName = 'upload',
  branchName = '',
}) {
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const totalEntries = uploadedRows.length;
  const processedEntries = responses.length / 2; // because responses are duplicated
  const progress = totalEntries === 0 ? 0 : (processedEntries / totalEntries) * 100;
  const isComplete = processedEntries === totalEntries;

  useEffect(() => {
    if (onFilterByFailed) {
      onFilterByFailed(showOnlyFailed);
    }
  }, [showOnlyFailed, onFilterByFailed]);

  const handleFilterChange = (e) => {
    setShowOnlyFailed(e.target.checked);
  };

  const downloadFailedRows = () => {
    // Collect failed rows
    const failedRows = [];
    responses.forEach((response, index) => {
      // responses are duplicated (one for data, one for status), so even indices are data rows
      if (index % 2 === 0 && response.errors) {
        const rowIndex = index / 2;
        const failedRow = { ...uploadedRows[rowIndex] };
        // Remove any non‑uploadable fields if needed (optional)
        failedRows.push(failedRow);
      }
    });

    if (failedRows.length === 0) return;

    const csv = Papa.unparse(failedRows);
    let filename = `${projectSlug}__${formName.replace(/\s+/g, '-')}`;
    if (branchName) filename += `__${branchName.replace(/\s+/g, '-')}`;
    filename += '__failed-rows.csv';

    try {
      const file = new File([csv], filename, { type: 'text/csv;charset=utf-8' });
      saveAs(file);
    } catch (err) {
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
      } else {
        alert('Could not download file. Your browser may not support this feature.');
      }
    }
  };

  if (!isComplete) {
    return (
      <div className="upload-progress">
        <div>Uploading {processedEntries} of {totalEntries} entries</div>
        <progress value={progress} max="100" style={{ width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="upload-controls">
      <label>
        <input
          type="checkbox"
          checked={showOnlyFailed}
          onChange={handleFilterChange}
          disabled={failedReverseEntries.length === 0}
        />
        Show only failed rows
      </label>
      <button
        onClick={downloadFailedRows}
        disabled={failedReverseEntries.length === 0}
      >
        Download failed rows
      </button>
    </div>
  );
}
