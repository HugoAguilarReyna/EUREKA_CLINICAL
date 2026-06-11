import { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useExplainability } from '../hooks';
import { Search, Share2, ShieldAlert, FileText, CheckCircle, AlertTriangle, ArrowRight, Activity } from 'lucide-react';

export const ExplainabilityPage = () => {
  const [queryId, setQueryId] = useState<string>('Patient_5');
  const [searchVal, setSearchVal] = useState<string>('Patient_5');
  const { data, isLoading, error } = useExplainability(queryId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryId(searchVal);
  };

  const isPatient = !!data && ('patient_id' in data || 'clinical_narrative' in data);

  return (
    <PageContainer title="Explainability Explorer">
      <div className="max-w-5xl mx-auto space-y-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Enter Patient ID (e.g. Patient_5) or Case ID..."
            className="flex-1 bg-surface/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors text-white">
            <Search size={18} />
            Explain
          </button>
        </form>

        {isLoading && <div className="text-center py-12 text-gray-400">Traversing knowledge paths and clinical states...</div>}
        
        {error && (
          <div className="glassmorphism p-6 rounded-xl border border-red-500/30 text-red-400 flex items-center gap-4">
            <ShieldAlert />
            <p>No explainability data found for ID: {queryId}</p>
          </div>
        )}

        {data && isPatient && (
          <div className="space-y-6">
            {/* Top Patient Summary Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glassmorphism p-6 rounded-xl border border-white/5 md:col-span-2">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">Patient Profile</span>
                    <h2 className="text-2xl font-bold text-white mt-1">{data.patient_id}</h2>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-300">
                    <div className="bg-white/5 px-3 py-1 rounded">
                      <span className="text-gray-400">Age:</span> <strong className="text-white">{data.age}</strong>
                    </div>
                    <div className="bg-white/5 px-3 py-1 rounded">
                      <span className="text-gray-400">Gender:</span> <strong className="text-white">{data.gender}</strong>
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2">
                      <FileText size={16} className="text-blue-400" />
                      Resumen Narrativo Clínico
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{data.clinical_narrative}</p>
                  </div>
                  
                  {data.clinical_interpretation && (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-mono">Impacto Clínico</span>
                      <p className="text-gray-300 text-sm mt-0.5 font-medium">{data.clinical_interpretation}</p>
                    </div>
                  )}

                  {data.suggested_next_investigation && (
                    <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block font-mono">Siguiente Investigación Sugerida</span>
                      <p className="text-gray-200 text-sm mt-0.5 font-semibold">{data.suggested_next_investigation}</p>
                    </div>
                  )}

                  {data.similar_patients && data.similar_patients.length > 0 && (
                    <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                      <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block font-mono">Pacientes Similares Identificados (Neo4j)</span>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {data.similar_patients.map((pid: string) => (
                          <span key={pid} className="bg-white/5 text-gray-300 border border-white/5 text-xs px-2 py-0.5 rounded font-mono">
                            {pid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Classification Badge Card */}
              <div className={`glassmorphism p-6 rounded-xl border ${
                data.classification === 'Liver Disease' 
                  ? 'border-red-500/30 bg-red-500/5' 
                  : 'border-emerald-500/30 bg-emerald-500/5'
              } flex flex-col justify-between`}>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">Prediction Outcome</span>
                  <div className="flex items-center gap-2 mt-2">
                    {data.classification === 'Liver Disease' ? (
                      <>
                        <AlertTriangle className="text-red-400" size={24} />
                        <span className="text-xl font-bold text-red-400">Liver Disease</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="text-emerald-400" size={24} />
                        <span className="text-xl font-bold text-emerald-400">Healthy</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-400">Confidence Score:</span>
                    <span className={`font-bold ${data.classification === 'Liver Disease' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {(data.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        data.classification === 'Liver Disease' ? 'bg-red-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${data.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contributing Lab Factors */}
            <div className="glassmorphism p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                Contributing Laboratory Factors ({data.factor_count})
              </h3>
              
              {data.contributing_factors.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No abnormal clinical states or outliers were activated for this patient.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="p-3 rounded-l">Metric</th>
                        <th className="p-3">Measured Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Reference Threshold</th>
                        <th className="p-3">Disease Association</th>
                        <th className="p-3 rounded-r">Clinical Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.contributing_factors.map((factor: any, i: number) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-semibold text-white">{factor.display_name} ({factor.variable})</td>
                          <td className="p-3 text-blue-300 font-medium">
                            {factor.value} {factor.unit}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              factor.status === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {factor.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-400">
                            {factor.status === 'High' ? '>' : '<'} {factor.threshold} {factor.unit}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-400">{factor.disease_rate_pct}</span>
                              <span className="text-xs text-gray-500">({factor.sample_count} cases)</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-gray-400 italic max-w-xs">{factor.clinical_context}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Next Steps & Caveats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glassmorphism p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ArrowRight size={18} className="text-emerald-400" />
                  Recommended Next Steps
                </h3>
                <ul className="space-y-3">
                  {data.next_steps.map((step: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glassmorphism p-6 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} />
                  Clinical Caveats & Disclaimers
                </h3>
                <ul className="space-y-3 list-disc list-inside text-xs text-gray-400">
                  {data.caveats.map((caveat: string, i: number) => (
                    <li key={i} className="leading-relaxed">{caveat}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {data && !isPatient && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="glassmorphism p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-4 text-emerald-400 flex items-center gap-2">
                  <Share2 /> Narrative
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {data.narrative}
                </p>
              </div>
              <div className="glassmorphism p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-4 text-orange-400">Decision Points</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
                  {data.decision_points?.map((dp: string, i: number) => (
                    <li key={i}>{dp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="md:col-span-2 glassmorphism p-6 rounded-xl">
              <h3 className="font-semibold text-lg mb-6">Execution Path</h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {data.nodes?.map((node: any, i: number) => (
                  <div key={node.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-gray-800 text-gray-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {i + 1}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-white/5 shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-sm ${node.label === 'Case' ? 'text-emerald-400' : node.label === 'KnowledgeAsset' ? 'text-blue-400' : 'text-orange-400'}`}>{node.label}</span>
                      </div>
                      <div className="text-gray-200 font-medium">{node.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
