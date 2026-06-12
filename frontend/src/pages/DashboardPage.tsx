import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTwinSimulator } from '../hooks/useTwinSimulator';
import { VariableSlider } from '../components/twin-simulator/VariableSlider';
import { Scenario, Modification } from '../types/twin-simulator';

import { ExecutiveDecisionPanel } from '../components/executive-decision/ExecutiveDecisionPanel';
import { DecisionIntelligenceCards } from '../components/executive-decision/DecisionIntelligenceCards';
import { ScenarioLeaderboard } from '../components/executive-decision/ScenarioLeaderboard';

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
  const BALERT   = ov.priority_alerts?.[0];
  const BACTION  = BALERT?.title ?? '—';
  const UPDATED  = fmtTs(ov.timestamp);
  
  const DELTA = simResults ? Math.abs(simResults.critical_patients_delta) : 0;
  const IS_IMPROVED = simResults ? simResults.critical_patients_delta <= 0 : true;

  const top5Drivers = ov.top_drivers?.slice(0, 5) || [];

  return (
    <PageContainer title="DECISION OS">
      <div style={{ fontFamily: FONT_SANS, background: C.bg, minHeight: '100vh', color: C.text }}>
        
        {/* HERO BANNER: MISSION CONTROL BAR */}
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

        {/* DOMINANT: EXECUTIVE DECISION PANEL */}
        <ExecutiveDecisionPanel 
          baselineOverview={ov}
          currentSimulation={simResults}
          allScenarios={scenarios}
          onAccept={() => alert('Executing recommendation...')}
          onExplore={() => setCompareMode(true)}
          onViewAnalysis={() => alert('Opening full analysis view...')}
        />

        {/* THREE DECISION CARDS */}
        <DecisionIntelligenceCards 
          baselineOverview={ov}
          currentSimulation={simResults}
        />

        {/* COMPARE MODE (OPTIONAL, but sits above twin workspace when active) */}
        {compareMode && (
          <ScenarioLeaderboard 
            scenarios={scenarios}
            onSelect={loadScenario}
            onClose={() => setCompareMode(false)}
            onNew={() => { setCompareMode(false); setActiveTab('BASELINE'); setModifications(new Map()); }}
            onCombine={() => alert('Combine scenarios...')}
          />
        )}

        {/* SECONDARY: DIGITAL TWIN WORKSPACE */}
        <div style={{ padding: '0 24px 2rem 24px' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, letterSpacing: '0.1em' }}>DIGITAL TWIN LAB</span>
              {simLoading && <span style={{ color: C.accent, fontSize: '0.75rem', fontWeight: 600 }}>COMPUTING IMPACT...</span>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {/* SLIDERS */}
              <div style={{ padding: '1.5rem', borderRight: `1px solid ${C.border}` }}>
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

              {/* SCENARIO MANAGER */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <div 
                    onClick={() => { setActiveTab('BASELINE'); setModifications(new Map()); }}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: activeTab === 'BASELINE' ? C.accent : 'transparent', color: activeTab === 'BASELINE' ? '#fff' : C.muted, borderRadius: 4, border: `1px solid ${activeTab === 'BASELINE' ? C.accent : C.border}` }}
                  >
                    LIVE SCENARIO
                  </div>
                  {scenarios.map(s => (
                    <div 
                      key={s.id} onClick={() => loadScenario(s)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: activeTab === s.id ? C.surfaceHover : 'transparent', color: activeTab === s.id ? C.text : C.muted, borderRadius: 4, border: `1px solid ${activeTab === s.id ? C.text : C.border}` }}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={saveScenario} style={{ background: C.bg, border: `1px solid ${C.accent}`, color: C.accent, padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>SAVE SCENARIO</button>
                    <button onClick={() => setCompareMode(!compareMode)} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer' }}>COMPARE ALL</button>
                  </div>
                  
                  {activeTab !== 'BASELINE' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => duplicateScenario(scenarios.find(s=>s.id===activeTab)!)} style={{ background: 'transparent', border: `1px solid ${C.muted}`, color: C.text, padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: 4, cursor: 'pointer' }}>DUPLICATE</button>
                      <button onClick={() => deleteScenario(activeTab)} style={{ background: 'transparent', border: `1px solid ${C.critical}`, color: C.critical, padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: 4, cursor: 'pointer' }}>DELETE</button>
                    </div>
                  )}

                  {activeTab !== 'BASELINE' && scenarios.find(s => s.id === activeTab) && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                      {scenarios.find(s => s.id === activeTab)?.modifications.map(m => (
                        <div key={m.variable} style={{ padding: '0.75rem', border: `1px solid ${C.border}`, background: C.bg, borderRadius: 4 }}>
                          <div style={{ fontSize: '0.65rem', color: C.muted }}>{m.variable}</div>
                          <div style={{ fontSize: '1.25rem', color: m.change_pct < 0 ? C.success : C.critical, fontWeight: 600 }}>{m.change_pct}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AUDIT DRAWER */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
          <div 
            onClick={() => setAuditOpen(!auditOpen)}
            style={{ fontSize: '0.75rem', color: C.accent, cursor: 'pointer', fontWeight: 600 }}
          >
            {auditOpen ? '▼ HIDE AUDIT LOGS' : '▶ SHOW SYSTEM AUDIT LOGS'}
          </div>
          {auditOpen && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: 12, background: C.surfaceHover, fontFamily: FONT_MONO, fontSize: '0.75rem', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                [SYS] {fmtTs(ov.timestamp)} - Baseline loaded. Cases: {PATIENTS}
              </div>
              {auditLogs.map(log => (
                <div key={log.id} style={{ padding: 12, background: C.surface, fontFamily: FONT_MONO, fontSize: '0.75rem', color: C.dim, border: `1px solid ${C.border}`, borderRadius: 4 }}>
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
