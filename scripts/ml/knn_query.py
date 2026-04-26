import os
import sys
import json
import time
import pickle
import argparse
import numpy as np
from sklearn.neighbors import BallTree
from collections import Counter

# Ensure project root is in path
sys.path.append(os.getcwd())

from scripts.ml.knn_features import (
    CITY_MAP, TYPE_MAP, get_index_name
)

def extract_custody_insight(results: list[dict]) -> str:
    """Mock for part 3 - real logic would need raw children_count."""
    # Since payload doesn't have children_count, we use a default based on the path.
    # In a real system, we might add children_count to the payload.
    return "Custody terms were resolved within the standard timeline in most cases similar to yours."

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", type=int, required=True)
    parser.add_argument("--type", type=int, required=True)
    parser.add_argument("--features", type=str, required=True)
    parser.add_argument("--k", type=int, default=20)
    args = parser.parse_args()

    start_time = time.perf_counter()

    try:
        # 1. Resolve index name
        index_name = get_index_name(args.city, args.type)
        tree_path = f"models/knn_indexes/{index_name}_tree.pkl"
        payload_path = f"models/knn_indexes/{index_name}_payload.pkl"

        if not os.path.exists(tree_path) or not os.path.exists(payload_path):
            print(json.dumps({"status": "error", "message": f"Index not found: {index_name}"}))
            return

        # 2. Load index
        with open(tree_path, 'rb') as f:
            tree = pickle.load(f)
        with open(payload_path, 'rb') as f:
            payload = pickle.load(f)

        # 3. Parse features
        try:
            feat_list = [float(x) for x in args.features.split(',')]
            if len(feat_list) != 8:
                raise ValueError("Expected 8 features")
            X = np.array(feat_list, dtype=np.float32).reshape(1, -1)
        except Exception:
            print(json.dumps({"status": "error", "message": "Feature parse failed"}))
            return

        # 4. Query
        distances, indices = tree.query(X, k=args.k)
        
        # 5. Fetch results
        results = []
        for i, idx in enumerate(indices[0]):
            res = payload[idx].copy()
            res['rank'] = i + 1
            res['distance'] = float(distances[0][i])
            results.append(res)

        # 6. Compute Stats
        durations = [r['duration_days'] for r in results]
        costs = [r['cost_inr'] for r in results]
        paths = [r['path_taken'] for r in results]
        successes = [r['success'] for r in results]

        stats = {
            "median_duration_days": int(np.median(durations)),
            "median_cost_inr": int(np.median(costs)),
            "most_common_path": Counter(paths).most_common(1)[0][0],
            "success_rate": float(np.mean(successes)),
            "custody_insight": extract_custody_insight(results)
        }

        query_time = (time.perf_counter() - start_time) * 1000

        print(json.dumps({
            "status": "ok",
            "index": index_name,
            "k": args.k,
            "results": results,
            "stats": stats,
            "query_time_ms": round(query_time, 2)
        }))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
