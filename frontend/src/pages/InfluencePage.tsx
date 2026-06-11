import { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useInfluence } from '../hooks';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Activity, Target, ShieldCheck, HelpCircle, BarChart3 } from 'lucide-react';

export const InfluencePage = () => {
  const [selectedVariable, setSelectedVariable] = useState<string>('DB');
  const { data, isLoading, error } = useInfluence(selectedVariable);

  // 1. Static ranking data matching the LOO accuracy drops in backend
  const variablesRank = [
    { name: 'Direct Bilirubin (DB)', id: 'DB', value: 6.1, fill: '#EF4444' },
    { name: 'Total Bilirubin (TB)', id: 'TB', value: 3.5, fill: '#F97316' },
    { name: 'ALT (Sgpt)', id: 'Sgpt', value: 2.6, fill: '#F59E0B' },
    { name: 'AST (Sgot)', id: 'Sgot', value: 1.8, fill: '#3B82F6' },
    { name: 'Albumin (ALB)', id: 'ALB', value: 1.3, fill: '#6366F1' },
    { name: 'Total Proteins (TP)', id: 'TP', value: 0.8, fill: '#8B5CF6' },
    { name: 'A/G Ratio', id: 'A/G Ratio', value: 0.5, fill: '#EC4899' },
  ];

  const handleBarClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedId = state.activePayload[0].payload.id;
      setSelectedVariable(clickedId);
    }
  };

  return (
    <PageContainer title="Influence Explorer 2.0">
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-black/20 p-6 rounded-2xl border border-white/5 shadow-xl glassmorphism">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-400" />
            ¿Qué variable mueve realmente la decisión?
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Este panel analiza el impacto predictivo de exclusión (Leave-One-Out - LOO) de las variables clínicas, 
            permitiendo auditar matemáticamente qué biomarcadores tienen mayor relevancia en el diagnóstico.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Horizontal Ranking Chart */}
          <div className="lg:col-span-7 glassmorphism p-6 rounded-2xl border border-white/5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Ranking de Impacto en Precisión del Modelo</h3>
              <p className="text-xs text-gray-500 mt-0.5">Haga clic en una barra para inspeccionar los detalles de la variable.</p>
            </div>
            
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={variablesRank} 
                  layout="vertical"
                  onClick={handleBarClick}
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                  <XAxis type="number" stroke="#A0AEC0" label={{ value: 'Caída de Precisión LOO %', position: 'bottom', fill: '#A0AEC0', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" stroke="#A0AEC0" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#FFF' }} />
                  <Bar dataKey="value" name="Caída Precisión" cursor="pointer">
                    {variablesRank.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.id === selectedVariable ? '#10B981' : entry.fill} 
                        opacity={entry.id === selectedVariable ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: Selected Variable Decision Details */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            
            {/* Variable Selection Cards Menu */}
            <div className="glassmorphism p-4 rounded-xl border border-white/5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-mono mb-2">Seleccionar Biomarcador</span>
              <div className="flex flex-wrap gap-2">
                {variablesRank.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariable(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all duration-200 ${
                      selectedVariable === v.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:text-white'
                    }`}
                  >
                    {v.id}
                  </button>
                ))}
              </div>
            </div>

            {isLoading && <div className="text-gray-400 py-12 text-center">Calculando impacto LOO en Random Forest...</div>}

            {error && <div className="text-red-400 py-12 text-center">Error al calcular influencia de {selectedVariable}</div>}

            {data && !isLoading && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Decision Value Card */}
                <div className="glassmorphism rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider block">Inspección de Influencia</span>
                      <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                        LOO Engine Activo
                      </span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">
                      {selectedVariable}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-mono">Impacto Precisión</span>
                      <strong className="text-2xl font-extrabold text-emerald-400 block mt-1">
                        +{data.accuracy_drop_pct ? data.accuracy_drop_pct.toFixed(1) : data.influence_score.toFixed(1)}%
                      </strong>
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-mono">Relevancia</span>
                      <strong className="text-2xl font-extrabold text-blue-400 block mt-1">
                        {data.risk_associated || data.impact_level || 'CRÍTICA'}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-mono flex items-center gap-1">
                      <HelpCircle size={11} className="text-blue-400" />
                      ¿Por qué importa?
                    </span>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      Si eliminamos la variable {selectedVariable} del modelo, la precisión diagnóstica del set de datos cae, 
                      impidiendo la clasificación correcta de múltiples pacientes con perfiles límite.
                    </p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block font-mono flex items-center gap-1">
                      <ShieldCheck size={12} />
                      Acción Recomendada
                    </span>
                    <p className="text-gray-200 text-xs font-semibold leading-relaxed">
                      {data.recommendation || 'Mantener esta variable como predictor principal en el panel diagnóstico.'}
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </PageContainer>
  );
};
