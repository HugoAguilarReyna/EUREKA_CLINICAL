from langgraph.graph import StateGraph, END
from backend.flow.state import CaseContext
from backend.agents.nodes import (
    run_core, run_structurer, run_descriptor,
    run_predictor, run_fuzzy, run_prescriptor,
    run_memory_commit
)

def create_workflow():
    workflow = StateGraph(CaseContext)
    
    # Nodos cognitivos síncronos
    workflow.add_node("core", run_core)
    workflow.add_node("structurer", run_structurer)
    workflow.add_node("descriptor", run_descriptor)
    workflow.add_node("predictor", run_predictor)
    workflow.add_node("fuzzy", run_fuzzy)
    workflow.add_node("prescriptor", run_prescriptor)
    
    # Nodo de persistencia asíncrono
    workflow.add_node("memory_commit", run_memory_commit)
    
    # Flujo
    workflow.add_edge("core", "structurer")
    workflow.add_edge("structurer", "descriptor")
    workflow.add_edge("descriptor", "predictor")
    workflow.add_edge("predictor", "fuzzy")
    workflow.add_edge("fuzzy", "prescriptor")
    workflow.add_edge("prescriptor", "memory_commit")
    workflow.add_edge("memory_commit", END)
    
    workflow.set_entry_point("core")
    
    return workflow.compile()

eureka_graph = create_workflow()
