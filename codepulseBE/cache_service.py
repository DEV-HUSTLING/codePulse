import hashlib
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from google.cloud import firestore
from config import PROJECT_ID, FIRESTORE_DATABASE, FIRESTORE_COLLECTION

logger = logging.getLogger(__name__)

# Initialize Firestore
db = None
# Last error from ranked reads (surfaced by /api/insights and /api/rankings)
last_read_error: Optional[str] = None

def init_db():
    """Initialize Firestore connection (called once at startup)."""
    global db
    try:
        db = firestore.Client(project=PROJECT_ID, database=FIRESTORE_DATABASE)
        logger.info(
            f"✓ Firestore initialized successfully for project={PROJECT_ID} "
            f"database={FIRESTORE_DATABASE}"
        )
    except Exception as e:
        logger.error(f"✗ Failed to initialize Firestore: {e}")
        logger.error(f"  Project ID: {PROJECT_ID}")
        logger.error(f"  Database ID: {FIRESTORE_DATABASE}")
        logger.error(f"  Make sure GOOGLE_APPLICATION_CREDENTIALS is set (local) "
                     f"or the Cloud Run service account has roles/datastore.user")
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
        collection = db.collection(FIRESTORE_COLLECTION)

        if content:
            # Look up by cache key (content-sensitive)
            key = compute_cache_key(repo_name, content)
            doc = collection.document(key).get()
            if doc.exists:
                data = doc.to_dict()
                data["cached"] = True
                return data
        else:
            # Equality-only query avoids requiring a composite index
            # (repo_name + created_at). Pick the newest client-side.
            query = collection.where("repo_name", "==", repo_name).limit(25)
            newest = None
            newest_ts = None
            for doc in query.stream():
                data = doc.to_dict()
                ts = data.get("created_at")
                if newest is None or (ts is not None and (newest_ts is None or ts > newest_ts)):
                    newest = data
                    newest_ts = ts
            if newest:
                newest["cached"] = True
                return newest

        return None
    except Exception as e:
        logger.error(f"Error retrieving cached analysis for {repo_name}: {e}")
        return None

def save_analysis(repo_name: str, content: str, analysis: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None):
    """Save analysis result to Firestore."""
    if db is None:
        logger.warning("Firestore not initialized, skipping save")
        return False

    try:
        key = compute_cache_key(repo_name, content)
        collection = db.collection(FIRESTORE_COLLECTION)

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
        logger.info(f"Saved analysis for {repo_name} to Firestore ({FIRESTORE_DATABASE})")
        return True
    except Exception as e:
        logger.error(f"Error saving analysis for {repo_name}: {e}")
        return False

def get_all_ranked_analyses() -> List[Dict[str, Any]]:
    """Retrieve all cached analyses ranked by score from Firestore."""
    global last_read_error
    last_read_error = None

    if db is None:
        last_read_error = "Firestore client not initialized"
        logger.error(last_read_error)
        return []

    try:
        collection = db.collection(FIRESTORE_COLLECTION)
        query = collection.order_by("overall_score", direction=firestore.Query.DESCENDING)
        docs = query.stream()

        results = []
        for doc in docs:
            try:
                data = doc.to_dict()
                # Prefer full_analysis; fall back to result_json string
                if data.get("full_analysis"):
                    analysis = data["full_analysis"]
                elif isinstance(data.get("result_json"), str):
                    analysis = json.loads(data["result_json"])
                else:
                    analysis = data.get("result_json") or {}
                if not isinstance(analysis, dict):
                    continue
                # Ensure ranking fields exist even if stored oddly
                analysis.setdefault("overall_score", data.get("overall_score", 0))
                analysis.setdefault("repo_name", data.get("repo_name", ""))
                analysis.setdefault("stars", data.get("stars", 0))
                analysis.setdefault("grade", data.get("grade", ""))
                analysis.setdefault("main_issue", data.get("main_issue", ""))
                results.append(analysis)
            except Exception as e:
                logger.warning(f"Error parsing cached analysis: {e}")
                continue

        logger.info(f"Loaded {len(results)} analyses from Firestore database={FIRESTORE_DATABASE}")
        return results
    except Exception as e:
        last_read_error = str(e)
        logger.error(f"Error retrieving all ranked analyses: {e}")
        return []
