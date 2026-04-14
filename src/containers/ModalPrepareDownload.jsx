
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../config/parameters';

const ModalPrepareDownload = ({ isOpen, onClose, onDownload }) => {
  const [format, setFormat] = useState(PARAMETERS.FORMAT_CSV);
  const [dateRange, setDateRange] = useState('all');

  if (!isOpen) return null;

  const handleDownload = () => {
    onDownload(format, dateRange);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Prepare Download</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value={PARAMETERS.FORMAT_CSV}>CSV</option>
              <option value={PARAMETERS.FORMAT_JSON}>JSON</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date Range</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">All</option>
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleDownload}>Download</button>
        </div>
      </div>
    </div>
  );
};

ModalPrepareDownload.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default ModalPrepareDownload;
