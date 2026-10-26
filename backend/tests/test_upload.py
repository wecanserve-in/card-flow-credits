import main
from conftest import auth


def fake_cards(cards):
    return [
        {"card_no": card["card_no"], "name": f"Person {card['card_no']}", "email": "Not available"}
        for card in cards
    ]


def images(count):
    return [("files", (f"card{i}.jpg", b"\xff\xd8fake-jpeg", "image/jpeg")) for i in range(count)]


def set_user(db, uid="uid-alice", **fields):
    db.docs[f"users/{uid}"] = fields


def test_requires_login(client):
    response = client.post("/upload", files=images(1))
    assert response.status_code == 401

    response = client.post("/upload", files=images(1), headers={"Authorization": "Bearer junk"})
    assert response.status_code == 401


def test_scan_deducts_credits_on_server(client, db, monkeypatch):
    set_user(db, totalScans=5, usedScans=1)
    monkeypatch.setattr(main, "extract_multiple_with_gemini", fake_cards)

    response = client.post("/upload", files=images(3), headers=auth())

    assert response.status_code == 200
    body = response.json()
    assert body["total_cards"] == 3
    assert [card["filename"] for card in body["cards"]] == ["card0.jpg", "card1.jpg", "card2.jpg"]
    assert body["credits"] == {"total": 5, "used": 4, "remaining": 1}
    assert db.docs["users/uid-alice"]["usedScans"] == 4


def test_not_enough_credits_is_rejected_before_gemini(client, db, monkeypatch):
    set_user(db, totalScans=5, usedScans=4)
    calls = []
    monkeypatch.setattr(main, "extract_multiple_with_gemini", lambda cards: calls.append(cards) or [])

    response = client.post("/upload", files=images(2), headers=auth())

    assert response.status_code == 402
    detail = response.json()["detail"]
    assert detail["code"] == "INSUFFICIENT_CREDITS"
    assert detail["remaining"] == 1
    assert calls == []
    assert db.docs["users/uid-alice"]["usedScans"] == 4


def test_zero_credits_is_rejected(client, db, monkeypatch):
    set_user(db, totalScans=5, usedScans=5)
    monkeypatch.setattr(main, "extract_multiple_with_gemini", fake_cards)

    response = client.post("/upload", files=images(1), headers=auth())

    assert response.status_code == 402


def test_gemini_failure_refunds_credits(client, db, monkeypatch):
    set_user(db, totalScans=10, usedScans=2)

    def boom(cards):
        raise RuntimeError("Gemini down")

    monkeypatch.setattr(main, "extract_multiple_with_gemini", boom)

    response = client.post("/upload", files=images(3), headers=auth())

    assert response.status_code == 500
    assert "No credits were used" in response.json()["detail"]
    assert db.docs["users/uid-alice"]["usedScans"] == 2


def test_old_accounts_with_free_scan_fields_still_work(client, db, monkeypatch):
    set_user(db, freeScanLimit=5, freeScansUsed=2)
    monkeypatch.setattr(main, "extract_multiple_with_gemini", fake_cards)

    response = client.post("/upload", files=images(2), headers=auth())

    assert response.status_code == 200
    assert response.json()["credits"] == {"total": 5, "used": 4, "remaining": 1}
    assert db.docs["users/uid-alice"]["totalScans"] == 5
    assert db.docs["users/uid-alice"]["usedScans"] == 4


def test_missing_account_is_rejected(client, db, monkeypatch):
    monkeypatch.setattr(main, "extract_multiple_with_gemini", fake_cards)

    response = client.post("/upload", files=images(1), headers=auth())

    assert response.status_code == 404


def test_too_many_cards_in_one_request(client, db, monkeypatch):
    set_user(db, totalScans=1000, usedScans=0)
    monkeypatch.setattr(main, "extract_multiple_with_gemini", fake_cards)

    response = client.post(
        "/upload", files=images(main.MAX_CARDS_PER_REQUEST + 1), headers=auth()
    )

    assert response.status_code == 400
    assert db.docs["users/uid-alice"]["usedScans"] == 0


def test_empty_image_is_rejected(client, db, monkeypatch):
    set_user(db, totalScans=5, usedScans=0)
    monkeypatch.setattr(main, "extract_multiple_with_gemini", fake_cards)

    response = client.post(
        "/upload", files=[("files", ("empty.jpg", b"", "image/jpeg"))], headers=auth()
    )

    assert response.status_code == 400
    assert db.docs["users/uid-alice"]["usedScans"] == 0
