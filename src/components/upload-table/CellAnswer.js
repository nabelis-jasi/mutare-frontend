import React from 'react';


const CellAnswer = ({ answer, rowIndex, responses, entryMapping, inputRef }) => {
  let hasError = false;

  if (responses && responses[rowIndex] && responses[rowIndex].errors) {
    // Check if any error matches this input_ref or is a project‑outdated error
    responses[rowIndex].errors.forEach((error) => {
      if (error.source === inputRef) {
        hasError = true;
        return false; // break loop
      }
      // Optionally handle project version outdated errors (ec5_201)
      if (error.source === 'upload-controller' && error.code === 'ec5_201') {
        hasError = true;
        return false;
      }
      return true;
    });
  }

  if (hasError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span className="material-icons answer-error__icon" style={{ color: '#e76f51' }}>
          error_outline
        </span>
        <span className="answer-label">{answer || '—'}</span>
      </div>
    );
  }

  return <span>{answer || '—'}</span>;
};

export default CellAnswer;
