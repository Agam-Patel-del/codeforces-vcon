import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CodeforcesHeader from '../components/CodeforcesHeader.jsx';
import HandleInput from '../components/HandleInput.jsx';
import ContestStats from '../components/ContestStats.jsx';
import ContestFilters from '../components/ContestFilters.jsx';
import PerformanceGraph from '../components/PerformanceGraph.jsx';
import VirtualContestTable from '../components/VirtualContestTable.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getAllVirtualContests, syncVirtualContests } from '../services/virtualContestService.js';
import { getHandle, getCachedVirtualContests, getCachedRatingHistory, getCachedOfficialSolves, setHandle as saveHandleToStorage } from '../services/storageService.js';
import { getContestType } from '../utils/contest.js';
import { formatDateTime } from '../utils/dates.js';

const ITEMS_PER_PAGE = 50;

function VirtualContests() {
  const [handle, setHandleState] = useState('');
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState({});
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const [typeFilter, setTypeFilter] = useState('virtual');
  const [sort, setSort] = useState('newest');
  const [filter, setFilter] = useState('all');
  const [solvedFilter, setSolvedFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize handle, load cache, and sync in background
  useEffect(() => {
    const init = async () => {
      const storedHandle = await getHandle();
      if (storedHandle) {
        setHandleState(storedHandle);
        
        // 1. Instantly load from cache to populate the screen quickly
        const cacheResult = await getAllVirtualContests(storedHandle, { forceRefresh: false });
        if (cacheResult && cacheResult.contests) {
          setContests(cacheResult.contests);
          setLastSync(cacheResult.lastSync);
        }
        
        // 2. Silently sync in the background to fetch any new contests
        try {
          const syncResult = await syncVirtualContests(storedHandle, { onProgress: () => {} });
          if (syncResult && syncResult.contests) {
            setContests(syncResult.contests);
            setLastSync(syncResult.lastSync);
          }
        } catch (e) {
          console.error("Background sync failed", e);
        }
      }
    };
    init();
  }, []);

  const fetchData = async (targetHandle, forceSync = false) => {
    if (!targetHandle) return;
    
    setLoading(true);
    setError(null);
    setLoadingMessage('Loading virtual contests...');
    setLoadingProgress({});

    try {
      await saveHandleToStorage(targetHandle);
      
      const onProgress = (current, total, contestName) => {
        setLoadingMessage(`Analyzing: ${contestName || 'contest'}...`);
        setLoadingProgress({ current, total });
      };

      let result;
      if (forceSync) {
        result = await syncVirtualContests(targetHandle, { onProgress });
      } else {
        const cached = await getCachedVirtualContests(targetHandle);
        result = { contests: cached || [], lastSync: Date.now() };
      }
      
      const ratingHistory = await getCachedRatingHistory(targetHandle);
      const officialSolves = await getCachedOfficialSolves(targetHandle) || {};
      let mergedContests = [...(result.contests || [])];
      
      if (ratingHistory && Array.isArray(ratingHistory)) {
        const officialContests = ratingHistory.map(r => ({
          contestId: r.contestId,
          contestName: r.contestName,
          contestStartTime: r.ratingUpdateTimeSeconds,
          virtualStartTime: r.ratingUpdateTimeSeconds,
          rank: r.rank,
          solvedCount: officialSolves[r.contestId] !== undefined ? officialSolves[r.contestId] : '-',
          totalProblems: '-',
          ratingBefore: r.oldRating,
          predictedRatingDelta: r.newRating - r.oldRating,
          predictedRatingAfter: r.newRating,
          performanceRating: r.oldRating + 2 * (r.newRating - r.oldRating),
          isOfficial: true
        }));
        mergedContests = [...mergedContests, ...officialContests];
      }
      
      result.contests = mergedContests;
      
      setContests(result.contests || []);
      setLastSync(result.lastSync || null);
    } catch (err) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (newHandle) => {
    setHandleState(newHandle);
    setContests([]);
    fetchData(newHandle, true);
  };

  const handleRefresh = async () => {
    if (!handle) return;
    
    setLoading(true);
    setError(null);
    setLoadingMessage('Force refreshing all virtual contests...');
    setLoadingProgress({});

    try {
      const onProgress = (current, total, contestName) => {
        setLoadingMessage(`Analyzing: ${contestName || 'contest'}...`);
        setLoadingProgress({ current, total });
      };

      const result = await getAllVirtualContests(handle, { onProgress, forceRefresh: true });
      setContests(result.contests || []);
      setLastSync(result.lastSync || null);
    } catch (err) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const allFilteredContests = useMemo(() => {
    return contests.filter(c => {
      // Type filter
      if (typeFilter === 'virtual' && c.isOfficial) return false;
      if (typeFilter === 'official' && !c.isOfficial) return false;

      if (search) {
        const term = search.toLowerCase();
        const cName = (c.contestName || '').toLowerCase();
        const cIdStr = (c.contestId || '').toString();
        if (!cName.includes(term) && !cIdStr.includes(term)) {
          return false;
        }
      }

      if (filter !== 'all') {
        const type = getContestType(c.contestName);
        if (type !== filter) return false;
      }

      if (solvedFilter !== 'all') {
        const solved = c.solvedCount || 0;
        if (solvedFilter === '0-2' && solved > 2) return false;
        if (solvedFilter === '3-4' && (solved < 3 || solved > 4)) return false;
        if (solvedFilter === '5+' && solved < 5) return false;
      }

      return true;
    });
  }, [contests, search, filter, solvedFilter, typeFilter]);

  const sortedContests = useMemo(() => {
    const list = [...allFilteredContests];
    list.sort((a, b) => {
      let valA, valB;
      switch (sort) {
        case 'newest':
          return (b.virtualStartTime || 0) - (a.virtualStartTime || 0);
        case 'oldest':
          return (a.virtualStartTime || 0) - (b.virtualStartTime || 0);
        case 'best-rank':
          valA = a.rank || Infinity;
          valB = b.rank || Infinity;
          return valA - valB;
        case 'worst-rank':
          valA = a.rank || -Infinity;
          valB = b.rank || -Infinity;
          return valB - valA;
        case 'most-solved':
          return (b.solvedCount || 0) - (a.solvedCount || 0);
        case 'least-solved':
          return (a.solvedCount || 0) - (b.solvedCount || 0);
        case 'highest-delta':
          valA = a.predictedRatingDelta ?? -Infinity;
          valB = b.predictedRatingDelta ?? -Infinity;
          return valB - valA;
        case 'lowest-delta':
          valA = a.predictedRatingDelta ?? Infinity;
          valB = b.predictedRatingDelta ?? Infinity;
          return valA - valB;
        default:
          return 0;
      }
    });
    return list;
  }, [allFilteredContests, sort]);

  const sortedByDate = useMemo(() => {
    return [...allFilteredContests].sort((a, b) => (a.virtualStartTime || 0) - (b.virtualStartTime || 0));
  }, [allFilteredContests]);

  const paginatedContests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedContests.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedContests, currentPage]);

  const totalPages = Math.ceil(sortedContests.length / ITEMS_PER_PAGE);

  // Reset page to 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, typeFilter, sort, search, solvedFilter]);

  const handleContestClick = useCallback((contest) => {
    if (contest.isOfficial) {
      window.open(`https://codeforces.com/contest/${contest.contestId}/my`, '_blank');
    } else {
      window.location.hash = `#/contest/${contest.contestId}/${contest.virtualStartTime}`;
    }
  }, []);

  return (
    <>
      <CodeforcesHeader handle={handle} />
      <br style={{ clear: 'both' }} />

      <div id="sidebar">
        <HandleInput handle={handle} onLoad={handleLoad} loading={loading} />
        {!loading && !error && contests.length > 0 && (
          <>
            <ContestStats contests={allFilteredContests} />
            <ContestFilters
              filter={filter}
              typeFilter={typeFilter}
              sort={sort}
              search={search}
              solvedFilter={solvedFilter}
              onFilterChange={setFilter}
              onTypeFilterChange={setTypeFilter}
              onSortChange={setSort}
              onSearchChange={setSearch}
              onSolvedFilterChange={setSolvedFilter}
            />
          </>
        )}
      </div>

      <div id="content">
        <div className="section-title">Virtual Contests{handle ? ` \u2014 ${handle}` : ''}</div>

        {loading && (
          <LoadingState 
            message={loadingMessage} 
            current={loadingProgress.current} 
            total={loadingProgress.total} 
          />
        )}
        
        {error && <ErrorState error={error} onRetry={handleRefresh} />}
        
        {!loading && !error && contests.length > 0 && (
          <>
            <PerformanceGraph contests={sortedByDate} />
            
             <VirtualContestTable 
               contests={paginatedContests} 
               sort={sort} 
               handle={handle}
               onSortChange={setSort}
               onContestClick={handleContestClick}
               totalContests={sortedContests.length}
             />
            
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage}
              totalItems={sortedContests.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
            
            <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '1.1rem', color: '#888' }}>
              Last synced: {lastSync ? formatDateTime(Math.floor(lastSync / 1000)) : 'Never'}
              {' '}
              <button className="cf-btn" onClick={handleRefresh} style={{ marginLeft: '6px' }}>
                Force Refresh
              </button>
            </div>
          </>
        )}

        {!loading && !error && handle && contests.length === 0 && (
          <div className="notice" style={{ marginTop: '15px' }}>
            No virtual contests found for <strong>{handle}</strong>. Try entering a different handle.
          </div>
        )}

        {!loading && !error && !handle && (
          <div className="notice" style={{ marginTop: '15px' }}>
            Enter a Codeforces handle in the sidebar to view virtual contest history.
          </div>
        )}
      </div>
      <div className="clear"></div>
    </>
  );
}

export default VirtualContests;
