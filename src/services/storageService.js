const KEYS = {
  HANDLE: 'cf_handle',
  AUTH_HANDLE: 'cf_auth_handle',
  CONTEST_LIST: 'cf_contest_list',
  GYM_METADATA: 'cf_gym_metadata',
  VIRTUAL_CONTESTS: 'cf_virtual_contests_v5',
  RATING_HISTORY: 'cf_rating_history',
  CONTEST_RATING_CHANGES: 'cf_rating_changes_v3',
  LAST_SYNC: 'cf_last_sync',
  HANDLE_LRU: 'cf_handle_lru',
  OFFICIAL_SOLVES: 'cf_official_solves',
  CONTEST_PROBLEM_COUNTS: 'cf_contest_problem_counts',
  PERFORMANCE_RATINGS: 'cf_performance_ratings',
  ALL_SOLVED: 'cf_all_solved'
};

const MAX_CACHED_HANDLES = 25;

// Automatically purge any obsolete/old version storage keys (e.g. _v1, _v2, _v3)
function purgeLegacyStorageKeys() {
  const currentKeySet = new Set(Object.values(KEYS));

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (allData) => {
        if (!allData) return;
        const keysToRemove = Object.keys(allData).filter(
          k => k.startsWith('cf_') && !currentKeySet.has(k)
        );
        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove, () => {});
        }
      });
    } else if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cf_') && !currentKeySet.has(k)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {}
}

purgeLegacyStorageKeys();

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

async function getCachedGymMetadata() {
  return (await get(KEYS.GYM_METADATA)) || {};
}

async function setCachedGymMetadataItem(contestId, metadata) {
  if (!contestId || !metadata) return;
  const map = (await get(KEYS.GYM_METADATA)) || {};
  map[contestId] = {
    name: metadata.name,
    startTimeSeconds: metadata.startTimeSeconds,
    durationSeconds: metadata.durationSeconds
  };
  return set(KEYS.GYM_METADATA, map);
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

async function getAuthHandle() {
  const cached = await get(KEYS.AUTH_HANDLE);
  return cached || null;
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
  getCachedGymMetadata,
  setCachedGymMetadataItem,
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
