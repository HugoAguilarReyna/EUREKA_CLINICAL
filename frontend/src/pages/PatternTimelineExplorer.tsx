import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer';
import { GitCommit, GitPullRequest, GitBranch, Calendar, Database } from 'lucide-react';

export const PatternTimelineExplorer = () => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/patterns/timeline`);
        setTimeline(res.data || []);
      } catch (err) {
        console.error("Error loading patterns timeline:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  // Group patterns by base_id
  const getPatternGroups = () => {
    const groups: Record<string, any[]> = {};
    timeline.forEach((p) => {
      const bid = p.base_id;
      if (!groups[bid]) groups[bid] = [];
      groups[bid].push(p);
    });
    // Sort versions inside each group
    Object.keys(groups).forEach((bid) => {
      groups[bid].sort((a, b) => b.version - a.version); // newest first
    });
    return groups;
  };

  const groups = getPatternGroups();

  return (
    <PageContainer title="Clinical Pattern Evolution (Git for Knowledge)">
      {loading ? (
        <div className="h-64 flex items-center justify-center text-blue-400 font-mono">Loading pattern timeline...</div>
      ) : timeline.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          No patterns registered in timeline. Snapshot database might be empty.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glassmorphism p-6 rounded-xl border border-white/5">
            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Inter-temporal Pattern Lineage</h3>
            <p className="text-gray-300 text-sm">
              As datasets are registered over time, EUREKA tracks how clinical profiles evolve. 
              Below is the commit-like version history of clinical cohorts linked by `EVOLVED_TO` relationships.
            </p>
          </div>

          <div className="space-y-8">
            {Object.keys(groups).map((baseId) => (
              <div key={baseId} className="glassmorphism p-6 rounded-xl border border-white/5 space-y-6">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <GitBranch size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Clinical Pattern: {baseId}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">Total iterations: {groups[baseId].length}</span>
                  </div>
                </div>

                {/* Timeline vertical line */}
                <div className="relative pl-8 space-y-6 border-l border-white/10 ml-4">
                  {groups[baseId].map((p, idx) => (
                    <div key={p.pattern_id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[41px] top-1.5 bg-surface border border-purple-500 w-5 h-5 rounded-full flex items-center justify-center text-purple-400 z-10">
                        {idx === 0 ? <GitPullRequest size={10} /> : <GitCommit size={10} />}
                      </span>

                      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                          <div>
                            <span className="text-[10px] font-bold font-mono uppercase bg-purple-500/25 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                              Version {p.version}
                            </span>
                            <h5 className="font-bold text-white text-xs font-mono mt-1.5">{p.pattern_id}</h5>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(p.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Database size={12} /> {p.dataset_id}</span>
                          </div>
                        </div>

                        {/* Mapped States */}
                        <div className="space-y-1">
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Pattern States:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.states.map((st: string) => (
                              <span key={st} className="bg-white/5 text-gray-300 px-2 py-0.5 rounded border border-white/5 font-mono text-[10px]">
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Lineage */}
                        {p.evolved_from && (
                          <div className="text-[10px] font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded border border-white/5 w-fit">
                            <span className="text-orange-400">Evolved from:</span> {p.evolved_from}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
};
