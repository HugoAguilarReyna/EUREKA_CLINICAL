import React from 'react';
import { DecisionEngineOutput } from '../../hooks/useDecisionEngine';

interface DecisionIntelligenceCardsProps {
  baselineOverview: any;
  engine: DecisionEngineOutput;
}

const C = {
  bg: '#05080F', panel: '#0B1220', panelHover: '#111827',
  border: 'rgba(255,255,255,0.08)', textPrimary: '#F8FAFC', 
  textMuted: '#94A3B8', textDim: '#475569', 
  success: '#22C55E', warning: '#F59E0B', critical: '#EF4444',
  accent: '#3B82F6'
};

export const DecisionIntelligenceCards: React.FC<DecisionIntelligenceCardsProps> = ({ 
  baselineOverview, engine
}) => {
  const { rankedActions, explainability } = engine;
  const { isSimulated, previousLeader, newLeader, patientsDelta, healthDelta, riskDelta, leadershipChanged } = explainability;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', padding: '32px 48px' }}>
      
      {/* LEFT: ACTION RANKING ENGINE (V3) */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '0.875rem', fontWeight: 600, color: C.textDim, letterSpacing: '0.1em' }}>
          ACTION RANKING ENGINE
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rankedActions.slice(0, 5).map((action, idx) => (
            <div key={action.title} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${idx === 0 ? C.accent : 'transparent'}` }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: idx === 0 ? C.accent : C.textDim, width: 24 }}>
                #{action.rank}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>
                  {action.title}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: C.textMuted }}>
                  <span>Clinical: {action.clinicalScore.toFixed(1)}</span>
                  <span>|</span>
                  <span style={{ color: action.interventionScore !== null ? C.accent : C.textMuted }}>
                    Effectiveness: {action.interventionScore !== null ? action.interventionScore.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: C.textPrimary }}>
                  {action.decisionScore.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.75rem', color: C.textDim }}>SCORE</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: DYNAMIC EXPLAINABILITY ENGINE (V3) */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '0.875rem', fontWeight: 600, color: C.textDim, letterSpacing: '0.1em' }}>
          DECISION EXPLAINABILITY
        </h3>

        {!isSimulated ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontSize: '1rem' }}>
            Modify a variable above to simulate its impact.
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.75rem', color: C.textDim, marginBottom: 8 }}>PREVIOUS RECOMMENDATION</div>
                <div style={{ fontSize: '1rem', color: C.textMuted, textDecoration: leadershipChanged ? 'line-through' : 'none' }}>
                  {previousLeader}
                </div>
              </div>
              
              <div style={{ padding: 16, background: leadershipChanged ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${leadershipChanged ? C.accent : C.border}` }}>
                <div style={{ fontSize: '0.75rem', color: leadershipChanged ? C.accent : C.textDim, marginBottom: 8 }}>NEW RECOMMENDATION</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: C.textPrimary }}>
                  {newLeader}
                </div>
              </div>
            </div>

            <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.border}`, flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: C.textDim, marginBottom: 16 }}>SYSTEM REASONING</div>
              <div style={{ fontSize: '1.125rem', lineHeight: 1.6, color: C.textPrimary }}>
                The simulated intervention generated a projected change of <strong style={{ color: patientsDelta < 0 ? C.success : C.critical }}>{patientsDelta > 0 ? '+' : ''}{patientsDelta} critical patients</strong>. 
                <br/><br/>
                {leadershipChanged ? (
                  <span>
                    This degradation shifted the clinical priority away from the targeted driver. 
                    The system has automatically transferred executive focus to the next most effective alternative pathway: <strong style={{ color: C.accent }}>{newLeader}</strong>.
                  </span>
                ) : (
                  <span>
                    This outcome solidifies the baseline directive. 
                    The system maintains its recommendation to execute on <strong style={{ color: C.accent }}>{newLeader}</strong>.
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 24, marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: C.textDim }}>HEALTH GAIN</div>
                  <div style={{ fontSize: '1rem', color: healthDelta >= 0 ? C.success : C.critical }}>{healthDelta > 0 ? '+' : ''}{healthDelta} pts</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: C.textDim }}>RISK REDUCTION</div>
                  <div style={{ fontSize: '1rem', color: riskDelta <= 0 ? C.success : C.critical }}>{riskDelta > 0 ? '+' : ''}{riskDelta} pts</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: C.textDim }}>LEADERSHIP CHANGED</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: leadershipChanged ? C.warning : C.textMuted }}>{leadershipChanged ? 'TRUE' : 'FALSE'}</div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>

    </div>
  );
};
