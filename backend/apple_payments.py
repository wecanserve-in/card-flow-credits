"""Scan packs bought on iPhone through Apple In-App Purchase.

The app sends the signed transaction (a JWS) it gets from StoreKit. We check the
signature against Apple's root certificates, then add the pack's credits once per
Apple transaction, using the same _add_credits as Razorpay. Apple's server
notifications tell us about refunds, and we take those credits back.
"""
import hashlib
import os
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from firebase_admin import firestore
from pydantic import BaseModel

import payments
from payments import PLAN_NAMES, PLAN_SCAN_LIMITS, _add_credits, _verify_firebase_token

BUNDLE_ID = os.getenv("APPLE_BUNDLE_ID", "com.wecanserve.scanmycard")
# The numeric App Store ID, shown in App Store Connect once the app record exists.
# Needed to accept real (production) purchases; sandbox purchases work without it.
APPLE_APP_ID = os.getenv("APPLE_APP_ID", "").strip()

# Apple product ID -> our pack ID. Must match the products created in App Store Connect.
PRODUCT_PACKS = {
    "com.wecanserve.scanmycard.starter": "personal_starter",
    "com.wecanserve.scanmycard.popular": "personal_popular",
    "com.wecanserve.scanmycard.pro": "personal_pro",
    "com.wecanserve.scanmycard.business_starter": "business_starter",
    "com.wecanserve.scanmycard.business_pro": "business_pro",
    "com.wecanserve.scanmycard.business_enterprise": "business_enterprise",
}

CERT_DIR = Path(__file__).resolve().parent / "apple_certs"

router = APIRouter(prefix="/payments/apple", tags=["Apple payments"])


class AppleVerifyRequest(BaseModel):
    signedTransaction: str


class AppleNotification(BaseModel):
    signedPayload: str


def account_token_for(uid: str) -> str:
    """The UUID the app attaches to each purchase (appAccountToken), derived from the uid.
    The app computes the same value, so a purchase can't be claimed by another account."""
    h = hashlib.sha256(uid.encode("utf-8")).hexdigest()
    return f"{h[0:8]}-{h[8:12]}-4{h[13:16]}-{'89ab'[int(h[16], 16) % 4]}{h[17:20]}-{h[20:32]}"


def _verifiers():
    """One verifier per environment we accept: production (once the app ID is known),
    then sandbox (TestFlight testers and Apple's reviewers)."""
    from appstoreserverlibrary.models.Environment import Environment
    from appstoreserverlibrary.signed_data_verifier import SignedDataVerifier

    roots = [p.read_bytes() for p in sorted(CERT_DIR.glob("*.cer"))]
    found = []
    if APPLE_APP_ID:
        found.append(SignedDataVerifier(roots, True, Environment.PRODUCTION, BUNDLE_ID, int(APPLE_APP_ID)))
    found.append(SignedDataVerifier(roots, True, Environment.SANDBOX, BUNDLE_ID))
    return found


def _decode(kind: str, signed: str):
    """Verifies a signed transaction ("transaction") or notification ("notification")."""
    last_error = None
    for verifier in _verifiers():
        try:
            if kind == "transaction":
                return verifier.verify_and_decode_signed_transaction(signed)
            return verifier.verify_and_decode_notification(signed)
        except Exception as error:  # wrong environment or bad signature: try the next one
            last_error = error
    print(f"[Apple] {kind} verification failed:", last_error)
    raise HTTPException(status_code=400, detail="Could not verify the Apple purchase.")


def _credit_transaction(uid: str, tx) -> dict:
    if tx.bundleId != BUNDLE_ID:
        raise HTTPException(status_code=400, detail="Purchase is for a different app.")

    pack_id = PRODUCT_PACKS.get(tx.productId or "")
    if not pack_id:
        raise HTTPException(status_code=400, detail="Unknown scan pack.")

    if tx.revocationDate:
        raise HTTPException(status_code=400, detail="This purchase was refunded.")

    if tx.appAccountToken and tx.appAccountToken.lower() != account_token_for(uid):
        raise HTTPException(status_code=403, detail="Purchase belongs to another account.")

    quantity = max(int(tx.quantity or 1), 1)
    credits = PLAN_SCAN_LIMITS[pack_id] * quantity
    currency = tx.currency or "INR"
    # Apple gives the price in thousandths of the currency unit.
    amount = int(tx.price or 0) // 10 if currency == "INR" else int(tx.price or 0)

    return _add_credits(
        uid,
        pack_id,
        payment_id=f"apple_{tx.transactionId}",
        order_id=str(tx.originalTransactionId or tx.transactionId),
        credits=credits,
        amount_paise=amount,
        extra={
            "source": "apple",
            "currency": currency,
            "environment": str(tx.rawEnvironment or ""),
            "productId": tx.productId,
        },
    )


@router.post("/verify")
async def verify_apple_purchase(
    request: AppleVerifyRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    """Called by the iPhone app after StoreKit reports a purchase. Safe to call again:
    each Apple transaction adds credits only once."""
    uid = _verify_firebase_token(authorization)
    tx = await run_in_threadpool(_decode, "transaction", request.signedTransaction)
    return await run_in_threadpool(_credit_transaction, uid, tx)


def _take_back_refund(transaction_id: str) -> bool:
    """Removes a refunded purchase's credits (never below what was already used)."""
    db = payments._get_firestore()
    payment_ref = db.collection("processedPayments").document(f"apple_{transaction_id}")

    @firestore.transactional
    def apply(transaction):
        snap = payment_ref.get(transaction=transaction)
        record = snap.to_dict() if snap.exists else None
        if not record or record.get("refunded"):
            return False
        user_ref = db.collection("users").document(record["uid"])
        user = user_ref.get(transaction=transaction).to_dict() or {}
        used = int(user.get("usedScans", 0) or 0)
        total = int(user.get("totalScans", 0) or 0)
        new_total = max(used, total - int(record.get("creditsAdded", 0) or 0))
        now = int(time.time() * 1000)
        transaction.set(user_ref, {"totalScans": new_total, "updatedAt": now}, merge=True)
        transaction.set(payment_ref, {"refunded": True, "refundedAt": now}, merge=True)
        return True

    return apply(db.transaction())


def _handle_notification(signed_payload: str) -> dict:
    note = _decode("notification", signed_payload)
    kind = str(note.rawNotificationType or "")
    data = note.data

    if kind in ("REFUND", "REVOKE") and data and data.signedTransactionInfo:
        tx = _decode("transaction", data.signedTransactionInfo)
        removed = _take_back_refund(str(tx.transactionId))
        print(f"[Apple] {kind} for transaction {tx.transactionId}: credits removed={removed}")
    else:
        print(f"[Apple] notification {kind} ignored")

    return {"received": True}


@router.post("/notifications")
async def apple_server_notifications(body: AppleNotification):
    """App Store Server Notifications V2 (set this URL in App Store Connect)."""
    return await run_in_threadpool(_handle_notification, body.signedPayload)
