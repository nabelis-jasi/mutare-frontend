
import React from 'react';
import PropTypes from 'prop-types';


 */
const CellError = ({ responses, parentRowIndex, entryMapping }) => {
  let errorTitle = '';

  if (responses && responses[parentRowIndex] && responses[parentRowIndex].errors) {
    responses[parentRowIndex].errors.forEach((error) => {
      if (error.source === entryMapping.input_ref) {
        errorTitle = error.title;
        return false; // break loop
      }
      // Handle project version outdated error (ec5_201)
      if (error.source === 'upload-controller' && error.code === 'ec5_201') {
        errorTitle = error.title;
        return false;
      }
      return true;
    });
  }

  return (
    <div>
      <span className="answer-error-label">
        <small>{errorTitle}</small>
      </span>
    </div>
  );
};

CellError.propTypes = {
  responses: PropTypes.array,
  parentRowIndex: PropTypes.number,
  entryMapping: PropTypes.shape({
    input_ref: PropTypes.string,
  }),
};

export default CellError;
