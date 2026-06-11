from backend.agents.nodes import run_core

def test_run_core(empty_state):
    state = run_core(empty_state)
    assert state["trace_id"] != ""
    assert state["current_stage"] == "CORE"
    assert state["created_at"] != ""
