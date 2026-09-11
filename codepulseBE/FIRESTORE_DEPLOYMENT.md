# Firestore Migration & Cloud Run Deployment

Your backend now uses **Firestore** (persistent NoSQL database) instead of SQLite. This means cached analyses **survive across Cloud Run restarts**.

---

## **What Changed**

| Aspect | Before (SQLite) | After (Firestore) |
|--------|-----------------|-------------------|
| Database | Local file (`codepulse_cache.db`) | Cloud Firestore (managed) |
| Persistence | Lost on Cloud Run restart | ✅ Survives restarts |
| Scalability | Single instance only | Scales automatically |
| `/api/insights` | Empty after restart | ✅ Returns cached data |

---

## **Setup: One-Time Firestore Configuration**

### **1. Enable Firestore API**

```bash
gcloud services enable firestore.googleapis.com
```

### **2. Create Firestore Database**

```bash
gcloud firestore databases create --region=us-central1
```

(Choose **Native mode** when prompted)

### **3. Create Collection (Optional - Auto-created on first write)**

The `analysis_cache` collection is created automatically when you save the first analysis. You can pre-create it:

```bash
gcloud firestore collections create analysis_cache
```

---

## **Redeploy Backend to Cloud Run**

### **1. Install Updated Dependencies**

Locally, update packages:
```bash
pip install -r requirements.txt
```

### **2. Rebuild & Push Docker Image**

```bash
cd /Users/anushka/Desktop/MyProjects/Codepulse/codepulseBE

docker build -t us-central1-docker.pkg.dev/codepulse-507023/codepulse-repo/backend:latest .

docker push us-central1-docker.pkg.dev/codepulse-507023/codepulse-repo/backend:latest
```

### **3. Redeploy to Cloud Run**

```bash
gcloud run deploy codepulse-backend \
  --image=us-central1-docker.pkg.dev/codepulse-507023/codepulse-repo/backend:latest \
  --platform=managed \
  --region=us-central1 \
  --service-account=codepulse-backend@codepulse-507023.iam.gserviceaccount.com \
  --update-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars 'GCP_PROJECT_ID=codepulse-507023,BQ_LOCATION=US,GEMINI_MODEL=gemini-2.5-flash,FIRESTORE_DATABASE=(default)' \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --allow-unauthenticated
```

> If your Firestore DB is a **named** database (e.g. `codepulse`), set `FIRESTORE_DATABASE=codepulse` instead of `(default)`. Health and cache must use the same ID.

### **4. Grant Service Account Firestore Access**

```bash
gcloud projects add-iam-policy-binding codepulse-507023 \
  --member="serviceAccount:codepulse-backend@codepulse-507023.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

---

## **Test the Deployment**

### **1. Check Health Endpoint**

```bash
curl https://YOUR_CLOUD_RUN_URL/api/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "codepulse-analyzer",
  "bigquery": "connected",
  "gemini": "connected",
  "firestore": "connected"
}
```

### **2. Test `/api/insights` (Initially Empty)**

```bash
curl https://YOUR_CLOUD_RUN_URL/api/insights
```

Returns empty insights (no analyses yet):
```json
{
  "total_analyzed": 0,
  "average_score": 0,
  "insights_list": []
}
```

### **3. Pre-populate Cache**

**Important:** Data comes from BigQuery **sample** tables (`github_repos.sample_*`), not the full GitHub corpus. Famous repos like `kubernetes/kubernetes` are often missing. Always pick names from `/api/repositories` first:

```bash
# 1) Get repos that actually exist in the sample dataset
curl "https://YOUR_CLOUD_RUN_URL/api/repositories?mode=mixed&limit=5"

# 2) Analyze those exact repo_name values (inspect "errors" in the response)
curl -X POST https://YOUR_CLOUD_RUN_URL/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_names": ["REPLACE/WITH_NAME_FROM_STEP_1"]}'
```

Wait for Gemini analysis to complete. If `results` is empty, read `errors` — do not assume success from HTTP 200.

### **4. Check `/api/insights` Again**

```bash
curl https://YOUR_CLOUD_RUN_URL/api/insights
```

Now returns actual insights with rankings and comparisons.

---

## **Verify Data in Firestore Console**

1. Go to [Google Cloud Console → Firestore](https://console.cloud.google.com/firestore)
2. Select project `codepulse-507023`
3. View collection `analysis_cache`
4. You should see documents for each analyzed repository

---

## **Local Development (Using Firestore)**

To test with Firestore locally before deploying:

### **1. Set Credentials**

```bash
gcloud auth application-default login
```

### **2. Install Dependencies**

```bash
pip install -r requirements.txt
```

### **3. Run Backend Locally**

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You'll see in logs:
```
✓ Firestore connected successfully
✓ BigQuery connected successfully
✓ Gemini API connected successfully
```

### **4. Analyze & Check Firestore**

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_names": ["kubernetes/kubernetes"]}'
```

Check [Firestore Console](https://console.cloud.google.com/firestore) — documents appear in real-time.

---

## **Cost Considerations**

**Firestore Pricing:**
- **Read**: $0.06 per 100k reads
- **Write**: $0.18 per 100k writes
- **Delete**: $0.02 per 100k deletes
- **Storage**: $0.18 per GB/month

**Typical usage** (100 analyses/month):
- ~500 reads/month (check cache, rankings, insights) = ~$0.00
- ~500 writes/month (save analyses) = ~$0.01
- Storage: ~20MB = ~$0.004/month

**Total: ~$0.01-0.02/month** ✅ Free tier covers it.

---

## **Troubleshooting**

**Error: "Firestore connection failed"**
```bash
# Verify API is enabled
gcloud services list --enabled | grep firestore

# Verify database exists
gcloud firestore databases list

# Verify service account has permissions
gcloud projects get-iam-policy codepulse-507023 \
  --flatten="bindings[].members" \
  --filter="bindings.members:codepulse-backend@codepulse-507023.iam.gserviceaccount.com"
```

**Error: "Permission denied" on Firestore writes**
```bash
# Re-apply Firestore role
gcloud projects add-iam-policy-binding codepulse-507023 \
  --member="serviceAccount:codepulse-backend@codepulse-507023.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Redeploy Cloud Run
gcloud run deploy codepulse-backend --image=... --region=us-central1
```

**Check Cloud Run Logs**
```bash
gcloud run logs read codepulse-backend --region=us-central1 --limit=100
```

---

## **GCP Production Checklist (empty analyze / insights)**

Work through these in order after redeploying the fixed image.

### A. Confirm what “empty” means
- [ ] `GET /api/health` → note `firestore`, `bigquery`, `gemini`, and `details.firestore_database`
- [ ] `GET /api/repositories?mode=mixed&limit=5` → must return repos (proves BigQuery jobs work)
- [ ] `GET /api/insights` → if empty, check `error` / `hint` fields (insights are Firestore-only)
- [ ] `POST /api/analyze` with a `repo_name` from step 2 → inspect **`errors`**, not only `results`

### B. Firestore (most common cause of empty insights)
- [ ] `gcloud firestore databases list --project=codepulse-507023` → note DB id (`(default)` vs `codepulse`)
- [ ] Cloud Run env `FIRESTORE_DATABASE` **exactly** matches that id
- [ ] Console → Firestore → select that DB → collection `analysis_cache` has documents after analyze
- [ ] SA has `roles/datastore.user`:
  ```bash
  gcloud projects add-iam-policy-binding codepulse-507023 \
    --member="serviceAccount:codepulse-backend@codepulse-507023.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
  ```
- [ ] Firestore API enabled: `gcloud services enable firestore.googleapis.com`

### C. BigQuery (analyze README fetch)
- [ ] SA has `roles/bigquery.jobUser` and `roles/bigquery.dataViewer`
- [ ] Cloud Run env `GCP_PROJECT_ID=codepulse-507023`, `BQ_LOCATION=US`
- [ ] Only analyze repos returned by `/api/repositories` (sample dataset, not full GitHub)

### D. Gemini (analyze AI step)
- [ ] Secret `gemini-api-key` exists and is mounted as `GEMINI_API_KEY` on Cloud Run
- [ ] Or SA has Vertex AI access (`roles/aiplatform.user`) if not using API key
- [ ] Health `details.gemini_api_key_set` is `true` when using Secret Manager

### E. Frontend → backend wiring
- [ ] Deployed frontend `BACKEND_URL` points at the Cloud Run URL (not `127.0.0.1`)
- [ ] CORS is open on backend (`allow_origins=["*"]` already)

### F. Logs
```bash
gcloud run services logs read codepulse-backend --region=us-central1 --limit=100
```
Look for: Firestore init/save errors, BigQuery permission errors, Gemini failures.

---

## **Next Steps**

1. ✅ Enable Firestore API
2. ✅ Create Firestore database
3. ✅ Rebuild & push Docker image
4. ✅ Redeploy Cloud Run
5. ✅ Grant Firestore permissions to service account
6. ✅ Test `/api/health` → verify firestore connection
7. ✅ Pre-populate cache by analyzing 3-5 repositories
8. ✅ Check `/api/insights` returns meaningful data

After this, **`/api/insights` will work on production** and **persist across deployments**! 🎉
