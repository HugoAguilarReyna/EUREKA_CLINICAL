import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Filter, Star, Shield, ArrowUpDown, Info } from 'lucide-react';
import axios from 'axios';

export const RuleExplorer = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'odds_ratio' | 'p_value' | 'support' | 'confidence'>('odds_ratio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await axios.get('http://localhost:8001/knowledge/semantic/rules');
        setRules(res.data);
      } catch (err) {
        setError('Error al cargar las reglas expertas semánticas');
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  const handleSort = (field: 'odds_ratio' | 'p_value' | 'support' | 'confidence') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'p_value' ? 'asc' : 'desc'); // P-value is better when lower
    }
  };

  const sortedRules = [...rules].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    
    if (valA === undefined) valA = 0;
    if (valB === undefined) valB = 0;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-400 font-mono">Mining Semantic Rules Library...</div>;
  if (error) return <div className="h-screen flex items-center justify-center text-red-400 font-mono">{error}</div>;

  return (
    <PageContainer title="Rule Explorer">
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-black/20 p-6 rounded-2xl border border-white/5 glassmorphism flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Shield className="text-blue-400" />
              Capa 3: Minería de Reglas Basadas en Evidencia
            </h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              Eureka traduce los patrones estadísticos crudos en reglas lógicas interpretables del tipo `IF-THEN` apoyadas estrictamente en significancia matemática certificada.
            </p>
          </div>
          <div className="text-xs bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-gray-400 font-mono">
            {rules.length} Reglas Clínicas Validadas
          </div>
        </div>

        {/* CONTROLS / TABLE HEADER */}
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-black/40 px-6 py-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
            <span className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Librería de Reglas</span>
            <div className="flex gap-2 text-xs font-mono">
              <button 
                onClick={() => handleSort('odds_ratio')}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${sortBy === 'odds_ratio' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 border-white/10 text-gray-400'}`}
              >
                Odds Ratio <ArrowUpDown size={12} />
              </button>
              <button 
                onClick={() => handleSort('p_value')}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${sortBy === 'p_value' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 border-white/10 text-gray-400'}`}
              >
                P-Value <ArrowUpDown size={12} />
              </button>
              <button 
                onClick={() => handleSort('support')}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${sortBy === 'support' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 border-white/10 text-gray-400'}`}
              >
                Soporte <ArrowUpDown size={12} />
              </button>
              <button 
                onClick={() => handleSort('confidence')}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${sortBy === 'confidence' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 border-white/10 text-gray-400'}`}
              >
                Confianza <ArrowUpDown size={12} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {sortedRules.map((rule) => (
              <div key={rule.rule_id} className="p-6 hover:bg-white/5 transition-all space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">{rule.rule_id}</span>
                    <h3 className="text-base font-extrabold text-white font-mono leading-relaxed">
                      {rule.semantic_expression}
                    </h3>
                  </div>
                  <div className="flex gap-4 shrink-0 font-mono">
                    <div className="text-right">
                      <span className="text-[9px] uppercase text-gray-500 block">Odds Ratio</span>
                      <span className="text-sm font-bold text-white">{rule.odds_ratio}</span>
                    </div>
                    <div className="text-right border-l border-white/5 pl-4">
                      <span className="text-[9px] uppercase text-gray-500 block">P-Value</span>
                      <span className="text-sm font-bold text-amber-500">
                        {rule.p_value < 0.0001 ? '<0.0001' : rule.p_value.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-right border-l border-white/5 pl-4">
                      <span className="text-[9px] uppercase text-gray-500 block">Soporte</span>
                      <span className="text-sm font-bold text-blue-400">{rule.support}</span>
                    </div>
                    <div className="text-right border-l border-white/5 pl-4">
                      <span className="text-[9px] uppercase text-gray-500 block">Confianza</span>
                      <span className="text-sm font-bold text-emerald-400">{(rule.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-start gap-2 text-xs">
                  <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-gray-300">
                    <strong className="text-white font-bold">Respaldo de Evidencia Clínica: </strong>
                    {rule.certified_insight_title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageContainer>
  );
};
