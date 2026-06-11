import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { getMemory } from '../../api/client';
import { useStore } from '../../store/useStore';

export const AgentTraceGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const currentCaseId = useStore((state) => state.currentCaseId);
  
  const { data: memoryData } = useQuery({
    queryKey: ['memory', currentCaseId],
    queryFn: () => getMemory(currentCaseId!),
    enabled: !!currentCaseId,
  });

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 200;

    const agents = ["CORE", "STRUCTURER", "DESCRIPTOR", "PREDICTOR", "FUZZY", "PRESCRIPTOR"];
    
    const nodes = agents.map((id, index) => ({
      id,
      x: (width / (agents.length + 1)) * (index + 1),
      y: height / 2,
      active: memoryData?.timeline.some(e => e.stage === id) || false
    }));

    const links = [];
    for(let i=0; i<nodes.length-1; i++){
        links.push({
            source: nodes[i],
            target: nodes[i+1],
            active: nodes[i].active && nodes[i+1].active
        });
    }

    const g = svg.append("g");

    g.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y)
      .attr("stroke", d => d.active ? "#3b82f6" : "#334155")
      .attr("stroke-width", d => d.active ? 3 : 1)
      .attr("stroke-dasharray", d => d.active ? "none" : "5,5");

    const nodeG = g.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeG.append("circle")
      .attr("r", 20)
      .attr("fill", d => d.active ? "#1e293b" : "#0f172a")
      .attr("stroke", d => d.active ? "#60a5fa" : "#334155")
      .attr("stroke-width", 2)
      .style("filter", d => d.active ? "drop-shadow(0 0 8px rgba(96,165,250,0.5))" : "none");

    nodeG.append("text")
      .attr("dy", 35)
      .attr("text-anchor", "middle")
      .attr("fill", d => d.active ? "#e2e8f0" : "#64748b")
      .attr("font-size", "10px")
      .attr("font-family", "sans-serif")
      .text(d => d.id);

  }, [memoryData]);

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xl font-bold text-slate-200 mb-2">LangGraph Execution Topology</h2>
      <p className="text-xs text-slate-400 mb-4">Live cognitive agent activation</p>
      <svg ref={svgRef} className="w-full h-[200px]" />
    </div>
  );
};
