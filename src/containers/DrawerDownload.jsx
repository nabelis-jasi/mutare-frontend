// src/containers/DrawerDownload.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../config/parameters';

const DrawerDownload = ({ onClose, onDownload }) => {
  const [format, setFormat] = useState(PARAMETERS.FORMAT_CSV);
  const [includeMedia, setIncludeMedia] = useState(false);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(format, includeMedia);
    }
  };

  return (
    <div className="drawer drawer-download">
      <div className="drawer-header">
        <h3>Download Entries</h3>
        <button className="drawer-close" onClick={onClose}>✕</button>
      </div>
      <div className="drawer-body">
        <div className="form-group">
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value={PARAMETERS.FORMAT_CSV}>CSV</option>
            <option value={PARAMETERS.FORMAT_JSON}>JSON</option>
          </select>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
            />
            Include media files (photos, audio, video)
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleDownload}>Download</button>
      </div>
    </div>
  );
};

DrawerDownload.propTypes = {
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default DrawerDownload;
