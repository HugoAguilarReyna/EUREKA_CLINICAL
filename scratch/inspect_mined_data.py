import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db.database import init_db
from backend.models.intelligence import DecisionInsightRecord, MinedRuleRecord

async def main():
    await init_db()
    insights = await DecisionInsightRecord.find_all().to_list()
    rules = await MinedRuleRecord.find_all().to_list()
    
    print("--- INSIGHTS ---")
    for ins in insights:
        print(f"ID: {ins.insight_id}")
        print(f"Title: {ins.title}")
        print(f"Description: {ins.description}")
        print(f"Evidence: {ins.evidence}")
        print(f"Confidence: {ins.confidence}")
        print(f"Risk Level: {ins.risk_level}")
        print(f"Action: {ins.action}")
        print(f"Population: {ins.affected_population}")
        print(f"Variables: {ins.impacted_variables}")
        print("-" * 40)
        
    print("\n--- RULES ---")
    for rule in rules:
        print(f"ID: {rule.rule_id}")
        print(f"Expression: {rule.expression}")
        print(f"Lift: {rule.lift}")
        print(f"Support: {rule.support}")
        print(f"Confidence: {rule.confidence}")
        print(f"Affected Count: {rule.affected_count}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
