
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PARAMETERS from '../config/parameters';

const FilterEntriesControls = ({ onFilterChange }) => {
  const [filterType, setFilterType] = useState('all');
  const [searchText, setSearchText] = useState('');

  const applyFilter = () => {
    onFilterChange({ filterType, searchText });
  };

  return (
    <div className="filter-entries-controls">
      <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
        <option value="all">All Entries</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="rejected">Rejected</option>
      </select>
      <input
        type="text"
        placeholder="Search..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      <button onClick={applyFilter}>Apply</button>
    </div>
  );
};

FilterEntriesControls.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
};

export default FilterEntriesControls;
