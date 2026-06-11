import React, { useState } from 'react';
import { useCorrelationHeatmap } from '../../hooks';
import { Activity, Info } from 'lucide-react';

export const CorrelationHeatmap = () => {
  const { data: rawData, isLoading, error } = useCorrelationHeatmap();
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string; value: number } | null>(null);

  if (isLoading) return <div className="h-64 flex items-center justify-center text-blue-400">Calculando matriz de correlación...</div>;
  if (error || !rawData) return <div className="h-64 flex items-center justify-center text-red-400">Error al calcular correlaciones</div>;

  // Process rawData to extract unique variables in order
  const variables = Array.from(new Set(rawData.map((d: any) => d.x)));

  // Re-organize into a grid lookup
  const lookup: { [key: string]: number } = {};
  rawData.forEach((d: any) => {
    lookup[`${d.x}_${d.y}`] = d.value;
  });

  const getColor = (val: number) => {
    if (val === 1) return 'rgba(239, 68, 68, 0.9)'; // self correlation red
    if (val > 0) {
      return `rgba(239, 68, 68, ${val * 0.85 + 0.1})`; // red scale
    } else {
      return `rgba(59, 130, 246, ${Math.abs(val) * 0.85 + 0.1})`; // blue scale
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
            <Activity size={16} className="text-emerald-400" />
            Matriz de Correlaciones Clínicas (Pearson)
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Muestra el coeficiente de relación lineal entre los diferentes biomarcadores séricos del hígado.
          </p>
        </div>
        
        {/* LEGEND */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-blue-400 font-semibold font-mono">-1.0 (Inversa)</span>
          <div className="w-16 h-3 bg-gradient-to-r from-blue-500/80 via-white/5 to-red-500/80 rounded" />
          <span className="text-red-400 font-semibold font-mono">+1.0 (Directa)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* GRID CONTAINER */}
        <div className="lg:col-span-3 overflow-auto bg-black/20 border border-white/5 rounded-xl p-4 flex justify-center">
          <div className="relative inline-block select-none">
            {/* Headers row (x-axis) */}
            <div className="flex">
              {/* Corner spacer */}
              <div className="w-32 h-8 flex items-end justify-end pr-2 text-[10px] text-gray-500 font-semibold font-mono truncate">
                Variables
              </div>
              {variables.map((xVar: string) => (
                <div 
                  key={xVar} 
                  className="w-16 h-8 text-[9px] text-gray-400 font-bold font-mono text-center flex items-end justify-center pb-1 transform -rotate-12 origin-bottom-left leading-none"
                  style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                  title={xVar}
                >
                  {xVar}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="mt-1 space-y-[2px]">
              {variables.map((yVar: string) => (
                <div key={yVar} className="flex items-center">
                  {/* Row header (y-axis) */}
                  <div className="w-32 h-12 pr-3 text-right text-[10px] text-gray-300 font-semibold font-mono flex items-center justify-end leading-tight truncate" title={yVar}>
                    {yVar}
                  </div>

                  {/* Cells */}
                  <div className="flex gap-[2px]">
                    {variables.map((xVar: string) => {
                      const val = lookup[`${xVar}_${yVar}`] ?? 0;
                      const isHovered = hoveredCell?.x === xVar && hoveredCell?.y === yVar;
                      const isSelf = xVar === yVar;

                      return (
                        <div
                          key={xVar}
                          onMouseEnter={() => setHoveredCell({ x: xVar, y: yVar, value: val })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-12 h-12 rounded cursor-pointer transition-all duration-150 flex items-center justify-center relative ${
                            isHovered ? 'scale-105 ring-2 ring-white z-10' : ''
                          }`}
                          style={{ backgroundColor: getColor(val) }}
                        >
                          <span className={`text-[10px] font-mono font-bold ${
                            Math.abs(val) > 0.4 || isSelf ? 'text-white' : 'text-gray-400'
                          }`}>
                            {val.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DETAILED INFO WIDGET */}
        <div className="glassmorphism p-5 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
              <Info size={14} className="text-blue-400" />
              Detalle de Correlación
            </h5>

            {hoveredCell ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-mono">Variable X</span>
                  <strong className="text-white text-sm block font-semibold">{hoveredCell.x}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-mono">Variable Y</span>
                  <strong className="text-white text-sm block font-semibold">{hoveredCell.y}</strong>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                  <span className="text-[10px] text-gray-400 block uppercase font-mono mb-1">Coeficiente</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">{hoveredCell.value.toFixed(4)}</span>
                    <span className={`text-xs font-bold ${hoveredCell.value > 0 ? 'text-red-400' : hoveredCell.value < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                      {hoveredCell.x === hoveredCell.y ? 'Identidad' :
                       hoveredCell.value > 0.6 ? 'Alta' :
                       hoveredCell.value > 0.2 ? 'Moderada' :
                       hoveredCell.value > 0.05 ? 'Débil' :
                       hoveredCell.value < -0.6 ? 'Inversa Alta' :
                       hoveredCell.value < -0.2 ? 'Inversa Moderada' :
                       hoveredCell.value < -0.05 ? 'Inversa Débil' : 'Nula'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 leading-relaxed py-6 text-center">
                Pasa el mouse sobre cualquier celda de la matriz para observar los valores de relación precisos y su nivel de fuerza estadística.
              </div>
            )}
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg text-[11px] text-blue-300 leading-relaxed">
            <strong>¿Por qué importa?</strong> Las correlaciones altas (como Bilirrubina Total con Bilirrubina Directa) reflejan redundancia clínica, mientras que la correlación con la variable objetivo determina la capacidad predictiva.
          </div>
        </div>
      </div>
    </div>
  );
};
