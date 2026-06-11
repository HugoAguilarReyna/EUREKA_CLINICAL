from pydantic import BaseModel
from typing import List, Literal, Dict, Any, Optional
import pandas as pd
import numpy as np
from scipy.stats import fisher_exact
from backend.intelligence.risk_engine import get_neo4j_df
from backend.graph.client import Neo4jClient
from backend.graph.logger import logger
from backend.intelligence.provenance import ProvenanceType

class ExecutiveInsightDTO(BaseModel):
    # Mandatory Phase 1 fields
    finding: str
    explanation: str
    impact: str
    confidence: float
    evidence: List[str]
    recommendation: str
    urgency: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    affected_population: int
    diseased_population: int
    healthy_population: int

    # Backwards compatibility fields
    id: str
    title: str
    why_care: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    next_analysis_suggested: str
    sample_size: int
    evidence_count: int
    method: str
    priority: float
    supporting_variables: List[str]
    
    # Provenance Layer
    provenance_type: ProvenanceType
    provenance_source: str
    provenance_method: str
    recommendation_type: str

    # Transparency Severity
    incidence: float
    odds_ratio: Optional[float] = None
    relative_risk: Optional[float] = None
    p_value: Optional[float] = None

class ExecutiveInsightEngine:
    def __init__(self):
        self.variables_info = {
            "TB": {
                "name": "Bilirrubina Total",
                "unit": "mg/dL",
                "high_explanation": "La elevación de Bilirrubina Total está asociada a ictericia hepática y daño de vías biliares.",
                "high_recommendation": "Evaluar sospecha de ictericia hepática o colestasis",
                "low_explanation": "La reducción de Bilirrubina Total se encuentra en niveles normales bajos en la cohorte.",
                "low_recommendation": "Monitoreo clínico de rutina",
                "high_action": "Revisar pacientes con valores de Bilirrubina Total superiores al percentil 75 (> 2.6 mg/dL) para evaluar sospecha de ictericia hepática.",
                "low_action": "Revisar pacientes con valores de Bilirrubina Total inferiores al percentil 25 (< 0.8 mg/dL).",
                "high_impact_label": "Asociación muy fuerte con el diagnóstico de enfermedad hepática."
            },
            "DB": {
                "name": "Bilirrubina Directa",
                "unit": "mg/dL",
                "high_explanation": "La elevación de Bilirrubina Directa indica alta probabilidad de colestasis obstructiva intrahepática o extrahepática.",
                "high_recommendation": "Priorizar evaluación hepatobiliar por sospecha de obstrucción",
                "low_explanation": "Bilirrubina Directa en rango bajo esperado.",
                "low_recommendation": "Seguimiento clínico rutinario",
                "high_action": "Revisar pacientes con valores de Bilirrubina Directa superiores al percentil 75 (> 1.3 mg/dL) para identificar sospecha de obstrucción biliar o colestasis.",
                "low_action": "Revisar pacientes con valores de Bilirrubina Directa inferiores al percentil 25 (< 0.2 mg/dL).",
                "high_impact_label": "Asociación crítica con la variable objetivo y marcador principal de riesgo colestásico."
            },
            "Alkphos": {
                "name": "Fosfatasa Alcalina",
                "unit": "IU/L",
                "high_explanation": "La elevación de Fosfatasa Alcalina sugiere compromiso obstructivo de vías biliares o enfermedad ósea.",
                "high_recommendation": "Descartar compromiso de vías biliares e infiltración",
                "low_explanation": "Fosfatasa Alcalina baja sin correlación patológica fuerte en la cohorte.",
                "low_recommendation": "Monitoreo general periódico",
                "high_action": "Revisar pacientes con Fosfatasa Alcalina elevada (> 298.0 IU/L) para descartar posible compromiso de vías biliares o infiltración hepática.",
                "low_action": "Revisar pacientes con Fosfatasa Alcalina baja (< 175.5 IU/L).",
                "high_impact_label": "Forte correlación con la alteración del parénquima biliar."
            },
            "Sgpt": {
                "name": "ALT (Alanina Aminotransferasa)",
                "unit": "IU/L",
                "high_explanation": "La elevación de ALT (Alanina Aminotransferasa) es un indicador directo y específico de lesión y necrosis hepatocelular activa.",
                "high_recommendation": "Evaluar necrosis hepatocelular activa aguda",
                "low_explanation": "ALT en rangos normales bajos.",
                "low_recommendation": "Continuar monitoreo habitual",
                "high_action": "Revisar pacientes con transaminasa ALT/SGPT elevada (> 60.5 IU/L) para evaluar grado de necrosis hepatocelular activa.",
                "low_action": "Revisar transaminasa ALT/SGPT baja (< 23.0 IU/L).",
                "high_impact_label": "Indicador directo de lesión hepática celular aguda."
            },
            "Sgot": {
                "name": "AST (Aspartato Aminotransferasa)",
                "unit": "IU/L",
                "high_explanation": "La elevación de AST (Aspartato Aminotransferasa) indica necrosis de tejidos blandos y lesión hepatocelular concomitante.",
                "high_recommendation": "Valorar daño tisular hepático y muscular",
                "low_explanation": "AST en rangos normales bajos.",
                "low_recommendation": "Continuar monitoreo habitual",
                "high_action": "Revisar pacientes con transaminasa AST/SGOT elevada (> 87.0 IU/L) para valorar sospecha de daño hepático o miocárdico concomitante.",
                "low_action": "Revisar transaminasa AST/SGOT baja (< 25.0 IU/L).",
                "high_impact_label": "Marcador sensible de necrosis de tejidos blandos y lesión hepática."
            },
            "ALB": {
                "name": "Albúmina",
                "unit": "g/dL",
                "high_explanation": "Albúmina en rango superior óptimo.",
                "high_recommendation": "Monitoreo general periódico",
                "low_explanation": "La reducción de Albúmina indica un deterioro en la función de síntesis de proteínas del hígado o malabsorción.",
                "low_recommendation": "Revisar función de síntesis hepática y nutricional",
                "high_action": "Revisar pacientes con Albúmina baja (< 2.6 g/dL) para evaluar deterioro de la función de síntesis hepática o desnutrición.",
                "low_action": "Revisar pacientes con Albúmina alta (> 3.8 g/dL).",
                "high_impact_label": "Indicador del estado de síntesis de proteínas hepáticas."
            },
            "TP": {
                "name": "Proteínas Totales",
                "unit": "g/dL",
                "high_explanation": "Proteínas totales elevadas sin correlación directa de enfermedad hepática activa en la cohorte.",
                "high_recommendation": "Monitoreo clínico habitual",
                "low_explanation": "La reducción de Proteínas Totales refleja un balance negativo de síntesis proteica hepática o desnutrición.",
                "low_recommendation": "Evaluar pérdida renal o desnutrición proteica",
                "high_action": "Revisar pacientes con Proteínas Totales elevadas (> 7.2 g/dL).",
                "low_action": "Revisar pacientes con Proteínas Totales bajas (< 5.8 g/dL) para valorar pérdida renal o malabsorción.",
                "high_impact_label": "Refleja el balance general de síntesis y retención proteica sérica."
            },
            "A/G Ratio": {
                "name": "Relación Albúmina/Globulina",
                "unit": "",
                "high_explanation": "Relación Albúmina/Globulina elevada en rango esperado.",
                "high_recommendation": "Monitoreo general periódico",
                "low_explanation": "Una relación A/G baja está altamente asociada a procesos inflamatorios crónicos o cirrosis avanzada.",
                "low_recommendation": "Descartar cirrosis y procesos inflamatorios crónicos",
                "high_action": "Revisar pacientes con relación A/G elevada (> 1.1).",
                "low_action": "Revisar pacientes con relación A/G baja (< 0.7) para descartar posible inflamación crónica o cirrosis avanzada.",
                "high_impact_label": "Asociación muy fuerte con procesos inflamatorios de larga duración y cirrosis."
            }
        }

    def generate_insights(self) -> List[ExecutiveInsightDTO]:
        df = get_neo4j_df()
        if df.empty or "Selector" not in df.columns:
            logger.warning("ExecutiveInsightEngine: empty DataFrame or missing Selector.")
            return []

        # Selector=1 means liver disease, 2 means healthy
        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        
        total_patients = len(df)
        total_diseased = int(df["target"].sum())
        total_healthy = total_patients - total_diseased
        
        if total_diseased == 0 or total_healthy == 0:
            return []

        baseline_prevalence = total_diseased / total_patients
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]
        
        insights = []
        insight_idx = 0
        
        for col in features:
            val_col = df[col].dropna()
            if len(val_col) < 20:
                continue
                
            q75 = val_col.quantile(0.75)
            q25 = val_col.quantile(0.25)
            
            # Absolute Pearson correlation coefficient
            correlation = df[col].corr(df["target"])
            if np.isnan(correlation):
                correlation = 0.0
            
            info = self.variables_info.get(col, {
                "name": col, "unit": "", 
                "high_explanation": f"Elevación de {col} detectada.",
                "high_recommendation": f"Evaluar niveles de {col}",
                "low_explanation": f"Reducción de {col} detectada.",
                "low_recommendation": f"Evaluar niveles de {col}",
                "high_action": f"Revisar pacientes con {col} elevado.",
                "low_action": f"Revisar pacientes con {col} bajo.",
                "high_impact_label": f"Asociación con {col} elevado.",
                "low_impact_label": f"Asociación con {col} bajo."
            })
            
            # Test High (col > Q75)
            subset_high = df[df[col] > q75]
            if len(subset_high) >= 10:
                diseased_high = int(subset_high["target"].sum())
                total_high = len(subset_high)
                healthy_high = total_high - diseased_high
                incidence_high = diseased_high / total_high
                
                # We only show insights with incidence higher than baseline
                if incidence_high > baseline_prevalence:
                    insight_idx += 1
                    
                    # Risk level mapping based on incidence (Maintained Heuristic)
                    severity = "CRITICAL" if incidence_high >= 0.85 else "HIGH" if incidence_high >= 0.70 else "MEDIUM" if incidence_high >= 0.50 else "LOW"
                    
                    priority = (total_high / total_patients) * abs(correlation) * incidence_high * 100.0
                    
                    # Calculate new metrics
                    diseased_rest = total_diseased - diseased_high
                    healthy_rest = total_healthy - healthy_high
                    
                    try:
                        odds_ratio, p_value = fisher_exact([[diseased_high, healthy_high], [diseased_rest, healthy_rest]])
                    except Exception:
                        odds_ratio, p_value = None, None
                        
                    total_rest = total_patients - total_high
                    if total_rest > 0 and (diseased_rest / total_rest) > 0:
                        relative_risk = incidence_high / (diseased_rest / total_rest)
                        ratio = (diseased_high / total_diseased) / (healthy_high / total_healthy) if healthy_high > 0 else 10.0
                    else:
                        relative_risk = None
                        ratio = 10.0
                        
                    why_care = f"Los pacientes con esta característica aparecen {ratio:.1f} veces más frecuentemente en la población con enfermedad que en la población sana."
                    pct_poblacion = (total_high / total_patients) * 100
                    impact = f"{pct_poblacion:.1f}% de la población ({total_high} pacientes se encuentran por encima de los límites normales)."
                    
                    insights.append(ExecutiveInsightDTO(
                        finding=f"{total_high} pacientes presentan {info['name']} elevada",
                        explanation=info["high_explanation"],
                        impact=impact,
                        confidence=round(incidence_high * 100, 1),
                        evidence=[f"{col} > P75", "Selector = Enfermo"],
                        recommendation=info["high_recommendation"],
                        urgency=severity,
                        affected_population=total_high,
                        diseased_population=diseased_high,
                        healthy_population=healthy_high,
                        id=f"INSIGHT_{insight_idx}_{col}_HIGH",
                        title=f"Riesgo Elevado: {info['name']} Alto",
                        why_care=why_care,
                        severity=severity,
                        next_analysis_suggested=info["high_action"],
                        sample_size=total_patients,
                        evidence_count=diseased_high,  # FIX A1: evidence is now diseased, not affected
                        method="Correlación y Descubrimiento de Subgrupos",
                        priority=round(priority, 4),
                        supporting_variables=[col],
                        provenance_type=ProvenanceType.DATA_DRIVEN,
                        provenance_source="neo4j_empirical",
                        provenance_method="Pearson Correlation & Percentile Discovery",
                        recommendation_type="EXPERT_RULE",
                        incidence=incidence_high,
                        odds_ratio=odds_ratio if odds_ratio != float('inf') else 999.0,
                        relative_risk=relative_risk,
                        p_value=p_value
                    ))
                    
            # Test Low (col < Q25)
            subset_low = df[df[col] < q25]
            if len(subset_low) >= 10:
                diseased_low = int(subset_low["target"].sum())
                total_low = len(subset_low)
                healthy_low = total_low - diseased_low
                incidence_low = diseased_low / total_low
                
                if incidence_low > baseline_prevalence:
                    insight_idx += 1
                    
                    severity = "CRITICAL" if incidence_low >= 0.85 else "HIGH" if incidence_low >= 0.70 else "MEDIUM" if incidence_low >= 0.50 else "LOW"
                    priority = (total_low / total_patients) * abs(correlation) * incidence_low * 100.0
                    
                    # Calculate new metrics
                    diseased_rest = total_diseased - diseased_low
                    healthy_rest = total_healthy - healthy_low
                    
                    try:
                        odds_ratio, p_value = fisher_exact([[diseased_low, healthy_low], [diseased_rest, healthy_rest]])
                    except Exception:
                        odds_ratio, p_value = None, None
                        
                    total_rest = total_patients - total_low
                    if total_rest > 0 and (diseased_rest / total_rest) > 0:
                        relative_risk = incidence_low / (diseased_rest / total_rest)
                        ratio = (diseased_low / total_diseased) / (healthy_low / total_healthy) if healthy_low > 0 else 10.0
                    else:
                        relative_risk = None
                        ratio = 10.0
                        
                    why_care = f"Los pacientes con esta característica aparecen {ratio:.1f} veces más frecuentemente en la población con enfermedad que en la población sana."
                    pct_poblacion = (total_low / total_patients) * 100
                    impact = f"{pct_poblacion:.1f}% de la población ({total_low} pacientes se encuentran por debajo de los límites normales)."
                    
                    insights.append(ExecutiveInsightDTO(
                        finding=f"{total_low} pacientes presentan {info['name']} reducida",
                        explanation=info["low_explanation"],
                        impact=impact,
                        confidence=round(incidence_low * 100, 1),
                        evidence=[f"{col} < P25", "Selector = Enfermo"],
                        recommendation=info["low_recommendation"],
                        urgency=severity,
                        affected_population=total_low,
                        diseased_population=diseased_low,
                        healthy_population=healthy_low,
                        id=f"INSIGHT_{insight_idx}_{col}_LOW",
                        title=f"Riesgo Elevado: {info['name']} Bajo",
                        why_care=why_care,
                        severity=severity,
                        next_analysis_suggested=info["low_action"],
                        sample_size=total_patients,
                        evidence_count=diseased_low,  # FIX A1
                        method="Correlación y Descubrimiento de Subgrupos",
                        priority=round(priority, 4),
                        supporting_variables=[col],
                        provenance_type=ProvenanceType.DATA_DRIVEN,
                        provenance_source="neo4j_empirical",
                        provenance_method="Pearson Correlation & Percentile Discovery",
                        recommendation_type="EXPERT_RULE",
                        incidence=incidence_low,
                        odds_ratio=odds_ratio if odds_ratio != float('inf') else 999.0,
                        relative_risk=relative_risk,
                        p_value=p_value
                    ))
                    
        # Sort insights by priority score descending
        insights.sort(key=lambda x: x.priority, reverse=True)
        return insights
