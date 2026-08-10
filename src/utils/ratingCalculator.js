function getEloWinProbability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function getSeed(rating, participants) {
  let seed = 1;
  for (const p of participants) {
    seed += getEloWinProbability(p.rating, rating);
  }
  return seed;
}

function getRatingForSeed(targetSeed, participants) {
  let left = 1;
  let right = 8000;
  
  for (let i = 0; i < 100; i++) {
    const mid = (left + right) / 2;
    const seed = getSeed(mid, participants);
    if (seed < targetSeed) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return (left + right) / 2;
}

function calculatePredictedDelta(userRating, userRank, participants) {
  const seed = getSeed(userRating, participants);
  const m = Math.sqrt(seed * userRank);
  const performanceRating = getRatingForSeed(m, participants);
  const delta = Math.floor((performanceRating - userRating) / 2);
  return {
    delta,
    newRating: userRating + delta,
    performanceRating,
    seed
  };
}

function getDisplayRating(internalRating, numRatedContests) {
  if (numRatedContests >= 6) return internalRating;
  const adjustment = Math.max(0, 500 * (1 - numRatedContests / 6));
  return Math.round(internalRating - adjustment);
}

function getInternalRating(displayedRating, numRatedContests) {
  if (numRatedContests >= 6) return displayedRating;
  const adjustment = Math.max(0, 500 * (1 - numRatedContests / 6));
  return Math.round(displayedRating + adjustment);
}

export {
  getEloWinProbability,
  getSeed,
  getRatingForSeed,
  calculatePredictedDelta,
  getDisplayRating,
  getInternalRating
};
