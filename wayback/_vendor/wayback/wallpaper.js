// pandymic.com/wayback: the PANDYMiC.COM Wallpaper Generator v1.0 (2004), in the browser.
//
// The 2004 form submitted to /i/wall/<design>.pgi, a PHP/GD script that composed the wallpaper and returned a JPEG. This
// is that script on a canvas, following the leaked source (and tools/wallpaper/generate.js) line by line: $_GET handling
// and clamps, the layer's imagecopy() geometry with GD's 7-bit alpha blend, the imagestring() stamps in GD's own bitmap
// fonts, the logo, JPEG at quality 100. The render number came from MySQL's insert id: here it is a shared counter
// (pandymic/websocket, silently gated; see counter.js). Without it the stamp is a bare "#", as the Oct-Dec 2004 renders were.
//
// <script src=".../wallpaper.js" data-assets=".../wallpaper/" defer>
(function () {
  "use strict";
  const me = document.currentScript;
  const ASSETS = new URL(me.dataset.assets || "wallpaper/", me.src).href;
  const T = Math.trunc;
  const DESIGNS = {
    wallpaper_azudai_sakaki01: { bg: "000000", layer: [2048, 413], place: (w, h) => [0, T((h / 2) - (413 / 2) - (107 / 2) + 24), 2048 - w, 0, w, 413] },
    wallpaper_bebop_faye01: { bg: "282C32", layer: [779, 455], place: (w, h) => [0, h - 455, 0, 0, 779, 455] },
    wallpaper_custom_4chan01: { bg: "000000", layer: [640, 468], place: (w, h) => [0, h - 468, 0, 0, 640, 468] },
    wallpaper_slayers_naga01: { bg: "FFFFFF", layer: [304, 1536], place: (w, h) => [w - 376, 0, 0, 1536 - h, 304, h] },
  };

  // ---- PHP 4 semantics ----
  const phpNumber = (s) => { const m = /^\s*([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)/.exec(String(s == null ? "" : s)); return m ? Number(m[1]) : 0; };
  const phpRound = (n) => Math.sign(n) * Math.round(Math.abs(n));
  function params(design, q) {
    let size = typeof q.res === "string" ? q.res : "";
    if (!size.includes("x")) size = "1024x768";
    const i = size.indexOf("x");
    let w = phpRound(phpNumber(size.slice(0, i))), h = phpRound(phpNumber(size.slice(i + 1)));
    if (w < 640) w = 640; else if (w > 2048) w = 2048;
    if (h < 480) h = 480; else if (h > 1536) h = 1536;
    let bg = typeof q.bg === "string" ? q.bg : "";
    if (!/^[0-9a-f]{6}$/i.test(bg)) bg = design.bg;
    const name = [...(typeof q.for === "string" ? q.for : "")].slice(0, 15).join("");
    return { w, h, bg: bg.toUpperCase(), name };
  }

  // ---- loading ----
  const cache = {};
  const rgba = (file) => (cache[file] = cache[file] || (async () => {
    const res = await fetch(ASSETS + file);
    if (!res.ok) throw new Error(file);
    const bmp = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bmp, 0, 0);
    return { data: x.getImageData(0, 0, bmp.width, bmp.height).data, w: bmp.width, h: bmp.height };
  })());
  const font = (n) => (cache[`gd${n}`] = cache[`gd${n}`] || fetch(ASSETS + `gd${n}.json`).then((r) => r.json()));

  // ---- GD ----
  // imagecopy() onto an opaque truecolor image with alpha blending on: libgd's 7-bit alpha (127 = transparent).
  function gdCopy(dst, dw, dh, src, dx, dy, sx, sy, sw, sh) {
    dx = T(dx); dy = T(dy); sx = T(sx); sy = T(sy);
    for (let y = 0; y < sh; y++) {
      const ty = dy + y, fy = sy + y;
      if (ty < 0 || ty >= dh || fy < 0 || fy >= src.h) continue;
      for (let x = 0; x < sw; x++) {
        const tx = dx + x, fx = sx + x;
        if (tx < 0 || tx >= dw || fx < 0 || fx >= src.w) continue;
        const si = (fy * src.w + fx) * 4, di = (ty * dw + tx) * 4;
        const ga = 127 - (src.data[si + 3] >> 1);
        if (ga === 127) continue;
        if (ga === 0) { dst[di] = src.data[si]; dst[di + 1] = src.data[si + 1]; dst[di + 2] = src.data[si + 2]; continue; }
        const s = 127 - ga;
        for (let c = 0; c < 3; c++) dst[di + c] = T((src.data[si + c] * s + dst[di + c] * ga) / 127);
      }
    }
  }
  // imagestring(): GD's built-in bitmap fonts (2 = gdFontSmall 6x13, 3 = gdFontMediumBold 7x13), extracted from libgd.
  function imagestring(dst, w, h, f, x, y, text, rgb) {
    let cx = T(x);
    const cy = T(y);
    for (const ch of text) {
      const code = ch.codePointAt(0), g = code <= 255 ? f.glyphs[code - f.offset] : null;
      if (g) for (let gy = 0; gy < f.h; gy++) for (let gx = 0; gx < f.w; gx++) {
        if (g[gy][gx] !== "#") continue;
        const px = cx + gx, py = cy + gy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const i = (py * w + px) * 4;
        dst[i] = rgb[0]; dst[i + 1] = rgb[1]; dst[i + 2] = rgb[2];
      }
      cx += f.w;
    }
  }

  async function render(id, q, renderId) {
    const d = DESIGNS[id], p = params(d, q), { w, h } = p;
    const [layer, logo, f2, f3] = await Promise.all([rgba(`${id}/layer_01.png`), rgba("wallpaper_logo.png"), font(2), font(3)]);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    const img = x.createImageData(w, h), px = img.data;
    const bg = [0, 2, 4].map((i) => parseInt(p.bg.slice(i, i + 2), 16));
    for (let i = 0; i < px.length; i += 4) { px[i] = bg[0]; px[i + 1] = bg[1]; px[i + 2] = bg[2]; px[i + 3] = 255; }
    gdCopy(px, w, h, layer, ...d.place(w, h));
    const stamp = renderId == null ? "#" : "#" + String(renderId).padStart(6, "0");
    const grey = [133, 133, 133];
    if (p.name !== "") {
      imagestring(px, w, h, f3, w - 460, h - 15, stamp, grey);
      imagestring(px, w, h, f2, w - 400, h - 15, `generated for ${p.name}, enjoy!`, grey);
    } else {
      imagestring(px, w, h, f3, w - 245, h - 19, stamp, grey);
    }
    gdCopy(px, w, h, logo, w - 185, h - 20, 0, 0, 185, 20);
    x.putImageData(img, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 1));
    return { blob, filename: `${id}_${w}x${h}.jpg`, w, h };
  }

  // ---- the result: shown over the page (the original replaced the page with the JPEG) ----
  function show(out) {
    const url = URL.createObjectURL(out.blob);
    const o = document.createElement("div");
    o.setAttribute("role", "dialog");
    o.setAttribute("aria-label", "Your wallpaper");
    o.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:13px Verdana,Arial,sans-serif;color:#ddd";
    const img = new Image();
    img.src = url; img.alt = out.filename;
    img.style.cssText = "max-width:94vw;max-height:80vh;box-shadow:0 0 0 1px #666,0 10px 40px #000";
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center";
    const btn = (label, attrs) => { const a = document.createElement(attrs.href ? "a" : "button"); a.textContent = label; Object.assign(a, attrs);
      a.style.cssText = "background:#c0c0c0;color:#000;border:2px outset #fff;padding:4px 12px;font:bold 12px Verdana,Arial,sans-serif;text-decoration:none;cursor:pointer"; return a; };
    const close = () => { o.remove(); URL.revokeObjectURL(url); removeEventListener("keydown", esc); };
    const esc = (e) => { if (e.key === "Escape") close(); };
    bar.append(document.createTextNode(`${out.w}x${out.h}`), btn("Save", { href: url, download: out.filename }), btn("Open full size", { href: url, target: "_blank", rel: "noopener" }), btn("Close", { type: "button", onclick: close }));
    o.append(img, bar);
    o.addEventListener("click", (e) => { if (e.target === o) close(); });
    addEventListener("keydown", esc);
    document.body.appendChild(o);
  }

  document.addEventListener("submit", async (e) => {
    const form = e.target, m = /i\/wall\/(wallpaper_[a-z0-9_]+)\.pgi$/.exec(form.getAttribute("action") || "");
    if (!m || !DESIGNS[m[1]]) return;                           // the private design: the page reloads, as in 2004
    e.preventDefault();
    const q = Object.fromEntries(new FormData(form));
    const submit = form.querySelector('input[type="submit"]');
    if (submit) { submit.disabled = true; submit.value = "Generating..."; }
    try {
      let id = null;
      if (window.WaybackCounter) {
        const v = await window.WaybackCounter.hit(["wayback/wallpaper-renders"]);
        id = window.WaybackCounter.counted && v && v["wayback/wallpaper-renders"] != null ? v["wayback/wallpaper-renders"] : null;
      }
      show(await render(m[1], q, id));
    } catch (err) {
      alert("The wallpaper couldn't be generated: " + err.message);
    } finally {
      if (submit) { submit.disabled = false; submit.value = "Finish"; }
    }
  });
})();
