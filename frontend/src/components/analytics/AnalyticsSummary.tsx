import { useAnalyticsSummary } from '../../hooks';
import { Activity, Share2, Layers } from 'lucide-react';

export const AnalyticsSummary = () => {
  const { data: summary, isLoading, error } = useAnalyticsSummary();

  if (isLoading) return <div className="h-32 flex items-center justify-center text-gray-500 animate-pulse">Loading analytics...</div>;
  if (error || !summary) return <div className="h-32 flex items-center justify-center text-red-400">Failed to load analytics summary.</div>;

  const topAsset = summary.top_assets[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="glassmorphism p-6 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
          <Layers size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-400">Total Nodes</p>
          <p className="text-2xl font-bold">{summary.total_nodes}</p>
        </div>
      </div>
      
      <div className="glassmorphism p-6 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400">
          <Share2 size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-400">Total Edges</p>
          <p className="text-2xl font-bold">{summary.total_edges}</p>
        </div>
      </div>

      <div className="glassmorphism p-6 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
          <Activity size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-400">Graph Density</p>
          <p className="text-2xl font-bold">{(summary.graph_density * 100).toFixed(4)}%</p>
        </div>
      </div>

      <div className="glassmorphism p-6 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-orange-500/20 rounded-lg text-orange-400">
          <Activity size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-400">Most Influential</p>
          <p className="text-lg font-bold truncate max-w-[120px]" title={topAsset?.asset_id}>
            {topAsset?.asset_id || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};
