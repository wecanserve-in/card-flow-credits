import os
import time
from pathlib import Path
from typing import Optional

import firebase_admin
import razorpay

from dotenv import load_dotenv

from fastapi import (
    APIRouter,
    Header,
    HTTPException,
)

from firebase_admin import (
    auth as firebase_auth,
    credentials,
    firestore,
)

from pydantic import BaseModel


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    str(BASE_DIR / "serviceAccountKey.json"),
).strip()
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()

if not RAZORPAY_KEY_ID:
    raise RuntimeError("RAZORPAY_KEY_ID missing.")

if not RAZORPAY_KEY_SECRET:
    raise RuntimeError("RAZORPAY_KEY_SECRET missing.")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def _initialize_firebase_admin():
    if firebase_admin._apps:
        return

    service_account_file = Path(SERVICE_ACCOUNT_PATH)

    if not service_account_file.is_absolute():
        service_account_file = (BASE_DIR / service_account_file).resolve()

    if not service_account_file.exists():
        raise RuntimeError(f"Firebase JSON missing: {service_account_file}")

    firebase_credential = credentials.Certificate(str(service_account_file))

    firebase_admin.initialize_app(
        firebase_credential,
        {"projectId": FIREBASE_PROJECT_ID or firebase_credential.project_id},
    )

    print("[Firebase Admin] Initialized successfully")


_initialize_firebase_admin()


def _get_firestore():
    return firestore.client()


PLAN_PRICES = {
    "personal_starter": 99,
    "personal_popular": 499,
    "personal_pro": 999,
    "business_starter": 2499,
    "business_pro": 3999,
    "business_enterprise": 5999,
}

PLAN_SCAN_LIMITS = {
    "personal_starter": 50,
    "personal_popular": 750,
    "personal_pro": 1000,
    "business_starter": 2775,
    "business_pro": 5710,
    "business_enterprise": 10000,
}

PLAN_NAMES = {
    "personal_starter": "Starter",
    "personal_popular": "Popular",
    "personal_pro": "Pro",
    "business_starter": "Business Starter",
    "business_pro": "Business Pro",
    "business_enterprise": "Business Enterprise",
}

GST_RATE = 0.18


def _plan_total_rupees(pack_id: str) -> int:
    """Base price plus 18% GST, rounded to the nearest rupee."""
    return int(round(PLAN_PRICES[pack_id] * (1 + GST_RATE)))


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RecoverPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


router = APIRouter(prefix="/payments", tags=["Payments"])


def _verify_firebase_token(authorization: Optional[str]):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    parts = authorization.strip().split(" ", 1)

    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Invalid authorization format.")

    token = parts[1].strip()

    try:
        decoded = firebase_auth.verify_id_token(token, clock_skew_seconds=60)
        uid = decoded.get("uid")

        if not uid:
            raise Exception("UID missing from Firebase token")

        print("[Firebase Auth] Verified UID:", uid)
        return uid

    except HTTPException:
        raise
    except Exception as error:
        print("[Firebase Auth Error]", error)
        raise HTTPException(status_code=401, detail="Invalid Firebase token.")


def _add_credits(uid: str, pack_id: str, payment_id: str, order_id: str):
    db = _get_firestore()
    user_ref = db.collection("users").document(uid)
    payment_ref = db.collection("processedPayments").document(payment_id)
    now = int(time.time() * 1000)
    pack_name = PLAN_NAMES.get(pack_id, "Scan Pack")
    purchased_scans = PLAN_SCAN_LIMITS.get(pack_id, 0)

    if purchased_scans <= 0:
        raise HTTPException(status_code=500, detail="Invalid scan configuration.")

    try:
        payment_snapshot = payment_ref.get()

        if payment_snapshot.exists:
            user_snapshot = user_ref.get()
            user_data = user_snapshot.to_dict() if user_snapshot.exists else {}
            return {
                "success": True,
                "message": "Payment was already processed.",
                "scanPack": {
                    "packId": user_data.get("packId", pack_id),
                    "packName": user_data.get("packName", pack_name),
                    "totalScans": user_data.get("totalScans", 0),
                    "usedScans": user_data.get("usedScans", 0),
                },
            }

        user_snapshot = user_ref.get()
        user_data = user_snapshot.to_dict() if user_snapshot.exists else {}

        old_total = int(user_data.get("totalScans", 0) or 0)
        used = int(user_data.get("usedScans", 0) or 0)
        new_total = old_total + purchased_scans

        user_ref.set(
            {
                "packId": pack_id,
                "packName": pack_name,
                "totalScans": new_total,
                "usedScans": used,
                "lastPaymentId": payment_id,
                "lastOrderId": order_id,
                "updatedAt": now,
            },
            merge=True,
        )

        payment_ref.set(
            {
                "uid": uid,
                "paymentId": payment_id,
                "orderId": order_id,
                "packId": pack_id,
                "packName": pack_name,
                "creditsAdded": purchased_scans,
                "totalAfterPurchase": new_total,
                "amount": _plan_total_rupees(pack_id) * 100,
                "currency": "INR",
                "processedAt": now,
            }
        )

        try:
            from notifications import send_push_to_user

            send_push_to_user(
                uid,
                "Payment successful",
                f"{purchased_scans} card credits have been added to your account.",
                "/plans",
            )
        except Exception as push_error:
            print("[Payment] Push notification error:", push_error)

    except Exception as write_error:
        print("[Payment] Firestore write error:", write_error)
        raise HTTPException(
            status_code=500,
            detail="Payment verified but could not save credits. Contact support with your payment ID.",
        )

    return {
        "success": True,
        "message": "Payment verified and scan credits added successfully.",
        "scanPack": {
            "packId": pack_id,
            "packName": pack_name,
            "totalScans": new_total,
            "usedScans": used,
        },
    }


@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)
    pack_id = request.plan.strip().lower()

    if pack_id not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid scan pack.")

    amount = _plan_total_rupees(pack_id) * 100

    try:
        order = client.order.create(
            {
                "amount": amount,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {"uid": uid, "plan": pack_id},
            }
        )
    except Exception as error:
        print("[Razorpay Order Error]", error)
        raise HTTPException(status_code=502, detail="Unable to create payment order.")

    print("[Razorpay] Order created:", order["id"], "UID:", uid, "Pack:", pack_id)

    return {
        "success": True,
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": RAZORPAY_KEY_ID,
        "plan": pack_id,
    }


@router.post("/verify")
def verify_payment(
    data: VerifyPaymentRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature,
            }
        )
    except Exception as error:
        print("[Razorpay Signature Error]", error)
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    try:
        order = client.order.fetch(data.razorpay_order_id)
        payment = client.payment.fetch(data.razorpay_payment_id)
    except Exception as error:
        print("[Razorpay Fetch Error]", error)
        raise HTTPException(status_code=502, detail="Unable to fetch payment details.")

    notes = order.get("notes", {})
    order_uid = str(notes.get("uid", ""))
    pack_id = str(notes.get("plan", "")).lower()

    if order_uid != uid:
        raise HTTPException(status_code=403, detail="Order does not belong to user.")

    if pack_id not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid scan pack.")

    expected_amount = _plan_total_rupees(pack_id) * 100

    if order.get("amount") != expected_amount or payment.get("amount") != expected_amount:
        raise HTTPException(status_code=400, detail="Payment amount mismatch.")

    if payment.get("currency") != "INR":
        raise HTTPException(status_code=400, detail="Invalid currency.")

    if order.get("status") != "paid":
        raise HTTPException(status_code=400, detail="Order not paid.")

    return _add_credits(uid, pack_id, data.razorpay_payment_id, data.razorpay_order_id)


@router.get("/history")
def get_payment_history(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)
    db = _get_firestore()

    try:
        payments_ref = (
            db.collection("processedPayments")
            .where("uid", "==", uid)
            .order_by("processedAt", direction=firestore.Query.DESCENDING)
        )
        docs = payments_ref.stream()

        payments = []
        for doc in docs:
            data = doc.to_dict()
            payments.append({
                "paymentId": data.get("paymentId", ""),
                "packName": data.get("packName", ""),
                "packId": data.get("packId", ""),
                "creditsAdded": data.get("creditsAdded", 0),
                "amount": data.get("amount", 0) // 100 if data.get("amount", 0) else 0,
                "currency": data.get("currency", "INR"),
                "processedAt": data.get("processedAt", 0),
                "totalAfterPurchase": data.get("totalAfterPurchase", 0),
                "orderId": data.get("orderId", ""),
            })

        return {
            "success": True,
            "payments": payments,
        }

    except Exception as error:
        print("[Payment History] Error:", error)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch payment history.",
        )


@router.post("/recover")
def recover_payment(
    data: RecoverPaymentRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    try:
        order = client.order.fetch(data.razorpay_order_id)
    except Exception as error:
        print("[Payment Recover] Fetch error:", error)
        raise HTTPException(status_code=502, detail="Unable to fetch payment details.")

    if order.get("status") != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed yet. Please try again later.")

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature,
            }
        )
    except Exception:
        pass

    notes = order.get("notes", {})
    order_uid = str(notes.get("uid", ""))
    pack_id = str(notes.get("plan", "")).lower()

    if order_uid != uid:
        raise HTTPException(status_code=403, detail="Order does not belong to user.")

    if pack_id not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid scan pack.")

    return _add_credits(uid, pack_id, data.razorpay_payment_id, data.razorpay_order_id)
