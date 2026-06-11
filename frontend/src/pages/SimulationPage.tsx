import { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useSimulation } from '../hooks';
import { Sliders, RefreshCw, BarChart2, ShieldAlert, TrendingUp, HelpCircle } from 'lucide-react';

export const SimulationPage = () => {
  const [scenario, setScenario] = useState<string>('outlier_trim');
  const [iqrMultiplier, setIqrMultiplier] = useState<number>(1.5);
  const { data, isLoading, error, refetch } = useSimulation(iqrMultiplier, scenario);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIqrMultiplier(parseFloat(e.target.value));
  };

  const handleScenarioChange = (newScenario: string) => {
    setScenario(newScenario);
  };

  return (
    <PageContainer title="What-If Outlier & Scenario Simulator">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* CONTROL CARD */}
        <div className="glassmorphism p-6 rounded-xl border border-white/5 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders size={20} className="text-blue-400" />
              Configurador de Simulación Clínica
            </h3>
            <button 
              onClick={() => {
                setScenario('outlier_trim');
                setIqrMultiplier(1.5);
                refetch();
              }} 
              className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} />
              Reiniciar Simulación
            </button>
          </div>
          
          <p className="text-sm text-gray-400">
            Selecciona un escenario clínico de simulación predictiva "What-If" para observar cambios en las correlaciones lineales con el diagnóstico y el impacto poblacional estimado.
          </p>

          {/* SCENARIO SELECTOR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleScenarioChange('outlier_trim')}
              className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                scenario === 'outlier_trim'
                  ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <strong className="text-xs uppercase block tracking-wider mb-1">Escenario 1</strong>
              <span className="text-sm font-semibold block">Filtro de Outliers (IQR)</span>
              <span className="text-[10px] text-gray-500 block mt-1">Limpia ruido estadístico</span>
            </button>

            <button
              onClick={() => handleScenarioChange('reduce_db_30')}
              className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                scenario === 'reduce_db_30'
                  ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <strong className="text-xs uppercase block tracking-wider mb-1">Escenario 2</strong>
              <span className="text-sm font-semibold block">Terapia: -30% Bilirrubina</span>
              <span className="text-[10px] text-gray-500 block mt-1">Efecto de fármaco biliar</span>
            </button>

            <button
              onClick={() => handleScenarioChange('age_gt_60')}
              className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                scenario === 'age_gt_60'
                  ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <strong className="text-xs uppercase block tracking-wider mb-1">Escenario 3</strong>
              <span className="text-sm font-semibold block">Cohorte: Edad &gt; 60</span>
              <span className="text-[10px] text-gray-500 block mt-1">Pacientes mayores</span>
            </button>
          </div>

          {/* SLIDER - ONLY FOR OUTLIER_TRIM */}
          {scenario === 'outlier_trim' && (
            <div className="bg-white/5 border border-white/5 p-4 rounded-lg space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sensibilidad de Outliers (IQR Multiplier):</span>
                <strong className="text-blue-400 font-mono text-base">{iqrMultiplier.toFixed(1)}x</strong>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="3.0" 
                step="0.1" 
                value={iqrMultiplier}
                onChange={handleSliderChange}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>0.5x (Filtro Agresivo)</span>
                <span>1.5x (Estándar Estadístico)</span>
                <span>3.0x (Filtro Permisivo)</span>
              </div>
            </div>
          )}
        </div>

        {isLoading && <div className="text-center py-12 text-blue-400 flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
          Corriendo simulación del escenario...
        </div>}
        
        {error && (
          <div className="glassmorphism p-6 rounded-xl border border-red-500/30 text-red-400 flex items-center gap-4">
            <ShieldAlert />
            <p>Error calculating outlier simulation metrics.</p>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6 animate-fade-in">
            
            {/* SCENARIO EXPECTED SUMMARY BANNER */}
            <div className="bg-gradient-to-r from-blue-900/30 to-black/20 border border-white/5 p-6 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                Resumen de Impacto Clínico Simulado
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/5">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Cambio Esperado</span>
                  <p className="text-xs font-semibold text-gray-300">{data.expected_change}</p>
                </div>
                <div className="space-y-1 md:pl-6">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Riesgo Esperado</span>
                  <p className="text-xs font-semibold text-amber-300">{data.expected_risk}</p>
                </div>
                <div className="space-y-1 md:pl-6">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Impacto de Cohorte</span>
                  <p className="text-xs font-semibold text-emerald-300">{data.expected_impact}</p>
                </div>
              </div>
            </div>

            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glassmorphism p-6 rounded-xl border border-white/5">
                <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">Baseline Sample Size</span>
                <div className="text-3xl font-bold text-white mt-1">{data.baseline_sample_size}</div>
                <span className="text-[10px] text-gray-500 block mt-0.5">Población total original</span>
              </div>
              <div className="glassmorphism p-6 rounded-xl border border-white/5">
                <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">Simulated Sample Size</span>
                <div className="text-3xl font-bold text-emerald-400 mt-1">{data.simulated_sample_size}</div>
                <span className="text-[10px] text-gray-500 block mt-0.5">Población resultante filtrada</span>
              </div>
              <div className="glassmorphism p-6 rounded-xl border border-white/5 bg-red-500/5 border-red-500/20">
                <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">Outliers Removed</span>
                <div className="text-3xl font-bold text-red-400 mt-1">{data.outliers_removed}</div>
                <span className="text-[10px] text-gray-500 block mt-0.5">Pacientes atípicos descartados</span>
              </div>
            </div>

            {/* CORRELATION SHIFT TABLE */}
            <div className="glassmorphism p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart2 size={20} className="text-blue-400" />
                Desviación de Coeficientes de Correlación (Con la Variable Objetivo)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="p-3 rounded-l">Variable</th>
                      <th className="p-3">Baseline Correlation</th>
                      <th className="p-3">Simulated Correlation</th>
                      <th className="p-3 rounded-r">Desviación (Shift)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.correlation_comparison.map((item: any, i: number) => {
                      const isPositive = item.correlation_shift > 0;
                      const hasChange = item.correlation_shift !== 0;
                      return (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-semibold text-white">
                            {item.display_name} ({item.variable})
                          </td>
                          <td className="p-3 font-mono">{item.baseline_correlation.toFixed(4)}</td>
                          <td className="p-3 font-mono font-bold text-blue-300">{item.simulated_correlation.toFixed(4)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                !hasChange ? 'bg-gray-500/20 text-gray-400' :
                                isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                              }`}>
                                {item.correlation_shift > 0 ? '+' : ''}{item.correlation_shift.toFixed(4)}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {Math.abs(item.correlation_shift) > 0.05 ? 'Desviación Alta' : 
                                 Math.abs(item.correlation_shift) > 0.01 ? 'Desviación Moderada' : 'Sin cambios significativos'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HELP BANNER */}
            <div className="glassmorphism p-5 rounded-xl border border-white/5 flex items-start gap-4">
              <HelpCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h5 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Interpretación Analítica</h5>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Las correlaciones representan qué tan fuerte es la asociación lineal de cada biomarcador con el diagnóstico clínico. Al alterar la cohorte o simular intervenciones (como la reducción terapéutica de la bilirrubina sérica), las correlaciones cambian, revelando si los factores de riesgo modificados atenúan o no la fuerza diagnóstica de la variable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
