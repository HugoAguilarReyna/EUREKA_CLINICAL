import { useTopAssets } from '../../hooks';

export const TopAssetsTable = () => {
  const { data: assets, isLoading, error } = useTopAssets();

  if (isLoading) return <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse">Loading top assets...</div>;
  if (error || !assets) return <div className="h-64 flex items-center justify-center text-red-400">Failed to load top assets.</div>;

  return (
    <div className="glassmorphism rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 bg-white/5">
        <h3 className="font-semibold text-lg text-gray-200">Highest Centrality Assets</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-white/5">
            <tr>
              <th className="px-6 py-3 font-medium">Asset ID</th>
              <th className="px-6 py-3 font-medium">Global Score</th>
              <th className="px-6 py-3 font-medium">PageRank</th>
              <th className="px-6 py-3 font-medium">Degree</th>
              <th className="px-6 py-3 font-medium">Betweenness</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, index) => (
              <tr key={asset.asset_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-blue-400 flex items-center gap-2">
                  <span className="text-gray-500 w-4">{index + 1}.</span>
                  {asset.asset_id}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${asset.global_score}%` }}></div>
                    </div>
                    <span>{asset.global_score.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{(asset.pagerank * 100).toFixed(2)}</td>
                <td className="px-6 py-4">{(asset.degree * 100).toFixed(2)}</td>
                <td className="px-6 py-4">{(asset.betweenness * 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
