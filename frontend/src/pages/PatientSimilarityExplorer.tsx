import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer';
import { User, Activity, AlertCircle, CheckCircle } from 'lucide-react';

export const PatientSimilarityExplorer = () => {
  const [patients, setPatients] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    // Fetch patient list
    const fetchPatients = async () => {
      try {
        const res = await axios.get('http://localhost:8001/api/cases');
        // Retrieve patient IDs
        const ids = (res.data || []).map((c: any) => c.patient_id).filter(Boolean);
        setPatients(ids);
        if (ids.length > 0) {
          setSelectedPatient(ids[0]);
        }
      } catch (err) {
        console.error("Error fetching patients list:", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;
    const fetchSimilarity = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:8001/knowledge/cohorts/similarity/${selectedPatient}`);
        setNeighbors(res.data || []);
      } catch (err) {
        console.error("Error computing similarity:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSimilarity();
  }, [selectedPatient]);

  return (
    <PageContainer title="Patient Similarity Explorer (On-Demand)">
      <div className="space-y-6">
        {/* Selector Header */}
        <div className="glassmorphism p-6 rounded-xl border border-white/5 flex flex-wrap gap-6 items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-md font-bold text-white uppercase tracking-wider">Calculate Neighborhood Similarity</h3>
            <p className="text-gray-300 text-xs">
              Select a target patient to compute real-time Cosine and Jaccard similarity across the cohort.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-bold uppercase">Patient ID:</span>
            {loadingList ? (
              <span className="text-xs text-gray-500 font-mono">Loading...</span>
            ) : (
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="bg-surface/50 border border-white/10 text-white text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 font-bold cursor-pointer min-w-[180px]"
              >
                {patients.map((pid) => (
                  <option key={pid} value={pid}>{pid}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* neighbors list */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-blue-400 font-mono">
            Computing Cosine & Jaccard similarity matrices in real-time...
          </div>
        ) : neighbors.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No patient selected or no similar patients found.
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
              Top 20 Nearest Neighbors (Similarity Ranking)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {neighbors.map((n) => {
                const combinedPct = Math.round(n.score * 100);
                const jaccardPct = Math.round(n.jaccard * 100);
                const cosinePct = Math.round(n.cosine * 100);

                return (
                  <div key={n.patient_id} className="glassmorphism p-5 rounded-xl border border-white/5 flex gap-4 hover:border-white/10 transition-all">
                    {/* Visual avatar of patient */}
                    <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex flex-col items-center justify-center text-pink-400 shrink-0 border border-pink-500/20">
                      <User size={20} />
                      <span className="text-[9px] font-bold font-mono">ID</span>
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      {/* Name and overall score */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h5 className="font-bold text-white text-sm">{n.patient_id}</h5>
                          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Cohort Neighbor</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-blue-400 font-mono">{combinedPct}%</span>
                          <span className="text-[9px] text-gray-400 block font-mono">Match Score</span>
                        </div>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 gap-3 border-t border-b border-white/5 py-2.5 text-xs font-mono">
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase">Jaccard Sim:</span>
                          <span className="text-gray-300 font-bold">{jaccardPct}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase">Cosine Sim:</span>
                          <span className="text-gray-300 font-bold">{cosinePct}%</span>
                        </div>
                      </div>

                      {/* Shared states */}
                      <div>
                        <span className="text-gray-400 text-[9px] uppercase font-bold block mb-1">Shared Clinical States:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {n.shared_states.map((st: string) => (
                            <span key={st} className="text-[9px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/15 font-semibold">
                              {st}
                            </span>
                          ))}
                          {n.shared_states.length === 0 && (
                            <span className="text-[10px] text-gray-500 italic">No shared semantic states</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
