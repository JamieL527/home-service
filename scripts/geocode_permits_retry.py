#!/usr/bin/env python3
"""
Second-pass geocoding for permits still missing lat/lng after the first run.

Strategies (in order):
  1. Range address  — "450-452" → try "450", "451", "452" individually
  2. Suffix strip   — "361 A" / "777 R" / "150 B" → strip letter suffix, try numeric part
  3. Nominatim API  — for anything still unmatched (1 req/s, free)

Usage:
    python3 scripts/geocode_permits_retry.py
"""

import csv
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Run: pip install psycopg2-binary")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

CSV_PATH   = Path.home() / "Desktop" / "Address Points.csv"
DIRECT_URL = os.environ.get("DIRECT_URL") or os.environ.get("DATABASE_URL")
if not DIRECT_URL:
    for env_file in [Path(__file__).parent.parent / ".env.local", Path(__file__).parent.parent / ".env"]:
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("DIRECT_URL=") or line.startswith("DATABASE_URL="):
                    DIRECT_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
        if DIRECT_URL:
            break
if not DIRECT_URL:
    print("Error: set DIRECT_URL environment variable or add it to .env")
    sys.exit(1)
BATCH_SIZE = 50   # commit frequently to avoid losing progress on connection drop

# ── Load address points (same as first pass) ──────────────────────────────────

print(f"Reading {CSV_PATH} ...")
# key: (address_number, street_name_upper, street_type_upper) → (lat, lng)
lookup: dict[tuple[str, str, str], tuple[float, float]] = {}

with open(CSV_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        addr_num = (row.get("ADDRESS_NUMBER") or "").strip()
        name     = (row.get("LINEAR_NAME")    or "").strip().upper()
        stype    = (row.get("LINEAR_NAME_TYPE") or "").strip().upper()
        geom_str = (row.get("geometry")        or "").strip()
        if not addr_num or not name or not geom_str:
            continue
        try:
            geom   = json.loads(geom_str)
            coords = geom["coordinates"][0]
            lng, lat = float(coords[0]), float(coords[1])
        except Exception:
            continue
        key = (addr_num, name, stype)
        if key not in lookup:
            lookup[key] = (lat, lng)

# Also build a (name, stype) → list of (num_int, lat, lng) for range lookups
from collections import defaultdict
name_type_index: dict[tuple[str, str], list[tuple[int, float, float]]] = defaultdict(list)
for (num, name, stype), (lat, lng) in lookup.items():
    if num.isdigit():
        name_type_index[(name, stype)].append((int(num), lat, lng))
# Sort each list by number for bisect
for k in name_type_index:
    name_type_index[k].sort(key=lambda x: x[0])

print(f"Lookup ready: {len(lookup):,} address points\n")

# ── Connect and fetch unmatched permits ───────────────────────────────────────

print("Connecting ...")
conn = psycopg2.connect(DIRECT_URL)
conn.autocommit = False
cur = conn.cursor()

cur.execute("""
    SELECT id, street_num, street_name, street_type, street_direction, postal
    FROM permits
    WHERE lat IS NULL OR lng IS NULL
""")
unmatched_rows = cur.fetchall()
print(f"Permits still missing coordinates: {len(unmatched_rows):,}\n")

# ── Helper: candidate address numbers to try ──────────────────────────────────

def candidate_nums(raw: str) -> list[str]:
    """
    Given a raw street_num, return variations to try against the lookup.
    e.g. "450-452"  → ["450", "451", "452"]
         "361 A"    → ["361"]
         "777 R"    → ["777"]
         "150 B"    → ["150"]
         "1593 B-1615 B" → ["1593", "1615"]
         "42"       → ["42"]
    """
    raw = (raw or "").strip()
    nums: list[str] = []

    # Case: range like "450-452" or "4841-4881" or "1593 B-1615 B"
    # Extract all digit sequences
    all_digits = re.findall(r'\d+', raw)
    if len(all_digits) >= 2:
        try:
            lo = int(all_digits[0])
            hi = int(all_digits[-1])
            # Expand small ranges; for large ranges just try endpoints + midpoint
            if 0 < hi - lo <= 20:
                nums = [str(n) for n in range(lo, hi + 1)]
            else:
                nums = [str(lo), str(hi)]
        except ValueError:
            pass
    elif len(all_digits) == 1:
        nums = [all_digits[0]]

    # Always include the pure numeric extraction as fallback
    for d in all_digits:
        if d not in nums:
            nums.append(d)

    return nums if nums else [raw]

# ── Strategy 1 & 2: local CSV lookup with candidate numbers ──────────────────

updates: list[tuple[float, float, str]] = []
still_unmatched: list[tuple] = []

s1_matched = 0

for row in unmatched_rows:
    permit_id, street_num, street_name, street_type, street_direction, postal = row
    name  = (street_name  or "").strip().upper()
    stype = (street_type  or "").strip().upper()

    pos: tuple[float, float] | None = None
    for num in candidate_nums(street_num or ""):
        pos = lookup.get((num, name, stype))
        if pos:
            break
        # also try without street type
        if not pos and name:
            pos = lookup.get((num, name, ""))
        if pos:
            break

    if pos:
        updates.append((pos[0], pos[1], permit_id))
        s1_matched += 1
        if len(updates) >= BATCH_SIZE:
            psycopg2.extras.execute_batch(
                cur,
                "UPDATE permits SET lat = %s, lng = %s WHERE id = %s",
                updates, page_size=BATCH_SIZE,
            )
            conn.commit()
            updates.clear()
    else:
        still_unmatched.append(row)

if updates:
    psycopg2.extras.execute_batch(
        cur, "UPDATE permits SET lat = %s, lng = %s WHERE id = %s",
        updates, page_size=BATCH_SIZE,
    )
    conn.commit()
    updates.clear()

print(f"Strategy 1+2 (range/suffix): matched {s1_matched:,}")
print(f"Remaining for Nominatim: {len(still_unmatched):,}\n")

# ── Strategy 3: Nominatim ─────────────────────────────────────────────────────

def nominatim_geocode(street_num: str, street_name: str, street_type: str,
                      street_direction: str, postal: str) -> tuple[float, float] | None:
    parts = []
    addr = " ".join(filter(None, [
        (street_num or "").strip(),
        (street_name or "").strip(),
        (street_type or "").strip(),
        (street_direction or "").strip(),
    ]))
    if not addr.strip():
        return None

    params = {
        "street": addr,
        "city": "Toronto",
        "country": "CA",
        "format": "json",
        "limit": 1,
    }
    if postal:
        params["postalcode"] = postal.strip()

    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "home-service-platform-geocoder/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None

nom_matched   = 0
nom_unmatched = 0
total_nom     = len(still_unmatched)

def flush_to_db(updates: list) -> None:
    """Open a fresh connection, commit updates, close. Avoids long-lived connection timeouts."""
    if not updates:
        return
    c = psycopg2.connect(DIRECT_URL)
    try:
        with c:
            with c.cursor() as cr:
                psycopg2.extras.execute_batch(
                    cr,
                    "UPDATE permits SET lat = %s, lng = %s WHERE id = %s",
                    updates,
                    page_size=len(updates),
                )
    finally:
        c.close()

cur.close()
conn.close()

for i, row in enumerate(still_unmatched):
    permit_id, street_num, street_name, street_type, street_direction, postal = row

    time.sleep(1.05)  # respect Nominatim 1 req/s limit

    pos = nominatim_geocode(street_num, street_name, street_type, street_direction, postal)
    if pos:
        updates.append((pos[0], pos[1], permit_id))
        nom_matched += 1
    else:
        nom_unmatched += 1

    if len(updates) >= BATCH_SIZE:
        flush_to_db(updates)
        updates.clear()

    if (i + 1) % 100 == 0:
        eta = (total_nom - i - 1) * 1.05
        print(f"  Nominatim {i+1}/{total_nom}  matched={nom_matched}  "
              f"unmatched={nom_unmatched}  ETA {eta:.0f}s", flush=True)

flush_to_db(updates)

print(f"\n{'='*50}")
print(f"Strategy 1+2 (range/suffix fix) : {s1_matched:,}")
print(f"Strategy 3   (Nominatim)         : {nom_matched:,}")
print(f"Still unmatched                  : {nom_unmatched:,}")
print(f"Total newly geocoded             : {s1_matched + nom_matched:,}")
