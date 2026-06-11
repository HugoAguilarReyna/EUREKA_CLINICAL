import datetime
import time
import networkx as nx
from typing import Dict, Any, List
from pymongo import MongoClient
from networkx.algorithms.community import louvain_communities
from backend.db.config import settings
from backend.semantic.cohort_similarity_engine import CohortSimilarityEngine

class CommunityProfileEngine:
    _instance = None
    _cached_communities = None
    _cache_time = 0

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(CommunityProfileEngine, cls).__new__(cls, *args, **kwargs)
            cls._instance._client = MongoClient(settings.mongo_uri)
            cls._instance.db = cls._instance._client[settings.mongo_db_name]
            cls._instance.similarity_engine = CohortSimilarityEngine()
        return cls._instance

    def detect_communities(self, threshold: float = 0.4, function_type: str = "triangular", rules: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Builds a patient similarity graph based on Jaccard threshold, runs Louvain, 
        and extracts clinical profiles and provenance for each community.
        Caches results to optimize parallel requests.
        """
        # Return cached results if valid (10-minute TTL)
        if self._cached_communities and (time.time() - self._cache_time < 600):
            return self._cached_communities

        cases = list(self.db["cases"].find({}, {"patient_id": 1}))
        patient_ids = [c["patient_id"] for c in cases if "patient_id" in c]
        
        # Pre-build states if missing
        states_count = self.db["semantic_states"].count_documents({"function_type": function_type})
        if states_count < len(patient_ids):
            self.similarity_engine.state_engine.rebuild_all_states(function_type)
            
        # Fetch all states in a single batch query for optimal performance
        all_states_cursor = self.db["semantic_states"].find({"function_type": function_type})
        states_by_patient = {}
        for s in all_states_cursor:
            pid = s["patient_id"]
            if pid not in states_by_patient:
                states_by_patient[pid] = []
            states_by_patient[pid].append(s)
            
        # Load all profiles for performance
        profiles = {}
        for pid in patient_ids:
            p_states = states_by_patient.get(pid, [])
            if not p_states:
                p_states = self.similarity_engine.state_engine.get_patient_states(pid, function_type)
                
            jaccard_set = set()
            for s in p_states:
                var = s["variable"]
                dom_state = s["semantic_state"]
                jaccard_set.add(f"{var}_{dom_state}")
            if jaccard_set:
                profiles[pid] = jaccard_set
                
        # Build networkx graph
        G = nx.Graph()
        G.add_nodes_from(profiles.keys())
        
        pids_list = list(profiles.keys())
        for i in range(len(pids_list)):
            for j in range(i + 1, len(pids_list)):
                p1 = pids_list[i]
                p2 = pids_list[j]
                s1 = profiles[p1]
                s2 = profiles[p2]
                intersection = len(s1.intersection(s2))
                union = len(s1.union(s2))
                jaccard = intersection / union if union > 0 else 0.0
                if jaccard >= threshold:
                    G.add_edge(p1, p2, weight=jaccard)
                    
        # Apply Louvain clustering
        try:
            communities_sets = louvain_communities(G, weight='weight', seed=42)
        except Exception:
            from networkx.algorithms.community import label_propagation_communities
            communities_sets = list(label_propagation_communities(G))
            
        community_profiles = []
        sorted_communities = sorted(list(communities_sets), key=len, reverse=True)
        
        if rules is None:
            from backend.semantic.rule_mining_engine import RuleMiningEngine
            rule_engine = RuleMiningEngine()
            rules = rule_engine.mine_semantic_rules()
        
        meta = self.db["dataset_metadata"].find_one({"id": "Dataset_Metadata_Global"})
        dataset_name = meta.get("file_name", "act_liver_disease.csv") if meta else "act_liver_disease.csv"
        
        for idx, comm in enumerate(sorted_communities):
            comm_id = f"Community_{idx + 1}"
            members = list(comm)
            size = len(members)
            
            # Frequencies of states
            state_counts = {}
            for member in members:
                for state in profiles[member]:
                    state_counts[state] = state_counts.get(state, 0) + 1
                    
            # Top states (prevalence >= 60%)
            top_states = [state for state, count in state_counts.items() if (count / size) >= 0.6]
            if not top_states:
                top_states = sorted(state_counts.keys(), key=lambda x: state_counts[x], reverse=True)[:3]
                
            pattern_name = " + ".join(sorted(top_states))
            
            # Analyze rule activations and risks
            rule_activations = {}
            member_risks = []
            
            for member in members:
                p_states = states_by_patient.get(member, [])
                if not p_states:
                    p_states = self.similarity_engine.state_engine.get_patient_states(member, function_type)
                p_dom_states = {s["variable"]: s["semantic_state"] for s in p_states}
                
                for r in rules:
                    activated = True
                    for cond in r["conditions"]:
                        var = cond["variable"]
                        op = cond["raw_expression"].split(" ")[1]
                        dom = p_dom_states.get(var)
                        
                        if op in [">", ">="] and dom != "HIGH":
                            activated = False
                            break
                        elif op in ["<", "<="] and dom != "LOW":
                            activated = False
                            break
                            
                    if activated:
                        rule_activations[r["rule_id"]] = rule_activations.get(r["rule_id"], 0) + 1
                        risk_lvl = "HIGH" if r["confidence"] > 0.7 else "MEDIUM"
                        member_risks.append(risk_lvl)
            
            top_rules = [rid for rid, count in rule_activations.items() if (count / size) >= 0.5]
            if not top_rules and rule_activations:
                top_rules = [max(rule_activations, key=rule_activations.get)]
                
            if member_risks:
                from collections import Counter
                dominant_risk = Counter(member_risks).most_common(1)[0][0]
            else:
                dominant_risk = "LOW"
                
            provenance = {
                "dataset_name": dataset_name,
                "community_id": comm_id,
                "patient_count": size,
                "generation_timestamp": datetime.datetime.utcnow().isoformat()
            }
            
            community_profiles.append({
                "community_id": comm_id,
                "size": size,
                "dominant_risk": dominant_risk,
                "top_states": top_states,
                "top_rules": top_rules,
                "pattern_name": pattern_name,
                "members": members,
                "provenance": provenance
            })
            
        self._cached_communities = community_profiles
        self._cache_time = time.time()
        return community_profiles
