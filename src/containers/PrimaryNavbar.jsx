
import React from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../config/parameters';

const PrimaryNavbar = ({ projectName, onNavigate, activePage }) => {
  return (
    <nav className="navbar navbar-primary">
      <div className="navbar-brand">
        <span className="logo">{PARAMETERS.APP_NAME}</span>
        <span className="project-name">{projectName}</span>
      </div>
      <div className="navbar-links">
        <button
          className={activePage === PARAMETERS.PAGE_HOME ? 'active' : ''}
          onClick={() => onNavigate(PARAMETERS.PAGE_HOME)}
        >
          Home
        </button>
        <button
          className={activePage === PARAMETERS.PAGE_MAP ? 'active' : ''}
          onClick={() => onNavigate(PARAMETERS.PAGE_MAP)}
        >
          Map
        </button>
        <button
          className={activePage === PARAMETERS.PAGE_TABLE ? 'active' : ''}
          onClick={() => onNavigate(PARAMETERS.PAGE_TABLE)}
        >
          Data
        </button>
      </div>
    </nav>
  );
};

PrimaryNavbar.propTypes = {
  projectName: PropTypes.string,
  onNavigate: PropTypes.func.isRequired,
  activePage: PropTypes.string,
};

export default PrimaryNavbar;
