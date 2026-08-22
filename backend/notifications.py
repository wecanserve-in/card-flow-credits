import json
from typing import Optional
from urllib.request import Request, urlopen

from fastapi import APIRouter, Header, HTTPException

from pydantic import BaseModel

from payments import (
    _get_firestore,
    _verify_firebase_token,
)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    title: str
    body: str
    actionRoute: Optional[str] = None


def send_expo_push(token: str, title: str, body: str, data: Optional[dict] = None):
    if not token:
        print("[Push] No Expo push token available.")
        return False

    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "channelId": "default",
    }

    if data:
        message["data"] = data

    payload = json.dumps([message]).encode("utf-8")

    request = Request(
        EXPO_PUSH_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))

        if result.get("data"):
            first = result["data"][0]

            if first.get("status") != "ok":
                print("[Push] Expo returned status:", first.get("status"), first.get("message"))
                return False

            print("[Push] Notification sent successfully.")
            return True

        print("[Push] Unexpected Expo response:", result)
        return False
    except Exception as error:
        print("[Push] Expo send error:", error)
        return False


def send_push_to_user(uid: str, title: str, body: str, action_route: Optional[str] = None):
    try:
        db = _get_firestore()

        user_ref = db.collection("users").document(uid)

        user_doc = user_ref.get()

        if not user_doc.exists:
            print("[Push] User document missing:", uid)
            return False

        token = user_doc.to_dict().get("expoPushToken")

        data = {"actionRoute": action_route} if action_route else None

        return send_expo_push(token, title, body, data)
    except Exception as error:
        print("[Push] send_push_to_user error:", error)
        return False


@router.post("/send")
def send_notification(
    request: SendNotificationRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    if not request.title.strip() or not request.body.strip():
        raise HTTPException(status_code=400, detail="Title and body are required.")

    sent = send_push_to_user(
        uid,
        request.title.strip(),
        request.body.strip(),
        request.actionRoute,
    )

    return {"success": sent}


@router.post("/test")
def test_notification(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    uid = _verify_firebase_token(authorization)

    sent = send_push_to_user(
        uid,
        "Test Notification",
        "Push notifications are working!",
        "/home",
    )

    return {"success": sent}