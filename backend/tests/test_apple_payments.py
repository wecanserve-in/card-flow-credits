"""Apple In-App Purchase: credits once per transaction, account check, refunds."""
from types import SimpleNamespace

import pytest

import apple_payments
from conftest import auth


def tx(**over):
    base = dict(
        bundleId="com.wecanserve.scanmycard",
        productId="com.wecanserve.scanmycard.popular",
        transactionId="2000000001",
        originalTransactionId="2000000001",
        revocationDate=None,
        appAccountToken=apple_payments.account_token_for("uid-alice"),
        quantity=1,
        currency="INR",
        price=589000,
        rawEnvironment="Sandbox",
    )
    base.update(over)
    return SimpleNamespace(**base)


@pytest.fixture
def signed(monkeypatch):
    """Maps a fake signed string to what Apple's verifier would decode."""
    table = {}

    def decode(kind, value):
        if value not in table:
            raise apple_payments.HTTPException(status_code=400, detail="Could not verify the Apple purchase.")
        return table[value]

    monkeypatch.setattr(apple_payments, "_decode", decode)
    return table


def verify(client, value, uid="uid-alice"):
    return client.post("/payments/apple/verify", json={"signedTransaction": value}, headers=auth(uid))


def test_purchase_adds_credits_once(client, db, signed):
    db.docs["users/uid-alice"] = {"totalScans": 10, "usedScans": 4}
    signed["jws1"] = tx()

    first = verify(client, "jws1")
    again = verify(client, "jws1")

    assert first.status_code == 200 and again.status_code == 200
    assert db.docs["users/uid-alice"]["totalScans"] == 340
    record = db.docs["processedPayments/apple_2000000001"]
    assert record["source"] == "apple"
    assert record["creditsAdded"] == 330
    assert record["amount"] == 58900
    assert "already processed" in again.json()["message"]


def test_bad_signature_rejected(client, db, signed):
    assert verify(client, "forged").status_code == 400


def test_other_users_purchase_rejected(client, db, signed):
    signed["jws1"] = tx()
    assert verify(client, "jws1", uid="uid-bob").status_code == 403
    assert "processedPayments/apple_2000000001" not in db.docs


def test_wrong_app_and_unknown_product_rejected(client, db, signed):
    signed["other-app"] = tx(bundleId="com.someone.else")
    signed["unknown"] = tx(productId="com.wecanserve.scanmycard.free_lunch")
    assert verify(client, "other-app").status_code == 400
    assert verify(client, "unknown").status_code == 400


def test_refunded_purchase_not_credited(client, db, signed):
    signed["jws1"] = tx(revocationDate=1700000000000)
    assert verify(client, "jws1").status_code == 400


def test_refund_notification_takes_back_unused_credits(client, db, signed):
    db.docs["users/uid-alice"] = {"totalScans": 10, "usedScans": 4}
    signed["jws1"] = tx()
    verify(client, "jws1")
    db.docs["users/uid-alice"]["usedScans"] = 100  # used some of the pack

    signed["note"] = SimpleNamespace(
        rawNotificationType="REFUND", data=SimpleNamespace(signedTransactionInfo="jws1")
    )
    first = client.post("/payments/apple/notifications", json={"signedPayload": "note"})
    again = client.post("/payments/apple/notifications", json={"signedPayload": "note"})

    assert first.status_code == 200 and again.status_code == 200
    # 340 - 330 = 10, but 100 are already used, so the balance stops at 100.
    assert db.docs["users/uid-alice"]["totalScans"] == 100
    assert db.docs["processedPayments/apple_2000000001"]["refunded"] is True


def test_account_token_matches_app_format():
    token = apple_payments.account_token_for("uid-alice")
    assert len(token) == 36 and token[14] == "4" and token[19] in "89ab"
