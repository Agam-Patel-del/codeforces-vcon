import * as api from '../api/codeforcesApi.js';
import * as storage from './storageService.js';
import * as ratingService from './ratingService.js';
import { getVirtualContestKey, getContestUrl, getVirtualStandingsUrl, getContestType } from '../utils/contest.js';

async function discoverVirtualContests(handle) {
  const status = await api.getUserStatus(handle);
  
  const strictVirtuals = status.filter(sub => sub.author.participantType === 'VIRTUAL');
  
  const officialSolves = {};
  for (const sub of status) {
    if ((sub.author.participantType === 'CONTESTANT' || sub.author.participantType === 'OUT_OF_COMPETITION') && sub.verdict === 'OK') {
      if (!officialSolves[sub.contestId]) officialSolves[sub.contestId] = new Set();
      officialSolves[sub.contestId].add(sub.problem.index);
    }
  }
  const solvesCount = {};
  for (const cid in officialSolves) {
    solvesCount[cid] = officialSolves[cid].size;
  }
  await storage.setCachedOfficialSolves(handle, solvesCount);

  const groups = new Map();
  for (const sub of strictVirtuals) {
    const key = getVirtualContestKey(sub.contestId, sub.author.startTimeSeconds);
    if (!groups.has(key)) {
      groups.set(key, {
        contestId: sub.contestId,
        virtualStartTime: sub.author.startTimeSeconds,
        submissions: []
      });
    }
    groups.get(key).submissions.push(sub);
  }

  return Array.from(groups.values());
}

async function enrichVirtualContest(contestId, virtualStartTime, submissions, handle, contestMap) {
  const contestInfo = contestMap.get(contestId);
  
  let standingsData = null;
  try {
    // Codeforces blocked showUnofficial and handles for non-admins.
    // Fetch official standings without extra parameters directly to save rate-limit time.
    standingsData = await api.getContestStandings(contestId);
  } catch (e) {
    standingsData = { rows: [], problems: [], contest: { type: 'CF' } };
  }

  let virtualRank = 0;
  let row = standingsData.rows.find(r => 
    r.party.participantType === 'VIRTUAL' && 
    (!r.party.startTimeSeconds || r.party.startTimeSeconds === virtualStartTime)
  );

  // If CF blocked showUnofficial, row will be undefined. We must estimate rank!
  if (!row && standingsData.rows.length > 0) {
    let myPoints = 0;
    let myPenalty = 0;
    const contestType = standingsData.contest.type; // 'CF' or 'ICPC'
    
    standingsData.problems.forEach(p => {
      // Find successful submission
      const okSub = submissions.find(s => s.verdict === 'OK' && s.problem.index === p.index);
      if (okSub) {
        const solveTimeSeconds = okSub.creationTimeSeconds - virtualStartTime;
        const solveTimeMinutes = Math.max(0, Math.floor(solveTimeSeconds / 60));
        
        const wrongTries = submissions.filter(s => 
          s.problem.index === p.index && 
          s.creationTimeSeconds < okSub.creationTimeSeconds && 
          s.verdict !== 'OK' && 
          s.verdict !== 'COMPILATION_ERROR' && 
          s.passedTestCount > 0
        ).length;

        if (contestType === 'ICPC' || p.points === undefined) {
          myPoints += 1;
          myPenalty += solveTimeMinutes + 10 * wrongTries;
        } else {
          // CF scoring: M - (M/250)*T - 50*W
          const maxPoints = p.points;
          let pts = maxPoints - (maxPoints / 250) * solveTimeMinutes - 50 * wrongTries;
          pts = Math.max(pts, maxPoints * 0.3);
          // Round to integer, CF uses exact values but occasionally floats, we round
          myPoints += Math.round(pts);
        }
      }
    });

    // Binary search or linear scan to find rank
    virtualRank = standingsData.rows.filter(r => {
      const isIcpc = contestType === 'ICPC' || standingsData.problems[0]?.points === undefined;
      if (isIcpc) {
        return r.points > myPoints || (r.points === myPoints && r.penalty < myPenalty);
      } else {
        return r.points > myPoints;
      }
    }).length + 1;
  } else if (row) {
    virtualRank = row.rank;
  }
  
  const solvedIndices = new Set(
    submissions.filter(s => s.verdict === 'OK').map(s => s.problem.index)
  );

  let problemsList = standingsData.problems || [];
  
  if (problemsList.length === 0) {
    // Fallback: extract unique problems from submissions if standings failed
    const seen = new Set();
    for (const s of submissions) {
      if (!seen.has(s.problem.index)) {
        seen.add(s.problem.index);
        problemsList.push(s.problem);
      }
    }
    // Sort problems by index
    problemsList.sort((a, b) => a.index.localeCompare(b.index));
  }
  
  const solvedProblems = [];
  const unsolvedProblems = [];

  for (const p of problemsList) {
    if (solvedIndices.has(p.index)) {
      const okSub = submissions.find(s => s.verdict === 'OK' && s.problem.index === p.index);
      const wrongTries = submissions.filter(s => 
        s.problem.index === p.index && 
        s.creationTimeSeconds < okSub.creationTimeSeconds && 
        s.verdict !== 'OK' && 
        s.verdict !== 'COMPILATION_ERROR' && 
        s.passedTestCount > 0
      ).length;
      
      solvedProblems.push({ 
        index: p.index, 
        name: p.name, 
        solvedTimeSeconds: okSub ? okSub.creationTimeSeconds : 0,
        wrongAttempts: wrongTries
      });
    } else {
      const wrongTries = submissions.filter(s => 
        s.problem.index === p.index && 
        s.verdict !== 'COMPILATION_ERROR' && 
        s.passedTestCount > 0
      ).length;
      
      unsolvedProblems.push({ 
        index: p.index, 
        name: p.name,
        wrongAttempts: wrongTries
      });
    }
  }

  const ratingBefore = await ratingService.getRatingAtTime(handle, virtualStartTime);
  let predictedRatingDelta = 0;
  let predictedRatingAfter = ratingBefore;
  let performanceRating = null;
  let ratingConfidence = 'estimated';

  if (virtualRank > 0) {
    const prediction = await ratingService.predictRatingDelta(handle, contestId, virtualRank, virtualStartTime);
    predictedRatingDelta = prediction.delta;
    predictedRatingAfter = prediction.newRating;
    performanceRating = prediction.performanceRating;
    ratingConfidence = prediction.confidence;
  }

  return {
    contestId,
    contestName: contestInfo ? contestInfo.name : `Contest ${contestId}`,
    contestStartTime: contestInfo ? contestInfo.startTimeSeconds : 0,
    contestDurationSeconds: contestInfo ? contestInfo.durationSeconds : 0,
    virtualStartTime,
    rank: virtualRank,
    solvedCount: solvedProblems.length,
    totalProblems: problemsList.length,
    solvedProblems,
    unsolvedProblems,
    ratingBefore,
    predictedRatingDelta,
    predictedRatingAfter,
    performanceRating,
    ratingConfidence,
    contestType: contestInfo ? getContestType(contestInfo.name) : 'other',
    contestUrl: getContestUrl(contestId),
    virtualStandingsUrl: getVirtualStandingsUrl(contestId),
    fetchedAt: Math.floor(Date.now() / 1000),
    key: getVirtualContestKey(contestId, virtualStartTime),
  };
}

async function getAllVirtualContests(handle, { onProgress, forceRefresh = false } = {}) {
  let cachedData = await storage.getCachedVirtualContests(handle);
  if (cachedData && !forceRefresh) {
    return { contests: cachedData, fromCache: true, lastSync: await storage.getLastSyncTime() };
  }

  const virtuals = await discoverVirtualContests(handle);
  
  let contestList = await storage.getCachedContestList();
  if (!contestList || forceRefresh) {
    contestList = await api.getContestList();
    await storage.setCachedContestList(contestList);
  }

  const contestMap = new Map(contestList.map(c => [c.id, c]));
  
  const enriched = [];
  let current = 0;
  for (const v of virtuals) {
    if (onProgress) {
      const cInfo = contestMap.get(v.contestId);
      onProgress(current + 1, virtuals.length, cInfo ? cInfo.name : `Contest ${v.contestId}`);
    }
    const fullInfo = await enrichVirtualContest(v.contestId, v.virtualStartTime, v.submissions, handle, contestMap);
    enriched.push(fullInfo);
    current++;
  }

  await storage.setCachedVirtualContests(handle, enriched);
  await storage.setLastSyncTime();

  return { contests: enriched, fromCache: false, lastSync: await storage.getLastSyncTime() };
}

async function syncVirtualContests(handle, { onProgress } = {}) {
  const cachedData = await storage.getCachedVirtualContests(handle) || [];
  const cachedKeys = new Set(cachedData.map(c => c.key));

  const virtuals = await discoverVirtualContests(handle);
  const newVirtuals = virtuals.filter(v => !cachedKeys.has(getVirtualContestKey(v.contestId, v.virtualStartTime)));

  if (newVirtuals.length === 0) {
    return { contests: cachedData, fromCache: true, lastSync: await storage.getLastSyncTime() };
  }

  let contestList = await storage.getCachedContestList();
  if (!contestList) {
    contestList = await api.getContestList();
    await storage.setCachedContestList(contestList);
  }
  const contestMap = new Map(contestList.map(c => [c.id, c]));

  const enriched = [];
  let current = 0;
  for (const v of newVirtuals) {
    if (onProgress) {
      const cInfo = contestMap.get(v.contestId);
      onProgress(current + 1, newVirtuals.length, cInfo ? cInfo.name : `Contest ${v.contestId}`);
    }
    const fullInfo = await enrichVirtualContest(v.contestId, v.virtualStartTime, v.submissions, handle, contestMap);
    enriched.push(fullInfo);
    current++;
  }

  const allContests = [...cachedData, ...enriched];
  await storage.setCachedVirtualContests(handle, allContests);
  await storage.setLastSyncTime();

  return { contests: allContests, fromCache: false, lastSync: await storage.getLastSyncTime() };
}

export {
  discoverVirtualContests,
  enrichVirtualContest,
  getAllVirtualContests,
  syncVirtualContests
};
