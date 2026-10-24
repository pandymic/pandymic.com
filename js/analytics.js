window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
// An unlock link (#!/unlock/<token>, /secret/<key>/ pages) is never reported: the page view is sent without the fragment.
gtag('config', 'G-Y3J0J784BY', location.hash.indexOf('#!/unlock/') === 0 ? { page_location: location.href.split('#')[0] } : {});

// Link-click events for Google Analytics, appended to the generated /js/analytics.js (build/scripts.js). This file is real
// JavaScript so its regular expressions are written as they run; the build replaces the three /*...*/ [] placeholders at the
// end with the site's rules (site.yaml analytics.clicks), hosts (analytics.hosts) and placement map, as JSON. Not minified or
// wrapped further: it runs in every page of the site before anything else of ours.
(function (RULES, HOSTS, PLACEMENTS) {
  function placement(a) {
    for (var i = 0; i < PLACEMENTS.length; i++) if (a.closest(PLACEMENTS[i][0])) return PLACEMENTS[i][1];
    return "page";
  }
  function onClick(e) {
    if (e.type === "click" ? e.button !== 0 : e.button !== 1) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var url;
    try { url = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
    var ours = url.host === location.host || HOSTS.indexOf(url.host) > -1;
    var ext = (/\.([a-z0-9]+)$/i.exec(url.pathname) || [])[1];
    // The page's own handler (the Play dialog) has already run: it took the click if it prevented the default.
    var mode = e.type === "click" && e.defaultPrevented ? "dialog" : "page";
    RULES.forEach(function (r) {
      var m = null;
      if (r.path && ours) m = new RegExp(r.path).exec(url.pathname);
      if (!m && r.hash && url.host === location.host && url.pathname === location.pathname && url.hash === r.hash) m = [];
      if (!m && r.selector && a.matches(r.selector)) m = [];
      if (!m && r.ext && ext && r.ext.indexOf(ext.toLowerCase()) > -1) m = [];
      if (!m) return;
      var p = {
        link_text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
        link_url: url.href,
        placement: placement(a),
        transport_type: "beacon"
      };
      Object.keys(r.params || {}).forEach(function (k) {
        p[k] = String(r.params[k]).replace("$mode", mode).replace(/\$(\d)/g, function (_, n) { return m[n] || ""; });
      });
      if (r.event === "file_download") { p.file_name = url.pathname.split("/").pop(); p.file_extension = ext || ""; }
      gtag("event", r.event, p);
    });
  }
  // click: the primary button. auxclick: the middle button (a new tab).
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);
})([{"event":"play_click","path":"^/(delve|konbini)/play/","params":{"game":"$1","mode":"$mode"}},{"event":"cta_click","path":"^/(delve|konbini)/$","params":{"cta":"project","project":"$1"}},{"event":"file_download","selector":"a[download]","ext":["vcf"]}], ["eightyfour.ca"], [[".play-dialog","dialog"],[".get-dock","sticky_bar"],[".app-hero","hero"],["#download","download_section"],[".card","card"],[".float-dock","floating_pill"],[".promo","promo"],["header","header"],["footer","footer"],["main","content"]]);
