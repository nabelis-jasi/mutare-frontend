// src/components/shared/TableBody.jsx
import React from 'react';
import PropTypes from 'prop-types';
import TableCell from './TableCell'; // adjust path as needed

/**
 * TableBody – renders a table body from a 2D array of cell contents.
 * Each cell content is passed to the TableCell component for rendering.
 *
 * @param {Object} props
 * @param {Array<Array<Object>>} props.tableRows - 2D array where each inner array represents a row's cell contents.
 */
const TableBody = ({ tableRows }) => {
  return (
    <tbody>
      {tableRows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cellContent, cellIndex) => (
            <td key={cellIndex}>
              <TableCell content={cellContent} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

TableBody.propTypes = {
  tableRows: PropTypes.arrayOf(PropTypes.array).isRequired,
};

export default TableBody;
