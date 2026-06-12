import { useEffect, useState } from 'react';
import axios from 'axios';
import { ForceDirectedGraph } from './ForceDirectedGraph';
import { GraphNode, GraphEdge } from '../../types/graph';
import { FileText, AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${import.meta.env.VITE_API_URL}/knowledge/semantic/graph?level=${level}`;
        
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
        
        if (res.data.warning || res.data.metadata?.warning) {
          setError(res.data.message || "Graph exceeds rendering threshold.");
          setNodes([]);
          setEdges([]);
        } else {
          setNodes(res.data.nodes || []);
          setEdges(res.data.edges || []);
        }
      } catch (err) {
        console.error("Error fetching semantic graph:", err);
        setError("Error loading semantic graph data. Make sure backend is running.");
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
        setError(res.data.message || "Graph exceeds rendering threshold.");
        return;
      }
      
      const newNodes = res.data.nodes || [];
      const newEdges = res.data.edges || [];
      
      setNodes((prevNodes) => {
        const existingIds = new Set(prevNodes.map(n => n.id));
        const filteredNew = newNodes.filter((n: any) => !existingIds.has(n.id));
        const merged = [...prevNodes, ...filteredNew];
        if (merged.length > 800) {
          setError("Graph exceeds rendering threshold (800 nodes).");
          return prevNodes;
        }
        return merged;
      });
      
      setEdges((prevEdges) => {
        const existingKeys = new Set(prevEdges.map(e => `${e.src_id}-${e.dst_id}-${e.relationship_type}`));
        const filteredNew = newEdges.filter((e: any) => !existingKeys.has(`${e.src_id}-${e.dst_id}-${e.relationship_type}`));
        const merged = [...prevEdges, ...filteredNew];
        if (merged.length > 1500) {
          setError("Graph exceeds rendering threshold (1500 edges).");
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
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm z-50 p-6 text-center text-red-400">
        <AlertTriangle className="w-12 h-12 text-red-500/80 mb-3" />
        <h3 className="text-lg font-bold mb-1">Rendering Limits Exceeded</h3>
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

  return (
    <>
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
    </>
  );
};
