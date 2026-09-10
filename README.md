# Codepulse: AI-Powered README Documentation Health Analyzer

**Codepulse** is an intelligent developer experience tool that audits, benchmarks, and improves GitHub README documentation. Powered by **Google Cloud BigQuery** (GitHub Public Dataset) and **Google Gemini 2.5 AI**, Codepulse turns subjective technical writing into reproducible, deterministic health metrics (0–100) and provides instant, copy-pasteable markdown section rewrites.

---

## 🌟 Core Features

1. **Custom Project Documentation Auditor (Golden Feature)**:
   - Paste your personal or public project's README markdown to receive an instant comprehensive documentation audit.
   - Evaluates strengths, highlights missing elements (e.g. absent quickstart or vague value proposition), and provides **AI-rewritten sections**.
   - If your project scores higher than the open-source cohort, it dynamically claims the **#1 Top Performer** benchmark badge!

2. **Open-Source Benchmark Playground (BigQuery Catalog)**:
   - Query and benchmark GitHub repositories across `High`, `Medium`, and `Low` star tiers.
   - Contrast how massive projects (e.g. React, Axios) stack up against smaller community packages.

3. **8-Dimension Health Scoring Matrix**:
   - Evaluates **Project Clarity** (20%), **Getting Started** (20%), **Code Examples** (15%), **Completeness** (15%), **Structure & Flow** (10%), **Readability** (10%), **Visuals** (5%), and **Trust Signals** (5%).
   - Transparent scoring formula with interactive calculation guide.

4. **Cohort Intelligence & Disparity Detection**:
   - Detects *"High Stars / Low Docs"* anomalies (huge popularity with poor documentation).
   - Uncovers *"Underdog Gems"* (low star counts with outstanding documentation craftsmanship).

5. **Instant SQLite Caching**:
   - Caches evaluations by content SHA-256 hash for instant repeat lookups and zero redundant API costs.

---

## 🏗️ Architecture

```
                                    ┌─────────────────────────────┐
                                    │    Google Cloud BigQuery    │
                                    │ (github_repos public table) │
                                    └──────────────┬──────────────┘
                                                   │
                                                   ▼
┌────────────────────────┐              ┌─────────────────────────┐
│     Next.js 16 UI      │◄──/api/:path*──┤     FastAPI Backend     │
│   (Port 3000 / React)  │              │     (Port 8000 / Python)│
└────────────────────────┘              └──────────┬──────────────┘
                                                   │
                                       ┌───────────┴───────────┐
                                       ▼                       ▼
                            ┌─────────────────────┐ ┌─────────────────────┐
                            │  Google Gemini 2.5  │ │ SQLite Cache DB     │
                            │  AI Evaluator       │ │ (codepulse_cache.db)│
                            └─────────────────────┘ └─────────────────────┘
```

---

## 🚀 Quick Start Guide

### Step 1: Start the FastAPI Backend

```bash
# Navigate to the backend directory
cd codepulseBE

# Install dependencies
pip install -r requirements.txt

# (Optional) Set your Gemini API key in codepulseBE/.env
# echo 'GEMINI_API_KEY="your_gemini_api_key"' > .env

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

* **Backend Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 2: Start the Next.js Frontend

Open a second terminal window:

```bash
# Navigate to the frontend directory
cd codepulse

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

* **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## 📊 Documentation Scoring Matrix

$$\text{Health Score} = \sum (\text{Category Score} \times \text{Weight})$$

| Category | Weight | What it Evaluates |
| :--- | :---: | :--- |
| **Project Clarity** | `20%` | First 5–10 lines, target audience, problem solved, value proposition. |
| **Getting Started** | `20%` | Step-by-step installation, prerequisites, basic quickstart flow. |
| **Examples & Snippets** | `15%` | Realistic code samples, CLI/API parameters, expected outputs. |
| **Completeness** | `15%` | Configuration tables, FAQ, troubleshooting, contributing, license. |
| **Structure & Flow** | `10%` | Headings hierarchy, logical flow, Table of Contents when appropriate. |
| **Readability** | `10%` | Clarity, tone, formatting quality, avoiding walls of text or jargon. |
| **Visual Presentation** | `5%` | Badges, diagrams, syntax highlighting, clear visual hierarchy. |
| **Trust Signals** | `5%` | CI status, license, release info, security, active maintenance. |

---

## 📁 Repository Structure

- [`codepulse/`](codepulse/): Next.js 16 + React 19 web application, TailwindCSS 4, Lucide icons.
- [`codepulseBE/`](codepulseBE/): FastAPI backend, BigQuery client, Google GenAI SDK, SQLite persistent cache.

---

## 📄 License
MIT License © 2026 Codepulse Team
