const KEYS = {
  HANDLE: 'cf_handle',
  AUTH_HANDLE: 'cf_auth_handle',
  CONTEST_LIST: 'cf_contest_list',
  VIRTUAL_CONTESTS: 'cf_virtual_contests_v4',
  RATING_HISTORY: 'cf_rating_history',
  CONTEST_RATING_CHANGES: 'cf_rating_changes_v2', // Use new slim key
  LAST_SYNC: 'cf_last_sync',
  HANDLE_LRU: 'cf_handle_lru',
  OFFICIAL_SOLVES: 'cf_official_solves',
  CONTEST_PROBLEM_COUNTS: 'cf_contest_problem_counts',
  PERFORMANCE_RATINGS: 'cf_performance_ratings',
  ALL_SOLVED: 'cf_all_solved'
};

const MAX_CACHED_HANDLES = 25;

// Immediately free up quota from the old bulky key
try {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove('cf_contest_rating_changes', () => {});
  } else {
    localStorage.removeItem('cf_contest_rating_changes');
  }
} catch (e) {}

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  
  // Fallback to localStorage for development
  return {
    get: (keys, callback) => {
      const result = {};
      if (typeof keys === 'string') {
        const val = localStorage.getItem(keys);
        if (val) result[keys] = JSON.parse(val);
      } else if (Array.isArray(keys)) {
        keys.forEach(k => {
          const val = localStorage.getItem(k);
          if (val) result[k] = JSON.parse(val);
        });
      } else {
        Object.keys(keys).forEach(k => {
          const val = localStorage.getItem(k);
          result[k] = val ? JSON.parse(val) : keys[k];
        });
      }
      callback(result);
    },
    set: (items, callback) => {
      Object.entries(items).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      if (callback) callback();
    },
    clear: (callback) => {
      localStorage.clear();
      if (callback) callback();
    }
  };
}

async function get(key) {
  return new Promise(resolve => {
    getStorage().get([key], result => resolve(result[key]));
  });
}

async function set(key, value) {
  return new Promise(resolve => {
    getStorage().set({ [key]: value }, () => resolve());
  });
}

async function getHandle() {
  return get(KEYS.HANDLE);
}

async function updateLRU(handle) {
  if (!handle) return;
  const primaryHandle = await getHandle();
  let lru = await get(KEYS.HANDLE_LRU) || [];
  
  // Remove if exists
  lru = lru.filter(h => h.toLowerCase() !== handle.toLowerCase());
  
  // Add to front
  lru.unshift(handle);
  
  // If exceeds max, evict the oldest that is NOT the primary handle
  while (lru.length > MAX_CACHED_HANDLES) {
    let indexToEvict = -1;
    for (let i = lru.length - 1; i >= 0; i--) {
      if (!primaryHandle || lru[i].toLowerCase() !== primaryHandle.toLowerCase()) {
        indexToEvict = i;
        break;
      }
    }
    
    if (indexToEvict !== -1) {
      const evicted = lru.splice(indexToEvict, 1)[0];
      await evictHandleData(evicted);
    } else {
      break; // Only primary handle(s) left, avoid infinite loop
    }
  }
  
  await set(KEYS.HANDLE_LRU, lru);
}

async function evictHandleData(handle) {
  // Evict from virtual contests
  const virtualData = await get(KEYS.VIRTUAL_CONTESTS) || {};
  if (virtualData[handle]) {
    delete virtualData[handle];
    await set(KEYS.VIRTUAL_CONTESTS, virtualData);
  }
  
  // Evict from rating history
  const ratingData = await get(KEYS.RATING_HISTORY) || {};
  if (ratingData[handle]) {
    delete ratingData[handle];
    await set(KEYS.RATING_HISTORY, ratingData);
  }
  // Evict from official solves
  const officialData = await get(KEYS.OFFICIAL_SOLVES) || {};
  if (officialData[handle]) {
    delete officialData[handle];
    await set(KEYS.OFFICIAL_SOLVES, officialData);
  }
}

async function setHandle(handle) {
  if (handle) {
    await updateLRU(handle);
  }
  return set(KEYS.HANDLE, handle);
}

async function getCachedContestList() {
  return get(KEYS.CONTEST_LIST);
}

async function setCachedContestList(contests) {
  return set(KEYS.CONTEST_LIST, contests);
}

async function getCachedVirtualContests(handle) {
  if (handle) await updateLRU(handle);
  const data = await get(KEYS.VIRTUAL_CONTESTS) || {};
  return data[handle];
}

async function setCachedVirtualContests(handle, data) {
  const allData = await get(KEYS.VIRTUAL_CONTESTS) || {};
  allData[handle] = data;
  return set(KEYS.VIRTUAL_CONTESTS, allData);
}

async function getCachedRatingHistory(handle) {
  if (handle) await updateLRU(handle);
  const data = await get(KEYS.RATING_HISTORY) || {};
  return data[handle];
}

async function setCachedRatingHistory(handle, history) {
  const allData = await get(KEYS.RATING_HISTORY) || {};
  allData[handle] = history;
  return set(KEYS.RATING_HISTORY, allData);
}

async function getCachedContestRatingChanges(contestId) {
  const data = await get(KEYS.CONTEST_RATING_CHANGES) || {};
  return data[contestId];
}

async function getCachedOfficialSolves(handle) {
  if (handle) await updateLRU(handle);
  const data = await get(KEYS.OFFICIAL_SOLVES) || {};
  return data[handle];
}

async function setCachedOfficialSolves(handle, solves) {
  const allData = await get(KEYS.OFFICIAL_SOLVES) || {};
  allData[handle] = solves;
  return set(KEYS.OFFICIAL_SOLVES, allData);
}

async function setCachedContestRatingChanges(contestId, changes) {
  const allData = await get(KEYS.CONTEST_RATING_CHANGES) || {};
  allData[contestId] = changes;
  return set(KEYS.CONTEST_RATING_CHANGES, allData);
}

async function getLastSyncTime() {
  return get(KEYS.LAST_SYNC);
}

async function setLastSyncTime(timestamp = Date.now()) {
  return set(KEYS.LAST_SYNC, timestamp);
}

async function clearCache() {
  return new Promise(resolve => {
    getStorage().clear(() => resolve());
  });
}

async function detectAuthenticatedHandleFromCF() {
  try {
    const response = await fetch('https://codeforces.com/', { credentials: 'include' });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/href="\/profile\/([a-zA-Z0-9_.-]+)"/i);
    if (match && match[1]) {
      const handle = match[1].trim();
      const lower = handle.toLowerCase();
      if (lower !== 'enter' && lower !== 'register' && lower !== 'login') {
        await set(KEYS.AUTH_HANDLE, handle);
        return handle;
      }
    }
  } catch (e) {
    console.warn('Failed to detect authenticated handle from Codeforces:', e);
  }
  return null;
}

async function getAuthHandle() {
  const cached = await get(KEYS.AUTH_HANDLE);
  if (cached) return cached;

  const detected = await detectAuthenticatedHandleFromCF();
  if (detected) return detected;

  const primary = await getHandle();
  return primary || null;
}

async function setAuthHandle(handle) {
  return set(KEYS.AUTH_HANDLE, handle);
}

async function getCachedContestProblemCounts() {
  return get(KEYS.CONTEST_PROBLEM_COUNTS);
}

async function setCachedContestProblemCounts(counts) {
  return set(KEYS.CONTEST_PROBLEM_COUNTS, counts);
}

async function getCachedPerformanceRatingMap() {
  return (await get(KEYS.PERFORMANCE_RATINGS)) || {};
}

async function getCachedPerformanceRating(contestId, rank) {
  const map = await getCachedPerformanceRatingMap();
  const key = `${contestId}_${rank}`;
  return map[key];
}

async function setCachedPerformanceRating(contestId, rank, perf) {
  const map = await getCachedPerformanceRatingMap();
  const key = `${contestId}_${rank}`;
  map[key] = perf;
  return set(KEYS.PERFORMANCE_RATINGS, map);
}

async function getCachedAllSolved(handle) {
  if (handle) await updateLRU(handle);
  const data = await get(KEYS.ALL_SOLVED) || {};
  return data[handle] || [];
}

async function setCachedAllSolved(handle, solvedList) {
  const allData = await get(KEYS.ALL_SOLVED) || {};
  allData[handle] = solvedList;
  return set(KEYS.ALL_SOLVED, allData);
}

export {
  getHandle,
  setHandle,
  getAuthHandle,
  setAuthHandle,
  getCachedContestList,
  setCachedContestList,
  getCachedVirtualContests,
  setCachedVirtualContests,
  getCachedRatingHistory,
  setCachedRatingHistory,
  getCachedContestRatingChanges,
  setCachedContestRatingChanges,
  getCachedOfficialSolves,
  setCachedOfficialSolves,
  getCachedContestProblemCounts,
  setCachedContestProblemCounts,
  getCachedPerformanceRatingMap,
  getCachedPerformanceRating,
  setCachedPerformanceRating,
  getCachedAllSolved,
  setCachedAllSolved,
  getLastSyncTime,
  setLastSyncTime,
  clearCache
};
