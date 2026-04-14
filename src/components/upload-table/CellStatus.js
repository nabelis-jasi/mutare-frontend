// src/components/shared/CellStatus.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CellStatus – displays a status icon for a submission row.
 * Maps common status values to appropriate Material Icons and CSS classes.
 *
 * @param {Object} props
 * @param {number} props.rowIndex - Index of the row in the `responses` array.
 * @param {Array} props.responses - Array of submission objects, each with a `status` property.
 */
const CellStatus = ({ rowIndex, responses }) => {
  // Safety check
  if (!responses || !responses[rowIndex]) {
    return (
      <div className="text-center">
        <span className="material-icons">help_outline</span>
      </div>
    );
  }

  const status = responses[rowIndex].status;

  // Map status to icon and CSS class
  let icon = 'help_outline';
  let className = 'status-unknown';

  switch (status) {
    case 'approved':
      icon = 'done';
      className = 'status-success';
      break;
    case 'pending':
      icon = 'schedule';
      className = 'status-pending';
      break;
    case 'rejected':
      icon = 'warning';
      className = 'status-failed';
      break;
    case 'cleaned':
      icon = 'cleaning_services';
      className = 'status-cleaned';
      break;
    default:
      icon = 'help_outline';
      className = 'status-unknown';
  }

  return (
    <div className={`text-center ${className}`}>
      <span className="material-icons">{icon}</span>
    </div>
  );
};

CellStatus.propTypes = {
  rowIndex: PropTypes.number.isRequired,
  responses: PropTypes.array.isRequired,
};

export default CellStatus;
