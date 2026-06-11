import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { GraphNode, GraphEdge } from '../../types/graph';
import { useGraphStore } from '../../store/useGraphStore';
import { Maximize2, Minimize2, Eye, GitPullRequest, FileText } from 'lucide-react';

interface ForceDirectedGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  visualMode: string; // 'normal' | 'community' | 'similarity' | 'centrality' | 'semantic'
  onExpand?: (nodeId: string) => void;
  onCollapse?: (nodeId: string) => void;
}

export const ForceDirectedGraph = ({ 
  nodes, 
  edges, 
  visualMode, 
  onExpand, 
  onCollapse 
}: ForceDirectedGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const svgRef = useRef<any>(null);
  const navigate = useNavigate();
  const { setSelectedNode, setSelectedAsset, setSelectedCase } = useGraphStore();

  // Epic 10.0A: Context Menu and Highlights state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: any;
  } | null>(null);

  const [highlightedNodes, setHighlightedNodes] = useState<Set<string> | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string> | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleExpandClick = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    setContextMenu(null);
    if (onExpand) {
      onExpand(node.id);
    }
  };

  const handleCollapseClick = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    setContextMenu(null);
    if (onCollapse) {
      onCollapse(node.id);
    }
  };

  const handleCenterViewClick = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    setContextMenu(null);
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    svgRef.current.transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.5)
          .translate(-node.x, -node.y)
      );
  };

  const handleTraceEvidenceClick = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    setContextMenu(null);
    
    const relatedNodeIds = new Set<string>([node.id]);
    const relatedEdgeKeys = new Set<string>();
    
    edges.forEach(edge => {
      if (edge.src_id === node.id || edge.dst_id === node.id) {
        relatedNodeIds.add(edge.src_id);
        relatedNodeIds.add(edge.dst_id);
        relatedEdgeKeys.add(`${edge.src_id}-${edge.dst_id}-${edge.relationship_type}`);
      }
    });
    
    setHighlightedNodes(relatedNodeIds);
    setHighlightedEdges(relatedEdgeKeys);
  };

  const handleOpenExplainabilityClick = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    setContextMenu(null);
    navigate('/explain-v2');
  };

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const MAX_RENDER_NODES = 500;
    const MAX_RENDER_EDGES = 1000;

    // Filter nodes/edges based on visualMode
    let renderNodes = nodes.slice(0, MAX_RENDER_NODES);
    let renderEdges = edges.slice(0, MAX_RENDER_EDGES);

    if (visualMode === 'semantic') {
      renderNodes = renderNodes.filter(n => n.label !== 'Variable');
    }

    const validNodeIds = new Set(renderNodes.map(n => n.id));
    renderEdges = renderEdges.filter(e => validNodeIds.has(e.src_id) && validNodeIds.has(e.dst_id));

    // Clear previous elements
    d3.select(containerRef.current).selectAll('*').remove();

    if (nodes.length > MAX_RENDER_NODES) {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-2 rounded shadow-lg backdrop-blur text-sm z-50';
      warningDiv.textContent = `Showing first ${MAX_RENDER_NODES} nodes for performance (Total: ${nodes.length})`;
      containerRef.current.appendChild(warningDiv);
    }

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    svgRef.current = svg;

    const g = svg.append('g');

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    const mappedEdges = renderEdges.map(e => ({ ...e, source: e.src_id, target: e.dst_id }));

    // Setup D3 Force Simulation
    const simulation = d3.forceSimulation(renderNodes as any)
      .force('link', d3.forceLink(mappedEdges).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(35));

    // Setup SVG filters for glow effect
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const communityColors = d3.scaleOrdinal(d3.schemeCategory10);

    const getNodeRadius = (d: any) => {
      if (visualMode === 'centrality') {
        const score = d.properties?.pagerank || d.properties?.degree || 0;
        return 6 + score * 120;
      }
      
      switch (d.label) {
        case 'Community': return 16;
        case 'Pattern': return 13;
        case 'Hypothesis': return 13;
        case 'Risk': return 15;
        case 'Action': return 10;
        case 'Rule': return 10;
        case 'Patient': return 8;
        case 'SemanticState': return 7;
        case 'Variable': return 5;
        default: return 8;
      }
    };

    const getNodeColor = (d: any) => {
      if (visualMode === 'community') {
        if (d.label === 'Community') {
          return communityColors(d.id);
        }
        if (d.label === 'Patient') {
          const memberEdge = edges.find(e => e.relationship_type === 'MEMBER_OF' && e.src_id === d.id);
          if (memberEdge) {
            return communityColors(memberEdge.dst_id);
          }
        }
      }

      switch (d.label) {
        case 'Patient': return '#ec4899';       // Pink
        case 'Community': return '#f59e0b';     // Amber
        case 'Pattern': return '#a855f7';       // Purple
        case 'Hypothesis': return '#06b6d4';    // Cyan
        case 'Rule': return '#3b82f6';          // Blue
        case 'Evidence': return '#64748b';      // Slate
        case 'Risk': return '#ef4444';          // Red
        case 'Action': return '#10b981';        // Emerald
        case 'SemanticState': return '#f43f5e'; // Rose
        case 'Variable': return '#6366f1';      // Indigo
        default: return '#9CA3AF';
      }
    };

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(mappedEdges)
      .join('line')
      .attr('stroke', (d: any) => {
        if (d.relationship_type === 'SIMILAR_TO') return '#10b981';
        if (d.relationship_type === 'EVOLVED_TO') return '#f59e0b';
        return 'rgba(100,149,237,0.35)';
      })
      .attr('stroke-width', (d: any) => {
        if (d.relationship_type === 'SIMILAR_TO' || d.relationship_type === 'EVOLVED_TO') return 2.5;
        return 1.5;
      })
      .attr('stroke-dasharray', (d: any) => {
        if (d.relationship_type === 'SIMILAR_TO') return '1, 1';
        if (d.relationship_type === 'EVOLVED_TO') return '4, 2';
        return '4, 4';
      })
      .attr('opacity', (d: any) => {
        if (highlightedEdges) {
          const key = `${d.src_id}-${d.dst_id}-${d.relationship_type}`;
          return highlightedEdges.has(key) ? 1.0 : 0.05;
        }
        if (visualMode === 'similarity') {
          return d.relationship_type === 'SIMILAR_TO' ? 1.0 : 0.05;
        }
        return 1.0;
      });

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(renderNodes)
      .join('circle')
      .attr('r', getNodeRadius)
      .attr('fill', getNodeColor)
      .attr('stroke', 'rgba(255,255,255,0.75)')
      .attr('stroke-width', (d: any) => {
        if (d.label === 'Community' || d.label === 'Risk') return 2.5;
        return 1.2;
      })
      .attr('filter', (d: any) => {
        const pr = d.properties?.pagerank || 0;
        return pr > 0.05 || d.label === 'Community' || d.label === 'Risk' ? 'url(#glow)' : null;
      })
      .attr('opacity', (d: any) => {
        if (highlightedNodes) {
          return highlightedNodes.has(d.id) ? 1.0 : 0.15;
        }
        if (visualMode === 'similarity') {
          return d.label === 'Patient' ? 1.0 : 0.08;
        }
        return 1.0;
      })
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    node.on('click', (event, d) => {
      setSelectedNode(d);
      if (d.label === 'KnowledgeAsset') setSelectedAsset(d.id);
      if (d.label === 'Case' || d.label === 'Patient') setSelectedCase(d.id);
    });

    node.on('contextmenu', (event, d) => {
      event.preventDefault();
      event.stopPropagation();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setContextMenu({
        visible: true,
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
        node: d
      });
    });

    // Add labels
    const labels = g.append('g')
      .selectAll('text')
      .data(renderNodes)
      .join('text')
      .text((d: any) => d.properties?.name || d.id)
      .attr('font-size', '9px')
      .attr('font-weight', (d: any) => (d.label === 'Community' || d.label === 'Risk' ? 'bold' : 'normal'))
      .attr('fill', '#fff')
      .attr('dx', (d: any) => getNodeRadius(d) + 5)
      .attr('dy', 3)
      .attr('opacity', (d: any) => {
        if (highlightedNodes) {
          return highlightedNodes.has(d.id) ? 1.0 : 0.15;
        }
        if (visualMode === 'similarity') {
          return d.label === 'Patient' ? 1.0 : 0.08;
        }
        return 0.9;
      });

    // Tooltips
    node.append('title')
      .text((d: any) => {
        const name = d.properties?.name || d.id;
        const info = [
          `Name: ${name}`,
          `Type: ${d.label}`
        ];
        if (d.properties?.evidence_strength !== undefined) {
          info.push(`Strength: ${d.properties.evidence_strength}/100`);
        }
        if (d.properties?.pagerank !== undefined) {
          info.push(`PageRank: ${d.properties.pagerank.toFixed(4)}`);
        }
        if (d.properties?.degree !== undefined) {
          info.push(`Degree Centrality: ${d.properties.degree.toFixed(4)}`);
        }
        return info.join('\n');
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
        
      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, visualMode, highlightedNodes, highlightedEdges]);

  return (
    <div ref={containerRef} className="w-full h-full bg-surface/20 relative">
      {/* Epic 10.0A: Glassmorphism Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div 
          className="absolute glassmorphism border border-white/10 rounded-xl py-2 px-1 w-52 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={(e) => handleExpandClick(e, contextMenu.node)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-blue-500 hover:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Maximize2 size={13} className="text-blue-400" />
            Expand Neighborhood
          </button>
          
          <button 
            onClick={(e) => handleCollapseClick(e, contextMenu.node)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-blue-500 hover:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Minimize2 size={13} className="text-yellow-400" />
            Collapse Node
          </button>
          
          <button 
            onClick={(e) => handleCenterViewClick(e, contextMenu.node)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-blue-500 hover:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Eye size={13} className="text-green-400" />
            Center View
          </button>
          
          <button 
            onClick={(e) => handleTraceEvidenceClick(e, contextMenu.node)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-blue-500 hover:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <GitPullRequest size={13} className="text-purple-400" />
            Trace Evidence
          </button>
          
          <button 
            onClick={(e) => handleOpenExplainabilityClick(e, contextMenu.node)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-blue-500 hover:text-white rounded-lg transition-colors flex items-center gap-2 border-t border-white/5 mt-1 pt-2"
          >
            <FileText size={13} className="text-cyan-400" />
            Open Explainability
          </button>
        </div>
      )}
    </div>
  );
};
