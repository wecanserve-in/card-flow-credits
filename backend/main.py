import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.responses import RedirectResponse
from typing import Optional

from image_preprocessing import preprocess_card
from gemini_extractor import extract_multiple_with_gemini
from export_excel import generate_excel_in_memory
from payments import router as payment_router, _verify_firebase_token, _get_firestore
from notifications import router as notification_router
from r2_upload import upload_profile_photo, delete_profile_photo

app = FastAPI()

app.include_router(payment_router)
app.include_router(notification_router)

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


@app.post("/upload")
async def upload_cards(
    files: list[UploadFile] = File(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    image_cards = []

    for index, file in enumerate(files, start=1):
        image_bytes = await file.read()

        processed_bytes = preprocess_card(image_bytes)

        image_cards.append({
            "card_no": index,
            "filename": file.filename,
            "bytes": processed_bytes,
            "mime_type": file.content_type or "image/jpeg"
        })

        del image_bytes
        await file.close()

    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: extract_multiple_with_gemini(image_cards)
        )

        for card in results:
            card["source"] = "gemini"

    except Exception as e:
        # Clear memory before throwing error
        for item in image_cards:
            item["bytes"] = None

        image_cards.clear()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    # Add filename back to results
    for card in results:
        matched = next(
            (
                item for item in image_cards
                if item["card_no"] == card["card_no"]
            ),
            None
        )

        if matched:
            card["filename"] = matched["filename"]

    # Clear processed image bytes
    for item in image_cards:
        item["bytes"] = None

    image_cards.clear()

    return {
        "total_cards": len(results),
        "cards": results,
        "excel_saved": False,
        "gemini_requests_used": 1
    }


@app.post("/download-excel")
def download_excel(cards: list[dict]):
    excel_buffer = generate_excel_in_memory(cards)

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            "attachment; filename=cardsdetails.xlsx"
        }
    )

@app.get("/payment-success")
def payment_success(
    razorpay_payment_id: str,
    razorpay_order_id: str,
    razorpay_signature: str,
):
    return RedirectResponse(
        url=f"scanmycard://payment-success?"
            f"payment_id={razorpay_payment_id}"
            f"&order_id={razorpay_order_id}"
            f"&signature={razorpay_signature}"
    )


@app.get("/payment-failed")
def payment_failed():
    return RedirectResponse(
        url="scanmycard://payment-failed"
    )


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

    try:
        url = upload_profile_photo(uid, image_bytes, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

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

    db.collection("users").document(uid).delete()

    from firebase_admin import auth as firebase_auth
    try:
        firebase_auth.delete_user(uid)
    except Exception:
        pass

    return {"success": True, "message": "Account and all data deleted."}