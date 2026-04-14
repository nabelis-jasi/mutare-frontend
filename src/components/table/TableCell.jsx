// src/components/shared/TableCell.jsx
import React from 'react';
import PropTypes from 'prop-types';

// Import all possible cell renderers (adjust paths to your actual components)
import CellBranch from '../../containers/table/CellBranch';
import CellChildren from '../../containers/table/CellChildren';
import CellMedia from './CellMedia';
import CellText from './CellText';
import CellView from '../../containers/table/CellView';
import CellDelete from '../../containers/table/CellDelete';
import CellEdit from '../../containers/table/CellEdit';

/**
 * TableCell – dynamically renders the appropriate cell component based on `content.cellType`.
 *
 * @param {Object} props
 * @param {Object} props.content - Must contain a `cellType` string and any other data needed by the specific cell component.
 */
const TableCell = ({ content, ...rest }) => {
  const cellComponents = {
    CellBranch,
    CellChildren,
    CellMedia,
    CellText,
    CellView,
    CellDelete,
    CellEdit,
  };

  const cellType = content?.cellType;
  const CellComponent = cellComponents[cellType];

  // If no matching component, fallback to CellText or null
  if (!CellComponent) {
    console.warn(`Unknown cellType: ${cellType}`);
    return <CellText content={content} {...rest} />;
  }

  return <CellComponent content={content} {...rest} />;
};

TableCell.propTypes = {
  content: PropTypes.shape({
    cellType: PropTypes.string.isRequired,
  }).isRequired,
};

export default TableCell;
