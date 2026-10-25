const T = {
  de: {
    timeline: "Zeitstrahl", lanes: "Spuren", calendar: "Kalender", toolBy: "ein Werkzeug von", otherLang: "English",
    stamp: d => `Stand: ${d}`, summary: (b, m) => `${b} Geburten · ${m} Meilensteine und Releases`,
    timelineLead: "Jeder Tag, an dem etwas entstanden oder fertig geworden ist. Geburtsstunde ist der erste Commit eines Repos.",
    lanesLead: "Jedes Projekt ist eine Spur ab seiner Geburtsstunde. Je kräftiger die Farbe, desto mehr Commits.",
    calendarLead: "Geburten stehen im Tag, Punkte sind Meilensteine. Je heller der Tag, desto mehr Commits.",
    all: "Alles", big: "Nur Höhepunkte", births: "Geburtsstunden", releases: "Releases", infra: "Infrastruktur",
    commits: n => n === 1 ? "1 Commit" : `${n} Commits`, birthLabel: "Geburtsstunde", at: t => `${t} Uhr`,
    release: "Release", move: "Umzug", more: "Ältere Tage zeigen", nothingDay: "Kein Eintrag an diesem Tag.",
    weeks: "3 Wochen", year: "Dieses Jahr", birthKey: "Geburtsstunde", msKey: "Meilenstein", tapHint: "Tippe auf einen Kreis oder eine Raute.",
    weekOf: d => `Woche ab ${d}`, empty: "Nichts in dieser Ansicht.",
    allProjects: "Alle Projekte", projectLead: "Alles, was in diesem Projekt entstanden oder fertig geworden ist.",
  },
  en: {
    timeline: "Timeline", lanes: "Lanes", calendar: "Calendar", toolBy: "a tool by", otherLang: "Deutsch",
    stamp: d => `As of ${d}`, summary: (b, m) => `${b} births · ${m} milestones and releases`,
    timelineLead: "Every day on which something was born or shipped. A repo's birth is its first commit.",
    lanesLead: "Each project is a lane from its birth on. The stronger the colour, the more commits.",
    calendarLead: "Births sit in their day, dots are milestones. The brighter the day, the more commits.",
    all: "All", big: "Highlights only", births: "Births", releases: "Releases", infra: "Infrastructure",
    commits: n => n === 1 ? "1 commit" : `${n} commits`, birthLabel: "Birth", at: t => t,
    release: "Release", move: "Move", more: "Show older days", nothingDay: "Nothing on this day.",
    weeks: "3 weeks", year: "This year", birthKey: "Birth", msKey: "Milestone", tapHint: "Tap a circle or a diamond.",
    weekOf: d => `Week of ${d}`, empty: "Nothing in this view.",
    allProjects: "All projects", projectLead: "Everything that was born or shipped in this project.",
  },
};
const VIEWS = ["timeline", "lanes", "calendar"];
const BAND = ["#F2545B", "#FB8C45", "#F2C14E", "#6CCF8E", "#46BFE0", "#8E92F8", "#C39BF2"];
const INFRA = "kontor";

let lang = localStorage.getItem("lang") || (navigator.language.startsWith("de") ? "de" : "en");
let D;
const st = { filter: "all", days: 30, range: "weeks", mark: null, month: null, sel: null };
const t = k => T[lang][k];
const loc = () => (lang === "de" ? "de-DE" : "en-GB");

// dates are local "YYYY-MM-DD" strings, arithmetic runs in UTC so DST never shifts a day
const toDate = d => new Date(d + "T00:00:00Z");
const iso = x => x.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = toDate(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const monday = d => addDays(d, -((toDate(d).getUTCDay() + 6) % 7));
const fmt = (d, o) => toDate(d).toLocaleDateString(loc(), { timeZone: "UTC", ...o });
const today = () => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

const route = () => { const [v, p] = location.hash.slice(1).split("/"); return { view: VIEWS.includes(v) ? v : "timeline", project: v === "timeline" && D.projects[p] ? p : null }; };
const href = p => `#timeline/${encodeURIComponent(p)}`;
const proj = p => D.projects[p];
const color = p => proj(p).color === "band" ? BAND[6] : proj(p).color || "#5E5E66";
const fill = p => proj(p).color === "band" ? `linear-gradient(90deg,${BAND.join(",")})` : proj(p).color || "#5E5E66";
const commits = d => Object.values(D.heat).reduce((s, h) => s + (h[d] || 0), 0);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let gid = 0;
function tile(p, size = 34) {
  const c = proj(p).color, id = "g" + gid++;
  const stroke = c === "band" ? `url(#${id})` : c || "#5E5E66";
  const grad = c === "band" ? `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="22" y1="78" x2="78" y2="22">${BAND.map((b, i) => `<stop offset="${i / 6}" stop-color="${b}"/>`).join("")}</linearGradient></defs>` : "";
  return `<svg class="tile" width="${size}" height="${size}" viewBox="0 0 100 100">${grad}<rect width="100" height="100" rx="24" fill="#121117"/>
    <circle cx="50" cy="50" r="24" fill="none" stroke="${stroke}" stroke-width="9" ${c ? "" : 'stroke-dasharray="6 14" stroke-linecap="round"'}/><circle cx="50" cy="50" r="6.5" fill="${stroke}"/></svg>`;
}
const badge = e => e.kind === "release" ? ` <span class="badge">${t("release")}</span>` : e.kind === "move" ? ` <span class="badge">${t("move")}</span>` : "";
const evRow = e => `<div class="ev ${e.big ? "big" : ""}"><span class="time">${e.at.slice(11)}</span><span class="dot" style="background:${fill(e.repo)}"></span>
  <span><span class="title">${esc(e.title)}</span> <a class="proj" href="${href(e.repo)}">· ${esc(proj(e.repo).name)}</a>${badge(e)}</span></div>`;
// a birth may carry only a date when the hour is unknown
const birthCard = e => `<a class="birth" href="${href(e.repo)}">${tile(e.repo, 40)}<div><div class="t display">${esc(proj(e.repo).name)}</div>
  <div class="meta"><b>${t("birthLabel")}</b> · ${fmt(e.at.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}${e.at.length > 10 ? ` · ${t("at")(e.at.slice(11))}` : ""} · „${esc(e.title)}“</div></div></a>`;
const eventList = evs => evs.filter(e => e.kind === "birth").map(birthCard).join("") + evs.filter(e => e.kind !== "birth").map(evRow).join("");

function timeline(project) {
  const F = { all: () => true, big: e => e.big, births: e => e.kind === "birth", releases: e => e.kind === "release", infra: e => e.repo === INFRA };
  const byDay = {};
  D.events.filter(e => (!project || e.repo === project) && F[st.filter](e)).forEach(e => (byDay[e.at.slice(0, 10)] ||= []).push(e));
  const days = Object.keys(byDay).sort().reverse();
  const heat = project ? { [project]: D.heat[project] || {} } : D.heat;
  const options = Object.keys(D.projects).sort((a, b) => proj(a).name.localeCompare(proj(b).name, loc()))
    .map(p => `<option value="${esc(p)}" ${p === project ? "selected" : ""}>${esc(proj(p).name)}</option>`).join("");
  let h = project ? `<div class="phead">${tile(project, 56)}<div><h1>${esc(proj(project).name)}</h1><p class="muted">${t("projectLead")}${proj(project).commits ? ` ${t("commits")(proj(project).commits)}` : ""}</p></div></div>`
    : `<p class="lead">${t("timelineLead")}</p>`;
  h += `<div class="chips">${(project ? ["all", "big", "releases"] : ["all", "big", "births", "releases", "infra"])
    .map(k => `<button class="chip ${st.filter === k ? "on" : ""}" data-filter="${k}">${t(k)}</button>`).join("")}
    <select id="proj" class="chip"><option value="">${t("allProjects")}</option>${options}</select></div>`;
  for (const d of days.slice(0, st.days)) {
    const n = Object.values(heat).reduce((s, v) => s + (v[d] || 0), 0);
    const mix = Object.entries(heat).filter(([, v]) => v[d]).sort((a, b) => b[1][d] - a[1][d]).map(([p, v]) => `<span style="flex:${v[d]};background:${fill(p)}"></span>`).join("");
    h += `<div class="day"><div class="day-h"><div class="num display">${fmt(d, { day: "numeric" })}.</div>
      <div class="wd">${fmt(d, { weekday: "short" })} · ${fmt(d, { month: "short", year: toDate(d).getUTCFullYear() === new Date().getFullYear() ? undefined : "numeric" })}</div>
      ${project && !proj(project).commits ? "" : `<div class="sum">${t("commits")(n)}</div><div class="mix">${mix}</div>`}</div><div>${eventList(byDay[d])}</div></div>`;
  }
  if (!days.length) h += `<p class="muted">${t("empty")}</p>`;
  if (days.length > st.days) h += `<div class="more"><button class="ghost" data-more>${t("more")}</button></div>`;
  return h;
}

function lanes() {
  const now = today(), weekly = st.range === "year";
  const start = weekly ? monday(`${now.slice(0, 4)}-01-01`) : addDays(now, -20);
  const cols = [];
  for (let d = start; d <= now; d = addDays(d, weekly ? 7 : 1)) cols.push(d);
  const bucket = d => weekly ? monday(d) : d;
  const inRange = d => d >= start && d <= now;
  const heat = {}, marks = {};
  for (const [p, days] of Object.entries(D.heat)) for (const [d, n] of Object.entries(days)) if (inRange(d)) (heat[p] ||= {})[bucket(d)] = (heat[p]?.[bucket(d)] || 0) + n;
  for (const e of D.events) if (inRange(e.at.slice(0, 10))) ((marks[e.repo] ||= {})[bucket(e.at.slice(0, 10))] ||= []).push(e);
  const ps = Object.keys(D.projects).filter(p => heat[p] || marks[p]).sort((a, b) => proj(a).born.localeCompare(proj(b).born));
  const max = Math.max(1, ...Object.values(heat).flatMap(v => Object.values(v)));

  let h = `<p class="lead">${t("lanesLead")}</p><div class="legend"><span><span class="birthm" style="border-color:var(--birth)"></span> ${t("birthKey")}</span>
    <span><span class="ms"></span> ${t("msKey")}</span><div class="chips">${["weeks", "year"].map(k => `<button class="chip ${st.range === k ? "on" : ""}" data-range="${k}">${t(k)}</button>`).join("")}</div></div>`;
  h += `<div class="lanes-wrap"><div class="lanes" style="--cols:${cols.length};--w:${weekly ? 22 : 30}px"><div class="lh"></div>`;
  h += cols.map(d => {
    const label = weekly ? (toDate(d).getUTCDate() <= 7 ? fmt(d, { month: "short" }) : "") : `${fmt(d, { weekday: "narrow" })}<br>${fmt(d, { day: "numeric" })}`;
    return `<div class="dh ${bucket(now) === d ? "now" : ""}">${label}</div>`;
  }).join("");
  for (const p of ps) {
    const born = bucket(proj(p).born.slice(0, 10));
    h += `<a class="lh" href="${href(p)}">${tile(p, 20)}<span>${esc(proj(p).name)}</span></a>`;
    for (const d of cols) {
      const evs = marks[p]?.[d] || [], n = heat[p]?.[d] || 0;
      let inner = d >= born ? '<span class="line"></span>' : "";
      if (n) inner += `<span class="h" style="background:${fill(p)};opacity:${(0.15 + 0.7 * Math.sqrt(n / max)).toFixed(2)}"></span>`;
      if (evs.some(e => e.kind === "birth")) inner += `<button data-mark="${p}|${d}" title="${esc(proj(p).name)}"><span class="birthm" style="border-color:${color(p)}"></span></button>`;
      else if (evs.length) inner += `<button data-mark="${p}|${d}" title="${esc(evs[0].title)}"><span class="ms"></span></button>`;
      h += `<div class="c">${inner}</div>`;
    }
  }
  h += "</div></div>";
  let pop = `<span class="muted">${t("tapHint")}</span>`;
  if (st.mark) {
    const [p, d] = st.mark.split("|"), evs = marks[p]?.[d];
    if (evs) pop = `<div class="display" style="font-size:17px;margin-bottom:6px">${esc(proj(p).name)} · ${weekly ? t("weekOf")(fmt(d, { day: "numeric", month: "long" })) : fmt(d, { weekday: "long", day: "numeric", month: "long" })}</div>${eventList(evs)}`;
  }
  return h + `<div class="pop">${pop}</div>`;
}

function calendar() {
  const now = today();
  st.month ||= now.slice(0, 7);
  st.sel ||= now;
  const first = `${st.month}-01`, start = monday(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const max = Math.max(1, ...cells.map(commits));
  let h = `<p class="lead">${t("calendarLead")}</p><div class="cal-nav"><button class="ghost" data-month="-1">‹</button>
    <h2>${fmt(first, { month: "long", year: "numeric" })}</h2><button class="ghost" data-month="1">›</button></div><div class="cal-body"><div><div class="grid">`;
  h += cells.slice(0, 7).map(d => `<div class="wdh">${fmt(d, { weekday: "short" })}</div>`).join("");
  for (const d of cells) {
    const evs = D.events.filter(e => e.at.startsWith(d));
    h += `<button class="cell ${d.slice(0, 7) !== st.month ? "out" : ""} ${st.sel === d ? "sel" : ""}" data-day="${d}">
      <span class="heat" style="opacity:${((commits(d) / max) * 0.28).toFixed(3)}"></span><span class="n ${d === now ? "today" : ""}">${toDate(d).getUTCDate()}</span>
      ${evs.filter(e => e.kind === "birth").map(e => `<span class="bn">${tile(e.repo, 16)}<span>${esc(proj(e.repo).name)}</span></span>`).join("")}
      <span class="dots">${evs.filter(e => e.kind !== "birth").map(e => `<span class="dot" style="background:${fill(e.repo)}"></span>`).join("")}</span></button>`;
  }
  const sel = D.events.filter(e => e.at.startsWith(st.sel));
  h += `</div></div><div class="detail"><h3>${fmt(st.sel, { weekday: "long", day: "numeric", month: "long" })}</h3>
    <div class="muted" style="margin-bottom:10px">${t("commits")(commits(st.sel))}</div>${sel.length ? eventList(sel) : `<div class="muted">${t("nothingDay")}</div>`}</div></div>`;
  return h;
}

function render() {
  if (!D) return; // a hash change or a click before data.json has arrived
  const { view, project } = route();
  document.documentElement.lang = lang;
  document.getElementById("nav").innerHTML = VIEWS.map(v => `<a href="#${v}" class="${v === view ? "on" : ""}">${t(v)}</a>`).join("");
  const births = D.events.filter(e => e.kind === "birth").length;
  document.getElementById("stamp").innerHTML = `${t("summary")(births, D.events.length - births)}<br>${t("stamp")(new Date(D.generated).toLocaleString(loc(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }))}`;
  document.getElementById("toolBy").textContent = t("toolBy");
  document.getElementById("lang").textContent = t("otherLang");
  document.getElementById("view").innerHTML = { timeline, lanes, calendar }[view](project);
}

document.addEventListener("click", ev => {
  const b = ev.target.closest("button");
  if (!b) return;
  const s = b.dataset;
  if (b.id === "lang") { lang = lang === "de" ? "en" : "de"; localStorage.setItem("lang", lang); }
  else if (s.filter) { st.filter = s.filter; st.days = 30; }
  else if ("more" in s) st.days += 30;
  else if (s.range) { st.range = s.range; st.mark = null; }
  else if (s.mark) st.mark = s.mark;
  else if (s.day) st.sel = s.day;
  else if (s.month) { const x = toDate(`${st.month}-01`); x.setUTCMonth(x.getUTCMonth() + Number(s.month)); st.month = iso(x).slice(0, 7); }
  else return;
  render();
});
document.addEventListener("change", ev => { if (ev.target.id === "proj") location.hash = ev.target.value ? href(ev.target.value) : "#timeline"; });
addEventListener("hashchange", () => { st.filter = "all"; st.days = 30; scrollTo(0, 0); render(); });
fetch("data.json", { cache: "no-store" }).then(r => r.json()).then(d => { D = d; render(); });
