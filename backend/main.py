import asyncio
import secrets
import time
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore

from gemini_extractor import extract_multiple_with_gemini
from payments import router as payment_router, _verify_firebase_token, _get_firestore
from notifications import router as notification_router
from free_scans import router as free_scans_router
from verification_email import router as verification_email_router
from r2_upload import upload_profile_photo, delete_profile_photo

MAX_CARDS_PER_REQUEST = 25
MAX_CARD_IMAGE_BYTES = 10 * 1024 * 1024

app = FastAPI()

app.include_router(payment_router)
app.include_router(notification_router)
app.include_router(free_scans_router)
app.include_router(verification_email_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://scanmycard-126413727192.asia-south1.run.app",
        "http://localhost:8081",
        "http://localhost:19006",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Gemini Card Extraction API Running"}


def _credit_counts(user_data: dict) -> tuple[int, int]:
    """Returns (total, used). Older accounts used freeScanLimit/freeScansUsed."""
    total = int(user_data.get("totalScans", user_data.get("freeScanLimit", 0)) or 0)
    used = int(user_data.get("usedScans", user_data.get("freeScansUsed", 0)) or 0)
    return total, used


def _reserve_credits(uid: str, count: int) -> dict:
    """Atomically takes `count` credits from the user, or raises 402 if they don't have enough."""
    db = _get_firestore()
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def reserve(transaction):
        snapshot = user_ref.get(transaction=transaction)

        if not snapshot.exists:
            raise HTTPException(status_code=404, detail="Account not found. Please log in again.")

        total, used = _credit_counts(snapshot.to_dict() or {})
        remaining = max(total - used, 0)

        if remaining < count:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "INSUFFICIENT_CREDITS",
                    "message": f"You need {count} credit(s) but only {remaining} remain.",
                    "remaining": remaining,
                },
            )

        transaction.set(
            user_ref,
            {"totalScans": total, "usedScans": used + count, "updatedAt": int(time.time() * 1000)},
            merge=True,
        )
        return {"total": total, "used": used + count, "remaining": total - used - count}

    return reserve(db.transaction())


def _refund_credits(uid: str, count: int):
    try:
        db = _get_firestore()
        db.collection("users").document(uid).update({
            "usedScans": firestore.Increment(-count),
            "updatedAt": int(time.time() * 1000),
        })
    except Exception as error:
        print("[Credits] Refund failed:", error)


@app.post("/upload")
async def upload_cards(
    files: list[UploadFile] = File(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    if not files:
        raise _scan_error(400, "NO_IMAGES", "No images were uploaded.")

    if len(files) > MAX_CARDS_PER_REQUEST:
        raise _scan_error(400, "TOO_MANY_CARDS", f"You can scan up to {MAX_CARDS_PER_REQUEST} cards at a time.")

    image_cards = []

    for index, file in enumerate(files, start=1):
        image_bytes = await file.read()
        await file.close()

        if not image_bytes:
            raise _scan_error(400, "IMAGE_EMPTY", f"Card {index}'s photo couldn't be opened. Please retake it.", card=index)

        if len(image_bytes) > MAX_CARD_IMAGE_BYTES:
            raise _scan_error(400, "IMAGE_TOO_LARGE", f"Card {index}'s photo is too large. Please retake it.", card=index)

        image_cards.append({
            "card_no": index,
            "filename": file.filename,
            "bytes": image_bytes,
            "mime_type": file.content_type or "image/jpeg",
        })

    # Charge before calling Gemini so two parallel requests can't both spend the same credits.
    credits = await asyncio.to_thread(_reserve_credits, uid, len(image_cards))

    try:
        results = await asyncio.to_thread(extract_multiple_with_gemini, image_cards)
    except Exception as e:
        await asyncio.to_thread(_refund_credits, uid, len(image_cards))

        if _is_ai_busy(e):
            print("[Upload] AI busy:", e)
            raise _scan_error(503, "AI_BUSY", "Our AI is busy right now. No scans were used. Please try again in a minute.")

        ref = _error_ref()
        print(f"[Upload] Extraction failed ref={ref} uid={uid}:", e)
        raise _scan_error(
            500,
            "SERVER_ERROR",
            f"Something went wrong on our side. No scans were used. If it keeps happening, contact support@scanmycard.in with code {ref}.",
            ref=ref,
        )
    finally:
        for item in image_cards:
            item["bytes"] = None

    filenames = {item["card_no"]: item["filename"] for item in image_cards}
    unreadable = 0

    for card in results:
        card["source"] = "gemini"
        card["filename"] = filenames.get(card["card_no"])
        card["unreadable"] = _is_unreadable(card)
        unreadable += card["unreadable"]

    # Cards the AI couldn't read anything from are not charged.
    if unreadable:
        await asyncio.to_thread(_refund_credits, uid, unreadable)
        credits = {
            "total": credits["total"],
            "used": credits["used"] - unreadable,
            "remaining": credits["remaining"] + unreadable,
        }

    return {
        "total_cards": len(results),
        "cards": results,
        "unreadable": unreadable,
        "credits": credits,
    }


def _scan_error(status: int, code: str, message: str, **extra) -> HTTPException:
    """Errors the app shows to the user: a stable `code` plus a friendly `message`."""
    return HTTPException(status_code=status, detail={"code": code, "message": message, **extra})


def _error_ref() -> str:
    """Short code the user can quote to support; it is also printed in the server log."""
    return "SMC-" + secrets.token_hex(2).upper()


def _is_ai_busy(error: Exception) -> bool:
    text = str(error).upper()
    return any(marker in text for marker in ("503", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "429", "DEADLINE"))


_EMPTY_VALUES = {"", "NOT AVAILABLE", "N/A", "NA", "NONE", "NULL", "-", "UNKNOWN"}


def _is_unreadable(card: dict) -> bool:
    """True when the AI found no name, phone or email: blurry, dark, cut off or not a card."""
    def empty(field):
        return str(card.get(field) or "").strip().upper() in _EMPTY_VALUES

    return empty("name") and empty("phone") and empty("email")


@app.post("/upload/profile-photo")
async def upload_profile_photo_endpoint(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    image_bytes = await file.read()

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    content_type = file.content_type or "image/jpeg"

    if content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WebP images are allowed.")

    try:
        url = upload_profile_photo(uid, image_bytes, content_type)
    except Exception as e:
        print("[Profile Photo] Upload failed:", e)
        raise HTTPException(status_code=500, detail="Upload failed. Please try again.")

    return {"url": url}


@app.post("/remove/profile-photo")
async def remove_profile_photo(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)
    db = _get_firestore()

    try:
        delete_profile_photo(uid)
    except Exception:
        pass

    db.collection("users").document(uid).update({
        "photoURL": "",
        "photoKey": "",
    })

    return {"success": True}


@app.post("/account/delete")
async def delete_account(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)
    db = _get_firestore()

    subcollections = ["contacts", "folders", "events", "notifications"]

    for sub in subcollections:
        docs = db.collection("users").document(uid).collection(sub).stream()
        for doc in docs:
            if sub == "events":
                nested = db.collection("users").document(uid).collection("events").document(doc.id).collection("contacts").stream()
                for nested_doc in nested:
                    nested_doc.reference.delete()
            doc.reference.delete()

    payments = (
        db.collection("processedPayments")
        .where("uid", "==", uid)
        .stream()
    )
    for p in payments:
        p.reference.delete()

    try:
        delete_profile_photo(uid)
    except Exception:
        pass

    # Free the user's referral code. The free-scan records (hashed phone/email) are kept on purpose.
    user_snapshot = db.collection("users").document(uid).get()
    referral_code = (user_snapshot.to_dict() or {}).get("referralCode") if user_snapshot.exists else None
    if referral_code:
        db.collection("referralCodes").document(referral_code).delete()

    db.collection("users").document(uid).delete()

    from firebase_admin import auth as firebase_auth
    try:
        firebase_auth.delete_user(uid)
    except Exception:
        pass

    return {"success": True, "message": "Account and all data deleted."}
