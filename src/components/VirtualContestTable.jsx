import React from 'react';
import VirtualContestRow from './VirtualContestRow.jsx';

function VirtualContestTable({ contests, sort, handle, onSortChange, onContestClick, totalContests }) {
  const getSortIndicator = (currentSortType) => {
    if (sort === currentSortType) return ' \u25B2';
    const reverseMap = {
      'newest': 'oldest',
      'oldest': 'newest',
      'best-rank': 'worst-rank',
      'worst-rank': 'best-rank',
      'most-solved': 'least-solved',
      'least-solved': 'most-solved',
      'highest-delta': 'lowest-delta',
      'lowest-delta': 'highest-delta'
    };
    if (sort === reverseMap[currentSortType]) return ' \u25BC';
    return '';
  };

  const handleHeaderClick = (type) => {
    onSortChange(type);
  };

  const getSortClass = (currentSortType) => {
    if (sort === currentSortType) return 'sort-asc';
    const reverseMap = {
      'newest': 'oldest',
      'oldest': 'newest',
      'best-rank': 'worst-rank',
      'worst-rank': 'best-rank',
      'most-solved': 'least-solved',
      'least-solved': 'most-solved',
      'highest-delta': 'lowest-delta',
      'lowest-delta': 'highest-delta'
    };
    if (sort === reverseMap[currentSortType]) return 'sort-desc';
    return '';
  };

  const getHeaderClass = (currentSortType) => {
    const cls = ['sortable', getSortClass(currentSortType)].filter(Boolean).join(' ');
    return cls;
  };

  return (
    <div className="datatable">
      <div className="lt">&nbsp;</div>
      <div className="rt">&nbsp;</div>
      <div className="lb">&nbsp;</div>
      <div className="rb">&nbsp;</div>

      <div className="datatable-caption">
        <span className="title">&rarr; Virtual Contest History</span>
        <span className="row-count">{totalContests} &times;</span>
        <div className="filter-control">
          <span style={{ padding: '0', position: 'relative', bottom: '2px' }}>
            <img
              className="closed"
              src="https://codeforces.org/s/12684/images/icons/magnifier-medium.png"
              alt=""
            />
            <span className="filter" style={{ display: 'none' }}>
              <img
                className="opened"
                src="https://codeforces.org/s/12684/images/icons/control-270.png"
                alt=""
              />
              <input
                style={{ padding: '0 0 0 20px', position: 'relative', bottom: '2px', border: '1px solid #aaa', height: '17px', fontSize: '1.3rem' }}
                type="text"
                placeholder="Filter..."
              />
            </span>
          </span>
        </div>
      </div>

      <div className="datatable-inner">
        <div className="ilt">&nbsp;</div>
        <div className="irt">&nbsp;</div>
        <table>
          <thead>
            <tr>
              <th className="top" style={{ width: '30px' }}>#</th>
              <th className="left top">Contest</th>
              <th className="top" style={{ width: '85px' }}>Contest Date</th>
              <th
                className={`top ${getHeaderClass('newest')}`}
                style={{ width: '85px' }}
                onClick={() => handleHeaderClick(sort === 'newest' ? 'oldest' : 'newest')}
              >
                Virtual Date{getSortIndicator('newest') || getSortIndicator('oldest')}
              </th>
              <th
                className={`top ${getHeaderClass('best-rank')}`}
                onClick={() => handleHeaderClick(sort === 'best-rank' ? 'worst-rank' : 'best-rank')}
              >
                Rank{getSortIndicator('best-rank') || getSortIndicator('worst-rank')}
              </th>
              <th
                className={`top ${getHeaderClass('most-solved')}`}
                onClick={() => handleHeaderClick(sort === 'most-solved' ? 'least-solved' : 'most-solved')}
              >
                Solved{getSortIndicator('most-solved') || getSortIndicator('least-solved')}
              </th>
              <th className="top">Rating Change</th>
              <th className="top">Performance</th>
              <th
                className={`top ${getHeaderClass('highest-delta')}`}
                onClick={() => handleHeaderClick(sort === 'highest-delta' ? 'lowest-delta' : 'highest-delta')}
              >
                &Delta;{getSortIndicator('highest-delta') || getSortIndicator('lowest-delta')}
              </th>
            </tr>
          </thead>
          <tbody>
            {contests.map((contest, index) => (
              <VirtualContestRow
                key={`${contest.contestId}-${contest.virtualStartTime}`}
                index={index}
                contest={contest}
                handle={handle}
                onClick={() => onContestClick(contest)}
              />
            ))}
            {contests.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No virtual contests match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VirtualContestTable;
