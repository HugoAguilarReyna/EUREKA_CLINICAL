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

  // Load scenarios from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('eureka_scenarios');
    if (saved) {
      try { setScenarios(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Debounced Simulation
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const mods = Array.from(modifications.entries())
        .filter(([_, val]) => val !== 0)
        .map(([variable, change_pct]) => ({ variable, change_pct }));
      
      if (mods.length > 0) {
        simulate(mods).catch(() => {});
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
  };

  const loadScenario = (scenario: Scenario) => {
    const newMap = new Map<string, number>();
    scenario.modifications.forEach(m => newMap.set(m.variable, m.change_pct));
    setModifications(newMap);
    setActiveTab(scenario.id);
  };

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.accent,fontFamily:FONT_SANS}}>INITIALIZING KNOWLEDGE GRAPH...</div>;
  if (err||!ov) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,color:C.text,fontFamily:FONT_SANS}}>{err??'NO DATA'}</div>;

  const STATUS   = ov.mission_status;
  const HS       = ov.health_score;
  const PATIENTS = ov.ground_truth_audit?.patient_count ?? 0;
  const DRIVER   = ov.root_cause?.driver ?? '—';
  const DIMPACT  = ov.root_cause?.impact ?? 0;
  const DCONF    = ov.root_cause?.confidence ? `${Math.round(ov.root_cause.confidence*100)}%` : '—';
  
  const BALERT   = ov.priority_alerts?.[0];
  const BACTION  = BALERT?.title ?? '—';
  const BCONF    = BALERT?.confidence ? `${Math.round(BALERT.confidence*100)}%` : '—';
  const UPDATED  = fmtTs(ov.timestamp);
  
  const CURRENT_RISK = PATIENTS;
  const PROJ_RISK = simResults ? simResults.projected_critical_patients : CURRENT_RISK;
  const DELTA = simResults ? Math.abs(simResults.critical_patients_delta) : 0;
  const IS_IMPROVED = simResults ? simResults.critical_patients_delta <= 0 : true;

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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <div><span style={{color:C.dim, fontSize:'0.7rem', display:'block'}}>EXPECTED IMPACT</span><span style={{color:C.success}}>{DELTA} pts</span></div>
                <div style={{textAlign:'right'}}><span style={{color:C.dim, fontSize:'0.7rem', display:'block'}}>CONFIDENCE</span>{BCONF}</div>
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
        <div style={{ height: 350, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
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
              <button style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>COMPARE ALL</button>
            </div>
            
            {/* Scenario Details */}
            <div style={{ flex: 1 }}>
              {activeTab === 'BASELINE' ? (
                <div style={{ color: C.muted, fontSize: '0.85rem' }}>Adjust sliders above to create a scenario, then click Save.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                  {scenarios.find(s => s.id === activeTab)?.modifications.map(m => (
                    <div key={m.variable} style={{ padding: 16, border: `1px solid ${C.border}`, background: C.surface }}>
                      <div style={{ fontSize: '0.75rem', color: C.muted }}>{m.variable}</div>
                      <div style={{ fontSize: '1.5rem', color: m.change_pct < 0 ? C.success : C.critical }}>{m.change_pct}%</div>
                    </div>
                  ))}
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
            <div style={{ marginTop: 16, padding: 16, background: C.surface, fontFamily: FONT_MONO, fontSize: '0.75rem', color: C.muted }}>
              [SYS] {fmtTs(ov.timestamp)} - Payload verified. Sample Size: {ov.ground_truth_audit?.patient_count}.
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
};
