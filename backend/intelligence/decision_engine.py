from typing import List, Dict, Any
from backend.models.intelligence import MinedRuleRecord
from backend.intelligence.risk_engine import RiskEngine
from backend.intelligence.executive_insight_engine import ExecutiveInsightEngine

class DecisionEngine:
    """
    Decision Engine that aggregates and exposes Prescriptive Decision Insights and Rules.
    """

    def __init__(self):
        self.risk_engine = RiskEngine()
        self.executive_insight_engine = ExecutiveInsightEngine()

    async def get_all_insights(self) -> List[Dict[str, Any]]:
        """Generate and retrieve all Executive Decision Insights directly from real data."""
        # Ensure rules/patterns are mined initially if needed
        # We can run risk_engine.mine_patterns() once, but executive_insight_engine generates dynamically
        insights = self.executive_insight_engine.generate_insights()
        return [ins.model_dump() for ins in insights]

    async def get_all_rules(self) -> List[Dict[str, Any]]:
        """Retrieve all persisted Mined Rules from MongoDB."""
        rules = await MinedRuleRecord.find_all().to_list()
        if not rules:
            await self.risk_engine.mine_patterns()
            rules = await MinedRuleRecord.find_all().to_list()
            
        return [
            {
                "id": rule.rule_id,
                "expression": rule.expression,
                "conditions": rule.conditions,
                "target_class": rule.target_class,
                "lift": rule.lift,
                "support": rule.support,
                "confidence": rule.confidence,
                "affected_count": rule.affected_count,
                "rule_status": rule.rule_status
            }
            for rule in rules
        ]

