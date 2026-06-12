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

// ── Design tokens ──────────────────────────────────────────────────────────
const C = { bg:'#05070A', panel:'#0B1118', border:'#1E293B', text:'#E5E7EB', muted:'#94A3B8', dim:'#475569', pos:'#22C55E', warn:'#F59E0B', crit:'#EF4444', blue:'#60A5FA', purple:'#A78BFA' };
const M: React.CSSProperties = { fontFamily:"'IBM Plex Mono',monospace" };
const sc = (s:string) => s==='GREEN'?C.pos:s==='YELLOW'?C.warn:s==='ORANGE'?'#F97316':C.crit;
const fmtTs = (ts:number) => ts ? new Date(ts*1000).toISOString().substring(11,16)+' UTC' : '—';
const sgn = (v:number) => v>0?`+${v}`:`${v}`;

const P: React.CSSProperties = { background:C.panel, border:`1px solid ${C.border}`, overflow:'auto', padding:16 };
const Lbl = ({children}:{children:React.ReactNode}) => <div style={{color:C.dim,fontSize:'0.65rem',letterSpacing:3,marginBottom:12,...M}}>{children}</div>;
const TH = ({c=''}:{c?:string}) => (t:string) => <th style={{borderBottom:`1px solid ${C.border}`,padding:'4px',textAlign:'left',color:C.dim,fontWeight:600,...M,fontSize:'0.65rem'}}>{t}</th>;
const TD = ({children,color=C.text}:{children:React.ReactNode;color?:string}) => <td style={{borderBottom:`1px solid ${C.border}`,padding:'4px',color,...M,fontSize:'0.65rem'}}>{children}</td>;

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

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.blue,...M}}>INITIALIZING DECISION ENGINE...</div>;
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
  const BCONF    = BALERT?.confidence != null ? `${Math.round(BALERT.confidence*100)}%` : '—';
  const IMPROV   = ov.ground_truth_audit?.top_action_audit?.value != null ? `${ov.ground_truth_audit.top_action_audit.value.toFixed(0)} PTS` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  const TOP3     = ov.priority_alerts?.slice(0,3) ?? [];

  const OUT_CURRENT   = sim ? sim.baseline_critical_patients  : PATIENTS;
  const OUT_PROJECTED = sim ? sim.projected_critical_patients  : '—';
  const OUT_DELTA     = sim ? Math.abs(sim.critical_patients_delta) : '—';
  const OUT_HSDELTA   = sim ? sim.health_score_delta : '—';

  // Derived for economic impact
  const benefitIndex = (OUT_DELTA !== '—' && BALERT?.confidence) ? Math.round((OUT_DELTA as number) * BALERT.confidence) : '—';

  return (
    <PageContainer title="EUREKA DECISION ENGINE">

      {/* ══ ROW 1 — MISSION BAND ══════════════════════════════════════════ */}
      <div style={{height:56,background:C.panel,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:32,overflowX:'auto',flexShrink:0,marginBottom:8,...M,fontSize:'0.76rem'}}>
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

      {/* ══ ROW 2 — EXECUTIVE DECISION (DOMINANT) ═════════════════════════ */}
      <div style={{
        margin:'0 8px 8px',
        background:C.panel,
        border:`1px solid ${C.border}`,
        borderTop:`6px solid ${C.blue}`,
        minHeight:350,
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center',
        padding:'40px 32px',
        ...M,
      }}>
        <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:4,marginBottom:8}}>RECOMMENDED ACTION</div>
        <div style={{color:C.blue,fontSize:'3rem',fontWeight:700,lineHeight:1,marginBottom:40,textAlign:'center'}}>
          {BACTION.toUpperCase()}
        </div>

        <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:4,marginBottom:12}}>EXPECTED IMPACT</div>
        <div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:32}}>
          <span style={{color:C.pos,fontSize:'6rem',fontWeight:700,lineHeight:1}}>{OUT_DELTA}</span>
          <span style={{color:C.pos,fontSize:'2rem',fontWeight:700,lineHeight:1,letterSpacing:2}}>PATIENTS IMPROVED</span>
        </div>

        <div style={{display:'flex',gap:64,alignItems:'center'}}>
          <div style={{textAlign:'center'}}>
            <div style={{color:C.dim,fontSize:'0.75rem',letterSpacing:3,marginBottom:8}}>OUTCOME TRAJECTORY</div>
            <div style={{color:C.text,fontSize:'2rem',fontWeight:700}}>
              {OUT_CURRENT} <span style={{color:C.dim,margin:'0 12px'}}>→</span> <span style={{color:C.pos}}>{OUT_PROJECTED}</span>
            </div>
          </div>
          
          <div style={{width:1,height:60,background:C.border}}/>

          <div style={{textAlign:'center'}}>
            <div style={{color:C.dim,fontSize:'0.75rem',letterSpacing:3,marginBottom:8}}>CONFIDENCE</div>
            <div style={{color:C.pos,fontSize:'2rem',fontWeight:700}}>{BCONF}</div>
          </div>
        </div>
      </div>

      {/* ══ ROW 3 — DECISION GRID  20 | 45 | 35 ═════════════════════════ */}
      <div style={{display:'grid',gridTemplateColumns:'20% 45% 35%',gap:8,padding:'0 8px',marginBottom:8}}>

        {/* ── LEFT: WHY ────────────────────────────────────────────────── */}
        <div style={P}>
          <Lbl>PRIMARY ROOT CAUSE</Lbl>
          <div style={{color:C.warn,fontSize:'1.6rem',fontWeight:700,...M,marginBottom:16}}>{DRIVER.toUpperCase()}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 12px',...M,fontSize:'0.75rem',marginBottom:24}}>
            <div><span style={{color:C.dim}}>Impact</span><br/><span style={{color:C.crit,fontWeight:700}}>{DIMPACT}%</span></div>
            <div><span style={{color:C.dim}}>Patients</span><br/><span style={{color:C.text}}>{DPTS}</span></div>
            <div><span style={{color:C.dim}}>Confidence</span><br/><span style={{color:C.pos}}>{DCONF}</span></div>
            <div><span style={{color:C.dim}}>Lift</span><br/><span style={{color:C.muted}}>{LIFT}</span></div>
            <div style={{gridColumn:'1/-1'}}><span style={{color:C.dim}}>Source Rule</span><br/><span style={{color:C.muted}}>{SRULE}</span></div>
          </div>
          
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Rank','Driver','Imp'].map(h => <th key={h} style={{borderBottom:`1px solid ${C.border}`,padding:'4px',textAlign:'left',color:C.dim,fontWeight:600,...M,fontSize:'0.65rem'}}>{h}</th>)}</tr></thead>
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
        <div style={{...P, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 16px'}}>
          <div style={{color:C.dim,fontSize:'0.8rem',letterSpacing:3,marginBottom:8,...M,textAlign:'center'}}>TWIN SIMULATOR</div>
          <div style={{color:C.blue,fontSize:'1.2rem',fontWeight:700,marginBottom:32,...M,textAlign:'center'}}>TARGETING {DRIVER.toUpperCase()}</div>
          
          <div style={{display:'flex',flexDirection:'column',gap:16,width:'100%',maxWidth:300}}>
            <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:'16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:C.dim,letterSpacing:2,fontSize:'0.7rem'}}>CURRENT</span>
              <span style={{color:C.crit,fontSize:'2rem',fontWeight:700}}>{OUT_CURRENT}</span>
            </div>
            
            <div style={{textAlign:'center',color:C.dim,fontSize:'1.6rem',margin:'-8px 0'}}>↓</div>
            
            <div style={{background:C.bg,border:`2px solid ${C.pos}`,padding:'16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:C.pos,letterSpacing:2,fontSize:'0.7rem'}}>PROJECTED</span>
              <span style={{color:C.pos,fontSize:'2rem',fontWeight:700}}>{OUT_PROJECTED}</span>
            </div>
            
            <div style={{textAlign:'center',color:C.dim,fontSize:'1.6rem',margin:'-8px 0'}}>↓</div>
            
            <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:'16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:C.dim,letterSpacing:2,fontSize:'0.7rem'}}>GAIN</span>
              <span style={{color:C.pos,fontSize:'2rem',fontWeight:700}}>{OUT_DELTA}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: ACTION ENGINE ──────────────────────────────────────── */}
        <div style={P}>
          <Lbl>ACTION ENGINE</Lbl>
          
          <div style={{background:C.bg,border:`1px solid ${C.border}`,borderLeft:`4px solid ${C.blue}`,padding:'16px',marginBottom:24}}>
            <div style={{color:C.dim,fontSize:'0.65rem',letterSpacing:3,marginBottom:8,...M}}>PRIMARY RECOMMENDATION</div>
            <div style={{color:C.blue,fontSize:'1.4rem',fontWeight:700,...M,marginBottom:16}}>{BACTION.toUpperCase()}</div>
            <div style={{display:'flex',gap:32,...M,fontSize:'0.8rem'}}>
              <div>
                <div style={{color:C.dim,fontSize:'0.65rem',marginBottom:4}}>IMPACT</div>
                <div style={{color:C.text,fontWeight:700,fontSize:'1.4rem'}}>{BALERT?.population_affected ?? '—'}</div>
              </div>
              <div>
                <div style={{color:C.dim,fontSize:'0.65rem',marginBottom:4}}>CONFIDENCE</div>
                <div style={{color:C.pos,fontWeight:700,fontSize:'1.4rem'}}>{BCONF}</div>
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

      {/* ══ ROW 4 — MISSION TIMELINE ═════════════════════════════════════ */}
      <div style={{
        margin:'0 8px 8px',
        background:C.panel,
        border:`1px solid ${C.border}`,
        padding:'24px',
        ...M,
      }}>
        <Lbl>MISSION TIMELINE</Lbl>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',marginTop:24}}>
          <div style={{position:'absolute',top:10,left:0,right:0,height:2,background:C.border,zIndex:1}}/>
          
          {['7D AGO', '72H AGO', '24H AGO', 'NOW'].map((t, i) => (
            <div key={t} style={{display:'flex',flexDirection:'column',alignItems:'center',zIndex:2,background:C.panel,padding:'0 16px'}}>
              <div style={{width:20,height:20,borderRadius:'50%',background:C.bg,border:`2px solid ${i===3?C.blue:C.border}`,marginBottom:12}}/>
              <div style={{color:i===3?C.blue:C.dim,fontSize:'0.7rem',fontWeight:700,letterSpacing:2}}>{t}</div>
            </div>
          ))}
        </div>
        
        <div style={{textAlign:'center',color:C.dim,fontSize:'0.85rem',marginTop:32,letterSpacing:4,padding:'16px',background:C.bg,border:`1px solid ${C.border}`}}>
          HISTORICAL DATA NOT AVAILABLE
        </div>
      </div>

      {/* ══ ROW 5 — ECONOMIC IMPACT ══════════════════════════════════════ */}
      <div style={{
        margin:'0 8px 8px',
        background:C.panel,
        border:`1px solid ${C.border}`,
        display:'flex',
        alignItems:'center',
        padding:'24px 32px',
        gap:48,
        ...M,
      }}>
        {([
          ['COST OF INACTION',    <span style={{color:C.crit}}>{PATIENTS} PTS AT RISK</span>],
          ['ESTIMATED BENEFIT',   <span style={{color:C.pos}}>{benefitIndex} BENEFIT INDEX</span>],
          ['PATIENTS IMPROVED',   <span style={{color:C.pos}}>{OUT_DELTA}</span>],
          ['HEALTH GAIN',         <span style={{color:C.pos}}>{OUT_HSDELTA!=='—'?sgn(OUT_HSDELTA as number):'—'} PTS</span>],
        ] as [string,React.ReactNode][]).map(([l,v],i) => (
          <div key={i} style={{flex:1}}>
            <div style={{color:C.dim,fontSize:'0.7rem',letterSpacing:2,marginBottom:8}}>{l}</div>
            <div style={{fontSize:'1.6rem',fontWeight:700}}>{v}</div>
          </div>
        ))}
      </div>

      {/* ══ ROW 6 — AUDIT EVIDENCE ═══════════════════════════════════════ */}
      <div style={{margin:'0 8px 8px',...M}}>
        <button onClick={()=>setAudit(o=>!o)} style={{width:'100%',textAlign:'left',background:C.panel,border:`1px solid ${C.border}`,color:C.dim,padding:'12px 16px',fontSize:'0.75rem',cursor:'pointer'}}>
          {auditOpen?'▲':'▼'} SHOW EVIDENCE
        </button>
        {auditOpen && (
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderTop:'none',padding:24,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:32,fontSize:'0.7rem'}}>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:12}}>HEALTH SCORE AUDIT</div>
              {hAudit ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.65rem',whiteSpace:'pre-wrap',...M}}>
{`Score   : ${hAudit.health_score}\nBaseline: ${hAudit.baseline}\n\nPENALTIES\n${hAudit.penalties.map(p=>`${p.rule}\n  Patients : ${p.affected_patients}\n  Weight   : ${p.weight}\n  Penalty  : ${p.penalty}`).join('\n')}`}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:12}}>CRITICAL POPULATION AUDIT</div>
              {cPop ? (
                <pre style={{color:C.text,margin:0,lineHeight:1.8,fontSize:'0.65rem',whiteSpace:'pre-wrap',...M}}>
{`Critical : ${cPop.critical_patients}\nTotal    : ${cPop.total_patients}\nRate     : ${((cPop.critical_patients/cPop.total_patients)*100).toFixed(1)}%\n\nTOP TRIGGERS\n${cPop.top_trigger_rules.join('\n')}`}
                </pre>
              ) : <span style={{color:C.dim}}>No data</span>}
            </div>
            <div>
              <div style={{color:C.dim,letterSpacing:2,marginBottom:12}}>RULE CONSISTENCY AUDIT</div>
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
