"""Upload an AAB to a Google Play track (default: internal testing).

Uses the play-console-bot service account via gcloud impersonation (no key file).
Run:  python scripts/play_upload.py <path-to.aab> [track] [release-notes]
      track: internal (default), alpha, beta or production
"""
import json, os, subprocess, sys, urllib.error, urllib.request

PKG = "com.wecanserve.scanmycard"
SA = "play-console-bot@card-flow-6da93.iam.gserviceaccount.com"
GCLOUD = os.path.expandvars(r"%LOCALAPPDATA%\google-cloud-sdk\bin\gcloud.cmd") if os.name == "nt" else "gcloud"
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"
UPLOAD_API = f"https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PKG}"

aab_path = sys.argv[1]
track = sys.argv[2] if len(sys.argv) > 2 else "internal"
notes = sys.argv[3] if len(sys.argv) > 3 else "Bug fixes and improvements."

token = subprocess.check_output(
    [GCLOUD, "auth", "print-access-token", f"--impersonate-service-account={SA}",
     "--scopes=https://www.googleapis.com/auth/androidpublisher"],
    text=True, stderr=subprocess.DEVNULL, shell=(os.name == "nt")).strip()


def call(method, url, body=None, content_type="application/json", timeout=60):
    data = body if isinstance(body, (bytes, bytearray)) else (json.dumps(body).encode() if body is not None else (b"" if method == "POST" else None))
    req = urllib.request.Request(url, method=method, data=data,
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": content_type})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        sys.exit(f"Play API error {error.code} on {method} {url.split(PKG)[-1]}:\n{error.read().decode()[:1500]}")


edit = call("POST", f"{API}/edits")["id"]
committed = False
try:
    with open(aab_path, "rb") as f:
        size_mb = os.path.getsize(aab_path) / 1e6
        print(f"Uploading {os.path.basename(aab_path)} ({size_mb:.1f} MB)...")
        bundle = call("POST", f"{UPLOAD_API}/edits/{edit}/bundles?uploadType=media", f.read(),
                      content_type="application/octet-stream", timeout=900)
    code = str(bundle["versionCode"])
    print(f"Uploaded: versionCode {code}, sha256 {bundle.get('sha256', '')[:16]}...")

    release = {
        "name": f"1.0.0 ({code})",
        "versionCodes": [code],
        "status": "completed",
        "releaseNotes": [{"language": "en-US", "text": notes}],
    }
    call("PUT", f"{API}/edits/{edit}/tracks/{track}", {"track": track, "releases": [release]})
    print(f"Assigned to track: {track}")

    result = call("POST", f"{API}/edits/{edit}:commit")
    committed = True
    print(f"Committed edit {result.get('id')}. Version {code} is on '{track}'.")
finally:
    if not committed:
        try:
            urllib.request.urlopen(urllib.request.Request(f"{API}/edits/{edit}", method="DELETE",
                                                          headers={"Authorization": f"Bearer {token}"}))
        except Exception:
            pass
