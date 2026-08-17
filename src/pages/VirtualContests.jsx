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
      // Participation type filter (virtual vs unrated)
      const pType = c.participationType || (c.isUnrated ? 'unrated' : 'virtual');
      if (typeFilter === 'virtual' && pType !== 'virtual') return false;
      if (typeFilter === 'unrated' && pType !== 'unrated') return false;

      // Division filter
      if (filter !== 'all') {
        const div = c.contestType || getContestType(c.contestName);
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

  // Progressive Enrichment: Prioritize visible page, then gentle background queue
  useEffect(() => {
    if (!handle || contests.length === 0) return;

    let isMounted = true;

    const runProgressiveEnrichment = async () => {
      // 1. Priority 1: Enrich visible un-enriched contests on current page first
      const visibleUnenriched = paginatedContests.filter(c => c.isEnriched === false || c.rank == null);
      
      for (const item of visibleUnenriched) {
        if (!isMounted) break;
        try {
          const enriched = await enrichSingleContest(handle, item, contestMapRef.current);
          if (isMounted && enriched) {
            setContests(prev => prev.map(c => c.key === enriched.key ? enriched : c));
          }
        } catch (e) {
          console.warn(`Failed to enrich contest ${item.contestId}:`, e);
        }
      }

      // 2. Priority 2: Background worker for any remaining un-enriched contests
      const remainingUnenriched = contests.filter(c => c.isEnriched === false || c.rank == null);
      for (const item of remainingUnenriched) {
        if (!isMounted) break;
        // Don't process if already enriched in visible pass
        if (item.isEnriched && item.rank != null) continue;
        
        try {
          await new Promise(r => setTimeout(r, 200)); // Gentle rate-limit pause
          if (!isMounted) break;
          const enriched = await enrichSingleContest(handle, item, contestMapRef.current);
          if (isMounted && enriched) {
            setContests(prev => prev.map(c => c.key === enriched.key ? enriched : c));
          }
        } catch (e) {
          console.warn(`Background enrichment error on contest ${item.contestId}:`, e);
        }
      }
    };

    runProgressiveEnrichment();

    return () => {
      isMounted = false;
    };
  }, [paginatedContests, handle]);

  // Reset page to 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, filter, solvedFilter, sort, search, handle]);

  const handleContestClick = useCallback((contest) => {
    window.location.hash = `#/contest/${contest.contestId}/${contest.virtualStartTime}`;
  }, []);

  const getPageTitle = () => {
    switch (typeFilter) {
      case 'virtual': return 'Virtual Contests History';
      case 'unrated': return 'Unrated Contests History';
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
