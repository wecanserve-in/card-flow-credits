import pytest

import verification_email
from conftest import auth


@pytest.fixture
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr(
        verification_email.firebase_auth,
        "generate_email_verification_link",
        lambda email: f"https://card-flow-6da93.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc&email={email}",
    )
    monkeypatch.setattr(verification_email, "_send", lambda to, subject, text, html: sent.append((to, subject, text, html)))
    return sent


def test_sends_branded_email(client, db, outbox):
    db.docs["users/uid-ann-unverified"] = {"name": "Ann Lee"}

    response = client.post("/account/send-verification-email", headers=auth("uid-ann-unverified", "ann@example.com"))

    assert response.status_code == 200
    assert response.json() == {"sent": True}
    to, subject, text, html = outbox[0]
    assert to == "ann@example.com"
    assert subject == "Verify your email for ScanMyCard"
    assert "Hi Ann" in html and "Verify my email" in html and "oobCode=abc" in html
    assert "10 free" in text


def test_second_send_within_a_minute_is_refused(client, db, outbox):
    headers = auth("uid-ann-unverified", "ann@example.com")
    client.post("/account/send-verification-email", headers=headers)
    second = client.post("/account/send-verification-email", headers=headers)

    assert second.status_code == 429
    assert second.json()["detail"]["code"] == "TOO_SOON"
    assert len(outbox) == 1


def test_daily_limit(client, db, outbox, monkeypatch):
    headers = auth("uid-ann-unverified", "ann@example.com")
    clock = [1_800_000_000]
    monkeypatch.setattr(verification_email.time, "time", lambda: clock[0])

    for _ in range(verification_email.MAX_SENDS_PER_DAY):
        assert client.post("/account/send-verification-email", headers=headers).status_code == 200
        clock[0] += 61

    blocked = client.post("/account/send-verification-email", headers=headers)
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "DAILY_LIMIT"


def test_already_verified_sends_nothing(client, db, outbox):
    response = client.post("/account/send-verification-email", headers=auth("uid-bob", "bob@example.com"))

    assert response.json() == {"sent": False, "alreadyVerified": True}
    assert outbox == []


def test_name_is_html_escaped():
    _, html = verification_email.build_email("<script>x</script> Smith", "https://example.com/?a=1&b=2")
    assert "<script>" not in html
    assert "&amp;b=2" in html
