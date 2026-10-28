"""Branded "verify your email" message, sent from noreply@scanmycard.in.

Firebase's built-in verification email can't be redesigned, so the server makes
the same verification link (Firebase Admin) and sends its own HTML email through
Hostinger SMTP. The app calls /account/send-verification-email.
"""
import asyncio
import html
import os
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from payments import _get_firestore, _verify_firebase_claims

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "noreply@scanmycard.in")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "wecanserve23@gmail.com")
LOGO_URL = "https://scanmycard.in/assets/images/app-icon-256.png"
FREE_SCANS = 10

MIN_SECONDS_BETWEEN_SENDS = 60
MAX_SENDS_PER_DAY = 10

router = APIRouter(prefix="/account", tags=["account"])


def build_email(name: str, link: str) -> tuple[str, str]:
    """Returns (plain text, html) for the verification email."""
    first_name = (name or "").strip().split(" ")[0] or "there"
    safe_name = html.escape(first_name)
    safe_link = html.escape(link, quote=True)
    safe_support = html.escape(SUPPORT_EMAIL)

    text = (
        f"Hi {first_name},\n\n"
        f"Welcome to ScanMyCard! Please confirm your email address to unlock your "
        f"{FREE_SCANS} free business card scans:\n\n{link}\n\n"
        "This link expires in 1 hour. If you didn't create a ScanMyCard account, "
        "you can ignore this email.\n\n"
        f"Need help? Write to {SUPPORT_EMAIL} or WhatsApp +91 90290 05313.\n\n"
        "— The ScanMyCard team\nhttps://scanmycard.in\n"
    )

    body = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#F5F8F6;">
<div style="display:none;max-height:0;overflow:hidden;">Confirm your email to unlock {FREE_SCANS} free scans.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F8F6;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

<tr><td align="center" style="padding-bottom:20px;">
<img src="{LOGO_URL}" width="56" height="56" alt="ScanMyCard" style="display:block;border:0;border-radius:14px;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#17261D;padding-top:10px;">ScanMyCard</div>
</td></tr>

<tr><td style="background:#FFFFFF;border:1px solid #DCE5DF;border-radius:20px;padding:36px 32px;font-family:Arial,Helvetica,sans-serif;color:#17261D;">
<div style="font-size:24px;font-weight:bold;line-height:1.3;">Confirm your email address</div>
<div style="font-size:16px;line-height:1.6;color:#22332A;padding-top:14px;">
Hi {safe_name},<br><br>
Welcome to ScanMyCard! Tap the button below to verify your email and unlock your
<strong>{FREE_SCANS} free business card scans</strong>.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
<tr><td align="center" bgcolor="#09A84E" style="border-radius:14px;">
<a href="{safe_link}" style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:14px;">Verify my email</a>
</td></tr>
</table>

<div style="font-size:14px;line-height:1.6;color:#22332A;">
After verifying, go back to the app and tap <strong>&ldquo;I&rsquo;ve verified&rdquo;</strong>.
This link expires in 1 hour.
</div>

<div style="font-size:13px;line-height:1.6;color:#33463A;padding-top:22px;border-top:1px solid #EDF2EE;margin-top:24px;">
Button not working? Copy this link into your browser:<br>
<a href="{safe_link}" style="color:#067A3A;word-break:break-all;">{safe_link}</a>
</div>
</td></tr>

<tr><td align="center" style="padding:22px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:#33463A;">
Didn&rsquo;t create a ScanMyCard account? You can safely ignore this email.<br>
Need help? <a href="mailto:{safe_support}" style="color:#067A3A;">{safe_support}</a> &middot;
<a href="https://wa.me/919029005313" style="color:#067A3A;">WhatsApp</a><br>
ScanMyCard by WeCanServe &middot; <a href="https://scanmycard.in" style="color:#067A3A;">scanmycard.in</a>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""
    return text, body


def _send(to_email: str, subject: str, text: str, html_body: str):
    if not SMTP_PASSWORD:
        raise RuntimeError("SMTP_PASSWORD is not configured.")

    message = EmailMessage()
    message["From"] = formataddr(("ScanMyCard", SMTP_USER))
    message["To"] = to_email
    message["Reply-To"] = SUPPORT_EMAIL
    message["Subject"] = subject
    message["Message-ID"] = make_msgid(domain="scanmycard.in")
    message.set_content(text)
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=20) as smtp:
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(message)


def _check_rate_limit(uid: str):
    """At most one email per minute and MAX_SENDS_PER_DAY per day, per account."""
    db = _get_firestore()
    ref = db.collection("verificationEmails").document(uid)
    now = int(time.time())
    today = time.strftime("%Y-%m-%d", time.gmtime(now))

    @firestore.transactional
    def check(transaction):
        snapshot = ref.get(transaction=transaction)
        data = snapshot.to_dict() if snapshot.exists else {}
        last = int(data.get("lastSentAt", 0) or 0)
        count = int(data.get("count", 0) or 0) if data.get("day") == today else 0

        if now - last < MIN_SECONDS_BETWEEN_SENDS:
            raise HTTPException(
                status_code=429,
                detail={"code": "TOO_SOON", "message": "An email was sent recently. Please wait a minute and try again."},
            )
        if count >= MAX_SENDS_PER_DAY:
            raise HTTPException(
                status_code=429,
                detail={"code": "DAILY_LIMIT", "message": "Too many emails today. Please try again tomorrow."},
            )

        transaction.set(ref, {"lastSentAt": now, "day": today, "count": count + 1})

    check(db.transaction())


def _send_verification(uid: str, email: str, name: str):
    _check_rate_limit(uid)

    if not name:
        snapshot = _get_firestore().collection("users").document(uid).get()
        name = (snapshot.to_dict() or {}).get("name", "") if snapshot.exists else ""

    link = firebase_auth.generate_email_verification_link(email)
    text, html_body = build_email(name, link)
    _send(email, "Verify your email for ScanMyCard", text, html_body)


@router.post("/send-verification-email")
async def send_verification_email(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    claims = _verify_firebase_claims(authorization)
    email = claims.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="This account has no email address.")

    if claims.get("email_verified"):
        return {"sent": False, "alreadyVerified": True}

    try:
        await asyncio.to_thread(_send_verification, claims["uid"], email, claims.get("name") or "")
    except HTTPException:
        raise
    except Exception as error:
        print("[VerifyEmail] Send failed:", type(error).__name__)
        raise HTTPException(status_code=502, detail="Could not send the email. Please try again.")

    return {"sent": True}
