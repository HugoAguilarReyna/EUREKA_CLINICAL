import React, { useState, useEffect } from 'react';

const DecisionSimulator: React.FC = () => {
  const [data, setData] = useState<{
    currentState: { patients: number; healthScore: number; driver: string };
    ifWeAct: { patients: number; healthScore: number; driver: string };
    improvement: { patientsSaved: number; riskReduction: string; confidence: string };
  } | null>(null);

  useEffect(() => {
    fetch('/knowledge/executive/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
      .then((res) => res.json())
      .then((data) => setData(data?.simulation || null))
      .catch((err) => console.error('Error fetching simulation:', err));
  }, []);

  if (!data) return <div>No simulation data available</div>;

  const { currentState, ifWeAct, improvement } = data;

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
