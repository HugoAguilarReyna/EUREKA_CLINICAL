import React from 'react';
import { ShieldAlert, Users, Activity, CheckSquare, HelpCircle, ArrowRight } from 'lucide-react';

export interface DecisionInsight {
  finding: string;
  explanation: string;
  impact: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affected_population: number;
}

interface DecisionCardProps {
  insight: DecisionInsight;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ insight }) => {
  const getSeverityStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          border: 'border-red-500/30',
          bg: 'bg-red-500/5',
          text: 'text-red-400',
          badge: 'bg-red-500/20 border border-red-500/30 text-red-300',
          pulse: 'bg-red-500'
        };
      case 'HIGH':
        return {
          border: 'border-orange-500/30',
          bg: 'bg-orange-500/5',
          text: 'text-orange-400',
          badge: 'bg-orange-500/20 border border-orange-500/30 text-orange-300',
          pulse: 'bg-orange-500'
        };
      case 'MEDIUM':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/5',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 border border-amber-500/30 text-amber-300',
          pulse: 'bg-amber-500'
        };
      default:
        return {
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/5',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 border border-blue-500/30 text-blue-300',
          pulse: 'bg-blue-500'
        };
    }
  };

  const styles = getSeverityStyles(insight.urgency);

  return (
    <div 
      className={`glassmorphism rounded-2xl border ${styles.border} ${styles.bg} p-6 flex flex-col justify-between space-y-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(59,130,246,0.08)]`}
    >
      {/* HEADER: Finding and Alert badge */}
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.pulse}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.pulse}`}></span>
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
              Urgencia: {insight.urgency}
            </span>
          </div>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={12} className="text-blue-400" />
              <strong>{insight.affected_population}</strong> afectados
            </span>
            <span className="flex items-center gap-1">
              <Activity size={12} className="text-emerald-400" />
              <strong>{insight.confidence.toFixed(1)}%</strong> Confianza
            </span>
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
          {insight.finding}
        </h3>
      </div>

      {/* BODY: What does it mean? */}
      <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5 font-mono">
          <HelpCircle size={12} className="text-blue-400" />
          ¿Qué significa?
        </span>
        <p className="text-gray-300 text-sm leading-relaxed font-medium">
          {insight.explanation}
        </p>
        {insight.evidence && insight.evidence.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5 items-center">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono mr-1">Reglas de soporte:</span>
            {insight.evidence.map((rule, idx) => (
              <span key={idx} className="bg-white/5 text-gray-400 border border-white/5 text-[9px] px-2 py-0.5 rounded font-mono">
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER: Recommended Action */}
      <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 space-y-2">
        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 font-mono">
          <CheckSquare size={12} />
          Acción recomendada
        </span>
        <p className="text-gray-200 text-sm font-semibold leading-relaxed">
          {insight.recommendation}
        </p>
      </div>
    </div>
  );
};
