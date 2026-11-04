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
    razorpay.payments[payment_id] = {
        "id": payment_id,
        "order_id": order_id,
        "amount": amount,
        "currency": currency,
        "status": "captured" if status == "paid" else "authorized",
    }
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
    assert order["notes"] == {"uid": "uid-alice", "plan": PACK, "credits": "330"}


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
    assert first.json()["scanPack"]["totalScans"] == 335
    assert second.status_code == 200
    assert second.json()["message"] == "Payment was already processed."
    assert recovered.status_code == 200

    user = db.docs["users/uid-alice"]
    assert user["totalScans"] == 335
    assert user["usedScans"] == 3
    assert user["packId"] == PACK
    assert db.docs["processedPayments/pay_1"]["creditsAdded"] == 330
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
    assert user["totalScans"] == 335
    assert user["usedScans"] == 5


def test_order_keeps_its_deal_after_a_price_change(client, db, razorpay, monkeypatch):
    db.docs["users/uid-alice"] = {"totalScans": 0, "usedScans": 0}
    order = client.post("/payments/create-order", json={"plan": PACK}, headers=auth()).json()
    razorpay.orders[order["order_id"]]["status"] = "paid"
    razorpay.payments["pay_9"] = {"id": "pay_9", "order_id": order["order_id"], "amount": order["amount"],
                                  "currency": "INR", "status": "captured"}
    # The pack changes after the customer paid.
    monkeypatch.setitem(payments.PLAN_PRICES, PACK, 599)
    monkeypatch.setitem(payments.PLAN_SCAN_LIMITS, PACK, 500)

    response = client.post("/payments/verify", headers=auth(), json={
        "razorpay_order_id": order["order_id"], "razorpay_payment_id": "pay_9", "razorpay_signature": "sig_ok"})

    assert response.status_code == 200
    assert db.docs["users/uid-alice"]["totalScans"] == 330
    assert db.docs["processedPayments/pay_9"]["amount"] == PRICE_PAISE


def _webhook(client, razorpay, monkeypatch, body, signature="sig_ok"):
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec")
    return client.post("/payments/webhook", content=body,
                       headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"})


def _captured_event(payment_id="pay_1", order_id="order_1"):
    import json
    return json.dumps({"event": "payment.captured",
                       "payload": {"payment": {"entity": {"id": payment_id, "order_id": order_id}}}})


def test_webhook_adds_credits_when_app_never_confirmed(client, db, razorpay, monkeypatch, pushes):
    db.docs["users/uid-alice"] = {"totalScans": 10, "usedScans": 2}
    paid_order(razorpay)

    first = _webhook(client, razorpay, monkeypatch, _captured_event())
    again = _webhook(client, razorpay, monkeypatch, _captured_event())
    app_verify = client.post("/payments/verify", json=paid_order(razorpay), headers=auth())

    assert first.status_code == 200 and first.json()["status"] == "ok"
    assert again.status_code == 200
    assert app_verify.json()["message"] == "Payment was already processed."
    assert db.docs["users/uid-alice"]["totalScans"] == 340
    assert len(pushes) == 1


def test_webhook_rejects_bad_signature(client, db, razorpay, monkeypatch):
    db.docs["users/uid-alice"] = {"totalScans": 10, "usedScans": 0}
    paid_order(razorpay)
    razorpay.bad_webhook = True

    response = _webhook(client, razorpay, monkeypatch, _captured_event())

    assert response.status_code == 400
    assert db.docs["users/uid-alice"]["totalScans"] == 10


def test_webhook_skips_refunded_payment(client, db, razorpay, monkeypatch):
    db.docs["users/uid-alice"] = {"totalScans": 10, "usedScans": 0}
    paid_order(razorpay)
    razorpay.payments["pay_1"]["amount_refunded"] = PRICE_PAISE

    response = _webhook(client, razorpay, monkeypatch, _captured_event())

    assert response.json()["status"] == "skipped"
    assert db.docs["users/uid-alice"]["totalScans"] == 10
