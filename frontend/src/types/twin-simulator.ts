export interface Modification {
  variable: string;
  change_pct: number;
}

export interface ModificationApplied {
  variable: string;
  change_pct: number;
  impact: number;
}

export interface SimulationResult {
  baseline_health_score: number;
  projected_health_score: number;
  health_score_delta: number;
  
  baseline_critical_patients: number;
  projected_critical_patients: number;
  critical_patients_delta: number;
  
  baseline_critical_risks: number;
  projected_critical_risks: number;
  critical_risks_delta: number;
  
  confidence: number;
  modifications_applied: ModificationApplied[];
}

export interface Scenario {
  id: string;
  name: string;
  timestamp: string;
  modifications: Modification[];
  results: SimulationResult;
}

export interface Overview {
  mission_status: string;
  health_score: number;
  timestamp: number;
  root_cause: {
    driver: string;
    impact: number;
    confidence: number;
    affected_patients: number;
  };
  top_drivers: { name: string; impact: number }[];
  priority_alerts: any[];
  ground_truth_audit: any;
}
