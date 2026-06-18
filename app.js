/* ================= WC26 schedule app ================= */

// Kickoff times always follow the viewer's real location — detected from the
// device, no permission prompt. The PT/NL toggle only switches TV channels.
const DEVICE_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Lisbon"; }
  catch { return "Europe/Lisbon"; }
})();
// Friendly label for the detected zone, e.g. "São Paulo (GMT-3)"
function tzLabel() {
  const city = DEVICE_TZ.split("/").pop().replace(/_/g, " ");
  try {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: DEVICE_TZ, timeZoneName: "shortOffset" })
      .formatToParts(new Date()).find(x => x.type === "timeZoneName");
    return p ? `${city} (${p.value})` : city;
  } catch { return city; }
}

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
const PT_FTA = { 1:"TVI", 17:"RTP", 23:"SIC", 26:"RTP", 33:"TVI", 47:"TVI", 61:"TVI", 71:"RTP", 104:"RTP" };

// Group-stage matches on LiveModeTV (YouTube) for PT viewers — derived from B24 schedule
const PT_LIVEMODE = new Set([1,3,7,10,14,17,26,29,33,43,49,56]);

// Approx FIFA ranking points (late 2025) — powers the WCC win-probability model
const FIFA_RANK = {
  "Argentina":1885,"Spain":1875,"France":1870,"England":1820,"Brazil":1775,
  "Portugal":1770,"Netherlands":1760,"Belgium":1740,"Germany":1730,"Croatia":1715,
  "Morocco":1700,"Colombia":1690,"Uruguay":1680,"Japan":1655,"USA":1660,
  "Mexico":1650,"Switzerland":1640,"IR Iran":1630,"Senegal":1630,"Austria":1580,
  "Türkiye":1560,"Sweden":1560,"Korea Republic":1575,"Ecuador":1570,"Canada":1535,
  "Norway":1530,"Egypt":1515,"Tunisia":1505,"Algeria":1505,"Scotland":1500,
  "Australia":1500,"Côte d'Ivoire":1490,"Paraguay":1480,"Ghana":1455,"Panama":1450,
  "Qatar":1450,"Bosnia and Herzegovina":1450,"South Africa":1435,"Uzbekistan":1435,
  "Saudi Arabia":1420,"Congo DR":1410,"Iraq":1400,"Jordan":1390,"Cabo Verde":1390,
  "New Zealand":1325,"Curaçao":1320,"Haiti":1315
};
const HOSTS = new Set(["USA","Mexico","Canada"]);
const WCgoals = (name) => (typeof WC_GOALS !== "undefined" && WC_GOALS[name]) || 0;

const STAGE_KEY = { 4: "stageR32", 5: "stageR16", 6: "qf1", 7: "sf1" };

const $ = (s) => document.querySelector(s);

// escape any externally-sourced string (feed/Wikipedia) before putting it in HTML
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= i18n (PT toggle = European Portuguese) ================= */
const I18N = {
  en: {
    whereToWatch: "Where to watch", matches: "Matches", groups: "Groups", bracket: "Bracket",
    teams: "Teams", today: "Today", standings: "Standings", groupsCount: "12 groups",
    knockouts: "Knockouts", roadToFinal: "Road to the final", favourites: "Favourites",
    clearAll: "Clear all", matchN1: "{n} match", matchN: "{n} matches", noMatches: "No matches",
    restDay: "REST DAY", noMatchesScheduled: "No matches scheduled.", kickoff: "Kick-off",
    fullTime: "Full time", live: "Live", watchOn: "Watch on", next: "Next",
    noUpcoming: "No upcoming matches", preview: "Preview", recap: "Recap",
    pickHint: "Tap teams to follow them. Pick as many as you like.",
    teamPicked1: "{n} team picked.", teamPicked: "{n} teams picked.",
    confirmCal: "Confirm · view calendar", editTeams: "Edit teams",
    tapDay: "Tap a coloured day to see the match.", noFavDay: "No favourite matches this day.",
    squad: "Squad", players: "players",
    posGK: "Goalkeepers", posDF: "Defenders", posMF: "Midfielders", posFW: "Forwards",
    squadSrc: "Squad data: Wikipedia · clubs as of the tournament squad lists",
    age: "Age", apps: "Matches", ntGoals: "NT goals", wcGoals: "WC26 goals",
    clubUnknown: "Club unknown", whosFavoured: "Who's favoured", wccModel: "WCC model",
    draw: "Draw", formTitle: "Form this tournament", keyPlayers: "Key players", goalsTitle: "Goals",
    scorersSoon: "Goalscorers appear here once the match report is published.",
    groupPicture: "Group picture", didYouKnow: "Did you know", highlights: "Highlights", news: "News",
    startingXI: "Starting XI",
    teamsTBC: "Teams to be confirmed — check back once the group stage and bracket take shape.",
    matchSrc: "Preview &amp; model are generated by WCC from public data · Highlights &amp; news open official sources",
    winnerOf: "Winner {g}", runnerUp: "Runner-up {g}", thirdOf: "3rd {g}", tbd: "TBD",
    goalsThisWC1: "{n} goal this WC", goalsThisWC: "{n} goals this WC",
    ntGoalsLine: "{n} national-team goals", capsLine: "{n} caps", ft: "FT",
    mostCapped: "{name} ({team}) is the most-capped player on show — {c} internationals.",
    youngest: "Eye on the kid: {name} ({team}) is only {a}.",
    hotScorer: "{name} has already scored {n}× at this World Cup.",
    groupLine: "{h} sit {hp} ({hpts}pts) · {a} {ap} ({apts}pts) in Group {g}.",
    stageR32: "Round of 32", stageR16: "Round of 16", stageQF: "Quarter-finals",
    stageSF: "Semi-finals", stageFinal: "Final", stageThird: "3rd place",
    qf1: "Quarter-final", sf1: "Semi-final", md: "MD", group: "Group",
    metaYrs: "yrs", metaCaps: "caps", metaGoals: "goals",
    tOnFire: "On fire this World Cup", tScorer: "Absolute scorer", tClinical: "Clinical finisher",
    tLivewire: "Livewire forward", tGoalMid: "Goalscoring midfielder", tGeneral: "Midfield general",
    tEngine: "Engine room", tSetPiece: "Set-piece threat", tRock: "Rock at the back",
    tNoNonsense: "No-nonsense defender", tSafeHands: "Safe hands", tShotStopper: "Shot stopper",
    tCenturion: "Centurion", tWonderkid: "Wonderkid", tVeteran: "Tournament veteran",
    tNo10: "Wears the 10", tNo9: "Classic No. 9",
    roleGK: "Goalkeeper", roleDF: "Defender", roleCB: "Centre-back", roleRB: "Right-back",
    roleLB: "Left-back", roleFB: "Full-back", roleWB: "Wing-back", roleLWB: "Left wing-back",
    roleRWB: "Right wing-back", roleSW: "Sweeper", roleMF: "Midfielder", roleCDM: "Defensive midfielder",
    roleCM: "Central midfielder", roleCAM: "Attacking midfielder", roleLM: "Left midfielder",
    roleRM: "Right midfielder", roleWM: "Wide midfielder", roleDLP: "Deep-lying playmaker",
    roleFW: "Forward", roleCF: "Centre-forward", roleST: "Striker", roleSS: "Second striker",
    roleW: "Winger", roleLW: "Left winger", roleRW: "Right winger", roleIF: "Inside forward",
  },
  pt: {
    whereToWatch: "Onde ver", matches: "Jogos", groups: "Grupos", bracket: "Quadro",
    teams: "Equipas", today: "Hoje", standings: "Classificação", groupsCount: "12 grupos",
    knockouts: "Eliminatórias", roadToFinal: "Rumo à final", favourites: "Favoritos",
    clearAll: "Limpar tudo", matchN1: "{n} jogo", matchN: "{n} jogos", noMatches: "Sem jogos",
    restDay: "DIA DE FOLGA", noMatchesScheduled: "Não há jogos agendados.", kickoff: "Início",
    fullTime: "Fim do jogo", live: "Em direto", watchOn: "Ver em", next: "A seguir",
    noUpcoming: "Sem jogos próximos", preview: "Antevisão", recap: "Resumo",
    pickHint: "Toca nas equipas para as seguir. Escolhe as que quiseres.",
    teamPicked1: "{n} equipa escolhida.", teamPicked: "{n} equipas escolhidas.",
    confirmCal: "Confirmar · ver calendário", editTeams: "Editar equipas",
    tapDay: "Toca num dia colorido para ver o jogo.", noFavDay: "Sem jogos de favoritos neste dia.",
    squad: "Plantel", players: "jogadores",
    posGK: "Guarda-redes", posDF: "Defesas", posMF: "Médios", posFW: "Avançados",
    squadSrc: "Dados do plantel: Wikipédia · clubes à data das convocatórias",
    age: "Idade", apps: "Jogos", ntGoals: "Golos seleção", wcGoals: "Golos Mundial",
    clubUnknown: "Clube desconhecido", whosFavoured: "Quem é favorito", wccModel: "modelo WCC",
    draw: "Empate", formTitle: "Forma neste Mundial", keyPlayers: "Jogadores-chave", goalsTitle: "Golos",
    scorersSoon: "Os marcadores aparecem aqui assim que o relatório do jogo for publicado.",
    groupPicture: "Situação no grupo", didYouKnow: "Sabias que", highlights: "Melhores momentos", news: "Notícias",
    startingXI: "Onze inicial",
    teamsTBC: "Equipas por confirmar — volta quando a fase de grupos e o quadro estiverem definidos.",
    matchSrc: "Antevisão e modelo gerados pela WCC a partir de dados públicos · Vídeos e notícias abrem fontes oficiais",
    winnerOf: "Vencedor {g}", runnerUp: "2.º {g}", thirdOf: "3.º {g}", tbd: "A definir",
    goalsThisWC1: "{n} golo no Mundial", goalsThisWC: "{n} golos no Mundial",
    ntGoalsLine: "{n} golos pela seleção", capsLine: "{n} internacionalizações", ft: "Fim",
    mostCapped: "{name} ({team}) é o jogador com mais internacionalizações em campo — {c}.",
    youngest: "Atenção ao jovem: {name} ({team}) tem apenas {a} anos.",
    hotScorer: "{name} já marcou {n}× neste Mundial.",
    groupLine: "{h} está em {hp} ({hpts}pts) · {a} em {ap} ({apts}pts) no Grupo {g}.",
    stageR32: "16 avos de final", stageR16: "Oitavos de final", stageQF: "Quartos de final",
    stageSF: "Meias-finais", stageFinal: "Final", stageThird: "3.º lugar",
    qf1: "Quartos de final", sf1: "Meia-final", md: "J", group: "Grupo",
    metaYrs: "anos", metaCaps: "jogos", metaGoals: "golos",
    tOnFire: "Em grande forma no Mundial", tScorer: "Goleador nato", tClinical: "Finalizador clínico",
    tLivewire: "Avançado irrequieto", tGoalMid: "Médio goleador", tGeneral: "General do meio-campo",
    tEngine: "Motor da equipa", tSetPiece: "Perigo nas bolas paradas", tRock: "Muralha defensiva",
    tNoNonsense: "Defesa rijo", tSafeHands: "Mãos seguras", tShotStopper: "Especialista em defesas",
    tCenturion: "Centurião", tWonderkid: "Jovem promessa", tVeteran: "Veterano do torneio",
    tNo10: "Veste a 10", tNo9: "9 clássico",
    roleGK: "Guarda-redes", roleDF: "Defesa", roleCB: "Defesa central", roleRB: "Lateral direito",
    roleLB: "Lateral esquerdo", roleFB: "Lateral", roleWB: "Ala", roleLWB: "Ala esquerdo",
    roleRWB: "Ala direito", roleSW: "Líbero", roleMF: "Médio", roleCDM: "Médio defensivo",
    roleCM: "Médio centro", roleCAM: "Médio ofensivo", roleLM: "Médio esquerdo",
    roleRM: "Médio direito", roleWM: "Médio ala", roleDLP: "Médio organizador",
    roleFW: "Avançado", roleCF: "Ponta de lança", roleST: "Avançado", roleSS: "Segundo avançado",
    roleW: "Extremo", roleLW: "Extremo esquerdo", roleRW: "Extremo direito", roleIF: "Avançado interior",
  },
};
const lang = () => (state.country === "PT" ? "pt" : "en");
const locale = () => (lang() === "pt" ? "pt-PT" : "en-GB");
function t(key, vars) {
  let s = (I18N[lang()][key] ?? I18N.en[key] ?? key);
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s;
}
const ordinal = (i) => (lang() === "pt" ? `${i + 1}.º` : (["1st", "2nd", "3rd", "4th"][i] || `${i + 1}th`));

function loadFavs() {
  try {
    const v = JSON.parse(localStorage.getItem("wc26-favs"));
    if (Array.isArray(v)) return v.filter(t => FLAG[t]);
  } catch { /* fall through */ }
  const old = localStorage.getItem("wc26-fav"); // migrate single-fav format
  return old && FLAG[old] ? [old] : [];
}

const state = {
  // default by location (no saved choice): Portugal → PT, everywhere else → NL
  country: localStorage.getItem("wc26-country") || (/Lisbon|Madeira|Azores/.test(DEVICE_TZ) ? "PT" : "NL"),
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
  const g = (k) => f.find(p => p.type === k).value;
  const loc = locale();
  return {
    key: `${g("year")}-${g("month")}-${g("day")}`,
    time: `${g("hour")}:${g("minute")}`,
    dom: g("day"),
    dow: new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "short" }).format(d).replace(".", ""),
    mon: new Intl.DateTimeFormat(loc, { timeZone: tz, month: "short" }).format(d).replace(".", ""),
    long: new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(d),
    ts: d.getTime(),
  };
}
const todayKey = () => parts(new Date().toISOString(), DEVICE_TZ).key;

/* ---------- derived data ---------- */
function matchDays() {
  const tz = DEVICE_TZ;
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
  if (/^1[A-L]$/.test(name)) return t("winnerOf", { g: name[1] });
  if (/^2[A-L]$/.test(name)) return t("runnerUp", { g: name[1] });
  if (/^3[A-L]+$/.test(name)) return t("thirdOf", { g: name.slice(1).split("").join("/") });
  return t("tbd");
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
    return `<span class="stage-chip g${letter}">${t("group")} ${letter} · ${t("md")}${m.RoundNumber}</span>`;
  }
  const label = m.RoundNumber === 8
    ? (m.MatchNumber === 104 ? t("stageFinal") : t("stageThird"))
    : t(STAGE_KEY[m.RoundNumber]);
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
    if (isPT || m.RoundNumber >= 7 || PT_LIVEMODE.has(m.MatchNumber)) items.push({ name: "LiveModeTV", free: true });
    items.push({ name: "Sport TV", free: false });
  }
  return `<span class="watch-label">${t("watchOn")}</span>
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

// shared status — prefer ESPN's live state when we have it, else infer from time
function matchStatus(m) {
  const ts = new Date(m.DateUtc.replace(" ", "T")).getTime();
  const now = Date.now();
  const hasScore = m.HomeTeamScore !== null && m.AwayTeamScore !== null;
  if (m._st) { // live state from ESPN: "pre" | "in" | "post"
    return { ts, hasScore, finished: m._st.state === "post", live: m._st.state === "in", clock: m._st.label };
  }
  const past = now >= ts + 2.5 * 3600e3;
  const finished = !!m.Winner || (hasScore && past);
  const live = !finished && now >= ts && !past;
  return { ts, hasScore, finished, live, clock: null };
}
const anyLiveNow = () => MATCHES.some(m => matchStatus(m).live);

function matchCard({ m, p }, i) {
  const { hasScore, finished, live, clock } = matchStatus(m);
  const score = `${m.HomeTeamScore}–${m.AwayTeamScore}`;
  const mid = live
    ? `<span class="mc-score">${hasScore ? score : "·"}</span><span class="mc-status live">● ${esc(clock || t("live"))}</span>`
    : finished
      ? `<span class="mc-score">${hasScore ? score : "—"}</span><span class="mc-status ft">${t("fullTime")}</span>`
      : `<span class="mc-time">${p.time}</span><span class="mc-status">${t("kickoff")}</span>`;
  return `
  <article class="match-card ${isFavMatch(m) ? "fav" : ""}" data-match="${m.MatchNumber}" style="animation-delay:${Math.min(i * 60, 360)}ms">
    <div class="mc-top">${stageChip(m)}<span class="mc-venue">${esc(m.Location.replace(" Stadium", ""))}</span></div>
    <div class="mc-teams">
      <div class="team" ${FLAG[m.HomeTeam] ? `data-squad="${m.HomeTeam}"` : ""}>${flagHtml(m.HomeTeam)}<span class="t-name">${teamLabel(m.HomeTeam)}</span></div>
      <div class="mc-mid">${mid}</div>
      <div class="team" ${FLAG[m.AwayTeam] ? `data-squad="${m.AwayTeam}"` : ""}>${flagHtml(m.AwayTeam)}<span class="t-name">${teamLabel(m.AwayTeam)}</span></div>
    </div>
    <div class="mc-watch">${watchChips(m)}</div>
    <div class="mc-more">${live ? t("live") : finished ? t("recap") : t("preview")} <span>›</span></div>
  </article>`;
}

function renderDay(days) {
  const day = days.find(d => d.key === state.day);
  const tk = todayKey();
  if (!day) {
    $("#dayTitle").textContent = t("noMatches");
    $("#dayCount").textContent = "";
    $("#matchList").innerHTML = `<div class="empty"><span class="big">${t("restDay")}</span>${t("noMatchesScheduled")}</div>`;
    return;
  }
  $("#dayTitle").textContent = day.key === tk ? t("today") : day.long;
  const n = day.matches.length;
  $("#dayCount").textContent = t(n === 1 ? "matchN1" : "matchN", { n });
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
    el.innerHTML = `<div><div class="fb-label">${t("favourites")}</div><div class="fb-text">${t("noUpcoming")}</div></div>`;
    el.onclick = null;
    return;
  }
  const m = next.m;
  const favSide = isFavTeam(m.HomeTeam) ? m.HomeTeam : m.AwayTeam;
  const opp = favSide === m.HomeTeam ? m.AwayTeam : m.HomeTeam;
  el.innerHTML = `<img src="${flagUrl(favSide)}" alt="">
    <div><div class="fb-label">${t("next")}: ${esc(favSide)}</div>
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
      <div class="group-head"><span class="stage-chip g${g.letter}">${t("group")} ${g.letter}</span></div>
      <div class="g-row g-head-row"><span></span><span></span><span>P</span><span>+/-</span><span>Pts</span></div>
      ${g.rows.map((r, i) => `
        <div class="g-row ${i < 2 ? "ql" : ""} ${isFavTeam(r.team) ? "favrow" : ""}" data-squad="${esc(r.team)}">
          <span class="g-pos">${i + 1}</span>
          <span class="g-team">${flagHtml(r.team, "g-flag")}<b>${esc(r.team)}</b>${isFavTeam(r.team) ? " ★" : ""}</span>
          <span>${r.P}</span>
          <span>${r.GF - r.GA > 0 ? "+" : ""}${r.GF - r.GA}</span>
          <span class="g-pts">${r.Pts}</span>
        </div>`).join("")}
    </div>`).join("");
}

/* ================= BRACKET PAGE ================= */

function bracketCard(m) {
  const p = parts(m.DateUtc, DEVICE_TZ);
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
    <div class="bk-meta">${p.dow} ${p.dom} ${p.mon} · ${played ? t("ft") : p.time} · ${esc(m.Location.replace(" Stadium", ""))}</div>
  </div>`;
}

function renderBracket() {
  const cols = [
    { label: t("stageR32"), ms: MATCHES.filter(m => m.RoundNumber === 4) },
    { label: t("stageR16"), ms: MATCHES.filter(m => m.RoundNumber === 5) },
    { label: t("stageQF"), ms: MATCHES.filter(m => m.RoundNumber === 6) },
    { label: t("stageSF"), ms: MATCHES.filter(m => m.RoundNumber === 7) },
    { label: t("stageFinal"), ms: MATCHES.filter(m => m.MatchNumber === 104) },
    { label: t("stageThird"), ms: MATCHES.filter(m => m.MatchNumber === 103) },
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

const pickedHint = () => state.favs.length
  ? t(state.favs.length === 1 ? "teamPicked1" : "teamPicked", { n: state.favs.length })
  : t("pickHint");

function renderFavPicker() {
  $("#favHint").textContent = pickedHint();
  const grid = $("#teamGrid");
  grid.innerHTML = Object.keys(FLAG).sort().map(team => `
    <button class="team-opt ${isFavTeam(team) ? "picked" : ""}" data-team="${esc(team)}" style="--tc:${TEAM_COLOR[team]}">
      <img src="${flagUrl(team)}" alt="" loading="lazy">
      <span>${esc(team)}</span>
    </button>`).join("") + `
    <button class="confirm-btn" id="confirmFavs" ${state.favs.length ? "" : "disabled"}>
      ${t("confirmCal")}
    </button>`;
  grid.querySelectorAll(".team-opt").forEach(btn =>
    btn.addEventListener("click", () => {
      const team = btn.dataset.team;
      state.favs = isFavTeam(team) ? state.favs.filter(x => x !== team) : [...state.favs, team];
      saveFavs();
      btn.classList.toggle("picked");
      renderFavMeta();
      $("#confirmFavs").disabled = !state.favs.length;
      $("#favHint").textContent = pickedHint();
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
  const { y, mo } = MONTHS[state.calMonth];
  const monthName = new Intl.DateTimeFormat(locale(), { month: "long" }).format(new Date(Date.UTC(y, mo, 1)));
  const weekdays = [...Array(7)].map((_, i) =>
    new Intl.DateTimeFormat(locale(), { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + i))));
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
      ? `<div class="empty">${t("noFavDay")}</div>`
      : `<div class="cal-hint">${t("tapDay")}</div>`;

  $("#favHint").textContent = "";
  $("#teamGrid").innerHTML = `
    <div class="cal-wrap">
      <div class="cal-bar">
        <div class="cal-month">
          <button class="cal-nav" data-calnav="-1" ${state.calMonth === 0 ? "disabled" : ""}>‹</button>
          <span>${monthName}</span>
          <button class="cal-nav" data-calnav="1" ${state.calMonth === 1 ? "disabled" : ""}>›</button>
        </div>
        <button class="cal-edit" id="editFavs">${t("editTeams")}</button>
      </div>
      <div class="cal-legend">${legend}</div>
      <div class="cal-card">
        <div class="cal-grid cal-head">${weekdays.map(d => `<span>${d}</span>`).join("")}</div>
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


const initials = (name) => {
  const w = name.split(" ").filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : name.slice(0, 2)).toUpperCase();
};

function playerCard(p, i, team) {
  return `
  <div class="pl-card" data-player="${esc(team)}|${p.n}|${esc(p.name)}" style="animation-delay:${Math.min(i * 30, 500)}ms">
    <div class="pl-top"><span class="pl-num">${p.n || "–"}</span><span class="pl-pos">${esc(p.pos || p.p)}</span></div>
    <div class="pl-photo"><span class="pl-mono">${esc(initials(p.name))}</span></div>
    <div class="pl-name">${esc(p.name)}</div>
    <div class="pl-club">
      ${p.cc ? `<img src="https://hatscripts.github.io/circle-flags/flags/${encodeURIComponent(p.cc)}.svg" alt="">` : ""}
      <span>${esc(p.club || "—")}</span>
    </div>
    <div class="pl-meta">${p.a ?? "–"} ${t("metaYrs")} · ${p.c} ${t("metaCaps")}${p.p !== "GK" ? ` · ${p.g} ${t("metaGoals")}` : ""}</div>
  </div>`;
}

// squads.js (~110KB) is loaded on demand the first time a squad/match sheet opens
let squadsPromise = null;
function ensureSquads() {
  if (typeof SQUADS !== "undefined") return Promise.resolve();
  if (!squadsPromise) {
    squadsPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "squads.js";
      s.onload = () => resolve();
      s.onerror = () => { squadsPromise = null; resolve(); };
      document.head.appendChild(s);
    });
  }
  return squadsPromise;
}

async function openSquad(team) {
  await ensureSquads();
  const squad = typeof SQUADS !== "undefined" && SQUADS[team];
  if (!squad) return;
  let i = 0;
  $("#squadInner").innerHTML = `
    <div class="squad-hero">
      <div class="squad-grab"></div>
      <button class="squad-close" id="squadClose" aria-label="Close">✕</button>
      <img class="squad-flag" src="${flagUrl(team)}" alt="">
      <div class="squad-title">${esc(team)}</div>
      <div class="squad-sub">${t("squad")} · ${squad.length} ${t("players")}</div>
    </div>
    ${["GK", "DF", "MF", "FW"].map(pos => {
      const ps = squad.filter(p => p.p === pos);
      return ps.length ? `
        <div class="squad-pos">${t("pos" + pos)}<em>${ps.length}</em></div>
        <div class="pl-grid">${ps.map(p => playerCard(p, i++, team)).join("")}</div>` : "";
    }).join("")}
    <div class="squad-src">${t("squadSrc")}</div>`;
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
  $("#squadSheet").style.transform = "";
  $("#squadBackdrop").classList.remove("show");
  $("#squadSheet").classList.remove("show");
  setTimeout(() => { $("#squadBackdrop").hidden = true; $("#squadSheet").hidden = true; }, 500);
}

/* swipe-down to close (iOS-style: follows the finger, springs back under threshold) */
function attachSwipeClose(el, closeFn, getScrollTop = () => el.scrollTop) {
  let startY = 0, dy = 0, dragging = false;
  el.addEventListener("touchstart", (e) => {
    if (getScrollTop() > 0) return;
    startY = e.touches[0].clientY;
    dy = 0;
    dragging = true;
  }, { passive: true });
  el.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    el.style.transition = "";
    if (dy > 110) closeFn();
    else el.style.transform = "";
  });
}
attachSwipeClose($("#squadSheet"), closeSquad);

/* ================= PLAYER MODAL ================= */

function traits(p) {
  const out = [];
  const ratio = p.c ? p.g / p.c : 0;
  const wc = (typeof WC_GOALS !== "undefined" && WC_GOALS[p.name]) || 0;
  if (wc >= 2) out.push(t("tOnFire"));
  if (p.p === "FW") out.push(t(ratio >= 0.5 ? "tScorer" : ratio >= 0.3 ? "tClinical" : "tLivewire"));
  if (p.p === "MF") out.push(t(p.g >= 15 ? "tGoalMid" : p.c >= 60 ? "tGeneral" : "tEngine"));
  if (p.p === "DF") out.push(t(p.g >= 5 ? "tSetPiece" : p.c >= 70 ? "tRock" : "tNoNonsense"));
  if (p.p === "GK") out.push(t(p.c >= 50 ? "tSafeHands" : "tShotStopper"));
  if (p.c >= 100) out.push(t("tCenturion"));
  if (p.a !== null && p.a <= 21) out.push(t("tWonderkid"));
  if (p.a !== null && p.a >= 35) out.push(t("tVeteran"));
  if (p.n === 10) out.push(t("tNo10"));
  if (p.n === 9 && p.p === "FW") out.push(t("tNo9"));
  return [...new Set(out)].slice(0, 3);
}

function roleName(abbr) {
  const k = "role" + abbr;
  return I18N[lang()][k] || I18N.en[k] || abbr;
}

async function openPlayer(team, num, name) {
  await ensureSquads();
  const p = (typeof SQUADS !== "undefined" ? SQUADS[team] || [] : []).find(x => String(x.n) === String(num) && x.name === name);
  if (!p) return;
  const wc = (typeof WC_GOALS !== "undefined" && WC_GOALS[p.name]) || 0;
  const color = TEAM_COLOR[team] || "#15130E";
  $("#playerModal").innerHTML = `
    <div class="pm-card" style="--tc:${color}">
      <button class="squad-close pm-close" id="playerClose" aria-label="Close">✕</button>
      <div class="pm-hero">
        <span class="pm-num">${p.n || "–"}</span>
        <div class="pm-mono">${esc(initials(p.name))}</div>
        <img class="pm-team" src="${flagUrl(team)}" alt="${esc(team)}">
      </div>
      <div class="pm-name">${esc(p.name)}</div>
      <div class="pm-role">${roleName(p.pos || p.p)} · ${esc(team)}</div>
      <div class="pm-club">
        ${p.cc ? `<img src="https://hatscripts.github.io/circle-flags/flags/${encodeURIComponent(p.cc)}.svg" alt="">` : ""}
        <span>${esc(p.club || t("clubUnknown"))}</span>
      </div>
      <div class="pm-stats">
        <div class="pm-stat"><b>${p.a ?? "–"}</b><span>${t("age")}</span></div>
        <div class="pm-stat"><b>${p.c}</b><span>${t("apps")}</span></div>
        <div class="pm-stat"><b>${p.g}</b><span>${t("ntGoals")}</span></div>
        <div class="pm-stat ${wc ? "hot" : ""}"><b>${wc}</b><span>${t("wcGoals")}</span></div>
      </div>
      <div class="pm-traits">${traits(p).map(tr => `<span>${esc(tr)}</span>`).join("")}</div>
    </div>`;
  $("#playerBackdrop").hidden = false;
  $("#playerModal").hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $("#playerBackdrop").classList.add("show");
    $("#playerModal").classList.add("show");
  }));
  $("#playerClose").addEventListener("click", closePlayer);
}
function closePlayer() {
  $("#playerModal").style.transform = "";
  $("#playerBackdrop").classList.remove("show");
  $("#playerModal").classList.remove("show");
  setTimeout(() => { $("#playerBackdrop").hidden = true; $("#playerModal").hidden = true; }, 450);
}
$("#playerBackdrop").addEventListener("click", closePlayer);
attachSwipeClose($("#playerModal"), closePlayer, () => 0);

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-player]");
  if (card) {
    const [team, num, ...rest] = card.dataset.player.split("|");
    openPlayer(team, num, rest.join("|"));
  }
});

// open from match cards and standings rows (event delegation)
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-squad]");
  if (t) openSquad(t.dataset.squad);
});
$("#squadBackdrop") && $("#squadBackdrop").addEventListener("click", closeSquad);

/* ================= MATCH DETAIL SHEET ================= */

const squadOf = (team) => (typeof SQUADS !== "undefined" && SQUADS[team]) || [];
const findMatch = (num) => MATCHES.find(m => String(m.MatchNumber) === String(num));

// WCC win-probability model — Elo-style from FIFA points, with a host bump
function predict(home, away) {
  const hp = (FIFA_RANK[home] || 1450) + (HOSTS.has(home) ? 60 : 0);
  const ap = (FIFA_RANK[away] || 1450) + (HOSTS.has(away) ? 60 : 0);
  const expH = 1 / (1 + Math.pow(10, (ap - hp) / 400)); // 0..1 expected result for home
  const even = 1 - Math.abs(expH - 0.5) * 2;            // 1 when evenly matched
  const pD = 0.22 + 0.10 * even;
  const pH = (1 - pD) * expH;
  // round home & draw, give the remainder to away, then clamp so none go negative
  let H = Math.round(pH * 100), D = Math.round(pD * 100);
  if (H + D > 100) D = 100 - H;
  const A = Math.max(0, 100 - H - D);
  return { H, D, A };
}

// played results for a team this tournament, oldest → newest
function teamForm(team) {
  const out = [];
  for (const m of MATCHES) {
    if (m.HomeTeamScore === null || m.AwayTeamScore === null) continue;
    if (m.HomeTeam !== team && m.AwayTeam !== team) continue;
    const home = m.HomeTeam === team;
    const gf = home ? m.HomeTeamScore : m.AwayTeamScore;
    const ga = home ? m.AwayTeamScore : m.HomeTeamScore;
    out.push({ res: gf > ga ? "W" : gf < ga ? "L" : "D", gf, ga, opp: home ? m.AwayTeam : m.HomeTeam });
  }
  return out;
}

// pick the headline player for a side
function keyPlayer(team) {
  const sq = squadOf(team);
  if (!sq.length) return null;
  const scorers = sq.filter(p => WCgoals(p.name) > 0).sort((a, b) => WCgoals(b.name) - WCgoals(a.name));
  if (scorers.length) {
    const p = scorers[0], n = WCgoals(p.name);
    return { p, line: t(n === 1 ? "goalsThisWC1" : "goalsThisWC", { n }) };
  }
  const att = sq.filter(p => p.p === "FW" || p.p === "MF").sort((a, b) => b.g - a.g);
  if (att.length && att[0].g > 0) return { p: att[0], line: t("ntGoalsLine", { n: att[0].g }) };
  const cap = [...sq].sort((a, b) => b.c - a.c)[0];
  return { p: cap, line: t("capsLine", { n: cap.c }) };
}

function curiosities(m) {
  const c = [];
  const all = [...squadOf(m.HomeTeam).map(p => ({ ...p, team: m.HomeTeam })),
               ...squadOf(m.AwayTeam).map(p => ({ ...p, team: m.AwayTeam }))];
  if (all.length) {
    const mc = all.reduce((a, b) => b.c > a.c ? b : a);
    c.push(t("mostCapped", { name: mc.name, team: mc.team, c: mc.c }));
    const aged = all.filter(p => p.a);
    if (aged.length) {
      const yt = aged.reduce((a, b) => b.a < a.a ? b : a);
      c.push(t("youngest", { name: yt.name, team: yt.team, a: yt.a }));
    }
  }
  const hot = all.filter(p => WCgoals(p.name) > 0).sort((a, b) => WCgoals(b.name) - WCgoals(a.name));
  if (hot.length) c.push(t("hotScorer", { name: hot[0].name, n: WCgoals(hot[0].name) }));
  return c.slice(0, 3);
}

function groupLine(m) {
  if (!m.Group) return "";
  const letter = m.Group.slice(-1);
  const g = computeGroups().find(x => x.letter === letter);
  if (!g) return "";
  const pos = (team) => { const i = g.rows.findIndex(r => r.team === team); return i < 0 ? null : { i, r: g.rows[i] }; };
  const h = pos(m.HomeTeam), a = pos(m.AwayTeam);
  if (!h || !a || h.r.P + a.r.P === 0) return "";
  return esc(t("groupLine", {
    h: m.HomeTeam, hp: ordinal(h.i), hpts: h.r.Pts,
    a: m.AwayTeam, ap: ordinal(a.i), apts: a.r.Pts, g: letter,
  }));
}

function scorersHtml(m) {
  const g = (typeof MATCH_GOALS !== "undefined" && MATCH_GOALS[m.MatchNumber]) || null;
  if (!g || !g.length) {
    return `<div class="ms-noscorers">${t("scorersSoon")}</div>`;
  }
  const col = (arr) => arr.length
    ? arr.map(x => `<div class="ms-goal">${esc(x.n)}${x.m ? `<i>${esc(x.m)}</i>` : ""}</div>`).join("")
    : `<div class="ms-goal none">—</div>`;
  return `<div class="ms-scorers">
    <div class="ms-goalcol">${col(g.filter(x => x.t === "home"))}</div>
    <div class="ms-ball">⚽</div>
    <div class="ms-goalcol away">${col(g.filter(x => x.t === "away"))}</div>
  </div>`;
}

function predictHtml(m) {
  const { H, D, A } = predict(m.HomeTeam, m.AwayTeam);
  return `
    <div class="ms-block">
      <div class="ms-h">${t("whosFavoured")} <em>${t("wccModel")}</em></div>
      <div class="ms-pred">
        <div class="ms-pred-bar">
          <span class="pp pp-h" style="width:${H}%"></span>
          <span class="pp pp-d" style="width:${D}%"></span>
          <span class="pp pp-a" style="width:${A}%"></span>
        </div>
        <div class="ms-pred-key">
          <span><b>${H}%</b> ${teamLabel(m.HomeTeam)}</span>
          <span><b>${D}%</b> ${t("draw")}</span>
          <span><b>${A}%</b> ${teamLabel(m.AwayTeam)}</span>
        </div>
      </div>
    </div>`;
}

function formHtml(m) {
  const row = (team) => {
    const f = teamForm(team);
    if (!f.length) return "";
    const chips = f.map(x => `<span class="form-chip f${x.res}" title="${x.res} ${x.gf}-${x.ga} v ${teamLabel(x.opp)}">${x.res}</span>`).join("");
    return `<div class="ms-form-row"><img src="${flagUrl(team)}" alt=""><span>${teamLabel(team)}</span><span class="ms-form-chips">${chips}</span></div>`;
  };
  const rows = row(m.HomeTeam) + row(m.AwayTeam);
  if (!rows) return "";
  return `<div class="ms-block"><div class="ms-h">${t("formTitle")}</div>${rows}</div>`;
}

function keyPlayersHtml(m) {
  const card = (team) => {
    const k = keyPlayer(team);
    if (!k) return "";
    return `<div class="ms-kp" style="--tc:${TEAM_COLOR[team] || "#15130E"}" data-player="${esc(team)}|${k.p.n}|${esc(k.p.name)}">
      <div class="ms-kp-mono">${esc(initials(k.p.name))}</div>
      <div class="ms-kp-name">${esc(k.p.name)}</div>
      <div class="ms-kp-line">${esc(k.line)}</div>
      <img class="ms-kp-flag" src="${flagUrl(team)}" alt="">
    </div>`;
  };
  const cards = card(m.HomeTeam) + card(m.AwayTeam);
  if (!cards) return "";
  return `<div class="ms-block"><div class="ms-h">${t("keyPlayers")}</div><div class="ms-kp-grid">${cards}</div></div>`;
}

function linksHtml(m) {
  const q = encodeURIComponent(`${m.HomeTeam} vs ${m.AwayTeam} World Cup 2026`);
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.HomeTeam} ${m.AwayTeam} highlights World Cup 2026`)}`;
  const news = `https://news.google.com/search?q=${q}${lang() === "pt" ? "&hl=pt-PT&gl=PT" : ""}`;
  const fifa = `https://www.fifa.com/fifaplus/${lang() === "pt" ? "pt" : "en"}/tournaments/mens/worldcup/canadamexicousa2026`;
  return `<div class="ms-links">
    <a class="ms-link" href="${yt}" target="_blank" rel="noopener">▶ ${t("highlights")}</a>
    <a class="ms-link" href="${news}" target="_blank" rel="noopener">📰 ${t("news")}</a>
    <a class="ms-link" href="${fifa}" target="_blank" rel="noopener">FIFA+</a>
  </div>`;
}

async function openMatch(num) {
  const m = findMatch(num);
  if (!m) return;
  const p = parts(m.DateUtc, DEVICE_TZ);
  const real = FLAG[m.HomeTeam] && FLAG[m.AwayTeam];
  if (real) await ensureSquads();
  const { hasScore, finished, live, clock } = matchStatus(m);
  const score = `${m.HomeTeamScore}–${m.AwayTeamScore}`;

  const mid = live
    ? `<span class="ms-score">${hasScore ? score : "·"}</span><span class="ms-state live">● ${esc(clock || t("live"))}</span>`
    : finished
      ? `<span class="ms-score">${hasScore ? score : "—"}</span><span class="ms-state ft">${t("fullTime")}</span>`
      : `<span class="ms-kick">${p.time}</span><span class="ms-state">${p.dow} ${p.dom} ${p.mon}</span>`;

  const side = (team) => `
    <div class="ms-side" ${FLAG[team] ? `data-squad="${team}"` : ""}>
      ${flagHtml(team, "ms-flag")}
      <span class="ms-team">${teamLabel(team)}</span>
    </div>`;

  let body = "";
  const groupBlock = groupLine(m) ? `<div class="ms-block"><div class="ms-h">${t("groupPicture")}</div><p class="ms-note">${groupLine(m)}</p></div>` : "";
  const goalsBlock = `<div class="ms-block"><div class="ms-h">${t("goalsTitle")}</div>${scorersHtml(m)}</div>`;
  // line-ups are filled in async after open (hidden until ESPN returns them)
  const xiBlock = real ? `<div class="ms-block ms-xi-block" id="msLineups" data-match="${m.MatchNumber}" hidden></div>` : "";
  if (!real) {
    body = `<div class="ms-block"><div class="ms-noscorers">${t("teamsTBC")}</div></div>`;
  } else if (finished) {
    body = goalsBlock + xiBlock + keyPlayersHtml(m) + groupBlock + linksHtml(m);
  } else if (live) {
    // live: show the running goals AND keep the win-probability + form on screen
    body = goalsBlock + predictHtml(m) + xiBlock + formHtml(m) + keyPlayersHtml(m) + groupBlock + linksHtml(m);
  } else {
    const cur = curiosities(m);
    body = predictHtml(m)
      + formHtml(m)
      + xiBlock
      + keyPlayersHtml(m)
      + groupBlock
      + (cur.length ? `<div class="ms-block"><div class="ms-h">${t("didYouKnow")}</div><ul class="ms-cur">${cur.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "")
      + linksHtml(m);
  }

  $("#matchInner").innerHTML = `
    <div class="squad-hero ms-hero">
      <div class="squad-grab"></div>
      <button class="squad-close" id="matchClose" aria-label="Close">✕</button>
      <div class="ms-stage">${stageChip(m)}</div>
      <div class="ms-fixture">
        ${side(m.HomeTeam)}
        <div class="ms-mid">${mid}</div>
        ${side(m.AwayTeam)}
      </div>
      <div class="ms-venue">${esc(m.Location)} · ${watchChipsPlain(m)}</div>
    </div>
    <div class="ms-body">${body}</div>
    <div class="squad-src">${t("matchSrc")}</div>`;

  $("#matchBackdrop").hidden = false;
  $("#matchSheet").hidden = false;
  $("#matchSheet").scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $("#matchBackdrop").classList.add("show");
    $("#matchSheet").classList.add("show");
  }));
  $("#matchClose").addEventListener("click", closeMatch);
  if (real) hydrateLineups(m); // progressive: fill the line-ups when ESPN responds
}
function closeMatch() {
  $("#matchSheet").style.transform = "";
  $("#matchBackdrop").classList.remove("show");
  $("#matchSheet").classList.remove("show");
  setTimeout(() => { $("#matchBackdrop").hidden = true; $("#matchSheet").hidden = true; }, 500);
}
// plain "watch on" text for the match hero (no markup wrapper)
function watchChipsPlain(m) {
  if (state.country === "NL") return "NPO 1 (free)";
  const out = [];
  const fta = PT_FTA[m.MatchNumber];
  if (fta) out.push(fta);
  if (m.HomeTeam === "Portugal" || m.AwayTeam === "Portugal" || m.RoundNumber >= 7 || PT_LIVEMODE.has(m.MatchNumber)) out.push("LiveModeTV");
  out.push("Sport TV");
  return out.join(" · ");
}
attachSwipeClose($("#matchSheet"), closeMatch);
$("#matchBackdrop").addEventListener("click", closeMatch);
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-squad]") || e.target.closest("[data-player]") || e.target.closest("a")) return;
  const card = e.target.closest("[data-match]");
  if (card) openMatch(card.dataset.match);
});

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

// localise all static markup tagged with data-i18n
function applyStaticI18n() {
  document.documentElement.lang = lang();
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
}

function renderFoot() {
  $("#footNote").textContent = state.country === "NL"
    ? `🇳🇱 In the Netherlands, NOS broadcasts all 104 matches free on NPO 1 / NPO Start. Times shown in your local time — ${tzLabel()}.`
    : `🇵🇹 Em Portugal, a Sport TV transmite os 104 jogos; 20 jogos em sinal aberto (RTP/SIC/TVI) e 34 grátis na LiveModeTV (YouTube), incluindo todos os jogos de Portugal, meias-finais e final. Horas no teu fuso local — ${tzLabel()}.`;
}

function render() {
  renderSeg();
  applyStaticI18n();
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
// fetch JSON through a direct → proxy fallback chain (handles CORS-blocked feeds)
async function fetchJson(target) {
  const urls = [
    target,
    "https://corsproxy.io/?url=" + encodeURIComponent(target),
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(target),
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const j = await res.json();
      if (j) return j;
    } catch { /* try next source */ }
  }
  return null;
}

// fixturedownload — full fixture list + scores (one request covers all 104 matches)
async function refreshScores() {
  const fresh = await fetchJson(`https://fixturedownload.com/feed/json/fifa-world-cup-2026?_=${Date.now()}`);
  if (!Array.isArray(fresh) || !fresh.length) return false;
  const byNum = new Map(fresh.map(m => [m.MatchNumber, m]));
  let changed = false;
  for (const m of MATCHES) {
    const f = byNum.get(m.MatchNumber);
    if (!f) continue;
    if (f.HomeTeamScore !== m.HomeTeamScore || f.AwayTeamScore !== m.AwayTeamScore ||
        f.Winner !== m.Winner || f.DateUtc !== m.DateUtc || f.HomeTeam !== m.HomeTeam || f.AwayTeam !== m.AwayTeam) {
      Object.assign(m, f); // keep any live state (m._st) already attached
      changed = true;
    }
  }
  return changed;
}

// ESPN public scoreboard — live scores, match clock and goalscorers, no API key
const ESPN2APP = {
  "Bosnia-Herzegovina": "Bosnia and Herzegovina", "Cape Verde": "Cabo Verde", "Iran": "IR Iran",
  "Ivory Coast": "Côte d'Ivoire", "South Korea": "Korea Republic", "United States": "USA",
};
const espnName = (n) => ESPN2APP[n] || n;

async function refreshLive() {
  const now = Date.now();
  const dates = new Set();
  for (const m of MATCHES) {
    const ts = new Date(m.DateUtc.replace(" ", "T")).getTime();
    if (Math.abs(ts - now) < 30 * 3600e3) {
      const d = new Date(ts);
      dates.add(`${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`);
    }
  }
  if (!dates.size) return false;
  let changed = false;
  for (const date of dates) {
    const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}&_=${now}`);
    for (const ev of (data && data.events) || []) {
      const comp = ev.competitions && ev.competitions[0];
      if (!comp) continue;
      const cs = comp.competitors || [];
      const H = cs.find(c => c.homeAway === "home"), A = cs.find(c => c.homeAway === "away");
      if (!H || !A) continue;
      const m = MATCHES.find(x => x.HomeTeam === espnName(H.team.displayName) && x.AwayTeam === espnName(A.team.displayName));
      if (!m) continue;
      m._eid = ev.id; // remember ESPN event id for the line-ups lookup
      const before = JSON.stringify([m.HomeTeamScore, m.AwayTeamScore, m._st, MATCH_GOALS[m.MatchNumber]]);
      const st = ev.status && ev.status.type && ev.status.type.state; // pre | in | post
      const detail = (ev.status && ev.status.type && ev.status.type.shortDetail) || "";
      const hs = H.score != null && H.score !== "" ? parseInt(H.score, 10) : null;
      const as = A.score != null && A.score !== "" ? parseInt(A.score, 10) : null;
      if (st) {
        if (st !== "pre" && hs != null && as != null) { m.HomeTeamScore = hs; m.AwayTeamScore = as; }
        const label = /ht|halftime/i.test(detail) ? "HT" : ((ev.status && ev.status.displayClock) || t("live"));
        m._st = { state: st, label };
        if (st === "post" && !m.Winner && hs != null && as != null) {
          m.Winner = hs > as ? m.HomeTeam : as > hs ? m.AwayTeam : "Draw";
        }
      }
      // live goalscorers straight from ESPN (overrides the hourly Wikipedia data while live)
      const goals = [];
      for (const det of comp.details || []) {
        if (!det.scoringPlay) continue;
        const nm = det.athletesInvolved && det.athletesInvolved[0] && det.athletesInvolved[0].displayName;
        if (!nm) continue;
        const og = /own goal/i.test((det.type && det.type.text) || "");
        goals.push({
          n: nm + (og ? " (OG)" : ""),
          t: det.team && det.team.id === H.team.id ? "home" : "away",
          m: (det.clock && det.clock.displayValue) || "",
        });
      }
      if (goals.length && typeof MATCH_GOALS !== "undefined") MATCH_GOALS[m.MatchNumber] = goals;
      if (JSON.stringify([m.HomeTeamScore, m.AwayTeamScore, m._st, MATCH_GOALS[m.MatchNumber]]) !== before) changed = true;
    }
  }
  return changed;
}

/* ---------- starting line-ups (ESPN summary endpoint) ---------- */
const lineupCache = {};

// resolve the ESPN event id for a match (from a date's scoreboard) if not known yet
async function resolveEid(m) {
  if (m._eid) return m._eid;
  const d = new Date(m.DateUtc.replace(" ", "T"));
  const date = `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
  const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`);
  for (const ev of (data && data.events) || []) {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) continue;
    const cs = comp.competitors || [];
    const H = cs.find(c => c.homeAway === "home"), A = cs.find(c => c.homeAway === "away");
    if (!H || !A) continue;
    const mm = MATCHES.find(x => x.HomeTeam === espnName(H.team.displayName) && x.AwayTeam === espnName(A.team.displayName));
    if (mm) mm._eid = ev.id;
  }
  return m._eid || null;
}

async function fetchLineups(m) {
  if (lineupCache[m.MatchNumber]) return lineupCache[m.MatchNumber];
  const eid = await resolveEid(m);
  if (!eid) return null;
  const sum = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eid}&_=${Date.now()}`);
  const ros = sum && sum.rosters;
  if (!ros || !ros.length) return null;
  const byTeam = {};
  for (const r of ros) {
    const xi = (r.roster || []).filter(e => e.starter).map(e => ({
      num: e.jersey || (e.athlete && e.athlete.jersey) || "",
      name: (e.athlete && e.athlete.displayName) || "",
      pos: (e.position && e.position.abbreviation) || "",
    }));
    if (xi.length) byTeam[espnName(r.team && r.team.displayName)] = { formation: r.formation || "", xi };
  }
  const res = { home: byTeam[m.HomeTeam], away: byTeam[m.AwayTeam] };
  if (!res.home && !res.away) return null;
  lineupCache[m.MatchNumber] = res;
  return res;
}

// a compact sticker card (same look as the squad page) for one line-up player;
// matched to our squad by shirt number so it shows the club + opens player info on tap
function lineupCard(team, ep) {
  const p = squadOf(team).find(x => String(x.n) === String(ep.num)) || null;
  const name = p ? p.name : ep.name;
  const pos = ep.pos || (p && (p.pos || p.p)) || "";
  const tap = p ? ` data-player="${esc(team)}|${p.n}|${esc(p.name)}"` : "";
  const club = p ? p.club : "";
  return `<div class="pl-card sm"${tap}>
    <div class="pl-top"><span class="pl-num">${esc(String(ep.num || "·"))}</span><span class="pl-pos">${esc(pos)}</span></div>
    <div class="pl-photo"><span class="pl-mono">${esc(initials(name))}</span></div>
    <div class="pl-name">${esc(name)}</div>
    ${club ? `<div class="pl-club">${p.cc ? `<img src="https://hatscripts.github.io/circle-flags/flags/${encodeURIComponent(p.cc)}.svg" alt="">` : ""}<span>${esc(club)}</span></div>` : ""}
  </div>`;
}

function lineupTeam(team, side) {
  if (!side || !side.xi.length) return "";
  return `<div class="xi-team-head">
      <img src="${flagUrl(team)}" alt=""><b>${teamLabel(team)}</b>
      ${side.formation ? `<span class="xi-form">${esc(side.formation)}</span>` : ""}
    </div>
    <div class="pl-grid sm">${side.xi.map(ep => lineupCard(team, ep)).join("")}</div>`;
}

async function hydrateLineups(m) {
  const host = $("#msLineups");
  if (!host || host.dataset.match !== String(m.MatchNumber)) return;
  const data = await fetchLineups(m);
  const el = $("#msLineups");
  if (!data || !el || el.dataset.match !== String(m.MatchNumber)) return; // closed or no data
  el.innerHTML = `<div class="ms-h">${t("startingXI")}</div>
    ${lineupTeam(m.HomeTeam, data.home)}
    ${lineupTeam(m.AwayTeam, data.away)}`;
  el.hidden = false;
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

/* adaptive live polling — fast while a match is in play, relaxed otherwise,
   and an instant refresh whenever the user returns to the tab */
let scoreTimer = null;
async function tick() {
  clearTimeout(scoreTimer);
  const a = await refreshScores();   // fixturedownload: full list
  const b = await refreshLive();     // ESPN: live precision (clock, goals) — runs after so it wins
  if (a || b) render();
  scoreTimer = setTimeout(tick, anyLiveNow() ? 12e3 : 120e3);
}
tick();
document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
window.addEventListener("focus", tick);
