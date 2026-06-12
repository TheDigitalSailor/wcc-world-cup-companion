#!/usr/bin/env python3
"""Scrape WC26 goalscorers from the Wikipedia tournament page into wcgoals.js.

Usage: python3 scripts/update_wcgoals.py
Writes wcgoals.js mapping player name -> goals scored at this World Cup.
Own goals are ignored. If the section is missing, writes an empty map.
"""
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://en.wikipedia.org/api/rest_v1/page/html/2026_FIFA_World_Cup"
ROOT = Path(__file__).resolve().parent.parent


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "WCC-app/1.0 (goals updater)"})
    html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")

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
