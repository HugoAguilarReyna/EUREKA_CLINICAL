from backend.semantic.graph_abstraction_engine import GraphAbstractionEngine
from backend.semantic.graph_cache import GraphCache

def test_bfs_traversal_progressive_graph():
    # Setup test nodes and edges
    nodes = [
        {"id": "Patient_5", "label": "Patient", "properties": {}},
        {"id": "VAR_Age", "label": "Variable", "properties": {}},
        {"id": "STATE_Age_HIGH", "label": "SemanticState", "properties": {}},
        {"id": "Rule_12", "label": "Rule", "properties": {}},
        {"id": "Patient_99", "label": "Patient", "properties": {}}
    ]
    edges = [
        {"src_id": "Patient_5", "dst_id": "VAR_Age", "relationship_type": "HAS_VALUE"},
        {"src_id": "VAR_Age", "dst_id": "STATE_Age_HIGH", "relationship_type": "ACTIVATES_STATE"},
        {"src_id": "STATE_Age_HIGH", "dst_id": "Rule_12", "relationship_type": "ACTIVATES_RULE"},
        {"src_id": "Patient_99", "dst_id": "VAR_Age", "relationship_type": "HAS_VALUE"}
    ]
    
    # 1. Test empty state when no entity is selected
    res_empty = GraphAbstractionEngine.get_abstract_view(nodes, edges, level=3)
    assert len(res_empty["nodes"]) == 0
    assert len(res_empty["edges"]) == 0
    
    # 2. Test depth=1 starting from Patient_5
    res_d1 = GraphAbstractionEngine.get_abstract_view(
        nodes, edges, level=3, entity_type="patient", entity_id="Patient_5", depth=1
    )
    # Patient -> Variable. Patient_5 (depth 0) and VAR_Age (depth 1) should be found.
    node_ids = {n["id"] for n in res_d1["nodes"]}
    assert "Patient_5" in node_ids
    assert "VAR_Age" in node_ids
    assert "STATE_Age_HIGH" not in node_ids  # depth 2
    assert "Patient_99" not in node_ids      # unrelated patient
    
    # 3. Test depth=2 starting from Patient_5
    res_d2 = GraphAbstractionEngine.get_abstract_view(
        nodes, edges, level=3, entity_type="patient", entity_id="Patient_5", depth=2
    )
    node_ids_d2 = {n["id"] for n in res_d2["nodes"]}
    assert "Patient_5" in node_ids_d2
    assert "VAR_Age" in node_ids_d2
    assert "STATE_Age_HIGH" in node_ids_d2  # depth 2
    assert "Rule_12" not in node_ids_d2      # depth 3
    
    # 4. Check expandable and remaining_depth properties
    for n in res_d2["nodes"]:
        if n["id"] == "Patient_5":
            assert n["properties"]["remaining_depth"] == 3
            assert n["properties"]["expandable"] is True
        elif n["id"] == "VAR_Age":
            assert n["properties"]["remaining_depth"] == 2
            assert n["properties"]["expandable"] is True

def test_progressive_graph_cache():
    cache = GraphCache()
    cache.clear()
    
    # Check cache miss
    assert cache.get("patient", "Patient_5", 1) is None
    
    # Check cache set and hit
    dummy_data = {"nodes": [{"id": "Patient_5"}], "edges": []}
    cache.set("patient", "Patient_5", 1, dummy_data)
    
    hit = cache.get("patient", "Patient_5", 1)
    assert hit is not None
    assert hit["nodes"][0]["id"] == "Patient_5"
    
    # Check cache case insensitivity
    hit_case = cache.get("PATIENT", "Patient_5", 1)
    assert hit_case is not None
    
    # Clear cache
    cache.clear()
    assert cache.get("patient", "Patient_5", 1) is None

def test_progressive_graph_limits():
    # Setup test nodes and edges to exceed limits
    # Max nodes is 150, max edges is 300.
    # We set node label to 'Action' which is allowed in 'rule' scope.
    nodes = [{"id": "Node_0", "label": "Rule", "properties": {}}]
    for i in range(1, 200):
        nodes.append({"id": f"Node_{i}", "label": "Action", "properties": {}})
        
    edges = []
    for i in range(1, 200):
        edges.append({"src_id": "Node_0", "dst_id": f"Node_{i}", "relationship_type": "SUGGESTS"})
        
    res = GraphAbstractionEngine.get_abstract_view(
        nodes=nodes,
        edges=edges,
        level=3,
        entity_type="rule",
        entity_id="Node_0",
        depth=3
    )
    
    # It should return a warning structure due to exceeding the 150 nodes limit
    assert res.get("warning") is True
    assert "exceeds rendering threshold" in res.get("message", "")
    assert len(res["nodes"]) == 0
    assert len(res["edges"]) == 0
