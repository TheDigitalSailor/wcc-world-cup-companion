#!/usr/bin/env python3
"""Scrape per-match goalscorers from Wikipedia football boxes into matchgoals.js.

Usage: python3 scripts/update_matchgoals.py

Reads team pairings from data.js (MATCHES) and maps each Wikipedia "football box"
(rendered match result with scorers) to our MatchNumber by home/away team. The
boxes live in the per-group articles (2026 FIFA World Cup Group A … L) and the
knockout-stage article. Writes matchgoals.js:

  const MATCH_GOALS = { "<MatchNumber>": [{n, t:"home"|"away", m}], ... };

The parser is defensive: a page that 404s or fails to parse is skipped (not yet
created early in the tournament), so a partial/empty file is always written.
"""
import gzip
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = [f"2026_FIFA_World_Cup_Group_{c}" for c in "ABCDEFGHIJKL"] + \
        ["2026_FIFA_World_Cup_knockout_stage"]

# Wikipedia team name -> our app name (only the ones that differ)
WIKI2APP = {
    "South Korea": "Korea Republic",
    "Iran": "IR Iran",
    "Turkey": "Türkiye",
    "United States": "USA",
    "DR Congo": "Congo DR",
    "Cape Verde": "Cabo Verde",
    "Ivory Coast": "Côte d'Ivoire",
    "Czech Republic": "Czechia",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
}


def fetch(page):
    url = f"https://en.wikipedia.org/api/rest_v1/page/html/{page}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "WCC-app/1.0 (matchgoals updater)",
        "Accept-Encoding": "gzip",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        return raw.decode("utf-8")


def load_matches():
    txt = (ROOT / "data.js").read_text(encoding="utf-8")
    return json.loads(txt[txt.index("["):txt.rindex("]") + 1])


def clean(s):
    s = re.sub(r"<[^>]+>", "", s)            # strip tags
    s = re.sub(r"&#\d+;|&[a-z]+;", " ", s)    # strip entities
    s = re.sub(r"\[\d+\]", "", s)             # strip footnote markers
    return re.sub(r"\s+", " ", s).strip()


def norm_team(html):
    name = clean(html)
    return WIKI2APP.get(name, name)


def parse_goals(cell_html, side):
    """Extract [{n, t, m}] from a goals cell."""
    goals = []
    for li in re.findall(r"<li\b[^>]*>(.*?)</li>", cell_html, re.S):
        names = re.findall(r"<a\b[^>]*>(.*?)</a>", li, re.S)
        name = clean(names[0]) if names else clean(li.split("<")[0])
        if not name:
            continue
        low = clean(li).lower()
        og = "(o.g.)" in low or "own goal" in low
        mins = re.findall(r"(\d+(?:\+\d+)?)\s*['′]", li)
        entry = {"n": name + (" (OG)" if og else ""), "t": side}
        if mins:
            entry["m"] = mins[0] + "'"
        goals.append(entry)
    return goals


def parse_page(html, pair_to_num, out):
    # each match is a <div ... class="footballbox"> … </div>; slice between starts
    starts = [m.start() for m in re.finditer(r'class="footballbox"', html)]
    for k, st in enumerate(starts):
        box = html[st: starts[k + 1] if k + 1 < len(starts) else st + 9000]
        mh = re.search(r'class="fhome"[^>]*>(.*?)</th>', box, re.S)
        ma = re.search(r'class="faway"[^>]*>(.*?)</th>', box, re.S)
        if not mh or not ma:
            continue
        num = pair_to_num.get((norm_team(mh.group(1)), norm_team(ma.group(1))))
        if num is None:
            continue
        hg = re.search(r'class="[^"]*fhgoal[^"]*"[^>]*>(.*?)</td>', box, re.S)
        ag = re.search(r'class="[^"]*fagoal[^"]*"[^>]*>(.*?)</td>', box, re.S)
        goals = []
        if hg:
            goals += parse_goals(hg.group(1), "home")
        if ag:
            goals += parse_goals(ag.group(1), "away")
        if goals:
            out[str(num)] = goals


def main():
    matches = load_matches()
    pair_to_num = {(m["HomeTeam"], m["AwayTeam"]): m["MatchNumber"] for m in matches}

    goals = {}
    for page in PAGES:
        try:
            parse_page(fetch(page), pair_to_num, goals)
        except Exception as e:  # missing/early pages are expected — skip quietly
            print(f"  skip {page}: {e}")

    out = (
        f"// Per-match goalscorers — source: Wikipedia match reports "
        f"(updated {date.today().isoformat()})\n"
        "// shape: { \"<MatchNumber>\": [{ n, t: \"home\"|\"away\", m }], ... }\n"
        "const MATCH_GOALS = " + json.dumps(goals, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    (ROOT / "matchgoals.js").write_text(out, encoding="utf-8")
    print(f"wrote matchgoals.js: {len(goals)} matches with goals")


if __name__ == "__main__":
    main()
