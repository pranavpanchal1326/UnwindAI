import numpy as np
import json
import os
import logging
from datetime import datetime

# Setup logging
os.makedirs('scripts/ml/logs', exist_ok=True)
# Reset logging to ensure clean state
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

logging.basicConfig(
    filename='scripts/ml/logs/knn_feature_errors.log',
    level=logging.WARNING,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ═══════════════════════════════════════════════════════
# INDEX NAMING CONVENTION
# ═══════════════════════════════════════════════════════

CITY_MAP = {
    0: 'mumbai', 1: 'delhi', 2: 'bangalore',
    3: 'pune', 4: 'hyderabad', 5: 'chennai', 6: 'ahmedabad'
}

TYPE_MAP = {
    0: 'divorce', 1: 'inheritance', 2: 'property',
    3: 'business', 4: 'nri'
}

def get_index_name(city_int: int, type_int: int) -> str:
    """Returns index name like 'knn_pune_divorce'"""
    if city_int not in CITY_MAP:
        raise ValueError(f"Invalid city_int: {city_int}. Must be 0-6.")
    if type_int not in TYPE_MAP:
        raise ValueError(f"Invalid type_int: {type_int}. Must be 0-4.")
    return f"knn_{CITY_MAP[city_int]}_{TYPE_MAP[type_int]}"

def get_all_index_names() -> list[str]:
    """Returns all 35 index names in alphabetical order."""
    return sorted([
        get_index_name(c, t)
        for c in CITY_MAP
        for t in TYPE_MAP
    ])

# ═══════════════════════════════════════════════════════
# NORMALIZATION STATS
# ═══════════════════════════════════════════════════════

KNN_NORM_STATS = {
    'asset_log_max': np.log1p(500000000.0),
    'age_min': 18.0,
    'age_max': 80.0,
    'marriage_max': 40.0,
    'professional_max': 8.0,
    'complexity_max': 10.0,
    'children_max': 3.0,
    'urgency_max': 3.0
}

# ═══════════════════════════════════════════════════════
# KNN FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════

def build_knn_features(case: dict) -> np.ndarray:
    """Builds 8-feature similarity vector."""
    try:
        # 0: Assets (Log Scale)
        assets = float(case.get('total_asset_value_inr', 0.0))
        asset_norm = np.log1p(assets) / KNN_NORM_STATS['asset_log_max']
        
        # 1: Children
        children = float(case.get('children_count', 0.0))
        children_norm = children / KNN_NORM_STATS['children_max']
        
        # 2: Marriage Duration (0 if not divorce)
        marriage = float(case.get('marriage_duration_years', 0.0))
        # Support both 'divorce' string and index 0
        c_type = case.get('case_type')
        is_divorce = (c_type == 'divorce' or c_type == 0)
        marriage_norm = (marriage / KNN_NORM_STATS['marriage_max']) if is_divorce else 0.0
        
        # 3: Petitioner Age
        age = float(case.get('petitioner_age', 35.0))
        age_norm = (age - KNN_NORM_STATS['age_min']) / (KNN_NORM_STATS['age_max'] - KNN_NORM_STATS['age_min'])
        
        # 4: Business Ownership
        biz = 1.0 if case.get('business_ownership') else 0.0
        
        # 5: Urgency
        urg_raw = case.get('urgency', 0)
        if isinstance(urg_raw, str):
            u_map = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
            urgency = float(u_map.get(urg_raw.lower(), 0))
        else:
            urgency = float(urg_raw)
        urgency_norm = urgency / KNN_NORM_STATS['urgency_max']
        
        # 6: Complexity
        comp = float(case.get('complexity_score', 4.0))
        comp_norm = comp / KNN_NORM_STATS['complexity_max']
        
        # 7: Professionals
        prof = float(case.get('professional_count', 2.0))
        prof_norm = prof / KNN_NORM_STATS['professional_max']
        
        vec = np.array([
            asset_norm, children_norm, marriage_norm, age_norm,
            biz, urgency_norm, comp_norm, prof_norm
        ], dtype=np.float32)
        
        if np.isnan(vec).any():
            logging.warning(f"NaN in KNN features for case_id {case.get('case_id')}")
            vec = np.nan_to_num(vec, nan=0.0)
            
        return np.clip(vec, 0.0, 1.0)
        
    except Exception as e:
        logging.error(f"Error building KNN features: {str(e)}")
        return np.zeros(8, dtype=np.float32)

def build_knn_feature_matrix(cases: list[dict]) -> np.ndarray:
    """Batch version. Returns float32 array of shape (N, 8)."""
    if not cases:
        return np.empty((0, 8), dtype=np.float32)
    X_knn = np.stack([build_knn_features(c) for c in cases])
    assert X_knn.shape[-1] == 8
    assert not np.isnan(X_knn).any()
    return X_knn

def validate_knn_features(X_knn: np.ndarray):
    """Validates KNN feature matrix constraints."""
    if X_knn.dtype != np.float32:
        raise ValueError(f"Expected float32, got {X_knn.dtype}")
    if X_knn.shape[-1] != 8:
        raise ValueError(f"Expected 8 features, got {X_knn.shape[-1]}")
    if np.isnan(X_knn).any() or np.isinf(X_knn).any():
        raise ValueError("NaN or Inf detected")
    # Tiny epsilon for float precision
    if np.any((X_knn < -1e-6) | (X_knn > 1.000001)):
        raise ValueError("Features outside [0.0, 1.0] range")

def get_cases_for_index(all_cases: list[dict], city_int: int, type_int: int) -> list[dict]:
    """Filters cases by city and case_type."""
    city_name = CITY_MAP[city_int]
    type_name = TYPE_MAP[type_int]
    filtered = []
    for c in all_cases:
        c_city = c.get('city')
        c_type = c.get('case_type')
        if isinstance(c_city, int): c_city = CITY_MAP.get(c_city)
        if isinstance(c_type, int): c_type = TYPE_MAP.get(c_type)
        if c_city and c_city.lower() == city_name and c_type and c_type.lower() == type_name:
            filtered.append(c)
    print(f"{city_name.capitalize()}+{type_name}: {len(filtered):,} cases")
    if len(filtered) < 50:
        raise ValueError(f"Too few cases ({len(filtered)}) for {city_name}+{type_name}")
    return filtered

def build_outcome_payload(cases: list[dict]) -> list[dict]:
    """Extracts outcome details for KNN results."""
    payload = []
    for c in cases:
        path = c.get('recommended_path', 'collab')
        res = c.get('outcomes', {}).get(path, {})
        dur = int(res.get('duration_days', 0))
        cost = int(res.get('cost_inr', 0))
        
        if path == 'collab':
            kf = "Resolved collaboratively in under 60 days" if dur < 60 else "Collaborative resolution — no court needed"
        elif path in ['mediation', 'med']:
            kf = "Mediated in under 3 months" if dur < 90 else "Mediation required extended negotiation"
        else:
            kf = "Court path — faster than average" if dur < 180 else f"Full court proceedings — {dur} days"
            
        payload.append({
            'case_id': c.get('case_id', 'unknown'),
            'duration_days': dur,
            'cost_inr': cost,
            'path_taken': path,
            'success': bool(res.get('success_prob', 0) > 0.5),
            'key_factor': kf
        })
    return payload

if __name__ == '__main__':
    print("Testing KNN architecture...")
    names = get_all_index_names()
    assert len(names) == 35, f"Expected 35, got {len(names)}"
    print(f"✅ Index names: {len(names)} generated")

    meera_case = {
        'total_asset_value_inr': 12800000,
        'children_count': 1,
        'marriage_duration_years': 11,
        'petitioner_age': 34,
        'business_ownership': False,
        'urgency': 1,
        'complexity_score': 4.2,
        'professional_count': 5,
        'case_type': 'divorce'
    }
    
    vec = build_knn_features(meera_case)
    validate_knn_features(vec.reshape(1, -1))
    print(f"✅ Meera KNN vector: {np.round(vec, 3)}")
    
    labels = ["Asset", "Children", "Marriage", "Age", "Biz", "Urgency", "Comp", "Prof"]
    for i, l in enumerate(labels):
        print(f"   {l:10}: {vec[i]:.3f}")

    with open('scripts/ml/logs/knn_architecture_report.json', 'w') as f:
        json.dump({
            "total_index_names": len(names),
            "index_names": names,
            "knn_feature_count": 8,
            "knn_feature_names": labels,
            "meera_knn_vector": [float(x) for x in vec],
            "normalization_verified": True,
            "min_cases_per_index": "validated at build time"
        }, f, indent=2)

    print("✅ knn_features.py — architecture verified. Ready for Part 2.")
