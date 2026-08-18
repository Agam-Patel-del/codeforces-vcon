import React, { useRef, useEffect, useState, useMemo } from 'react';
import { formatDate } from '../utils/dates.js';
import { getRatingColorClass, formatDelta, getDeltaClass } from '../utils/rating.js';
import { getContestUrl } from '../utils/contest.js';

const getRatingColor = (rating) => {
  if (!rating || rating < 1200) return '#cccccc';
  if (rating < 1400) return '#77ff77';
  if (rating < 1600) return '#77ddbb';
  if (rating < 1900) return '#aaaaff';
  if (rating < 2100) return '#ff88ff';
  if (rating < 2400) return '#ffcc88';
  if (rating < 3000) return '#ff7777';
  return '#ff3333';
};

const HIDE_DELAY_MS = 1000;

function PerformanceGraph({ contests }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [showGraph, setShowGraph] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [pinnedPoint, setPinnedPoint] = useState(null);
  const hideTimerRef = useRef(null);
  const pointsRef = useRef([]);

  const dataPoints = useMemo(() => {
    return (contests || [])
      .filter(c => c.performanceRating != null && typeof c.performanceRating === 'number')
      .sort((a, b) => (a.virtualStartTime || 0) - (b.virtualStartTime || 0));
  }, [contests]);

  const activePoint = hoveredPoint || pinnedPoint;

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const startHideTimer = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setHoveredPoint(null);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    if (!showGraph || dataPoints.length < 2 || !canvasRef.current || !containerRef.current) return;

    const renderGraph = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const canvasWidth = container.clientWidth;
      const canvasHeight = 280;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      const padding = { top: 20, right: 20, bottom: 20, left: 40 };
      const plotWidth = canvasWidth - padding.left - padding.right;
      const plotHeight = canvasHeight - padding.top - padding.bottom;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const minRating = Math.min(...dataPoints.map(d => d.performanceRating)) - 100;
      const maxRating = Math.max(...dataPoints.map(d => d.performanceRating)) + 100;
      const ratingRange = maxRating - minRating;

      // Background rating bands
      const bands = [
        { min: 0, max: 1200, color: 'rgba(128,128,128,0.05)' },
        { min: 1200, max: 1400, color: 'rgba(0,128,0,0.05)' },
        { min: 1400, max: 1600, color: 'rgba(3,168,158,0.05)' },
        { min: 1600, max: 1900, color: 'rgba(0,0,255,0.05)' },
        { min: 1900, max: 2100, color: 'rgba(170,0,170,0.05)' },
        { min: 2100, max: 2400, color: 'rgba(255,140,0,0.05)' },
        { min: 2400, max: 5000, color: 'rgba(255,0,0,0.05)' },
      ];

      for (const band of bands) {
        const bandTop = Math.max(band.min, minRating);
        const bandBot = Math.min(band.max, maxRating);
        if (bandTop >= maxRating || bandBot <= minRating) continue;

        const y1 = padding.top + (1 - (bandBot - minRating) / ratingRange) * plotHeight;
        const y2 = padding.top + (1 - (bandTop - minRating) / ratingRange) * plotHeight;
        ctx.fillStyle = band.color;
        ctx.fillRect(padding.left, y1, plotWidth, y2 - y1);
      }

      // Grid lines
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const y = padding.top + (i / gridSteps) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + plotWidth, y);
        ctx.stroke();

        // Y-axis labels
        const ratingVal = Math.round(maxRating - (i / gridSteps) * ratingRange);
        ctx.fillStyle = '#888';
        ctx.font = '10px verdana, arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(ratingVal, padding.left - 5, y + 4);
      }
      ctx.setLineDash([]);

      // Plot points
      const points = dataPoints.map((d, i) => {
        const x = padding.left + (i / (dataPoints.length - 1)) * plotWidth;
        const y = padding.top + (1 - (d.performanceRating - minRating) / ratingRange) * plotHeight;
        return { x, y, rating: d.performanceRating, contest: d };
      });

      pointsRef.current = points;

      // Line
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Dots
      points.forEach((p) => {
        const isHighlighted = activePoint && activePoint.contest.key === p.contest.key;
        const isPinned = pinnedPoint && pinnedPoint.contest.key === p.contest.key;
        const radius = isHighlighted ? 6 : 4;

        ctx.fillStyle = getRatingColor(p.rating);
        ctx.strokeStyle = isHighlighted ? '#000000' : '#666666';
        ctx.lineWidth = isHighlighted ? 2.5 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        if (isPinned) {
          ctx.strokeStyle = '#1a5cc8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius + 3, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });
    };

    renderGraph();

    window.addEventListener('resize', renderGraph);
    return () => {
      window.removeEventListener('resize', renderGraph);
    };
  }, [dataPoints, showGraph, activePoint, pinnedPoint]);

  const findNearestPoint = (e, maxDistance = 20) => {
    if (!canvasRef.current || pointsRef.current.length === 0) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    let nearest = null;
    let minDistance = maxDistance;

    for (const p of pointsRef.current) {
      const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = p;
      }
    }
    return nearest;
  };

  const handleMouseMove = (e) => {
    const nearest = findNearestPoint(e, 20);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = nearest ? 'pointer' : 'default';
    }

    if (nearest) {
      clearHideTimer();
      setHoveredPoint(nearest);
    } else {
      // If we are currently hovering a point and no timer is running, start grace period
      if (hoveredPoint && !hideTimerRef.current) {
        startHideTimer();
      }
    }
  };

  const handleCanvasClick = (e) => {
    // Generous click distance threshold (28px) so user doesn't miss the dot
    const nearest = findNearestPoint(e, 28);
    if (nearest) {
      clearHideTimer();
      setPinnedPoint(prev => (prev && prev.contest.key === nearest.contest.key ? null : nearest));
      setHoveredPoint(nearest);
    } else {
      // Clicked outside any dot
      clearHideTimer();
      setPinnedPoint(null);
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    if (hoveredPoint) {
      startHideTimer();
    }
  };

  const handleCardMouseEnter = () => {
    clearHideTimer();
  };

  const handleCardMouseLeave = () => {
    if (hoveredPoint) {
      startHideTimer();
    }
  };

  const handleCloseCard = (e) => {
    e.stopPropagation();
    clearHideTimer();
    setPinnedPoint(null);
    setHoveredPoint(null);
  };

  const getCardStyle = () => {
    if (!activePoint) return {};

    const containerWidth = containerRef.current?.clientWidth || 500;
    const canvasHeight = 280;
    const cardWidth = 220;
    const cardHeight = 150;

    // Place card to the right if dot is on left half, or to the left if dot is on right half
    let left;
    if (activePoint.x > containerWidth / 2) {
      left = activePoint.x - cardWidth - 10;
    } else {
      left = activePoint.x + 10;
    }

    // Vertically align near the dot
    let top = activePoint.y - 30;

    // Clamp inside container
    left = Math.max(6, Math.min(left, containerWidth - cardWidth - 6));
    top = Math.max(6, Math.min(top, canvasHeight - cardHeight - 6));

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${cardWidth}px`,
      background: '#ffffff',
      border: '1px solid #b9b9b9',
      borderRadius: '3px',
      padding: '6px 10px',
      fontSize: '11px',
      lineHeight: '1.4',
      boxShadow: '2px 2px 8px rgba(0,0,0,0.22)',
      zIndex: 20,
      color: '#333',
      pointerEvents: 'auto'
    };
  };

  if (dataPoints.length < 2) return null;

  return (
    <div className="roundbox borderTopRound borderBottomRound" style={{ overflow: 'visible' }}>
      <div className="caption titled" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '0.5em', paddingTop: '0.3em' }}>
        <span>{"\u2192"} Performance Graph</span>
        <button
          className="cf-btn"
          onClick={() => setShowGraph(!showGraph)}
          style={{ padding: '1px 8px', fontSize: '1.1rem', marginRight: '6px' }}
        >
          {showGraph ? 'Hide' : 'Show'}
        </button>
      </div>

      {showGraph && (
        <div style={{ padding: '8px' }}>
          <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '280px' }}>
            <canvas 
              ref={canvasRef} 
              style={{ display: 'block', width: '100%', height: '280px' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleCanvasClick}
            />
            {activePoint && (
              <div 
                style={getCardStyle()}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '3px', marginBottom: '4px' }}>
                  <a 
                    href={getContestUrl(activePoint.contest.contestId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1a5cc8', textDecoration: 'none', fontWeight: 'bold', fontSize: '11px', paddingRight: '8px' }}
                  >
                    {activePoint.contest.contestName}
                  </a>
                  <button
                    onClick={handleCloseCard}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '0 2px',
                      lineHeight: '1'
                    }}
                    title="Close"
                  >
                    &times;
                  </button>
                </div>
                <div style={{ color: '#777', fontSize: '10px', marginBottom: '5px' }}>
                  {formatDate(activePoint.contest.virtualStartTime)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Rank:</span>
                  <strong>{activePoint.contest.rank ?? '-'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Solved:</span>
                  <strong>{activePoint.contest.solvedCount ?? 0} / {activePoint.contest.totalProblems ?? '?'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Performance:</span>
                  <span className={getRatingColorClass(activePoint.rating)} style={{ fontWeight: 'bold' }}>
                    {Math.round(activePoint.rating)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Delta (&Delta;):</span>
                  <span className={getDeltaClass(activePoint.contest.predictedRatingDelta)} style={{ fontWeight: 'bold' }}>
                    {activePoint.contest.predictedRatingDelta != null ? formatDelta(activePoint.contest.predictedRatingDelta) : '-'}
                  </span>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '3px', textAlign: 'right' }}>
                  <a
                    href={`#/contest/${activePoint.contest.contestId}/${activePoint.contest.virtualStartTime}`}
                    style={{ color: '#1a5cc8', fontSize: '10px', textDecoration: 'none' }}
                  >
                    View Details &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceGraph;

