import { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTraceability } from '../hooks';
import { Search, GitBranch, ShieldAlert, FileText, Server } from 'lucide-react';

export const TraceabilityPage = () => {
  const [assetId, setAssetId] = useState<string>('Patient_5');
  const [queryId, setQueryId] = useState<string>('Patient_5');
  const { data, isLoading, error } = useTraceability(queryId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryId(assetId);
  };

  const isPatient = !!data && ('layers' in data || 'ascii_diagram' in data);

  return (
    <PageContainer title="Traceability Explorer">
      <div className="max-w-5xl mx-auto space-y-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            placeholder="Enter Patient ID (e.g. Patient_5) or Asset ID..."
            className="flex-1 bg-surface/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors text-white">
            <Search size={18} />
            Trace
          </button>
        </form>

        {isLoading && <div className="text-center py-12 text-gray-400">Tracing clinical inference path through layers...</div>}
        
        {error && (
          <div className="glassmorphism p-6 rounded-xl border border-red-500/30 text-red-400 flex items-center gap-4">
            <ShieldAlert />
            <p>Failed to fetch traceability path for ID: {queryId}</p>
          </div>
        )}

        {data && isPatient && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="glassmorphism p-6 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">Causal Traceability Chain</span>
                <h2 className="text-2xl font-bold text-white mt-1">{data.patient_id}</h2>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="bg-white/5 px-4 py-2 rounded">
                  <span className="text-gray-400 block text-xs">Prediction Outcome</span>
                  <strong className={`text-base ${data.classification === 'Liver Disease' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {data.classification} ({data.confidence_pct})
                  </strong>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded">
                  <span className="text-gray-400 block text-xs">Activated Path Stats</span>
                  <strong className="text-white text-base">
                    {data.summary.clinical_states_activated} states | {data.summary.source_measurements} variables
                  </strong>
                </div>
              </div>
            </div>

            {/* Narrative text */}
            <div className="glassmorphism p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                Causal Narrative
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{data.narrative}</p>
            </div>

            {/* 5 Layers of Causal Reasoning */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <GitBranch size={22} className="text-blue-400" />
                Knowledge Graph Inference Flow (5 Layers)
              </h3>

              {/* Layer 1: Source Data */}
              <div className="glassmorphism p-6 rounded-xl border border-white/5 relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">1</span>
                    Layer 1: Source Data
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">neo4j :Patient -&gt; :LaboratoryMetric</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.layers["1_source_data"]?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-lg">
                      <span className="text-gray-400 text-xs block">{item.display}</span>
                      <strong className="text-white text-lg block mt-1">{item.value}</strong>
                      <span className="text-[10px] text-gray-500 block mt-0.5">{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer 2: Interpretation */}
              <div className="glassmorphism p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">2</span>
                    Layer 2: Value Interpretation
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">Semantic Classifiers</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.layers["2_interpretation"]?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-lg">
                      <span className="text-gray-400 text-xs block">{item.display}</span>
                      <div className="flex justify-between items-center mt-1">
                        <strong className="text-white">{item.value}</strong>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          item.status === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                          item.status === 'LOW' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-1">{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer 3: Clinical States */}
              <div className="glassmorphism p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">3</span>
                    Layer 3: Clinical States Activated
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">neo4j :ClinicalState</span>
                </div>
                {data.layers["3_clinical_states"]?.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No clinical states activated.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.layers["3_clinical_states"]?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-lg flex justify-between items-start">
                        <div>
                          <strong className="text-white block">{item.display}</strong>
                          <span className="text-gray-400 text-xs block mt-1">
                            Measured: <strong className="text-blue-300">{item.value}</strong> (Threshold: {item.threshold})
                          </span>
                        </div>
                        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded font-semibold">
                          Active State
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Layer 4: Disease Associations */}
              <div className="glassmorphism p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold border border-pink-500/30">4</span>
                    Layer 4: Graph Statistics & Associations
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">Disease Correlation Weights</span>
                </div>
                {data.layers["4_associations"]?.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No disease associations triggered.</p>
                ) : (
                  <div className="space-y-4">
                    {data.layers["4_associations"]?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-lg flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <strong className="text-white text-sm block">{item.display} Association</strong>
                          <p className="text-xs text-gray-400 mt-1">{item.clinical_context}</p>
                        </div>
                        <div className="flex items-center gap-6 shrink-0 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs block">Disease Rate</span>
                            <span className="text-amber-400 font-bold">{item.disease_rate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs block">Correlation</span>
                            <span className="text-blue-400 font-mono font-semibold">{item.correlation.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Layer 5: Prediction */}
              <div className="glassmorphism p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">5</span>
                    Layer 5: Decision Node Ingestion
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">Final Classification</span>
                </div>
                {data.layers["5_prediction"]?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center w-full">
                    <div>
                      <span className="text-gray-400 text-xs block">Final Inference</span>
                      <strong className="text-emerald-400 text-xl block mt-0.5">{item.classification}</strong>
                      <span className="text-[10px] text-gray-500 block mt-1">{item.note}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-xs block">Confidence</span>
                      <strong className="text-emerald-400 text-2xl block mt-0.5">{item.confidence_pct}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ASCII Graph Representation */}
            <div className="glassmorphism p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server size={18} className="text-blue-400" />
                Structural Topology Trace (Cypher Path)
              </h3>
              <pre className="bg-gray-950 p-4 rounded-lg text-xs font-mono overflow-x-auto text-emerald-400 border border-white/5 leading-relaxed">
                {data.ascii_diagram}
              </pre>
            </div>
          </div>
        )}

        {data && !isPatient && (
          <div className="space-y-6">
            <div className="glassmorphism p-6 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 text-orange-400 flex items-center gap-2">
                <GitBranch size={20} /> Origins & Provenance ({data.origin_paths.length})
              </h3>
              {data.origin_paths.map((path: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 p-4 rounded-lg mb-4 overflow-x-auto">
                  {path.nodes.map((n: any, idx: number) => (
                    <div key={n.id} className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
                        {n.label}: {n.id}
                      </div>
                      {idx < path.nodes.length - 1 && <span className="text-gray-500">→</span>}
                    </div>
                  ))}
                </div>
              ))}
              {data.origin_paths.length === 0 && <span className="text-gray-500 text-sm">No origins found.</span>}
            </div>

            <div className="glassmorphism p-6 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 text-emerald-400 flex items-center gap-2">
                <GitBranch size={20} /> Downstream Usage ({data.usage_paths.length})
              </h3>
              {data.usage_paths.map((path: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 p-4 rounded-lg mb-4 overflow-x-auto">
                  {path.nodes.map((n: any, idx: number) => (
                    <div key={n.id} className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
                        {n.label}: {n.id}
                      </div>
                      {idx < path.nodes.length - 1 && <span className="text-gray-500">→</span>}
                    </div>
                  ))}
                </div>
              ))}
              {data.usage_paths.length === 0 && <span className="text-gray-500 text-sm">No downstream usage found.</span>}
            </div>

            <div className="glassmorphism p-6 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 text-orange-400 flex items-center gap-2">
                <GitBranch size={20} /> Governance Traces ({data.governance_paths.length})
              </h3>
              {data.governance_paths.map((path: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 p-4 rounded-lg mb-4 overflow-x-auto">
                  {path.nodes.map((n: any, idx: number) => (
                    <div key={n.id} className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-medium">
                        {n.label}: {n.id}
                      </div>
                      {idx < path.nodes.length - 1 && <span className="text-gray-500">→</span>}
                    </div>
                  ))}
                </div>
              ))}
              {data.governance_paths.length === 0 && <span className="text-gray-500 text-sm">No governance paths found.</span>}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
