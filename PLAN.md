# Razorpay Payment Flow Audit & Fix Plan

## Overview
Complete audit and fix of the Razorpay payment flow in the Expo Router React Native TypeScript application. The plan addresses test-mode configuration, security issues (frontend subscription tampering), verification flow, TypeScript errors, and all 14 listed problems.

---

## Critical Issues Found

### 1. SECURITY: Frontend subscription tampering (paymentService.ts:203-219)
`activateSubscription()` calls `setDoc()` directly on Firestore from the frontend, allowing any user to grant themselves a paid plan by calling this function manually.

### 2. Test mode misconfigured (utils/payment.ts:239-248)
- `webview_intent: true` forces UPI intent flow even in test mode
- Card, netbanking, wallet all set to `false` → "No appropriate payment method found"
- No `IS_RAZORPAY_TEST_MODE` toggle exists

### 3. Missing backend verification (payments.py:97-100)
The `/payments/verify` endpoint has a TODO comment — it verifies the Razorpay signature but does NOT activate the subscription in Firestore. The backend verify endpoint is incomplete.

### 4. payment-success import bug
`payment-success.tsx:7` and `payment-failed.tsx:7` import `getStringParam` from `../utils/payment`, but it is not exported from there (it's defined in `payment.tsx` screen only).

### 5. Deprecated SafeAreaView import (payment.tsx:4)
`SafeAreaView` imported from `react-native` instead of `react-native-safe-area-context`.

### 6. Missing user info in payment route (plans.tsx:43-53)
`userName`, `userEmail`, `userPhone` are not passed as route params to `/payment`.

### 7. No backend verification before success (payment.tsx:131-144)
On Razorpay success, the frontend navigates directly to `/payment-success` without calling the backend verify endpoint first.

---

## Files to Modify (8 files)

### File 1: `mobile/src/utils/payment.ts`
**Changes:**
- Add `export const IS_RAZORPAY_TEST_MODE = true;`
- Export `getStringParam` and `getNumberParam` helpers (needed by payment-success and payment-failed)
- Conditionally configure Razorpay options based on test mode:
  - Test mode: all methods enabled (upi, card, netbanking, wallet), no `webview_intent`
  - Live mode: UPI only, `webview_intent: true`
- Remove `webview_intent` from test mode config
- Remove empty `method` custom display block issues
- Keep all existing types as-is

### File 2: `mobile/src/components/PaymentWebView.tsx`
**Changes:**
- Minimal — already well-structured
- Keep custom `WebViewLoadRequest` interface (avoids ShouldStartLoadRequest import)
- Keep explicit loader positioning (already correct)
- Keep all payment URL handling, intent conversion, dedup logic

### File 3: `mobile/src/app/payment.tsx`
**Changes:**
- Import `SafeAreaView` from `react-native-safe-area-context` (not `react-native`)
- Remove `RouteParam` type — use `unknown` directly
- Use `useLocalSearchParams()` without generic type parameter
- Add `planId` to order validation
- Add backend verification flow:
  - On Razorpay success → call `verifyPayment()` from paymentService
  - Show verification loading state
  - Prevent duplicate verification requests
  - Only navigate to `/payment-success` after backend confirms
  - On verification failure → show error with retry option
- On dismissed → show "Payment Cancelled" with Try Again / Go Back
- On failure → show Razorpay failure message with retry

### File 4: `mobile/src/services/paymentService.ts`
**Changes:**
- Remove the `activateSubscription` function that writes directly to Firestore
- Add a new `refreshSubscription` function that READS the user document from Firestore (read-only, no write)
- Add Firebase ID token to `verifyPayment` request (Authorization header)
- Keep `createOrder` as-is
- `verifyPayment` calls `POST /payments/verify` with auth token — backend handles activation

### File 4b: `mobile/src/services/api.ts`
**Changes:**
- Add axios request interceptor to attach Firebase auth ID token to Authorization header
- This ensures all API calls are authenticated

### File 5: `mobile/src/app/plans.tsx`
**Changes:**
- Import `auth` from firebase
- Pass `userName`, `userEmail`, `userPhone` as route params to `/payment`
- Validate all required fields from order response before navigation

### File 6: `mobile/src/app/payment-success.tsx`
**Changes:**
- Fix `getStringParam` import (now exported from `../utils/payment`)

### File 7: `mobile/src/app/payment-failed.tsx`
**Changes:**
- Fix `getStringParam` import (now exported from `../utils/payment`)

### File 8: `backend/payments.py`
**Changes:**
- Add Firebase Admin SDK initialization (using service account JSON path from env var)
- Implement full `/payments/verify` endpoint:
  1. Extract Firebase ID token from `Authorization: Bearer <token>` header
  2. Verify Firebase ID token using Admin SDK → get user UID
  3. Verify Razorpay signature
  4. Verify order belongs to authenticated user (check order notes or fetch order)
  5. Verify order amount/currency match expected plan
  6. Check payment hasn't been processed already (idempotency)
  7. Update Firestore subscription fields using admin credentials
  8. Return activated subscription details
- Add Firebase Admin SDK to `requirements.txt`
- Add `FIREBASE_SERVICE_ACCOUNT_PATH` to `.env`

### File 9: `backend/requirements.txt`
**Changes:**
- Add `firebase-admin` dependency

### File 10: Firestore Security Rules (new file or update)
- Restrict direct writes to subscription fields on user documents
- Users can only read their own user document
- Subscription fields (`subscriptionActive`, `planId`, `planName`, `subscriptionExpiry`, etc.) should only be writable by admin/server

---

## Detailed Implementation Steps

### Step 1: Fix utils/payment.ts
Add `IS_RAZORPAY_TEST_MODE` constant and export helper functions. Conditionally build Razorpay options based on mode.

### Step 2: Fix paymentService.ts
Remove `activateSubscription` Firestore write. Add `refreshSubscription` read function.

### Step 3: Fix payment.tsx screen
Fix SafeAreaView import. Add verification flow with loading states. Handle all message types properly.

### Step 4: Fix plans.tsx
Add user info to payment route params.

### Step 5: Fix payment-success.tsx and payment-failed.tsx
Fix `getStringParam` imports.

### Step 6: Fix backend payments.py
Implement Firebase Admin SDK and complete verify endpoint.

### Step 7: Add Firestore security rules
Create security rules file.

### Step 8: Add firebase-admin to requirements.txt

### Step 9: Verify TypeScript compilation
Run type checks to ensure no errors.

---

## Verification Checklist
- [ ] Test mode shows card, netbanking, wallet, UPI options
- [ ] No `webview_intent` in test mode
- [ ] Live mode only shows UPI with webview_intent
- [ ] Payment success goes through backend verification
- [ ] Frontend cannot write subscriptionActive directly
- [ ] Backend verify endpoint activates subscription
- [ ] All TypeScript errors resolved
- [ ] getStringParam exported from utils/payment.ts
- [ ] SafeAreaView from react-native-safe-area-context
- [ ] Route params include userName, userEmail, userPhone
- [ ] Duplicate verification prevented
- [ ] Payment dismissal handled separately from failure
- [ ] WebView state resets on new order
- [ ] All error cases handled gracefully
