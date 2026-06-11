from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.intelligence.dataset_memory import DatasetHistoryRecord
from backend.intelligence.validation_engine import ValidationEngine
from backend.intelligence.business_impact_engine import BusinessImpactEngine

class DatasetComparisonDTO(BaseModel):
    finding: str
    previous_value: float
    current_value: float
    delta: float
    impact: str
    recommendation: str
    severity: str = "LOW"

class ComparisonEngine:
    def __init__(self):
        self.validator = ValidationEngine(confidence_threshold=0.90)
        self.business_engine = BusinessImpactEngine()

    def compare_snapshots(self, snapshot_a: DatasetHistoryRecord, snapshot_b: DatasetHistoryRecord) -> List[DatasetComparisonDTO]:
        """
        Compares snapshot A (older) with snapshot B (newer).
        Returns a list of significant business findings.
        """
        findings = []
        
        # 1. Compare feature correlations (target relevance changes)
        features_a = {f["feature"]: f["correlation"] for f in snapshot_a.top_features if "feature" in f}
        features_b = {f["feature"]: f["correlation"] for f in snapshot_b.top_features if "feature" in f}
        
        for feature, corr_b in features_b.items():
            corr_a = features_a.get(feature)
            if corr_a is not None:
                delta = abs(corr_b) - abs(corr_a)
                if abs(delta) > 0.05: # Arbitrary significance threshold for correlations
                    direction = "aumentó" if delta > 0 else "disminuyó"
                    impact = f"La asociación con la enfermedad {direction} significativamente."
                    recommendation = f"Ajustar los modelos de riesgo para {'dar más peso a' if delta > 0 else 'reducir el peso de'} {feature}."
                    
                    findings.append(DatasetComparisonDTO(
                        finding=f"La relevancia clínica de {feature} {direction}",
                        previous_value=round(abs(corr_a), 4),
                        current_value=round(abs(corr_b), 4),
                        delta=round(delta, 4),
                        impact=impact,
                        recommendation=recommendation
                    ))

        # 2. Compare Insights (Prevalence changes in specific cohorts)
        insights_a = {i["id"]: i for i in snapshot_a.insights if "id" in i}
        insights_b = {i["id"]: i for i in snapshot_b.insights if "id" in i}
        
        total_a = snapshot_a.rows
        total_b = snapshot_b.rows
        
        for insight_id, ib in insights_b.items():
            ia = insights_a.get(insight_id)
            if ia:
                count_a = ia.get("affected_population", 0)
                count_b = ib.get("affected_population", 0)
                
                # Use ValidationEngine
                name = ib.get("title", insight_id)
                validation = self.validator.validate_proportion_change(name, count_a, total_a, count_b, total_b)
                
                if validation.is_significant:
                    direction = "aumentó" if validation.absolute_change > 0 else "disminuyó"
                    impact_text = "Mayor población en riesgo" if direction == "aumentó" else "Reducción de la población en riesgo"
                    
                    # Business Engine
                    severity = self.business_engine.evaluate_impact(name, validation.absolute_change, validation.relative_change, validation.is_significant)
                    rec_text = self.business_engine.generate_recommendation(name, severity, direction)
                    
                    finding_text = f"La prevalencia de '{name}' {direction} significativamente"
                    
                    findings.append(DatasetComparisonDTO(
                        finding=finding_text,
                        previous_value=round((count_a/total_a)*100, 1) if total_a else 0,
                        current_value=round((count_b/total_b)*100, 1) if total_b else 0,
                        delta=validation.absolute_change,
                        impact=impact_text,
                        recommendation=rec_text,
                        severity=severity
                    ))
            else:
                # Appeared
                name = ib.get("title", insight_id)
                count_b = ib.get("affected_population", 0)
                val_b = round((count_b/total_b)*100, 1) if total_b else 0
                
                severity = self.business_engine.evaluate_impact(name, val_b, val_b, True)
                rec_text = f"Nuevo riesgo detectado. Severidad: {severity}. Activar protocolo de contención."
                
                findings.append(DatasetComparisonDTO(
                    finding=f"Nuevo riesgo detectado: {name}",
                    previous_value=0.0,
                    current_value=val_b,
                    delta=val_b,
                    impact="Nueva cohorte clínica identificada",
                    recommendation=rec_text,
                    severity=severity
                ))
                
        # What disappeared
        for insight_id, ia in insights_a.items():
            if insight_id not in insights_b:
                name = ia.get("title", insight_id)
                count_a = ia.get("affected_population", 0)
                val_a = round((count_a/total_a)*100, 1) if total_a else 0
                
                severity = self.business_engine.evaluate_impact(name, -val_a, -100, True)
                
                findings.append(DatasetComparisonDTO(
                    finding=f"Riesgo mitigado o desaparecido: {name}",
                    previous_value=val_a,
                    current_value=0.0,
                    delta=-val_a,
                    impact="Subgrupo clínico dejó de ser estadísticamente relevante",
                    recommendation="Rebajar la prioridad de este criterio en los paneles de triaje.",
                    severity=severity
                ))
                
        return findings
