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

  const activePoint = pinnedPoint || hoveredPoint;

  useEffect(() => {
    if (!showGraph || dataPoints.length < 2 || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const containerWidth = container.clientWidth;
    const canvasWidth = containerWidth;
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
      const radius = isHighlighted ? 6 : 4;

      ctx.fillStyle = getRatingColor(p.rating);
      ctx.strokeStyle = isHighlighted ? '#000000' : '#666666';
      ctx.lineWidth = isHighlighted ? 2.5 : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

  }, [dataPoints, showGraph, activePoint]);

  const findNearestPoint = (e) => {
    if (!canvasRef.current || pointsRef.current.length === 0) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const p of pointsRef.current) {
      if (Math.hypot(p.x - mouseX, p.y - mouseY) < 14) {
        return p;
      }
    }
    return null;
  };

  const handleMouseMove = (e) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const nearest = findNearestPoint(e);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = nearest ? 'pointer' : 'default';
    }

    if (nearest) {
      setHoveredPoint(nearest);
    } else if (!pinnedPoint) {
      // Small grace delay before clearing hover
      hideTimerRef.current = setTimeout(() => {
        setHoveredPoint(null);
      }, 250);
    }
  };

  const handleCanvasClick = (e) => {
    const nearest = findNearestPoint(e);
    if (nearest) {
      setPinnedPoint(prev => (prev && prev.contest.key === nearest.contest.key ? null : nearest));
      setHoveredPoint(nearest);
    } else {
      setPinnedPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    if (!pinnedPoint) {
      hideTimerRef.current = setTimeout(() => {
        setHoveredPoint(null);
      }, 350);
    }
  };

  const handleCardMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleCardMouseLeave = () => {
    if (!pinnedPoint) {
      hideTimerRef.current = setTimeout(() => {
        setHoveredPoint(null);
      }, 300);
    }
  };

  const handleCloseCard = (e) => {
    e.stopPropagation();
    setPinnedPoint(null);
    setHoveredPoint(null);
  };

  const getCardStyle = () => {
    if (!activePoint) return {};

    const containerWidth = containerRef.current?.clientWidth || 500;
    const cardWidth = 220;
    const cardHeight = 145;

    // 3rd Quadrant: Bottom-Left relative to dot origin (x < dot.x, y > dot.y in screen space)
    let left = activePoint.x - cardWidth - 8;
    let top = activePoint.y + 8;

    // Boundary check for left edge: if dot is too close to left, flip horizontally or clamp
    if (left < 8) {
      if (activePoint.x + 8 + cardWidth <= containerWidth - 8) {
        left = activePoint.x + 8;
      } else {
        left = 8;
      }
    }

    // Boundary check for bottom edge: if dot is near bottom, shift upward
    if (top + cardHeight > 285) {
      top = Math.max(8, activePoint.y - cardHeight - 8);
    }

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
    <div className="roundbox borderTopRound borderBottomRound">
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
        <div ref={containerRef} style={{ position: 'relative', padding: '8px' }}>
          <canvas 
            ref={canvasRef} 
            style={{ display: 'block', width: '100%' }}
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
      )}
    </div>
  );
}

export default PerformanceGraph;
