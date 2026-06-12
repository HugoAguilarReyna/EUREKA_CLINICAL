import React, { useState } from 'react';
import { C, FONT } from './decision-panel.styles';
import { Scenario } from '../../types/twin-simulator';

interface ScenarioLeaderboardProps {
  scenarios: Scenario[];
  onSelect: (scenario: Scenario) => void;
  onClose: () => void;
  onCombine?: () => void;
  onNew?: () => void;
}

export const ScenarioLeaderboard: React.FC<ScenarioLeaderboardProps> = ({
  scenarios,
  onSelect,
  onClose,
  onCombine,
  onNew
}) => {
  const [sortCol, setSortCol] = useState<'score' | 'impact' | 'confidence'>('score');

  const calculateScore = (imp: number, conf: number) => {
    const iCont = Math.min(1.0, Math.abs(imp) / 100);
    return Math.round((iCont * 40) + (conf * 30) + (1.0 * 20) + (1.0 * 10));
  };

  const enhancedScenarios = scenarios.map(s => {
    const score = calculateScore(s.results.critical_patients_delta, s.results.confidence);
    return { ...s, decisionScore: score };
  });

  const sortedScenarios = [...enhancedScenarios].sort((a, b) => {
    if (sortCol === 'score') return b.decisionScore - a.decisionScore;
    if (sortCol === 'impact') return a.results.critical_patients_delta - b.results.critical_patients_delta; // more negative is better
    if (sortCol === 'confidence') return b.results.confidence - a.results.confidence;
    return 0;
  });

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  const getStatus = (score: number) => {
    if (score >= 85) return <span style={{ color: C.success }}>✓ READY</span>;
    if (score >= 70) return <span style={{ color: C.warning }}>⚠ CAUTION</span>;
    return <span style={{ color: C.critical }}>✗ BLOCKED</span>;
  };

  return (
    <div style={{ padding: '2rem 24px', background: C.bg, fontFamily: FONT.sans }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ color: C.textPrimary, fontSize: '1.25rem', fontWeight: 600 }}>SCENARIO COMPARISON & LEADERBOARD</div>
        <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>CLOSE</button>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr', padding: '1rem', background: C.panel, borderBottom: `1px solid ${C.border}`, color: C.textDim, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          <div>RANK</div>
          <div>SCENARIO</div>
          <div onClick={() => setSortCol('impact')} style={{ cursor: 'pointer', textDecoration: sortCol === 'impact' ? 'underline' : 'none' }}>IMPACT</div>
          <div onClick={() => setSortCol('confidence')} style={{ cursor: 'pointer', textDecoration: sortCol === 'confidence' ? 'underline' : 'none' }}>CONFIDENCE</div>
          <div onClick={() => setSortCol('score')} style={{ cursor: 'pointer', textDecoration: sortCol === 'score' ? 'underline' : 'none' }}>DECISION SCORE</div>
          <div>STATUS</div>
        </div>

        {/* Rows */}
        <div style={{ background: C.panel }}>
          {sortedScenarios.map((s, index) => {
            const isWinner = index === 0;
            return (
              <div 
                key={s.id} 
                onClick={() => onSelect(s)}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr', 
                  padding: '1rem', 
                  borderBottom: `1px solid ${C.border}`,
                  background: isWinner ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                  cursor: 'pointer',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (!isWinner) e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { if (!isWinner) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: '1.25rem', textAlign: 'center', width: 40 }}>{getMedal(index)}</div>
                
                <div>
                  <div style={{ color: C.textPrimary, fontWeight: 600, marginBottom: '0.25rem' }}>{s.name}</div>
                  {s.modifications.map(m => (
                    <div key={m.variable} style={{ fontSize: '0.75rem', color: C.textMuted }}>{m.variable} {m.change_pct > 0 ? `+${m.change_pct}` : m.change_pct}%</div>
                  ))}
                </div>
                
                <div style={{ color: s.results.critical_patients_delta <= 0 ? C.success : C.critical, fontWeight: 600 }}>
                  {s.results.critical_patients_delta} pts
                </div>
                
                <div style={{ color: C.textPrimary }}>
                  {Math.round(s.results.confidence * 100)}%
                </div>
                
                <div style={{ color: C.textPrimary, fontSize: '1.25rem', fontWeight: 600 }}>
                  {s.decisionScore}
                </div>
                
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {getStatus(s.decisionScore)}
                </div>
              </div>
            );
          })}
          
          {sortedScenarios.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted, fontSize: '0.9rem' }}>
              No scenarios available for comparison.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {sortedScenarios.length > 0 && (
          <button onClick={() => onSelect(sortedScenarios[0])} style={{ background: C.accent, color: '#fff', border: 'none', padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>SELECT {sortedScenarios[0].name.toUpperCase()}</button>
        )}
        <button onClick={onCombine} style={{ background: 'transparent', color: C.textPrimary, border: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>COMBINE WITH A</button>
        <button onClick={onNew} style={{ background: 'transparent', color: C.textPrimary, border: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>NEW SCENARIO</button>
      </div>
    </div>
  );
};
