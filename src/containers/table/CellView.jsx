// src/components/shared/CellView.jsx
import React from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../../config/parameters';

/**
 * CellView – renders a button to view an entry's details.
 * It extracts answers from `content.singleEntryFlat` based on `isBranchTable`
 * and calls `onView` with the headers, answers, and entry title.
 *
 * @param {Object} props
 * @param {boolean} props.isBranchTable - Whether the table is for branch entries.
 * @param {Object} props.content - Contains `singleEntryFlat` array.
 * @param {Array<string>} props.headers - Column headers (for the modal).
 * @param {string} props.entryTitle - Title/description of the entry.
 * @param {Function} props.onView - Callback when view button is clicked, receives (headers, answers, entryTitle).
 */
const CellView = ({ isBranchTable, content, headers, entryTitle, onView }) => {
  const handleClickView = () => {
    const singleEntryFlat = content?.singleEntryFlat || [];
    let answers = [];

    if (isBranchTable) {
      // Remove the fixed headers from the single entry flat (branch table)
      answers = singleEntryFlat.slice(PARAMETERS.TABLE_FIXED_HEADERS_TOTAL - 1);
    } else {
      // Remove the fixed headers from the single entry flat (main table)
      answers = singleEntryFlat.slice(PARAMETERS.TABLE_FIXED_HEADERS_TOTAL);
    }

    if (onView) {
      onView(headers, answers, entryTitle);
    }
  };

  return (
    <div className="cell-view">
      <button
        className="btn btn-default btn-action btn-icon"
        onClick={handleClickView}
      >
        <i className="material-icons">remove_red_eye</i>
      </button>
    </div>
  );
};

CellView.propTypes = {
  isBranchTable: PropTypes.bool,
  content: PropTypes.shape({
    singleEntryFlat: PropTypes.array,
  }).isRequired,
  headers: PropTypes.arrayOf(PropTypes.string),
  entryTitle: PropTypes.string,
  onView: PropTypes.func.isRequired,
};

export default CellView;
