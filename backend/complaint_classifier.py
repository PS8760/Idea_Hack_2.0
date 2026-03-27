"""
SmartResolve AI — Complaint Routing Classifier
===============================================
Loads the trained TF-IDF + Logistic Regression model and provides
a classify() function used by the complaint routing pipeline.

Falls back gracefully to LLM classification if model is not available.
"""

import os
import json
import joblib
from pathlib import Path

_model = None
_training_report = None
_model_path = Path(__file__).parent / "models" / "complaint_classifier.pkl"
_report_path = Path(__file__).parent / "models" / "training_report.json"

# Valid categories the model can predict
VALID_CATEGORIES = {
    "Billing", "Technical", "Delivery", "Product",
    "Service", "Account", "Refund", "Other"
}

# Map model categories to agent specializations
CATEGORY_TO_SPECIALIZATION = {
    "Billing":   "Billing",
    "Technical": "Technical",
    "Delivery":  "Delivery",
    "Product":   "Product",
    "Service":   "Service",
    "Account":   "Account",
    "Refund":    "Billing",   # Refund handled by Billing specialists
    "Other":     "General",
}


def _load_model():
    """Load model lazily — only once, cached in memory."""
    global _model, _training_report
    if _model is not None:
        return _model
    
    if not _model_path.exists():
        print("[CLASSIFIER] Model not found. Run: python train_model.py")
        return None
    
    try:
        _model = joblib.load(_model_path)
        print(f"[CLASSIFIER] ✓ Model loaded from {_model_path}")
        
        if _report_path.exists():
            with open(_report_path) as f:
                _training_report = json.load(f)
            print(f"[CLASSIFIER] ✓ Model accuracy: {_training_report.get('accuracy')}%")
        
        return _model
    except Exception as e:
        print(f"[CLASSIFIER] Failed to load model: {e}")
        return None


def classify(text: str) -> dict:
    """
    Classify complaint text using the trained model.
    
    Returns:
        {
            "category": str,           # predicted category
            "specialization": str,     # agent specialization needed
            "confidence": float,       # prediction confidence 0-1
            "model_used": bool,        # True if ML model was used
            "top_predictions": list,   # top 3 predictions with scores
        }
    """
    model = _load_model()
    
    if model is None:
        # Model not available — return neutral result, LLM will handle it
        return {
            "category": "Other",
            "specialization": "General",
            "confidence": 0.0,
            "model_used": False,
            "top_predictions": [],
        }
    
    try:
        # Get prediction probabilities
        proba = model.predict_proba([text])[0]
        classes = model.classes_
        
        # Sort by confidence
        sorted_idx = proba.argsort()[::-1]
        top_class = classes[sorted_idx[0]]
        top_confidence = float(proba[sorted_idx[0]])
        
        # Top 3 predictions
        top_predictions = [
            {"category": classes[i], "confidence": round(float(proba[i]) * 100, 1)}
            for i in sorted_idx[:3]
        ]
        
        specialization = CATEGORY_TO_SPECIALIZATION.get(top_class, "General")
        
        return {
            "category": top_class,
            "specialization": specialization,
            "confidence": round(top_confidence, 3),
            "model_used": True,
            "top_predictions": top_predictions,
        }
    
    except Exception as e:
        print(f"[CLASSIFIER] Prediction failed: {e}")
        return {
            "category": "Other",
            "specialization": "General",
            "confidence": 0.0,
            "model_used": False,
            "top_predictions": [],
        }


def get_model_info() -> dict:
    """Return model metadata for the API."""
    _load_model()
    if _training_report:
        return {
            "available": True,
            "accuracy": _training_report.get("accuracy"),
            "cv_mean": _training_report.get("cv_mean"),
            "total_samples": _training_report.get("total_samples"),
            "categories": _training_report.get("categories", []),
            "model_type": _training_report.get("model_type"),
            "per_category": _training_report.get("per_category", {}),
        }
    elif _model_path.exists():
        return {"available": True, "accuracy": None}
    else:
        return {"available": False, "message": "Run python train_model.py to train the model"}
