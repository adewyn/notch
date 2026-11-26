// Inches and centimeters. Measurements are saved in cm (full precision) and shown in your chosen unit.
export const CM_PER_IN = 2.54;
export const SA_IN = 5 / 8;          // the one seam allowance used everywhere in Notch
export const SA_CM = 1.5;            // its usual metric stand-in

const FRAC = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' };

// 12.375 -> "12⅜". Rounds to the nearest 1/8 inch.
export function fracIn(x) {
  const neg = x < 0; x = Math.abs(x);
  let whole = Math.floor(x), eighths = Math.round((x - whole) * 8);
  if (eighths === 8) { whole++; eighths = 0; }
  const s = eighths ? (whole ? `${whole}${FRAC[eighths]}` : FRAC[eighths]) : String(whole);
  return (neg ? '−' : '') + s;
}
export function fmtCm(cm) { const r = Math.round(cm * 2) / 2; return (Number.isInteger(r) ? r : r.toFixed(1)) + ''; }

// Display a length given in cm.
export function showCm(cm, unit) { return unit === 'cm' ? `${fmtCm(cm)} cm` : `${fracIn(cm / CM_PER_IN)} in`; }
// Display a length given in inches (lesson text is written in inches; metric is rounded to 0.5 cm,
// or to 0.1 cm under 2.5 cm).
export function showIn(inches, unit) {
  if (unit === 'cm') {
    if (Math.abs(inches - SA_IN) < 1e-6) return `${SA_CM} cm`;
    const cm = inches * CM_PER_IN;
    // Small amounts (edgestitching, folds) need millimeter care: 1/8 in is 0.3 cm, not 0.5.
    if (cm < 2.5) return `${+(Math.round(cm * 10) / 10).toFixed(1)} cm`;
    return `${fmtCm(cm)} cm`;
  }
  return `${fracIn(inches)} in`;
}

// Reads "34", "34.5", "34 1/2", "34½", or "1/2". Returns a number or NaN.
export function parseLen(s) {
  s = String(s || '').trim().replace(',', '.');
  for (const [k, v] of Object.entries(FRAC)) s = s.replace(v, ` ${k}/8`);
  s = s.trim();
  let m = s.match(/^(\d+(?:\.\d+)?)$/); if (m) return parseFloat(m[1]);
  m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/); if (m && +m[3]) return +m[1] + m[2] / m[3];
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (m && +m[2]) return m[1] / m[2];
  return NaN;
}
