// Shared state and helpers used by every screen.
import { draw, setUnit } from './diagrams.js';
import { showIn, parseLen, fracIn } from './units.js';

export const $app = document.getElementById('app');
export const S = {
  course: null, levels: {}, lessons: {}, order: [], glossary: {}, measures: [],
  settings: { units: 'in', size: 'normal', theme: 'auto', awake: true, paper: 'letter' },
  progress: { done: {}, step: {}, checks: {} },
  fabrics: [], trouble: { groups: [], problems: [] }, cards: {}, projects: [],
  meas: [], // measurement entries
  page: {}, // current page per lesson (kept in memory; also saved in progress.step)
};

// ---------------- helpers ----------------
export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const unit = () => S.settings.units;
export function amount(raw) {
  // "{{5/8 in}}", "{{12 in}}", "{{SA}}", "{{1/2 yd}}"
  raw = raw.trim();
  if (raw === 'SA') return showIn(5 / 8, unit());
  const m = raw.match(/^([\d.\s/]+)\s*(in|yd)$/);
  if (!m) return esc(raw);
  const v = parseLen(m[1]);
  if (isNaN(v)) return esc(raw);
  if (m[2] === 'yd') return unit() === 'cm' ? `${(Math.ceil(v * 0.9144 * 10) / 10).toFixed(1).replace(/\.0$/, '')} m` : `${fracIn(v)} yd`;
  return showIn(v, unit());
}
export function fmt(text) {
  let s = esc(text);
  s = s.replace(/\{\{([^}]+)\}\}/g, (_, a) => `<span class="amt">${amount(a)}</span>`);
  // [[term]] or [[term id|shown words]]
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => {
    const id = a.toLowerCase().trim().replace(/&#39;|&amp;#39;/g, "'"), shown = b || a;
    return S.glossary[id] ? `<span class="term" data-term="${esc(id)}" role="button" tabindex="0">${shown}</span>` : shown;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return s.replace(/\n/g, '<br>');
}
export const list = arr => arr && arr.length ? `<ul>${arr.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>` : '';
export const dia = (spec, cap) => spec ? (setUnit(unit(), a => amount(a).replace(/<[^>]+>/g, '')), '') + `<div class="dia">${draw(spec)}${cap ? `<div class="cap">${fmt(cap)}</div>` : ''}</div>` : '';
export const dateStr = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

let toastTimer;
export function toast(msg, action, fn, ms = 3200) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  t.hidden = false;
  if (action) t.querySelector('button').onclick = () => { t.hidden = true; fn(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
export function sheet(html) {
  const w = document.getElementById('sheet-wrap'), sh = document.getElementById('sheet');
  sh.innerHTML = html + `<button class="btn soft wide" data-act="close-sheet" style="margin-top:14px">Close</button>`;
  sh.tabIndex = -1; w.hidden = false; sh.scrollTop = 0; sh.focus({ preventScroll: true });
}
export function closeSheet() { document.getElementById('sheet-wrap').hidden = true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.getElementById('sheet-wrap').addEventListener('click', e => {
  if (e.target.id === 'sheet-wrap' || e.target.closest('[data-act="close-sheet"]')) closeSheet();
  const t = e.target.closest('.term'); if (t) showTerm(t.dataset.term);
});

// ---------- glossary term ----------
export function showTerm(id) {
  const t = S.glossary[id]; if (!t) return;
  sheet(`<h2>${esc(t.t)}</h2><p class="big">${fmt(t.d)}</p>${t.dia ? dia(t.dia) : ''}${t.also ? `<p class="small muted">Also called: ${esc(t.also)}</p>` : ''}`);
}

export async function saveFile(file, title) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (e) { if (e.name === 'AbortError') throw e; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
