import os
import uuid

import boto3
from dotenv import load_dotenv

load_dotenv()

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")

ENDPOINT_URL = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def upload_profile_photo(user_uid: str, image_bytes: bytes, content_type: str = "image/jpeg") -> str:
    s3 = _get_s3_client()

    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"

    key = f"profile-photos/{user_uid}/{uuid.uuid4().hex}.{ext}"

    s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=key,
        Body=image_bytes,
        ContentType=content_type,
        ACL="public-read",
    )

    return f"{R2_PUBLIC_URL}/{key}"


def delete_profile_photo(user_uid: str):
    s3 = _get_s3_client()

    prefix = f"profile-photos/{user_uid}/"
    response = s3.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix=prefix)

    for obj in response.get("Contents", []):
        s3.delete_object(Bucket=R2_BUCKET_NAME, Key=obj["Key"])
