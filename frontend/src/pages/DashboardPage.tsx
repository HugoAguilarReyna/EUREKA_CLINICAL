import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { ShieldAlert, Activity, ArrowUpRight, ArrowDownRight, CheckCircle2, Download, BarChart2, Zap, Sliders, PlayCircle } from 'lucide-react';

export const DashboardPage = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Twin Simulator State
  const [simulationVariable, setSimulationVariable] = useState("TB");
  const [simulationChange, setSimulationChange] = useState(-20);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/overview`);
        if (res.ok) {
          setOverview(await res.json());
        } else {
          setError("Error connecting to Executive Console Backend");
        }
      } catch (err) {
        setError("Error connecting to backend");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/knowledge/executive/twin-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifications: [
            { variable: simulationVariable, change_pct: simulationChange }
          ]
        })
      });
      if (res.ok) {
        setSimulationResult(await res.json());
      }
    } catch(e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`${import.meta.env.VITE_API_URL}/knowledge/reports/executive-pdf`, '_blank');
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-400 font-mono">INITIALIZING EXECUTIVE CONSOLE...</div>;
  if (error) return <div className="h-screen flex items-center justify-center text-red-400 font-mono">{error}</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GREEN': return 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]';
      case 'YELLOW': return 'bg-yellow-500 text-yellow-950 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]';
      case 'ORANGE': return 'bg-orange-500 text-orange-950 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]';
      case 'RED': return 'bg-red-500 text-red-950 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)]';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'GREEN': return 'STABLE';
      case 'YELLOW': return 'WATCH';
      case 'ORANGE': return 'DETERIORATING';
      case 'RED': return 'CRITICAL';
      default: return 'UNKNOWN';
    }
  };

  return (
    <PageContainer title="Executive Decision Console 3.0">
      
      {/* EXECUTIVE MISSION STATUS BAND */}
      <div className={`mb-8 p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between transition-all ${getStatusColor(overview.mission_status)}`}>
        <div className="flex items-center gap-6">
          <div className="text-center bg-black/20 p-4 rounded-xl backdrop-blur-sm">
            <div className="text-xs uppercase font-bold opacity-80 mb-1">Health Score</div>
            <div className="text-4xl font-black">{overview.health_score}</div>
          </div>
          <div>
            <div className="text-sm uppercase font-black opacity-70 tracking-widest mb-1">MISSION STATUS</div>
            <div className="text-3xl font-black tracking-tight">{getStatusLabel(overview.mission_status)}</div>
          </div>
        </div>
        
        <div className="mt-6 md:mt-0 max-w-xl bg-black/10 p-4 rounded-xl backdrop-blur-sm">
          <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
            {overview.narrative}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* ROOT CAUSE DRIVER */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400"/> Root Cause Driver
            </h3>
            <div className="text-2xl font-bold text-white mb-1">{overview.root_cause?.driver}</div>
            <div className="text-sm text-red-400 font-medium">Impact: {overview.root_cause?.impact}%</div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Affected</div>
              <div className="text-lg font-bold text-gray-300">{overview.root_cause?.affected_patients} Patients</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase">Confidence</div>
              <div className="text-lg font-bold text-emerald-400">{overview.root_cause?.confidence * 100}%</div>
            </div>
          </div>
        </div>

        {/* TODO: Add domain overview components */}

        {/* TOP RISK DRIVERS */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-2xl lg:col-span-2">
          <h3 className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-400"/> Top Drivers of Risk
          </h3>
          <div className="space-y-4 mt-6">
            {overview.top_drivers?.map((driver: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm font-semibold text-gray-300 truncate">{driver.name}</div>
                <div className="flex-1 bg-white/5 h-4 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full" 
                    style={{ width: `${driver.impact}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs font-bold text-gray-400">{driver.impact}%</div>
              </div>
            ))}
          </div>
        </div>
      {/* End of Top Risk Drivers section */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Domain overview components will go here */}
      </div>

        {/* CLINICAL DIGITAL TWIN SIMULATOR */}
        <div className="bg-gradient-to-br from-blue-950/30 to-purple-950/30 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sliders size={120} />
          </div>
          <h3 className="text-xs text-blue-400 uppercase font-bold tracking-widest mb-6 flex items-center gap-2 relative z-10">
            <Activity size={14} /> Clinical Digital Twin Simulator
          </h3>
          
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <select 
              className="bg-black/50 border border-blue-500/30 text-white p-2 rounded-lg text-sm w-32 outline-none"
              value={simulationVariable}
              onChange={(e) => setSimulationVariable(e.target.value)}
            >
              {overview.top_drivers?.map((d:any) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <div className="flex-1">
              <input 
                type="range" 
                min="-50" max="50" step="5" 
                value={simulationChange} 
                onChange={(e) => setSimulationChange(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-bold">
                <span>-50%</span>
                <span className="text-blue-400">{simulationChange > 0 ? '+' : ''}{simulationChange}%</span>
                <span>+50%</span>
              </div>
            </div>
            <button 
              onClick={runSimulation}
              disabled={simulating}
              className="bg-blue-600 hover:bg-blue-500 text-white p-2 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <PlayCircle size={16}/> Simulate
            </button>
          </div>

          {simulationResult && (
            <div className="bg-black/40 border border-blue-500/20 rounded-xl p-4 grid grid-cols-3 gap-4 relative z-10">
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Health Score</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{simulationResult.projected_health_score}</span>
                  <span className={`text-xs font-bold ${simulationResult.health_score_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({simulationResult.health_score_delta > 0 ? '+' : ''}{simulationResult.health_score_delta})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Critical Risks</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{simulationResult.projected_critical_risks}</span>
                  <span className={`text-xs font-bold ${simulationResult.critical_risks_delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({simulationResult.critical_risks_delta > 0 ? '+' : ''}{simulationResult.critical_risks_delta})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Patients</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{simulationResult.projected_critical_patients}</span>
                  <span className={`text-xs font-bold ${simulationResult.critical_patients_delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({simulationResult.critical_patients_delta > 0 ? '+' : ''}{simulationResult.critical_patients_delta})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRIORITY ACTION CENTER */}
      <div className="mb-12">
        <h3 className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-6">Priority Action Center</h3>
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-bold">Action / Trigger</th>
                <th className="p-4 font-bold text-center">Impact Score</th>
                <th className="p-4 font-bold text-center">Confidence</th>
                <th className="p-4 font-bold text-center">Patients</th>
                <th className="p-4 font-bold text-center">Severity</th>
              </tr>
            </thead>
            <tbody>
              {overview.priority_alerts?.map((alert: any, idx: number) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-sm text-gray-200 mb-1">{alert.title}</div>
                    <div className="text-xs text-gray-500">{alert.description}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-500/20 text-blue-400 font-black text-xs px-2 py-1 rounded">
                      {(alert.priority_score * 100).toFixed(1)}
                    </span>
                  </td>
                  <td className="p-4 text-center font-semibold text-emerald-400 text-sm">
                    {(alert.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="p-4 text-center font-semibold text-gray-300 text-sm">
                    {alert.population_affected}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      alert.severity >= 0.8 ? 'bg-red-500/20 text-red-400' :
                      alert.severity >= 0.5 ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {alert.severity >= 0.8 ? 'HIGH' : alert.severity >= 0.5 ? 'MEDIUM' : 'LOW'}
                    </span>
                  </td>
                </tr>
              ))}
              {overview.priority_alerts?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                    No active priority actions required.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </PageContainer>
  );
};
