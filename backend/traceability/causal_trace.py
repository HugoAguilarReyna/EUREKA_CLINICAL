"""
Sprint 3D.5 — FASE 7: Causal Traceability Engine
Traces the full reasoning path: Raw Data → Interpretation → Clinical State → Association → Prediction
All evidence derived from real Neo4j graph — NO hardcoding.
"""
import json
from typing import List, Dict, Any, Optional
from backend.graph.client import Neo4jClient
from backend.graph.logger import logger
from backend.explainability.clinical_explainability import (
    ClinicalExplainabilityEngine, VARIABLE_INFO, _get_var_info
)


class CausalTraceEngine:
    """
    Builds a 5-layer causal trace for a patient classification.
    
    Layer 1: Source Data        — raw lab values from Neo4j
    Layer 2: Interpretation     — high/low/normal classification
    Layer 3: Clinical States    — matching ClinicalState nodes
    Layer 4: Disease Association — disease_rate statistics
    Layer 5: Prediction         — final classification + confidence
    """

    def __init__(self):
        self.client = Neo4jClient()
        self.explainer = ClinicalExplainabilityEngine()

    def trace(self, patient_id: str) -> Dict[str, Any]:
        """Build and return the full causal trace for a patient."""

        # Get the explanation (reuses all the logic already validated)
        explanation = self.explainer.explain(patient_id)
        if "error" in explanation:
            return explanation

        factors = explanation.get("contributing_factors", [])
        classification = explanation.get("classification", "Unknown")
        confidence = explanation.get("confidence", 0.5)

        # ── LAYER 1: Source Data ─────────────────────────────────────────
        layer1 = []
        try:
            with self.client.session() as session:
                result = session.run("""
                    MATCH (p:KnowledgeAsset:Patient {id: $pid})
                    -[:HAS_MEASUREMENT]->(m:KnowledgeAsset:LaboratoryMetric)
                    WHERE m.metric_name <> 'Selector'
                    RETURN m.metric_name as name, m.value as value,
                           m.semantic_name as semantic
                    ORDER BY m.metric_name
                """, pid=patient_id)
                for rec in result:
                    vi = _get_var_info(rec["name"])
                    layer1.append({
                        "layer": 1,
                        "layer_name": "Source Data",
                        "variable": rec["name"],
                        "display": rec["semantic"] or vi.get("display", rec["name"]),
                        "value": f"{rec['value']} {vi.get('unit', '')}".strip(),
                        "note": "Medición clínica directa del dataset"
                    })
        except Exception as e:
            logger.warning(f"Error fetching source data from Neo4j: {e}. Falling back to MongoDB.")

        if not layer1:
            try:
                from pymongo import MongoClient
                from backend.db.config import settings
                mongo_client = MongoClient(settings.mongo_uri)
                db = mongo_client[settings.mongo_db_name]
                case_doc = db["cases"].find_one({"patient_id": patient_id})
                if not case_doc:
                    case_doc = db["cases"].find_one({"case_id": patient_id})
                if case_doc:
                    raw = case_doc.get("raw_data", {})
                    for k, v in sorted(raw.items()):
                        if k not in ["Age", "Gender"]:
                            vi = _get_var_info(k)
                            layer1.append({
                                "layer": 1,
                                "layer_name": "Source Data",
                                "variable": k,
                                "display": vi.get("display", k),
                                "value": f"{v} {vi.get('unit', '')}".strip(),
                                "note": "Medición clínica directa del dataset"
                            })
            except Exception as e_mongo:
                logger.error(f"MongoDB fallback for trace source data failed: {e_mongo}")

        # ── LAYER 2: Interpretation ──────────────────────────────────────
        layer2 = []
        state_map: Dict[str, Dict] = {}
        try:
            with self.client.session() as session:
                states = session.run("""
                    MATCH (s:ClinicalState)
                    RETURN s.variable as var, s.direction as dir,
                           s.threshold as threshold, s.name as name
                """)
                for s in states:
                    key = f"{s['var']}_{s['dir']}"
                    state_map[key] = {"threshold": s["threshold"], "name": s["name"]}
        except Exception as e:
            logger.warning(f"Error fetching clinical states from Neo4j for trace: {e}. Generating dynamically.")

        if not state_map:
            try:
                states = self.explainer._get_clinical_states()
                for s in states:
                    key = f"{s['variable']}_{s['direction']}"
                    state_map[key] = {"threshold": s["threshold"], "name": s["name"]}
            except Exception as e_states:
                logger.error(f"Failed to generate clinical states for trace dynamically: {e_states}")

        for item in layer1:
            var = item["variable"]
            try:
                val_f = float(item["value"].split()[0])
            except (ValueError, IndexError):
                continue

            vi = _get_var_info(var)
            high_thresh = state_map.get(f"{var}_high", {}).get("threshold")
            low_thresh = state_map.get(f"{var}_low", {}).get("threshold")

            if high_thresh is not None and val_f > high_thresh:
                status = "HIGH"
                note = f"Valor > umbral P75 ({high_thresh})"
            elif low_thresh is not None and val_f < low_thresh:
                status = "LOW"
                note = f"Valor < umbral P25 ({low_thresh})"
            else:
                status = "NORMAL"
                note = "Dentro del rango esperado"

            layer2.append({
                "layer": 2,
                "layer_name": "Interpretation",
                "variable": var,
                "display": vi.get("display", var),
                "value": item["value"],
                "status": status,
                "note": note
            })

        # ── LAYER 3: Contributing Clinical States ────────────────────────
        layer3 = []
        for f in factors:
            layer3.append({
                "layer": 3,
                "layer_name": "Clinical State",
                "variable": f["variable"],
                "display": f["display_name"],
                "state": f"{'High' if f['status']=='High' else 'Low'} {f['variable']}",
                "value": f"{f['value']} {f['unit']}".strip(),
                "threshold": f["threshold"],
                "note": f"Estado clínico activado (umbral {f['threshold']})"
            })

        # ── LAYER 4: Disease Associations ────────────────────────────────
        layer4 = []
        for f in factors:
            layer4.append({
                "layer": 4,
                "layer_name": "Disease Association",
                "variable": f["variable"],
                "display": f["display_name"],
                "disease_rate": f["disease_rate_pct"],
                "sample_count": f["sample_count"],
                "correlation": f["correlation"],
                "clinical_context": f.get("interpretacion", ""),
                "note": f"{f['disease_rate_pct']} de los pacientes con este estado tienen enfermedad"
            })


        # ── LAYER 5: Prediction ──────────────────────────────────────────
        layer5 = [{
            "layer": 5,
            "layer_name": "Prediction",
            "classification": classification,
            "confidence": confidence,
            "confidence_pct": f"{confidence*100:.0f}%",
            "factors_used": len(factors),
            "note": f"Basado en {len(factors)} factores clínicos relevantes"
        }]

        # ── DECISION PATH (Traceability 2.0 ASCII Diagram) ────────────────
        diagram_lines = [
            f"DECISION PATH: {patient_id} -> {classification}",
            "=" * 55,
        ]
        
        if factors:
            for idx, f in enumerate(factors[:3], 1):
                direction_label = "elevada" if f['status'] == 'High' else "reducida"
                diagram_lines.append(f"\n--- RUTA DE INFERENCIA CLÍNICA #{idx} ---")
                diagram_lines.append(f"  [Hallazgo: {f['display_name']} {direction_label}]")
                diagram_lines.append("         ↓")
                diagram_lines.append(f"  [Evidencia: {f['sample_count']} casos observados en subgrupo]")
                diagram_lines.append("         ↓")
                diagram_lines.append(f"  [Variable: {f['display_name']} = {f['value']} {f['unit']}]")
                diagram_lines.append("         ↓")
                diagram_lines.append(f"  [Paciente: {patient_id}]")
                diagram_lines.append("         ↓")
                diagram_lines.append(f"  [Conclusión: {classification} (Confianza: {confidence*100:.1f}%)]")
        else:
            diagram_lines.append("\nNo se detectaron desviaciones clínicas fuera de los rangos poblacionales esperados.")
            diagram_lines.append("Siguiente acción sugerida: Continuar con monitoreo de rutina.")
            
        ascii_diagram = "\n".join(diagram_lines)

        # ── Narrative (Traceability 2.0) ──────────────────────────────────
        if factors:
            top = factors[0]
            direction_label = "elevada" if top['status'] == 'High' else "reducida"
            narrative = (
                f"El análisis causal identifica como principal hallazgo que el paciente presenta {top['display_name']} {direction_label} "
                f"({top['value']} {top['unit']}), respaldado por una evidencia de {top['sample_count']} casos clínicos en el subgrupo. "
                f"Esta variable influye directamente en el diagnóstico de '{classification}' "
                f"con un nivel de confianza del {confidence*100:.0f}%, sugiriendo como siguiente acción de investigación: "
                f"'{top['siguiente_accion']}'."
            )
        else:
            narrative = (
                f"El paciente {patient_id} se encuentra dentro de los rangos clínicos esperados. "
                f"No se identificaron anomalías o factores de riesgo, sugiriendo continuar con monitoreo periódico de rutina."
            )

        return {
            "patient_id": patient_id,
            "classification": classification,
            "confidence": confidence,
            "confidence_pct": f"{confidence*100:.0f}%",
            "layers": {
                "1_source_data": layer1,
                "2_interpretation": layer2,
                "3_clinical_states": layer3,
                "4_associations": layer4,
                "5_prediction": layer5
            },
            "narrative": narrative,
            "ascii_diagram": ascii_diagram,
            "summary": {
                "source_measurements": len(layer1),
                "abnormal_values": sum(1 for x in layer2 if x["status"] != "NORMAL"),
                "clinical_states_activated": len(layer3),
                "disease_associations": len(layer4)
            }
        }
