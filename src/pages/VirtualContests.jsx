import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import CodeforcesHeader from '../components/CodeforcesHeader.jsx';
import HandleInput from '../components/HandleInput.jsx';
import ContestStats from '../components/ContestStats.jsx';
import ContestFilters from '../components/ContestFilters.jsx';
import PerformanceGraph from '../components/PerformanceGraph.jsx';
import VirtualContestTable from '../components/VirtualContestTable.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { 
  loadOrDiscoverContests, 
  enrichSingleContest 
} from '../services/virtualContestService.js';
import { 
  getHandle, 
  setHandle as saveHandleToStorage,
  getLastSyncTime,
  clearCache
} from '../services/storageService.js';
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

  const contestMapRef = useRef(new Map());

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [filter, setFilter] = useState('all');
  const [solvedFilter, setSolvedFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize handle and load instantly from storage/discovery
  useEffect(() => {
    const init = async () => {
      const storedHandle = await getHandle();
      if (storedHandle) {
        setHandleState(storedHandle);
        fetchData(storedHandle, false);
      }
    };
    init();
  }, []);

  const fetchData = async (targetHandle, forceRefresh = false) => {
    if (!targetHandle) return;
    
    setLoading(true);
    setError(null);
    setLoadingMessage('Discovering virtual contests...');
    setLoadingProgress({});

    try {
      await saveHandleToStorage(targetHandle);
      
      const result = await loadOrDiscoverContests(targetHandle);
      contestMapRef.current = result.contestMap || new Map();
      
      setContests(result.contests || []);
      setLastSync(result.lastSync || Date.now());
    } catch (err) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (newHandle) => {
    if (!newHandle) return;
    setHandleState(newHandle);
    setContests([]);
    fetchData(newHandle, true);
  };

  const handleRefresh = async () => {
    if (!handle) return;
    fetchData(handle, true);
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all cached data?\n\nThis will clear all stored contests, ratings, and handle history from the extension.'
    );
    if (!confirmed) return;

    try {
      await clearCache();
      setContests([]);
      setHandleState('');
      setLastSync(null);
      setError(null);
      contestMapRef.current = new Map();
    } catch (e) {
      setError('Failed to clear data: ' + (e.message || e));
    }
  };

  const allFilteredContests = useMemo(() => {
    return contests.filter(c => {
      const isGym = (c.contestId && c.contestId >= 100000) || c.contestType === 'gym';
      const pType = c.participationType || (c.isUnrated ? 'unrated' : 'virtual');

      // Participation type filter
      if (typeFilter === 'all-no-gym' && isGym) return false;
      if (typeFilter === 'virtual' && pType !== 'virtual') return false;
      if (typeFilter === 'virtual-no-gym' && (pType !== 'virtual' || isGym)) return false;
      if (typeFilter === 'unrated' && pType !== 'unrated') return false;
      if (typeFilter === 'gym' && !isGym) return false;

      // Division filter
      if (filter !== 'all') {
        const div = c.contestType || getContestType(c.contestName, c.contestId);
        if (div !== filter) return false;
      }

      // Solved count filter
      if (solvedFilter !== 'all') {
        const solved = typeof c.solvedCount === 'number' ? c.solvedCount : (parseInt(c.solvedCount, 10) || 0);
        if (solvedFilter === '0-2' && solved > 2) return false;
        if (solvedFilter === '3-4' && (solved < 3 || solved > 4)) return false;
        if (solvedFilter === '5+' && solved < 5) return false;
      }

      // Search term
      if (search) {
        const term = search.toLowerCase().trim();
        const cName = (c.contestName || '').toLowerCase();
        const cIdStr = (c.contestId || '').toString();
        if (!cName.includes(term) && !cIdStr.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [contests, typeFilter, filter, solvedFilter, search]);

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

  const enrichingRef = useRef(new Set());
  const paginatedContestsRef = useRef(paginatedContests);
  const contestsRef = useRef(contests);
  const batchedUpdatesRef = useRef([]);
  const batchTimeoutRef = useRef(null);

  useEffect(() => {
    paginatedContestsRef.current = paginatedContests;
  }, [paginatedContests]);

  useEffect(() => {
    contestsRef.current = contests;
  }, [contests]);

  const applyBatchedUpdates = useCallback(() => {
    if (batchedUpdatesRef.current.length === 0) return;
    const currentBatch = [...batchedUpdatesRef.current];
    batchedUpdatesRef.current = [];
    setContests(prev => {
      const map = new Map(prev.map(c => [c.key, c]));
      currentBatch.forEach(c => map.set(c.key, c));
      return Array.from(map.values());
    });
  }, []);

  useEffect(() => {
    if (!handle) return;
    let isMounted = true;

    const runProgressiveEnrichment = async () => {
      while (isMounted) {
        let visibleUnenriched = (paginatedContestsRef.current || []).filter(c => c.isEnriched === false || c.rank == null);
        let toProcess = visibleUnenriched.find(c => !enrichingRef.current.has(c.key));

        if (!toProcess) {
          let allUnenriched = (contestsRef.current || []).filter(c => c.isEnriched === false || c.rank == null);
          toProcess = allUnenriched.find(c => !enrichingRef.current.has(c.key));
        }

        if (!toProcess) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        enrichingRef.current.add(toProcess.key);
        try {
          const enriched = await enrichSingleContest(handle, toProcess, contestMapRef.current);
          if (isMounted && enriched) {
            batchedUpdatesRef.current.push(enriched);
            if (!batchTimeoutRef.current) {
              batchTimeoutRef.current = setTimeout(() => {
                applyBatchedUpdates();
                batchTimeoutRef.current = null;
              }, 500); // UI update batching
            }
          }
        } catch (e) {
          console.warn(`Failed to enrich contest ${toProcess.contestId}:`, e);
        }

        await new Promise(r => setTimeout(r, 200)); // Gentle rate-limit pause
      }
    };

    runProgressiveEnrichment();

    return () => {
      isMounted = false;
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      applyBatchedUpdates();
    };
  }, [handle, applyBatchedUpdates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, filter, solvedFilter, sort, search, handle]);

  const handleContestClick = useCallback((contest) => {
    window.location.hash = `#/contest/${contest.contestId}/${contest.virtualStartTime}`;
  }, []);

  const getPageTitle = () => {
    switch (typeFilter) {
      case 'virtual': return 'Virtual Contests History';
      case 'virtual-no-gym': return 'Virtual Contests (without Gym)';
      case 'all-no-gym': return 'Contests History (without Gym)';
      case 'unrated': return 'Unrated Contests History';
      case 'gym': return 'Gym Contests History';
      default: return 'Virtual & Unrated Contests History';
    }
  };

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
              typeFilter={typeFilter}
              filter={filter}
              solvedFilter={solvedFilter}
              sort={sort}
              search={search}
              onTypeFilterChange={setTypeFilter}
              onFilterChange={setFilter}
              onSolvedFilterChange={setSolvedFilter}
              onSortChange={setSort}
              onSearchChange={setSearch}
            />
          </>
        )}
      </div>

      <div id="content">
        <div className="section-title">{getPageTitle()}{handle ? ` \u2014 ${handle}` : ''}</div>

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
               typeFilter={typeFilter}
               onSortChange={setSort}
               onContestClick={handleContestClick}
               totalContests={sortedContests.length}
             />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage}
                totalItems={sortedContests.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
              
              <div style={{ fontSize: '1.1rem', color: '#888' }}>
                Last synced: {lastSync ? formatDateTime(Math.floor(lastSync / 1000)) : 'Never'}
                {' '}
                <button className="cf-btn" onClick={handleRefresh} style={{ marginLeft: '6px' }} title="Scan Codeforces for new contests and activity">
                  Refresh
                </button>
                <button
                  className="cf-btn"
                  onClick={handleClearData}
                  style={{ marginLeft: '6px', color: '#b91c1c' }}
                  title="Delete all cached contest data and reset the extension"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && !error && handle && contests.length === 0 && (
          <div className="notice" style={{ marginTop: '15px' }}>
            No contests found for <strong>{handle}</strong>. Try entering a different handle.
          </div>
        )}

        {!loading && !error && !handle && (
          <div className="notice" style={{ marginTop: '15px' }}>
            Enter a Codeforces handle in the sidebar to view contests history.
          </div>
        )}
      </div>
      <div className="clear"></div>
    </>
  );
}

export default VirtualContests;
