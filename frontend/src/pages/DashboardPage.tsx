import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTwinSimulator } from '../hooks/useTwinSimulator';
import { VariableSlider } from '../components/twin-simulator/VariableSlider';
import { Scenario, Modification } from '../types/twin-simulator';

const API = import.meta.env.VITE_API_URL || 'https://eureka-backend-vedn.onrender.com';

const C = {
  bg: '#05080F', surface: '#0B1220', surfaceHover: '#111827',
  border: 'rgba(255,255,255,0.08)', text: '#F8FAFC', muted: '#94A3B8',
  dim: '#475569', success: '#22C55E', warning: '#F59E0B',
  accent: '#3B82F6', critical: '#EF4444',
  shadowSm: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
};

const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const fmtTs = (ts:number) => ts ? new Date(ts*1000).toISOString().substring(11,19)+'Z' : '—';

export const DashboardPage = () => {
  const [ov, setOv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  const { results: simResults, simulate, loading: simLoading } = useTwinSimulator();
  const [modifications, setModifications] = useState<Map<string, number>>(new Map());
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeTab, setActiveTab] = useState<string>('BASELINE');
  const [compareMode, setCompareMode] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/knowledge/executive/overview`);
        if (!res.ok) throw new Error('Failed to fetch overview');
        const data = await res.json();
        setOv(data);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load scenarios and audit logs from LocalStorage
  useEffect(() => {
    const savedScenarios = localStorage.getItem('eureka_scenarios');
    if (savedScenarios) {
      try { setScenarios(JSON.parse(savedScenarios)); } catch (e) {}
    }
    const savedAudit = localStorage.getItem('eureka_audit_trail');
    if (savedAudit) {
      try { setAuditLogs(JSON.parse(savedAudit)); } catch (e) {}
    }
  }, []);

  // Initialize with a default simulation (-20% on primary driver) so the page has data
  useEffect(() => {
    if (ov?.root_cause?.driver && modifications.size === 0 && !simResults && !simLoading) {
      const initialMap = new Map<string, number>();
      initialMap.set(ov.root_cause.driver, -20);
      setModifications(initialMap);
    }
  }, [ov, modifications.size, simResults, simLoading]);

  // Debounced Simulation
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const mods = Array.from(modifications.entries())
        .filter(([_, val]) => val !== 0)
        .map(([variable, change_pct]) => ({ variable, change_pct }));
      
      if (mods.length > 0) {
        simulate(mods).then((res) => {
          setAuditLogs(prev => {
            const newLog = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              variable: mods.map(m => `${m.variable} (${m.change_pct}%)`).join(', '),
              change_pct: mods[0]?.change_pct || 0,
              baseline: res.baseline_critical_patients,
              projected: res.projected_critical_patients,
              delta: res.critical_patients_delta
            };
            const next = [newLog, ...prev].slice(0, 20);
            localStorage.setItem('eureka_audit_trail', JSON.stringify(next));
            return next;
          });
        }).catch(() => {});
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [modifications, simulate]);

  const handleSliderChange = (variable: string, val: number) => {
    setModifications(prev => {
      const next = new Map(prev);
      next.set(variable, val);
      return next;
    });
    setActiveTab('BASELINE'); // Switch back to live edit
  };

  const saveScenario = () => {
    if (!simResults) return;
    const activeMods = Array.from(modifications.entries())
      .filter(([_, val]) => val !== 0)
      .map(([variable, change_pct]) => ({ variable, change_pct }));
    
    if (activeMods.length === 0) return;

    const newScenario: Scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${String.fromCharCode(65 + scenarios.length)}`, // A, B, C...
      timestamp: new Date().toISOString(),
      modifications: activeMods,
      results: simResults
    };

    const next = [...scenarios, newScenario];
    setScenarios(next);
    localStorage.setItem('eureka_scenarios', JSON.stringify(next));
    setActiveTab(newScenario.id); // Switch to the newly saved scenario
  };

  const loadScenario = (scenario: Scenario) => {
    const newMap = new Map<string, number>();
    scenario.modifications.forEach(m => newMap.set(m.variable, m.change_pct));
    setModifications(newMap);
    setActiveTab(scenario.id);
    setCompareMode(false);
  };

  const deleteScenario = (id: string) => {
    const next = scenarios.filter(s => s.id !== id);
    setScenarios(next);
    localStorage.setItem('eureka_scenarios', JSON.stringify(next));
    if (activeTab === id) setActiveTab('BASELINE');
  };

  const duplicateScenario = (scenario: Scenario) => {
    const newScenario = {
      ...scenario,
      id: crypto.randomUUID(),
      name: `${scenario.name} (Copy)`,
      timestamp: new Date().toISOString()
    };
    const next = [...scenarios, newScenario];
    setScenarios(next);
    localStorage.setItem('eureka_scenarios', JSON.stringify(next));
    setActiveTab(newScenario.id);
  };

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.accent,fontFamily:FONT_SANS}}>INITIALIZING KNOWLEDGE GRAPH...</div>;
  if (err||!ov) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.text,fontFamily:FONT_SANS}}>{err??'NO DATA'}</div>;

  const STATUS   = ov.mission_status;
  const HS       = ov.health_score;
  const PATIENTS = ov.ground_truth_audit?.patient_count ?? 0;
  const DRIVER   = ov.root_cause?.driver ?? '—';
  const DIMPACT  = ov.root_cause?.impact ?? 0;
  const DPTS     = ov.root_cause?.affected_patients ?? 0;
  const DCONF    = ov.root_cause?.confidence ? `${Math.round(ov.root_cause.confidence*100)}%` : '—';
  
  const BALERT   = ov.priority_alerts?.[0];
  const BACTION  = BALERT?.title ?? '—';
  const BCONF    = BALERT?.confidence ? `${Math.round(BALERT.confidence*100)}%` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  
  const CURRENT_RISK = PATIENTS;
  const PROJ_RISK = simResults ? simResults.projected_critical_patients : CURRENT_RISK;
  const DELTA = simResults ? Math.abs(simResults.critical_patients_delta) : 0;
  const IS_IMPROVED = simResults ? simResults.critical_patients_delta <= 0 : true;

  const scoreBase = 50;
  const healthBonus = simResults ? simResults.health_score_delta * 2 : 0;
  const criticalBonus = simResults ? Math.abs(simResults.critical_patients_delta) / 5 : 0;
  const decisionScore = simResults ? Math.min(100, Math.max(0, Math.round(scoreBase + healthBonus + criticalBonus))) : 0;
  let readiness = 'NOT RECOMMENDED';
  if (decisionScore >= 80) readiness = 'READY';
  else if (decisionScore >= 60) readiness = 'CAUTION';

  const top5Drivers = ov.top_drivers?.slice(0, 5) || [];
  const alternatives = ov.priority_alerts?.slice(1, 4) || [];

  return (
    <PageContainer title="DECISION OS">
      <div style={{ fontFamily: FONT_SANS, background: C.bg, minHeight: '100vh', color: C.text }}>
        
        {/* ROW 1: MISSION CONTROL BAR */}
        <div style={{ 
          height: 72, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', 
          justifyContent: 'space-between', padding: '0 24px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' 
        }}>
          <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>STATUS</span><span style={{color: STATUS==='RED'?C.warning:C.success}}>{STATUS}</span></div>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>HEALTH</span><span>{HS}</span></div>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>CRITICAL</span><span>{PATIENTS}</span></div>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>PRIMARY</span><span style={{color:C.warning}}>{DRIVER}</span></div>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>ACTION</span><span style={{color:C.accent}}>{BACTION}</span></div>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>IMPACT</span><span style={{color: IS_IMPROVED ? C.success : C.critical}}>{DELTA} pts</span></div>
            <div style={{ display: 'flex', gap: 12 }}><span style={{color:C.muted}}>CONFIDENCE</span><span>{simResults ? Math.round(simResults.confidence*100) : Math.round(BALERT?.confidence*100)}%</span></div>
          </div>
          <div style={{ color: C.dim, fontFamily: FONT_MONO }}>{UPDATED}</div>
        </div>

        {/* ROW 2: DECISION WORKSPACE */}
        <div style={{ height: 600, display: 'grid', gridTemplateColumns: '25% 50% 25%', borderBottom: `1px solid ${C.border}` }}>
          
          {/* LEFT: ROOT CAUSE */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: 24 }}>WHY IS THIS HAPPENING?</div>
            
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 8 }}>PRIMARY DRIVER</div>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: C.warning, lineHeight: 1, marginBottom: 16 }}>{DRIVER}</div>
              <div style={{ display: 'flex', gap: 24, fontSize: '0.85rem' }}>
                <div><span style={{color:C.muted, fontSize:'0.7rem', display:'block'}}>IMPACT</span>{DIMPACT}%</div>
                <div><span style={{color:C.muted, fontSize:'0.7rem', display:'block'}}>CONFIDENCE</span>{DCONF}</div>
                <div><span style={{color:C.muted, fontSize:'0.7rem', display:'block'}}>AFFECTED</span>{DPTS}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 16 }}>TOP DRIVERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top5Drivers.map((d:any) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 50, fontSize: '0.75rem', fontWeight: 500 }}>{d.name}</div>
                  <div style={{ flex: 1, height: 4, background: C.surface, margin: '0 12px' }}>
                    <div style={{ width: `${d.impact}%`, height: '100%', background: C.dim }} />
                  </div>
                  <div style={{ width: 30, textAlign: 'right', fontSize: '0.75rem', color: C.muted }}>{d.impact}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: DIGITAL TWIN WORKSPACE */}
          <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 24px 0 24px', color: C.accent, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', display: 'flex', justifyContent: 'space-between' }}>
              <span>DIGITAL TWIN WORKSPACE</span>
              {simLoading && <span style={{ color: C.warning }}>COMPUTING...</span>}
            </div>

            {/* Scenario Inputs */}
            <div style={{ padding: 24, flex: 1 }}>
              {top5Drivers.map((d:any) => (
                <VariableSlider 
                  key={d.name}
                  variable={d.name}
                  value={modifications.get(d.name) || 0}
                  onChange={(v) => handleSliderChange(d.name, v)}
                  onBlur={() => {}}
                />
              ))}
            </div>

            {/* Projection Board */}
            <div style={{ padding: 24, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: C.muted, letterSpacing: '0.1em', marginBottom: 8 }}>CURRENT RISK</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 600 }}>{CURRENT_RISK}</div>
              </div>
              <div style={{ color: C.dim }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: C.accent, letterSpacing: '0.1em', marginBottom: 8 }}>PROJECTED RISK</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 600, color: C.text }}>{PROJ_RISK}</div>
              </div>
              <div style={{ color: C.dim }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: IS_IMPROVED ? C.success : C.critical, letterSpacing: '0.1em', marginBottom: 8 }}>IMPROVEMENT</div>
                <div style={{ fontSize: '3.5rem', fontWeight: 700, color: IS_IMPROVED ? C.success : C.critical, lineHeight: 1 }}>{DELTA}</div>
              </div>
            </div>
          </div>

          {/* RIGHT: ACTION ENGINE */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: 24 }}>ACTION ENGINE</div>
            
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: '0.7rem', color: C.accent, marginBottom: 8, fontWeight: 600 }}>TOP ACTION</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: C.text, marginBottom: 12 }}>{BACTION}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 12 }}>
                <div><span style={{color:C.dim, fontSize:'0.7rem', display:'block'}}>EXPECTED IMPACT</span><span style={{color:C.success}}>{DELTA} pts</span></div>
                <div style={{textAlign:'right'}}><span style={{color:C.dim, fontSize:'0.7rem', display:'block'}}>CONFIDENCE</span>{BCONF}</div>
              </div>
              <div style={{ fontSize: '0.65rem', color: C.warning, border: `1px solid ${C.warning}40`, background: `${C.warning}10`, padding: 8, borderRadius: 4 }}>
                Recommended Action: Derived from latest executive overview. Not recalculated by simulation.
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: C.dim, marginBottom: 12 }}>ALTERNATIVES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alternatives.map((a:any) => (
                <div key={a.id} style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: C.text, marginBottom: 8 }}>{a.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{color:C.muted}}>Impact: {a.population_affected} pts</span>
                    <span style={{color:C.muted}}>Conf: {Math.round(a.confidence*100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: SCENARIO LAB */}
        <div style={{ minHeight: 200, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
            <div 
              onClick={() => { setActiveTab('BASELINE'); setModifications(new Map()); }}
              style={{ padding: '16px 32px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: activeTab === 'BASELINE' ? C.text : C.muted, borderBottom: activeTab === 'BASELINE' ? `2px solid ${C.accent}` : '2px solid transparent' }}
            >
              LIVE SCENARIO
            </div>
            {scenarios.map(s => (
              <div 
                key={s.id} onClick={() => loadScenario(s)}
                style={{ padding: '16px 32px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: activeTab === s.id ? C.text : C.muted, borderBottom: activeTab === s.id ? `2px solid ${C.accent}` : '2px solid transparent' }}
              >
                {s.name}
              </div>
            ))}
          </div>
          
          <div style={{ padding: 24, flex: 1, display: 'flex', gap: 24 }}>
            {/* Controls */}
            <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={saveScenario} style={{ background: C.surface, border: `1px solid ${C.accent}`, color: C.accent, padding: '12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>SAVE SCENARIO</button>
              <button onClick={() => setCompareMode(!compareMode)} style={{ background: compareMode ? C.surfaceHover : C.surface, border: `1px solid ${compareMode ? C.accent : C.border}`, color: compareMode ? C.text : C.muted, padding: '12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>COMPARE ALL</button>
            </div>
            
            {/* Scenario Details */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
              {compareMode ? (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ minWidth: 200, padding: 16, border: `1px solid ${C.border}`, background: C.surface }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 16, color: C.text }}>Baseline</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>Critical: <span style={{color:C.text}}>{PATIENTS}</span></div>
                    <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>Health: <span style={{color:C.text}}>{HS}</span></div>
                    <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>Delta: <span style={{color:C.text}}>0</span></div>
                  </div>
                  {scenarios.map(s => (
                    <div key={s.id} style={{ minWidth: 200, padding: 16, border: `1px solid ${C.border}`, background: C.surface }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 16, color: C.accent }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>Critical: <span style={{color:C.text}}>{s.results.projected_critical_patients}</span></div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>Health: <span style={{color:C.text}}>{s.results.projected_health_score}</span></div>
                      <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>Delta: <span style={{color: s.results.critical_patients_delta < 0 ? C.success : C.critical}}>{Math.abs(s.results.critical_patients_delta)}</span></div>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'BASELINE' ? (
                <div style={{ color: C.muted, fontSize: '0.85rem' }}>Adjust sliders above to create a scenario, then click Save.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button onClick={() => duplicateScenario(scenarios.find(s=>s.id===activeTab)!)} style={{ background: 'transparent', border: `1px solid ${C.muted}`, color: C.text, padding: '4px 12px', fontSize: '0.65rem', cursor: 'pointer' }}>DUPLICATE</button>
                    <button onClick={() => deleteScenario(activeTab)} style={{ background: 'transparent', border: `1px solid ${C.critical}`, color: C.critical, padding: '4px 12px', fontSize: '0.65rem', cursor: 'pointer' }}>DELETE</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                    {scenarios.find(s => s.id === activeTab)?.modifications.map(m => (
                      <div key={m.variable} style={{ padding: 16, border: `1px solid ${C.border}`, background: C.surface }}>
                        <div style={{ fontSize: '0.75rem', color: C.muted }}>{m.variable}</div>
                        <div style={{ fontSize: '1.5rem', color: m.change_pct < 0 ? C.success : C.critical }}>{m.change_pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: DECISION EXPLAINABILITY */}
        <div style={{ padding: '32px 24px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: 16 }}>DECISION EXPLAINABILITY</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: C.dim, marginBottom: 8 }}>WHY THIS ACTION?</div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                Because <strong style={{color:C.text}}>{DRIVER}</strong> explains <strong style={{color:C.warning}}>{DIMPACT}%</strong> of the critical risk variance across the analyzed population.
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: C.dim, marginBottom: 8 }}>EVIDENCE</div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                <strong style={{color:C.text}}>{DPTS} patients</strong> are currently affected by <strong style={{color:C.accent, fontFamily:FONT_MONO, fontSize:'0.8rem'}}>RULE_1_{DRIVER}_ELEVATED</strong>.
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: C.dim, marginBottom: 8 }}>CONFIDENCE</div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                The engine predicts a <strong style={{color:C.success}}>{BCONF}</strong> probability of achieving the projected {DELTA} patient improvement.
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4.5: EXECUTION READINESS */}
        <div style={{ padding: '32px 24px', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, letterSpacing: '0.1em' }}>DECISION SCORE</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: decisionScore >= 80 ? C.success : decisionScore >= 60 ? C.warning : C.critical }}>{decisionScore}/100</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, letterSpacing: '0.1em' }}>EXECUTION STATUS</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: readiness === 'READY' ? C.success : readiness === 'CAUTION' ? C.warning : C.critical, marginTop: 'auto', paddingBottom: 4 }}>{readiness}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, letterSpacing: '0.1em' }}>EXPECTED BENEFIT</span>
            <span style={{ fontSize: '1rem', color: C.text, marginTop: 'auto', paddingBottom: 4 }}>{IS_IMPROVED ? 'Risk Reduction' : 'Risk Increase'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, letterSpacing: '0.1em' }}>AFFECTED POPULATION</span>
            <span style={{ fontSize: '1rem', color: C.text, marginTop: 'auto', paddingBottom: 4 }}>{DELTA} patients</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, letterSpacing: '0.1em' }}>CONFIDENCE</span>
            <span style={{ fontSize: '1rem', color: C.text, marginTop: 'auto', paddingBottom: 4 }}>{BCONF}</span>
          </div>
        </div>

        {/* ROW 5: MISSION TIMELINE */}
        <div style={{ padding: '32px 24px', borderBottom: `1px solid ${C.border}`, textAlign: 'center', color: C.dim, fontSize: '0.85rem', fontStyle: 'italic' }}>
          No historical telemetry available
        </div>

        {/* ROW 6: AUDIT DRAWER */}
        <div style={{ padding: '16px 24px' }}>
          <div 
            onClick={() => setAuditOpen(!auditOpen)}
            style={{ fontSize: '0.75rem', color: C.accent, cursor: 'pointer', fontWeight: 600 }}
          >
            {auditOpen ? '▼ HIDE AUDIT LOGS' : '▶ SHOW SYSTEM AUDIT LOGS'}
          </div>
          {auditOpen && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: 12, background: C.surfaceHover, fontFamily: FONT_MONO, fontSize: '0.75rem', color: C.muted, border: `1px solid ${C.border}` }}>
                [SYS] {fmtTs(ov.timestamp)} - Baseline loaded. Cases: {PATIENTS}
              </div>
              {auditLogs.map(log => (
                <div key={log.id} style={{ padding: 12, background: C.surface, fontFamily: FONT_MONO, fontSize: '0.75rem', color: C.dim, border: `1px solid ${C.border}` }}>
                  [{fmtTs(Date.parse(log.timestamp)/1000)}] SIM_EVENT - {log.variable} → Projected: {log.projected} (Delta: {log.delta})
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
};
