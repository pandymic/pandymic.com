// pandymic.com/wayback: sirblack's English/Elvish Lexicon, in the browser.
//
// The PHP page answered ?enel_q=<word>[&d=…] itself; here the archived page is static and this script fills in the
// results exactly where (and as) the PHP printed them. The word list (4,646 entries, the 2009 database) is fetched once,
// gzipped, and kept in IndexedDB for later visits. The page's "phrases searched by users" counter is live
// (pandymic/websocket counters, silently gated: see counter.js).
//
// <script src=".../lexicon.js" data-list=".../lexicon-<hash>.tsv.gz" data-mode="inline|row|after-about" data-en-only defer>
(function () {
  "use strict";
  const me = document.currentScript;
  const LIST = new URL(me.dataset.list, me.src).href;
  const MODE = me.dataset.mode || "after-about";
  const EN_ONLY = me.hasAttribute("data-en-only");
  const VERSION = (LIST.match(/lexicon-([0-9a-f]+)\./) || [])[1] || LIST;

  // ---- the word list: IndexedDB, else the gzipped file ----
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
  const parse = (text) => text.split("\n").filter((l) => l && l[0] !== "#").map((l) => { const [english, elvish] = l.split("\t"); return { english, elvish: elvish || "" }; });
  async function download() {
    const res = await fetch(LIST);
    if (!res.ok) throw new Error(`word list ${res.status}`);
    // The server may already have decoded it (Content-Encoding: gzip); only gunzip real gzip bytes.
    const buf = new Uint8Array(await res.arrayBuffer());
    const text = buf[0] === 0x1f && buf[1] === 0x8b
      ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
      : new TextDecoder().decode(buf);
    return text;
  }
  let words;
  const load = () => (words = words || (async () => {
    try {
      const hit = await idb("readonly", (s) => s.get(VERSION));
      if (hit) return parse(hit);
    } catch (e) { /* no IndexedDB: download every time */ }
    const text = await download();
    try { await idb("readwrite", (s) => { s.clear(); return s.put(text, VERSION); }); } catch (e) { /* quota, private mode */ }
    return parse(text);
  })());

  // ---- the search and the table, as tools/enel/lexicon.js (the PHP's behaviour) ----
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const direction = (d) => (d === undefined || d === null || d === "" || d === "0" ? "en" : "el");
  const search = (list, q, dir) => {
    const needle = q.toLowerCase(), col = dir === "el" ? "elvish" : "english";
    return list.filter((w) => w[col].toLowerCase().includes(needle)).map((w) => Object.assign({}, w, { exact: w[col].toLowerCase() === needle }));
  };
  const boldAll = (text, q) => {
    const lower = text.toLowerCase(), needle = q.toLowerCase();
    let out = "", i = 0;
    for (let j = lower.indexOf(needle); needle && j !== -1; j = lower.indexOf(needle, i)) {
      out += esc(text.slice(i, j)) + "<b>" + esc(text.slice(j, j + needle.length)) + "</b>";
      i = j + needle.length;
    }
    return out + esc(text.slice(i));
  };
  function table(results, q, dir) {
    const col = dir === "el" ? "elvish" : "english";
    let rows = "", alt = 0;
    for (const r of results) {
      const cell = (f) => (f === col ? boldAll(r[f], q) : esc(r[f]));
      if (r.exact) rows += `<tr><td bgcolor="#D3D3D3" style="font-face: sans-serif;">&nbsp; <b><i>${esc(r.english)}</i></b></td><td bgcolor="#D9D9D9" style="font-face: sans-serif;">&nbsp; <b><i>${esc(r.elvish)}</i></b></td></tr>`;
      else { const bg = alt++ % 2 === 0 ? "#E3E3E3" : "#F0F0F0"; rows += `<tr><td bgcolor="${bg}" style="font-face: sans-serif;">&nbsp; ${cell("english")}</td><td bgcolor="${bg}" style="font-face: sans-serif;">&nbsp; ${cell("elvish")}</td></tr>`; }
    }
    if (!results.length) rows = `<tr><td bgcolor="#E3E3E3" colspan="2" align="center" style="font-face: sans-serif;">&nbsp; No matches for <b>${esc(q)}</b></td></tr>`;
    return `<table border="0" bgcolor="#606060" cellspacing="0" cellpadding="1" width="300"><tr><td>
      <table border="0" bgcolor="#C0C0C0" cellspacing="1" cellpadding="1" width="100%"><tr>
      <td align="center" bgcolor="#C0C0C0" width="50%"><font face="Arial, Helvetica, sans-serif" size="2"><b>English</b></font></td>
      <td align="center" bgcolor="#C0C0C0" width="50%"><font face="Arial, Helvetica, sans-serif" size="2"><b>Elvish</b></font></td>
      </tr>${rows}</table></td></tr></table>`;
  }

  // ---- where the PHP printed it ----
  const comment = (text) => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT); for (let n; (n = w.nextNode());) if (n.nodeValue.trim() === text) return n; return null; };
  function insert(html) {
    const end = comment("Dictionary End");
    const wrap = document.createElement("template");
    if (MODE === "inline" && end) {
      wrap.innerHTML = html;
      end.parentNode.insertBefore(wrap.content, end);
      return;
    }
    const row = `<tr><td align="center">${html}</td></tr>`;
    if (MODE === "row" && end) {
      wrap.innerHTML = `<table><tbody>${row}</tbody></table>`;
      end.parentNode.insertBefore(wrap.content.querySelector("tr"), end);
      return;
    }
    // after-about: the row after the one with the "By Michal 'sirblack' Pandyra, 2002/..." line
    const td = [...document.querySelectorAll("td")].reverse().find((t) => /Pandyra, 2002/.test(t.textContent) && !t.querySelector("td"));
    const tr = td && td.closest("tr");
    if (!tr) return;
    wrap.innerHTML = `<table><tbody>${row}</tbody></table>`;
    tr.after(wrap.content.querySelector("tr"));
  }

  // ---- the page's counter line ("Approximately N phrases have been searched by M users since inception.") ----
  function showCounts(v) {
    if (!v) return;
    const p = [...document.querySelectorAll("p")].find((x) => /phrases have been searched by/.test(x.textContent));
    const b = p && p.querySelectorAll("b");
    if (b && b.length >= 2) { b[0].textContent = v["wayback/enel-searches"]; b[1].textContent = v["wayback/enel-users"]; }
  }

  const params = new URLSearchParams(location.search);
  const q = params.get("enel_q") || "";
  const dir = EN_ONLY ? "en" : direction(params.get("d"));   // 2005: the "El -> En" button sends d=El -> En; 2008: d=1
  const ready = load();
  if (q) {
    ready.then((list) => insert(table(search(list, q, dir), q, dir)), () => insert(`<p>The word list couldn't be loaded. Try again in a moment.</p>`));
    const box = document.querySelector('input[name="enel_q"]');
    if (box) box.value = q;
  }
  const C = window.WaybackCounter;
  if (C && window.top === window.self) {                       // the timeline's preview frames count nothing
    C.get(["wayback/enel-searches", "wayback/enel-users"]).then(showCounts);
    C.hit(q ? ["wayback/enel-searches", "wayback/enel-users"] : ["wayback/enel-users"]).then(showCounts);
  }
})();
