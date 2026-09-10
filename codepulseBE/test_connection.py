import os
from dotenv import load_dotenv
from google.cloud import bigquery

load_dotenv()

project_id = os.getenv("GCP_PROJECT_ID")
client = bigquery.Client(project=project_id)

query = f"""
    SELECT table_name
    FROM `{project_id}.cp_analystics.INFORMATION_SCHEMA.TABLES`
"""

rows = list(client.query(query).result())

print(f"Rows returned: {len(rows)}")
for row in rows:
    print(row.table_name)

