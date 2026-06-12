import React from 'react';
import { Scenario } from '../../types/twin-simulator';
import { calculateInterventionScore, getReadiness } from '../../hooks/useDecisionEngine';

interface ScenarioLeaderboardProps {
  baselineOverview: any;
  scenarios: Scenario[];
  onLoadScenario: (s: Scenario) => void;
  onDeleteScenario: (id: string) => void;
  onDuplicateScenario: (s: Scenario) => void;
  onClose: () => void;
}

const C = {
  bg: '#05080F', panel: '#0B1220', panelHover: '#111827',
  border: 'rgba(255,255,255,0.08)', textPrimary: '#F8FAFC', 
  textMuted: '#94A3B8', textDim: '#475569', 
  success: '#22C55E', warning: '#F59E0B', critical: '#EF4444',
  accent: '#3B82F6'
};

export const ScenarioLeaderboard: React.FC<ScenarioLeaderboardProps> = ({ 
  baselineOverview, scenarios, onLoadScenario, onDeleteScenario, onDuplicateScenario, onClose 
}) => {
  if (scenarios.length === 0) {
    return (
      <div style={{ padding: '32px 48px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: C.textDim }}>No saved scenarios yet. Modify a variable and save it to compare.</div>
        <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textPrimary, padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Close Compare</button>
      </div>
    );
  }

  // Calculate scores uniformly using the Decision Engine's exported function
  const scoredScenarios = scenarios.map(s => {
    const pDelta = s.results.critical_patients_delta;
    const hDelta = s.results.health_score_delta;
    const rDelta = s.results.critical_risks_delta;
    
    const interventionScore = calculateInterventionScore(pDelta, hDelta, rDelta);

    // To calculate the full Decision Score for a scenario, we must know what driver it intervened on
    const simulatedDriver = s.modifications[0]?.variable || '';
    const alerts = baselineOverview?.priority_alerts || [];
    
    const maxPriority = alerts.reduce((max: number, a: any) => Math.max(max, a.priority_score || 0), 0.001);
    
    // Calculate the score of the top action if this scenario is executed
    const dynamicActions = alerts.map((a: any) => {
      const clinicalScore = ((a.priority_score || 0) / maxPriority) * 100;
      let effectiveInterventionScore = 50;
      if (a.title.toUpperCase().includes(simulatedDriver.toUpperCase())) {
        effectiveInterventionScore = interventionScore;
      }
      return (clinicalScore * 0.60) + (effectiveInterventionScore * 0.40);
    });

    const topDecisionScore = Math.max(...dynamicActions);

    return {
      ...s,
      decisionScore: topDecisionScore,
      readiness: getReadiness(topDecisionScore)
    };
  }).sort((a, b) => b.decisionScore - a.decisionScore); // Sort by DDE Score

  return (
    <div style={{ padding: '32px 48px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: C.textDim, letterSpacing: '0.1em' }}>
          SCENARIO LEADERBOARD (DDE SCORED)
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textPrimary, padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>
          Exit Compare
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.textDim, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px' }}>RANK</th>
              <th style={{ padding: '12px 16px' }}>SCENARIO</th>
              <th style={{ padding: '12px 16px' }}>INTERVENTION</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>IMPACT (PTS)</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>HEALTH Δ</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>RISK Δ</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>DDE SCORE</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>READINESS</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {scoredScenarios.map((s, idx) => {
              const pDelta = s.results.critical_patients_delta;
              const hDelta = s.results.health_score_delta;
              const rDelta = s.results.critical_risks_delta;
              const isImproved = pDelta <= 0;
              
              let readColor = C.warning;
              if (s.readiness === "READY FOR EXECUTION") readColor = C.success;
              if (s.readiness === "NOT RECOMMENDED") readColor = C.critical;

              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}`, background: idx === 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '16px', fontSize: '1.25rem', fontWeight: 700, color: idx === 0 ? C.accent : C.textDim }}>#{idx + 1}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: C.textPrimary }}>{s.name}</td>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: C.textMuted }}>
                    {s.modifications.map(m => `${m.variable} ${m.change_pct > 0 ? '+' : ''}${m.change_pct}%`).join(', ')}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: isImproved ? C.success : C.critical }}>
                    {pDelta > 0 ? '+' : ''}{pDelta}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: hDelta >= 0 ? C.success : C.critical }}>
                    {hDelta > 0 ? '+' : ''}{hDelta}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: rDelta <= 0 ? C.success : C.critical }}>
                    {rDelta > 0 ? '+' : ''}{rDelta}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: C.textPrimary, fontSize: '1.125rem' }}>
                    {s.decisionScore.toFixed(1)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: readColor }}>
                    {s.readiness}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => onLoadScenario(s)} style={{ background: C.accent, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Load</button>
                      <button onClick={() => onDuplicateScenario(s)} style={{ background: C.surfaceHover, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>Copy</button>
                      <button onClick={() => onDeleteScenario(s.id)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.critical, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
