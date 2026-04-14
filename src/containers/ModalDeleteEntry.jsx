
import React from 'react';
import PropTypes from 'prop-types';

const ModalDeleteEntry = ({ isOpen, onClose, onConfirm, entryTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Delete Entry</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete "{entryTitle}"? This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
};

ModalDeleteEntry.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  entryTitle: PropTypes.string,
};

export default ModalDeleteEntry;
