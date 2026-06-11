from fastapi.testclient import TestClient
from backend.api.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_analyze_endpoint():
    payload = {
        "features": {
            "TB": 2.5,
            "DB": 0.8,
            "Alkphos": 150.0,
            "Sgot": 45.0,
            "TP": 6.8,
            "ALB": 3.0
        }
    }
    response = client.post("/api/cases/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "case_id" in data
    assert "prediction" in data
    assert "risk" in data
    assert "recommendation" in data
    assert data["prediction"]["risk_score"] > 0
