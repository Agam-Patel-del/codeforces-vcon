import React from 'react';

function ContestFilters({
  typeFilter,
  filter,
  sort,
  search,
  solvedFilter,
  onTypeFilterChange,
  onFilterChange,
  onSortChange,
  onSearchChange,
  onSolvedFilterChange
}) {
  const divisionFilters = ['all', 'div1', 'div2', 'div3', 'div4', 'educational', 'global', 'gym', 'other'];
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
      case 'gym': return 'Gym';
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
            <option value="all">All (Virtual & Unrated)</option>
            <option value="all-no-gym">All (without Gym)</option>
            <option value="virtual">Virtual Only</option>
            <option value="virtual-no-gym">Virtual (without Gym)</option>
            <option value="unrated">Unrated (Live) Only</option>
            <option value="gym">Gym Only</option>
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
              <option key={s} value={s}>{s === 'all' ? 'Any' : `${s} problems`}</option>
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
            <option value="newest">Participation Date (Newest)</option>
            <option value="oldest">Participation Date (Oldest)</option>
            <option value="contest-newest">Original Date (Newest)</option>
            <option value="contest-oldest">Original Date (Oldest)</option>
            <option value="best-rank">Best Rank</option>
            <option value="worst-rank">Worst Rank</option>
            <option value="most-solved">Most Solved</option>
            <option value="least-solved">Least Solved</option>
            <option value="highest-delta">Highest &Delta;</option>
            <option value="lowest-delta">Lowest &Delta;</option>
            <option value="best-perf">Best Performance</option>
            <option value="worst-perf">Worst Performance</option>
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
