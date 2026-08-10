function getRatingColorClass(rating) {
  if (rating === null || rating === undefined) return 'rating-unrated';
  if (rating < 1200) return 'rating-gray';
  if (rating < 1400) return 'rating-green';
  if (rating < 1600) return 'rating-cyan';
  if (rating < 1900) return 'rating-blue';
  if (rating < 2100) return 'rating-violet';
  if (rating < 2400) return 'rating-orange';
  if (rating < 2900) return 'rating-red';
  return 'rating-legendary';
}

function getRatingTitle(rating) {
  if (rating === null || rating === undefined) return 'unrated';
  if (rating < 1200) return 'newbie';
  if (rating < 1400) return 'pupil';
  if (rating < 1600) return 'specialist';
  if (rating < 1900) return 'expert';
  if (rating < 2100) return 'candidate master';
  if (rating < 2300) return 'master';
  if (rating < 2400) return 'international master';
  if (rating < 2600) return 'grandmaster';
  if (rating < 2900) return 'international grandmaster';
  return 'legendary grandmaster';
}

function formatDelta(delta) {
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

function getDeltaClass(delta) {
  if (delta > 0) return 'delta-positive';
  if (delta < 0) return 'delta-negative';
  return 'delta-zero';
}

export {
  getRatingColorClass,
  getRatingTitle,
  formatDelta,
  getDeltaClass
};
