// A tiny PDF maker (lines, curves, and text), so printable sheets work offline with no extra library.
// Units are inches; (0,0) is the top-left corner of the page.
export const PAPER = { letter: { w: 8.5, h: 11, name: 'Letter' }, a4: { w: 210 / 25.4, h: 297 / 25.4, name: 'A4' } };

export class PDF {
  constructor(paper = 'letter') { this.paper = PAPER[paper] || PAPER.letter; this.pages = []; this.c = null; }
  page() { this.c = []; this.pages.push(this.c); this.width(0.01); this.color(0, 0, 0); return this; }
  pt(v) { return (v * 72).toFixed(2); }
  xy(x, y) { return `${this.pt(x)} ${this.pt(this.paper.h - y)}`; }
  width(w) { this.c.push(`${this.pt(w)} w`); return this; }
  color(r, g, b) { this.c.push(`${r} ${g} ${b} RG ${r} ${g} ${b} rg`); return this; }
  gray(v) { return this.color(v, v, v); }
  dash(on, off) { this.c.push(on ? `[${this.pt(on)} ${this.pt(off ?? on)}] 0 d` : '[] 0 d'); return this; }
  line(x1, y1, x2, y2) { this.c.push(`${this.xy(x1, y1)} m ${this.xy(x2, y2)} l S`); return this; }
  poly(pts, close = false, fill = false) {
    if (!pts.length) return this;
    let s = `${this.xy(pts[0][0], pts[0][1])} m`;
    for (let i = 1; i < pts.length; i++) s += ` ${this.xy(pts[i][0], pts[i][1])} l`;
    this.c.push(s + (fill ? (close ? ' h f' : ' f') : (close ? ' h S' : ' S'))); return this;
  }
  rect(x, y, w, h, fill = false) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, fill); }
  // Cubic curve from (x0,y0) with controls (x1,y1),(x2,y2) to (x3,y3).
  curve(x0, y0, x1, y1, x2, y2, x3, y3) { this.c.push(`${this.xy(x0, y0)} m ${this.xy(x1, y1)} ${this.xy(x2, y2)} ${this.xy(x3, y3)} c S`); return this; }
  circle(cx, cy, r, fill = false) {
    const k = 0.5523 * r;
    this.c.push(`${this.xy(cx + r, cy)} m ${this.xy(cx + r, cy - k)} ${this.xy(cx + k, cy - r)} ${this.xy(cx, cy - r)} c ` +
      `${this.xy(cx - k, cy - r)} ${this.xy(cx - r, cy - k)} ${this.xy(cx - r, cy)} c ` +
      `${this.xy(cx - r, cy + k)} ${this.xy(cx - k, cy + r)} ${this.xy(cx, cy + r)} c ` +
      `${this.xy(cx + k, cy + r)} ${this.xy(cx + r, cy + k)} ${this.xy(cx + r, cy)} c ${fill ? 'f' : 'S'}`);
    return this;
  }
  text(x, y, str, size = 11, bold = false, align = 'left') {
    const s = String(str).replace(/[^\x20-\x7e]/g, c => ({ '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '–': '-', '—': '-', '’': "'", '“': '"', '”': '"', '×': 'x' }[c] || ''));
    const w = s.length * size * (bold ? 0.56 : 0.52) / 72; // close enough for centering Helvetica
    const dx = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    const esc = s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    this.c.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${this.xy(x + dx, y)} Td (${esc}) Tj ET`);
    return this;
  }
  blob() {
    const objs = [];
    const add = s => { objs.push(s); return objs.length; };
    const catalog = add(''), pagesId = add(''), f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
      f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    const W = this.pt(this.paper.w), H = this.pt(this.paper.h);
    for (const p of this.pages) {
      const body = p.join('\n');
      const cs = add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cs} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([out], { type: 'application/pdf' });
  }
}

// A 1-inch (or 5 cm) square so you can check the printer kept the size.
export function testSquare(pdf, x, y, metric) {
  const s = metric ? 5 / 2.54 : 1;
  pdf.width(0.012).dash(0).gray(0).rect(x, y, s, s);
  pdf.text(x + s / 2, y + s / 2 + 0.05, metric ? '5 cm' : '1 inch', 9, true, 'center');
  pdf.text(x + s + 0.1, y + 0.18, 'Test square: measure it.', 8);
  pdf.text(x + s + 0.1, y + 0.34, metric ? 'It should be 5 cm wide.' : 'It should be exactly 1 inch.', 8);
  pdf.text(x + s + 0.1, y + 0.5, 'If not, print at 100% / Actual size.', 8);
}

// ---------- practice sheets for stitching without thread ----------
export function practiceSheet(kind, paperKey = 'letter') {
  const pdf = new PDF(paperKey); const P = pdf.paper; const m = 0.6; const metric = paperKey === 'a4';
  pdf.page();
  const title = { straight: 'Straight lines', corners: 'Corners and pivots', curves: 'Curves and circles', mixed: 'Mixed shapes' }[kind] || 'Practice';
  pdf.gray(0).text(m, m + 0.1, `Notch practice sheet: ${title}`, 13, true);
  pdf.gray(0.35).text(m, m + 0.32, 'Unthreaded machine, old needle, stitch length about 3 mm. Keep the needle on the line. Start at the dot.', 8.5);
  testSquare(pdf, P.w - m - 2.6, P.h - m - 1.05, metric);
  const top = m + 0.75, bot = P.h - m - 1.35, left = m + 0.15, right = P.w - m - 0.15;
  const start = (x, y) => { pdf.gray(0).circle(x, y, 0.06, true); };
  pdf.width(0.018).gray(0.15);
  if (kind === 'straight') {
    let y = top + 0.15, i = 0;
    while (y < bot) {
      if (i % 3 === 2) { pdf.dash(0.12, 0.08); } else pdf.dash(0);
      pdf.line(left, y, right, y); start(left, y); pdf.width(0.018).gray(0.15); y += 0.75; i++;
    }
    pdf.dash(0).gray(0.35).text(left, bot + 0.25, 'Every third line is dashed: try those once the solid ones feel easy.', 8.5);
  } else if (kind === 'corners') {
    // square zigzags and a square spiral
    for (let r = 0; r < 3; r++) {
      const y0 = top + 0.3 + r * 1.35; const pts = []; let x = left, up = true;
      while (x + 0.9 <= right) { pts.push([x, up ? y0 + 0.9 : y0]); pts.push([x, up ? y0 : y0 + 0.9]); x += 0.9; up = !up; }
      pdf.dash(0).poly(pts); start(pts[0][0], pts[0][1]); pdf.width(0.018).gray(0.15);
    }
    const cx = (left + right) / 2, cy = top + 5.6; const pts = []; let s = 0.35, x = cx, y = cy, dir = 0;
    for (let k = 0; k < 13; k++) { pts.push([x, y]); const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir % 4]; x += d[0] * s; y += d[1] * s; if (k % 2) s += 0.35; dir++; }
    pdf.poly(pts); start(pts[0][0], pts[0][1]);
    pdf.gray(0.35).text(left, bot + 0.25, 'At each corner: stop with the needle down, lift the foot, turn, lower the foot, go.', 8.5);
  } else if (kind === 'curves') {
    for (let r = 0; r < 3; r++) {
      const y0 = top + 0.6 + r * 1.25, amp = 0.35 + r * 0.05, wl = 2.2 - r * 0.5;
      let x = left; start(x, y0); pdf.width(0.018).gray(0.15);
      while (x + wl <= right + 0.01) {
        pdf.curve(x, y0, x + wl * 0.18, y0 - amp * 1.33, x + wl * 0.32, y0 - amp * 1.33, x + wl / 2, y0);
        pdf.curve(x + wl / 2, y0, x + wl * 0.68, y0 + amp * 1.33, x + wl * 0.82, y0 + amp * 1.33, x + wl, y0);
        x += wl;
      }
    }
    const cy = top + 5.7; [[1.7, 1.2], [4.25, 0.9], [6.5, 0.6]].forEach(([cx, r]) => { pdf.circle(left + cx - 0.6, cy, r); start(left + cx - 0.6, cy - r); pdf.width(0.018).gray(0.15); });
    pdf.gray(0.35).text(left, bot + 0.25, 'Go slowly and turn the paper a little at a time. Big curves first, then the tighter ones.', 8.5);
  } else {
    const cx = (left + right) / 2;
    // a big rounded rectangle, a heart-ish shape, and a spiral
    const rx = left + 0.3, ry = top + 0.3, rw = right - left - 0.6, rh = 2.2, rr = 0.6;
    pdf.poly([[rx + rr, ry], [rx + rw - rr, ry]]); pdf.curve(rx + rw - rr, ry, rx + rw - rr * 0.45, ry, rx + rw, ry + rr * 0.45, rx + rw, ry + rr);
    pdf.poly([[rx + rw, ry + rr], [rx + rw, ry + rh - rr]]); pdf.curve(rx + rw, ry + rh - rr, rx + rw, ry + rh - rr * 0.45, rx + rw - rr * 0.45, ry + rh, rx + rw - rr, ry + rh);
    pdf.poly([[rx + rw - rr, ry + rh], [rx + rr, ry + rh]]); pdf.curve(rx + rr, ry + rh, rx + rr * 0.45, ry + rh, rx, ry + rh - rr * 0.45, rx, ry + rh - rr);
    pdf.poly([[rx, ry + rh - rr], [rx, ry + rr]]); pdf.curve(rx, ry + rr, rx, ry + rr * 0.45, rx + rr * 0.45, ry, rx + rr, ry);
    start(rx + rr, ry); pdf.width(0.018).gray(0.15);
    const sy = top + 5.3; let prev = null;
    for (let t = 0; t <= 6 * Math.PI; t += 0.08) { const r = 0.08 + t * 0.09; const p = [cx + r * Math.cos(t), sy + r * Math.sin(t)]; if (prev) pdf.line(prev[0], prev[1], p[0], p[1]); else start(p[0], p[1]); pdf.width(0.018).gray(0.15); prev = p; }
    pdf.gray(0.35).text(left, bot + 0.25, 'Mix it all: straight runs, rounded corners, and a spiral that starts tight and opens up.', 8.5);
  }
  return pdf.blob();
}
