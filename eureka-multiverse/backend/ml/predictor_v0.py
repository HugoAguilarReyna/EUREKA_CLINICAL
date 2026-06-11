def predict_v0(features: dict) -> float:
    """
    PredictorAgent v0 (Heurístico Temporal).
    Calcula un risk_score determinístico basado en pesos fijos para mantener 
    el contrato JSON hasta que se reemplace por XGBoost v1.
    """
    score = 0.0
    tb = features.get("TB", 0.0)
    db = features.get("DB", 0.0)
    alk = features.get("Alkphos", 0.0)
    sgot = features.get("Sgot", 0.0)
    
    # Heurística artificial explícita (0.0 a 1.0)
    if tb > 1.2: score += 0.3
    if db > 0.3: score += 0.2
    if alk > 147: score += 0.25
    if sgot > 35: score += 0.25
    
    return min(1.0, score)
