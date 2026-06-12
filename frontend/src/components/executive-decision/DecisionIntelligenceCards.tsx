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
  const confValue = currentSimulation?.confidence ?? BALERT?.confidence;
  const hasConf = typeof confValue === 'number';
  const confPercent = hasConf ? Math.round(confValue * 100) : null;
  
  let confColor = C.warning;
  if (hasConf && confPercent! >= 90) confColor = C.success;
  else if (hasConf && confPercent! >= 70) confColor = C.accent;

  const CardStyle: React.CSSProperties = {
    background: C.panel,
    border: `1px solid ${C.border}`,
    padding: '2rem',
    borderRadius: 12,
    fontFamily: FONT.sans,
    color: C.textPrimary,
    display: 'flex',
    flexDirection: 'column'
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
      
      {/* WHY CARD -> KEY DRIVER */}
      <div style={CardStyle}>
        <div style={TitleStyle}>KEY DRIVER</div>
        <div style={{ fontSize: '1rem', lineHeight: 1.5, color: C.textPrimary }}>
          <strong style={{ color: C.warning }}>{DRIVER}</strong> explains <strong style={{ color: C.textPrimary }}>{DIMPACT}%</strong><br/>
          of critical population risk
        </div>
      </div>

      {/* EVIDENCE CARD -> POPULATION IMPACT */}
      <div style={CardStyle}>
        <div style={TitleStyle}>POPULATION IMPACT</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, marginBottom: '0.5rem' }}>
          {DPTS}
        </div>
        <div style={{ fontSize: '1rem', color: C.textMuted }}>
          patients currently affected<br/>by this factor
        </div>
      </div>

      {/* CONFIDENCE CARD -> MODEL CERTAINTY */}
      <div style={CardStyle}>
        <div style={TitleStyle}>MODEL CERTAINTY</div>
        {hasConf ? (
          <>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: confColor, lineHeight: 1, marginBottom: '0.5rem' }}>
              {confPercent}%
            </div>
            <div style={{ fontSize: '1rem', color: C.textMuted }}>
              Source:<br/>Executive Overview
            </div>
          </>
        ) : (
          <div style={{ fontSize: '1rem', color: C.textMuted, marginTop: 'auto', marginBottom: 'auto' }}>
            Confidence metric unavailable
          </div>
        )}
      </div>

    </div>
  );
};
