import numpy as np
from typing import Dict, Any, List, Tuple
from pymongo import MongoClient
from backend.db.config import settings
from backend.semantic.semantic_state_engine import SemanticStateEngine

class CohortSimilarityEngine:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.state_engine = SemanticStateEngine()

    def get_patient_profile(self, patient_id: str, function_type: str = "triangular") -> Tuple[set, Dict[str, float]]:
        """
        Retrieves active states and membership values for a patient.
        """
        states = self.state_engine.get_patient_states(patient_id, function_type)
        jaccard_set = set()
        cosine_dict = {}
        for s in states:
            var = s["variable"]
            dom_state = s["semantic_state"]
            jaccard_set.add(f"{var}_{dom_state}")
            for state_cat, score in s["memberships"].items():
                cosine_dict[f"{var}_{state_cat}"] = float(score)
        return jaccard_set, cosine_dict

    def compute_similarity(self, patient_a_id: str, patient_b_id: str, function_type: str = "triangular") -> Dict[str, float]:
        """
        Computes Jaccard and Cosine similarity scores between patient A and patient B.
        """
        set_a, dict_a = self.get_patient_profile(patient_a_id, function_type)
        set_b, dict_b = self.get_patient_profile(patient_b_id, function_type)
        
        # 1. Jaccard
        if not set_a or not set_b:
            jaccard = 0.0
        else:
            jaccard = len(set_a.intersection(set_b)) / len(set_a.union(set_b))
            
        # 2. Cosine
        all_keys = set(dict_a.keys()).union(set(dict_b.keys()))
        if not all_keys:
            cosine = 0.0
        else:
            vec_a = np.array([dict_a.get(k, 0.0) for k in all_keys])
            vec_b = np.array([dict_b.get(k, 0.0) for k in all_keys])
            norm_a = np.linalg.norm(vec_a)
            norm_b = np.linalg.norm(vec_b)
            if norm_a == 0.0 or norm_b == 0.0:
                cosine = 0.0
            else:
                cosine = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
                
        return {
            "jaccard": float(jaccard),
            "cosine": float(cosine)
        }

    def find_similar_patients(self, patient_id: str, limit: int = 20, function_type: str = "triangular") -> List[Dict[str, Any]]:
        """
        Finds the top N most similar patients based on average of Jaccard and Cosine similarity.
        """
        set_target, dict_target = self.get_patient_profile(patient_id, function_type)
        if not set_target:
            return []
            
        cases = list(self.db["cases"].find({}, {"patient_id": 1}))
        similarities = []
        
        for c in cases:
            other_id = c.get("patient_id")
            if not other_id or other_id == patient_id:
                continue
                
            set_other, dict_other = self.get_patient_profile(other_id, function_type)
            if not set_other:
                continue
                
            # Compute Jaccard
            jaccard = len(set_target.intersection(set_other)) / len(set_target.union(set_other))
            
            # Compute Cosine
            all_keys = set(dict_target.keys()).union(set(dict_other.keys()))
            vec_target = np.array([dict_target.get(k, 0.0) for k in all_keys])
            vec_other = np.array([dict_other.get(k, 0.0) for k in all_keys])
            norm_t = np.linalg.norm(vec_target)
            norm_o = np.linalg.norm(vec_other)
            cosine = float(np.dot(vec_target, vec_other) / (norm_t * norm_o)) if norm_t > 0 and norm_o > 0 else 0.0
            
            score = 0.5 * jaccard + 0.5 * cosine
            
            similarities.append({
                "patient_id": other_id,
                "jaccard": float(jaccard),
                "cosine": float(cosine),
                "score": float(score),
                "shared_states": list(set_target.intersection(set_other))
            })
            
        similarities.sort(key=lambda x: x["score"], reverse=True)
        return similarities[:limit]
