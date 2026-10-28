"""Welcome gift (free scans for new accounts) and referral rewards.

Welcome gift: new accounts are created by the app with 0 scans and freeScansStatus
"pending". The app then calls /account/claim-free-scans. The server grants the scans
only if:
- the account's email is verified (Google sign-in emails always are), and
- no other account has already claimed free scans on this phone or with this email.

Referrals: every user has a permanent referral code (/account/referral-code). A new
user can send a friend's code with their claim. When the new user's welcome gift is
granted, the friend who owns the code gets REFERRAL_BONUS scans and the new user
gets REFERRAL_WELCOME_BONUS extra scans. Because the reward is
tied to the welcome gift, a second account on the same phone (or with the same email)
earns nobody anything.

Phones and emails are stored only as salted SHA-256 hashes. These records are kept
after an account is deleted, so deleting and re-creating an account doesn't give
the free scans again.
"""
import asyncio
import hashlib
import os
import re
import secrets
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from firebase_admin import firestore
from pydantic import BaseModel

from payments import _get_firestore, _verify_firebase_claims, _verify_firebase_token

FREE_SCANS = 10
REFERRAL_BONUS = 10          # for the friend who shared the code
REFERRAL_WELCOME_BONUS = 5   # extra for the new user who used a code
HASH_SALT = os.getenv("FREE_SCANS_HASH_SALT", "scanmycard-free-scans-v1")

# No 0/O or 1/I/L, so codes are easy to read out and type.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6

router = APIRouter(prefix="/account", tags=["account"])


class FreeScanClaim(BaseModel):
    deviceId: str
    referralCode: Optional[str] = None


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


def normalize_code(code: Optional[str]) -> str:
    """Upper-cases and drops spaces/dashes. Returns "" for anything that can't be a code."""
    code = re.sub(r"[\s-]", "", (code or "")).upper()
    return code if re.fullmatch(f"[{CODE_ALPHABET}]{{{CODE_LENGTH}}}", code) else ""


def _credits(data: dict) -> dict:
    total = int(data.get("totalScans", data.get("freeScanLimit", 0)) or 0)
    used = int(data.get("usedScans", data.get("freeScansUsed", 0)) or 0)
    return {"total": total, "used": used, "remaining": max(total - used, 0)}


# ---------------------------------------------------------------- referral code


def _get_or_create_referral_code(uid: str) -> dict:
    db = _get_firestore()
    user_ref = db.collection("users").document(uid)

    for _ in range(8):
        candidate = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        code_ref = db.collection("referralCodes").document(candidate)

        @firestore.transactional
        def create(transaction):
            user_snapshot = user_ref.get(transaction=transaction)
            code_snapshot = code_ref.get(transaction=transaction)

            if not user_snapshot.exists:
                raise HTTPException(status_code=404, detail="Account not found. Please log in again.")

            data = user_snapshot.to_dict() or {}

            if data.get("referralCode"):
                return data

            if code_snapshot.exists:
                return None  # Taken; try another one.

            now = int(time.time() * 1000)
            transaction.set(code_ref, {"uid": uid, "createdAt": now})
            transaction.set(user_ref, {"referralCode": candidate, "updatedAt": now}, merge=True)
            return {**data, "referralCode": candidate}

        data = create(db.transaction())

        if data is not None:
            return {
                "code": data["referralCode"],
                "referralCount": int(data.get("referralCount", 0) or 0),
                "referralScansEarned": int(data.get("referralScansEarned", 0) or 0),
                "bonusPerReferral": REFERRAL_BONUS,
            }

    raise HTTPException(status_code=500, detail="Could not create a referral code. Please try again.")


@router.post("/referral-code")
async def referral_code(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)
    return await asyncio.to_thread(_get_or_create_referral_code, uid)


def _code_exists(code: str) -> bool:
    return _get_firestore().collection("referralCodes").document(code).get().exists


@router.get("/referral-check")
async def referral_check(code: str = ""):
    """Lets the signup screen tell the user whether the code they typed exists."""
    normalized = normalize_code(code)
    valid = bool(normalized) and await asyncio.to_thread(_code_exists, normalized)
    return {"valid": valid, "code": normalized}


# ---------------------------------------------------------------- welcome gift


def _grant_free_scans(uid: str, device_key: str, email_key: Optional[str], referral_code: str) -> dict:
    db = _get_firestore()
    user_ref = db.collection("users").document(uid)
    device_ref = db.collection("freeScanDevices").document(device_key)
    email_ref = db.collection("freeScanEmails").document(email_key) if email_key else None
    code_ref = db.collection("referralCodes").document(referral_code) if referral_code else None

    @firestore.transactional
    def grant(transaction):
        # Firestore transactions need every read before the first write.
        user_snapshot = user_ref.get(transaction=transaction)
        device_snapshot = device_ref.get(transaction=transaction)
        email_snapshot = email_ref.get(transaction=transaction) if email_ref else None
        code_snapshot = code_ref.get(transaction=transaction) if code_ref else None

        referrer_uid = None
        referrer_ref = None
        referrer_snapshot = None
        if code_snapshot is not None and code_snapshot.exists:
            referrer_uid = (code_snapshot.to_dict() or {}).get("uid")
            if referrer_uid and referrer_uid != uid:
                referrer_ref = db.collection("users").document(referrer_uid)
                referrer_snapshot = referrer_ref.get(transaction=transaction)

        if not user_snapshot.exists:
            raise HTTPException(status_code=404, detail="Account not found. Please log in again.")

        data = user_snapshot.to_dict() or {}
        status = data.get("freeScansStatus")

        # Accounts created before this feature (no status) keep what they have.
        if status != "pending":
            return {"status": status or "not_eligible", "credits": _credits(data), "referrerUid": None}

        def claimed_by_someone_else(snapshot):
            return (
                snapshot is not None
                and snapshot.exists
                and (snapshot.to_dict() or {}).get("uid") != uid
            )

        now = int(time.time() * 1000)

        if claimed_by_someone_else(device_snapshot) or claimed_by_someone_else(email_snapshot):
            transaction.set(user_ref, {"freeScansStatus": "already_used", "updatedAt": now}, merge=True)
            return {"status": "already_used", "credits": _credits(data), "referrerUid": None}

        record = {"uid": uid, "claimedAt": now}
        transaction.set(device_ref, record)
        if email_ref:
            transaction.set(email_ref, record)

        credits = _credits(data)
        referral_ok = (
            referrer_snapshot is not None and referrer_snapshot.exists
        )
        granted = FREE_SCANS + (REFERRAL_WELCOME_BONUS if referral_ok else 0)
        new_total = credits["total"] + granted
        user_update = {
            "totalScans": new_total,
            "freeScansStatus": "granted",
            "freeScansGranted": granted,
            "updatedAt": now,
        }

        rewarded_referrer = None
        if referral_ok:
            referrer = referrer_snapshot.to_dict() or {}
            referrer_credits = _credits(referrer)
            transaction.set(
                referrer_ref,
                {
                    "totalScans": referrer_credits["total"] + REFERRAL_BONUS,
                    "referralCount": int(referrer.get("referralCount", 0) or 0) + 1,
                    "referralScansEarned": int(referrer.get("referralScansEarned", 0) or 0) + REFERRAL_BONUS,
                    "updatedAt": now,
                },
                merge=True,
            )
            transaction.set(
                db.collection("referrals").document(uid),
                {"referrerUid": referrer_uid, "code": referral_code, "bonus": REFERRAL_BONUS, "createdAt": now},
            )
            user_update["referredBy"] = referrer_uid
            rewarded_referrer = referrer_uid

        transaction.set(user_ref, user_update, merge=True)
        return {
            "status": "granted",
            "granted": granted,
            "credits": {
                "total": new_total,
                "used": credits["used"],
                "remaining": max(new_total - credits["used"], 0),
            },
            "referrerUid": rewarded_referrer,
        }

    return grant(db.transaction())


def _notify_referrer(referrer_uid: str):
    try:
        from notifications import send_push_to_user

        send_push_to_user(
            referrer_uid,
            "Your friend joined ScanMyCard 🎉",
            f"{REFERRAL_BONUS} free scans have been added to your account.",
            "/settings",
        )
    except Exception as error:
        print("[Referral] Push notification error:", error)


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
        _grant_free_scans,
        claims["uid"],
        _hash("device", device_id),
        email_key,
        normalize_code(body.referralCode),
    )

    referrer_uid = result.pop("referrerUid", None)
    if referrer_uid:
        await asyncio.to_thread(_notify_referrer, referrer_uid)

    return {**result, "freeScans": FREE_SCANS, "referralApplied": bool(referrer_uid)}
