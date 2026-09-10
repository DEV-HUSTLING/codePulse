# Firestore Migration Checklist

## **Changes Made**

✅ **cache_service.py** — Migrated from SQLite to Firestore
- Uses `firebase-admin-sdk`
- Connects to Firestore automatically via `GOOGLE_APPLICATION_CREDENTIALS`
- Same function signatures (no frontend/main.py changes needed)

✅ **requirements.txt** — Added `firebase-admin>=6.0.0`

✅ **config.py** — Removed SQLite `DB_CACHE_PATH`, added Firestore config

✅ **main.py** — Added Firestore connection check to startup & health endpoint

---

## **Quick Deployment Steps**

### **Step 1: Enable Firestore (One-time setup)**
```bash
gcloud services enable firestore.googleapis.com
gcloud firestore databases create --region=us-central1
```

### **Step 2: Grant Firestore Permissions to Service Account**
```bash
gcloud projects add-iam-policy-binding codepulse-507023 \
  --member="serviceAccount:codepulse-backend@codepulse-507023.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### **Step 3: Rebuild & Redeploy Backend**
```bash
cd /Users/anushka/Desktop/MyProjects/Codepulse/codepulseBE

docker build -t us-central1-docker.pkg.dev/codepulse-507023/codepulse-repo/backend:latest .

docker push us-central1-docker.pkg.dev/codepulse-507023/codepulse-repo/backend:latest

gcloud run deploy codepulse-backend \
  --image=us-central1-docker.pkg.dev/codepulse-507023/codepulse-repo/backend:latest \
  --region=us-central1
```

### **Step 4: Verify**
```bash
# Check health
curl https://YOUR_CLOUD_RUN_URL/api/health

# Pre-populate cache (analyze a few repos)
curl -X POST https://YOUR_CLOUD_RUN_URL/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_names": ["kubernetes/kubernetes", "golang/go"]}'

# Check insights (after 2-5 minutes)
curl https://YOUR_CLOUD_RUN_URL/api/insights
```

---

## **Benefits**

| Issue | Solution |
|-------|----------|
| `/api/insights` empty after restart | ✅ Data persists in Firestore |
| SQLite lost on container restart | ✅ Managed by Google Cloud |
| Scale across multiple instances | ✅ Firestore handles it |
| Cost | ✅ ~$0.01/month for typical usage |

---

See [FIRESTORE_DEPLOYMENT.md](FIRESTORE_DEPLOYMENT.md) for detailed setup & troubleshooting.
