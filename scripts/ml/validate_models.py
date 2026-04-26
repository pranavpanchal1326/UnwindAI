import os, sys, json, time, numpy as np, onnxruntime as rt
from datetime import datetime
from sklearn.metrics import mean_absolute_error
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays

MODELS_DIR, DATA_DIR, LOGS_DIR = "models", "data", "scripts/ml/logs"
REPORT_PATH = os.path.join(LOGS_DIR, "validation_final.json")
MEERA_FEATURES = np.array([[0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2]], dtype=np.float32)

def main():
    print("🚀 STARTING FINAL VALIDATION PHASE 1.2")
    report = {"phase": "1.2", "status": "FAIL", "timestamp": datetime.now().isoformat() + "Z", "blocks": {}, "ready_to_commit": False}
    
    # A
    req = ["models/outcome_collab_duration.onnx", "models/outcome_collab_cost.onnx", "models/outcome_med_duration.onnx", "models/outcome_med_cost.onnx", "models/outcome_court_duration.onnx", "models/outcome_court_cost.onnx", "models/path_recommender.onnx", "models/risk_scorer.onnx", "models/anomaly_detector.pkl", "models/phase_setup.onnx", "models/phase_docs.onnx", "models/phase_negotiation.onnx", "models/phase_draft.onnx", "models/phase_filing.onnx", "models/success_prob_calibrated.pkl", "data/shap_by_case_type.json", "data/case_stats.json", "data/meera_shap_explanation.json"]
    if not all(os.path.exists(f) for f in req): print("❌ Block A failed"); sys.exit(1)
    print("✅ FILE CHECK: All present")
    report["blocks"]["A_file_existence"] = "PASS"

    # B
    onnx_checks = {"outcome_collab_duration": (45, 90), "outcome_collab_cost": (100000, 400000), "outcome_med_duration": (60, 180), "outcome_med_cost": (200000, 500000), "outcome_court_duration": (180, 500), "outcome_court_cost": (400000, 1200000), "path_recommender": (0, 2), "risk_scorer": (20, 50), "phase_setup": (3, 15), "phase_docs": (5, 20), "phase_negotiation": (10, 40), "phase_draft": (5, 20), "phase_filing": (3, 15)}
    meera_preds = {}
    for m, (lo, hi) in onnx_checks.items():
        sess = rt.InferenceSession(f"models/{m}.onnx")
        out = sess.run(None, {"input": MEERA_FEATURES})
        val = float(out[0].flatten()[0])
        if not (lo <= val <= hi): print(f"❌ {m} range fail: {val}"); sys.exit(1)
        meera_preds[m] = val
    print("✅ ONNX INFERENCE: All in range")
    report["blocks"]["B_onnx_inference"] = "PASS"

    # C
    cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
    X_te, y_te = build_feature_matrix(cases[190000:200000]), build_label_arrays(cases[190000:200000])
    for p in ["collab", "med", "court"]:
        preds = rt.InferenceSession(f"models/outcome_{p}_duration.onnx").run(None, {"input": X_te})[0].flatten()
        mae = mean_absolute_error(y_te[f"y_duration_{p}"], preds)
        limit = 50 if p != "court" else 250
        if mae > limit: print(f"❌ {p} MAE too high: {mae}"); sys.exit(1)
    print("✅ MAE COMPLIANCE: Valid")
    report["blocks"]["C_mae_compliance"] = "PASS"

    # D
    git = open(".gitignore", encoding="utf-8", errors="ignore").read()
    if not all(x in git for x in ["scripts/synthetic/output/", "*.jsonl", "models/pkl/"]): print("❌ Gitignore fail"); sys.exit(1)
    sz = sum(os.path.getsize(os.path.join("models", f)) for f in os.listdir("models") if f.endswith(".onnx") or f.endswith(".pkl")) / (1024*1024)
    if sz > 15: print("❌ Size fail"); sys.exit(1)
    print(f"✅ GIT SAFETY: Models {sz:.1f}MB")
    report["blocks"]["D_git_safety"] = "PASS"

    # E
    with open("data/shap_by_case_type.json") as f: shap = json.load(f)
    if len(shap) != 5: print("❌ SHAP fail"); sys.exit(1)
    print("✅ SHAP INTEGRITY: Valid")
    report["blocks"]["E_shap_integrity"] = "PASS"

    report["status"], report["ready_to_commit"] = "PASS", True
    report["meera_predictions"] = { "collab_duration": meera_preds["outcome_collab_duration"], "risk_score": int(meera_preds["risk_scorer"]), "recommended_path": "med" if meera_preds["path_recommender"] == 1 else "collab" }
    os.makedirs(LOGS_DIR, exist_ok=True)
    with open(REPORT_PATH, "w") as f: json.dump(report, f, indent=2)
    print("\n  ╔══════════════════════════════════════════╗")
    print("  ║  PHASE 1.2 COMPLETE — READY TO COMMIT   ║")
    print("  ║  8 Models ✅  SHAP ✅  Git Safe ✅       ║")
    print("  ╚══════════════════════════════════════════╝")

if __name__ == "__main__": main()
