import os
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

# GCP & BigQuery Configuration
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "codepulse-507023")
BQ_LOCATION = os.getenv("BQ_LOCATION", "US")
# Must match the Firestore DB ID in GCP Console — "(default)" or a named DB e.g. "codepulse"
FIRESTORE_DATABASE = os.getenv("FIRESTORE_DATABASE", "(default)")

# Gemini Model Configuration
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Scoring Category Weights (Must sum to 1.0)
CATEGORY_WEIGHTS: Dict[str, float] = {
    "project_clarity": 0.20,      # First 5-10 lines, what it does, why use it
    "getting_started": 0.20,      # Installation, quickstart, prerequisites
    "examples": 0.15,             # Code samples, CLI/API usage, outputs
    "structure": 0.10,            # Headings, TOC, logical flow, scannability
    "completeness": 0.15,         # Features, config, troubleshooting, contributing
    "readability": 0.10,          # Tone, conciseness, formatting, clarity
    "visual_presentation": 0.05,  # Badges, diagrams, formatting hierarchy
    "trust_signals": 0.05         # CI status, license, release info, security
}

# Score Grade Thresholds
GRADE_THRESHOLDS = {
    "excellent": (90, 100),
    "good": (75, 89),
    "needs_improvement": (60, 74),
    "poor": (0, 59)
}

# Cache & Limits
MAX_README_CHARS = 25000
FIRESTORE_COLLECTION = "analysis_cache"
