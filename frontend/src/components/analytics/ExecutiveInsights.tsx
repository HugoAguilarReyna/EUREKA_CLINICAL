import { useState, useEffect } from 'react';
import { ShieldAlert, TrendingUp, AlertTriangle, CheckCircle, HelpCircle, FileText, Anchor, ShieldCheck } from 'lucide-react';

export const ExecutiveInsights = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate GET /knowledge/jobs/{id}/insights
    setTimeout(() => {
      setData({
        healthScore: 82,
        criticalAssets: 14,
        bottlenecks: 3,
        unusedKnowledge: 120, // number of orphaned nodes
        governanceCoverage: 68, // percentage
        riskExposure: 'Medium',
        mostInfluential: [
          { id: 'KA-1092', score: 98, type: 'Process Document' },
          { id: 'KA-0441', score: 91, type: 'Data Dictionary' },
          { id: 'KA-2210', score: 87, type: 'Policy Guidelines' }
        ],
        recommendations: [
          "Connect 120 unused knowledge assets to relevant business cases.",
          "Add governance metadata to 32% of critical assets missing reviewers.",
          "Resolve 3 detected bottleneck nodes that over 50 dependencies rely on."
        ]
      });
      setLoading(false);
    }, 1200);
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-blue-400 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Loading Executive Insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glassmorphism p-6 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-400">Knowledge Health</p>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{data.healthScore}</p>
            <p className="text-sm text-gray-500 mb-1">/ 100</p>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-4">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${data.healthScore}%` }}></div>
          </div>
        </div>

        <div className="glassmorphism p-6 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-400">Governance Coverage</p>
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{data.governanceCoverage}%</p>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-4">
            <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${data.governanceCoverage}%` }}></div>
          </div>
        </div>

        <div className="glassmorphism p-6 rounded-xl flex flex-col justify-between border border-amber-500/20">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-400">Risk Exposure</p>
            <ShieldAlert size={18} className="text-amber-400" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-amber-400">{data.riskExposure}</p>
          </div>
          <p className="text-xs text-gray-500 mt-4">{data.criticalAssets} critical assets at risk</p>
        </div>

        <div className="glassmorphism p-6 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-400">Unused Knowledge</p>
            <HelpCircle size={18} className="text-gray-400" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{data.unusedKnowledge}</p>
          </div>
          <p className="text-xs text-gray-500 mt-4">Orphaned nodes without connections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Influential */}
        <div className="glassmorphism p-6 rounded-xl lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Anchor size={18} className="text-purple-400" /> Critical Bottlenecks ({data.bottlenecks})
          </h3>
          <div className="space-y-4">
            {data.mostInfluential.map((asset: any) => (
              <div key={asset.id} className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">{asset.id}</p>
                  <p className="text-xs text-gray-500">{asset.type}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-400">Influence Score</span>
                  <span className="text-sm font-bold text-purple-400">{asset.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="glassmorphism p-6 rounded-xl lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-400" /> AI Recommendations
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((rec: string, idx: number) => (
              <div key={idx} className="flex gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="mt-0.5">
                  <CheckCircle size={16} className="text-orange-400" />
                </div>
                <p className="text-sm text-gray-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
