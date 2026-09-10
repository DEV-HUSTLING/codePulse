import hashlib
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from google.cloud import firestore
logger = logging.getLogger(__name__)

# Initialize Firestore
db = None

def init_db():
    """Initialize Firestore connection (called once at startup)."""
    global db
    try:
        db = firestore.Client(
            project="codepulse-507023",
            database="codepulse"
        )
        logger.info("✓ Firestore initialized successfully")
    except Exception as e:
        logger.error(f"✗ Failed to initialize Firestore: {e}")
        raise
    
def compute_cache_key(repo_name: str, content: str) -> str:
    """Generate cache key from repo name and content."""
    raw = f"{repo_name.strip().lower()}:{content.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def get_cached_analysis(repo_name: str, content: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve cached analysis from Firestore."""
    if db is None:
        return None
    
    try:
        collection = db.collection("analysis_cache")
        
        if content:
            # Look up by cache key (content-sensitive)
            key = compute_cache_key(repo_name, content)
            doc = collection.document(key).get()
            if doc.exists:
                data = doc.to_dict()
                data["cached"] = True
                return data
        else:
            # Look up by repo_name, get most recent
            query = collection.where("repo_name", "==", repo_name).order_by(
                "created_at", direction=firestore.Query.DESCENDING
            ).limit(1)
            docs = query.stream()
            for doc in docs:
                data = doc.to_dict()
                data["cached"] = True
                return data
        
        return None
    except Exception as e:
        logger.error(f"Error retrieving cached analysis for {repo_name}: {e}")
        return None

def save_analysis(repo_name: str, content: str, analysis: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None):
    """Save analysis result to Firestore."""
    if db is None:
        logger.warning("Firestore not initialized, skipping save")
        return
    
    try:
        key = compute_cache_key(repo_name, content)
        collection = db.collection("analysis_cache")
        
        stars = (metadata or {}).get("stars", analysis.get("stars", 0))
        language = (metadata or {}).get("language", analysis.get("language", "Unknown"))
        license_val = (metadata or {}).get("license", analysis.get("license", "Unknown"))
        overall_score = analysis.get("overall_score", 50)
        grade = analysis.get("grade", "Good")
        main_issue = analysis.get("main_issue", "")
        summary = analysis.get("summary", "")
        
        document_data = {
            "cache_key": key,
            "repo_name": repo_name,
            "stars": stars,
            "language": language,
            "license": license_val,
            "overall_score": overall_score,
            "grade": grade,
            "main_issue": main_issue,
            "summary": summary,
            "result_json": json.dumps(analysis),
            "created_at": datetime.now(),
            "full_analysis": analysis  # Store full analysis for easier querying
        }
        
        collection.document(key).set(document_data)
        logger.info(f"Saved analysis for {repo_name} to Firestore")
    except Exception as e:
        logger.error(f"Error saving analysis for {repo_name}: {e}")

def get_all_ranked_analyses() -> List[Dict[str, Any]]:
    """Retrieve all cached analyses ranked by score from Firestore."""
    if db is None:
        return []
    
    try:
        collection = db.collection("analysis_cache")
        query = collection.order_by("overall_score", direction=firestore.Query.DESCENDING)
        docs = query.stream()
        
        results = []
        for doc in docs:
            try:
                data = doc.to_dict()
                # Parse result_json if stored as string
                if isinstance(data.get("result_json"), str):
                    analysis = json.loads(data["result_json"])
                else:
                    # If full_analysis is stored, use that
                    analysis = data.get("full_analysis", {})
                results.append(analysis)
            except Exception as e:
                logger.warning(f"Error parsing cached analysis: {e}")
                continue
        
        return results
    except Exception as e:
        logger.error(f"Error retrieving all ranked analyses: {e}")
        return []
