from backend.agents.nodes import run_descriptor

def test_descriptor_calculates_ag_ratio(empty_state):
    empty_state["working_memory"] = {"raw_features": {"ALB": 3.0, "TP": 7.0}}
    state = run_descriptor(empty_state)
    features = state["working_memory"]["features"]
    
    assert "A_G_Ratio" in features
    # TP - ALB = 7 - 3 = 4.  A/G = 3 / 4 = 0.75
    assert features["A_G_Ratio"] == 0.75
    assert "A_G_Ratio" in state["descriptor_report"]["derived_features"]
