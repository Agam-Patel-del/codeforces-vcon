/**
 * High-performance rating calculation engine implementing the standard
 * Elo-based rating algorithm for competitive programming contests.
 *
 * Implements:
 * - Logistic Bradley-Terry-Luce win probability model
 * - Fast histogram convolution for expected rank (seed) evaluation
 * - Full multi-round contest adjustment (global deflation + top-tier zero-sum correction)
 * - Pure performance rating determination via monotonic binary search
 */

const MIN_RATING_LIMIT = -500;
const MAX_RATING_LIMIT = 6000;
const RATING_RANGE_LEN = MAX_RATING_LIMIT - MIN_RATING_LIMIT; // 6500
const RATING_OFFSET = -MIN_RATING_LIMIT; // 500

// Precomputed logistic Elo win probabilities indexed by rating difference
const ELO_WIN_PROB = new Float64Array(2 * RATING_RANGE_LEN + 1);
for (let i = -RATING_RANGE_LEN; i <= RATING_RANGE_LEN; i++) {
  ELO_WIN_PROB[i + RATING_RANGE_LEN] = 1 / (1 + Math.pow(10, i / 400));
}

/**
 * Returns the probability that a contestant with rating A beats a contestant with rating B.
 *
 * @param {number} ratingA - Rating of participant A
 * @param {number} ratingB - Rating of participant B
 * @returns {number} Win probability in (0, 1)
 */
function getEloWinProbability(ratingA, ratingB) {
  const diff = Math.round(ratingB - ratingA);
  if (diff < -RATING_RANGE_LEN) return 1;
  if (diff > RATING_RANGE_LEN) return 0;
  return ELO_WIN_PROB[diff + RATING_RANGE_LEN];
}

/**
 * Returns the win probability given a raw difference (ratingB - ratingA).
 *
 * @param {number} diff - Integer rating difference (ratingB - ratingA)
 * @returns {number} Win probability in (0, 1)
 */
function getEloWinProbByDiff(diff) {
  if (diff < -RATING_RANGE_LEN) return 1;
  if (diff > RATING_RANGE_LEN) return 0;
  return ELO_WIN_PROB[diff + RATING_RANGE_LEN];
}

/**
 * Precomputes expected rank (seed) for all integer ratings in [MIN_RATING_LIMIT, MAX_RATING_LIMIT].
 *
 * @param {Array<{rating: number}>} participants - Contest participants list
 * @returns {Float64Array} Precomputed seed array
 */
function precomputeSeeds(participants) {
  const counts = new Int32Array(RATING_RANGE_LEN);
  for (let i = 0; i < participants.length; i++) {
    const r = Math.max(MIN_RATING_LIMIT, Math.min(MAX_RATING_LIMIT, Math.round(participants[i].rating)));
    counts[r + RATING_OFFSET]++;
  }

  const entries = [];
  for (let i = 0; i < RATING_RANGE_LEN; i++) {
    if (counts[i] > 0) {
      entries.push([i - RATING_OFFSET, counts[i]]);
    }
  }

  const seeds = new Float64Array(RATING_RANGE_LEN);
  const numEntries = entries.length;

  for (let rIdx = 0; rIdx < RATING_RANGE_LEN; rIdx++) {
    const R = rIdx - RATING_OFFSET;
    let s = 1;
    for (let k = 0; k < numEntries; k++) {
      const entry = entries[k];
      s += entry[1] * getEloWinProbByDiff(R - entry[0]);
    }
    seeds[rIdx] = s;
  }

  return seeds;
}

/**
 * Calculates the expected rank (seed) for a given rating against the field.
 *
 * @param {Float64Array} seeds - Precomputed seed array
 * @param {number} rating - Target rating
 * @param {number|null} [excludeRating=null] - Rating of a participant to exclude from the field
 * @returns {number} Expected rank (1-indexed)
 */
function getSeed(seeds, rating, excludeRating = null) {
  const rIdx = Math.round(rating) + RATING_OFFSET;
  const rawSeed = (rIdx >= 0 && rIdx < RATING_RANGE_LEN) ? seeds[rIdx] : (rIdx < 0 ? seeds[0] : 1);
  if (excludeRating === null || excludeRating === undefined) {
    return rawSeed;
  }
  return rawSeed - getEloWinProbByDiff(Math.round(rating) - Math.round(excludeRating));
}

/**
 * Finds the highest rating where the expected rank (seed) >= targetRank.
 *
 * @param {Float64Array} seeds - Precomputed seed array
 * @param {number} targetRank - Target rank
 * @param {number|null} [selfRating=null] - Participant rating to exclude
 * @returns {number} Rating corresponding to targetRank
 */
function rankToRating(seeds, targetRank, selfRating = null) {
  let left = MIN_RATING_LIMIT;
  let right = MAX_RATING_LIMIT;

  while (left < right) {
    const mid = (left + right) >> 1;
    if (getSeed(seeds, mid, selfRating) < targetRank) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return left - 1;
}

/**
 * Computes raw unadjusted rating delta for an assumed rating.
 *
 * @param {Float64Array} seeds - Precomputed seed array
 * @param {number} rank - Contest rank achieved
 * @param {number} assumedRating - Rating to evaluate delta at
 * @param {number|null} [selfRating=null] - Participant rating to exclude
 * @returns {number} Raw integer delta
 */
function calculateRawDelta(seeds, rank, assumedRating, selfRating = null) {
  const seed = getSeed(seeds, assumedRating, selfRating);
  const midRank = Math.sqrt(rank * seed);
  const needRating = rankToRating(seeds, midRank, selfRating);
  return Math.trunc((needRating - assumedRating) / 2);
}

/**
 * Computes the global contest adjustment factor ensuring rating stability.
 *
 * Includes:
 * 1. Global negative offset to preserve total rating pool deflation
 * 2. Top-tier zero-sum adjustment for top 4*sqrt(N) contestants
 *
 * @param {Float64Array} seeds - Precomputed seed array
 * @param {Array<{rating: number, rank: number}>} participantsWithRanks - Participants list
 * @returns {number} Global adjustment factor
 */
function computeContestAdjustment(seeds, participantsWithRanks) {
  const valid = participantsWithRanks.filter(p => p.rank > 0);
  const n = valid.length;
  if (n === 0) return 0;

  const contestants = valid.map(p => ({
    rating: Math.max(MIN_RATING_LIMIT, Math.min(MAX_RATING_LIMIT, Math.round(p.rating))),
    rank: p.rank,
    delta: 0
  }));

  for (let i = 0; i < n; i++) {
    const c = contestants[i];
    c.delta = calculateRawDelta(seeds, c.rank, c.rating, c.rating);
  }

  contestants.sort((a, b) => b.rating - a.rating);

  let adjustment = 0;

  // Phase 1: Universal deflation
  const totalDeltaSum = contestants.reduce((sum, c) => sum + c.delta, 0);
  const inc1 = Math.trunc(-totalDeltaSum / n) - 1;
  adjustment += inc1;
  for (let i = 0; i < n; i++) {
    contestants[i].delta += inc1;
  }

  // Phase 2: Top-tier zero-sum adjustment
  const topCount = Math.min(4 * Math.round(Math.sqrt(n)), n);
  let topDeltaSum = 0;
  for (let i = 0; i < topCount; i++) {
    topDeltaSum += contestants[i].delta;
  }
  const inc2 = Math.min(Math.max(Math.trunc(-topDeltaSum / topCount), -10), 0);
  adjustment += inc2;

  return adjustment;
}

/**
 * Calculates the performance rating for a given rank in a contest field.
 *
 * The performance rating is defined as the rating at which the expected
 * rating change (including the global contest adjustment) is zero.
 *
 * @param {Float64Array} seeds - Precomputed seed array
 * @param {number} rank - Contest rank achieved
 * @param {number} [adjustment=0] - Global contest adjustment factor
 * @param {number|null} [selfRating=null] - Participant rating to exclude
 * @returns {number|null} Performance rating
 */
function calculatePerformanceRatingFromSeeds(seeds, rank, adjustment = 0, selfRating = null) {
  if (!rank || rank <= 0) return null;
  if (rank === 1) return 4000; // Rank 1 upper anchor

  let left = MIN_RATING_LIMIT;
  let right = MAX_RATING_LIMIT;

  while (left < right) {
    const mid = (left + right) >> 1;
    const rawDelta = calculateRawDelta(seeds, rank, mid, selfRating);
    if (rawDelta + adjustment <= 0) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return left;
}

/**
 * Convenience wrapper to calculate performance rating directly from participants.
 *
 * @param {number} rank - Contest rank achieved
 * @param {Array<{rating: number, rank?: number}>} participants - Contest participants list
 * @param {number} [adjustment=0] - Optional precomputed adjustment
 * @param {number|null} [selfRating=null] - Participant rating to exclude
 * @returns {number|null} Performance rating
 */
function calculatePerformanceRating(rank, participants, adjustment = 0, selfRating = null) {
  if (!rank || rank <= 0 || !participants || participants.length === 0) {
    return null;
  }
  const seeds = precomputeSeeds(participants);
  return calculatePerformanceRatingFromSeeds(seeds, rank, adjustment, selfRating);
}

/**
 * Calculates the predicted rating delta and new rating.
 *
 * @param {Float64Array} seeds - Precomputed seed array
 * @param {number} userRating - Current internal rating of the user
 * @param {number} userRank - Contest rank achieved
 * @param {number} [adjustment=0] - Global contest adjustment factor
 * @param {number|null} [selfRating=null] - Participant rating to exclude
 * @returns {{delta: number, newRating: number, performanceRating: number|null, seed: number}}
 */
function calculatePredictedDeltaFromSeeds(seeds, userRating, userRank, adjustment = 0, selfRating = null) {
  const seed = getSeed(seeds, userRating, selfRating);
  const rawDelta = calculateRawDelta(seeds, userRank, userRating, selfRating);
  const delta = rawDelta + adjustment;
  const performanceRating = calculatePerformanceRatingFromSeeds(seeds, userRank, adjustment, selfRating);

  return {
    delta,
    newRating: userRating + delta,
    performanceRating,
    seed
  };
}

/**
 * Convenience wrapper to calculate predicted delta directly from participants.
 *
 * @param {number} userRating - Current internal rating of the user
 * @param {number} userRank - Contest rank achieved
 * @param {Array<{rating: number}>} participants - Contest participants list
 * @param {number} [adjustment=0] - Global contest adjustment factor
 * @returns {{delta: number, newRating: number, performanceRating: number|null, seed: number}}
 */
function calculatePredictedDelta(userRating, userRank, participants, adjustment = 0) {
  const seeds = precomputeSeeds(participants);
  return calculatePredictedDeltaFromSeeds(seeds, userRating, userRank, adjustment);
}

// ==================== Display Rating Conversion ====================

const UNAPPLIED_BONUS = [1400, 900, 550, 300, 150, 50];

/**
 * Gets the unapplied bonus for the modern rating system.
 *
 * @param {number} numRatedContests - Number of completed rated contests
 * @returns {number} Unapplied bonus amount
 */
function getUnappliedBonus(numRatedContests) {
  if (numRatedContests < 0) return 1400;
  if (numRatedContests >= 6) return 0;
  return UNAPPLIED_BONUS[numRatedContests];
}

/**
 * Converts an internal rating to a displayed rating.
 *
 * @param {number} internalRating - Raw internal Elo rating
 * @param {number} numRatedContests - Number of completed rated contests
 * @param {boolean} [isModernSystem=true] - Whether modern rules apply
 * @returns {number} Displayed rating
 */
function getDisplayRating(internalRating, numRatedContests, isModernSystem = true) {
  if (!isModernSystem) return internalRating;
  const unapplied = getUnappliedBonus(numRatedContests);
  return Math.max(0, Math.round(internalRating - unapplied));
}

/**
 * Converts a displayed rating to an internal rating.
 *
 * @param {number} displayedRating - Public displayed rating
 * @param {number} numRatedContests - Number of completed rated contests
 * @param {boolean} [isModernSystem=true] - Whether modern rules apply
 * @returns {number} Internal rating
 */
function getInternalRating(displayedRating, numRatedContests, isModernSystem = true) {
  if (!isModernSystem) return displayedRating || 1500;
  const unapplied = getUnappliedBonus(numRatedContests);
  return Math.round((displayedRating || 0) + unapplied);
}

export {
  MIN_RATING_LIMIT,
  MAX_RATING_LIMIT,
  getEloWinProbability,
  precomputeSeeds,
  getSeed,
  rankToRating,
  computeContestAdjustment,
  calculatePerformanceRating,
  calculatePerformanceRatingFromSeeds,
  calculatePredictedDelta,
  calculatePredictedDeltaFromSeeds,
  getDisplayRating,
  getInternalRating
};
