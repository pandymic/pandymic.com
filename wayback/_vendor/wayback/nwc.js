// Necrowombicon 2003 clock: a live "TIME SINCE:" count-up, in the clock's own lettering (rebuilt from sirblack's art by
// tools/rebuilt/src/nwc_clock.py). Off by default (the pages stay as archived); on with ?since in the URL, or
// data-mode="since" on this script tag. Two pages carry the clock:
//   pandymic.com/nwc/ (side quest nwc): the archived page ends on "Oh snap, it's over!" (over.gif, the one real slice);
//     that strip becomes the counter and the heading slice reads TIME SINCE:.
//   pacult.com/nwc.php (side quest pacult-nwc): PACult's lighter copy, 450x300 in slices; the whole clock is redrawn
//     (at 600x400, shown at 450x300) in its own palette.
// Days fill a five-cell field, right-aligned, blank rather than leading zeroes; hrs and mins keep two digits. The zero is
// when the 2003 countdown ran out: the June 3 (PACult) and June 8 (portal) captures both put it at 2003-07-25 22:22 UTC.
//   <script src=".../_vendor/wayback/nwc.js" data-zero="2003-07-25T22:22:00Z" [data-mode="since"] defer></script>
(() => {
  const me = document.currentScript;
  if (!me) return;
  const q = new URLSearchParams(location.search);
  const mode = q.has('since') ? 'since' : q.has('over') ? 'over' : me.dataset.mode || 'over';
  if (mode !== 'since') return;
  const base = me.src.replace(/nwc\.js(\?.*)?$/, 'nwc/');
  const zero = Date.parse(me.dataset.zero || '2003-07-25T22:22:00Z');
  const find = (re) => [...document.images].find((i) => re.test(i.getAttribute('src') || ''));
  const load = (f) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = base + f; });

  const over = find(/over\.gif$/);
  const pac = find(/pac_timer_01\.jpg$/);
  if (!over && !pac) return;
  const light = !over;
  const sfx = light ? '_light' : '';
  const files = [light ? 'pacult_since.png' : 'strip_since.png', 'digits.png', `label_days${sfx}.png`, `label_hrs${sfx}.png`, `label_mins${sfx}.png`];

  Promise.all(files.map(load)).then(([bg, digits, ...labels]) => {
    const c = document.createElement('canvas');
    c.title = c.ariaLabel = 'Time since Necrowombicon 2003';
    // the strip's origin on the canvas: the portal canvas IS the strip; PACult's canvas is the whole 600x400 clock
    let ox = 0, oy = 0;
    if (light) {
      c.width = 600; c.height = 400; ox = 168; oy = 238;
      Object.assign(c.style, { width: '450px', height: '300px', display: 'block' });
      const p = pac.parentElement;
      p.replaceChildren(c);
    } else {
      c.width = 367; c.height = 34;
      c.style.verticalAlign = getComputedStyle(over).verticalAlign;
      const s06 = find(/NWC_clock_TG_06\.gif$/);
      if (s06) s06.src = base + 'NWC_clock_TG_06_since.gif';
      over.replaceWith(c);
    }
    const g = c.getContext('2d');
    // Laid out from the right end of the 367 px strip, with the 2003 clock's spacing (label 10-11 px after its digits,
    // next field 20 px after a label): ... mins MINS | 8 px.
    const CELL = 22, LABEL_Y = 25, AFTER_DIGITS = 11, AFTER_LABEL = 20, RIGHT = 367 - 8, DAY_CELLS = 5;
    const [wd, wh, wm] = labels.map((l) => l.width);
    const xMinsLabel = RIGHT - wm;
    const xMins = xMinsLabel - (AFTER_DIGITS - 1) - 2 * CELL;
    const xHrsLabel = xMins - AFTER_LABEL - wh;
    const xHrs = xHrsLabel - AFTER_DIGITS - 2 * CELL;
    const xDaysLabel = xHrs - AFTER_LABEL - wd;
    const xDaysEnd = xDaysLabel - AFTER_DIGITS;                  // the days field: DAY_CELLS cells ending here
    const draw = () => {
      const t = Math.max(0, Date.now() - zero);
      const days = String(Math.floor(t / 864e5)).slice(-DAY_CELLS);
      const hrs = String(Math.floor(t / 36e5) % 24).padStart(2, '0');
      const mins = String(Math.floor(t / 6e4) % 60).padStart(2, '0');
      g.drawImage(bg, 0, 0);
      const put = (s, x) => [...s].forEach((d, i) => g.drawImage(digits, CELL * +d, 0, CELL, 34, ox + x + CELL * i, oy, CELL, 34));
      put(days, xDaysEnd - CELL * days.length);
      g.drawImage(labels[0], ox + xDaysLabel, oy + LABEL_Y);
      put(hrs, xHrs);
      g.drawImage(labels[1], ox + xHrsLabel, oy + LABEL_Y);
      put(mins, xMins);
      g.drawImage(labels[2], ox + xMinsLabel, oy + LABEL_Y);
    };
    draw();
    setInterval(draw, 15000);
  }).catch(() => { /* pieces missing: leave the page as archived */ });
})();
