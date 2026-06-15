#!/usr/bin/env python3
"""Scrape the 48 World Cup 26 squads from Wikipedia into squads.js.

Usage: python3 scripts/update_squads.py
Fetches the rendered page via the Wikimedia REST API, parses every
nat-fs-player table row, and writes squads.js at the repo root.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://en.wikipedia.org/api/rest_v1/page/html/2026_FIFA_World_Cup_squads"
MW_API = "https://en.wikipedia.org/w/api.php"
ROOT = Path(__file__).resolve().parent.parent

# infobox "position" text (lowercased, hyphens -> spaces) -> short abbreviation
TEXT2ABBR = {
    "goalkeeper": "GK", "sweeper": "SW",
    "defender": "DF", "centre back": "CB", "center back": "CB", "central defender": "CB",
    "full back": "FB", "left back": "LB", "right back": "RB",
    "wing back": "WB", "left wing back": "LWB", "right wing back": "RWB",
    "midfielder": "MF", "defensive midfielder": "CDM", "central midfielder": "CM",
    "centre midfielder": "CM", "central midfield": "CM", "centre midfield": "CM",
    "attacking midfielder": "CAM", "left midfielder": "LM", "right midfielder": "RM",
    "wide midfielder": "WM", "box to box midfielder": "CM", "deep lying playmaker": "DLP",
    "forward": "FW", "centre forward": "CF", "center forward": "CF", "striker": "ST",
    "second striker": "SS", "winger": "W", "left winger": "LW", "right winger": "RW",
    "inside forward": "IF",
}


def mw_get(params):
    params = {**params, "format": "json", "formatversion": "2"}
    url = MW_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "User-Agent": "WCC-app/1.0 (https://github.com/TheDigitalSailor/wcc-world-cup-companion; squad positions)",
    })
    for attempt in range(5):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(2 ** attempt * 2)  # 2,4,8,16s backoff
                continue
            raise


def parse_infobox_position(wikitext):
    m = re.search(r"\n\s*\|\s*position\s*=\s*([^\n]+)", wikitext, re.I)
    if not m:
        return None
    val = m.group(1)
    val = re.sub(r"<ref.*?(/>|</ref>)", "", val, flags=re.S | re.I)   # refs
    val = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", val)        # [[a|b]] -> b
    val = re.sub(r"\{\{[^{}]*\}\}", "", val)                           # templates
    val = re.sub(r"\(association football\)", "", val, flags=re.I)
    val = val.replace("'''", "")
    # first listed position when several are given
    first = re.split(r"\s*(?:/|,|&|<br\s*/?>|\band\b|\bor\b)\s*", val.strip(), flags=re.I)[0]
    return first.strip()


def resolve_positions(titles):
    """enwiki article titles -> detailed position abbreviation from the infobox."""
    title2pos = {}
    titles = sorted({t for t in titles if t})
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        time.sleep(0.5)  # be gentle with the API
        try:
            data = mw_get({"action": "query", "prop": "revisions", "rvprop": "content",
                           "rvslots": "main", "titles": "|".join(batch)})
        except Exception as e:
            print(f"  positions batch failed: {e}", file=sys.stderr)
            continue
        query = data.get("query", {})
        norm = {n["from"]: n["to"] for n in query.get("normalized", [])}
        for pg in query.get("pages", []):
            if pg.get("missing"):
                continue
            try:
                wt = pg["revisions"][0]["slots"]["main"]["content"]
            except (KeyError, IndexError):
                continue
            pos = parse_infobox_position(wt) or ""
            ab = TEXT2ABBR.get(pos.lower().replace("-", " ").strip())
            if ab:
                title2pos[pg["title"]] = ab
        # let callers look up by the title they requested, not just the normalised one
        for frm, to in norm.items():
            if to in title2pos:
                title2pos[frm] = title2pos[to]
    return title2pos

WIKI2APP = {
    "Czech_Republic": "Czechia", "Mexico": "Mexico", "South_Africa": "South Africa",
    "South_Korea": "Korea Republic", "Bosnia_and_Herzegovina": "Bosnia and Herzegovina",
    "Canada": "Canada", "Qatar": "Qatar", "Switzerland": "Switzerland", "Brazil": "Brazil",
    "Haiti": "Haiti", "Morocco": "Morocco", "Scotland": "Scotland", "Australia": "Australia",
    "Paraguay": "Paraguay", "Turkey": "Türkiye", "United_States": "USA", "Curaçao": "Curaçao",
    "Ecuador": "Ecuador", "Germany": "Germany", "Ivory_Coast": "Côte d'Ivoire", "Japan": "Japan",
    "Netherlands": "Netherlands", "Sweden": "Sweden", "Tunisia": "Tunisia", "Belgium": "Belgium",
    "Egypt": "Egypt", "Iran": "IR Iran", "New_Zealand": "New Zealand", "Cape_Verde": "Cabo Verde",
    "Saudi_Arabia": "Saudi Arabia", "Spain": "Spain", "Uruguay": "Uruguay", "France": "France",
    "Iraq": "Iraq", "Norway": "Norway", "Senegal": "Senegal", "Algeria": "Algeria",
    "Argentina": "Argentina", "Austria": "Austria", "Jordan": "Jordan", "Colombia": "Colombia",
    "DR_Congo": "Congo DR", "Portugal": "Portugal", "Uzbekistan": "Uzbekistan",
    "Croatia": "Croatia", "England": "England", "Ghana": "Ghana", "Panama": "Panama",
}

C2ISO = {
    "England": "gb-eng", "Scotland": "gb-sct", "Wales": "gb-wls", "Wales_(1959–present)": "gb-wls",
    "Northern_Ireland": "gb-nir", "Spain": "es", "Italy": "it", "Germany": "de", "France": "fr",
    "the_Netherlands": "nl", "Portugal": "pt", "Portugal_(official)": "pt", "Belgium": "be",
    "Belgium_(civil)": "be", "Turkey": "tr", "Greece": "gr", "Saudi_Arabia": "sa", "Qatar": "qa",
    "the_United_States": "us", "the_United_Arab_Emirates": "ae", "Mexico": "mx", "Brazil": "br",
    "Argentina": "ar", "Russia": "ru", "Ukraine": "ua", "Switzerland": "ch",
    "Switzerland_(Pantone)": "ch", "Austria": "at", "Croatia": "hr", "Serbia": "rs",
    "Denmark": "dk", "Sweden": "se", "Norway": "no", "Poland": "pl", "the_Czech_Republic": "cz",
    "Egypt": "eg", "Morocco": "ma", "Tunisia": "tn", "Algeria": "dz", "Japan": "jp",
    "South_Korea": "kr", "China": "cn", "the_People's_Republic_of_China": "cn",
    "Australia": "au", "Australia_(converted)": "au", "Canada": "ca", "Canada_(Pantone)": "ca",
    "Colombia": "co", "Ecuador": "ec", "Uruguay": "uy", "Paraguay": "py", "Chile": "cl",
    "Peru": "pe", "Iran": "ir", "Iraq": "iq", "Jordan": "jo", "Uzbekistan": "uz", "India": "in",
    "Indonesia": "id", "Malaysia": "my", "Thailand": "th", "Vietnam": "vn", "South_Africa": "za",
    "Ghana": "gh", "Nigeria": "ng", "Senegal": "sn", "Ivory_Coast": "ci", "Côte_d'Ivoire": "ci",
    "Cyprus": "cy", "Israel": "il", "Romania": "ro", "Bulgaria": "bg", "Hungary": "hu",
    "Slovakia": "sk", "Slovenia": "si", "Bosnia_and_Herzegovina": "ba", "Albania": "al",
    "North_Macedonia": "mk", "Kosovo": "xk", "Montenegro": "me", "Moldova": "md",
    "Belarus": "by", "Georgia": "ge", "Armenia": "am", "Azerbaijan": "az", "Kazakhstan": "kz",
    "Kuwait": "kw", "Bahrain": "bh", "Oman": "om", "Lebanon": "lb", "Libya": "ly", "Sudan": "sd",
    "Angola": "ao", "Zambia": "zm", "Tanzania": "tz", "Kenya": "ke", "Cameroon": "cm",
    "Mali": "ml", "Burkina_Faso": "bf", "Guinea": "gn", "Gabon": "ga",
    "the_Democratic_Republic_of_the_Congo": "cd", "the_Republic_of_the_Congo": "cg",
    "Mozambique": "mz", "Botswana": "bw", "Ethiopia": "et", "Honduras": "hn",
    "Honduras_(1949–2022,_2026–present)": "hn", "Guatemala": "gt", "Costa_Rica": "cr",
    "Panama": "pa", "El_Salvador": "sv", "Jamaica": "jm", "Trinidad_and_Tobago": "tt",
    "Bolivia": "bo", "Venezuela": "ve", "Venezuela_(state)": "ve", "New_Zealand": "nz",
    "Finland": "fi", "Iceland": "is", "Ireland": "ie", "Luxembourg": "lu", "Malta": "mt",
    "Estonia": "ee", "Latvia": "lv", "Lithuania": "lt", "Haiti": "ht", "Curaçao": "cw",
    "Curacao": "cw", "Cape_Verde": "cv", "Singapore": "sg", "Hong_Kong": "hk",
}


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "WCC-app/1.0 (squad updater)"})
    html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")

    heads = [(m.start(), m.group(1)) for m in re.finditer(r'<h3 id="([^"]+)"', html)]
    squads = {}
    unmatched = set()
    for idx, (pos, hid) in enumerate(heads):
        team = WIKI2APP.get(hid)
        if not team:
            continue
        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(html)
        sect = html[pos:end]
        players = []
        for row in re.findall(r'<tr class="nat-fs-player">(.*?)</tr>', sect, re.S):
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
            if len(cells) < 7:
                continue
            num = re.sub(r"<[^>]+>", "", cells[0]).strip()
            posm = re.search(r">(GK|DF|MF|FW)<", cells[1])
            namem = re.search(r'title="[^"]+"[^>]*>([^<]+)</a>', cells[2])
            hrefm = re.search(r'href="\./([^"#]+)"', cells[2])
            title = urllib.parse.unquote(hrefm.group(1)).replace("_", " ") if hrefm else None
            agem = re.search(r"aged?\s+(\d+)", cells[3])
            caps = re.sub(r"<[^>]+>", "", cells[4]).strip()
            goals = re.sub(r"<[^>]+>", "", cells[5]).strip()
            clubcell = cells[6]
            cc = ""
            flagm = re.search(r'File:Flag_of_([^."]+)\.svg', clubcell)
            if flagm:
                cc = C2ISO.get(flagm.group(1), "")
                if not cc:
                    unmatched.add(flagm.group(1))
            clubs = re.findall(r'<a[^>]*title="[^"]*"[^>]*>([^<]+)</a>', clubcell)
            club = clubs[-1].strip() if clubs else ""
            if not (posm and namem):
                continue
            players.append({
                "n": int(num) if num.isdigit() else 0,
                "p": posm.group(1),
                "name": namem.group(1).strip(),
                "a": int(agem.group(1)) if agem else None,
                "c": int(caps) if caps.isdigit() else 0,
                "g": int(goals) if goals.isdigit() else 0,
                "club": club,
                "cc": cc,
                "_title": title,
            })
        if players:
            squads[team] = players

    # enrich with detailed positions (CB, CDM, RW…) from Wikidata, then drop helper field
    all_titles = [p["_title"] for v in squads.values() for p in v if p.get("_title")]
    title2pos = resolve_positions(all_titles)
    n_detailed = 0
    for v in squads.values():
        for p in v:
            ab = title2pos.get(p.pop("_title", None))
            p["pos"] = ab or p["p"]
            if ab:
                n_detailed += 1
    print(f"detailed positions resolved for {n_detailed}/{sum(len(v) for v in squads.values())} players")

    n_players = sum(len(v) for v in squads.values())
    assert len(squads) == 48, f"expected 48 squads, got {len(squads)}"
    assert n_players >= 1200, f"squad data looks broken: {n_players} players"
    if unmatched:
        print(f"note: unmatched club-country flags (no iso): {sorted(unmatched)}", file=sys.stderr)

    out = (
        f'// World Cup 26 squads — source: Wikipedia "2026 FIFA World Cup squads" '
        f"(updated {date.today().isoformat()})\n"
        "const SQUADS = " + json.dumps(squads, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    (ROOT / "squads.js").write_text(out, encoding="utf-8")
    print(f"wrote squads.js: {len(squads)} teams, {n_players} players")


if __name__ == "__main__":
    main()
