import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

CARD_SCHEMA = {
    "type": "object",
    "properties": {
        "card_no": {"type": "integer"},
        "name": {"type": "string"},
        "company": {"type": "string"},
        "designation": {"type": "string"},
        "phone": {"type": "string"},
        "country": {"type": "string"},
        "email": {"type": "string"},
        "website": {"type": "string"},
        "address": {"type": "string"}
    },
    "required": [
        "card_no",
        "name",
        "company",
        "designation",
        "phone",
        "country",
        "email",
        "website",
        "address"
    ]
}

BATCH_SCHEMA = {
    "type": "array",
    "items": CARD_SCHEMA
}


def extract_multiple_with_gemini(image_cards):
    contents = []

    prompt = """
You will receive multiple business card images.

Extract details from EVERY image.

Return ONLY a valid JSON array.

Rules:
- First image = card_no 1
- Second image = card_no 2
- Continue sequentially.
- Never skip an image.
- If field missing return "Not available".
- Do not invent values.

Extract:
name
company
designation
phone
country
email
website
address
"""

    contents.append(types.Part.from_text(text=prompt))

    for card in image_cards:
        mime_type = card.get("mime_type", "image/jpeg")

        contents.append(
            types.Part.from_bytes(
                data=card["bytes"],
                mime_type=mime_type
            )
        )

    # Retry logic
    max_retries = 5

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",  # changed from flash-lite
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=2000,
                    response_mime_type="application/json",
                    response_schema=BATCH_SCHEMA
                )
            )

            data = json.loads(response.text)

            # Fill missing fields
            for item in data:
                for key in CARD_SCHEMA["properties"]:
                    if not item.get(key):
                        item[key] = "Not available"

            return data

        except Exception as e:
            error_message = str(e)

            # Retry only for temporary server issues
            if (
                ("503" in error_message or "UNAVAILABLE" in error_message)
                and attempt < max_retries - 1
            ):
                wait_time = 2 ** attempt
                print(
                    f"Gemini busy. Retrying in {wait_time} seconds..."
                )
                time.sleep(wait_time)
            else:
                print("Gemini Error:", error_message)
                raise Exception(
                    f"Failed to process business cards: {error_message}"
                )