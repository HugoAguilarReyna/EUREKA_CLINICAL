from typing import Dict, Any, List, Optional
from pymongo import MongoClient
from backend.db.config import settings
from backend.semantic.fuzzy_engine import FuzzyEngine

class SemanticStateEngine:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.states_col = self.db["semantic_states"]

    def compute_patient_states(self, patient_id: str, raw_data: Dict[str, float], function_type: str = "triangular") -> List[Dict[str, Any]]:
        """
        Converts raw patient labs to a list of semantic states with memberships, dominant state, and entropy.
        """
        states = []
        for var, val in raw_data.items():
            if var in ["patient_id", "Gender", "Selector", "Age"]:
                # Age can be fuzzified, others are metadata
                if var != "Age":
                    continue
            
            try:
                val_float = float(val)
            except (TypeError, ValueError):
                continue

            memberships = FuzzyEngine.get_memberships(var, val_float, function_type)
            entropy = FuzzyEngine.compute_semantic_entropy(memberships)
            
            # Dominant state is the state with the highest membership
            dominant_state = max(memberships, key=memberships.get)
            dominant_score = memberships[dominant_state]
            
            states.append({
                "patient_id": patient_id,
                "variable": var,
                "value": val_float,
                "function_type": function_type,
                "memberships": memberships,
                "semantic_state": dominant_state,
                "membership_score": dominant_score,
                "entropy": entropy
            })
            
        return states

    def persist_patient_states(self, patient_id: str, states: List[Dict[str, Any]]):
        """
        Saves computed states for a patient, clearing older records of same function_type.
        """
        if not states:
            return
        function_type = states[0]["function_type"]
        self.states_col.delete_many({"patient_id": patient_id, "function_type": function_type})
        self.states_col.insert_many(states)

    def get_patient_states(self, patient_id: str, function_type: str = "triangular") -> List[Dict[str, Any]]:
        """
        Retrieves persisted semantic states for a patient.
        If not found, attempts to generate dynamically from patient's case records.
        """
        cursor = self.states_col.find({"patient_id": patient_id, "function_type": function_type})
        results = list(cursor)
        for r in results:
            r["_id"] = str(r["_id"])
            
        if not results:
            # Fallback to dynamic generation
            case = self.db["cases"].find_one({"patient_id": patient_id})
            if not case:
                case = self.db["cases"].find_one({"case_id": patient_id})
                
            if case:
                pid = case.get("patient_id") or patient_id
                raw = case.get("raw_data", {})
                results = self.compute_patient_states(pid, raw, function_type)
                self.persist_patient_states(pid, results)
                for r in results:
                    if "_id" in r:
                        r["_id"] = str(r["_id"])
                        
        return results

    def rebuild_all_states(self, function_type: str = "triangular") -> int:
        """
        Rebuilds and persists semantic states for ALL patients in the MongoDB collection cases.
        """
        cases_cursor = self.db["cases"].find({})
        count = 0
        for case in cases_cursor:
            patient_id = case.get("patient_id")
            raw = case.get("raw_data", {})
            if not patient_id or not raw:
                continue
            states = self.compute_patient_states(patient_id, raw, function_type)
            self.persist_patient_states(patient_id, states)
            count += 1
        return count
