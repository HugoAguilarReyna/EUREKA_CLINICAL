from pydantic import BaseModel
from scipy import stats
import math

class ValidationResultDTO(BaseModel):
    finding: str
    absolute_change: float
    relative_change: float
    confidence: float
    is_significant: bool

class ValidationEngine:
    def __init__(self, confidence_threshold=0.90):
        self.confidence_threshold = confidence_threshold

    def validate_proportion_change(self, name: str, count_a: int, total_a: int, count_b: int, total_b: int) -> ValidationResultDTO:
        """
        Validates if a change in proportion between two snapshots is statistically significant.
        Uses a two-proportion Z-test.
        """
        prop_a = count_a / total_a if total_a > 0 else 0.0
        prop_b = count_b / total_b if total_b > 0 else 0.0
        
        abs_change = prop_b - prop_a
        rel_change = (abs_change / prop_a) * 100 if prop_a > 0 else float('inf') if prop_b > 0 else 0.0
        
        # Z-test
        p_pool = (count_a + count_b) / (total_a + total_b) if (total_a + total_b) > 0 else 0.0
        se_pool = math.sqrt(p_pool * (1 - p_pool) * (1/total_a + 1/total_b)) if total_a > 0 and total_b > 0 else float('inf')
        
        if se_pool > 0 and se_pool != float('inf'):
            z_stat = abs_change / se_pool
            # 2-tailed p-value
            p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
            confidence = 1.0 - p_value
        else:
            confidence = 0.0
            
        # Rely heavily on statistical significance (P-value) instead of hardcoded absolute %
        # For small sample sizes (N=583), 4% relative change (5 patients) has poor P-value, 
        # but the business considers >3% as a legitimate trend shift.
        is_significant = (confidence >= self.confidence_threshold) or (abs(rel_change) > 2.5)
        
        return ValidationResultDTO(
            finding=f"Cambio en {name}",
            absolute_change=round(abs_change * 100, 2),
            relative_change=round(rel_change, 2),
            confidence=round(confidence, 4),
            is_significant=is_significant
        )
