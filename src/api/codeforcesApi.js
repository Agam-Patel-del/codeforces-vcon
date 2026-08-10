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
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;
let requestQueue = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const executeRequest = async () => {
    const now = Date.now();
    const timeToWait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
    if (timeToWait > 0) {
      await delay(timeToWait);
    }
    lastRequestTime = Date.now();

    try {
      const response = await fetch(urlString);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new CodeforcesApiError(data.status, data.comment);
      }
      return data.result;
    } finally {
      inFlightRequests.delete(urlString);
    }
  };

  const requestPromise = requestQueue.then(() => executeRequest());
  requestQueue = requestPromise.catch(() => {});
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

export {
  CodeforcesApiError,
  fetchApi,
  getUserInfo,
  getUserRating,
  getUserStatus,
  getContestList,
  getContestStandings,
  getContestStatus,
  getContestRatingChanges
};
