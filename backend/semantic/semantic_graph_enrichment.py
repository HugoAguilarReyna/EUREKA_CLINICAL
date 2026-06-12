import math
import datetime
from typing import Dict, Any, List, Set
from pymongo import MongoClient
from backend.db.config import settings
from backend.semantic.community_profile_engine import CommunityProfileEngine
from backend.semantic.pattern_evolution_engine import PatternEvolutionEngine
from backend.semantic.graph_centrality_engine import GraphCentralityEngine
from backend.semantic.cohort_similarity_engine import CohortSimilarityEngine

class SemanticGraphEnrichment:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.comm_engine = CommunityProfileEngine()
        self.evo_engine = PatternEvolutionEngine()
        self.similarity_engine = CohortSimilarityEngine()

    def generate_clinical_hypothesis(self, states: List[str]) -> str:
        """
        Deterministic template engine to propose clinical hypotheses based on clinical pattern components.
        Prevents LLM hallucinations.
        """
        states_upper = [s.upper() for s in states]
        
        has_alt_high = any("SGPT_HIGH" in s or "SGPT_VERY_HIGH" in s for s in states_upper)
        has_ast_high = any("SGOT_HIGH" in s or "SGOT_VERY_HIGH" in s for s in states_upper)
        has_tb_high = any("TB_HIGH" in s or "TB_VERY_HIGH" in s for s in states_upper)
        has_db_high = any("DB_HIGH" in s or "DB_VERY_HIGH" in s for s in states_upper)
        has_alb_low = any("ALB_LOW" in s for s in states_upper)
        has_tp_low = any("TP_LOW" in s for s in states_upper)
        
        if has_alt_high and has_ast_high:
            return "Sospecha de necrosis o lesión hepatocelular activa con elevación severa de transaminasas (ALT/AST)."
        elif has_tb_high and has_db_high:
            return "Sospecha de colestasis o disfunción excretora biliar caracterizada por retención conjugada de bilirrubinas."
        elif has_alb_low and has_tp_low:
            return "Fenotipo de deterioro en la síntesis proteica hepática con hipoalbuminemia sistémica."
        elif has_alt_high and has_alb_low:
            return "Fenotipo mixto de injuria celular activa con compromiso de la reserva sintética hepática."
        elif has_alt_high:
            return "Indicios de inflamación o injuria celular hepática activa manifestada por ALT alta."
        elif has_alb_low:
            return "Deterioro moderado en la capacidad de síntesis proteica del parénquima hepático."
        else:
            clean_states = [s.replace("_", " ") for s in states]
            return f"Hipótesis de perfil hepático emergente caracterizado por: {', '.join(clean_states)}."

    def calculate_evidence_strength(self, r: Dict[str, Any]) -> int:
        """
        Calculates a unified Evidence Strength score (0-100) based on OR, P-value, Support, Confidence, and Lift.
        """
        or_val = float(r.get("odds_ratio", 1.0))
        p_val = float(r.get("p_value", 0.05))
        support = float(r.get("support", 0.0))
        confidence = float(r.get("confidence", 0.0))
        lift = float(r.get("lift", 1.0))
        
        # 1. Odds Ratio score (Max 30 points)
        # Handle OR > 1 and OR < 1 symmetrically
        or_abs = max(or_val, 1.0 / or_val if or_val > 0 else 1.0)
        or_score = min(1.0, math.log(or_abs) / math.log(10.0)) * 30.0 if or_abs > 1 else 0.0
        
        # 2. P-value score (Max 25 points)
        if p_val < 0.001:
            p_score = 25.0
        elif p_val < 0.01:
            p_score = 20.0
        elif p_val < 0.05:
            p_score = 15.0
        else:
            p_score = 5.0
            
        # 3. Confidence score (Max 25 points)
        conf_score = confidence * 25.0
        
        # 4. Support score (Max 10 points)
        sup_score = min(1.0, support / 100.0) * 10.0
        
        # 5. Lift score (Max 10 points)
        lift_score = min(1.0, lift / 3.0) * 10.0
        
        total = int(round(or_score + p_score + conf_score + sup_score + lift_score))
        return min(max(total, 0), 100)

    def build_enriched_graph(self, function_type: str = "triangular") -> Dict[str, List[Dict[str, Any]]]:
        """
        Builds the complete enriched semantic graph.
        """
        nodes = []
        edges = []
        node_ids = set()
        edge_set = set()
        
        def add_node(nid: str, label: str, props: Dict[str, Any]):
            if nid not in node_ids:
                node_ids.add(nid)
                nodes.append({
                    "id": nid,
                    "label": label,
                    "properties": props
                })

        def add_edge(src: str, dst: str, rel_type: str, props: Dict[str, Any] = None):
            key = (src, dst, rel_type)
            if key not in edge_set:
                edge_set.add(key)
                edges.append({
                    "src_id": src,
                    "dst_id": dst,
                    "relationship_type": rel_type,
                    "properties": props or {}
                })

        # Fetch current dataset metadata
        meta = self.db["dataset_metadata"].find_one({"id": "Dataset_Metadata_Global"})
        dataset_id = meta.get("dataset_id", "Dataset_Global") if meta else "Dataset_Global"
        dataset_name_clean = meta.get("file_name", "Dataset_March_2026") if meta else "Dataset_March_2026"
        if dataset_name_clean == "act_liver_disease.csv":
            dataset_name_clean = "Dataset_March_2026"
            
        evidence_source_id = f"EvidenceSource_{dataset_id}"
        add_node(evidence_source_id, "EvidenceSource", {
            "name": dataset_name_clean,
            "type": "Dataset",
            "rows": meta.get("rows", 583) if meta else 583,
            "columns": meta.get("columns", 11) if meta else 11,
            "generated_at": meta.get("created_at", datetime.datetime.utcnow().isoformat()) if meta else datetime.datetime.utcnow().isoformat()
        })
        
        # Mine semantic rules once to optimize performance (moved before communities detection)
        from backend.semantic.rule_mining_engine import RuleMiningEngine
        rule_engine = RuleMiningEngine()
        rules = rule_engine.mine_semantic_rules()

        # 1. Communities
        communities = self.comm_engine.detect_communities(threshold=0.4, function_type=function_type, rules=rules)
        
        # 2. Version Patterns
        raw_patterns_states = [c["top_states"] for c in communities]
        versioned_patterns = self.evo_engine.track_and_version_patterns(raw_patterns_states, dataset_id)
        
        # Build pattern map for quick lookup
        pattern_map = {}
        for vp in versioned_patterns:
            # Match by sorting states as keys
            key = "-".join(sorted(vp["states"]))
            pattern_map[key] = vp
            
        # 3. Add Communities, Patterns, and Hypotheses
        for comm in communities:
            comm_id = comm["community_id"]
            top_states = comm["top_states"]
            size = comm["size"]
            dom_risk = comm["dominant_risk"]
            
            # Community Node
            add_node(comm_id, "Community", {
                "name": comm_id,
                "size": size,
                "dominant_risk": dom_risk,
                "pattern_name": comm["pattern_name"],
                "provenance": comm["provenance"]
            })
            
            # Find matching versioned pattern
            p_key = "-".join(sorted(top_states))
            vp = pattern_map.get(p_key)
            if not vp:
                # Fallback if mismatch
                vp = {
                    "pattern_id": f"Pattern_{comm_id}_V1",
                    "base_id": f"Pattern_{comm_id}",
                    "version": 1,
                    "states": top_states,
                    "evolved_from": None
                }
                
            pattern_id = vp["pattern_id"]
            
            # Pattern Node
            add_node(pattern_id, "Pattern", {
                "name": f"Pattern {vp['base_id']} ({vp['version']})",
                "states": vp["states"],
                "version": vp["version"],
                "base_id": vp["base_id"],
                "evolved_from": vp.get("evolved_from")
            })
            add_edge(comm_id, pattern_id, "EXPRESSES")
            add_edge(evidence_source_id, pattern_id, "PRODUCES_PATTERN")
            
            # Link versioning in graph if evolved_from exists
            if vp.get("evolved_from"):
                # Ensure the previous pattern node exists in the graph metadata
                prev_id = vp["evolved_from"]
                add_node(prev_id, "Pattern", {
                    "name": f"Pattern {vp['base_id']} (Previous)",
                    "states": [],
                    "version": vp["version"] - 1,
                    "base_id": vp["base_id"]
                })
                add_edge(prev_id, pattern_id, "EVOLVED_TO")
            
            # Hypothesis Node
            hyp_id = f"HYP_{vp['base_id']}"
            desc = self.generate_clinical_hypothesis(top_states)
            add_node(hyp_id, "Hypothesis", {
                "name": f"Hypothesis for {vp['base_id']}",
                "description": desc
            })
            add_edge(pattern_id, hyp_id, "SUSTAINS")
            
            # 4. Rules & Evidence (Iterating pre-mined rules for performance)
            for r in rules:
                rule_id = r["rule_id"]
                strength = self.calculate_evidence_strength(r)
                
                # Rule Node
                add_node(rule_id, "Rule", {
                    "name": rule_id,
                    "expression": r["semantic_expression"],
                    "support": r["support"],
                    "confidence": r["confidence"],
                    "lift": r.get("lift", 1.2),
                    "evidence_strength": strength
                })
                
                # Evidence Node
                ev_id = f"EVIDENCE_{rule_id}"
                add_node(ev_id, "Evidence", {
                    "name": f"Evidence for {rule_id}",
                    "odds_ratio": r["odds_ratio"],
                    "p_value": r["p_value"],
                    "support": r["support"],
                    "confidence": r["confidence"],
                    "lift": r.get("lift", 1.2),
                    "strength": strength,
                    "provenance": {
                        "dataset_name": comm["provenance"]["dataset_name"],
                        "generation_timestamp": comm["provenance"]["generation_timestamp"]
                    }
                })
                add_edge(rule_id, ev_id, "SUPPORTED_BY")
                
                # Risk Node
                risk_id = f"RISK_{r['target_class']}"
                add_node(risk_id, "Risk", {
                    "name": f"{r['target_class']} RISK",
                    "risk_level": r['target_class']
                })
                add_edge(rule_id, risk_id, "INDICATES")
                
                # Action Node
                action_id = f"ACTION_{rule_id}"
                insight_doc = self.db["decision_insights"].find_one({"insight_id": r["certified_insight_id"]})
                action_desc = insight_doc.get("action", "Revisar cohorte de riesgo.") if insight_doc else "Revisar cohorte de riesgo."
                action_name = insight_doc.get("next_analysis_suggested", "Order Liver Panel") if insight_doc else "Order Liver Panel"
                
                add_node(action_id, "Action", {
                    "name": action_name,
                    "description": action_desc
                })
                add_edge(risk_id, action_id, "SUGGESTS")
                
                # Link Hypothesis -> Rule if states match
                # If the hypothesis pattern states trigger the rule conditions
                rule_vars = {cond["variable"] for cond in r["conditions"]}
                if set(top_states).issuperset(rule_vars) or any(any(v in s for s in top_states) for v in rule_vars):
                    add_edge(hyp_id, rule_id, "PROPOSES_RULE")
            
            # 5. Add Patients and States (We link them to their Community)
            for member in comm["members"]:
                # Patient Node
                member_case = self.db["cases"].find_one({"patient_id": member})
                raw = member_case.get("raw_data", {}) if member_case else {}
                
                add_node(member, "Patient", {
                    "name": member,
                    "age": raw.get("Age", 0.0),
                    "gender": raw.get("Gender", "UNKNOWN")
                })
                
                # Patient MEMBER_OF Community
                add_edge(member, comm_id, "MEMBER_OF")
                
                # Patient HAS_RISK Risk (derived from community risk)
                risk_id = f"RISK_{dom_risk}"
                add_edge(member, risk_id, "HAS_RISK")
                
                # Patient HAS_STATE SemanticState (global states)
                p_states = self.similarity_engine.state_engine.get_patient_states(member, function_type)
                for s in p_states:
                    var = s["variable"]
                    dom = s["semantic_state"]
                    state_node_id = f"STATE_{var}_{dom}"
                    
                    # Global SemanticState Node
                    add_node(state_node_id, "SemanticState", {
                        "name": f"{var}_{dom}",
                        "variable": var,
                        "state": dom,
                        "entropy": s["entropy"]
                    })
                    add_edge(member, state_node_id, "HAS_STATE")
                    
                    # Variable Node
                    var_node_id = f"VAR_{var}"
                    add_node(var_node_id, "Variable", {
                        "name": var
                    })
                    add_edge(member, var_node_id, "HAS_VALUE", {"value": s["value"]})
                    add_edge(var_node_id, state_node_id, "ACTIVATES_STATE")
                    
                    # Community characterized by SemanticState
                    add_edge(comm_id, state_node_id, "CHARACTERIZED_BY")

        # 6. Centrality calculations on the rich graph
        centralities = GraphCentralityEngine.compute_centralities(nodes, edges)
        for node in nodes:
            nid = node["id"]
            if nid in centralities:
                node["properties"].update(centralities[nid])
                
        return {
            "nodes": nodes,
            "edges": edges
        }
