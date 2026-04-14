// src/components/shared/CellText.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CellText – renders a simple text answer inside a styled div.
 * Used in tables to display non‑media, non‑location field values.
 *
 * @param {Object} props
 * @param {Object} props.content - Contains the answer (and optionally other metadata).
 * @param {string|number} props.content.answer - The answer text to display.
 */
const CellText = ({ content }) => {
  const answer = content?.answer ?? '—';
  return (
    <div className="cell-content-wrapper">
      <div className="cell-content">{answer}</div>
    </div>
  );
};

CellText.propTypes = {
  content: PropTypes.shape({
    answer: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};

export default CellText;
