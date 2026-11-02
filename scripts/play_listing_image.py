"""Replace a Play Store listing image (icon, phoneScreenshots, featureGraphic...).
Run: python scripts/play_listing_image.py <imageType> <file> [file ...]
Uses the play-console-bot service account via gcloud impersonation."""
import json, os, subprocess, sys, urllib.error, urllib.parse, urllib.request

PKG = "com.wecanserve.scanmycard"
SA = "play-console-bot@card-flow-6da93.iam.gserviceaccount.com"
GCLOUD = os.path.expandvars(r"%LOCALAPPDATA%\google-cloud-sdk\bin\gcloud.cmd") if os.name == "nt" else "gcloud"
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"
UPLOAD = f"https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PKG}"

image_type, files = sys.argv[1], sys.argv[2:]
token = subprocess.check_output(
    [GCLOUD, "auth", "print-access-token", f"--impersonate-service-account={SA}",
     "--scopes=https://www.googleapis.com/auth/androidpublisher"],
    text=True, stderr=subprocess.DEVNULL, shell=(os.name == "nt")).strip()


def call(method, url, body=None, content_type="application/json"):
    data = body if isinstance(body, bytes) else (b"" if method == "POST" else None)
    req = urllib.request.Request(url, method=method, data=data,
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": content_type})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        sys.exit(f"Play API error {error.code}: {error.read().decode()[:800]}")


edit = call("POST", f"{API}/edits")["id"]
for listing in call("GET", f"{API}/edits/{edit}/listings").get("listings", []):
    lang = listing["language"]
    call("DELETE", f"{API}/edits/{edit}/listings/{lang}/{image_type}")
    for path in files:
        mime = "image/png" if path.lower().endswith(".png") else "image/jpeg"
        call("POST", f"{UPLOAD}/edits/{edit}/listings/{lang}/{image_type}?uploadType=media",
             open(path, "rb").read(), content_type=mime)
    print(f"{lang}: {image_type} replaced with {len(files)} image(s)")
print("Committed edit", call("POST", f"{API}/edits/{edit}:commit").get("id"))
