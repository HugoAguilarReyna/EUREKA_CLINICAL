import React from 'react';
import AuditModeToggle from './AuditModeToggle';

interface CommandBandProps {
  auditMode: boolean;
  setAuditMode: (v: boolean) => void;
}

const CommandBand: React.FC<CommandBandProps> = ({ auditMode, setAuditMode }) => {
  const [overview, setOverview] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/knowledge/executive/overview')
      .then((res) => res.json())
      .then((data) => setOverview(data))
      .catch((e) => console.error('Failed to load overview', e));
  }, []);

  const status = overview?.mission_status ?? '';
  const healthScore = overview?.health_score ?? '';
  const patients = overview?.ground_truth_audit?.patient_count ?? '';
  const decisionConfidence = overview?.ground_truth_audit?.confidence ?? '';
  const bestAction = overview?.top_drivers?.[0]?.name ?? '';
  const expectedImprovement = overview?.ground_truth_audit?.top_action_audit?.value ?? '';
  const lastUpdate = overview?.timestamp ?? '';

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
