import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.genai as genai
import bq_service
import gemini_service
import scoring
import cache_service
from config import CATEGORY_WEIGHTS, PROJECT_ID, GEMINI_API_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("codepulse")

app = FastAPI(
    title="Codepulse API",
    description="README Documentation Health Analyzer powered by BigQuery and Gemini AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize persistent cache db
cache_service.init_db()

# Track connection status
bq_connected = False
gemini_connected = False
firestore_connected = False

@app.on_event("startup")
async def startup_event():
    """Validate BigQuery, Firestore, and Gemini connections at startup."""
    global bq_connected, gemini_connected, firestore_connected
    
    logger.info("=" * 50)
    logger.info("Starting Codepulse API initialization...")
    logger.info(f"GCP Project ID: {PROJECT_ID}")
    logger.info(f"Gemini API Key present: {'Yes' if GEMINI_API_KEY else 'No (MISSING!)'}")
    
    # Test Firestore connection
    try:
        logger.info("Testing Firestore connection...")
        from firebase_admin import firestore
        fs_client = firestore.Client(project="codepulse-507023", database="codepulse")
        # Simple query to verify connectivity
        collection_ref = fs_client.collection("analysis_cache")
        docs = collection_ref.limit(1).stream()
        list(docs)  # Consume the generator to trigger actual request
        firestore_connected = True
        logger.info(f"✓ Firestore connected successfully")
    except Exception as e:
        logger.error(f"✗ Firestore connection failed: {str(e)}")
        logger.error("  - Ensure GOOGLE_APPLICATION_CREDENTIALS is set")
        logger.error("  - Enable Firestore API in your GCP Project")
    
    # Test BigQuery connection
    try:
        logger.info("Testing BigQuery connection...")
        test_query = f"SELECT COUNT(*) as cnt FROM `bigquery-public-data.github_repos.sample_repos` LIMIT 1"
        result = list(bq_service.client.query(test_query).result())
        bq_connected = True
        logger.info(f"✓ BigQuery connected successfully")
    except Exception as e:
        logger.error(f"✗ BigQuery connection failed: {str(e)}")
        logger.error("  - Check GOOGLE_APPLICATION_CREDENTIALS environment variable")
        logger.error("  - Run: gcloud auth application-default login")
        logger.error("  - Or download a service account key and set GOOGLE_APPLICATION_CREDENTIALS")
    
    # Test Gemini connection
    try:
        logger.info("Testing Gemini API connection...")
        if not GEMINI_API_KEY:
            logger.error("✗ GEMINI_API_KEY not set in .env or environment")
        else:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            # Quick test
            response = model.generate_content("test")
            gemini_connected = True
            logger.info(f"✓ Gemini API connected successfully")
    except Exception as e:
        logger.error(f"✗ Gemini API connection failed: {str(e)}")
    
    logger.info("=" * 50)

class AnalyzeRequest(BaseModel):
    repo_names: Optional[List[str]] = None
    repo_name: Optional[str] = None
    force_refresh: bool = False

class CustomAnalyzeRequest(BaseModel):
    repo_name: str
    readme_content: str
    stars: Optional[int] = 0
    language: Optional[str] = "Unknown"
    license: Optional[str] = "Unknown"

@app.get("/api/health")
def health():
    return {
        "status": "healthy" if (bq_connected and gemini_connected and firestore_connected) else "degraded",
        "service": "codepulse-analyzer",
        "bigquery": "connected" if bq_connected else "disconnected",
        "gemini": "connected" if gemini_connected else "disconnected",
        "firestore": "connected" if firestore_connected else "disconnected",
        "details": {
            "gcp_project_id": PROJECT_ID,
            "check_logs": "See server logs for detailed connection errors"
        }
    }

@app.get("/api/repositories")
def list_repositories(
    mode: str = Query("mixed", pattern="^(mixed|popular|random)$"),
    limit: int = Query(10, ge=1, le=50),
    min_stars: int = Query(0, ge=0)
):
    """
    Retrieves repositories from BigQuery.
    """
    try:
        repos = bq_service.get_repositories(mode=mode, limit=limit, min_stars=min_stars)
        # Check cache status for each repo
        for repo in repos:
            cached = cache_service.get_cached_analysis(repo["repo_name"])
            if cached:
                repo["has_cached_analysis"] = True
                repo["cached_score"] = cached.get("overall_score")
                repo["cached_grade"] = cached.get("grade")
            else:
                repo["has_cached_analysis"] = False
        return {"repositories": repos, "total": len(repos), "mode": mode}
    except Exception as e:
        logger.error(f"Error listing repositories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to query BigQuery: {str(e)}")

@app.get("/api/repositories/{owner}/{repo}/readme")
def get_readme(owner: str, repo: str):
    """
    Retrieves raw README content and metadata for a repository.
    """
    full_name = f"{owner}/{repo}"
    readme_data = bq_service.get_readme(full_name)
    if not readme_data:
        raise HTTPException(status_code=404, detail=f"README not found for repository '{full_name}'")
    return readme_data

@app.post("/api/analyze")
def analyze_repositories(req: AnalyzeRequest):
    """
    Analyzes one or more repositories. Retrieves README from BigQuery,
    runs Gemini analysis, computes weighted scores, and saves to cache.
    """
    repo_names = req.repo_names or ([req.repo_name] if req.repo_name else [])
    if not repo_names:
        raise HTTPException(status_code=400, detail="Must provide at least one repository name")

    results = []
    errors = []

    for repo_name in repo_names:
        clean_name = repo_name.strip()
        try:
            # 1. Fetch README and metadata from BigQuery
            readme_data = bq_service.get_readme(clean_name)
            if not readme_data or not readme_data.get("content"):
                errors.append({"repo_name": clean_name, "error": "No README content found in BigQuery"})
                continue

            content = readme_data["content"]

            # 2. Check cache unless forced refresh
            if not req.force_refresh:
                cached = cache_service.get_cached_analysis(clean_name, content)
                if cached:
                    logger.info(f"Returning cached analysis for {clean_name}")
                    results.append(cached)
                    continue

            # 3. Perform Gemini structured analysis
            logger.info(f"Analyzing {clean_name} with Gemini AI...")
            gemini_result = gemini_service.analyze_readme(content, readme_data)

            # 4. Calculate deterministic weighted score & grade
            cat_scores = gemini_result.get("categories", {})
            overall_score, grade = scoring.calculate_weighted_score(cat_scores)
            main_issue = scoring.extract_main_issue(cat_scores, gemini_result.get("weaknesses", []))

            # 5. Assemble final response object
            analysis_record = {
                "repo_name": clean_name,
                "owner": readme_data["owner"],
                "name": readme_data["name"],
                "stars": readme_data["stars"],
                "language": readme_data["language"],
                "license": readme_data["license"],
                "repo_url": readme_data["repo_url"],
                "readme_path": readme_data["readme_path"],
                "readme_size": readme_data["size"],
                "overall_score": overall_score,
                "grade": grade,
                "main_issue": main_issue,
                "summary": gemini_result.get("summary", ""),
                "categories": cat_scores,
                "category_weights": CATEGORY_WEIGHTS,
                "strengths": gemini_result.get("strengths", []),
                "weaknesses": gemini_result.get("weaknesses", []),
                "recommendations": gemini_result.get("recommendations", []),
                "rewrite_suggestions": gemini_result.get("rewrite_suggestions", []),
                "raw_readme_snippet": content[:3000],
                "cached": False
            }

            # 6. Save to cache
            cache_service.save_analysis(clean_name, content, analysis_record, readme_data)
            results.append(analysis_record)

        except Exception as e:
            logger.error(f"Error analyzing {clean_name}: {e}")
            errors.append({"repo_name": clean_name, "error": str(e)})

    # Sort results by overall score descending
    results.sort(key=lambda x: x.get("overall_score", 0), reverse=True)

    return {
        "results": results,
        "total_analyzed": len(results),
        "errors": errors
    }

@app.get("/api/analysis/{owner}/{repo}")
def get_analysis_by_repo(owner: str, repo: str):
    """
    Returns stored analysis for a given repository.
    """
    full_name = f"{owner}/{repo}"
    cached = cache_service.get_cached_analysis(full_name)
    if not cached:
        # If not in cache, try analyzing automatically
        try:
            res = analyze_repositories(AnalyzeRequest(repo_name=full_name))
            if res["results"]:
                return res["results"][0]
        except Exception:
            pass
        raise HTTPException(status_code=404, detail=f"No analysis found for repository '{full_name}'")
    return cached

@app.get("/api/rankings")
def get_rankings():
    """
    Returns all analyzed repositories ranked by documentation health score.
    """
    ranked = cache_service.get_all_ranked_analyses()
    return {"rankings": ranked, "total": len(ranked)}

@app.get("/api/insights")
def get_insights():
    """
    Computes comparative insights across all analyzed repositories.
    """
    analyses = cache_service.get_all_ranked_analyses()
    if not analyses:
        return {
            "total_analyzed": 0,
            "average_score": 0,
            "top_performer": None,
            "lowest_performer": None,
            "high_star_low_doc": None,
            "low_star_high_doc": None,
            "category_averages": {},
            "common_weaknesses": [],
            "insights_list": []
        }

    total_score = sum(a.get("overall_score", 0) for a in analyses)
    avg_score = round(total_score / len(analyses), 1)

    sorted_by_score = sorted(analyses, key=lambda x: x.get("overall_score", 0), reverse=True)
    top_performer = sorted_by_score[0]
    lowest_performer = sorted_by_score[-1]

    # Find high star with poor doc (< 75 score, high stars)
    high_star_candidates = [a for a in analyses if a.get("stars", 0) >= 3000 and a.get("overall_score", 100) < 75]
    high_star_low_doc = min(high_star_candidates, key=lambda x: x.get("overall_score", 0)) if high_star_candidates else None

    # Find low star with standout doc (>= 80 score, low stars)
    low_star_candidates = [a for a in analyses if a.get("stars", 0) <= 2000 and a.get("overall_score", 0) >= 80]
    low_star_high_doc = max(low_star_candidates, key=lambda x: x.get("overall_score", 0)) if low_star_candidates else None

    # Category averages
    cat_totals = {cat: 0.0 for cat in CATEGORY_WEIGHTS}
    cat_counts = {cat: 0 for cat in CATEGORY_WEIGHTS}
    for a in analyses:
        cats = a.get("categories", {})
        for cat in CATEGORY_WEIGHTS:
            if cat in cats:
                score = cats[cat].get("score", 0) if isinstance(cats[cat], dict) else cats[cat]
                cat_totals[cat] += score
                cat_counts[cat] += 1

    cat_averages = {
        cat: round(cat_totals[cat] / cat_counts[cat], 1) if cat_counts[cat] > 0 else 0
        for cat in CATEGORY_WEIGHTS
    }

    # Generate headline insights
    insights_list = []
    if high_star_low_doc:
        insights_list.append({
            "type": "disparity",
            "title": "Star vs. Documentation Health Disparity",
            "description": f"{high_star_low_doc['repo_name']} has {high_star_low_doc['stars']:,} stars but scores only {high_star_low_doc['overall_score']}/100 in documentation health ({high_star_low_doc.get('main_issue', 'needs improvement')}).",
            "badge": "Popularity ≠ Quality"
        })
    
    if low_star_high_doc:
        insights_list.append({
            "type": "underdog",
            "title": "Hidden Gem Documentation",
            "description": f"{low_star_high_doc['repo_name']} with only {low_star_high_doc['stars']:,} stars achieves a stellar {low_star_high_doc['overall_score']}/100 health score with exemplary developer guides.",
            "badge": "Top Craftsmanship"
        })

    if top_performer:
        insights_list.append({
            "type": "leader",
            "title": "Benchmark Repository",
            "description": f"{top_performer['repo_name']} leads the cohort with a {top_performer['overall_score']}/100 health score, setting the standard for structure and clarity.",
            "badge": "Grade A+"
        })

    # Find lowest scoring category cohort-wide
    if cat_averages:
        lowest_avg_cat = min(cat_averages.items(), key=lambda x: x[1])
        insights_list.append({
            "type": "trend",
            "title": f"Cohort Bottleneck: {lowest_avg_cat[0].replace('_', ' ').title()}",
            "description": f"Across all analyzed repositories, '{lowest_avg_cat[0].replace('_', ' ').title()}' is the weakest category, averaging only {lowest_avg_cat[1]}/100.",
            "badge": "Ecosystem Trend"
        })

    return {
        "total_analyzed": len(analyses),
        "average_score": avg_score,
        "top_performer": top_performer,
        "lowest_performer": lowest_performer,
        "high_star_low_doc": high_star_low_doc,
        "low_star_high_doc": low_star_high_doc,
        "category_averages": cat_averages,
        "insights_list": insights_list
    }

@app.post("/api/analyze-custom")
def analyze_custom(req: CustomAnalyzeRequest):
    """
    Analyzes custom repository name or custom pasted README text.
    """
    if not req.readme_content.strip():
        raise HTTPException(status_code=400, detail="README content cannot be empty")
    
    metadata = {
        "repo_name": req.repo_name,
        "stars": req.stars or 0,
        "language": req.language or "Unknown",
        "license": req.license or "Not Specified",
        "repo_url": f"https://github.com/{req.repo_name}" if "/" in req.repo_name else None
    }
    
    gemini_result = gemini_service.analyze_readme(req.readme_content, metadata)
    cat_scores = gemini_result.get("categories", {})
    overall_score, grade = scoring.calculate_weighted_score(cat_scores)
    main_issue = scoring.extract_main_issue(cat_scores, gemini_result.get("weaknesses", []))
    
    analysis_record = {
        "repo_name": req.repo_name,
        "owner": req.repo_name.split("/")[0] if "/" in req.repo_name else "",
        "name": req.repo_name.split("/")[1] if "/" in req.repo_name else req.repo_name,
        "stars": req.stars or 0,
        "language": req.language or "Unknown",
        "license": req.license or "Not Specified",
        "repo_url": metadata["repo_url"],
        "readme_path": "README.md",
        "readme_size": len(req.readme_content),
        "overall_score": overall_score,
        "grade": grade,
        "main_issue": main_issue,
        "summary": gemini_result.get("summary", ""),
        "categories": cat_scores,
        "category_weights": CATEGORY_WEIGHTS,
        "strengths": gemini_result.get("strengths", []),
        "weaknesses": gemini_result.get("weaknesses", []),
        "recommendations": gemini_result.get("recommendations", []),
        "rewrite_suggestions": gemini_result.get("rewrite_suggestions", []),
        "raw_readme_snippet": req.readme_content[:3000],
        "cached": False
    }
    
    cache_service.save_analysis(req.repo_name, req.readme_content, analysis_record, metadata)
    return analysis_record
