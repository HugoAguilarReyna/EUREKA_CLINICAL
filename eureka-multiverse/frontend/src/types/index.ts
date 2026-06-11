export interface FeatureMapDTO {
  Age?: number;
  Gender?: string;
  TB: number;
  DB: number;
  Alkphos: number;
  Sgpt?: number;
  Sgot: number;
  TP: number;
  ALB: number;
  A_G_Ratio?: number;
}

export interface CaseResponseDTO {
  case_id: string;
  patient_id: string;
  status: string;
  raw_data: FeatureMapDTO;
  prediction_result?: any;
  fuzzy_interpretation?: any;
  recommendation?: any;
  action_plan?: any[];
  started_at: string;
  completed_at?: string;
}

export interface TimelineEventDTO {
  timestamp: string;
  stage: string;
  event: string;
  payload: any;
}

export interface MemoryTimelineDTO {
  case_id: string;
  logs_count: number;
  episodes_count: number;
  timeline: TimelineEventDTO[];
}
