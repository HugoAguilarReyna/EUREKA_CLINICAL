/* frontend/src/types/case.ts */
export interface Case {
  age: number;
  gender: 'male' | 'female' | 'other';
  tb: number;
  db: number;
  alkphos: number;
  sgpt: number;
  sgot: number;
  tp: number;
  alB: number;
  agRatio: number;
}

export interface CaseSummary {
  caseId: string;
  createdAt: string; // ISO timestamp
}

export interface PredictionResult {
  caseId: string;
  predictionScore: number; // 0-1 normalized
  fuzzyRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  executionTimeMs: number;
}

export interface MemoryEvent {
  timestamp: string; // ISO timestamp
  event: string;
  detail?: string;
}

export interface AgentLog {
  agent: string;
  status: 'SUCCESS' | 'RUNNING' | 'ERROR';
  message?: string;
  timestamp: string;
}
