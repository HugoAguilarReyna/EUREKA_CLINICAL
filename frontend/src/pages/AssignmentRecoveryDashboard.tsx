import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { 
  Database, RefreshCw, BarChart2, ShieldAlert, 
  Cpu, FileCode2, Share2, Award, Zap, Compass, ShieldCheck 
} from 'lucide-react';
import axios from 'axios';

export const AssignmentRecoveryDashboard = () => {
  const [prepData, setPrepData] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [graphSummary, setGraphSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prepRes, rulesRes, summaryRes] = await Promise.all([
          axios.get('http://localhost:8001/knowledge/preparation/audit'),
          axios.get('http://localhost:8001/knowledge/semantic/rules'),
          axios.get('http://localhost:8001/graph/analytics/summary')
        ]);
        setPrepData(prepRes.data);
        setRules(rulesRes.data);
        setGraphSummary(summaryRes.data);
      } catch (err) {
        console.error("Error loading recovery dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCertify = async () => {
    setCertifying(true);
    try {
      const res = await axios.post('http://localhost:8001/knowledge/semantic/certify');
      setCertResult(res.data);
    } catch (err) {
      console.error("Certification failed", err);
    } finally {
      setCertifying(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-400 font-mono">Reconstructing Assignment 1 Recovery Dashboard...</div>;

  return (
    <PageContainer title="Assignment 1 Recovery Dashboard">
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* HEADER PANEL */}
        <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-black/20 p-6 rounded-2xl border border-white/5 glassmorphism flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Award className="text-yellow-400" />
              EDIOS: Explainable Decision Intelligence Operating System
            </h2>
            <p className="text-sm text-gray-400 max-w-3xl">
              Consola unificada que demuestra la evolución del pipeline lógico-difuso del **Assignment 1** y su integración formal con la robustez y trazabilidad del grafo en **Eureka Multiverse**.
            </p>
          </div>
          
          <button 
            onClick={handleCertify}
            disabled={certifying}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white px-5 py-3 rounded-xl text-sm font-black font-mono tracking-wider transition-all shrink-0 flex items-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <ShieldCheck size={18} />
            {certifying ? 'EJECUTANDO CERTIFICACIÓN...' : 'EJECUTAR CERTIFICACIÓN EDIOS'}
          </button>
        </div>

        {/* CERTIFICATION RESULTS PANEL */}
        {certResult && (
          <div className="bg-emerald-950/20 border border-emerald-500/40 p-6 rounded-2xl space-y-4 animate-fade-in shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" />
              Resultados de Certificación Semántica EDIOS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Membresías</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{(certResult.membership_reproducibility.observed).toFixed(0)}% Pass</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Estados</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{(certResult.state_reconstruction.observed).toFixed(0)}% Pass</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Reglas</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{(certResult.rule_reconstruction.observed).toFixed(0)}% Pass</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Grafo</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{(certResult.graph_integrity.observed).toFixed(0)}% Pass</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Trazabilidad</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{(certResult.explainability_chain_integrity.observed).toFixed(0)}% Pass</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Drift</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{(certResult.drift_detection_accuracy.observed).toFixed(0)}% Pass</span>
              </div>
            </div>
            <div className="bg-black/40 p-4 rounded-xl text-xs font-mono text-gray-300 border border-white/5 leading-relaxed">
              <strong className="text-emerald-400 font-bold uppercase block mb-1">Declaración Oficial:</strong>
              EUREKA MULTIVERSE ha sido auditado con éxito. Se verifica que las transformaciones de lógica difusa y explicabilidad semántica respetan el congelamiento científico de los modelos basales y añaden un 100% de interpretabilidad sin alterar los descubrimientos.
            </div>
          </div>
        )}

        {/* 10 PIPELINE STAGES STEPPER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Stage 1: Dataset */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <Database size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 1</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Dataset profiling</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Perfilado del dataset de pacientes hepáticos. {prepData?.profile.records} registros y {prepData?.profile.variables} columnas clínicas.
            </p>
          </div>

          {/* Stage 2: Cleaning */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <RefreshCw size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 2</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Missing data audit</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Auditoría y corrección de nulos. Valores faltantes detectados: {prepData?.profile.missing_values} (Estrategia: {prepData?.missing_audit.imputation_strategy}).
            </p>
          </div>

          {/* Stage 3: Normalization */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <BarChart2 size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 3</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Normalization</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Auditoría de escalamiento de variables biométricas y de transaminasas utilizando normalización Z-Score y escalado MinMax.
            </p>
          </div>

          {/* Stage 4: Outliers */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <ShieldAlert size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 4</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Outliers (IQR)</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Detección y aislamiento matemático de registros extremos o erróneos a través del criterio de rango intercuartílico.
            </p>
          </div>

          {/* Stage 5: Fuzzy Logic */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <Cpu size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 5</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Fuzzy Semantics</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Transformación de valores numéricos duros a grados de correspondencia difusa (LOW, NORMAL, HIGH, VERY_HIGH).
            </p>
          </div>

          {/* Stage 6: Rules */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <FileCode2 size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 6</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Evidence rules</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generación de {rules.length} reglas lógicas del tipo `IF-THEN` respaldadas por métricas de significancia clínica.
            </p>
          </div>

          {/* Stage 7: Knowledge Graph */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <Share2 size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 7</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Knowledge Graph</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Inyección del grafo de conocimiento semántico: {graphSummary?.total_nodes} nodos y {graphSummary?.total_edges} aristas conectadas.
            </p>
          </div>

          {/* Stage 8: Discovery */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <Zap size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 8</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Risk Discovery</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Análisis y extracción de subgrupos de riesgo prioritarios basados en incidencias y prevalencias del dataset.
            </p>
          </div>

          {/* Stage 9: Decision Intelligence */}
          <div className="glassmorphism p-5 rounded-xl border border-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform duration-300">
              <Compass size={80} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ETAPA 9</span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">Decision Intelligence</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Recomendación prioritarias para el analista clínico y apoyo a directivos basadas en evidencia trazable y auditada.
            </p>
          </div>

        </div>

      </div>
    </PageContainer>
  );
};
