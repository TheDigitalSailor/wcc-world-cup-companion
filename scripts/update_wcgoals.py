#!/usr/bin/env python3
"""Scrape WC26 goalscorers from the Wikipedia tournament page into wcgoals.js.

Usage: python3 scripts/update_wcgoals.py
Writes wcgoals.js mapping player name -> goals scored at this World Cup.
Own goals are ignored. If the section is missing, writes an empty map.
"""
import gzip
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://en.wikipedia.org/api/rest_v1/page/html/2026_FIFA_World_Cup"
ROOT = Path(__file__).resolve().parent.parent


def fetch(url):
    """Fetch with gzip + backoff on rate limits; returns text or None on failure."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "WCC-app/1.0 (https://github.com/TheDigitalSailor/wcc-world-cup-companion; goals updater)",
        "Accept-Encoding": "gzip",
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return raw.decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 4:
                time.sleep(2 ** attempt * 2)  # 2,4,8,16s
                continue
            print(f"warning: fetch failed ({e})", file=sys.stderr)
            return None
        except Exception as e:
            print(f"warning: fetch failed ({e})", file=sys.stderr)
            return None
    return None


def main():
    html = fetch(URL)
    if html is None:
        # keep the existing wcgoals.js rather than failing the workflow
        print("skipping wcgoals update (could not fetch); leaving existing file")
        return

    goals = {}
    i = html.find('id="Goalscorers"')
    if i != -1:
        # section ends at the next h2/h3 heading
        end = re.search(r"<h[23]\b", html[i + 20:])
        sect = html[i:i + 20 + end.start()] if end else html[i:]
        # blocks like "<b>2 goals</b> ... <ul>...</ul>" (skip "own goal" blocks)
        for m in re.finditer(r">(\d+)\s+(own\s+)?goals?<", sect):
            if m.group(2):
                continue
            n = int(m.group(1))
            ul = re.search(r"<ul>(.*?)</ul>", sect[m.end():], re.S)
            if not ul:
                continue
            for li in re.findall(r"<li[^>]*>(.*?)</li>", ul.group(1), re.S):
                names = re.findall(r"<a[^>]*>([^<]+)</a>", li)
                # last link in the item is the player (first is the flag/team link)
                if names:
                    goals[names[-1].strip()] = n

    out = (
        f"// WC26 goalscorers — source: Wikipedia 2026 FIFA World Cup page "
        f"(updated {date.today().isoformat()})\n"
        "const WC_GOALS = " + json.dumps(goals, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    (ROOT / "wcgoals.js").write_text(out, encoding="utf-8")
    print(f"wrote wcgoals.js: {len(goals)} scorers, {sum(goals.values())} goals")


if __name__ == "__main__":
    main()
