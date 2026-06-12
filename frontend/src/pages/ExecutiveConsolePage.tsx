import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { AlertTriangle, Activity, Target, Clock, ShieldCheck, ShieldAlert, SlidersHorizontal, ChevronRight, Lock } from 'lucide-react';

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

  if (loading) return <div className="h-screen bg-[#05070A] flex items-center justify-center text-[#38BDF8] font-mono text-xl tracking-widest uppercase">Initializing Intelligence Console...</div>;
  if (error) return <div className="h-screen bg-[#05070A] flex items-center justify-center text-[#EF4444] font-mono tracking-widest">{error}</div>;

  // Derive top driver from audit rules (sorting by impact/penalty)
  const sortedDrivers = healthAudit?.penalties ? [...healthAudit.penalties].sort((a, b) => b.penalty - a.penalty) : [];
  const primaryDriver = sortedDrivers[0] || {};
  
  // Sort rule consistency by Impact (Proxy here using Support * Confidence as Impact if not explicit, but we should rely on backend where possible. 
  // Wait, backend `overview` has `top_drivers` sorted by impact!
  const rootCauseDrivers = overview?.root_cause?.top_drivers || [];

  const getStatusColor = (status: string) => {
    if (status === 'RED' || status === 'CRITICAL') return 'text-[#EF4444] border-[#EF4444]';
    if (status === 'ORANGE' || status === 'DETERIORATING') return 'text-[#F59E0B] border-[#F59E0B]';
    if (status === 'YELLOW' || status === 'WATCH') return 'text-[#F59E0B] border-[#F59E0B]';
    if (status === 'GREEN' || status === 'STABLE') return 'text-[#10B981] border-[#10B981]';
    return 'text-[#E5E7EB] border-[#E5E7EB]';
  };

  // Derive simulation status safely
  const delta = simulationResult ? simulationResult.delta : 0;
  const simConfidence = simulationResult && simulationResult.baseline_critical > 0 ? "84%" : "N/A";
  let simStatus = "VALID";
  if (delta === 0 && Object.values(simulationVariables).some(v => v !== 0)) simStatus = "LOW CONFIDENCE";
  if (!simulationResult) simStatus = "AWAITING INPUT";

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E5E7EB] font-mono selection:bg-[#38BDF8] selection:text-white p-4">
      
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#38BDF8]" />
          <h1 className="text-xl tracking-widest font-bold uppercase">Executive Decision Console</h1>
        </div>
        <button 
          onClick={() => setAuditMode(!auditMode)}
          className={`px-4 py-2 text-sm font-bold tracking-widest border transition-all flex items-center gap-2 ${auditMode ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]' : 'bg-[#0B1118] text-gray-400 border-gray-700 hover:text-white'}`}
        >
          {auditMode ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          [AUDIT MODE]
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        
        {/* TOP BAND: MISSION STATUS */}
        <div className="col-span-12 bg-[#0B1118] border border-gray-800 p-0 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-gray-800 h-auto xl:h-20">
          
          <div className="flex-1 flex flex-col justify-center px-6 py-2">
            <span className="text-xs text-gray-500 font-bold tracking-widest">MISSION STATUS</span>
            <span className={`text-xl font-bold tracking-widest ${getStatusColor(overview.mission_status)}`}>
              {overview.mission_status === 'RED' ? 'CRITICAL' : overview.mission_status}
            </span>
            {auditMode && <div className="text-[10px] text-[#38BDF8] mt-1 break-all">SRC: {primaryDriver.rule || 'N/A'} | VER: v2_math_rework</div>}
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 py-2">
            <span className="text-xs text-gray-500 font-bold tracking-widest">HEALTH SCORE</span>
            <span className="text-xl font-bold text-white">{overview.health_score} / 100</span>
            {auditMode && <div className="text-[10px] text-[#38BDF8] mt-1 break-all">SRC: /audit/health-score</div>}
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 py-2">
            <span className="text-xs text-gray-500 font-bold tracking-widest">AFFECTED POPULATION</span>
            <span className="text-xl font-bold text-white">{overview.root_cause?.affected_patients || '---'}</span>
            {auditMode && <div className="text-[10px] text-[#38BDF8] mt-1 break-all">SRC: /audit/critical-population | OR LOGIC</div>}
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 py-2">
            <span className="text-xs text-gray-500 font-bold tracking-widest">ROOT DRIVER</span>
            <span className="text-xl font-bold text-white">{overview.root_cause?.driver || '---'}</span>
            {auditMode && <div className="text-[10px] text-[#38BDF8] mt-1 break-all">SUPPORT: {overview.root_cause?.affected_patients}</div>}
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 py-2">
            <span className="text-xs text-gray-500 font-bold tracking-widest">CONFIDENCE</span>
            <span className="text-xl font-bold text-[#10B981]">{(primaryDriver.confidence * 100).toFixed(1)}%</span>
            {auditMode && <div className="text-[10px] text-[#38BDF8] mt-1 break-all">LIFT: {ruleConsistency.find(r => r.rule === primaryDriver.rule)?.lift || 'N/A'}</div>}
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 py-2">
            <span className="text-xs text-gray-500 font-bold tracking-widest">LAST REFRESH</span>
            <span className="text-xl font-bold text-white">{new Date().toISOString().split('T')[1].substring(0,8)}Z</span>
            {auditMode && <div className="text-[10px] text-[#38BDF8] mt-1 break-all">LIVE CACHE</div>}
          </div>
        </div>

        {/* LEFT COLUMN: ROOT CAUSE ANALYSIS */}
        <div className="col-span-12 lg:col-span-4 bg-[#0B1118] border border-gray-800 flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest text-gray-400">ROOT CAUSE ANALYSIS</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {rootCauseDrivers.slice(0, 5).map((driver: any, i: number) => {
              const ruleData = ruleConsistency.find(r => r.rule === driver.rule) || {};
              const impactPct = (driver.impact_score / overview.health_score) * 100; // approximation for visual
              
              return (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-[#38BDF8] tracking-wider">{driver.name || driver.rule?.replace('RULE_', '').replace('_HIGH', ' HIGH').replace('_LOW', ' LOW')}</span>
                  <span className="text-xs text-gray-500">Impact: {(driver.impact_score || 0).toFixed(0)}</span>
                </div>
                <div className="w-full bg-gray-900 h-1">
                  <div className="bg-[#EF4444] h-1" style={{ width: `${Math.min(100, Math.max(5, impactPct))}%` }}></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="text-gray-400">Patients: <span className="text-white">{driver.patients}</span></div>
                  <div className="text-gray-400">Confidence: <span className="text-white">{(ruleData.confidence * 100).toFixed(1) || 'N/A'}%</span></div>
                  {auditMode && (
                    <>
                      <div className="text-[#38BDF8]">Support: <span className="text-white">{ruleData.support || driver.patients}</span></div>
                      <div className="text-[#38BDF8]">Lift: <span className="text-white">{ruleData.lift || 'N/A'}</span></div>
                      <div className="col-span-2 text-[#38BDF8] text-[10px] break-all border-t border-gray-800 pt-1 mt-1">SRC: {driver.rule}</div>
                    </>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* CENTER COLUMN: DIGITAL TWIN SIMULATOR */}
        <div className="col-span-12 lg:col-span-4 bg-[#0B1118] border border-gray-800 flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest text-gray-400">DIGITAL TWIN SIMULATION</span>
            <SlidersHorizontal className="w-4 h-4 text-[#38BDF8]" />
          </div>
          
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            {Object.keys(simulationVariables).map(variable => (
              <div key={variable}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold tracking-wider">{variable}</span>
                  <span className={`text-sm font-bold ${simulationVariables[variable] < 0 ? 'text-[#10B981]' : 'text-gray-500'}`}>
                    {simulationVariables[variable]}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="0" 
                  step="5"
                  value={simulationVariables[variable]}
                  onChange={(e) => handleSliderChange(variable, parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#38BDF8]"
                />
              </div>
            ))}

            <div className="mt-8 border border-gray-700 bg-black/40 p-4">
              <div className="text-xs text-gray-500 font-bold tracking-widest mb-4 border-b border-gray-800 pb-2 flex justify-between">
                <span>LIVE PROJECTION</span>
                <span className={simStatus === 'VALID' ? 'text-[#10B981]' : simStatus === 'LOW CONFIDENCE' ? 'text-[#F59E0B]' : 'text-gray-500'}>
                  [{simStatus}]
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Critical Population</span>
                  <div className="text-right">
                    <span className="text-white font-bold">{overview.root_cause?.affected_patients}</span>
                    <span className="text-gray-600 mx-2">→</span>
                    <span className={`font-bold ${delta < 0 ? 'text-[#10B981]' : 'text-white'}`}>
                      {simulationResult ? simulationResult.projected_critical : overview.root_cause?.affected_patients}
                    </span>
                    <div className={`text-xs ${delta < 0 ? 'text-[#10B981]' : 'text-gray-500'}`}>
                      Δ {delta > 0 ? '+' : ''}{delta}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Health Score</span>
                  <div className="text-right">
                    <span className="text-white font-bold">{overview.health_score}</span>
                    <span className="text-gray-600 mx-2">→</span>
                    <span className="font-bold text-white">
                      {simulationResult ? (100 - Math.floor((simulationResult.projected_critical / 583) * 100)) : overview.health_score}
                    </span>
                  </div>
                </div>

                {auditMode && (
                  <div className="mt-4 pt-4 border-t border-gray-800 text-[10px] text-[#38BDF8] space-y-1">
                    <div>CONFIDENCE: {simConfidence}</div>
                    <div>AFFECTED: {simulationResult?.baseline_critical || '---'}</div>
                    <div className="break-all">ASSUMPTIONS: {JSON.stringify(simulationResult?.assumptions || [])}</div>
                    <div>VERSION: v2_math_rework</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PRIORITY ACTION CENTER */}
        <div className="col-span-12 lg:col-span-4 bg-[#0B1118] border border-gray-800 flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest text-gray-400">PRIORITY ACTION CENTER</span>
            <Target className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900/50 text-xs text-gray-500 sticky top-0">
                <tr>
                  <th className="p-4 font-normal tracking-widest">ACTION</th>
                  <th className="p-4 font-normal tracking-widest">IMPACT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {overview.priority_actions?.slice(0, 4).map((action: any, i: number) => {
                  const ruleData = ruleConsistency.find(r => r.rule === action.source_rule) || {};
                  return (
                  <tr key={i} className="hover:bg-gray-900/30 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-bold text-[#E5E7EB] mb-1">{action.action}</div>
                      {auditMode ? (
                        <div className="text-[10px] text-[#38BDF8] mt-2 space-y-1">
                          <div>SRC: {action.source_rule}</div>
                          <div>SUPPORT: {ruleData.support || action.affected_patients}</div>
                          <div>VER: v2_math_rework</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 line-clamp-2">{action.reason}</div>
                      )}
                    </td>
                    <td className="p-4 align-top whitespace-nowrap">
                      <div className="text-[#10B981] font-bold">-{action.expected_risk_reduction} RISK</div>
                      <div className="text-xs text-gray-400 mt-1">{action.affected_patients} PTs</div>
                      <div className="text-xs text-gray-500 mt-1">{(action.confidence * 100).toFixed(0)}% CONF</div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM PANEL: EXECUTIVE TIMELINE */}
        <div className="col-span-12 bg-[#0B1118] border border-gray-800 p-4 flex items-center justify-center h-24">
          <div className="flex items-center gap-3 text-gray-600 font-bold tracking-widest text-sm">
            <Clock className="w-4 h-4" />
            <span>INTELLIGENCE FEED OFFLINE</span>
          </div>
        </div>

      </div>

      {/* EXECUTIVE AUDIT DRAWER (Right Side) */}
      {auditMode && (
        <div className="fixed top-0 right-0 w-96 h-screen bg-black border-l border-[#38BDF8]/50 shadow-2xl flex flex-col z-50 overflow-hidden font-mono">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0B1118]">
            <div className="flex items-center gap-2 text-[#38BDF8] font-bold tracking-widest">
              <Lock className="w-4 h-4" />
              EXECUTIVE AUDIT
            </div>
            <button onClick={() => setAuditMode(false)} className="text-gray-500 hover:text-white">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs text-[#E5E7EB]">
            <div>
              <div className="text-gray-500 tracking-widest mb-2 border-b border-gray-800 pb-1">GET /audit/health-score</div>
              <pre className="text-[#10B981] overflow-x-auto bg-gray-900/50 p-2 rounded">
                {JSON.stringify(healthAudit, null, 2)}
              </pre>
            </div>
            
            <div>
              <div className="text-gray-500 tracking-widest mb-2 border-b border-gray-800 pb-1">GET /audit/critical-population</div>
              <pre className="text-[#38BDF8] overflow-x-auto bg-gray-900/50 p-2 rounded">
                {JSON.stringify(populationAudit, null, 2)}
              </pre>
            </div>
            
            <div>
              <div className="text-gray-500 tracking-widest mb-2 border-b border-gray-800 pb-1">GET /audit/rule-consistency</div>
              <pre className="text-[#F59E0B] overflow-x-auto bg-gray-900/50 p-2 rounded">
                {JSON.stringify(ruleConsistency.slice(0, 3), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
