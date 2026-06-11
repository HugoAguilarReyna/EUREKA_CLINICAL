from backend.agents.nodes import run_predictor
from backend.ml.predictor_v0 import predict_v0

def test_predict_v0_logic():
    score1 = predict_v0({"TB": 2.0, "DB": 0.5, "Alkphos": 200, "Sgot": 40})
    assert score1 == 1.0
    
    score2 = predict_v0({"TB": 1.0, "DB": 0.1, "Alkphos": 100, "Sgot": 20})
    assert score2 == 0.0

def test_run_predictor_node(empty_state):
    empty_state["working_memory"] = {"features": {"TB": 2.0, "DB": 0.5}}
    state = run_predictor(empty_state)
    pred = state["prediction_result"]
    
    assert 0.0 <= pred["risk_score"] <= 1.0
    assert pred["risk_class"] in ["LOW", "MEDIUM", "HIGH"]
