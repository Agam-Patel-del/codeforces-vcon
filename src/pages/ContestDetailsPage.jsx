import React, { useState, useEffect, useMemo } from 'react';
import CodeforcesHeader from '../components/CodeforcesHeader.jsx';
import { getHandle } from '../services/storageService.js';
import { getCachedVirtualContests } from '../services/storageService.js';
import { formatDateTime, formatDuration } from '../utils/dates.js';
import { getRatingColorClass, formatDelta, getDeltaClass } from '../utils/rating.js';
import { getContestUrl, getProblemUrl, getVirtualStandingsUrl } from '../utils/contest.js';

import { getPerformanceRating } from '../services/ratingService.js';

function ContestDetailsPage({ contestId, virtualStartTime }) {
  const [handle, setHandle] = useState('');
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const storedHandle = await getHandle();
      if (storedHandle) {
        setHandle(storedHandle);
        const cachedContests = await getCachedVirtualContests(storedHandle);
        if (cachedContests && Array.isArray(cachedContests)) {
          const found = cachedContests.find(c =>
            c.contestId.toString() === contestId.toString() &&
            c.virtualStartTime === virtualStartTime
          );
          if (found) {
            let perf = found.performanceRating;
            if (perf == null) {
              try {
                perf = await getPerformanceRating(found.contestId, found.rank, found.virtualStartTime);
              } catch (e) {}
            }
            setContest({ ...found, performanceRating: perf });
          } else {
            setContest(null);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [contestId, virtualStartTime]);

  const problems = useMemo(() => {
    if (!contest) return [];

    const solved = (contest.solvedProblems || []).map(p => ({ ...p, solved: true }));
    const unsolved = (contest.unsolvedProblems || []).map(p => ({ ...p, solved: false }));

    return [...solved, ...unsolved].sort((a, b) => a.index.localeCompare(b.index));
  }, [contest]);

  if (loading) {
    return (
      <>
        <CodeforcesHeader handle={handle} />
        <div id="content">
          <div className="notice">Loading contest details...</div>
        </div>
        <div className="clear"></div>
      </>
    );
  }

  if (!contest) {
    return (
      <>
        <CodeforcesHeader handle={handle} />
        <div id="content">
          <div className="notice" style={{ color: 'red' }}>Contest not found in cache.</div>
          <div style={{ marginTop: '1em' }}>
            <a href="#/" className="back-link">&#8592; Back to Contests History</a>
          </div>
        </div>
        <div className="clear"></div>
      </>
    );
  }

  return (
    <>
      <CodeforcesHeader handle={handle} />
      <br style={{ clear: 'both' }} />

      <div id="sidebar">
        <div className="roundbox borderTopRound">
          <div className="caption titled">
            &rarr; Contest Details
            <div className="top-links"></div>
          </div>
          <div className="roundbox-content">
            <table className="detail-table">
              <tbody>
                <tr>
                  <td className="label-col">Rank:</td>
                  <td>{contest.rank || '-'}</td>
                </tr>
                <tr>
                  <td className="label-col">Solved:</td>
                  <td>{contest.solvedCount} / {contest.totalProblems}</td>
                </tr>
                <tr>
                  <td className="label-col">Rating:</td>
                  <td>
                    <span className={getRatingColorClass(contest.ratingBefore)}>{contest.ratingBefore || '-'}</span>
                    {' \u2192 '}
                    <span className={getRatingColorClass(contest.predictedRatingAfter)}>{contest.predictedRatingAfter || '-'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="label-col">Performance:</td>
                  <td>
                    <span className={getRatingColorClass(contest.performanceRating)}>
                      {contest.performanceRating != null ? Math.round(contest.performanceRating) : '-'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="label-col">Delta:</td>
                  <td>
                    <span className={getDeltaClass(contest.predictedRatingDelta)}>
                      {contest.predictedRatingDelta != null ? formatDelta(contest.predictedRatingDelta) : '-'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="roundbox borderTopRound borderBottomRound" style={{ marginTop: '1.5em' }}>
          <div className="caption titled">
            &rarr; Actions
            <div className="top-links"></div>
          </div>
          <div className="roundbox-content">
            <table className="detail-table">
              <tbody>
                <tr>
                  <td className="label-col">
                    <a href={getContestUrl(contest.contestId)} target="_blank" rel="noopener noreferrer">
                      Contest Page &raquo;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="label-col">
                    <a href={getVirtualStandingsUrl(contest.contestId)} target="_blank" rel="noopener noreferrer">
                      Standings &raquo;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="label-col">
                    <a href={`https://codeforces.com/contest/${contest.contestId}/standings/friends/true`} target="_blank" rel="noopener noreferrer">
                      Friends Standings &raquo;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="label-col">
                    <a href={`https://codeforces.com/contest/${contest.contestId}/my`} target="_blank" rel="noopener noreferrer">
                      My Submissions &raquo;
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="content">
        <div className="caption" style={{ marginBottom: '0.5em' }}>
          <span style={{ fontSize: '1.4rem' }}>
            <a href="#/" style={{ textDecoration: 'none', color: '#333' }}>Contests History</a>
            {' \u2192 '}
            <a href={getContestUrl(contest.contestId)} target="_blank" rel="noopener noreferrer">
              {contest.contestName}
            </a>
          </span>
        </div>

        <div className="datatable">
          <div className="lt">&nbsp;</div>
          <div className="rt">&nbsp;</div>
          <div className="lb">&nbsp;</div>
          <div className="rb">&nbsp;</div>

          <div className="datatable-caption">
            <span className="title">&rarr; Problems</span>
          </div>

          <div className="datatable-inner">
            <div className="ilt">&nbsp;</div>
            <div className="irt">&nbsp;</div>

            <div style={{ padding: '0.5em', borderBottom: '1px solid #b9b9b9', backgroundColor: '#f8f8f8', fontSize: '1.3rem' }}>
              <strong>Virtual Date:</strong> {formatDateTime(contest.virtualStartTime)} |
              <strong> Official Date:</strong> {formatDateTime(contest.contestStartTime)} |
              <strong> Duration:</strong> {formatDuration(contest.contestDurationSeconds)}
            </div>

            <table>
              <thead>
                <tr>
                  <th className="top left">#</th>
                  <th className="top left">Problem Name</th>
                  <th className="top" style={{ width: '6em' }}>Status</th>
                  <th className="top" style={{ width: '5em' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p, index) => {
                  let statusText = '-';
                  let statusClass = 'verdict-fail';

                  if (p.solved) {
                    statusText = p.wrongAttempts > 0 ? `+${p.wrongAttempts}` : '+';
                    statusClass = 'verdict-ac';
                  } else if (p.upsolved) {
                    statusText = 'upsolved';
                    statusClass = 'verdict-upsolved';
                  } else if (p.wrongAttempts > 0) {
                    statusText = `-${p.wrongAttempts}`;
                    statusClass = 'verdict-fail';
                  }

                  let timeText = '';
                  if (p.solved) {
                    const elapsedMinutes = Math.floor((p.solvedTimeSeconds - contest.virtualStartTime) / 60);
                    const h = Math.floor(elapsedMinutes / 60);
                    const m = elapsedMinutes % 60;
                    timeText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  } else if (p.upsolved) {
                    timeText = 'Practice';
                  }

                  return (
                    <tr key={p.index} className={index % 2 === 1 ? 'dark' : ''}>
                      <td className="bottom left">
                        <a href={getProblemUrl(contest.contestId, p.index)} target="_blank" rel="noopener noreferrer">
                          {p.index}
                        </a>
                      </td>
                      <td className="bottom left">
                        <a href={getProblemUrl(contest.contestId, p.index)} target="_blank" rel="noopener noreferrer">
                          {p.name}
                        </a>
                      </td>
                      <td className="bottom">
                        <span className={statusClass}>
                          {statusText}
                        </span>
                      </td>
                      <td className="bottom" style={{ color: '#888' }}>
                        {timeText}
                      </td>
                    </tr>
                  );
                })}
                {problems.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2em', color: '#888' }}>
                      No problems found for this contest.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '1em' }}>
          <a href="#/" className="back-link">&#8592; Back to Contests History</a>
        </div>
      </div>

      <div className="clear"></div>
    </>
  );
}

export default ContestDetailsPage;
