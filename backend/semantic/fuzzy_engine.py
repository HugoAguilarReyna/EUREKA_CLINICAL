import math
from typing import Dict, Any, List, Optional

# Clinical thresholds for LOW, NORMAL, HIGH, VERY_HIGH fuzzy sets
FUZZY_RANGES = {
    "TB": { # Total Bilirubin
        "triangular": {
            "LOW": [0.0, 0.3, 0.8],
            "NORMAL": [0.5, 0.9, 1.3],
            "HIGH": [1.0, 1.8, 3.0],
            "VERY_HIGH": [2.5, 5.0, 15.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 0.3, 0.8],
            "NORMAL": [0.5, 0.8, 1.0, 1.3],
            "HIGH": [1.0, 1.5, 2.0, 3.0],
            "VERY_HIGH": [2.5, 4.0, 15.0, 15.0]
        },
        "gaussian": {
            "LOW": [0.3, 0.2],
            "NORMAL": [0.9, 0.15],
            "HIGH": [1.8, 0.4],
            "VERY_HIGH": [5.0, 2.0]
        }
    },
    "DB": { # Direct Bilirubin
        "triangular": {
            "LOW": [0.0, 0.05, 0.15],
            "NORMAL": [0.08, 0.18, 0.3],
            "HIGH": [0.22, 0.5, 1.0],
            "VERY_HIGH": [0.8, 2.0, 8.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 0.05, 0.15],
            "NORMAL": [0.08, 0.12, 0.22, 0.3],
            "HIGH": [0.22, 0.35, 0.65, 1.0],
            "VERY_HIGH": [0.8, 1.5, 8.0, 8.0]
        },
        "gaussian": {
            "LOW": [0.05, 0.04],
            "NORMAL": [0.18, 0.05],
            "HIGH": [0.5, 0.15],
            "VERY_HIGH": [2.0, 0.8]
        }
    },
    "Alkphos": { # Alkaline Phosphatase
        "triangular": {
            "LOW": [0.0, 25.0, 60.0],
            "NORMAL": [50.0, 95.0, 140.0],
            "HIGH": [120.0, 200.0, 300.0],
            "VERY_HIGH": [250.0, 500.0, 2500.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 25.0, 60.0],
            "NORMAL": [50.0, 80.0, 110.0, 140.0],
            "HIGH": [120.0, 160.0, 240.0, 300.0],
            "VERY_HIGH": [250.0, 400.0, 2500.0, 2500.0]
        },
        "gaussian": {
            "LOW": [25.0, 12.0],
            "NORMAL": [95.0, 20.0],
            "HIGH": [200.0, 40.0],
            "VERY_HIGH": [500.0, 150.0]
        }
    },
    "Sgpt": { # ALT (Alanine Aminotransferase)
        "triangular": {
            "LOW": [0.0, 5.0, 20.0],
            "NORMAL": [15.0, 30.0, 45.0],
            "HIGH": [35.0, 80.0, 150.0],
            "VERY_HIGH": [120.0, 400.0, 2000.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 5.0, 20.0],
            "NORMAL": [15.0, 25.0, 35.0, 45.0],
            "HIGH": [35.0, 60.0, 100.0, 150.0],
            "VERY_HIGH": [120.0, 300.0, 2000.0, 2000.0]
        },
        "gaussian": {
            "LOW": [5.0, 4.0],
            "NORMAL": [30.0, 8.0],
            "HIGH": [80.0, 25.0],
            "VERY_HIGH": [400.0, 120.0]
        }
    },
    "Sgot": { # AST (Aspartate Aminotransferase)
        "triangular": {
            "LOW": [0.0, 5.0, 20.0],
            "NORMAL": [15.0, 30.0, 45.0],
            "HIGH": [35.0, 80.0, 150.0],
            "VERY_HIGH": [120.0, 400.0, 2000.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 5.0, 20.0],
            "NORMAL": [15.0, 25.0, 35.0, 45.0],
            "HIGH": [35.0, 60.0, 100.0, 150.0],
            "VERY_HIGH": [120.0, 300.0, 2000.0, 2000.0]
        },
        "gaussian": {
            "LOW": [5.0, 4.0],
            "NORMAL": [30.0, 8.0],
            "HIGH": [80.0, 25.0],
            "VERY_HIGH": [400.0, 120.0]
        }
    },
    "ALB": { # Albumin
        "triangular": {
            "LOW": [0.0, 2.0, 3.4],
            "NORMAL": [3.0, 4.0, 5.0],
            "HIGH": [4.5, 5.2, 6.0],
            "VERY_HIGH": [5.5, 6.5, 9.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 2.0, 3.4],
            "NORMAL": [3.0, 3.5, 4.5, 5.0],
            "HIGH": [4.5, 4.8, 5.5, 6.0],
            "VERY_HIGH": [5.5, 6.0, 9.0, 9.0]
        },
        "gaussian": {
            "LOW": [2.0, 0.5],
            "NORMAL": [4.0, 0.4],
            "HIGH": [5.2, 0.3],
            "VERY_HIGH": [6.5, 0.8]
        }
    },
    "TP": { # Total Proteins
        "triangular": {
            "LOW": [0.0, 4.0, 5.8],
            "NORMAL": [5.2, 6.8, 8.0],
            "HIGH": [7.5, 8.5, 9.5],
            "VERY_HIGH": [9.0, 10.5, 14.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 4.0, 5.8],
            "NORMAL": [5.2, 6.0, 7.5, 8.0],
            "HIGH": [7.5, 8.0, 9.0, 9.5],
            "VERY_HIGH": [9.0, 10.0, 14.0, 14.0]
        },
        "gaussian": {
            "LOW": [4.0, 0.8],
            "NORMAL": [6.8, 0.6],
            "HIGH": [8.5, 0.4],
            "VERY_HIGH": [10.5, 1.0]
        }
    },
    "A/G Ratio": { # Albumin/Globulin Ratio
        "triangular": {
            "LOW": [0.0, 0.4, 0.9],
            "NORMAL": [0.8, 1.3, 1.8],
            "HIGH": [1.6, 2.1, 2.6],
            "VERY_HIGH": [2.4, 3.2, 5.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 0.4, 0.9],
            "NORMAL": [0.8, 1.0, 1.5, 1.8],
            "HIGH": [1.6, 1.8, 2.3, 2.6],
            "VERY_HIGH": [2.4, 2.8, 5.0, 5.0]
        },
        "gaussian": {
            "LOW": [0.4, 0.15],
            "NORMAL": [1.3, 0.2],
            "HIGH": [2.1, 0.2],
            "VERY_HIGH": [3.2, 0.5]
        }
    },
    "Age": { # Age
        "triangular": {
            "LOW": [0.0, 10.0, 22.0],
            "NORMAL": [18.0, 35.0, 55.0],
            "HIGH": [50.0, 68.0, 80.0],
            "VERY_HIGH": [75.0, 85.0, 110.0]
        },
        "trapezoidal": {
            "LOW": [0.0, 0.0, 10.0, 22.0],
            "NORMAL": [18.0, 25.0, 45.0, 55.0],
            "HIGH": [50.0, 60.0, 72.0, 80.0],
            "VERY_HIGH": [75.0, 80.0, 110.0, 110.0]
        },
        "gaussian": {
            "LOW": [10.0, 5.0],
            "NORMAL": [35.0, 10.0],
            "HIGH": [68.0, 8.0],
            "VERY_HIGH": [85.0, 10.0]
        }
    }
}

def triangular_membership(x: float, a: float, b: float, c: float) -> float:
    """Calculates triangular fuzzy membership value."""
    if x <= a or x >= c:
        return 0.0
    if a < x <= b:
        return (x - a) / (b - a) if b > a else 1.0
    if b < x < c:
        return (c - x) / (c - b) if c > b else 1.0
    return 0.0

def trapezoidal_membership(x: float, a: float, b: float, c: float, d: float) -> float:
    """Calculates trapezoidal fuzzy membership value."""
    if x <= a or x >= d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if a < x < b:
        return (x - a) / (b - a) if b > a else 1.0
    if c < x < d:
        return (d - x) / (d - c) if d > c else 1.0
    return 0.0

def gaussian_membership(x: float, mean: float, sigma: float) -> float:
    """Calculates gaussian fuzzy membership value."""
    if sigma <= 0:
        return 1.0 if x == mean else 0.0
    return math.exp(-0.5 * ((x - mean) / sigma) ** 2)

class FuzzyEngine:
    @staticmethod
    def get_memberships(variable: str, value: float, function_type: str = "triangular") -> Dict[str, float]:
        """
        Computes memberships for LOW, NORMAL, HIGH, VERY_HIGH based on function type.
        """
        if variable not in FUZZY_RANGES:
            return {"LOW": 0.0, "NORMAL": 1.0, "HIGH": 0.0, "VERY_HIGH": 0.0}
        
        ranges = FUZZY_RANGES[variable][function_type]
        memberships = {}
        
        for k, params in ranges.items():
            if function_type == "triangular":
                memberships[k] = triangular_membership(value, params[0], params[1], params[2])
            elif function_type == "trapezoidal":
                memberships[k] = trapezoidal_membership(value, params[0], params[1], params[2], params[3])
            elif function_type == "gaussian":
                memberships[k] = gaussian_membership(value, params[0], params[1])
                
        # Handle normalization boundaries if all are 0
        if sum(memberships.values()) == 0.0:
            if value <= ranges["LOW"][0]:
                memberships["LOW"] = 1.0
            elif value >= ranges["VERY_HIGH"][-1]:
                memberships["VERY_HIGH"] = 1.0
            else:
                memberships["NORMAL"] = 1.0
                
        return memberships

    @staticmethod
    def compute_semantic_entropy(memberships: Dict[str, float]) -> float:
        """
        Calculates Shannon Entropy of the fuzzy membership vector.
        Quantifies the semantic fuzziness or overlap between concepts.
        """
        vals = list(memberships.values())
        s = sum(vals)
        if s == 0:
            return 0.0
        entropy = 0.0
        for v in vals:
            p = v / s
            if p > 0:
                entropy -= p * math.log2(p)
        return entropy
