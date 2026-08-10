import React from 'react';

function ContestFilters({ filter, typeFilter, sort, search, solvedFilter, onFilterChange, onTypeFilterChange, onSortChange, onSearchChange, onSolvedFilterChange }) {
  const divisionFilters = ['all', 'div1', 'div2', 'div3', 'div4', 'educational', 'global', 'other'];
  const solvedFilters = ['all', '0-2', '3-4', '5+'];

  const getDivLabel = (div) => {
    switch (div) {
      case 'all': return 'All';
      case 'div1': return 'Div. 1';
      case 'div2': return 'Div. 2';
      case 'div3': return 'Div. 3';
      case 'div4': return 'Div. 4';
      case 'educational': return 'Educational';
      case 'global': return 'Global';
      case 'other': return 'Other';
      default: return div;
    }
  };

  return (
    <div className="roundbox borderTopRound borderBottomRound">
      <div className="caption titled">
        &rarr; Filters
        <div className="top-links"></div>
      </div>
      <div className="roundbox-content">
        <div className="setting-name">
          <label htmlFor="filter-type">Type:</label>
        </div>
        <div className="setting-value">
          <select
            id="filter-type"
            className="cf-input"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            style={{ maxWidth: '17em' }}
          >
            <option value="virtual">Virtual</option>
            <option value="official">Official</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="setting-name">
          <label htmlFor="filter-division">Division:</label>
        </div>
        <div className="setting-value">
          <select
            id="filter-division"
            className="cf-input"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            style={{ maxWidth: '17em' }}
          >
            {divisionFilters.map(d => (
              <option key={d} value={d}>{getDivLabel(d)}</option>
            ))}
          </select>
        </div>

        <div className="setting-name">
          <label htmlFor="filter-sort">Sort By:</label>
        </div>
        <div className="setting-value">
          <select
            id="filter-sort"
            className="cf-input"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            style={{ maxWidth: '17em' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="best-rank">Best Rank</option>
            <option value="worst-rank">Worst Rank</option>
            <option value="most-solved">Most Solved</option>
            <option value="least-solved">Least Solved</option>
            <option value="highest-delta">Highest &Delta;</option>
            <option value="lowest-delta">Lowest &Delta;</option>
          </select>
        </div>

        <div className="setting-name">
          <label htmlFor="filter-solved">Solved:</label>
        </div>
        <div className="setting-value">
          <select
            id="filter-solved"
            className="cf-input"
            value={solvedFilter}
            onChange={(e) => onSolvedFilterChange(e.target.value)}
            style={{ maxWidth: '17em' }}
          >
            {solvedFilters.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'Any' : s + ' problems'}</option>
            ))}
          </select>
        </div>

        <div className="setting-name">
          <label htmlFor="filter-search">Search:</label>
        </div>
        <div className="setting-value">
          <input
            id="filter-search"
            type="text"
            className="cf-input"
            placeholder="Contest name or ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ maxWidth: '17em' }}
          />
        </div>
      </div>
    </div>
  );
}

export default ContestFilters;
