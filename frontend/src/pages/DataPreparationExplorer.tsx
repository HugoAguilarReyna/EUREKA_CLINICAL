import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Database, ShieldAlert, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import axios from 'axios';

export const DataPreparationExplorer = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/preparation/audit`);
        setData(res.data);
      } catch (err) {
        setError('Error al cargar la auditoría de preparación de datos');
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-400 font-mono">Auditing Data Preparation Layer...</div>;
  if (error || !data) return <div className="h-screen flex items-center justify-center text-red-400 font-mono">{error || 'Error'}</div>;

  const { profile, missing_audit, normalization_comparison, outliers_audit, semantic_entropies } = data;

  return (
    <PageContainer title="Data Preparation Explorer">
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* HEADER DESCRIPTIVE PANEL */}
        <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-black/20 p-6 rounded-2xl border border-white/5 glassmorphism">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Database className="text-blue-400" />
            Capa 1: Auditoría y Preparación Lógica de Datos
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-3xl">
            Antes del descubrimiento de reglas e insights, los datos clínicos pasan por procesos rigurosos de perfilado, detección de anomalías y normalización de escalas. Aquí se auditan estos pasos académicos fundamentales.
          </p>
        </div>

        {/* PROFILE STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glassmorphism p-5 rounded-xl border border-white/5">
            <span className="text-xs font-bold text-gray-500 uppercase">Registros Totales</span>
            <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">{profile.records}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Pacientes analizados en cohorte</p>
          </div>
          <div className="glassmorphism p-5 rounded-xl border border-white/5">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Variables</span>
            <h3 className="text-3xl font-extrabold text-blue-400 mt-1 font-mono">{profile.variables}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Atributos clínicos recolectados</p>
          </div>
          <div className="glassmorphism p-5 rounded-xl border border-white/5">
            <span className="text-xs font-bold text-gray-500 uppercase">Valores Faltantes</span>
            <h3 className="text-3xl font-extrabold text-amber-500 mt-1 font-mono">{profile.missing_values}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Porcentaje: {((profile.missing_values / (profile.records * profile.variables)) * 100).toFixed(2)}%</p>
          </div>
          <div className="glassmorphism p-5 rounded-xl border border-white/5">
            <span className="text-xs font-bold text-gray-500 uppercase">Estrategia Imputación</span>
            <h3 className="text-xl font-bold text-emerald-400 mt-2 font-mono">{missing_audit.imputation_strategy}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Cero supociones aleatorias</p>
          </div>
        </div>

        {/* INTERACTIVE VARIABLES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: OUTLIERS & ENTROPY */}
          <div className="glassmorphism p-6 rounded-2xl border border-white/5 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-red-400" />
                Detección de Outliers e Inconsistencias (IQR)
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Visualización de percentiles (Q25 y Q75) y rango intercuartílico para aislar extremos clínicos.
              </p>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.keys(outliers_audit).map((col) => {
                const audit = outliers_audit[col];
                const entropy = semantic_entropies[col] || 0;
                return (
                  <div key={col} className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{col}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-red-950/40 border border-red-500/20 text-red-400 font-mono">
                        {audit.outliers_count} outliers ({ (audit.outliers_percentage * 100).toFixed(1) }%)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-400">
                      <div><span className="text-gray-500">Q25:</span> {audit.q25.toFixed(2)}</div>
                      <div><span className="text-gray-500">Q75:</span> {audit.q75.toFixed(2)}</div>
                      <div><span className="text-gray-500">IQR:</span> {audit.iqr.toFixed(2)}</div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-[10px] text-gray-500 font-mono">Entropía Semántica:</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{entropy.toFixed(3)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: NORMALIZATION COMPARISON */}
          <div className="glassmorphism p-6 rounded-2xl border border-white/5 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-blue-400" />
                Auditoría de Escalamiento y Normalización
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Comparación directa entre valores reales, Z-Score (media 0, std 1) y MinMax (0 a 1).
              </p>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.keys(normalization_comparison).map((col) => {
                const norm = normalization_comparison[col];
                return (
                  <div key={col} className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-sm font-bold text-white">{col}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Media: {norm.raw_mean.toFixed(2)} | Min: {norm.raw_min} | Max: {norm.raw_max}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-gray-500 text-[10px] block">Muestra Z-Score:</span>
                        <div className="flex gap-1.5 mt-1 overflow-x-auto">
                          {norm.z_score_sample.map((z: number, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-blue-950/20 text-blue-400 border border-blue-500/10 text-[10px]">
                              {z.toFixed(3)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block mt-2">Muestra MinMax:</span>
                        <div className="flex gap-1.5 mt-1 overflow-x-auto">
                          {norm.minmax_sample.map((m: number, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 text-[10px]">
                              {m.toFixed(3)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </PageContainer>
  );
};
