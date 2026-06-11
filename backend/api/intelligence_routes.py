import time
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from backend.intelligence.decision_engine import DecisionEngine
from backend.intelligence.risk_engine import RiskEngine
from backend.intelligence.simulation_engine import SimulationEngine
from backend.graph.logger import logger

router = APIRouter(prefix="/knowledge/intelligence", tags=["decision_intelligence"])

_decider = DecisionEngine()
_risker = RiskEngine()
_simulator = SimulationEngine()


@router.post("/recalculate")
async def recalculate_patterns():
    """Trigger the Risk Engine to run Subgroup Analysis and persist patterns/insights in MongoDB."""
    t0 = time.time()
    try:
        result = await _risker.mine_patterns()
        elapsed = (time.time() - t0) * 1000
        logger.info("api_performance", extra={
            "endpoint": "recalculate_patterns",
            "execution_time_ms": elapsed,
            "payload_size_bytes": len(str(result)),
            "nodes_returned": 0,
            "edges_returned": 0
        })
        return result
    except Exception as e:
        logger.error(f"recalculate_patterns error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights")
async def get_decision_insights():
    """Retrieve the mined prescriptive Decision Insights from MongoDB."""
    t0 = time.time()
    try:
        result = await _decider.get_all_insights()
        elapsed = (time.time() - t0) * 1000
        logger.info("api_performance", extra={
            "endpoint": "get_decision_insights",
            "execution_time_ms": elapsed,
            "payload_size_bytes": len(str(result)),
            "nodes_returned": len(result),
            "edges_returned": 0
        })
        return result
    except Exception as e:
        logger.error(f"get_decision_insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules")
async def get_mined_rules():
    """Retrieve all logical clinical Mined Rules from MongoDB."""
    t0 = time.time()
    try:
        result = await _decider.get_all_rules()
        elapsed = (time.time() - t0) * 1000
        logger.info("api_performance", extra={
            "endpoint": "get_mined_rules",
            "execution_time_ms": elapsed,
            "payload_size_bytes": len(str(result)),
            "nodes_returned": len(result),
            "edges_returned": 0
        })
        return result
    except Exception as e:
        logger.error(f"get_mined_rules error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulate")
async def run_simulation(
    scenario: str = Query("outlier_trim", description="Scenario ID: outlier_trim, reduce_db_30, or age_gt_60"),
    iqr_multiplier: float = Query(1.5, description="IQR multiplier threshold for outlier removal")
):
    """Simulate different what-if scenarios (outliers, therapy, age subgroups) and returns expected impacts."""
    t0 = time.time()
    try:
        params = {"iqr_multiplier": iqr_multiplier}
        result = _simulator.run_scenario(scenario, params)
        elapsed = (time.time() - t0) * 1000
        logger.info("api_performance", extra={
            "endpoint": f"run_simulation_{scenario}",
            "execution_time_ms": elapsed,
            "payload_size_bytes": len(str(result)),
            "nodes_returned": len(result.get("correlation_comparison", [])),
            "edges_returned": 0
        })
        return result
    except Exception as e:
        logger.error(f"run_simulation scenario {scenario} error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

