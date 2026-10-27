import free_scans
from conftest import auth

PHONE_A = "android-id-aaaa-1111"
PHONE_B = "android-id-bbbb-2222"


def new_account(db, uid):
    db.docs[f"users/{uid}"] = {"totalScans": 0, "usedScans": 0, "freeScansStatus": "pending"}


def claim(client, uid, device=PHONE_A, email=None):
    return client.post(
        "/account/claim-free-scans", json={"deviceId": device}, headers=auth(uid, email)
    )


def test_new_verified_account_gets_25(client, db):
    new_account(db, "uid-alice")

    response = claim(client, "uid-alice")

    assert response.status_code == 200
    assert response.json()["status"] == "granted"
    assert response.json()["credits"] == {"total": 25, "used": 0, "remaining": 25}
    assert db.docs["users/uid-alice"]["totalScans"] == 25
    assert db.docs["users/uid-alice"]["freeScansStatus"] == "granted"


def test_claiming_twice_does_not_add_more(client, db):
    new_account(db, "uid-alice")

    claim(client, "uid-alice")
    second = claim(client, "uid-alice")

    assert second.json()["status"] == "granted"
    assert db.docs["users/uid-alice"]["totalScans"] == 25


def test_unverified_email_gets_nothing(client, db):
    new_account(db, "uid-fake-unverified")

    response = claim(client, "uid-fake-unverified")

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"
    assert db.docs["users/uid-fake-unverified"]["totalScans"] == 0


def test_second_account_on_same_phone_gets_nothing(client, db):
    new_account(db, "uid-alice")
    new_account(db, "uid-alice2")

    claim(client, "uid-alice", device=PHONE_A)
    response = claim(client, "uid-alice2", device=PHONE_A)

    assert response.json()["status"] == "already_used"
    assert db.docs["users/uid-alice2"]["totalScans"] == 0
    assert db.docs["users/uid-alice2"]["freeScansStatus"] == "already_used"


def test_same_gmail_alias_on_another_phone_gets_nothing(client, db):
    new_account(db, "uid-one")
    new_account(db, "uid-two")

    claim(client, "uid-one", device=PHONE_A, email="john.doe@gmail.com")
    response = claim(client, "uid-two", device=PHONE_B, email="JohnDoe+promo@googlemail.com")

    assert response.json()["status"] == "already_used"
    assert db.docs["users/uid-two"]["totalScans"] == 0


def test_different_person_on_different_phone_gets_25(client, db):
    new_account(db, "uid-one")
    new_account(db, "uid-two")

    claim(client, "uid-one", device=PHONE_A)
    response = claim(client, "uid-two", device=PHONE_B)

    assert response.json()["status"] == "granted"


def test_old_account_is_not_topped_up(client, db):
    db.docs["users/uid-old"] = {"totalScans": 5, "usedScans": 2}

    response = claim(client, "uid-old")

    assert response.json()["status"] == "not_eligible"
    assert db.docs["users/uid-old"]["totalScans"] == 5


def test_deleted_and_recreated_account_gets_nothing(client, db):
    new_account(db, "uid-alice")
    claim(client, "uid-alice")

    # /account/delete removes the user's own documents but not the gift records.
    del db.docs["users/uid-alice"]

    new_account(db, "uid-alice-again")
    again = claim(client, "uid-alice-again")

    assert again.json()["status"] == "already_used"
    assert db.docs["users/uid-alice-again"]["totalScans"] == 0


def test_bad_device_id_is_rejected(client, db):
    new_account(db, "uid-alice")

    response = claim(client, "uid-alice", device="x")

    assert response.status_code == 400


def test_email_normalization():
    assert free_scans.normalize_email("J.Doe+x@GoogleMail.com") == "jdoe@gmail.com"
    assert free_scans.normalize_email("a.b+c@zuvius.com") == "a.b@zuvius.com"
