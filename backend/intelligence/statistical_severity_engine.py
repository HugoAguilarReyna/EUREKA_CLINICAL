class StatisticalSeverityEngine:
    def __init__(self):
        pass

    def calculate_severity(self, odds_ratio: float, p_value: float, incidence: float, support: int) -> str:
        """
        Calcula la severidad ya no solo por el percentil de incidencia (legacy >= 0.85),
        sino como un score compuesto ponderando la probabilidad estadística y la fuerza de la asociación.
        """
        score = 0
        
        # 1. Fuerza de la Asociación (Odds Ratio)
        if odds_ratio >= 10.0:
            score += 4
        elif odds_ratio >= 5.0:
            score += 3
        elif odds_ratio >= 2.0:
            score += 2
        elif odds_ratio >= 1.5:
            score += 1
            
        # 2. Significancia (P-Value)
        if p_value <= 0.0001:
            score += 3
        elif p_value <= 0.01:
            score += 2
        elif p_value <= 0.05:
            score += 1
            
        # 3. Probabilidad Condicional (Incidence)
        if incidence >= 0.85:
            score += 3
        elif incidence >= 0.70:
            score += 2
        elif incidence >= 0.50:
            score += 1
            
        # Clasificación final
        if score >= 8:
            return "CRITICAL"
        elif score >= 5:
            return "HIGH"
        elif score >= 3:
            return "MEDIUM"
        else:
            return "LOW"
