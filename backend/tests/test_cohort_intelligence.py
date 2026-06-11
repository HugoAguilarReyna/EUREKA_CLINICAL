from backend.semantic.cohort_similarity_engine import CohortSimilarityEngine
from backend.semantic.community_profile_engine import CommunityProfileEngine
from backend.semantic.graph_centrality_engine import GraphCentralityEngine
from backend.semantic.pattern_evolution_engine import PatternEvolutionEngine
from backend.semantic.graph_abstraction_engine import GraphAbstractionEngine
from backend.semantic.semantic_graph_enrichment import SemanticGraphEnrichment

def test_centrality_calculation():
    # Construct a simple diamond graph: A-B-D, A-C-D
    nodes = [
        {"id": "A", "label": "Patient", "properties": {}},
        {"id": "B", "label": "SemanticState", "properties": {}},
        {"id": "C", "label": "SemanticState", "properties": {}},
        {"id": "D", "label": "Rule", "properties": {}}
    ]
    edges = [
        {"src_id": "A", "dst_id": "B"},
        {"src_id": "A", "dst_id": "C"},
        {"src_id": "B", "dst_id": "D"},
        {"src_id": "C", "dst_id": "D"}
    ]
    
    centralities = GraphCentralityEngine.compute_centralities(nodes, edges)
    
    assert "A" in centralities
    assert "B" in centralities
    assert "C" in centralities
    assert "D" in centralities
    
    # Check degree centrality (A and D have degree 2/3 = 0.6666, B and C have 2/3 = 0.6666 in undirected)
    # Networkx degree_centrality maps degree / (N-1)
    assert abs(centralities["A"]["degree"] - 0.6666) < 1e-3
    assert centralities["A"]["pagerank"] > 0.0

def test_evidence_strength_calculator():
    enrichment = SemanticGraphEnrichment()
    
    # Test high evidence rule
    rule_high = {
        "odds_ratio": 8.5,
        "p_value": 0.0005,
        "support": 75,
        "confidence": 0.92,
        "lift": 2.8
    }
    strength_high = enrichment.calculate_evidence_strength(rule_high)
    assert 80 <= strength_high <= 100
    
    # Test low evidence rule
    rule_low = {
        "odds_ratio": 1.1,
        "p_value": 0.045,
        "support": 10,
        "confidence": 0.55,
        "lift": 1.0
    }
    strength_low = enrichment.calculate_evidence_strength(rule_low)
    assert strength_low < strength_high

def test_clinical_hypothesis_generation():
    enrichment = SemanticGraphEnrichment()
    
    hyp_mixed = enrichment.generate_clinical_hypothesis(["SGPT_HIGH", "SGOT_HIGH"])
    assert "necrosis" in hyp_mixed or "transaminasas" in hyp_mixed
    
    hyp_biliary = enrichment.generate_clinical_hypothesis(["TB_HIGH", "DB_HIGH"])
    assert "colestasis" in hyp_biliary or "bilirrubinas" in hyp_biliary

def test_pattern_evolution_tracking():
    engine = PatternEvolutionEngine()
    
    # Mock collection in memory to prevent dependency on the live DB state
    mock_db = []
    class MockCollection:
        def find(self, query=None):
            return mock_db
        def delete_many(self, query):
            pass
        def insert_many(self, docs):
            mock_db.extend(docs)
            
    engine.patterns_col = MockCollection()
    
    # Define a current pattern
    curr_patterns = [["ALT_LOW", "ALB_HIGH"]]
    dataset_id_1 = "SNAP_TEST_001"
    
    # Seed/track first snapshot
    res_1 = engine.track_and_version_patterns(curr_patterns, dataset_id_1)
    assert len(res_1) == 1
    assert res_1[0]["version"] == 1
    
    # Second snapshot: same pattern -> version stays the same
    res_2 = engine.track_and_version_patterns(curr_patterns, "SNAP_TEST_002")
    assert res_2[0]["version"] == 1
    
    # Third snapshot: evolved pattern -> version increments and evolved_from links
    evolved_patterns = [["ALT_LOW", "ALB_HIGH", "TP_HIGH"]]
    res_3 = engine.track_and_version_patterns(evolved_patterns, "SNAP_TEST_003")
    assert res_3[0]["version"] == 2
    assert res_3[0]["evolved_from"] is not None

def test_graph_abstraction_levels():
    nodes = [
        {"id": "P1", "label": "Patient", "properties": {}},
        {"id": "C1", "label": "Community", "properties": {}},
        {"id": "R1", "label": "Rule", "properties": {}},
        {"id": "V1", "label": "Variable", "properties": {}}
    ]
    edges = [
        {"src_id": "P1", "dst_id": "C1", "relationship_type": "MEMBER_OF"},
        {"src_id": "C1", "dst_id": "R1", "relationship_type": "PROPOSES_RULE"},
        {"src_id": "P1", "dst_id": "V1", "relationship_type": "HAS_VALUE"}
    ]
    
    # Level 1 (Executive) should only keep Community and Rule (Patient and Variable are discarded)
    view_l1 = GraphAbstractionEngine.get_abstract_view(nodes, edges, level=1)
    labels_l1 = {n["label"] for n in view_l1["nodes"]}
    assert "Patient" not in labels_l1
    assert "Variable" not in labels_l1
    assert "Community" in labels_l1
    assert "Rule" in labels_l1
    
    # Level 2 (Clinical) keeps Patient and Rule (discards Variable)
    view_l2 = GraphAbstractionEngine.get_abstract_view(nodes, edges, level=2)
    labels_l2 = {n["label"] for n in view_l2["nodes"]}
    assert "Variable" not in labels_l2
    assert "Patient" in labels_l2
    assert "Rule" in labels_l2

def test_provenance_engine():
    from backend.semantic.provenance_engine import ProvenanceEngine
    engine = ProvenanceEngine()
    
    mock_nodes = [
        {"id": "EvSource", "label": "EvidenceSource", "properties": {"name": "Dataset_March_2026"}},
        {"id": "Comm_1", "label": "Community", "properties": {"name": "Community_1", "size": 48}},
        {"id": "Pat_1", "label": "Pattern", "properties": {"name": "Pattern_1", "version": 1}},
        {"id": "Hyp_1", "label": "Hypothesis", "properties": {"name": "Hypothesis_1"}},
        {"id": "Rule_1", "label": "Rule", "properties": {"name": "Rule_1", "support": 146, "confidence": 0.912}}
    ]
    mock_edges = [
        {"src_id": "EvSource", "dst_id": "Comm_1", "relationship_type": "CONTAINS_COHORT"},
        {"src_id": "Comm_1", "dst_id": "Pat_1", "relationship_type": "EXPRESSES"},
        {"src_id": "Pat_1", "dst_id": "Hyp_1", "relationship_type": "SUSTAINS"},
        {"src_id": "Hyp_1", "dst_id": "Rule_1", "relationship_type": "PROPOSES_RULE"}
    ]
    
    class MockCollection:
        def __init__(self, data):
            self.data = data
        def find(self, query=None):
            return self.data
        def find_one(self, query=None):
            return {"file_name": "Dataset_March_2026"}
            
    engine.nodes_col = MockCollection(mock_nodes)
    engine.edges_col = MockCollection(mock_edges)
    
    prov = engine.get_provenance("Rule_1")
    assert prov is not None
    assert prov["label"] == "Rule"
    assert len(prov["provenance_chain"]) == 5
    assert prov["details"]["dataset"] == "Dataset_March_2026"
    assert prov["details"]["patients"] == 48
    assert prov["details"]["support"] == 146
    assert prov["details"]["confidence"] == "91.2%"

