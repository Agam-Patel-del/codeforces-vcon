import * as api from '../api/codeforcesApi.js';
import * as storage from './storageService.js';
import { calculatePredictedDelta } from '../utils/ratingCalculator.js';

async function getRatingHistory(handle) {
  let history = await storage.getCachedRatingHistory(handle);
  if (!history) {
    try {
      history = await api.getUserRating(handle);
      await storage.setCachedRatingHistory(handle, history);
    } catch (e) {
      history = [];
    }
  }
  return history;
}

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
  return latestRating || 1500;
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

async function predictRatingDelta(handle, contestId, virtualRank, virtualStartTime) {
  const userRating = await getRatingAtTime(handle, virtualStartTime);
  
  let ratingChanges = await storage.getCachedContestRatingChanges(contestId);
  if (!ratingChanges) {
    try {
      const fullChanges = await api.getContestRatingChanges(contestId);
      ratingChanges = fullChanges.map(rc => ({ oldRating: rc.oldRating }));
      await storage.setCachedContestRatingChanges(contestId, ratingChanges);
    } catch (e) {
      ratingChanges = null;
    }
  }

  if (!ratingChanges || ratingChanges.length === 0) {
    return { delta: 0, newRating: userRating, confidence: 'estimated', ratingBefore: userRating };
  }

  // Support both old format (if any managed to persist) and new slim format
  const participants = ratingChanges.map(rc => ({ rating: rc.oldRating }));
  
  const result = calculatePredictedDelta(userRating, virtualRank, participants);
  return {
    delta: result.delta,
    newRating: result.newRating,
    performanceRating: result.performanceRating,
    confidence: 'high',
    ratingBefore: userRating
  };
}

export {
  getRatingHistory,
  getRatingAtTime,
  getRatedContestCountAtTime,
  predictRatingDelta
};
