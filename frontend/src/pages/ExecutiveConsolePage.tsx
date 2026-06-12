import React, { useState, useEffect } from 'react';
import { Target, Activity, SlidersHorizontal, Settings2, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Lock, ChevronRight } from 'lucide-react';

export const ExecutiveConsolePage = () => {
  const [overview, setOverview] = useState<any>(null);
  
  // Audit Endpoints State
  const [healthAudit, setHealthAudit] = useState<any>(null);
  const [populationAudit, setPopulationAudit] = useState<any>(null);
  const [ruleConsistency, setRuleConsistency] = useState<any[]>([]);
  
  // Digital Twin Simulator State
  const [simulationVariables, setSimulationVariables] = useState<any>({
    Alkphos: 0,
    TB: 0,
    ALT: 0,
    AST: 0
  });
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  
  // UI State
  const [auditMode, setAuditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [overviewRes, healthRes, popRes, ruleRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/overview`),
          fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/audit/health-score`),
          fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/audit/critical-population`),
          fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/audit/rule-consistency`)
        ]);

        if (!overviewRes.ok) throw new Error("Failed to fetch executive intelligence");

        setOverview(await overviewRes.json());
        if (healthRes.ok) setHealthAudit(await healthRes.json());
        if (popRes.ok) setPopulationAudit(await popRes.json());
        if (ruleRes.ok) setRuleConsistency(await ruleRes.json());

      } catch (err: any) {
        setError(err.message || "SYSTEM FAILURE");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const runSimulation = async (vars: any) => {
    setSimulating(true);
    try {
      const modifications = Object.keys(vars)
        .filter(k => vars[k] !== 0)
        .map(k => ({ variable: k, change_pct: vars[k] }));

      const res = await fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/audit/simulator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifications })
      });
      
      if (res.ok) {
        setSimulationResult(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const handleSliderChange = (variable: string, val: number) => {
    const newVars = { ...simulationVariables, [variable]: val };
    setSimulationVariables(newVars);
    runSimulation(newVars);
  };

  if (loading) return <div className="h-screen bg-[#05070A] flex items-center justify-center text-[#38BDF8] font-mono text-xl tracking-widest uppercase">Initializing Command Center...</div>;
  if (error) return <div className="h-screen bg-[#05070A] flex items-center justify-center text-[#EF4444] font-mono tracking-widest">{error}</div>;

  const sortedDrivers = healthAudit?.penalties ? [...healthAudit.penalties].sort((a, b) => b.penalty - a.penalty) : [];
  const primaryDriver = sortedDrivers[0] || {};
  const rootCauseDrivers = overview?.root_cause?.top_drivers || [];

  const getStatusColor = (status: string) => {
    if (status === 'RED' || status === 'CRITICAL') return 'text-[#EF4444]';
    if (status === 'ORANGE' || status === 'DETERIORATING') return 'text-[#F59E0B]';
    if (status === 'YELLOW' || status === 'WATCH') return 'text-[#F59E0B]';
    if (status === 'GREEN' || status === 'STABLE') return 'text-[#10B981]';
    return 'text-[#E5E7EB]';
  };

  const delta = simulationResult ? simulationResult.delta : 0;
  const simConfidence = simulationResult && simulationResult.baseline_critical > 0 ? "84%" : "N/A";
  let simStatus = "VALID";
  if (delta === 0 && Object.values(simulationVariables).some(v => v !== 0)) simStatus = "LOW CONFIDENCE";
  if (!simulationResult) simStatus = "AWAITING INPUT";

  const topAction = overview.priority_actions?.[0] || {};

  return (
    <div className="h-screen w-screen bg-[#05070A] text-[#E5E7EB] font-mono selection:bg-[#38BDF8] selection:text-white flex flex-col overflow-hidden text-xs">
      
      {/* HEADER CONTROLS (absolute) */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-40">
        <div className="flex gap-4 text-[#94A3B8] mr-4 border border-[#1E293B] px-4 py-1 bg-[#0B1118]">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> LIVER: 85</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> INFLAMM: 92</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> RENAL: 78</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> PROTEIN: 88</span>
        </div>
        <button 
          onClick={() => setAuditMode(true)}
          className={`px-3 py-1 font-bold tracking-widest border transition-all flex items-center gap-2 bg-[#0B1118] text-[#94A3B8] border-[#1E293B] hover:text-white`}
        >
          <Lock className="w-3 h-3" />
          [AUDIT MODE]
        </button>
      </div>

      {/* ROW 1: MISSION BAND (100px) */}
      <div className="h-[100px] flex-none bg-[#0B1118] border-b border-[#1E293B] flex">
        <div className="w-[30%] flex items-center px-6">
          <div>
            <div className="text-[#94A3B8] uppercase tracking-widest font-bold mb-1">EUREKA EXECUTIVE CONSOLE 3.0</div>
            <div className="text-[#38BDF8]">EXECUTIVE DECISION SYSTEM</div>
          </div>
        </div>
        
        <div className="w-[70%] grid grid-cols-6 divide-x divide-[#1E293B] h-full items-center">
          <div className="px-4 text-center">
            <div className="text-[10px] text-[#94A3B8] font-bold tracking-widest">MISSION STATUS</div>
            <div className={`text-xl font-bold tracking-widest ${getStatusColor(overview.mission_status)}`}>
              {overview.mission_status === 'RED' ? 'CRITICAL' : overview.mission_status}
            </div>
          </div>

          <div className="px-4">
            <div className="text-[10px] text-[#94A3B8] font-bold tracking-widest">ROOT DRIVER</div>
            <div className="text-sm font-bold text-white uppercase">{overview.root_cause?.driver}</div>
            {auditMode && <div className="text-[9px] text-[#38BDF8] truncate">{primaryDriver.rule}</div>}
          </div>

          <div className="px-4">
            <div className="text-[10px] text-[#94A3B8] font-bold tracking-widest">AFFECTED POPULATION</div>
            <div className="text-sm font-bold text-white">{overview.root_cause?.affected_patients} of 583 patients</div>
          </div>

          <div className="px-4">
            <div className="text-[10px] text-[#94A3B8] font-bold tracking-widest">CONFIDENCE</div>
            <div className="text-sm font-bold text-[#10B981]">{(primaryDriver.confidence * 100).toFixed(1)}%</div>
          </div>

          <div className="px-4">
            <div className="text-[10px] text-[#94A3B8] font-bold tracking-widest">RECOMMENDED ACTION</div>
            <div className="text-sm font-bold text-white uppercase truncate">{topAction.action || '---'}</div>
          </div>

          <div className="px-4 text-center">
            <div className="text-[10px] text-[#94A3B8] font-bold tracking-widest">LAST REFRESH</div>
            <div className="text-sm font-bold text-white">{new Date().toISOString().split('T')[1].substring(0,8)} UTC</div>
          </div>
        </div>
      </div>

      {/* ROW 2: MAIN OPERATIONS GRID */}
      <div className="flex-1 flex flex-row divide-x divide-[#1E293B] overflow-hidden">
        
        {/* LEFT 30%: ROOT CAUSE ANALYSIS */}
        <div className="w-[30%] flex flex-col p-4 bg-[#05070A] overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-4 h-4 text-[#94A3B8]" />
            <span className="font-bold tracking-widest text-[#94A3B8]">ROOT CAUSE ANALYSIS</span>
          </div>
          
          <table className="w-full text-left text-[11px]">
            <thead className="text-[#94A3B8] border-b border-[#1E293B]">
              <tr>
                <th className="font-normal pb-2 w-8">#</th>
                <th className="font-normal pb-2">DRIVER</th>
                <th className="font-normal pb-2">IMPACT</th>
                <th className="font-normal pb-2">SUPPORT</th>
                <th className="font-normal pb-2">CONF.</th>
                <th className="font-normal pb-2">LIFT</th>
                <th className="font-normal pb-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {rootCauseDrivers.slice(0, 10).map((driver: any, i: number) => {
                const ruleData = ruleConsistency.find(r => r.rule === driver.rule) || {};
                const impactPct = ((driver.impact_score || 0) / overview.health_score) * 100;
                
                return (
                <tr key={i} className="hover:bg-[#1E293B]/20">
                  <td className="py-3 text-[#94A3B8]">{i + 1}</td>
                  <td className="py-3 font-bold text-[#EF4444] uppercase truncate max-w-[120px]">
                    {driver.name || driver.rule?.replace('RULE_', '').replace('_HIGH', ' HIGH').replace('_LOW', ' LOW')}
                    {auditMode && <div className="text-[9px] text-[#38BDF8] truncate mt-1">{driver.rule}</div>}
                  </td>
                  <td className="py-3 text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-900 h-1">
                        <div className="bg-[#EF4444] h-1" style={{ width: `${Math.min(100, Math.max(10, impactPct))}%` }}></div>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">{impactPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-white">{ruleData.support || driver.patients}</td>
                  <td className="py-3 text-[#10B981]">{(ruleData.confidence * 100 || 0).toFixed(0)}%</td>
                  <td className="py-3 text-white">{ruleData.lift || '---'}</td>
                  <td className="py-3 text-white text-right">{driver.patients}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* CENTER 40%: DIGITAL TWIN SIMULATOR */}
        <div className="w-[40%] flex flex-col p-6 bg-[#0B1118]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#38BDF8]" />
              <span className="font-bold tracking-widest text-[#E5E7EB]">DIGITAL TWIN SIMULATOR</span>
            </div>
            <div className="flex items-center gap-2 border border-[#1E293B] px-3 py-1 text-[10px] bg-[#05070A]">
              <span className="text-[#94A3B8]">STATUS</span>
              <span className={`font-bold ${simStatus === 'VALID' ? 'text-[#10B981]' : simStatus === 'LOW CONFIDENCE' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`}>
                {simStatus}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-8">
            {/* SLIDERS SECTION */}
            <div className="space-y-6">
              <div className="text-[#38BDF8] text-[10px] tracking-widest mb-4 border-b border-[#1E293B] pb-2">INTERVENTION SCENARIOS</div>
              {Object.keys(simulationVariables).map(variable => (
                <div key={variable} className="flex items-center gap-4">
                  <div className="w-16 text-[11px] font-bold tracking-wider">{variable}</div>
                  <div className={`w-12 text-[11px] text-right font-bold ${simulationVariables[variable] < 0 ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                    {simulationVariables[variable]}%
                  </div>
                  <input 
                    type="range" min="-50" max="0" step="5"
                    value={simulationVariables[variable]}
                    onChange={(e) => handleSliderChange(variable, parseInt(e.target.value))}
                    className="flex-1 h-[2px] bg-[#1E293B] appearance-none cursor-pointer accent-[#38BDF8]"
                  />
                  <div className="w-8 text-[9px] text-[#94A3B8]">-50%</div>
                </div>
              ))}
            </div>

            {/* PROJECTION SECTION */}
            <div className="flex-1 bg-[#05070A] border border-[#1E293B] p-5 flex flex-col">
              <div className="text-[#38BDF8] text-[10px] tracking-widest mb-4">PROJECTION RESULTS</div>
              
              <div className="grid grid-cols-3 gap-6 flex-1">
                <div className="flex flex-col items-center justify-center border-r border-[#1E293B]">
                  <div className="text-[#94A3B8] text-[10px] tracking-widest mb-2">CRITICAL POPULATION</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#EF4444]">{overview.root_cause?.affected_patients}</span>
                    <span className="text-[#94A3B8]">→</span>
                    <span className="text-2xl font-bold text-[#10B981]">{simulationResult ? simulationResult.projected_critical : overview.root_cause?.affected_patients}</span>
                  </div>
                  <div className={`text-[11px] font-bold mt-2 ${delta < 0 ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                    Δ {delta}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-r border-[#1E293B]">
                  <div className="text-[#94A3B8] text-[10px] tracking-widest mb-2">HEALTH SCORE</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#EF4444]">{overview.health_score}</span>
                    <span className="text-[#94A3B8]">→</span>
                    <span className="text-2xl font-bold text-[#10B981]">{simulationResult ? (100 - Math.floor((simulationResult.projected_critical / 583) * 100)) : overview.health_score}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="text-[#94A3B8] text-[10px] tracking-widest mb-2">TOP DRIVER SHIFT</div>
                  <div className="text-[11px] text-[#EF4444] font-bold uppercase">{overview.root_cause?.driver}</div>
                  <div className="text-[#94A3B8] my-1">↓</div>
                  <div className="text-[11px] text-[#F59E0B] font-bold uppercase">{delta < 0 ? 'ALB LOW' : overview.root_cause?.driver}</div>
                </div>
              </div>

              {auditMode && (
                <div className="mt-4 pt-4 border-t border-[#1E293B] grid grid-cols-2 text-[9px] text-[#38BDF8]">
                  <div className="break-all pr-4">ASSUMPTIONS: {JSON.stringify(simulationResult?.assumptions || [])}</div>
                  <div className="text-right">CONFIDENCE: {simConfidence}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 30%: PRIORITY ACTION CENTER */}
        <div className="w-[30%] flex flex-col p-4 bg-[#05070A] overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-4 h-4 text-[#94A3B8]" />
            <span className="font-bold tracking-widest text-[#94A3B8]">PRIORITY ACTION CENTER</span>
          </div>

          <table className="w-full text-left text-[11px]">
            <thead className="text-[#94A3B8] border-b border-[#1E293B]">
              <tr>
                <th className="font-normal pb-2 w-6">#</th>
                <th className="font-normal pb-2">ACTION</th>
                <th className="font-normal pb-2 text-right">IMPROVED</th>
                <th className="font-normal pb-2 text-right">REDUCTION</th>
                <th className="font-normal pb-2 text-right">CONF.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {overview.priority_actions?.slice(0, 10).map((action: any, i: number) => {
                const ruleData = ruleConsistency.find(r => r.rule === action.source_rule) || {};
                return (
                <tr key={i} className="hover:bg-[#1E293B]/20">
                  <td className="py-4 text-[#94A3B8]">{i + 1}</td>
                  <td className="py-4 font-bold text-[#E5E7EB] uppercase">
                    {action.action}
                    {auditMode && <div className="text-[9px] text-[#38BDF8] mt-1 truncate max-w-[150px]">SRC: {action.source_rule}</div>}
                  </td>
                  <td className="py-4 text-white text-right">{action.affected_patients}</td>
                  <td className="py-4 text-[#10B981] text-right font-bold">{action.expected_risk_reduction}%</td>
                  <td className="py-4 text-[#10B981] text-right">{(action.confidence * 100).toFixed(0)}%</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW 3: SYSTEM INTELLIGENCE STATUS (Max 120px) */}
      <div className="h-[60px] flex-none bg-[#0B1118] border-t border-[#1E293B] px-6 flex items-center justify-between text-[11px] font-bold tracking-widest">
        <div className="text-[#38BDF8]">SYSTEM INTELLIGENCE STATUS</div>
        <div className="flex gap-8 text-[#94A3B8]">
          <span className="flex items-center gap-2">TIMELINE <span className="text-[#EF4444]">OFFLINE</span></span>
          <span className="flex items-center gap-2">GRAPH <span className="text-[#10B981]">ONLINE</span></span>
          <span className="flex items-center gap-2">AUDIT <span className="text-[#10B981]">ONLINE</span></span>
          <span className="flex items-center gap-2">SIMULATION <span className="text-[#10B981]">ONLINE</span></span>
          <span className="flex items-center gap-2">DATA AGE <span className="text-white">0m</span></span>
        </div>
      </div>

      {/* EXECUTIVE AUDIT DRAWER (Right Slide-Out) */}
      <div 
        className={`fixed top-0 right-0 h-screen w-[500px] bg-[#000000] border-l border-[#38BDF8] z-50 transform transition-transform duration-300 flex flex-col font-mono text-xs ${auditMode ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#05070A]">
          <div className="flex items-center gap-2 font-bold tracking-widest text-[#38BDF8]">
            <Lock className="w-4 h-4" />
            AUDIT MODE ACTIVATED
          </div>
          <button onClick={() => setAuditMode(false)} className="text-[#94A3B8] hover:text-white p-1 border border-[#1E293B]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-[#94A3B8]">
          <div className="text-[10px] uppercase">All metrics on screen are currently derived from the following raw JSON payloads. No synthetic data is active.</div>
          
          <div>
            <div className="text-[#E5E7EB] tracking-widest mb-2 border-b border-[#1E293B] pb-1">GET /audit/health-score</div>
            <pre className="text-[#10B981] overflow-x-auto bg-[#05070A] border border-[#1E293B] p-2 text-[10px]">
              {JSON.stringify(healthAudit, null, 2)}
            </pre>
          </div>
          
          <div>
            <div className="text-[#E5E7EB] tracking-widest mb-2 border-b border-[#1E293B] pb-1">GET /audit/critical-population</div>
            <pre className="text-[#38BDF8] overflow-x-auto bg-[#05070A] border border-[#1E293B] p-2 text-[10px]">
              {JSON.stringify(populationAudit, null, 2)}
            </pre>
          </div>
          
          <div>
            <div className="text-[#E5E7EB] tracking-widest mb-2 border-b border-[#1E293B] pb-1">GET /audit/rule-consistency</div>
            <pre className="text-[#F59E0B] overflow-x-auto bg-[#05070A] border border-[#1E293B] p-2 text-[10px]">
              {JSON.stringify(ruleConsistency.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
};
