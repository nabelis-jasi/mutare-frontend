
// src/components/shared/CellDelete.jsx
import React from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../../config/parameters';

/**
 * CellDelete – renders a delete button for an entry.
 * Permission logic: engineer and admin can always delete.
 * Field operators and collectors can delete only their own entries (if user ID matches).
 * Viewers cannot delete.
 *
 * @param {Object} props
 * @param {Object} props.content - Contains entryUuid and any other entry data.
 * @param {Function} props.onDelete - Callback when delete button is clicked, receives (entryUuid, entryTitle, entryExtra, rowIndex).
 * @param {Object} props.projectUser - { id, role } of the current user.
 * @param {string} props.entryTitle - Title/description of the entry.
 * @param {Object} props.entryExtra - Extra data containing `relationships.user.data.id` (the entry owner's ID).
 * @param {number} props.rowIndex - Index of the row (for callbacks).
 */
const CellDelete = ({ content, onDelete, projectUser, entryTitle, entryExtra, rowIndex }) => {
  const entryUuid = content?.entryUuid;

  // Determine if the current user can delete this entry
  let canUserDelete = PARAMETERS.IS_LOCALHOST === 1; // always true when debugging

  if (!canUserDelete && projectUser) {
    const { role, id } = projectUser;

    if (role) {
      // Engineer and admin roles have delete permission
      if (PARAMETERS.USER_PERMISSIONS.CAN_DELETE.includes(role)) {
        canUserDelete = true;
      } else {
        // For operators/collectors, check if they own the entry
        const entryOwnerId = entryExtra?.relationships?.user?.data?.id;
        if (id && entryOwnerId && id === entryOwnerId) {
          canUserDelete = true;
        }
      }
    } else if (id) {
      // No role but logged in – check ownership
      const entryOwnerId = entryExtra?.relationships?.user?.data?.id;
      if (entryOwnerId && id === entryOwnerId) {
        canUserDelete = true;
      }
    }
  }

  // Viewers cannot delete regardless
  if (projectUser?.role === PARAMETERS.PROJECT_ROLES.VIEWER) {
    canUserDelete = false;
  }

  const handleClick = () => {
    if (onDelete && canUserDelete) {
      onDelete(entryUuid, entryTitle, entryExtra, rowIndex);
    }
  };

  return (
    <div className="cell-delete">
      <button
        className="btn btn-default btn-danger btn-icon"
        disabled={!canUserDelete}
        onClick={handleClick}
      >
        <i className="material-icons">delete</i>
      </button>
    </div>
  );
};

CellDelete.propTypes = {
  content: PropTypes.shape({
    entryUuid: PropTypes.string,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  projectUser: PropTypes.shape({
    id: PropTypes.string,
    role: PropTypes.string,
  }),
  entryTitle: PropTypes.string,
  entryExtra: PropTypes.shape({
    relationships: PropTypes.shape({
      user: PropTypes.shape({
        data: PropTypes.shape({
          id: PropTypes.string,
        }),
      }),
    }),
  }),
  rowIndex: PropTypes.number,
};

export default CellDelete;
