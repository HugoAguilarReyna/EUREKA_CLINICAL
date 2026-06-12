import React, { useState, useEffect, useCallback } from 'react';
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

// ── Design tokens ──────────────────────────────────────────────────────────
const C = { bg:'#05070A', panel:'#0B1118', border:'#1E293B', text:'#E5E7EB', muted:'#94A3B8', dim:'#475569', pos:'#22C55E', warn:'#F59E0B', crit:'#EF4444', blue:'#60A5FA', purple:'#A78BFA' };
const M: React.CSSProperties = { fontFamily:"'IBM Plex Mono',monospace" };
const sc = (s:string) => s==='GREEN'?C.pos:s==='YELLOW'?C.warn:s==='ORANGE'?'#F97316':C.crit;
const fmtTs = (ts:number) => ts ? new Date(ts*1000).toISOString().substring(11,16)+' UTC' : '—';
const sgn = (v:number) => v>0?`+${v}`:`${v}`;

const P: React.CSSProperties = { background:C.panel, border:`1px solid ${C.border}`, overflow:'auto', padding:10 };
const Lbl = ({children}:{children:React.ReactNode}) => <div style={{color:C.dim,fontSize:'0.6rem',letterSpacing:3,marginBottom:4,...M}}>{children}</div>;
const TH = ({c=''}:{c?:string}) => (t:string) => <th style={{border:`1px solid ${C.border}`,padding:'2px 5px',textAlign:'left',color:C.dim,fontWeight:600,background:C.bg,...M,fontSize:'0.65rem'}}>{t}</th>;
const TD = ({children,color=C.text}:{children:React.ReactNode;color?:string}) => <td style={{border:`1px solid ${C.border}`,padding:'2px 5px',color,...M,fontSize:'0.67rem'}}>{children}</td>;

// ── Component ──────────────────────────────────────────────────────────────
export const DashboardPage = () => {
  const [ov, setOv]             = useState<Overview|null>(null);
  const [rules, setRules]       = useState<RuleRow[]>([]);
  const [hAudit, setHAudit]     = useState<HealthAudit|null>(null);
  const [cPop, setCPop]         = useState<CritPop|null>(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState<string|null>(null);

  const [simVar, setSimVar]     = useState('Alkphos');
  const [simPct, setSimPct]     = useState(-20);
  const [simRunning, setSimR]   = useState(false);
  const [sim, setSim]           = useState<SimResult|null>(null);
  const [simFail, setSimFail]   = useState(false);
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
        setOv(await a.json());
        if (b.ok) setRules(await b.json());
        if (c.ok) setHAudit(await c.json());
        if (d.ok) setCPop(await d.json());
      } catch { setErr('Error connecting to Executive Console Backend'); }
      finally { setLoading(false); }
    })();
  }, []);

  const runSim = useCallback(async () => {
    setSimR(true); setSimFail(false); setSim(null);
    try {
      const r = await fetch(`${API}/knowledge/executive/twin-simulate`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ modifications:[{variable:simVar,change_pct:simPct}] }),
      });
      if (r.ok) setSim(await r.json()); else setSimFail(true);
    } catch { setSimFail(true); }
    finally { setSimR(false); }
  }, [simVar, simPct]);

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.blue,...M}}>INITIALIZING DECISION CENTER...</div>;
  if (err||!ov) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.crit,...M}}>{err??'NO DATA'}</div>;

  // Derived
  const STATUS   = ov.mission_status;
  const HS       = ov.health_score;
  const PATIENTS = ov.ground_truth_audit?.patient_count ?? '—';
  const DRIVER   = ov.root_cause?.driver ?? '—';
  const DIMPACT  = ov.root_cause?.impact ?? '—';
  const DCONF    = ov.root_cause?.confidence != null ? `${Math.round(ov.root_cause.confidence*100)}%` : '—';
  const DPTS     = ov.root_cause?.affected_patients ?? '—';
  const SRULE    = ov.root_cause?.ground_truth_audit?.source_rule ?? '—';
  const LIFT     = ov.root_cause?.ground_truth_audit?.lift ?? '—';
  const BALERT   = ov.priority_alerts?.[0];
  const BACTION  = BALERT?.title ?? '—';
  const BDESC    = BALERT?.description ?? '';
  const BCONF    = BALERT?.confidence != null ? `${Math.round(BALERT.confidence*100)}%` : '—';
  const BPTS     = BALERT?.population_affected ?? '—';
  const IMPROV   = ov.ground_truth_audit?.top_action_audit?.value != null
    ? `${ov.ground_truth_audit.top_action_audit.value.toFixed(0)} PTS` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  const TOP3     = ov.priority_alerts?.slice(0,3) ?? [];

  const rMap: Record<string,RuleRow> = {};
  rules.forEach(r => { const p=r.rule.split('_'); rMap[p.slice(2,p.length-1).join('_')] = r; });

  // Executive Outcome values
  const OUT_CURRENT   = sim ? sim.baseline_critical_patients  : PATIENTS;
  const OUT_PROJECTED = sim ? sim.projected_critical_patients  : null;
  const OUT_DELTA     = sim ? sim.critical_patients_delta       : null;
  const OUT_HSDELTA   = sim ? sim.health_score_delta            : null;

  return (
    <PageContainer title="EUREKA DECISION CENTER">

      {/* ══ ROW 1 — MISSION BAND ══════════════════════════════════════════ */}
      <div style={{height:58,background:C.panel,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:28,overflowX:'auto',flexShrink:0,marginBottom:6,...M,fontSize:'0.73rem'}}>
        {([
          ['STATUS',      <span style={{color:sc(STATUS),fontWeight:700}}>{STATUS}</span>],
          ['HEALTH',      <span style={{color:sc(STATUS),fontWeight:700}}>{HS}</span>],
          ['PATIENTS',    <span style={{color:C.text}}>{PATIENTS}</span>],
          ['DRIVER',      <span style={{color:C.warn}}>{DRIVER.toUpperCase()}</span>],
          ['CONFIDENCE',  <span style={{color:C.pos}}>{DCONF}</span>],
          ['ACTION',      <span style={{color:C.blue}}>{BACTION.toUpperCase()}</span>],
          ['IMPROVEMENT', <span style={{color:C.purple}}>{IMPROV}</span>],
          ['UPDATED',     <span style={{color:C.muted}}>{UPDATED}</span>],
        ] as [string,React.ReactNode][]).map(([l,v],i) => (
          <div key={i} style={{whiteSpace:'nowrap',flexShrink:0}}>
            <span style={{color:C.dim,marginRight:5}}>{l}:</span>{v}
          </div>
        ))}
      </div>

      {/* ══ ROW 2 — DECISION GRID  25 | 45 | 30 ═════════════════════════ */}
      <div style={{display:'grid',gridTemplateColumns:'25% 45% 30%',gap:6,padding:'0 6px',height:'calc(100vh - 58px - 260px - 56px - 28px)',minHeight:220}}>

        {/* ── LEFT: WHY ────────────────────────────────────────────────── */}
        <div style={P}>
          <Lbl>WHY IS THIS HAPPENING?</Lbl>

          {/* Primary Root Cause block */}
          <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:'8px 10px',marginBottom:8}}>
            <div style={{color:C.dim,fontSize:'0.55rem',letterSpacing:3,marginBottom:4,...M}}>PRIMARY ROOT CAUSE</div>
            <div style={{color:C.warn,fontSize:'1.15rem',fontWeight:700,...M,marginBottom:6}}>{DRIVER.toUpperCase()}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 10px',...M,fontSize:'0.68rem'}}>
              <div><span style={{color:C.dim}}>Impact  </span><span style={{color:C.crit,fontWeight:700}}>{DIMPACT}%</span></div>
              <div><span style={{color:C.dim}}>Patients </span><span style={{color:C.text}}>{DPTS}</span></div>
              <div><span style={{color:C.dim}}>Conf    </span><span style={{color:C.pos}}>{DCONF}</span></div>
              <div><span style={{color:C.dim}}>Lift    </span><span style={{color:C.muted}}>{LIFT}</span></div>
              <div style={{gridColumn:'1/-1'}}><span style={{color:C.dim}}>Rule </span><span style={{color:C.muted,fontSize:'0.6rem'}}>{SRULE}</span></div>
            </div>
          </div>

          {/* Secondary table */}
          <Lbl>ALL DRIVERS</Lbl>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['#','Driver','Impact','Pts','Conf','Lift'].map(h => <th key={h} style={{border:`1px solid ${C.border}`,padding:'2px 4px',textAlign:'left',color:C.dim,fontWeight:600,background:C.bg,...M,fontSize:'0.62rem'}}>{h}</th>)}</tr></thead>
            <tbody>
              {ov.top_drivers.map((d,i) => {
                const rc = rMap[d.name];
                return (
                  <tr key={d.name} style={{background:i%2===0?C.bg:'transparent'}}>
                    <TD color={C.dim}>{i+1}</TD>
                    <TD color={C.warn}>{d.name}</TD>
                    <TD color={C.crit}>{d.impact}%</TD>
                    <TD>{rc?.patient_count??'—'}</TD>
                    <TD color={C.pos}>{rc?`${Math.round(rc.confidence*100)}%`:'—'}</TD>
                    <TD color={C.muted}>{rc?.lift??'—'}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── CENTER: WHAT IF ───────────────────────────────────────────── */}
        <div style={P}>
          <Lbl>WHAT HAPPENS IF WE ACT?  —  DIGITAL TWIN</Lbl>

          {/* Controls */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
            <select value={simVar} onChange={e=>setSimVar(e.target.value)}
              style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:'3px 5px',...M,fontSize:'0.72rem',cursor:'pointer'}}>
              {ov.top_drivers.map(d=><option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <div style={{flex:1,minWidth:100}}>
              <input type="range" min={-50} max={50} step={5} value={simPct}
                onChange={e=>setSimPct(parseInt(e.target.value))}
                style={{width:'100%',accentColor:C.blue}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.6rem',color:C.dim,...M}}>
                <span>-50%</span><span style={{color:C.blue}}>{simPct>0?'+':''}{simPct}%</span><span>+50%</span>
              </div>
            </div>
            <button onClick={runSim} disabled={simRunning} style={{background:simRunning?C.border:C.blue,border:'none',color:simRunning?C.muted:C.bg,padding:'4px 14px',...M,fontSize:'0.72rem',fontWeight:700,cursor:simRunning?'not-allowed':'pointer'}}>
              {simRunning?'RUNNING...':'SIMULATE'}
            </button>
          </div>

          {/* Vertical flow */}
          {simFail && (
            <div style={{color:C.crit,...M,fontSize:'0.78rem',padding:10,border:`1px solid ${C.border}`,background:C.bg}}>
              SIMULATION DATA NOT AVAILABLE
            </div>
          )}
          {!simFail && !sim && (
            <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-start'}}>
              {/* Current only */}
              <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:'10px 16px',width:'100%'}}>
                <div style={{color:C.dim,fontSize:'0.55rem',letterSpacing:3,marginBottom:6,...M}}>CURRENT STATE</div>
                <div style={{display:'flex',gap:32}}>
                  <div>
                    <div style={{color:C.muted,fontSize:'0.62rem',...M}}>Critical Patients</div>
                    <div style={{color:C.crit,fontSize:'2rem',fontWeight:700,...M}}>{PATIENTS}</div>
                  </div>
                  <div>
                    <div style={{color:C.muted,fontSize:'0.62rem',...M}}>Health Score</div>
                    <div style={{color:C.crit,fontSize:'2rem',fontWeight:700,...M}}>{HS}</div>
                  </div>
                </div>
              </div>
              <div style={{color:C.dim,fontSize:'0.75rem',...M,padding:'2px 0'}}>↓  select driver + percentage → SIMULATE</div>
            </div>
          )}

          {sim && !simFail && (() => {
            const pDelta = sim.critical_patients_delta;
            const hDelta = sim.health_score_delta;
            return (
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {/* CURRENT */}
                <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:'8px 14px'}}>
                  <div style={{color:C.dim,fontSize:'0.55rem',letterSpacing:3,marginBottom:4,...M}}>CURRENT STATE</div>
                  <div style={{display:'flex',gap:28,alignItems:'baseline'}}>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Critical Patients</div>
                      <div style={{color:C.crit,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>{sim.baseline_critical_patients}</div>
                    </div>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Health Score</div>
                      <div style={{color:C.crit,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>{sim.baseline_health_score}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{textAlign:'center',color:C.dim,fontSize:'0.85rem',...M}}>↓  {simVar} {simPct>0?'+':''}{simPct}%</div>

                {/* PROJECTED */}
                <div style={{background:C.bg,border:`2px solid ${C.pos}`,padding:'8px 14px'}}>
                  <div style={{color:C.pos,fontSize:'0.55rem',letterSpacing:3,marginBottom:4,...M}}>PROJECTED STATE</div>
                  <div style={{display:'flex',gap:28,alignItems:'baseline'}}>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Critical Patients</div>
                      <div style={{color:C.pos,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>{sim.projected_critical_patients}</div>
                    </div>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Health Score</div>
                      <div style={{color:C.pos,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>{sim.projected_health_score}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{textAlign:'center',color:C.dim,fontSize:'0.85rem',...M}}>↓</div>

                {/* IMPROVEMENT */}
                <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:'8px 14px'}}>
                  <div style={{color:C.dim,fontSize:'0.55rem',letterSpacing:3,marginBottom:4,...M}}>IMPROVEMENT</div>
                  <div style={{display:'flex',gap:28,alignItems:'baseline'}}>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Patients Saved</div>
                      <div style={{color:pDelta<0?C.pos:C.crit,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>
                        {pDelta<0?Math.abs(pDelta):sgn(pDelta)}
                      </div>
                    </div>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Health Gain</div>
                      <div style={{color:hDelta>0?C.pos:C.crit,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>{sgn(hDelta)}</div>
                    </div>
                    <div>
                      <div style={{color:C.muted,fontSize:'0.6rem',...M}}>Confidence</div>
                      <div style={{color:C.pos,fontSize:'1.8rem',fontWeight:700,...M,lineHeight:1}}>{DCONF}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT: ACTION ─────────────────────────────────────────────── */}
        <div style={P}>
          <Lbl>WHAT SHOULD WE DO?</Lbl>

          {/* Recommended — dominant */}
          <div style={{background:C.bg,border:`2px solid ${C.blue}`,padding:'10px 12px',marginBottom:8}}>
            <div style={{color:C.dim,fontSize:'0.55rem',letterSpacing:3,marginBottom:4,...M}}>RECOMMENDED ACTION</div>
            <div style={{color:C.blue,fontSize:'1.2rem',fontWeight:700,...M,marginBottom:6}}>{BACTION.toUpperCase()}</div>
            <div style={{color:C.muted,fontSize:'0.65rem',...M,marginBottom:8}}>{BDESC}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 10px',...M,fontSize:'0.7rem'}}>
              <div>
                <div style={{color:C.dim,fontSize:'0.55rem'}}>EXPECTED IMPACT</div>
                <div style={{color:C.pos,fontWeight:700,fontSize:'1rem'}}>{BPTS} pts</div>
              </div>
              <div>
                <div style={{color:C.dim,fontSize:'0.55rem'}}>CONFIDENCE</div>
                <div style={{color:C.pos,fontWeight:700,fontSize:'1rem'}}>{BCONF}</div>
              </div>
            </div>
          </div>

          {/* Top 3 — secondary */}
          <Lbl>TOP 3 ACTIONS</Lbl>
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:6}}>
            <thead><tr>{['#','Action','Pts','Conf'].map(h=><th key={h} style={{border:`1px solid ${C.border}`,padding:'2px 4px',textAlign:'left',color:C.dim,fontWeight:600,background:C.bg,...M,fontSize:'0.62rem'}}>{h}</th>)}</tr></thead>
            <tbody>
              {TOP3.map((a,i)=>(
                <tr key={a.id} style={{background:i%2===0?C.bg:'transparent'}}>
                  <TD color={C.dim}>{i+1}</TD>
                  <TD color={i===0?C.blue:C.text}>{a.title}</TD>
                  <TD>{a.population_affected}</TD>
                  <TD color={C.pos}>{Math.round(a.confidence*100)}%</TD>
                </tr>
              ))}
            </tbody>
          </table>
          {TOP3.map((a,i)=>(
            <div key={a.id} style={{padding:'4px 6px',background:C.bg,border:`1px solid ${C.border}`,marginBottom:4}}>
              <div style={{color:i===0?C.blue:C.muted,fontSize:'0.65rem',fontWeight:700,marginBottom:1,...M}}>#{i+1} {a.title}</div>
              <div style={{color:C.dim,fontSize:'0.6rem',...M}}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ROW 3 — EXECUTIVE OUTCOME (DOMINANT) ═════════════════════════ */}
      <div style={{
        margin:'6px 6px 0',
        background:C.panel,
        border:`1px solid ${C.border}`,
        borderTop:`4px solid ${C.blue}`,
        padding:'20px 32px',
        minHeight:240,
        display:'flex',
        alignItems:'center',
        gap:0,
        ...M,
      }}>
        {/* Label column */}
        <div style={{marginRight:36,flexShrink:0,minWidth:160}}>
          <div style={{color:C.dim,fontSize:'0.58rem',letterSpacing:4,marginBottom:8}}>EXECUTIVE OUTCOME</div>
          <div style={{color:C.dim,fontSize:'0.65rem',letterSpacing:2,marginBottom:4}}>BEST ACTION</div>
          <div style={{color:C.blue,fontSize:'2.6rem',fontWeight:700,lineHeight:1,maxWidth:200,wordBreak:'break-word'}}>
            {BACTION.toUpperCase()}
          </div>
          <div style={{color:C.muted,fontSize:'0.65rem',marginTop:6,maxWidth:200}}>{BDESC}</div>
        </div>

        {/* Separator */}
        <div style={{width:1,height:160,background:C.border,marginRight:36,flexShrink:0}}/>

        {/* CURRENT */}
        <div style={{marginRight:20,flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.58rem',letterSpacing:3,marginBottom:6}}>CURRENT</div>
          <div style={{color:C.crit,fontSize:'3.8rem',fontWeight:700,lineHeight:1}}>{OUT_CURRENT}</div>
          <div style={{color:C.muted,fontSize:'0.6rem',marginTop:4}}>critical patients</div>
        </div>

        {/* Arrow */}
        <div style={{color:C.dim,fontSize:'2rem',margin:'0 16px',flexShrink:0,marginTop:'-12px'}}>→</div>

        {/* PROJECTED */}
        <div style={{marginRight:20,flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.58rem',letterSpacing:3,marginBottom:6}}>PROJECTED</div>
          <div style={{color:OUT_PROJECTED!==null?C.pos:C.muted,fontSize:'3.8rem',fontWeight:700,lineHeight:1}}>
            {OUT_PROJECTED!==null ? OUT_PROJECTED : '—'}
          </div>
          <div style={{color:C.muted,fontSize:'0.6rem',marginTop:4}}>after action</div>
        </div>

        {/* Separator */}
        <div style={{width:1,height:160,background:C.border,marginLeft:16,marginRight:36,flexShrink:0}}/>

        {/* DELTA — largest element */}
        <div style={{marginRight:36,flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.58rem',letterSpacing:3,marginBottom:6}}>DELTA</div>
          <div style={{
            color: OUT_DELTA!==null ? (OUT_DELTA<0?C.pos:C.crit) : C.muted,
            fontSize:'4.2rem',fontWeight:700,lineHeight:1,
          }}>
            {OUT_DELTA!==null ? (OUT_DELTA<0?OUT_DELTA:sgn(OUT_DELTA)) : '—'}
          </div>
          <div style={{color:C.muted,fontSize:'0.6rem',marginTop:4}}>patients</div>
        </div>

        {/* HEALTH GAIN */}
        {OUT_HSDELTA!==null && (
          <>
            <div style={{width:1,height:160,background:C.border,marginRight:36,flexShrink:0}}/>
            <div style={{marginRight:36,flexShrink:0,textAlign:'center'}}>
              <div style={{color:C.dim,fontSize:'0.58rem',letterSpacing:3,marginBottom:6}}>HEALTH GAIN</div>
              <div style={{color:OUT_HSDELTA>0?C.pos:C.crit,fontSize:'3.8rem',fontWeight:700,lineHeight:1}}>
                {sgn(OUT_HSDELTA)}
              </div>
              <div style={{color:C.muted,fontSize:'0.6rem',marginTop:4}}>score points</div>
            </div>
          </>
        )}

        {/* Separator */}
        <div style={{width:1,height:160,background:C.border,marginRight:36,flexShrink:0}}/>

        {/* CONFIDENCE */}
        <div style={{flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.58rem',letterSpacing:3,marginBottom:6}}>CONFIDENCE</div>
          <div style={{color:C.pos,fontSize:'3.8rem',fontWeight:700,lineHeight:1}}>{BCONF}</div>
          <div style={{color:C.muted,fontSize:'0.6rem',marginTop:4}}>decision confidence</div>
        </div>
      </div>

      {/* ══ ROW 4 — AUDIT EVIDENCE (collapsible) ════════════════════════ */}
      <div style={{margin:'6px 6px 8px',...M}}>
        <button onClick={()=>setAudit(o=>!o)} style={{width:'100%',textAlign:'left',background:C.panel,border:`1px solid ${C.border}`,color:C.dim,padding:'4px 14px',fontSize:'0.68rem',cursor:'pointer'}}>
          {auditOpen?'▲':'▼'} AUDIT EVIDENCE
        </button>
        {auditOpen && (
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderTop:'none',padding:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,fontSize:'0.67rem'}}>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:6}}>HEALTH SCORE AUDIT</div>
              {hAudit ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.63rem',whiteSpace:'pre-wrap',...M}}>
{`Score   : ${hAudit.health_score}\nBaseline: ${hAudit.baseline}\n\nPENALTIES\n${hAudit.penalties.map(p=>`${p.rule}\n  Patients : ${p.affected_patients}\n  Weight   : ${p.weight}\n  Penalty  : ${p.penalty}`).join('\n')}`}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:6}}>CRITICAL POPULATION AUDIT</div>
              {cPop ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.63rem',whiteSpace:'pre-wrap',...M}}>
{`Critical : ${cPop.critical_patients}\nTotal    : ${cPop.total_patients}\nRate     : ${((cPop.critical_patients/cPop.total_patients)*100).toFixed(1)}%\n\nTOP TRIGGERS\n${cPop.top_trigger_rules.join('\n')}`}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:6}}>RULE CONSISTENCY AUDIT</div>
              {rules.length>0 ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.61rem',whiteSpace:'pre-wrap',...M}}>
{rules.map(r=>`${r.rule}\n  Support: ${r.support}  Conf: ${Math.round(r.confidence*100)}%  Lift: ${r.lift}  Pts: ${r.patient_count}`).join('\n')}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
          </div>
        )}
      </div>

    </PageContainer>
  );
};
