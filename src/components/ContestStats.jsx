import React, { useMemo } from 'react';

function ContestStats({ contests }) {
  const stats = useMemo(() => {
    if (!contests || contests.length === 0) {
      return { count: 0, totalSolved: 0, avgRank: 0, bestRank: '-', avgSolved: 0 };
    }

    const count = contests.length;
    let totalSolved = 0;
    let sumRank = 0;
    let validRanks = 0;
    let bestRank = Infinity;

    contests.forEach(c => {
      totalSolved += (c.solvedCount || 0);
      if (c.rank != null) {
        sumRank += c.rank;
        validRanks++;
        if (c.rank < bestRank) {
          bestRank = c.rank;
        }
      }
    });

    const avgRank = validRanks > 0 ? (sumRank / validRanks) : 0;
    const avgSolved = count > 0 ? (totalSolved / count) : 0;

    return {
      count,
      totalSolved,
      avgRank: Math.round(avgRank),
      bestRank: bestRank === Infinity ? '-' : bestRank,
      avgSolved: avgSolved.toFixed(1)
    };
  }, [contests]);

  return (
    <div className="roundbox borderTopRound borderBottomRound">
      <div className="caption titled">
        &rarr; Statistics
        <div className="top-links"></div>
      </div>
      <div className="roundbox-content">
        <div className="stat-row">
          <span className="stat-label">Virtual Contests:</span>
          <span className="stat-value">{stats.count}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Problems Solved:</span>
          <span className="stat-value">{stats.totalSolved}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Average Rank:</span>
          <span className="stat-value">{stats.avgRank || '-'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Best Rank:</span>
          <span className="stat-value">{stats.bestRank}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg. Solved:</span>
          <span className="stat-value">{stats.avgSolved}</span>
        </div>
      </div>
    </div>
  );
}

export default ContestStats;
