import os
import sys
import json
import time
import pickle
import numpy as np
from sklearn.neighbors import BallTree
from collections import Counter

# Ensure project root is in path
sys.path.append(os.getcwd())

from scripts.ml.knn_features import (
    get_index_name, get_all_index_names,
    build_knn_feature_matrix, build_outcome_payload,
    validate_knn_features, get_cases_for_index,
    build_knn_features,
    CITY_MAP, TYPE_MAP
)
from scripts.ml.features import load_cases

# ═══════════════════════════════════════════════════════
# SAMPLING FOR SIZE COMPLIANCE (GAP ML-10)
# ═══════════════════════════════════════════════════════
TOTAL_INDEX_SAMPLE = 40000 

def test_query_speed(tree: BallTree, X_sample: np.ndarray) -> float:
    times = []
    for _ in range(10):
        start = time.perf_counter()
        tree.query(X_sample, k=20, return_distance=True)
        times.append((time.perf_counter() - start) * 1000)
    return float(np.median(times))

def build_single_index(all_cases: list[dict], city_int: int, type_int: int, output_dir: str) -> dict:
    index_name = get_index_name(city_int, type_int)
    start_build = time.perf_counter()
    
    try:
        filtered_cases = get_cases_for_index(all_cases, city_int, type_int)
    except ValueError as e:
        print(f"  ⚠️ WARNING: {str(e)}")
        # Fallback filter
        city_name = CITY_MAP[city_int]
        type_name = TYPE_MAP[type_int]
        filtered_cases = [c for c in all_cases if (c.get('city') == city_name or c.get('city') == city_int) and (c.get('case_type') == type_name or c.get('case_type') == type_int)]

    if not filtered_cases:
        return None

    X_knn = build_knn_feature_matrix(filtered_cases)
    payload = build_outcome_payload(filtered_cases)
    validate_knn_features(X_knn)
    
    assert len(X_knn) == len(payload)
    tree = BallTree(X_knn, leaf_size=40, metric='euclidean')
    
    build_time_ms = (time.perf_counter() - start_build) * 1000
    query_time_ms = test_query_speed(tree, X_knn[0:1])
    slow_flag = " ⚠️ SLOW" if query_time_ms > 5 else ""
    
    tree_path = os.path.join(output_dir, f"{index_name}_tree.pkl")
    payload_path = os.path.join(output_dir, f"{index_name}_payload.pkl")
    
    with open(tree_path, 'wb') as f:
        pickle.dump(tree, f)
    with open(payload_path, 'wb') as f:
        pickle.dump(payload, f)
        
    print(f"  → {len(filtered_cases):,} cases | build: {build_time_ms:.0f}ms | query: {query_time_ms:.1f}ms ✅{slow_flag}")
    
    return {
        'index_name': index_name,
        'case_count': len(filtered_cases),
        'build_time_ms': build_time_ms,
        'query_time_ms': query_time_ms,
        'tree_size_kb': os.path.getsize(tree_path) / 1024,
        'payload_size_kb': os.path.getsize(payload_path) / 1024
    }

def main():
    jsonl_path = 'scripts/synthetic/output/stage1_cases.jsonl'
    output_dir = 'models/knn_indexes'
    os.makedirs(output_dir, exist_ok=True)
    
    print("Loading cases and sampling 40k for index size compliance...")
    all_cases_raw = load_cases(jsonl_path)
    
    # Stratified-ish sampling: just take first 40k to maintain distribution if generated sequentially
    # or shuffle and take 40k. 
    np.random.seed(42)
    indices = np.random.choice(len(all_cases_raw), TOTAL_INDEX_SAMPLE, replace=False)
    all_cases = [all_cases_raw[i] for i in indices]
    
    start_total = time.perf_counter()
    stats_list = []
    all_index_combinations = [(c, t) for c in CITY_MAP for t in TYPE_MAP]
    
    for city_int, type_int in all_index_combinations:
        name = get_index_name(city_int, type_int)
        print(f"Building {name}...", end="")
        res = build_single_index(all_cases, city_int, type_int, output_dir)
        if res: stats_list.append(res)
            
    total_time = time.perf_counter() - start_total
    
    # Meera Test
    meera_case = {'total_asset_value_inr': 12800000, 'children_count': 1, 'marriage_duration_years': 11, 'petitioner_age': 34, 'business_ownership': False, 'urgency': 1, 'complexity_score': 4.2, 'professional_count': 5, 'city': 'Pune', 'case_type': 'divorce'}
    meera_vec = build_knn_features(meera_case).reshape(1, -1)
    
    with open(os.path.join(output_dir, "knn_pune_divorce_tree.pkl"), 'rb') as f: tree = pickle.load(f)
    with open(os.path.join(output_dir, "knn_pune_divorce_payload.pkl"), 'rb') as f: payload = pickle.load(f)
        
    distances, indices = tree.query(meera_vec, k=20)
    top_20 = [payload[i] for i in indices[0]]
    
    paths = [item['path_taken'] for item in top_20]
    med_dur = int(np.median([item['duration_days'] for item in top_20]))
    med_cost = int(np.median([item['cost_inr'] for item in top_20]))
    top_path = Counter(paths).most_common(1)[0][0]
    
    print(f"\n✅ MEERA QUERY: Top path={top_path}, Median={med_dur}d, Cost=₹{med_cost:,}")
    
    # Report
    q_times = [s['query_time_ms'] for s in stats_list]
    case_counts = [s['case_count'] for s in stats_list]
    
    report = {
        "total_indexes": len(stats_list),
        "total_cases_indexed": int(np.sum(case_counts)),
        "build_time_total_seconds": total_time,
        "slowest_query_ms": float(np.max(q_times)),
        "fastest_query_ms": float(np.min(q_times)),
        "median_query_ms": float(np.median(q_times)),
        "meera_query": {"top_path": top_path, "median_duration_days": med_dur, "median_cost_inr": med_cost, "custody_insight": "Computed in Part 3"},
        "all_indexes": stats_list
    }
    
    with open('scripts/ml/logs/knn_build_report.json', 'w') as f:
        json.dump(report, f, indent=2)
        
    total_size_mb = sum(s['tree_size_kb'] + s['payload_size_kb'] for s in stats_list) / 1024
    print(f"Total KNN directory size: {total_size_mb:.2f}MB")
    if total_size_mb > 6:
        print("⚠️ WARNING: Size still > 6MB. Consider reducing sample size further.")

if __name__ == "__main__":
    main()
