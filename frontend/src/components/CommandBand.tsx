import React from 'react';
import AuditModeToggle from './AuditModeToggle';

interface CommandBandProps {
  auditMode: boolean;
  setAuditMode: (v: boolean) => void;
}

const CommandBand: React.FC<CommandBandProps> = ({ auditMode, setAuditMode }) => {
  // Placeholder data – in real app replace with hooks pulling from backend
  const status = 'CRITICAL';
  const healthScore = 5;
  const patients = 392;
  const decisionConfidence = '84%';
  const bestAction = 'TARGET ALKPHOS';
  const expectedImprovement = '221 PATIENTS';
  const lastUpdate = '2024-09-01 12:34';

  return (
    <div className="command-band" data-testid="command-band">
      <div className="command-item">STATUS: {status}</div>
      <div className="command-item">HEALTH SCORE: {healthScore}</div>
      <div className="command-item">PATIENTS: {patients}</div>
      <div className="command-item">DECISION CONFIDENCE: {decisionConfidence}</div>
      <div className="command-item">BEST ACTION: {bestAction}</div>
      <div className="command-item">EXPECTED IMPROVEMENT: {expectedImprovement}</div>
      <div className="command-item">LAST UPDATE: {lastUpdate}</div>
      <div className="audit-toggle">
        <AuditModeToggle checked={auditMode} onChange={setAuditMode} />
      </div>
    </div>
  );
};

export default CommandBand;
