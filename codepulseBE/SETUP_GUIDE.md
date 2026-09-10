# Codepulse Backend Setup Guide

## Quick Troubleshooting Checklist

If you see: **"Could not connect to BigQuery repository service"**

- [ ] `.env` file exists with `GCP_PROJECT_ID` filled in
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set
- [ ] Backend is running (`http://localhost:8000` is accessible)
- [ ] BigQuery API is enabled in your GCP project
- [ ] Your GCP credentials have BigQuery role access

---

## Local Development Setup

### 1. Create `.env` file

```bash
cd /path/to/codepulseBE
cp .env.example .env
```

Edit `.env` and fill in your values:
```
GCP_PROJECT_ID=your-gcp-project-id-here
GEMINI_API_KEY=your-gemini-api-key-here
BQ_LOCATION=US
GEMINI_MODEL=gemini-2.5-flash
```

**Where to find:**
- **GCP Project ID**: Go to [Google Cloud Console](https://console.cloud.google.com/) → Project settings → Project ID
- **Gemini API Key**: Go to [Google AI Studio](https://aistudio.google.com/apikey) → Create/copy API key

### 2. Set up GCP Authentication

**Option A: Application Default Credentials (Recommended for local dev)**
```bash
gcloud auth application-default login
```
This opens a browser to authenticate. The credentials are saved to `~/.config/gcloud/application_default_credentials.json`

**Option B: Service Account Key (For production/Cloud Run)**
1. In GCP Console, go to **Service Accounts** → Create Service Account
2. Grant roles: `roles/bigquery.admin` + `roles/iam.serviceAccountUser`
3. Create a JSON key and download it
4. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Test BigQuery Connection

```bash
python test_connection.py
```

Expected output:
```
Rows returned: 45
... (list of table names)
```

If this fails, check:
- GCP_PROJECT_ID is correct
- You have BigQuery API enabled in your GCP project
- Your credentials have `bigquery.viewer` or `bigquery.admin` role
- Network connectivity to google.com

### 5. Run Backend Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Check the startup logs for connection status:
```
==================================================
Starting Codepulse API initialization...
GCP Project ID: codepulse-507023
Gemini API Key present: Yes
Testing BigQuery connection...
✓ BigQuery connected successfully
✓ Gemini API connected successfully
==================================================
```

### 6. Verify Backend Health

Open browser or curl:
```bash
curl http://localhost:8000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "codepulse-analyzer",
  "bigquery": "connected",
  "gemini": "connected",
  "details": {
    "gcp_project_id": "codepulse-507023",
    "check_logs": "See server logs for detailed connection errors"
  }
}
```

---

## Production Deployment (Cloud Run)

### 1. Enable Required APIs

```bash
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  generativeai.googleapis.com
```

### 2. Create Cloud Run Service Account

```bash
gcloud iam service-accounts create codepulse-backend \
  --display-name="Codepulse Backend Service Account"
```

### 3. Grant Required Roles

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:codepulse-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:codepulse-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

### 4. Store Secrets in Secret Manager

```bash
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
```

### 5. Build and Push to Artifact Registry

```bash
# Create registry
gcloud artifacts repositories create codepulse-repo \
  --repository-format=docker --location=us-central1

# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/codepulse-repo/backend:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/codepulse-repo/backend:latest
```

### 6. Deploy to Cloud Run

```bash
gcloud run deploy codepulse-backend \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/codepulse-repo/backend:latest \
  --platform=managed \
  --region=us-central1 \
  --service-account=codepulse-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars "GCP_PROJECT_ID=YOUR_PROJECT_ID" \
  --update-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --memory=512Mi \
  --timeout=300 \
  --allow-unauthenticated
```

The backend will be available at the URL Cloud Run provides (e.g., `https://codepulse-backend-xxx.run.app`)

### 7. Update Frontend

Update your frontend's API base URL to the Cloud Run URL and ensure CORS origins are configured.

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Could not connect to BigQuery" | Missing/wrong GCP credentials | Run `gcloud auth application-default login` |
| 403 Forbidden from BigQuery | Service account lacks permissions | Add `roles/bigquery.dataViewer` role |
| GEMINI_API_KEY not set | Environment variable missing | Add to `.env` file or Cloud Run secrets |
| 404 README not found | Repository not in BigQuery dataset | Use repositories from bigquery-public-data.github_repos |
| Slow queries | Cold start or large data | Use `limit` parameter, enable caching |
| CORS errors from frontend | Frontend origin not allowed | Check header in main.py; "*" allows all origins |

---

## Development Tips

### View Real-time Logs
```bash
gcloud run logs read codepulse-backend --region=us-central1 --limit=100 --follow
```

### Local vs Production Environment Variables
- **Local**: Use `.env` file (loads with `python-dotenv`)
- **Production (Cloud Run)**: Use gcloud secrets and `--set-env-vars` / `--update-secrets`

### Add More Secrets
```bash
echo -n "value" | gcloud secrets create my-secret --data-file=-
gcloud run services update codepulse-backend \
  --update-secrets "MY_VAR=my-secret:latest" --region=us-central1
```

### Scale Settings
Adjust Cloud Run concurrency, memory, and timeouts based on:
- `--memory=256Mi` to `--memory=2Gi` (default 512Mi sufficient)
- `--cpu=1` to `--cpu=4` (1 CPU per 256Mi memory, recommended)
- `--timeout=30` to `--timeout=3600` (default 300s fine for README analysis)
