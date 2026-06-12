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

const P: React.CSSProperties = { background:C.panel, border:`1px solid ${C.border}`, overflow:'auto', padding:12 };
const Lbl = ({children}:{children:React.ReactNode}) => <div style={{color:C.dim,fontSize:'0.65rem',letterSpacing:3,marginBottom:8,...M}}>{children}</div>;
const TH = ({c=''}:{c?:string}) => (t:string) => <th style={{border:`1px solid ${C.border}`,padding:'3px 6px',textAlign:'left',color:C.dim,fontWeight:600,background:C.bg,...M,fontSize:'0.65rem'}}>{t}</th>;
const TD = ({children,color=C.text}:{children:React.ReactNode;color?:string}) => <td style={{border:`1px solid ${C.border}`,padding:'3px 6px',color,...M,fontSize:'0.67rem'}}>{children}</td>;

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

        // Auto-simulate based on root cause driver
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
  const IMPROV   = ov.ground_truth_audit?.top_action_audit?.value != null ? `${ov.ground_truth_audit.top_action_audit.value.toFixed(0)} PTS` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  const TOP3     = ov.priority_alerts?.slice(0,3) ?? [];

  const rMap: Record<string,RuleRow> = {};
  rules.forEach(r => { const p=r.rule.split('_'); rMap[p.slice(2,p.length-1).join('_')] = r; });

  const OUT_CURRENT   = sim ? sim.baseline_critical_patients  : PATIENTS;
  const OUT_PROJECTED = sim ? sim.projected_critical_patients  : '—';
  const OUT_DELTA     = sim ? sim.critical_patients_delta       : '—';
  const OUT_HSDELTA   = sim ? sim.health_score_delta            : '—';

  return (
    <PageContainer title="EUREKA DECISION ENGINE">

      {/* ══ ROW 1 — MISSION BAND ══════════════════════════════════════════ */}
      <div style={{height:72,background:C.panel,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:32,overflowX:'auto',flexShrink:0,marginBottom:8,...M,fontSize:'0.76rem'}}>
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
            <span style={{color:C.dim,marginRight:6}}>{l}:</span>{v}
          </div>
        ))}
      </div>

      {/* ══ ROW 2 — EXECUTIVE OUTCOME (DOMINANT) ═════════════════════════ */}
      <div style={{
        margin:'0 8px 8px',
        background:C.panel,
        border:`1px solid ${C.border}`,
        borderLeft:`6px solid ${C.blue}`,
        minHeight:300,
        display:'flex',
        alignItems:'center',
        justifyContent:'space-evenly',
        gap:16,
        padding:'40px 32px',
        ...M,
      }}>
        {/* BEST ACTION */}
        <div style={{flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:4,marginBottom:12}}>TARGET ACTION</div>
          <div style={{color:C.blue,fontSize:'3.2rem',fontWeight:700,lineHeight:1,maxWidth:350,wordBreak:'break-word'}}>
            {BACTION.toUpperCase()}
          </div>
        </div>

        <div style={{width:1,height:220,background:C.border}}/>

        {/* CURRENT */}
        <div style={{flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:3,marginBottom:12}}>CURRENT</div>
          <div style={{color:C.crit,fontSize:'4.5rem',fontWeight:700,lineHeight:1}}>{OUT_CURRENT}</div>
          <div style={{color:C.muted,fontSize:'0.85rem',marginTop:8}}>patients</div>
        </div>

        <div style={{color:C.dim,fontSize:'3rem'}}>→</div>

        {/* PROJECTED */}
        <div style={{flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:3,marginBottom:12}}>PROJECTED</div>
          <div style={{color:OUT_PROJECTED!=='—'?C.pos:C.muted,fontSize:'4.5rem',fontWeight:700,lineHeight:1}}>
            {OUT_PROJECTED}
          </div>
          <div style={{color:C.muted,fontSize:'0.85rem',marginTop:8}}>patients</div>
        </div>

        <div style={{color:C.dim,fontSize:'3rem'}}>→</div>

        {/* DELTA */}
        <div style={{flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:3,marginBottom:12}}>IMPROVEMENT</div>
          <div style={{
            color: OUT_DELTA!=='—' ? (OUT_DELTA<0?C.pos:C.crit) : C.muted,
            fontSize:'4.5rem',fontWeight:700,lineHeight:1,
          }}>
            {OUT_DELTA!=='—' ? (OUT_DELTA<0?OUT_DELTA:sgn(OUT_DELTA as number)) : '—'}
          </div>
          <div style={{color:C.muted,fontSize:'0.85rem',marginTop:8}}>patients</div>
        </div>

        <div style={{width:1,height:220,background:C.border}}/>

        {/* CONFIDENCE */}
        <div style={{flexShrink:0,textAlign:'center'}}>
          <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:3,marginBottom:12}}>CONFIDENCE</div>
          <div style={{color:C.pos,fontSize:'4.5rem',fontWeight:700,lineHeight:1}}>{BCONF}</div>
          <div style={{color:C.muted,fontSize:'0.85rem',marginTop:8}}>verified</div>
        </div>
      </div>

      {/* ══ ROW 3 — DECISION GRID  20 | 50 | 30 ═════════════════════════ */}
      <div style={{display:'grid',gridTemplateColumns:'20% 50% 30%',gap:8,padding:'0 8px',marginBottom:8}}>

        {/* ── LEFT: WHY ────────────────────────────────────────────────── */}
        <div style={P}>
          <Lbl>WHY IS THIS HAPPENING?</Lbl>
          <div style={{color:C.warn,fontSize:'1.4rem',fontWeight:700,...M,marginBottom:12}}>{DRIVER.toUpperCase()}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 12px',...M,fontSize:'0.75rem',marginBottom:16}}>
            <div><span style={{color:C.dim}}>Impact  </span><br/><span style={{color:C.crit,fontWeight:700}}>{DIMPACT}%</span></div>
            <div><span style={{color:C.dim}}>Patients </span><br/><span style={{color:C.text}}>{DPTS}</span></div>
            <div><span style={{color:C.dim}}>Conf    </span><br/><span style={{color:C.pos}}>{DCONF}</span></div>
            <div><span style={{color:C.dim}}>Lift    </span><br/><span style={{color:C.muted}}>{LIFT}</span></div>
            <div style={{gridColumn:'1/-1'}}><span style={{color:C.dim}}>Rule </span><br/><span style={{color:C.muted}}>{SRULE}</span></div>
          </div>
          
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['#','Driver','Imp'].map(h => <th key={h} style={{borderBottom:`1px solid ${C.border}`,padding:'4px',textAlign:'left',color:C.dim,fontWeight:600,...M,fontSize:'0.65rem'}}>{h}</th>)}</tr></thead>
            <tbody>
              {ov.top_drivers.slice(0,5).map((d,i) => (
                <tr key={d.name}>
                  <TD color={C.dim}>{i+1}</TD>
                  <TD color={C.warn}>{d.name}</TD>
                  <TD color={C.crit}>{d.impact}%</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── CENTER: WHAT IF (DIGITAL TWIN) ────────────────────────────── */}
        <div style={{...P, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
          <Lbl>WHAT HAPPENS IF WE ACT? (TWIN SIMULATOR)</Lbl>
          {sim ? (
            <div style={{display:'flex', gap:24, flex:1, alignItems:'center', justifyContent:'center'}}>
              <div style={{textAlign:'center', padding:16, border:`1px solid ${C.border}`, background:C.bg, flex:1}}>
                <div style={{color:C.dim,fontSize:'0.7rem',letterSpacing:3,marginBottom:16,...M}}>CURRENT STATE</div>
                <div style={{color:C.muted,fontSize:'0.7rem',...M,marginBottom:4}}>Critical Patients</div>
                <div style={{color:C.crit,fontSize:'2.4rem',fontWeight:700,...M,marginBottom:16}}>{sim.baseline_critical_patients}</div>
                <div style={{color:C.muted,fontSize:'0.7rem',...M,marginBottom:4}}>Health Score</div>
                <div style={{color:C.crit,fontSize:'1.6rem',fontWeight:700,...M}}>{sim.baseline_health_score}</div>
              </div>

              <div style={{color:C.dim,fontSize:'2rem',...M}}>→</div>

              <div style={{textAlign:'center', padding:16, border:`2px solid ${C.pos}`, background:C.bg, flex:1}}>
                <div style={{color:C.pos,fontSize:'0.7rem',letterSpacing:3,marginBottom:16,...M}}>PROJECTED STATE</div>
                <div style={{color:C.muted,fontSize:'0.7rem',...M,marginBottom:4}}>Critical Patients</div>
                <div style={{color:C.pos,fontSize:'2.4rem',fontWeight:700,...M,marginBottom:16}}>{sim.projected_critical_patients}</div>
                <div style={{color:C.muted,fontSize:'0.7rem',...M,marginBottom:4}}>Health Score</div>
                <div style={{color:C.pos,fontSize:'1.6rem',fontWeight:700,...M}}>{sim.projected_health_score}</div>
              </div>

              <div style={{color:C.dim,fontSize:'2rem',...M}}>→</div>

              <div style={{textAlign:'center', padding:16, border:`1px solid ${C.border}`, background:C.bg, flex:1}}>
                <div style={{color:C.dim,fontSize:'0.7rem',letterSpacing:3,marginBottom:16,...M}}>EXPECTED IMPROVEMENT</div>
                <div style={{color:C.muted,fontSize:'0.7rem',...M,marginBottom:4}}>Patients Improved</div>
                <div style={{color:sim.critical_patients_delta<0?C.pos:C.crit,fontSize:'2.4rem',fontWeight:700,...M,marginBottom:16}}>
                  {Math.abs(sim.critical_patients_delta)}
                </div>
                <div style={{color:C.muted,fontSize:'0.7rem',...M,marginBottom:4}}>Health Gain</div>
                <div style={{color:sim.health_score_delta>0?C.pos:C.crit,fontSize:'1.6rem',fontWeight:700,...M}}>{sgn(sim.health_score_delta)}</div>
              </div>
            </div>
          ) : (
            <div style={{color:C.dim,...M,fontSize:'0.8rem',textAlign:'center',padding:40}}>Simulating outcomes...</div>
          )}
        </div>

        {/* ── RIGHT: ACTION ─────────────────────────────────────────────── */}
        <div style={P}>
          <Lbl>WHAT SHOULD WE DO?</Lbl>
          
          <div style={{background:C.bg,border:`2px solid ${C.blue}`,padding:'16px',marginBottom:16}}>
            <div style={{color:C.dim,fontSize:'0.6rem',letterSpacing:3,marginBottom:8,...M}}>TOP RECOMMENDED ACTION</div>
            <div style={{color:C.blue,fontSize:'1.4rem',fontWeight:700,...M,marginBottom:16}}>{BACTION.toUpperCase()}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',...M,fontSize:'0.8rem'}}>
              <div>
                <div style={{color:C.dim,fontSize:'0.65rem'}}>IMPACT</div>
                <div style={{color:C.pos,fontWeight:700,fontSize:'1.2rem'}}>{BPTS} pts</div>
              </div>
              <div>
                <div style={{color:C.dim,fontSize:'0.65rem'}}>CONFIDENCE</div>
                <div style={{color:C.pos,fontWeight:700,fontSize:'1.2rem'}}>{BCONF}</div>
              </div>
            </div>
          </div>

          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Rank','Action','Pts','Conf'].map(h=><th key={h} style={{borderBottom:`1px solid ${C.border}`,padding:'4px',textAlign:'left',color:C.dim,fontWeight:600,...M,fontSize:'0.65rem'}}>{h}</th>)}</tr></thead>
            <tbody>
              {TOP3.map((a,i)=>(
                <tr key={a.id}>
                  <TD color={C.dim}>{i+1}</TD>
                  <TD color={i===0?C.blue:C.text}>{a.title}</TD>
                  <TD>{a.population_affected}</TD>
                  <TD color={C.pos}>{Math.round(a.confidence*100)}%</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ ROW 4 — EXECUTIVE SCORECARD ══════════════════════════════════ */}
      <div style={{
        margin:'0 8px 8px',
        background:C.panel,
        border:`1px solid ${C.border}`,
        display:'flex',
        alignItems:'center',
        padding:'16px 32px',
        gap:48,
        ...M,
      }}>
        {([
          ['CURRENT RISK',       <span style={{color:C.crit}}>{PATIENTS} PTS</span>],
          ['PROJECTED RISK',     <span style={{color:OUT_PROJECTED!=='—'?C.pos:C.muted}}>{OUT_PROJECTED!=='—'?`${OUT_PROJECTED} PTS`:'—'}</span>],
          ['PATIENTS IMPROVED',  <span style={{color:C.pos}}>{OUT_DELTA!=='—'?Math.abs(OUT_DELTA as number):'—'}</span>],
          ['HEALTH GAIN',        <span style={{color:C.pos}}>{OUT_HSDELTA!=='—'?sgn(OUT_HSDELTA as number):'—'}</span>],
          ['CONFIDENCE',         <span style={{color:C.pos}}>{BCONF}</span>],
        ] as [string,React.ReactNode][]).map(([l,v],i) => (
          <div key={i} style={{flex:1}}>
            <div style={{color:C.dim,fontSize:'0.65rem',letterSpacing:2,marginBottom:4}}>{l}</div>
            <div style={{fontSize:'1.4rem',fontWeight:700}}>{v}</div>
          </div>
        ))}
      </div>

      {/* ══ ROW 5 — AUDIT EVIDENCE ═══════════════════════════════════════ */}
      <div style={{margin:'0 8px 8px',...M}}>
        <button onClick={()=>setAudit(o=>!o)} style={{width:'100%',textAlign:'left',background:C.panel,border:`1px solid ${C.border}`,color:C.dim,padding:'8px 16px',fontSize:'0.75rem',cursor:'pointer'}}>
          {auditOpen?'▲':'▼'} SHOW EVIDENCE
        </button>
        {auditOpen && (
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderTop:'none',padding:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24,fontSize:'0.7rem'}}>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:8}}>HEALTH SCORE AUDIT</div>
              {hAudit ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.65rem',whiteSpace:'pre-wrap',...M}}>
{`Score   : ${hAudit.health_score}\nBaseline: ${hAudit.baseline}\n\nPENALTIES\n${hAudit.penalties.map(p=>`${p.rule}\n  Patients : ${p.affected_patients}\n  Weight   : ${p.weight}\n  Penalty  : ${p.penalty}`).join('\n')}`}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:8}}>CRITICAL POPULATION AUDIT</div>
              {cPop ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.65rem',whiteSpace:'pre-wrap',...M}}>
{`Critical : ${cPop.critical_patients}\nTotal    : ${cPop.total_patients}\nRate     : ${((cPop.critical_patients/cPop.total_patients)*100).toFixed(1)}%\n\nTOP TRIGGERS\n${cPop.top_trigger_rules.join('\n')}`}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:8}}>RULE CONSISTENCY AUDIT</div>
              {rules.length>0 ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.65rem',whiteSpace:'pre-wrap',...M}}>
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
