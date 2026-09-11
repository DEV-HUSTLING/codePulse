import hashlib
import json
import logging
import os
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from google.cloud import firestore
from config import PROJECT_ID, FIRESTORE_DATABASE, FIRESTORE_COLLECTION

logger = logging.getLogger(__name__)

# Initialize Firestore
db = None
# Actual database id in use after probe (may differ from config default)
active_database: Optional[str] = None
# Last error from ranked reads (surfaced by /api/insights and /api/rankings)
last_read_error: Optional[str] = None
last_init_error: Optional[str] = None


def _probe_database(database_id: str) -> Tuple[Optional[Any], int, Optional[str]]:
    """Return (client, sample_doc_count, error_message)."""
    try:
        client = firestore.Client(project=PROJECT_ID, database=database_id)
        docs = list(client.collection(FIRESTORE_COLLECTION).limit(25).stream())
        return client, len(docs), None
    except Exception as e:
        return None, 0, str(e)


def init_db():
    """
    Initialize Firestore. Probes candidate database IDs so a mismatch between
    `(default)` and a named DB like `codepulse` does not silently empty insights.
    Does not raise — service stays up and health/debug report the failure.
    """
    global db, active_database, last_init_error
    last_init_error = None

    configured = (os.getenv("FIRESTORE_DATABASE") or FIRESTORE_DATABASE or "").strip()
    candidates: List[str] = []
    for candidate in (configured, "codepulse", "(default)"):
        if candidate and candidate not in candidates:
            candidates.append(candidate)

    best_client = None
    best_db = None
    best_count = -1
    probe_results = []

    for database_id in candidates:
        client, count, err = _probe_database(database_id)
        probe_results.append({"database": database_id, "docs": count, "error": err})
        if err:
            logger.warning(f"Firestore probe failed database={database_id}: {err}")
            continue
        logger.info(f"Firestore probe ok database={database_id} sample_docs={count}")
        # Prefer the DB that already has cached analyses; otherwise first reachable
        if count > best_count:
            best_client = client
            best_db = database_id
            best_count = count

    if best_client is None:
        last_init_error = (
            f"Could not open any Firestore database. Tried: {candidates}. "
            f"Probes: {probe_results}"
        )
        logger.error(f"✗ {last_init_error}")
        db = None
        active_database = None
        return

    db = best_client
    active_database = best_db
    logger.info(
        f"✓ Firestore using project={PROJECT_ID} database={active_database} "
        f"(sample_docs={best_count}, configured={configured or 'unset'})"
    )


def get_status() -> Dict[str, Any]:
    """Diagnostic snapshot for /api/health and /api/debug."""
    return {
        "initialized": db is not None,
        "active_database": active_database,
        "configured_database": FIRESTORE_DATABASE,
        "collection": FIRESTORE_COLLECTION,
        "last_init_error": last_init_error,
        "last_read_error": last_read_error,
    }


def count_documents(limit: int = 200) -> int:
    if db is None:
        return 0
    try:
        return sum(1 for _ in db.collection(FIRESTORE_COLLECTION).limit(limit).stream())
    except Exception as e:
        logger.error(f"count_documents failed: {e}")
        return 0


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
            key = compute_cache_key(repo_name, content)
            doc = collection.document(key).get()
            if doc.exists:
                data = doc.to_dict()
                data["cached"] = True
                return data
        else:
            # Equality-only query avoids requiring a composite index
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


def save_analysis(
    repo_name: str,
    content: str,
    analysis: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
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
            "created_at": datetime.utcnow(),
            "full_analysis": analysis,
        }

        collection.document(key).set(document_data)
        logger.info(
            f"Saved analysis for {repo_name} to Firestore "
            f"(database={active_database}, key={key[:12]}…)"
        )
        return True
    except Exception as e:
        logger.error(f"Error saving analysis for {repo_name}: {e}")
        return False


def _parse_analysis_doc(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if data.get("full_analysis"):
        analysis = data["full_analysis"]
    elif isinstance(data.get("result_json"), str):
        analysis = json.loads(data["result_json"])
    else:
        analysis = data.get("result_json") or {}
    if not isinstance(analysis, dict):
        return None
    analysis.setdefault("overall_score", data.get("overall_score", 0))
    analysis.setdefault("repo_name", data.get("repo_name", ""))
    analysis.setdefault("stars", data.get("stars", 0))
    analysis.setdefault("grade", data.get("grade", ""))
    analysis.setdefault("main_issue", data.get("main_issue", ""))
    analysis.setdefault("summary", data.get("summary", ""))
    analysis.setdefault("categories", data.get("categories") or analysis.get("categories") or {})
    return analysis


def get_all_ranked_analyses() -> List[Dict[str, Any]]:
    """Retrieve all cached analyses ranked by score from Firestore."""
    global last_read_error
    last_read_error = None

    if db is None:
        last_read_error = last_init_error or "Firestore client not initialized"
        logger.error(last_read_error)
        return []

    collection = db.collection(FIRESTORE_COLLECTION)
    raw_docs = []

    try:
        # Preferred: server-side sort (needs single-field index on overall_score)
        raw_docs = list(
            collection.order_by("overall_score", direction=firestore.Query.DESCENDING).stream()
        )
    except Exception as e:
        logger.warning(f"order_by overall_score failed, falling back to scan: {e}")
        try:
            raw_docs = list(collection.limit(500).stream())
        except Exception as e2:
            last_read_error = str(e2)
            logger.error(f"Error retrieving all ranked analyses: {e2}")
            return []

    results = []
    for doc in raw_docs:
        try:
            data = doc.to_dict() or {}
            analysis = _parse_analysis_doc(data)
            if analysis:
                results.append(analysis)
        except Exception as e:
            logger.warning(f"Error parsing cached analysis: {e}")
            continue

    results.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
    logger.info(
        f"Loaded {len(results)} analyses from Firestore database={active_database}"
    )
    return results
