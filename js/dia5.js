// Diagrams used by level 5 (garment skills). Shared helpers come from diagrams.js (H); see the top of that file.
// Every scene name starts with l5. Colors come only from the shared CSS classes.
import { register, H } from './diagrams.js';
const { svg, P, L, R, C, T, PL, PG, lab, callout, arrow, curveArrow, dim, smooth, len, f, asArr } = H;

// ---------- small helpers ----------
const lb = (x, y, s, hi = false, anchor = 'start') => lab(x, y, s, { anchor, hi, size: 12 });
const note = (x, y, s, anchor = 'start') => T(x, y, s, 'lab-s', anchor);
// Lengths: like len(), but small metric amounts keep millimeter care (1/8 in is 0.3 cm), matching the lesson text.
const isCm = () => len(1).endsWith('cm');
const ln = v => {
  if (!isCm()) return len(v);
  if (Math.abs(v - 0.625) < 1e-6) return '1.5 cm';
  const c = v * 2.54;
  return c < 2.5 ? `${+(Math.round(c * 10) / 10).toFixed(1)} cm` : len(v);
};
const DASH_LONG = 'style="stroke-dasharray:13 6"';          // basting (long stitches)
const DASH_GHOST = 'style="stroke-dasharray:3 4"';          // trimmed away / hidden
const baste = d => P(d, 'stitch', DASH_LONG);
const ghost = d => P(d, 'soft', DASH_GHOST);
const stitchHi = (d, hi = true) => (hi ? P(d, 'hi') : '') + P(d, 'stitch');
const vst = (x, y1, y2, hi = false) => (hi ? L(x, y1, x, y2, 'hi') : '') + L(x, y1, x, y2, 'stitch-s');
const pin = (x, y, deg = 0) => `<g transform="translate(${f(x)},${f(y)}) rotate(${deg})">${L(-14, 0, 12, 0, 'ink')}${C(-16, 0, 4, 'thread-f')}</g>`;
const knot = (x, y) => C(x, y, 4, 'thread-f') + C(x, y, 8, 'hi');

// ---------- cross-section helpers ----------
// A fabric layer is a ribbon along a centerline; each half is filled to show which face is which.
const seg = (x1, y1, x2, y2) => [[x1, y1], [x2, y2]];
const arcP = (cx, cy, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
function join(...parts) {
  const out = [];
  parts.flat().forEach(p => { const q = out[out.length - 1]; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.05) out.push(p); });
  return out;
}
function offs(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    return [p[0] - dy * d, p[1] + dx * d];
  });
}
// a = face on the left of travel (above, when travelling to the right); b = the other face.
function ply(pts, a, b, t = 4.5) {
  return PG([...pts, ...offs(pts, -t).reverse()], a) + PG([...pts, ...offs(pts, t).reverse()], b);
}
// interfacing: a thin paper strip on face a
const iface = (pts, t = 4.5) => PG([...offs(pts, -t), ...offs(pts, -t - 3.5).reverse()], 'paper');

// ======================================================================
// French seam (cross-section). step 1 sew wrong sides together, 2 trim, 3 fold and sew again, 4 pressed
// ======================================================================
function l5French(o = {}) {
  const st = o.step || 1, U = 144, E = 300; let s = '';
  // metric follows the lesson's note: 5 mm, then 1 cm (adds up to 1.5 cm)
  const fr1 = isCm() ? '0.5 cm' : ln(0.25), fr2 = isCm() ? '1 cm' : ln(0.375);
  if (st <= 2) {
    const xs = E - 0.25 * U, end = st === 1 ? E : xs + 0.125 * U;
    s += ply(seg(20, 96, end, 96), 'fab-r', 'fab-w') + ply(seg(20, 105, end, 105), 'fab-w', 'fab-r');
    if (o.pin) s += [110, 190, 260].map(x => pin(x, 101, 90)).join('');
    else if (st === 2) s += ghost(`M${f(end)} 91.5H${E}V109.5H${f(end)}`) + dim(xs, 120, end, 120, ln(0.125), 12);
    else s += dim(xs, 120, E, 120, fr1, 12);
    if (!o.pin) s += vst(xs, 82, 120, st === 1);
    s += note(24, 86, 'Right side') + note(24, 124, 'Right side');
    s += lb(20, 34, 'Wrong sides together', st === 1);
    s += lb(20, 176, o.pin ? 'Pin with the right sides outside' : st === 1 ? `Sew ${fr1} from the edge` : `Trim the seam allowance to ${ln(0.125)}`, true);
    return svg(340, 190, s, 'French seam, first pass');
  }
  if (st === 3) {
    const Ef = 290, xs = Ef - 0.375 * U;
    s += ply(join(seg(20, 96, Ef, 96), arcP(Ef, 105, 9, -90, 90), seg(Ef, 114, 20, 114)), 'fab-w', 'fab-r');
    s += R(266, 101.5, 20, 7, 'fab-w');
    s += callout(276, 105, 335, 62, 'Raw edges inside', 'end');
    if (!o.fold) s += vst(xs, 82, 128, true) + dim(xs, 128, Ef, 128, fr2, 12);
    s += note(24, 86, 'Wrong side') + note(24, 133, 'Wrong side');
    s += lb(20, 34, 'Fold right sides together, press', !!o.fold);
    s += lb(20, 178, o.fold ? 'The first seam sits right on the fold' : `Sew ${fr2} from the fold`, true);
    return svg(340, 190, s, 'French seam, second pass');
  }
  s += ply(seg(20, 140, 340, 140), 'fab-w', 'fab-r');
  s += ply(join(seg(180, 131, 236, 131), arcP(236, 122, 9, 90, -90), seg(236, 113, 184, 113)), 'fab-r', 'fab-w');
  s += P('M180 113Q172 122 180 135', 'ink') + R(192, 119.5, 26, 5, 'fab-w');
  s += callout(205, 122, 120, 70, 'Raw edges sealed inside', 'middle');
  s += lb(20, 34, 'Press the seam to one side', true);
  s += note(20, 168, 'Wrong side up (inside of the item)');
  s += note(20, 186, 'On the right side it looks like a plain seam');
  return svg(340, 196, s, 'French seam, pressed');
}

// ======================================================================
// Facing (cross-section). step sew | grade | under | turn
// ======================================================================
function l5Facing(o = {}) {
  const st = o.step || 'sew', U = 144, E = 320, sx = E - 0.625 * U; let s = '';
  if (st === 'sew' || st === 'grade') {
    const g = st === 'grade', gEnd = g ? sx + 0.375 * U : E, fEnd = g ? sx + 0.25 * U : E;
    const fp = seg(20, 100, fEnd, 100);
    s += iface(fp) + ply(fp, 'fab-w', 'fab-r2') + ply(seg(20, 109, gEnd, 109), 'fab-r', 'fab-w');
    if (g) s += ghost(`M${f(fEnd)} 92H${E}V104.5H${f(fEnd)}`) + ghost(`M${f(gEnd)} 104.5H${E}V113.5H${f(gEnd)}`);
    s += vst(sx, 82, 124, !g);
    if (g) s += dim(sx, 84, fEnd, 84, ln(0.25), -10) + dim(sx, 118, gEnd, 118, ln(0.375), 12);
    else s += dim(sx, 120, E, 120, ln(0.625), 12);
    s += note(24, 87, 'Facing, interfaced') + note(24, 128, 'Garment');
    s += lb(20, 34, g ? 'Grade: trim each layer a different width' : 'Right sides together', !g && false);
    s += lb(20, 176, g ? 'The garment layer stays wider' : `Sew at ${ln(0.625)}`, true);
    return svg(340, 190, s, 'Facing seam, cross-section');
  }
  if (st === 'under') {
    s += ply(seg(20, 124, sx + 0.375 * U, 124), 'fab-r', 'fab-w');
    s += ply(join(seg(338, 106, sx + 2, 106), arcP(sx + 2, 110.5, 4.5, -90, -270), seg(sx + 2, 115, sx + 0.25 * U, 115)), 'fab-w', 'fab-r2');
    const ux = sx + 0.125 * U;
    s += vst(ux, 98, 132, true);
    s += note(24, 114, 'Garment, right side up') + note(338, 94, 'Facing, right side up', 'end');
    s += lb(20, 34, 'Both seam allowances under the facing', false);
    s += lb(20, 166, `Understitch ${ln(0.125)} from the seam`, true);
    s += note(20, 186, 'Through the facing and both seam allowances');
    return svg(340, 196, s, 'Understitching, cross-section');
  }
  // turn
  s += ply(join(seg(20, 96, 300, 96), arcP(300, 100.5, 4.5, -90, 90), seg(300, 105, 246, 105)), 'fab-r', 'fab-w');
  s += ply(join(seg(20, 123, 300, 123), arcP(300, 118.5, 4.5, 90, -90), seg(300, 114, 264, 114)), 'fab-w', 'fab-r2');
  s += L(282, 101, 282, 129, 'stitch-s');
  s += note(24, 86, 'Garment, right side') + note(24, 142, 'Facing, inside');
  s += callout(306, 100, 335, 62, 'Seam rolls just inside', 'end');
  s += callout(282, 129, 330, 166, 'Understitching', 'end');
  s += lb(20, 34, 'Turn the facing inside and press', true);
  return svg(340, 180, s, 'Facing turned, cross-section');
}

// ======================================================================
// Bias binding (cross-section). step 1 sew in the crease, 2 wrap, 3 edgestitch
// ======================================================================
function l5Bind(o = {}) {
  const st = o.step || 1; let s = '';
  if (st === 1) {
    s += ply(seg(20, 130, 320, 130), 'fab-w', 'fab-r');
    s += ply(join(seg(320, 121, 212, 121), [[204, 117], [182, 86]]), 'fab-r2', 'fab-w', 4);
    s += L(265, 108, 265, 116, 'fold');
    if (o.pin) s += [234, 292].map(x => pin(x, 122, 90)).join('');
    else s += vst(265, 112, 140, true) + dim(265, 104, 320, 104, ln(0.5), -6);
    s += note(176, 84, 'Rest of the tape', 'end') + note(24, 152, 'Garment, wrong side up');
    s += lb(20, 34, "Tape's right side on the garment's wrong side", !!o.pin);
    s += lb(20, 178, o.pin ? 'Raw edges together, pinned' : 'Raw edges together. Sew in the first crease', !o.pin);
    return svg(340, 190, s, 'Binding, first stitching');
  }
  s += ply(seg(20, 124, 300, 124), 'fab-r', 'fab-w');
  const tape = join(seg(300, 133, 247, 133), arcP(247, 137.5, 4.5, -90, -270), seg(247, 142, 300, 142), arcP(300, 124, 18, 90, -90), seg(300, 106, 238, 106), arcP(238, 110.5, 4.5, -90, -270), seg(238, 115, 290, 115));
  s += ply(tape, 'fab-w', 'fab-r2', 4.5);
  s += L(245, 120, 245, 146, 'stitch-s');
  s += note(24, 112, 'Garment, right side up');
  if (st === 2) {
    s += lb(20, 34, 'Wrap the tape over the edge to the right side', true);
    s += lb(20, 176, 'The fold just covers the first stitching', false);
  } else {
    s += vst(248, 98, 150, true);
    s += dim(234, 100, 318, 100, ln(0.5), -10);
    s += lb(20, 34, 'Edgestitch the fold from the right side', true);
    s += lb(20, 176, `The binding shows ${ln(0.5)} on each side`, false);
  }
  return svg(340, 190, s, 'Binding wrapped, cross-section');
}

// ======================================================================
// Bodice neckline, plan view. show stay | facing | clip | done | bind
// ======================================================================
function l5Neck(o = {}) {
  const sh = o.show || 'stay', NX = 180, NY = 30, rx = 44, ry = 54; let s = '';
  const neck = (dx = 0, t0 = 0, t1 = 1, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const t = Math.PI * (t0 + (t1 - t0) * i / n); return [NX - (rx + dx) * Math.cos(t), NY + (ry + dx) * Math.sin(t)]; });
  const body = `M136 30L66 50C78 90 70 140 40 165L36 222H324L320 165C290 140 282 90 294 50L224 30` + neck().reverse().map(p => `L${f(p[0])} ${f(p[1])}`).join('') + 'Z';
  s += P(body, sh === 'bind' || sh === 'done' ? 'fab-r' : 'fab-r');
  const outer = [[89.8, 43.2], [96, 92], [128, 126], [180, 138], [232, 126], [264, 92], [270.2, 43.2]];
  const facingPath = 'M' + neck().map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'L270.2 43.2' + smooth(outer.slice().reverse()).replace(/^M[^C]+/, '') + 'Z';
  const line = (pts, cls) => P('M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L'), cls);
  if (sh === 'stay') {
    const pts = neck(8, 0.06, 0.94);
    s += line(pts, 'hi') + line(pts, 'stitch');
    const a = rx + 24, b = ry + 24, pt = t => [NX - a * Math.cos(t), NY + b * Math.sin(t)];
    const [l1, l2, r1, r2] = [pt(0.16 * Math.PI), pt(0.42 * Math.PI), pt(0.84 * Math.PI), pt(0.58 * Math.PI)];
    if (o.check) {
      s += ghost('M' + neck(-6).map(p => `${f(p[0])} ${f(p[1])}`).join('L'));
      s += lb(180, 160, 'Grown? Pull the thread gently', true, 'middle');
      s += lb(180, 184, 'Dashed: the pattern piece', false, 'middle');
    } else {
      s += curveArrow(`M${f(l1[0])} ${f(l1[1])}A${a} ${b} 0 0 0 ${f(l2[0])} ${f(l2[1])}`, true);
      s += curveArrow(`M${f(r1[0])} ${f(r1[1])}A${a} ${b} 0 0 1 ${f(r2[0])} ${f(r2[1])}`, true);
      s += lb(180, 160, `Staystitch ${ln(0.5)} from the edge`, !o.halves, 'middle');
      s += lb(180, 184, 'Sew from each shoulder toward the center', !!o.halves, 'middle');
    }
  }
  if (sh === 'facing' || sh === 'clip') {
    s += P(facingPath, 'fab-w');
    const pts = neck(10, 0.02, 0.98);
    if (sh === 'facing') s += line(pts, 'hi');
    s += line(pts, 'stitch');
    if (sh === 'clip') {
      for (let i = 1; i < 14; i++) { const t = Math.PI * i / 14, c = Math.cos(t), si = Math.sin(t); s += L(NX - rx * c, NY + ry * si, NX - (rx + 8) * c, NY + (ry + 8) * si, 'hi'); }
      s += lb(180, 166, 'Grade, then clip the curve', true, 'middle');
      s += lb(180, 190, 'Stop just short of the stitching', false, 'middle');
    } else {
      s += lb(180, 166, 'Facing on top, right sides together', false, 'middle');
      s += lb(180, 190, `Sew the neckline at ${ln(0.625)}`, true, 'middle');
    }
  }
  if (sh === 'done') {
    s += ghost(smooth(outer));
    s += [[110, 38], [250, 38]].map(([x, y]) => P(`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`, 'hi')).join('');
    s += lb(180, 166, 'Facing turned to the inside', false, 'middle');
    s += lb(180, 190, 'Tack it to the shoulder seams by hand', true, 'middle');
  }
  if (sh === 'bind') {
    const inner = neck(0), out8 = neck(9);
    s += P('M' + inner.map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'L' + out8.reverse().map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z', 'fab-r2');
    s += line(neck(7, 0.01, 0.99), 'stitch');
    s += ghost('M' + neck(-10).map(p => `${f(p[0])} ${f(p[1])}`).join('L'));
    s += lb(180, 166, `Bias binding, ${ln(0.5)} wide`, true, 'middle');
    s += lb(180, 190, 'Dashed line: the old cut edge, trimmed off', false, 'middle');
  }
  return svg(360, 232, s, 'Bodice neckline');
}

// ======================================================================
// Bias strips. step fold | cut | join | press | tape (w = finished double-fold width)
// ======================================================================
function l5BiasTape(o = {}) {
  const st = o.step || 'fold', w = o.w || 0.5; let s = '';
  if (st === 'fold' || st === 'cut') {
    s += R(40, 40, 280, 8, 'fab-w') + note(40, 34, 'Selvedge');
    if (st === 'fold') {
      s += PG([[200, 48], [320, 48], [320, 200], [40, 200]], 'fab-r');
      s += PG([[40, 200], [200, 48], [200, 200]], 'fab-w');
      s += ghost('M40 48V200');
      s += L(40, 200, 200, 48, 'hi');
      s += curveArrow('M70 90Q100 150 150 170', false);
      s += lb(208, 150, 'Fold the cut end', false) + lb(208, 172, 'to meet the selvedge', false);
      s += lb(208, 100, 'The fold = true bias', true);
      return svg(360, 214, s, 'Finding the bias');
    }
    s += PG([[200, 48], [320, 48], [320, 200], [40, 200]], 'fab-r');
    const k = 34 * Math.SQRT2;
    for (let n = 0; n < 4; n++) {
      const c = 240 + k * n, x1 = Math.max(40, c - 200), y1 = c - x1, x2 = Math.min(320, c - 48), y2 = c - x2;
      s += L(x1, y1, x2, y2, n === 0 ? 'hi' : 'ink');
    }
    const ax = 120, ay = 120, d = 34 / Math.SQRT2;
    s += dim(ax, ay, ax + d, ay + d, ln(w * 4), 0);
    s += lb(330, 70, 'Cut strips along the bias', true, 'end');
    s += note(330, 230, 'Each strip as wide as the tape needs', 'end');
    return svg(340, 240, s, 'Cutting bias strips');
  }
  if (st === 'curve') {
    s += ghost('M70 50Q180 170 290 50');
    s += P('M60 70Q180 196 300 70', 'xs-out') + P('M60 70Q180 196 300 70', 'xs-in');
    s += curveArrow('M120 60Q150 90 160 110', true) + curveArrow('M240 60Q210 90 200 110', true);
    s += lb(180, 30, 'Steam the tape into a curve', true, 'middle');
    s += note(180, 182, 'Dashed: the neckline it will follow', 'middle');
    return svg(360, 194, s, 'Shaping bias tape');
  }
  if (st === 'join') {
    s += R(20, 130, 180, 40, 'fab-r') + R(160, 20, 40, 150, 'fab-w');
    s += PG([[200, 137], [200, 170], [167, 170]], 'hi-f');
    s += L(160, 170, 200, 130, 'hi') + L(160, 170, 200, 130, 'stitch');
    s += note(24, 124, 'Right side up') + note(154, 40, 'Right side down', 'end');
    s += lb(214, 120, 'Sew corner to corner', true);
    s += lb(214, 186, `Trim to ${ln(0.25)}`, false);
    s += note(24, 196, 'Ends cut square first');
    return svg(360, 206, s, 'Joining bias strips');
  }
  if (st === 'press') {
    s += P('M30 100H180L210 140H330V100H210L180 140H30Z', 'fab-r');
    s += R(30, 100, 300, 40, 'fab-r');
    s += L(180, 100, 210, 140, 'stitch');
    s += PG([[180, 100], [184, 94], [190, 100]], 'hi-f') + PG([[200, 140], [206, 146], [210, 140]], 'hi-f');
    s += lb(180, 70, 'Press the seam open', true, 'middle');
    s += lb(180, 172, 'Snip off the little points', false, 'middle');
    s += note(180, 194, 'The join sits on the straight grain, so it hardly shows', 'middle');
    return svg(360, 204, s, 'Pressed bias join');
  }
  // tape: flat strip, single fold, double fold (cross-sections), drawn to scale
  const U = 110, t = 3.2, W = w * U;
  const x0 = 180 - 2 * W, y1 = 44;
  s += ply(seg(x0, y1, x0 + 4 * W, y1), 'fab-r2', 'fab-w', t);
  s += dim(x0, y1 + 8, x0 + 4 * W, y1 + 8, ln(w * 4), 10);
  const hl = o.hi;
  s += hl ? note(20, 26, 'Bias strip: 4 × the finished width') : lb(20, 26, 'Bias strip: 4 × the finished width', true);
  const y2 = 120, sL = 180 - W, sR = 180 + W, r = t + 0.8;
  s += ply(join(seg(176, y2 + 2 * r, sL, y2 + 2 * r), arcP(sL, y2 + r, r, 90, 270), seg(sL, y2, sR, y2), arcP(sR, y2 + r, r, -90, 90), seg(sR, y2 + 2 * r, 184, y2 + 2 * r)), 'fab-w', 'fab-r2', t);
  s += dim(sL - r, y2 + 16, sR + r, y2 + 16, ln(w * 2), 10);
  s += hl === 'single' ? lb(20, 98, 'Single fold: both edges to the middle', true) : note(20, 102, 'Single fold: both edges to the middle');
  const y3 = 190, dL = 180 - W / 2, dR = 180 + W / 2, g = 2 * t + 0.6;
  s += ply(join(seg(dR - 5, y3 + g, dL, y3 + g), arcP(dL, y3 + g / 2, g / 2, 90, 270), seg(dL, y3, dR, y3), arcP(dR, y3 + 1.5 * g, 1.5 * g, -90, 90), seg(dR, y3 + 3 * g, dL, y3 + 3 * g), arcP(dL, y3 + 2.5 * g, g / 2, 90, 270), seg(dL, y3 + 2 * g, dR - 5, y3 + 2 * g)), 'fab-w', 'fab-r2', t);
  s += dim(dL - t, y3 + 3 * g + 6, dR + 1.5 * g + t, y3 + 3 * g + 6, ln(w), 10);
  s += hl === 'double' ? lb(20, 170, 'Double fold: fold in half again', true) : note(20, 174, 'Double fold: fold in half again');
  return svg(360, 252, s, 'Bias tape folds');
}

// ======================================================================
// Gathering. step 1 two rows, 2 pull, 3 pin, 4 sew
// ======================================================================
function wavy(x1, x2, y, amp = 3, step = 10) { let d = `M${x1} ${y}`; for (let x = x1 + step / 2, i = 0; x <= x2 + 0.1; x += step / 2, i++) d += `Q${f(x - step / 4)} ${f(y + (i % 2 ? amp : -amp))} ${f(x)} ${y}`; return d; }
function l5Gather(o = {}) {
  const st = o.step || 1; let s = '';
  if (st === 1) {
    s += R(30, 70, 300, 120, 'fab-r');
    s += baste('M40 82H320') + baste('M40 92H320');
    s += P('M40 82C30 78 22 68 16 58', 'thread') + P('M40 92C28 94 20 100 12 110', 'thread');
    s += P('M320 82C330 78 338 68 344 58', 'thread') + P('M320 92C332 94 340 100 348 110', 'thread');
    s += lb(30, 30, 'Two rows of long stitches', true);
    s += note(30, 52, `${ln(0.375)} and ${ln(0.5)} from the top edge`);
    s += lb(180, 140, 'Stitch length 4 to 5 mm', false, 'middle');
    s += lb(180, 166, 'Leave long thread tails', false, 'middle');
    return svg(360, 200, s, 'Gathering stitches');
  }
  if (st === 2) {
    const top = wavy(90, 270, 70, 3, 9);
    s += P(top + 'L300 190' + 'H60Z', 'fab-r');
    for (let x = 94; x < 270; x += 9) s += P(`M${x} 74Q${f(x - 4 + (x - 180) * 0.05)} 130 ${f(60 + (x - 90) * 1.33)} 188`, 'soft');
    s += P(wavy(90, 270, 82, 2, 9), 'stitch') + P(wavy(90, 270, 92, 2, 9), 'stitch');
    s += P('M90 82C70 82 50 80 26 84', 'thread') + P('M90 92C70 92 50 92 26 94', 'thread') + arrow(70, 60, 30, 60, true);
    s += pin(298, 87, 90) + P('M270 82C282 80 300 76 294 86C288 96 304 98 298 90', 'thread') + P('M270 92C284 94 302 98 300 86', 'thread');
    s += lb(20, 34, 'Pull both bobbin threads', true);
    s += lb(340, 34, 'Wind tails round a pin', false, 'end');
    return svg(360, 200, s, 'Pulling up gathers');
  }
  // 3 pin, 4 sew: flat piece underneath (right side up), gathered piece on top (wrong side up)
  s += R(36, 60, 288, 140, 'fab-r2');
  s += P(wavy(48, 312, 60, 2.5, 8) + 'L314 200H46Z', 'fab-w');
  for (let x = 52; x < 312; x += 8) s += L(x, 64, x + (x - 180) * 0.02, 196, 'soft');
  s += P(wavy(48, 312, 68, 1.6, 8), 'stitch') + P(wavy(48, 312, 75, 1.6, 8), 'stitch');
  [48, 180, 312].forEach(x => { s += L(x, 52, x, 60, 'hi'); });
  if (st === 3) {
    [92, 136, 224, 268].forEach(x => { s += pin(x, 74, 90); });
    s += lb(20, 30, 'Gathered piece on top, edges matched', !o.spread);
    s += note(20, 48, 'Match side seams and center marks');
    if (o.spread) s += arrow(150, 124, 108, 124, true) + arrow(210, 124, 252, 124, true);
    s += lb(180, 150, o.spread ? 'Spread the gathers evenly' : 'Pin at every mark first', !!o.spread, 'middle');
  } else {
    s += P('M36 84H324', 'hi') + P('M36 84H324', 'stitch');
    s += lb(20, 30, `Sew at ${ln(0.625)}, gathered side up`, true);
    s += note(20, 48, 'Just below the second row');
    s += lb(180, 150, 'Keep the little folds straight', false, 'middle');
  }
  return svg(360, 210, s, 'Sewing gathers');
}

// ======================================================================
// Dart. step mark | fold | sew | tie | press
// ======================================================================
function l5Dart(o = {}) {
  const st = o.step || 'mark'; let s = '';
  if (st === 'tie') {
    s += R(20, 20, 320, 170, 'fab-w');
    s += PG([[50, 20], [130, 20], [130, 150]], 'fab-w');
    s += L(130, 20, 130, 190, 'ink');
    s += P('M58 20L126 132L130 150', 'hi') + P('M58 20L126 132L130 150', 'stitch');
    s += P('M130 150C126 166 134 176 128 196', 'thread') + P('M130 150C136 166 142 180 144 196', 'thread') + knot(133, 172);
    s += lb(156, 120, 'Last stitches on the fold', false);
    s += lb(156, 168, 'Tie the tails in a knot', true);
    s += note(156, 186, 'No backstitch at the point');
    s += note(156, 44, 'Close-up of the point');
    return svg(360, 200, s, 'Tying off a dart');
  }
  if (st === 'press') {
    s += `<ellipse cx="180" cy="150" rx="130" ry="52" class="fab-r"/>`;
    const pts = arcP(180, 150, 136.5, 196, 344, 40).map(([x, y]) => [x, 150 + (y - 150) * (58.5 / 136.5)]);
    s += ply(pts, 'fab-w', 'fab-r');
    s += ply(join(seg(182, 88, 214, 90)), 'fab-w', 'fab-w', 3);
    s += callout(200, 89, 244, 52, 'Dart pressed to one side', 'middle');
    s += lb(20, 30, 'Press over a curve', true);
    s += note(180, 222, 'A pressing ham, or a rolled-up towel', 'middle');
    return svg(360, 232, s, 'Pressing a dart');
  }
  s += R(40, 30, 280, 180, 'fab-w');
  if (st === 'mark') {
    s += L(160, 30, 180, 190, 'hi') + L(200, 30, 180, 190, 'hi') + L(180, 30, 180, 190, 'fold');
    s += C(160, 30, 3.5, 'hi-dot') + C(200, 30, 3.5, 'hi-dot') + C(180, 190, 3.5, 'hi-dot');
    s += callout(164, 70, 110, 96, 'Leg', 'end') + callout(196, 70, 250, 96, 'Leg');
    s += callout(180, 140, 120, 160, 'Fold line', 'end') + callout(180, 190, 236, 196, 'Point');
    s += lb(180, 234, 'Mark the dart on the wrong side', true, 'middle');
    return svg(360, 244, s, 'Marking a dart');
  }
  s += PG([[160, 30], [180, 30], [180, 190]], 'fab-w') + L(180, 30, 180, 196, 'ink');
  if (st === 'fold') {
    s += pin(170, 70, 80) + pin(174, 120, 80) + pin(178, 160, 80);
    s += lb(180, 234, 'Fold on the center line, match legs, pin', true, 'middle');
    return svg(360, 244, s, 'Folding a dart');
  }
  s += P('M160 30L178 172L180 190', 'hi') + P('M160 30L178 172L180 190', 'stitch');
  s += P('M180 190C178 198 182 204 178 212', 'thread') + P('M180 190C184 198 188 204 190 212', 'thread');
  s += arrow(142, 50, 158, 160, true);
  s += callout(179, 182, 224, 150, 'Sew off the fold');
  s += lb(180, 234, 'Sew from the wide end to the point', true, 'middle');
  return svg(360, 244, s, 'Sewing a dart');
}

// ======================================================================
// Design eye: shaping. show cone | body | compare
// ======================================================================
function l5Shape(o = {}) {
  const sh = o.show || 'cone'; let s = '';
  if (sh === 'cone') {
    const c = [90, 116], r = 62, p = a => [c[0] + r * Math.cos(a * Math.PI / 180), c[1] + r * Math.sin(a * Math.PI / 180)];
    const [a1, a2] = [p(-70), p(-110)];
    s += P(`M${c[0]} ${c[1]}L${f(a1[0])} ${f(a1[1])}A${r} ${r} 0 1 1 ${f(a2[0])} ${f(a2[1])}Z`, 'fab-r');
    s += ghost(`M${f(a2[0])} ${f(a2[1])}L${c[0]} ${c[1]}L${f(a1[0])} ${f(a1[1])}`);
    s += arrow(168, 116, 206, 116, true);
    s += P('M222 172L276 56L330 172A54 14 0 0 1 222 172Z', 'fab-r') + P('M222 172A54 14 0 0 0 330 172', 'soft');
    s += L(276, 56, 270, 185, 'stitch');
    s += lb(180, 26, 'Close a wedge and flat fabric gets depth', true, 'middle');
    s += note(90, 206, 'Flat, with a wedge out', 'middle') + note(276, 206, 'Sewn closed: a cone', 'middle');
    return svg(360, 216, s, 'A dart makes a cone');
  }
  if (sh === 'body') {
    s += P(smooth([[150, 16], [152, 40], [122, 52], [112, 70], [110, 100], [116, 128], [120, 150], [114, 176], [106, 206], [108, 236], [252, 236], [254, 206], [246, 176], [240, 150], [244, 128], [250, 100], [248, 70], [238, 52], [208, 40], [210, 16]]), 'body');
    const dart = (x, y1, y2, w) => PG([[x - w, y1], [x, y2], [x + w, y1]], 'hi-f');
    s += dart(152, 150, 110, 7) + dart(208, 150, 110, 7) + dart(150, 154, 192, 6) + dart(210, 154, 192, 6);
    s += PG([[116, 112], [148, 104], [116, 98]], 'hi-f') + PG([[244, 112], [212, 104], [244, 98]], 'hi-f');
    s += C(150, 104, 3, 'hi-dot') + C(210, 104, 3, 'hi-dot');
    s += P('M114 150Q180 158 246 150', 'soft');
    s += lb(262, 76, 'Bust point', false) + L(214, 104, 258, 80, 'soft');
    s += lb(262, 150, 'Waist', false);
    s += lb(262, 196, 'Hip curve', false) + L(214, 190, 258, 192, 'soft');
    s += lb(20, 30, 'Darts point at the curves', true);
    return svg(360, 246, s, 'Where darts point');
  }
  // compare: dart, gathers, pleats
  const tile = (x0, kind, name, line2) => {
    let g = R(x0 + 10, 34, 96, 16, 'fab-r2');
    if (kind === 'dart') { g += P(`M${x0 + 10} 50H${x0 + 106}L${x0 + 116} 180H${x0}Z`, 'fab-r'); g += PL([[x0 + 48, 50], [x0 + 58, 110], [x0 + 68, 50]], 'stitch'); }
    if (kind === 'gather') { g += P(wavy(x0 + 10, x0 + 106, 50, 2, 6) + `L${x0 + 118} 180H${x0 - 2}Z`, 'fab-r'); for (let x = x0 + 13; x < x0 + 106; x += 6) g += L(x, 54, x0 + 58 + (x - x0 - 58) * 1.2, 176, 'soft'); }
    if (kind === 'pleat') { g += P(`M${x0 + 10} 50H${x0 + 106}L${x0 + 114} 180H${x0 + 2}Z`, 'fab-r'); [x0 + 34, x0 + 58, x0 + 82].forEach(x => { g += L(x, 50, x + (x - x0 - 58) * 0.12, 178, 'ink') + L(x + 6, 50, x + 6 + (x - x0 - 58) * 0.14, 120, 'fold'); }); }
    return g + T(x0 + 58, 202, name, 'lab', 'middle') + T(x0 + 58, 220, line2, 'lab-s', 'middle');
  };
  s += tile(4, 'dart', 'Dart', 'smooth, close fit') + tile(122, 'gather', 'Gathers', 'soft, full') + tile(240, 'pleat', 'Pleats', 'crisp folds');
  s += lb(180, 22, 'Three ways to fit flat fabric to a body', false, 'middle');
  return svg(360, 230, s, 'Darts, gathers, and pleats');
}

// ======================================================================
// Elastic. step thread | join | close | stitched
// ======================================================================
function elasticStrip(x1, y1, x2, h) { let g = R(x1, y1, x2 - x1, h, 'paper', 2); for (let y = y1 + 4; y < y1 + h - 2; y += 4) g += L(x1 + 2, y, x2 - 2, y, 'soft'); return g; }
function l5Elastic(o = {}) {
  const st = o.step || 'thread'; let s = '';
  if (st === 'join') {
    s += elasticStrip(40, 90, 200, 30) + elasticStrip(170, 92, 330, 30);
    let d = 'M172 94'; for (let y = 94; y < 120; y += 4) d += `L198 ${y + 2}L172 ${y + 4}`;
    s += P(d, 'zig') + P('M172 94L198 120M198 94L172 120', 'zig') + R(172, 94, 26, 26, 'hi');
    s += dim(170, 128, 200, 128, ln(1), 14);
    s += lb(180, 46, `Overlap the ends ${ln(1)}`, true, 'middle');
    s += lb(180, 186, 'Zigzag a box through both layers', false, 'middle');
    s += note(180, 206, 'Check the elastic is not twisted first', 'middle');
    return svg(360, 216, s, 'Joining elastic');
  }
  if (st === 'stitched') {
    s += R(30, 100, 300, 100, 'fab-w');
    s += elasticStrip(100, 40, 260, 16);
    [100, 140, 180, 220, 260].forEach((x, i) => { const gx = 30 + i * 75; s += L(x, 36, x, 60, 'hi') + ghost(`M${x} 58L${gx} 100`) + L(gx, 96, gx, 108, 'hi'); });
    s += elasticStrip(30, 104, 330, 16);
    if (o.sew) { let d = 'M30 106'; for (let x = 30; x < 330; x += 8) d += `L${x + 4} 118L${x + 8} 106`; s += P(d, 'zig'); }
    s += arrow(96, 48, 50, 48, true) + arrow(264, 48, 310, 48, true);
    s += lb(180, 24, 'Mark quarters on elastic and edge', !o.sew, 'middle');
    s += lb(180, 160, o.sew ? 'Stretch the elastic to fit as you zigzag' : 'Pin them together at the marks', !!o.sew, 'middle');
    s += note(180, 184, 'Stretch only the elastic, never the fabric', 'middle');
    return svg(360, 210, s, 'Stitched-on elastic');
  }
  s += R(30, 40, 300, 160, 'fab-w') + R(30, 40, 300, 34, 'fab-r') + L(300, 40, 300, 200, 'ink');
  if (st === 'thread') {
    s += L(30, 72, 250, 72, 'stitch') + L(290, 72, 330, 72, 'stitch') + L(252, 72, 288, 72, 'hi');
    s += ghost('M150 50H270V64H150Z');
    s += P('M138 52H166Q172 57 166 62H138Z', 'metal') + arrow(132, 57, 92, 57, true);
    s += P('M262 64L296 112L284 120L252 70Z', 'paper') + pin(282, 104, 125);
    s += lb(40, 120, 'A safety pin leads the elastic', true);
    s += lb(40, 144, `Gap of ${ln(2)} near a side seam`, false);
    s += note(40, 166, 'Pin the tail so it cannot slip inside');
    return svg(360, 210, s, 'Threading elastic');
  }
  // close
  s += L(30, 72, 330, 72, 'stitch') + L(250, 72, 292, 72, 'hi') + vst(300, 40, 74, true);
  s += lb(40, 120, 'Stitch the gap closed', true);
  s += lb(40, 144, 'Stitch down through the side seams', false);
  s += note(40, 166, 'This keeps the elastic from twisting');
  return svg(360, 210, s, 'Closing the casing');
}

// ======================================================================
// Zippers. kind parts | measure | centered (step 1-3) | lapped (step 2-3) | xs (style centered|lapped)
// ======================================================================
function zipper(x, y1, y2, { face = 'up', stopTop = y1 + 10, stopBot = y2 - 12, pull = true, w = 13 } = {}) {
  let g = R(x - w, y1, 2 * w, y2 - y1, 'body', 2);
  if (face === 'up') {
    for (let y = stopTop + 4; y < stopBot - 2; y += 5) g += R(x - 5, y, 5, 2.6, 'metal2') + R(x, y + 2.5, 5, 2.6, 'metal2');
    g += R(x - 7, stopTop, 4, 4, 'ink-f') + R(x + 3, stopTop, 4, 4, 'ink-f') + R(x - 6, stopBot, 12, 5, 'ink-f');
    if (pull) g += P(`M${x - 7} ${stopTop + 6}H${x + 7}L${x + 5} ${stopTop + 20}H${x - 5}Z`, 'metal') + R(x - 3, stopTop + 20, 6, 16, 'metal', 3);
  } else g += L(x, stopTop, x, stopBot, 'soft') + L(x - 4, stopTop, x - 4, stopBot, 'soft') + L(x + 4, stopTop, x + 4, stopBot, 'soft');
  return g;
}
function l5Zip(o = {}) {
  const k = o.kind || 'parts', st = o.step || 1; let s = '';
  if (k === 'parts') {
    s += zipper(170, 24, 214, { stopTop: 34, stopBot: 196 });
    s += callout(176, 36, 214, 36, 'Top stops') + callout(177, 56, 214, 70, 'Pull (slider)') + callout(172, 130, 214, 116, 'Teeth or coil');
    s += callout(160, 160, 214, 156, 'Tape') + callout(170, 199, 214, 198, 'Bottom stop');
    s += L(122, 36, 138, 36, 'soft') + L(122, 201, 138, 201, 'soft') + P('M130 36V201', 'dim');
    s += lb(124, 124, 'Zipper length', false, 'end');
    return svg(360, 224, s, 'Parts of a zipper');
  }
  if (k === 'measure') {
    s += R(20, 30, 120, 196, 'fab-w') + L(20, 44, 140, 44, 'fold') + note(24, 24, 'Top edge');
    s += C(126, 196, 3.5, 'hi-dot') + L(120, 196, 140, 196, 'hi');
    s += L(150, 44, 166, 44, 'soft') + L(150, 196, 166, 196, 'soft') + P('M158 44V196', 'dim');
    s += lb(166, 100, 'Opening', false);
    s += zipper(296, 34, 214, { stopTop: 47, stopBot: 196 });
    s += L(262, 47, 278, 47, 'soft') + L(262, 201, 278, 201, 'soft') + P('M270 47V201', 'dim');
    s += lb(262, 150, 'Zipper length', false, 'end');
    s += ghost('M140 44H282') + ghost('M140 198H282');
    s += note(24, 58, 'Seam line') + note(24, 214, 'End mark');
    return svg(340, 234, s, 'Zipper length and opening');
  }
  if (k === 'xs') {
    const lapped = o.style === 'lapped'; const U = 128;
    if (!lapped) {
      s += ply(join(seg(20, 100, 176, 100), arcP(176, 104.5, 4.5, -90, 90), seg(176, 109, 96, 109)), 'fab-r', 'fab-w');
      s += ply(join(seg(340, 100, 184, 100), arcP(184, 104.5, 4.5, -90, -270), seg(184, 109, 264, 109)), 'fab-w', 'fab-r');
      s += R(130, 116, 100, 6, 'body') + R(172, 112, 16, 14, 'metal2', 3);
      s += vst(148, 92, 125, true) + vst(212, 92, 125, true);
      s += dim(148, 84, 180, 84, ln(0.25), -6);
      s += lb(20, 34, 'Centered: two folds meet over the teeth', true);
      s += note(20, 150, 'Right side up. Stitching each side of the seam');
      return svg(340, 162, s, 'Centered zipper, cross-section');
    }
    s += ply(join(seg(20, 100, 180, 100), arcP(180, 104.5, 4.5, -90, 90), seg(180, 109, 100, 109)), 'fab-r', 'fab-w');
    s += ply(join(seg(340, 100, 192, 100), [[184, 108], [178, 118]], seg(176, 118, 166, 118), arcP(166, 122.5, 4.5, -90, -270), seg(166, 127, 228, 127)), 'fab-w', 'fab-r');
    s += R(108, 134, 104, 6, 'body') + R(144, 130, 16, 14, 'metal2', 3);
    s += vst(180 - 0.5 * U, 92, 142, true) + L(170, 113, 170, 141, 'stitch-s');
    s += note(24, 88, 'Overlap') + note(330, 88, 'Underlap', 'end');
    s += callout(152, 140, 120, 172, 'Teeth hidden under the flap', 'middle');
    s += lb(20, 34, `Lapped: a flap stitched ${ln(0.5)} from the seam`, true);
    return svg(340, 184, s, 'Lapped zipper, cross-section');
  }
  // plan views of a center seam, 1 in = 36 units
  const U = 36, top = 30, seamY = top + 0.625 * U, endY = 176, wrong = (k === 'centered' && st <= 2) || (k === 'lapped' && st === 2);
  s += R(30, top, 150, 196, wrong ? 'fab-w' : 'fab-r') + R(180, top, 150, 196, wrong ? 'fab-w' : 'fab-r');
  s += L(30, seamY, 330, seamY, 'fold');
  if (k === 'centered' && st === 1) {
    s += L(180 - 0.625 * U, top, 180 - 0.625 * U, 226, 'thin') + L(180 + 0.625 * U, top, 180 + 0.625 * U, 226, 'thin');
    s += baste(`M180 ${top}V${endY}`) + L(180, endY, 180, 226, 'stitch') + C(180, endY, 4, 'hi-dot');
    s += callout(180, 110, 226, 106, 'Basting') + callout(180, endY, 226, 168, 'End mark') + callout(180, 210, 226, 214, 'Regular stitches');
    s += lb(20, 20, 'Baste the opening, sew the rest, press open', true);
    return svg(360, 234, s, 'Basted zipper opening');
  }
  if (k === 'centered' && st === 2) {
    s += zipper(180, 36, endY + 8, { face: 'down', stopTop: seamY + 0.125 * U, stopBot: endY });
    s += baste(`M171 40V${endY}`) + baste(`M189 40V${endY}`);
    s += C(180, seamY + 0.125 * U, 7, 'hi');
    s += lb(20, 20, 'Zipper face down, teeth on the seam', true);
    s += lb(40, 212, 'Top stop just below the seam line', false);
    return svg(360, 234, s, 'Placing a centered zipper');
  }
  if (k === 'centered' && st === 3) {
    s += ghost(`M167 36H193V${endY + 8}H167Z`) + baste(`M180 ${top}V${endY}`) + L(180, endY, 180, 226, 'ink');
    const a = 180 - 0.25 * U, b = 180 + 0.25 * U;
    s += stitchHi(`M${a} ${top}V${endY + 6}H${b}V${top}`);
    s += lb(20, 20, `Stitch ${ln(0.25)} each side of the seam`, true);
    s += lb(40, 212, 'Down, across below the stop, and up', false);
    return svg(360, 234, s, 'Stitching a centered zipper');
  }
  if (k === 'lapped' && st === 2) {
    s += zipper(170, 36, endY + 8, { stopTop: seamY + 0.125 * U, stopBot: endY });
    s += P(`M178 ${top}V226`, 'ink') + R(178, top, 4, 196, 'fab-w');
    s += stitchHi(`M181 40V${endY}`);
    s += lb(20, 20, 'Underlap: zipper face up beside a fold', true);
    s += lb(40, 212, 'Stitch along the fold, close to the teeth', false);
    return svg(360, 234, s, 'Lapped zipper, underlap');
  }
  // lapped step 3: right side, stitch across the bottom and up
  s += ghost(`M163 36H189V${endY + 8}H163Z`) + baste(`M180 ${top}V${endY}`) + L(180, endY, 180, 226, 'ink');
  s += stitchHi(`M180 ${endY + 6}H${180 + 0.5 * U}V${top}`);
  s += lb(20, 20, `Across the bottom, then up ${ln(0.5)} out`, true);
  s += lb(40, 212, 'Through every layer, from the right side', false);
  return svg(360, 234, s, 'Stitching a lapped zipper');
}

// ======================================================================
// Buttonholes. show parts | length | place | four | cut | mark
// ======================================================================
function bh(x, y, l, vertical = false, wd = 7) {
  // a small buttonhole outline centered on (x, y)
  if (vertical) return R(x - wd / 2, y - l / 2, wd, l, 'thin', 2) + L(x - wd / 2, y - l / 2 + 2, x + wd / 2, y - l / 2 + 2, 'ink') + L(x - wd / 2, y + l / 2 - 2, x + wd / 2, y + l / 2 - 2, 'ink') + L(x, y - l / 2 + 3, x, y + l / 2 - 3, 'soft');
  return R(x - l / 2, y - wd / 2, l, wd, 'thin', 2) + L(x - l / 2 + 2, y - wd / 2, x - l / 2 + 2, y + wd / 2, 'ink') + L(x + l / 2 - 2, y - wd / 2, x + l / 2 - 2, y + wd / 2, 'ink') + L(x - l / 2 + 3, y, x + l / 2 - 3, y, 'soft');
}
function bigHole(x1, x2, yc) {
  let s = '';
  const side = (y0) => { let d = `M${x1 + 14} ${y0}`; for (let x = x1 + 14; x < x2 - 14; x += 3) d += `L${x + 1.5} ${y0 + 10}L${x + 3} ${y0}`; return P(d, 'zig'); };
  s += side(yc - 14) + side(yc + 4);
  const bar = x0 => { let d = `M${x0} ${yc - 15}`; for (let y = yc - 15; y < yc + 15; y += 2.5) d += `L${x0 + 12} ${y + 1.25}L${x0} ${y + 2.5}`; return P(d, 'zig'); };
  return s + bar(x1) + bar(x2 - 12);
}
function l5Buttonhole(o = {}) {
  const sh = o.show || 'parts'; let s = '';
  if (sh === 'parts') {
    s += R(20, 40, 320, 120, 'fab-r') + bigHole(60, 300, 100);
    s += callout(66, 86, 66, 30, 'Bar tack', 'middle');
    s += callout(180, 88, 196, 30, 'Side: a narrow zigzag');
    s += L(76, 100, 286, 100, 'hi');
    s += callout(180, 100, 180, 192, 'Cut open between the sides', 'middle');
    return svg(360, 206, s, 'Parts of a buttonhole');
  }
  if (sh === 'chalk') {
    s += R(20, 40, 150, 110, 'fab-r') + R(190, 40, 150, 110, 'fab-r');
    s += L(50, 95, 140, 95, 'hi') + L(50, 85, 50, 105, 'hi') + L(140, 85, 140, 105, 'hi');
    s += bh(250, 95, 70, false, 10) + C(250, 130, 11, 'metal') + C(246, 130, 1.6, 'ink') + C(254, 130, 1.6, 'ink');
    s += note(95, 168, 'Chalk the line and ends', 'middle');
    s += note(265, 168, 'Test on a scrap', 'middle');
    s += lb(180, 26, 'Same layers as the garment', false, 'middle');
    s += lb(180, 196, 'Check the button slips through', true, 'middle');
    return svg(360, 206, s, 'Marking and testing a buttonhole');
  }
  if (sh === 'length') {
    const d = o.d || 0.75, t = o.t || 0.125, U = 140, x0 = 70, W = d * U, Tk = t * U;
    s += R(x0, 60, W, Tk, 'metal', Tk / 2) + L(x0 + W * 0.3, 60, x0 + W * 0.3, 60 + Tk, 'soft') + L(x0 + W * 0.7, 60, x0 + W * 0.7, 60 + Tk, 'soft');
    s += dim(x0, 60, x0 + W, 60, `Across ${ln(d)}`, -14);
    s += L(x0 + W + 10, 60, x0 + W + 22, 60, 'soft') + L(x0 + W + 10, 60 + Tk, x0 + W + 22, 60 + Tk, 'soft') + lb(x0 + W + 28, 70, `Thick ${ln(t)}`, false);
    s += R(30, 116, 300, 50, 'fab-r') + bigHole(x0, x0 + W + Tk, 141);
    s += dim(x0, 166, x0 + W + Tk, 166, ln(d + t), 14);
    s += lb(180, 214, 'Buttonhole = across + thickness', true, 'middle');
    s += note(180, 234, 'Then test it on a scrap', 'middle');
    return svg(360, 244, s, 'Buttonhole length');
  }
  if (sh === 'place') {
    s += R(60, 36, 70, 160, 'fab-r') + L(95, 30, 95, 202, 'fold') + note(95, 24, 'Center front', 'middle');
    [70, 116, 162].forEach(y => { s += bh(95, y, 26, true); });
    s += note(95, 218, 'Vertical: centered', 'middle') + note(95, 232, 'on the center line', 'middle');
    s += R(190, 80, 160, 46, 'fab-r') + L(320, 70, 320, 136, 'fold') + note(320, 62, 'Center front', 'middle');
    s += bh(307, 103, 36);
    s += L(325, 112, 325, 126, 'hi');
    s += note(350, 146, 'Edge', 'end');
    s += note(270, 218, `Across: starts ${ln(0.125)} past`, 'middle') + note(270, 232, 'the center line, toward the edge', 'middle');
    return svg(360, 242, s, 'Where buttonholes go');
  }
  if (sh === 'four') {
    s += R(20, 40, 320, 120, 'fab-r') + bigHole(60, 300, 100);
    const num = (x, y, n) => C(x, y, 10, 'hi-f') + T(x, y + 4.5, String(n), 'lab-hi', 'middle');
    s += num(66, 66, 1) + num(180, 70, 2) + num(294, 66, 3) + num(180, 132, 4);
    s += arrow(110, 80, 250, 80, true) + arrow(250, 122, 110, 122, true);
    s += lb(180, 190, 'Bar tack, side, bar tack, side', false, 'middle');
    s += note(180, 28, 'Your machine may number them in another order', 'middle');
    return svg(360, 200, s, 'Four-step buttonhole');
  }
  if (sh === 'cut') {
    s += R(20, 50, 320, 100, 'fab-r') + bigHole(60, 300, 100);
    s += L(286, 70, 286, 132, 'ink') + C(286, 66, 5, 'thread-f');
    s += P('M40 108L68 101L80 99L84 101L72 104Z', 'metal') + R(10, 104, 32, 10, 'body', 4);
    s += arrow(96, 100, 250, 100, true);
    s += lb(340, 36, 'A pin across the far end stops the cut', true, 'end');
    s += lb(180, 186, 'Cut from the other end toward the pin', false, 'middle');
    return svg(360, 196, s, 'Cutting a buttonhole open');
  }
  // mark
  s += R(40, 40, 150, 170, 'fab-r') + L(115, 34, 115, 216, 'fold') + note(115, 28, 'Button side', 'middle');
  s += R(240, 40, 60, 170, 'fab-r2') + L(270, 34, 270, 216, 'fold') + note(270, 28, 'Buttonhole side', 'middle');
  [80, 125, 170].forEach(y => { s += bh(270, y, 24, true) + ghost(`M262 ${y}H126`) + P(`M${110} ${y - 5}l10 10M${120} ${y - 5}l-10 10`, 'hi'); });
  s += lb(180, 236, 'Center lines matched. Mark through each hole', false, 'middle');
  return svg(360, 246, s, 'Marking button spots');
}

// ======================================================================
// Patch pocket. step hem | fold | baste | sew
// ======================================================================
function pocketPath(x0, y0, w, h, r) { return `M${x0} ${y0}H${x0 + w}V${y0 + h - r}A${r} ${r} 0 0 1 ${x0 + w - r} ${y0 + h}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y0 + h - r}Z`; }
function l5Pocket(o = {}) {
  const st = o.step || 'hem', U = 16, X = 36, Y = 30, W = 6.75 * U, Hh = 8.375 * U; let s = '';
  const rx = 160;
  if (st === 'hem') {
    s += P(pocketPath(X, Y, W, Hh, 22), 'fab-w');
    if (o.cut) {
      s += ghost(`M${X} ${Y + Hh - 22}V${Y + Hh}H${X + 22}M${X + W - 22} ${Y + Hh}H${X + W}V${Y + Hh - 22}`);
      s += P(`M${X} ${Y + Hh - 22}A22 22 0 0 0 ${X + 22} ${Y + Hh}M${X + W - 22} ${Y + Hh}A22 22 0 0 0 ${X + W} ${Y + Hh - 22}`, 'hi');
      s += lb(rx, 40, 'Round the bottom corners', true);
      s += lb(rx, 76, `Top: ${ln(1.25)} for the hem`, false);
    } else {
      s += L(X, Y + 0.25 * U, X + W, Y + 0.25 * U, 'fold') + L(X, Y + 0.25 * U + 2, X + W, Y + 0.25 * U + 2, 'stitch');
      s += L(X, Y + 1.25 * U, X + W, Y + 1.25 * U, 'fold');
      s += lb(rx, 40, `Fold ${ln(0.25)} under, stitch`, true);
      s += lb(rx, 76, `Fold line ${ln(1)} lower`, false);
    }
    s += note(rx, 120, 'Cut size in this example:');
    s += note(rx, 136, `${ln(6.75)} wide × ${ln(8.375)} tall`);
    return svg(380, 200, s, 'Pocket top hem');
  }
  if (st === 'fold' && o.turn) {
    s += P(pocketPath(X, Y, W, Hh, 22), 'fab-w') + R(X, Y, W, U, 'fab-r') + L(X, Y + U, X + W, Y + U, 'stitch');
    s += PG([[X, Y], [X + 8, Y], [X, Y + 8]], 'hi-f') + PG([[X + W, Y], [X + W - 8, Y], [X + W, Y + 8]], 'hi-f');
    s += lb(rx, 40, 'Turned right side out', true);
    s += lb(rx, 70, 'Push the corners out', false) + note(rx, 88, 'gently, then press');
    s += note(rx, 120, 'Wrong side up: the hem');
    s += note(rx, 136, 'folds to the inside');
    return svg(380, 200, s, 'Pocket hem turned');
  }
  if (st === 'fold') {
    s += P(pocketPath(X, Y, W, Hh, 22), 'fab-r');
    s += R(X, Y, W, U, 'fab-w');
    s += vst(X + 0.625 * U, Y, Y + U, true) + vst(X + W - 0.625 * U, Y, Y + U, true);
    s += PG([[X, Y], [X + 6, Y], [X, Y + 6]], 'hi-f') + PG([[X + W, Y], [X + W - 6, Y], [X + W, Y + 6]], 'hi-f');
    s += lb(rx, 40, 'Hem folded to the right side', true);
    s += lb(rx, 70, `Sew each end at ${ln(0.625)}`, false);
    s += lb(rx, 100, 'Trim, then turn it right', false) + note(rx, 118, 'side out');
    return svg(380, 200, s, 'Pocket hem folded');
  }
  if (st === 'baste') {
    s += P(pocketPath(X, Y, W, Hh, 22), 'fab-w') + R(X, Y, W, U, 'fab-r') + L(X, Y + U, X + W, Y + U, 'stitch');
    s += P(pocketPath(X + 0.625 * U, Y + U, W - 1.25 * U, Hh - 1.625 * U, 14), 'paper');
    s += baste(`M${X + 0.5 * U} ${Y + U + 4}V${Y + Hh - 22}A${22 - 0.5 * U} ${22 - 0.5 * U} 0 0 0 ${X + 22} ${Y + Hh - 0.5 * U}H${X + W - 22}A${22 - 0.5 * U} ${22 - 0.5 * U} 0 0 0 ${X + W - 0.5 * U} ${Y + Hh - 22}V${Y + U + 4}`);
    s += lb(rx, 40, `Long stitch ${ln(0.5)} from the edge`, !o.card);
    s += lb(rx, 76, 'Card template, finished size', !!o.card);
    s += lb(rx, 112, 'Pull the thread to ease', false) + note(rx, 130, 'the curves, then press the');
    s += note(rx, 146, 'edges over the card');
    return svg(380, 200, s, 'Pressing pocket edges');
  }
  // sew
  s += R(10, 10, 340, 196, 'fab-r');
  const px = 120, py = 40, pw = 5.5 * U, ph = 6.5 * U;
  s += P(pocketPath(px, py, pw, ph, 14), 'fab-r2') + L(px, py + U, px + pw, py + U, 'stitch');
  s += stitchHi(`M${px + 9} ${py}L${px + 3} ${py + 7}V${py + ph - 14}A11 11 0 0 0 ${px + 14} ${py + ph - 3}H${px + pw - 14}A11 11 0 0 0 ${px + pw - 3} ${py + ph - 14}V${py + 7}L${px + pw - 9} ${py}`);
  s += P(`M${px + 3} ${py}V${py + 7}M${px + pw - 3} ${py}V${py + 7}`, 'stitch');
  if (o.corner) s += C(px + 6, py + 4, 12, 'hi') + C(px + pw - 6, py + 4, 12, 'hi');
  s += lb(180, 172, `Edgestitch ${ln(0.125)} from the edge`, !o.corner, 'middle');
  s += lb(180, 196, 'Small triangles make the top corners strong', !!o.corner, 'middle');
  return svg(360, 216, s, 'Sewing on a patch pocket');
}

// ======================================================================
// In-seam pocket. step attach | press | sew | open
// ======================================================================
const BAG = [[200, 56], [240, 50], [282, 66], [302, 108], [298, 148], [266, 178], [224, 186], [200, 180]];
const BAG_IN = [[212, 70], [240, 64], [272, 78], [289, 110], [286, 144], [260, 166], [224, 172], [206, 166]];
const mirror = pts => pts.map(([x, y]) => [400 - x, y]);
function l5InPocket(o = {}) {
  const st = o.step || 'attach'; let s = '';
  if (st === 'mark') {
    s += R(30, 20, 170, 206, 'fab-r') + L(187.5, 20, 187.5, 226, 'fold');
    s += C(187.5, 80, 4, 'hi-dot') + C(187.5, 160, 4, 'hi-dot');
    s += dim(200, 80, 200, 160, ln(6), -12);
    s += lb(250, 40, 'Mark the opening', true) + note(250, 58, 'dots on the seam line');
    s += note(250, 190, 'Front and back alike');
    s += note(34, 214, 'Front, right side up');
    return svg(400, 234, s, 'Marking a pocket opening');
  }
  if (st === 'attach') {
    s += R(30, 20, 170, 206, 'fab-r');
    s += P(smooth(mirror(BAG)) + 'Z', 'fab-l');
    s += stitchHi('M187.5 60V178');
    s += C(187.5, 80, 3.5, 'hi-dot') + C(187.5, 160, 3.5, 'hi-dot');
    s += lb(214, 40, 'Pocket bag on the front', true) + note(214, 58, 'right sides together');
    s += lb(214, 100, `Sew at ${ln(0.625)}`, false);
    s += note(214, 140, 'Do the same on the back');
    s += note(34, 214, 'Front, right side up');
    return svg(400, 234, s, 'Pocket bag on the front');
  }
  if (st === 'press') {
    s += R(30, 20, 170, 206, 'fab-r');
    s += P(smooth(BAG) + 'Z', 'fab-l');
    s += L(204, 60, 204, 176, 'stitch');
    s += lb(40, 40, 'Press the bag away', true) + note(40, 58, 'from the front');
    s += note(40, 214, 'Optional: understitch the bag');
    return svg(400, 234, s, 'Pocket bag pressed out');
  }
  if (st === 'sew' || st === 'clip') {
    s += P(smooth(BAG) + 'Z', 'fab-l') + R(30, 20, 170, 206, 'fab-w');
    const d = `M187.5 20V80L212 72` + smooth(BAG_IN.slice(1)).replace(/^M/, 'L') + 'L187.5 160V226';
    s += st === 'sew' ? stitchHi(d) : P(d, 'stitch');
    s += C(187.5, 80, 3.5, 'hi-dot') + C(187.5, 160, 3.5, 'hi-dot');
    if (st === 'sew') {
      s += lb(40, 40, 'Front and back', true) + note(40, 58, 'right sides together');
      s += lb(40, 130, 'Down, around the bag,', false) + note(40, 148, 'and on down the side');
    } else {
      s += L(200, 80, 190, 80, 'hi') + L(200, 160, 190, 160, 'hi');
      s += lb(40, 40, 'Clip the back seam', true) + note(40, 58, 'allowance at each mark');
      s += note(40, 130, 'Clip up to the stitching,') + note(40, 146, 'not through it');
    }
    return svg(400, 234, s, 'Sewing an in-seam pocket');
  }
  // open: from the right side
  s += R(30, 20, 170, 206, 'fab-r') + R(200, 20, 190, 206, 'fab-r');
  s += L(200, 20, 200, 80, 'ink') + L(200, 160, 200, 226, 'ink') + L(198, 80, 198, 160, 'hi') + L(202, 80, 202, 160, 'ink');
  s += ghost(smooth(mirror(BAG)));
  s += lb(214, 110, 'Pocket opening', true);
  s += note(214, 132, 'Bag lies toward the front');
  s += note(214, 190, 'Seam pressed open above') + note(214, 206, 'and below');
  return svg(400, 234, s, 'In-seam pocket from the right side');
}

// ======================================================================
// Hems. kind curve | ease | blindfold | blindstitch | handblind
// ======================================================================
function l5Hem(o = {}) {
  const k = o.kind || 'curve'; let s = '';
  if (k === 'curve') {
    const edge = [[30, 110], [80, 120], [130, 160], [180, 176], [230, 160], [280, 120], [330, 110]];
    s += P('M30 20H330V110' + smooth(edge.slice().reverse()).replace(/^M[^C]+/, '') + 'Z', 'fab-w');
    s += P(smooth(edge.map(([x, y]) => [x, y - 7])), 'stitch', DASH_LONG);
    s += lb(180, 56, `Long stitch ${ln(0.25)} from the edge`, true, 'middle');
    s += lb(180, 82, 'Press up on it, then fold again', false, 'middle');
    s += note(180, 204, 'A shirt-tail curve, wrong side up', 'middle');
    return svg(360, 214, s, 'Curved hem');
  }
  if (k === 'ease') {
    s += P('M80 20H280L320 190H40Z', 'fab-w');
    s += P(wavy(50, 310, 150, 2.2, 8) + 'L320 190H40Z', 'fab-r');
    if (o.ripple) {
      s += P(wavy(50, 310, 150, 4, 8), 'hi');
      s += lb(180, 60, 'Hem folded up: its edge is too long', true, 'middle');
      s += lb(180, 86, 'so it ripples where it lands', false, 'middle');
      s += note(180, 210, 'The tighter the curve, the narrower the hem', 'middle');
      return svg(360, 220, s, 'A deep hem on a curve');
    }
    s += P(wavy(50, 310, 156, 1.4, 8), 'stitch');
    s += P('M50 156C36 152 26 146 16 136', 'thread') + arrow(36, 128, 14, 118, true);
    s += lb(180, 60, 'Hem folded up: its edge is too long', false, 'middle');
    s += lb(180, 86, 'Pull the long stitch to ease it in', true, 'middle');
    s += note(180, 210, 'Then steam the ripples flat', 'middle');
    return svg(360, 220, s, 'Easing a flared hem');
  }
  if (k === 'blindfold') {
    const U = 80;
    const p = join(seg(150, 96, 310, 96), arcP(310, 105, 9, -90, 90), seg(310, 114, 170, 114), arcP(170, 123, 9, -90, -270), seg(170, 132, 340, 132));
    s += ply(p, 'fab-r', 'fab-w');
    s += dim(150, 92, 170, 92, ln(0.25), -12);
    s += note(316, 84, 'Hem fold', 'end');
    s += callout(150, 96, 60, 70, 'Hem edge', 'middle');
    s += callout(162, 123, 80, 160, 'Garment folded back', 'middle');
    s += lb(20, 30, 'Fold the garment back over the hem', true);
    s += note(20, 196, 'Cross-section. The hem edge peeks out past the fold');
    return svg(350, 206, s, 'Blind hem fold');
  }
  if (k === 'blindstitch') {
    s += R(20, 40, 320, 60, 'fab-w') + R(20, 100, 320, 40, 'fab-r');
    s += L(20, 100, 340, 100, 'ink');
    let d = 'M30 120';
    for (let x = 30; x + 48 <= 330; x += 48) d += `H${x + 36}L${x + 42} 96L${x + 48} 120`;
    d += 'H336';
    s += P(d, 'hi') + P(d, 'stitch-s');
    s += note(24, 34, 'Garment, folded back') + note(24, 156, 'Hem edge');
    s += lb(340, 180, 'Straight stitches on the hem edge', false, 'end');
    s += lb(340, 204, 'A small bite just catches the fold', true, 'end');
    return svg(360, 214, s, 'Machine blind hem stitch');
  }
  // handblind
  s += R(20, 30, 320, 80, 'fab-w') + R(20, 110, 320, 60, 'fab-r');
  s += L(20, 110, 340, 110, 'ink') + ghost('M20 122H340');
  let d = 'M40 116';
  for (let x = 40; x < 320; x += 40) d += `L${x + 20} 104L${x + 24} 104L${x + 40} 116`;
  s += P(d, 'stitch-s');
  for (let x = 60; x < 320; x += 40) s += C(x + 2, 104, 2.4, 'hi-dot');
  s += note(24, 24, 'Garment (wrong side)') + note(24, 186, 'Hem edge, folded back a little');
  if (o.knot) {
    s += knot(140, 116) + knot(260, 116);
    s += lb(340, 70, 'Thread a little loose', false, 'end');
    s += lb(340, 150, `Knot every ${ln(6)} or so`, true, 'end');
    return svg(360, 196, s, 'Blind hem by hand, knots');
  }
  s += lb(340, 70, 'Catch one or two threads', true, 'end');
  s += lb(340, 150, 'Then a small stitch in the hem', false, 'end');
  return svg(360, 196, s, 'Blind hem by hand');
}

// ======================================================================
// Interfacing. show kinds | weight | fuse | where | trim
// ======================================================================
function l5Interf(o = {}) {
  const sh = o.show || 'kinds'; let s = '';
  if (sh === 'kinds') {
    const sw = (x, inner, name, l2) => R(x, 30, 100, 100, 'paper', 8) + inner + T(x + 50, 152, name, 'lab', 'middle') + T(x + 50, 170, l2, 'lab-s', 'middle');
    let wv = ''; for (let i = 0; i < 9; i++) wv += L(18 + i * 10, 38, 18 + i * 10, 122, 'soft') + L(18, 40 + i * 10, 102, 40 + i * 10, 'soft');
    let nw = ''; [[30, 50], [60, 44], [88, 60], [44, 80], [76, 92], [26, 110], [56, 116], [94, 108], [66, 70], [38, 64]].forEach(([x, y]) => { nw += P(`M${x + 110} ${y}q8 -6 14 2`, 'soft'); });
    let kn = ''; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const x = 250 + i * 16, y = 46 + j * 17; kn += P(`M${x - 6} ${y - 5}Q${x - 8} ${y + 8} ${x} ${y + 8}Q${x + 8} ${y + 8} ${x + 6} ${y - 5}`, 'soft'); }
    s += sw(10, wv, 'Woven', 'cut on grain') + sw(130, nw, 'Non-woven', 'no grain') + sw(250, kn, 'Knit', 'soft, a little stretch');
    s += lb(180, 206, 'All come as fusible (iron-on) or sew-in', false, 'middle');
    return svg(360, 216, s, 'Kinds of interfacing');
  }
  if (sh === 'weight') {
    s += R(20, 60, 320, 8, 'metal', 4);
    s += P('M60 64C60 120 50 160 40 196', 'xs-out') + P('M60 64C60 120 50 160 40 196', 'xs-in');
    s += P('M180 64C184 110 196 150 214 190', 'xs-out') + P('M180 64C184 110 196 150 214 190', 'xs-in');
    s += P('M290 64L330 170', 'xs-out') + P('M290 64L330 170', 'xs-in');
    s += lb(36, 40, 'Too soft', false) + lb(150, 40, 'Just right', true) + lb(270, 40, 'Too stiff', false);
    s += note(180, 220, 'Fuse a scrap and drape it: it should bend like the garment', 'middle');
    return svg(360, 230, s, 'Interfacing weight test');
  }
  if (sh === 'fuse') {
    s += ply(seg(30, 150, 330, 150), 'fab-w', 'fab-r', 5);
    s += R(60, 140, 240, 5, 'paper');
    for (let x = 66; x < 300; x += 10) s += C(x, 145.5, 1.3, 'hi-dot');
    s += R(50, 130, 260, 9, 'fab-l');
    s += P('M120 124H240Q244 96 222 86H150Q138 86 134 98Z', 'metal') + P('M150 86Q152 66 166 66H210Q218 66 216 76L212 86', 'ink');
    s += arrow(110, 70, 110, 112, true) + arrow(254, 112, 254, 70, true);
    s += note(30, 192, 'Glue side (bumpy) on the fabric’s wrong side');
    s += note(330, 126, 'Pressing cloth', 'end');
    s += lb(20, 30, 'Press, hold 10 to 15 seconds, lift, move', true);
    s += note(30, 210, 'Overlap each spot a little. Let it cool before moving');
    return svg(360, 220, s, 'Fusing interfacing');
  }
  if (sh === 'trim') {
    s += P('M40 40H320V160H40Z', 'fab-w');
    s += P('M50 50H310V150H50Z', 'paper');
    s += P('M40 40H320V160H40Z', 'ink');
    s += PG([[50, 50], [62, 50], [50, 62]], 'hi-f') + PG([[310, 50], [298, 50], [310, 62]], 'hi-f') + PG([[50, 150], [62, 150], [50, 138]], 'hi-f') + PG([[310, 150], [298, 150], [310, 138]], 'hi-f');
    s += L(40 + 0.625 * 48, 40, 40 + 0.625 * 48, 160, 'fold');
    s += lb(180, 96, 'Trim the corners off', true, 'middle');
    s += lb(180, 120, 'so they do not add bulk', false, 'middle');
    s += note(180, 186, 'Heavy interfacing: also trim it out of the seam allowance', 'middle');
    return svg(360, 196, s, 'Trimming interfacing');
  }
  if (sh === 'patch') {
    const pt = (x, y, w, h) => { const d = `M${x} ${y}h${w}v${h}h${-w}Z`; return P(d, 'paper', 'style="opacity:.75"') + P(d, 'hi'); };
    s += R(20, 40, 320, 120, 'fab-w', 4);
    s += pt(26, 40, 14, 120) + L(20 + 0.625 * 16, 40, 20 + 0.625 * 16, 160, 'fold');
    s += pt(120, 84, 54, 22) + bh(147, 95, 34);
    s += P('M224 64H316V146H224Z', 'thin', 'style="stroke-dasharray:4 3"') + pt(220, 60, 16, 16) + pt(304, 60, 16, 16);
    s += note(30, 30, 'Zipper seam strip');
    s += note(147, 130, 'Under a buttonhole', 'middle');
    s += note(270, 30, 'Pocket top corners', 'middle');
    s += note(334, 178, 'Wrong side', 'end');
    s += lb(180, 202, 'Small patches where stitching pulls', true, 'middle');
    return svg(360, 214, s, 'Interfacing patches');
  }
  // where: small pieces with interfacing
  const tile = (x, y, shape, name) => `<g transform="translate(${x},${y})">${P(shape, 'fab-r')}${P(shape, 'hi')}${P(shape, 'paper', 'style="opacity:.55"')}</g>` + T(x + 50, y + 74, name, 'lab-s', 'middle');
  const edges = sh === 'edges', y2 = edges ? 20 : 116;
  if (!edges) {
    s += tile(10, 20, 'M10 20Q50 12 90 20L96 52Q50 60 4 52Z', 'Collar');
    s += tile(130, 20, 'M6 30Q50 40 94 30Q98 20 90 16Q50 26 10 16Q2 20 6 30Z', 'Collar stand');
    s += tile(250, 20, 'M4 14H96V52H4Z', 'Cuff (outer half)');
  }
  s += tile(10, y2, 'M10 6Q50 50 90 6L96 18Q50 70 4 18Z', 'Neck facing');
  s += tile(130, y2, 'M40 0H62V60H40Z', 'Button band');
  s += tile(250, y2, 'M0 20H100V40H0Z', 'Waistband');
  if (edges) { s += lb(180, 130, 'Edge pieces: interface them all', true, 'middle'); return svg(360, 142, s, 'Interfacing on edge pieces'); }
  return svg(360, 206, s, 'Where interfacing goes');
}

// Pressing cloth on the right side of dark fabric
function l5Cloth() {
  let s = '';
  s += ply(seg(30, 150, 330, 150), 'fab-r', 'fab-w', 6);
  s += R(60, 138, 240, 6, 'fab-l');
  s += P('M120 132H240Q244 104 222 94H150Q138 94 134 106Z', 'metal') + P('M150 94Q152 74 166 74H210Q218 74 216 84L212 94', 'ink');
  s += arrow(110, 78, 110, 120, true) + arrow(254, 120, 254, 78, true);
  s += note(330, 132, 'Pressing cloth', 'end');
  s += note(30, 176, 'Dark fabric, right side up');
  s += lb(20, 30, 'Cloth between the iron and the fabric', true);
  s += note(30, 196, 'No shine, no scorch marks');
  return svg(360, 206, s, 'Using a pressing cloth');
}

// ======================================================================
// Flat sketches. g top | aline | gathered | back; hi = list of parts
// ======================================================================
const FLAT = {
  top: {
    d: 'M140 30L112 40Q122 80 112 110L104 120L110 270Q180 282 250 270L256 120L248 110Q238 80 248 40L220 30Q180 70 140 30Z',
    extra: () => PG([[110, 140], [146, 132], [111, 126]], 'thin') + PG([[250, 140], [214, 132], [249, 126]], 'thin'),
    parts: { neck: ['Neckline', [180, 50], [230, 14, 'start']], shoulder: ['Shoulder seam', [126, 35], [98, 18, 'end']], arm: ['Armhole', [118, 80], [92, 80, 'end']], dart: ['Bust dart', [130, 132], [92, 152, 'end']], side: ['Side seam', [107, 200], [90, 210, 'end']], hem: ['Hem', [180, 276], [230, 294, 'start']] },
  },
  aline: {
    d: 'M120 46H240L292 270Q180 282 68 270Z',
    extra: () => R(118, 30, 124, 16, 'body') + PG([[146, 46], [150, 96], [154, 46]], 'thin') + PG([[206, 46], [210, 96], [214, 46]], 'thin'),
    parts: { band: ['Waistband or facing', [180, 38], [204, 14, 'start']], dart: ['Darts', [150, 70], [110, 84, 'end']], zip: ['Zipper', [236, 70], [262, 64, 'start']], pocket: ['Pocket', [246, 110], [270, 120, 'start']], side: ['Side seam', [100, 170], [80, 170, 'end']], hem: ['Hem', [180, 276], [230, 294, 'start']] },
  },
  gathered: {
    d: 'M112 50H248L296 270Q180 282 64 270Z',
    extra: () => R(110, 30, 140, 20, 'body') + [124, 140, 156, 172, 188, 204, 220, 236].map(x => P(`M${x} 52Q${x - 3} 150 ${f(64 + (x - 112) * 1.7)} 266`, 'soft')).join(''),
    parts: { casing: ['Elastic casing', [180, 40], [230, 14, 'start']], gathers: ['Gathers', [150, 110], [100, 100, 'end']], side: ['Side seam', [104, 180], [80, 180, 'end']], hem: ['Hem', [180, 276], [230, 294, 'start']] },
  },
  back: {
    d: 'M180 46L162 50L118 66L70 214L96 226L124 132L120 262Q150 280 180 284Q210 280 240 262L236 132L264 226L290 214L242 66L198 50Z',
    extra: () => P('M120 96Q180 104 240 96', 'thin') + L(170, 100, 170, 280, 'fold') + L(190, 100, 190, 280, 'fold') + P('M70 214L64 232L90 244L96 226Z', 'body') + P('M290 214L296 232L270 244L264 226Z', 'body') + L(84, 206, 82, 228, 'ink'),
    parts: { yoke: ['Yoke', [180, 76], [230, 30, 'start']], pleat: ['Back pleat', [180, 150], [214, 150, 'start']], placket: ['Placket', [83, 216], [62, 190, 'end']], cuff: ['Cuff', [80, 236], [60, 258, 'end']], side: ['Side seam', [124, 200], [100, 160, 'end']] },
  },
};
function l5Flat(o = {}) {
  const g = FLAT[o.g] || FLAT.top, hi = asArr(o.hi === 'all' ? Object.keys(g.parts) : o.hi); let s = '';
  s += P(g.d, 'body') + g.extra();
  hi.forEach(k => { const m = g.parts[k]; if (m) s += callout(m[1][0], m[1][1], m[2][0], m[2][1], m[0], m[2][2]); });
  if (o.cap) s += note(180, 318, o.cap, 'middle');
  return svg(360, o.cap ? 326 : 306, s, 'Flat sketch');
}

// ======================================================================
// Shirt stages. l5Collar (sew | turn | stand), l5Yoke (back | fronts), l5Placket (slash | bind | done),
// l5Cuff (prep | ends | attach), l5Sleeve (flat | side)
// ======================================================================
function l5Collar(o = {}) {
  const st = o.step || 'sew'; let s = '';
  const shape = 'M80 50Q180 40 280 50L300 120Q180 140 60 120Z';
  if (st === 'sew') {
    s += `<g transform="translate(5,5)">${P(shape, 'fab-r')}</g>` + P(shape, 'paper');
    s += stitchHi('M90 51L71 111Q180 129 289 111L270 51');
    s += PG([[60, 120], [70, 120], [62, 112]], 'hi-f') + PG([[300, 120], [290, 120], [298, 112]], 'hi-f');
    s += note(180, 34, 'Neck edge stays open', 'middle');
    s += lb(180, 168, 'Sew the ends and outer edge', true, 'middle');
    s += lb(180, 192, 'Trim the corners, then turn', false, 'middle');
    return svg(360, 204, s, 'Sewing a collar');
  }
  if (st === 'turn') {
    s += P(shape, 'fab-r') + P('M88 56L72 112Q180 130 288 112L272 56', 'stitch');
    s += P('M300 120L330 166L336 162Z', 'body');
    s += lb(180, 168, `Topstitch ${ln(0.25)} from the edge`, true, 'middle');
    s += lb(180, 192, 'Push the points out gently', false, 'middle');
    return svg(360, 204, s, 'Turned collar');
  }
  // stand: collar sandwiched between the two stands
  s += P('M84 120Q180 132 276 120L296 40Q180 26 64 40Z', 'fab-r');
  const band = 'M40 132Q180 152 320 132Q330 116 312 110Q180 128 48 110Q30 116 40 132Z';
  s += `<g transform="translate(0,6)">${P(band, 'fab-r2')}</g>` + P(band, 'fab-w');
  s += stitchHi('M54 128Q40 118 56 114Q180 132 304 114Q320 118 306 128');
  s += lb(180, 186, 'Collar between the two stand pieces', true, 'middle');
  s += note(180, 206, 'Sew the curved ends and the top edge', 'middle');
  return svg(360, 216, s, 'Collar and stand');
}
function l5Yoke(o = {}) {
  const st = o.step || 'back'; let s = '';
  const yoke = 'M60 70L140 46Q180 64 220 46L300 70V110H60Z';
  if (st === 'back') {
    s += R(60, 104, 240, 116, 'fab-r') + L(170, 110, 170, 220, 'fold') + L(190, 110, 190, 220, 'fold');
    s += `<g transform="translate(0,-5)">${P(yoke, 'fab-w')}</g>` + P(yoke, 'fab-r2');
    s += stitchHi('M60 104H300');
    s += note(296, 126, 'Inner yoke behind', 'end') + T(180, 90, 'Outer yoke', 'lab', 'middle') + T(180, 170, 'Back', 'lab', 'middle');
    s += lb(180, 30, 'The back sits between the two yokes', true, 'middle');
    return svg(360, 230, s, 'Yoke and back');
  }
  s += P('M60 70L140 46L118 0H40Z', 'fab-r') + P('M300 70L220 46L242 0H320Z', 'fab-r');
  s += P(yoke, 'fab-r2') + stitchHi('M62 70L140 47') + stitchHi('M298 70L220 47');
  s += T(80, 30, 'Front', 'lab', 'middle') + T(280, 30, 'Front', 'lab', 'middle') + T(180, 92, 'Yoke', 'lab', 'middle');
  s += lb(180, 146, 'Front shoulders sewn to the outer yoke', true, 'middle');
  s += note(180, 168, `Press the inner yoke's edges under ${ln(0.625)},`, 'middle');
  s += note(180, 184, 'then edgestitch them over the seams', 'middle');
  return svg(360, 194, s, 'Yoke and fronts');
}
function l5Placket(o = {}) {
  const st = o.step || 'slash'; let s = '';
  if (st === 'slash') {
    s += P('M40 20H320L300 170H60Z', 'fab-w');
    s += L(220, 170, 216, 100, 'hi') + P('M212 170L216 98L220 170', 'stitch');
    s += lb(240, 100, 'Cut up the slit line', true);
    s += note(240, 118, 'to the mark');
    s += note(64, 190, 'Sleeve end, wrong side up');
    return svg(360, 200, s, 'Sleeve placket slit');
  }
  if (st === 'bind') {
    s += P('M40 20H320L300 130H60Z', 'fab-w');
    s += R(60, 130, 240, 30, 'fab-r2') + stitchHi(`M60 ${130 + 0.25 * 32}H300`);
    s += lb(180, 186, 'Spread the slit straight, sew the strip on', true, 'middle');
    s += note(180, 206, 'A narrow seam; follow your pattern', 'middle');
    return svg(360, 216, s, 'Binding the slit');
  }
  s += P('M40 20H320L300 170H60Z', 'fab-r');
  s += R(212, 96, 10, 74, 'fab-r2') + L(212, 96, 212, 170, 'ink');
  s += P('M206 102L224 92', 'hi') + P('M206 102L224 92', 'stitch');
  s += lb(180, 192, 'A small slanted stitch at the top', true, 'middle') + note(180, 212, 'holds the placket flat', 'middle');
  return svg(360, 222, s, 'Finished sleeve placket');
}
function l5Cuff(o = {}) {
  const st = o.step || 'prep'; let s = '';
  if (st === 'prep') {
    s += R(30, 50, 300, 110, 'fab-w') + R(30, 50, 300, 55, 'paper') + L(30, 105, 330, 105, 'fold');
    s += R(30, 150, 300, 10, 'fab-r');
    s += note(34, 44, 'Interfacing on the outer half') + note(324, 122, 'Fold line', 'end');
    s += lb(180, 194, `One long edge pressed under ${ln(0.625)}`, true, 'middle');
    return svg(360, 206, s, 'Preparing a cuff');
  }
  if (st === 'ends') {
    s += R(30, 60, 300, 60, 'fab-w') + R(30, 110, 300, 10, 'fab-r');
    s += stitchHi(`M${30 + 0.625 * 32} 120V${60 + 0.625 * 32}`) + stitchHi(`M${330 - 0.625 * 32} 120V${60 + 0.625 * 32}`);
    s += L(30, 60, 330, 60, 'ink');
    s += PG([[30, 60], [40, 60], [30, 70]], 'hi-f') + PG([[330, 60], [320, 60], [330, 70]], 'hi-f');
    s += note(34, 52, 'Fold (right sides together)');
    s += lb(180, 160, `Sew each end at ${ln(0.625)}, trim, turn`, true, 'middle');
    return svg(360, 176, s, 'Sewing cuff ends');
  }
  s += P('M60 20H300L290 120H70Z', 'fab-r');
  [120, 150].forEach(x => { s += L(x, 110, x + 8, 120, 'ink') + curveArrow(`M${x + 22} 104Q${x + 12} 96 ${x + 4} 104`, true); });
  s += R(66, 120, 228, 40, 'fab-r2') + stitchHi('M70 124H290V156H70Z');
  s += lb(180, 186, 'Pleats folded, cuff on, edgestitch all around', true, 'middle');
  return svg(360, 200, s, 'Attaching a cuff');
}
function l5Sleeve(o = {}) {
  const st = o.step || 'flat'; let s = '';
  if (st === 'flat') {
    s += P('M20 20H160V210H20Z', 'fab-r');
    s += P('M160 20Q150 60 160 120Q166 170 190 210H160Z', 'fab-r');
    s += P('M340 40Q290 20 240 50Q200 90 196 130L210 210H340Z', 'fab-w');
    s += C(160, 20, 3.5, 'hi-dot') + C(340, 40, 3.5, 'hi-dot') + ghost('M160 20Q250 0 340 40');
    s += note(24, 230, 'Shirt opened flat') + note(338, 230, 'Sleeve, right side down', 'end');
    s += lb(180, 256, 'Match the cap top to the shoulder seam', true, 'middle');
    s += note(180, 278, 'Pin from the middle out, then sew', 'middle');
    return svg(360, 288, s, 'Setting a sleeve in flat');
  }
  const d = 'M30 40L130 20H230L330 40L340 110L250 116L250 220H110L110 116L20 110Z';
  s += P(d, 'fab-w');
  s += stitchHi(`M${20 + 10} ${110 - 10}L${110 + 10} ${116 - 10}L${110 + 10} 220`) + stitchHi(`M${340 - 10} ${110 - 10}L${250 - 10} ${116 - 10}L${250 - 10} 220`);
  s += lb(180, 66, 'Sleeve and side seam in one line', true, 'middle');
  s += note(180, 244, 'Cuff edge to underarm to hem', 'middle');
  return svg(360, 254, s, 'Side and sleeve seam');
}

// ======================================================================
// Hem or casing fold (cross-section, wrong side up). a = first fold, b = second fold (inches), step 1-4, edge = label for the finished edge
// ======================================================================
function l5Fold(o = {}) {
  const st = o.step || 4, a = o.a || 0.5, b = o.b || 1, R0 = 300, edge = o.edge || 'Hem edge';
  const U = Math.min(100, 250 / (a + 2 * b)); let s = '';
  const fab = d => P(d, 'xs-out') + P(d, 'xs-in');
  if (st === 1) s += fab(`M20 130H${R0}`) + lb(R0, 116, 'Raw edge', true, 'end');
  if (st === 2) {
    const f1 = R0 - a * U;
    s += fab(`M20 130H${f(f1)}A5 5 0 0 0 ${f(f1)} 120H${f(f1 - a * U)}`) + dim(f1 - a * U, 118, f1, 118, ln(a), -14);
    s += lb(Math.max(150, f1 - a * U), 160, 'Fold to the wrong side and press', true, 'middle');
  }
  if (st >= 3) {
    const x0 = R0 - (a + b) * U, inner = x0 - b * U;
    s += fab(`M20 130H${f(x0)}A10 10 0 0 0 ${f(x0)} 110H${f(inner)}A5 5 0 0 0 ${f(inner)} 120H${f(inner + a * U)}`);
    s += dim(inner, 108, x0, 108, ln(b), -14);
    if (st >= 4) s += L(inner + 12, 106, inner + 12, 142, 'stitch-s') + lb(Math.min(inner + 4, 110), 166, `Stitch ${ln(0.125)} from the inner fold`, true);
    else s += lb(Math.min(inner, 150), 166, 'Fold again and press', true);
    s += note(x0 + 18, 124, edge);
  }
  s += note(20, 186, 'Cross-section, wrong side up');
  return svg(360, 194, s, 'Folding a hem');
}

// ======================================================================
// Garment tools: ["l5Tools", { "list": ["zipfoot", "ham"] }]
// ======================================================================
const TL = {
  zipfoot: ['Zipper foot', () => R(52, 14, 16, 30, 'metal2', 3) + P('M44 44H76V86Q76 96 66 96H62V58H58V96H54Q44 96 44 86Z', 'metal') + L(60, 58, 60, 100, 'ink')],
  bhfoot: ['Buttonhole foot', () => R(52, 10, 16, 22, 'metal2', 3) + R(30, 32, 60, 72, 'metal', 6) + R(40, 40, 40, 14, 'paper', 3) + R(52, 64, 16, 32, 'card-f', 3)],
  blindfoot: ['Blind hem foot', () => R(52, 12, 16, 26, 'metal2', 3) + P('M40 38H80V88Q80 98 70 98H50Q40 98 40 88Z', 'metal') + R(66, 50, 6, 50, 'metal2', 2)],
  ham: ['Pressing ham', () => `<ellipse cx="60" cy="62" rx="44" ry="30" class="fab-r"/>` + P('M18 62Q60 48 102 62', 'soft')],
  sleeve: ['Sleeve board', () => P('M14 50Q14 38 28 38H96Q106 38 106 46Z', 'fab-r') + R(30, 50, 60, 6, 'metal2') + P('M14 94H106L96 56H24Z', 'metal')],
  clapper: ['Clapper', () => P('M14 60Q14 44 30 44H90Q106 44 106 60V84H14Z', 'body') + P('M30 44Q34 56 30 66', 'soft')],
  turner: ['Point turner', () => P('M16 96L60 14L104 96Z', 'body') + P('M60 30L60 86', 'soft')],
  elastic: ['Elastic', () => C(60, 60, 34, 'paper') + C(60, 60, 26, 'soft') + C(60, 60, 18, 'soft') + C(60, 60, 10, 'card-f')],
  biasmaker: ['Bias tape maker', () => P('M20 40H70L82 60L70 80H20Z', 'metal') + R(82, 54, 30, 12, 'fab-r2') + R(4, 44, 16, 32, 'fab-r2')],
  hook: ['Hook and eye', () => P('M24 50Q24 34 40 34H60Q72 34 72 46Q72 56 60 56H50', 'metal') + C(28, 66, 6, 'ink') + P('M80 40V70M96 40V70M80 70Q88 84 96 70', 'metal') + C(80, 36, 5, 'ink') + C(96, 36, 5, 'ink')],
  roll: ['Interfacing', () => R(20, 30, 70, 60, 'paper', 4) + `<ellipse cx="92" cy="60" rx="10" ry="30" class="paper"/>` + [44, 60, 76].map(y => L(26, y, 84, y, 'soft')).join('')],
  tape: ['Bias tape', () => [30, 52, 74].map((y, i) => R(16, y, 88, 14, i === 1 ? 'fab-r2' : 'fab-r', 3) + L(18, y + 7, 102, y + 7, 'fold')).join('')],
};
function l5Tools(o = {}) {
  const list = asArr(o.list).filter(k => TL[k]);
  const cols = Math.min(3, list.length || 1), rows = Math.ceil(list.length / cols);
  let s = '';
  list.forEach((k, i) => {
    const inRow = Math.min(cols, list.length - Math.floor(i / cols) * cols);
    const x = (360 - inRow * 120) / 2 + (i % cols) * 120, y = Math.floor(i / cols) * 140;
    s += `<g transform="translate(${x},${y})">${TL[k][1]()}${T(60, 130, TL[k][0], 'lab', 'middle')}</g>`;
  });
  return svg(360, rows * 140, s, list.map(k => TL[k][0]).join(', '));
}

register({ l5French, l5Facing, l5Bind, l5Neck, l5BiasTape, l5Gather, l5Dart, l5Shape, l5Elastic, l5Zip, l5Buttonhole, l5Pocket, l5InPocket, l5Hem, l5Interf, l5Flat, l5Collar, l5Yoke, l5Placket, l5Cuff, l5Sleeve, l5Tools, l5Fold, l5Cloth });
