
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../config/parameters';

const DrawerUpload = ({ onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= PARAMETERS.BULK_MAX_FILE_SIZE_BYTES) {
      setFile(selectedFile);
    } else {
      alert(`File size exceeds limit (${PARAMETERS.BULK_MAX_FILE_SIZE_BYTES / 1000000} MB)`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    if (onUpload) {
      await onUpload(file);
    }
    setUploading(false);
    onClose();
  };

  return (
    <div className="drawer drawer-upload">
      <div className="drawer-header">
        <h3>Bulk Upload</h3>
        <button className="drawer-close" onClick={onClose}>✕</button>
      </div>
      <div className="drawer-body">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv, .json"
        />
        {file && (
          <div className="file-info">
            <p>File: {file.name}</p>
            <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

DrawerUpload.propTypes = {
  onClose: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
};

export default DrawerUpload;
