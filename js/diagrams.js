// Every diagram in Notch, drawn in code as SVG. Lessons point at them by name with options:
//   "dia": ["sew", { "mode": "corner", "pivot": "after" }]
// Colors come from CSS classes, so diagrams follow light and dark mode.
// Key: right side of fabric = colored with dots, wrong side = striped, red dashes = stitches.

let UNIT = 'in', AMOUNT = a => a;
export function setUnit(u, amountFn) { UNIT = u; if (amountFn) AMOUNT = amountFn; }
// A length in inches, shown in the chosen unit.
function len(v) {
  if (UNIT === 'cm') { if (Math.abs(v - 0.625) < 1e-6) return '1.5 cm'; const r = Math.round(v * 2.54 * 2) / 2; return (Number.isInteger(r) ? r : r.toFixed(1)) + ' cm'; }
  return fmtIn(v) + ' in';
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = n => Math.round(n * 10) / 10;
const svg = (w, h, inner, label = '') => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const P = (d, c = 'ink', extra = '') => `<path d="${d}" class="${c}" ${extra}/>`;
const L = (x1, y1, x2, y2, c = 'ink') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${c}"/>`;
const R = (x, y, w, h, c = 'ink', rx = 0) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" class="${c}"/>`;
const C = (x, y, r, c = 'ink') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${c}"/>`;
const T = (x, y, s, c = 'lab', anchor = 'start') => `<text x="${f(x)}" y="${f(y)}" class="${c}${anchor === 'middle' ? ' t-mid' : anchor === 'end' ? ' t-end' : ''}">${esc(s)}</text>`;
const pts = a => a.map(p => `${f(p[0])},${f(p[1])}`).join(' ');
const PL = (a, c = 'ink') => `<polyline points="${pts(a)}" class="${c}"/>`;
const PG = (a, c = 'ink') => `<polygon points="${pts(a)}" class="${c}"/>`;

// A label with a soft card behind it, so it reads on top of anything.
function lab(x, y, s, { anchor = 'start', hi = true, size = 13 } = {}) {
  const w = s.length * size * 0.56 + 10, h = size + 8;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w + 5 : x - 5;
  return `<rect x="${f(x0)}" y="${f(y - size - 1)}" width="${f(w)}" height="${h}" rx="7" class="${hi ? 'lab-bg' : 'lab-bg2'}"/>` + T(x, y, s, hi ? 'lab-hi' : 'lab', anchor);
}
function callout(px, py, lx, ly, s, anchor = 'start') {
  return L(px, py, lx, ly - 5, 'soft') + C(px, py, 3.2, 'hi-dot') + lab(lx, ly, s, { anchor });
}
function arrow(x1, y1, x2, y2, hi = false) { return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" class="${hi ? 'arrow-hi' : 'arrow'}"/>`; }
function curveArrow(d, hi = false) { return `<path d="${d}" class="${hi ? 'arrow-hi' : 'arrow'}"/>`; }
function dim(x1, y1, x2, y2, s, off = 14, anchor) {
  // dimension line offset to the side, with a label in the middle
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len * off, ny = dx / len * off;
  const a = [x1 + nx, y1 + ny], b = [x2 + nx, y2 + ny], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const vertical = Math.abs(dy) > Math.abs(dx);
  const tx = vertical ? m[0] + (off >= 0 ? -8 : 8) * (dy > 0 ? -1 : 1) : m[0];
  return L(x1, y1, a[0], a[1], 'soft') + L(x2, y2, b[0], b[1], 'soft') + `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" class="dim"/>` +
    lab(vertical ? (anchor === 'end' ? m[0] - 6 : m[0] + 6) : tx, m[1] + (vertical ? 4 : 5), s, { anchor: vertical ? (anchor || 'start') : 'middle', hi: false, size: 12 });
}
// Smooth path through points (Catmull-Rom to Bezier).
function smooth(p, closed = false) {
  if (p.length < 3) return 'M' + p.map(q => `${f(q[0])} ${f(q[1])}`).join('L');
  const n = p.length, get = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
const asArr = v => v == null ? [] : Array.isArray(v) ? v : [v];

// ======================================================================
// Sewing machine (front view). Options: hi (part or list), thread (1-6 threading steps), wind (bobbin winding path), wheel (turn arrow)
// ======================================================================
const MPARTS = {
  spool:    { n: 'Spool pin', p: [262, 50], l: [232, 26, 'end'] },
  winder:   { n: 'Bobbin winder', p: [330, 54], l: [412, 26, 'end'] },
  wguide:   { n: 'Bobbin winding guide', p: [210, 60], l: [196, 46, 'end'] },
  guide:    { n: 'Thread guide', p: [150, 76], l: [140, 40, 'end'] },
  tension:  { n: 'Tension dial', p: [142, 104], l: [160, 112, 'start'] },
  takeup:   { n: 'Take-up lever', p: [104, 92], l: [150, 152, 'start'] },
  channel:  { n: 'Thread channels', p: [118, 132], l: [150, 152, 'start'] },
  needle:   { n: 'Needle', p: [92, 212], l: [150, 192, 'start'] },
  foot:     { n: 'Presser foot', p: [112, 216], l: [150, 214, 'start'] },
  lever:    { n: 'Presser foot lever', p: [144, 174], l: [160, 172, 'start'] },
  plate:    { n: 'Needle plate', p: [100, 226], l: [24, 278, 'start'] },
  feed:     { n: 'Feed dogs', p: [92, 220], l: [130, 278, 'start'] },
  bobbin:   { n: 'Bobbin cover', p: [88, 239], l: [24, 278, 'start'] },
  wheel:    { n: 'Handwheel', p: [380, 100], l: [412, 84, 'end'] },
  selector: { n: 'Stitch selector', p: [305, 160], l: [272, 146, 'end'] },
  length:   { n: 'Stitch length', p: [348, 152], l: [272, 172, 'end'] },
  width:    { n: 'Stitch width', p: [348, 182], l: [272, 196, 'end'] },
  reverse:  { n: 'Reverse button', p: [305, 199], l: [272, 220, 'end'] },
  pedal:    { n: 'Foot pedal', p: [330, 274], l: [292, 280, 'end'] },
};
const THREAD_SEGS = [
  '', // 1: spool only
  'M250 50L150 76L118 84',
  'M118 84V172C118 188 86 188 86 172V98',
  'M86 98Q90 84 104 92',
  'M104 92L92 104V190',
  'M92 190V221',
];
function machine(o = {}) {
  const hi = new Set(asArr(o.hi));
  const H = id => hi.has(id) ? 'hi-f' : null;
  let s = '';
  // pedal + cord
  s += P('M382 240C404 262 372 272 356 268', 'soft');
  s += P('M300 284L360 284L356 266Q330 258 304 266Z', H('pedal') || 'metal');
  // bed
  s += R(30, 220, 360, 32, 'body', 10);
  s += R(64, 221, 68, 9, H('plate') || 'metal', 2) + L(110, 222, 110, 229, 'thin') + L(116, 222, 116, 229, 'thin') + L(122, 222, 122, 229, 'thin');
  s += R(64, 233, 50, 11, H('bobbin') || 'metal2', 3);
  s += R(372, 230, 10, 8, 'metal2', 2);
  // body
  s += P('M66 70H352Q370 70 370 88V220H280V140Q280 126 266 126H142Q128 126 128 140V182Q128 196 114 196H64Q50 196 50 182V86Q50 70 66 70Z', 'body');
  // spool pin + spool
  s += L(260, 70, 260, 42, hi.has('spool') ? 'hi' : 'ink');
  s += R(249, 47, 22, 20, 'thread-f') + R(246, 44, 28, 4, H('spool') || 'metal', 1) + R(246, 66, 28, 4, H('spool') || 'metal', 1);
  // bobbin winder
  s += R(322, 62, 16, 8, H('winder') || 'metal', 2) + R(324, 50, 12, 12, H('winder') || 'metal2', 2);
  if (o.wind) s += R(325, 52, 10, 8, 'thread-f');
  // winding guide
  s += L(210, 70, 210, 64) + C(210, 60, 5, H('wguide') || 'metal');
  // thread guide
  s += R(142, 72, 16, 8, H('guide') || 'metal', 3);
  // tension dial
  s += C(142, 104, 12, H('tension') || 'metal') + T(142, 109, '4', 'lab-s', 'middle');
  // channels + take-up lever
  s += R(78, 84, 16, 94, H('channel') || 'soft', 8) + R(111, 80, 14, 98, H('channel') || 'soft', 7);
  s += R(86, 88, 22, 8, H('takeup') || 'metal', 3) + C(104, 92, 2.4, 'card-f');
  // presser foot lever (behind the head)
  s += L(128, 180, 142, 174, hi.has('lever') ? 'hi' : 'ink') + C(144, 174, 3.5, H('lever') || 'metal');
  // needle bar, needle, foot
  s += R(87, 196, 10, 10, 'metal2', 2) + L(106, 196, 106, 214);
  s += P('M74 214H110Q117 214 117 218V220H72Q70 215 74 214Z', H('foot') || 'metal');
  s += L(92, 206, 92, 226, hi.has('needle') ? 'hi' : 'ink') + `<ellipse cx="92" cy="221" rx="1.2" ry="2.2" class="card-f"/>`;
  if (hi.has('feed')) s += P('M78 220l3-4l3 4l3-4l3 4l3-4l3 4l3-4l3 4', 'hi');
  // handwheel
  s += C(380, 122, 28, H('wheel') || 'metal') + C(380, 122, 17, 'metal2');
  for (let a = 0; a < 360; a += 30) { const r = a * Math.PI / 180; s += L(380 + Math.cos(r) * 22, 122 + Math.sin(r) * 22, 380 + Math.cos(r) * 27, 122 + Math.sin(r) * 27, 'thin'); }
  if (o.wheel) s += curveArrow('M402 98Q380 84 360 98', true) + lab(414, 176, 'Top turns toward you', { anchor: 'end', hi: false, size: 12 });
  // dials and buttons
  s += C(305, 160, 16, H('selector') || 'metal') + L(305, 160, 305, 147);
  s += C(348, 152, 10, H('length') || 'metal') + T(348, 156, 'L', 'lab-s', 'middle');
  s += C(348, 182, 10, H('width') || 'metal') + T(348, 186, 'W', 'lab-s', 'middle');
  s += R(292, 192, 26, 14, H('reverse') || 'metal', 4) + P('M310 199a5 5 0 1 1-3-4.5', 'thin') + P('M305 192l2 2.5l-3 1', 'thin');
  // threading path
  if (o.thread) {
    const n = Math.min(6, o.thread);
    for (let i = 1; i < n; i++) { const d = THREAD_SEGS[i]; if (i === n - 1) s += P(d, 'hi'); s += P(d, 'thread'); }
    if (n === 1) s += C(250, 50, 5, 'hi-dot');
    if (n >= 6) s += arrow(86, 221, 100, 221, true);
  }
  if (o.wind) s += P('M250 50L213 55C201 52 202 68 211 65L325 55', 'hi') + P('M250 50L213 55C201 52 202 68 211 65L325 55', 'thread');
  // labels
  let minX = o.thread || o.wind ? 60 : 420, maxX = o.thread ? 260 : o.wind ? 340 : 0;
  for (const id of hi) {
    const m = MPARTS[id]; if (!m) continue;
    s += callout(m.p[0], m.p[1], m.l[0], m.l[1], m.n, m.l[2]);
    const w = m.n.length * 7.3 + 10, lx0 = m.l[2] === 'end' ? m.l[0] - w : m.l[0] - 5;
    minX = Math.min(minX, m.p[0], lx0); maxX = Math.max(maxX, m.p[0], lx0 + w);
  }
  // Zoom in on the left (needle) side when everything this step is about is there.
  if (hi.size || o.thread) {
    if (maxX <= 312 && minX >= 14) return svg(300, 292, s, 'Sewing machine').replace('viewBox="0 0 300 292"', 'viewBox="14 0 300 292"');
  }
  return svg(420, 292, s, 'Sewing machine');
}

// Close-up: drop-in bobbin seen from above. step 1 drop in, 2 guide the thread, 3 tail out
function bobbin(o = {}) {
  const st = o.step || 1; let s = '';
  s += R(30, 20, 240, 170, 'metal', 14) + R(60, 40, 180, 130, 'metal2', 60);
  s += C(150, 105, 50, 'paper') + C(150, 105, 34, 'thread-f') + C(150, 105, 34, 'thin') + C(150, 105, 8, 'metal');
  // counterclockwise arrow (as the thread pulls off)
  s += curveArrow('M196 80A50 50 0 0 0 112 70', st === 1) + lab(150, 36, 'Thread unwinds counterclockwise', { anchor: 'middle', hi: st === 1, size: 12 });
  if (st >= 2) {
    s += P('M150 71L186 82L206 140L120 160', st === 2 ? 'hi' : 'thread') + P('M150 71L186 82L206 140L120 160', 'thread');
    s += P('M200 124L212 146L120 166', 'soft');
    s += lab(214, 178, 'Slot and cutter', { anchor: 'end', hi: st === 2, size: 12 });
  }
  if (st >= 3) s += P('M120 160L70 172', 'hi') + P('M120 160L70 172', 'thread') + lab(40, 152, 'Tail', { hi: true, size: 12 });
  return svg(300, 200, s, 'Drop-in bobbin');
}

// Side close-up of the needle area: bringing up the bobbin thread. step 1 hold, 2 loop, 3 tails to the back
function needleUp(o = {}) {
  const st = o.step || 1; let s = '';
  s += R(0, 120, 300, 14, 'metal') + R(110, 136, 80, 50, 'metal2', 8) + C(150, 160, 16, 'thread-f') + C(150, 160, 16, 'thin') + C(150, 160, 4, 'metal');
  s += R(141, 10, 18, 26, 'metal2', 3) + L(150, 36, 150, st === 2 ? 128 : 100) + R(170, 30, 8, 60, 'metal', 2) + P('M150 92H200Q206 92 206 98V102H146Z', 'metal');
  const eyeY = st === 2 ? 122 : 94;
  if (st === 1) s += P(`M150 ${eyeY}C120 ${eyeY} 90 80 50 70`, 'thread') + lab(20, 56, 'Hold the top thread', { hi: true, size: 12 });
  if (st === 2) {
    s += P(`M150 ${eyeY}C120 ${eyeY} 90 80 50 70`, 'thread');
    s += P('M150 150C150 132 148 120 146 112C140 96 162 96 156 112C154 118 152 126 152 140', 'hi') + P('M150 150C150 132 148 120 146 112C140 96 162 96 156 112C154 118 152 126 152 140', 'thread');
    s += curveArrow('M250 40Q270 60 250 80', true) + lab(206, 30, 'One full turn', { hi: true, size: 12 });
  }
  if (st === 3) {
    s += P('M150 94C170 104 200 110 270 110', 'thread') + P('M150 150C152 130 170 116 270 116', 'hi') + P('M150 150C152 130 170 116 270 116', 'thread');
    s += arrow(230, 74, 284, 74, true) + lab(226, 64, 'Both tails to the back', { anchor: 'end', hi: true, size: 12 });
  }
  s += T(10, 196, 'Front (you)', 'lab-s') + T(290, 196, 'Back', 'lab-s', 'end');
  return svg(300, 200, s, 'Bringing up the bobbin thread');
}

// Machine needle parts
function needleParts(o = {}) {
  let s = '';
  s += P('M30 70H120V90H30Z', 'metal') + P('M30 70H120V75H30Z', 'metal2');
  s += P('M120 74H300L330 80L300 86H120Z', 'metal');
  s += L(150, 78, 288, 78, 'thin');
  s += `<ellipse cx="292" cy="80" rx="7" ry="2.4" class="card-f" stroke="currentColor"/>` + P('M285 77.6a7 2.4 0 1 0 14 0', 'thin');
  s += callout(60, 72, 40, 40, 'Shank (flat side to the back)') + callout(200, 80, 170, 128, 'Groove') + callout(292, 80, 300, 40, 'Eye', 'middle') + callout(326, 80, 336, 128, 'Point', 'end');
  if (o.sizes) s += T(30, 158, '70/10 thin fabric · 80/12 most cotton', 'lab') + T(30, 178, '90/14 heavier fabric · 100/16 canvas or denim', 'lab');
  return svg(360, o.sizes ? 190 : 150, s, 'Machine needle parts');
}

// Hand needle: step 1 thread, 2 pull to a long tail, 3 knot
function handNeedle(o = {}) {
  const st = o.step || 1; let s = '';
  s += P('M40 90L250 84L262 86L250 88L40 94Q34 92 40 90Z', 'metal') + `<ellipse cx="54" cy="92" rx="8" ry="1.6" class="card-f"/>`;
  if (st === 1) s += P('M10 60C30 70 40 84 54 92', 'thread') + arrow(30, 52, 52, 80, true) + lab(70, 50, 'Thread through the eye', { hi: true, size: 12 });
  if (st >= 2) s += P('M54 92C70 110 80 120 90 120', 'thread') + P('M54 92C40 120 30 140 120 140H300', 'thread');
  if (st === 2) s += lab(310, 132, 'Long end', { anchor: 'end', hi: true, size: 12 }) + lab(96, 124, 'Short tail', { hi: false, size: 12 });
  if (st === 3) s += C(304, 140, 5, 'thread-f') + C(304, 140, 9, 'hi') + lab(296, 120, 'Small knot at the long end', { anchor: 'end', hi: true, size: 12 });
  return svg(330, 160, s, 'Threading a hand needle');
}

// Hand stitches. type running | back | slip; step 1-3
function hand(o = {}) {
  const type = o.type || 'running', st = o.step || 3; let s = '';
  if (type === 'slip') {
    s += R(20, 30, 320, 110, 'fab-w') + R(20, 100, 320, 40, 'fab-w') + L(20, 140, 340, 140, 'ink') + T(26, 132, 'Hem fold', 'lab-s');
    const xs = [310, 270, 230, 190, 150, 110];
    const n = st === 1 ? 1 : st === 2 ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const x = xs[i];
      s += L(x, 95, x - 6, 95, 'stitch-s');          // tiny catch in the main fabric
      if (i < n - 1) s += P(`M${x - 6} 97L${x - 10} 110L${x - 36} 110L${x - 40} 97`, 'stitch');  // travels inside the fold
    }
    const nx = xs[n - 1] - 8;
    s += P(`M${nx + 30} 94L${nx - 30} 106`, 'metal') + arrow(330, 160, 270, 160, true);
    s += lab(26, 22, 'Tiny catch, then slide inside the fold', { hi: false, size: 12 });
    return svg(360, 172, s, 'Slip stitch');
  }
  if (type === 'ladder') {
    s += R(20, 24, 320, 52, 'fab-r') + R(20, 96, 320, 52, 'fab-r') + L(20, 76, 340, 76) + L(20, 96, 340, 96);
    const n = st === 1 ? 2 : st === 2 ? 5 : 9, closed = st >= 3;
    if (closed) s = R(20, 24, 320, 124, 'fab-r') + L(20, 86, 340, 86, 'thin');
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = 40 + i * 30, top = i % 2 === 0;
      if (!closed) { d += `M${x} ${top ? 70 : 102}H${x + 30}`; s += L(x + 30, 70, x + 30, 102, 'stitch-s'); }
    }
    if (!closed) s += P(d, 'stitch') + lab(26, 18, 'Inside one fold, then straight across', { hi: false, size: 12 }); else s += lab(26, 18, 'Pull the thread: the gap closes', { hi: true, size: 12 }) + arrow(300, 120, 340, 120, true);
    return svg(360, 160, s, 'Ladder stitch');
  }
  s += R(20, 50, 320, 60, 'fab-r');
  const y = 80, n = st === 1 ? 1 : st === 2 ? 3 : 6;
  if (type === 'running') {
    for (let i = 0; i < n; i++) s += L(40 + i * 44, y, 64 + i * 44, y, 'stitch-s');
    const nx = 40 + n * 44;
    s += P(`M${nx - 2} ${y + 2}L${nx + 70} ${y - 2}`, 'metal');
    s += dim(40, y, 64, y, 'Even', -18) + arrow(60, 136, 140, 136, true);
    s += P('M40 150Q51 140 62 150T84 150T106 150T128 150T150 150', 'thread') + L(36, 150, 154, 150, 'soft') + T(160, 154, 'Side view', 'lab-s');
  } else {
    for (let i = 0; i < n; i++) s += L(40 + i * 30, y, 70 + i * 30, y, 'stitch-s');
    const end = 40 + n * 30;
    s += C(end + 30, y, 4, 'hi-dot') + lab(Math.min(end + 26, 200), y - 18, 'Come up a stitch ahead', { hi: true, size: 12 });
    s += curveArrow(`M${end + 30} ${y + 8}Q${end + 15} ${y + 28} ${end + 2} ${y + 8}`, true) + lab(Math.min(end, 230), y + 44, 'Go back down into the last stitch', { anchor: 'middle', hi: false, size: 12 });
  }
  return svg(360, 172, s, type === 'running' ? 'Running stitch' : 'Backstitch');
}

// Sewing a button. step 1-5
function button(o = {}) {
  const st = o.step || 1; let s = '';
  if (st <= 3) {
    s += R(30, 20, 260, 160, 'fab-r');
    if (st === 1) { s += P('M150 90l20 20M170 90l-20 20', 'hi') + lab(176, 84, 'Mark the spot', { hi: true, size: 12 }); return svg(320, 200, s, 'Button'); }
    s += C(160, 100, 34, 'metal') + C(160, 100, 27, 'thin');
    const holes = [[150, 90], [170, 90], [150, 110], [170, 110]];
    if (st === 3) s += L(100, 100, 220, 100, 'metal') + R(96, 97, 128, 6, 'metal2', 3) + lab(230, 118, 'Toothpick', { hi: true, size: 12, anchor: 'middle' });
    s += holes.map(h => C(h[0], h[1], 4, 'card-f')).join('');
    if (st === 2) s += P('M150 90L170 110', 'thread') + arrow(140, 150, 150, 98, true) + lab(40, 166, 'Come up from the back', { hi: true, size: 12 });
    if (st === 3) s += P('M150 90L150 110M170 90L170 110', 'thread') + P('M150 90L170 90M150 110L170 110', 'stitch-s') + lab(40, 166, '4 to 6 times through each pair', { hi: false, size: 12 });
    return svg(320, 200, s, 'Button');
  }
  s += R(20, 130, 280, 16, 'fab-r') + R(110, 60, 100, 14, 'metal', 6);
  s += L(150, 74, 150, 130, 'thread') + L(170, 74, 170, 130, 'thread');
  if (st === 4) { for (let y = 84; y < 128; y += 7) s += P(`M146 ${y}L174 ${y + 4}`, 'hi'); s += lab(186, 104, 'Wrap the shank', { hi: true, size: 12 }); }
  if (st === 5) { for (let y = 84; y < 128; y += 7) s += P(`M146 ${y}L174 ${y + 4}`, 'thread'); s += C(160, 152, 5, 'thread-f') + C(160, 152, 9, 'hi') + lab(176, 172, 'Knot on the back', { hi: true, size: 12 }); }
  return svg(320, 190, s, 'Button shank');
}

// ======================================================================
// Tools: small drawings, one per name, laid out in a row or grid. ["tools", { "list": ["shears", "snips"] }]
// ======================================================================
const TOOL = {
  shears: ['Fabric shears', () => P('M18 70Q20 52 36 54Q50 56 46 70Q42 84 26 82Q16 80 18 70Z') + P('M50 76Q58 90 74 88Q88 84 82 72Q76 62 60 66') + P('M46 64L104 22L108 26L56 70', 'metal') + P('M58 74L110 40L112 46L62 80', 'metal') + C(54, 70, 3, 'ink-f')],
  snips: ['Thread snips', () => P('M30 90Q22 70 40 50L80 18L84 22L48 60', 'metal') + P('M44 96Q60 80 64 60L92 26L94 30L72 70', 'metal') + P('M30 90Q38 100 44 96', 'ink')],
  pinking: ['Pinking shears', () => P('M18 74Q20 56 36 58Q50 60 46 74Q42 88 26 86Q16 84 18 74Z') + P('M50 80Q58 94 74 92Q88 88 82 76Q76 66 60 70') + P('M46 68L100 28l2 4l3-2l2 4l3-2l2 4L56 74', 'metal') + P('M58 78L108 46l1 4l3-1l1 4l3-1L62 84', 'metal')],
  rotary: ['Rotary cutter', () => P('M28 96L66 44Q72 38 78 44L82 48Q86 54 80 60L42 106Q34 112 28 104Z', 'body') + C(84, 38, 22, 'metal') + C(84, 38, 5, 'metal2')],
  mat: ['Cutting mat', () => R(14, 22, 92, 76, 'paper', 6) + [34, 54, 74].map(x => L(x, 26, x, 94, 'soft')).join('') + [42, 62, 82].map(y => L(18, y, 102, y, 'soft')).join('') + P('M18 94L102 26', 'soft')],
  pins: ['Pins', () => [30, 56, 82].map((x, i) => L(x - 14, 96, x + 8, 30 - i * 2, 'ink') + C(x + 9, 26 - i * 2, 6, i === 1 ? 'hi-f' : 'thread-f')).join('')],
  clips: ['Clips', () => P('M22 40H60V52H34V68H60V80H22Z', 'thread-f') + P('M22 40H60V52H34V68H60V80H22Z', 'ink') + P('M62 52H100V64H74V80H100V92H62Z', 'body')],
  tape: ['Tape measure', () => C(46, 58, 30, 'body') + C(46, 58, 10, 'metal') + P('M76 58H112V72H76', 'paper') + [82, 88, 94, 100, 106].map(x => L(x, 58, x, 63, 'thin')).join('')],
  ruler: ['Clear ruler', () => R(10, 40, 100, 34, 'paper', 3) + [20, 30, 40, 50, 60, 70, 80, 90, 100].map((x, i) => L(x, 40, x, i % 2 ? 46 : 52, 'thin')).join('') + L(10, 62, 110, 62, 'soft')],
  gauge: ['Seam gauge', () => R(12, 52, 96, 16, 'metal', 2) + [20, 28, 36, 44, 52, 60, 68, 76, 84, 92].map((x, i) => L(x, 52, x, i % 2 ? 56 : 59, 'thin')).join('') + R(56, 46, 10, 28, 'hi-f', 2)],
  chalk: ['Tailor\'s chalk', () => P('M26 86L60 26L94 86Z', 'body') + P('M34 80L60 36L86 80', 'soft')],
  pen: ['Marking pen', () => P('M20 92L84 28L94 38L30 102Z', 'body') + P('M20 92L14 108L30 102', 'thread-f') + L(74, 38, 84, 48)],
  ripper: ['Seam ripper', () => P('M20 100L60 60L66 66L26 106Z', 'body') + P('M62 64L92 34Q100 28 98 22L90 26L66 56', 'metal') + C(86, 40, 3.5, 'thread-f')],
  iron: ['Iron', () => P('M14 88H96Q100 60 74 48H46Q34 48 30 60Z', 'metal') + P('M44 48Q46 30 60 30H84Q92 30 90 40L86 48', 'ink') + [36, 50, 64, 78].map(x => C(x, 82, 2, 'soft-f')).join('')],
  ham: ['Pressing ham', () => `<ellipse cx="60" cy="62" rx="44" ry="30" class="fab-r"/>` + P('M18 62Q60 48 102 62', 'soft')],
  bodkin: ['Safety pin', () => P('M20 70H92Q104 70 104 60Q104 50 92 50H34', 'metal') + R(14, 62, 20, 16, 'metal2', 4) + C(100, 60, 6, 'ink')],
  thimble: ['Thimble', () => P('M36 96V54Q36 30 60 30Q84 30 84 54V96Z', 'metal') + [42, 52, 62, 72].map(y => L(40, y, 80, y, 'soft')).join('')],
  needles: ['Hand needles', () => [24, 46, 68].map((y, i) => P(`M14 ${y + 20}L${92 - i * 8} ${y}`, 'ink') + C(16 + 2, y + 19, 1.8, 'card-f')).join('')],
  mneedle: ['Machine needles', () => R(30, 18, 14, 30, 'metal2', 2) + L(37, 48, 37, 100) + R(70, 18, 14, 30, 'metal2', 2) + L(77, 48, 77, 100)],
  thread: ['Thread', () => R(36, 30, 48, 60, 'thread-f') + R(30, 24, 60, 8, 'metal', 2) + R(30, 88, 60, 8, 'metal', 2) + [40, 50, 60, 70, 80].map(y => L(36, y, 84, y + 3, 'soft')).join('')],
  bobbins: ['Bobbins', () => [36, 84].map(x => C(x, 60, 22, 'metal') + C(x, 60, 15, 'thread-f') + C(x, 60, 4, 'card-f')).join('')],
  fabric: ['Fabric', () => P('M16 30H96V90H16Z', 'fab-r') + P('M96 30Q108 50 96 60Q86 70 96 90', 'fab-w')],
  washer: ['Washer', () => R(22, 16, 76, 90, 'body', 8) + C(60, 66, 24, 'metal') + C(60, 66, 16, 'paper') + C(34, 28, 3, 'ink-f') + C(46, 28, 3, 'ink-f')],
  stuffing: ['Stuffing', () => P('M24 80Q14 60 34 54Q36 36 56 42Q70 28 84 44Q104 46 98 66Q106 84 86 86Q70 98 54 88Q30 96 24 80Z', 'paper')],
  machine: ['Sewing machine', () => P('M14 92H106V102H14Z', 'body') + P('M20 92V44Q20 34 30 34H96Q104 34 104 44V92H84V58H40V82H20', 'body') + L(30, 82, 30, 92) + C(104, 52, 8, 'metal')],
  board: ['Ironing board', () => P('M10 50Q14 36 30 36H104L110 50Z', 'fab-r') + L(40, 50, 80, 104) + L(80, 50, 40, 104)],
  cord: ['Cord or ribbon', () => P('M14 80C40 20 60 110 90 40Q100 20 108 30', 'thread')],
  buttons: ['Buttons', () => [[40, 50, 16], [78, 62, 12], [56, 86, 10]].map(([x, y, r]) => C(x, y, r, 'metal') + C(x - r / 3, y, 1.8, 'card-f') + C(x + r / 3, y, 1.8, 'card-f')).join('')],
};
function tools(o = {}) {
  const list = asArr(o.list).filter(k => TOOL[k]);
  const cols = Math.min(3, list.length || 1), rows = Math.ceil(list.length / cols);
  let s = '';
  list.forEach((k, i) => {
    const inRow = Math.min(cols, list.length - Math.floor(i / cols) * cols);
    const x = (360 - inRow * 120) / 2 + (i % cols) * 120, y = Math.floor(i / cols) * 140;
    s += `<g transform="translate(${x},${y})">${TOOL[k][1]()}${T(60, 130, TOOL[k][0], 'lab', 'middle')}</g>`;
  });
  return svg(360, rows * 140, s, list.map(k => TOOL[k][0]).join(', '));
}

// ======================================================================
// Top-down view at the needle. 1 inch = 64 units, needle at (150,120).
// mode straight | corner | curve; sewn (units of stitching behind the needle); guide; layers; back; pivot before|after
// ======================================================================
function sew(o = {}) {
  const mode = o.mode || 'straight', U = 64, nx = 150, ny = 120, sa = (o.sa ?? 0.625) * U, ex = nx + sa;
  let s = '';
  // needle plate with guide lines
  s += R(40, 60, 230, 140, 'metal', 10);
  [[0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [0.75, '¾'], [1, '1']].forEach(([v, t]) => {
    const x = nx + v * U, on = o.guide && v === 0.625;
    s += L(x, 150, x, 196, on ? 'hi' : 'thin');
    if (v === 0.625 || v === 1) s += T(x, 210, t, on ? 'lab-hi' : 'lab-s', 'middle');
  });
  // fabric
  const fab = (cls, dx = 0, dy = 0) => {
    if (mode === 'curve') {
      const c = [-10, 140], r = 200 + dx;
      return P(`M-20 -20H${f(c[0] + r * Math.cos(-1.1))}A${r} ${r} 0 0 1 ${f(c[0] + r)} ${c[1]}L${f(c[0] + r)} 260H-20Z`, cls);
    }
    if (mode === 'corner') return R(-20 + dx, -20 + dy, ex + 20, ny + sa + 20, cls);
    return R(-20 + dx, -20 + dy, ex + 20, 300, cls);
  };
  let g = '';
  if ((o.layers || 1) > 1) g += fab('fab-w', 0, 0);
  g += fab(o.side === 'wrong' ? 'fab-w' : 'fab-r');
  // stitching behind the needle
  const sewn = o.sewn ?? 70;
  if (mode === 'curve') {
    const c = [-10, 140], r = 160, a1 = Math.asin(20 / r), a2 = a1 + sewn / r;
    if (sewn > 0) g += P(`M${f(c[0] + r * Math.cos(a1))} ${f(c[1] - r * Math.sin(a1))}A${r} ${r} 0 0 0 ${f(c[0] + r * Math.cos(a2))} ${f(c[1] - r * Math.sin(a2))}`, 'stitch');
  } else if (sewn > 0) g += L(nx, ny, nx, ny - sewn, 'stitch');
  if (o.back) g += P(`M${nx + 5} ${ny - sewn + 4}V${ny - sewn + 30}`, 'stitch') + P(`M${nx - 5} ${ny - sewn + 4}V${ny - sewn + 30}`, 'stitch');
  if (mode === 'corner' && o.pivot === 'after') s += `<g transform="rotate(-90 ${nx} ${ny})">${g}</g>`; else s += g;
  // presser foot
  s += `<g opacity=".93">${P('M124 76H176V150Q176 162 166 162H160V112H140V162H134Q124 162 124 150Z', 'metal')}${R(136, 40, 28, 40, 'metal2', 4)}</g>`;
  s += C(nx, ny, 3.5, 'ink-f');
  // helpers
  if (o.guide) s += dim(nx, 172, ex, 172, len(o.sa ?? 0.625), 0);
  if (o.feed !== false) s += arrow(22, 230, 22, 170) + T(30, 236, 'Fabric moves away', 'lab-s');
  if (o.back) s += curveArrow(`M${nx - 22} ${ny - sewn + 6}Q${nx - 34} ${ny - sewn + 20} ${nx - 22} ${ny - sewn + 34}`, true) + lab(150, 22, 'Back 3–4 stitches, then forward', { anchor: 'middle', hi: true, size: 12 });
  if (mode === 'corner' && o.pivot === 'before') s += lab(150, 22, o.sa === 0 ? 'Stop on the corner' : `Stop ${len(0.625)} from the edge`, { anchor: 'middle', hi: true, size: 12 }) + L(ex + 6, ny, ex + 6, ny + sa, 'dim');
  if (mode === 'corner' && o.pivot) s += curveArrow(`M${nx - 40} ${ny + 30}A50 50 0 0 1 ${nx - 40} ${ny - 30}`, true) + (o.pivot === 'after' ? lab(60, 52, 'Turned, ready to sew on', { hi: false, size: 12 }) : '');
  if (o.note) s += lab(150, 24, o.note, { anchor: 'middle', hi: false, size: 12 });
  return svg(300, 244, s, 'Top view at the needle');
}

// Stitch length and tension (cross-sections of a machine stitch)
function stitchLook(o = {}) {
  const k = o.kind || 'good'; let s = '';
  if (k === 'length') {
    [[1.5, 'Short (1.5 mm): hard to unpick', 30], [2.5, 'Just right (2.5 mm)', 90], [4, 'Long (4 mm): for basting', 150]].forEach(([mm, t, y]) => {
      s += R(20, y - 12, 300, 24, 'fab-r', 4);
      const step = mm * 9; for (let x = 30; x + step * 0.7 < 310; x += step) s += L(x, y, x + step * 0.72, y, 'stitch-s');
      s += lab(24, y + 30, t, { hi: mm === 2.5, size: 12 });
    });
    return svg(340, 196, s, 'Stitch length');
  }
  s += R(20, 64, 300, 32, 'fab-r', 0) + L(20, 80, 320, 80, 'soft');
  const top = [], bot = [];
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 48;
    if (k === 'good') { s += P(`M${x} 62H${x + 40}`, 'stitch-s') + P(`M${x} 98H${x + 40}`, 'thread') + L(x, 62, x, 80, 'stitch-s') + L(x, 80, x, 98, 'thread') + C(x, 80, 3, 'hi-dot'); }
    if (k === 'top') { s += P(`M${x} 62H${x + 40}`, 'stitch-s') + L(x, 62, x, 106, 'stitch-s') + P(`M${x} 106q20 22 40 0`, 'stitch-s') + L(x, 98, x + 40, 98, 'thread'); }
    if (k === 'bottom') { s += P(`M${x} 62H${x + 40}`, 'stitch-s') + L(x, 98, x, 56, 'thread') + C(x, 56, 3, 'thread-f') + L(x, 98, x + 40, 98, 'thread'); }
  }
  const msg = { good: 'Good: threads lock inside the fabric', top: 'Loops underneath: top thread too loose', bottom: 'Bobbin dots on top: top thread too tight' }[k];
  s += lab(20, 30, msg, { hi: k === 'good', size: 12 }) + T(326, 66, 'Top', 'lab-s', 'end') + T(326, 120, 'Bottom', 'lab-s', 'end');
  return svg(340, 130, s, 'Stitch tension');
}

// Cross-sections of a seam. kind stitched | open | side | set
function xsec(o = {}) {
  const k = o.kind || 'stitched'; let s = '';
  const layer = (x1, y, x2, faceDown) => R(Math.min(x1, x2), y, Math.abs(x2 - x1), 4, faceDown ? 'fab-r' : 'fab-w') + R(Math.min(x1, x2), y + 4, Math.abs(x2 - x1), 4, faceDown ? 'fab-w' : 'fab-r');
  if (k === 'stitched' || k === 'set') {
    // top layer: right side facing down; bottom layer: right side facing up
    s += R(20, 70, 230, 4, 'fab-w') + R(20, 74, 230, 4, 'fab-r') + R(20, 78, 230, 4, 'fab-r') + R(20, 82, 230, 4, 'fab-w');
    s += L(206, 62, 206, 94, 'stitch-s') + dim(206, 98, 250, 98, len(0.625), 10);
    if (k === 'stitched') s += lab(24, 56, 'Right sides together', { hi: false, size: 12 });
    if (k === 'set') s += `<g transform="translate(40,-26)">${TOOL.iron[1]()}</g>` + lab(24, 130, 'Press flat as sewn to set the stitches', { hi: true, size: 12 });
    return svg(300, k === 'set' ? 144 : 124, s, 'Seam cross-section');
  }
  // garment opened out, wrong side up
  s += R(10, 90, 140, 4, 'fab-w') + R(10, 94, 140, 4, 'fab-r') + R(150, 90, 140, 4, 'fab-w') + R(150, 94, 140, 4, 'fab-r');
  if (k === 'open') {
    s += R(106, 82, 44, 4, 'fab-r') + R(106, 78, 44, 4, 'fab-w') + R(150, 82, 44, 4, 'fab-r') + R(150, 78, 44, 4, 'fab-w');
    s += L(150, 78, 150, 98, 'stitch-s') + lab(150, 56, 'Pressed open', { anchor: 'middle', hi: true, size: 12 });
    s += curveArrow('M140 70Q120 50 104 70', false) + curveArrow('M160 70Q180 50 196 70', false);
  } else {
    s += R(150, 82, 44, 4, 'fab-r') + R(150, 78, 44, 4, 'fab-w') + R(150, 74, 44, 4, 'fab-w') + R(150, 70, 44, 4, 'fab-r');
    s += L(150, 70, 150, 98, 'stitch-s') + lab(150, 52, 'Pressed to one side', { anchor: 'middle', hi: true, size: 12 });
  }
  s += T(10, 122, 'Wrong side up (inside of the item)', 'lab-s');
  return svg(300, 132, s, 'Pressed seam');
}

// Edge finishes. kind zigzag | pinked | serged
function finish(o = {}) {
  const k = o.kind || 'zigzag'; let s = '';
  if (k === 'pinked') {
    let d = 'M20 20H240'; for (let y = 20; y < 160; y += 10) d += `L250 ${y + 5}L240 ${y + 10}`; d += 'H20Z';
    s += P(d, 'fab-r');
  } else s += R(20, 20, 230, 140, 'fab-r');
  s += L(190, 20, 190, 160, 'stitch') + T(186, 176, 'Seam', 'lab-s', 'end');
  if (k === 'zigzag') { let d = 'M238 24'; for (let y = 24; y < 156; y += 8) d += `L248 ${y + 4}L238 ${y + 8}`; s += P(d, 'zig'); s += lab(256, 70, 'Zigzag over', { hi: true, size: 12 }) + lab(256, 90, 'the raw edge', { hi: true, size: 12 }); }
  if (k === 'pinked') s += lab(258, 80, 'Pinked edge', { hi: true, size: 12 });
  if (k === 'serged') { for (let y = 24; y < 156; y += 5) s += P(`M236 ${y}L250 ${y + 2}`, 'zig'); s += lab(258, 80, 'Serged edge', { hi: true, size: 12 }); }
  return svg(372, 184, s, 'Edge finish');
}

// Clipping and trimming. kind corner | outer | inner
function clip(o = {}) {
  const k = o.kind || 'corner'; let s = '';
  if (k === 'corner') {
    s += P('M20 20H200V180H20Z', 'fab-w') + P('M20 60H160V180', 'stitch') + PG([[170, 20], [200, 20], [200, 50]], 'hi-f') + L(164, 14, 206, 56, 'soft');
    s += lab(206, 90, 'Trim the corner', { hi: true, size: 12 }) + lab(206, 110, 'close to the stitches', { hi: false, size: 12 });
    return svg(370, 200, s, 'Trimming a corner');
  }
  const outer = k === 'outer';
  s += P(outer ? 'M20 180V100A110 110 0 0 1 130 -10H300V180Z' : 'M20 -10V40A140 140 0 0 0 160 180H300V-10Z', 'fab-w');
  s += P(outer ? 'M50 180V100A80 80 0 0 1 130 20H300' : 'M50 -10V40A110 110 0 0 0 160 150H300', 'stitch');
  for (let a = 0.25; a < 1.4; a += 0.28) {
    if (outer) { const cx = 130, cy = 100, r1 = 110, r2 = 86; const x1 = cx - Math.cos(a) * r1, y1 = cy - Math.sin(a) * r1; s += P(`M${f(x1 - 7 * Math.sin(a))} ${f(y1 + 7 * Math.cos(a))}L${f(cx - Math.cos(a) * r2)} ${f(cy - Math.sin(a) * r2)}L${f(x1 + 7 * Math.sin(a))} ${f(y1 - 7 * Math.cos(a))}`, 'hi'); }
    else { const cx = 160, cy = 40, r1 = 140, r2 = 116; s += L(cx - Math.cos(a) * r1, cy + Math.sin(a) * r1, cx - Math.cos(a) * r2, cy + Math.sin(a) * r2, 'hi'); }
  }
  s += lab(170, 120, outer ? 'Outward curve: cut little V notches' : 'Inward curve: cut straight clips', { anchor: 'middle', hi: true, size: 12 });
  s += lab(170, 140, 'Stop just before the stitches', { anchor: 'middle', hi: false, size: 12 });
  return svg(320, 180, s, 'Clipping a curve');
}

// Grain on a length of fabric. show all | selvedge | length | cross | bias
function grain(o = {}) {
  const sh = o.show || 'all'; let s = '';
  s += R(30, 40, 290, 150, 'fab-r');
  // selvedges
  s += R(30, 40, 290, 10, sh === 'selvedge' ? 'hi-f' : 'fab-w') + R(30, 180, 290, 10, sh === 'selvedge' ? 'hi-f' : 'fab-w');
  for (let x = 40; x < 320; x += 14) s += C(x, 45, 1.3, 'soft-f') + C(x, 185, 1.3, 'soft-f');
  s += P('M30 40l-4 8l5 6l-4 8l4 8l-5 8l5 8l-4 8l4 8l-5 8l5 8l-4 8l4 8l-5 8l5 8l-4 8l4 8l-5 8l5 6', 'soft');
  const want = k => sh === 'all' || sh === k;
  if (want('selvedge')) s += lab(36, 30, 'Selvedge (finished edge)', { hi: sh === 'selvedge', size: 12 });
  if (want('length')) s += arrow(70, 90, 280, 90, sh === 'length') + lab(175, 84, 'Lengthwise grain', { anchor: 'middle', hi: sh === 'length', size: 12 });
  if (want('cross')) s += arrow(290, 172, 290, 58, sh === 'cross') + lab(284, 126, 'Crosswise', { anchor: 'end', hi: sh === 'cross', size: 12 });
  if (want('bias')) s += arrow(80, 172, 190, 62, sh === 'bias') + lab(130, 160, 'Bias (45°)', { hi: sh === 'bias', size: 12 });
  if (sh === 'all' || sh === 'selvedge') s += T(30, 206, 'Cut edge', 'lab-s');
  return svg(340, 214, s, 'Fabric grain');
}

// Woven vs knit up close. type woven | knit | both
function weave(o = {}) {
  const t = o.type || 'both'; let s = '';
  const woven = x0 => {
    let g = R(x0, 20, 140, 140, 'paper', 10);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const x = x0 + 14 + i * 18, y = 34 + j * 18, over = (i + j) % 2 === 0;
      g += over ? R(x - 6, y - 2, 18, 6, 'thread-f', 2) : R(x + 4, y - 6, 6, 18, 'fab-r', 2);
    }
    return g + T(x0 + 70, 180, 'Woven: threads cross', 'lab', 'middle');
  };
  const knit = x0 => {
    let g = R(x0, 20, 140, 140, 'paper', 10);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const x = x0 + 20 + i * 20, y = 36 + j * 20; g += P(`M${x - 8} ${y - 6}Q${x - 10} ${y + 10} ${x} ${y + 10}Q${x + 10} ${y + 10} ${x + 8} ${y - 6}`, 'thread'); }
    return g + T(x0 + 70, 180, 'Knit: loops (stretchy)', 'lab', 'middle');
  };
  if (t === 'woven') s = woven(10); else if (t === 'knit') s = knit(10); else s = woven(10) + knit(170);
  return svg(t === 'both' ? 320 : 160, 190, s, 'Woven and knit');
}

// Folding a hem or casing (cross-section, wrong side up). a = first fold, b = second fold (inches), step 1-4
function fold(o = {}) {
  const st = o.step || 4, a = o.a || 0.5, b = o.b || 1, R0 = 300;
  const U = Math.min(100, 250 / (a + 2 * b)); let s = '';
  const fab = d => P(d, 'xs-out') + P(d, 'xs-in');
  if (st === 1) { s += fab(`M20 130H${R0}`) + lab(R0, 116, 'Raw edge', { anchor: 'end', hi: true, size: 12 }); }
  if (st === 2) {
    const f1 = R0 - a * U;
    s += fab(`M20 130H${f1}A5 5 0 0 0 ${f1} 120H${f1 - a * U}`) + dim(f1 - a * U, 112, f1, 112, len(a), 12);
    s += lab(f1 - a * U - 6, 150, 'Fold to the wrong side and press', { anchor: 'middle', hi: true, size: 12 });
  }
  if (st >= 3) {
    const x0 = R0 - (a + b) * U, inner = x0 - b * U;
    s += fab(`M20 130H${x0}A10 10 0 0 0 ${x0} 110H${inner}A5 5 0 0 0 ${inner} 120H${inner + a * U}`);
    s += dim(inner, 98, x0, 98, len(b), 12);
    if (st >= 4) s += L(inner + 12, 100, inner + 12, 142, 'stitch-s') + lab(inner + 20, 160, 'Stitch close to the inner fold', { hi: true, size: 12 });
    else s += lab(inner, 160, 'Fold again and press', { hi: true, size: 12 });
    s += T(x0 + 16, 124, 'Top edge', 'lab-s');
  }
  s += T(20, 178, 'Cross-section, wrong side up', 'lab-s');
  return svg(330, 186, s, 'Folding a hem');
}
function fmt(v) { const map = { 0.25: '¼', 0.375: '⅜', 0.5: '½', 0.625: '⅝', 0.75: '¾', 1.25: '1¼', 1.5: '1½', 1.75: '1¾' }; return map[v] || String(v); }

// Press vs iron
function press(o = {}) {
  const ironing = o.mode === 'iron'; let s = '';
  s += R(10, 110, 300, 10, 'fab-r', 2);
  s += `<g transform="translate(${ironing ? 150 : 100},20)">${TOOL.iron[1]()}</g>`;
  if (ironing) s += arrow(120, 98, 60, 98) + arrow(260, 98, 300, 98) + lab(160, 146, 'Ironing: slide back and forth (can stretch seams)', { anchor: 'middle', hi: false, size: 12 });
  else s += arrow(160, 20, 160, 36, true) + arrow(240, 60, 240, 30, true) + lab(160, 146, 'Pressing: lift, set down, hold, lift', { anchor: 'middle', hi: true, size: 12 });
  return svg(320, 156, s, ironing ? 'Ironing' : 'Pressing');
}

// Squaring up fabric. step 1 fold selvedges together, 2 straighten the end, 3 measure from it
function square(o = {}) {
  const st = o.step || 1; let s = '';
  s += R(40, 30, 240, 140, 'fab-r') + R(40, 30, 240, 8, 'fab-w') + L(40, 170, 280, 170, 'fold');
  s += T(44, 26, 'Selvedges together', 'lab-s') + T(44, 188, 'Fold', 'lab-s');
  if (st === 1) s += P('M60 30l-6 20l6 20l-6 20l6 20l-6 20l6 20l-6 20', 'soft') + lab(70, 110, 'Wobbly cut end', { hi: true, size: 12 });
  if (st >= 2) { s += R(70, 30, 30, 160, 'paper', 3) + L(70, 30, 70, 190, 'hi') + L(70, 170, 100, 170, 'ink'); if (st === 2) s += lab(108, 110, 'Ruler square to the fold', { hi: true, size: 12 }); }
  if (st === 3) s += dim(70, 100, 240, 100, 'Measure from the straight edge', -12) + L(240, 30, 240, 170, 'stitch');
  return svg(320, 196, s, 'Squaring fabric');
}

// ======================================================================
// Garment words: a shirt, labeled. hi = list of parts
// ======================================================================
const SHIRT = {
  collar:   ['Collar', [168, 64], [118, 22, 'end']],
  stand:    ['Collar stand', [180, 42], [196, 18, 'start']],
  shoulder: ['Shoulder seam', [140, 58], [96, 52, 'end']],
  armhole:  ['Armhole seam', [122, 100], [90, 108, 'end']],
  sleeve:   ['Sleeve', [100, 150], [70, 170, 'end']],
  cuff:     ['Cuff', [80, 228], [60, 256, 'end']],
  placket:  ['Placket', [180, 150], [214, 132, 'start']],
  pocket:   ['Pocket', [148, 112], [214, 104, 'start']],
  side:     ['Side seam', [124, 200], [90, 210, 'end']],
  hem:      ['Hem', [160, 274], [214, 290, 'start']],
};
function shirt(o = {}) {
  const hi = asArr(o.hi === 'all' ? Object.keys(SHIRT) : o.hi); let s = '';
  s += P('M180 46L162 50L118 66L70 214L96 226L124 132L120 262Q150 280 180 284Q210 280 240 262L236 132L264 226L290 214L242 66L198 50Z', 'body');
  s += P('M118 66Q128 100 124 132', 'thin') + P('M242 66Q232 100 236 132', 'thin');
  s += P('M70 214L64 232L90 244L96 226Z', 'body') + P('M290 214L296 232L270 244L264 226Z', 'body');
  s += R(172, 56, 16, 226, 'thin') + [86, 122, 158, 194, 230].map(y => C(180, y, 3, 'ink')).join('');
  s += P('M136 98H160V124L148 130L136 124Z', 'thin');
  s += P('M158 42Q180 30 202 42L200 50Q180 40 160 50Z', 'body') + P('M180 54L158 44L150 52L170 78Z', 'body') + P('M180 54L202 44L210 52L190 78Z', 'body');
  hi.forEach(k => { const m = SHIRT[k]; if (m) s += callout(m[1][0], m[1][1], m[2][0], m[2][1], m[0], m[2][2]); });
  return svg(360, 300, s, 'Parts of a shirt');
}

// ======================================================================
// Generic flat piece in inches for project steps.
// { w, h, side, under, stitch:[[x,y]...] or [[...],[...]], zig:['l','r','t','b'], marks:[[x,y,label]], dims:[[x1,y1,x2,y2,label,off]],
//   folds:[[x1,y1,x2,y2]], arrows:[[x1,y1,x2,y2]], labels:[[x,y,text]], pins:[[x,y,deg]], straps:[[x,y,w,len]], cord:[[x,y]...],
//   gap:[[x1,y1,x2,y2]], trim:['bl','br'], pieces:[{x,y,w,h,side}], note }
// ======================================================================
function panel(o = {}) {
  const W = o.w || 10, H = o.h || 10;
  const extra = (o.pieces || []).reduce((m, p) => ({ x0: Math.min(m.x0, p.x), y0: Math.min(m.y0, p.y), x1: Math.max(m.x1, p.x + p.w), y1: Math.max(m.y1, p.y + p.h) }), { x0: 0, y0: 0, x1: W, y1: H });
  (o.straps || []).forEach(st => { extra.y0 = Math.min(extra.y0, st[1] - (st[4] === 'up' ? st[3] : 0)); extra.y1 = Math.max(extra.y1, st[1] + (st[4] === 'up' ? 0 : st[3])); });
  const spanW = extra.x1 - extra.x0, spanH = extra.y1 - extra.y0;
  const k = Math.min(240 / spanW, 230 / spanH);
  const ox = 48 - extra.x0 * k, oy = 34 - extra.y0 * k;
  const X = x => ox + x * k, Y = y => oy + y * k;
  const vw = spanW * k + 96 + (o.wide ? 60 : 0), vh = spanH * k + 72;
  const cls = sd => sd === 'wrong' ? 'fab-w' : sd === 'lining' ? 'fab-l' : sd === 'right2' ? 'fab-r2' : 'fab-r';
  let s = '';
  (o.pieces || []).filter(p => p.back).forEach(p => { s += R(X(p.x), Y(p.y), p.w * k, p.h * k, cls(p.side)); });
  if (o.under) s += R(X(0) + 5, Y(0) + 5, W * k, H * k, cls(o.under === true ? 'wrong' : o.under));
  if (o.shape) s += PG(o.shape.map(p => [X(p[0]), Y(p[1])]), cls(o.side));
  else s += R(X(0), Y(0), W * k, H * k, cls(o.side));
  (o.pieces || []).filter(p => !p.back).forEach(p => { s += R(X(p.x), Y(p.y), p.w * k, p.h * k, cls(p.side)); if (p.label) s += T(X(p.x + p.w / 2), Y(p.y + p.h / 2) + 4, p.label, 'lab-s', 'middle'); });
  (o.trim || []).forEach(c => {
    const t = Math.min(W, H) * 0.09, cx = c[1] === 'l' ? 0 : W, cy = c[0] === 't' ? 0 : H, sx = c[1] === 'l' ? 1 : -1, sy = c[0] === 't' ? 1 : -1;
    s += PG([[X(cx), Y(cy)], [X(cx + sx * t), Y(cy)], [X(cx), Y(cy + sy * t)]], 'hi-f');
  });
  (o.straps || []).forEach(([x, y, w, len, dir]) => { s += R(X(x), dir === 'up' ? Y(y - len) : Y(y), w * k, len * k, 'fab-r2'); s += L(X(x) + 2, dir === 'up' ? Y(y - len) : Y(y), X(x) + 2, dir === 'up' ? Y(y) : Y(y + len), 'stitch'); s += L(X(x + w) - 2, dir === 'up' ? Y(y - len) : Y(y), X(x + w) - 2, dir === 'up' ? Y(y) : Y(y + len), 'stitch'); });
  const zig = (x1, y1, x2, y2) => {
    const n = Math.max(4, Math.round(Math.hypot(x2 - x1, y2 - y1) * k / 7)); let d = `M${f(X(x1))} ${f(Y(y1))}`;
    const vx = (x2 - x1) / n, vy = (y2 - y1) / n, len = Math.hypot(vx, vy) * k || 1, nx = -vy * k / len * 4, ny = vx * k / len * 4;
    for (let i = 1; i <= n; i++) d += `L${f(X(x1 + vx * i) + (i % 2 ? nx : 0))} ${f(Y(y1 + vy * i) + (i % 2 ? ny : 0))}`;
    return P(d, 'zig');
  };
  (o.zig || []).forEach(e => { const m = 0.12; if (e === 'l') s += zig(m, 0, m, H); if (e === 'r') s += zig(W - m, 0, W - m, H); if (e === 't') s += zig(0, m, W, m); if (e === 'b') s += zig(0, H - m, W, H - m); });
  (o.folds || []).forEach(([a, b, c, d]) => { s += L(X(a), Y(b), X(c), Y(d), 'fold'); });
  const lines = o.stitch ? (Array.isArray(o.stitch[0][0]) ? o.stitch : [o.stitch]) : [];
  lines.forEach((ln, i) => { const pl = ln.map(p => [X(p[0]), Y(p[1])]); if (o.stitchHi === i || o.stitchHi === 'all') s += PL(pl, 'hi'); s += PL(pl, 'stitch'); });
  (o.gap || []).forEach(([a, b, c, d]) => { s += L(X(a), Y(b), X(c), Y(d), 'hi'); });
  if (o.cord) s += P(smooth(o.cord.map(p => [X(p[0]), Y(p[1])])), 'thread');
  (o.pins || []).forEach(([x, y, deg = 0]) => { s += `<g transform="translate(${f(X(x))},${f(Y(y))}) rotate(${deg})">${L(-14, 0, 12, 0, 'ink')}${C(-16, 0, 4, 'thread-f')}</g>`; });
  (o.marks || []).forEach(([x, y, t]) => { s += L(X(x) - 6, Y(y), X(x) + 6, Y(y), 'hi') + C(X(x), Y(y), 3, 'hi-dot'); if (t) s += lab(X(x) + (x > W / 2 ? 10 : -10), Y(y) - 6, t, { anchor: x > W / 2 ? 'start' : 'end', hi: true, size: 12 }); });
  (o.arrows || []).forEach(([a, b, c, d]) => { s += arrow(X(a), Y(b), X(c), Y(d), true); });
  (o.dims || []).forEach(([a, b, c, d, t, off = 14]) => { s += dim(X(a), Y(b), X(c), Y(d), t, off); });
  (o.labels || []).forEach(([x, y, t, anchor = 'middle']) => { s += lab(X(x), Y(y), t, { anchor, hi: false, size: 12 }); });
  if (o.note) s += lab(vw / 2, vh - 10, o.note, { anchor: 'middle', hi: true, size: 12 });
  return svg(f(vw), f(vh), s, o.label || 'Project step');
}

// Cutting layout on a length of fabric. { fw: fabric width in inches, len, pieces:[{name,w,h,x,y}], fold }
function layout(o = {}) {
  const FW = o.fw || 44, LEN = o.len || 18; const k = Math.min(280 / FW, 260 / LEN);
  const X = x => 30 + x * k, Y = y => 30 + y * k;
  let s = R(X(0), Y(0), FW * k, LEN * k, 'fab-w');
  s += R(X(0), Y(0), 6, LEN * k, 'soft') + R(X(FW) - 6, Y(0), 6, LEN * k, 'soft');
  (o.pieces || []).forEach(p => {
    s += R(X(p.x), Y(p.y), p.w * k, p.h * k, p.side === 'right2' ? 'fab-r2' : 'fab-r');
    const cx = X(p.x + p.w / 2), cy = Y(p.y + p.h / 2);
    if (p.w * k < 60) { s += `<text x="${f(cx + 4)}" y="${f(cy)}" class="lab t-mid" transform="rotate(-90 ${f(cx + 4)} ${f(cy)})">${esc(p.name)}</text>`; return; }
    s += T(cx, cy - 2, p.name, 'lab', 'middle') + T(cx, cy + 13, UNIT === 'cm' ? `${len(p.w).replace(' cm', '')} × ${len(p.h)}` : `${fmtIn(p.w)} × ${fmtIn(p.h)} in`, 'lab-s', 'middle');
    if (p.h * k > 70) s += arrow(cx, Y(p.y + p.h) - 6, cx, Y(p.y + p.h) - 26);
  });
  s += T(X(FW / 2), Y(LEN) + 18, UNIT === 'cm' ? `${Math.round(FW * 2.54)} cm wide fabric · ${len(LEN)}` : `${FW} in wide fabric · ${fmtIn(LEN)} in (${yards(LEN)})`, 'lab-s', 'middle');
  s += T(X(0), Y(0) - 8, 'Selvedge', 'lab-s') + T(X(FW), Y(0) - 8, 'Selvedge', 'lab-s', 'end');
  return svg(f(FW * k + 60), f(LEN * k + 60), s, 'Cutting layout');
}
function fmtIn(v) { const w = Math.floor(v), r = Math.round((v - w) * 8); const fr = { 0: '', 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' }[r]; return (w || !fr ? w : '') + fr; }
function yards(inches) { const y = inches / 36; const eighths = Math.ceil(y * 8 - 1e-6); const w = Math.floor(eighths / 8), r = eighths % 8; const fr = { 0: '', 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' }[r]; return `${w ? w : ''}${fr || (w ? '' : '0')} yd`; }

// ======================================================================
// Body figure for measuring. ["body", { "m": "waist" }]
// ======================================================================
const BODY_L = [[92, 58], [91, 72], [64, 80], [57, 92], [54, 130], [50, 175], [47, 210], [45, 240], [43, 262], [47, 276], [54, 272], [55, 250], [57, 238], [59, 205], [62, 175], [65, 140], [69, 112],
  [70, 128], [73, 150], [77, 170], [73, 195], [67, 222], [68, 242], [70, 266], [73, 300], [75, 330], [78, 370], [81, 410], [82, 426], [77, 440], [96, 442], [95, 426], [95, 410], [96, 370], [97, 330], [98, 300], [99, 266], [100, 250]];
function bodyOutline() {
  const left = BODY_L, right = left.slice(0, -1).reverse().map(p => [200 - p[0], p[1]]);
  return smooth([...left, ...right], true);
}
const MEAS = {
  // circumferences: [y, x-left, x-right, view]
  neck: { c: [70, 91, 109] }, highBust: { c: [108, 68, 132] }, bust: { c: [127, 68, 132] }, underbust: { c: [143, 71, 129] },
  waist: { c: [170, 77, 123] }, highHip: { c: [195, 73, 127] }, hip: { c: [224, 67, 133] }, thigh: { c: [266, 70, 99] },
  upperArm: { c: [122, 53, 66] }, wrist: { c: [240, 44, 57] },
  // lengths: points, view
  height: { line: [[176, 10], [176, 442]], ref: true },
  shoulder: { line: [[92, 72], [64, 80]] }, acrossFront: { line: [[71, 98], [129, 98]] }, acrossBack: { line: [[69, 100], [131, 100]], back: true },
  backWaist: { line: [[100, 66], [100, 170]], back: true }, frontWaist: { line: [[92, 72], [85, 127], [86, 170]] },
  apex: { line: [[85, 127], [115, 127]] }, apexHeight: { line: [[92, 72], [85, 127]] },
  armLength: { line: [[64, 80], [53, 175], [47, 240]] },
  waistToHip: { line: [[148, 170], [148, 224]], ref: true }, waistToKnee: { line: [[152, 170], [152, 330]], ref: true }, waistToFloor: { line: [[156, 170], [156, 442]], ref: true },
  inseam: { line: [[100, 252], [97, 440]] },
};
function body(o = {}) {
  const m = MEAS[o.m] || {};
  if (o.m === 'crotchDepth') return seated();
  let s = P(bodyOutline(), 'body') + `<ellipse cx="100" cy="34" rx="19" ry="24" class="body"/>`;
  if (m.back) s += L(100, 70, 100, 240, 'soft') + P('M80 104Q86 120 84 136M120 104Q114 120 116 136', 'soft');
  else s += P('M86 64Q100 74 114 64', 'soft');
  // waist string reference for lengths from the waist
  if (['waistToHip', 'waistToKnee', 'waistToFloor', 'backWaist', 'frontWaist'].includes(o.m)) s += P('M77 170Q100 176 123 170', 'soft') + T(60, 168, 'Waist', 'lab-s', 'end');
  if (m.c) {
    const [y, x1, x2] = m.c, ry = Math.max(3, (x2 - x1) * 0.12);
    s += P(`M${x1} ${y}A${(x2 - x1) / 2} ${ry} 0 0 1 ${x2} ${y}`, 'soft') + P(`M${x1} ${y}A${(x2 - x1) / 2} ${ry} 0 0 0 ${x2} ${y}`, 'hi');
  }
  if (m.line) {
    s += PL(m.line, 'hi');
    m.line.forEach((p, i) => { if (i === 0 || i === m.line.length - 1) s += C(p[0], p[1], 3, 'hi-dot'); });
    if (m.ref) s += L(m.line[0][0] - 8, m.line[0][1], m.line[0][0] + 6, m.line[0][1], 'hi') + L(m.line[m.line.length - 1][0] - 8, m.line[m.line.length - 1][1], m.line[m.line.length - 1][0] + 6, m.line[m.line.length - 1][1], 'hi');
  }
  s += T(100, 456, m.back ? 'Back view' : 'Front view', 'lab-s', 'middle');
  return svg(200, 462, s, 'Body measurement');
}
function seated() {
  let s = R(70, 200, 110, 10, 'metal', 3) + L(80, 210, 80, 300) + L(170, 210, 170, 300) + L(170, 200, 170, 90, 'ink');
  s += `<ellipse cx="120" cy="38" rx="17" ry="21" class="body"/>`;
  s += P(smooth([[112, 58], [106, 70], [100, 100], [102, 130], [106, 150], [110, 170], [104, 190], [108, 200], [40, 200], [30, 206], [34, 300], [20, 312], [46, 314], [48, 220], [60, 214], [150, 212], [156, 190], [148, 150], [144, 120], [144, 90], [136, 70], [128, 58]], true), 'body');
  s += L(160, 150, 160, 200, 'hi') + L(152, 150, 168, 150, 'hi') + L(152, 200, 168, 200, 'hi') + T(186, 154, 'Waist', 'lab-s') + T(186, 204, 'Chair seat', 'lab-s');
  return svg(240, 320, s, 'Seated crotch depth');
}

// Practice sheet preview. kind straight | corners | curves
function paper(o = {}) {
  const k = o.kind || 'straight'; let s = R(40, 10, 170, 220, 'paper', 4);
  if (k === 'straight') for (let y = 40; y < 210; y += 28) { s += L(56, y, 194, y, 'thin') + C(56, y, 3, 'ink-f'); }
  if (k === 'corners') { s += PL([[56, 60], [56, 30], [84, 30], [84, 60], [112, 60], [112, 30], [140, 30], [140, 60], [168, 60], [168, 30], [194, 30]], 'thin'); s += PL([[125, 150], [140, 150], [140, 165], [110, 165], [110, 135], [155, 135], [155, 180], [95, 180], [95, 120], [170, 120]], 'thin'); }
  if (k === 'curves') { s += P('M56 50Q76 20 96 50T136 50T176 50T196 50', 'thin') + C(90, 150, 30, 'thin') + C(160, 150, 20, 'thin'); }
  if (o.holes) for (let x = 60; x < 150; x += 7) s += C(x, 40, 1.1, 'thread-f');
  return svg(250, 240, s, 'Practice sheet');
}

// Diagram key
function legend(o = {}) {
  const k = o.k || 'right';
  const m = { right: R(4, 4, 46, 26, 'fab-r', 3), wrong: R(4, 4, 46, 26, 'fab-w', 3), lining: R(4, 4, 46, 26, 'fab-l', 3), stitch: L(4, 17, 50, 17, 'stitch'),
    fold: L(4, 17, 50, 17, 'fold'), hi: L(4, 17, 50, 17, 'hi'), grain: arrow(6, 17, 48, 17), zig: P('M4 17l4 -5l4 5l4 -5l4 5l4 -5l4 5l4 -5l4 5l4 -5l4 5', 'zig') };
  return svg(54, 34, m[k] || '', k);
}

// Shared drawing helpers, so each level's own diagram file (js/dia3.js, ...) draws the same way.
export const H = { svg, P, L, R, C, T, PL, PG, pts, lab, callout, arrow, curveArrow, dim, smooth, len, esc, f, asArr, fmtIn, yards };
// Add more named scenes from another file. Names must be new.
export function register(scenes) {
  for (const [k, fn] of Object.entries(scenes)) { if (DIAGRAMS[k]) throw new Error('Diagram name taken: ' + k); DIAGRAMS[k] = fn; }
}
export const DIAGRAMS = { machine, bobbin, needleUp, needleParts, handNeedle, hand, button, tools, sew, stitchLook, xsec, finish, clip, grain, weave, fold, press, square, shirt, panel, layout, body, paper, legend };

export function draw(spec) {
  if (!spec) return '';
  let [name, opts] = Array.isArray(spec) ? spec : [spec, {}];
  const fn = DIAGRAMS[name];
  const fix = v => typeof v === 'string' ? v.replace(/\{\{([^}]+)\}\}/g, (_, a) => AMOUNT(a)) : Array.isArray(v) ? v.map(fix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v;
  opts = fix(opts);
  if (!fn) return `<p class="muted small">(Missing diagram: ${esc(name)})</p>`;
  try { return fn(opts || {}); } catch (e) { console.error('diagram', name, e); return `<p class="muted small">(Diagram error: ${esc(name)})</p>`; }
}
