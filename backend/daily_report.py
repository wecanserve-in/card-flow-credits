"""Daily business report -> Google Sheet ("SMC COST sheet").

Runs once a day as a Cloud Run job (see scripts/deploy_daily_report.sh) and writes one row
for yesterday (India time):
  users and cards scanned  - from Firestore (running totals; the day's figure is the change
                             since the previous row)
  sales, GST, Razorpay fees - from the Razorpay API (captured payments that day)
  Google Cloud cost        - from the billing export in BigQuery (after free credits)
Fixed costs (hosting, domain, subscriptions) are deliberately left out.

The last few days' cloud cost is refreshed on every run, because Google adds billing data late.
Run by hand:  python daily_report.py [YYYY-MM-DD]
"""
import datetime as dt
import os
import sys

import firebase_admin
import google.auth
import razorpay
from firebase_admin import credentials, firestore
from google.auth.transport.requests import AuthorizedSession

SHEET_ID = os.getenv("REPORT_SHEET_ID", "13q-WaptdoHWD4FVqjLDuEljy5g-_MCkZOswfhvAgyYg")
TAB = "Daily report"
BILLING_TABLE = os.getenv(
    "BILLING_TABLE", "card-flow-6da93.billing_export.gcp_billing_export_v1_01C22F_FD217C_2724D7")
PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "card-flow-6da93")
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
GST_RATE = 0.18
REFRESH_COST_DAYS = 3

HEADERS = [
    "Date", "New users", "Total users", "Cards scanned", "Total cards scanned",
    "Payments", "Sales incl. GST (₹)", "GST (₹)", "Sales excl. GST (₹)",
    "Razorpay fees (₹)", "Google Cloud cost (₹)", "Profit (₹)", "Packs sold",
]
COL = {name: i for i, name in enumerate(HEADERS)}

scopes = ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/spreadsheets"]
creds, _ = google.auth.default(scopes=scopes)
http = AuthorizedSession(creds)


def sheet_url(path):
    return f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}"


def ensure_tab():
    meta = http.get(sheet_url("?fields=sheets.properties")).json()
    titles = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}
    if TAB not in titles:
        if list(titles) == ["Sheet1"]:
            request = {"updateSheetProperties": {"properties": {"sheetId": titles["Sheet1"], "title": TAB,
                       "gridProperties": {"frozenRowCount": 1}}, "fields": "title,gridProperties.frozenRowCount"}}
        else:
            request = {"addSheet": {"properties": {"title": TAB, "gridProperties": {"frozenRowCount": 1}}}}
        http.post(sheet_url(":batchUpdate"), json={"requests": [request]}).raise_for_status()
        titles = {s["properties"]["title"]: s["properties"]["sheetId"]
                  for s in http.get(sheet_url("?fields=sheets.properties")).json()["sheets"]}
    rows = http.get(sheet_url(f"/values/'{TAB}'!A1:M")).json().get("values", [])
    if not rows or rows[0] != HEADERS:
        http.put(sheet_url(f"/values/'{TAB}'!A1?valueInputOption=RAW"), json={"values": [HEADERS]}).raise_for_status()
        sid = titles[TAB]
        http.post(sheet_url(":batchUpdate"), json={"requests": [
            {"repeatCell": {"range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
                            "cell": {"userEnteredFormat": {"textFormat": {"bold": True},
                                                           "backgroundColor": {"red": .9, "green": .95, "blue": 1}}},
                            "fields": "userEnteredFormat(textFormat,backgroundColor)"}},
            {"autoResizeDimensions": {"dimensions": {"sheetId": sid, "dimension": "COLUMNS",
                                                     "startIndex": 0, "endIndex": len(HEADERS)}}},
        ]}).raise_for_status()
        rows = [HEADERS]
    return rows


def firestore_totals():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault(), {"projectId": PROJECT})
    db = firestore.client()
    users, used = 0, 0
    for doc in db.collection("users").select(["usedScans"]).stream():
        users += 1
        used += int((doc.to_dict() or {}).get("usedScans", 0) or 0)
    return users, used


def razorpay_day(day):
    client = razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))
    start = int(dt.datetime.combine(day, dt.time(), IST).timestamp())
    end = start + 86400 - 1
    payments, skip = [], 0
    while True:
        page = client.payment.all({"from": start, "to": end, "count": 100, "skip": skip}).get("items", [])
        payments += page
        if len(page) < 100:
            break
        skip += 100
    captured = [p for p in payments if p.get("status") in ("captured", "refunded")]
    gross = sum(p["amount"] - (p.get("amount_refunded") or 0) for p in captured) / 100
    fees = sum((p.get("fee") or 0) for p in captured) / 100
    from payments import PLAN_NAMES, _plan_total_rupees
    by_amount = {_plan_total_rupees(pid) * 100: name for pid, name in PLAN_NAMES.items()}
    packs = {}
    for p in captured:
        name = by_amount.get(p["amount"], f"₹{p['amount'] // 100}")
        packs[name] = packs.get(name, 0) + 1
    return len(captured), round(gross, 2), round(fees, 2), ", ".join(f"{n} × {k}" for k, n in packs.items())


def cloud_costs(days):
    first, last = min(days).isoformat(), max(days).isoformat()
    query = (f"SELECT CAST(DATE(usage_start_time, 'Asia/Kolkata') AS STRING) d, "
             f"SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) net "
             f"FROM `{BILLING_TABLE}` WHERE DATE(usage_start_time, 'Asia/Kolkata') BETWEEN '{first}' AND '{last}' "
             f"AND _PARTITIONTIME >= TIMESTAMP_SUB(TIMESTAMP('{first}'), INTERVAL 2 DAY) GROUP BY d")
    res = http.post(f"https://bigquery.googleapis.com/bigquery/v2/projects/{PROJECT}/queries",
                    json={"query": query, "useLegacySql": False, "timeoutMs": 60000}).json()
    if "error" in res:
        raise RuntimeError(res["error"])
    return {r["f"][0]["v"]: round(float(r["f"][1]["v"] or 0), 2) for r in res.get("rows", [])}


def num(row, name):
    try:
        return float(str(row[COL[name]]).replace(",", ""))
    except (IndexError, ValueError):
        return 0.0


def main():
    day = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.datetime.now(IST).date() - dt.timedelta(days=1)
    rows = ensure_tab()
    by_date = {r[0]: i for i, r in enumerate(rows) if i and r}
    earlier = [r for r in rows[1:] if r and r[0] < day.isoformat()]
    prev = earlier[-1] if earlier else None

    users, used = firestore_totals()
    count, gross, fees, packs = razorpay_day(day)
    refresh = [day - dt.timedelta(days=k) for k in range(REFRESH_COST_DAYS)]
    costs = cloud_costs(refresh)

    gst = round(gross - gross / (1 + GST_RATE), 2)
    net_sales = round(gross - gst, 2)
    cost = costs.get(day.isoformat(), 0.0)
    row = [day.isoformat(),
           max(0, users - int(num(prev, "Total users"))) if prev else users, users,
           max(0, used - int(num(prev, "Total cards scanned"))) if prev else used, used,
           count, gross, gst, net_sales, fees, cost, round(net_sales - fees - cost, 2), packs]

    target = by_date.get(day.isoformat())
    if target is None:
        http.post(sheet_url(f"/values/'{TAB}'!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"),
                  json={"values": [row]}).raise_for_status()
    else:
        http.put(sheet_url(f"/values/'{TAB}'!A{target + 1}?valueInputOption=USER_ENTERED"),
                 json={"values": [row]}).raise_for_status()

    # Billing data arrives late: refresh cost and profit on the previous rows too.
    for d in refresh[1:]:
        i = by_date.get(d.isoformat())
        if i is None or d.isoformat() not in costs:
            continue
        old = rows[i]
        new_cost = costs[d.isoformat()]
        profit = round(num(old, "Sales excl. GST (₹)") - num(old, "Razorpay fees (₹)") - new_cost, 2)
        http.put(sheet_url(f"/values/'{TAB}'!K{i + 1}:L{i + 1}?valueInputOption=USER_ENTERED"),
                 json={"values": [[new_cost, profit]]}).raise_for_status()
    print("report row:", row)


if __name__ == "__main__":
    main()
