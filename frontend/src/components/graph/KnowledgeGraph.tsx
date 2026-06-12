import { useEffect, useState } from 'react';
import axios from 'axios';
import { ForceDirectedGraph } from './ForceDirectedGraph';
import { GraphNode, GraphEdge } from '../../types/graph';
import { FileText, AlertTriangle, ChevronRight, ChevronLeft, Activity, Database, Zap } from 'lucide-react';

interface KnowledgeGraphProps {
  level: number;
  communityId: string | null;
  entityType?: string | null;
  entityId?: string | null;
  depth?: number;
  visualMode: string;
}

export const KnowledgeGraph = ({ 
  level, 
  communityId, 
  entityType, 
  entityId, 
  depth = 1, 
  visualMode 
}: KnowledgeGraphProps) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${import.meta.env.VITE_API_URL}/knowledge/semantic/graph?level=${level}&aggregation=true&max_nodes=500&max_edges=2000`;
        
        if (level === 3) {
          if (entityId && entityType) {
            url += `&entity_type=${entityType}&entity_id=${entityId}&depth=${depth}`;
          } else {
            setNodes([]);
            setEdges([]);
            setLoading(false);
            return;
          }
        } else if (communityId) {
          url += `&community_id=${communityId}`;
        }

        const res = await axios.get(url);
        
        setMetadata(res.data.metadata || null);
        
        if (res.data.error) {
          setError(res.data.error || "Graph failed to load.");
          setNodes([]);
          setEdges([]);
        } else {
          setNodes(res.data.nodes || []);
          setEdges(res.data.edges || []);
        }
      } catch (err) {
        console.error("Error fetching semantic graph:", err);
        setError("Unable To Load Graph");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGraph();
  }, [level, communityId, entityType, entityId, depth]);

  // Epic 10.0A: Dynamic Node Expansion Merge Logic
  const handleNodeExpand = async (nodeId: string) => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/knowledge/semantic/graph/expand?node_id=${nodeId}&depth=1`;
      const res = await axios.get(url);
      
      if (res.data.warning || res.data.metadata?.warning) {
        setError("Rendering Limits Exceeded");
        return;
      }
      
      const newNodes = res.data.nodes || [];
      const newEdges = res.data.edges || [];
      
      setNodes((prevNodes) => {
        const existingIds = new Set(prevNodes.map(n => n.id));
        const filteredNew = newNodes.filter((n: any) => !existingIds.has(n.id));
        const merged = [...prevNodes, ...filteredNew];
        if (merged.length > 800) {
          setError("Rendering Limits Exceeded");
          return prevNodes;
        }
        return merged;
      });
      
      setEdges((prevEdges) => {
        const existingKeys = new Set(prevEdges.map(e => `${e.src_id}-${e.dst_id}-${e.relationship_type}`));
        const filteredNew = newEdges.filter((e: any) => !existingKeys.has(`${e.src_id}-${e.dst_id}-${e.relationship_type}`));
        const merged = [...prevEdges, ...filteredNew];
        if (merged.length > 1500) {
          setError("Rendering Limits Exceeded");
          return prevEdges;
        }
        return merged;
      });
      
    } catch (err) {
      console.error("Error expanding node:", err);
    }
  };

  // Epic 10.0A: Dynamic Node Collapse Logic
  const handleNodeCollapse = (nodeId: string) => {
    // Find all nodes directly connected to the target node
    const neighbors = new Set(
      edges
        .filter(e => e.src_id === nodeId || e.dst_id === nodeId)
        .map(e => (e.src_id === nodeId ? e.dst_id : e.src_id))
    );
    
    // Remove neighbors from nodes (unless they are the root entity)
    setNodes((prevNodes) => prevNodes.filter(n => n.id === nodeId || !neighbors.has(n.id) || n.id === entityId));
    setEdges((prevEdges) => prevEdges.filter(e => e.src_id !== nodeId && e.dst_id !== nodeId));
  };

  // Level 3 empty state: Selection required
  if (level === 3 && !entityId) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm z-10 p-6 text-center">
        <FileText className="w-12 h-12 text-blue-500/80 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-white mb-1">Progressive Investigation Graph (L3)</h3>
        <p className="text-sm text-gray-400 max-w-md">
          Seleccione una entidad para comenzar la investigación.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-blue-400 font-mono tracking-wider">Loading Knowledge Graph 2.0...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isRenderLimit = error === "Rendering Limits Exceeded";
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm z-50 p-6 text-center text-red-400">
        <AlertTriangle className="w-12 h-12 text-red-500/80 mb-3" />
        <h3 className="text-lg font-bold mb-1">{isRenderLimit ? "Rendering Limits Exceeded" : "Unable To Load Graph"}</h3>
        <p className="text-sm text-gray-400 max-w-md mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setNodes([]);
            setEdges([]);
          }}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs rounded-lg transition-all font-semibold"
        >
          Reset View
        </button>
      </div>
    );
  }

  if (!loading && !error && nodes.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm z-10 p-6 text-center">
        <FileText className="w-12 h-12 text-gray-500/80 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">No Graph Data Found</h3>
        <p className="text-sm text-gray-400 max-w-md">
          The selected entity does not have a semantic graph representation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Graph Statistics Sidebar */}
      <div 
        className={`absolute top-0 left-0 h-full glassmorphism border-r border-white/10 transition-all duration-300 z-20 flex flex-col ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Graph Statistics
          </h3>
        </div>
        
        {sidebarOpen && metadata && (
          <div className="p-4 space-y-4 overflow-y-auto">
            {metadata.truncated && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle size={14} />
                  Graph Truncated For Performance
                </div>
                <p className="text-gray-300 text-[10px]">
                  Graph exceeded safety limits. 
                  Reason: {metadata.reason || 'Payload size limit'}.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Nodes</span>
                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{metadata.node_count || nodes.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Edges</span>
                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{metadata.edge_count || edges.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Communities</span>
                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{metadata.community_count || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Density</span>
                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{metadata.density || 0}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Payload Size</span>
                <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                  <Database size={12} />
                  {metadata.payload_size_mb ? `${metadata.payload_size_mb} MB` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Aggregation</span>
                <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1 ${metadata.aggregation_enabled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  <Zap size={12} />
                  {metadata.aggregation_enabled ? 'TACTICAL' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute top-4 z-30 bg-surface border border-white/10 text-gray-400 hover:text-white p-1.5 rounded-r-lg shadow-lg transition-all duration-300 ${
          sidebarOpen ? 'left-64' : 'left-0'
        }`}
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className="flex-1 relative">
        <ForceDirectedGraph 
          nodes={nodes} 
          edges={edges} 
          visualMode={visualMode} 
          onExpand={handleNodeExpand}
          onCollapse={handleNodeCollapse}
        />
      
      {/* Dynamic Graph Legend based on Visual Mode */}
      <div className="absolute bottom-6 right-6 glassmorphism p-4 rounded-xl text-xs z-10 space-y-2 border border-white/5 shadow-2xl">
        <h4 className="font-bold text-white uppercase tracking-wider text-[10px] mb-2 border-b border-white/10 pb-1">Legend</h4>
        <div className="space-y-1.5 font-semibold text-gray-300">
          {level === 1 && (
            <>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Community (Cohort)</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span> Pattern</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span> Hypothesis</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> Rule</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span> Risk</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Action</div>
            </>
          )}
          {level === 2 && (
            <>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]"></span> Patient</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span> Semantic State</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> Rule</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span> Hypothesis</div>
            </>
          )}
          {level === 3 && (
            <>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]"></span> Patient</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]"></span> Variable</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span> Semantic State</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Community</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span> Pattern</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span> Hypothesis</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> Rule</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span> Risk</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Action</div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
