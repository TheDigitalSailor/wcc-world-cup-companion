/* ================= WC26 schedule app ================= */

const TZ = { NL: "Europe/Amsterdam", PT: "Europe/Lisbon" };

// team name -> ISO code for circle-flags
const FLAG = {
  "Mexico":"mx","South Africa":"za","Korea Republic":"kr","Czechia":"cz",
  "Canada":"ca","Bosnia and Herzegovina":"ba","Qatar":"qa","Switzerland":"ch",
  "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
  "USA":"us","Paraguay":"py","Australia":"au","Türkiye":"tr",
  "Germany":"de","Curaçao":"cw","Côte d'Ivoire":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
  "Belgium":"be","Egypt":"eg","IR Iran":"ir","New Zealand":"nz",
  "Spain":"es","Cabo Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
  "France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no",
  "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
  "Portugal":"pt","Congo DR":"cd","Uzbekistan":"uz","Colombia":"co",
  "England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa"
};

// team name -> signature colour taken from the flag
const TEAM_COLOR = {
  "Mexico":"#006847","South Africa":"#007A4D","Korea Republic":"#CD2E3A","Czechia":"#11457E",
  "Canada":"#D80621","Bosnia and Herzegovina":"#FECB00","Qatar":"#8A1538","Switzerland":"#DA291C",
  "Brazil":"#009739","Morocco":"#C1272D","Haiti":"#00209F","Scotland":"#005EB8",
  "USA":"#3C3B6E","Paraguay":"#D52B1E","Australia":"#FFCD00","Türkiye":"#E30A17",
  "Germany":"#E1001F","Curaçao":"#002B7F","Côte d'Ivoire":"#FF8200","Ecuador":"#FFD100",
  "Netherlands":"#FF7900","Japan":"#BC002D","Sweden":"#006AA7","Tunisia":"#E70013",
  "Belgium":"#ED2939","Egypt":"#CE1126","IR Iran":"#239F40","New Zealand":"#012169",
  "Spain":"#F1BF00","Cabo Verde":"#003893","Saudi Arabia":"#006C35","Uruguay":"#55B5E5",
  "France":"#002395","Senegal":"#00853F","Iraq":"#007A3D","Norway":"#BA0C2F",
  "Argentina":"#75AADB","Algeria":"#006233","Austria":"#ED2939","Jordan":"#CE1126",
  "Portugal":"#E42518","Congo DR":"#0085CA","Uzbekistan":"#0099B5","Colombia":"#FCD116",
  "England":"#CF081F","Croatia":"#ED1C24","Ghana":"#006B3F","Panama":"#005293"
};

// Portugal free-to-air confirmed matches (matchNumber -> channel)
const PT_FTA = { 1:"TVI", 17:"RTP", 23:"SIC", 26:"RTP", 47:"TVI", 71:"RTP", 104:"RTP" };

const STAGE = { 4:"Round of 32", 5:"Round of 16", 6:"Quarter-final", 7:"Semi-final" };

const $ = (s) => document.querySelector(s);

function loadFavs() {
  try {
    const v = JSON.parse(localStorage.getItem("wc26-favs"));
    if (Array.isArray(v)) return v.filter(t => FLAG[t]);
  } catch { /* fall through */ }
  const old = localStorage.getItem("wc26-fav"); // migrate single-fav format
  return old && FLAG[old] ? [old] : [];
}

const state = {
  country: localStorage.getItem("wc26-country") || "PT",
  favs: loadFavs(),
  day: null,           // "YYYY-MM-DD" in selected tz
  tab: "schedule",
};
const isFavTeam = (t) => state.favs.includes(t);
const isFavMatch = (m) => isFavTeam(m.HomeTeam) || isFavTeam(m.AwayTeam);
const saveFavs = () => localStorage.setItem("wc26-favs", JSON.stringify(state.favs));

/* ---------- date helpers (all in selected tz) ---------- */
function parts(dateUtc, tz) {
  const d = new Date(dateUtc.replace(" ", "T"));
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", weekday:"short", hour12:false,
  }).formatToParts(d);
  const g = (t) => f.find(p => p.type === t).value;
  return {
    key: `${g("year")}-${g("month")}-${g("day")}`,
    time: `${g("hour")}:${g("minute")}`,
    dow: g("weekday"), dom: g("day"),
    mon: new Intl.DateTimeFormat("en-GB",{timeZone:tz,month:"short"}).format(d),
    long: new Intl.DateTimeFormat("en-GB",{timeZone:tz,weekday:"long",day:"numeric",month:"long"}).format(d),
    ts: d.getTime(),
  };
}
const todayKey = () => parts(new Date().toISOString(), TZ[state.country]).key;

/* ---------- derived data ---------- */
function matchDays() {
  const tz = TZ[state.country];
  const days = new Map();
  for (const m of MATCHES) {
    const p = parts(m.DateUtc, tz);
    if (!days.has(p.key)) days.set(p.key, { ...p, matches: [], hasFav: false });
    const day = days.get(p.key);
    day.matches.push({ m, p });
    if (isFavMatch(m)) day.hasFav = true;
  }
  return [...days.values()].sort((a, b) => a.key < b.key ? -1 : 1);
}

function teamLabel(name) {
  if (FLAG[name]) return name;
  if (/^1[A-L]$/.test(name)) return `Winner ${name[1]}`;
  if (/^2[A-L]$/.test(name)) return `Runner-up ${name[1]}`;
  if (/^3[A-L]+$/.test(name)) return `3rd ${name.slice(1).split("").join("/")}`;
  return "TBD";
}
const flagUrl = (name) => `https://hatscripts.github.io/circle-flags/flags/${FLAG[name]}.svg`;
function flagHtml(name, cls = "flag") {
  if (FLAG[name]) return `<img class="${cls}" src="${flagUrl(name)}" alt="" loading="lazy">`;
  const txt = /^[123]/.test(name) ? name.slice(0, 2) : "?";
  return `<div class="${cls} ph">${txt}</div>`;
}

function stageChip(m) {
  if (m.Group) {
    const letter = m.Group.slice(-1);
    return `<span class="stage-chip g${letter}">Group ${letter} · MD${m.RoundNumber}</span>`;
  }
  const label = m.RoundNumber === 8 ? (m.MatchNumber === 104 ? "Final" : "3rd place") : STAGE[m.RoundNumber];
  return `<span class="stage-chip gKO">${label}</span>`;
}

function watchChips(m) {
  const isPT = m.HomeTeam === "Portugal" || m.AwayTeam === "Portugal";
  let items;
  if (state.country === "NL") {
    items = [{ name: "NPO 1", free: true }, { name: "NOS app", free: true }];
  } else {
    items = [];
    const fta = PT_FTA[m.MatchNumber];
    if (fta) items.push({ name: fta, free: true });
    if (isPT || m.RoundNumber >= 7) items.push({ name: "LiveModeTV", free: true });
    items.push({ name: "Sport TV", free: false });
  }
  return `<span class="watch-label">Watch on</span>
    <span class="watch-list">${items.map(i =>
      `<span class="watch-item ${i.free ? "free" : ""}">${i.name}</span>`).join("")}</span>`;
}

/* ================= SCHEDULE PAGE ================= */

function renderStrip(days) {
  const strip = $("#datestrip");
  const tk = todayKey();
  strip.innerHTML = days.map(d => `
    <button class="date-pill ${d.key === state.day ? "on" : ""} ${d.key === tk ? "is-today" : ""}" data-day="${d.key}">
      <span class="dow">${d.dow}</span>
      <span class="dom">${d.dom}</span>
      <span class="mon">${d.mon}</span>
      ${d.hasFav ? '<span class="fav-dot"></span>' : ""}
    </button>`).join("");
  strip.querySelectorAll(".date-pill").forEach(btn =>
    btn.addEventListener("click", () => { state.day = btn.dataset.day; render(); })
  );
  const on = strip.querySelector(".date-pill.on");
  if (on) on.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}

function matchCard({ m, p }, i) {
  const played = m.HomeTeamScore !== null && m.AwayTeamScore !== null;
  const now = Date.now();
  const live = !played && now >= p.ts && now < p.ts + 2.1 * 3600e3 && !m.Winner;
  const mid = played
    ? `<span class="mc-score">${m.HomeTeamScore}–${m.AwayTeamScore}</span><span class="mc-status ft">Full time</span>`
    : live
      ? `<span class="mc-score">·</span><span class="mc-status live">● Live now</span>`
      : `<span class="mc-time">${p.time}</span><span class="mc-status">Kick-off</span>`;
  return `
  <article class="match-card ${isFavMatch(m) ? "fav" : ""}" style="animation-delay:${Math.min(i * 60, 360)}ms">
    <div class="mc-top">${stageChip(m)}<span class="mc-venue">${m.Location.replace(" Stadium", "")}</span></div>
    <div class="mc-teams">
      <div class="team" ${FLAG[m.HomeTeam] ? `data-squad="${m.HomeTeam}"` : ""}>${flagHtml(m.HomeTeam)}<span class="t-name">${teamLabel(m.HomeTeam)}</span></div>
      <div class="mc-mid">${mid}</div>
      <div class="team" ${FLAG[m.AwayTeam] ? `data-squad="${m.AwayTeam}"` : ""}>${flagHtml(m.AwayTeam)}<span class="t-name">${teamLabel(m.AwayTeam)}</span></div>
    </div>
    <div class="mc-watch">${watchChips(m)}</div>
  </article>`;
}

function renderDay(days) {
  const day = days.find(d => d.key === state.day);
  const tk = todayKey();
  if (!day) {
    $("#dayTitle").textContent = "No matches";
    $("#dayCount").textContent = "";
    $("#matchList").innerHTML = `<div class="empty"><span class="big">REST DAY</span>No matches scheduled.</div>`;
    return;
  }
  $("#dayTitle").textContent = day.key === tk ? "Today" : day.long;
  $("#dayCount").textContent = `${day.matches.length} match${day.matches.length > 1 ? "es" : ""}`;
  const sorted = [...day.matches].sort((a, b) => a.p.ts - b.p.ts);
  $("#matchList").innerHTML = sorted.map(matchCard).join("");
}

function renderFavBanner(days) {
  const el = $("#favBanner");
  if (!state.favs.length) { el.hidden = true; return; }
  const now = Date.now();
  let next = null;
  for (const d of days) for (const x of d.matches) {
    if (isFavMatch(x.m) && x.p.ts + 2.1 * 3600e3 > now) {
      if (!next || x.p.ts < next.p.ts) next = { ...x, dayKey: d.key };
    }
  }
  el.hidden = false;
  if (!next) {
    el.innerHTML = `<div><div class="fb-label">Favourites</div><div class="fb-text">No upcoming matches</div></div>`;
    el.onclick = null;
    return;
  }
  const m = next.m;
  const favSide = isFavTeam(m.HomeTeam) ? m.HomeTeam : m.AwayTeam;
  const opp = favSide === m.HomeTeam ? m.AwayTeam : m.HomeTeam;
  el.innerHTML = `<img src="${flagUrl(favSide)}" alt="">
    <div><div class="fb-label">Next: ${favSide}</div>
    <div class="fb-text">vs ${teamLabel(opp)} · ${next.p.dow} ${next.p.dom} ${next.p.mon} · ${next.p.time}</div></div>
    <span class="fb-go">›</span>`;
  el.onclick = () => { state.day = next.dayKey; render(); };
}

/* ================= STANDINGS PAGE ================= */

function computeGroups() {
  const groups = new Map(); // "A" -> Map(team -> row)
  for (const m of MATCHES) {
    if (!m.Group) continue;
    const letter = m.Group.slice(-1);
    if (!groups.has(letter)) groups.set(letter, new Map());
    const g = groups.get(letter);
    for (const t of [m.HomeTeam, m.AwayTeam]) {
      if (!g.has(t)) g.set(t, { team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
    }
    if (m.HomeTeamScore === null || m.AwayTeamScore === null) continue;
    const h = g.get(m.HomeTeam), a = g.get(m.AwayTeam);
    h.P++; a.P++;
    h.GF += m.HomeTeamScore; h.GA += m.AwayTeamScore;
    a.GF += m.AwayTeamScore; a.GA += m.HomeTeamScore;
    if (m.HomeTeamScore > m.AwayTeamScore) { h.W++; h.Pts += 3; a.L++; }
    else if (m.HomeTeamScore < m.AwayTeamScore) { a.W++; a.Pts += 3; h.L++; }
    else { h.D++; a.D++; h.Pts++; a.Pts++; }
  }
  return [...groups.entries()].sort().map(([letter, g]) => ({
    letter,
    rows: [...g.values()].sort((x, y) =>
      y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.team.localeCompare(y.team)),
  }));
}

function renderStandings() {
  const groups = computeGroups();
  $("#groupList").innerHTML = groups.map((g, gi) => `
    <div class="group-card" style="animation-delay:${Math.min(gi * 50, 400)}ms">
      <div class="group-head"><span class="stage-chip g${g.letter}">Group ${g.letter}</span></div>
      <div class="g-row g-head-row"><span></span><span></span><span>P</span><span>+/-</span><span>Pts</span></div>
      ${g.rows.map((r, i) => `
        <div class="g-row ${i < 2 ? "ql" : ""} ${isFavTeam(r.team) ? "favrow" : ""}" data-squad="${r.team}">
          <span class="g-pos">${i + 1}</span>
          <span class="g-team">${flagHtml(r.team, "g-flag")}<b>${r.team}</b>${isFavTeam(r.team) ? " ★" : ""}</span>
          <span>${r.P}</span>
          <span>${r.GF - r.GA > 0 ? "+" : ""}${r.GF - r.GA}</span>
          <span class="g-pts">${r.Pts}</span>
        </div>`).join("")}
    </div>`).join("");
}

/* ================= BRACKET PAGE ================= */

function bracketCard(m) {
  const p = parts(m.DateUtc, TZ[state.country]);
  const played = m.HomeTeamScore !== null && m.AwayTeamScore !== null;
  const row = (team, score, winner) => `
    <div class="bk-row ${winner ? "win" : ""}">
      ${flagHtml(team, "bk-flag")}
      <span class="bk-name">${teamLabel(team)}</span>
      <span class="bk-score">${score ?? ""}</span>
    </div>`;
  return `
  <div class="bk-card ${isFavMatch(m) ? "fav" : ""}">
    ${row(m.HomeTeam, played ? m.HomeTeamScore : null, m.Winner && m.Winner === m.HomeTeam)}
    ${row(m.AwayTeam, played ? m.AwayTeamScore : null, m.Winner && m.Winner === m.AwayTeam)}
    <div class="bk-meta">${p.dow} ${p.dom} ${p.mon} · ${played ? "FT" : p.time} · ${m.Location.replace(" Stadium", "")}</div>
  </div>`;
}

function renderBracket() {
  const cols = [
    { label: "Round of 32", ms: MATCHES.filter(m => m.RoundNumber === 4) },
    { label: "Round of 16", ms: MATCHES.filter(m => m.RoundNumber === 5) },
    { label: "Quarter-finals", ms: MATCHES.filter(m => m.RoundNumber === 6) },
    { label: "Semi-finals", ms: MATCHES.filter(m => m.RoundNumber === 7) },
    { label: "Final", ms: MATCHES.filter(m => m.MatchNumber === 104) },
    { label: "3rd place", ms: MATCHES.filter(m => m.MatchNumber === 103) },
  ];
  $("#bracket").innerHTML = cols.map((c, ci) => `
    <div class="bk-col" style="animation-delay:${ci * 60}ms">
      <div class="bk-col-head">${c.label}<em>${c.ms.length}</em></div>
      ${c.ms.sort((a, b) => a.MatchNumber - b.MatchNumber).map(bracketCard).join("")}
    </div>`).join("");
}

/* ================= FAVOURITES PAGE (picker + calendar) ================= */

function renderFavsPage() {
  if (state.favs.length && state.favMode !== "edit") renderFavCalendar();
  else renderFavPicker();
}

function renderFavPicker() {
  $("#favHint").textContent = state.favs.length
    ? `${state.favs.length} team${state.favs.length > 1 ? "s" : ""} picked.`
    : "Tap teams to follow them. Pick as many as you like.";
  const grid = $("#teamGrid");
  grid.innerHTML = Object.keys(FLAG).sort().map(t => `
    <button class="team-opt ${isFavTeam(t) ? "picked" : ""}" data-team="${t}" style="--tc:${TEAM_COLOR[t]}">
      <img src="${flagUrl(t)}" alt="" loading="lazy">
      <span>${t}</span>
    </button>`).join("") + `
    <button class="confirm-btn" id="confirmFavs" ${state.favs.length ? "" : "disabled"}>
      Confirm · view calendar
    </button>`;
  grid.querySelectorAll(".team-opt").forEach(btn =>
    btn.addEventListener("click", () => {
      const t = btn.dataset.team;
      state.favs = isFavTeam(t) ? state.favs.filter(x => x !== t) : [...state.favs, t];
      saveFavs();
      btn.classList.toggle("picked");
      renderFavMeta();
      $("#confirmFavs").disabled = !state.favs.length;
      $("#favHint").textContent = state.favs.length
        ? `${state.favs.length} team${state.favs.length > 1 ? "s" : ""} picked.`
        : "Tap teams to follow them. Pick as many as you like.";
    })
  );
  $("#confirmFavs").addEventListener("click", () => {
    state.favMode = "cal";
    render();
  });
}

/* ---- calendar ---- */
const MONTHS = [{ y: 2026, mo: 5, name: "June" }, { y: 2026, mo: 6, name: "July" }];
const pad2 = (n) => String(n).padStart(2, "0");

function favDayMap() {
  const map = new Map(); // dayKey -> [{m,p}]
  for (const d of matchDays()) {
    const favs = d.matches.filter(x => isFavMatch(x.m));
    if (favs.length) map.set(d.key, favs);
  }
  return map;
}

function dayBg(entries) {
  const colors = [...new Set(entries.flatMap(({ m }) =>
    [m.HomeTeam, m.AwayTeam].filter(isFavTeam).map(t => TEAM_COLOR[t])))];
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  return `linear-gradient(135deg, ${colors.map((c, i) =>
    `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;
}

function renderFavCalendar() {
  if (state.calMonth === undefined) {
    state.calMonth = todayKey() >= "2026-07-01" ? 1 : 0;
  }
  const { y, mo, name } = MONTHS[state.calMonth];
  const favDays = favDayMap();
  const tk = todayKey();
  const first = new Date(Date.UTC(y, mo, 1)).getUTCDay(); // 0 = Sunday
  const nDays = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();

  let cells = "";
  for (let i = 0; i < first; i++) cells += `<span class="cal-day off"></span>`;
  for (let d = 1; d <= nDays; d++) {
    const key = `${y}-${pad2(mo + 1)}-${pad2(d)}`;
    const inCup = key >= "2026-06-11" && key <= "2026-07-19";
    const entries = favDays.get(key);
    if (!inCup) { cells += `<span class="cal-day off"><i>${d}</i></span>`; continue; }
    cells += `<button class="cal-day ${entries ? "has" : ""} ${key === tk ? "today" : ""} ${key === state.calSel ? "sel" : ""}"
      data-cal="${key}" ${entries ? `style="background:${dayBg(entries)}"` : ""}>${d}</button>`;
  }

  const legend = state.favs.map(t => `
    <span class="cal-team" style="--tc:${TEAM_COLOR[t]}">
      <img src="${flagUrl(t)}" alt=""><b>${t}</b>
    </span>`).join("");

  const sel = state.calSel && favDays.get(state.calSel);
  const selHtml = sel
    ? sel.sort((a, b) => a.p.ts - b.p.ts).map(matchCard).join("")
    : state.calSel
      ? `<div class="empty">No favourite matches this day.</div>`
      : `<div class="cal-hint">Tap a coloured day to see the match.</div>`;

  $("#favHint").textContent = "";
  $("#teamGrid").innerHTML = `
    <div class="cal-wrap">
      <div class="cal-bar">
        <div class="cal-month">
          <button class="cal-nav" data-calnav="-1" ${state.calMonth === 0 ? "disabled" : ""}>‹</button>
          <span>${name}</span>
          <button class="cal-nav" data-calnav="1" ${state.calMonth === 1 ? "disabled" : ""}>›</button>
        </div>
        <button class="cal-edit" id="editFavs">Edit teams</button>
      </div>
      <div class="cal-legend">${legend}</div>
      <div class="cal-card">
        <div class="cal-grid cal-head">${["S","M","T","W","T","F","S"].map(d => `<span>${d}</span>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
      </div>
      <div class="cal-matches">${selHtml}</div>
    </div>`;

  $("#editFavs").addEventListener("click", () => { state.favMode = "edit"; render(); });
  document.querySelectorAll("[data-calnav]").forEach(b =>
    b.addEventListener("click", () => { state.calMonth += +b.dataset.calnav; state.calSel = null; render(); }));
  document.querySelectorAll("[data-cal]").forEach(b =>
    b.addEventListener("click", () => { state.calSel = b.dataset.cal; render(); }));
}

function renderFavMeta() {
  const badge = $("#favCount");
  badge.hidden = !state.favs.length;
  badge.textContent = state.favs.length;
}

/* ================= SQUAD SHEET ================= */

const POS_LABEL = { GK: "Goalkeepers", DF: "Defenders", MF: "Midfielders", FW: "Forwards" };

const initials = (name) => {
  const w = name.split(" ").filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : name.slice(0, 2)).toUpperCase();
};

function playerCard(p, i) {
  return `
  <div class="pl-card" style="animation-delay:${Math.min(i * 30, 500)}ms">
    <div class="pl-top"><span class="pl-num">${p.n || "–"}</span><span class="pl-pos">${p.p}</span></div>
    <div class="pl-photo"><span class="pl-mono">${initials(p.name)}</span></div>
    <div class="pl-name">${p.name}</div>
    <div class="pl-club">
      ${p.cc ? `<img src="https://hatscripts.github.io/circle-flags/flags/${p.cc}.svg" alt="">` : ""}
      <span>${p.club || "—"}</span>
    </div>
    <div class="pl-meta">${p.a ?? "–"} yrs · ${p.c} caps${p.p !== "GK" ? ` · ${p.g} goals` : ""}</div>
  </div>`;
}

function openSquad(team) {
  const squad = typeof SQUADS !== "undefined" && SQUADS[team];
  if (!squad) return;
  let i = 0;
  $("#squadInner").innerHTML = `
    <div class="squad-hero">
      <button class="squad-close" id="squadClose" aria-label="Close">✕</button>
      <img class="squad-flag" src="${flagUrl(team)}" alt="">
      <div class="squad-title">${team}</div>
      <div class="squad-sub">Squad 26 · ${squad.length} players</div>
    </div>
    ${["GK", "DF", "MF", "FW"].map(pos => {
      const ps = squad.filter(p => p.p === pos);
      return ps.length ? `
        <div class="squad-pos">${POS_LABEL[pos]}<em>${ps.length}</em></div>
        <div class="pl-grid">${ps.map(p => playerCard(p, i++)).join("")}</div>` : "";
    }).join("")}
    <div class="squad-src">Squad data: Wikipedia · clubs as of the tournament squad lists</div>`;
  $("#squadBackdrop").hidden = false;
  $("#squadSheet").hidden = false;
  $("#squadSheet").scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $("#squadBackdrop").classList.add("show");
    $("#squadSheet").classList.add("show");
  }));
  $("#squadClose").addEventListener("click", closeSquad);
}
function closeSquad() {
  $("#squadBackdrop").classList.remove("show");
  $("#squadSheet").classList.remove("show");
  setTimeout(() => { $("#squadBackdrop").hidden = true; $("#squadSheet").hidden = true; }, 500);
}

// open from match cards and standings rows (event delegation)
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-squad]");
  if (t) openSquad(t.dataset.squad);
});
$("#squadBackdrop") && $("#squadBackdrop").addEventListener("click", closeSquad);

/* ================= TABS ================= */

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.page === tab));
  for (const p of ["schedule", "standings", "bracket", "favs"]) {
    const el = $(`#page-${p}`);
    el.hidden = p !== tab;
    if (p === tab) { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
  }
  render();
  window.scrollTo({ top: 0 });
}

/* ================= RENDER ================= */

function renderSeg() {
  document.querySelectorAll(".seg-btn").forEach(b =>
    b.classList.toggle("on", b.dataset.country === state.country));
  $("#segThumb").style.transform = state.country === "NL" ? "translateX(100%)" : "translateX(0)";
}

function renderFoot() {
  $("#footNote").textContent = state.country === "NL"
    ? "🇳🇱 In the Netherlands, NOS broadcasts all 104 matches free on NPO 1 / NPO Start. Times shown in Amsterdam time."
    : "🇵🇹 Em Portugal, a Sport TV transmite os 104 jogos; 20 jogos em sinal aberto (RTP/SIC/TVI) e 34 grátis na LiveModeTV (YouTube), incluindo todos os jogos de Portugal, meias-finais e final. Horas de Lisboa.";
}

function render() {
  renderSeg();
  renderFavMeta();
  if (state.tab === "schedule") {
    const days = matchDays();
    if (!state.day) {
      const tk = todayKey();
      state.day = (days.find(d => d.key >= tk) || days[days.length - 1]).key;
    }
    renderStrip(days);
    renderDay(days);
    renderFavBanner(days);
    renderFoot();
  } else if (state.tab === "standings") {
    renderStandings();
  } else if (state.tab === "bracket") {
    renderBracket();
  } else {
    renderFavsPage();
  }
}

/* ---------- live score refresh ---------- */
async function refreshScores() {
  const feed = "https://fixturedownload.com/feed/json/fifa-world-cup-2026";
  const urls = [feed, "https://corsproxy.io/?url=" + encodeURIComponent(feed)];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const fresh = await res.json();
      if (!Array.isArray(fresh) || !fresh.length) continue;
      const byNum = new Map(fresh.map(m => [m.MatchNumber, m]));
      let changed = false;
      MATCHES.forEach((m, i) => {
        const f = byNum.get(m.MatchNumber);
        if (f && JSON.stringify(f) !== JSON.stringify(m)) { MATCHES[i] = f; changed = true; }
      });
      if (changed) render();
      return;
    } catch { /* try next source */ }
  }
}

/* ---------- wire up ---------- */
document.querySelectorAll(".seg-btn").forEach(b =>
  b.addEventListener("click", () => {
    state.country = b.dataset.country;
    localStorage.setItem("wc26-country", state.country);
    render();
  })
);
document.querySelectorAll(".tab").forEach(b =>
  b.addEventListener("click", () => setTab(b.dataset.page))
);
$("#clearFav").addEventListener("click", () => {
  state.favs = [];
  state.favMode = "edit";
  state.calSel = null;
  saveFavs();
  render();
});

render();
refreshScores();
setInterval(refreshScores, 90e3);
