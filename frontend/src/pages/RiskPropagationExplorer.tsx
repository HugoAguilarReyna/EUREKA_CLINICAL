import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer';
import { AlertCircle, HelpCircle, Activity, Heart, ArrowRight } from 'lucide-react';

export const RiskPropagationExplorer = () => {
  const [data, setData] = useState<any>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  useEffect(() => {
    const fetchSankey = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/sankey/propagation`);
        setData(res.data || { nodes: [], links: [] });
      } catch (err) {
        console.error("Error loading sankey data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSankey();
  }, []);

  // Filter nodes by category
  const categories = ['Evidence', 'Rule', 'Hypothesis', 'Risk', 'Action'];
  const getNodesByCategory = (cat: string) => {
    return data.nodes
      .map((n: any, idx: number) => ({ ...n, index: idx }))
      .filter((n: any) => n.category === cat);
  };

  // Check if a link is active (connected to hovered node)
  const isLinkActive = (link: any) => {
    if (hoveredNode === null) return true;
    
    // Trace path
    const visited = new Set<number>([hoveredNode]);
    
    // Simple forward/backward propagation for highlighting
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of data.links) {
        if (visited.has(l.source) && !visited.has(l.target)) {
          visited.add(l.target);
          changed = true;
        }
        if (visited.has(l.target) && !visited.has(l.source)) {
          visited.add(l.source);
          changed = true;
        }
      }
    }
    
    return visited.has(link.source) && visited.has(link.target);
  };

  const isNodeActive = (nodeIdx: number) => {
    if (hoveredNode === null) return true;
    if (hoveredNode === nodeIdx) return true;
    
    const visited = new Set<number>([hoveredNode]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of data.links) {
        if (visited.has(l.source) && !visited.has(l.target)) {
          visited.add(l.target);
          changed = true;
        }
        if (visited.has(l.target) && !visited.has(l.source)) {
          visited.add(l.source);
          changed = true;
        }
      }
    }
    return visited.has(nodeIdx);
  };

  return (
    <PageContainer title="Clinical Risk & Evidence Propagation Flow">
      {loading ? (
        <div className="h-64 flex items-center justify-center text-blue-400 font-mono">Loading causal propagation flow...</div>
      ) : (
        <div className="space-y-6 h-full flex flex-col">
          <div className="glassmorphism p-6 rounded-xl border border-white/5">
            <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Causal Propagation Pipeline</h3>
            <p className="text-gray-300 text-sm">
              Hover over any node in the clinical decision pipeline below to trace the complete propagation chain from 
              **Statistical Evidence** to **Rule Activation**, **Pathophysiological Hypothesis**, **Risk Category**, and **Recommended Action**.
            </p>
          </div>

          {/* Causal columns list */}
          <div className="flex-1 min-h-[500px] grid grid-cols-5 gap-4 bg-surface/10 p-6 rounded-xl border border-white/5 overflow-x-auto">
            {categories.map((cat) => (
              <div key={cat} className="flex flex-col gap-4 min-w-[200px]">
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{cat} Layer</span>
                  <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded font-mono font-bold">
                    {getNodesByCategory(cat).length}
                  </span>
                </div>

                <div className="flex-grow space-y-3 overflow-y-auto max-h-[550px] pr-1">
                  {getNodesByCategory(cat).map((n: any) => {
                    const active = isNodeActive(n.index);
                    const isHovered = hoveredNode === n.index;

                    // Compute node colors
                    let borderClass = 'border-white/5 bg-white/5';
                    if (active) {
                      if (cat === 'Evidence') borderClass = 'border-slate-500 bg-slate-500/10 text-slate-200';
                      if (cat === 'Rule') borderClass = 'border-blue-500 bg-blue-500/10 text-blue-200';
                      if (cat === 'Hypothesis') borderClass = 'border-cyan-500 bg-cyan-500/10 text-cyan-200';
                      if (cat === 'Risk') borderClass = 'border-red-500 bg-red-500/10 text-red-200';
                      if (cat === 'Action') borderClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-200';
                    }

                    return (
                      <div
                        key={n.index}
                        onMouseEnter={() => setHoveredNode(n.index)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all duration-300 ${borderClass} ${isHovered ? 'scale-105 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''} ${!active ? 'opacity-25' : ''}`}
                      >
                        <div className="font-bold flex justify-between items-start gap-2 break-words">
                          <span>{n.name}</span>
                        </div>
                        {cat === 'Evidence' && (
                          <div className="mt-2 text-[10px] text-gray-400 font-mono border-t border-white/5 pt-1">
                            Strength Score: <span className="text-green-400 font-bold">{n.value || 90}/100</span>
                          </div>
                        )}
                        {cat === 'Rule' && (
                          <div className="mt-1 text-[10px] font-mono text-blue-400 font-semibold">
                            Activated ruleset
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Links details list at bottom */}
          <div className="glassmorphism p-4 rounded-xl border border-white/5 text-xs text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Activity size={14} className="text-blue-400" /> Interactive Causal Flow Active</span>
            <span className="font-mono text-[10px]">EUREKA Multiverse Decision Pipeline v2.0</span>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
