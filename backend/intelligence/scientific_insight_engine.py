from pydantic import BaseModel
from typing import List, Literal, Dict, Any, Optional
import pandas as pd
from backend.intelligence.discovery_engine import DiscoveryEngine
from backend.intelligence.feature_importance_engine import FeatureImportanceEngine
from backend.intelligence.multivariate_engine import MultivariateEngine
from backend.intelligence.provenance import ProvenanceType
from backend.intelligence.risk_engine import get_neo4j_df

class ScientificInsightDTO(BaseModel):
    # Legacy fields to not break frontend
    id: str
    title: str
    finding: str
    explanation: str
    impact: str
    why_care: str
    confidence: float
    evidence: List[str]
    recommendation: str
    urgency: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    affected_population: int
    diseased_population: int
    healthy_population: int
    evidence_count: int
    next_analysis_suggested: str
    sample_size: int
    priority: float
    supporting_variables: List[str]
    
    # Auditability & Provenance (SafeGuard 5)
    variable: str
    subgroup: str
    test_used: str
    provenance_type: ProvenanceType
    provenance_method: str
    recommendation_type: str
    
    # Statistical Rigor (SafeGuard 5)
    p_value: float
    odds_ratio: float
    relative_risk: Optional[float] = None
    support: int
    feature_importance: float
    
    # Discovery != Causality (SafeGuard 2)
    association_strength: float
    statistical_significance: float
    causal_evidence_level: Literal["ASSOCIATION_ONLY", "HYPOTHESIS_GENERATING", "CAUSALLY_SUPPORTED"] = "ASSOCIATION_ONLY"


class ScientificInsightEngine:
    def __init__(self):
        self.discovery_engine = DiscoveryEngine()
        self.feature_engine = FeatureImportanceEngine()
        self.multivariate_engine = MultivariateEngine()
        
        # Legacy Expert Rules dict to annotate recommendations
        self.variables_info = {
            "TB": {"name": "Bilirrubina Total", "high_recommendation": "Evaluar sospecha de ictericia", "high_action": "Revisar elevación de TB"},
            "DB": {"name": "Bilirrubina Directa", "high_recommendation": "Priorizar evaluación hepatobiliar", "high_action": "Revisar elevación de DB"},
            "Alkphos": {"name": "Fosfatasa Alcalina", "high_recommendation": "Descartar compromiso de vías biliares", "high_action": "Revisar elevación de Alkphos"},
            "Sgpt": {"name": "ALT", "high_recommendation": "Evaluar necrosis hepatocelular", "high_action": "Revisar elevación de ALT"},
            "Sgot": {"name": "AST", "high_recommendation": "Valorar daño tisular hepático", "high_action": "Revisar elevación de AST"},
            "ALB": {"name": "Albúmina", "low_recommendation": "Revisar función de síntesis hepática", "low_action": "Revisar caída de ALB"},
            "TP": {"name": "Proteínas Totales", "low_recommendation": "Evaluar pérdida renal", "low_action": "Revisar caída de TP"},
            "A/G Ratio": {"name": "Relación A/G", "low_recommendation": "Descartar inflamación crónica", "low_action": "Revisar caída de A/G"}
        }

    def generate_insights(self) -> List[ScientificInsightDTO]:
        df = get_neo4j_df()
        if df.empty or "Selector" not in df.columns:
            return []

        df["target"] = df["Selector"].apply(lambda x: int(float(x)) == 1)
        total_patients = len(df)
        total_diseased = int(df["target"].sum())
        
        # 1. Feature Importance Ensemble (SafeGuard 4)
        feature_scores = self.feature_engine.evaluate_features(df)
        fi_map = {item["feature"]: item["ensemble_importance_score"] for item in feature_scores}

        insights = []
        insight_idx = 0
        
        features = [col for col in df.columns if col not in ["patient_id", "Age", "Gender", "Selector", "target"]]
        
        # 2. Univariate Discovery
        for col in features:
            if col not in df.columns: continue
            
            # Subgroup 1: High values (> Q75)
            q75 = df[col].quantile(0.75)
            mask_high = df[col] > q75
            stats_high = self.discovery_engine.evaluate_subgroup(df, mask_high, "target")
            
            self._evaluate_and_add_insight(
                insights, df, mask_high, col, "HIGH", f"{col} > {q75:.2f}", stats_high, fi_map, total_patients, total_diseased
            )
            
            # Subgroup 2: Low values (< Q25)
            q25 = df[col].quantile(0.25)
            mask_low = df[col] < q25
            stats_low = self.discovery_engine.evaluate_subgroup(df, mask_low, "target")
            
            self._evaluate_and_add_insight(
                insights, df, mask_low, col, "LOW", f"{col} < {q25:.2f}", stats_low, fi_map, total_patients, total_diseased
            )

        # 3. Multivariate Discovery
        multi_rules = self.multivariate_engine.find_multivariate_rules(df)
        for r in multi_rules:
            # Reconstruct mask for the rule
            mask = pd.Series(True, index=df.index)
            # Evaluate using Discovery engine to get unified stats format
            # Multivariate engine already returned stats, but let's re-verify
            
            # SafeGuard 3: Insight Quality Filter
            if r["p_value"] <= 0.05 and r["support"] >= 10 and r["odds_ratio"] >= 1.5 and r["confidence"] >= 0.6:
                insight_idx += 1
                
                # Severity Logic
                incidence = r["confidence"]
                urgency = "CRITICAL" if incidence >= 0.85 else "HIGH" if incidence >= 0.70 else "MEDIUM" if incidence >= 0.50 else "LOW"
                
                fi_agg = sum(fi_map.get(f, 0) for f in r["features_involved"]) / len(r["features_involved"])

                impact = f"Esta regla combinada afecta a {r['support']} pacientes, con una probabilidad condicional de enfermedad del {incidence*100:.1f}%."

                insights.append(ScientificInsightDTO(
                    id=f"INSIGHT_MULTI_{insight_idx}",
                    title=f"Riesgo Multivariado: {', '.join(r['features_involved'])}",
                    finding=f"Patrón detectado: {r['rule_string']}",
                    explanation=f"La combinación de estas variables exacerba significativamente el riesgo de enfermedad hepática.",
                    impact=impact,
                    why_care=f"Odds Ratio de {r['odds_ratio']:.1f} indica que la combinación es un fuerte predictor no lineal.",
                    confidence=incidence * 100,
                    evidence=[r['rule_string']],
                    recommendation="Evaluar integralmente las variables combinadas en panel metabólico.",
                    urgency=urgency,
                    severity=urgency,
                    affected_population=r["support"],
                    diseased_population=int(r["support"] * incidence),
                    healthy_population=int(r["support"] * (1 - incidence)),
                    evidence_count=int(r["support"] * incidence),
                    next_analysis_suggested="Revisión de perfiles clínicos que cumplan el patrón",
                    sample_size=total_patients,
                    priority=r["odds_ratio"] * fi_agg * 100,
                    supporting_variables=r["features_involved"],
                    
                    variable="Multiple",
                    subgroup=r["rule_string"],
                    test_used="Decision Tree Subgroup + Fisher Exact Test",
                    provenance_type=ProvenanceType.DATA_DRIVEN,
                    provenance_method="Decision Tree Subgroup Discovery",
                    recommendation_type="GENERATED",
                    
                    p_value=r["p_value"],
                    odds_ratio=r["odds_ratio"],
                    relative_risk=r["relative_risk"],
                    support=r["support"],
                    feature_importance=fi_agg,
                    
                    association_strength=r["odds_ratio"],
                    statistical_significance=1 - r["p_value"],
                    causal_evidence_level="HYPOTHESIS_GENERATING"
                ))

        insights.sort(key=lambda x: x.priority, reverse=True)
        return insights

    def _evaluate_and_add_insight(self, insights, df, mask, col, direction, subgroup_label, stats, fi_map, total_patients, total_diseased):
        # SafeGuard 3: Insight Quality Filter
        # p_value <= 0.05, support >= minimum_support, effect_size >= threshold, confidence >= threshold
        
        support = stats.get("support", 0)
        p_value = stats.get("p_value", 1.0)
        odds_ratio = stats.get("odds_ratio", 1.0)
        
        if support < 10 or p_value > 0.05 or odds_ratio < 1.5:
            return  # Rejected by Quality Filter
            
        subset = df[mask]
        diseased_count = int(subset["target"].sum())
        incidence = diseased_count / support if support > 0 else 0
        
        if incidence < 0.6:
            return # Rejected by confidence threshold
            
        # Passed filters
        urgency = "CRITICAL" if incidence >= 0.85 else "HIGH" if incidence >= 0.70 else "MEDIUM" if incidence >= 0.50 else "LOW"
        info = self.variables_info.get(col, {})
        
        recomm = info.get(f"{direction.lower()}_recommendation", f"Evaluar niveles de {col}")
        action = info.get(f"{direction.lower()}_action", f"Revisar desviación de {col}")
        name = info.get("name", col)
        
        fi = fi_map.get(col, 0.5)
        
        impact = f"{support} pacientes bajo la regla ({incidence*100:.1f}% tasa de positividad)."
        
        insights.append(ScientificInsightDTO(
            id=f"INSIGHT_{col}_{direction}",
            title=f"Riesgo Estadístico: {name} {direction}",
            finding=f"El subgrupo {subgroup_label} muestra asociación significativa.",
            explanation=f"Aumento probabilístico de enfermedad detectado matemáticamente.",
            impact=impact,
            why_care=f"Odds Ratio = {odds_ratio:.2f}. P-Value = {p_value:.4e}.",
            confidence=incidence * 100,
            evidence=[subgroup_label],
            recommendation=recomm,
            urgency=urgency,
            severity=urgency,
            affected_population=support,
            diseased_population=diseased_count,
            healthy_population=support - diseased_count,
            evidence_count=diseased_count,
            next_analysis_suggested=action,
            sample_size=total_patients,
            priority=odds_ratio * fi * 100,
            supporting_variables=[col],
            
            variable=col,
            subgroup=subgroup_label,
            test_used=stats["test_used"],
            provenance_type=ProvenanceType.DATA_DRIVEN,
            provenance_method="Ensemble Statistical Discovery",
            recommendation_type="EXPERT_RULE" if col in self.variables_info else "GENERATED",
            
            p_value=p_value,
            odds_ratio=odds_ratio,
            relative_risk=stats.get("relative_risk"),
            support=support,
            feature_importance=fi,
            
            association_strength=odds_ratio,
            statistical_significance=1 - p_value,
            causal_evidence_level="ASSOCIATION_ONLY"
        ))
