from backend.agents.nodes import run_prescriptor

def test_prescriptor_high_risk(empty_state):
    empty_state["prediction_result"] = {"risk_class": "HIGH"}
    empty_state["fuzzy_interpretation"] = {"fuzzy_class": "HIGH"}
    state = run_prescriptor(empty_state)
    
    assert state["recommendation"]["type"] == "CLINICAL"
    assert "Hepatología" in state["recommendation"]["detail"]

def test_prescriptor_low_risk(empty_state):
    empty_state["prediction_result"] = {"risk_class": "LOW"}
    empty_state["fuzzy_interpretation"] = {"fuzzy_class": "LOW"}
    state = run_prescriptor(empty_state)
    
    assert state["recommendation"]["type"] == "GENERAL"
