import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';
import { getNodeProvenance } from '../../api/graph';

export const NodeInspector = () => {
  const { selectedNode, setSelectedNode } = useGraphStore();
  const [provenanceDetails, setProvenanceDetails] = useState<any>(null);
  const [loadingProv, setLoadingProv] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);

  if (!selectedNode) return null;

  const nodeId = selectedNode?.id || 'Unknown';
  const nodeLabel = selectedNode?.label || 'Unknown';
  const properties = selectedNode?.properties || {};

  useEffect(() => {
    setProvenanceDetails(null);
    setShowProvenance(false);
  }, [nodeId]);

  const handleShowProvenance = async () => {
    if (showProvenance) {
      setShowProvenance(false);
      return;
    }
    setLoadingProv(true);
    try {
      const data = await getNodeProvenance(nodeId);
      setProvenanceDetails(data);
      setShowProvenance(true);
    } catch (err) {
      console.error("Error fetching provenance", err);
    } finally {
      setLoadingProv(false);
    }
  };

  // Parse centralities safely
  const degreeVal = properties.degree !== undefined ? properties.degree : 'N/A';
  const pagerankVal = properties.pagerank !== undefined ? properties.pagerank : 'N/A';
  const betweennessVal = properties.betweenness !== undefined ? properties.betweenness : 'N/A';
  const eigenvectorVal = properties.eigenvector !== undefined ? properties.eigenvector : 'N/A';

  // Parse provenance safely
  let provenanceData: any = null;
  if (properties.provenance) {
    try {
      const provStr = typeof properties.provenance === 'string'
        ? properties.provenance.replace(/'/g, '"')
        : JSON.stringify(properties.provenance);
      provenanceData = JSON.parse(provStr);
    } catch (e) {
      provenanceData = { raw: properties.provenance };
    }
  }

  // Parse states if any (for patterns)
  let statesList: string[] = [];
  if (properties.states) {
    if (Array.isArray(properties.states)) {
      statesList = properties.states;
    } else if (typeof properties.states === 'string') {
      statesList = properties.states.split(', ');
    }
  }

  return (
    <div className="w-80 glassmorphism rounded-xl flex flex-col border-t-4 border-blue-500 overflow-hidden shrink-0">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex flex-col">
          <h3 className="text-md font-bold text-white">Node Inspector</h3>
          <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">{nodeLabel}</span>
        </div>
        <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
        <div className="space-y-1">
          <span className="text-gray-400 text-xs uppercase font-semibold">Node ID / Name</span>
          <p className="text-gray-200 text-sm font-bold break-all">{properties.name || nodeId}</p>
        </div>

        {properties.description && (
          <div className="space-y-1 bg-white/5 p-2.5 rounded-lg border border-white/5">
            <span className="text-gray-400 text-xs uppercase font-semibold">Description / Hypothesis</span>
            <p className="text-gray-300 text-xs italic">{properties.description}</p>
          </div>
        )}

        {properties.expression && (
          <div className="space-y-1 bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20">
            <span className="text-blue-400 text-xs uppercase font-semibold">Semantic Expression</span>
            <p className="text-blue-200 text-xs font-mono">{properties.expression}</p>
          </div>
        )}

        {statesList.length > 0 && (
          <div className="space-y-1">
            <span className="text-gray-400 text-xs uppercase font-semibold font-mono">Characterized States</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {statesList.map((st, i) => (
                <span key={i} className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                  {st}
                </span>
              ))}
            </div>
          </div>
        )}

        {properties.evidence_strength !== undefined && (
          <div className="space-y-1 mt-2">
            <span className="text-gray-400 text-xs uppercase font-semibold">Evidence Strength</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-green-500 h-full rounded-full" 
                  style={{ width: `${properties.evidence_strength}%` }}
                />
              </div>
              <span className="text-xs text-green-400 font-bold font-mono">{properties.evidence_strength}/100</span>
            </div>
          </div>
        )}

        {properties.risk_level && (
          <div className="space-y-1">
            <span className="text-gray-400 text-xs uppercase font-semibold">Risk Class</span>
            <p className="text-red-400 text-sm font-bold font-mono">{properties.risk_level} RISK</p>
          </div>
        )}

        <div className="border-t border-white/5 pt-3 mt-3">
          <span className="text-gray-400 text-xs uppercase font-semibold">Graph Centrality</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1.5 text-xs font-mono">
            <div>
              <span className="text-gray-500">Degree:</span> <span className="text-gray-300">{typeof degreeVal === 'number' ? degreeVal.toFixed(4) : degreeVal}</span>
            </div>
            <div>
              <span className="text-gray-500">PageRank:</span> <span className="text-gray-300">{typeof pagerankVal === 'number' ? pagerankVal.toFixed(4) : pagerankVal}</span>
            </div>
            <div>
              <span className="text-gray-500">Betweenness:</span> <span className="text-gray-300">{typeof betweennessVal === 'number' ? betweennessVal.toFixed(4) : betweennessVal}</span>
            </div>
            <div>
              <span className="text-gray-500">Eigenvector:</span> <span className="text-gray-300">{typeof eigenvectorVal === 'number' ? eigenvectorVal.toFixed(4) : eigenvectorVal}</span>
            </div>
          </div>
        </div>

        {/* SHOW PROVENANCE Button */}
        <div className="pt-3 border-t border-white/5 mt-3">
          <button
            onClick={handleShowProvenance}
            disabled={loadingProv}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 font-mono uppercase tracking-wider shadow-md"
          >
            {loadingProv ? 'Loading Provenance...' : showProvenance ? 'Hide Provenance' : 'Show Provenance'}
          </button>
        </div>

        {/* Provenance Details Section */}
        {showProvenance && provenanceDetails && (
          <div className="space-y-3 mt-4 pt-4 border-t border-emerald-500/30 bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/20 font-mono text-xs">
            <span className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider block mb-2">Provenance Trace</span>
            
            {/* Visual chain path */}
            <div className="flex flex-col gap-1.5 pl-2 border-l border-emerald-500/30 mb-4">
              {provenanceDetails.provenance_chain?.map((step: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1.5 text-gray-300">
                  <span className="text-[10px] text-emerald-500 font-bold">{idx + 1}.</span>
                  <span className="text-[10px] text-white font-semibold truncate max-w-[150px]">{step.name}</span>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded uppercase font-sans border border-emerald-500/30">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-gray-300 text-[11px]">
              <div className="flex justify-between border-b border-white/5 py-1">
                <span>Dataset:</span> <span className="text-white font-bold">{provenanceDetails.details?.dataset}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span>Community:</span> <span className="text-white font-bold">{provenanceDetails.details?.community}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span>Patients:</span> <span className="text-white font-bold">{provenanceDetails.details?.patients}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span>Support:</span> <span className="text-white font-bold">{provenanceDetails.details?.support}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span>Confidence:</span> <span className="text-white font-bold">{provenanceDetails.details?.confidence}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span>P-value:</span> <span className="text-emerald-400 font-bold">{provenanceDetails.details?.p_value}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Generated:</span> <span className="text-white">{provenanceDetails.details?.generated}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

