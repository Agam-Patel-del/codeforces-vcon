function getContestType(contestName) {
  if (!contestName) return 'other';
  const name = contestName.toLowerCase();
  if (name.includes('div. 1')) return 'div1';
  if (name.includes('div. 2')) return 'div2';
  if (name.includes('div. 3')) return 'div3';
  if (name.includes('div. 4')) return 'div4';
  if (name.includes('educational')) return 'educational';
  if (name.includes('global round')) return 'global';
  return 'other';
}

function getContestTypeLabel(type) {
  const labels = {
    div1: 'Div. 1',
    div2: 'Div. 2',
    div3: 'Div. 3',
    div4: 'Div. 4',
    educational: 'Educational',
    global: 'Global',
    other: 'Other'
  };
  return labels[type] || 'Other';
}

function getContestUrl(contestId) {
  return `https://codeforces.com/contest/${contestId}`;
}

function getProblemUrl(contestId, problemIndex) {
  return `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
}

function getVirtualContestKey(contestId, startTimeSeconds) {
  return `${contestId}_${startTimeSeconds}`;
}

function getVirtualStandingsUrl(contestId) {
  return `https://codeforces.com/contest/${contestId}/standings`;
}

export {
  getContestType,
  getContestTypeLabel,
  getContestUrl,
  getProblemUrl,
  getVirtualContestKey,
  getVirtualStandingsUrl
};
