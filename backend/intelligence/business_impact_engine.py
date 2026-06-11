class BusinessImpactEngine:
    def __init__(self):
        pass

    def evaluate_impact(self, name: str, absolute_change: float, relative_change: float, is_significant: bool) -> str:
        """
        Clasifica el impacto de negocio de un cambio.
        Returns: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        """
        if not is_significant:
            return "LOW"
            
        abs_val = abs(absolute_change)
        rel_val = abs(relative_change)
        
        # Reglas de negocio duras (Heurísticas Ejecutivas)
        
        # Si el cambio absoluto poblacional supera el 20%, es una crisis organizativa o un hito masivo
        if abs_val >= 20.0:
            return "CRITICAL"
            
        # Si es un hallazgo específicamente sobre Bilirrubina o features conocidos altamente letales
        # En el futuro esto provendría del Grafo de Conocimiento Clínico
        is_high_risk_feature = any(x in name.lower() for x in ["bilirrubina", "sgot", "sgpt", "direct bilirubin", "alkphos"])
        
        if is_high_risk_feature:
            if abs_val >= 10.0 or rel_val >= 30.0:
                return "CRITICAL"
            elif abs_val >= 5.0 or rel_val >= 15.0:
                return "HIGH"
            else:
                return "MEDIUM"
                
        # Riesgos estándar
        if abs_val >= 15.0 or rel_val >= 40.0:
            return "CRITICAL"
        elif abs_val >= 8.0 or rel_val >= 20.0:
            return "HIGH"
        elif abs_val >= 3.0 or rel_val >= 10.0:
            return "MEDIUM"
            
        return "LOW"
        
    def generate_recommendation(self, name: str, severity: str, direction: str) -> str:
        if severity == "LOW":
            return "Ninguna acción requerida. Monitorear pasivamente."
        
        if direction == "empeoró":
            if severity == "CRITICAL":
                return f"ACCIÓN INMEDIATA REQUERIDA: Convocar comité de crisis para auditar el subgrupo asociado a '{name}'. Riesgo clínico severo inminente."
            elif severity == "HIGH":
                return f"Priorizar revisión de la estrategia actual respecto a '{name}'. Asignar recursos preventivos."
            else:
                return f"Revisar el aumento en '{name}' en la próxima sesión de control."
        else: # mejoró
            if severity == "CRITICAL":
                return f"Éxito Estratégico Confirmado. Estandarizar el protocolo aplicado a '{name}' para el resto de la organización."
            elif severity == "HIGH":
                return f"Resultados positivos sólidos en '{name}'. Mantener el curso de acción actual."
            else:
                return f"Mejora moderada en '{name}'. Continuar monitoreo."
