import free_scans
from conftest import auth

PHONE_A = "android-id-aaaa-1111"
PHONE_B = "android-id-bbbb-2222"


def new_account(db, uid):
    db.docs[f"users/{uid}"] = {"totalScans": 0, "usedScans": 0, "freeScansStatus": "pending"}


def claim(client, uid, device=PHONE_A, email=None, code=None):
    body = {"deviceId": device}
    if code is not None:
        body["referralCode"] = code
    return client.post("/account/claim-free-scans", json=body, headers=auth(uid, email))


def code_for(client, db, uid):
    if f"users/{uid}" not in db.docs:
        db.docs[f"users/{uid}"] = {"totalScans": 5, "usedScans": 0}
    return client.post("/account/referral-code", headers=auth(uid)).json()["code"]


def test_new_verified_account_gets_10(client, db):
    new_account(db, "uid-alice")

    response = claim(client, "uid-alice")

    assert response.status_code == 200
    assert response.json()["status"] == "granted"
    assert response.json()["credits"] == {"total": 10, "used": 0, "remaining": 10}
    assert db.docs["users/uid-alice"]["totalScans"] == 10
    assert db.docs["users/uid-alice"]["freeScansStatus"] == "granted"


def test_claiming_twice_does_not_add_more(client, db):
    new_account(db, "uid-alice")

    claim(client, "uid-alice")
    second = claim(client, "uid-alice")

    assert second.json()["status"] == "granted"
    assert db.docs["users/uid-alice"]["totalScans"] == 10


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


def test_different_person_on_different_phone_gets_10(client, db):
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


# ------------------------------------------------------------------ referrals


def test_referral_code_is_permanent_and_unique(client, db):
    first = code_for(client, db, "uid-alice")
    again = code_for(client, db, "uid-alice")
    other = code_for(client, db, "uid-bob")

    assert first == again
    assert first != other
    assert len(first) == 6
    assert db.docs[f"referralCodes/{first}"]["uid"] == "uid-alice"


def test_referral_check(client, db):
    code = code_for(client, db, "uid-alice")

    assert client.get(f"/account/referral-check?code={code.lower()}").json()["valid"] is True
    assert client.get("/account/referral-check?code=ZZZZZZ").json()["valid"] is False
    assert client.get("/account/referral-check?code=hello world").json()["valid"] is False


def test_friend_signup_gives_referrer_10(client, db, pushes):
    code = code_for(client, db, "uid-alice")
    new_account(db, "uid-friend")

    response = claim(client, "uid-friend", device=PHONE_B, code=code)

    assert response.json()["status"] == "granted"
    assert response.json()["referralApplied"] is True
    assert response.json()["granted"] == 20
    assert db.docs["users/uid-friend"]["totalScans"] == 20
    assert db.docs["users/uid-friend"]["referredBy"] == "uid-alice"
    alice = db.docs["users/uid-alice"]
    assert alice["totalScans"] == 15
    assert alice["referralCount"] == 1
    assert alice["referralScansEarned"] == 10
    assert pushes[-1][0] == "uid-alice"


def test_two_friends_give_20(client, db):
    code = code_for(client, db, "uid-alice")
    new_account(db, "uid-f1")
    new_account(db, "uid-f2")

    claim(client, "uid-f1", device=PHONE_A, code=code)
    claim(client, "uid-f2", device=PHONE_B, code=code)

    assert db.docs["users/uid-alice"]["totalScans"] == 25
    assert db.docs["users/uid-alice"]["referralCount"] == 2


def test_claiming_again_does_not_reward_twice(client, db):
    code = code_for(client, db, "uid-alice")
    new_account(db, "uid-friend")

    claim(client, "uid-friend", device=PHONE_B, code=code)
    claim(client, "uid-friend", device=PHONE_B, code=code)

    assert db.docs["users/uid-alice"]["totalScans"] == 15


def test_fake_account_on_same_phone_earns_referrer_nothing(client, db):
    code = code_for(client, db, "uid-alice")
    new_account(db, "uid-friend")
    new_account(db, "uid-fake")

    claim(client, "uid-friend", device=PHONE_B, code=code)
    response = claim(client, "uid-fake", device=PHONE_B, code=code)

    assert response.json()["status"] == "already_used"
    assert response.json()["referralApplied"] is False
    assert db.docs["users/uid-alice"]["totalScans"] == 15


def test_unverified_friend_earns_referrer_nothing(client, db):
    code = code_for(client, db, "uid-alice")
    new_account(db, "uid-friend-unverified")

    claim(client, "uid-friend-unverified", device=PHONE_B, code=code)

    assert db.docs["users/uid-alice"]["totalScans"] == 5


def test_own_code_gives_nothing_extra(client, db):
    new_account(db, "uid-alice")
    code = client.post("/account/referral-code", headers=auth("uid-alice")).json()["code"]

    response = claim(client, "uid-alice", device=PHONE_A, code=code)

    assert response.json()["referralApplied"] is False
    assert db.docs["users/uid-alice"]["totalScans"] == 10


def test_unknown_code_still_gives_welcome_gift(client, db):
    new_account(db, "uid-friend")

    response = claim(client, "uid-friend", device=PHONE_B, code="ZZZZZZ")

    assert response.json()["status"] == "granted"
    assert response.json()["referralApplied"] is False
    assert db.docs["users/uid-friend"]["totalScans"] == 10


def test_code_normalization():
    assert free_scans.normalize_code(" k7p-2qx ") == "K7P2QX"
    assert free_scans.normalize_code("O0I1L1") == ""  # confusing letters are never used
    assert free_scans.normalize_code("TOOLONGCODE") == ""
