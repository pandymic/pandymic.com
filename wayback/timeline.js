// pandymic.com timeline: scroll-driven preview of each version.
//  - an IntersectionObserver picks the event nearest the middle of the screen;
//  - the preview window's chrome (Win98 / XP / modern), the address bar and the page theme follow the event;
//  - the build loads into a hidden iframe, a "tweak" edits its DOM to show that moment (e.g. the Feb 2003 logo,
//    a button that wasn't there yet), then it cross-fades in. Builds are same-origin, so tweaks can reach in.
(() => {
  'use strict';
  const embedded = window.self !== window.top;
  if (embedded) document.documentElement.classList.add('embedded');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const win = $('.window'), vp = $('.viewport'), urlEl = $('.url'), lock = $('.lock'), when = $('.when'), res = $('.res');
  const wtitle = $('.wtitle'), openA = $('.open'), goA = $('.go');
  let [front, back] = $$('.pv');
  front.classList.add('front');

  // ------------------------------------------------------------------ scaling: render the page at a period-correct
  // desktop width and shrink it into the window.
  const VIRTUAL = { classic: [1024, 768], luna: [1024, 768], modern: [1280, 960] };
  let frame = 'classic';
  function fit() {
    const [w, h] = VIRTUAL[frame];
    const s = vp.clientWidth / w;
    for (const f of [front, back]) { f.style.width = w + 'px'; f.style.height = h + 'px'; f.style.transform = `scale(${s})`; }
    res.textContent = `${w}×${h}`;
  }
  new ResizeObserver(fit).observe(vp);

  // ------------------------------------------------------------------ address bar: type the URL like a person would
  let typing = 0;
  async function typeUrl(spec) {
    const my = ++typing;
    const steps = spec.split(/\s*→\s*/);
    for (const [i, target] of steps.entries()) {
      if (i) await sleep(900);
      let cur = urlEl.textContent;
      let k = 0;
      while (k < cur.length && k < target.length && cur[k] === target[k]) k++;
      const speed = reduce ? 0 : 18;
      while (cur.length > k) { if (my !== typing) return; cur = cur.slice(0, -1); urlEl.textContent = cur; if (speed) await sleep(speed / 2); }
      for (const ch of [...target.slice(k)]) { if (my !== typing) return; cur += ch; urlEl.textContent = cur; if (speed) await sleep(speed); }
      lock.classList.toggle('on', target.startsWith('https:'));
    }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ------------------------------------------------------------------ DOM tweaks inside the preview
  // Centre an element inside the preview's own window. (Element.scrollIntoView() would also scroll every ancestor,
  // i.e. the timeline page itself: on phones that yanked the page back mid-swipe.)
  const centreIn = (d, el) => { const w = d.defaultView, r = el.getBoundingClientRect(); w.scrollTo(0, w.scrollY + r.top - w.innerHeight / 2 + r.height / 2); };
  const css = (d, text) => { const s = d.createElement('style'); s.textContent = text; d.head.appendChild(s); };
  const PULSE = '@keyframes wbp{from{outline-color:rgba(255,102,0,1)}to{outline-color:rgba(255,102,0,.1)}}' +
    '.wb-pulse{outline:3px solid #f60!important;outline-offset:2px;animation:wbp .9s ease-in-out infinite alternate}';
  const pulse = (d, els) => { css(d, PULSE); els.forEach((e) => e && e.classList.add('wb-pulse')); };
  const imgs = (d, re) => $$('img', d).filter((i) => re.test(i.getAttribute('src') || ''));
  const linkOf = (el) => (el && el.closest('a')) || el;
  function hideButton(d, name) {        // v1 menu button + the 1px line image and <br>s after it
    for (const img of imgs(d, new RegExp(`button_${name}\\.gif$`))) {
      const a = linkOf(img); let n = a.nextSibling; a.style.display = 'none';
      for (let k = 0; k < 4 && n; k++) { const nx = n.nextSibling; if (n.nodeType === 1) n.style.display = 'none'; n = nx; }
    }
  }
  function hideLinkButton(d, name) {
    for (const img of imgs(d, new RegExp(`link_small_${name}\\.gif$`))) {
      const a = linkOf(img); a.style.display = 'none';
      const sp = a.nextElementSibling; if (sp && /link_7_spacer/.test(sp.getAttribute('src') || '')) sp.style.display = 'none';
    }
  }
  function note(d, target, text, where = 'below') {
    const r = target.getBoundingClientRect();
    const n = d.createElement('div');
    n.textContent = text;
    n.style.cssText = `position:absolute;z-index:99;left:${r.left + d.defaultView.scrollX + 20}px;top:${(where === 'below' ? r.bottom : r.top) + d.defaultView.scrollY + 8}px;` +
      'max-width:260px;padding:10px 12px;background:#fff59d;color:#333;font:14px/1.35 "Comic Sans MS","Comic Neue",cursive;' +
      'box-shadow:3px 4px 8px rgba(0,0,0,.35);transform:rotate(-2deg)';
    d.body.appendChild(n);
  }
  function countUp(el, to, ms = 1600) {
    const t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toString(); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // The 黒 watermark arrived with the Oct 2003 home page (table background + header strip bg.top.index.gif);
  // Jan-Aug 2004 kept the watermark but not the strip. Earlier frames must not show either.
  const wmTable = (d) => $$('table', d).find((t) => /bg\.index\.gif/.test(t.getAttribute('style') || ''));
  const noWatermark = (d) => { const t = wmTable(d); if (t) t.style.backgroundImage = 'none'; };
  const noStrip = (d) => imgs(d, /bg\.top\.index\.gif$/).forEach((i) => (i.style.display = 'none'));
  const homeCell = (d, html, align = 'left', valign = 'top') => {
    const td = wmTable(d)?.querySelector('td'); if (!td) return;
    td.innerHTML = html; td.align = align; td.vAlign = valign; td.style.padding = '7px';
  };
  const TEMP = (name) => '<span style="letter-spacing: 3px"><font face="Verdana, Arial, Helvetica, sans-serif"><b><font size="1" color="#999999">TEMP:</font> ' +
    `<font size="1"><font color="#666666">${name.split('.').slice(0, -1).map((p, i, a) => i === a.length - 1 ? `<font color="#000000">${p}.</font>` : p + '.').join('')}HTML</font></font></b></font></span>`;

  const TWEAKS = {
    v1_feb2003(d) {                     // the first design: four-piece logo, no Tools/Anime, fewer link buttons
      const t = imgs(d, /title_pandymic\.gif$/)[0];
      if (t) {
        const cell = t.parentElement; cell.style.height = '56px';
        cell.innerHTML = ['pa', 'nd', 'ym', 'ic'].map((p, i) => `<img src="${t.getAttribute('src').replace('title_pandymic', 'title_' + p)}" width="${[75, 78, 84, 63][i]}" height="45" border="0">`).join('');
      }
      hideButton(d, 'tools'); hideButton(d, 'anime');
      ['dingostick', 'ramblings'].forEach((n) => hideLinkButton(d, n));
      homeCell(d, '<b>Index</b><br>Welcome to the Main Page!');   // (before noWatermark: it finds the cell by its background)
      noStrip(d); noWatermark(d);
    },
    v1_temp(d) { const td = $$('td[width="480"]', d)[0]; if (td) pulse(d, [td.querySelector('span') || td]); },
    v1_oct2003(d) {
      hideButton(d, 'anime'); ['dingostick', 'ramblings'].forEach((n) => hideLinkButton(d, n));
      homeCell(d, TEMP('INDEX.HTML'));
      pulse(d, [...imgs(d, /button_tools\.gif$/), ...imgs(d, /bg\.top\.index\.gif$/)]);
    },
    v1_dec2003(d) {
      homeCell(d, TEMP('INDEX.HTML'));
      pulse(d, [...imgs(d, /button_anime\.gif$/), ...imgs(d, /link_small_(dingostick|ramblings)\.gif$/)]);
    },
    v1_jp(d) {
      const t = imgs(d, /title_pandymic\.gif$/)[0];
      noStrip(d); homeCell(d, '&nbsp;');
      if (t) { t.style.filter = 'blur(3px) grayscale(1)'; note(d, t, 'Japanese title art (May–Sep 2004): never archived, lost.'); }
    },
    v1_broken(d) {
      const fin = $$('input[type=submit]', d).find((i) => /finish/i.test(i.value));
      if (fin) { const b = d.createElement('b'); b.style.color = '#FF0000'; b.textContent = 'Broken!'; fin.replaceWith(b); centreIn(d, b); pulse(d, [b]); }
    },
    v3_launch(d) { const f = $('form[name=contact_me]', d); if (f) f.style.visibility = 'hidden'; },
    v3_contact(d) { pulse(d, [$('form[name=contact_me]', d)]); },
    v3_counter(d) {
      const b = $$('b', d).filter((x) => /^\d+$/.test(x.textContent.trim()));
      if (b[0]) { b[0].textContent = '0'; countUp(b[0], 280671); pulse(d, [b[0].closest('p')]); }
      if (b[1]) { b[1].textContent = '0'; countUp(b[1], 21431); }
    },
    v3_seeing(d) {
      const i = $('input[name=enel_q]', d); if (!i) return;
      centreIn(d, i); pulse(d, [i]);
      let k = 0; const w = 'seeing'; const iv = setInterval(() => { i.value = w.slice(0, ++k); if (k >= w.length) clearInterval(iv); }, 160);
    },
    v3_love(d) {
      const i = $('input[name=enel_q]', d); if (!i) return;
      centreIn(d, i); pulse(d, [i]);
      let k = 0; const w = 'love'; const iv = setInterval(() => { i.value = w.slice(0, ++k); if (k >= w.length) clearInterval(iv); }, 200);
    },
    droste() {},
  };

  // ------------------------------------------------------------------ preview loading (double-buffered)
  let shownKey = '', wantKey = '', timer = 0, noiseOn = false;
  function preview(src, tweak) {
    const key = src + '|' + (tweak || '');
    wantKey = key;
    clearTimeout(timer);
    timer = setTimeout(() => load(src, tweak, key), 120);
  }
  function load(src, tweak, key) {
    if (key === shownKey) return;
    if (src === '#static') { shownKey = key; startNoise(); front.classList.remove('front'); return; }
    if (embedded && src === 'index.html') return;
    back.onload = () => {
      if (wantKey !== key) return;
      try {
        const d = back.contentDocument;
        d.querySelectorAll('video').forEach((v) => { v.muted = true; });
        if (tweak && TWEAKS[tweak]) TWEAKS[tweak](d);
      } catch { /* file:// or cross-origin: show the page untouched */ }
      stopNoise();
      back.classList.add('front'); front.classList.remove('front');
      [front, back] = [back, front];
      shownKey = key;
    };
    // location.replace(), not .src: setting an iframe's src adds an entry to the tab's history, so every card scrolled past
    // became a Back step. The frames start at about:blank (same origin), so their location can always be replaced.
    const url = new URL(src + (tweak ? (src.includes('?') ? '&' : '?') + 'tl=' + tweak : ''), location.href).href;
    try { back.contentWindow.location.replace(url); } catch { back.src = url; }
  }

  // "No signal" for 2010-2013
  const cv = $('.noise'), cx = cv.getContext('2d'); let raf = 0;
  function startNoise() {
    if (noiseOn) return; noiseOn = true; vp.classList.add('static');
    cv.width = 160; cv.height = 120;
    const img = cx.createImageData(160, 120);
    const draw = () => {
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      cx.putImageData(img, 0, 0);
      cx.fillStyle = '#000'; cx.fillRect(48, 52, 64, 16); cx.fillStyle = '#3f3'; cx.font = '10px monospace'; cx.fillText('NO SIGNAL', 53, 63);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
  }
  function stopNoise() { if (!noiseOn) return; noiseOn = false; cancelAnimationFrame(raf); vp.classList.remove('static'); }

  // ------------------------------------------------------------------ events
  const events = $$('.event');
  const chapters = $$('.chapter');
  // leave the address alone until the browser has restored the scroll position (Back) or jumped to #chapter
  let settled = false;
  addEventListener('load', () => setTimeout(() => { settled = true; }, 300));
  let active = null, petalTimer = 0;
  function activate(ev) {
    if (ev === active) return;
    active?.classList.remove('active');
    active = ev; ev.classList.add('active');
    const ch = ev.closest('.chapter');
    document.body.dataset.theme = ch.dataset.theme;
    // the address follows the chapter (#v3) by replacing the entry: the whole timeline stays one history entry, and a
    // reload or a shared link opens at that chapter
    if (!embedded && settled && ch.id) {
      const hash = ch === chapters[0] ? '' : '#' + ch.id;
      if (location.hash !== hash) try { history.replaceState(history.state, '', hash || location.pathname + location.search); } catch { /* sandboxed */ }
    }
    // the frame is inherited from the nearest earlier event that set one
    let f = ev.dataset.frame;
    for (let i = events.indexOf(ev); !f && i >= 0; i--) f = events[i].dataset.frame;
    if ((f || 'classic') !== frame) { frame = f || 'classic'; win.dataset.frame = frame; fit(); }
    typeUrl(ev.dataset.url || '');
    when.textContent = ev.dataset.when || '';
    const title = ev.querySelector('h3')?.textContent || '';
    wtitle.textContent = frame === 'classic' ? `${title} - Microsoft Internet Explorer` : frame === 'luna' ? `${title} - Mozilla Firefox` : title;
    const src = ev.dataset.src;
    openA.href = goA.href = src === '#static' ? '#' : src;
    openA.hidden = src === '#static';
    preview(src, ev.dataset.tweak);
    petals(ch.dataset.theme === 't3');
  }

  if (!embedded) {
    // the active event is the one whose middle is nearest the middle of the screen
    let ticking = false;
    const small = matchMedia('(max-width: 900px)');
    const pick = () => {
      ticking = false;
      // the middle of what's visible: on small screens the preview is stuck to the top, so measure below it
      const top = small.matches ? $('.monitor').getBoundingClientRect().bottom : 0;
      const mid = top + (innerHeight - top) / 2;
      let best = events[0], bd = Infinity;
      for (const e of events) { const r = e.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = e; } }
      activate(best);
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } };
    const io = new IntersectionObserver(queue, { threshold: [0, .5, 1] });
    events.forEach((e) => io.observe(e));
    addEventListener('scroll', queue, { passive: true });
    pick();
    // keyboard: j/k or arrows step through events
    addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = events.indexOf(active);
      const n = /^(j|ArrowDown)$/.test(e.key) ? i + 1 : /^(k|ArrowUp)$/.test(e.key) ? i - 1 : -1;
      if (n >= 0 && n < events.length && (e.key === 'j' || e.key === 'k')) { e.preventDefault(); events[n].scrollIntoView({ block: 'center' }); }
    });
  }

  // sakura petals during the 2006-2010 chapter
  function petals(on) {
    if (reduce || embedded) return;
    if (on && !petalTimer) {
      petalTimer = setInterval(() => {
        const p = document.createElement('i'); p.className = 'petal';
        p.style.left = Math.random() * 100 + 'vw'; p.style.setProperty('--dx', (Math.random() * 30 - 10) + 'vw');
        p.style.animationDuration = 6 + Math.random() * 6 + 's';
        document.body.appendChild(p); setTimeout(() => p.remove(), 13000);
      }, 450);
    } else if (!on && petalTimer) { clearInterval(petalTimer); petalTimer = 0; }
  }

  // the finale lists every build
  fetch('builds.json').then((r) => r.json()).then((bs) => {
    $('.builds').innerHTML = bs.map((b) => `<li><a href="${encodeURI(b.folder)}/">${b.id}</a> ${b.title.replace(/</g, '&lt;')} <small>(${b.period})</small></li>`).join('') +
      // the PACult forum archive holds other members' posts and cams: the LAN preview serves it (home.pandymic.com/wayback/pacult/),
      // pandymic.com only behind a lock (/secret/pacult/: locked/pacult/ of this repository, unlocked by a mailed link)
      (/^(home\.pandymic\.com|localhost|127\.0\.0\.1)$/.test(location.hostname)
        ? '<li><a href="../pacult/">pacult</a> The Penny Arcade Cult forum archive and Cam Portal <small>(2001\u20132007, local)</small></li>'
        : '<li><a href="/secret/pacult/">pacult</a> The Penny Arcade Cult forum archive and Cam Portal <small>(2001\u20132007, locked)</small></li>');
  }).catch(() => {});

  // hit counter, continued from the Lexicon's last count (21,431 users, Aug 2008)
  try {
    const n = Number(localStorage.getItem('pandymic-hits') || 21431) + 1;
    localStorage.setItem('pandymic-hits', n);
    $('#hits').textContent = String(n).padStart(6, '0');
  } catch { /* private mode */ }
})();
