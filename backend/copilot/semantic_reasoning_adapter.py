from typing import Dict, Any, List
from backend.semantic.semantic_state_engine import SemanticStateEngine
from backend.semantic.rule_mining_engine import RuleMiningEngine

class SemanticReasoningAdapter:
    def __init__(self):
        self.state_engine = SemanticStateEngine()
        self.rule_engine = RuleMiningEngine()

    def explain_patient_risk(self, patient_id: str) -> str:
        """
        Builds a comprehensive natural language explanation tracing patient values 
        through fuzzy memberships and rule activations down to mathematical evidence.
        """
        # 1. Get patient semantic states
        states = self.state_engine.get_patient_states(patient_id)
        if not states:
            return f"No se encontró información semántica para el paciente {patient_id}."
            
        # 2. Get active rules
        rules = self.rule_engine.mine_semantic_rules()
        
        # 3. Find which rules are triggered by patient states
        active_rules = []
        for r in rules:
            triggered = True
            for cond in r["conditions"]:
                var = cond["variable"]
                # Find patient state for this variable
                v_state = next((s for s in states if s["variable"] == var), None)
                if not v_state:
                    triggered = False
                    break
                
                # Check if patient state direction matches condition direction
                op = cond["raw_expression"].split(" ")[1]
                dom_state = v_state["semantic_state"]
                
                is_match = False
                if op in [">", ">="] and dom_state == "HIGH":
                    is_match = True
                elif op in ["<", "<="] and dom_state == "LOW":
                    is_match = True
                    
                if not is_match:
                    triggered = False
                    break
            if triggered:
                active_rules.append(r)
                
        # 4. Format natural language response
        lines = []
        lines.append(f"### Análisis de Riesgo Semántico para el Paciente `{patient_id}`\n")
        lines.append("#### 1. Valores Clínicos y Grados de Membresía Difusa:")
        
        for s in states:
            var = s["variable"]
            val = s["value"]
            dom_state = s["semantic_state"]
            dom_score = s["membership_score"]
            entropy = s["entropy"]
            
            lines.append(f"- **{var}**: `{val}` → Estado Dominante: **{dom_state}** (Membresía: `{dom_score:.2f}`, Entropía Semántica: `{entropy:.2f}`)")
            
        lines.append("\n#### 2. Reglas Clínicas de Inferencia Activadas:")
        if active_rules:
            for r in active_rules:
                lines.append(f"- **Regla {r['rule_id']}**: `{r['semantic_expression']}`")
                lines.append(f"  - *Evidencia Estadística:* Odds Ratio: `{r['odds_ratio']}`, P-Value: `{r['p_value']:.4f}`, Soporte de Cohorte: `{r['support']}` casos.")
                lines.append(f"  - *Sustento Clínico:* {r['certified_insight_title']}")
        else:
            lines.append("- *No se activaron reglas específicas de alto riesgo. El paciente presenta perfiles dentro de los rangos basales normales.*")
            
        return "\n".join(lines)
