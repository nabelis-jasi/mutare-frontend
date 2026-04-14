// src/components/shared/RowErrorsBootstrap.jsx
import React from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../../config/parameters';

/**
 * Renders a table row with error messages for each input field of a submission.
 * Used inside the upload/entries table to show validation errors.
 *
 * @param {Object} props
 * @param {Object} props.mapping - Mapping of input_ref to field metadata (from form schema)
 * @param {Array} props.responses - Array of submission objects (each may have `errors` array)
 * @param {number} props.rowIndex - Index of the current row in `responses`
 * @param {Array} props.expandedErrorRows - Array of booleans indicating which rows are expanded to show errors
 * @param {Array} props.inputs - List of input definitions (from form) to determine which columns to show
 * @param {string|null} props.currentBranchRef - If within a branch, the branch's reference (otherwise null)
 */
const RowErrorsBootstrap = ({
  mapping,
  responses,
  rowIndex,
  expandedErrorRows,
  inputs,
  currentBranchRef,
}) => {
  const baseClassName = 'upload-entries__error-row';
  const dynamicClassName = expandedErrorRows[rowIndex]
    ? baseClassName
    : `${baseClassName} hidden`;

  // Helper to extract error title for a given input_ref
  const getErrorTitle = (inputRef) => {
    if (!responses[rowIndex]?.errors) return '';

    let errorTitle = '';
    responses[rowIndex].errors.forEach((error) => {
      if (error.source === inputRef && errorTitle === '') {
        errorTitle = error.title;
        return false; // break loop
      }
      // Project version out of date
      if (error.source === 'upload-controller' && error.code === 'ec5_201' && errorTitle === '') {
        errorTitle = error.title;
        return false;
      }
      // HTML tags in JSON
      if (error.source === 'json-contains-html' && error.code === 'ec5_220' && errorTitle === '') {
        errorTitle = error.title;
        return false;
      }
      // Project trashed
      if (error.source === 'upload-controller' && error.code === 'ec5_202' && errorTitle === '') {
        errorTitle = error.title;
        return false;
      }
      // Special errors only for the UUID column (first column)
      if (inputRef === null) {
        if (error.source === 'upload' && error.code === 'ec5_54' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if ((error.source === 'entry.entry_uuid' || error.source === 'id') && error.code === 'ec5_28' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if (error.source === 'upload' && error.code === 'ec5_358' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if (error.source === 'upload' && error.code === 'ec5_359' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if (error.source === 'bulk-upload' && error.code === 'ec5_363' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if (error.source === 'middleware' && error.code === 'ec5_360' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if (error.source === 'upload-controller' && error.code === 'ec5_71' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
        if (error.source === 'rate-limiter' && error.code === 'ec5_255' && errorTitle === '') {
          errorTitle = error.title;
          return false;
        }
      }
      return true;
    });
    return errorTitle;
  };

  // Helper to render error cells for location type (latitude, longitude, accuracy)
  const renderLocationErrorCells = (entryMapping) => {
    const parts = ['latitude', 'longitude', 'accuracy'];
    const errorTitle = getErrorTitle(entryMapping.input_ref);
    return parts.map((part) => (
      <td key={`${part}_${entryMapping.map_to}`}>
        <span className="answer-error-label">{errorTitle}</span>
      </td>
    ));
  };

  // Helper to render error cells for a group
  const renderGroupErrorCells = (groupEntryMapping, groupInputs) => {
    return groupInputs
      .filter((groupInput) => groupInput.type !== PARAMETERS.INPUT_TYPES.EC5_README_TYPE)
      .map((groupInput) => {
        const groupMapping = groupEntryMapping.group[groupInput.ref];
        if (!groupMapping) return null;
        if (groupMapping.type === PARAMETERS.INPUT_TYPES.EC5_LOCATION_TYPE) {
          return renderLocationErrorCells(groupMapping);
        }
        const errorTitle = getErrorTitle(groupMapping.input_ref);
        return (
          <td key={groupMapping.map_to}>
            <span className="answer-error-label">{errorTitle}</span>
          </td>
        );
      });
  };

  // Filter out README and BRANCH inputs from the main list (they don't produce columns)
  const visibleInputs = inputs.filter(
    (input) =>
      input.type !== PARAMETERS.INPUT_TYPES.EC5_README_TYPE &&
      input.type !== PARAMETERS.INPUT_TYPES.EC5_BRANCH_TYPE
  );

  return (
    <tr className={dynamicClassName} key={rowIndex}>
      {visibleInputs.map((input, inputIndex) => {
        let entryMapping = {};

        // First column is for UUID (special case)
        if (inputIndex === 0) {
          entryMapping = {
            map_to: currentBranchRef === null ? 'ec5_uuid' : 'ec5_branch_uuid',
            input_ref: null,
            type: null,
          };
        } else {
          // Get mapping for this input
          if (currentBranchRef) {
            // Inside a branch
            entryMapping = mapping[currentBranchRef]?.branch?.[input.ref];
          } else {
            entryMapping = mapping[input.ref];
          }
        }

        // If mapping is missing, skip this column (should not happen)
        if (!entryMapping) return null;

        // Handle location type
        if (entryMapping.type === PARAMETERS.INPUT_TYPES.EC5_LOCATION_TYPE) {
          return renderLocationErrorCells(entryMapping);
        }

        // Handle group type
        if (entryMapping.type === PARAMETERS.INPUT_TYPES.EC5_GROUP_TYPE) {
          return renderGroupErrorCells(entryMapping, input.group || []);
        }

        // Normal input
        const errorTitle = getErrorTitle(entryMapping.input_ref);
        return (
          <td key={entryMapping.map_to}>
            <span className="answer-error-label">{errorTitle}</span>
          </td>
        );
      })}
    </tr>
  );
};

RowErrorsBootstrap.propTypes = {
  mapping: PropTypes.object.isRequired,
  responses: PropTypes.array.isRequired,
  rowIndex: PropTypes.number.isRequired,
  expandedErrorRows: PropTypes.array.isRequired,
  inputs: PropTypes.array.isRequired,
  currentBranchRef: PropTypes.string,
};

export default RowErrorsBootstrap;
