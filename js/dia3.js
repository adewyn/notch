// Diagrams used by level 3 (Fabric school). Shared helpers come from diagrams.js (H); see the top of that file.
import { register, H } from './diagrams.js';
const { svg, P, L, R, C, T, PL, PG, lab, callout, arrow, curveArrow, dim, smooth, len, f, asArr, fmtIn } = H;

// ---------- small helpers for this file ----------
const metric = () => len(1).endsWith('cm');
const lines = (x, y, arr, cls = 'lab-s', anchor = 'start', lh = 14) => arr.map((s, i) => T(x, y + i * lh, s, cls, anchor)).join('');
const sample = (fn, n = 48) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
// A ribbon of width w (number or function of 0..1) along a sampled path.
function band(pts, w, cls) {
  const A = [], B = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const ww = typeof w === 'function' ? w(i / (pts.length - 1)) : w;
    A.push([p[0] + nx * ww, p[1] + ny * ww]); B.push([p[0] - nx * ww, p[1] - ny * ww]);
  });
  return PG([...A, ...B.reverse()], cls);
}
const at = (x, y, inner, rot = 0) => `<g transform="translate(${f(x)},${f(y)})${rot ? ` rotate(${rot})` : ''}">${inner}</g>`;
// Polygon helpers (for filling a garment shape with prints, without clip paths).
function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function xsAt(poly, y) {
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y)) xs.push(xi + (y - yi) * (xj - xi) / (yj - yi));
  }
  return xs.sort((a, b) => a - b);
}
// Stripes inside a polygon at an angle (degrees), drawn as thick lines.
function stripes(poly, deg, gap, w, cls = 'ink', off = 0) {
  const r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
  const rot = ([x, y]) => [x * cs + y * sn, -x * sn + y * cs], back = ([x, y]) => [x * cs - y * sn, x * sn + y * cs];
  const q = poly.map(rot), ys = q.map(p => p[1]);
  let s = '';
  for (let y = Math.min(...ys) + off + gap / 2; y < Math.max(...ys); y += gap) {
    const xs = xsAt(q, y);
    for (let i = 0; i + 1 < xs.length; i += 2) { const a = back([xs[i], y]), b = back([xs[i + 1], y]); s += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" class="${cls}" style="stroke-width:${w};stroke-linecap:butt"/>`; }
  }
  return s;
}
const shift = (poly, dx, dy) => poly.map(([x, y]) => [x + dx, y + dy]);
const check = (x, y) => P(`M${x - 7} ${y}l5 6l10 -12`, 'hi');
const cross = (x, y) => P(`M${x - 6} ${y - 6}l12 12M${x + 6} ${y - 6}l-12 12`, 'hi');

// ======================================================================
// Fibers under a microscope. show: cotton | linen | wool | silk | rayon | synthetic, or a group:
// plant | animal | made | all. hi: one fiber to ring.
// ======================================================================
const FIB = {
  cotton: ['Cotton', ['From seed fluff', 'Flat and twisted']],
  linen: ['Linen', ['From flax stems', 'Long, with joints']],
  wool: ['Wool', ['From sheep fleece', 'Crimped and scaly']],
  silk: ['Silk', ['From cocoons', 'Long and smooth']],
  rayon: ['Rayon', ['From wood pulp', 'Smooth, grooved']],
  synthetic: ['Synthetics', ['Polyester, nylon', 'Smooth, even rods']],
};
function fiberArt(k) {
  let s = '';
  if (k === 'cotton') [[-32, -26, 30, -12], [-34, 0, 34, 10], [-28, 26, 30, 22]].forEach(([x1, y1, x2, y2], n) => {
    const pts = sample(t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * 6 + n) * 3]);
    s += band(pts, t => 1 + 4.5 * Math.abs(Math.cos(t * Math.PI * 3.5 + n)), 'skin');
  });
  if (k === 'linen') [[-36, -22, 36, -28], [-36, 2, 36, -2], [-36, 26, 36, 24]].forEach(([x1, y1, x2, y2], n) => {
    const pts = sample(t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    s += band(pts, 4, 'skin');
    for (let t = 0.12 + n * 0.05; t < 0.95; t += 0.24) { const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; s += L(x - 1.5, y - 6, x + 1.5, y + 6, 'thin'); }
  });
  if (k === 'wool') [-22, 4, 28].forEach((y0, n) => {
    const pts = sample(t => [-36 + 72 * t, y0 + Math.sin(t * Math.PI * 7 + n) * 5]);
    s += band(pts, 3.4, 'skin');
    for (let i = 3; i < pts.length - 2; i += 4) { const [x, y] = pts[i]; s += P(`M${f(x - 2)} ${f(y - 3)}L${f(x + 1)} ${f(y)}L${f(x - 2)} ${f(y + 3)}`, 'thin'); }
  });
  if (k === 'silk') [[-36, -20, -6], [-36, 2, 8], [-36, 24, -8]].forEach(([x0, y0, bend]) => {
    const pts = sample(t => [x0 + 72 * t, y0 + Math.sin(t * Math.PI) * bend]);
    s += band(pts, 2.4, 'skin');
  });
  if (k === 'rayon') [-22, 2, 26].forEach(y0 => {
    const pts = sample(t => [-36 + 72 * t, y0 + Math.sin(t * Math.PI * 1.4) * 3]);
    s += band(pts, 4.5, 'metal') + P(smooth(pts.filter((_, i) => i % 6 === 0).map(([x, y]) => [x, y - 1.5])), 'thin');
  });
  if (k === 'synthetic') [-22, 2, 26].forEach(y0 => {
    s += R(-34, y0 - 4, 66, 8, 'metal', 0) + C(32, y0, 4, 'metal2');
  });
  return s;
}
function l3Fibers(o = {}) {
  const groups = { plant: ['cotton', 'linen'], animal: ['wool', 'silk'], made: ['rayon', 'synthetic'], all: Object.keys(FIB) };
  const list = (groups[o.show] || asArr(o.show)).filter(k => FIB[k]);
  const cols = Math.min(3, list.length || 1), rows = Math.ceil(list.length / cols), cw = 120;
  let s = '';
  list.forEach((k, i) => {
    const inRow = Math.min(cols, list.length - Math.floor(i / cols) * cols);
    const x = (360 - inRow * cw) / 2 + (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * 172;
    s += R(x - 52, y + 10, 104, 96, 'paper', 16) + at(x, y + 58, fiberArt(k));
    if (o.hi === k) s += R(x - 55, y + 7, 110, 102, 'hi', 18);
    s += T(x, y + 126, FIB[k][0], 'lab', 'middle') + lines(x, y + 142, FIB[k][1], 'lab-s', 'middle');
  });
  return svg(360, rows * 172, s, 'Fibers up close: ' + list.map(k => FIB[k][0]).join(', '));
}

// Fibers are spun into yarn, and yarn is made into fabric. hi: 1 | 2 | 3
function weaveGrid(x0, y0, cols, rows, cell, over) {
  const th = cell * 0.72, g = (cell - th) / 2; let s = '';
  for (let j = 0; j < rows; j++) s += R(x0, y0 + j * cell + g, cols * cell, th, 'fab-r2', 2);
  for (let i = 0; i < cols; i++) s += R(x0 + i * cell + g, y0, th, rows * cell, 'fab-r', 2);
  for (let j = 0; j < rows; j++) {
    let i = 0;
    while (i < cols) {
      if (over(i, j)) { i++; continue; }
      let k = i; while (k < cols && !over(k, j)) k++;
      s += R(x0 + i * cell + g - 1.5, y0 + j * cell + g, (k - i - 1) * cell + th + 3, th, 'fab-r2', 2);
      i = k;
    }
  }
  return s;
}
const WEAVES = {
  plain: (i, j) => (i + j) % 2 === 0,
  twill: (i, j) => (i + j) % 4 < 2,
  satin: (i, j) => ((i - 2 * j) % 5 + 5) % 5 !== 0,
};
function l3Spin(o = {}) {
  let s = '';
  // 1 fibers
  [[20, 60, 70, 48], [28, 76, 92, 70], [24, 92, 84, 100], [40, 52, 96, 60], [34, 104, 100, 86]].forEach(([x1, y1, x2, y2], n) => {
    s += band(sample(t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * 7 + n) * 3], 24), 1.8, 'skin');
  });
  s += arrow(108, 78, 136, 78, o.hi === 2);
  // 2 yarn
  s += R(148, 68, 88, 20, 'skin', 10);
  for (let x = 152; x < 232; x += 8) s += L(x, 86, x + 8, 70, 'thin');
  s += arrow(244, 78, 272, 78, o.hi === 3);
  // 3 fabric
  s += weaveGrid(282, 36, 5, 5, 17, WEAVES.plain);
  [['Fibers', 60], ['Twisted into yarn', 192], ['Made into fabric', 324]].forEach(([t, x], i) => {
    s += o.hi === i + 1 ? lab(x, 148, t, { anchor: 'middle', size: 12 }) : T(x, 148, t, 'lab', 'middle');
  });
  return svg(380, 160, s, 'Fibers become yarn, yarn becomes fabric');
}

// ======================================================================
// Weaves: type plain | twill | satin | all
// ======================================================================
const WEAVE_TXT = {
  plain: ['Plain weave', ['Over 1, under 1', 'Firm, crisp, and strong', 'Often looks the same', 'on both sides', 'Poplin, lawn, canvas']],
  twill: ['Twill', ['Over 2, under 2, starting', 'one step over each row', 'Makes diagonal lines', 'Soft, drapes well', 'Denim, gabardine, chino']],
  satin: ['Satin weave', ['Threads float over 4', 'Smooth, shiny face', 'Slippery, snags easily', 'Satin, sateen,', 'charmeuse']],
};
function l3Weave(o = {}) {
  const t = o.type || 'all'; let s = '';
  if (t === 'all') {
    ['plain', 'twill', 'satin'].forEach((k, n) => {
      const x = 22 + n * 122;
      s += weaveGrid(x, 14, 6, 6, 16, WEAVES[k]);
      s += T(x + 48, 130, WEAVE_TXT[k][0], 'lab', 'middle') + T(x + 48, 146, WEAVE_TXT[k][1][n === 0 ? 0 : n === 1 ? 2 : 1], 'lab-s', 'middle');
    });
    return svg(380, 156, s, 'Plain, twill, and satin weaves');
  }
  const cell = 20, cols = 8, rows = 7, x0 = 16, y0 = 18;
  s += weaveGrid(x0, y0, cols, rows, cell, WEAVES[t]);
  if (t === 'twill') s += L(x0, y0 + 5.5 * cell, x0 + 5.5 * cell, y0, 'hi') + L(x0 + 2.5 * cell, y0 + rows * cell, x0 + cols * cell, y0 + 1.5 * cell, 'hi');
  if (t === 'satin') s += R(x0 + 2 * cell + 2, y0 + 2 * cell - 1, cell - 4, 4 * cell + 2, 'hi', 4);
  if (t === 'plain') s += R(x0 + 2 * cell - 1, y0 + 2 * cell - 1, 2 * cell + 2, 2 * cell + 2, 'hi', 4);
  s += lab(196, 34, WEAVE_TXT[t][0], { size: 13 }) + lines(196, 60, WEAVE_TXT[t][1]);
  s += T(16, 176, 'Green: lengthwise threads (warp). Tan: crosswise (weft).', 'lab-s');
  return svg(380, 184, s, WEAVE_TXT[t][0]);
}

// ======================================================================
// Fabric weight scale. hi: light | medium | heavy
// ======================================================================
function l3Weight(o = {}) {
  const x0 = 20, k = 340 / 14, X = oz => x0 + oz * k; let s = '';
  const bands = [['light', 0, 4, 'Light', 'paper', ['Chiffon', 'Voile', 'Lawn', 'Poplin']], ['medium', 4, 8, 'Medium', 'metal', ['Quilting cotton', 'Linen', 'Chambray', 'Wool crepe']], ['heavy', 8, 14, 'Heavy', 'metal2', ['Denim', 'Canvas', 'Coating wool', 'Upholstery']]];
  bands.forEach(([id, a, b, name, cls, ex]) => {
    const bh = { light: 8, medium: 15, heavy: 22 }[id];
    s += R(X(a), 68 - bh, (b - a) * k, bh, cls, 0);
    const cx = (X(a) + X(b)) / 2;
    s += o.hi === id ? lab(cx, 34, name, { anchor: 'middle', size: 12 }) : T(cx, 34, name, 'lab', 'middle');
    s += lines(cx, 126, ex, 'lab-s', 'middle');
  });
  const hiB = bands.find(b => b[0] === o.hi); if (hiB) { const bh = { light: 8, medium: 15, heavy: 22 }[hiB[0]]; s += R(X(hiB[1]) - 1, 66 - bh, (hiB[2] - hiB[1]) * k + 2, bh + 4, 'hi', 3); }
  [4, 8, 12].forEach(oz => {
    const g = Math.round(oz * 33.906 / 5) * 5, a = `${oz} oz/yd²`, b = `${g} g/m²`;
    s += L(X(oz), 68, X(oz), 76, 'ink') + T(X(oz), 90, metric() ? b : a, 'lab-s', 'middle') + T(X(oz), 103, metric() ? a : b, 'lab-s', 'middle');
  });
  return svg(380, 180, s, 'Fabric weight from light to heavy');
}

// ======================================================================
// Drape test: a circle of fabric over a glass. kind: stiff | medium | fluid (which to highlight)
// ======================================================================
function l3Drape(o = {}) {
  let s = '';
  const glasses = [['stiff', 64, 98, 58, 4, 5, 'Stiff', 'Stands out'], ['medium', 190, 124, 44, 6, 6, 'Medium', 'Soft folds'], ['fluid', 316, 152, 30, 9, 5, 'Fluid', 'Falls close']];
  glasses.forEach(([id, cx, hemY, hw, n, amp, name, sub]) => {
    s += R(cx - 22, 70, 44, 100, 'paper', 4) + L(cx - 34, 170, cx + 34, 170, 'soft');
    const hem = sample(t => [cx - hw + 2 * hw * t, hemY + amp * Math.abs(Math.sin(n * Math.PI * t))], n * 8);
    s += PG([[cx - 24, 70], ...hem, [cx + 24, 70]], 'fab-r');
    for (let i = 1; i < n; i++) { const t = i / n, x = cx - hw + 2 * hw * t; s += L(cx - 20 + 40 * t, 76, x, hemY - 2, 'soft'); }
    s += `<ellipse cx="${cx}" cy="70" rx="24" ry="5" class="fab-r"/>`;
    s += o.kind === id ? lab(cx, 196, name, { anchor: 'middle', size: 12 }) : T(cx, 196, name, 'lab', 'middle');
    s += T(cx, 214, sub, 'lab-s', 'middle');
  });
  return svg(380, 172, at(0, -50, s), 'Drape test over a glass');
}

// ======================================================================
// Hand: how a fabric feels, on five sliders. at: [0..1 x5], name
// ======================================================================
const HAND = [['Soft', 'Crisp'], ['Smooth', 'Textured'], ['Cool', 'Warm'], ['Slippery', 'Grippy'], ['Springy', 'Limp']];
function l3Hand(o = {}) {
  const top = o.name ? 40 : 14; let s = '';
  if (o.name) s += lab(20, 24, o.name, { size: 13 });
  HAND.forEach(([a, b], i) => {
    const y = top + 14 + i * 30;
    s += T(104, y + 4, a, 'lab', 'end') + L(116, y, 266, y, 'soft') + L(116, y - 5, 116, y + 5, 'soft') + L(266, y - 5, 266, y + 5, 'soft') + T(278, y + 4, b, 'lab');
    const v = o.at && o.at[i];
    if (v != null) s += C(116 + 150 * v, y, 7, 'hi-dot');
  });
  return svg(370, top + HAND.length * 30 + 4, s, 'Fabric hand');
}

// Weight vs drape grid. hi: tl | tr | bl | br
function l3Grid(o = {}) {
  let s = '';
  const Q = { tl: [70, 14, ['Organza', 'Poplin', 'Taffeta']], tr: [216, 14, ['Canvas', 'Denim', 'Duck']], bl: [70, 112, ['Chiffon', 'Rayon challis', 'Silk charmeuse']], br: [216, 112, ['Velvet', 'Wool crepe', 'Sweater knit']] };
  Object.entries(Q).forEach(([k, [x, y, ex]]) => {
    s += R(x, y, 140, 92, o.hi === k ? 'hi-f' : 'paper', 10) + lines(x + 70, y + 32, ex, o.hi === k ? 'lab' : 'lab-s', 'middle', 18);
  });
  s += arrow(70, 222, 356, 222) + T(70, 240, 'Lighter', 'lab-s') + T(356, 240, 'Heavier', 'lab-s', 'end');
  s += arrow(52, 204, 52, 18) + T(46, 30, 'Crisp', 'lab-s', 'end') + T(46, 200, 'Fluid', 'lab-s', 'end');
  return svg(366, 248, s, 'Weight and drape are different things');
}

// ======================================================================
// Same garment, two fabrics. kind: aline | gathered | bias. hi: crisp | fluid
// ======================================================================
function l3Silhouette(o = {}) {
  const k = o.kind || 'aline'; let s = '';
  const SK = {
    aline: { crisp: [[34, 118], [74, 204], 3, 3], fluid: [[25, 160], [52, 214], 7, 5] },
    gathered: { crisp: [[70, 112], [76, 202], 7, 6], fluid: [[30, 150], [42, 214], 11, 4] },
    bias: { crisp: [[46, 140], [72, 204], 5, 8], fluid: [[24, 170], [64, 214], 8, 7] },
  }[k] || {};
  const forms = [['crisp', 98, 'fab-r', 'Crisp fabric', 'Holds its own shape'], ['fluid', 276, 'fab-r2', 'Fluid fabric', 'Falls along the body']];
  forms.forEach(([id, cx, cls, name, sub]) => {
    const [hip, hem, n, amp] = SK[id];
    // stand and form
    s += L(cx, 210, cx, 236, 'ink') + L(cx - 20, 236, cx + 20, 236, 'ink');
    s += R(cx - 4, 8, 8, 14, 'metal2', 2);
    s += P(smooth([[cx - 10, 20], [cx - 34, 30], [cx - 36, 58], [cx - 26, 94], [cx + 26, 94], [cx + 36, 58], [cx + 34, 30], [cx + 10, 20]], true), 'body');
    // skirt
    const waistY = 92, hemY = hem[1], hw = hem[0];
    const hemPts = sample(t => [cx - hw + 2 * hw * t, hemY + amp * Math.abs(Math.sin(n * Math.PI * t))], n * 8);
    const p0 = [cx - 26, waistY], p1 = [cx - hip[0], hip[1]], p2 = hemPts[0];
    const L1 = sample(t => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; }, 16);
    const Rr = L1.map(([x, y]) => [2 * cx - x, y]).reverse();
    s += PG([...L1, ...hemPts.slice(1, -1), ...Rr], cls);
    for (let i = 1; i < n; i++) { const t = i / n; s += P(`M${f(cx - 20 + 40 * t)} ${waistY + 6}Q${f(cx + (t - 0.5) * hip[0] * 2)} ${f(hip[1])} ${f(cx - hw + 2 * hw * t)} ${f(hemY - 2)}`, 'soft'); }
    s += L(cx - 26, waistY, cx + 26, waistY, 'ink');
    s += o.hi === id ? lab(cx, 256, name, { anchor: 'middle', size: 12 }) : T(cx, 256, name, 'lab', 'middle');
    s += T(cx, 272, sub, 'lab-s', 'middle');
  });
  return svg(374, 280, s, 'The same skirt in a crisp and a fluid fabric');
}

// ======================================================================
// Burn test. kind: setup | plant | animal | synthetic | blend
// ======================================================================
const tweezers = (x, y, len = 90, rot = 0) => at(x, y, PG([[0, -2], [len, -7], [len, -3], [4, 1]], 'metal') + PG([[0, 2], [len, 7], [len, 3], [4, -1]], 'metal'), rot);
const flame = (x, y, h = 30) => P(`M${x} ${y}C${x - 12} ${y - h * 0.3} ${x - 6} ${y - h * 0.7} ${x} ${y - h}C${x + 6} ${y - h * 0.7} ${x + 12} ${y - h * 0.3} ${x} ${y}Z`, 'hi-f');
const BURN = {
  plant: ['Cotton, linen, rayon', ['Burns fast and bright', 'May glow after it goes out'], ['Like burning paper or leaves'], ['Soft gray ash that crumbles']],
  animal: ['Wool, silk', ['Burns slowly, curls away', 'Often goes out by itself'], ['Like burning hair'], ['Crumbly black ash']],
  synthetic: ['Polyester, nylon', ['Melts and shrinks away', 'May drip: never touch it'], ['Sharp and chemical'], ['A hard bead that won\'t crush']],
  blend: ['A blend', ['A mix: some burning,', 'some melting'], ['Mixed smells'], ['Ash with hard bits in it']],
};
function l3Burn(o = {}) {
  const k = o.kind || 'setup'; let s = '';
  if (k === 'setup') {
    s += P('M16 184H270L262 200H24Z', 'metal');
    s += R(92, 134, 24, 50, 'paper', 3) + L(104, 134, 104, 126, 'ink') + flame(104, 124, 30);
    s += P('M178 156Q178 184 208 184Q238 184 238 156Z', 'paper') + L(178, 156, 238, 156, 'ink') + P('M186 166q6 -4 12 0t12 0t12 0', 'soft');
    s += tweezers(232, 58, 112, 157) + PG([[110, 92], [128, 96], [127, 100], [109, 96]], 'fab-r');
    s += callout(200, 74, 262, 50, 'Metal tweezers') + callout(118, 95, 262, 84, 'Tiny strip') + callout(208, 166, 262, 132, 'Water nearby');
    s += callout(94, 162, 18, 140, 'Candle') + callout(40, 192, 24, 226, 'Metal tray or sink');
    return svg(380, 236, s, 'Burn test setup');
  }
  const d = BURN[k];
  s += lab(16, 26, d[0], { size: 13 });
  s += tweezers(10, 80, 70) + PG([[78, 77], [118, 76], [118, 84], [78, 83]], 'fab-r') + flame(132, 132, 36);
  if (k === 'plant' || k === 'blend') { [[122, 76], [128, 82], [124, 88], [131, 74]].forEach(([x, y]) => { s += C(x, y, 3.2, 'soft-f'); }); s += P('M126 72q6 -8 2 -16q-4 -8 4 -14', 'soft') + P('M120 70q-4 -8 2 -14', 'soft'); }
  if (k === 'animal') s += P('M116 76Q128 70 126 82Q124 92 114 86', 'ink') + C(122, 80, 4, 'ink-f') + C(128, 86, 2.5, 'ink-f') + C(118, 88, 2, 'ink-f');
  if (k === 'synthetic' || k === 'blend') s += C(121, 80, 5.5, 'ink-f') + P('M121 86q-3 6 0 10q3 -4 0 -10Z', 'ink-f');
  s += T(176, 50, 'Flame', 'lab') + lines(176, 66, d[1]) + T(176, 106, 'Smell', 'lab') + lines(176, 122, d[2]) + T(176, 148, 'Leftover', 'lab') + lines(176, 164, d[3]);
  return svg(380, 176, s, 'Burn test: ' + d[0]);
}

// ======================================================================
// Care label symbols. show: list of ids. hi: list of ids. cols (default 4)
// ======================================================================
const tub = () => P('M-22 -8L-17 14H17L22 -8', 'ink') + P('M-24 -8q4 -5 8 0t8 0t8 0t8 0t8 0t8 0', 'ink');
const dots = (n, y = 4, gap = 7) => Array.from({ length: n }, (_, i) => C((i - (n - 1) / 2) * gap, y, 2, 'ink-f')).join('');
const tri = () => P('M0 -16L20 16H-20Z', 'ink');
const sq = () => R(-17, -17, 34, 34, 'ink', 2);
const ironS = () => P('M-22 14H20Q21 -6 4 -10H-10Q-18 -10 -20 2Z', 'ink') + P('M-8 -10Q-8 -18 0 -18H12', 'ink');
const circ = () => C(0, 0, 16, 'ink');
const no = () => L(-20, -18, 20, 18, 'ink') + L(20, -18, -20, 18, 'ink');
const CARE = {
  tub: [() => tub(), ['Washing']], tri: [() => tri(), ['Bleach']], sq: [() => sq(), ['Drying']], ironF: [() => ironS(), ['Ironing']], circ: [() => circ(), ['Dry clean']],
  wash1: [() => tub() + dots(1), ['Wash cold', '30 °C / 86 °F']],
  wash2: [() => tub() + dots(2), ['Wash warm', '40 °C / 104 °F']],
  wash3: [() => tub() + dots(3), ['Wash hot', '50 °C / 122 °F']],
  wash4: [() => tub() + dots(4, 4, 6), ['Wash hot', '60 °C / 140 °F']],
  hand: [() => tub() + P('M-8 10V0Q-8 -3 -5 -3V-6Q-5 -9 -2 -8Q-1 -11 2 -10Q4 -12 6 -9V2Q9 -2 11 0L5 10Z', 'ink'), ['Hand wash']],
  gentle: [() => tub() + dots(1) + L(-17, 20, 17, 20, 'ink'), ['Cold, gentle', 'cycle']],
  delicate: [() => tub() + dots(1) + L(-17, 19, 17, 19, 'ink') + L(-17, 23, 17, 23, 'ink'), ['Cold, very', 'gentle cycle']],
  nowash: [() => tub() + no(), ['Don\'t wash']],
  bleach: [() => tri(), ['Any bleach']],
  nonchlorine: [() => tri() + L(-4, 12, 4, -4, 'ink') + L(2, 12, 10, -4, 'ink'), ['Non-chlorine', 'bleach only']],
  nobleach: [() => tri() + no(), ['No bleach']],
  tumble: [() => sq() + C(0, 0, 12, 'ink'), ['Tumble dry']],
  tumble1: [() => sq() + C(0, 0, 12, 'ink') + dots(1, 0), ['Tumble dry', 'low heat']],
  tumble2: [() => sq() + C(0, 0, 12, 'ink') + dots(2, 0), ['Tumble dry', 'medium heat']],
  notumble: [() => sq() + C(0, 0, 12, 'ink') + no(), ['No dryer']],
  line: [() => sq() + P('M-17 -9Q0 6 17 -9', 'ink'), ['Line dry']],
  flat: [() => sq() + L(-10, 0, 10, 0, 'ink'), ['Dry flat']],
  drip: [() => sq() + L(-6, -9, -6, 9, 'ink') + L(0, -9, 0, 9, 'ink') + L(6, -9, 6, 9, 'ink'), ['Drip dry']],
  iron1: [() => ironS() + dots(1, 5), ['Iron cool', '110 °C / 230 °F']],
  iron2: [() => ironS() + dots(2, 5), ['Iron warm', '150 °C / 300 °F']],
  iron3: [() => ironS() + dots(3, 5), ['Iron hot', '200 °C / 390 °F']],
  noiron: [() => ironS() + no(), ['Don\'t iron']],
  dryclean: [() => circ(), ['Dry clean']],
  nodryclean: [() => circ() + no(), ['No dry clean']],
};
function l3Care(o = {}) {
  const list = asArr(o.show || ['tub', 'tri', 'sq', 'ironF', 'circ']).filter(k => CARE[k]), hi = new Set(asArr(o.hi));
  const cols = Math.min(o.cols || 4, list.length || 1), cw = 376 / (o.cols || 4), rows = Math.ceil(list.length / cols);
  const W = 380; let s = '';
  list.forEach((k, i) => {
    const inRow = Math.min(cols, list.length - Math.floor(i / cols) * cols);
    const x = (W - inRow * cw) / 2 + (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * 104;
    if (hi.has(k)) s += R(x - cw / 2 + 4, y + 4, cw - 8, 96, 'hi-f', 12);
    s += at(x, y + 36, CARE[k][0]());
    s += T(x, y + 76, CARE[k][1][0], 'lab', 'middle') + (CARE[k][1][1] ? T(x, y + 91, CARE[k][1][1], 'lab-s', 'middle') : '');
  });
  return svg(f(W), rows * 104, s, 'Care label symbols');
}

// ======================================================================
// Shrinkage test square: before and after. pct (default 5)
// ======================================================================
function l3Shrink(o = {}) {
  const p = o.pct == null ? 5 : o.pct, base = metric() ? 20 : 10, after = base * (1 - p / 100);
  const show = v => metric() ? `${+v.toFixed(1)} cm` : `${fmtIn(v)} in`;
  const S0 = 120, S1 = S0 * (1 - p / 100); let s = '';
  s += R(50, 36, S0, S0, 'fab-r') + dim(50, 36, 50 + S0, 36, show(base), -14);
  s += R(220, 36, S0, S0, 'fold') + R(220, 36, S1, S1, 'fab-r') + dim(220, 36, 220 + S1, 36, show(after), -14);
  s += T(110, 180, 'Before washing', 'lab', 'middle') + T(280, 180, 'After washing and drying', 'lab', 'middle');
  s += lab(190, 206, `Shrank ${p}%`, { anchor: 'middle', size: 12 });
  return svg(380, 216, s, 'Shrinkage test');
}

// Steam shrinking wool: iron held just above the fabric.
function l3Steam(o = {}) {
  let s = R(10, 120, 320, 10, 'fab-r', 2) + R(10, 130, 320, 6, 'metal', 2);
  s += at(108, 10, P('M14 88H96Q100 60 74 48H46Q34 48 30 60Z', 'metal') + P('M44 48Q46 30 60 30H84Q92 30 90 40L86 48', 'ink'));
  [130, 150, 170, 190].forEach((x, i) => { s += P(`M${x} 116q-5 -5 0 -10t0 -10`, 'soft'); });
  s += arrow(226, 82, 296, 82, true) + lab(264, 60, 'Glide just above', { anchor: 'middle', size: 12 });
  s += T(14, 152, 'Don\'t touch the fabric. Steam goes in, then let it dry flat.', 'lab-s');
  return svg(340, 160, s, 'Steam shrinking');
}

// Scrunch test: hold a corner in your fist, then let go.
function l3Scrunch(o = {}) {
  let s = R(24, 20, 140, 110, 'fab-r', 4) + R(206, 20, 140, 110, 'fab-r', 4);
  [[[34, 40], [70, 60], [100, 44], [150, 70]], [[30, 92], [74, 70], [110, 98], [156, 84]], [[60, 120], [80, 84], [126, 108]], [[44, 30], [60, 74], [40, 112]], [[120, 28], [104, 60], [140, 110]]].forEach(l => { s += PL(l, 'soft'); });
  s += P('M230 80q40 -6 90 4', 'soft');
  s += T(94, 152, 'Wrinkles stay', 'lab', 'middle') + T(94, 168, 'Linen, rayon, cotton', 'lab-s', 'middle');
  s += T(276, 152, 'Springs back', 'lab', 'middle') + T(276, 168, 'Wool, polyester', 'lab-s', 'middle');
  return svg(370, 176, s, 'Scrunch test');
}

// ======================================================================
// Swatch tiles by look. list: ids. labels: optional override. title
// ======================================================================
const SW = {
  cotton: 'Cotton', linen: 'Linen', denim: 'Denim', twill: 'Twill', satin: 'Satin', sheer: 'Chiffon', velvet: 'Velvet', plaid: 'Plaid', knit: 'Jersey knit',
  print: 'Small print', denimback: 'Denim back', white: 'White cotton', canvas: 'Canvas', wool: 'Wool flannel', sequin: 'Sequins', leather: 'Leather', loose: 'Loose weave', bigprint: 'Large print',
};
function swatchArt(k, w = 72, h = 60) {
  let s = '';
  const base = { satin: 'fab-r2', velvet: 'fab-r2', plaid: 'paper', sheer: 'paper', sequin: 'metal2', leather: 'skin', denimback: 'paper', white: 'paper', knit: 'fab-r', print: 'fab-r2', bigprint: 'fab-r2', loose: 'paper' }[k] || 'fab-r';
  if (k === 'sheer') s += R(-w / 2 - 8, 2, w + 16, 14, 'fab-r', 0);
  s += R(-w / 2, -h / 2, w, h, k === 'sheer' ? 'lab-bg2' : base, 4);
  if (k === 'sheer') s += R(-w / 2, -h / 2, w, h, 'soft', 4);
  if (k === 'linen') for (let y = -h / 2 + 8; y < h / 2 - 4; y += 9) s += P(`M${-w / 2 + 6} ${y}h14m6 0h20m5 0h16`, 'soft');
  if (k === 'denim' || k === 'twill' || k === 'denimback') for (let x = -w / 2 - h; x < w / 2; x += 8) { const x1 = Math.max(x, -w / 2), y1 = h / 2 - (x1 - x), x2 = Math.min(x + h, w / 2), y2 = h / 2 - (x2 - x); s += L(x1 + 1, y1 - 1, x2 - 1, y2 + 1, 'soft'); }
  if (k === 'satin') [-10, 0, 10].forEach(d => { s += P(`M${-w / 2 + 6} ${h / 2 - 14 + d}Q${-6} ${-6 + d} ${w / 2 - 6} ${-h / 2 + 14 + d}`, 'soft'); });
  if (k === 'velvet') for (let y = -h / 2 + 8; y < h / 2 - 2; y += 8) for (let x = -w / 2 + 6; x < w / 2 - 2; x += 8) s += L(x, y, x + 3, y + 4, 'soft');
  if (k === 'plaid') { [-18, 14].forEach(x => { s += R(x - 6, -h / 2, 12, h, 'fab-r', 0); }); [-12, 16].forEach(y => { s += R(-w / 2, y - 5, w, 10, 'fab-r2', 0); }); s += R(-w / 2, -h / 2, w, h, 'thin', 4); }
  if (k === 'knit') for (let y = -h / 2 + 10; y < h / 2 - 2; y += 11) for (let x = -w / 2 + 9; x < w / 2 - 2; x += 10) s += P(`M${x - 4} ${y - 4}Q${x - 5} ${y + 4} ${x} ${y + 4}Q${x + 5} ${y + 4} ${x + 4} ${y - 4}`, 'thin');
  if (k === 'print') for (let y = -h / 2 + 9; y < h / 2 - 3; y += 12) for (let x = -w / 2 + 9 + (Math.round(y) % 2 ? 0 : 5); x < w / 2 - 3; x += 12) s += C(x, y, 2.4, 'paper');
  if (k === 'bigprint') [[-16, -8, 13], [18, 12, 11]].forEach(([x, y, r]) => { s += C(x, y, r, 'paper') + C(x, y, r / 3, 'fab-r'); });
  if (k === 'canvas') { for (let y = -h / 2 + 5; y < h / 2; y += 5) s += L(-w / 2 + 1, y, w / 2 - 1, y, 'soft'); }
  if (k === 'wool') for (let i = 0; i < 14; i++) { const x = -w / 2 + 6 + (i * 37) % (w - 12), y = -h / 2 + 6 + (i * 23) % (h - 12); s += P(`M${x} ${y}q3 -3 5 0t5 0`, 'soft'); }
  if (k === 'sequin') for (let y = -h / 2 + 8; y < h / 2 - 2; y += 10) for (let x = -w / 2 + 8 + ((y + 30) % 20 ? 0 : 5); x < w / 2 - 2; x += 10) s += C(x, y, 4.2, 'metal');
  if (k === 'leather') s += P(`M${-w / 2 + 10} ${-6}q10 6 20 0M${4} ${12}q8 -5 18 2`, 'soft');
  if (k === 'loose') { for (let y = -h / 2 + 6; y < h / 2; y += 8) s += L(-w / 2 + 1, y, w / 2 - 1, y, 'thin'); for (let x = -w / 2 + 6; x < w / 2; x += 8) s += L(x, -h / 2 + 1, x, h / 2 - 1, 'thin'); s += P(`M${w / 2} ${-h / 2 + 10}l8 4m-8 12l9 -2m-9 14l7 5`, 'thin'); }
  return s;
}
function l3Swatches(o = {}) {
  const list = asArr(o.list).filter(k => SW[k]), labels = o.labels || [];
  const cols = Math.min(4, list.length || 1), rows = Math.ceil(list.length / cols), cw = 94, top = o.title ? 34 : 6;
  let s = o.title ? lab(14, 22, o.title, { size: 13 }) : '';
  list.forEach((k, i) => {
    const inRow = Math.min(cols, list.length - Math.floor(i / cols) * cols);
    const x = (380 - inRow * cw) / 2 + (i % cols) * cw + cw / 2, y = top + Math.floor(i / cols) * 100;
    s += at(x, y + 36, swatchArt(k)) + T(x, y + 84, labels[i] || SW[k], 'lab', 'middle');
  });
  return svg(380, top + rows * 100, s, 'Fabric swatches: ' + list.map((k, i) => labels[i] || SW[k]).join(', '));
}

// ======================================================================
// Prints: kind types | oneway | nap
// ======================================================================
const tree = (x, y, up = true, sc = 1) => at(x, y, PG([[0, -7], [6, 4], [-6, 4]], 'body') + L(0, 4, 0, 8, 'ink'), up === true ? 0 : typeof up === 'number' ? up : 180);
function treeField(x0, y0, w, h, mode, gap = 20) {
  let s = '', n = 0;
  for (let y = y0 + gap * 0.6, r = 0; y < y0 + h - 6; y += gap, r++) for (let x = x0 + gap * 0.55 + (r % 2 ? gap / 2 : 0); x < x0 + w - 6; x += gap, n++) {
    const rot = mode === 'oneway' ? 0 : mode === 'twoway' ? (r % 2 ? 180 : 0) : [0, 70, 160, 250, 320, 110, 200][n % 7];
    s += tree(x, y, rot);
  }
  return s;
}
function piece(x, y, w, h, up, cls = 'ink') {
  return R(x, y, w, h, cls, 2) + (up ? arrow(x + w / 2, y + h - 10, x + w / 2, y + 12, true) : arrow(x + w / 2, y + 12, x + w / 2, y + h - 10, true));
}
function l3Nap(o = {}) {
  const k = o.kind || 'types'; let s = '';
  if (k === 'types') {
    [['oneway', 'One-way', 'All face one way'], ['twoway', 'Two-way', 'Up and down'], ['tossed', 'Tossed', 'Any direction']].forEach(([m, name, sub], i) => {
      const x = 16 + i * 122;
      s += R(x, 10, 104, 96, 'fab-r', 4) + treeField(x, 10, 104, 96, m);
      s += T(x + 52, 128, name, 'lab', 'middle') + T(x + 52, 144, sub, 'lab-s', 'middle');
    });
    return svg(380, 152, s, 'One-way, two-way, and tossed prints');
  }
  const nap = k === 'nap';
  [[16, true, 'All pieces point one way'], [200, false, 'Upside-down piece']].forEach(([x, ok, cap]) => {
    s += R(x, 10, 164, 150, nap ? 'fab-r2' : 'fab-r', 2);
    if (nap) { for (let y = 20; y < 156; y += 10) for (let xx = x + 8; xx < x + 160; xx += 10) s += L(xx, y, xx + 2, y + 5, 'soft'); }
    else s += treeField(x, 10, 164, 150, 'oneway', 22);
    s += piece(x + 12, 22, 64, 126, true);
    if (ok) s += piece(x + 88, 22, 64, 126, true);
    else {
      s += R(x + 88, 22, 64, 126, nap ? 'fab-r' : 'fab-r', 2);
      if (nap) { for (let y = 30; y < 146; y += 10) for (let xx = x + 94; xx < x + 148; xx += 10) s += L(xx, y + 5, xx + 2, y, 'soft'); }
      else for (let y = 36; y < 146; y += 22) for (let xx = x + 99 + ((y / 22) % 2 ? 11 : 0); xx < x + 148; xx += 22) s += tree(xx, y, 180);
      s += R(x + 88, 22, 64, 126, 'hi', 2) + arrow(x + 120, 34, x + 120, 136, true);
    }
    s += (ok ? check(x + 12, 182) : cross(x + 12, 182)) + T(x + 28, 186, cap, 'lab');
    if (!ok && nap) s += T(x + 82, 204, 'It looks a different shade', 'lab-s', 'middle');
  });
  return svg(380, nap ? 212 : 196, s, nap ? 'Cutting fabric with a nap' : 'Cutting a one-way print');
}

// Print repeat along the length. r = repeat in inches (default 12)
function flower(x, y, r) {
  let s = '';
  for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; s += C(x + Math.cos(t) * r * 0.55, y + Math.sin(t) * r * 0.55, r * 0.45, 'skin'); }
  return s + C(x, y, r * 0.35, 'metal2');
}
function l3Repeat(o = {}) {
  const rep = o.r || 12; let s = R(14, 34, 352, 112, 'fab-r') + R(14, 34, 352, 8, 'fab-w') + R(14, 138, 352, 8, 'fab-w');
  [70, 190, 310].forEach(x => { s += flower(x, 80, 26); if (x < 300) s += flower(x + 60, 118, 12); });
  s += L(70, 80, 70, 160, 'hi') + L(190, 80, 190, 160, 'hi') + dim(70, 160, 190, 160, 'Repeat: ' + len(rep), 10);
  s += T(16, 26, 'Selvedge', 'lab-s');
  return svg(380, 186, s, 'Print repeat');
}

// ======================================================================
// Prints and color on the body. kind: scale | stripes | contrast
// ======================================================================
const DRESS = [[-12, 0], [-30, 4], [-28, 34], [-22, 72], [-30, 100], [-44, 168], [44, 168], [30, 100], [22, 72], [28, 34], [30, 4], [12, 0], [0, 12]];
function figure(cx, y0, fill) {
  const d = shift(DRESS, cx, y0);
  let s = C(cx, y0 - 16, 12, 'skin') + R(cx - 4, y0 - 6, 8, 10, 'skin', 2);
  s += PG([[cx - 30, y0 + 6], [cx - 40, y0 + 92], [cx - 33, y0 + 94], [cx - 26, y0 + 36]], 'skin') + PG([[cx + 30, y0 + 6], [cx + 40, y0 + 92], [cx + 33, y0 + 94], [cx + 26, y0 + 36]], 'skin');
  s += R(cx - 20, y0 + 166, 12, 24, 'skin', 3) + R(cx + 8, y0 + 166, 12, 24, 'skin', 3);
  s += PG(d, 'fab-r2') + fill(d) + PG(d, 'thin');
  return s;
}
function dotsIn(poly, r, gap) {
  let s = '', row = 0;
  const ys = poly.map(p => p[1]), xs = poly.map(p => p[0]);
  for (let y = Math.min(...ys) + r + 2; y < Math.max(...ys); y += gap, row++) for (let x = Math.min(...xs) + (row % 2 ? gap / 2 : 0); x < Math.max(...xs); x += gap) {
    const ok = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * .7, r * .7], [-r * .7, r * .7], [r * .7, -r * .7], [-r * .7, -r * .7]].every(([dx, dy]) => inside(poly, x + dx, y + dy));
    if (ok) s += r > 8 ? flower(x, y, r) : C(x, y, r, 'paper');
  }
  return s;
}
function bandIn(poly, y1, y2, cls) {
  const L1 = [], R1 = [];
  for (let y = y1; y <= y2; y += 2) { const xs = xsAt(poly, y); if (xs.length >= 2) { L1.push([xs[0], y]); R1.push([xs[xs.length - 1], y]); } }
  return PG([...L1, ...R1.reverse()], cls);
}
function l3Print(o = {}) {
  const k = o.kind || 'scale', y0 = 36; let s = '';
  const sets = {
    scale: [['Small', 'Reads as texture', d => dotsIn(d, 2, 8)], ['Medium', 'Reads as a pattern', d => dotsIn(d, 5, 16)], ['Large', 'Reads as shapes', d => dotsIn(d, 13, 36)]],
    stripes: [['Up and down', 'Eye runs up and down', d => stripes(d, 90, 12, 4)], ['Across', 'Eye runs across', d => stripes(d, 0, 12, 4)],
      ['Bias chevron', 'Points to the center', d => { const cx = d[12][0]; const left = [[cx, d[12][1]], ...d.slice(0, 6), [cx, d[5][1]]]; const right = left.map(([x, y]) => [2 * cx - x, y]); return stripes(left, 45, 12, 4) + stripes(right, -45, 12, 4); }]],
    contrast: [['One color', 'Eye takes it in whole', () => ''], ['Contrast at waist', 'Eye goes to the waist', d => bandIn(d, y0 + 64, y0 + 80, 'thread-f')], ['Contrast at neck', 'Eye goes to the face', d => bandIn(d, y0 + 13, y0 + 30, 'thread-f')]],
  }[k];
  sets.forEach(([name, sub, fill], i) => {
    const cx = 66 + i * 124;
    s += figure(cx, y0, fill);
    s += T(cx, y0 + 214, name, 'lab', 'middle') + T(cx, y0 + 230, sub, 'lab-s', 'middle');
  });
  return svg(380, y0 + 238, s, 'Prints and color on the body');
}

// ======================================================================
// A yardage chart from a pattern. hi: { row, col } (0-based)
// ======================================================================
function l3Chart(o = {}) {
  const sizes = [6, 8, 10, 12, 14, 16];
  const rowsIn = [[44, '', [2.25, 2.25, 2.375, 2.375, 2.5, 2.625]], [60, '', [1.625, 1.625, 1.75, 1.75, 1.875, 1.875]], [44, ', nap', [2.5, 2.5, 2.625, 2.625, 2.75, 2.875]]];
  const m = metric(), hi = o.hi || {};
  const yd = v => m ? (Math.ceil(v * 0.9144 * 10) / 10).toFixed(1) : fmtIn(v);
  const x0 = 10, lw = 100, cw = 44, rh = 30, y0 = 36; let s = '';
  s += T(x0, 22, m ? 'Fabric needed, in meters' : 'Fabric needed, in yards', 'lab');
  s += R(x0, y0, lw + cw * 6, rh * 4, 'paper', 8);
  for (let r = 1; r < 4; r++) s += L(x0, y0 + rh * r, x0 + lw + cw * 6, y0 + rh * r, 'soft');
  s += L(x0 + lw, y0, x0 + lw, y0 + rh * 4, 'soft');
  s += T(x0 + 10, y0 + 20, 'Size', 'lab');
  sizes.forEach((z, c) => { s += T(x0 + lw + cw * c + cw / 2, y0 + 20, String(z), 'lab', 'middle'); });
  rowsIn.forEach(([w, extra, vals], r) => {
    const y = y0 + rh * (r + 1);
    s += T(x0 + 10, y + 20, (m ? `${Math.round(w * 2.54 / 2) * 2 === 112 ? 112 : w === 60 ? 150 : Math.round(w * 2.54)} cm` : `${w} in`) + extra, 'lab-s');
    vals.forEach((v, c) => {
      const isHi = hi.row === r && hi.col === c, rowHi = hi.row === r && hi.col == null, colHi = hi.col === c && hi.row == null;
      if (isHi || rowHi || colHi) s += R(x0 + lw + cw * c + 2, y + 2, cw - 4, rh - 4, 'hi-f', 6);
      s += T(x0 + lw + cw * c + cw / 2, y + 20, yd(v), isHi ? 'lab' : 'lab-s', 'middle');
    });
  });
  if (hi.col != null) s += R(x0 + lw + cw * hi.col + 2, y0 + 2, cw - 4, rh - 4, 'hi', 6);
  return svg(384, y0 + rh * 4 + 8, s, 'Yardage chart');
}

// ======================================================================
// Interfacing. kind: types | glue | fuse (step 1-4)
// ======================================================================
const IRON = P('M14 88H96Q100 60 74 48H46Q34 48 30 60Z', 'metal') + P('M44 48Q46 30 60 30H84Q92 30 90 40L86 48', 'ink');
function l3Interfacing(o = {}) {
  const k = o.kind || 'types'; let s = '';
  if (k === 'types') {
    const cells = [['Woven', 'Has a grain'], ['Nonwoven', 'No grain'], ['Knit', 'Stretches a little']];
    cells.forEach(([name, sub], i) => {
      const x = 16 + i * 122, y = 10;
      s += R(x, y, 104, 90, 'paper', 4);
      if (i === 0) { for (let yy = y + 6; yy < y + 88; yy += 6) s += L(x + 2, yy, x + 102, yy, 'soft'); for (let xx = x + 6; xx < x + 102; xx += 6) s += L(xx, y + 2, xx, y + 88, 'soft'); }
      if (i === 1) for (let n = 0; n < 46; n++) { const xx = x + 8 + (n * 53) % 88, yy = y + 8 + (n * 31) % 74, a = (n * 47) % 180 * Math.PI / 180; s += L(xx, yy, xx + Math.cos(a) * 10, yy + Math.sin(a) * 10, 'soft'); }
      if (i === 2) for (let yy = y + 12; yy < y + 86; yy += 10) for (let xx = x + 10; xx < x + 100; xx += 9) s += P(`M${xx - 3} ${yy - 3}Q${xx - 4} ${yy + 3} ${xx} ${yy + 3}Q${xx + 4} ${yy + 3} ${xx + 3} ${yy - 3}`, 'soft');
      s += T(x + 52, 122, name, 'lab', 'middle') + T(x + 52, 138, sub, 'lab-s', 'middle');
    });
    return svg(380, 146, s, 'Woven, nonwoven, and knit interfacing');
  }
  const layers = (cloth) => {
    let g = R(20, 136, 340, 10, 'metal', 2) + R(30, 124, 320, 6, 'fab-w') + R(30, 130, 320, 6, 'fab-r');
    g += R(40, 112, 300, 6, 'paper') + Array.from({ length: 30 }, (_, i) => C(45 + i * 10, 120.5, 1.6, 'ink-f')).join('');
    if (cloth) g += R(24, 102, 332, 6, 'fab-l');
    return g;
  };
  if (k === 'glue') {
    s += layers(false) + arrow(190, 70, 190, 104, true);
    s += callout(300, 115, 300, 40, 'Interfacing', 'middle') + callout(110, 121, 92, 70, 'Glue side down', 'middle') + T(30, 164, 'Fabric, wrong side up, on the ironing board', 'lab-s');
    return svg(380, 172, s, 'Glue side of fusible interfacing');
  }
  const st = o.step || 1;
  s += layers(st >= 2);
  const head = ['1. Glue side down on the wrong side', '2. Pressing cloth on top', '3. Press and hold 10 to 15 seconds', '4. Let it cool before you move it'][st - 1];
  s += lab(16, 24, head, { size: 12 });
  if (st === 3) s += at(120, 14, IRON) + arrow(160, 50, 160, 64, true) + curveArrow('M236 56Q262 30 288 56', true) + lab(262, 90, 'Lift, move, overlap', { anchor: 'middle', hi: false, size: 12 });
  if (st === 4) s += [120, 190, 260].map(x => P(`M${x} 94q-5 -6 0 -12t0 -12`, 'soft')).join('');
  if (st === 1) s += T(30, 164, 'Fabric, wrong side up', 'lab-s');
  return svg(380, 172, s, 'Fusing interfacing, step ' + st);
}

// ======================================================================
// Swatch book. step: card | swatch | punch | book. Card is 6 x 4 in.
// ======================================================================
const FIELDS = ['Fiber', 'Weave', 'Weight', 'Drape', 'Burn', 'Care', 'Shrink'];
function pinkedSq(x, y, w, h, cls) {
  const z = 5; let d = `M${x} ${y}`;
  for (let xx = x; xx < x + w - 0.1; xx += z) d += `L${f(xx + z / 2)} ${f(y - 2.5)}L${f(xx + z)} ${y}`;
  for (let yy = y; yy < y + h - 0.1; yy += z) d += `L${f(x + w + 2.5)} ${f(yy + z / 2)}L${x + w} ${f(yy + z)}`;
  for (let xx = x + w; xx > x + 0.1; xx -= z) d += `L${f(xx - z / 2)} ${f(y + h + 2.5)}L${f(xx - z)} ${y + h}`;
  for (let yy = y + h; yy > y + 0.1; yy -= z) d += `L${f(x - 2.5)} ${f(yy - z / 2)}L${x} ${f(yy - z)}`;
  return P(d + 'Z', cls);
}
function card(x, y, k, st, title) {
  const X = v => x + v * k, Y = v => y + v * k;
  let s = R(X(0), Y(0), 6 * k, 4 * k, 'paper', 6) + C(X(0.5), Y(0.5), 0.125 * k, st === 'punch' ? 'hi-f' : 'card-f') + C(X(0.5), Y(0.5), 0.125 * k, 'soft');
  s += T(X(0.85), Y(0.62), title || 'Name', 'lab-s') + L(X(1.6), Y(0.66), X(2.6), Y(0.66), 'soft');
  FIELDS.forEach((t, i) => { const yy = Y(1.15 + i * 0.4); s += T(X(0.3), yy, t, 'lab-s') + L(X(1.1), yy + 2, X(2.6), yy + 2, 'soft'); });
  if (st === 'card' || st === 'punch') s += R(X(2.75), Y(0.5), 3 * k, 3 * k, 'fold', 2) + T(X(4.25), Y(2.1), 'Swatch goes here', 'lab-s', 'middle');
  else {
    s += pinkedSq(X(2.75), Y(0.5), 3 * k, 3 * k, 'fab-r');
    s += R(X(2.75), Y(0.5), 3 * k, 0.25 * k, st === 'swatch' ? 'hi-f' : 'fab-r2', 0);
  }
  return s;
}
function l3Swatch(o = {}) {
  const st = o.step || 'card'; let s = '';
  if (st === 'book') {
    const k = 40, rx = 40 + 0.5 * k, ry = 30 + 0.5 * k;
    [12, 6, 0].forEach(a => { s += `<g transform="rotate(${a} ${rx} ${ry})">${card(40, 30, k, 'book', a ? '' : 'Name')}</g>`; });
    s += `<ellipse cx="${rx}" cy="${ry - 6}" rx="9" ry="16" class="ink" style="stroke-width:3"/>`;
    s += callout(rx + 6, ry - 18, 120, 18, 'Binder ring') + callout(252, 150, 300, 228, 'Lift the swatch to see the back', 'end');
    return svg(380, 240, s, 'Finished swatch book');
  }
  const k = 48, x = 36, y = 28;
  s += card(x, y, k, st);
  s += dim(x, y + 4 * k, x + 6 * k, y + 4 * k, len(6), 14) + dim(x + 6 * k, y, x + 6 * k, y + 4 * k, len(4), -14);
  if (st === 'swatch') s += callout(x + 5.4 * k, y + 0.62 * k, x + 5.9 * k, y - 10, 'Glue only this strip', 'end');
  if (st === 'punch') s += callout(x + 0.5 * k, y + 0.5 * k, x + 1.3 * k, y - 8, 'Hole ' + len(0.5) + ' from both edges');
  return svg(f(x + 6 * k + 66), f(y + 4 * k + 34), s, 'Swatch card');
}

// Weighing a 10 cm square on a small scale.
function l3Weigh(o = {}) {
  const g = o.g || '1.5';
  let s = R(40, 110, 170, 40, 'metal', 8) + R(56, 120, 70, 22, 'paper', 4) + T(91, 136, g + ' g', 'lab', 'middle') + C(170, 131, 7, 'metal2');
  s += R(40, 96, 170, 14, 'metal2', 4) + PG([[70, 96], [180, 96], [188, 84], [62, 84]], 'fab-r');
  s += T(125, 72, '10 cm square', 'lab-s', 'middle');
  s += lab(226, 104, g + ' g × 100', { size: 12 }) + lab(226, 132, '= ' + Math.round(parseFloat(g) * 100) + ' g/m²', { size: 12 });
  return svg(380, 164, s, 'Weighing a swatch');
}

// The label on the end of a bolt. content, width (in), care
function l3Bolt(o = {}) {
  const w = o.width || 44, content = o.content || '100% cotton', care = o.care || 'Machine wash warm, tumble dry low';
  let s = R(20, 20, 64, 150, 'fab-r', 4) + R(30, 20, 44, 150, 'paper', 2) + R(20, 20, 64, 150, 'thin', 4);
  s += R(108, 28, 256, 134, 'paper', 10);
  const rows = [['Content', content], ['Width', `${w} in (${w === 60 ? 150 : w === 54 ? 137 : w === 44 ? 112 : Math.round(w * 2.54)} cm)`], ['Care', care]];
  rows.forEach(([a, b], i) => { s += T(124, 56 + i * 40, a, 'lab-s') + T(124, 72 + i * 40, b, 'lab'); });
  s += L(84, 95, 108, 95, 'soft');
  return svg(380, 180, s, 'Bolt end label');
}

register({ l3Fibers, l3Spin, l3Weave, l3Weight, l3Drape, l3Hand, l3Grid, l3Silhouette, l3Burn, l3Care, l3Shrink, l3Steam, l3Scrunch, l3Swatches, l3Nap, l3Repeat, l3Print, l3Chart, l3Interfacing, l3Swatch, l3Weigh, l3Bolt });
