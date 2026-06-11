import React, { useState } from 'react';
import { useSankeyFlow } from '../../hooks';
import { GitCommit, Info } from 'lucide-react';

export const SankeyFlow = () => {
  const { data: rawData, isLoading, error } = useSankeyFlow();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<{ source: number; target: number; value: number } | null>(null);

  if (isLoading) return <div className="h-64 flex items-center justify-center text-blue-400">Generando flujo de evidencia (Sankey)...</div>;
  if (error || !rawData) return <div className="h-64 flex items-center justify-center text-red-400">Error al cargar flujo de evidencia</div>;

  const { nodes, links } = rawData;

  // Let's compute staging for each node.
  // Stage 0: Variables (title split)
  // Stage 1: Findings (ins.finding)
  // Stage 2: Risk Levels (Riesgo CRITICAL, etc.)
  // Stage 3: Actions (ins.next_analysis_suggested)
  const columns: string[][] = [[], [], [], []];
  const nodeColumnMap: { [key: number]: number } = {};

  nodes.forEach((node: any, idx: number) => {
    let col = 0;
    if (node.name.startsWith("Riesgo")) {
      col = 2;
    } else if (node.name.startsWith("Revisar") || node.name.startsWith("Monitoreo")) {
      col = 3;
    } else if (node.name.includes("elevada") || node.name.includes("reducida") || node.name.includes("baja")) {
      col = 1;
    } else {
      col = 0;
    }
    columns[col].push(node.name);
    nodeColumnMap[idx] = col;
  });

  // Calculate coordinates for nodes.
  const width = 900;
  const height = 480;
  const colWidth = 240;
  const nodeWidth = 14;
  
  const nodeCoords: { [key: string]: { x: number; y: number; height: number } } = {};
  
  columns.forEach((colNodes, colIdx) => {
    const x = colIdx * colWidth + 40;
    const colSize = colNodes.length;
    
    colNodes.forEach((nodeName, rowIdx) => {
      // Space nodes evenly in each column
      const totalGapSpace = height - 120;
      const verticalStep = colSize > 1 ? totalGapSpace / (colSize - 1) : 0;
      const y = colSize > 1 ? rowIdx * verticalStep + 60 : height / 2;
      nodeCoords[nodeName] = { x, y, height: 16 };
    });
  });

  // Build connection links
  const processedLinks = links.map((link: any) => {
    const srcNode = nodes[link.source];
    const dstNode = nodes[link.target];
    const srcCoord = nodeCoords[srcNode.name];
    const dstCoord = nodeCoords[dstNode.name];

    return {
      sourceIdx: link.source,
      targetIdx: link.target,
      sourceName: srcNode.name,
      targetName: dstNode.name,
      x0: srcCoord.x + nodeWidth,
      y0: srcCoord.y + 8,
      x1: dstCoord.x,
      y1: dstCoord.y + 8,
      value: link.value,
      col: nodeColumnMap[link.source]
    };
  });

  // Normalize link widths (stroke-width) based on patient counts
  const maxVal = Math.max(...links.map((l: any) => l.value), 1);
  const getStrokeWidth = (val: number) => {
    return Math.max(2, (val / maxVal) * 22);
  };

  const isLinkActive = (link: any) => {
    if (hoveredLink && hoveredLink.source === link.sourceIdx && hoveredLink.target === link.targetIdx) {
      return true;
    }
    if (hoveredNode) {
      return link.sourceName === hoveredNode || link.targetName === hoveredNode;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
          <GitCommit size={16} className="text-blue-400 rotate-90" />
          Mapa de Flujo de Evidencia Clínica
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Visualiza cómo la población de pacientes ({maxVal}+ casos) se distribuye desde los biomarcadores alterados hasta los niveles de riesgo y las acciones de soporte.
        </p>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-xl p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible select-none">
          {/* STAGE HEADER LABELS */}
          <g className="text-[10px] fill-gray-500 uppercase tracking-widest font-mono font-bold">
            <text x={40} y={25}>1. Biomarcador</text>
            <text x={40 + colWidth} y={25}>2. Hallazgo Estadístico</text>
            <text x={40 + colWidth * 2} y={25}>3. Nivel de Riesgo</text>
            <text x={40 + colWidth * 3} y={25}>4. Análisis Sugerido</text>
          </g>

          {/* PATH LINKS */}
          <g>
            {processedLinks.map((link: any, idx: number) => {
              const active = isLinkActive(link);
              const sw = getStrokeWidth(link.value);
              const cpX = (link.x0 + link.x1) / 2;
              
              // Vibrant color gradients for flows based on severity
              let strokeColor = 'rgba(255, 255, 255, 0.06)';
              if (active) {
                if (link.targetName.includes("CRITICAL")) strokeColor = 'rgba(239, 68, 68, 0.65)';
                else if (link.targetName.includes("HIGH")) strokeColor = 'rgba(245, 158, 11, 0.65)';
                else strokeColor = 'rgba(59, 130, 246, 0.65)';
              } else {
                if (link.targetName.includes("CRITICAL")) strokeColor = 'rgba(239, 68, 68, 0.12)';
                else if (link.targetName.includes("HIGH")) strokeColor = 'rgba(245, 158, 11, 0.12)';
                else strokeColor = 'rgba(59, 130, 246, 0.12)';
              }

              return (
                <path
                  key={idx}
                  d={`M ${link.x0} ${link.y0} C ${cpX} ${link.y0}, ${cpX} ${link.y1}, ${link.x1} ${link.y1}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={sw}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredLink({ source: link.sourceIdx, target: link.targetIdx, value: link.value })}
                  onMouseLeave={() => setHoveredLink(null)}
                />
              );
            })}
          </g>

          {/* NODE RECTS */}
          <g>
            {nodes.map((node: any, idx: number) => {
              const col = nodeColumnMap[idx];
              const coord = nodeCoords[node.name];
              if (!coord) return null;

              const isNodeHovered = hoveredNode === node.name;
              
              let fill = 'rgba(255, 255, 255, 0.15)';
              let stroke = 'rgba(255, 255, 255, 0.3)';
              
              if (node.name.includes("CRITICAL")) {
                fill = 'rgba(239, 68, 68, 0.4)';
                stroke = 'rgba(239, 68, 68, 0.8)';
              } else if (node.name.includes("HIGH")) {
                fill = 'rgba(245, 158, 11, 0.4)';
                stroke = 'rgba(245, 158, 11, 0.8)';
              } else if (col === 0) {
                fill = 'rgba(59, 130, 246, 0.4)';
                stroke = 'rgba(59, 130, 246, 0.8)';
              }

              return (
                <g 
                  key={idx} 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node.name)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x={coord.x}
                    y={coord.y}
                    width={nodeWidth}
                    height={coord.height}
                    rx={3}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isNodeHovered ? 2 : 1}
                    className="transition-all duration-150"
                  />
                  {/* TEXT LABELS */}
                  <text
                    x={col === 3 ? coord.x - 8 : coord.x + nodeWidth + 8}
                    y={coord.y + 12}
                    textAnchor={col === 3 ? 'end' : 'start'}
                    className={`text-[10px] select-none font-semibold ${
                      isNodeHovered ? 'fill-white font-bold scale-105' : 'fill-gray-300'
                    } transition-all duration-150`}
                  >
                    {node.name.length > 35 ? `${node.name.slice(0, 35)}...` : node.name}
                  </text>
                  <title>{node.name}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* DETAIL DRAWER */}
      <div className="glassmorphism p-4 rounded-xl border border-white/5 min-h-[70px] flex items-center justify-between">
        {hoveredLink ? (
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <Info className="text-blue-400" size={18} />
            <span>
              Flujo: <strong className="text-white">{hoveredLink.source < nodes.length ? nodes[hoveredLink.source].name : ''}</strong>
              {' → '}
              <strong className="text-white">{hoveredLink.target < nodes.length ? nodes[hoveredLink.target].name : ''}</strong>
              {' contiene '}
              <strong className="text-emerald-400 font-mono">{hoveredLink.value}</strong> pacientes.
            </span>
          </div>
        ) : hoveredNode ? (
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <Info className="text-blue-400" size={18} />
            <span>
              Entidad: <strong className="text-white">{hoveredNode}</strong>
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-500 leading-relaxed">
            Pasa el cursor sobre cualquier nodo o flujo de conexión para auditar el volumen exacto de la cohorte que sigue ese camino de decisión.
          </div>
        )}
      </div>
    </div>
  );
};
