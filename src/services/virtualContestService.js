import * as api from '../api/codeforcesApi.js';
import * as storage from './storageService.js';
import * as ratingService from './ratingService.js';
import { getVirtualContestKey, getContestUrl, getVirtualStandingsUrl, getContestType } from '../utils/contest.js';

async function discoverVirtualContests(handle) {
  const status = await api.getUserStatus(handle);
  
  const participations = status.filter(
    sub => sub.author.participantType === 'VIRTUAL' || sub.author.participantType === 'OUT_OF_COMPETITION'
  );
  
  const allSolvedSet = new Set();
  for (const sub of status) {
    if (sub.verdict === 'OK' && sub.contestId && sub.problem && sub.problem.index) {
      allSolvedSet.add(`${sub.contestId}_${sub.problem.index}`);
    }
  }
  await storage.setCachedAllSolved(handle, Array.from(allSolvedSet));

  const groups = new Map();
  for (const sub of participations) {
    const vStartTime = sub.author.startTimeSeconds || sub.creationTimeSeconds;
    const key = getVirtualContestKey(sub.contestId, vStartTime);
    if (!groups.has(key)) {
      groups.set(key, {
        contestId: sub.contestId,
        virtualStartTime: vStartTime,
        participationType: sub.author.participantType === 'OUT_OF_COMPETITION' ? 'unrated' : 'virtual',
        submissions: []
      });
    }
    groups.get(key).submissions.push(sub);
  }

  return Array.from(groups.values());
}

function createQuickVirtualContest(v, contestMap, problemCounts, gymMetadata = {}) {
  const isGym = v.contestId >= 100000;
  const contestInfo = contestMap ? contestMap.get(v.contestId) : (gymMetadata[v.contestId] || null);
  const okIndices = new Set(
    (v.submissions || []).filter(s => s.verdict === 'OK').map(s => s.problem.index)
  );

  const contestName = contestInfo ? contestInfo.name : (isGym ? `Gym Contest ${v.contestId}` : `Contest ${v.contestId}`);
  const contestStartTime = contestInfo ? contestInfo.startTimeSeconds : null;
  const contestDurationSeconds = contestInfo ? contestInfo.durationSeconds : 0;

  return {
    contestId: v.contestId,
    contestName,
    contestStartTime,
    contestDurationSeconds,
    virtualStartTime: v.virtualStartTime,
    rank: null,
    solvedCount: okIndices.size,
    totalProblems: (problemCounts && problemCounts[v.contestId]) || '-',
    upsolvedCount: 0,
    solvedProblems: [],
    unsolvedProblems: [],
    ratingBefore: null,
    predictedRatingDelta: null,
    predictedRatingAfter: null,
    performanceRating: null,
    ratingConfidence: isGym ? 'unrated' : 'estimating',
    contestType: getContestType(contestName, v.contestId),
    participationType: v.participationType || (isGym ? 'unrated' : 'virtual'),
    isOfficial: false,
    isUnrated: isGym || v.participationType === 'unrated',
    contestUrl: getContestUrl(v.contestId),
    virtualStandingsUrl: getVirtualStandingsUrl(v.contestId),
    submissions: v.submissions || [],
    key: getVirtualContestKey(v.contestId, v.virtualStartTime),
    isEnriched: isGym
  };
}

async function enrichVirtualContest(contestId, virtualStartTime, submissions, handle, contestMap, participationType = 'virtual') {
  const isGym = contestId >= 100000;
  const contestInfo = contestMap ? contestMap.get(contestId) : null;
  
  let standingsData = null;
  if (!isGym) {
    try {
      standingsData = await api.getContestStandings(contestId);
    } catch (e) {
      standingsData = { rows: [], problems: [], contest: { type: 'CF' } };
    }
  } else {
    standingsData = { rows: [], problems: [], contest: { type: 'ICPC', name: `Gym Contest ${contestId}` } };
  }

  let virtualRank = null;
  if (!isGym && standingsData.rows) {
    let row = standingsData.rows.find(r => 
      (r.party.participantType === 'VIRTUAL' || r.party.participantType === 'OUT_OF_COMPETITION') && 
      (!r.party.startTimeSeconds || r.party.startTimeSeconds === virtualStartTime)
    );

    if (!row && standingsData.rows.length > 0) {
      let myPoints = 0;
      let myPenalty = 0;
      const contestType = standingsData.contest.type; // 'CF' or 'ICPC'
      
      standingsData.problems.forEach(p => {
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
            const maxPoints = p.points;
            let pts = maxPoints - (maxPoints / 250) * solveTimeMinutes - 50 * wrongTries;
            pts = Math.max(pts, maxPoints * 0.3);
            myPoints += Math.round(pts);
          }
        }
      });

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
  }
  
  const solvedIndices = new Set(
    submissions.filter(s => s.verdict === 'OK').map(s => s.problem.index)
  );

  let problemsList = standingsData.problems || [];
  
  if (problemsList.length === 0) {
    const seen = new Set();
    for (const s of submissions) {
      if (!seen.has(s.problem.index)) {
        seen.add(s.problem.index);
        problemsList.push(s.problem);
      }
    }
    problemsList.sort((a, b) => a.index.localeCompare(b.index));
  }
  
  const allSolvedList = await storage.getCachedAllSolved(handle);
  const allSolvedSet = new Set(allSolvedList || []);

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
      
      const isUpsolved = allSolvedSet.has(`${contestId}_${p.index}`);
      unsolvedProblems.push({ 
        index: p.index, 
        name: p.name, 
        wrongAttempts: wrongTries,
        upsolved: isUpsolved
      });
    }
  }

  const upsolvedCount = unsolvedProblems.filter(p => p.upsolved).length;

  let ratingBefore = null;
  let predictedRatingDelta = null;
  let predictedRatingAfter = null;
  let performanceRating = null;
  let ratingConfidence = isGym ? 'unrated' : 'estimated';

  if (!isGym) {
    ratingBefore = await ratingService.getRatingAtTime(handle, virtualStartTime);
    predictedRatingDelta = 0;
    predictedRatingAfter = ratingBefore;

    if (virtualRank > 0) {
      const prediction = await ratingService.predictRatingDelta(handle, contestId, virtualRank, virtualStartTime);
      predictedRatingDelta = prediction.delta;
      predictedRatingAfter = prediction.newRating;
      performanceRating = prediction.performanceRating;
      ratingConfidence = prediction.confidence;
    }
  }

  const cfContest = standingsData && standingsData.contest;
  const contestName = (contestInfo && contestInfo.name) || (cfContest && cfContest.name) || (isGym ? `Gym Contest ${contestId}` : `Contest ${contestId}`);
  const contestStartTime = (contestInfo && contestInfo.startTimeSeconds) || (cfContest && cfContest.startTimeSeconds) || null;
  const contestDurationSeconds = (contestInfo && contestInfo.durationSeconds) || (cfContest && cfContest.durationSeconds) || 0;

  if (contestId >= 100000 && cfContest && cfContest.name) {
    storage.setCachedGymMetadataItem(contestId, {
      name: cfContest.name,
      startTimeSeconds: cfContest.startTimeSeconds,
      durationSeconds: cfContest.durationSeconds
    }).catch(() => {});
  }

  return {
    contestId,
    contestName,
    contestStartTime,
    contestDurationSeconds,
    virtualStartTime,
    rank: virtualRank,
    solvedCount: solvedProblems.length,
    totalProblems: problemsList.length,
    upsolvedCount,
    solvedProblems,
    unsolvedProblems,
    ratingBefore,
    predictedRatingDelta,
    predictedRatingAfter,
    performanceRating,
    ratingConfidence,
    contestType: getContestType(contestName),
    participationType,
    isOfficial: false,
    isUnrated: participationType === 'unrated',
    contestUrl: getContestUrl(contestId),
    virtualStandingsUrl: getVirtualStandingsUrl(contestId),
    fetchedAt: Math.floor(Date.now() / 1000),
    key: getVirtualContestKey(contestId, virtualStartTime),
    isEnriched: true
  };
}

/**
 * Discovers virtual contests and merges with existing cache instantly (0.3s).
 * Any contest not yet enriched is returned in lightweight format so the UI renders immediately.
 */
async function loadOrDiscoverContests(handle) {
  const cachedData = await storage.getCachedVirtualContests(handle) || [];
  const cachedMap = new Map(cachedData.map(c => [c.key, c]));

  let contestList = await storage.getCachedContestList();
  if (!contestList) {
    try {
      contestList = await api.getContestList();
      await storage.setCachedContestList(contestList);
    } catch (e) {
      contestList = [];
    }
  }
  const contestMap = new Map(contestList.map(c => [c.id, c]));
  const problemCounts = await getContestProblemCountsMap();
  const gymMetadata = await storage.getCachedGymMetadata();

  const discovered = await discoverVirtualContests(handle);
  
  const merged = [];
  let unenrichedCount = 0;

  for (const v of discovered) {
    const key = getVirtualContestKey(v.contestId, v.virtualStartTime);
    const existing = cachedMap.get(key);

    if (existing && existing.isEnriched !== false && existing.rank != null) {
      merged.push(existing);
    } else {
      unenrichedCount++;
      const quick = createQuickVirtualContest(v, contestMap, problemCounts, gymMetadata);
      merged.push(quick);
    }
  }

  return {
    contests: merged,
    contestMap,
    problemCounts,
    unenrichedCount,
    lastSync: await storage.getLastSyncTime() || Date.now()
  };
}

/**
 * Enriches a single contest on demand and incrementally caches it in storage.
 */
async function enrichSingleContest(handle, contestObj, contestMap) {
  if (contestObj.isEnriched && contestObj.rank != null) {
    return contestObj;
  }

  const enriched = await enrichVirtualContest(
    contestObj.contestId,
    contestObj.virtualStartTime,
    contestObj.submissions || [],
    handle,
    contestMap,
    contestObj.participationType
  );

  // Update storage incrementally
  const cachedData = await storage.getCachedVirtualContests(handle) || [];
  const updated = cachedData.filter(c => c.key !== enriched.key);
  updated.push(enriched);
  await storage.setCachedVirtualContests(handle, updated);
  await storage.setLastSyncTime();

  return enriched;
}

async function getAllVirtualContests(handle, { onProgress, forceRefresh = false } = {}) {
  let cachedData = await storage.getCachedVirtualContests(handle);
  if (cachedData && !forceRefresh) {
    return { contests: cachedData, fromCache: true, lastSync: await storage.getLastSyncTime() };
  }

  const result = await loadOrDiscoverContests(handle);
  return { contests: result.contests, fromCache: false, lastSync: result.lastSync };
}

async function syncVirtualContests(handle, { onProgress } = {}) {
  return getAllVirtualContests(handle, { onProgress, forceRefresh: false });
}

async function getContestProblemCountsMap() {
  let counts = await storage.getCachedContestProblemCounts();
  if (!counts) {
    try {
      const data = await api.getProblemsetProblems();
      if (data && data.problems && Array.isArray(data.problems)) {
        counts = {};
        for (const p of data.problems) {
          if (p.contestId) {
            counts[p.contestId] = (counts[p.contestId] || 0) + 1;
          }
        }
        await storage.setCachedContestProblemCounts(counts);
      }
    } catch (e) {
      console.warn('Failed to fetch problemset problem counts:', e);
      counts = {};
    }
  }
  return counts || {};
}

export {
  discoverVirtualContests,
  enrichVirtualContest,
  enrichSingleContest,
  loadOrDiscoverContests,
  getAllVirtualContests,
  syncVirtualContests,
  getContestProblemCountsMap
};
