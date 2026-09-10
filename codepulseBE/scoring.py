from typing import Dict, Any, Tuple
from config import CATEGORY_WEIGHTS

def calculate_weighted_score(category_scores: Dict[str, Any]) -> Tuple[int, str]:
    """
    Computes deterministic overall score based on configured category weights.
    Returns (overall_score, grade_label).
    """
    total_score = 0.0
    total_weight = 0.0

    for category, weight in CATEGORY_WEIGHTS.items():
        cat_data = category_scores.get(category, {})
        if isinstance(cat_data, dict):
            score_val = cat_data.get("score", 50)
        else:
            score_val = cat_data
        
        try:
            score_num = float(score_val)
        except (ValueError, TypeError):
            score_num = 50.0
        
        # Clamp to 0-100
        score_num = max(0.0, min(100.0, score_num))
        total_score += score_num * weight
        total_weight += weight

    if total_weight > 0:
        final_score = round(total_score / total_weight)
    else:
        final_score = round(total_score)

    final_score = max(0, min(100, final_score))
    
    # Determine grade
    if final_score >= 90:
        grade = "Excellent"
    elif final_score >= 75:
        grade = "Good"
    elif final_score >= 60:
        grade = "Needs Improvement"
    else:
        grade = "Poor"

    return final_score, grade

def extract_main_issue(category_scores: Dict[str, Any], weaknesses: list) -> str:
    """
    Identifies the primary problem or lowest scoring category to show in ranking tables.
    """
    if weaknesses and len(weaknesses) > 0:
        first_weakness = str(weaknesses[0])
        if len(first_weakness) > 120:
            return first_weakness[:117] + "..."
        return first_weakness
    
    # Find lowest category score
    lowest_cat = None
    lowest_score = 101
    for cat, data in category_scores.items():
        score = data.get("score", 100) if isinstance(data, dict) else data
        if score < lowest_score:
            lowest_score = score
            lowest_cat = cat
            
    cat_names = {
        "project_clarity": "Unclear project purpose & use cases",
        "getting_started": "Incomplete getting started & setup guide",
        "examples": "Missing concrete code/usage examples",
        "structure": "Poor document organization & structure",
        "completeness": "Missing API/configuration documentation",
        "readability": "Dense jargon or readability challenges",
        "visual_presentation": "Lacks visual hierarchy and formatting",
        "trust_signals": "Missing license, build or maturity signals"
    }
    return cat_names.get(lowest_cat, "Documentation needs enhancement")
