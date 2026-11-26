// Diagrams used by level 4 (Reading a pattern). Shared helpers come from diagrams.js (H); see the top of that file.
// Every example pattern, chart, and envelope here is invented for Notch.
import { register, H } from './diagrams.js';
const { svg, P, L, R, C, T, PL, PG, lab, callout, arrow, curveArrow, dim, smooth, len, f, asArr, fmtIn, esc } = H;

// ---------- small helpers for this file ----------
const isCm = () => len(1).endsWith('cm');
// A number in the chosen unit, without the unit (for chart cells).
const num = v => isCm() ? String(Math.round(v * 2.54 * 2) / 2) : fmtIn(v);
// Yards, or meters rounded up to 0.1 (same rule as the lesson text).
const ydn = v => isCm() ? (Math.ceil(v * 0.9144 * 10) / 10).toFixed(1).replace(/\.0$/, '') : fmtIn(v);
const ydStr = v => isCm() ? ydn(v) + ' m' : ydn(v) + ' yd';
const has = (o, k) => { const a = asArr(o.hi); return a.includes(k) || a.includes('all'); };
const dash = (d, c = 'ink', da = '7 4') => `<path d="${d}" class="${c}" stroke-dasharray="${da}"/>`;
const rtext = (x, y, s, c = 'lab-s', deg = -90) => `<text x="${f(x)}" y="${f(y)}" class="${c} t-mid" transform="rotate(${deg} ${f(x)} ${f(y)})">${esc(s)}</text>`;
const at = (x, y, inner, rot = 0, sc = 1) => `<g transform="translate(${f(x)},${f(y)})${rot ? ` rotate(${rot})` : ''}${sc !== 1 ? ` scale(${sc})` : ''}">${inner}</g>`;
// A callout with a 12px label centered on (lx, ly).
const co12 = (px, py, lx, ly, t) => {
  const hw = (t.length * 12 * 0.56 + 10) / 2, side = Math.abs(lx - px) > hw + 4;
  const ex = side ? lx + (px < lx ? -hw : hw) : lx, ey = side ? ly - 5 : ly + (ly < py ? 7 : -17);
  return L(px, py, ex, ey, 'soft') + C(px, py, 3.2, 'hi-dot') + lab(lx, ly, t, { anchor: 'middle', hi: true, size: 12 });
};
const lines = (x, y, arr, cls = 'lab-s', anchor = 'start', lh = 14) => arr.map((s, i) => T(x, y + i * lh, s, cls, anchor)).join('');
// Two-headed grainline arrow.
const grainArrow = (x1, y1, x2, y2, hi) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; return arrow(mx, my, x1, y1, hi) + arrow(mx, my, x2, y2, hi); };
// Notch triangles on a cutting line at (x,y), pointing out along the unit normal (nx,ny). n = 1, 2, or 3.
function notch(x, y, nx, ny, n = 1, c = 'ink-f') {
  const tx = -ny, ty = nx; let s = '';
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 8, bx = x + tx * o, by = y + ty * o;
    s += PG([[bx + tx * 3.5, by + ty * 3.5], [bx - tx * 3.5, by - ty * 3.5], [bx + nx * 7, by + ny * 7]], c);
  }
  return s;
}
// Lengthen/shorten double line between two points.
const lsLine = (x1, y1, x2, y2, c = 'ink', gap = 4) => { const d = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / d * gap / 2, ny = (x2 - x1) / d * gap / 2; return L(x1 + nx, y1 + ny, x2 + nx, y2 + ny, c) + L(x1 - nx, y1 - ny, x2 - nx, y2 - ny, c); };
// Move each point of a polyline by d along its normal, on the side facing `toward`.
function offsetPts(pts, d, toward) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if ((toward[0] - p[0]) * nx + (toward[1] - p[1]) * ny < 0) { nx = -nx; ny = -ny; }
    return [p[0] + nx * d, p[1] + ny * d];
  });
}
const cub = (p, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]); };
const cubPts = (p, n = 16) => Array.from({ length: n + 1 }, (_, i) => cub(p, i / n));
const qpt = (a, c, b, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; };
const qPts = (a, c, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => qpt(a, c, b, i / n));
// Outward unit normal of a polyline at index i, pointing away from `inside`.
function normalAt(pts, i, inside) {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  if ((inside[0] - pts[i][0]) * nx + (inside[1] - pts[i][1]) * ny > 0) { nx = -nx; ny = -ny; }
  return [nx, ny];
}

// ---------- small tools ----------
const pinG = (x, y, deg = 0) => at(x, y, L(-14, 0, 12, 0, 'ink') + C(-16, 0, 4, 'thread-f'), deg);
const shearsG = (x, y, deg = 0, sc = 1) => at(x, y, `<ellipse cx="-34" cy="-9" rx="11" ry="7" class="ink"/><ellipse cx="-34" cy="9" rx="11" ry="7" class="ink"/>` +
  P('M-24 -9L40 -3L40 0L-22 2Z', 'metal') + P('M-24 9L38 3L38 0L-22 -2Z', 'metal') + C(-18, 0, 2.2, 'ink-f'), deg, sc);
const wheelG = (x, y, deg = -40) => { let s = R(12, -5, 52, 10, 'body', 5) + L(0, 0, 12, 0, 'ink') + C(0, 0, 10, 'metal'); for (let a = 0; a < 360; a += 30) { const r = a * Math.PI / 180; s += L(Math.cos(r) * 10, Math.sin(r) * 10, Math.cos(r) * 14, Math.sin(r) * 14, 'ink'); } return at(x, y, s + C(0, 0, 2.5, 'ink-f'), deg); };
const pencilG = (x, y, deg = -40) => at(x, y, P('M0 0L10 -4.5H64V4.5H10Z', 'body') + P('M0 0L10 -4.5V4.5Z', 'paper') + C(1.5, 0, 1.6, 'ink-f'), deg);
const chalkG = (x, y, deg = 0) => at(x, y, P('M0 0L26 -12L26 12Z', 'body') + L(6, -2, 6, 2, 'soft'), deg);
const safetyPinG = (x, y, deg = 0) => at(x, y, P('M0 0H40Q48 0 48 -6Q48 -12 40 -12H8', 'metal') + R(-8, -8, 12, 10, 'metal2', 3) + C(44, -6, 3, 'ink'), deg);
const weightG = (x, y) => C(x, y, 11, 'metal') + C(x, y, 4, 'metal2');

// ======================================================================
// Pants shapes. Pattern pieces in inches: u across from the side seam, v down from the waist.
// ======================================================================
const PANT = {
  front: { w0: [0, 0], w1: [11.8, 0], cf: [11.8, 7], c: [12, 12.3], cp: [14.8, 12.4], ih: [13.2, 44], sh: [1.6, 44], hip: [0.2, 9], mid: [7, 24] },
  back: { w0: [0, 0], w1: [12.8, -1], cf: [13.4, 7], c: [13.7, 12.3], cp: [17.4, 12.4], ih: [15.8, 44], sh: [1.6, 44], hip: [0.2, 9], mid: [8, 24] },
};
function pantD(p, m) {
  const q = a => { const r = m(a); return `${f(r[0])} ${f(r[1])}`; };
  return `M${q(p.w0)}L${q(p.w1)}L${q(p.cf)}Q${q(p.c)} ${q(p.cp)}L${q(p.ih)}L${q(p.sh)}L${q(p.hip)}Z`;
}
const crotchPts = p => [p.w1, ...qPts(p.cf, p.c, p.cp)];
// u of the inseam and the side seam at depth v
const inseamU = (p, v) => p.cp[0] + (p.ih[0] - p.cp[0]) * (v - p.cp[1]) / (p.ih[1] - p.cp[1]);
const sideU = (p, v) => v < p.hip[1] ? p.hip[0] * v / p.hip[1] : p.hip[0] + (p.sh[0] - p.hip[0]) * (v - p.hip[1]) / (p.sh[1] - p.hip[1]);

// A garment drawing (technical flat) of pull-on pants. Unit box 100 wide; full length 170.
// o: len full|crop|short, cuff, tie, pocket (side), patch (back pocket), fillL/fillR, mini
function pantsFlat(x0, y0, s, o = {}) {
  const Lg = o.len === 'crop' ? 122 : o.len === 'short' ? 76 : 170;
  const lo = o.len === 'short' ? [0, Lg] : o.len === 'crop' ? [2.3, Lg] : [3, Lg];
  const li = o.len === 'short' ? [45, Lg] : o.len === 'crop' ? [47.6, Lg] : [46, Lg];
  const ro = [100 - lo[0], Lg], ri = [100 - li[0], Lg];
  const X = p => [x0 + p[0] * s, y0 + p[1] * s];
  const poly = a => PG(a.map(X), o.fill || 'body');
  let g = '';
  if (o.fillL || o.fillR) {
    g += PG([[6, 0], [50, 0], [50, 58], li, lo, [1, 42], [6, 12]].map(X), o.fillL || 'body');
    g += PG([[50, 0], [94, 0], [94, 12], [99, 42], ro, ri, [50, 58]].map(X), o.fillR || 'body');
  } else g += poly([[6, 0], [94, 0], [94, 12], [99, 42], ro, ri, [50, 58], li, lo, [1, 42], [6, 12]]);
  const ln = (a, b, c = 'thin') => L(...X(a), ...X(b), c);
  g += ln([6, 12], [94, 12]);
  if (!o.mini) for (let x = 12; x <= 88; x += 7) g += ln([x, 2.5], [x, 9.5]);
  g += ln([50, 12], [50, 58]);
  const sc = s >= 0.8 ? 'stitch' : null;
  if (sc) g += P(`M${X([7, 10.5]).map(f).join(' ')}H${f(X([93, 0])[0])}`, sc);
  // hems
  const hy = o.cuff ? Lg - 16 : Lg - 6;
  if (o.cuff) { g += ln([lo[0] - 0.2, hy], [li[0] + 0.1, hy], 'ink') + ln([ri[0] - 0.1, hy], [ro[0] + 0.2, hy], 'ink'); }
  else if (sc) { g += P(`M${X([lo[0] + 1, hy]).map(f).join(' ')}H${f(X([li[0] - 0.5, 0])[0])}`, sc) + P(`M${X([ri[0] + 0.5, hy]).map(f).join(' ')}H${f(X([ro[0] - 1, 0])[0])}`, sc); }
  else g += dash(`M${X([lo[0] + 1, hy]).map(f).join(' ')}H${f(X([li[0] - 0.5, 0])[0])}M${X([ri[0] + 0.5, hy]).map(f).join(' ')}H${f(X([ro[0] - 1, 0])[0])}`, 'thin', '3 2');
  if (o.pocket) g += ln([18, 12], [3, 36]) + ln([82, 12], [97, 36]);
  if (o.patch) { g += PG([[14, 20], [38, 20], [38, 44], [26, 48], [14, 44]].map(X), 'thin') + PG([[62, 20], [86, 20], [86, 44], [74, 48], [62, 44]].map(X), 'thin'); }
  if (o.tie) { g += C(...X([45, 7]), 1.6 * Math.max(1, s), 'ink') + C(...X([55, 7]), 1.6 * Math.max(1, s), 'ink'); g += P(`M${X([45, 7]).map(f).join(' ')}Q${X([40, 20]).map(f).join(' ')} ${X([43, 30]).map(f).join(' ')}M${X([55, 7]).map(f).join(' ')}Q${X([60, 20]).map(f).join(' ')} ${X([57, 30]).map(f).join(' ')}`, 'thread'); }
  return g;
}
// Feature points on the pants flat, in unit coords.
const PF_PT = { elastic: [30, 6], casing: [70, 10.5], crotch: [50, 36], inseam: [48.6, 110], hem: [24, 164], side: [2, 90], cuff: [24, 114], pocket: [10, 24], patch: [26, 34], tie: [42, 22] };

// ======================================================================
// The pattern envelope. side front|back. Front hi: title|sizes|level|views. Back hi: desc|fabrics|notions|chart|yardage|finished
// ======================================================================
function l4Envelope(o = {}) {
  let s = '';
  if (o.side !== 'back') {
    s += R(20, 8, 320, 252, 'paper', 8);
    s += T(36, 38, 'Easy pull-on pants', 'lab') + T(36, 56, 'Sample pattern', 'lab-s');
    s += T(324, 38, 'Sizes 8–18', 'lab', 'end');
    s += lab(324, 62, 'Beginner', { anchor: 'end', hi: has(o, 'level'), size: 12 });
    if (has(o, 'title')) s += R(28, 20, 152, 44, 'hi', 8);
    if (has(o, 'sizes')) s += R(240, 20, 92, 26, 'hi', 8);
    // the main illustration: view A, large
    s += pantsFlat(46, 76, 0.96, { fill: 'fab-r' });
    s += T(94, 252, 'View A shown', 'lab-s', 'middle');
    // the views
    s += T(255, 104, 'Views', 'lab', 'middle');
    [['A', 'full', 184], ['B', 'crop', 236], ['C', 'short', 288]].forEach(([v, lg, x]) => {
      s += T(x + 19, 128, v, 'lab', 'middle') + pantsFlat(x, 136, 0.38, { len: lg, cuff: lg === 'crop', tie: lg === 'short', mini: true });
    });
    s += T(255, 224, 'Line drawings', 'lab-s', 'middle') + T(255, 238, 'of every view', 'lab-s', 'middle');
    if (has(o, 'views')) s += R(174, 86, 160, 160, 'hi', 10);
    return svg(360, 268, s, 'Pattern envelope, front');
  }
  // back of the envelope
  s += R(14, 6, 332, 270, 'paper', 8);
  const bars = (x, y, w, n, step = 7) => { let g = ''; for (let i = 0; i < n; i++) g += R(x, y + i * step, w * (i === n - 1 ? 0.6 : 1), 2.6, 'soft-f', 1.3); return g; };
  const grid = (x, y, w, h, cols, rows) => { let g = R(x, y, w, h, 'soft', 2); for (let i = 1; i < cols; i++) g += L(x + w * i / cols, y, x + w * i / cols, y + h, 'soft'); for (let j = 1; j < rows; j++) g += L(x, y + h * j / rows, x + w, y + h * j / rows, 'soft'); return g; };
  const B = {
    desc: [22, 12, 316, 44, 'Description', g => bars(30, 38, 290, 2)],
    fabrics: [22, 60, 154, 52, 'Fabrics', g => bars(30, 86, 136, 3)],
    notions: [184, 60, 154, 52, 'Notions', g => bars(192, 86, 136, 3)],
    chart: [22, 116, 316, 50, 'Body measurements', g => grid(30, 140, 300, 20, 7, 2)],
    yardage: [22, 170, 316, 54, 'Fabric you need', g => grid(30, 194, 300, 24, 7, 3)],
    finished: [22, 228, 316, 44, 'Finished garment', g => grid(30, 252, 300, 14, 7, 1)],
  };
  Object.entries(B).forEach(([k, [x, y, w, h, t, inner]]) => {
    s += T(x + 8, y + 18, t, 'lab') + inner();
    if (has(o, k)) s += R(x, y, w, h, 'hi', 8);
  });
  return svg(360, 282, s, 'Pattern envelope, back');
}

// ======================================================================
// Views of the sample pattern. mode views|pieces, hi A|B|C
// ======================================================================
function l4Views(o = {}) {
  let s = '';
  if (o.mode === 'pieces') {
    const cols = { A: 250, B: 300, C: 350 };
    if (o.hi && cols[o.hi]) s += R(cols[o.hi] - 20, 12, 40, 200, 'hi-f', 10);
    s += T(70, 32, 'Pattern piece', 'lab') + Object.entries(cols).map(([k, x]) => T(x, 32, k, 'lab', 'middle')).join('');
    s += L(14, 42, 370, 42, 'soft');
    const rows = [['1 Front', 'A B C', 'front'], ['2 Back', 'A B C', 'back'], ['3 Cuff', 'B', 'cuff'], ['4 Pocket', 'C', 'pocket'], ['5 Drawstring', 'C', 'tie']];
    rows.forEach(([name, uses, icon], i) => {
      const y = 70 + i * 34;
      if (icon === 'front' || icon === 'back') s += `<path d="${pantD(PANT[icon], a => [30 + a[0] * 0.68, y - 28 + (a[1] + 1) * 0.68])}" class="paper"/>`;
      if (icon === 'cuff') s += R(20, y - 14, 34, 14, 'paper', 1);
      if (icon === 'pocket') s += P(`M28 ${y - 20}H50V${y - 4}L39 ${y}L28 ${y - 4}Z`, 'paper');
      if (icon === 'tie') s += R(16, y - 8, 44, 5, 'paper', 1);
      s += T(70, y - 4, name, 'lab');
      Object.entries(cols).forEach(([k, x]) => { s += uses.includes(k) ? C(x, y - 8, 6, 'hi-dot') : L(x - 5, y - 8, x + 5, y - 8, 'soft'); });
      if (i < rows.length - 1) s += L(14, y + 9, 370, y + 9, 'soft');
    });
    return svg(384, 228, s, 'Pattern pieces used by each view');
  }
  const V = [['A', 'full', 20, ['Long legs', 'Plain hem']], ['B', 'crop', 145, ['Cropped', 'With cuffs']], ['C', 'short', 270, ['Shorts', 'Pockets, drawstring']]];
  V.forEach(([v, lg, x, d]) => {
    if (o.hi === v) s += R(x - 10, 6, 110, 228, 'hi', 10);
    s += T(x + 45, 26, 'View ' + v, 'lab', 'middle');
    s += pantsFlat(x, 38, 0.9, { len: lg, cuff: lg === 'crop', tie: lg === 'short', pocket: lg === 'short' });
    s += lines(x + 45, 208, d, 'lab-s', 'middle');
  });
  return svg(380, 240, s, 'Views A, B, and C');
}

// ======================================================================
// Size and finished-measurement charts. rows [bust|waist|hip|fhip|ease|flen], title, size (column), row, you {row, v}
// ======================================================================
const SIZES = [8, 10, 12, 14, 16, 18];
const CH = {
  bust: ['Bust', [31.5, 33, 34.5, 36.5, 38.5, 40.5]],
  waist: ['Waist', [24.5, 26, 27.5, 29.5, 31.5, 33.5]],
  hip: ['Hip', [34, 35.5, 37, 39, 41, 43]],
  fhip: ['Finished hip', [41, 42.5, 44, 46, 48, 50]],
  ease: ['Ease at hip', [7, 7, 7, 7, 7, 7]],
  flen: ['Length, view A', [40.5, 40.75, 41, 41.25, 41.5, 41.75]],
};
function l4Chart(o = {}) {
  const rows = asArr(o.rows || ['bust', 'waist', 'hip']);
  const title = o.title || (rows.every(r => r[0] === 'f') ? 'Finished garment' : 'Body measurements');
  const LX = 14, CX = 124, CW = 42, W = CX + CW * 6 + 8, hy = 54, RH = 28;
  const cx = i => CX + CW * i + CW / 2;
  const bottom = hy + RH * rows.length + 10;
  let s = '';
  const ci = SIZES.indexOf(+o.size);
  if (ci >= 0) s += R(CX + CW * ci + 2, hy - 20, CW - 4, bottom - hy + 16, 'hi-f', 7);
  rows.forEach((r, i) => { if (o.row === r) s += R(LX - 8, hy + RH * (i + 1) - 19, W - LX + 2, 26, 'hi-f', 7); });
  s += T(LX, 22, title, 'lab') + T(W - 6, 22, isCm() ? 'All in cm' : 'All in inches', 'lab-s', 'end');
  s += T(LX, hy, 'Size', 'lab') + SIZES.map((z, i) => T(cx(i), hy, String(z), 'lab', 'middle')).join('');
  s += L(LX - 6, hy + 8, W - 6, hy + 8, 'soft');
  rows.forEach((r, i) => {
    const y = hy + RH * (i + 1); const [name, vals] = CH[r];
    s += T(LX, y, name, 'lab') + vals.map((v, j) => T(cx(j), y, num(v), r === 'ease' ? 'lab' : 'lab', 'middle')).join('');
    if (i < rows.length - 1) s += L(LX - 6, y + 9, W - 6, y + 9, 'soft');
  });
  let H = bottom;
  if (o.you && CH[o.you.row]) {
    const ri = rows.indexOf(o.you.row), vals = CH[o.you.row][1], v = o.you.v;
    let x = cx(0);
    if (v >= vals[5]) x = cx(5);
    else for (let i = 0; i < 5; i++) if (v >= vals[i] && v <= vals[i + 1]) x = cx(i) + (v - vals[i]) / (vals[i + 1] - vals[i]) * CW;
    const y = hy + RH * (ri + 1) + 4;
    s += callout(x, y, x, bottom + 26, 'You: ' + len(v), 'middle');
    H = bottom + 36;
  }
  return svg(W, H, s, title);
}

// Yardage chart. views [A,B,C], pick {view, w: 45|60, size}
const YD = {
  A: { 45: [2.375, 2.375, 2.5, 2.5, 2.625, 2.625], 60: [1.5, 1.5, 1.625, 1.625, 1.75, 1.875] },
  B: { 45: [1.875, 1.875, 2, 2, 2.125, 2.125], 60: [1.25, 1.25, 1.375, 1.375, 1.5, 1.625] },
  C: { 45: [1.125, 1.125, 1.25, 1.25, 1.375, 1.375], 60: [0.875, 0.875, 0.875, 1, 1, 1.125] },
};
const VIEWN = { A: 'View A: long', B: 'View B: cropped', C: 'View C: shorts' };
function l4Yardage(o = {}) {
  const views = asArr(o.views || ['A', 'B', 'C']);
  const LX = 14, CX = 124, CW = 42, W = CX + CW * 6 + 8, hy = 52, RH = 24;
  const cx = i => CX + CW * i + CW / 2;
  const pk = o.pick || {}, pi = SIZES.indexOf(+pk.size);
  const wName = w => (isCm() ? (w === 45 ? '115 cm' : '150 cm') : w + ' in') + (w === 45 ? ' *' : ' **');
  let s = '', y = hy;
  s += T(LX, 22, 'Fabric you need', 'lab') + T(W - 6, 22, isCm() ? 'Meters' : 'Yards', 'lab-s', 'end');
  if (pi >= 0) s += R(CX + CW * pi + 3, hy - 18, CW - 6, 24, 'hi-f', 7);
  s += T(LX, hy, 'Size', 'lab') + SIZES.map((z, i) => T(cx(i), hy, String(z), 'lab', 'middle')).join('') + L(LX - 6, hy + 8, W - 6, hy + 8, 'soft');
  views.forEach(v => {
    y += RH; s += T(LX, y, VIEWN[v], 'lab');
    [45, 60].forEach(w => {
      y += RH;
      const picked = pk.view === v && +pk.w === w;
      if (picked) s += R(LX - 8, y - 17, CX - LX + 2, 24, 'hi-f', 7);
      s += T(LX + 10, y, wName(w), 'lab-s');
      YD[v][w].forEach((a, j) => {
        if (picked && j === pi) s += R(CX + CW * j + 2, y - 17, CW - 4, 24, 'hi', 7);
        s += T(cx(j), y, ydn(a), 'lab', 'middle');
      });
    });
    s += L(LX - 6, y + 9, W - 6, y + 9, 'soft');
  });
  y += 28; s += T(LX, y, '* with or without nap     ** without nap', 'lab-s');
  return svg(W, y + 10, s, 'Yardage chart');
}

// ======================================================================
// Ease. kind ring|bars|compare. bars: body, wear, design (inches)
// ======================================================================
function l4Ease(o = {}) {
  const k = o.kind || 'ring'; let s = '';
  if (k === 'ring') {
    s += `<ellipse cx="120" cy="112" rx="96" ry="70" class="fab-r"/><ellipse cx="120" cy="112" rx="70" ry="48" class="skin"/>`;
    s += T(120, 108, 'Your body', 'lab', 'middle') + T(120, 124, '(seen from above)', 'lab-s', 'middle');
    s += callout(120, 42, 236, 40, 'Garment');
    s += L(190, 112, 216, 112, 'hi') + callout(203, 112, 236, 118, 'Ease: the room');
    s += T(236, 136, 'between you and', 'lab-s') + T(236, 150, 'the garment', 'lab-s');
    return svg(380, 196, s, 'Ease');
  }
  if (k === 'compare') {
    [['Close fit', 46, 'about ' + len(2)], ['Relaxed', 56, 'about ' + len(5)], ['Roomy', 66, len(8) + ' or more']].forEach(([n, rx, e], i) => {
      const x = 64 + i * 124;
      s += `<ellipse cx="${x}" cy="74" rx="${rx}" ry="${f(rx * 0.7)}" class="fab-r"/><ellipse cx="${x}" cy="74" rx="40" ry="28" class="skin"/>`;
      s += T(x, 150, n, 'lab', 'middle') + T(x, 166, e, 'lab-s', 'middle');
    });
    s += T(190, 190, 'Ease at the hip, for pants', 'lab-s', 'middle');
    return svg(380, 198, s, 'Close, relaxed, and roomy fits');
  }
  if (k === 'flat') {
    s += pantsFlat(30, 14, 1.0, {});
    s += L(31, 56, 129, 56, 'hi') + L(31, 48, 31, 64, 'hi') + L(129, 48, 129, 64, 'hi');
    s += lab(150, 48, 'Measure across the hip,', { hi: true, size: 12 }) + lab(150, 70, 'with the pants lying flat,', { hi: true, size: 12 }) + lab(150, 92, 'then double it', { hi: true, size: 12 });
    s += lab(150, 128, 'Minus your hip', { hi: false, size: 12 }) + lab(150, 150, '= the ease you like', { hi: false, size: 12 });
    return svg(380, 196, s, 'Measuring ease in your own clothes');
  }
  const body = o.body ?? 38.5, wear = o.wear ?? 2, des = o.design ?? 5.5, fin = body + wear + des;
  const x0 = 24, kx = 330 / fin, bh = 18;
  const bar = (y, parts) => { let x = x0, g = ''; parts.forEach(([w, c]) => { g += R(x, y, w * kx, bh, c, 3); x += w * kx; }); return g; };
  const steps = o.step || 3;
  s += T(x0, 22, 'Your hip: ' + len(body), 'lab') + bar(30, [[body, 'skin']]);
  if (steps >= 2) s += T(x0, 76, '+ wearing ease: ' + len(wear) + ' (room to move)', 'lab') + bar(84, [[body, 'skin'], [wear, 'hi-f']]);
  if (steps >= 3) s += T(x0, 130, '+ design ease: ' + len(des) + ' (the style)', 'lab') + bar(138, [[body, 'skin'], [wear, 'hi-f'], [des, 'fab-r']]);
  if (steps >= 3) s += dim(x0, 160, x0 + fin * kx, 160, '= finished hip: ' + len(fin), 14);
  return svg(380, steps >= 3 ? 196 : steps === 2 ? 116 : 60, s, 'Ease adds up');
}

// ======================================================================
// A top front pattern piece, cut on the fold, with its markings. hi: cut|notch|dot|dart|ls|fold|label|all
// ======================================================================
function l4Piece(o = {}) {
  let s = '';
  const outline = 'M40 58Q80 58 90 22L160 40C150 70 150 100 178 112L190 276H40Z';
  s += P(outline, 'paper') + P(outline, has(o, 'cut') ? 'hi' : 'ink');
  // dart
  const dc = has(o, 'dart') ? 'hi' : 'ink';
  s += L(180.8, 150, 128, 160, dc) + L(182.1, 170, 128, 160, dc) + dash('M181.5 160H128', 'soft', '3 3');
  const dd = has(o, 'dot') ? 'hi-dot' : 'ink-f';
  s += C(128, 160, 3.4, dd) + C(166, 152.8, 2.4, dd) + C(166.8, 167.4, 2.4, dd);
  // notches: armhole (single) and side seam (single)
  const nc = has(o, 'notch') ? 'hi-dot' : 'ink-f';
  s += notch(152, 84, 1, 0, 1, nc) + notch(187.4, 234, 1, -0.07, 1, nc);
  // lengthen / shorten
  s += lsLine(40, 214, 187.1, 214, has(o, 'ls') ? 'hi' : 'ink') + T(128, 206, 'Lengthen/shorten', 'lab-s', 'middle');
  // fold bracket
  const fc = has(o, 'fold');
  s += L(56, 112, 56, 252, fc ? 'hi' : 'ink') + arrow(56, 112, 43, 112, fc) + arrow(56, 252, 43, 252, fc) + rtext(68, 158, 'Place on fold', fc ? 'lab' : 'lab-s');
  // label
  s += T(114, 92, '1 Front', 'lab', 'middle') + T(114, 108, 'Cut 1 on fold', 'lab-s', 'middle') + T(114, 122, 'Views A, B', 'lab-s', 'middle');
  if (has(o, 'label')) s += R(78, 76, 72, 52, 'hi', 8);
  // callouts
  const co = [['notch', 155, 84, 'Notch', 70], ['label', 150, 102, 'Piece label', 100], ['dot', 128, 160, 'Dot', 136], ['dart', 172, 160, 'Dart', 174], ['ls', 150, 214, 'Lengthen/shorten', 220], ['cut', 188, 256, 'Cutting line', 262], ['fold', 44, 182, 'Fold', 0]];
  co.forEach(([k, px, py, t, ly]) => { if (has(o, k) && ly) s += callout(px, py, 226, ly, t); });
  s += T(40, 296, 'Fold edge', 'lab-s');
  return svg(380, 302, s, 'Pattern piece markings');
}

// ======================================================================
// Pattern symbols up close. m symbols|grain|fold|notches|match|dot|dart|button|lengthen
// ======================================================================
function l4Mark(o = {}) {
  const m = o.m || 'symbols'; let s = '';
  if (m === 'symbols') {
    const cell = (i, title, g) => { const x = (i % 3) * 126, y = Math.floor(i / 3) * 104; return at(x, y, R(4, 4, 118, 96, 'paper', 8) + g + T(63, 90, title, 'lab-s', 'middle')); };
    s += cell(0, 'Grainline', grainArrow(18, 42, 108, 42));
    s += cell(1, 'Place on fold', L(30, 20, 30, 64, 'fold') + L(54, 26, 54, 58) + arrow(54, 26, 33, 26) + arrow(54, 58, 33, 58));
    s += cell(2, 'Notches', L(14, 50, 112, 50) + notch(34, 50, 0, -1, 1) + notch(63, 50, 0, -1, 2) + notch(96, 50, 0, -1, 3));
    s += cell(3, 'Dots', C(36, 42, 3, 'ink-f') + C(63, 42, 5, 'ink-f') + C(92, 42, 6.5, 'ink'));
    s += cell(4, 'Lengthen/shorten', lsLine(16, 42, 110, 42, 'ink', 6));
    s += cell(5, 'Buttonhole, button', L(30, 30, 30, 70, 'soft') + L(26, 42, 70, 42) + L(26, 37, 26, 47) + L(70, 37, 70, 47) + at(96, 52, C(0, 0, 9, 'ink') + L(-5, -5, 5, 5, 'ink') + L(5, -5, -5, 5, 'ink')));
    return svg(380, 210, s, 'Pattern symbols');
  }
  if (m === 'grain') {
    s += R(20, 36, 340, 150, 'fab-r') + R(20, 36, 340, 10, 'fab-w') + T(24, 28, 'Selvedge', 'lab-s');
    s += P('M90 70H280L296 170H74Z', 'paper') + P('M90 70H280L296 170H74Z', 'ink');
    s += grainArrow(120, 104, 250, 104, true);
    s += dim(120, 46, 120, 104, len(4), -14, 'end') + dim(250, 46, 250, 104, len(4), 14);
    s += lab(185, 146, 'Same at both ends', { anchor: 'middle', hi: true, size: 12 });
    return svg(380, 194, s, 'Checking the grainline');
  }
  if (m === 'fold') {
    s += R(40, 30, 300, 120, 'fab-w') + L(40, 150, 340, 150, 'fold') + T(40, 24, 'Fabric folded in half', 'lab-s') + T(40, 168, 'Fold', 'lab-s');
    s += P('M80 150V60Q140 40 210 56L260 150Z', 'paper') + P('M80 150V60Q140 40 210 56L260 150Z', 'ink');
    s += L(130, 90, 230, 90, 'hi') + arrow(130, 90, 130, 147, true) + arrow(230, 90, 230, 147, true);
    s += lab(180, 82, 'Place on fold', { anchor: 'middle', hi: true, size: 12 });
    s += T(340, 168, 'Opened out, the fold is the middle of the piece', 'lab-s', 'end');
    return svg(380, 176, s, 'Place on fold');
  }
  if (m === 'notches') {
    [['Single', 1, 'Front edges'], ['Double', 2, 'Back edges'], ['Triple', 3, 'Other matches']].forEach(([n, k, d], i) => {
      const x = 16 + i * 122;
      s += R(x, 60, 108, 56, 'paper', 0) + L(x, 60, x + 108, 60) + notch(x + 54, 60, 0, -1, k, 'hi-dot');
      s += T(x + 54, 30, n, 'lab', 'middle') + T(x + 54, 134, d, 'lab-s', 'middle');
    });
    s += T(190, 160, 'Single meets single, double meets double', 'lab-s', 'middle');
    return svg(380, 170, s, 'Single, double, and triple notches');
  }
  if (m === 'match') {
    const cap = [[60, 170], [92, 158], [128, 44], [190, 44]], cap2 = [[190, 44], [252, 44], [288, 158], [320, 170]];
    const d = `M60 170C92 158 128 44 190 44C252 44 288 158 320 170L300 206H80Z`;
    s += P(d, 'paper') + P(d, 'ink');
    const pl = cubPts(cap), pr = cubPts(cap2);
    const nl = normalAt(pl, 9, [190, 150]), nr = normalAt(pr, 7, [190, 150]);
    s += notch(pl[9][0], pl[9][1], nl[0], nl[1], 1, 'hi-dot') + notch(pr[7][0], pr[7][1], nr[0], nr[1], 2, 'hi-dot') + C(190, 52, 4, 'hi-dot');
    s += T(190, 140, 'Sleeve', 'lab', 'middle') + grainArrow(190, 76, 190, 196);
    s += lab(pl[9][0] - 18, pl[9][1] - 6, 'Front', { anchor: 'end', hi: false, size: 12 }) + lab(pr[7][0] + 18, pr[7][1] - 6, 'Back', { hi: false, size: 12 });
    s += lab(190, 30, 'Dot meets the shoulder seam', { anchor: 'middle', hi: true, size: 12 });
    return svg(380, 214, s, 'Notches tell front from back');
  }
  if (m === 'dot') {
    s += R(30, 30, 160, 150, 'fab-w') + T(30, 22, 'Edge of a piece, wrong side up', 'lab-s');
    s += L(180, 30, 180, 112, 'stitch-s') + C(180, 112, 5, 'hi-dot') + L(180, 112, 180, 180, 'soft');
    s += lab(172, 120, 'Stitch to the dot', { anchor: 'end', hi: true, size: 12 }) + lab(176, 160, 'Open below it', { anchor: 'end', hi: false, size: 12 });
    s += T(270, 106, 'Dots mark where', 'lab-s', 'middle') + T(270, 120, 'to start, stop,', 'lab-s', 'middle') + T(270, 134, 'turn, or match', 'lab-s', 'middle');
    return svg(380, 188, s, 'Stitch to the dot');
  }
  if (m === 'dart') {
    const st = o.step || 1;
    if (st === 1) {
      s += P('M30 40H350V180H30Z', 'paper') + L(30, 40, 350, 40) + T(36, 30, 'Waist edge (cutting line)', 'lab-s');
      s += L(170, 40, 190, 150, 'hi') + L(210, 40, 190, 150, 'hi') + dash('M190 40V150', 'soft', '3 3');
      s += C(170, 40, 3, 'ink-f') + C(210, 40, 3, 'ink-f') + C(180, 95, 2.6, 'ink-f') + C(200, 95, 2.6, 'ink-f') + C(190, 150, 4, 'hi-dot');
      s += callout(206, 72, 250, 80, 'Dart legs') + callout(190, 150, 250, 160, 'Point');
      s += lab(150, 110, 'Fold line', { anchor: 'end', hi: false, size: 12 }) + L(152, 106, 188, 100, 'soft');
      return svg(380, 194, s, 'A dart');
    }
    s += P('M30 40H170L190 150L210 40H350V180H30Z', 'fab-w');
    s += P('M170 40L190 150L176 42Z', 'fab-r') + L(172, 40, 190, 150, 'stitch-s');
    s += lab(214, 80, 'Fold on the center line,', { hi: true, size: 12 }) + lab(214, 100, 'match the legs, and stitch', { hi: false, size: 12 }) + lab(214, 120, 'from the wide end to the point', { hi: false, size: 12 });
    return svg(380, 190, s, 'Sewing a dart');
  }
  if (m === 'button') {
    s += R(40, 20, 220, 190, 'paper') + L(40, 20, 40, 210, 'ink') + T(44, 226, 'Front edge', 'lab-s');
    s += dash('M80 20V210', 'soft', '6 4') + rtext(72, 86, 'Center front');
    [56, 116, 176].forEach(y => { s += L(76, y, 130, y, 'hi') + L(76, y - 6, 76, y + 6, 'hi') + L(130, y - 6, 130, y + 6, 'hi'); });
    s += callout(130, 56, 168, 48, 'Buttonhole');
    s += at(80, 146, C(0, 0, 9, 'ink') + L(-5, -5, 5, 5) + L(5, -5, -5, 5), 0) + callout(89, 146, 168, 152, 'Button: on the');
    s += T(168, 168, 'other front, at', 'lab-s') + T(168, 182, 'center front', 'lab-s');
    return svg(380, 234, s, 'Button and buttonhole marks');
  }
  // lengthen
  s += P('M60 20H320V200H60Z', 'paper') + L(60, 20, 60, 200) + L(320, 20, 320, 200);
  s += lsLine(60, 110, 320, 110, 'hi', 7) + lab(190, 96, 'Lengthen or shorten here', { anchor: 'middle', hi: true, size: 12 });
  s += arrow(190, 128, 190, 160) + arrow(190, 64, 190, 30);
  s += T(200, 150, 'Spread to add', 'lab-s') + T(200, 50, 'Fold to remove', 'lab-s');
  return svg(380, 210, s, 'Lengthen or shorten line');
}

// ======================================================================
// Nested size lines on a multi-size pattern, and blending. hi: size; blend: [from, to]
// ======================================================================
function l4Multi(o = {}) {
  const sizes = [10, 12, 14, 16], das = ['', '9 4', '2 4', '12 4 2 4'];
  const wy = i => 52 - i * 5, xw = i => 150 + i * 14, xh = i => 200 + i * 18;
  const path = (a, b) => `M30 ${wy(a)}H${xw(a)}C${xw(a) + 8} ${wy(a) + 60} ${xh(b)} 120 ${xh(b)} 170L${xh(b) + 4} 246`;
  let s = P(path(3, 3) + 'H30Z', 'paper');
  s += dash('M30 46H372', 'soft', '2 4') + T(372, 38, 'Waist', 'lab-s', 'end');
  s += dash('M30 170H372', 'soft', '2 4') + T(372, 162, 'Hip', 'lab-s', 'end');
  sizes.forEach((z, i) => { s += das[i] ? dash(path(i, i), 'ink', das[i]) : P(path(i, i), 'ink'); });
  const hi = sizes.indexOf(+o.hi);
  if (hi >= 0) s += P(path(hi, hi), 'hi');
  if (o.blend) { const a = sizes.indexOf(+o.blend[0]), b = sizes.indexOf(+o.blend[1]); s += P(path(a, b), 'hi'); }
  if (o.marks) { const a = sizes.indexOf(+o.marks[0]), b = sizes.indexOf(+o.marks[1]); s += C(xw(a), wy(a), 5, 'hi-dot') + C(xh(b), 170, 5, 'hi-dot'); }
  // legend
  s += R(40, 76, 104, 84, 'card-f', 6);
  sizes.forEach((z, i) => { const y = 94 + i * 18; s += (das[i] ? dash(`M50 ${y - 4}h30`, 'ink', das[i]) : L(50, y - 4, 80, y - 4)) + T(88, y, 'Size ' + z, hi === i ? 'lab-hi' : 'lab-s'); });
  if (o.marks) s += lab(190, 272, `Mark ${o.marks[0]} at the waist and ${o.marks[1]} at the hip`, { anchor: 'middle', hi: true, size: 12 });
  else if (o.blend) s += lab(190, 272, `Blend: ${o.blend[0]} at the waist to ${o.blend[1]} at the hip`, { anchor: 'middle', hi: true, size: 12 });
  else if (hi >= 0) s += lab(190, 272, `Follow only the size ${sizes[hi]} line`, { anchor: 'middle', hi: true, size: 12 });
  return svg(380, 282, s, 'Multi-size cutting lines');
}

// ======================================================================
// Tracing a pattern. step 1 trace, 2 copy the marks, 3 cut out your copy
// ======================================================================
function l4Trace(o = {}) {
  const st = o.step || 1; let s = '';
  const k = 3.9, base = PANT.front;
  const sized = (dx, sc) => a => [dx + (a[0] * sc) * k, 24 + (a[1] * (1 + (sc - 1) * 0.3)) * k];
  const sizesSc = [0.94, 1, 1.06];
  const orig = (dx, faint) => { let g = R(dx - 14, 10, 98, 196, 'paper', 4); sizesSc.forEach((sc, i) => { g += i === 1 ? P(pantD(base, sized(dx, sc)), 'ink') : dash(pantD(base, sized(dx, sc)), faint ? 'soft' : 'ink', i ? '2 3' : '8 4'); }); return g; };
  const marks = dx => { const m = sized(dx, 1); const a = m([6, 16]), b = m([6, 38]); return grainArrow(a[0], a[1], b[0], b[1]) + lsLine(...m([sideU(base, 30), 30]), ...m([inseamU(base, 30), 30])) + notch(...m(qpt(base.cf, base.c, base.cp, 0.45)), 0.7, -0.7, 1) + T(m([6, 4.5])[0], m([6, 4.5])[1], 'Front', 'lab-s', 'middle'); };
  if (st === 1) {
    s += orig(60) + R(40, 16, 120, 196, 'lab-bg2', 4) + R(40, 16, 120, 196, 'soft', 4);
    const m = sized(60, 1);
    s += P(pantD(base, m), 'hi') + pencilG(...m(base.sh), -40);
    s += lab(176, 60, 'Tracing paper on top', { hi: false, size: 12 }) + lab(176, 84, 'Weights hold it still', { hi: false, size: 12 }) + lab(176, 120, 'Trace your size only', { hi: true, size: 12 });
    s += weightG(52, 30) + weightG(150, 200);
    return svg(380, 222, s, 'Tracing your size');
  }
  s += orig(40, true) + T(76, 222, 'Original: still whole', 'lab-s', 'middle');
  const m = sized(240, 1);
  if (st === 2) s += R(226, 10, 98, 196, 'paper', 4);
  s += P(pantD(base, m), st === 3 ? 'paper' : 'ink') + P(pantD(base, m), st === 3 ? 'ink' : 'hi') + marks(240);
  s += T(m([6, 8])[0], m([6, 8])[1], 'Size 14', 'lab-s', 'middle') + T(m([6, 11.5])[0], m([6, 11.5])[1], 'View A', 'lab-s', 'middle');
  s += T(276, 222, st === 2 ? 'Copy every mark' : 'Cut out your copy', 'lab-s', 'middle');
  if (st === 3) s += shearsG(m(base.sh)[0] - 6, m(base.sh)[1] + 6, -10, 0.7);
  s += arrow(150, 110, 210, 110);
  return svg(380, 230, s, 'Your traced copy');
}

// ======================================================================
// Length changes at the lengthen/shorten line. step mark|lengthen|shorten|hem, amt (inches)
// ======================================================================
function l4Length(o = {}) {
  const st = o.step || 'mark', amt = o.amt || 2, p = PANT.front, k = 6.6, LS = 30;
  const g = st === 'lengthen' ? amt : st === 'shorten' ? -amt : 0;
  const M = shift => a => [24 + (a[1] + (shift && a[1] >= LS - 0.01 ? g : 0)) * k, 26 + a[0] * k];
  const su = sideU(p, LS), iu = inseamU(p, LS);
  const left = [p.w0, p.w1, p.cf, ...qPts(p.cf, p.c, p.cp, 8), [iu, LS], [su, LS], p.hip];
  const right = [[su, LS], [iu, LS], p.ih, p.sh];
  const m0 = M(false), m1 = M(true);
  let s = '';
  if (st === 'lengthen') s += R(m0([0, LS])[0] - 8, 18, g * k + 16, 116, 'paper', 2) + R(m0([0, LS])[0] - 8, 18, g * k + 16, 116, 'soft', 2);
  s += PG(left.map(m0), 'paper') + PG(left.map(m0), 'ink');
  s += PG(right.map(m1), 'paper') + PG(right.map(m1), 'ink');
  if (st === 'shorten') { s += L(...m0([su, LS - amt]), ...m0([iu + 0.3, LS - amt]), 'fold'); }
  s += lsLine(...m0([su, LS]), ...m0([iu, LS]), st === 'mark' ? 'hi' : 'ink');
  if (st === 'lengthen') {
    s += L(...m0([su, LS]), ...m1([su, LS]), 'hi') + L(...m0([iu, LS]), ...m1([iu, LS]), 'hi');
    s += dim(m0([0, LS])[0], 150, m1([0, LS])[0], 150, len(amt), 0);
    s += lab(190, 186, 'Spread, tape paper behind, redraw the edges', { anchor: 'middle', hi: true, size: 12 });
  }
  if (st === 'shorten') {
    s += dim(m0([0, LS - amt])[0], 150, m0([0, LS])[0], 150, len(amt), 0);
    s += lab(190, 186, 'Fold up so the lines meet, tape, redraw', { anchor: 'middle', hi: true, size: 12 });
  }
  if (st === 'mark') s += lab(m0([0, LS])[0], 150, 'Lengthen/shorten line', { anchor: 'middle', hi: true, size: 12 }) + T(m0(p.mid)[0] - 60, m0(p.mid)[1] + 4, 'Front', 'lab', 'middle');
  if (st === 'hem') {
    const a = m0(p.sh), b = m0(p.ih);
    s += P(`M${f(a[0])} ${f(a[1])}H${f(a[0] + amt * k)}V${f(b[1])}H${f(b[0])}`, 'hi');
    s += dim(a[0], 150, a[0] + amt * k, 150, len(amt), 0);
    s += lab(190, 186, 'Straight legs: add the length at the hem', { anchor: 'middle', hi: true, size: 12 });
  }
  s += T(26, 16, 'Waist', 'lab-s') + T(m1(p.sh)[0], 16, 'Hem', 'lab-s', 'end');
  return svg(380, 196, s, 'Changing the length');
}

// ======================================================================
// Nap and one-way prints. kind pile|shade|print
// ======================================================================
function l4Nap(o = {}) {
  const k = o.kind || 'pile'; let s = '';
  if (k === 'pile') {
    s += R(20, 30, 340, 120, 'fab-r', 6);
    for (let y = 42; y < 146; y += 9) for (let x = 30 + (y % 18 ? 5 : 0); x < 352; x += 11) s += L(x, y, x + 6, y + 5, 'soft');
    s += arrow(60, 60, 320, 60, true) + lab(190, 52, 'Smooth: with the nap', { anchor: 'middle', hi: true, size: 12 });
    s += arrow(320, 122, 60, 122) + lab(190, 114, 'Rough: against the nap', { anchor: 'middle', hi: false, size: 12 });
    s += T(190, 172, 'Stroke the fabric both ways along the selvedge', 'lab-s', 'middle');
    return svg(380, 182, s, 'Finding the nap');
  }
  if (k === 'shade') {
    s += pantsFlat(110, 20, 1.0, { fillL: 'fab-r', fillR: 'fab-r2', mini: true });
    s += arrow(134, 70, 134, 150) + arrow(186, 150, 186, 70);
    s += lab(104, 96, 'Nap down', { anchor: 'end', hi: false, size: 12 }) + lab(216, 96, 'Nap up', { hi: false, size: 12 });
    s += lab(216, 120, 'Looks like a', { hi: false, size: 12 }) + lab(216, 140, 'different color', { hi: false, size: 12 });
    return svg(380, 198, s, 'Nap pointing two ways');
  }
  // one-way print
  const tree = (x, y, up) => at(x, y, PG([[0, -7], [6, 4], [-6, 4]], 'ink-f') + L(0, 4, 0, 8), up ? 0 : 180);
  const spots = (x0, flipR) => { let g = ''; for (let y = 30; y <= 160; y += 26) [16, 34, 66, 84].forEach(x => { if (y < 70 || x < 48 || x > 52) g += tree(x0 + x * 0.95, 22 + y * 0.95, !(flipR && x > 50)); }); return g; };
  s += pantsFlat(40, 22, 0.95, { fill: 'fab-r', mini: true }) + spots(40, false);
  s += pantsFlat(240, 22, 0.95, { fill: 'fab-r', mini: true }) + spots(240, true);
  s += lab(88, 200, 'All one way', { anchor: 'middle', hi: true, size: 12 }) + lab(288, 200, 'One leg upside down', { anchor: 'middle', hi: false, size: 12 });
  return svg(380, 210, s, 'One-way print');
}

// ======================================================================
// Cutting layouts. mode fold|nap|single|cross|pants (nap: true keeps pants waists one way)
// ======================================================================
const TOPF = [[0, 3.5], [4, 0], [10, 1.5], [10.5, 7], [12, 9], [12.5, 26], [0, 26]];
const TOPB = [[0, 1], [4, 0], [10, 1.5], [10.5, 7.5], [12, 9], [12.5, 26], [0, 26]];
const SLV = [[0, 6], [3, 2.5], [8, 0], [13, 2.5], [16, 6], [14.5, 11], [1.5, 11]];
function l4Layout(o = {}) {
  const mode = o.mode || 'fold';
  const P0 = { fold: [22.5, 68], nap: [22.5, 68], pants: [22.5, 90], single: [45, 90], cross: [45, 46] }[mode];
  const [FW, LEN] = P0, k = Math.min(350 / LEN, (mode === 'cross' || mode === 'single' ? 160 : 130) / FW);
  const fx = 20, fy = 34, X = v => fx + v * k, Y = u => fy + u * k;
  const folded = mode !== 'single';
  let s = R(fx, fy, LEN * k, FW * k, folded ? 'fab-w' : 'fab-r');
  // edges
  if (mode === 'cross') { s += L(X(LEN), fy, X(LEN), Y(FW), 'fold') + rtext(X(LEN) + 12, Y(FW / 2), 'Fold', 'lab-s', 90) + T(fx, fy - 8, 'Selvedges', 'lab-s') + T(fx, Y(FW) + 16, 'Selvedges', 'lab-s'); }
  else if (folded) { s += L(fx, Y(FW), X(LEN), Y(FW), 'fold') + T(fx, fy - 8, 'Selvedges', 'lab-s') + T(fx, Y(FW) + 16, 'Fold', 'lab-s'); }
  else s += T(fx, fy - 8, 'Selvedge', 'lab-s') + T(fx, Y(FW) + 16, 'Selvedge', 'lab-s');
  const piece = (pts, pl, name, grainU, opts = {}) => {
    // pl: {x, y, sx, sy}: X = x + sx*v, Y = y + sy*u
    const m = a => [X(pl.x + pl.sx * a[1]), Y(pl.y + pl.sy * a[0])];
    let g = typeof pts === 'string' ? `<path d="${pantD(PANT[pts], m)}" class="paper"/>` : PG(pts.map(m), 'paper');
    if (opts.flipped) g += typeof pts === 'string' ? dash(pantD(PANT[pts], m), 'ink', '5 3') : '';
    const vs = opts.v || [4, 20];
    if (opts.fold) { const a = m([0, vs[0]]), b = m([0, vs[1]]), a2 = m([2.5, vs[0]]), b2 = m([2.5, vs[1]]); g += L(...a2, ...b2) + arrow(...a2, a[0], a[1] - 2 * Math.sign(pl.sy), false) + arrow(...b2, b[0], b[1] - 2 * Math.sign(pl.sy), false); }
    else { const a = m([grainU, vs[0]]), b = m([grainU, vs[1]]); g += grainArrow(...a, ...b); }
    const c = m(opts.c || [grainU + 3.2, (vs[0] + vs[1]) / 2]);
    g += T(c[0], c[1] + 4, name, 'lab', 'middle');
    if (opts.top) { const t0 = m([opts.top[0], opts.top[1] + 6]), t1 = m([opts.top[0], opts.top[1] + 1]); g += arrow(...t0, ...t1, true); }
    return g;
  };
  if (mode === 'fold' || mode === 'nap') {
    const nap = mode === 'nap';
    s += piece(TOPF, { x: 1, y: FW, sx: 1, sy: -1 }, 'Front', 0, { fold: true, v: [6, 22], c: [6.5, 14], top: nap && [6.5, 0] });
    s += nap ? piece(TOPB, { x: 28, y: FW, sx: 1, sy: -1 }, 'Back', 0, { fold: true, v: [6, 22], c: [6.5, 14], top: [6.5, 0] })
      : piece(TOPB, { x: 54, y: FW, sx: -1, sy: -1 }, 'Back', 0, { fold: true, v: [6, 22], c: [6.5, 14] });
    s += piece(SLV, { x: 55, y: 1.5, sx: 1, sy: 1 }, 'Sleeve', 8, { v: [2, 10], c: [11.2, 6], top: nap && [8, -0.5] });
    s += lab(fx + LEN * k / 2, Y(FW) + 40, nap ? 'With nap: every top points the same way' : 'Without nap: pieces can turn head to toe', { anchor: 'middle', hi: true, size: 12 });
  }
  if (mode === 'pants') {
    s += piece('front', { x: 0.5, y: 1, sx: 1, sy: 1 }, 'Front', 4, { v: [16, 38], c: [10, 27] });
    s += o.nap ? piece('back', { x: 46, y: 1, sx: 1, sy: 1 }, 'Back', 4.5, { v: [16, 38], c: [11, 27] })
      : piece('back', { x: 89.5, y: 21.5, sx: -1, sy: -1 }, 'Back', 4.5, { v: [16, 38], c: [11, 27] });
  }
  if (mode === 'single') {
    s += piece('front', { x: 0.5, y: 1, sx: 1, sy: 1 }, 'Front', 4, { v: [16, 38], c: [10, 27] });
    s += piece('back', { x: 1.5, y: 18, sx: 1, sy: 1 }, 'Back', 4.5, { v: [16, 38], c: [11, 27] });
    s += piece('front', { x: 46, y: 15.8, sx: 1, sy: -1 }, 'Front, flipped', 4, { v: [16, 38], c: [10, 25], flipped: true });
    s += piece('back', { x: 47, y: 44.5, sx: 1, sy: -1 }, 'Back, flipped', 4.5, { v: [16, 38], c: [11, 25], flipped: true });
  }
  if (mode === 'cross') {
    s += piece('front', { x: 1, y: 1, sx: 1, sy: 1 }, 'Front', 4, { v: [16, 38], c: [10, 27] });
    s += piece('back', { x: 1.5, y: 18, sx: 1, sy: 1 }, 'Back', 4.5, { v: [16, 38], c: [11, 27] });
  }
  const yd = { fold: 1.875, nap: 1.875, pants: 2.5, single: 2.5, cross: 2.625 }[mode];
  const cap = mode === 'cross' ? `Folded across: uses ${ydStr(yd)} in all` : `Length: ${ydStr(yd)}` + (folded ? ' · folded' : ' · single layer');
  s += mode === 'cross' ? T(fx, Y(FW) + 34, cap, 'lab-s') : T(fx + LEN * k, Y(FW) + 16, cap, 'lab-s', 'end');
  const vh = Y(FW) + (mode === 'fold' || mode === 'nap' ? 52 : mode === 'cross' ? 42 : 26);
  return svg(f(Math.max(380, fx + LEN * k + 30)), f(vh), s, 'Cutting layout');
}

// ======================================================================
// Pinning, weights, and the grain check. mode pins|weights|grain
// ======================================================================
const SKIRT = 'M120 50Q190 60 260 50L300 196Q190 206 80 196Z';
function l4Pin(o = {}) {
  const mode = o.mode || 'pins'; let s = '';
  s += R(20, 24, 340, 190, 'fab-r') + R(350, 24, 10, 190, 'fab-w') + rtext(342, 119, 'Selvedge', 'lab-s', 90);
  s += P(SKIRT, 'paper') + P(SKIRT, 'ink') + grainArrow(190, 86, 190, 170, mode === 'grain');
  s += T(190, 128, 'Skirt front', 'lab-s', 'middle');
  if (mode === 'pins') {
    [[124, 64, 90], [160, 62, 90], [220, 62, 90], [256, 64, 90], [106, 110, 15], [92, 160, 15], [274, 110, 165], [288, 160, 165], [130, 184, -90], [190, 186, -90], [250, 184, -90], [130, 62, 45], [254, 62, 135]].forEach(([x, y, d]) => { s += pinG(x, y, d); });
    s += lab(190, 236, 'Pins inside the line, across the edge', { anchor: 'middle', hi: true, size: 12 });
  }
  if (mode === 'weights') {
    [[136, 74], [244, 74], [110, 176], [270, 176], [190, 184]].forEach(([x, y]) => { s += weightG(x, y); });
    s += lab(190, 236, 'Weights: nothing pierces the fabric', { anchor: 'middle', hi: true, size: 12 });
  }
  if (mode === 'grain') {
    s += dim(190, 86, 350, 86, len(6), -12) + dim(190, 170, 350, 170, len(6), 12);
    s += lab(190, 236, 'Measure to the selvedge at both ends', { anchor: 'middle', hi: true, size: 12 });
  }
  return svg(380, 244, s, 'Pinning a pattern');
}

// ======================================================================
// Cutting. mode shears|notch|curve
// ======================================================================
function l4Cut(o = {}) {
  const mode = o.mode || 'shears'; let s = '';
  if (mode === 'notch') {
    [['Cut them outward', 'out'], ['Or snip in a little', 'in']].forEach(([t, kind], i) => {
      const x = 20 + i * 180;
      s += R(x, 70, 160, 90, 'fab-r');
      if (kind === 'out') s += PG([[x + 70, 70], [x + 80, 58], [x + 90, 70]], 'fab-r') + L(x + 71, 70, x + 89, 70, 'fab-r');
      else s += L(x + 80, 70, x + 80, 84, 'hi');
      s += T(x + 80, 36, t, 'lab', 'middle');
      if (kind === 'in') s += dim(x + 100, 70, x + 100, 84, len(0.25) + ' or less', 10);
    });
    s += T(190, 180, 'Never snip as deep as the seam line', 'lab-s', 'middle');
    return svg(380, 190, s, 'Cutting notches');
  }
  if (mode === 'curve') {
    s += R(20, 20, 340, 170, 'fab-r') + P('M40 40H200C200 100 240 140 340 140V180H40Z', 'paper') + P('M40 40H200C200 100 240 140 340 140', 'hi');
    const pts = cubPts([[200, 40], [200, 100], [240, 140], [340, 140]], 8);
    pts.slice(1, -1).forEach(p => { s += C(p[0], p[1], 2.4, 'ink-f'); });
    s += lab(56, 100, 'Short cuts on tight curves', { hi: true, size: 12 }) + lab(56, 122, 'Walk around the table', { hi: false, size: 12 });
    return svg(380, 200, s, 'Cutting a curve');
  }
  s += R(20, 24, 340, 190, 'fab-r') + R(20, 200, 340, 14, 'metal2') + T(26, 230, 'Table', 'lab-s');
  s += P(SKIRT, 'paper') + P(SKIRT, 'ink') + P('M80 196L100 120', 'hi');
  s += shearsG(102, 112, -75, 1.25);
  s += lab(150, 140, 'Long, smooth cuts', { hi: true, size: 12 }) + lab(150, 162, 'Lower blade on the table', { hi: false, size: 12 });
  return svg(380, 238, s, 'Cutting out');
}

// ======================================================================
// Transferring marks. mode stack|wheel|chalk|tack|pin
// ======================================================================
function l4Transfer(o = {}) {
  const mode = o.mode || 'wheel'; let s = '';
  if (mode === 'stack') {
    const rows = [[44, 'paper', 'Pattern'], [62, 'carbonD', 'Tracing paper, color down'], [82, 'fw', 'Fabric, wrong side up'], [96, 'fr', 'Fabric, wrong side down'], [116, 'carbonU', 'Tracing paper, color up'], [138, 'table', 'Table']];
    rows.forEach(([y, kind, t]) => {
      if (kind === 'paper') s += R(30, y, 190, 5, 'paper');
      if (kind === 'carbonD') s += R(30, y, 190, 4, 'metal2') + L(30, y + 5, 220, y + 5, 'thread');
      if (kind === 'carbonU') s += L(30, y - 1, 220, y - 1, 'thread') + R(30, y, 190, 4, 'metal2');
      if (kind === 'fw') s += R(30, y, 190, 4, 'fab-w') + R(30, y + 4, 190, 4, 'fab-r');
      if (kind === 'fr') s += R(30, y, 190, 4, 'fab-r') + R(30, y + 4, 190, 4, 'fab-w');
      if (kind === 'table') s += R(20, y, 210, 10, 'metal');
      s += T(234, y + 6, t, 'lab-s');
    });
    s += wheelG(120, 34, -40) + T(30, 170, 'Side view: the color lands on both wrong sides', 'lab-s');
    return svg(380, 180, s, 'Layers for a tracing wheel');
  }
  if (mode === 'tack') {
    const st = o.step || 1;
    if (st === 1) {
      s += R(30, 60, 320, 90, 'fab-w') + C(190, 105, 4, 'hi-dot');
      s += P('M150 105C150 60 186 60 188 103M192 103C194 60 230 60 230 105', 'thread') + P('M150 105L120 140M230 105L262 140', 'thread');
      s += lab(190, 40, 'Loose loop through both layers at the dot', { anchor: 'middle', hi: true, size: 12 });
      s += T(30, 170, 'Doubled thread, no knot, long tails', 'lab-s');
      return svg(380, 180, s, "Tailor's tack, step 1");
    }
    s += R(30, 40, 320, 10, 'fab-w') + R(30, 120, 320, 10, 'fab-w');
    [176, 184, 192, 200].forEach(x => { s += L(x, 50, x + (x - 188) * 0.3, 120, 'thread'); });
    s += L(150, 85, 230, 85, 'hi') + shearsG(250, 85, 180, 0.6);
    s += lab(190, 172, 'Pull the layers apart, snip between', { anchor: 'middle', hi: true, size: 12 });
    s += T(30, 30, 'Top layer', 'lab-s') + T(30, 146, 'Bottom layer', 'lab-s');
    return svg(380, 182, s, "Tailor's tack, step 2");
  }
  if (mode === 'pin') {
    s += R(30, 70, 320, 8, 'fab-w') + R(30, 78, 320, 8, 'fab-r') + R(30, 92, 320, 8, 'fab-r') + R(30, 100, 320, 8, 'fab-w');
    s += L(190, 40, 190, 130, 'ink') + C(190, 36, 5, 'thread-f');
    s += L(176, 66, 204, 66, 'hi') + L(176, 112, 204, 112, 'hi');
    s += lab(212, 34, 'Chalk where the pin', { hi: true, size: 12 }) + lab(212, 54, 'comes out', { hi: false, size: 12 }) + lab(212, 136, 'Same on the bottom', { hi: false, size: 12 });
    s += T(30, 160, 'Side view: pin straight down through the dot', 'lab-s');
    return svg(380, 170, s, 'Marking with a pin and chalk');
  }
  // wheel or chalk: the skirt front with a waist dart, wrong side of the fabric showing
  const chalk = mode === 'chalk';
  s += R(20, 24, 340, 190, 'fab-w');
  if (!chalk) s += P(SKIRT, 'paper') + P(SKIRT, 'ink');
  const legs = chalk ? 'M150 56L160 120L170 57' : 'M150 56L160 120L170 57';
  s += P(legs, 'hi', 'stroke-dasharray="1 5"');
  if (chalk) { s += C(150, 56, 3, 'ink-f') + C(170, 57, 3, 'ink-f') + C(160, 120, 4, 'ink-f') + chalkG(166, 100, 60) + lab(196, 140, 'Join the dots with chalk', { hi: true, size: 12 }) + T(26, 232, 'Pattern off, wrong side up', 'lab-s'); }
  else s += wheelG(166, 92, -60) + lab(196, 140, 'Roll along the dart lines', { hi: true, size: 12 }) + lab(196, 162, 'Use a ruler for straight ones', { hi: false, size: 12 }) + T(26, 232, 'Tracing paper is under the fabric', 'lab-s');
  return svg(380, 240, s, chalk ? 'Marking with chalk' : 'Marking with a tracing wheel');
}

// ======================================================================
// The instruction sheet. part overview|key|abbr, hi section
// ======================================================================
function l4Instr(o = {}) {
  const part = o.part || 'overview'; let s = '';
  if (part === 'key') {
    const items = [['fab-r', 'Right side'], ['fab-w', 'Wrong side'], ['fab-l', 'Lining'], ['metal2', 'Interfacing'], ['paper', 'Pattern']];
    items.forEach(([c, t], i) => { const x = 16 + i * 72; s += R(x, 30, 60, 44, c, 4) + T(x + 30, 92, t, 'lab-s', 'middle'); });
    s += T(16, 20, 'A sample key (yours may use other shading)', 'lab-s');
    s += T(190, 120, "Notch diagrams use the same idea:", 'lab-s', 'middle') + T(190, 134, 'dotted = right side, striped = wrong side', 'lab-s', 'middle');
    return svg(380, 142, s, 'Instruction sheet key');
  }
  if (part === 'abbr') {
    const ab = [['RS', 'right side'], ['WS', 'wrong side'], ['RST', 'right sides together'], ['SA', 'seam allowance'], ['CF', 'center front'], ['CB', 'center back'], ['WOF', 'width of fabric'], ['SS', 'side seam']];
    s += R(14, 10, 352, 176, 'paper', 8);
    ab.forEach(([a, d], i) => { const x = i < 4 ? 30 : 200, y = 44 + (i % 4) * 36; s += T(x, y, a, 'lab') + T(x + 40, y, d, 'lab-s'); });
    return svg(380, 194, s, 'Abbreviations');
  }
  s += R(14, 6, 352, 252, 'paper', 8);
  const sec = { pieces: [22, 14, 166, 92, 'Pattern pieces'], layouts: [194, 14, 164, 92, 'Cutting layouts'], key: [22, 112, 166, 50, 'Key'], abbr: [194, 112, 164, 50, 'Abbreviations'], steps: [22, 168, 336, 84, 'Sewing steps'] };
  Object.entries(sec).forEach(([k, [x, y, w, h, t]]) => { s += T(x + 8, y + 18, t, 'lab'); if (has(o, k)) s += R(x, y, w, h, 'hi', 8); });
  // thumbnails
  [[34, 'front'], [70, 'back']].forEach(([x, p]) => { s += `<path d="${pantD(PANT[p], a => [x + a[0] * 1.6, 48 + (a[1] + 1) * 1.2])}" class="paper"/>` + `<path d="${pantD(PANT[p], a => [x + a[0] * 1.6, 48 + (a[1] + 1) * 1.2])}" class="thin"/>`; });
  s += R(112, 50, 26, 12, 'thin', 1) + P('M146 46H170V64L158 70L146 64Z', 'thin') + R(112, 76, 60, 4, 'thin', 1);
  [[1, 45, 82], [2, 82, 82], [3, 125, 46], [4, 158, 42], [5, 142, 92]].forEach(([n, x, y]) => { s += T(x, y, String(n), 'lab-s', 'middle'); });
  // layout thumb
  s += R(204, 42, 144, 50, 'fab-w') + L(204, 92, 348, 92, 'fold') + `<path d="${pantD(PANT.front, a => [206 + a[1] * 1.5, 44 + a[0] * 1.5])}" class="paper"/>` + `<path d="${pantD(PANT.back, a => [346 - a[1] * 1.5, 90 - a[0] * 1.5])}" class="paper"/>`;
  // key swatches
  s += R(32, 138, 30, 16, 'fab-r', 2) + R(70, 138, 30, 16, 'fab-w', 2) + R(108, 138, 30, 16, 'metal2', 2) + R(146, 138, 30, 16, 'paper', 2);
  // abbreviation lines
  ['RS', 'WS', 'SA'].forEach((a, i) => { s += T(204 + i * 50, 150, a, 'lab-s') + R(224 + i * 50, 145, 18, 3, 'soft-f', 1.5); });
  // steps
  [1, 2, 3, 4].forEach(i => { const x = 32 + (i - 1) * 82; s += R(x, 194, 72, 50, 'card-f', 6) + R(x, 194, 72, 50, 'soft', 6) + T(x + 8, 210, String(i), 'lab') + R(x + 22, 204, 40, 3, 'soft-f', 1.5) + R(x + 22, 211, 30, 3, 'soft-f', 1.5) + R(x + 14, 222, 44, 16, i % 2 ? 'fab-r' : 'fab-w', 2); });
  return svg(380, 264, s, 'Instruction sheet');
}

// ======================================================================
// Technical flats (line drawings). kind top|pants, hi feature list
// ======================================================================
function l4Flat(o = {}) {
  const kind = o.kind || 'top'; let s = '';
  if (kind === 'pants') {
    s += pantsFlat(30, 14, 1.0, {}) + pantsFlat(240, 14, 1.0, { patch: true });
    s += T(80, 204, 'Front', 'lab', 'middle') + T(290, 204, 'Back', 'lab', 'middle');
    const feat = { elastic: [30, 'Elastic waist', 30], crotch: [30, 'Crotch seam', 78], inseam: [30, 'Inseam', 126], hem: [30, 'Hem stitching', 174], patch: [240, 'Patch pocket', 54] };
    asArr(o.hi).forEach(k => { const ft = feat[k]; if (!ft) return; const p = PF_PT[k]; s += co12(ft[0] + p[0], 14 + p[1], 185, ft[2], ft[1]); });
    return svg(380, 214, s, 'Line drawing of pants');
  }
  const ox1 = 10, ox2 = 284, oy = 14;
  const top = (ox, back) => {
    const Xp = (x, y) => `${f(ox + x)} ${f(oy + y)}`;
    let g = '';
    const sl = (sx) => sx > 0 ? `M${Xp(130, 20)}L${Xp(152, 54)}L${Xp(132, 64)}L${Xp(122, 50)}Q${Xp(120, 34)} ${Xp(130, 20)}Z` : `M${Xp(20, 20)}L${Xp(-2, 54)}L${Xp(18, 64)}L${Xp(28, 50)}Q${Xp(30, 34)} ${Xp(20, 20)}Z`;
    g += P(sl(1), 'body') + P(sl(-1), 'body');
    const neck = back ? `Q${Xp(75, 17)} ${Xp(95, 10)}` : `Q${Xp(75, 30)} ${Xp(95, 10)}`;
    g += P(`M${Xp(55, 10)}${neck}L${Xp(130, 20)}Q${Xp(120, 34)} ${Xp(122, 50)}L${Xp(128, 160)}Q${Xp(75, 166)} ${Xp(22, 160)}L${Xp(28, 50)}Q${Xp(30, 34)} ${Xp(20, 20)}Z`, 'body');
    g += P(`M${Xp(24, 152)}Q${Xp(75, 158)} ${Xp(126, 152)}`, 'stitch');
    g += P(back ? `M${Xp(58, 15)}Q${Xp(75, 21)} ${Xp(92, 15)}` : `M${Xp(58, 15)}Q${Xp(75, 33)} ${Xp(92, 15)}`, 'stitch');
    if (!back) { g += L(ox + 27.3, oy + 74, ox + 52, oy + 80, 'thin') + L(ox + 27.1, oy + 86, ox + 52, oy + 80, 'thin'); g += L(ox + 122.7, oy + 74, ox + 98, oy + 80, 'thin') + L(ox + 122.9, oy + 86, ox + 98, oy + 80, 'thin'); }
    else { g += L(ox + 75, oy + 16, ox + 75, oy + 163, 'thin') + C(ox + 79, oy + 22, 2.6, 'ink') + P(`M${Xp(73, 18)}q-6 4 0 8`, 'thin'); }
    return g;
  };
  s += top(ox1, false) + top(ox2, true);
  s += T(ox1 + 75, 200, 'Front', 'lab', 'middle') + T(ox2 + 75, 200, 'Back', 'lab', 'middle');
  const feat = {
    shoulder: [ox1 + 112, oy + 15, 'Shoulder seam', 224, 26], armhole: [ox1 + 121, oy + 38, 'Armhole seam', 224, 66], side: [ox1 + 125, oy + 110, 'Side seam', 224, 118],
    dart: [ox1 + 40, oy + 80, 'Dart', 36, 232], topstitch: [ox1 + 75, oy + 157, 'Topstitching', 134, 232],
    cb: [ox2 + 75, oy + 110, 'Center back seam', 360, 232], button: [ox2 + 79, oy + 22, 'Button and loop', 224, 90],
  };
  asArr(o.hi).forEach(k => { const ft = feat[k]; if (ft) s += co12(ft[0], ft[1], ft[3], ft[4], ft[2]); });
  return svg(440, 242, s, 'Line drawing of a top');
}

// ======================================================================
// Pajama pants project. step pieces|inseam|nest|crotch|reinforce|elastic|join|done
// ======================================================================
function l4Pants(o = {}) {
  const st = o.step || 'pieces'; let s = '';
  if (st === 'pieces' || st === 'marks') {
    const k = 5.3, Fm = a => [40 + a[0] * k, 22 + (a[1] + 1) * k], Bm = a => [176 + a[0] * k, 22 + (a[1] + 1) * k];
    [['front', Fm, 1, 'Front'], ['back', Bm, 2, 'Back']].forEach(([n, m, nn, name]) => {
      const p = PANT[n];
      s += `<path d="${pantD(p, m)}" class="fab-r"/>`;
      const g1 = m([4.5, 15]), g2 = m([4.5, 38]); s += grainArrow(...g1, ...g2);
      const cp = crotchPts(p), i = 7, c = cp.map(m), nrm = normalAt(c, i, m(p.mid));
      s += notch(c[i][0], c[i][1], nrm[0], nrm[1], nn, st === 'marks' ? 'hi-dot' : 'ink-f');
      const kn = 26; s += notch(...m([sideU(p, kn), kn]), -1, 0, 1) + notch(...m([inseamU(p, kn), kn]), 1, 0, 1);
      s += lsLine(...m([sideU(p, 32), 32]), ...m([inseamU(p, 32), 32]));
      const t = m([n === 'back' ? 10.8 : 9.8, 22]); s += T(t[0], t[1], name, 'lab', 'middle') + T(t[0], t[1] + 15, 'Cut 2', 'lab-s', 'middle');
    });
    if (st === 'marks') s += lab(190, 290, 'Front crotch: 1 notch. Back crotch: 2 notches.', { anchor: 'middle', hi: true, size: 12 });
    else s += T(190, 290, 'Each piece is cut twice, for the left and right legs', 'lab-s', 'middle');
    return svg(380, 300, s, 'Pajama pants pieces');
  }
  if (st === 'inseam' || st === 'side') {
    const k = 5, F = PANT.front, Bk = PANT.back;
    const du = st === 'side' ? 0 : -2.6;
    const Fm = a => [110 + a[0] * k, 22 + (a[1] + 1) * k], Bm = a => [110 + (a[0] + du) * k, 22 + (a[1] + 1) * k];
    s += `<path d="${pantD(F, Fm)}" class="fab-r"/>` + `<path d="${pantD(Bk, Bm)}" class="fab-w"/>`;
    if (st === 'inseam') {
      const line = offsetPts([[Bk.cp[0], Bk.cp[1] + 0.3], Bk.ih].map(Bm), 0.625 * k, Fm(F.mid));
      s += PL(line, 'hi') + PL(line, 'stitch');
      s += callout(...Bm([inseamU(Bk, 30) - 0.6, 30]), 222, 160, 'Inseam');
      s += lab(222, 200, 'Back on top,', { hi: false, size: 12 }) + lab(222, 220, 'right sides together', { hi: false, size: 12 });
    } else {
      const line = offsetPts([Bk.w0, Bk.hip, Bk.sh].map(Bm), 0.625 * k, Fm(F.mid));
      s += PL(line, 'hi') + PL(line, 'stitch');
      s += callout(...Bm([sideU(Bk, 30) + 0.6, 30]), 222, 160, 'Side seam');
      s += lab(222, 200, 'Back on top,', { hi: false, size: 12 }) + lab(222, 220, 'right sides together', { hi: false, size: 12 });
    }
    return svg(380, 252, s, st === 'inseam' ? 'Sewing the inseam' : 'Sewing the side seam');
  }
  if (st === 'nest' || st === 'crotch' || st === 'reinforce') {
    const fr = [[150, 40], [150, 130], [165, 160], [200, 160]], bk = [[200, 160], [240, 160], [262, 128], [262, 28]];
    const d = 'M50 40H150C150 130 165 160 200 160C240 160 262 128 262 28H352V70L292 240H108L50 70Z';
    s += P(d, 'fab-w');
    if (st === 'nest') {
      const fi = offsetPts(cubPts(fr), -4, [60, 210]), bi = offsetPts(cubPts(bk), -4, [340, 210]);
      s += PG([...cubPts(fr), ...cubPts(bk).slice(1), ...bi.slice().reverse(), ...fi.slice().reverse()], 'fab-r');
      s += lab(200, 210, 'Right-side-out leg tucked inside', { anchor: 'middle', hi: true, size: 12 });
    }
    const fp = cubPts(fr), bp = cubPts(bk);
    const fs = offsetPts(fp, 9, [60, 210]), bs = offsetPts(bp, 9, [340, 210]);
    if (st !== 'nest') s += PL([...fs, ...bs.slice(1)], 'hi') + PL([...fs, ...bs.slice(1)], 'stitch');
    if (st === 'reinforce') {
      const f2 = offsetPts(fp, 5, [60, 210]).slice(9), b2 = offsetPts(bp, 5, [340, 210]).slice(0, 8);
      s += PL([...f2, ...b2.slice(1)], 'stitch');
      s += lab(200, 214, 'Second row in the curve', { anchor: 'middle', hi: true, size: 12 });
    }
    if (st === 'crotch') s += lab(200, 214, 'One seam, front waist to back waist', { anchor: 'middle', hi: true, size: 12 });
    s += T(100, 30, 'Front waist', 'lab-s', 'middle') + T(307, 18, 'Back waist', 'lab-s', 'middle');
    s += callout(200, 160, 200, 188, 'Inseams meet here', 'middle');
    return svg(380, 250, s, 'Crotch seam');
  }
  if (st === 'elastic') {
    s += R(20, 60, 340, 56, 'fab-r') + L(20, 60, 360, 60, 'ink') + T(24, 52, 'Casing, inside view', 'lab-s');
    s += L(110, 108, 360, 108, 'stitch') + L(20, 108, 60, 108, 'stitch');
    s += dash('M60 84H250', 'soft', '4 3') + dash('M60 94H250', 'soft', '4 3');
    s += R(30, 108, 34, 10, 'metal2', 2) + R(52, 84, 14, 34, 'metal2', 2);
    s += safetyPinG(250, 94, 0) + arrow(310, 89, 346, 89, true);
    s += lab(85, 142, 'Gap', { anchor: 'middle', hi: false, size: 12 }) + safetyPinG(26, 132, -30);
    s += lab(96, 168, 'Pin the far end so it cannot slip in', { hi: false, size: 12 }) + lab(190, 24, 'Push the pin through the casing', { anchor: 'middle', hi: true, size: 12 });
    return svg(380, 178, s, 'Threading the elastic');
  }
  if (st === 'join') {
    s += R(30, 60, 200, 30, 'metal2', 2) + R(170, 66, 180, 30, 'metal2', 2);
    s += P('M174 68L226 92M226 68L174 92M174 68V92M226 68V92', 'zig') + P('M174 80H226', 'zig');
    s += dim(170, 108, 230, 108, len(1), 0);
    s += lab(200, 40, 'Overlap the ends and zigzag them', { anchor: 'middle', hi: true, size: 12 });
    s += T(190, 140, 'Check that the elastic is not twisted first', 'lab-s', 'middle');
    return svg(380, 150, s, 'Joining the elastic');
  }
  // done
  s += pantsFlat(30, 16, 1.1, { fill: 'fab-r' });
  const X = p => [30 + p[0] * 1.1, 16 + p[1] * 1.1];
  s += callout(...X([70, 6]), 176, 34, 'Elastic casing') + callout(...X([50, 40]), 176, 80, 'Crotch seam') + callout(...X([48.6, 120]), 176, 140, 'Inseam') + callout(...X([80, 165]), 176, 190, 'Hem');
  return svg(380, 214, s, 'Finished pajama pants');
}

register({ l4Envelope, l4Views, l4Chart, l4Yardage, l4Ease, l4Piece, l4Mark, l4Multi, l4Trace, l4Length, l4Nap, l4Layout, l4Pin, l4Cut, l4Transfer, l4Instr, l4Flat, l4Pants });
