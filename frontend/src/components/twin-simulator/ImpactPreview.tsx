import React from 'react';
import { SimulationResult } from '../../types/twin-simulator';
import { C, FONT_SANS } from './twin-simulator.styles';

interface ImpactPreviewProps {
  results: SimulationResult | null;
  loading: boolean;
  error: string | null;
}

export const ImpactPreview: React.FC<ImpactPreviewProps> = ({ results, loading, error }) => {
  if (error) {
    return (
      <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${C.critical}`, borderRadius: '8px', color: C.critical, fontFamily: FONT_SANS }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>SIMULATION ERROR</div>
        <div style={{ fontSize: '0.8rem' }}>{error}</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={{ padding: '24px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.muted, fontFamily: FONT_SANS, textAlign: 'center', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '0.85rem' }}>Adjust variables to calculate impact</div>
      </div>
    );
  }

  const {
    baseline_critical_patients,
    projected_critical_patients,
    critical_patients_delta,
    confidence
  } = results;

  const isImproved = critical_patients_delta < 0; // Negative delta means fewer critical patients = good
  const deltaColor = isImproved ? C.success : (critical_patients_delta > 0 ? C.critical : C.accent);
  const deltaText = critical_patients_delta > 0 ? `+${critical_patients_delta}` : `${critical_patients_delta}`;

  return (
    <div style={{ padding: '24px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', fontFamily: FONT_SANS, position: 'relative', overflow: 'hidden' }}>
      
      {loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: C.surfaceHover, overflow: 'hidden' }}>
          <div style={{ 
            width: '30%', height: '100%', background: C.accent, 
            animation: 'loading 1s infinite linear',
            position: 'absolute' 
          }} />
          <style>{`
            @keyframes loading {
              0% { left: -30%; }
              100% { left: 100%; }
            }
          `}</style>
        </div>
      )}

      <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '24px' }}>LIVE IMPACT CALCULATION</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: C.dim, marginBottom: '8px' }}>BASELINE RISK</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: C.text }}>{baseline_critical_patients}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: C.dim, marginBottom: '8px' }}>PROJECTED RISK</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: loading ? C.muted : C.text, transition: 'color 0.3s' }}>{projected_critical_patients}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: '4px' }}>EXPECTED IMPACT</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: deltaColor }}>
            {deltaText} PATIENTS
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: '4px' }}>CONFIDENCE</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: C.text }}>
            {Math.round(confidence * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};
