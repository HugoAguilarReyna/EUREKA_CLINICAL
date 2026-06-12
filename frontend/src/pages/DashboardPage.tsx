import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';

const API = import.meta.env.VITE_API_URL || 'https://eureka-backend-vedn.onrender.com';

// ── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  mission_status: string;
  health_score: number;
  timestamp: number;
  root_cause: {
    driver: string;
    impact: number;
    confidence: number;
    affected_patients: number;
    ground_truth_audit: { source_rule: string; support: number; confidence: number; lift: number };
  };
  priority_alerts: {
    id: string; title: string; description: string;
    priority_score: number; confidence: number; population_affected: number; severity: number;
  }[];
  top_drivers: { name: string; impact: number }[];
  ground_truth_audit: {
    patient_count: number;
    top_action_audit: { value: number; source_rule: string; support: number; confidence: number };
  };
}

interface RuleRow { rule: string; support: number; confidence: number; lift: number; patient_count: number; }
interface SimResult {
  baseline_health_score: number; projected_health_score: number; health_score_delta: number;
  baseline_critical_patients: number; projected_critical_patients: number; critical_patients_delta: number;
  baseline_critical_risks: number; projected_critical_risks: number; critical_risks_delta: number;
}
interface HealthAudit { health_score: number; baseline: number; penalties: { rule: string; affected_patients: number; confidence: number; weight: number; penalty: number }[]; }
interface CritPop { critical_patients: number; total_patients: number; top_trigger_rules: string[]; }

// ── Design tokens (Premium: Palantir/Apple/Bloomberg grade) ─────────────────
const C = {
  bg: '#05080F',        // Deep neutral outer
  panel: '#0B1220',     // Deep neutral panel
  border: '#1E293B',    // Subtle separator
  text: '#E2E8F0',      // Primary crisp text
  muted: '#94A3B8',     // Secondary text
  dim: '#475569',       // Tertiary / labels
  accent: '#3B82F6',    // Electric blue
  success: '#22C55E',   // Positive green
};

const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const fmtTs = (ts:number) => ts ? new Date(ts*1000).toISOString().substring(11,16)+' UTC' : '—';
const sgn = (v:number) => v>0?`+${v}`:`${v}`;

// Sub-components for Typography
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ color: C.dim, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', fontFamily: FONT_SANS }}>
    {children}
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────
export const DashboardPage = () => {
  const [ov, setOv]             = useState<Overview|null>(null);
  const [rules, setRules]       = useState<RuleRow[]>([]);
  const [hAudit, setHAudit]     = useState<HealthAudit|null>(null);
  const [cPop, setCPop]         = useState<CritPop|null>(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState<string|null>(null);

  const [sim, setSim]           = useState<SimResult|null>(null);
  const [auditOpen, setAudit]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a,b,c,d] = await Promise.all([
          fetch(`${API}/knowledge/executive/overview`),
          fetch(`${API}/knowledge/executive/audit/rule-consistency`),
          fetch(`${API}/knowledge/executive/audit/health-score`),
          fetch(`${API}/knowledge/executive/audit/critical-population`),
        ]);
        if (!a.ok) throw new Error('overview failed');
        const overviewData = await a.json();
        setOv(overviewData);
        if (b.ok) setRules(await b.json());
        if (c.ok) setHAudit(await c.json());
        if (d.ok) setCPop(await d.json());

        // Auto-simulate
        if (overviewData.root_cause?.driver) {
          const simRes = await fetch(`${API}/knowledge/executive/twin-simulate`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ modifications:[{variable:overviewData.root_cause.driver, change_pct:-20}] }),
          });
          if (simRes.ok) setSim(await simRes.json());
        }
      } catch { setErr('Error connecting to Executive Console Backend'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.accent,fontFamily:FONT_SANS,letterSpacing:'0.1em'}}>INITIALIZING DECISION INTELLIGENCE PLATFORM...</div>;
  if (err||!ov) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.text,fontFamily:FONT_SANS}}>{err??'NO DATA'}</div>;

  // Derived values
  const STATUS   = ov.mission_status;
  const HS       = ov.health_score;
  const PATIENTS = ov.ground_truth_audit?.patient_count ?? '—';
  const DRIVER   = ov.root_cause?.driver ?? '—';
  const DIMPACT  = ov.root_cause?.impact ?? '—';
  const DCONF    = ov.root_cause?.confidence != null ? `${Math.round(ov.root_cause.confidence*100)}%` : '—';
  const DPTS     = ov.root_cause?.affected_patients ?? '—';
  const BALERT   = ov.priority_alerts?.[0];
  const BACTION  = BALERT?.title ?? '—';
  const BCONF    = BALERT?.confidence != null ? `${Math.round(BALERT.confidence*100)}%` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  const TOP3     = ov.priority_alerts?.slice(0,4) ?? []; // grab 4 to have top 1 + 3 alts

  const OUT_CURRENT   = sim ? sim.baseline_critical_patients  : PATIENTS;
  const OUT_PROJECTED = sim ? sim.projected_critical_patients  : '—';
  const OUT_DELTA     = sim ? Math.abs(sim.critical_patients_delta) : '—';
  const OUT_HSDELTA   = sim ? sim.health_score_delta : '—';

  const benefitIndex = (OUT_DELTA !== '—' && BALERT?.confidence) ? Math.round((OUT_DELTA as number) * BALERT.confidence) : '—';

  return (
    <PageContainer title="EUREKA DECISION ENGINE">
      <div style={{ fontFamily: FONT_SANS, background: C.bg, minHeight: '100vh', color: C.text, paddingBottom: '4rem' }}>
        
        {/* ══ ROW 1 — MISSION BAND ══════════════════════════════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem 3rem', background: C.panel, marginBottom: '1rem',
          borderBottom: `1px solid ${C.border}`
        }}>
          <div style={{ display: 'flex', gap: '3rem' }}>
            <div>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>STATUS</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{STATUS}</div>
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>HEALTH SCORE</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{HS}</div>
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>CRITICAL PATIENTS</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{PATIENTS}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '3rem', textAlign: 'right' }}>
            <div>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>PRIMARY DRIVER</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: C.text }}>{DRIVER.toUpperCase()}</div>
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>LAST UPDATE</div>
              <div style={{ fontSize: '1rem', fontWeight: 400, color: C.muted, fontFamily: FONT_MONO }}>{UPDATED}</div>
            </div>
          </div>
        </div>

        {/* ══ ROW 2 — OUTCOME HERO SECTION ═════════════════════════════════ */}
        <div style={{
          padding: '6rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: `radial-gradient(ellipse at center, #111A30 0%, ${C.bg} 70%)`,
        }}>
          <div style={{ color: C.accent, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.2em', marginBottom: '1.5rem' }}>
            RECOMMENDED ACTION
          </div>
          
          <div style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.02em', color: C.text, marginBottom: '4rem' }}>
            {BACTION.toUpperCase()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: C.success, fontSize: '7rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', textShadow: '0 0 40px rgba(34, 197, 94, 0.2)' }}>
              {OUT_DELTA}
            </div>
            <div style={{ color: C.success, fontSize: '1.5rem', fontWeight: 500, letterSpacing: '0.1em', marginTop: '1rem' }}>
              PATIENTS IMPROVED
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', marginTop: '4rem', color: C.muted, fontSize: '1.1rem', fontWeight: 400 }}>
            <div>{OUT_CURRENT} <span style={{ color: C.dim, margin: '0 0.5rem' }}>→</span> {OUT_PROJECTED}</div>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.dim }} />
            <div>{BCONF} CONFIDENCE</div>
          </div>
        </div>

        {/* ══ ROW 3 — DECISION GRID  25 | 40 | 35 ═════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '25% 40% 35%', gap: '4rem', padding: '2rem 4rem', maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* ── WHY (Root Cause) ── */}
          <div>
            <SectionLabel>ROOT CAUSE</SectionLabel>
            
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{DRIVER}</div>
              <div style={{ display: 'flex', gap: '1.5rem', color: C.muted, fontSize: '0.9rem' }}>
                <div>Impact: <span style={{ color: C.text, fontWeight: 500 }}>{DIMPACT}%</span></div>
                <div>Patients: <span style={{ color: C.text, fontWeight: 500 }}>{DPTS}</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {ov.top_drivers.slice(0,5).map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: C.dim, fontWeight: 500, width: '1rem' }}>{i + 1}</span>
                    <span style={{ color: i === 0 ? C.text : C.muted, fontWeight: i === 0 ? 600 : 400 }}>{d.name}</span>
                  </div>
                  <span style={{ color: C.text, fontWeight: 500 }}>{d.impact}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── WHAT IF (Digital Twin) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
            <SectionLabel>DIGITAL TWIN</SectionLabel>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>CURRENT</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 600 }}>{OUT_CURRENT}</div>
              </div>

              <div style={{ color: C.dim, fontSize: '1.5rem' }}>↓</div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>PROJECTED</div>
                <div style={{ color: C.text, fontSize: '2.5rem', fontWeight: 600 }}>{OUT_PROJECTED}</div>
              </div>

              <div style={{ color: C.dim, fontSize: '1.5rem' }}>↓</div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>IMPACT</div>
                <div style={{ color: C.success, fontSize: '2.5rem', fontWeight: 600 }}>{OUT_DELTA}</div>
              </div>
            </div>
          </div>

          {/* ── ACTION ENGINE ── */}
          <div>
            <SectionLabel>ACTION ENGINE</SectionLabel>

            <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', marginBottom: '2rem' }}>
              <div style={{ color: C.accent, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>TOP ACTION</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: C.text }}>{BACTION}</div>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                <div><span style={{ color: C.dim, marginRight: '0.5rem' }}>Impact</span><span style={{ color: C.success, fontWeight: 500 }}>{BALERT?.population_affected ?? '—'} pts</span></div>
                <div><span style={{ color: C.dim, marginRight: '0.5rem' }}>Confidence</span><span style={{ color: C.text, fontWeight: 500 }}>{BCONF}</span></div>
              </div>
            </div>

            <div style={{ color: C.dim, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '1rem' }}>ALTERNATIVES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {TOP3.slice(1).map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: C.panel, borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: C.muted }}>{a.title}</div>
                  <div style={{ fontSize: '0.85rem', color: C.text, fontWeight: 500 }}>{a.population_affected} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ ROW 4 — MISSION TIMELINE ═════════════════════════════════════ */}
        <div style={{ padding: '4rem 4rem 2rem', maxWidth: '1600px', margin: '0 auto' }}>
          <SectionLabel>MISSION HISTORY</SectionLabel>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '3rem 0 4rem' }}>
            {/* Connecting Line */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: C.border, zIndex: 1, transform: 'translateY(-50%)' }} />
            
            {['7D AGO', '72H AGO', '24H AGO', 'NOW'].map((t, i) => {
              const isNow = i === 3;
              return (
                <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, background: C.bg, padding: '0 1rem' }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: isNow ? C.accent : C.panel,
                    border: `2px solid ${isNow ? C.accent : C.dim}`,
                    marginBottom: '1rem',
                    boxShadow: isNow ? `0 0 12px ${C.accent}` : 'none'
                  }} />
                  <div style={{ color: isNow ? C.text : C.dim, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em' }}>{t}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>
            <div>
              <p>Historical telemetry unavailable.</p>
              <p>Current deployment only provides:</p>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: C.dim }}>
              <li>Current Health Score</li>
              <li>Current Critical Population</li>
              <li>Current Root Cause</li>
              <li>Current Action Ranking</li>
            </ul>
          </div>
        </div>

        {/* ══ ROW 5 — ECONOMIC IMPACT ══════════════════════════════════════ */}
        <div style={{ padding: '2rem 4rem 4rem', maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: '4rem' }}>
            <div>
              <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>COST OF INACTION</div>
              <div style={{ fontSize: '2rem', fontWeight: 500, color: C.text }}>{PATIENTS} PTS AT RISK</div>
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>ESTIMATED BENEFIT</div>
              <div style={{ fontSize: '2rem', fontWeight: 500, color: C.text }}>{benefitIndex} INDEX</div>
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>PATIENTS IMPROVED</div>
              <div style={{ fontSize: '2rem', fontWeight: 500, color: C.success }}>{OUT_DELTA}</div>
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>HEALTH GAIN</div>
              <div style={{ fontSize: '2rem', fontWeight: 500, color: C.success }}>{OUT_HSDELTA !== '—' ? sgn(OUT_HSDELTA as number) : '—'}</div>
            </div>
          </div>
        </div>

        {/* ══ ROW 6 — AUDIT EVIDENCE ═══════════════════════════════════════ */}
        <div style={{ padding: '0 4rem', maxWidth: '1600px', margin: '0 auto' }}>
          <button 
            onClick={() => setAudit(o => !o)} 
            style={{
              background: 'none', border: 'none', color: C.dim, fontSize: '0.75rem', letterSpacing: '0.15em', 
              cursor: 'pointer', padding: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {auditOpen ? 'HIDE EVIDENCE' : 'SHOW EVIDENCE'}
          </button>
          
          {auditOpen && (
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3rem', fontFamily: FONT_MONO }}>
              <div>
                <div style={{ color: C.dim, fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>HEALTH SCORE AUDIT</div>
                {hAudit ? (
                  <pre style={{ color: C.muted, margin: 0, lineHeight: 1.6, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
{`Score   : ${hAudit.health_score}\nBaseline: ${hAudit.baseline}\n\nPENALTIES\n${hAudit.penalties.map(p=>`${p.rule}\n  Pts: ${p.affected_patients} | Wt: ${p.weight} | Pen: ${p.penalty}`).join('\n')}`}
                  </pre>
                ) : <span style={{ color: C.dim }}>No data</span>}
              </div>
              <div>
                <div style={{ color: C.dim, fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>CRITICAL POPULATION AUDIT</div>
                {cPop ? (
                  <pre style={{ color: C.muted, margin: 0, lineHeight: 1.6, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
{`Critical : ${cPop.critical_patients}\nTotal    : ${cPop.total_patients}\nRate     : ${((cPop.critical_patients/cPop.total_patients)*100).toFixed(1)}%\n\nTOP TRIGGERS\n${cPop.top_trigger_rules.join('\n')}`}
                  </pre>
                ) : <span style={{ color: C.dim }}>No data</span>}
              </div>
              <div>
                <div style={{ color: C.dim, fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>RULE CONSISTENCY AUDIT</div>
                {rules.length > 0 ? (
                  <pre style={{ color: C.muted, margin: 0, lineHeight: 1.6, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
{rules.map(r=>`${r.rule}\n  Sup: ${r.support} | Conf: ${Math.round(r.confidence*100)}% | Lift: ${r.lift}`).join('\n')}
                  </pre>
                ) : <span style={{ color: C.dim }}>No data</span>}
              </div>
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
};
