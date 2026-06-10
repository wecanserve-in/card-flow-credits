import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

CONTACT_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "company": {"type": "string"},
        "designation": {"type": "string"},
        "phone": {"type": "string"},
        "country": {"type": "string"},
        "email": {"type": "string"},
        "website": {"type": "string"},
        "address": {"type": "string"}
    },
    "required": ["name", "company", "designation", "phone", "country", "email", "website", "address"]
}


def extract_with_gemini(raw_text: str):
    prompt = f"""Extract business card details from OCR text.

Return only JSON.

Use these exact keys:
name, company, designation, phone, country, email, website, address

Rules:
- If missing, use "Not available".
- Join split company lines correctly. Example: CENDOT + SYSTEMS + PVT + LTD = CENDOT SYSTEMS PVT LTD.
- Join split phone lines correctly. Example: +91 and 8657954865 = +918657954865.
- Fix website OCR. Example: WWWE condotsystems com = www.condotsystems.com.
- Fix email OCR if obvious.
- Country can come from address text.
- Do not invent unavailable values.

OCR TEXT:
{raw_text}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=220,
            response_mime_type="application/json",
            response_schema=CONTACT_SCHEMA
        )
    )

    print("========== GEMINI RAW RESPONSE ==========")
    print(response.text)
    print("=========================================")

    data = json.loads(response.text)

    for key in CONTACT_SCHEMA["properties"].keys():
        if not data.get(key):
            data[key] = "Not available"

    return data