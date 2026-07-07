import os
import razorpay
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import APIRouter

load_dotenv()

client = razorpay.Client(
    auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET"),
    )
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)

PLAN_PRICES = {
    "starter": 99,
    "pro": 199,
    "business": 499,
    "starter_yearly": 950,
    "pro_yearly": 1900,
    "business_yearly": 4790,
}


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.get("/test")
def test_payment():
    return {
        "success": True,
        "message": "Payment API is working 🚀",
    }


@router.get("/check-keys")
def check_keys():
    return {
        "key_id": os.getenv("RAZORPAY_KEY_ID"),
        "secret_found": os.getenv("RAZORPAY_KEY_SECRET") is not None,
    }


@router.post("/create-order")
def create_order(request: CreateOrderRequest):

    if request.plan not in PLAN_PRICES:
        return {
            "success": False,
            "message": "Invalid plan selected.",
        }

    amount = PLAN_PRICES[request.plan] * 100

    order = client.order.create(
        {
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1,
        }
    )

    return {
        "success": True,
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": os.getenv("RAZORPAY_KEY_ID"),
        "plan": request.plan,
    }


@router.post("/verify")
def verify_payment(data: VerifyPaymentRequest):
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature,
            }
        )

        # TODO:
        # Update Firebase / Database
        # Activate subscription
        # Save transaction

        return {
            "success": True,
            "message": "Payment Verified",
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
        }