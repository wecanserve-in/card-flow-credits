import json
import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

DEBUG = True

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
        "address": {"type": "string"},
    },
}

BATCH_SCHEMA = {
    "type": "array",
    "items": CARD_SCHEMA,
}


def extract_multiple_with_gemini(image_cards):
    contents = []

    prompt = """
Extract information from every business card.

Return ONLY a valid JSON array.

Rules:
- card_no starts from 1.
- Never skip an image.
- Missing value -> "Not available".
- Ignore logos, icons and QR codes.
- Preserve phone country codes.
- Extract text exactly as printed.

Fields:
card_no
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
        contents.append(
            types.Part.from_bytes(
                data=card["bytes"],
                mime_type=card.get("mime_type", "image/jpeg"),
            )
        )

    max_retries = 5

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=700,
                    response_mime_type="application/json",
                    response_schema=BATCH_SCHEMA,
                ),
            )

            usage = response.usage_metadata

            if DEBUG and usage:
                prompt_tokens = usage.prompt_token_count
                output_tokens = usage.candidates_token_count
                total_tokens = usage.total_token_count

                INPUT_PRICE = 0.30 / 1_000_000
                OUTPUT_PRICE = 2.50 / 1_000_000

                estimated_cost = (
                    prompt_tokens * INPUT_PRICE
                    + output_tokens * OUTPUT_PRICE
                )

                print("\n" + "=" * 55)
                print("          GEMINI TOKEN USAGE")
                print("=" * 55)
                print(f"Prompt Tokens   : {prompt_tokens}")
                print(f"Output Tokens   : {output_tokens}")
                print(f"Total Tokens    : {total_tokens}")

                thoughts = getattr(
                    usage,
                    "thoughts_token_count",
                    None,
                )

                if thoughts:
                    print(f"Thinking Tokens : {thoughts}")

                print(f"Estimated Cost  : ${estimated_cost:.8f}")
                print("=" * 55 + "\n")

            try:
                data = json.loads(response.text)
            except json.JSONDecodeError:
                print("Invalid JSON returned by Gemini:")
                print(response.text)
                raise Exception("Gemini returned invalid JSON.")

            for item in data:
                for field in CARD_SCHEMA["properties"]:
                    if (
                        field not in item
                        or item[field] is None
                        or item[field] == ""
                    ):
                        item[field] = "Not available"

            return data

        except Exception as e:
            error_message = str(e)

            if (
                ("503" in error_message or "UNAVAILABLE" in error_message)
                and attempt < max_retries - 1
            ):
                wait_time = min(2 ** attempt, 5)

                print(
                    f"Gemini busy. Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

            else:
                print("Gemini Error:", error_message)
                raise Exception(
                    f"Failed to process business cards: {error_message}"
                )