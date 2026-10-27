"""Show ScanMyCard's Google Play tracks and uploaded builds (read-only).

Uses the play-console-bot service account via gcloud impersonation, so no key file is needed.
Run:  python scripts/play_status.py
"""
import json, os, subprocess, urllib.request

PKG = "com.wecanserve.scanmycard"
SA = "play-console-bot@card-flow-6da93.iam.gserviceaccount.com"
GCLOUD = os.path.expandvars(r"%LOCALAPPDATA%\google-cloud-sdk\bin\gcloud.cmd") if os.name == "nt" else "gcloud"
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"

token = subprocess.check_output(
    [GCLOUD, "auth", "print-access-token", f"--impersonate-service-account={SA}",
     "--scopes=https://www.googleapis.com/auth/androidpublisher"],
    text=True, stderr=subprocess.DEVNULL, shell=(os.name == "nt")).strip()

def call(method, path):
    req = urllib.request.Request(API + path, method=method, data=b"" if method == "POST" else None,
                                 headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return json.loads(body) if body else {}

edit = call("POST", "/edits")["id"]  # read-only session; discarded below, nothing is changed
try:
    print("TRACKS")
    for t in call("GET", f"/edits/{edit}/tracks").get("tracks", []):
        releases = t.get("releases") or [{}]
        for r in releases:
            print(f"  {t['track']:<14} {r.get('status', '-'):<11} versionCodes={r.get('versionCodes', [])} {r.get('name', '')}")
    bundles = call("GET", f"/edits/{edit}/bundles").get("bundles", [])
    codes = sorted(int(b["versionCode"]) for b in bundles)
    print(f"\nUPLOADED BUNDLES: {len(codes)}  version codes: {codes}")
    print(f"Highest version code: {max(codes) if codes else 'none'}  -> next build must be at least {max(codes) + 1 if codes else 1}")
finally:
    call("DELETE", f"/edits/{edit}")
