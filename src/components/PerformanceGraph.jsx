import React, { useRef, useEffect, useState } from 'react';
import { formatDate } from '../utils/dates.js';

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
  const [hoverData, setHoverData] = useState(null);

  const dataPoints = contests
    .filter(c => c.performanceRating != null)
    .sort((a, b) => a.virtualStartTime - b.virtualStartTime);

  useEffect(() => {
    if (!showGraph || dataPoints.length < 2 || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Size canvas to its container width
    const containerWidth = container.clientWidth;
    const canvasWidth = containerWidth;
    const canvasHeight = 180;
    
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
      ctx.fillStyle = getRatingColor(p.rating);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let hovered = null;
      for (const p of points) {
        if (Math.hypot(p.x - mouseX, p.y - mouseY) < 10) {
          hovered = p;
          break;
        }
      }
      setHoverData(hovered);
    };

    const handleMouseLeave = () => setHoverData(null);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };

  }, [dataPoints, showGraph]);

  if (dataPoints.length < 2) return null;

  return (
    <div className="roundbox borderTopRound borderBottomRound">
      <div className="caption titled" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{"\u2192"} Performance Graph</span>
        <button
          className="cf-btn"
          onClick={() => setShowGraph(!showGraph)}
          style={{ padding: '1px 8px', fontSize: '1.1rem' }}
        >
          {showGraph ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {showGraph && (
        <div ref={containerRef} style={{ position: 'relative', padding: '8px' }}>
          <canvas 
            ref={canvasRef} 
            style={{ display: 'block', width: '100%' }}
          />
          {hoverData && (
            <div style={{
              position: 'absolute',
              left: Math.min(hoverData.x + 10, (containerRef.current?.clientWidth || 500) - 120),
              top: hoverData.y - 20,
              background: '#fff',
              border: '1px solid #b9b9b9',
              borderRadius: '3px',
              padding: '3px 8px',
              fontSize: '11px',
              pointerEvents: 'none',
              boxShadow: '1px 1px 3px rgba(0,0,0,0.15)',
              zIndex: 10
            }}>
              {formatDate(hoverData.contest.virtualStartTime)}<br/>
              Performance: <strong>{Math.round(hoverData.rating)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PerformanceGraph;
