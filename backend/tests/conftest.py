"""Test setup: in-memory fakes for Firestore, Firebase Auth, Razorpay and Gemini.

Nothing here talks to a real service.
"""
import os
import sys
import types
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Must be set before the backend modules are imported (they read env at import time).
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_dummy"
os.environ["RAZORPAY_KEY_SECRET"] = "dummy_secret"
os.environ["FIREBASE_PROJECT_ID"] = "test-project"
os.environ["FIREBASE_SERVICE_ACCOUNT_PATH"] = "does-not-exist.json"

# Replace the Gemini module so importing main doesn't create a Vertex AI client.
fake_gemini = types.ModuleType("gemini_extractor")
fake_gemini.extract_multiple_with_gemini = lambda cards: []
sys.modules["gemini_extractor"] = fake_gemini

import firebase_admin.firestore as admin_firestore  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
import free_scans  # noqa: E402
import verification_email  # noqa: E402
import notifications  # noqa: E402
import payments  # noqa: E402


class FakeIncrement:
    def __init__(self, value):
        self.value = value


class FakeSnapshot:
    def __init__(self, data):
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class FakeDocRef:
    def __init__(self, db, path):
        self.db = db
        self.path = path

    def get(self, transaction=None):
        return FakeSnapshot(self.db.docs.get(self.path))

    def set(self, data, merge=False):
        current = dict(self.db.docs.get(self.path) or {}) if merge else {}
        current.update(data)
        self.db.docs[self.path] = current

    def update(self, data):
        if self.path not in self.db.docs:
            raise RuntimeError("document does not exist")
        current = self.db.docs[self.path]
        for key, value in data.items():
            if isinstance(value, FakeIncrement):
                current[key] = current.get(key, 0) + value.value
            else:
                current[key] = value

    def delete(self):
        self.db.docs.pop(self.path, None)


class FakeCollection:
    def __init__(self, db, name):
        self.db = db
        self.name = name

    def document(self, doc_id):
        return FakeDocRef(self.db, f"{self.name}/{doc_id}")


class FakeTransaction:
    def set(self, ref, data, merge=False):
        ref.set(data, merge=merge)


class FakeDB:
    def __init__(self):
        self.docs = {}

    def collection(self, name):
        return FakeCollection(self, name)

    def transaction(self):
        return FakeTransaction()


class FakeRazorpay:
    """Holds orders/payments keyed by id; signatures are 'valid' unless listed as bad."""

    def __init__(self):
        self.orders = {}
        self.payments = {}
        self.bad_signatures = set()
        outer = self

        class Utility:
            def verify_payment_signature(self, params):
                if params["razorpay_signature"] in outer.bad_signatures:
                    raise ValueError("bad signature")

        class Orders:
            def fetch(self, order_id):
                return outer.orders[order_id]

            def create(self, params):
                order = {"id": f"order_{len(outer.orders) + 1}", "status": "created", **params}
                outer.orders[order["id"]] = order
                return order

        class Payments:
            def fetch(self, payment_id):
                return outer.payments[payment_id]

        self.utility = Utility()
        self.order = Orders()
        self.payment = Payments()


@pytest.fixture
def db(monkeypatch):
    fake_db = FakeDB()
    monkeypatch.setattr(payments, "_get_firestore", lambda: fake_db)
    monkeypatch.setattr(main, "_get_firestore", lambda: fake_db)
    monkeypatch.setattr(free_scans, "_get_firestore", lambda: fake_db)
    monkeypatch.setattr(verification_email, "_get_firestore", lambda: fake_db)
    # The transactional decorator just calls the function with our fake transaction.
    monkeypatch.setattr(admin_firestore, "transactional", lambda func: func)
    monkeypatch.setattr(admin_firestore, "Increment", FakeIncrement)
    return fake_db


@pytest.fixture
def razorpay(monkeypatch):
    fake = FakeRazorpay()
    monkeypatch.setattr(payments, "client", fake)
    return fake


@pytest.fixture
def pushes(monkeypatch):
    sent = []
    monkeypatch.setattr(
        notifications, "send_push_to_user", lambda *args, **kwargs: sent.append(args) or True
    )
    return sent


@pytest.fixture
def client(monkeypatch, db, razorpay, pushes):
    # Bearer token "uid-<x>" or "uid-<x>|<email>" is accepted as user "uid-<x>".
    # Users whose uid ends in "-unverified" have an unverified email.
    def verify_id_token(token, **kwargs):
        if not token.startswith("uid-"):
            raise ValueError("invalid token")
        uid, _, email = token.partition("|")
        return {
            "uid": uid,
            "email": email or f"{uid}@example.com",
            "email_verified": not uid.endswith("-unverified"),
        }

    monkeypatch.setattr(payments.firebase_auth, "verify_id_token", verify_id_token)
    return TestClient(main.app)


def auth(uid="uid-alice", email=None):
    token = f"{uid}|{email}" if email else uid
    return {"Authorization": f"Bearer {token}"}
