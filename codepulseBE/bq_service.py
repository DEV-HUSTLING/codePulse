import logging
from typing import List, Dict, Any, Optional
from google.cloud import bigquery
from config import PROJECT_ID

logger = logging.getLogger(__name__)

# Initialize client using existing GCP credentials & project
client = bigquery.Client(project=PROJECT_ID)

def get_repositories(mode: str = "mixed", limit: int = 10, min_stars: int = 0) -> List[Dict[str, Any]]:
    """
    Retrieves repositories from BigQuery sample dataset.
    Supports 'popular', 'mixed', and 'random' modes.
    """
    limit = max(1, min(50, limit))
    
    if mode == "popular":
        query = """
        SELECT 
            f.repo_name,
            r.watch_count as stars,
            lic.license,
            ARRAY(
                SELECT name FROM UNNEST(lang.language) ORDER BY bytes DESC LIMIT 1
            )[SAFE_OFFSET(0)] as primary_language,
            f.path as readme_path,
            c.size as readme_size
        FROM `bigquery-public-data.github_repos.sample_contents` c
        JOIN `bigquery-public-data.github_repos.sample_files` f ON c.id = f.id
        LEFT JOIN `bigquery-public-data.github_repos.sample_repos` r ON f.repo_name = r.repo_name
        LEFT JOIN `bigquery-public-data.github_repos.licenses` lic ON f.repo_name = lic.repo_name
        LEFT JOIN `bigquery-public-data.github_repos.languages` lang ON f.repo_name = lang.repo_name
        WHERE (f.path = 'README.md' OR f.path = 'readme.md')
          AND c.binary = false 
          AND c.content IS NOT NULL
          AND (r.watch_count >= @min_stars OR @min_stars = 0)
        ORDER BY r.watch_count DESC
        LIMIT @limit
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("min_stars", "INT64", min_stars),
                bigquery.ScalarQueryParameter("limit", "INT64", limit)
            ]
        )
    elif mode == "mixed":
        # Calculate tier allocations (e.g. for 10: 4 high, 3 medium, 3 low)
        n_high = max(1, limit // 3 + (1 if limit % 3 > 0 else 0))
        n_med = max(1, limit // 3 + (1 if limit % 3 == 2 else 0))
        n_low = max(1, limit - n_high - n_med)

        query = f"""
        WITH valid_repos AS (
            SELECT 
                f.repo_name,
                r.watch_count as stars,
                lic.license,
                ARRAY(
                    SELECT name FROM UNNEST(lang.language) ORDER BY bytes DESC LIMIT 1
                )[SAFE_OFFSET(0)] as primary_language,
                f.path as readme_path,
                c.size as readme_size,
                NTILE(3) OVER (ORDER BY r.watch_count DESC) as tier
            FROM `bigquery-public-data.github_repos.sample_contents` c
            JOIN `bigquery-public-data.github_repos.sample_files` f ON c.id = f.id
            LEFT JOIN `bigquery-public-data.github_repos.sample_repos` r ON f.repo_name = r.repo_name
            LEFT JOIN `bigquery-public-data.github_repos.licenses` lic ON f.repo_name = lic.repo_name
            LEFT JOIN `bigquery-public-data.github_repos.languages` lang ON f.repo_name = lang.repo_name
            WHERE (f.path = 'README.md' OR f.path = 'readme.md')
              AND c.binary = false 
              AND c.content IS NOT NULL
        ),
        high_tier AS (
            SELECT *, 'high' as tier_name FROM valid_repos WHERE tier = 1 ORDER BY stars DESC LIMIT {n_high}
        ),
        med_tier AS (
            SELECT *, 'medium' as tier_name FROM valid_repos WHERE tier = 2 ORDER BY RAND() LIMIT {n_med}
        ),
        low_tier AS (
            SELECT *, 'low' as tier_name FROM valid_repos WHERE tier = 3 ORDER BY RAND() LIMIT {n_low}
        )
        SELECT * FROM high_tier
        UNION ALL
        SELECT * FROM med_tier
        UNION ALL
        SELECT * FROM low_tier
        ORDER BY stars DESC
        """
        job_config = bigquery.QueryJobConfig()
    else:  # random
        query = """
        SELECT 
            f.repo_name,
            r.watch_count as stars,
            lic.license,
            ARRAY(
                SELECT name FROM UNNEST(lang.language) ORDER BY bytes DESC LIMIT 1
            )[SAFE_OFFSET(0)] as primary_language,
            f.path as readme_path,
            c.size as readme_size
        FROM `bigquery-public-data.github_repos.sample_contents` c
        JOIN `bigquery-public-data.github_repos.sample_files` f ON c.id = f.id
        LEFT JOIN `bigquery-public-data.github_repos.sample_repos` r ON f.repo_name = r.repo_name
        LEFT JOIN `bigquery-public-data.github_repos.licenses` lic ON f.repo_name = lic.repo_name
        LEFT JOIN `bigquery-public-data.github_repos.languages` lang ON f.repo_name = lang.repo_name
        WHERE (f.path = 'README.md' OR f.path = 'readme.md')
          AND c.binary = false 
          AND c.content IS NOT NULL
        ORDER BY RAND()
        LIMIT @limit
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("limit", "INT64", limit)
            ]
        )

    try:
        results = list(client.query(query, job_config=job_config).result())
        repos = []
        for row in results:
            repo_name = row.repo_name
            parts = repo_name.split("/") if "/" in repo_name else ["", repo_name]
            repos.append({
                "repo_name": repo_name,
                "owner": parts[0],
                "name": parts[1] if len(parts) > 1 else repo_name,
                "stars": row.stars or 0,
                "language": row.primary_language or "Unknown",
                "license": row.license or "Not Specified",
                "readme_path": row.readme_path,
                "readme_size": row.readme_size or 0,
                "repo_url": f"https://github.com/{repo_name}",
                "tier": getattr(row, "tier_name", "standard")
            })
        return repos
    except Exception as e:
        logger.error(f"Error fetching repositories from BigQuery: {e}")
        raise e

def get_readme(repo_name: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves full README content and metadata for a specific repository.
    Handles missing READMEs safely.
    """
    clean_repo = repo_name.strip()
    query = """
    SELECT 
        f.repo_name,
        r.watch_count as stars,
        lic.license,
        ARRAY(
            SELECT name FROM UNNEST(lang.language) ORDER BY bytes DESC LIMIT 1
        )[SAFE_OFFSET(0)] as primary_language,
        f.path as readme_path,
        c.size,
        c.content
    FROM `bigquery-public-data.github_repos.sample_files` f
    JOIN `bigquery-public-data.github_repos.sample_contents` c ON f.id = c.id
    LEFT JOIN `bigquery-public-data.github_repos.sample_repos` r ON f.repo_name = r.repo_name
    LEFT JOIN `bigquery-public-data.github_repos.licenses` lic ON f.repo_name = lic.repo_name
    LEFT JOIN `bigquery-public-data.github_repos.languages` lang ON f.repo_name = lang.repo_name
    WHERE f.repo_name = @repo_name
      AND (f.path = 'README.md' OR f.path = 'readme.md' OR f.path = 'README' OR f.path = 'README.markdown')
      AND c.binary = false
    LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("repo_name", "STRING", clean_repo)
        ]
    )

    try:
        results = list(client.query(query, job_config=job_config).result())
        if not results:
            return None
        
        row = results[0]
        parts = clean_repo.split("/") if "/" in clean_repo else ["", clean_repo]
        return {
            "repo_name": row.repo_name,
            "owner": parts[0],
            "name": parts[1] if len(parts) > 1 else clean_repo,
            "stars": row.stars or 0,
            "language": row.primary_language or "Unknown",
            "license": row.license or "Not Specified",
            "readme_path": row.readme_path,
            "size": row.size or (len(row.content) if row.content else 0),
            "content": row.content or "",
            "repo_url": f"https://github.com/{clean_repo}"
        }
    except Exception as e:
        logger.error(f"Error fetching README for {clean_repo} from BigQuery: {e}")
        return None
