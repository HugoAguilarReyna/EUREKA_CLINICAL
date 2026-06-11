import re
from typing import Dict, Any, Optional, List
from backend.graph.client import Neo4jClient
from backend.explainability.clinical_explainability import ClinicalExplainabilityEngine
from backend.intelligence.scientific_insight_engine import ScientificInsightEngine

class KnowledgeCopilot:
    def __init__(self):
        self.client = Neo4jClient()
        self.explainer = ClinicalExplainabilityEngine()
        self.insight_engine = ScientificInsightEngine()

    def ask(self, question: str) -> Dict[str, Any]:
        q = question.lower().strip()

        if any(kw in q for kw in ["how many patients", "cuántos pacientes"]):
            return self._answer_count_patients()

        if any(kw in q for kw in ["variables son más importantes", "most important variables"]):
            return self._answer_variable_importance()

        if any(kw in q for kw in ["descubrimientos encontraste", "hallazgos encontraste"]):
            return self._answer_discoveries()

        if any(kw in q for kw in ["principales riesgos", "qué riesgos"]):
            return self._answer_risks()

        if any(kw in q for kw in ["acciones recomiendas", "acciones sugeridas"]):
            return self._answer_actions()

        patient_match = re.search(r"patient[_\s-]?(\d+)", q)
        if patient_match:
            return self._answer_patient_explain(f"Patient_{patient_match.group(1)}")

        if q in ["por qué?", "por que?", "why?", "why"]:
            return self._answer_why()

        if any(kw in q for kw in ["evidencia respalda", "evidence backs"]):
            return self._answer_evidence()

        return self._answer_fallback()

    def _format_metadata(self, insight) -> str:
        return f"[{insight.provenance_type.value}] [Confianza: {insight.confidence:.1f}%] [Test: {insight.test_used}]"

    def _answer_count_patients(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        sample = insights[0].sample_size if insights else 0
        return {"answer": f"**Hallazgo**: Se analizaron {sample} pacientes.\n{self._format_metadata(insights[0]) if insights else ''}", "data": None}

    def _answer_variable_importance(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        if not insights: return {"answer": "Sin datos.", "data": None}
        top = insights[0]
        return {
            "answer": f"**Hallazgo**: {top.variable} es clave. {top.why_care}\n**Evidencia**: OR={top.odds_ratio:.2f}, p={top.p_value:.4f}.\n{self._format_metadata(top)}",
            "data": None
        }

    def _answer_discoveries(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        if not insights: return {"answer": "Sin descubrimientos.", "data": None}
        desc = "\n".join([f"- {i.title}: {i.finding} {self._format_metadata(i)}" for i in insights[:3]])
        return {"answer": f"**Hallazgos principales:**\n{desc}", "data": None}

    def _answer_risks(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        critical = [i for i in insights if i.severity in ["CRITICAL", "HIGH"]][:3]
        if not critical: return {"answer": "Sin riesgos críticos.", "data": None}
        desc = "\n".join([f"- {i.title}: {i.impact} {self._format_metadata(i)}" for i in critical])
        return {"answer": f"**Riesgos:**\n{desc}", "data": None}

    def _answer_actions(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        if not insights: return {"answer": "Sin acciones.", "data": None}
        desc = "\n".join([f"- {i.recommendation} (Basado en {i.variable}) {self._format_metadata(i)}" for i in insights[:3]])
        return {"answer": f"**Acciones:**\n{desc}", "data": None}

    def _answer_patient_explain(self, patient_id: str) -> Dict[str, Any]:
        try:
            from backend.copilot.semantic_reasoning_adapter import SemanticReasoningAdapter
            adapter = SemanticReasoningAdapter()
            explanation = adapter.explain_patient_risk(patient_id)
            return {"answer": explanation, "data": None}
        except Exception as e:
            return {"answer": f"Error al generar explicación semántica: {str(e)}", "data": None}

    def _answer_why(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        top = insights[0] if insights else None
        return {"answer": f"**Justificación:** Decisiones basadas en Inferencia Estadística. Ej: {top.title if top else ''}.\n{self._format_metadata(top) if top else ''}", "data": None}

    def _answer_evidence(self) -> Dict[str, Any]:
        insights = self.insight_engine.generate_insights()
        top = insights[0] if insights else None
        return {"answer": f"**Evidencia:** Las conclusiones derivan de Machine Learning y tests estadísticos rigurosos como Chi-Square y Fisher.\n{self._format_metadata(top) if top else ''}", "data": None}

    def _answer_fallback(self) -> Dict[str, Any]:
        return {"answer": "Pregunta no reconocida. Las respuestas provienen de motores estadísticos trazables. [GENERATED]", "data": None}
