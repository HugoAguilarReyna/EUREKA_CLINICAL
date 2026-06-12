import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { TwinWorkbench } from '../components/twin-simulator/TwinWorkbench';

const API = import.meta.env.VITE_API_URL || 'https://eureka-backend-vedn.onrender.com';

interface Overview {
  mission_status: string;
  health_score: number;
  timestamp: number;
  root_cause: {
    driver: string;
    impact: number;
    confidence: number;
    affected_patients: number;
  };
  priority_alerts: {
    id: string; title: string; description: string;
    priority_score: number; confidence: number; population_affected: number; severity: number;
  }[];
  top_drivers: { name: string; impact: number }[];
  ground_truth_audit: { patient_count: number; };
}

interface RuleRow { rule: string; support: number; confidence: number; lift: number; patient_count: number; }
interface SimResult {
  baseline_health_score: number; projected_health_score: number; health_score_delta: number;
  baseline_critical_patients: number; projected_critical_patients: number; critical_patients_delta: number;
}
interface HealthAudit { health_score: number; baseline: number; penalties: { rule: string; affected_patients: number; confidence: number; weight: number; penalty: number }[]; }
interface CritPop { critical_patients: number; total_patients: number; top_trigger_rules: string[]; }

// ── Visual System V2 (Executive Intelligence Platform) ─────────────────────
const C = {
  bg: '#05080F',
  surface: '#0B1220',
  surfaceHover: '#111827',
  border: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  dim: '#475569',
  success: '#22C55E',
  warning: '#F59E0B',
  accent: '#3B82F6',
  // Layer Depths
  shadowSm: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  shadowLg: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0,0,0,0.5)',
  glowSuccess: '0 0 60px rgba(34, 197, 94, 0.15)',
  glowAccent: '0 0 30px rgba(59, 130, 246, 0.25)',
};

const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const fmtTs = (ts:number) => ts ? new Date(ts*1000).toISOString().substring(11,19)+'Z' : '—';
const fmtTime = (ts:number) => ts ? new Date(ts*1000).toLocaleTimeString('en-US',{hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '—';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '24px' }}>
    {children}
  </div>
);

// Pure SVG Sparkline for Risk Trajectory
const Sparkline = ({ start, end }: { start: number, end: number }) => {
  if (start === 0 && end === 0) return null;
  const max = Math.max(start, end) * 1.2 || 1;
  const h1 = 40 - (start / max) * 30;
  const h2 = 40 - (end / max) * 30;
  return (
    <svg width="120" height="50" viewBox="0 0 120 50" style={{ overflow: 'visible' }}>
      {/* Background grid line */}
      <line x1="0" y1="40" x2="120" y2="40" stroke={C.border} strokeWidth="1" strokeDasharray="4 4" />
      {/* Trajectory */}
      <path d={`M 10 ${h1} C 60 ${h1}, 60 ${h2}, 110 ${h2}`} stroke={C.success} strokeWidth="3" fill="none" style={{ filter: 'drop-shadow(0 4px 6px rgba(34,197,94,0.3))' }} />
      {/* Nodes */}
      <circle cx="10" cy={h1} r="4" fill={C.muted} />
      <circle cx="110" cy={h2} r="5" fill={C.success} style={{ filter: 'drop-shadow(0 0 6px #22C55E)' }} />
    </svg>
  );
};

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
  const [showTwinWorkbench, setShowTwinWorkbench] = useState(false);

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
  const PATIENTS = ov.ground_truth_audit?.patient_count ?? 0;
  const DRIVER   = ov.root_cause?.driver ?? '—';
  const DIMPACT  = ov.root_cause?.impact ?? 0;
  const DPTS     = ov.root_cause?.affected_patients ?? 0;
  const DCONF    = ov.root_cause?.confidence != null ? `${Math.round(ov.root_cause.confidence*100)}%` : '—';
  
  const BALERT   = ov.priority_alerts?.[0];
  const BACTION  = BALERT?.title ?? '—';
  const BCONF    = BALERT?.confidence != null ? `${Math.round(BALERT.confidence*100)}%` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  const TOP3     = ov.priority_alerts?.slice(0,4) ?? []; 

  const OUT_CURRENT   = sim ? sim.baseline_critical_patients  : PATIENTS;
  const OUT_PROJECTED = sim ? sim.projected_critical_patients  : 0;
  const OUT_DELTA     = sim ? Math.abs(sim.critical_patients_delta) : 0;

  const ts = ov.timestamp;
  const timeline = [
    { time: ts - 120, label: 'Current Investigation', active: true },
    { time: ts - 90,  label: 'Driver Detected', active: true },
    { time: ts - 60,  label: 'Risk Quantified', active: true },
    { time: ts - 30,  label: 'Simulation Complete', active: true },
    { time: ts,       label: 'Decision Ready', active: true, isNow: true },
  ];

  return (
    <PageContainer title="EUREKA DECISION ENGINE">
      <div style={{ fontFamily: FONT_SANS, background: C.bg, minHeight: '100vh', color: C.text, paddingBottom: '64px' }}>
        
        {/* ══ ROW 1 — MISSION BAND (Ultra Minimal) ════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 48px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 48 }}>
            <div><div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em' }}>MISSION STATUS</div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: STATUS==='RED'?C.warning:C.success }}>{STATUS}</div></div>
            <div><div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em' }}>HEALTH SCORE</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{HS}</div></div>
            <div><div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em' }}>CRITICAL PATIENTS</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{PATIENTS}</div></div>
          </div>
          <div style={{ color: C.dim, fontSize: '0.8rem', fontFamily: FONT_MONO }}>{UPDATED}</div>
        </div>

        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 48px' }}>
          
          {/* ══ ROW 2 — HERO OUTCOME DOMINANTE ═════════════════════════════ */}
          <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            padding: '80px 0', marginBottom: 48, position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 400, background: C.glowSuccess, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
            
            <div style={{ zIndex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10rem', fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-0.04em', textShadow: C.shadowLg }}>
                {OUT_DELTA}
              </div>
              
              <div style={{ fontSize: '2rem', fontWeight: 600, color: C.success, letterSpacing: '0.05em', marginTop: 16, marginBottom: 48 }}>
                PATIENTS IMPROVED
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, marginBottom: 32 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 500, color: C.muted }}>
                  <span style={{ color: C.text }}>{OUT_CURRENT}</span>
                  <span style={{ margin: '0 16px', color: C.dim }}>→</span>
                  <span style={{ color: C.success }}>{OUT_PROJECTED}</span>
                </div>
                <div style={{ width: 1, height: 40, background: C.border }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: C.accent }}>{BACTION}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 400, color: C.muted }}>{BCONF} Confidence</div>
                </div>
              </div>

              <button 
                onClick={() => setShowTwinWorkbench(true)}
                style={{ 
                  background: C.surface, border: `1px solid ${C.accent}`, color: C.accent,
                  padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  letterSpacing: '0.1em', boxShadow: C.shadowSm
                }}
              >
                OPEN DIGITAL TWIN
              </button>
            </div>
          </div>

          {/* ══ ROW 3 — GRID (25% | 45% | 30%) ══════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '25% 45% 30%', gap: 48, marginBottom: 64 }}>
            
            {/* ── 25% ROOT CAUSE (No Tables, Bar focus) ── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionTitle>ROOT CAUSE ANALYSIS</SectionTitle>
              
              <div style={{ background: C.surface, padding: 24, borderRadius: 8, boxShadow: C.shadowMd, marginBottom: 32 }}>
                <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500, marginBottom: 8 }}>PRIMARY DRIVER</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: C.warning, marginBottom: 16 }}>{DRIVER}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>IMPACT</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: C.text }}>{DIMPACT}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>PATIENTS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: C.text }}>{DPTS}</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500, marginBottom: 16 }}>TOP DRIVERS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ov.top_drivers.slice(0,5).map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 60, fontSize: '0.8rem', color: C.text, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ flex: 1, height: 4, background: C.surface, margin: '0 16px', borderRadius: 2 }}>
                      <div style={{ width: `${d.impact}%`, height: '100%', background: C.warning, borderRadius: 2 }} />
                    </div>
                    <div style={{ width: 35, textAlign: 'right', fontSize: '0.8rem', color: C.muted, fontWeight: 500 }}>{d.impact}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 45% DIGITAL TWIN VIVO ── */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
              <SectionTitle>DIGITAL TWIN SIMULATION</SectionTitle>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                
                {/* Current */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500, letterSpacing: '0.1em', marginBottom: 8 }}>CURRENT RISK</div>
                  <div style={{ fontSize: '3rem', fontWeight: 600, color: C.text, lineHeight: 1 }}>{OUT_CURRENT}</div>
                </div>

                {/* Trajectory SVG */}
                <div style={{ margin: '16px 0' }}>
                  <Sparkline start={Number(OUT_CURRENT)} end={Number(OUT_PROJECTED)} />
                </div>

                {/* Projected */}
                <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 32 }}>
                  <div style={{ fontSize: '0.75rem', color: C.accent, fontWeight: 500, letterSpacing: '0.1em', marginBottom: 8 }}>PROJECTED RISK</div>
                  <div style={{ fontSize: '3rem', fontWeight: 600, color: C.accent, lineHeight: 1, textShadow: C.glowAccent }}>{OUT_PROJECTED}</div>
                </div>

                {/* Delta Box */}
                <div style={{ background: C.surface, border: `1px solid ${C.success}`, padding: '16px 32px', borderRadius: 8, boxShadow: `0 8px 24px rgba(34,197,94,0.15)`, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: C.success }}>{OUT_DELTA} PATIENTS RECOVERED</div>
                </div>

              </div>
            </div>

            {/* ── 30% ACTION ENGINE ── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionTitle>DECISION STACK</SectionTitle>
              
              <div style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 8, padding: 24, boxShadow: C.shadowLg, position: 'relative', marginBottom: 32 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: C.accent, borderRadius: '8px 0 0 8px' }} />
                <div style={{ fontSize: '0.75rem', color: C.accent, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 12 }}>TOP RECOMMENDATION</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: C.text, marginBottom: 24 }}>{BACTION}</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>EXPECTED IMPROVEMENT</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: C.success }}>{OUT_DELTA} Pts</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>CONFIDENCE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: C.text }}>{BCONF}</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500, marginBottom: 16 }}>ALTERNATIVE ACTIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TOP3.slice(1).map(a => (
                  <div key={a.id} style={{ background: C.surface, padding: '16px 20px', borderRadius: 6, boxShadow: C.shadowSm, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: C.text, fontWeight: 500 }}>{a.title}</span>
                    <span style={{ fontSize: '0.85rem', color: C.muted, fontWeight: 600 }}>{a.population_affected} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ ROW 4 — MISSION PROGRESS ═════════════════════════════════════ */}
          <div style={{ marginBottom: 64, padding: '0 24px' }}>
            <SectionTitle>MISSION PROGRESS</SectionTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', marginTop: 32 }}>
              <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 2, background: C.surface, zIndex: 1 }} />
              
              {timeline.map((ev, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: 160 }}>
                  <div style={{ 
                    width: 14, height: 14, borderRadius: '50%', 
                    background: ev.isNow ? C.accent : (ev.active ? C.muted : C.bg),
                    border: `2px solid ${ev.isNow ? C.bg : C.surface}`,
                    boxShadow: ev.isNow ? `0 0 12px ${C.accent}, 0 0 0 4px rgba(59,130,246,0.2)` : 'none',
                    marginBottom: 16 
                  }} />
                  <div style={{ fontSize: '0.8rem', color: ev.isNow ? C.accent : C.text, fontWeight: 500, textAlign: 'center', marginBottom: 4 }}>{ev.label}</div>
                  <div style={{ fontSize: '0.7rem', color: C.dim, fontFamily: FONT_MONO }}>{fmtTime(ev.time)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ ROW 5 — AUDIT WORKSPACE ══════════════════════════════════════ */}
          <div style={{ background: C.surface, borderRadius: 8, boxShadow: C.shadowLg, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div 
              style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: C.surfaceHover }}
              onClick={() => setAudit(!auditOpen)}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.15em', color: C.text }}>AUDIT WORKSPACE</div>
              <div style={{ color: C.accent, fontSize: '0.75rem', fontWeight: 600 }}>{auditOpen ? 'COLLAPSE' : 'EXPAND'}</div>
            </div>
            
            {auditOpen && (
              <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, minHeight: 300 }}>
                {/* Tabs */}
                <div style={{ width: 220, background: C.bg, display: 'flex', flexDirection: 'column' }}>
                  {[
                    { id: 'HEALTH', label: 'HEALTH AUDIT' },
                    { id: 'POP', label: 'POPULATION AUDIT' },
                    { id: 'RULE', label: 'RULE CONSISTENCY' }
                  ].map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setTab(t.id as any)}
                      style={{
                        padding: '16px 24px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer',
                        background: activeTab === t.id ? C.surface : 'transparent',
                        color: activeTab === t.id ? C.text : C.dim,
                        borderLeft: activeTab === t.id ? `3px solid ${C.accent}` : '3px solid transparent'
                      }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
                
                {/* Content */}
                <div style={{ flex: 1, padding: 32, background: C.surface, overflowY: 'auto' }}>
                  {activeTab === 'HEALTH' && hAudit && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', gap: 48, marginBottom: 16 }}>
                        <div><div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>SCORE</div><div style={{ fontSize: '1.5rem', fontFamily: FONT_MONO, color: C.text }}>{hAudit.health_score}</div></div>
                        <div><div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>BASELINE</div><div style={{ fontSize: '1.5rem', fontFamily: FONT_MONO, color: C.text }}>{hAudit.baseline}</div></div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 600 }}>PENALTIES</div>
                      {hAudit.penalties.map((p, i) => (
                        <div key={i} style={{ background: C.bg, padding: 16, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.text }}>{p.rule}</span>
                          <span style={{ fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.warning }}>-{p.penalty} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'POP' && cPop && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', gap: 48, marginBottom: 16 }}>
                        <div><div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>CRITICAL</div><div style={{ fontSize: '1.5rem', fontFamily: FONT_MONO, color: C.warning }}>{cPop.critical_patients}</div></div>
                        <div><div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>TOTAL</div><div style={{ fontSize: '1.5rem', fontFamily: FONT_MONO, color: C.text }}>{cPop.total_patients}</div></div>
                        <div><div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 4 }}>RATE</div><div style={{ fontSize: '1.5rem', fontFamily: FONT_MONO, color: C.text }}>{((cPop.critical_patients/cPop.total_patients)*100).toFixed(1)}%</div></div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 600 }}>TOP TRIGGERS</div>
                      {cPop.top_trigger_rules.map((r, i) => (
                        <div key={i} style={{ background: C.bg, padding: '12px 16px', borderRadius: 6, fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.muted }}>
                          {r}
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'RULE' && rules.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16, padding: '0 16px', fontSize: '0.7rem', color: C.dim, fontWeight: 600 }}>
                        <div>RULE</div><div>SUPPORT</div><div>CONFIDENCE</div><div>LIFT</div>
                      </div>
                      {rules.map((r, i) => (
                        <div key={i} style={{ background: C.bg, padding: '16px', borderRadius: 6, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                          <div style={{ fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.text }}>{r.rule}</div>
                          <div style={{ fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.muted }}>{r.support}</div>
                          <div style={{ fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.muted }}>{Math.round(r.confidence*100)}%</div>
                          <div style={{ fontFamily: FONT_MONO, fontSize: '0.8rem', color: C.success }}>{r.lift}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      {showTwinWorkbench && ov && (
        <TwinWorkbench 
          baselineData={ov as any} 
          onClose={() => setShowTwinWorkbench(false)} 
        />
      )}
    </PageContainer>
  );
};
