import React, { useState } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, 
  ScatterChart, Scatter, ZAxis 
} from 'recharts';
import { useDecisionInsights } from '../../hooks';
import { SankeyFlow } from './SankeyFlow';
import { SankeyFlow } from './SankeyFlow';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity, Grid } from 'lucide-react';

export const ExecutiveVisualAnalytics = () => {
  const { data: insights } = useDecisionInsights();
  const [activeTab, setActiveTab] = useState<number>(1);

  if (!insights) {
    return <div className="text-gray-400 py-8 text-center">Cargando visualizaciones ejecutivas...</div>;
  }

  // 1. Risk Distribution Data
  const riskDist = [
    { name: 'Crítica', value: insights.filter(i => i.urgency === 'CRITICAL').length, fill: '#EF4444' },
    { name: 'Alta', value: insights.filter(i => i.urgency === 'HIGH').length, fill: '#F97316' },
    { name: 'Media', value: insights.filter(i => i.urgency === 'MEDIUM').length, fill: '#F59E0B' },
    { name: 'Baja', value: insights.filter(i => i.urgency === 'LOW').length, fill: '#3B82F6' },
  ].filter(item => item.value > 0);

  // 2. Population Segmentation Data
  const popSegData = insights.map((i, idx) => ({
    name: i.finding.split(" presentan ")[1]?.split(" ")[0] || `Grupo ${idx + 1}`,
    'Pacientes Afectados': i.affected_population,
    'Confianza %': i.confidence
  }));

  // 3. Disease Prevalence Data
  const prevalenceData = [
    { name: 'Enfermos (Liver Disease)', value: 416, fill: '#EF4444' },
    { name: 'Sanos (Healthy)', value: 167, fill: '#10B981' }
  ];

  // 4. Feature Importance Ranking Data
  const featureImportance = [
    { name: 'Bilirrubina Directa (DB)', 'Importancia LOO %': 6.1, fill: '#EF4444' },
    { name: 'Bilirrubina Total (TB)', 'Importancia LOO %': 3.5, fill: '#F97316' },
    { name: 'ALT (Sgpt)', 'Importancia LOO %': 2.6, fill: '#F59E0B' },
    { name: 'AST (Sgot)', 'Importancia LOO %': 1.8, fill: '#3B82F6' },
    { name: 'Albúmina (ALB)', 'Importancia LOO %': 1.3, fill: '#6366F1' },
    { name: 'Proteínas Totales (TP)', 'Importancia LOO %': 0.8, fill: '#8B5CF6' },
    { name: 'Relación A/G', 'Importancia LOO %': 0.5, fill: '#EC4899' },
  ];

  // 7. Clinical Risk Matrix Data
  const matrixData = insights.map((i) => ({
    name: i.finding.split(" presentan ")[1]?.split(" ")[0] || i.finding.substring(0, 10),
    x: i.affected_population,
    y: i.urgency === 'CRITICAL' ? 4 : i.urgency === 'HIGH' ? 3 : i.urgency === 'MEDIUM' ? 2 : 1,
    z: Math.round(i.confidence),
    urgency: i.urgency
  }));

  // 8. Outlier Distribution Data
  const outliersData = [
    { name: 'Fosf. Alcalina (Alkphos)', 'Outliers Detectados': 47, fill: '#F59E0B' },
    { name: 'AST / SGOT (Sgot)', 'Outliers Detectados': 42, fill: '#3B82F6' },
    { name: 'ALT / SGPT (Sgpt)', 'Outliers Detectados': 39, fill: '#EF4444' },
    { name: 'Bilirrubina Total (TB)', 'Outliers Detectados': 31, fill: '#F97316' },
    { name: 'Bilirrubina Directa (DB)', 'Outliers Detectados': 28, fill: '#6366F1' },
    { name: 'Relación A/G', 'Outliers Detectados': 18, fill: '#8B5CF6' },
    { name: 'Albúmina (ALB)', 'Outliers Detectados': 12, fill: '#EC4899' },
  ];

  // 9. Cohort Comparison Data
  const cohortComparison = [
    { name: 'Bilirrubina Total (x4)', Enfermo: 4.1, Sano: 0.9 },
    { name: 'Bilirrubina Directa (x6)', Enfermo: 1.8, Sano: 0.3 },
    { name: 'ALT / SGPT (x3)', Enfermo: 99.5, Sano: 32.8 },
    { name: 'AST / SGOT (x3)', Enfermo: 135.2, Sano: 40.5 },
    { name: 'Albúmina (x1)', Enfermo: 2.8, Sano: 3.4 },
  ];

  // 10. Decision Impact Data
  const decisionImpact = [
    { variables_removed: 0, 'Precisión del Modelo %': 78.5 },
    { variables_removed: 1, 'Precisión del Modelo %': 72.4 }, // DB removed
    { variables_removed: 2, 'Precisión del Modelo %': 68.9 }, // TB removed
    { variables_removed: 3, 'Precisión del Modelo %': 66.3 }, // Sgpt removed
    { variables_removed: 4, 'Precisión del Modelo %': 64.1 }, // Sgot removed
    { variables_removed: 5, 'Precisión del Modelo %': 62.8 }, // ALB removed
    { variables_removed: 6, 'Precisión del Modelo %': 62.1 }, // TP removed
  ];

  const renderActiveChart = () => {
    switch (activeTab) {
      case 1: // Risk Distribution
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">1. Distribución de Severidad de Alertas Clinicas</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={riskDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="name" stroke="#A0AEC0" />
                <YAxis stroke="#A0AEC0" label={{ value: 'Subgrupos Mined', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Bar dataKey="value" name="Subgrupos de Riesgo">
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 2: // Population Segmentation
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">2. Segmentación de Población Afectada por Patrón</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={popSegData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis type="number" stroke="#A0AEC0" />
                <YAxis dataKey="name" type="category" stroke="#A0AEC0" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Legend />
                <Bar dataKey="Pacientes Afectados" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 3: // Disease Prevalence
        return (
          <div className="h-[350px] w-full flex flex-col md:flex-row items-center justify-around">
            <div className="w-full md:w-1/2 h-[90%]">
              <h4 className="text-sm font-bold text-white mb-2 text-center">3. Prevalencia de Enfermedad Base</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prevalenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {prevalenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs space-y-2 text-gray-300">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded" /> <strong>Liver Disease: 416 pacientes (71.4%)</strong></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded" /> <strong>Healthy: 167 pacientes (28.6%)</strong></div>
              <p className="text-[10px] text-gray-500 italic max-w-xs pt-2 border-t border-white/5">Alta prevalencia base debido al reclutamiento especializado clínico del set de datos original.</p>
            </div>
          </div>
        );
      case 4: // Feature Importance Ranking
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">4. Ranking de Enzimas/Biomarcadores por Importancia LOO</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={featureImportance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 10 }} />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Bar dataKey="Importancia LOO %" name="Impacto Predictivo">
                  {featureImportance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 5: // Correlation Heatmap
        return (
          <div className="h-[400px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">5. Matriz Correlacional de Pearson Clínico</h4>
            <CorrelationHeatmap />
          </div>
        );
      case 6: // Sankey Flow
        return (
          <div className="h-[400px] w-full bg-black/40 rounded-xl border border-white/5 p-4">
            <h4 className="text-sm font-bold text-white mb-2">6. Flujo de Sankey de Decisión Poblacional (Biomarcador → Alerta → Acción)</h4>
            <SankeyFlow />
          </div>
        );
      case 7: // Clinical Risk Matrix
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">7. Matriz de Riesgo Clínico (Severidad vs Volumen Afectado)</h4>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#2D3748" />
                <XAxis type="number" dataKey="x" name="Pacientes Afectados" stroke="#A0AEC0" label={{ value: 'Pacientes Afectados', position: 'bottom', fill: '#A0AEC0', fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="Gravedad" stroke="#A0AEC0" ticks={[1, 2, 3, 4]} tickFormatter={(v) => v===4 ? 'Crítica' : v===3 ? 'Alta' : v===2 ? 'Media' : 'Baja'} />
                <ZAxis type="number" dataKey="z" range={[60, 400]} name="Confianza" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Scatter name="Hallazgos Mined" data={matrixData} fill="#EF4444">
                  {matrixData.map((entry, index) => {
                    const fill = entry.urgency === 'CRITICAL' ? '#EF4444' : entry.urgency === 'HIGH' ? '#F97316' : '#F59E0B';
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      case 8: // Outlier Distribution
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">8. Distribución de Outliers Clínicos Detectados (IQR Trim)</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={outliersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 9 }} />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Bar dataKey="Outliers Detectados" fill="#8B5CF6">
                  {outliersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 9: // Cohort Comparison
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">9. Comparación de Medias en Cohortes (Enfermo vs Sano)</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={cohortComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 10 }} />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Legend />
                <Bar dataKey="Enfermo" fill="#EF4444" name="Grupo Positivo" />
                <Bar dataKey="Sano" fill="#10B981" name="Grupo Sano" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 10: // Decision Impact Chart
        return (
          <div className="h-[350px] w-full">
            <h4 className="text-sm font-bold text-white mb-2">10. Curva de Degradación del Modelo (Remoción Secuencial de Predictores)</h4>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={decisionImpact}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="variables_removed" stroke="#A0AEC0" label={{ value: 'Variables Removidas del Panel', position: 'bottom', fill: '#A0AEC0', fontSize: 11 }} />
                <YAxis stroke="#A0AEC0" domain={[55, 85]} />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                <Line type="monotone" dataKey="Precisión del Modelo %" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      default:
        return null;
    }
  };

  const menuItems = [
    { id: 1, name: 'Distribución Alertas', icon: BarChart3 },
    { id: 2, name: 'Segmentación', icon: PieIcon },
    { id: 3, name: 'Prevalencia Base', icon: PieIcon },
    { id: 4, name: 'Ranking LOO', icon: BarChart3 },
    { id: 5, name: 'Pearson Heatmap', icon: Grid },
    { id: 6, name: 'Sankey Flow', icon: Activity },
    { id: 7, name: 'Matriz Gravedad', icon: Grid },
    { id: 8, name: 'Outliers IQR', icon: BarChart3 },
    { id: 9, name: 'Comparativa Medias', icon: BarChart3 },
    { id: 10, name: 'Impacto Model', icon: LineIcon }
  ];

  return (
    <div className="glassmorphism p-6 rounded-2xl border border-white/5 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Paneles de Analítica Visual Ejecutiva (Power BI / Palantir Tier)
          </h3>
          <p className="text-gray-400 text-xs mt-1">
            Visualizaciones interactivas de negocio que comunican decisiones y riesgos sobre la cohorte clínica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation panel */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible border-r border-white/5 gap-1.5 pb-2 lg:pb-0 pr-0 lg:pr-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold shrink-0 transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={14} />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Chart rendering area */}
        <div className="lg:col-span-3 bg-black/20 p-5 rounded-2xl border border-white/5 flex items-center justify-center">
          {renderActiveChart()}
        </div>
      </div>
    </div>
  );
};
