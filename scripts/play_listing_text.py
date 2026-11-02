"""Update the Play Store listing text from store/play-listing-<lang>.json, plus contact details.
Run: python scripts/play_listing_text.py [lang]   (default en-US)"""
import json, os, subprocess, sys, urllib.error, urllib.request

PKG = "com.wecanserve.scanmycard"
SA = "play-console-bot@card-flow-6da93.iam.gserviceaccount.com"
GCLOUD = os.path.expandvars(r"%LOCALAPPDATA%\google-cloud-sdk\bin\gcloud.cmd") if os.name == "nt" else "gcloud"
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"
CONTACT = {"contactEmail": "support@scanmycard.in", "contactWebsite": "https://scanmycard.in", "contactPhone": "+919112135150"}

lang = sys.argv[1] if len(sys.argv) > 1 else "en-US"
listing = json.load(open(os.path.join(os.path.dirname(__file__), "..", "store", f"play-listing-{lang}.json"), encoding="utf-8"))
token = subprocess.check_output(
    [GCLOUD, "auth", "print-access-token", f"--impersonate-service-account={SA}",
     "--scopes=https://www.googleapis.com/auth/androidpublisher"],
    text=True, stderr=subprocess.DEVNULL, shell=(os.name == "nt")).strip()


def call(method, url, body=None):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else (b"" if method == "POST" else None)
    req = urllib.request.Request(url, method=method, data=data, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        sys.exit(f"Play API error {error.code}: {error.read().decode()[:800]}")


edit = call("POST", f"{API}/edits")["id"]
saved = call("PATCH", f"{API}/edits/{edit}/listings/{lang}", listing)
details = call("PATCH", f"{API}/edits/{edit}/details", CONTACT)
print(f"{lang}: title {saved['title']!r}, short {len(saved['shortDescription'])} chars, full {len(saved['fullDescription'])} chars")
print("contact:", details.get("contactEmail"), details.get("contactWebsite"))
print("Committed edit", call("POST", f"{API}/edits/{edit}:commit").get("id"))
