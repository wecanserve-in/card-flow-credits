from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import os
import shutil

from ocr import extract_text_from_image
from gemini_extractor import extract_with_gemini
from extractor import extract_contact_details
from export_excel import save_cards_to_excel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
EXCEL_FILE = "exports/cardsdetails.xlsx"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("exports", exist_ok=True)


@app.get("/")
def home():
    return {
        "message": "OCR API Running"
    }


@app.post("/upload")
async def upload_cards(files: list[UploadFile] = File(...)):
    results = []

    for index, file in enumerate(files, start=1):
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        raw_text = extract_text_from_image(file_path)

        print(f"========== CARD {index} RAW OCR TEXT ==========")
        print(raw_text)
        print("===============================================")

        try:
            extracted_data = extract_with_gemini(raw_text)
            extracted_data["source"] = "gemini"

        except Exception as e:
            print("Gemini failed, using fallback extractor")
            print(e)

            extracted_data = extract_contact_details(raw_text)
            extracted_data["source"] = "fallback"

        extracted_data["card_no"] = index
        extracted_data["filename"] = file.filename
        extracted_data["raw_text"] = raw_text

        results.append(extracted_data)

    save_cards_to_excel(results)

    return {
        "total_cards": len(results),
        "cards": results,
        "excel_saved": True,
        "excel_file": EXCEL_FILE
    }


@app.get("/download-excel")
def download_excel():
    if not os.path.exists(EXCEL_FILE):
        return {
            "message": "Excel file not found. Upload cards first."
        }

    return FileResponse(
        EXCEL_FILE,
        filename="cardsdetails.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )