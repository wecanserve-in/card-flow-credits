# CardFlow

> Extract. Organize. Export.

AI-powered business card scanner that transforms physical visiting cards into structured digital contacts in seconds.

---

## What It Does

Upload a business card image → Gemini Vision extracts the details → Export to Excel. Done.

**Extracted Fields:**

| Field | Description |
|-------|-------------|
| Name | Contact name |
| Company | Organization |
| Designation | Job title |
| Phone | Contact number |
| Email | Email address |
| Website | URL |
| Country | Country |
| Address | Business address |

---

## Features

- **AI Card Scanning** — Upload images, get structured contact data via Vertex AI
- **Multi-Card Processing** — Scan multiple cards in one session
- **Excel Export** — Download contacts as `.xlsx`
- **Credit System** — Purchase scan packs via Razorpay
- **Push Notifications** — Expo push notifications for payment updates, low credits
- **Profile Photos** — Upload and store via Cloudflare R2
- **Payment History** — Track all purchases
- **Mobile + Web** — Android/iOS app + web dashboard

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 56, React Native, TypeScript |
| Web | React 19, Vite |
| Backend | Python 3.11, FastAPI |
| AI | Google Vertex AI (Gemini 2.5 Flash Lite) |
| Auth | Firebase Auth, Google Sign-In |
| Database | Firebase Firestore |
| Payments | Razorpay |
| Storage | Firebase Storage, Cloudflare R2 |
| Notifications | Expo Push Notifications |

---

## Project Structure

```
card-flow-credits/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── gemini_extractor.py  # Vertex AI card extraction
│   ├── payments.py          # Razorpay integration
│   ├── notifications.py     # Push notifications
│   ├── export_excel.py      # Excel generation
│   ├── image_preprocessing.py
│   ├── r2_upload.py         # Cloudflare R2
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── firebase.js
│   └── package.json
├── mobile/
│   ├── src/
│   │   ├── app/             # 29 screens (Expo Router)
│   │   └── services/        # API, auth, payments, notifications
│   ├── app.json
│   └── package.json
└── README.md
```

---

## How It Works

1. **Upload** — User captures or selects business card images
2. **Preprocess** — Images are optimized for AI analysis
3. **Extract** — Vertex AI reads the card and returns structured JSON
4. **Review** — User reviews extracted contact details
5. **Export** — Contacts saved to Excel for download

---

## Plans

| Plan | Price (INR) | Credits | Per Card |
|------|------------|---------|----------|
| Personal Starter | 99 | 50 | 2.00 |
| Personal Popular | 499 | 750 | 1.50 |
| Personal Pro | 999 | 1000 | 1.00 |
| Business Starter | 2499 | 2775 | 0.90 |
| Business Pro | 3999 | 5710 | 0.70 |
| Business Enterprise | 5999 | 10000 | 0.60 |

*Prices include 18% GST.*

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your keys
uvicorn main:app --port 8080
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Web

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Backend `.env`:

```
GEMINI_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_PATH=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

---

## License

Proprietary. All rights reserved.
