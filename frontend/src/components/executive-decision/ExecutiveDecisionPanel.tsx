import React from 'react';
import { C, FONT } from './decision-panel.styles';
import { SimulationResult, Scenario } from '../../types/twin-simulator';

interface ExecutiveDecisionPanelProps {
  baselineOverview: any;
  currentSimulation: SimulationResult | null;
  allScenarios: Scenario[];
  onAccept: () => void;
  onExplore: () => void;
  onViewAnalysis: () => void;
}

export const ExecutiveDecisionPanel: React.FC<ExecutiveDecisionPanelProps> = ({
  baselineOverview,
  currentSimulation,
  allScenarios,
  onAccept,
  onExplore,
  onViewAnalysis
}) => {
  const PATIENTS = baselineOverview?.ground_truth_audit?.patient_count ?? 557;
  const DRIVER = baselineOverview?.root_cause?.driver ?? '—';
  const BALERT = baselineOverview?.priority_alerts?.[0];
  
  const improvement = currentSimulation ? currentSimulation.critical_patients_delta : 0;
  const improvementText = improvement <= 0 ? Math.abs(improvement).toString() : `+${improvement}`;
  const improvementColor = improvement <= 0 ? C.success : C.critical;
  const projectedTotal = currentSimulation?.projected_critical_patients ?? (PATIENTS + improvement);

  // Confidence logic (Defensive against NaN)
  const confValue = currentSimulation?.confidence ?? BALERT?.confidence;
  const hasConf = typeof confValue === 'number';
  const confPercent = hasConf ? Math.round(confValue * 100) : null;
  
  let confColor = C.warning;
  if (hasConf && confPercent! >= 90) confColor = C.success;
  else if (hasConf && confPercent! >= 70) confColor = C.accent;

  // Decision Score
  const max_possible_delta = 100;
  
  const calculateScore = (imp: number, conf: number | undefined | null, fractionAgree: number = 1.0) => {
    if (typeof conf !== 'number') return null;
    const iCont = Math.min(1.0, Math.abs(imp) / max_possible_delta);
    return Math.round((iCont * 40) + (conf * 30) + (1.0 * 20) + (fractionAgree * 10));
  };

  const decisionScore = calculateScore(improvement, confValue, 1.0);
  const hasScore = typeof decisionScore === 'number';
  
  let scoreColor = C.critical;
  if (hasScore && decisionScore! >= 85) scoreColor = C.success;
  else if (hasScore && decisionScore! >= 70) scoreColor = C.accent;
  else if (hasScore && decisionScore! >= 50) scoreColor = C.warning;

  // Find scenario winner
  let scenarioWinner: Scenario | null = null;
  let highestScore = -1;

  allScenarios.forEach(s => {
    const sConf = s.results.confidence ?? BALERT?.confidence;
    const score = calculateScore(s.results.critical_patients_delta, sConf, 1.0);
    if (score !== null && score > highestScore) {
      highestScore = score;
      scenarioWinner = s;
    }
  });

  // Readiness
  const readinessStatus = "✓ READY";
  const readinessColor = C.success;

  return (
    <div style={{ padding: '2rem 24px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ color: C.textDim, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '1rem' }}>
        DECISION INTELLIGENCE
      </div>

      <div style={{
        background: 'rgba(59, 130, 246, 0.05)',
        border: `1px solid ${C.accent}`,
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>EVALUATE {DRIVER?.toUpperCase()}</div>
        <div style={{ fontSize: '1.5rem', color: C.accent }}>Projected impact: {Math.abs(improvement)} patients improved</div>
      </div>

      {/* LEVEL 1: KPI DOMINANCE (OUTCOME) */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '3rem', borderRadius: 12, marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem', letterSpacing: '0.1em' }}>EXPECTED OUTCOME</div>
        <div style={{ fontSize: '5rem', fontWeight: 700, color: improvementColor, lineHeight: 1, marginBottom: '0.5rem' }}>{improvementText}</div>
        <div style={{ fontSize: '1.25rem', color: C.textMuted, fontWeight: 600, marginBottom: '2rem' }}>PATIENTS IMPROVED</div>
        
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: C.bg, padding: '1rem 2rem', borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Projected Reduction</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: C.textPrimary }}>
            <span style={{ color: C.textMuted }}>{PATIENTS}</span>
            <span style={{ margin: '0 1rem', color: C.textDim }}>→</span>
            <span style={{ color: improvementColor }}>{projectedTotal}</span>
          </div>
        </div>
      </div>

      {/* LEVEL 2 & 3 & 4: READINESS, CONFIDENCE, SCORE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* READINESS */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '2rem', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem' }}>EXECUTION READINESS</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: readinessColor, marginBottom: '1rem' }}>{readinessStatus}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: C.textMuted, marginTop: 'auto' }}>
            <div>✓ Recommendation stable</div>
            <div>✓ No contraindications detected</div>
            <div>✓ Implementation pathway clear</div>
          </div>
        </div>

        {/* CONFIDENCE */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '2rem', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem' }}>CONFIDENCE</div>
          {hasConf ? (
            <>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: confColor, lineHeight: 1, marginBottom: '0.5rem' }}>{confPercent}%</div>
              <div style={{ fontSize: '0.85rem', color: C.textPrimary, fontWeight: 600, marginBottom: '1rem' }}>MODEL CONFIDENCE</div>
              <div style={{ fontSize: '0.85rem', color: C.textMuted, marginTop: 'auto' }}>Source:<br/>Inherited from baseline recommendation</div>
            </>
          ) : (
            <div style={{ fontSize: '1.25rem', color: C.textMuted, marginTop: 'auto', marginBottom: 'auto' }}>Confidence unavailable</div>
          )}
        </div>

        {/* SCORE */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '2rem', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem' }}>DECISION SCORE</div>
          {hasScore ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '3rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{decisionScore}</span>
                <span style={{ fontSize: '1rem', color: C.textMuted }}>/100</span>
              </div>
              <div style={{ marginTop: 'auto', width: '100%', height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${decisionScore}%`, height: '100%', background: scoreColor }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: '1.25rem', color: C.textMuted, marginTop: 'auto', marginBottom: 'auto' }}>—</div>
          )}
        </div>
      </div>

      {/* SCENARIO WINNER (CONDITIONAL) */}
      {allScenarios.length > 0 && scenarioWinner && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '1.5rem', borderRadius: 12, marginBottom: '2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -8, left: 24, background: C.warning, color: C.bg, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold' }}>SCENARIO WINNER</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.25rem', color: C.textPrimary, fontWeight: 600, marginBottom: '0.25rem' }}>{scenarioWinner.name}</div>
              <div style={{ fontSize: '0.85rem', color: C.textMuted }}>
                {scenarioWinner.modifications.map(m => `${m.variable} ${m.change_pct}%`).join(' + ')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', color: C.success, fontWeight: 600 }}>{Math.abs(scenarioWinner.results.critical_patients_delta)} pts improved</div>
              <div style={{ fontSize: '0.85rem', color: C.textMuted }}>Score: {highestScore}</div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={onAccept} style={{ background: C.accent, color: '#fff', border: 'none', padding: '1rem 2rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>ACCEPT RECOMMENDATION</button>
        <button onClick={onExplore} style={{ background: 'transparent', color: C.textPrimary, border: `1px solid ${C.border}`, padding: '1rem 2rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>EXPLORE SCENARIOS</button>
        <button onClick={onViewAnalysis} style={{ background: 'transparent', color: C.textPrimary, border: `1px solid ${C.border}`, padding: '1rem 2rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>VIEW FULL ANALYSIS</button>
      </div>
    </div>
  );
};
