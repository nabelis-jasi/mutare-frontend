// src/components/engineer/UploadHeaders.jsx
import React from 'react';
import PropTypes from 'prop-types';

// Constants matching your field types (adjust as needed)
const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TEXTAREA: 'textarea',
  DATE: 'date',
  LOCATION: 'location',
  PHOTO: 'photo',
  README: 'readme',
  BRANCH: 'branch',
  GROUP: 'group',
};

export default function UploadHeaders({ fields, includeIdColumn = true, idColumnLabel = 'Identifier' }) {
  // Build headers array
  const headers = [];

  if (includeIdColumn) {
    headers.push({ key: 'id', label: idColumnLabel });
  }

  const processField = (field) => {
    // Skip README and BRANCH types
    if (field.type === FIELD_TYPES.README || field.type === FIELD_TYPES.BRANCH) {
      return;
    }

    // Handle GROUP type: expand children
    if (field.type === FIELD_TYPES.GROUP && field.children) {
      field.children.forEach(child => processField(child));
      return;
    }

    // Handle LOCATION type: split into lat, lon, accuracy
    if (field.type === FIELD_TYPES.LOCATION) {
      headers.push(
        { key: `${field.key}_lat`, label: `lat_${field.key}` },
        { key: `${field.key}_lng`, label: `long_${field.key}` },
        { key: `${field.key}_accuracy`, label: `accuracy_${field.key}` }
      );
      return;
    }

    // Default: single column
    headers.push({ key: field.key, label: field.label || field.key });
  };

  fields.forEach(field => processField(field));

  return (
    <thead>
      <tr>
        {headers.map(header => (
          <th key={header.key}>{header.label}</th>
        ))}
      </tr>
    </thead>
  );
}

UploadHeaders.propTypes = {
  fields: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string,
    type: PropTypes.string,
    children: PropTypes.array,
  })).isRequired,
  includeIdColumn: PropTypes.bool,
  idColumnLabel: PropTypes.string,
};
