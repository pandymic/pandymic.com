// pandymic.com/wayback: "ewajiten", the Japanese/English dictionary (jdic, 2005-2008), in the browser.
//
// The PHP searched Jim Breen's EDICT, the free Japanese-English dictionary file, with the classic xjdic-style options:
// q (query), h (PS starts with, PE ends with, PW exact word, PA anywhere, R full regexp), dir (E: English -> Japanese,
// J: Japanese -> English). No results page was ever captured, so the results here are new, drawn in each layout's own
// style. The data is today's EDICT2 (EDRDG, CC BY-SA 4.0), compacted by the build, fetched gzipped once and kept in
// IndexedDB. A Japanese search typed in romaji is also tried as hiragana and katakana.
//
// <script src=".../jdic.js" data-list=".../jdic-<hash>.tsv.gz" data-mode="content|box" data-ui="i/ui/jdic/" data-preload defer>
(function () {
  "use strict";
  const me = document.currentScript;
  const LIST = new URL(me.dataset.list, me.src).href;
  const MODE = me.dataset.mode || "box";
  const UI = me.dataset.ui || "i/ui/jdic/";
  const VERSION = "jdic-" + ((LIST.match(/jdic-([0-9a-f]+)\./) || [])[1] || LIST);
  const LIMIT = 100;

  // ---- the word list: IndexedDB, else the gzipped file (same store as the Lexicon) ----
  const db = () => new Promise((resolve, reject) => {
    const r = indexedDB.open("pandymic-wayback", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("lexicon");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const idb = (mode, fn) => db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction("lexicon", mode), req = fn(tx.objectStore("lexicon"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  async function download() {
    const res = await fetch(LIST);
    if (!res.ok) throw new Error(`word list ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf[0] === 0x1f && buf[1] === 0x8b
      ? new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
      : new TextDecoder().decode(buf);
  }
  const parse = (text) => text.split("\n").filter(Boolean).map((l) => {
    const [k, r, g, p] = l.split("\t");
    return { k: k ? k.split(";") : [], r: r ? r.split(";") : [], g: g.split("/"), p: p === "P" };
  });
  let words;
  const load = () => (words = words || (async () => {
    try {
      const hit = await idb("readonly", (s) => s.get(VERSION));
      if (hit) return parse(hit);
    } catch (e) { /* no IndexedDB */ }
    const text = await download();
    try {
      await idb("readwrite", (s) => s.put(text, VERSION));
      const keys = await idb("readonly", (s) => s.getAllKeys());   // drop older editions of this list only
      for (const key of keys) if (String(key).startsWith("jdic-") && key !== VERSION) await idb("readwrite", (s) => s.delete(key));
    } catch (e) { /* quota, private mode */ }
    return parse(text);
  })());

  // ---- romaji -> kana (Hepburn and kunrei, enough for typing a search) ----
  const KANA = { a: "\u3042", i: "\u3044", u: "\u3046", e: "\u3048", o: "\u304a" };
  const ROWS = { k: "\u304b\u304d\u304f\u3051\u3053", g: "\u304c\u304e\u3050\u3052\u3054", s: "\u3055\u3057\u3059\u305b\u305d", z: "\u3056\u3058\u305a\u305c\u305e", t: "\u305f\u3061\u3064\u3066\u3068", d: "\u3060\u3062\u3065\u3067\u3069", n: "\u306a\u306b\u306c\u306d\u306e",
    h: "\u306f\u3072\u3075\u3078\u307b", b: "\u3070\u3073\u3076\u3079\u307c", p: "\u3071\u3074\u3077\u307a\u307d", m: "\u307e\u307f\u3080\u3081\u3082", r: "\u3089\u308a\u308b\u308c\u308d", y: "\u3084 \u3044 \u3086 \u3044\u3047\u3088", w: "\u308f\u3090 \u3046 \u3091\u3092", f: "\u3075\u3041\u3075\u3043\u3075\u3075\u3047\u3075\u3049", j: "\u3058\u3083\u3058\u3058\u3085\u3058\u3047\u3058\u3087", v: "\u3094\u3041\u3094\u3043\u3094\u3094\u3047\u3094\u3049" };
  const YOON = { ky: "\u304d", gy: "\u304e", sh: "\u3057", sy: "\u3057", j: "\u3058", zy: "\u3058", jy: "\u3058", ch: "\u3061", ty: "\u3061", cy: "\u3061", dy: "\u3062", ny: "\u306b", hy: "\u3072", by: "\u3073", py: "\u3074", my: "\u307f", ry: "\u308a" };
  const SMALL = { a: "\u3083", u: "\u3085", o: "\u3087", e: "\u3047" };
  const SPECIAL = { shi: "\u3057", chi: "\u3061", tsu: "\u3064", fu: "\u3075", ji: "\u3058", si: "\u3057", ti: "\u3061", tu: "\u3064", hu: "\u3075", zi: "\u3058", di: "\u3062", du: "\u3065", wo: "\u3092", "n'": "\u3093", nn: "\u3093", "-": "\u30fc" };
  const VOWELS = "aiueo";
  function toHira(s) {
    s = s.toLowerCase();
    let out = "", i = 0;
    while (i < s.length) {
      const c = s[i], n = s[i + 1];
      if (c === n && c !== "n" && /[bcdfghjkmprstvwyz]/.test(c)) { out += "\u3063"; i++; continue; }            // doubled consonant
      if (c === "n" && (n === undefined || (!VOWELS.includes(n) && n !== "y" && n !== "'" && n !== "n"))) { out += "\u3093"; i++; continue; }
      let hit = false;
      for (const len of [3, 2]) {
        const t = s.slice(i, i + len);
        if (SPECIAL[t]) { out += SPECIAL[t]; i += len; hit = true; break; }
        const head = t.slice(0, -1), v = t.slice(-1);
        if (YOON[head] && SMALL[v]) { out += YOON[head] + SMALL[v]; i += len; hit = true; break; }
        if (len === 3 && (head === "sh" || head === "ch" || head === "j") && v === "i") { out += YOON[head]; i += len; hit = true; break; }
      }
      if (hit) continue;
      if (KANA[c]) { out += KANA[c]; i++; continue; }
      if (ROWS[c] && n && VOWELS.includes(n)) {
        const row = ROWS[c], k = VOWELS.indexOf(n);
        const cell = row.length === 5 ? row[k] : row.slice(k * 2, k * 2 + 2).trim();
        if (cell) { out += cell; i += 2; continue; }
      }
      if (c === "j" && n && SMALL[n]) { out += "\u3058" + SMALL[n]; i += 2; continue; }
      return null;                                                                                    // not romaji
    }
    return out;
  }
  const toKata = (h) => h.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

  // ---- search ----
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // "(n) (1) (uk) {comp} word (esp. ...)" -> "word"
  const bare = (g) => g.replace(/^(\s*(\([^)]*\)|\{[^}]*\}))+\s*/, "").replace(/(\s*\([^)]*\))+\s*$/, "").trim();
  function matcher(q, how) {
    const e = reEsc(q);
    switch (how) {
      case "PS": return new RegExp("^" + e, "i");
      case "PE": return new RegExp(e + "$", "i");
      case "PW": return new RegExp("(^|[^\\p{L}\\p{N}])" + e + "($|[^\\p{L}\\p{N}])", "iu");
      case "R": return new RegExp(q, "iu");
      default: return new RegExp(e, "i");
    }
  }
  function search(list, q, how, dir) {
    let tests;
    if (dir === "J") {
      const qs = [q];
      if (/^[a-z' -]+$/i.test(q)) { const h = toHira(q.replace(/\s+/g, "")); if (h) qs.push(h, toKata(h)); }
      tests = qs.map((x) => (how === "PW" ? new RegExp("^" + reEsc(x) + "$", "u") : matcher(x, how)));
    } else tests = [matcher(q, how)];
    const out = [];
    for (const w of list) {
      let score = -1;
      if (dir === "J") {
        for (const f of w.k.concat(w.r)) if (tests.some((t) => t.test(f))) { score = tests.some((t) => t.source === "^" + reEsc(f) + "$") || f === q ? 0 : 1; break; }
      } else {
        for (const g of w.g) {
          const b = bare(g);
          if (how === "R" ? tests[0].test(g) : tests[0].test(b)) {
            const sc = b.toLowerCase() === q.toLowerCase() ? 0 : 1;
            if (score < 0 || sc < score) score = sc;
            if (!score) break;
          }
        }
      }
      if (score >= 0) out.push([score + (w.p ? 0 : 2), w]);
    }
    return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]);   // exact common, common, exact, the rest (stable: EDICT order)
  }

  // ---- results, in each layout's style ----
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mark = (text, re) => {
    if (!re) return esc(text);
    const g = new RegExp(re.source.replace(/^\^|\$$/g, ""), re.flags.includes("g") ? re.flags : re.flags + "g");
    let out = "", i = 0;
    for (const m of text.matchAll(g)) { if (!m[0]) break; out += esc(text.slice(i, m.index)) + "<b>" + esc(m[0]) + "</b>"; i = m.index + m[0].length; }
    return out + esc(text.slice(i));
  };
  function rows(found, q, how, dir, dark) {
    let hl = null;
    try { hl = dir === "E" && how !== "R" ? new RegExp(reEsc(q), "i") : null; } catch (e) { /* no highlight */ }
    const a = dark ? ["#440000", "#330000"] : ["#F0F0F0", "#E3E3E3"];
    return found.slice(0, LIMIT).map((w, i) => {
      const head = esc(w.k[0] || w.r[0] || "") + (w.k.length && w.r.length ? ` <span style="opacity:.8">\u3010${esc(w.r.join("\u30fb"))}\u3011</span>` : "");
      const more = w.k.length > 1 ? `<br /><small style="opacity:.7">${w.k.slice(1).map(esc).join("\u30fb")}</small>` : "";
      const gl = w.g.map((g) => mark(g, hl)).join("; ");
      return `<tr style="background:${a[i % 2]}"><td style="width:34%;padding:3px 6px;vertical-align:top;font-size:13px;overflow-wrap:anywhere">${head}${more}</td>` +
        `<td style="padding:3px 6px;vertical-align:top;font-size:12px;overflow-wrap:anywhere">${gl}${w.p ? ' <small style="opacity:.6">(common)</small>' : ""}</td></tr>`;
    }).join("");
  }
  const summary = (found, q) => found.length
    ? `${found.length.toLocaleString("en")} match${found.length === 1 ? "" : "es"} for <b>${esc(q)}</b>${found.length > LIMIT ? `, the first ${LIMIT} shown` : ""}.`
    : `No matches for <b>${esc(q)}</b>.`;
  const CREDIT = 'Dictionary data: <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" style="color:inherit">EDICT</a>, ' +
    '&copy; the <a href="https://www.edrdg.org/" style="color:inherit">Electronic Dictionary Research and Development Group</a>, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/4.0/" style="color:inherit">CC BY-SA 4.0</a>.';

  function render(html) {
    const tpl = document.createElement("template");
    if (MODE === "content") {
      // v2: the home page's empty content box (<!-- BEGIN CONTENT --><!-- END CONTENT -->), where the PHP printed them
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
      let end = null;
      for (let n; (n = w.nextNode());) if (n.nodeValue.trim() === "END CONTENT") end = n;
      tpl.innerHTML = `<div class="wayback-jdic" style="font-size:11px">${html.light}</div>`;
      if (end) end.parentNode.insertBefore(tpl.content, end);
      return;
    }
    // v3: a box below the query box, in the same frame (the jdic result_* corner graphics)
    const form = document.querySelector('form[name="jdic"]');
    if (!form) return;
    tpl.innerHTML = `<table class="wayback-jdic" width="90%" cellpadding="0" cellspacing="0" border="0" style="width:90%;margin:0 auto 20px">
      <tr><td width="100%" style="color:#FFFFFF;background:#330000;padding:5px;text-align:left">${html.dark}</td>
      <td width="9" style="width:9px;background:#CC0000 url(${UI}result_rm.gif) repeat-y;vertical-align:top"><img src="${UI}result_rt.gif" alt="" width="9" height="9" style="vertical-align:top" /></td></tr>
      <tr><td style="height:9px;background:#CC0000 url(${UI}result_bm.gif) repeat-x;text-align:left;vertical-align:top"><img src="${UI}result_bl.gif" alt="" width="9" height="9" style="vertical-align:top" /></td>
      <td width="9" style="width:9px;height:9px;background:#CC0000;vertical-align:top"><img src="${UI}result_br.gif" alt="" width="9" height="9" style="vertical-align:top" /></td></tr></table>`;
    form.after(tpl.content);
  }
  const page = (body, dark) => `${body}<p style="margin:8px 0 0;font-size:10px;opacity:.75">${CREDIT}</p>`;
  const table = (found, q, how, dir, dark) => `<p style="margin:0 0 6px">${summary(found, q)}</p>` + (found.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:100%;color:${dark ? "#FFFFFF" : "#000000"}">${rows(found, q, how, dir, dark)}</table>` : "");

  // ---- the query ----
  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim().slice(0, 200);
  const how = ["PS", "PE", "PW", "PA", "R"].includes(params.get("h")) ? params.get("h") : "PS";
  const dir = params.get("dir") === "J" ? "J" : "E";
  const form = document.querySelector('form[name="jdic"]');
  if (form) {                                                    // put the query back in the form, as the PHP did
    if (form.q) form.q.value = q;
    if (form.h) form.h.value = how;
    for (const r of form.querySelectorAll('input[name="dir"]')) r.checked = r.value === dir;
  }
  if (!q) { if (me.hasAttribute("data-preload")) load().catch(() => {}); return; }
  const wait = { light: "Searching&hellip; (the first search downloads the dictionary, about 7 MB)", dark: "Searching&hellip; (the first search downloads the dictionary, about 7 MB)" };
  render(wait);
  const shown = () => document.querySelector(".wayback-jdic");
  load().then((list) => {
    let found;
    try { found = search(list, q, how, dir); } catch (e) {
      const bad = `That isn't a valid regular expression: <b>${esc(String(e.message))}</b>`;
      shown().remove();
      return render({ light: page(bad), dark: page(bad, true) });
    }
    shown().remove();
    render({ light: page(table(found, q, how, dir, false)), dark: page(table(found, q, how, dir, true), true) });
  }, () => { shown().remove(); render({ light: "The dictionary couldn't be loaded. Try again in a moment.", dark: "The dictionary couldn't be loaded. Try again in a moment." }); });
})();
