#!/usr/bin/env bash
# Rebuild, push, redeploy Codepulse backend, then verify APIs are non-empty.
# Usage:
#   ./deploy_verify.sh
#   BACKEND_URL=https://codepulse-backend-xxxx.run.app ./deploy_verify.sh --skip-build

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-codepulse-507023}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${CLOUD_RUN_SERVICE:-codepulse-backend}"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/codepulse-repo/backend:latest"
SA="codepulse-backend@${PROJECT_ID}.iam.gserviceaccount.com"
ROOT="$(cd "$(dirname "$0")" && pwd)"

SKIP_BUILD=0
if [[ "${1:-}" == "--skip-build" ]]; then
  SKIP_BUILD=1
fi

if ! command -v gcloud >/dev/null; then
  echo "gcloud CLI not found"
  exit 1
fi

ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [[ -z "${ACCOUNT}" ]]; then
  echo "No active gcloud account. Run: gcloud auth login"
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  echo "==> Building image ${IMAGE}"
  docker build -t "${IMAGE}" "${ROOT}"
  echo "==> Pushing image"
  docker push "${IMAGE}"
fi

echo "==> Deploying Cloud Run service ${SERVICE}"
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --platform=managed \
  --region="${REGION}" \
  --service-account="${SA}" \
  --update-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID},BQ_LOCATION=US,GEMINI_MODEL=gemini-2.5-flash" \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --allow-unauthenticated

BACKEND_URL="${BACKEND_URL:-$(gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)')}"
echo "==> Backend URL: ${BACKEND_URL}"

echo "==> /api/health"
curl -sS "${BACKEND_URL}/api/health" | python3 -m json.tool

echo "==> /api/debug"
DEBUG_JSON="$(curl -sS "${BACKEND_URL}/api/debug")"
echo "${DEBUG_JSON}" | python3 -m json.tool

REPO="$(echo "${DEBUG_JSON}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("bigquery_sample") or {}).get("repo_names") or [""])[0]')"
if [[ -z "${REPO}" ]]; then
  echo "ERROR: BigQuery returned no sample repos. Check IAM (bigquery.jobUser + dataViewer) and logs."
  exit 1
fi

echo "==> Analyzing sample repo: ${REPO}"
ANALYZE_JSON="$(curl -sS -X POST "${BACKEND_URL}/api/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"repo_names\": [\"${REPO}\"]}")"
echo "${ANALYZE_JSON}" | python3 -m json.tool

TOTAL="$(echo "${ANALYZE_JSON}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("total_analyzed", 0))')"
if [[ "${TOTAL}" -lt 1 ]]; then
  echo "ERROR: analyze returned empty results. Inspect errors above (README miss / Gemini / Firestore save)."
  exit 1
fi

echo "==> /api/insights"
curl -sS "${BACKEND_URL}/api/insights" | python3 -m json.tool

echo ""
echo "OK — backend verified. If the UI is still empty, set frontend BACKEND_URL=${BACKEND_URL} and redeploy the Next.js app."
