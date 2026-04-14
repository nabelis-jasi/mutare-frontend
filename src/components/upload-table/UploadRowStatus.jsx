// src/components/engineer/UploadRowStatus.jsx
import React from 'react';
import PropTypes from 'prop-types';

// If you use Redux, you can connect; otherwise, use local props
// For simplicity, this version receives all needed props directly.

export default function UploadRowStatus({
  rowIndex,
  status,           // 'success', 'error', 'pending', or custom status object
  isUpdate = false, // if true, shows double checkmark for update
  hasError = false,
  isExpanded = false,
  onToggleExpand,
}) {
  // Determine if this is an error row (status indicates failure)
  const isErrorRow = hasError || (status && status.code && status.code.startsWith('ec5_'));
  const isSuccessRow = !isErrorRow && (status === 'success' || status?.code === 'ec5_357' || status?.code === 'ec5_358');

  // Handle click to expand error details
  const handleClick = () => {
    if (onToggleExpand) onToggleExpand(rowIndex);
  };

  return (
    <>
      {/* For odd rows, we return an empty row that will be hidden (spacer for error details) */}
      {rowIndex % 2 !== 0 && (
        <tr className={isExpanded ? 'error-detail-row' : 'error-detail-row hidden'}>
          <td colSpan="2"> {/* Adjust colSpan as needed */}
            {/* Error details can be rendered in a separate component */}
          </td>
        </tr>
      )}

      {/* Main status row */}
      {rowIndex % 2 === 0 && (
        <tr>
          {/* First column: expand/collapse button for errors */}
          <td className="status-action-cell">
            {isErrorRow && (
              <button
                className="btn-toggle-error"
                onClick={handleClick}
                title={isExpanded ? 'Hide errors' : 'Show errors'}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            )}
          </td>
          {/* Second column: status icon */}
          <td className="status-icon-cell">
            {isSuccessRow && (
              <div className="status-success">
                {isUpdate ? (
                  <span className="material-icons">done_all</span>
                ) : (
                  <span className="material-icons">done</span>
                )}
              </div>
            )}
            {isErrorRow && (
              <div className="status-error">
                <span className="material-icons">warning</span>
              </div>
            )}
            {!isSuccessRow && !isErrorRow && (
              <div className="status-pending">
                <span className="material-icons">pending</span>
              </div>
            )}
          <td>
        </tr>
      )}
    </>
  );
}

UploadRowStatus.propTypes = {
  rowIndex: PropTypes.number.isRequired,
  status: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  isUpdate: PropTypes.bool,
  hasError: PropTypes.bool,
  isExpanded: PropTypes.bool,
  onToggleExpand: PropTypes.func,
};
