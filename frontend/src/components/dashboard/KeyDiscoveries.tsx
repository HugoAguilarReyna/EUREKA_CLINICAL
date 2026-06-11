import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldCheck, HelpCircle, Users, Activity, CheckSquare } from 'lucide-react';

interface DecisionInsight {
  id: string;
  title: string;
  description: string;
  evidence: string;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: string;
  affected_population: number;
  impacted_variables: string[];
}

interface KeyDiscoveriesProps {
  discoveries: DecisionInsight[];
}

export const KeyDiscoveries: React.FC<KeyDiscoveriesProps> = ({ discoveries }) => {
  if (!discoveries || discoveries.length === 0) {
    return (
      <div className="glassmorphism p-8 rounded-xl text-center text-gray-400">
        No decision insights found. Please upload a dataset and run pattern recalculation.
      </div>
    );
  }

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          border: 'border-red-500/30',
          bg: 'bg-red-500/5',
          text: 'text-red-400',
          badge: 'bg-red-500/20 border border-red-500/30 text-red-300',
          icon: AlertOctagon
        };
      case 'HIGH':
        return {
          border: 'border-orange-500/30',
          bg: 'bg-orange-500/5',
          text: 'text-orange-400',
          badge: 'bg-orange-500/20 border border-orange-500/30 text-orange-300',
          icon: AlertTriangle
        };
      case 'MEDIUM':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/5',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 border border-amber-500/30 text-amber-300',
          icon: AlertTriangle
        };
      default:
        return {
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/5',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 border border-blue-500/30 text-blue-300',
          icon: ShieldCheck
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Executive Decision Insights
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Automatic subgroup discovery and prescriptive actions mined from patient metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {discoveries.map((insight) => {
          const styles = getRiskStyles(insight.risk_level);
          const Icon = styles.icon;

          return (
            <div 
              key={insight.id} 
              className={`glassmorphism rounded-xl border ${styles.border} ${styles.bg} p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/5 ${styles.text}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{insight.title}</h3>
                    <span className="text-[10px] text-gray-500 font-mono">{insight.id}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles.badge}`}>
                    Riesgo: {insight.risk_level}
                  </span>
                  <span className="bg-white/5 border border-white/5 text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                    <Users size={12} className="text-blue-400" />
                    {insight.affected_population} pacientes
                  </span>
                  <span className="bg-white/5 border border-white/5 text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                    <Activity size={12} className="text-emerald-400" />
                    Confianza: {(insight.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Finding & Evidence (Hallazgo Principal) */}
                <div className="md:col-span-7 space-y-2">
                  <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider block">Hallazgo Principal</span>
                  <p className="text-white text-base leading-relaxed font-medium">
                    {insight.evidence}
                  </p>
                  <p className="text-gray-400 text-xs leading-normal italic pt-1">
                    {insight.description}
                  </p>
                </div>

                {/* Recommended Action (Acción Recomendada) */}
                <div className="md:col-span-5 bg-white/5 border border-white/5 rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-400 text-xs uppercase font-semibold tracking-wider flex items-center gap-1 mb-2">
                      <CheckSquare size={12} />
                      Acción Recomendada
                    </span>
                    <p className="text-gray-200 text-sm font-semibold leading-relaxed">
                      {insight.action}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-400 flex justify-between items-center">
                    <span>Impacted variables: {insight.impacted_variables.join(', ')}</span>
                    <span className="text-blue-400 font-medium">Prescriptive Plan</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
