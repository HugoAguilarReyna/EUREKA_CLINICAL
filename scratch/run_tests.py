import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.tests.test_cohort_intelligence import (
    test_centrality_calculation,
    test_evidence_strength_calculator,
    test_clinical_hypothesis_generation,
    test_pattern_evolution_tracking,
    test_graph_abstraction_levels,
    test_provenance_engine
)
from backend.tests.test_progressive_graph import (
    test_bfs_traversal_progressive_graph,
    test_progressive_graph_cache,
    test_progressive_graph_limits
)

if __name__ == "__main__":
    print("Running Cohort Intelligence & Progressive Graph Test Suite...")
    try:
        print("- Running test_centrality_calculation...")
        test_centrality_calculation()
        print("- Running test_evidence_strength_calculator...")
        test_evidence_strength_calculator()
        print("- Running test_clinical_hypothesis_generation...")
        test_clinical_hypothesis_generation()
        print("- Running test_pattern_evolution_tracking...")
        test_pattern_evolution_tracking()
        print("- Running test_graph_abstraction_levels...")
        test_graph_abstraction_levels()
        print("- Running test_provenance_engine...")
        test_provenance_engine()
        
        # Epic 10.0A tests
        print("- Running test_bfs_traversal_progressive_graph...")
        test_bfs_traversal_progressive_graph()
        print("- Running test_progressive_graph_cache...")
        test_progressive_graph_cache()
        print("- Running test_progressive_graph_limits...")
        test_progressive_graph_limits()
        
        print("\nALL TESTS PASSED SUCCESSFULLY! [OK]")
        sys.exit(0)
    except AssertionError as e:
        print(f"\nTEST FAILED (AssertionError): {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\nTEST CRASHED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
