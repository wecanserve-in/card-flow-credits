"""Welcome gift: free scans for new accounts, at most once per phone and once per email.

New accounts are created by the app with 0 scans and freeScansStatus "pending".
The app then calls /account/claim-free-scans. The server grants the scans only if:
- the account's email is verified (Google sign-in emails always are), and
- no other account has already claimed free scans on this phone or with this email.

Phones and emails are stored only as salted SHA-256 hashes. These records are kept
after an account is deleted, so deleting and re-creating an account doesn't give
the free scans again.
"""
import asyncio
import hashlib
import os
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from firebase_admin import firestore
from pydantic import BaseModel

from payments import _get_firestore, _verify_firebase_claims

FREE_SCANS = 25
HASH_SALT = os.getenv("FREE_SCANS_HASH_SALT", "scanmycard-free-scans-v1")

router = APIRouter(prefix="/account", tags=["account"])


class FreeScanClaim(BaseModel):
    deviceId: str


def _hash(kind: str, value: str) -> str:
    return hashlib.sha256(f"{HASH_SALT}:{kind}:{value}".encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    """Treats Gmail aliases (dots, +tags, googlemail.com) as the same address."""
    email = (email or "").strip().lower()

    if "@" not in email:
        return email

    local, domain = email.rsplit("@", 1)
    local = local.split("+", 1)[0]

    if domain in ("gmail.com", "googlemail.com"):
        local = local.replace(".", "")
        domain = "gmail.com"

    return f"{local}@{domain}"


def _credits(data: dict) -> dict:
    total = int(data.get("totalScans", data.get("freeScanLimit", 0)) or 0)
    used = int(data.get("usedScans", data.get("freeScansUsed", 0)) or 0)
    return {"total": total, "used": used, "remaining": max(total - used, 0)}


def _grant_free_scans(uid: str, device_key: str, email_key: Optional[str]) -> dict:
    db = _get_firestore()
    user_ref = db.collection("users").document(uid)
    device_ref = db.collection("freeScanDevices").document(device_key)
    email_ref = db.collection("freeScanEmails").document(email_key) if email_key else None

    @firestore.transactional
    def grant(transaction):
        # Firestore transactions need every read before the first write.
        user_snapshot = user_ref.get(transaction=transaction)
        device_snapshot = device_ref.get(transaction=transaction)
        email_snapshot = email_ref.get(transaction=transaction) if email_ref else None

        if not user_snapshot.exists:
            raise HTTPException(status_code=404, detail="Account not found. Please log in again.")

        data = user_snapshot.to_dict() or {}
        status = data.get("freeScansStatus")

        # Accounts created before this feature (no status) keep what they have.
        if status != "pending":
            return {"status": status or "not_eligible", "credits": _credits(data)}

        def claimed_by_someone_else(snapshot):
            return (
                snapshot is not None
                and snapshot.exists
                and (snapshot.to_dict() or {}).get("uid") != uid
            )

        now = int(time.time() * 1000)

        if claimed_by_someone_else(device_snapshot) or claimed_by_someone_else(email_snapshot):
            transaction.set(user_ref, {"freeScansStatus": "already_used", "updatedAt": now}, merge=True)
            return {"status": "already_used", "credits": _credits(data)}

        record = {"uid": uid, "claimedAt": now}
        transaction.set(device_ref, record)
        if email_ref:
            transaction.set(email_ref, record)

        credits = _credits(data)
        new_total = credits["total"] + FREE_SCANS
        transaction.set(
            user_ref,
            {
                "totalScans": new_total,
                "freeScansStatus": "granted",
                "freeScansGranted": FREE_SCANS,
                "updatedAt": now,
            },
            merge=True,
        )
        return {
            "status": "granted",
            "credits": {
                "total": new_total,
                "used": credits["used"],
                "remaining": max(new_total - credits["used"], 0),
            },
        }

    return grant(db.transaction())


@router.post("/claim-free-scans")
async def claim_free_scans(
    body: FreeScanClaim,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    claims = _verify_firebase_claims(authorization)
    device_id = (body.deviceId or "").strip()

    if not 8 <= len(device_id) <= 128:
        raise HTTPException(status_code=400, detail="Invalid device.")

    if not claims.get("email_verified"):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email to get your free scans.",
            },
        )

    email = normalize_email(claims.get("email") or "")
    email_key = _hash("email", email) if email else None

    result = await asyncio.to_thread(
        _grant_free_scans, claims["uid"], _hash("device", device_id), email_key
    )
    return {**result, "freeScans": FREE_SCANS}
