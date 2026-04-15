# Deploying AIF to GCP

Target stack:

- **Backend** → Cloud Run (project `ai-intelligence-feed`)
- **Publisher** → Firebase Hosting, site `aif-publisher`
- **Reader** → Firebase Hosting, site `aif-reader`
- **Secrets** → Secret Manager
- **Scheduled refresh** → Cloud Scheduler hitting the backend
- **DB + Auth** → Supabase (unchanged)

Run from the `aif/` monorepo root unless noted.

## One-time prerequisites

```bash
# Install tooling
brew install --cask google-cloud-sdk
npm install -g firebase-tools

# Auth
gcloud auth login
gcloud config set project ai-intelligence-feed
firebase login

# Enable required APIs (~2 min)
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com

# Create the two Firebase Hosting sites (idempotent)
firebase hosting:sites:create aif-publisher --project ai-intelligence-feed || true
firebase hosting:sites:create aif-reader --project ai-intelligence-feed || true
firebase target:apply hosting publisher aif-publisher
firebase target:apply hosting reader aif-reader
```

## Step 1 — Store secrets in Secret Manager

Create one secret per sensitive value. Each command reads from stdin so the value never appears in shell history.

```bash
# You'll paste each value after hitting Enter, then Ctrl-D to finish.
printf "%s" "<PASTE-SUPABASE-ANON-KEY>" | \
  gcloud secrets create SUPABASE_ANON_KEY --data-file=- --replication-policy=automatic

printf "%s" "<PASTE-SUPABASE-SERVICE-KEY>" | \
  gcloud secrets create SUPABASE_SERVICE_KEY --data-file=- --replication-policy=automatic
```

Verify:

```bash
gcloud secrets list
# Expect: SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
```

### Grant Cloud Run's service account read access

Cloud Run deploys use the default compute service account `<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`. Grant it `secretAccessor` on each secret:

```bash
PROJECT_NUMBER=$(gcloud projects describe ai-intelligence-feed --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for secret in SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

**To rotate a secret later**: add a new version — Cloud Run will pick it up on next deploy (or immediately if you reference `latest`).

```bash
printf "%s" "<NEW-VALUE>" | gcloud secrets versions add SUPABASE_SERVICE_KEY --data-file=-
```

## Step 2 — Deploy the backend to Cloud Run

```bash
# From aif/ root. The Dockerfile is at backend/Dockerfile; gcloud needs it at the
# context root, so we symlink temporarily.
ln -sf backend/Dockerfile Dockerfile

gcloud run deploy aif-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 60 \
  --set-env-vars "SUPABASE_URL=https://kvbvyuettjogzkqmvvtd.supabase.co" \
  --set-secrets "SUPABASE_ANON_KEY=SUPABASE_ANON_KEY:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest"

rm Dockerfile
```

The deploy prints a service URL like `https://aif-backend-xxxxxxxx-uc.a.run.app`. Save it:

```bash
BACKEND_URL=$(gcloud run services describe aif-backend --region us-central1 --format='value(status.url)')
echo "$BACKEND_URL"
```

Now set the URL-dependent env vars (these aren't secrets):

```bash
gcloud run services update aif-backend \
  --region us-central1 \
  --update-env-vars "^|^PUBLIC_BASE_URL=${BACKEND_URL}|AIF_READER_URL=https://aif-reader.web.app|ALLOWED_ORIGINS=https://aif-publisher.web.app,https://aif-reader.web.app"
```

The `^|^` prefix tells gcloud to use `|` as the separator between env vars so commas inside `ALLOWED_ORIGINS` are preserved.

Smoke-test:

```bash
curl "${BACKEND_URL}/health"
# → {"ok":true,"service":"aif-backend"}
```

## Step 3 — Deploy the publisher

```bash
cd publisher
cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}
VITE_SUPABASE_URL=https://kvbvyuettjogzkqmvvtd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
EOF
npm run build
cd ..
firebase deploy --only hosting:publisher --project ai-intelligence-feed
```

## Step 4 — Deploy the reader

```bash
cd reader
cat > .env.production <<EOF
VITE_API_URL=${BACKEND_URL}
VITE_SUPABASE_URL=https://kvbvyuettjogzkqmvvtd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
VITE_PUBLISHER_URL=https://aif-publisher.web.app
EOF
npm run build
cd ..
firebase deploy --only hosting:reader --project ai-intelligence-feed
```

## Step 5 — Scheduled feed refresh

Cloud Run scales to zero, so the in-process `node-cron` stops when the service is idle. A Cloud Scheduler job hits `/health` every 15 min to keep it warm and wake the cron.

```bash
gcloud scheduler jobs create http aif-refresh \
  --location us-central1 \
  --schedule="*/15 * * * *" \
  --uri="${BACKEND_URL}/health" \
  --http-method=GET
```

## Step 6 — Rebuild the extension with the prod backend host

```bash
cd extension
AIF_BACKEND_HOST="${BACKEND_URL}/*" npm run build
# extension/dist/ is the unpacked extension — submit to the Chrome Web Store for public distribution.
```

## Step 7 — Budget alert (strongly recommended)

GCP Console → **Billing → Budgets & alerts → Create Budget**:

- Budget amount: **$1 / month**
- Alerts at 50%, 90%, 100%

If anything ever starts to cost real money, you find out before the bill.

## Verifying the full stack

```bash
curl "${BACKEND_URL}/health"
open "https://aif-publisher.web.app"
open "https://aif-reader.web.app"
```

## Rotating a secret

```bash
printf "%s" "<NEW-VALUE>" | gcloud secrets versions add SUPABASE_SERVICE_KEY --data-file=-
gcloud run services update aif-backend --region us-central1   # picks up :latest on next revision
```

## Troubleshooting

**`Permission denied` accessing a secret** — the Cloud Run service account isn't `secretAccessor`. Rerun Step 1's binding loop.

**`Missing required env var: SUPABASE_SERVICE_KEY` in Cloud Run logs** — the `--set-secrets` flag name on the left side of `=` must match the env var name your code reads. Double-check the flag.

**CORS errors in the browser** — `ALLOWED_ORIGINS` doesn't include the exact Firebase Hosting URL (including scheme). Update and redeploy the backend env.

**Publisher/reader shows "Failed to fetch"** — `VITE_API_URL` is wrong in the `.env.production` of that app. Rebuild after fixing, then redeploy.
