from enum import Enum

class ProvenanceType(Enum):
    DATA_DRIVEN = "DATA_DRIVEN"
    EXPERT_RULE = "EXPERT_RULE"
    HEURISTIC = "HEURISTIC"
    GENERATED = "GENERATED"
