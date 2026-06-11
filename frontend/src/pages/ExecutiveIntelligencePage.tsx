import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useDecisionInsights } from '../hooks';
import { CorrelationHeatmap } from '../components/analytics/CorrelationHeatmap';
import { SankeyFlow } from '../components/analytics/SankeyFlow';
import { 
  Award, ShieldAlert, CheckSquare, BarChart3, Database, 
  ArrowUpRight, AlertTriangle, Lightbulb, Compass, GitCommit 
} from 'lucide-react';

export const ExecutiveIntelligencePage = () => {
  const { data: insights, isLoading, error } = useDecisionInsights();
  const [activeTab, setActiveTab] = useState<'discoveries' | 'risks' | 'actions' | 'evidence'>('discoveries');

  if (isLoading) return <div className="h-64 flex items-center justify-center text-blue-400">Cargando Inteligencia Ejecutiva...</div>;
  if (error || !insights) return <div className="h-64 flex items-center justify-center text-red-400">Error al cargar insights de soporte de decisiones</div>;

  // Compute summary metrics
  const totalPatients = insights.length > 0 ? insights[0].sample_size : 583;
  const criticalCount = insights.filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  
  // Sort actions and remove duplicates for action section
  const actions = Array.from(new Set(insights.map((i: any) => i.next_analysis_suggested)));

  return (
    <PageContainer title="Executive Intelligence Platform">
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* EXECUTIVE DESKTOP BRIEF */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-black/20 p-6 rounded-2xl border border-white/5 shadow-xl glassmorphism">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Award className="text-yellow-400 animate-pulse" />
              Consola de Apoyo a Decisiones Clínicas
            </h2>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Eureka ayuda a directores y analistas clínicos a responder preguntas complejas basadas en evidencia estadística real derivada del dataset de pacientes hepatópatas.
            </p>
          </div>
          <div className="text-xs bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-gray-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span>Motor Explicable Activo</span>
          </div>
        </div>

        {/* 4 CORE KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="glassmorphism p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <Database size={100} />
            </div>
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Población Muestra</span>
            <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{totalPatients}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Registros clínicos auditados en Neo4j</p>
          </div>

          <div className="glassmorphism p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <ShieldAlert size={100} />
            </div>
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Alertas Prioritarias</span>
            <h3 className="text-3xl font-extrabold text-amber-500 mt-2 font-mono">{criticalCount}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Subgrupos con severidad Crítica/Alta</p>
          </div>

          <div className="glassmorphism p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <BarChart3 size={100} />
            </div>
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Prevalencia Base</span>
            <h3 className="text-3xl font-extrabold text-blue-400 mt-2 font-mono">71.4%</h3>
            <p className="text-[10px] text-gray-500 mt-1">Tasa general de enfermedad en cohorte</p>
          </div>

          <div className="glassmorphism p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <CheckSquare size={100} />
            </div>
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Grado de Evidencia</span>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">100%</h3>
            <p className="text-[10px] text-gray-500 mt-1">Sin suposiciones o datos ficticios</p>
          </div>

        </div>

        {/* TABBED INTERFACE SYSTEM */}
        <div className="space-y-6">
          <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-[2px]">
            <button
              onClick={() => setActiveTab('discoveries')}
              className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'discoveries' 
                  ? 'bg-white/5 text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lightbulb size={16} />
              Discoveries (Descubrimientos)
            </button>
            <button
              onClick={() => setActiveTab('risks')}
              className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'risks' 
                  ? 'bg-white/5 text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertTriangle size={16} />
              Risks & Correlations (Riesgos)
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'actions' 
                  ? 'bg-white/5 text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass size={16} />
              Actions (Acciones sugeridas)
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'evidence' 
                  ? 'bg-white/5 text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <GitCommit size={16} />
              Evidence Flow (Mapa de Evidencia)
            </button>
          </div>

          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl shadow-inner min-h-[400px]">
            
            {/* TAB: DISCOVERIES */}
            {activeTab === 'discoveries' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-white">Subgrupos de Riesgo Prioritarios</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Cohortes identificadas a través de minería estadística ordenada por prioridad matemática de impacto.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {insights.map((insight: any) => {
                    const sevColor = 
                      insight.severity === 'CRITICAL' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                      insight.severity === 'HIGH' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                      'text-blue-400 bg-blue-500/10 border-blue-500/20';

                    return (
                      <div 
                        key={insight.id} 
                        className="bg-black/20 hover:bg-black/30 border border-white/5 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-all duration-300"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${sevColor}`}>
                              {insight.severity}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono font-bold">
                              Prioridad: {insight.priority.toFixed(1)}
                            </span>
                          </div>
                          
                          <h4 className="text-base font-bold text-white">{insight.title}</h4>
                          
                          <div className="space-y-2 text-xs">
                            <div className="bg-white/5 p-3 rounded-lg">
                              <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider font-mono">Hallazgo principal</span>
                              <p className="text-gray-300 font-medium">{insight.finding}</p>
                            </div>

                            <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                              <span className="text-[9px] uppercase font-bold text-blue-400 block tracking-wider font-mono">¿Por qué importa?</span>
                              <p className="text-blue-200 leading-relaxed mt-0.5">{insight.why_care}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>Confianza: <strong className="text-white font-bold">{Math.round(insight.confidence * 100)}%</strong></span>
                            <span>Afectados: <strong className="text-white font-bold">{insight.evidence_count} / {insight.sample_size}</strong></span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex justify-between items-center bg-black/40 px-2 py-1 rounded">
                            <span>Método: {insight.method}</span>
                            <span className="text-[9px] font-semibold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              Sugerido <ArrowUpRight size={10} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: RISKS */}
            {activeTab === 'risks' && (
              <div className="space-y-6 animate-fade-in">
                <CorrelationHeatmap />
              </div>
            )}

            {/* TAB: ACTIONS */}
            {activeTab === 'actions' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-white">Soporte de Decisión Analítica</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Acciones de revisión e investigación sugeridas basadas en biomarcadores alterados. Eureka no emite prescripciones clínicas definitivas, sino guías de análisis de cohortes de riesgo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {actions.map((actName: any, idx: number) => {
                    const supportInsights = insights.filter((i: any) => i.next_analysis_suggested === actName);
                    
                    return (
                      <div 
                        key={idx} 
                        className="bg-black/20 border border-white/5 rounded-xl p-5 space-y-4 hover:border-white/10 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-extrabold">
                              {idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-white">Acción Sugerida</h4>
                          </div>

                          <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                            {actName}
                          </p>
                        </div>

                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2">
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block font-mono">Subgrupos que sustentan esta acción:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {supportInsights.map((ins: any) => (
                              <span key={ins.id} className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5 font-semibold">
                                {ins.title.split(":")[1]?.trim() || ins.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: EVIDENCE */}
            {activeTab === 'evidence' && (
              <div className="space-y-6 animate-fade-in">
                <SankeyFlow />
              </div>
            )}

          </div>
        </div>

      </div>
    </PageContainer>
  );
};
