import React from 'react';
import { formatDate } from '../utils/dates.js';
import { getRatingColorClass, formatDelta, getDeltaClass } from '../utils/rating.js';
import { getContestUrl } from '../utils/contest.js';

function VirtualContestRow({ contest, index, handle, onClick }) {
  const {
    contestId,
    contestName,
    contestStartTime,
    virtualStartTime,
    rank,
    solvedCount,
    totalProblems,
    ratingBefore,
    predictedRatingDelta
  } = contest;

  const handleRowClick = (e) => {
    if (e.target.tagName.toLowerCase() === 'a') return;
    onClick();
  };

  const renderBadge = () => {
    if (contest.participationType === 'unrated') {
      return (
        <span className="unrated-subtext" title="Out of Competition / Unrated Live">
          (unrated)
        </span>
      );
    }
    if (contest.isIneligible) {
      return (
        <span className="unrated-subtext" title="Ineligible for rating change due to division limit">
          (ineligible)
        </span>
      );
    }
    return null;
  };

  return (
    <tr onClick={handleRowClick} className={index % 2 === 1 ? 'dark' : ''} style={{ cursor: 'pointer' }}>
      <td className="bottom">{index + 1}</td>
      <td className="left bottom">
        <a
          href={getContestUrl(contestId)}
          target="_blank"
          rel="noopener noreferrer"
          title={contestName}
        >
          {contestName}
        </a>
        {' '}
        {renderBadge()}
      </td>
      <td className="bottom">{formatDate(contestStartTime)}</td>
      <td className="bottom">{formatDate(virtualStartTime)}</td>
      <td className="bottom">
        <a
          href={`https://codeforces.com/contest/${contestId}/standings`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {rank ?? '-'}
        </a>
      </td>
      <td className="bottom">
        <a
          href={`https://codeforces.com/contest/${contestId}/my`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {`${solvedCount ?? 0} / ${totalProblems ?? '?'}`}
        </a>
      </td>
      <td className="bottom">
        <span className={getRatingColorClass(ratingBefore)}>{ratingBefore ?? '-'}</span>
        {' \u2192 '}
        <span className={getRatingColorClass(contest.predictedRatingAfter)}>{contest.predictedRatingAfter ?? '-'}</span>
      </td>
      <td className="bottom">
        <span className={getRatingColorClass(contest.performanceRating)}>
          {contest.performanceRating != null ? Math.round(contest.performanceRating) : '-'}
        </span>
      </td>
      <td className="bottom">
        <span className={getDeltaClass(predictedRatingDelta)}>
          {predictedRatingDelta != null ? formatDelta(predictedRatingDelta) : '-'}
        </span>
      </td>
    </tr>
  );
}

export default VirtualContestRow;
