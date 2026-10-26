import payments
from conftest import auth

PACK = "personal_popular"
PRICE_PAISE = payments._plan_total_rupees(PACK) * 100  # 499 + 18% GST = 589 rupees


def paid_order(razorpay, uid="uid-alice", pack=PACK, amount=PRICE_PAISE, order_id="order_1",
               payment_id="pay_1", status="paid", currency="INR"):
    razorpay.orders[order_id] = {
        "id": order_id,
        "amount": amount,
        "status": status,
        "notes": {"uid": uid, "plan": pack},
    }
    razorpay.payments[payment_id] = {"id": payment_id, "amount": amount, "currency": currency}
    return {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "sig_ok",
    }


def test_gst_price():
    assert payments._plan_total_rupees("personal_starter") == 117
    assert payments._plan_total_rupees("business_enterprise") == 7079


def test_create_order_uses_server_price(client, razorpay):
    response = client.post("/payments/create-order", json={"plan": PACK}, headers=auth())

    assert response.status_code == 200
    body = response.json()
    assert body["amount"] == PRICE_PAISE
    order = razorpay.orders[body["order_id"]]
    assert order["notes"] == {"uid": "uid-alice", "plan": PACK}


def test_create_order_rejects_unknown_plan(client):
    response = client.post("/payments/create-order", json={"plan": "free_forever"}, headers=auth())
    assert response.status_code == 400


def test_verify_adds_credits_once(client, db, razorpay, pushes):
    db.docs["users/uid-alice"] = {"totalScans": 5, "usedScans": 3}
    payload = paid_order(razorpay)

    first = client.post("/payments/verify", json=payload, headers=auth())
    second = client.post("/payments/verify", json=payload, headers=auth())
    recovered = client.post("/payments/recover", json=payload, headers=auth())

    assert first.status_code == 200
    assert first.json()["scanPack"]["totalScans"] == 755
    assert second.status_code == 200
    assert second.json()["message"] == "Payment was already processed."
    assert recovered.status_code == 200

    user = db.docs["users/uid-alice"]
    assert user["totalScans"] == 755
    assert user["usedScans"] == 3
    assert user["packId"] == PACK
    assert db.docs["processedPayments/pay_1"]["creditsAdded"] == 750
    assert len(pushes) == 1


def test_verify_rejects_bad_signature(client, db, razorpay):
    db.docs["users/uid-alice"] = {"totalScans": 5, "usedScans": 0}
    payload = paid_order(razorpay)
    razorpay.bad_signatures.add("sig_ok")

    response = client.post("/payments/verify", json=payload, headers=auth())

    assert response.status_code == 400
    assert db.docs["users/uid-alice"]["totalScans"] == 5


def test_verify_rejects_someone_elses_order(client, db, razorpay):
    db.docs["users/uid-mallory"] = {"totalScans": 5, "usedScans": 0}
    payload = paid_order(razorpay, uid="uid-alice")

    response = client.post("/payments/verify", json=payload, headers=auth("uid-mallory"))

    assert response.status_code == 403
    assert db.docs["users/uid-mallory"]["totalScans"] == 5


def test_verify_rejects_wrong_amount(client, db, razorpay):
    db.docs["users/uid-alice"] = {"totalScans": 5, "usedScans": 0}
    payload = paid_order(razorpay, amount=100)

    response = client.post("/payments/verify", json=payload, headers=auth())

    assert response.status_code == 400
    assert db.docs["users/uid-alice"]["totalScans"] == 5


def test_verify_rejects_unpaid_order(client, db, razorpay):
    db.docs["users/uid-alice"] = {"totalScans": 5, "usedScans": 0}
    payload = paid_order(razorpay, status="attempted")

    response = client.post("/payments/verify", json=payload, headers=auth())

    assert response.status_code == 400


def test_recover_rejects_wrong_amount(client, db, razorpay):
    db.docs["users/uid-alice"] = {"totalScans": 5, "usedScans": 0}
    payload = paid_order(razorpay, amount=100)

    response = client.post("/payments/recover", json=payload, headers=auth())

    assert response.status_code == 400
    assert db.docs["users/uid-alice"]["totalScans"] == 5


def test_purchase_on_old_free_account(client, db, razorpay):
    db.docs["users/uid-alice"] = {"freeScanLimit": 5, "freeScansUsed": 5}
    payload = paid_order(razorpay)

    response = client.post("/payments/verify", json=payload, headers=auth())

    assert response.status_code == 200
    user = db.docs["users/uid-alice"]
    assert user["totalScans"] == 755
    assert user["usedScans"] == 5
