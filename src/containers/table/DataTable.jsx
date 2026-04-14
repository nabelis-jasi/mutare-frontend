// src/components/shared/DataTable.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Table as FixedDataTable, Column, Cell } from 'fixed-data-table-2';
import TableCell from './TableCell';
import PARAMETERS from '../../config/parameters';
import helpers from '../../utils/helpers';

/**
 * DataTable – renders a fixed-data-table for entries (submissions, manholes, etc.)
 * Supports view/edit/delete actions, dynamic columns, and branch tables.
 *
 * @param {Object} props
 * @param {number} props.containerWidth - Width of the table container.
 * @param {number} props.containerHeight - Height of the table container.
 * @param {Array<Array<Object>>} props.rows - 2D array of cell contents.
 * @param {Array<Object>} props.headers - Array of header objects (each with `question` and `inputRef`).
 * @param {boolean} props.isBranchTable - Whether this is a branch (nested) table.
 * @param {boolean} props.isFetchingPage - Whether data is loading.
 * @param {Object} props.projectUser - Current user (id, role).
 * @param {Array} props.hierarchyNavigator - Navigation stack for forms.
 * @param {Array} props.forms - List of forms in the project.
 * @param {Function} props.onView - Callback for view action.
 * @param {Function} props.onDelete - Callback for delete action.
 * @param {Function} props.onEdit - Callback for edit action.
 * @param {Function} props.onChildFormClick - Callback when child form link is clicked.
 */
const DataTable = ({
  containerWidth,
  containerHeight,
  rows,
  headers,
  isBranchTable,
  isFetchingPage,
  projectUser,
  hierarchyNavigator,
  forms,
  onView,
  onDelete,
  onEdit,
  onChildFormClick,
}) => {
  // Loading state
  if (isFetchingPage) {
    return <div className="table-loader">Loading data...</div>;
  }

  // No entries
  if (!rows || rows.length === 0) {
    return (
      <div className="table-no-entries animated fadeIn text-center">
        <h2>No entries found.</h2>
      </div>
    );
  }

  // Determine fixed headers count based on branch table
  const tableTotalFixedHeaders = isBranchTable
    ? PARAMETERS.TABLE_FIXED_HEADERS_TOTAL - 1
    : PARAMETERS.TABLE_FIXED_HEADERS_TOTAL;
  const entryTitleRowIndex = isBranchTable
    ? PARAMETERS.TABLE_FIXED_HEADERS_TITLE_INDEX - 1
    : PARAMETERS.TABLE_FIXED_HEADERS_TITLE_INDEX;
  const entryCreatedAtRowIndex = isBranchTable
    ? PARAMETERS.TABLE_FIXED_HEADERS_CREATED_AT_INDEX - 1
    : PARAMETERS.TABLE_FIXED_HEADERS_CREATED_AT_INDEX;

  // Get current form reference and child form (if any)
  const currentFormRef = hierarchyNavigator[hierarchyNavigator.length - 1]?.formRef;
  const childForm = helpers.getNextForm(forms, currentFormRef);

  // Determine if user is logged in
  let isUserLoggedIn = PARAMETERS.IS_LOCALHOST === 1;
  if (projectUser?.role !== null || projectUser?.id !== null) {
    isUserLoggedIn = true;
  }

  const shouldColumnFixed = containerWidth > 768; // remove fixed columns on small screens

  // Helper to render header with ellipsis
  const renderHeader = (headerText) => (
    <div className="cell-content-wrapper">
      <div className="cell-content">{headerText}</div>
    </div>
  );

  // Common props to pass to TableCell
  const cellProps = {
    projectUser,
    isBranchTable,
    onView,
    onDelete,
    onEdit,
    onChildFormClick,
  };

  return (
    <FixedDataTable
      className="table-entries animated fadeIn"
      rowsCount={rows.length}
      rowHeight={50}
      headerHeight={50}
      touchScrollEnabled
      width={containerWidth}
      height={containerHeight}
    >
      {/* View column */}
      <Column
        header={<Cell className="text-center">View</Cell>}
        cell={({ rowIndex }) => (
          <TableCell
            {...cellProps}
            rowIndex={rowIndex}
            content={rows[rowIndex][0]}
            entryTitle={rows[rowIndex][entryTitleRowIndex]?.answer}
            entryExtra={rows[rowIndex][tableTotalFixedHeaders]}
          />
        )}
        width={58}
        fixed={shouldColumnFixed}
      />

      {/* Delete column (only if logged in) */}
      {isUserLoggedIn && (
        <Column
          header={<Cell className="text-center">Delete</Cell>}
          cell={({ rowIndex }) => (
            <TableCell
              {...cellProps}
              rowIndex={rowIndex}
              content={rows[rowIndex][1]}
              entryTitle={rows[rowIndex][entryTitleRowIndex]?.answer}
              entryExtra={rows[rowIndex][tableTotalFixedHeaders]}
            />
          )}
          width={58}
          fixed={shouldColumnFixed}
        />
      )}

      {/* Edit column (only if logged in) */}
      {isUserLoggedIn && (
        <Column
          header={<Cell className="text-center">Edit</Cell>}
          cell={({ rowIndex }) => (
            <TableCell
              {...cellProps}
              rowIndex={rowIndex}
              content={rows[rowIndex][2]}
              entryTitle={rows[rowIndex][entryTitleRowIndex]?.answer}
              entryExtra={rows[rowIndex][tableTotalFixedHeaders]}
            />
          )}
          width={58}
          fixed={shouldColumnFixed}
        />
      )}

      {/* Child form link column (only if not branch table and child form exists) */}
      {!isBranchTable && childForm && (
        <Column
          header={<Cell>{renderHeader(childForm.name)}</Cell>}
          cell={({ rowIndex }) => (
            <TableCell
              {...cellProps}
              content={rows[rowIndex][3]}
              entryTitle={rows[rowIndex][4]?.answer}
              entryExtra={rows[rowIndex][tableTotalFixedHeaders]}
            />
          )}
          width={120}
          fixed={shouldColumnFixed}
        />
      )}

      {/* Title column */}
      <Column
        header={<Cell>Title</Cell>}
        cell={({ rowIndex }) => (
          <TableCell
            {...cellProps}
            content={rows[rowIndex][entryTitleRowIndex]}
          />
        )}
        width={150}
        fixed={shouldColumnFixed}
      />

      {/* Created At column */}
      <Column
        header={<Cell>Created At</Cell>}
        cell={({ rowIndex }) => (
          <TableCell
            {...cellProps}
            content={rows[rowIndex][entryCreatedAtRowIndex]}
          />
        )}
        width={150}
        fixed={shouldColumnFixed}
      />

      {/* Dynamic columns (answers) */}
      {headers.map((header, index) => (
        <Column
          key={header.inputRef || index}
          header={<Cell>{renderHeader(header.question)}</Cell>}
          columnKey={header.inputRef}
          cell={({ rowIndex }) => (
            <TableCell
              {...cellProps}
              title={rows[rowIndex][entryTitleRowIndex]?.answer}
              content={rows[rowIndex][index + tableTotalFixedHeaders]}
              entryExtra={rows[rowIndex][index + tableTotalFixedHeaders]}
            />
          )}
          width={200}
          allowCellsRecycling
        />
      ))}
    </FixedDataTable>
  );
};

DataTable.propTypes = {
  containerWidth: PropTypes.number.isRequired,
  containerHeight: PropTypes.number.isRequired,
  rows: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  isBranchTable: PropTypes.bool,
  isFetchingPage: PropTypes.bool,
  projectUser: PropTypes.object,
  hierarchyNavigator: PropTypes.array,
  forms: PropTypes.array,
  onView: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onChildFormClick: PropTypes.func,
};

export default DataTable;
