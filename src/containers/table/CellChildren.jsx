// src/components/engineer/CellChildren.jsx
import React from 'react';
import PropTypes from 'prop-types';

export default function CellChildren({ count, onViewChildren, onAddChild, canAdd = true }) {
  const handleView = () => {
    if (onViewChildren) onViewChildren();
  };

  const handleAdd = () => {
    if (onAddChild) onAddChild();
  };

  return (
    <div className="cell-children" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        className="cell-children-count"
        onClick={handleView}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          color: '#2c7da0',
          fontSize: '0.9rem'
        }}
      >
        {count}
      </button>
      {canAdd && (
        <button
          className="cell-children-add"
          onClick={handleAdd}
          title="Add child"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#4caf50'
          }}
        >
          +
        </button>
      )}
    </div>
  );
}

CellChildren.propTypes = {
  count: PropTypes.number.isRequired,
  onViewChildren: PropTypes.func,
  onAddChild: PropTypes.func,
  canAdd: PropTypes.bool,
};
