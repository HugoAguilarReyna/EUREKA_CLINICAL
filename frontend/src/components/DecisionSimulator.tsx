import React from 'react';

const DecisionSimulator: React.FC = () => {
  // Placeholder data – replace with real backend hooks
  const currentState = {
    patients: 392,
    healthScore: 5,
    driver: 'ALKPHOS',
  };
  const ifWeAct = {
    patients: 171,
    healthScore: 32,
    driver: 'ALB',
  };
  const improvement = {
    patientsSaved: 221,
    riskReduction: '56%',
    confidence: '84%',
  };

  return (
    <div className="panel decision-simulator" data-testid="decision-simulator">
      <pre>
CURRENT STATE
Critical Patients: {currentState.patients}
Health Score: {currentState.healthScore}
Primary Driver: {currentState.driver}

IF WE ACT
Critical Patients: {ifWeAct.patients}
Health Score: {ifWeAct.healthScore}
Primary Driver: {ifWeAct.driver}

IMPROVEMENT
Patients Saved: {improvement.patientsSaved}
Risk Reduction: {improvement.riskReduction}
Confidence: {improvement.confidence}
      </pre>
    </div>
  );
};

export default DecisionSimulator;
