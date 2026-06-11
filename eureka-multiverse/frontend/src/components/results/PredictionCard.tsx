import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCase } from '../../api/client';
import { useStore } from '../../store/useStore';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export const PredictionCard: React.FC = () => {
  const currentCaseId = useStore((state) => state.currentCaseId);
  
  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', currentCaseId],
    queryFn: () => getCase(currentCaseId!),
    enabled: !!currentCaseId,
  });

  if (!currentCaseId) return null;
  if (isLoading) return <div className="glass-panel p-6 animate-pulse h-32" />;

  if (!caseData) return null;

  const risk = caseData.fuzzy_interpretation?.fuzzy_class || 'UNKNOWN';
  const rec = caseData.recommendation?.detail || '';
  
  const riskColor = risk === 'HIGH' ? 'text-red-400' : risk === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400';
  const Icon = risk === 'HIGH' ? AlertCircle : risk === 'MEDIUM' ? AlertTriangle : CheckCircle;

  return (
    <div className="glass-panel p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-200">Prescription Result</h2>
      <div className="flex items-center gap-4">
        <Icon className={`w-10 h-10 ${riskColor}`} />
        <div>
          <p className="text-sm text-slate-400">Determined Risk Level</p>
          <p className={`text-2xl font-bold ${riskColor}`}>{risk}</p>
        </div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <p className="text-sm font-semibold text-slate-300">Prescriptor Recommendation:</p>
        <p className="text-slate-400 mt-1">{rec}</p>
      </div>
    </div>
  );
};
