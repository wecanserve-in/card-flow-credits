# ScanMyCard

AI business-card scanner. Photograph cards → Gemini extracts the details → save, organize into folders, and export to Excel.

## Project structure

```
card-flow-credits/
├── backend/                 # FastAPI service on Google Cloud Run
│   ├── main.py              # Scan upload (charges credits), profile photo, account deletion
│   ├── payments.py          # Razorpay orders, verification, credit top-ups, Firebase Admin setup
│   ├── notifications.py     # Expo push notifications
│   ├── gemini_extractor.py  # Vertex AI Gemini card extraction
│   ├── r2_upload.py         # Cloudflare R2 profile photos
│   ├── firestore.rules      # Firestore security rules (deploy from the Firebase console)
│   ├── tests/               # Backend tests (no real services are called)
│   ├── Procfile             # Start command used by Cloud Run (buildpacks)
│   └── Dockerfile           # Not used by the Cloud Run trigger
└── mobile/                  # Expo SDK 56 app (Android / iOS)
    ├── src/app/             # Screens (Expo Router)
    ├── src/services/        # API, Firebase, scanning, payments, notifications
    ├── app.json
    └── eas.json             # Build profiles (development / preview / production)
```

## How credits work

- New accounts get 5 free scans (`totalScans: 5`, `usedScans: 0` on `users/{uid}`).
- The **server** checks and deducts credits on every `/upload`, and refunds them if extraction fails.
- Credits are only added by the server after a verified Razorpay payment (`/payments/verify` or `/payments/recover`). Each payment can add credits once.
- `firestore.rules` stop the app from changing credit or payment fields itself.

## Plans (prices + 18% GST)

| Plan | Price (INR, before GST) | Credits |
|------|------|---------|
| Personal Starter | 99 | 50 |
| Personal Popular | 499 | 750 |
| Personal Pro | 999 | 1000 |
| Business Starter | 2499 | 2775 |
| Business Pro | 3999 | 5710 |
| Business Enterprise | 5999 | 10000 |

Prices live in `backend/payments.py` (charged amount) and `mobile/src/constants/plans.ts` (display). Keep them in sync.

## Backend

```bash
cd backend
pip install -r requirements-dev.txt
cp .env.example .env        # fill in keys
uvicorn main:app --port 8080
pytest tests                # run tests
```

Deploys happen automatically: every push to `main` triggers Cloud Build, which builds `backend/` with Google buildpacks (using `Procfile`) and deploys the Cloud Run service `scanmycard` (asia-south1). Environment variables and the Firebase key secret are configured on the Cloud Run service.

## Mobile

```bash
cd mobile
npm install
npx expo start
npx tsc --noEmit             # type check
eas build -p android --profile production   # Play Store .aab
```

## License

Proprietary. All rights reserved.
