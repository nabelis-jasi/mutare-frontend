// src/components/shared/UploadTable.jsx
import React from 'react';
import PropTypes from 'prop-types';
import RowStatusBootstrap from './RowStatusBootstrap';
import RowAnswerBootstrap from './RowAnswerBootstrap';
import RowHeadersBootstrap from './RowHeadersBootstrap';
import PARAMETERS from '../../config/parameters';

/**
 * UploadTable – displays a two‑part table for bulk upload preview:
 * - Left side: status rows (pass/fail, expandable errors)
 * - Right side: answer values for each field
 *
 * @param {Object} props
 * @param {Array} props.responses - All upload responses (each may have status, errors, etc.)
 * @param {Array} props.failedResponses - Filtered list of failed responses (if filterByFailed=true)
 * @param {Array} props.uploadedRows - Array tracking which rows have been successfully uploaded
 * @param {Object} props.mapping - Field mapping (input_ref -> column metadata)
 * @param {boolean} props.filterByFailed - Whether to show only failed rows
 * @param {number} props.uploadTablePageStart - Starting page index for pagination
 * @param {number} props.uploadTablePageEnd - Ending page index for pagination
 * @param {Function} props.onExpandErrorRow - Callback when a row's error section is expanded (receives rowIndex)
 * @param {Array} props.expandedErrorRows - Array of booleans indicating expanded rows
 * @param {Object} props.projectExtra - Extra project data (e.g., user permissions)
 * @param {Object} props.projectDefinition - Full project definition (forms, inputs)
 * @param {string} props.currentFormRef - Current form reference
 * @param {string|null} props.currentBranchRef - Current branch reference (if inside a branch)
 * @param {Array} props.hierarchyNavigator - Navigation stack for nested forms
 */
const UploadTable = ({
  responses,
  failedResponses,
  uploadedRows,
  mapping,
  filterByFailed,
  uploadTablePageStart,
  uploadTablePageEnd,
  onExpandErrorRow,
  expandedErrorRows,
  projectExtra,
  projectDefinition,
  currentFormRef,
  currentBranchRef,
  hierarchyNavigator,
  ...restProps
}) => {
  const dataArray = filterByFailed ? failedResponses : responses;
  const perPage = PARAMETERS.TABLE_UPLOAD_PER_PAGE;

  // Each response is duplicated (status + answers), so we need to slice accordingly
  const rowsToRender = dataArray.slice(
    2 * uploadTablePageStart * perPage,
    2 * uploadTablePageEnd * perPage
  );

  const renderStatusRows = () =>
    rowsToRender.map((_, rowIndex) => (
      <RowStatusBootstrap
        key={rowIndex}
        rowIndex={rowIndex}
        responses={rowsToRender}
        expandRowCallback={onExpandErrorRow}
        expandedErrorRows={expandedErrorRows}
        {...restProps}
      />
    ));

  const renderHeadersRow = () => (
    <RowHeadersBootstrap mapping={mapping} {...restProps} />
  );

  const renderAnswersRows = () => {
    const uploadedRowsToRender = uploadedRows.slice(
      uploadTablePageStart * perPage,
      uploadTablePageEnd * perPage
    );
    return rowsToRender.map((_, rowIndex) => (
      <RowAnswerBootstrap
        key={rowIndex}
        rowIndex={rowIndex}
        responses={rowsToRender}
        uploadedRows={uploadedRowsToRender}
        {...restProps}
      />
    ));
  };

  return (
    <div className="upload-table-container">
      <div className="upload-table-left">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>{renderStatusRows()}</tbody>
        </table>
      </div>
      <div className="upload-table-right">
        <table className="table table-bordered">
          <thead>{renderHeadersRow()}</thead>
          <tbody>{renderAnswersRows()}</tbody>
        </table>
      </div>
    </div>
  );
};

UploadTable.propTypes = {
  responses: PropTypes.array.isRequired,
  failedResponses: PropTypes.array,
  uploadedRows: PropTypes.array,
  mapping: PropTypes.object.isRequired,
  filterByFailed: PropTypes.bool,
  uploadTablePageStart: PropTypes.number,
  uploadTablePageEnd: PropTypes.number,
  onExpandErrorRow: PropTypes.func,
  expandedErrorRows: PropTypes.array,
  projectExtra: PropTypes.object,
  projectDefinition: PropTypes.object,
  currentFormRef: PropTypes.string,
  currentBranchRef: PropTypes.string,
  hierarchyNavigator: PropTypes.array,
};

UploadTable.defaultProps = {
  failedResponses: [],
  uploadedRows: [],
  filterByFailed: false,
  uploadTablePageStart: 0,
  uploadTablePageEnd: 1,
  expandedErrorRows: [],
};

export default UploadTable;
