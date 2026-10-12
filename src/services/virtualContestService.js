import * as api from '../api/codeforcesApi.js';
import * as storage from './storageService.js';
import * as ratingService from './ratingService.js';
import {
  getVirtualContestKey,
  getContestUrl,
  getVirtualStandingsUrl,
  getContestType,
  isCombinedDiv1Div2Contest
} from '../utils/contest.js';

// Codeforces Round #480 timestamp (May 8, 2018): Blog 59228 rating thresholds update
const CF_ROUND_480_TIMESTAMP = 1525791900;

function hasParallelDivContest(contestMap, contestId, contestStartTime, targetDiv) {
  if (!contestMap || !contestStartTime) return false;
  for (const other of contestMap.values()) {
    if (other.startTimeSeconds === contestStartTime && other.id !== contestId) {
      const otherName = (other.name || '').toLowerCase();
      const hasDiv1 = otherName.includes('div. 1') || otherName.includes('div 1');
      const hasDiv2 = otherName.includes('div. 2') || otherName.includes('div 2');
      if (targetDiv === 'div1' && hasDiv1 && !hasDiv2) return true;
      if (targetDiv === 'div2' && hasDiv2 && !hasDiv1) return true;
    }
  }
  return false;
}

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
      const isTeam = Boolean(
        sub.author.teamId ||
        sub.author.teamName ||
        (sub.author.members && sub.author.members.length > 1)
      );
      groups.set(key, {
        contestId: sub.contestId,
        virtualStartTime: vStartTime,
        participationType: sub.author.participantType === 'OUT_OF_COMPETITION' ? 'unrated' : 'virtual',
        isTeam,
        teamName: sub.author.teamName || null,
        teamMembers: (sub.author.members || []).map(m => m.handle),
        submissions: []
      });
    }
    groups.get(key).submissions.push(sub);
  }

  return Array.from(groups.values());
}

function createQuickVirtualContest(v, contestMap, problemCounts, gymMetadata = {}) {
  const isGym = v.contestId >= 100000;
  const isTeam = v.isTeam || false;
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
    ratingConfidence: (isGym || isTeam) ? 'unrated' : 'estimating',
    contestType: getContestType(contestName, v.contestId),
    participationType: v.participationType || (isGym ? 'unrated' : 'virtual'),
    isOfficial: false,
    isUnrated: isGym || isTeam,
    isIneligible: false,
    isTeam,
    teamName: v.teamName || null,
    teamMembers: v.teamMembers || [],
    contestUrl: getContestUrl(v.contestId),
    virtualStandingsUrl: getVirtualStandingsUrl(v.contestId),
    submissions: v.submissions || [],
    key: getVirtualContestKey(v.contestId, v.virtualStartTime),
    isEnriched: isGym
  };
}

async function enrichVirtualContest(contestId, virtualStartTime, submissions, handle, contestMap, participationType = 'virtual', { isTeam = false, teamName = null, teamMembers = [] } = {}) {
  if (!contestMap || contestMap.size === 0) {
    const cachedList = await storage.getCachedContestList();
    if (cachedList && cachedList.length > 0) {
      contestMap = new Map(cachedList.map(c => [c.id, c]));
    }
  }
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
      
      const contestDurationSeconds = (standingsData.contest && standingsData.contest.durationSeconds) || (contestInfo && contestInfo.durationSeconds) || 7200;
      const durationMinutes = Math.max(1, Math.round(contestDurationSeconds / 60));
      const timeCoefficient = (durationMinutes * 25) / 12;

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
            const timeLoss = Math.floor((maxPoints * solveTimeMinutes) / timeCoefficient);
            let pts = maxPoints - timeLoss - 50 * wrongTries;
            pts = Math.max(pts, Math.round(maxPoints * 0.3));
            myPoints += pts;
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

  const cfContest = standingsData && standingsData.contest;
  const contestName = (contestInfo && contestInfo.name) || (cfContest && cfContest.name) || (isGym ? `Gym Contest ${contestId}` : `Contest ${contestId}`);
  const contestStartTime = (contestInfo && contestInfo.startTimeSeconds) || (cfContest && cfContest.startTimeSeconds) || null;
  const contestDurationSeconds = (contestInfo && contestInfo.durationSeconds) || (cfContest && cfContest.durationSeconds) || 0;
  const resolvedContestType = getContestType(contestName, contestId);

  let ratingBefore = null;
  let predictedRatingDelta = null;
  let predictedRatingAfter = null;
  let performanceRating = null;
  let ratingConfidence = (isGym || isTeam) ? 'unrated' : 'estimated';
  let isUnratedByDivision = false;

  if (!isGym && !isTeam) {
    ratingBefore = await ratingService.getRatingAtTime(handle, virtualStartTime);
    const contestTime = contestStartTime || virtualStartTime;
    const isCombined = isCombinedDiv1Div2Contest(contestName);

    if (resolvedContestType === 'div4' && ratingBefore >= 1400) {
      isUnratedByDivision = true;
    } else if (resolvedContestType === 'div3' && ratingBefore >= 1600) {
      isUnratedByDivision = true;
    } else if (resolvedContestType === 'educational' && ratingBefore >= 2100) {
      isUnratedByDivision = true;
    } else if (resolvedContestType === 'div2' && !isCombined) {
      const isParallelDiv1 = hasParallelDivContest(contestMap, contestId, contestStartTime, 'div1');
      // Under Blog 59228 rules (since Round 480, May 2018):
      // - Standalone Div. 2: rated for Candidate Masters (< 2100)
      // - Parallel Div. 2: Candidate Masters must register for Div. 1; Div. 2 is rated only for < 1900
      let div2Threshold = 1900;
      if (!isParallelDiv1 && contestTime >= CF_ROUND_480_TIMESTAMP) {
        div2Threshold = 2100;
      }
      if (ratingBefore >= div2Threshold) {
        isUnratedByDivision = true;
      }
    } else if (resolvedContestType === 'div1' && !isCombined) {
      // Div. 1 contests (standalone or parallel) are rated strictly for rating >= 1900 (Candidate Masters+)
      // Participants with rating < 1900 are ineligible / unrated
      if (ratingBefore < 1900) {
        isUnratedByDivision = true;
      }
    }
    
    predictedRatingDelta = null;
    predictedRatingAfter = ratingBefore;

    if (virtualRank > 0 && !isUnratedByDivision) {
      const prediction = await ratingService.predictRatingDelta(handle, contestId, virtualRank, virtualStartTime);
      predictedRatingDelta = prediction.delta;
      predictedRatingAfter = prediction.newRating;
      performanceRating = prediction.performanceRating;
      ratingConfidence = prediction.confidence;
    } else if (isUnratedByDivision) {
      ratingConfidence = 'unrated';
      if (virtualRank > 0) {
        performanceRating = await ratingService.getPerformanceRating(contestId, virtualRank, virtualStartTime);
      }
    }

    if (predictedRatingDelta === 0 && performanceRating == null) {
      performanceRating = ratingBefore;
    }
  }

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
    contestType: resolvedContestType,
    participationType,
    isOfficial: false,
    isUnrated: isGym || isUnratedByDivision || isTeam,
    isIneligible: isUnratedByDivision,
    isTeam,
    teamName,
    teamMembers,
    contestUrl: getContestUrl(contestId),
    virtualStandingsUrl: getVirtualStandingsUrl(contestId),
    fetchedAt: Math.floor(Date.now() / 1000),
    key: getVirtualContestKey(contestId, virtualStartTime),
    isEnriched: true
  };
}

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

  const [discovered] = await Promise.all([
    discoverVirtualContests(handle),
    ratingService.refreshRatingHistory(handle)
  ]);
  
  const merged = [];
  let unenrichedCount = 0;
  const nowSeconds = Math.floor(Date.now() / 1000);

  for (const v of discovered) {
    const contestInfo = contestMap.get(v.contestId) || gymMetadata[v.contestId] || null;
    const durationSeconds = contestInfo ? contestInfo.durationSeconds : 0;
    
    if (durationSeconds > 0 && nowSeconds < v.virtualStartTime + durationSeconds) {
      continue; // Skip unfinished virtual contests
    }

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

let pendingStorageUpdates = new Map(); // Map of handle -> Map of key -> contest
let storageFlushTimeout = null;

async function flushStorageUpdates() {
  const handlesToProcess = Array.from(pendingStorageUpdates.keys());
  for (const handle of handlesToProcess) {
    const updatesMap = pendingStorageUpdates.get(handle);
    if (!updatesMap || updatesMap.size === 0) continue;
    
    const updates = Array.from(updatesMap.values());
    pendingStorageUpdates.delete(handle);
    
    try {
      const cachedData = await storage.getCachedVirtualContests(handle) || [];
      const updatedMap = new Map(cachedData.map(c => [c.key, c]));
      for (const c of updates) {
        updatedMap.set(c.key, c);
      }
      await storage.setCachedVirtualContests(handle, Array.from(updatedMap.values()));
      await storage.setLastSyncTime();
    } catch (e) {
      console.warn(`Failed to flush virtual contests to storage for handle ${handle}:`, e);
    }
  }
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
    contestObj.participationType,
    { isTeam: contestObj.isTeam || false, teamName: contestObj.teamName || null, teamMembers: contestObj.teamMembers || [] }
  );

  // Update storage safely and incrementally batched
  if (!pendingStorageUpdates.has(handle)) {
    pendingStorageUpdates.set(handle, new Map());
  }
  pendingStorageUpdates.get(handle).set(enriched.key, enriched);
  
  if (!storageFlushTimeout) {
    storageFlushTimeout = setTimeout(() => {
      storageFlushTimeout = null;
      flushStorageUpdates();
    }, 2000); // Flush to storage every 2 seconds
  }

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
