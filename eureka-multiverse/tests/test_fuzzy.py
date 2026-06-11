from backend.agents.nodes import run_fuzzy

def test_fuzzy_node_valid(empty_state):
    empty_state["working_memory"] = {"features": {"TB": 8.0, "DB": 4.0, "A_G_Ratio": 0.5}}
    state = run_fuzzy(empty_state)
    fuzzy = state["fuzzy_interpretation"]
    
    assert "fuzzy_class" in fuzzy
    assert fuzzy["fuzzy_class"] in ["LOW", "MEDIUM", "HIGH", "UNKNOWN"]
    if fuzzy["fuzzy_class"] != "UNKNOWN":
        assert 0.0 <= fuzzy["fuzzy_score"] <= 1.0
