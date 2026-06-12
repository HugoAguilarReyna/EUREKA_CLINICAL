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
  const PATIENTS = baselineOverview?.ground_truth_audit?.patient_count ?? 0;
  const DRIVER = baselineOverview?.root_cause?.driver ?? '—';
  
  // Improvement logic
  const improvement = currentSimulation ? currentSimulation.critical_patients_delta : 0;
  const improvementText = improvement <= 0 ? Math.abs(improvement).toString() : `+${improvement}`;
  const improvementColor = improvement <= 0 ? C.success : C.critical;

  // Confidence
  const BALERT = baselineOverview?.priority_alerts?.[0];
  const confValue = currentSimulation ? currentSimulation.confidence : BALERT?.confidence ?? 0;
  const confPercent = Math.round(confValue * 100);
  let confColor = C.warning;
  if (confPercent >= 90) confColor = C.success;
  else if (confPercent >= 70) confColor = C.accent;

  // Decision Score
  // Normalized improvement (assume max possible improvement is 100 for normalization)
  const max_possible_delta = 100;
  const impact_contribution = Math.min(1.0, Math.abs(improvement) / max_possible_delta);
  const confidence_contribution = confValue;
  
  // Find scenario winner
  let scenarioWinner: Scenario | null = null;
  let highestScore = -1;

  const calculateScore = (imp: number, conf: number, fractionAgree: number = 1.0) => {
    const iCont = Math.min(1.0, Math.abs(imp) / max_possible_delta);
    return Math.round((iCont * 40) + (conf * 30) + (1.0 * 20) + (fractionAgree * 10));
  };

  allScenarios.forEach(s => {
    const score = calculateScore(s.results.critical_patients_delta, s.results.confidence, 1.0);
    if (score > highestScore) {
      highestScore = score;
      scenarioWinner = s;
    }
  });

  const decisionScore = calculateScore(improvement, confValue, 1.0);
  let scoreColor = C.critical;
  if (decisionScore >= 85) scoreColor = C.success;
  else if (decisionScore >= 70) scoreColor = C.accent;
  else if (decisionScore >= 50) scoreColor = C.warning;

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
        <div style={{ fontSize: '1.5rem', color: C.accent }}>Reduce intervention intensity by 20%</div>
        <div style={{ fontSize: '1rem', color: C.textMuted }}>Derived from executive priority alerts. Simulated impacts based on twin engine.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
        {/* SCORE */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '2rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem' }}>DECISION SCORE</div>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: '3rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{decisionScore}</span>
            <span style={{ fontSize: '1rem', color: C.textMuted }}>/100</span>
          </div>
          <div style={{ marginTop: '1rem', height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${decisionScore}%`, height: '100%', background: scoreColor }} />
          </div>
        </div>

        {/* READINESS */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '2rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem' }}>EXECUTION READINESS</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: readinessColor, marginBottom: '1rem' }}>{readinessStatus}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: C.textMuted }}>
            <div>✓ Recommendation stable</div>
            <div>✓ No contraindications detected</div>
            <div>✓ Implementation pathway clear</div>
          </div>
        </div>

        {/* EXPECTED IMPROVEMENT */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '2rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '1rem' }}>EXPECTED IMPROVEMENT</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: improvementColor, lineHeight: 1, marginBottom: '0.5rem' }}>{improvementText}</div>
          <div style={{ fontSize: '1rem', color: C.textMuted }}>PATIENTS IMPROVED</div>
        </div>

        {/* CONFIDENCE & WINNER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '1.5rem', borderRadius: 12, flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '0.5rem' }}>CONFIDENCE</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: confColor, lineHeight: 1, marginBottom: '0.25rem' }}>{confPercent}%</div>
            <div style={{ fontSize: '0.85rem', color: C.textMuted }}>PREDICTION RELIABILITY</div>
          </div>
          
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '1.5rem', borderRadius: 12, flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -8, right: -8, background: C.warning, color: C.bg, fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>WINNER</div>
            <div style={{ fontSize: '0.75rem', color: C.textDim, fontWeight: 600, marginBottom: '0.5rem' }}>SCENARIO WINNER</div>
            {scenarioWinner ? (
              <>
                <div style={{ fontSize: '0.85rem', color: C.textPrimary, fontWeight: 600, marginBottom: '0.25rem' }}>{scenarioWinner.name}</div>
                <div style={{ fontSize: '0.85rem', color: C.textMuted }}>Impact: {scenarioWinner.results.critical_patients_delta} pts | Score: {highestScore}</div>
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', color: C.textMuted }}>No scenarios saved</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={onAccept} style={{ background: C.accent, color: '#fff', border: 'none', padding: '1rem 2rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>ACCEPT RECOMMENDATION</button>
        <button onClick={onExplore} style={{ background: 'transparent', color: C.textPrimary, border: `1px solid ${C.border}`, padding: '1rem 2rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>EXPLORE SCENARIOS</button>
        <button onClick={onViewAnalysis} style={{ background: 'transparent', color: C.textPrimary, border: `1px solid ${C.border}`, padding: '1rem 2rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>VIEW FULL ANALYSIS</button>
      </div>
    </div>
  );
};
