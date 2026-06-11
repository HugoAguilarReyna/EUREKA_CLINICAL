import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Activity, ShieldAlert, Zap, TrendingUp } from 'lucide-react';

export const TrendAnalytics = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/knowledge/datasets/history`)
      .then(res => res.json())
      .then(data => {
        // Reverse to have oldest first for timeline graphs
        const chron = [...data].reverse();
        setHistory(chron);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-blue-400">Generando Análisis de Tendencias...</div>;
  }

  // Pre-process data for charts
  const trendData = history.map((snap, idx) => {
    // We try to find Bilirrubina as the main tracking disease for demonstration
    const dbInsight = snap.insights?.find((i: any) => i.title?.includes('Bilirrubina'));
    const affected = dbInsight?.affected_population || 0;
    const total = snap.rows || 1;
    const prevalence = (affected / total) * 100;
    
    // Calculate global confidence average
    const confidences = snap.insights?.map((i: any) => i.confidence) || [];
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length : 0;
    
    // Count alerts
    const alerts = snap.alerts?.length || 0;

    return {
      name: snap.dataset_name || `Snap ${idx}`,
      prevalence: prevalence.toFixed(1),
      confidence: avgConfidence.toFixed(1),
      alerts: alerts
    };
  });

  return (
    <div className="space-y-8">
      
      {/* Risk & Disease Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <Activity className="text-red-400" size={16} />
            Evolución de Riesgo Poblacional
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            Mide el incremento o decremento de pacientes que superan los umbrales clínicos.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Line type="monotone" name="Pacientes en Riesgo" dataKey="prevalence" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
            <ShieldAlert className="text-orange-400" size={16} />
            Alert Timeline
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            Volumen de alertas críticas y altas emitidas por Eureka en cada periodo.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Line type="stepAfter" name="Alertas Críticas" dataKey="alerts" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confidence Trend */}
      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
          <TrendingUp className="text-blue-400" size={16} />
          Confidence Trend & Data Quality
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          Nivel de certidumbre estadística sobre las recomendaciones emitidas en el tiempo.
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" fontSize={10} />
              <YAxis stroke="#666" fontSize={10} unit="%" domain={['auto', 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
              <Area type="monotone" name="Confianza Promedio" dataKey="confidence" stroke="#3b82f6" fillOpacity={1} fill="url(#colorConf)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Executive Sankey (Simulated visually without complex d3 math for executive simplicity) */}
      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-6">
          <Zap className="text-emerald-400" size={16} />
          Decision Flow (Sankey Conceptual)
        </h3>
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0a0a] p-8 rounded-xl border border-white/5 relative overflow-hidden">
          {/* Connecting lines via background */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/20 via-orange-500/20 to-red-500/20 -translate-y-1/2 z-0 hidden md:block"></div>
          
          <div className="z-10 bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl w-48 text-center shadow-lg backdrop-blur-sm mb-4 md:mb-0">
            <span className="block text-[10px] text-blue-400 uppercase tracking-widest font-bold mb-1">Origen</span>
            <span className="text-white font-semibold">Dataset Clínico</span>
          </div>
          
          <div className="z-10 bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl w-48 text-center shadow-lg backdrop-blur-sm mb-4 md:mb-0">
            <span className="block text-[10px] text-indigo-400 uppercase tracking-widest font-bold mb-1">Hallazgo Mined</span>
            <span className="text-white font-semibold">Bilirrubina &gt; 1.2</span>
          </div>
          
          <div className="z-10 bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl w-48 text-center shadow-lg backdrop-blur-sm mb-4 md:mb-0">
            <span className="block text-[10px] text-orange-400 uppercase tracking-widest font-bold mb-1">Riesgo</span>
            <span className="text-white font-semibold">Posible Colestasis</span>
          </div>
          
          <div className="z-10 bg-red-900/20 border border-red-500/30 p-4 rounded-xl w-48 text-center shadow-lg backdrop-blur-sm">
            <span className="block text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1">Acción Recomendada</span>
            <span className="text-white font-semibold">Auditoría Quirúrgica</span>
          </div>
        </div>
      </div>
      
    </div>
  );
};
