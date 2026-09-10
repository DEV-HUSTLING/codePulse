# Codepulse Backend (`codepulseBE`)

FastAPI backend service for **Codepulse (README Documentation Health Analyzer)**. Powered by **Google Cloud BigQuery** for repository catalog extraction, **Google Gemini 2.5** for AI-driven technical documentation critique, and a deterministic weighted scoring engine.

---

## Architecture Overview

```
┌────────────────────────────────┐
│      Google Cloud BigQuery     │  (github_repos public dataset)
└───────────────┬────────────────┘
                │ Raw README & Metadata
                ▼
┌────────────────────────────────┐
│      FastAPI Backend (8000)    │  (main.py / bq_service.py)
└───────────────┬────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌──────────────┐
│  Gemini 2.5  │  │ SQLite Cache │  (codepulse_cache.db)
│  Evaluator   │  │  (Instant)   │
└───────┬──────┘  └──────┬───────┘
        │                │
        └───────┬────────┘
                ▼
┌────────────────────────────────┐
│    Deterministic 0-100 Score   │  (scoring.py)
│    & AI Markdown Rewriter      │
└────────────────────────────────┘
```

---

## Features

- **BigQuery GitHub Catalog Integration**: Dynamically samples repositories across three distinct star tiers (`High`, `Medium`, `Low`) or extracts the top-starred repositories on GitHub.
- **Gemini 2.5 AI Documentation Auditor**: Analyzes README markdown across 8 standardized technical writing dimensions and suggests actionable markdown rewrites.
- **Deterministic 0–100 Scoring Engine**: Calculates transparent, reproducible documentation health scores using strict category weighting.
- **Persistent SQLite Caching**: Caches evaluation results by repository content hash (`SHA-256`) to ensure lightning-fast responses and minimize API costs.
- **Comparative Intelligence & Outlier Detection**: Identifies ecosystem trends, category bottlenecks, and popularity-to-documentation disparities (*"High Stars / Low Docs"*).

---

## 8-Category Evaluation Matrix

| Category | Weight | Focus Areas |
| :--- | :---: | :--- |
| **Project Clarity** | `20%` | First 5–10 lines, target audience, core problem solved, value proposition. |
| **Getting Started** | `20%` | Prerequisites, installation commands, basic quickstart workflow. |
| **Code Examples** | `15%` | Realistic code snippets, CLI/API parameters, expected outputs. |
| **Completeness** | `15%` | Configuration tables, FAQ, troubleshooting, contributing, license. |
| **Structure & Flow** | `10%` | Headings hierarchy, logical flow, Table of Contents when appropriate. |
| **Readability** | `10%` | Tone, conciseness, formatting quality, avoiding walls of text or unexplained jargon. |
| **Visual Presentation** | `5%` | Badges, architecture diagrams, clean syntax highlighting. |
| **Trust Signals** | `5%` | CI/CD badges, license info, release stability, active maintenance signals. |

$$\text{Overall Score} = \sum (\text{Category Score} \times \text{Weight})$$

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check and GCP connection verification. |
| `GET` | `/api/repositories` | Queries BigQuery sample repositories (`mode=mixed\|popular`, `limit=5\|10\|15`). |
| `GET` | `/api/repositories/{owner}/{repo}/readme` | Fetches raw README markdown for a specific GitHub repository. |
| `POST` | `/api/analyze` | Evaluates one or more BigQuery repositories with Gemini AI. |
| `POST` | `/api/analyze-custom` | Evaluates a custom repository name and pasted README markdown. |
| `GET` | `/api/rankings` | Returns all evaluated repositories sorted by health score descending. |
| `GET` | `/api/insights` | Computes cohort average score, top performer, and cohort anomalies. |
| `DELETE` | `/api/cache` | Flushes the local SQLite analysis cache. |

---

## Setup & Installation

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Google Cloud Project with BigQuery API enabled
- Gemini API Key (or Vertex AI credentials)

### 2. Install Dependencies
```bash
cd codepulseBE
pip install -r requirements.txt
```

### 3. Environment Variables (Optional)
Create a `.env` file in `codepulseBE/`:
```bash
# Optional: If using direct Gemini API key instead of Vertex AI
GEMINI_API_KEY="your_gemini_api_key"

# GCP Project ID (Defaults to codepulse-507023)
GCP_PROJECT_ID="codepulse-507023"
```

### 4. Run Development Server
```bash
uvicorn main:app --reload --port 8000
```

- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
