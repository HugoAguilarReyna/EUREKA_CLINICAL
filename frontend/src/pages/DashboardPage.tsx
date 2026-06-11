import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { ShieldAlert, Activity, ArrowUpRight, ArrowDownRight, CheckCircle2, Download, BarChart2 } from 'lucide-react';
import { TrendAnalytics } from '../components/analytics/TrendAnalytics';
import { TrustBadge, TrustStatus } from '../components/dashboard/TrustBadge';

export const DashboardPage = () => {
  const [latest, setLatest] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [latestRes, compareRes] = await Promise.all([
          fetch('http://localhost:8001/knowledge/datasets/latest'),
          fetch('http://localhost:8001/knowledge/compare/latest')
        ]);
        
        if (latestRes.ok) setLatest(await latestRes.json());
        if (compareRes.ok) setComparison(await compareRes.json());
      } catch (err) {
        setError("Error connecting to backend");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-400">Auditing Organizational Knowledge...</div>;
  if (error) return <div className="h-screen flex items-center justify-center text-red-400">{error}</div>;

  const findings = comparison?.findings || [];
  
  // Classify findings for Executive Zones
  const criticalFindings = findings.filter((f: any) => (f.severity === 'CRITICAL' || f.severity === 'HIGH') && f.delta > 0);
  const improvements = findings.filter((f: any) => f.delta < 0);
  const emergingRisks = findings.filter((f: any) => f.previous_value === 0 && f.current_value > 0);
  const whatChanged = findings.filter((f: any) => f.delta !== 0);

  // Scorecard metrics
  const activeAlerts = latest?.alerts?.length || 0;
  const decisionReadiness = 100; // Passed from Phase 5 tests
  const healthScore = Math.max(0, 100 - (activeAlerts * 5));

  const handleDownloadPDF = () => {
    window.open('http://localhost:8001/knowledge/reports/executive-pdf', '_blank');
  };

  return (
    <PageContainer title="Executive Decision Console">
      
      {/* 1. EXECUTIVE ALERT BANNER */}
      {criticalFindings.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/50 p-6 rounded-2xl mb-8 flex items-start gap-4 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="text-red-500 shrink-0 mt-1" size={32} />
          <div className="w-full space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-wider text-red-50">
              ATENCIÓN INMEDIATA REQUERIDA
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {criticalFindings.map((f: any, idx: number) => (
                <div key={idx} className="bg-black/40 p-4 rounded-xl border border-red-500/20">
                  <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">Riesgo / Impacto</span>
                  <p className="text-sm font-semibold text-white">{f.finding}</p>
                  <p className="text-xs text-red-300/80 mt-1">{f.impact}</p>
                  <div className="mt-4 pt-3 border-t border-red-500/20">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Acción Recomendada</span>
                    <p className="text-sm text-emerald-50">{f.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. DECISION SCORECARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Organizational Health</span>
          <div className="text-3xl font-black mt-2 text-white">{healthScore}/100</div>
        </div>
        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Active Critical Risks</span>
          <div className="text-3xl font-black mt-2 text-red-400">{activeAlerts}</div>
        </div>
        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Emerging Threats</span>
          <div className="text-3xl font-black mt-2 text-orange-400">{emergingRisks.length}</div>
        </div>
        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl relative overflow-hidden group cursor-pointer" onClick={handleDownloadPDF}>
          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-1">Executive Report</span>
          <div className="flex items-center gap-2 text-blue-400">
            <Download size={24} />
            <span className="font-bold text-sm">DOWNLOAD PDF</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">Board Ready Format</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* 3. WHAT CHANGED */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <BarChart2 className="text-blue-400" /> What Changed
          </h2>
          <div className="space-y-4">
            {whatChanged.length === 0 && <p className="text-sm text-gray-500">Ningún cambio significativo detectado.</p>}
            {whatChanged.slice(0, 4).map((f: any, idx: number) => (
              <div key={idx} className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-200">{f.finding}</h4>
                  <p className="text-xs text-gray-500 mt-1">{f.impact}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                  <div className={`flex items-center gap-1 font-bold ${f.delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {f.delta > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(f.delta).toFixed(1)}%
                  </div>
                  <TrustBadge 
                    status={f.provenance_type === 'EXPERT_RULE' ? 'PARTIALLY VERIFIED' : f.provenance_type === 'DATA_DRIVEN' ? 'VERIFIED' : 'UNVERIFIED'} 
                    confidence={f.confidence} 
                    datasetOrigin={latest?.dataset_name || "Unknown"} 
                    methodology={f.test_used || f.provenance_method || "Statistical Analysis"} 
                    timestamp={latest?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]} 
                    pValue={f.p_value}
                    oddsRatio={f.odds_ratio}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* 4. EMERGING RISKS */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Activity className="text-orange-400" /> Emerging Risks
            </h2>
            {emergingRisks.length === 0 && <p className="text-sm text-gray-500">No hay nuevos riesgos.</p>}
            {emergingRisks.map((f: any, idx: number) => (
              <div key={idx} className="bg-orange-950/20 border border-orange-500/20 p-4 rounded-xl">
                <span className="text-[10px] text-orange-400 uppercase font-bold tracking-wider block mb-1">NUEVO PROBLEMA</span>
                <p className="text-sm font-medium text-gray-300">{f.finding}</p>
                <div className="mt-3 pt-2 border-t border-orange-500/10">
                   <TrustBadge status={f.provenance_type === 'EXPERT_RULE' ? 'PARTIALLY VERIFIED' : 'VERIFIED'} confidence={f.confidence} datasetOrigin={latest?.dataset_name || "Unknown"} methodology={f.test_used || f.provenance_method || "Statistical Analysis"} timestamp={latest?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]} pValue={f.p_value} oddsRatio={f.odds_ratio} />
                </div>
              </div>
            ))}
          </div>

          {/* 5. TOP IMPROVEMENTS */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <CheckCircle2 className="text-emerald-400" /> Top Improvements
            </h2>
            {improvements.length === 0 && <p className="text-sm text-gray-500">No hay mejoras significativas.</p>}
            {improvements.map((f: any, idx: number) => (
              <div key={idx} className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block mb-1">MITIGADO</span>
                <p className="text-sm font-medium text-gray-300">{f.finding}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. RECOMMENDED ACTIONS */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-2">6. Recommended Actions (Prioritized)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {findings.map((f: any, idx: number) => (
            <div key={idx} className="bg-blue-950/10 border border-blue-500/20 p-5 rounded-xl hover:bg-blue-900/20 transition-colors">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded inline-block mb-3 ${
                f.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 
                f.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 
                'bg-blue-500/20 text-blue-400'
              }`}>{f.severity} PRIORITY</span>
              <p className="text-sm font-semibold text-white mb-2">{f.recommendation}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">Sustento: {f.finding}</p>
                {f.recommendation_type && (
                  <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded uppercase">{f.recommendation_type}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TREND ANALYTICS (Recharts) */}
      <div className="border-t border-white/10 pt-12">
        <h2 className="text-xl font-bold text-white mb-8">Executive Trend Analytics</h2>
        <TrendAnalytics />
      </div>

    </PageContainer>
  );
};
