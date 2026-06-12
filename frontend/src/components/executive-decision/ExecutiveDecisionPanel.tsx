import React from 'react';
import { DecisionEngineOutput } from '../../hooks/useDecisionEngine';

interface ExecutiveDecisionPanelProps {
  baselineOverview: any;
  engine: DecisionEngineOutput;
  allScenarios: any[];
  onAccept: () => void;
  onExplore: () => void;
  onViewAnalysis: () => void;
}

const C = {
  bg: '#05080F', surface: '#0B1220', surfaceHover: '#111827',
  border: 'rgba(255,255,255,0.08)', text: '#F8FAFC', muted: '#94A3B8',
  dim: '#475569', success: '#22C55E', warning: '#F59E0B',
  accent: '#3B82F6', critical: '#EF4444'
};

const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

export const ExecutiveDecisionPanel: React.FC<ExecutiveDecisionPanelProps> = ({ 
  engine, onAccept, onExplore, onViewAnalysis 
}) => {
  const { recommendedAction, explainability, metrics, decisionGap } = engine;
  
  const isSimulated = explainability.isSimulated;
  const pDelta = metrics.patientsDelta;

  const decisionScore = recommendedAction?.decisionScore || 0;
  const readiness = recommendedAction?.readiness || "CAUTION ADVISED";
  
  let headerTitle = isSimulated ? "SCENARIO DEGRADES OUTCOMES" : "AWAITING SIMULATION";
  if (isSimulated && pDelta < 0) {
    headerTitle = "SCENARIO IMPROVES OUTCOMES";
  }

  let statusColor = C.warning;
  if (readiness === "READY FOR EXECUTION") statusColor = C.success;
  if (readiness === "NOT RECOMMENDED") statusColor = C.critical;

  return (
    <div style={{ padding: '32px 48px', borderBottom: `1px solid ${C.border}` }}>
      
      {/* 1. MASTER HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isSimulated ? (pDelta < 0 ? C.success : C.critical) : C.muted, letterSpacing: '0.1em', marginBottom: 8 }}>
            {headerTitle}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: C.text }}>
            RECOMMENDED ACTION: <br/>
            <span style={{ fontWeight: 600, color: C.accent }}>{recommendedAction?.title?.toUpperCase() || '—'}</span>
          </h1>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: C.muted }}>GAP TO NEXT BEST ACTION:</span>
            <span style={{ color: C.text, fontWeight: 500 }}>+{decisionGap.toFixed(1)} PTS</span>
          </div>
        </div>
        
        {/* 2. THE DECISION SCORE */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: C.muted, letterSpacing: '0.1em', marginBottom: 8 }}>
            FINAL DECISION SCORE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '4rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: C.text }}>
              {decisionScore.toFixed(0)}
            </span>
            <span style={{ fontSize: '1rem', color: C.muted }}>/ 100</span>
          </div>
          
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
            <span style={{ color: statusColor }}>{readiness}</span>
          </div>
        </div>
      </div>

      {/* 3. AUDITABILITY MATRIX */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT_MONO, fontSize: '0.875rem' }}>
        
        <div style={{ display: 'flex', gap: 32, flex: 1 }}>
          <div>
            <div style={{ color: C.muted, fontSize: '0.75rem', marginBottom: 4 }}>CLINICAL IMPORTANCE (60%)</div>
            <div style={{ color: C.text }}>{recommendedAction?.clinicalScore?.toFixed(1) || '0.0'} pts</div>
          </div>
          <div style={{ color: C.border }}>+</div>
          <div>
            <div style={{ color: C.muted, fontSize: '0.75rem', marginBottom: 4 }}>INTERVENTION EFFECTIVENESS (40%)</div>
            <div style={{ color: recommendedAction?.interventionScore !== null ? C.accent : C.muted }}>
              {recommendedAction?.interventionScore !== null ? `${recommendedAction?.interventionScore.toFixed(1)} pts` : 'NOT EVALUATED'}
            </div>
          </div>
          <div style={{ color: C.border }}>=</div>
          <div>
            <div style={{ color: C.muted, fontSize: '0.75rem', marginBottom: 4 }}>TOTAL</div>
            <div style={{ color: C.text, fontWeight: 'bold' }}>{decisionScore.toFixed(1)}</div>
          </div>
        </div>

        {/* 4. ACTIONS */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={onExplore}
            style={{ padding: '10px 24px', background: 'transparent', border: `1px solid ${C.border}`, color: C.text, borderRadius: 4, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = C.surfaceHover}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            COMPARE SCENARIOS
          </button>
          <button 
            onClick={onAccept}
            style={{ padding: '10px 24px', background: C.accent, border: 'none', color: '#fff', borderRadius: 4, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            APPROVE & EXECUTE
          </button>
        </div>
      </div>

    </div>
  );
};
