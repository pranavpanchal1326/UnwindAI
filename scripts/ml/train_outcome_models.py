from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split, validate_feature_matrix
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import mean_absolute_error
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import numpy as np
import json
import os
import pickle
import onnxruntime as ort

# Configuration
JSONL_PATH = "scripts/synthetic/output/stage1_cases.jsonl"
MODELS_DIR = "models"
LOGS_DIR = "scripts/ml/logs"
TRAINING_REPORT_PATH = os.path.join(LOGS_DIR, "outcome_training_report.json")
RANDOM_STATE = 42
TRAIN_SAMPLE_SIZE = 50000
OPSET = 17

# Hyperparameters
GBR_PARAMS = {
    'n_estimators': 200,
    'max_depth': 5,
    'learning_rate': 0.05,
    'subsample': 0.8,
    'min_samples_leaf': 20,
    'random_state': RANDOM_STATE,
    'validation_fraction': 0.1,
    'n_iter_no_change': 15,
    'tol': 1e-4
}

def validate_outcome_model(model, X_test, y_test, path_name, onnx_path):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    
    is_duration = "duration" in path_name.lower()
    threshold = 15 if is_duration else 50000
    unit = "days" if is_duration else "INR"
    
    status = "PASS" if mae < threshold else "FAIL"
    print(f"{path_name} MAE: {mae:.1f} {unit} | {status}")
    
    sess = ort.InferenceSession(onnx_path)
    X_sample = X_test[:5].astype(np.float32)
    onnx_preds = sess.run(None, {"input": X_sample})[0].flatten()
    sklearn_preds = preds[:5].astype(np.float32)
    
    diff = np.abs(onnx_preds - sklearn_preds)
    max_diff = np.max(diff)
    print(f"ONNX vs Sklearn max diff for {path_name}: {max_diff:.6f}")
    
    tol = 0.01 if is_duration else 0.1
    assert max_diff < tol, f"ONNX output mismatch for {path_name}: max diff {max_diff} > {tol}"
    print(f"ONNX verification for {path_name}: PASS")
    
    return float(mae)

def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(LOGS_DIR, exist_ok=True)

    print(f"Loading cases from {JSONL_PATH}...")
    cases = load_cases(JSONL_PATH)
    X_full = build_feature_matrix(cases)
    y_dict_full = build_label_arrays(cases)
    validate_feature_matrix(X_full)

    # Sampling 50k for training using random.choice to match existing patterns
    np.random.seed(RANDOM_STATE)
    indices = np.random.choice(len(X_full), TRAIN_SAMPLE_SIZE, replace=False)
    
    X_train_sampled = X_full[indices]
    y_train_sampled = {k: v[indices] for k, v in y_dict_full.items()}
    
    X_test = X_full
    y_test_dict = y_dict_full

    report = {
        "collab": {},
        "med": {},
        "court": {},
        "meera_predictions": {},
        "calibration_max_deviation": 0.0
    }

    paths = ["collab", "med", "court"]
    targets = ["duration", "cost"]

    for path in paths:
        for target in targets:
            y_key = f"y_{target}_{path}"
            print(f"\nTraining {path} {target} model...")
            
            model = GradientBoostingRegressor(**GBR_PARAMS)
            model.fit(X_train_sampled, y_train_sampled[y_key])
            
            initial_type = [('input', FloatTensorType([None, 12]))]
            onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=OPSET)
            
            onnx_filename = f"outcome_{path}_{target}.onnx"
            onnx_path = os.path.join(MODELS_DIR, onnx_filename)
            with open(onnx_path, "wb") as f:
                f.write(onnx_model.SerializeToString())
            
            mae = validate_outcome_model(model, X_test, y_test_dict[y_key], f"{path}_{target}", onnx_path)
            report[path][f"{target}_mae"] = mae
            report[path]["onnx_verified"] = True

    print("\nTraining success_prob model with calibration...")
    # Use 80/20 split of the 50k for calibration
    split_idx = int(TRAIN_SAMPLE_SIZE * 0.8)
    X_train_cal = X_train_sampled[:split_idx]
    y_train_cal = y_train_sampled['y_success_prob'][:split_idx]
    X_holdout_cal = X_train_sampled[split_idx:]
    y_holdout_cal = y_train_sampled['y_success_prob'][split_idx:]

    prob_model = GradientBoostingRegressor(**GBR_PARAMS)
    prob_model.fit(X_train_cal, y_train_cal)
    
    holdout_preds = prob_model.predict(X_holdout_cal)
    iso_reg = IsotonicRegression(out_of_bounds='clip')
    iso_reg.fit(holdout_preds, y_holdout_cal)
    
    calibrated_model = {'base_model': prob_model, 'calibrator': iso_reg}
    with open(os.path.join(MODELS_DIR, "success_prob_calibrated.pkl"), "wb") as f:
        pickle.dump(calibrated_model, f)

    full_preds = prob_model.predict(X_full)
    calibrated_preds = iso_reg.transform(full_preds)
    
    buckets = 10
    max_dev = 0.0
    for i in range(buckets):
        low = i / buckets
        high = (i + 1) / buckets
        mask = (calibrated_preds >= low) & (calibrated_preds < high)
        if np.any(mask):
            p_mean = np.mean(calibrated_preds[mask])
            a_mean = np.mean(y_dict_full['y_success_prob'][mask])
            dev = np.abs(p_mean - a_mean)
            max_dev = max(max_dev, dev)
    
    print(f"Max Calibration Deviation: {max_dev:.3f}")
    assert max_dev < 0.08
    report["calibration_max_deviation"] = float(max_dev)

    meera_features = np.array([[0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2]], dtype=np.float32)
    meera_results = {}
    print("\nMeera Test Case Results:")
    for path in paths:
        dur_sess = ort.InferenceSession(os.path.join(MODELS_DIR, f"outcome_{path}_duration.onnx"))
        cost_sess = ort.InferenceSession(os.path.join(MODELS_DIR, f"outcome_{path}_cost.onnx"))
        dur_pred = float(dur_sess.run(None, {"input": meera_features})[0].flatten()[0])
        cost_pred = float(cost_sess.run(None, {"input": meera_features})[0].flatten()[0])
        print(f"{path:7} | {dur_pred:8.1f} | {cost_pred:10.1f}")
        meera_results[path] = {"duration": dur_pred, "cost": cost_pred}
        
    report["meera_predictions"] = meera_results

    with open(TRAINING_REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nTraining report saved to {TRAINING_REPORT_PATH}")

if __name__ == "__main__":
    main()
