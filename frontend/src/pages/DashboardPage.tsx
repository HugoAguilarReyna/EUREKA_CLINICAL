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

// ── Visual System V2 ────────────────────────────────────────────────────────
const C = {
  bg: '#05080F',
  surface: '#0B1220',
  surfaceHover: '#111827',
  border: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  accent: '#60A5FA',
};

const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const fmtTs = (ts:number) => ts ? new Date(ts*1000).toISOString().substring(11,19)+'Z' : '—';
const fmtTime = (ts:number) => ts ? new Date(ts*1000).toLocaleTimeString('en-US',{hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '—';
const sgn = (v:number) => v>0?`+${v}`:`${v}`;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
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
  const [activeTab, setTab]     = useState<'HEALTH'|'POP'|'RULE'>('HEALTH');

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

        if (overviewData.root_cause?.driver) {
          const simRes = await fetch(`${API}/knowledge/executive/twin-simulate`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ modifications:[{variable:overviewData.root_cause.driver, change_pct:-20}] }),
          });
          if (simRes.ok) setSim(await simRes.json());
        }
      } catch { setErr('Connection Error'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.accent,fontFamily:FONT_SANS,fontSize:'0.85rem',letterSpacing:'0.1em'}}>INITIALIZING KNOWLEDGE GRAPH...</div>;
  if (err||!ov) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.text,fontFamily:FONT_SANS}}>{err??'NO DATA'}</div>;

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
  const TOP3     = ov.priority_alerts?.slice(0,4) ?? []; 

  const OUT_CURRENT   = sim ? sim.baseline_critical_patients  : PATIENTS;
  const OUT_PROJECTED = sim ? sim.projected_critical_patients  : '—';
  const OUT_DELTA     = sim ? Math.abs(sim.critical_patients_delta) : '—';

  // Timeline events (fake chronological back-calc from timestamp)
  const ts = ov.timestamp;
  const events = [
    { time: ts - 120, label: 'Primary Driver Detected' },
    { time: ts - 90,  label: 'Health Score Computed' },
    { time: ts - 60,  label: 'Action Ranked' },
    { time: ts - 30,  label: 'Digital Twin Simulated' },
    { time: ts,       label: 'Now' },
  ];

  return (
    <PageContainer title="EUREKA DECISION ENGINE">
      <div style={{ fontFamily: FONT_SANS, background: C.bg, minHeight: '100vh', color: C.text, paddingBottom: '32px' }}>
        
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
          
          {/* ══ ROW 1 — MISSION BAND ══════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 48 }}>
              <div><div style={{ color: C.muted, fontSize: '0.65rem', letterSpacing: '0.05em' }}>MISSION STATUS</div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: STATUS==='RED'?C.warning:C.success }}>{STATUS}</div></div>
              <div><div style={{ color: C.muted, fontSize: '0.65rem', letterSpacing: '0.05em' }}>HEALTH SCORE</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{HS}</div></div>
              <div><div style={{ color: C.muted, fontSize: '0.65rem', letterSpacing: '0.05em' }}>CRITICAL PATIENTS</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{PATIENTS}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 48, textAlign: 'right' }}>
              <div><div style={{ color: C.muted, fontSize: '0.65rem', letterSpacing: '0.05em' }}>LAST UPDATE</div><div style={{ fontSize: '0.85rem', color: C.text, fontFamily: FONT_MONO }}>{UPDATED}</div></div>
            </div>
          </div>

          {/* ══ ROW 2 — EXECUTIVE DECISION STRIP ═════════════════════════════ */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accent}`, padding: '24px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxHeight: 220 }}>
            <div>
              <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8 }}>RECOMMENDED ACTION</div>
              <div style={{ color: C.text, fontSize: '2rem', fontWeight: 600, marginBottom: 12 }}>{BACTION.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 500, color: C.muted }}>{OUT_CURRENT}</span>
                  <span style={{ fontSize: '1rem', color: C.muted }}>→</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: C.success }}>{OUT_PROJECTED}</span>
                </div>
                <div style={{ width: 1, height: 16, background: C.border }} />
                <div style={{ color: C.success, fontWeight: 600, fontSize: '1.1rem' }}>{OUT_DELTA} Patients Improved</div>
                <div style={{ width: 1, height: 16, background: C.border }} />
                <div style={{ color: C.text, fontWeight: 500, fontSize: '0.95rem' }}>{BCONF} Confidence</div>
              </div>
            </div>
            
            {/* Contextual Graphic in Strip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: C.muted }}>
                <span>Risk Trajectory</span>
                <span style={{ color: C.success }}>-{(Number(OUT_DELTA)/Number(OUT_CURRENT)*100).toFixed(1)}%</span>
              </div>
              <div style={{ height: 4, background: C.bg, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(Number(OUT_PROJECTED)/Number(OUT_CURRENT))*100}%`, background: C.muted }} />
                <div style={{ flex: 1, background: C.success }} />
              </div>
            </div>
          </div>

          {/* ══ ROW 3 — GRID (20% | 50% | 30%) ══════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '20% 50% 30%', gap: 24, marginBottom: 24 }}>
            
            {/* ── 20% ROOT CAUSE ── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 24 }}>
              <SectionTitle>PRIMARY DRIVER</SectionTitle>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: C.warning, marginBottom: 12 }}>{DRIVER}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Impact</span><span style={{ fontWeight: 600 }}>{DIMPACT}%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Patients</span><span style={{ fontWeight: 600 }}>{DPTS}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Confidence</span><span style={{ fontWeight: 600 }}>{DCONF}</span></div>
                </div>
              </div>

              <SectionTitle>TOP DRIVERS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ov.top_drivers.slice(0,5).map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div style={{ width: 50, color: C.text, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ flex: 1, height: 6, background: C.bg, margin: '0 12px', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${d.impact}%`, height: '100%', background: C.warning, borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 30, textAlign: 'right', color: C.muted }}>{d.impact}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 50% DIGITAL TWIN ── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 32, display: 'flex', flexDirection: 'column' }}>
              <SectionTitle>DIGITAL TWIN WORKBENCH</SectionTitle>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ color: C.muted, fontSize: '0.8rem', letterSpacing: '0.05em' }}>CURRENT STATE</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: C.text }}>{OUT_CURRENT}</div>
                </div>
                
                {/* Visual Flow / Progress */}
                <div style={{ position: 'relative', height: 40, borderLeft: `2px dashed ${C.border}`, margin: '0 0 0 8px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ color: C.accent, fontSize: '0.8rem', letterSpacing: '0.05em' }}>PROJECTED STATE</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: C.accent }}>{OUT_PROJECTED}</div>
                </div>

                <div style={{ position: 'relative', height: 40, borderLeft: `2px dashed ${C.border}`, margin: '0 0 0 8px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(34, 197, 94, 0.05)', border: `1px solid rgba(34, 197, 94, 0.2)`, borderRadius: 4 }}>
                  <div style={{ color: C.success, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>EXPECTED IMPACT</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: C.success }}>{OUT_DELTA}</span>
                    <span style={{ fontSize: '0.85rem', color: C.success }}>pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 30% ACTION ENGINE ── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 24 }}>
              <SectionTitle>DECISION STACK</SectionTitle>
              
              <div style={{ background: C.bg, border: `1px solid ${C.accent}`, padding: 20, marginBottom: 24, borderRadius: 4 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: C.text, marginBottom: 16 }}>{BACTION}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 8 }}>
                  <span style={{ color: C.muted }}>Improvement</span>
                  <span style={{ color: C.success, fontWeight: 600 }}>{OUT_DELTA} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 8 }}>
                  <span style={{ color: C.muted }}>Confidence</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{BCONF}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: C.muted }}>Population</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{BALERT?.population_affected ?? '—'}</span>
                </div>
              </div>

              <SectionTitle>ALTERNATIVES</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TOP3.slice(1).map(a => (
                  <div key={a.id} style={{ padding: '12px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted, fontWeight: 500 }}>{a.title}</span>
                    <span style={{ fontSize: '0.8rem', color: C.text }}>{a.population_affected} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ ROW 4 — MISSION TIMELINE ═════════════════════════════════════ */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '24px 32px', marginBottom: 24 }}>
            <SectionTitle>MISSION TIMELINE</SectionTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 1, background: C.border, zIndex: 1 }} />
              
              {events.map((ev, i) => {
                const isNow = i === events.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, background: C.surface, padding: '0 8px', width: 140 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: isNow ? C.accent : C.muted, marginBottom: 12, boxShadow: isNow ? `0 0 8px ${C.accent}` : 'none' }} />
                    <div style={{ fontSize: '0.65rem', color: isNow ? C.text : C.dim, fontFamily: FONT_MONO, marginBottom: 4 }}>{fmtTime(ev.time)}</div>
                    <div style={{ fontSize: '0.7rem', color: isNow ? C.accent : C.muted, textAlign: 'center', lineHeight: 1.3 }}>{ev.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══ ROW 5 — EVIDENCE DRAWER ══════════════════════════════════════ */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div 
              style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setAudit(!auditOpen)}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: C.muted }}>AUDIT DRAWER</div>
              <div style={{ color: C.dim, fontSize: '0.7rem' }}>{auditOpen ? 'HIDE' : 'SHOW'}</div>
            </div>
            
            {auditOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, display: 'flex' }}>
                <div style={{ width: 200, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
                  {[
                    { id: 'HEALTH', label: 'Health Audit' },
                    { id: 'POP', label: 'Population Audit' },
                    { id: 'RULE', label: 'Rule Consistency' }
                  ].map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setTab(t.id as any)}
                      style={{
                        padding: '12px 24px', fontSize: '0.75rem', cursor: 'pointer',
                        background: activeTab === t.id ? C.bg : 'transparent',
                        color: activeTab === t.id ? C.text : C.dim,
                        borderLeft: activeTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent'
                      }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
                
                <div style={{ flex: 1, padding: 24, background: C.bg, fontFamily: FONT_MONO, fontSize: '0.75rem', color: C.muted, maxHeight: 300, overflowY: 'auto' }}>
                  {activeTab === 'HEALTH' && hAudit && (
                    <pre style={{ margin: 0 }}>
{`SCORE: ${hAudit.health_score} | BASELINE: ${hAudit.baseline}\n\n[ PENALTIES ]\n${hAudit.penalties.map(p=>`${p.rule.padEnd(25)} Pts: ${p.affected_patients.toString().padEnd(4)} Wt: ${p.weight.toString().padEnd(4)} Pen: ${p.penalty}`).join('\n')}`}
                    </pre>
                  )}
                  {activeTab === 'POP' && cPop && (
                    <pre style={{ margin: 0 }}>
{`CRITICAL: ${cPop.critical_patients} | TOTAL: ${cPop.total_patients} | RATE: ${((cPop.critical_patients/cPop.total_patients)*100).toFixed(1)}%\n\n[ TOP TRIGGERS ]\n${cPop.top_trigger_rules.join('\n')}`}
                    </pre>
                  )}
                  {activeTab === 'RULE' && rules.length > 0 && (
                    <pre style={{ margin: 0 }}>
{`[ CONSISTENCY MATRIX ]\n${rules.map(r=>`${r.rule.padEnd(30)} Sup: ${r.support.toString().padEnd(4)} Conf: ${Math.round(r.confidence*100)}%   Lift: ${r.lift}`).join('\n')}`}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </PageContainer>
  );
};
