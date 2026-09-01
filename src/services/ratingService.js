import * as api from '../api/codeforcesApi.js';
import * as storage from './storageService.js';
import {
  precomputeSeeds,
  computeContestAdjustment,
  calculatePerformanceRatingFromSeeds,
  calculatePredictedDeltaFromSeeds,
  getInternalRating,
  getDisplayRating
} from '../utils/ratingCalculator.js';

async function getRatingHistory(handle) {
  let history = await storage.getCachedRatingHistory(handle);
  if (!history) {
    history = await refreshRatingHistory(handle);
  }
  return history;
}

async function refreshRatingHistory(handle) {
  try {
    const history = await api.getUserRating(handle);
    await storage.setCachedRatingHistory(handle, history);
    return history;
  } catch (e) {
    const cached = await storage.getCachedRatingHistory(handle);
    return cached || [];
  }
}

// June 10, 2020 rating system update timestamp
const MODERN_RATING_SYSTEM_TIMESTAMP = 1591747200;

async function getRatingAtTime(handle, timestamp) {
  const history = await getRatingHistory(handle);
  let latestRating = null;
  for (const entry of history) {
    if (entry.ratingUpdateTimeSeconds <= timestamp) {
      latestRating = entry.newRating;
    } else {
      break;
    }
  }
  if (latestRating !== null) return latestRating;

  // Initial displayed rating: 0 for modern system (since June 2020), 1500 for legacy
  return timestamp >= MODERN_RATING_SYSTEM_TIMESTAMP ? 0 : 1500;
}

async function getRatedContestCountAtTime(handle, timestamp) {
  const history = await getRatingHistory(handle);
  let count = 0;
  for (const entry of history) {
    if (entry.ratingUpdateTimeSeconds <= timestamp) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Fetches and caches contest rating changes, including rank data
 * needed for adjustment computation. Automatically re-fetches
 * stale cache entries that lack rank data.
 */
async function fetchContestRatingChanges(contestId) {
  let ratingChanges = await storage.getCachedContestRatingChanges(contestId);

  // Re-fetch if cache is missing rank data or newRating (legacy cache format)
  const needsRefresh = ratingChanges
    && ratingChanges.length > 0
    && (ratingChanges[0].rank === undefined || ratingChanges[0].newRating === undefined);

  if (!ratingChanges || needsRefresh) {
    try {
      const fullChanges = await api.getContestRatingChanges(contestId);
      ratingChanges = fullChanges.map(rc => ({
        oldRating: rc.oldRating,
        newRating: rc.newRating,
        rank: rc.rank
      }));
      await storage.setCachedContestRatingChanges(contestId, ratingChanges);
    } catch (e) {
      if (needsRefresh) return ratingChanges; // Use stale data on fetch failure
      ratingChanges = null;
    }
  }

  return ratingChanges;
}

/**
 * Builds the participant arrays and computes the contest adjustment factor.
 *
 * @param {Array} ratingChanges - Cached rating change entries
 * @param {boolean} isModernSystem - Whether modern rating rules apply
 * @returns {{ participants: Array, adjustment: number }}
 */
function buildContestData(ratingChanges, isModernSystem) {
  const defaultRating = isModernSystem ? 1400 : 1500;

  const participants = ratingChanges.map(rc => ({
    rating: (!rc.oldRating || rc.oldRating === 0) ? defaultRating : rc.oldRating
  }));

  const seeds = precomputeSeeds(participants);

  // Compute adjustment if rank data is available
  let adjustment = 0;
  const hasRankData = ratingChanges.some(rc => rc.rank && rc.rank > 0);
  if (hasRankData) {
    const participantsWithRanks = ratingChanges
      .filter(rc => rc.rank && rc.rank > 0)
      .map(rc => ({
        rating: (!rc.oldRating || rc.oldRating === 0) ? defaultRating : rc.oldRating,
        rank: rc.rank
      }));
    adjustment = computeContestAdjustment(seeds, participantsWithRanks);
  }

  return { participants, seeds, adjustment };
}

async function predictRatingDelta(handle, contestId, virtualRank, virtualStartTime) {
  const isModernSystem = virtualStartTime >= MODERN_RATING_SYSTEM_TIMESTAMP;
  const userRating = await getRatingAtTime(handle, virtualStartTime);
  const ratedCount = await getRatedContestCountAtTime(handle, virtualStartTime);

  // Convert displayed rating to internal rating for Elo calculation
  const internalUserRating = getInternalRating(userRating, ratedCount, isModernSystem);

  const ratingChanges = await fetchContestRatingChanges(contestId);

  if (!ratingChanges || ratingChanges.length === 0) {
    return { delta: null, newRating: userRating, confidence: 'estimated', ratingBefore: userRating, performanceRating: null };
  }

  const hasRealChanges = ratingChanges.some(rc => rc.oldRating !== rc.newRating);
  if (!hasRealChanges) {
    return { delta: null, newRating: userRating, confidence: 'unrated', ratingBefore: userRating, performanceRating: null };
  }

  const { seeds, adjustment } = buildContestData(ratingChanges, isModernSystem);
  const result = calculatePredictedDeltaFromSeeds(seeds, internalUserRating, virtualRank, adjustment);

  // Convert internal new rating back to displayed rating
  const newDisplayedRating = getDisplayRating(result.newRating, ratedCount + 1, isModernSystem);
  const delta = newDisplayedRating - userRating;
  return {
    delta,
    newRating: newDisplayedRating,
    performanceRating: result.performanceRating,
    confidence: 'high',
    ratingBefore: userRating
  };
}

async function getPerformanceRating(contestId, rank, timestamp = Date.now() / 1000) {
  if (!rank || rank <= 0) return null;

  const ratingChanges = await fetchContestRatingChanges(contestId);

  if (!ratingChanges || ratingChanges.length === 0) return null;

  const hasRealChanges = ratingChanges.some(rc => rc.oldRating !== rc.newRating);
  if (!hasRealChanges) return null;

  const isModernSystem = timestamp >= MODERN_RATING_SYSTEM_TIMESTAMP;
  const { seeds, adjustment } = buildContestData(ratingChanges, isModernSystem);

  return calculatePerformanceRatingFromSeeds(seeds, rank, adjustment);
}

export {
  getRatingHistory,
  getRatingAtTime,
  getRatedContestCountAtTime,
  predictRatingDelta,
  getPerformanceRating,
  getPerformanceRating as getPurePerformanceRating,
  refreshRatingHistory
};
