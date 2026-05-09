#!/usr/bin/env python3
"""
Batch geocode permits using Toronto Address Points CSV.

Usage:
    pip install psycopg2-binary
    python3 scripts/geocode_permits.py
"""

import csv
import json
import os
import sys
import time
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Missing dependency. Run: pip install psycopg2-binary")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

CSV_PATH   = Path.home() / "Desktop" / "Address Points.csv"
DIRECT_URL = os.environ.get("DIRECT_URL") or os.environ.get("DATABASE_URL")
if not DIRECT_URL:
    # fallback: read from project .env.local or .env
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
BATCH_SIZE = 500   # permits updated per transaction

# ── Step 1: Load address points CSV into a lookup dict ───────────────────────

print(f"Reading {CSV_PATH} ...")

# key: (address_number, street_name_upper, street_type_upper)
# value: (lat, lng)
lookup: dict[tuple[str, str, str], tuple[float, float]] = {}
skipped = 0

with open(CSV_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        addr_num  = (row.get("ADDRESS_NUMBER") or "").strip()
        name      = (row.get("LINEAR_NAME")    or "").strip().upper()
        stype     = (row.get("LINEAR_NAME_TYPE") or "").strip().upper()
        geom_str  = (row.get("geometry")       or "").strip()

        if not addr_num or not name or not geom_str:
            skipped += 1
            continue

        try:
            geom   = json.loads(geom_str)
            coords = geom["coordinates"][0]  # [lng, lat]
            lng, lat = float(coords[0]), float(coords[1])
        except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError):
            skipped += 1
            continue

        key = (addr_num, name, stype)
        if key not in lookup:
            lookup[key] = (lat, lng)

        if (i + 1) % 100_000 == 0:
            print(f"  Parsed {i+1:,} rows, lookup size: {len(lookup):,}")

print(f"Lookup ready: {len(lookup):,} unique address points  ({skipped:,} rows skipped)\n")

# ── Step 2: Connect and batch-update permits ──────────────────────────────────

print("Connecting to database ...")
conn = psycopg2.connect(DIRECT_URL)
conn.autocommit = False
cur = conn.cursor()

# Fetch all permits missing lat/lng
print("Fetching permits without coordinates ...")
cur.execute("""
    SELECT id, street_num, street_name, street_type
    FROM permits
    WHERE lat IS NULL OR lng IS NULL
""")
rows = cur.fetchall()
total = len(rows)
print(f"Found {total:,} permits to geocode\n")

matched   = 0
unmatched = 0
batch_updates: list[tuple[float, float, str]] = []  # (lat, lng, id)

def flush_batch():
    global matched
    if not batch_updates:
        return
    psycopg2.extras.execute_batch(
        cur,
        "UPDATE permits SET lat = %s, lng = %s WHERE id = %s",
        batch_updates,
        page_size=BATCH_SIZE,
    )
    conn.commit()
    matched += len(batch_updates)
    batch_updates.clear()

start = time.time()

for i, (permit_id, street_num, street_name, street_type) in enumerate(rows):
    addr_num = (street_num  or "").strip()
    name     = (street_name or "").strip().upper()
    stype    = (street_type or "").strip().upper()

    pos = lookup.get((addr_num, name, stype))

    # Fallback: try without street type (some permits have missing/wrong type)
    if pos is None and name:
        for (n, nm, st), coords in lookup.items():
            if n == addr_num and nm == name:
                pos = coords
                break

    if pos:
        batch_updates.append((pos[0], pos[1], permit_id))
        if len(batch_updates) >= BATCH_SIZE:
            flush_batch()
    else:
        unmatched += 1

    if (i + 1) % 10_000 == 0:
        flush_batch()
        elapsed = time.time() - start
        pct = (i + 1) / total * 100
        eta = elapsed / (i + 1) * (total - i - 1)
        print(f"  {i+1:,}/{total:,} ({pct:.1f}%)  matched={matched:,}  unmatched={unmatched:,}  ETA {eta:.0f}s")

flush_batch()

cur.close()
conn.close()

elapsed = time.time() - start
print(f"\nDone in {elapsed:.1f}s")
print(f"  Matched and updated : {matched:,}")
print(f"  No match found      : {unmatched:,}")
print(f"  Match rate          : {matched/total*100:.1f}%")
