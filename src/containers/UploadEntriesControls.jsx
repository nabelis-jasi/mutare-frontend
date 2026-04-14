
import React from 'react';
import PropTypes from 'prop-types';

const UploadEntriesControls = ({ onStartUpload, onCancel, isUploading }) => {
  return (
    <div className="upload-entries-controls">
      <button className="btn btn-primary" onClick={onStartUpload} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Start Upload'}
      </button>
      <button className="btn btn-secondary" onClick={onCancel} disabled={isUploading}>
        Cancel
      </button>
    </div>
  );
};

UploadEntriesControls.propTypes = {
  onStartUpload: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isUploading: PropTypes.bool,
};

export default UploadEntriesControls;
