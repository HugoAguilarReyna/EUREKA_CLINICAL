import requests
import json
import time

QUESTIONS = [
    "¿Qué descubriste?",
    "¿Qué riesgo es más importante?",
    "¿Qué evidencia tienes?",
    "¿Qué pacientes requieren revisión?",
    "¿Qué variable explica mejor la enfermedad?",
    "¿Qué acción recomiendas?"
]

URL = "http://localhost:8001/knowledge/copilot/ask"

def audit_copilot():
    results = {}
    for q in QUESTIONS:
        try:
            res = requests.post(URL, json={"question": q}, timeout=10)
            res.raise_for_status()
            results[q] = res.json()
        except Exception as e:
            results[q] = f"ERROR: {e}"
    
    with open("d:/antigravity/Eureka/Actividad1/artifacts/audit/copilot_audit.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("Copilot audit saved.")

if __name__ == "__main__":
    audit_copilot()
