// pandymic.com/wayback: page and visit counters (pandymic/websocket src/counters.ts, <api>/counter).
//
//   WaybackCounter.get(["wayback/visits"])  -> { "wayback/visits": n } or null (offline)
//   WaybackCounter.hit(["wayback/visits"])  -> the same, after counting where the server agrees
//
// Increments are silently gated by the site's bot check: a pass (24 h, kept in localStorage) or, without one, a contact
// form token earned in the background (the same proof of work as the contact dialog, in a Web Worker, beside Cloudflare
// Turnstile rendered invisibly with appearance "interaction-only"). Nothing is ever shown: if Turnstile wants a click,
// or anything fails, the visit just isn't counted. One token is earned per page load at most, after the page is idle.
(function () {
  "use strict";
  if (window.WaybackCounter) return;
  const me = document.currentScript;
  const API = (me && me.dataset.api) || "/api/v1";
  const SITEKEY = (me && me.dataset.sitekey) || "0x4AAAAAAFZChkuJMT4OUAeh";
  const WORKER = new URL("pow.js", me ? me.src : location.href).href;
  const PASS = "pandymic-wayback-pass";

  const json = (path, body) => fetch(API + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  const pass = () => { try { const p = JSON.parse(localStorage.getItem(PASS) || "null"); return p && p.expires > Date.now() + 60000 ? p.pass : null; } catch (e) { return null; } };
  const keep = (p) => { try { if (p) localStorage.setItem(PASS, JSON.stringify(p)); } catch (e) { /* private mode */ } };

  const work = (ch) => new Promise((resolve, reject) => {
    const w = new Worker(WORKER);
    const t = setTimeout(() => { w.terminate(); reject(new Error("pow timeout")); }, 60000);
    w.onmessage = ({ data }) => { if (data.nonce != null) { clearTimeout(t); w.terminate(); resolve(data.nonce); } };
    w.onerror = (e) => { clearTimeout(t); w.terminate(); reject(e); };
    w.postMessage({ challenge: ch.challenge, bits: ch.bits });
  });
  let tsScript;
  const turnstile = () => new Promise((resolve, reject) => {
    tsScript = tsScript || new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
    tsScript.then(() => {
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden";
      box.setAttribute("aria-hidden", "true");
      document.body.appendChild(box);
      const done = (f) => (v) => { clearTimeout(t); try { window.turnstile.remove(id); } catch (e) { /* gone */ } box.remove(); f(v); };
      const id = window.turnstile.render(box, {
        sitekey: SITEKEY, action: "counter", appearance: "interaction-only",
        callback: done(resolve), "error-callback": done(() => reject(new Error("turnstile"))),
        "before-interactive-callback": done(() => reject(new Error("needs interaction"))),   // never ask for a click
      });
      const t = setTimeout(done(() => reject(new Error("turnstile timeout"))), 30000);
    }, reject);
  });
  let earning = null;
  const earn = () => (earning = earning || (async () => {
    const ch = await json("/contact/challenge");
    const [nonce, ts] = await Promise.all([work(ch), turnstile()]);
    return (await json("/contact/token", Object.assign({}, ch, { nonce, turnstile: ts }))).token;
  })());
  const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 4000 }) : setTimeout(r, 1500)));

  async function hit(names) {
    try {
      const p = pass();
      if (p) {
        const r = await json("/counter/hit", { names, pass: p });
        keep(r.pass);
        if (r.checked) { api.counted = r.counted; return r.values; }   // counted, or already counted recently: the pass is good
      }
      await idle();
      const r = await json("/counter/hit", { names, token: await earn() });
      keep(r.pass);
      api.counted = r.counted;
      return r.values;
    } catch (e) {
      api.counted = false;
      return get(names);
    }
  }
  const get = (names) => json(`/counter?names=${names.map(encodeURIComponent).join(",")}`).then((r) => r.values, () => null);

  // api.counted: whether the last hit() was counted (the Wallpaper Generator stamps a new number only then)
  const api = { get, hit, counted: false };
  window.WaybackCounter = api;
})();
