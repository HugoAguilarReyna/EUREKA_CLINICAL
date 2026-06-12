import React, { useMemo } from 'react';
import { SimulationResult } from '../../types/twin-simulator';
import { C, FONT_SANS } from './twin-simulator.styles';

interface SensitivityAnalysisProps {
  currentResults: SimulationResult | null;
}

export const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({ currentResults }) => {
  // If we don't have results, we can't draw the chart properly
  if (!currentResults) {
    return (
      <div style={{ fontFamily: FONT_SANS }}>
        <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '16px' }}>
          SENSITIVITY ANALYSIS
        </div>
        <div style={{ padding: '24px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.dim, textAlign: 'center', fontSize: '0.85rem' }}>
          Awaiting simulation data...
        </div>
      </div>
    );
  }

  // To avoid spamming the backend with 10 requests per slider move, 
  // we approximate the sensitivity curve based on the current confidence and impact.
  // The curve assumes impact scales linearly with confidence.
  const currentConfidence = currentResults.confidence;
  const currentImpact = currentResults.critical_patients_delta;
  
  const points = useMemo(() => {
    const data = [];
    for (let conf = 40; conf <= 100; conf += 10) {
      const confDecimal = conf / 100;
      // Linear approximation: impact scales with confidence relative to current
      const impact = currentConfidence > 0 
        ? Math.round(currentImpact * (confDecimal / currentConfidence))
        : 0;
      data.push({ x: conf, y: impact });
    }
    return data;
  }, [currentConfidence, currentImpact]);

  // Chart dimensions
  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Scales
  const minImpact = Math.min(...points.map(p => p.y), 0);
  const maxImpact = Math.max(...points.map(p => p.y), 10); // Ensure some scale
  const impactRange = maxImpact - minImpact || 1;

  const getX = (val: number) => padding.left + ((val - 40) / 60) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - ((val - minImpact) / impactRange) * innerHeight;

  // Path string
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.x)} ${getY(p.y)}`).join(' ');

  const currentConfPercent = Math.round(currentConfidence * 100);

  return (
    <div style={{ fontFamily: FONT_SANS }}>
      <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '8px' }}>
        SENSITIVITY ANALYSIS
      </div>
      <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '16px' }}>
        How does patient improvement change with confidence?
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px', position: 'relative' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Grid lines (Y) */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const val = minImpact + impactRange * pct;
            const y = getY(val);
            return (
              <g key={pct}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={C.border} strokeDasharray="4 4" />
                <text x={padding.left - 8} y={y + 4} fill={C.dim} fontSize="10" textAnchor="end">{Math.round(val)}</text>
              </g>
            );
          })}

          {/* Grid lines (X) */}
          {[40, 50, 60, 70, 80, 90, 100].map(conf => {
            const x = getX(conf);
            return (
              <g key={conf}>
                <text x={x} y={height - 10} fill={C.dim} fontSize="10" textAnchor="middle">{conf}%</text>
              </g>
            );
          })}

          {/* Line Path */}
          <path d={pathD} fill="none" stroke={C.accent} strokeWidth="2" />
          
          {/* Data Points */}
          {points.map(p => (
            <circle key={p.x} cx={getX(p.x)} cy={getY(p.y)} r="3" fill={C.bg} stroke={C.accent} strokeWidth="2" />
          ))}

          {/* Current Confidence Marker */}
          {currentConfPercent >= 40 && currentConfPercent <= 100 && (
            <g>
              <line 
                x1={getX(currentConfPercent)} y1={padding.top} 
                x2={getX(currentConfPercent)} y2={height - padding.bottom} 
                stroke={C.warning} strokeWidth="1" strokeDasharray="4 4" 
              />
              <circle cx={getX(currentConfPercent)} cy={getY(currentImpact)} r="4" fill={C.warning} />
            </g>
          )}
        </svg>

        <div style={{ marginTop: '16px', fontSize: '0.85rem', color: C.text, display: 'flex', justifyContent: 'space-between' }}>
          <div>Current confidence ({currentConfPercent}%) → Expected impact: <span style={{ color: currentImpact < 0 ? C.success : C.critical, fontWeight: 600 }}>{currentImpact > 0 ? '+' : ''}{currentImpact} patients</span></div>
        </div>
      </div>
    </div>
  );
};
