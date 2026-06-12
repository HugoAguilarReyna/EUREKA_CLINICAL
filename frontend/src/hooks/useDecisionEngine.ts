import { useMemo } from 'react';
import { SimulationResult } from '../types/twin-simulator';

export type Readiness = "READY FOR EXECUTION" | "CAUTION ADVISED" | "NOT RECOMMENDED";

export interface DecisionAction {
  id: string;
  title: string;
  clinicalScore: number;
  interventionScore: number | null;
  decisionScore: number;
  rank: number;
  readiness: Readiness;
}

export interface DecisionExplainability {
  isSimulated: boolean;
  previousLeader: string;
  newLeader: string;
  patientsDelta: number;
  healthDelta: number;
  riskDelta: number;
  leadershipChanged: boolean;
}

export interface DecisionEngineOutput {
  rankedActions: DecisionAction[];
  recommendedAction: DecisionAction | null;
  decisionGap: number;
  explainability: DecisionExplainability;
  metrics: {
    patientsDelta: number;
    healthDelta: number;
    riskDelta: number;
  };
}

// Exported for external usage if necessary (like comparing past scenarios)
export const calculateInterventionScore = (pDelta: number, hDelta: number, rDelta: number): number => {
  if (typeof pDelta !== 'number' || Number.isNaN(pDelta)) return 50;
  const base = 50;
  const pContribution = -pDelta * 1;
  const hContribution = hDelta * 2;
  const rContribution = -rDelta * 5;
  const rawScore = base + pContribution + hContribution + rContribution;
  return Math.max(0, Math.min(100, rawScore));
};

export const getReadiness = (score: number): Readiness => {
  if (score >= 70) return "READY FOR EXECUTION";
  if (score < 40) return "NOT RECOMMENDED";
  return "CAUTION ADVISED";
};

export const useDecisionEngine = (
  baselineOverview: any,
  currentSimulation: SimulationResult | null,
  activeModifications: Map<string, number>
): DecisionEngineOutput => {
  return useMemo(() => {
    // 1. EXTRACT DATA
    const alerts = baselineOverview?.priority_alerts || [];
    const baselineLeader = alerts[0]?.title || 'Unknown';
    const isSimulated = !!currentSimulation;
    
    // Extracted deltas
    const patientsDelta = currentSimulation?.critical_patients_delta || 0;
    const healthDelta = currentSimulation?.health_score_delta || 0;
    const riskDelta = currentSimulation?.critical_risks_delta || 0;

    const simulatedInterventionScore = isSimulated 
      ? calculateInterventionScore(patientsDelta, healthDelta, riskDelta)
      : null;

    // Simulated driver (we assume 1 active modification or grab driver from baseline)
    const simulatedDriver = Array.from(activeModifications.keys())[0] 
                            || baselineOverview?.root_cause?.driver 
                            || '';

    // 2. NORMALIZE KNOWLEDGE GRAPH (Clinical Importance)
    const maxPriority = alerts.reduce((max: number, a: any) => Math.max(max, a.priority_score || 0), 0.001);

    // 3. APPLY ENGINE LOGIC
    const actions: DecisionAction[] = alerts.map((a: any) => {
      const clinicalScore = ((a.priority_score || 0) / maxPriority) * 100;
      
      let interventionScore: number | null = null;
      if (isSimulated && a.title.toUpperCase().includes(simulatedDriver.toUpperCase())) {
        interventionScore = simulatedInterventionScore;
      }

      const effectiveInterventionScore = interventionScore ?? 50;
      const decisionScore = (clinicalScore * 0.60) + (effectiveInterventionScore * 0.40);

      return {
        id: a.id || a.title,
        title: a.title,
        clinicalScore,
        interventionScore,
        decisionScore,
        rank: 0, // Assigned later
        readiness: getReadiness(decisionScore)
      };
    });

    // 4. DYNAMIC RANKING
    actions.sort((a, b) => b.decisionScore - a.decisionScore);
    actions.forEach((a, i) => { a.rank = i + 1; });

    // 5. CALCULATE GAP & RECOMMENDATION
    const recommendedAction = actions[0] || null;
    const runnerUp = actions[1];
    const decisionGap = (recommendedAction && runnerUp) ? (recommendedAction.decisionScore - runnerUp.decisionScore) : 0;

    // 6. STRUCTURED EXPLAINABILITY
    const newLeader = recommendedAction?.title || 'Unknown';
    const leadershipChanged = baselineLeader !== newLeader;

    const explainability: DecisionExplainability = {
      isSimulated,
      previousLeader: baselineLeader,
      newLeader,
      patientsDelta,
      healthDelta,
      riskDelta,
      leadershipChanged
    };

    return {
      rankedActions: actions,
      recommendedAction,
      decisionGap,
      explainability,
      metrics: {
        patientsDelta,
        healthDelta,
        riskDelta
      }
    };

  }, [baselineOverview, currentSimulation, activeModifications]);
};
