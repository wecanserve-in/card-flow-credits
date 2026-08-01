import os
import time
from pathlib import Path
from typing import Optional

import firebase_admin
import razorpay

from dotenv import load_dotenv

from fastapi import (
    APIRouter,
    Header,
    HTTPException,
)

from firebase_admin import (
    auth as firebase_auth,
    credentials,
    firestore,
)

from pydantic import BaseModel


load_dotenv()


# ───────────────────────────────────────────────
# Environment
# ───────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent


RAZORPAY_KEY_ID = os.getenv(
    "RAZORPAY_KEY_ID",
    "",
).strip()


RAZORPAY_KEY_SECRET = os.getenv(
    "RAZORPAY_KEY_SECRET",
    "",
).strip()


SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    str(BASE_DIR / "serviceAccountKey.json"),
).strip()


FIREBASE_PROJECT_ID = os.getenv(
    "FIREBASE_PROJECT_ID",
    "",
).strip()



if not RAZORPAY_KEY_ID:
    raise RuntimeError(
        "RAZORPAY_KEY_ID missing."
    )


if not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        "RAZORPAY_KEY_SECRET missing."
    )



# ───────────────────────────────────────────────
# Razorpay Client
# ───────────────────────────────────────────────

client = razorpay.Client(
    auth=(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
    )
)



# ───────────────────────────────────────────────
# Firebase Admin
# ───────────────────────────────────────────────

def _initialize_firebase_admin():

    if firebase_admin._apps:
        return


    service_account_file = Path(
        SERVICE_ACCOUNT_PATH
    )


    if not service_account_file.is_absolute():

        service_account_file = (
            BASE_DIR /
            service_account_file
        ).resolve()


    if not service_account_file.exists():

        raise RuntimeError(
            f"Firebase JSON missing: {service_account_file}"
        )


    firebase_credential = credentials.Certificate(
        str(service_account_file)
    )


    firebase_admin.initialize_app(
        firebase_credential,
        {
            "projectId":
                FIREBASE_PROJECT_ID
                or firebase_credential.project_id
        }
    )


    print(
        "[Firebase Admin] Initialized successfully"
    )



_initialize_firebase_admin()



def _get_firestore():

    return firestore.client()



# ───────────────────────────────────────────────
# Scan Packs
# ───────────────────────────────────────────────

PLAN_PRICES = {

    "quick_start": 99,

    "event_pack": 499,

    "professional": 1499,

    "exhibition_plus": 4990,

}



PLAN_SCAN_LIMITS = {

    "quick_start": 50,

    "event_pack": 250,

    "professional": 1000,

    "exhibition_plus": 5000,

}



PLAN_NAMES = {

    "quick_start":
        "Quick Start",

    "event_pack":
        "Event Pack",

    "professional":
        "Professional",

    "exhibition_plus":
        "Exhibition Plus",

}



# ───────────────────────────────────────────────
# Models
# ───────────────────────────────────────────────

class CreateOrderRequest(BaseModel):

    plan: str



class VerifyPaymentRequest(BaseModel):

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str



# ───────────────────────────────────────────────
# Router
# ───────────────────────────────────────────────

router = APIRouter(

    prefix="/payments",

    tags=["Payments"],

)



# ───────────────────────────────────────────────
# Firebase Token Verification
# ───────────────────────────────────────────────

def _verify_firebase_token(
    authorization: Optional[str]
):

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header."
        )


    parts = authorization.strip().split(
        " ",
        1
    )


    if (
        len(parts) != 2
        or parts[0].lower() != "bearer"
        or not parts[1].strip()
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format."
        )


    token = parts[1].strip()


    try:

        decoded = firebase_auth.verify_id_token(
            token
        )


        uid = decoded.get(
            "uid"
        )


        if not uid:

            raise Exception(
                "UID missing from Firebase token"
            )


        print(
            "[Firebase Auth] Verified UID:",
            uid
        )


        return uid



    except Exception as error:

        print(
            "[Firebase Auth Error]",
            error
        )


        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase token."
        )
    # ───────────────────────────────────────────────
# Create Razorpay Order
# ───────────────────────────────────────────────

@router.post("/create-order")
def create_order(

    request: CreateOrderRequest,

    authorization:
        Optional[str] = Header(
            default=None,
            alias="Authorization"
        ),

):


    uid = _verify_firebase_token(
        authorization
    )


    pack_id = (
        request.plan
        .strip()
        .lower()
    )


    if pack_id not in PLAN_PRICES:

        raise HTTPException(

            status_code=400,

            detail="Invalid scan pack."

        )



    amount = (
        PLAN_PRICES[pack_id]
        * 100
    )



    try:


        order = client.order.create(

            {

                "amount":
                    amount,


                "currency":
                    "INR",


                "payment_capture":
                    1,


                "notes":

                    {

                        "uid":
                            uid,


                        "plan":
                            pack_id,

                    }

            }

        )


    except Exception as error:


        print(
            "[Razorpay Order Error]",
            error
        )


        raise HTTPException(

            status_code=502,

            detail="Unable to create payment order."

        )



    print(
        "[Razorpay] Order created:",
        order["id"],
        "UID:",
        uid,
        "Pack:",
        pack_id
    )



    return {


        "success":
            True,


        "order_id":
            order["id"],


        "amount":
            order["amount"],


        "currency":
            order["currency"],


        "key":
            RAZORPAY_KEY_ID,


        "plan":
            pack_id,

    }
# ───────────────────────────────────────────────
# Verify Payment + Add Scan Credits
# ───────────────────────────────────────────────

@router.post("/verify")
def verify_payment(

    data: VerifyPaymentRequest,

    authorization:
        Optional[str] = Header(
            default=None,
            alias="Authorization"
        ),

):


    uid = _verify_firebase_token(
        authorization
    )



    # ───────────────────────────────────────────
    # Verify Razorpay Signature
    # ───────────────────────────────────────────

    try:

        client.utility.verify_payment_signature(

            {

                "razorpay_order_id":
                    data.razorpay_order_id,


                "razorpay_payment_id":
                    data.razorpay_payment_id,


                "razorpay_signature":
                    data.razorpay_signature,

            }

        )


    except Exception as error:

        print(
            "[Razorpay Signature Error]",
            error
        )


        raise HTTPException(
            status_code=400,
            detail="Payment verification failed."
        )



    # ───────────────────────────────────────────
    # Fetch Razorpay Data
    # ───────────────────────────────────────────

    try:

        order = client.order.fetch(
            data.razorpay_order_id
        )


        payment = client.payment.fetch(
            data.razorpay_payment_id
        )


    except Exception as error:

        print(
            "[Razorpay Fetch Error]",
            error
        )


        raise HTTPException(
            status_code=502,
            detail="Unable to fetch payment details."
        )



    notes = order.get(
        "notes",
        {}
    )


    order_uid = str(
        notes.get("uid", "")
    )


    pack_id = str(
        notes.get("plan", "")
    ).lower()



    if order_uid != uid:

        raise HTTPException(
            status_code=403,
            detail="Order does not belong to user."
        )



    if pack_id not in PLAN_PRICES:

        raise HTTPException(
            status_code=400,
            detail="Invalid scan pack."
        )



    expected_amount = (
        PLAN_PRICES[pack_id]
        * 100
    )



    if (
        order.get("amount") != expected_amount
        or
        payment.get("amount") != expected_amount
    ):

        raise HTTPException(
            status_code=400,
            detail="Payment amount mismatch."
        )



    if payment.get("currency") != "INR":

        raise HTTPException(
            status_code=400,
            detail="Invalid currency."
        )



    if order.get("status") != "paid":

        raise HTTPException(
            status_code=400,
            detail="Order not paid."
        )



    # ───────────────────────────────────────────
    # Firestore Update
    # ───────────────────────────────────────────

    db = _get_firestore()



    user_ref = (
        db.collection("users")
        .document(uid)
    )



    payment_ref = (
        db.collection("processedPayments")
        .document(
            data.razorpay_payment_id
        )
    )



    now = int(
        time.time() * 1000
    )



    pack_name = PLAN_NAMES.get(
        pack_id,
        "Scan Pack"
    )



    purchased_scans = PLAN_SCAN_LIMITS.get(
        pack_id,
        0
    )



    if purchased_scans <= 0:

        raise HTTPException(
            status_code=500,
            detail="Invalid scan configuration."
        )



    transaction = db.transaction()



    @firestore.transactional
    def add_scan_credits(transaction):


        payment_snapshot = payment_ref.get(
            transaction=transaction
        )


        user_snapshot = user_ref.get(
            transaction=transaction
        )


        user_data = (

            user_snapshot.to_dict()

            if user_snapshot.exists

            else {}

        )



        # Prevent duplicate credits

        if payment_snapshot.exists:


            return {

                "packId":
                    user_data.get(
                        "packId",
                        pack_id
                    ),


                "packName":
                    user_data.get(
                        "packName",
                        pack_name
                    ),


                "totalScans":
                    user_data.get(
                        "totalScans",
                        0
                    ),


                "usedScans":
                    user_data.get(
                        "usedScans",
                        0
                    ),


                "remainingScans":
                    user_data.get(
                        "remainingScans",
                        0
                    ),


                "alreadyProcessed":
                    True,

            }



        old_total = int(
            user_data.get(
                "totalScans",
                0
            ) or 0
        )


        used = int(
            user_data.get(
                "usedScans",
                0
            ) or 0
        )



        new_total = (
            old_total
            + purchased_scans
        )


        remaining = max(
            new_total - used,
            0
        )



        transaction.set(

            user_ref,

            {

                "packId":
                    pack_id,


                "packName":
                    pack_name,


                "totalScans":
                    new_total,


                "usedScans":
                    used,


                "remainingScans":
                    remaining,


                "lastPaymentId":
                    data.razorpay_payment_id,


                "lastOrderId":
                    data.razorpay_order_id,


                "updatedAt":
                    now,

            },


            merge=True

        )



        transaction.set(

            payment_ref,

            {

                "uid":
                    uid,


                "paymentId":
                    data.razorpay_payment_id,


                "orderId":
                    data.razorpay_order_id,


                "packId":
                    pack_id,


                "packName":
                    pack_name,


                "creditsAdded":
                    purchased_scans,


                "totalAfterPurchase":
                    new_total,


                "remainingAfterPurchase":
                    remaining,


                "amount":
                    expected_amount,


                "currency":
                    "INR",


                "processedAt":
                    now,

            }

        )



        return {

            "packId":
                pack_id,


            "packName":
                pack_name,


            "totalScans":
                new_total,


            "usedScans":
                used,


            "remainingScans":
                remaining,


            "alreadyProcessed":
                False,

        }



    result = add_scan_credits(
        transaction
    )



    print(
        "[Payment] Scan pack updated:",
        {
            "uid": uid,
            "packId": result["packId"],
            "totalScans": result["totalScans"],
            "usedScans": result["usedScans"],
            "remainingScans": result["remainingScans"],
            "alreadyProcessed":
                result["alreadyProcessed"],
        },
    )



    return {

        "success":
            True,


        "message":

            (
                "Payment was already processed."

                if result["alreadyProcessed"]

                else

                "Payment verified and scan credits added successfully."

            ),



        "scanPack":

            {

                "packId":
                    result["packId"],


                "packName":
                    result["packName"],


                "totalScans":
                    result["totalScans"],


                "usedScans":
                    result["usedScans"],


                "remainingScans":
                    result["remainingScans"],

            }

    }