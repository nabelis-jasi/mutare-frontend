// src/components/shared/DataTable.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Table as FixedDataTable, Column, Cell } from 'fixed-data-table-2';
import 'fixed-data-table-2/dist/fixed-data-table.css';

const DataTable = ({ rows, headers, containerWidth = 800, containerHeight = 500 }) => {
  if (!rows || rows.length === 0) {
    return <div className="table-no-entries">No entries found.</div>;
  }

  return (
    <FixedDataTable
      rowsCount={rows.length}
      rowHeight={50}
      headerHeight={50}
      width={containerWidth}
      height={containerHeight}
    >
      {headers.map((header, idx) => (
        <Column
          key={idx}
          header={<Cell>{header.question || header}</Cell>}
          cell={({ rowIndex }) => {
            const cellData = rows[rowIndex][idx];
            const answer = cellData?.answer ?? (typeof cellData === 'string' ? cellData : '');
            return <Cell>{answer}</Cell>;
          }}
          width={150}
        />
      ))}
    </FixedDataTable>
  );
};

DataTable.propTypes = {
  rows: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  containerWidth: PropTypes.number,
  containerHeight: PropTypes.number,
};

export default DataTable;
