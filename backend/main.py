from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import os

from gemini_extractor import extract_multiple_with_gemini
from export_excel import generate_excel_in_memory

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Gemini Card Extraction API Running"}


@app.post("/upload")
async def upload_cards(files: list[UploadFile] = File(...)):
    if len(files) > 10:
        return {"message": "Maximum 10 cards allowed per upload."}

    image_cards = []

    for index, file in enumerate(files, start=1):
        image_bytes = await file.read()
        image_cards.append({
            "card_no": index,
            "filename": file.filename,
            "bytes": image_bytes,
            "mime_type": file.content_type or "image/jpeg"
        })

    try:
        results = extract_multiple_with_gemini(image_cards)

        for card in results:
            card["source"] = "gemini"

    except Exception as e:
        return {"error": str(e)}

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
        headers={"Content-Disposition": "attachment; filename=cardsdetails.xlsx"}
    )