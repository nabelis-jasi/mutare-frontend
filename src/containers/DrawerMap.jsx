// src/containers/DrawerMap.jsx
import React from 'react';
import PropTypes from 'prop-types';
import MapView from '../components/MapView';

const DrawerMap = ({ entries, onClose }) => {
  // Convert entries to features for MapView (if needed)
  const manholes = entries?.filter(e => e.type === 'manhole') || [];
  const pipelines = entries?.filter(e => e.type === 'pipeline') || [];

  return (
    <div className="drawer drawer-map">
      <div className="drawer-header">
        <h3>Map View</h3>
        <button className="drawer-close" onClick={onClose}>✕</button>
      </div>
      <div className="drawer-body">
        <MapView manholes={manholes} pipes={pipelines} />
      </div>
    </div>
  );
};

DrawerMap.propTypes = {
  entries: PropTypes.array,
  onClose: PropTypes.func.isRequired,
};

export default DrawerMap;
