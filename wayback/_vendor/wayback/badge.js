// pandymic.com/wayback: the corner badge on every archived page (and the site's analytics and visit counter).
//
// Collapsed: a small pill, bottom left ("Wayback · v1 · 2003–2005"). Open: the version, its dates and summary, when this
// page was captured, its visits, and Back (to the timeline), Feedback (pandymic.com's own contact dialog with the
// "wayback" form, in a transparent frame: /wayback-feedback/, see pandymic/web) and Hide. It lives in a shadow root, so the old pages' CSS can't reach it and it can't reach them.
// Inside the timeline's preview frames it shows nothing, loads nothing and counts nothing.
//
// <script src=".../_vendor/wayback/badge.js" data-root="../" data-build="v1" data-captured="20041009143237" defer>
(function () {
  "use strict";
  const me = document.currentScript;
  if (!me || window.top !== window.self) return;
  const ROOT = new URL(me.dataset.root || "./", location.href).href;
  const BUILD = me.dataset.build || "";
  const CAPTURED = me.dataset.captured || "";
  const FEEDBACK = me.dataset.feedback || "/wayback-feedback/";
  const FALLBACK = "https://pandymic.com/#!/feedback//wayback";     // the same form on the home page, in a new tab

  // The site's Google Tag Manager container (pandymic.com GTM-TJ7BQ9): its own loader, top-level pages only.
  const gtm = document.createElement("script");
  gtm.src = "/js/analytics.js";
  document.head.appendChild(gtm);

  const fmt = (ts) => {
    if (!/^\d{8}/.test(ts)) return "";
    const d = new Date(Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8)));
    return d.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const host = document.createElement("div");
  host.setAttribute("data-wayback-badge", "");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host { all: initial; }
    .w { position: fixed; left: 12px; bottom: 12px; z-index: 2147483646; font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f2f2f2; }
    .pill { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 6px 12px 6px 9px; background: rgba(20,20,24,.82);
      color: inherit; font: inherit; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.35); backdrop-filter: blur(6px); }
    .pill:hover, .pill:focus-visible { background: rgba(20,20,24,.95); outline: 2px solid #f7a300; outline-offset: 2px; }
    .pill b { font-weight: 600; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #f7a300; flex: none; }
    .panel { position: absolute; left: 0; bottom: calc(100% + 8px); width: min(340px, calc(100vw - 24px)); box-sizing: border-box; padding: 14px 16px;
      border-radius: 12px; background: rgba(20,20,24,.96); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
    .panel[hidden] { display: none; }
    h2 { margin: 0 0 2px; font-size: 15px; line-height: 1.3; }
    .when { margin: 0 0 8px; color: #f7a300; font-size: 12px; letter-spacing: .02em; }
    p { margin: 0 0 8px; color: #d6d6d6; }
    .meta { font-size: 12px; color: #a9a9a9; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    a.btn, button.btn { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 8px;
      background: #f2f2f2; color: #141418; font: 600 12px/1.2 system-ui, sans-serif; cursor: pointer; }
    button.btn.quiet { background: transparent; color: #f2f2f2; box-shadow: inset 0 0 0 1px #555; }
    a.btn:focus-visible, button.btn:focus-visible { outline: 2px solid #f7a300; outline-offset: 2px; }
    .fb { position: fixed; inset: 0; z-index: 2147483647; border: 0; width: 100vw; height: 100vh; background: transparent; color-scheme: light dark; }
    @media (max-width: 480px) { .w { left: 8px; bottom: 8px; } .pill span.long { display: none; } }
  </style>
  <div class="w">
    <div class="panel" id="panel" role="dialog" aria-labelledby="t" hidden>
      <h2 id="t">pandymic.com</h2>
      <p class="when" id="when"></p>
      <p id="note"></p>
      <p class="meta" id="page"></p>
      <p class="meta" id="visits" hidden></p>
      <div class="row">
        <a class="btn" id="back" href="${esc(ROOT)}index.html">&larr; Wayback timeline</a>
        <button class="btn quiet" type="button" id="feedback">Feedback</button>
        <button class="btn quiet" type="button" id="hide" aria-label="Hide this badge for this visit">Hide</button>
      </div>
    </div>
    <button class="pill" type="button" id="pill" aria-expanded="false" aria-controls="panel"><span class="dot" aria-hidden="true"></span><b>Wayback</b> <span id="label"></span></button>
  </div>`;
  const $ = (id) => root.getElementById(id);
  const panel = $("panel"), pill = $("pill");
  const toggle = (open = panel.hidden) => { panel.hidden = !open; pill.setAttribute("aria-expanded", String(open)); if (open) $("back").focus(); };
  pill.addEventListener("click", () => toggle());
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { toggle(false); pill.focus(); } });
  $("hide").addEventListener("click", () => { try { sessionStorage.setItem("pandymic-wayback-badge", "hidden"); } catch (e) { /* ok */ } host.remove(); });

  // Feedback: pandymic.com's contact dialog with the "wayback" form, in a transparent full-window frame that closes itself.
  $("feedback").addEventListener("click", () => {
    toggle(false);
    const f = document.createElement("iframe");
    f.className = "fb";
    f.title = "Feedback";
    f.src = `${FEEDBACK}?page=${encodeURIComponent(location.pathname)}#!/feedback//wayback`;
    // The frame says "open" once its dialog is up, "closed" when it closes, "unavailable" if this browser can't show it.
    // No word within 10 s (the page is missing, as in a local preview, or failed): the frame goes, the form opens in a tab.
    let opened = false;
    const remove = () => { clearTimeout(timer); f.remove(); removeEventListener("message", done); pill.focus(); };
    const elsewhere = () => { remove(); window.open(FALLBACK, "_blank", "noopener"); };
    const done = (e) => {
      if (e.source !== f.contentWindow || e.origin !== location.origin || !e.data || e.data.type !== "wayback-feedback") return;
      if (e.data.state === "open") opened = true;
      else if (e.data.state === "closed") remove();
      else if (e.data.state === "unavailable") elsewhere();
    };
    const timer = setTimeout(() => { if (!opened) elsewhere(); }, 10000);
    addEventListener("message", done);
    root.appendChild(f);
  });

  // The version's title, dates and summary (builds.json, written by the build)
  fetch(ROOT + "builds.json").then((r) => r.json()).then((bs) => {
    const b = bs.find((x) => x.id === BUILD);
    if (!b) return;
    const short = /^v\d/.test(b.id) ? b.id : "side quest";
    $("label").innerHTML = `· ${esc(short)} <span class="long">· ${esc(b.period)}</span>`;
    $("t").textContent = /^v\d/.test(b.id) ? `pandymic.com ${b.id}: ${b.title}` : `Side quest: ${b.title}`;
    $("when").textContent = b.period;
    $("note").textContent = b.note || "";
  }).catch(() => {});
  $("page").textContent = CAPTURED === "backup" ? "This page: rebuilt from Mike's own backups (the Internet Archive never saw it)."
    : CAPTURED === "rebuilt" ? "This page: rebuilt for the archive."
    : CAPTURED.startsWith("cc:") ? `This page: as Common Crawl captured it on ${fmt(CAPTURED.slice(3))} (the Internet Archive missed it).`
    : CAPTURED ? `This page: as the Internet Archive captured it on ${fmt(CAPTURED)}.` : "";

  // Visits (pandymic/websocket counters; silently gated, see counter.js)
  const C = window.WaybackCounter;
  if (C) {
    const names = ["wayback/visits"].concat(BUILD ? [`wayback/${BUILD}`] : []);
    C.hit(names).then((v) => {
      const n = v && v[`wayback/${BUILD}`];
      if (n) { $("visits").hidden = false; $("visits").textContent = `${n.toLocaleString("en")} visit${n === 1 ? "" : "s"} to this version`; }
    });
  }

  try { if (sessionStorage.getItem("pandymic-wayback-badge") === "hidden") return; } catch (e) { /* ok */ }
  (document.body || document.documentElement).appendChild(host);
})();
