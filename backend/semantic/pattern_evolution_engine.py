import datetime
from typing import Dict, Any, List, Optional
from pymongo import MongoClient
from backend.db.config import settings

class PatternEvolutionEngine:
    def __init__(self):
        self._client = MongoClient(settings.mongo_uri)
        self.db = self._client[settings.mongo_db_name]
        self.patterns_col = self.db["semantic_patterns"]

    def track_and_version_patterns(self, current_patterns: List[List[str]], dataset_id: str) -> List[Dict[str, Any]]:
        """
        Compares current clinical patterns against previously persisted patterns in MongoDB.
        Assigns versions (V1, V2...) and links evolved lineages (evolved_from / EVOLVED_TO).
        """
        past_patterns = list(self.patterns_col.find({}))
        
        latest_versions = {}
        for p in past_patterns:
            base_id = p["base_id"]
            ver = p["version"]
            if base_id not in latest_versions or ver > latest_versions[base_id]["version"]:
                latest_versions[base_id] = p

        results = []
        new_groups_created = 0

        for curr_states in current_patterns:
            curr_states_set = set(curr_states)
            matched_past = None
            max_similarity = 0.0
            
            for base_id, past_p in latest_versions.items():
                past_states_set = set(past_p["states"])
                intersection = len(curr_states_set.intersection(past_states_set))
                union = len(curr_states_set.union(past_states_set))
                sim = intersection / union if union > 0 else 0.0
                
                # Threshold of 50% Jaccard similarity to link evolution
                if sim >= 0.5 and sim > max_similarity:
                    max_similarity = sim
                    matched_past = past_p
            
            if matched_past:
                base_id = matched_past["base_id"]
                # Only increment version if the pattern states actually changed
                is_changed = set(matched_past["states"]) != curr_states_set
                new_version = matched_past["version"] + (1 if is_changed else 0)
                pattern_id = f"{base_id}_V{new_version}"
                evolved_from = matched_past["pattern_id"] if is_changed else matched_past.get("evolved_from")
            else:
                next_num = len(latest_versions) + new_groups_created + 1
                base_id = f"Pattern_{next_num}"
                new_version = 1
                pattern_id = f"{base_id}_V1"
                evolved_from = None
                new_groups_created += 1
                
            pattern_doc = {
                "pattern_id": pattern_id,
                "base_id": base_id,
                "version": new_version,
                "states": curr_states,
                "dataset_id": dataset_id,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "evolved_from": evolved_from
            }
            results.append(pattern_doc)

        # Remove duplicate computations for same dataset
        self.patterns_col.delete_many({"dataset_id": dataset_id})
        if results:
            self.patterns_col.insert_many(results)

        return results

    def get_pattern_timeline(self) -> List[Dict[str, Any]]:
        """
        Retrieves all pattern snapshots for timeline tracking.
        """
        patterns = list(self.patterns_col.find({}))
        for p in patterns:
            p["_id"] = str(p["_id"])
        return patterns
