import os
import time
from pathlib import Path
from typing import Optional

import firebase_admin
import razorpay
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException, status
from firebase_admin import (
    auth as firebase_auth,
    credentials,
    firestore,
)
from pydantic import BaseModel


load_dotenv()


# ────────────────────────────────────────────────────────────────
# Environment and paths
# ────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv(
    "RAZORPAY_KEY_SECRET",
    "",
).strip()

SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    str(BASE_DIR / "serviceAccountKey.json"),
).strip()

FIREBASE_PROJECT_ID = os.getenv(
    "FIREBASE_PROJECT_ID",
    "",
).strip()


# ────────────────────────────────────────────────────────────────
# Configuration validation
# ────────────────────────────────────────────────────────────────

if not RAZORPAY_KEY_ID:
    raise RuntimeError(
        "RAZORPAY_KEY_ID is missing from the backend environment."
    )

if not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        "RAZORPAY_KEY_SECRET is missing from the backend environment."
    )


# ────────────────────────────────────────────────────────────────
# Razorpay client
# ────────────────────────────────────────────────────────────────

client = razorpay.Client(
    auth=(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
    )
)


# ────────────────────────────────────────────────────────────────
# Firebase Admin initialization
# ────────────────────────────────────────────────────────────────

def _initialize_firebase_admin() -> None:
    if firebase_admin._apps:
        return

    service_account_file = Path(SERVICE_ACCOUNT_PATH)

    if not service_account_file.is_absolute():
        service_account_file = (
            BASE_DIR / service_account_file
        ).resolve()

    if not service_account_file.exists():
        raise RuntimeError(
            "Firebase service account JSON was not found at: "
            f"{service_account_file}"
        )

    try:
        firebase_credential = credentials.Certificate(
            str(service_account_file)
        )

        service_account_project_id = (
            firebase_credential.project_id or ""
        ).strip()

        if (
            FIREBASE_PROJECT_ID
            and service_account_project_id
            and FIREBASE_PROJECT_ID
            != service_account_project_id
        ):
            raise RuntimeError(
                "Firebase project mismatch: "
                f"FIREBASE_PROJECT_ID={FIREBASE_PROJECT_ID!r}, "
                "but serviceAccountKey.json belongs to "
                f"{service_account_project_id!r}."
            )

        firebase_admin.initialize_app(
            firebase_credential,
            {
                "projectId": (
                    FIREBASE_PROJECT_ID
                    or service_account_project_id
                )
            },
        )

        print(
            "[Firebase Admin] Initialized successfully."
        )
        print(
            "[Firebase Admin] Service account:",
            service_account_file,
        )
        print(
            "[Firebase Admin] Project ID:",
            FIREBASE_PROJECT_ID
            or service_account_project_id,
        )

    except Exception as error:
        print(
            "[Firebase Admin] Initialization failed:",
            type(error).__name__,
            repr(error),
        )

        raise RuntimeError(
            "Unable to initialize Firebase Admin SDK."
        ) from error


_initialize_firebase_admin()


def _get_firestore():
    return firestore.client()


# ────────────────────────────────────────────────────────────────
# Plans
# ────────────────────────────────────────────────────────────────

PLAN_PRICES = {
    "starter": 99,
    "pro": 199,
    "business": 499,
    "starter_yearly": 950,
    "pro_yearly": 1900,
    "business_yearly": 4790,
}

PLAN_SCAN_LIMITS = {
    "starter": 50,
    "pro": 150,
    "business": 500,
    "starter_yearly": 600,
    "pro_yearly": 1800,
    "business_yearly": 6000,
}

PLAN_NAMES = {
    "starter": "Starter",
    "pro": "Pro",
    "business": "Business",
    "starter_yearly": "Starter",
    "pro_yearly": "Pro",
    "business_yearly": "Business",
}


# ────────────────────────────────────────────────────────────────
# Request models
# ────────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ────────────────────────────────────────────────────────────────
# Router
# ────────────────────────────────────────────────────────────────

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


# ────────────────────────────────────────────────────────────────
# Authentication helper
# ────────────────────────────────────────────────────────────────

def _verify_firebase_token(
    authorization: Optional[str],
) -> str:
    print(
        "[Firebase Auth] Authorization received:",
        bool(authorization),
    )

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    parts = authorization.strip().split(" ", 1)

    if (
        len(parts) != 2
        or parts[0].lower() != "bearer"
        or not parts[1].strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Authorization header must use the "
                "'Bearer <Firebase ID token>' format."
            ),
        )

    id_token = parts[1].strip()

    try:
        decoded_token = firebase_auth.verify_id_token(
            id_token,
            check_revoked=False,
            # Handles very small clock differences between
            # the phone, Google/Firebase and the local PC.
            clock_skew_seconds=10,
        )

        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    "Firebase token does not contain "
                    "a user ID."
                ),
            )

        print(
            "[Firebase Auth] Token verified successfully."
        )
        print("[Firebase Auth] UID:", uid)
        print(
            "[Firebase Auth] Audience/project:",
            decoded_token.get("aud"),
        )

        return uid

    except HTTPException:
        raise

    except firebase_auth.ExpiredIdTokenError as error:
        print(
            "[Firebase Auth] Token expired:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase authentication token has expired.",
        ) from error

    except firebase_auth.RevokedIdTokenError as error:
        print(
            "[Firebase Auth] Token revoked:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase authentication token was revoked.",
        ) from error

    except firebase_auth.InvalidIdTokenError as error:
        print(
            "[Firebase Auth] Invalid token:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase ID token: {error}",
        ) from error

    except Exception as error:
        print(
            "[Firebase Auth] Verification failed:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Unable to verify Firebase authentication token: "
                f"{type(error).__name__}: {error}"
            ),
        ) from error


# ────────────────────────────────────────────────────────────────
# Test endpoints
# ────────────────────────────────────────────────────────────────

@router.get("/test")
def test_payment():
    return {
        "success": True,
        "message": "Payment API is working.",
        "firebase_initialized": bool(
            firebase_admin._apps
        ),
    }


@router.get("/check-keys")
def check_keys():
    return {
        "key_id_found": bool(RAZORPAY_KEY_ID),
        "secret_found": bool(RAZORPAY_KEY_SECRET),
        "firebase_initialized": bool(
            firebase_admin._apps
        ),
    }


# ────────────────────────────────────────────────────────────────
# Create Razorpay order
# ────────────────────────────────────────────────────────────────

@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    authorization: Optional[str] = Header(
        default=None,
        alias="Authorization",
    ),
):
    uid = _verify_firebase_token(authorization)

    plan = request.plan.strip().lower()

    if plan not in PLAN_PRICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan selected.",
        )

    amount = PLAN_PRICES[plan] * 100

    try:
        order = client.order.create(
            {
                "amount": amount,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "uid": uid,
                    "plan": plan,
                },
            }
        )

    except Exception as error:
        print(
            "[Razorpay] Order creation failed:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Razorpay could not create the payment order."
            ),
        ) from error

    print(
        "[Razorpay] Order created:",
        order.get("id"),
        "UID:",
        uid,
        "Plan:",
        plan,
    )

    return {
        "success": True,
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": RAZORPAY_KEY_ID,
        "plan": plan,
    }


# ────────────────────────────────────────────────────────────────
# Verify payment and activate subscription
# ────────────────────────────────────────────────────────────────

@router.post("/verify")
def verify_payment(
    data: VerifyPaymentRequest,
    authorization: Optional[str] = Header(
        default=None,
        alias="Authorization",
    ),
):
    uid = _verify_firebase_token(authorization)

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id":
                    data.razorpay_order_id,
                "razorpay_payment_id":
                    data.razorpay_payment_id,
                "razorpay_signature":
                    data.razorpay_signature,
            }
        )

    except razorpay.errors.SignatureVerificationError as error:
        print(
            "[Razorpay] Signature verification failed:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Razorpay signature verification failed.",
        ) from error

    except Exception as error:
        print(
            "[Razorpay] Unexpected verification error:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to verify the Razorpay payment.",
        ) from error

    try:
        order = client.order.fetch(
            data.razorpay_order_id
        )

        payment = client.payment.fetch(
            data.razorpay_payment_id
        )

    except Exception as error:
        print(
            "[Razorpay] Fetch payment/order failed:",
            type(error).__name__,
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not retrieve payment details "
                "from Razorpay."
            ),
        ) from error

    order_notes = order.get("notes") or {}
    order_uid = str(order_notes.get("uid") or "")
    order_plan = str(order_notes.get("plan") or "")

    if order_uid != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This order does not belong to the current user.",
        )

    if order_plan not in PLAN_PRICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The order contains an invalid plan.",
        )

    if payment.get("order_id") != data.razorpay_order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment does not belong to the supplied order."
            ),
        )

    expected_amount = PLAN_PRICES[order_plan] * 100

    if order.get("amount") != expected_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Order amount does not match the plan amount."
            ),
        )

    if payment.get("amount") != expected_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment amount does not match the plan amount."
            ),
        )

    if order.get("currency") != "INR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unexpected order currency.",
        )

    if payment.get("currency") != "INR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unexpected payment currency.",
        )

    order_status = order.get("status")

    if order_status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Razorpay order is not marked as paid. "
                f"Current status: {order_status or 'unknown'}."
            ),
        )

    payment_status = payment.get("status")
    payment_captured = payment.get("captured") is True

    if not (
        payment_status == "captured"
        or payment_captured
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment has not been captured successfully. "
                f"Current status: {payment_status or 'unknown'}."
            ),
        )

    db = _get_firestore()
    user_ref = db.collection("users").document(uid)
    payment_ref = (
        db.collection("processedPayments")
        .document(data.razorpay_payment_id)
    )

    now = int(time.time() * 1000)
    is_yearly = order_plan.endswith("_yearly")
    duration_days = 365 if is_yearly else 30

    subscription_expiry = (
        now
        + duration_days
        * 24
        * 60
        * 60
        * 1000
    )

    plan_name_base = PLAN_NAMES.get(
        order_plan,
        "Plan",
    )

    billing_period = (
        "Yearly" if is_yearly else "Monthly"
    )

    plan_name = (
        f"{plan_name_base} {billing_period} Plan"
    )

    purchased_scan_limit = PLAN_SCAN_LIMITS.get(
        order_plan,
        0,
    )

    transaction = db.transaction()

    @firestore.transactional
    def activate_subscription(transaction):
        processed_snapshot = payment_ref.get(
            transaction=transaction
        )

        user_snapshot = user_ref.get(
            transaction=transaction
        )

        user_data = (
            user_snapshot.to_dict()
            if user_snapshot.exists
            else {}
        )

        if processed_snapshot.exists:
            return {
                "already_processed": True,
                "planId": user_data.get(
                    "planId",
                    order_plan,
                ),
                "planName": user_data.get(
                    "planName",
                    plan_name,
                ),
                "scanLimit": user_data.get(
                    "freeScanLimit",
                    0,
                ),
                "subscriptionExpiry":
                    user_data.get(
                        "subscriptionExpiry",
                        subscription_expiry,
                    ),
            }

        current_used = int(
            user_data.get("freeScansUsed", 0) or 0
        )

        current_limit = int(
            user_data.get("freeScanLimit", 0) or 0
        )

        remaining_scans = max(
            current_limit - current_used,
            0,
        )

        new_total_scan_limit = (
            remaining_scans
            + purchased_scan_limit
        )

        transaction.set(
            user_ref,
            {
                "planId": order_plan,
                "planName": plan_name,
                "freeScanLimit":
                    new_total_scan_limit,
                "freeScansUsed": 0,
                "subscriptionActive": True,
                "subscriptionStartedAt": now,
                "subscriptionExpiry":
                    subscription_expiry,
                "lastPaymentId":
                    data.razorpay_payment_id,
                "lastOrderId":
                    data.razorpay_order_id,
                "updatedAt": now,
            },
            merge=True,
        )

        transaction.set(
            payment_ref,
            {
                "uid": uid,
                "orderId":
                    data.razorpay_order_id,
                "paymentId":
                    data.razorpay_payment_id,
                "planId": order_plan,
                "amount": expected_amount,
                "currency": "INR",
                "processedAt": now,
            },
        )

        return {
            "already_processed": False,
            "planId": order_plan,
            "planName": plan_name,
            "scanLimit":
                new_total_scan_limit,
            "subscriptionExpiry":
                subscription_expiry,
        }

    result = activate_subscription(transaction)

    return {
        "success": True,
        "message": (
            "Payment was already processed."
            if result["already_processed"]
            else (
                "Payment verified and subscription "
                "activated successfully."
            )
        ),
        "subscription": {
            "planId": result["planId"],
            "planName": result["planName"],
            "scanLimit": result["scanLimit"],
            "subscriptionExpiry":
                result["subscriptionExpiry"],
        },
    }