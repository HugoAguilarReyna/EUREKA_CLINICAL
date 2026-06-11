import asyncio
import os
import sys

# Ensure backend imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.copilot.knowledge_copilot import KnowledgeCopilot

def main():
    cop = KnowledgeCopilot()
    qs = [
        "How many patients exist?",
        "What is the average age?",
        "What variables are most important?",
        "What discoveries were found?",
        "Why was this graph built?",
        "What should a physician pay attention to?"
    ]
    
    print("--- COPILOT TRUTHFULNESS AND ACCURACY AUDIT ---")
    for q in qs:
        res = cop.ask(q)
        print(f"Question: {q}")
        print(f"Answer: {res.get('answer', '')}")
        print(f"Data Payload: {res.get('data', None)}")
        print("-" * 60)

if __name__ == "__main__":
    main()
