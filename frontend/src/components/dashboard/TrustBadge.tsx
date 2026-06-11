import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

export type TrustStatus = 'VERIFIED' | 'PARTIALLY VERIFIED' | 'UNVERIFIED';

export interface TrustBadgeProps {
  status: TrustStatus;
  confidence?: number;
  datasetOrigin: string;
  methodology: string;
  timestamp: string;
  pValue?: number;
  oddsRatio?: number;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  status,
  confidence,
  datasetOrigin,
  methodology,
  timestamp,
  pValue,
  oddsRatio
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'VERIFIED':
        return {
          icon: <ShieldCheck size={16} />,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10',
          border: 'border-emerald-400/20'
        };
      case 'PARTIALLY VERIFIED':
        return {
          icon: <Shield size={16} />,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          border: 'border-amber-400/20'
        };
      case 'UNVERIFIED':
      default:
        return {
          icon: <ShieldAlert size={16} />,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-400/20'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className={`flex items-center gap-2 font-bold ${config.color}`}>
        {config.icon}
        <span className="text-xs uppercase tracking-wider">{status}</span>
        {confidence !== undefined && confidence !== null && (
          <span className="ml-auto text-sm font-mono">{confidence.toFixed(1)}% Confianza</span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[10px] text-gray-400 font-mono">
        <div>
          <span className="text-gray-500">Origen:</span> {datasetOrigin}
        </div>
        <div>
          <span className="text-gray-500">Método:</span> {methodology}
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Timestamp:</span> {timestamp}
        </div>
        {pValue !== undefined && pValue !== null && (
          <div>
            <span className="text-gray-500">P-Value:</span> {pValue < 0.0001 ? '<0.0001' : pValue.toFixed(4)}
          </div>
        )}
        {oddsRatio !== undefined && oddsRatio !== null && (
          <div>
            <span className="text-gray-500">Odds Ratio:</span> {oddsRatio > 900 ? '>10' : oddsRatio.toFixed(2)}
          </div>
        )}
      </div>
      
      {status === 'UNVERIFIED' && (
        <div className="mt-2 text-[10px] text-red-400/80 italic border-t border-red-400/20 pt-2">
          Advertencia: Este hallazgo carece de respaldo estadístico validado. No utilizar para decisiones críticas.
        </div>
      )}
    </div>
  );
};
