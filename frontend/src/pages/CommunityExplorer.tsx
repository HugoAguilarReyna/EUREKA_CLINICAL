import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer';
import { Users, AlertTriangle, ShieldCheck, Database, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommunityExplorer = () => {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await axios.get('http://localhost:8001/knowledge/cohorts/communities');
        setCommunities(res.data || []);
      } catch (err) {
        console.error("Error fetching communities:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/30"><AlertTriangle size={12}/> HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/30"><AlertTriangle size={12}/> MEDIUM RISK</span>;
      default:
        return <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded border border-green-500/30"><ShieldCheck size={12}/> LOW RISK</span>;
    }
  };

  return (
    <PageContainer title="Clinical Cohorts (Louvain Communities)">
      {loading ? (
        <div className="h-64 flex items-center justify-center text-blue-400 font-mono">Loading cohort profiles...</div>
      ) : (
        <div className="space-y-6">
          <div className="glassmorphism p-6 rounded-xl border border-white/5">
            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Cohort Summary</h3>
            <p className="text-gray-300 text-sm">
              Emergent cohorts are discovered by constructing an in-memory patient similarity network and partitioning 
              using the **Louvain clustering algorithm**. Each community represents a distinct clinical phenotype.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((c) => (
              <div key={c.community_id} className="glassmorphism rounded-xl border border-white/5 hover:border-blue-500/35 transition-all flex flex-col overflow-hidden">
                <div className="p-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{c.community_id}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">{c.size} patients in cohort</span>
                    </div>
                  </div>
                  {getRiskBadge(c.dominant_risk)}
                </div>

                <div className="p-5 flex-1 space-y-4 text-xs">
                  {/* Pattern states */}
                  <div>
                    <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Clinical Profile:</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.top_states.map((st: string) => (
                        <span key={st} className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-semibold font-mono">
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rules activated */}
                  <div>
                    <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Activated Rules:</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.top_rules.map((rid: string) => (
                        <span key={rid} className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                          {rid}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Provenance */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1 text-[10px] font-mono text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Database size={12} className="text-emerald-400" />
                      <span>Dataset: {c.provenance.dataset_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-blue-400" />
                      <span>Generated: {new Date(c.provenance.generation_timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => navigate(`/graph?level=2&community_id=${c.community_id}`)}
                    className="flex-1 text-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs py-2 rounded-lg border border-blue-500/30 font-bold transition-all"
                  >
                    Clinical Graph (L2)
                  </button>
                  <button 
                    onClick={() => navigate(`/graph?level=3&community_id=${c.community_id}`)}
                    className="flex-1 text-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs py-2 rounded-lg border border-purple-500/30 font-bold transition-all"
                  >
                    Forensic Graph (L3)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
};
