import React, { useMemo } from 'react';
import { getRatingColorClass, getRatingTitle } from '../utils/rating.js';

function formatTitle(title) {
  if (!title || title === 'unrated') return '';
  return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function ContestStats({ contests }) {
  const stats = useMemo(() => {
    if (!contests || contests.length === 0) {
      return {
        count: 0,
        totalSolved: 0,
        avgRank: 0,
        bestRank: '-',
        avgSolved: 0,
        peakPerf: null,
        peakTitle: '',
        last5Perf: null,
        perfTrendDiff: 0,
        last5AvgRank: null,
        rankTrendDiff: 0
      };
    }

    const count = contests.length;
    let totalSolved = 0;
    let sumRank = 0;
    let validRanks = 0;
    let bestRank = Infinity;

    let peakPerf = -Infinity;
    let sumPerf = 0;
    let validPerfs = 0;

    contests.forEach(c => {
      totalSolved += (c.solvedCount || 0);

      if (c.rank != null && c.rank > 0) {
        sumRank += c.rank;
        validRanks++;
        if (c.rank < bestRank) {
          bestRank = c.rank;
        }
      }

      if (c.performanceRating != null && typeof c.performanceRating === 'number') {
        const perf = Math.round(c.performanceRating);
        sumPerf += perf;
        validPerfs++;
        if (perf > peakPerf) {
          peakPerf = perf;
        }
      }
    });

    const avgRank = validRanks > 0 ? (sumRank / validRanks) : 0;
    const avgSolved = count > 0 ? (totalSolved / count) : 0;
    const overallAvgPerf = validPerfs > 0 ? (sumPerf / validPerfs) : null;

    // Calculate Last 5 Contests Performance
    const sortedByDatePerf = [...contests]
      .filter(c => c.performanceRating != null && typeof c.performanceRating === 'number')
      .sort((a, b) => (b.virtualStartTime || 0) - (a.virtualStartTime || 0));

    const last5PerfList = sortedByDatePerf.slice(0, 5);
    let last5Perf = null;
    let perfTrendDiff = 0;

    if (last5PerfList.length > 0) {
      const sumLast5Perf = last5PerfList.reduce((acc, c) => acc + Math.round(c.performanceRating), 0);
      last5Perf = Math.round(sumLast5Perf / last5PerfList.length);
      if (overallAvgPerf !== null) {
        perfTrendDiff = last5Perf - Math.round(overallAvgPerf);
      }
    }

    // Calculate Last 5 Contests Average Rank
    const sortedByDateRank = [...contests]
      .filter(c => c.rank != null && c.rank > 0)
      .sort((a, b) => (b.virtualStartTime || 0) - (a.virtualStartTime || 0));

    const last5RankList = sortedByDateRank.slice(0, 5);
    let last5AvgRank = null;
    let rankTrendDiff = 0;

    if (last5RankList.length > 0) {
      const sumLast5Rank = last5RankList.reduce((acc, c) => acc + c.rank, 0);
      last5AvgRank = Math.round(sumLast5Rank / last5RankList.length);
      if (validRanks > 0) {
        // Lower rank is better: diff = overallAvgRank - last5AvgRank (positive means improved rank)
        rankTrendDiff = Math.round(avgRank) - last5AvgRank;
      }
    }

    return {
      count,
      totalSolved,
      avgRank: Math.round(avgRank),
      bestRank: bestRank === Infinity ? '-' : bestRank,
      avgSolved: avgSolved.toFixed(1),
      peakPerf: peakPerf === -Infinity ? null : peakPerf,
      peakTitle: peakPerf === -Infinity ? '' : formatTitle(getRatingTitle(peakPerf)),
      last5Perf,
      perfTrendDiff,
      last5AvgRank,
      rankTrendDiff
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
          <span className="stat-label">Contests:</span>
          <span className="stat-value">{stats.count}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Problems Solved:</span>
          <span className="stat-value">{stats.totalSolved}</span>
        </div>

        {stats.peakPerf != null && (
          <div className="stat-row">
            <span className="stat-label">Peak Performance:</span>
            <span className="stat-value">
              <span className={getRatingColorClass(stats.peakPerf)} style={{ fontWeight: 'bold' }}>
                {stats.peakPerf}
              </span>
              {stats.peakTitle && (
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>
                  ({stats.peakTitle})
                </span>
              )}
            </span>
          </div>
        )}

        {stats.last5Perf != null && (
          <div className="stat-row">
            <span className="stat-label">Last 5 Avg. Perf:</span>
            <span className="stat-value">
              <span className={getRatingColorClass(stats.last5Perf)} style={{ fontWeight: 'bold' }}>
                {stats.last5Perf}
              </span>
              {stats.perfTrendDiff !== 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    marginLeft: '4px',
                    fontWeight: 'bold',
                    color: stats.perfTrendDiff > 0 ? '#15803d' : '#b91c1c'
                  }}
                  title={`Relative to overall performance average: ${stats.perfTrendDiff > 0 ? '+' : ''}${stats.perfTrendDiff}`}
                >
                  {stats.perfTrendDiff > 0 ? `\u2197 +${stats.perfTrendDiff}` : `\u2198 ${stats.perfTrendDiff}`}
                </span>
              )}
            </span>
          </div>
        )}

        {stats.last5AvgRank != null && (
          <div className="stat-row">
            <span className="stat-label">Last 5 Avg. Rank:</span>
            <span className="stat-value">
              <span style={{ fontWeight: 'bold' }}>{stats.last5AvgRank}</span>
              {stats.rankTrendDiff !== 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    marginLeft: '4px',
                    fontWeight: 'bold',
                    color: stats.rankTrendDiff > 0 ? '#15803d' : '#b91c1c'
                  }}
                  title={`Relative to overall rank average: ${stats.rankTrendDiff > 0 ? '+' : ''}${stats.rankTrendDiff} (${stats.rankTrendDiff > 0 ? 'better' : 'worse'})`}
                >
                  {stats.rankTrendDiff > 0 ? `\u2197 +${stats.rankTrendDiff}` : `\u2198 ${stats.rankTrendDiff}`}
                </span>
              )}
            </span>
          </div>
        )}

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
