const BASE_URL = 'https://codeforces.com/api';

class CodeforcesApiError extends Error {
  constructor(status, comment) {
    super(comment);
    this.name = 'CodeforcesApiError';
    this.status = status;
    this.comment = comment;
  }
}

// Request deduplication
const inFlightRequests = new Map();

// Rate limiting
const RATE_LIMIT_MS = 350;
let lastRequestTime = 0;
let tokenQueue = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function acquireToken() {
  const p = tokenQueue.then(async () => {
    const now = Date.now();
    const timeToWait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
    if (timeToWait > 0) {
      await delay(timeToWait);
    }
    lastRequestTime = Date.now();
  });
  tokenQueue = p.catch(() => {});
  return p;
}

async function fetchApi(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  const urlString = url.toString();

  if (inFlightRequests.has(urlString)) {
    return inFlightRequests.get(urlString);
  }

  const executeRequest = async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      await acquireToken();

      try {
        const response = await fetch(urlString);
        
        // Handle Cloudflare 503 or HTML response on rate limit
        if (!response.ok) {
          if (response.status === 503 || response.status === 429) {
            if (attempt < retries) {
              await delay(2000); // Wait 2s before retry
              continue;
            }
          }
        }
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (attempt < retries) {
            await delay(2000);
            continue;
          }
          throw new Error('Invalid JSON response from Codeforces API');
        }
        
        if (data.status !== 'OK') {
          throw new CodeforcesApiError(data.status, data.comment);
        }
        return data.result;
      } catch (err) {
        if (attempt === retries || err instanceof CodeforcesApiError) {
          throw err;
        }
        await delay(2000);
      }
    }
  };

  const requestPromise = executeRequest().finally(() => {
    inFlightRequests.delete(urlString);
  });
  
  inFlightRequests.set(urlString, requestPromise);

  return requestPromise;
}

async function getUserInfo(handle) {
  const result = await fetchApi('/user.info', { handles: handle });
  return result[0];
}

async function getUserRating(handle) {
  return fetchApi('/user.rating', { handle });
}

async function getUserStatus(handle, from, count) {
  return fetchApi('/user.status', { handle, from, count });
}

async function getContestList(gym = false) {
  return fetchApi('/contest.list', { gym });
}

async function getContestStandings(contestId, { handles, showUnofficial, from, count } = {}) {
  return fetchApi('/contest.standings', { contestId, handles, showUnofficial, from, count });
}

async function getContestStatus(contestId, handle) {
  return fetchApi('/contest.status', { contestId, handle });
}

async function getContestRatingChanges(contestId) {
  return fetchApi('/contest.ratingChanges', { contestId });
}

async function getProblemsetProblems(tags = '') {
  return fetchApi('/problemset.problems', tags ? { tags } : {});
}

export {
  CodeforcesApiError,
  fetchApi,
  getUserInfo,
  getUserRating,
  getUserStatus,
  getContestList,
  getContestStandings,
  getContestStatus,
  getContestRatingChanges,
  getProblemsetProblems
};
