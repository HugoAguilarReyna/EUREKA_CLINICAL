from backend.agents.nodes import run_structurer

def test_structurer_with_data(empty_state):
    empty_state["working_memory"] = {"raw_features": {"TB": 1.2}}
    state = run_structurer(empty_state)
    assert state["quality_report"]["status"] == "OK"
    assert state["current_stage"] == "STRUCTURER"

def test_structurer_empty_data(empty_state):
    state = run_structurer(empty_state)
    assert state["quality_report"]["status"] == "ERROR"
