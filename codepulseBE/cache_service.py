import sqlite3
import hashlib
import json
import time
from typing import Optional, Dict, Any, List
from config import DB_CACHE_PATH

def get_db():
    conn = sqlite3.connect(DB_CACHE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_cache (
            cache_key TEXT PRIMARY KEY,
            repo_name TEXT NOT NULL,
            stars INTEGER DEFAULT 0,
            language TEXT,
            license TEXT,
            overall_score INTEGER NOT NULL,
            grade TEXT NOT NULL,
            main_issue TEXT,
            summary TEXT,
            result_json TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_repo_name ON analysis_cache(repo_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_score ON analysis_cache(overall_score DESC)")
    conn.commit()
    conn.close()

def compute_cache_key(repo_name: str, content: str) -> str:
    raw = f"{repo_name.strip().lower()}:{content.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def get_cached_analysis(repo_name: str, content: Optional[str] = None) -> Optional[Dict[str, Any]]:
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    if content:
        key = compute_cache_key(repo_name, content)
        cursor.execute("SELECT * FROM analysis_cache WHERE cache_key = ?", (key,))
    else:
        cursor.execute("SELECT * FROM analysis_cache WHERE repo_name = ? ORDER BY created_at DESC LIMIT 1", (repo_name,))
        
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    try:
        data = json.loads(row["result_json"])
        data["cached"] = True
        data["cached_at"] = row["created_at"]
        return data
    except Exception:
        return None

def save_analysis(repo_name: str, content: str, analysis: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None):
    init_db()
    key = compute_cache_key(repo_name, content)
    conn = get_db()
    cursor = conn.cursor()
    
    stars = (metadata or {}).get("stars", analysis.get("stars", 0))
    language = (metadata or {}).get("language", analysis.get("language", "Unknown"))
    license_val = (metadata or {}).get("license", analysis.get("license", "Unknown"))
    overall_score = analysis.get("overall_score", 50)
    grade = analysis.get("grade", "Good")
    main_issue = analysis.get("main_issue", "")
    summary = analysis.get("summary", "")
    result_json = json.dumps(analysis)
    
    cursor.execute("""
        INSERT OR REPLACE INTO analysis_cache 
        (cache_key, repo_name, stars, language, license, overall_score, grade, main_issue, summary, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (key, repo_name, stars, language, license_val, overall_score, grade, main_issue, summary, result_json, time.time()))
    
    conn.commit()
    conn.close()

def get_all_ranked_analyses() -> List[Dict[str, Any]]:
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analysis_cache ORDER BY overall_score DESC")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        try:
            item = json.loads(r["result_json"])
            results.append(item)
        except Exception:
            continue
    return results
