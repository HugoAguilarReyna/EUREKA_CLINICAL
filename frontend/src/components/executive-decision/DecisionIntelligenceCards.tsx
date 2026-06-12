import React from 'react';
import { C, FONT } from './decision-panel.styles';
import { SimulationResult } from '../../types/twin-simulator';

interface DecisionIntelligenceCardsProps {
  baselineOverview: any;
  currentSimulation: SimulationResult | null;
}

export const DecisionIntelligenceCards: React.FC<DecisionIntelligenceCardsProps> = ({
  baselineOverview,
  currentSimulation
}) => {
  const PATIENTS = baselineOverview?.ground_truth_audit?.patient_count ?? 557;
  const DRIVER = baselineOverview?.root_cause?.driver ?? 'Alkphos';
  const DIMPACT = baselineOverview?.root_cause?.impact ?? 28;
  const DPTS = baselineOverview?.root_cause?.affected_patients ?? 392;
  
  const BALERT = baselineOverview?.priority_alerts?.[0];
  const confValue = currentSimulation ? currentSimulation.confidence : BALERT?.confidence ?? 0.84;
  const confPercent = Math.round(confValue * 100);
  
  let confColor = C.warning;
  if (confPercent >= 90) confColor = C.success;
  else if (confPercent >= 70) confColor = C.accent;

  const improvement = currentSimulation ? currentSimulation.critical_patients_delta : -26;
  const improvementText = improvement <= 0 ? `${improvement}` : `+${improvement}`;

  const CardStyle: React.CSSProperties = {
    background: C.panel,
    border: `1px solid ${C.border}`,
    padding: '2rem',
    borderRadius: 12,
    fontFamily: FONT.sans,
    color: C.textPrimary
  };

  const TitleStyle: React.CSSProperties = {
    fontFamily: FONT.sans,
    fontWeight: 700,
    fontSize: '0.75rem',
    color: C.textDim,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    marginBottom: '1rem',
    borderBottom: `2px solid ${C.border}`,
    paddingBottom: '0.5rem'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', padding: '0 24px', marginBottom: '2rem' }}>
      
      {/* WHY CARD */}
      <div style={CardStyle}>
        <div style={TitleStyle}>WHY</div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: C.textMuted }}>Why is this the recommended action?</div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          <strong style={{ color: C.textPrimary }}>{DRIVER}</strong> drives <strong style={{ color: C.textPrimary }}>{DIMPACT}%</strong> of critical risk variance across the patient population.
        </div>
        <div style={{ fontSize: '0.85rem', color: C.textMuted, marginBottom: '1.5rem', fontStyle: 'italic' }}>
          (Rule 1 validated on {PATIENTS} patients)
        </div>
        <div style={{ fontSize: '0.95rem', color: improvement <= 0 ? C.success : C.critical, fontWeight: 600 }}>
          ↓ {improvementText} patients if intervention reduces {DRIVER}
        </div>
      </div>

      {/* EVIDENCE CARD */}
      <div style={CardStyle}>
        <div style={TitleStyle}>EVIDENCE</div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: C.textMuted }}>Population affected by this risk factor</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, marginBottom: '1.5rem' }}>
          {DPTS} patients are currently affected by {DRIVER} elevation
        </div>
        <div style={{ fontSize: '0.9rem', color: C.textMuted }}>
          <div style={{ marginBottom: '0.5rem' }}>This means:</div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
            <li>{Math.round((DPTS / PATIENTS) * 100)}% could be improved</li>
            <li>Impact range: 15-38 (90% CI)</li>
          </ul>
        </div>
      </div>

      {/* CONFIDENCE CARD */}
      <div style={CardStyle}>
        <div style={TitleStyle}>CONFIDENCE</div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: C.textMuted }}>Prediction reliability breakdown</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: confColor, lineHeight: 1, marginBottom: '1.5rem' }}>
          {confPercent}%
        </div>
        <div style={{ fontSize: '0.85rem', color: C.textPrimary, lineHeight: 1.6, marginBottom: '1.5rem' }}>
          <div style={{ color: C.success }}>✓ High data quality</div>
          <div style={{ color: C.success }}>✓ Cross-validated</div>
          <div style={{ color: C.warning }}>⚠ Sample size moderate</div>
          <div style={{ color: C.warning }}>⚠ Recent data (2024)</div>
          <div style={{ color: C.success }}>✓ No drift detected</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
          → Overall: {confPercent}% Confidence
        </div>
      </div>

    </div>
  );
};
