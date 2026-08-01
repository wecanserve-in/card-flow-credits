import json
import os
import time
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

DEBUG = True

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print("=" * 60)
print("GEMINI KEY FOUND:", GEMINI_API_KEY is not None)
print("KEY LENGTH:", len(GEMINI_API_KEY) if GEMINI_API_KEY else 0)
print("KEY PREFIX:", GEMINI_API_KEY[:10] if GEMINI_API_KEY else "NONE")
print("=" * 60)

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY was not found in the environment variables."
    )

client = genai.Client(api_key=GEMINI_API_KEY)


CARD_SCHEMA = {
    "type": "object",
    "properties": {
        "card_no": {
            "type": "integer",
        },
        "name": {
            "type": "string",
        },
        "company": {
            "type": "string",
        },
        "designation": {
            "type": "string",
        },
        "phone": {
            "type": "string",
        },
        "country": {
            "type": "string",
        },
        "email": {
            "type": "string",
        },
        "website": {
            "type": "string",
        },
        "address": {
            "type": "string",
        },
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
        "address",
    ],
    # "additionalProperties": False,
}


BATCH_SCHEMA = {
    "type": "array",
    "items": CARD_SCHEMA,
}


def _print_usage(response: Any) -> None:
    if not DEBUG:
        return

    usage = getattr(response, "usage_metadata", None)

    if not usage:
        return

    prompt_tokens = getattr(
        usage,
        "prompt_token_count",
        0,
    ) or 0

    output_tokens = getattr(
        usage,
        "candidates_token_count",
        0,
    ) or 0

    total_tokens = getattr(
        usage,
        "total_token_count",
        0,
    ) or 0

    thinking_tokens = getattr(
        usage,
        "thoughts_token_count",
        0,
    ) or 0

    input_price = 0.30 / 1_000_000
    output_price = 2.50 / 1_000_000

    estimated_cost = (
        prompt_tokens * input_price
        + output_tokens * output_price
    )

    print("\n" + "=" * 55)
    print("          GEMINI TOKEN USAGE")
    print("=" * 55)
    print(f"Prompt Tokens   : {prompt_tokens}")
    print(f"Output Tokens   : {output_tokens}")
    print(f"Total Tokens    : {total_tokens}")
    print(f"Thinking Tokens : {thinking_tokens}")
    print(f"Estimated Cost  : ${estimated_cost:.8f}")
    print("=" * 55 + "\n")


def _get_finish_reason(response: Any) -> str:
    candidates = getattr(response, "candidates", None)

    if not candidates:
        return "UNKNOWN"

    finish_reason = getattr(
        candidates[0],
        "finish_reason",
        None,
    )

    return str(finish_reason or "UNKNOWN")


def _normalize_cards(
    data: Any,
    expected_count: int,
) -> list[dict[str, Any]]:
    if not isinstance(data, list):
        raise ValueError(
            "Gemini response must be a JSON array."
        )

    if len(data) != expected_count:
        raise ValueError(
            "Gemini returned "
            f"{len(data)} card(s), but "
            f"{expected_count} image(s) were provided."
        )

    normalized_cards: list[dict[str, Any]] = []

    fields = CARD_SCHEMA["properties"].keys()

    for index, raw_item in enumerate(data, start=1):
        if not isinstance(raw_item, dict):
            raise ValueError(
                f"Card {index} is not a valid JSON object."
            )

        item: dict[str, Any] = {}

        for field in fields:
            value = raw_item.get(field)

            if field == "card_no":
                try:
                    item[field] = int(value)
                except (TypeError, ValueError):
                    item[field] = index

                continue

            if value is None:
                item[field] = "Not available"
                continue

            value = str(value).strip()

            item[field] = (
                value
                if value
                else "Not available"
            )

        # Force card numbering to follow input-image order.
        item["card_no"] = index

        normalized_cards.append(item)

    return normalized_cards


def extract_multiple_with_gemini(
    image_cards: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not image_cards:
        raise ValueError(
            "No business-card images were provided."
        )

    contents: list[types.Part] = []

    prompt = f"""
Extract information from every business-card image.

There are exactly {len(image_cards)} images.
Return exactly {len(image_cards)} JSON objects in the same order
as the uploaded images.

Rules:
- Return only valid JSON matching the supplied schema.
- Do not return Markdown or code fences.
- card_no starts at 1 and follows image order.
- Never skip an image.
- Use "Not available" for missing or unreadable values.
- Ignore logos, decorative icons, and QR-code contents.
- Preserve phone country and area codes.
- Keep names, companies, designations, emails, websites,
  phone numbers, and addresses as printed.
- Do not invent missing details.
"""

    contents.append(
        types.Part.from_text(text=prompt)
    )

    for index, card in enumerate(image_cards, start=1):
        image_bytes = card.get("bytes")

        if not image_bytes:
            raise ValueError(
                f"Image {index} does not contain valid bytes."
            )

        contents.append(
            types.Part.from_text(
                text=f"Business card image number {index}:"
            )
        )

        contents.append(
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=card.get(
                    "mime_type",
                    "image/jpeg",
                ),
            )
        )

    max_retries = 3
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            print(
                f"[Gemini] Extraction attempt "
                f"{attempt}/{max_retries}"
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=8192,
                    response_mime_type="application/json",
                    response_schema=BATCH_SCHEMA,

                    # Business-card extraction does not need
                    # extended reasoning. Disable thinking so
                    # it cannot consume the JSON output budget.
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=0,
                    ),
                ),
            )

            _print_usage(response)

            finish_reason = _get_finish_reason(response)

            response_text = (
                response.text or ""
            ).strip()

            if DEBUG:
                print(
                    "[Gemini] Finish reason:",
                    finish_reason,
                )
                print(
                    "[Gemini] Response characters:",
                    len(response_text),
                )

            if not response_text:
                raise ValueError(
                    "Gemini returned an empty response."
                )

            try:
                parsed_data = json.loads(response_text)

            except json.JSONDecodeError as json_error:
                print(
                    "[Gemini] Invalid JSON returned:"
                )
                print(response_text)

                raise ValueError(
                    "Gemini returned incomplete or invalid JSON. "
                    f"Finish reason: {finish_reason}. "
                    f"JSON error: {json_error}"
                ) from json_error

            normalized_data = _normalize_cards(
                parsed_data,
                expected_count=len(image_cards),
            )

            print(
                "[Gemini] Successfully extracted "
                f"{len(normalized_data)} card(s)."
            )

            return normalized_data

        except Exception as error:
            last_error = error
            error_message = str(error)

            print(
                f"[Gemini] Attempt {attempt} failed:",
                error_message,
            )

            retryable_error = any(
                value in error_message.upper()
                for value in [
                    "503",
                    "UNAVAILABLE",
                    "RESOURCE_EXHAUSTED",
                    "429",
                    "INVALID JSON",
                    "INCOMPLETE",
                    "EMPTY RESPONSE",
                    "RETURNED 0 CARD",
                    "WERE PROVIDED",
                ]
            )

            if (
                retryable_error
                and attempt < max_retries
            ):
                wait_time = min(2 ** (attempt - 1), 5)

                print(
                    "[Gemini] Retrying in "
                    f"{wait_time} second(s)..."
                )

                time.sleep(wait_time)
                continue

            break

    raise RuntimeError(
        "Failed to process business cards after "
        f"{max_retries} attempt(s): {last_error}"
    )