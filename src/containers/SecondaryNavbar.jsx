
import React from 'react';
import PropTypes from 'prop-types';

const SecondaryNavbar = ({ onDrawerOpen }) => {
  return (
    <div className="navbar-secondary">
      <button onClick={() => onDrawerOpen('download')}>Download</button>
      <button onClick={() => onDrawerOpen('upload')}>Upload</button>
      <button onClick={() => onDrawerOpen('map')}>Map</button>
    </div>
  );
};

SecondaryNavbar.propTypes = {
  onDrawerOpen: PropTypes.func.isRequired,
};

export default SecondaryNavbar;
