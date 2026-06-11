import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

def get_fuzzy_engine():
    """Configura el motor Scikit-Fuzzy para riesgo hepático."""
    # Antecedentes (Entradas)
    tb = ctrl.Antecedent(np.arange(0, 10.1, 0.1), 'TB')
    db = ctrl.Antecedent(np.arange(0, 5.1, 0.1), 'DB')
    ag_ratio = ctrl.Antecedent(np.arange(0, 3.1, 0.1), 'A_G_Ratio')
    
    # Consecuente (Salida)
    risk = ctrl.Consequent(np.arange(0, 1.01, 0.01), 'Risk')
    
    # Funciones de Membresía (LOW, MEDIUM, HIGH)
    tb.automf(3, names=['LOW', 'MEDIUM', 'HIGH'])
    db.automf(3, names=['LOW', 'MEDIUM', 'HIGH'])
    ag_ratio.automf(3, names=['LOW', 'MEDIUM', 'HIGH'])
    risk.automf(3, names=['LOW', 'MEDIUM', 'HIGH'])
    
    # Reglas Clínicas Difusas (Ejemplo)
    rule1 = ctrl.Rule(tb['HIGH'] | db['HIGH'], risk['HIGH'])
    rule2 = ctrl.Rule(tb['LOW'] & ag_ratio['HIGH'], risk['LOW'])
    rule3 = ctrl.Rule(tb['MEDIUM'] | ag_ratio['MEDIUM'], risk['MEDIUM'])
    
    # Sistema de Control
    risk_ctrl = ctrl.ControlSystem([rule1, rule2, rule3])
    return ctrl.ControlSystemSimulation(risk_ctrl)

# Singleton Engine
engine = get_fuzzy_engine()

def evaluate_fuzzy(tb_val: float, db_val: float, ag_val: float) -> dict:
    """Evalúa los valores clínicos y retorna la membresía difusa."""
    try:
        engine.input['TB'] = float(tb_val)
        engine.input['DB'] = float(db_val)
        engine.input['A_G_Ratio'] = float(ag_val)
        
        engine.compute()
        output_risk = engine.output['Risk']
        
        # Etiquetado defuzzificado base
        if output_risk > 0.66:
            risk_class = "HIGH"
        elif output_risk > 0.33:
            risk_class = "MEDIUM"
        else:
            risk_class = "LOW"
            
        return {
            "fuzzy_score": output_risk,
            "fuzzy_class": risk_class,
            "explanation": f"Riesgo difuso calculado en {output_risk:.2f} ({risk_class})"
        }
    except Exception as e:
        return {"error": str(e), "fuzzy_class": "UNKNOWN"}
