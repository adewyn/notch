// Notch: the app. Screens are drawn from the data files in /data; your own data is saved with db.js.
import * as db from './db.js';
import { draw, setUnit } from './diagrams.js';
import { showIn, showCm, parseLen, CM_PER_IN, fracIn, fmtCm } from './units.js';
import { practiceSheet } from './pdf.js';

const $app = document.getElementById('app');
const S = {
  course: null, levels: {}, lessons: {}, order: [], glossary: {}, measures: [],
  settings: { units: 'in', size: 'normal', theme: 'auto', awake: true, paper: 'letter' },
  progress: { done: {}, step: {}, checks: {} },
  meas: [], // measurement entries
  page: {}, // current page per lesson (kept in memory; also saved in progress.step)
};

// ---------------- helpers ----------------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unit = () => S.settings.units;
function amount(raw) {
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
function fmt(text) {
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
const list = arr => arr && arr.length ? `<ul>${arr.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>` : '';
const dia = (spec, cap) => spec ? (setUnit(unit(), a => amount(a).replace(/<[^>]+>/g, '')), '') + `<div class="dia">${draw(spec)}${cap ? `<div class="cap">${fmt(cap)}</div>` : ''}</div>` : '';
const dateStr = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

let toastTimer;
function toast(msg, action, fn, ms = 3200) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  t.hidden = false;
  if (action) t.querySelector('button').onclick = () => { t.hidden = true; fn(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function sheet(html) {
  const w = document.getElementById('sheet-wrap'), sh = document.getElementById('sheet');
  sh.innerHTML = html + `<button class="btn soft wide" data-act="close-sheet" style="margin-top:14px">Close</button>`;
  w.hidden = false;
}
function closeSheet() { document.getElementById('sheet-wrap').hidden = true; }
document.getElementById('sheet-wrap').addEventListener('click', e => {
  if (e.target.id === 'sheet-wrap' || e.target.closest('[data-act="close-sheet"]')) closeSheet();
  const t = e.target.closest('.term'); if (t) showTerm(t.dataset.term);
});

async function saveProgress() { await db.set('progress', S.progress); }
async function saveSettings() { await db.set('settings', S.settings); applySettings(); }
function applySettings() {
  const r = document.documentElement;
  if (S.settings.theme === 'auto') r.removeAttribute('data-theme'); else r.dataset.theme = S.settings.theme;
  r.dataset.size = S.settings.size;
}

// ---------------- loading ----------------
async function loadJSON(path) { const r = await fetch(path); if (!r.ok) throw new Error(path); return r.json(); }
async function loadAll() {
  S.course = await loadJSON('data/course.json');
  const [gl, ms] = await Promise.all([loadJSON('data/glossary.json'), loadJSON('data/measurements.json')]);
  S.glossary = gl.terms; S.measures = ms.measurements; S.measureGroups = ms.groups;
  const ready = S.course.levels.filter(l => l.file);
  const files = await Promise.all(ready.map(l => loadJSON(l.file)));
  ready.forEach((l, i) => {
    const data = files[i]; S.levels[l.n] = data;
    data.lessons.forEach(ls => { ls.level = l.n; S.lessons[ls.id] = ls; S.order.push(ls.id); });
  });
}
async function loadUser() {
  const [settings, progress, meas] = await Promise.all([db.get('settings'), db.get('progress'), db.list('measure')]);
  if (settings) Object.assign(S.settings, settings);
  if (progress) S.progress = { done: {}, step: {}, checks: {}, ...progress };
  S.meas = meas || [];
  applySettings();
}

// ---------------- progress ----------------
const isDone = id => !!S.progress.done[id];
function levelStats(n) {
  const lv = S.levels[n]; if (!lv) return { done: 0, total: 0 };
  const total = lv.lessons.length, done = lv.lessons.filter(l => isDone(l.id)).length;
  return { done, total };
}
function nextUp() {
  for (const id of S.order) if (!isDone(id)) return S.lessons[id];
  return null;
}

// ---------------- screens ----------------
function setTab(tab) {
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  document.body.classList.toggle('lesson-mode', tab === 'lesson');
}

const BUTTON_ICON = (n, state) => `<svg class="btnface" viewBox="0 0 60 60" aria-hidden="true">
  <circle cx="30" cy="30" r="27" fill="${state === 'done' ? 'var(--sage)' : state === 'here' ? 'var(--accent)' : 'var(--card2)'}" stroke="var(--line)" stroke-width="1.5"/>
  <circle cx="30" cy="30" r="21" fill="none" stroke="${state === 'soon' ? 'var(--line)' : 'rgba(255,255,255,.45)'}" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="30" y="37" text-anchor="middle" font-family="ui-serif, Georgia, serif" font-size="25" font-weight="700" fill="${state === 'soon' ? 'var(--soft)' : state === 'done' || state === 'here' ? 'var(--on-accent)' : 'var(--ink)'}">${n}</text></svg>`;

function viewPath() {
  setTab('path');
  const nx = nextUp();
  const hereLevel = nx ? nx.level : null;
  let h = `<div class="top"><div class="brand">${LOGO}Notch</div><span class="chip">Seam allowance ${showIn(5 / 8, unit())}</span></div>`;
  if (nx) {
    const lv = S.course.levels.find(l => l.n === nx.level);
    h += `<div class="card tint next-card"><div class="eyebrow">Next up · Level ${nx.level}: ${esc(lv.title)}</div>
      <h2>${esc(nx.title)}</h2><p class="muted small">${esc(nx.summary || '')}</p>
      <a class="btn wide" href="#/lesson/${nx.id}">${S.progress.step[nx.id] ? 'Keep going' : 'Start'}</a></div>`;
  } else {
    h += `<div class="card sage"><h2>All open lessons done</h2><p>More levels are on the way. Practice, sew, and come back soon.</p></div>`;
  }
  h += `<div class="map"><svg class="thread" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M22 0C22 6 78 6 78 11S22 16 22 22S78 28 78 33S22 39 22 44S78 50 78 55S22 61 22 66S78 72 78 77S22 83 22 88S78 94 78 100"/></svg>`;
  S.course.levels.forEach((l, i) => {
    const st = levelStats(l.n), ready = !!l.file;
    const state = !ready ? 'soon' : st.done === st.total && st.total ? 'done' : l.n === hereLevel ? 'here' : 'open';
    h += `<a class="node ${i % 2 ? 'right' : ''} ${state}" href="${ready ? `#/level/${l.n}` : `#/level/${l.n}`}">
      ${state === 'here' ? '<span class="here-tag">You are here</span>' : ''}
      ${BUTTON_ICON(l.n, state)}
      <div><div class="t">${esc(l.title)}</div><div class="s">${ready ? `${st.done} of ${st.total} done` : 'Coming soon'}</div></div></a>`;
  });
  h += `</div><p class="muted small center">Sew first, then patterns, then fit, then your own designs.<br>Every lesson stays open: go in any order.</p>`;
  $app.innerHTML = h;
}

function viewLevel(n) {
  setTab('path');
  const meta = S.course.levels.find(l => l.n === +n);
  if (!meta) return viewPath();
  const lv = S.levels[meta.n];
  let h = `<a class="back" href="#/path">Path</a><h1>Level ${meta.n}: ${esc(meta.title)}</h1><p class="muted">${fmt(meta.blurb)}</p>`;
  if (!lv) {
    h += `<div class="card"><h3>Coming soon</h3><p>This level is being written. Here's what it will cover:</p>${list(meta.topics)}</div>`;
    $app.innerHTML = h; return;
  }
  const st = levelStats(meta.n);
  h += `<div class="row" style="margin:6px 0 16px"><div class="bar grow"><i style="width:${st.total ? st.done / st.total * 100 : 0}%"></i></div><span class="small muted">${st.done}/${st.total}</span></div>`;
  lv.lessons.forEach((ls, i) => {
    const kind = ls.kind || 'lesson';
    const chip = kind === 'fabric' ? '<span class="chip fabric">Fabric school</span>' : kind === 'design' ? '<span class="chip design">Design eye</span>' : kind === 'project' ? '<span class="chip project">Project</span>' : '';
    h += `<a class="lesson-item ${isDone(ls.id) ? 'done' : ''} ${kind === 'project' ? 'project' : ''}" href="#/lesson/${ls.id}">
      <div class="num">${isDone(ls.id) ? '✓' : i + 1}</div><div class="grow"><div class="lt">${esc(ls.title)}</div>
      <div class="ls">${chip}<span>${ls.minutes ? ls.minutes + ' min' : ''}</span></div></div></a>`;
  });
  if (lv.check && lv.check.length) {
    const ck = S.progress.checks[meta.n] || {};
    const got = lv.check.filter((_, i) => ck[i]).length;
    h += `<div class="card gold" style="margin-top:18px"><h3>Level ${meta.n} skill check</h3><p class="small">Can you do these? Tick them off when you can. It's for you, not a test: every level stays open.</p>`;
    lv.check.forEach((c, i) => { h += `<div class="check-row" data-act="check" data-level="${meta.n}" data-i="${i}"><div class="box ${ck[i] ? 'on' : ''}"></div><div>${fmt(c)}</div></div>`; });
    if (got === lv.check.length) h += `<p class="done-badge" style="margin-top:8px">★ Skill earned: ${esc(lv.skill || meta.title)}</p>`;
    h += `</div>`;
  }
  $app.innerHTML = h;
}

// ---------- lesson ----------
let wake = null;
async function keepAwake(on) {
  try {
    if (on && S.settings.awake && 'wakeLock' in navigator && !wake && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && document.body.classList.contains('lesson-mode')) keepAwake(true); });

function lessonPages(ls) { return 1 + (ls.steps ? ls.steps.length : 0) + 1; }

function viewLesson(id) {
  const ls = S.lessons[id];
  if (!ls) return viewPath();
  setTab('lesson'); keepAwake(true);
  const total = lessonPages(ls);
  let pg = S.page[id] ?? S.progress.step[id] ?? 0;
  if (pg >= total) pg = 0;
  S.page[id] = pg;
  const lvMeta = S.course.levels.find(l => l.n === ls.level);
  const kind = ls.kind || 'lesson';
  let body = '';
  if (pg === 0) body = lessonIntro(ls, kind);
  else if (pg <= ls.steps.length) {
    const st = ls.steps[pg - 1];
    body = `<div class="step-n">Step ${pg} of ${ls.steps.length}</div>${dia(st.dia, st.cap)}<p class="big">${fmt(st.text)}</p>
      ${st.tip ? `<div class="callout tip"><b>Tip</b>${fmt(st.tip)}</div>` : ''}${st.warn ? `<div class="callout warn"><b>Careful</b>${fmt(st.warn)}</div>` : ''}${st.why ? `<div class="callout why"><b>Why</b>${fmt(st.why)}</div>` : ''}`;
  } else body = lessonWrap(ls, kind);
  const last = pg === total - 1;
  const nextLabel = pg === 0 ? 'Start' : last ? (isDone(id) ? 'Done ✓' : 'Mark as done') : 'Next';
  $app.innerHTML = `<div class="lesson">
    <div class="lesson-head"><a class="back" href="#/level/${ls.level}">Level ${ls.level}</a><div class="title">${esc(ls.title)}</div></div>
    <div class="dots">${Array.from({ length: total }, (_, i) => `<i class="${i <= pg ? 'on' : ''}"></i>`).join('')}</div>
    <div class="lesson-body" id="lesson-body">${pg === 0 ? '' : `<h2 style="font-size:1.1rem" class="muted">${esc(ls.title)}</h2>`}${body}</div>
    <div class="lesson-nav"><div class="inner">
      ${pg > 0 ? `<button class="btn ghost" data-act="prev">Back</button>` : ''}
      <button class="btn" data-act="${last ? 'done' : 'next'}" ${last && isDone(id) ? 'data-already="1"' : ''}>${nextLabel}</button>
    </div></div></div>`;
  window.scrollTo(0, 0);
  if (lvMeta) document.title = `${ls.title} · Notch`;
}

function lessonIntro(ls, kind) {
  const chip = kind === 'fabric' ? '<span class="chip fabric">Fabric school</span>' : kind === 'design' ? '<span class="chip design">Design eye</span>' : kind === 'project' ? '<span class="chip project">Project</span>' : '';
  let h = `<div class="row wrap" style="margin-bottom:6px">${chip}${ls.minutes ? `<span class="chip">${ls.minutes} min</span>` : ''}${isDone(ls.id) ? '<span class="chip fabric">Done ✓</span>' : ''}</div>
    <h1>${esc(ls.title)}</h1>${ls.summary ? `<p class="big muted">${fmt(ls.summary)}</p>` : ''}`;
  if (ls.hero) h += dia(ls.hero, ls.heroCap);
  if (ls.learn) h += `<div class="card"><h3>What you'll learn</h3>${list(ls.learn)}</div>`;
  if (kind === 'project') {
    if (ls.finished) h += `<p><b>Finished size:</b> ${fmt(ls.finished)}</p>`;
    if (ls.fabric) h += `<div class="card"><h3>Fabric</h3>${list(ls.fabric)}</div>`;
    if (ls.need) h += `<div class="card"><h3>Supplies</h3>${list(ls.need)}</div>`;
    if (ls.cut) {
      h += `<div class="card"><h3>Cut</h3><p class="small muted">Sizes include the ${showIn(5 / 8, unit())} seam allowance.</p><table class="cut"><tr><th>Piece</th><th>Cut</th><th>Size</th></tr>`;
      ls.cut.forEach(c => { h += `<tr><td>${fmt(c.name)}</td><td>${c.qty}</td><td>${showIn(c.w, unit())} × ${showIn(c.h, unit())}</td></tr>`; });
      h += `</table>${c_note(ls)}</div>`;
      if (ls.layout) h += dia(['layout', ls.layout], 'A layout that fits. Arrows point along the lengthwise grain.');
    }
  } else if (ls.need) h += `<div class="card"><h3>What you need</h3>${list(ls.need)}</div>`;
  if (ls.why) h += `<div class="callout why"><b>Why it matters</b>${fmt(ls.why)}</div>`;
  if (ls.words) h += `<p class="small muted">Words in this lesson: ${ls.words.map(w => fmt(`[[${w}]]`)).join(', ')}. Tap any underlined word for its meaning.</p>`;
  return h;
}
const c_note = ls => ls.cutNote ? `<p class="small muted" style="margin-top:8px">${fmt(ls.cutNote)}</p>` : '';

function lessonWrap(ls, kind) {
  let h = '';
  if (ls.looks) h += `<div class="card sage"><h3>What it should look like</h3><p>${fmt(ls.looks)}</p></div>${dia(ls.looksDia)}`;
  if (ls.mistakes && ls.mistakes.length) {
    h += `<div class="card"><h3>Common mistakes and fixes</h3>`;
    ls.mistakes.forEach(([p, fx]) => { h += `<div class="mistake"><div class="p">${fmt(p)}</div><div class="f">${fmt(fx)}</div></div>`; });
    h += `</div>`;
  }
  if (ls.practice) h += `<div class="card gold"><h3>${kind === 'project' ? 'Before the next level' : 'Practice task'}</h3><p>${fmt(ls.practice)}</p>${ls.sheet ? `<button class="btn soft sm" data-act="sheet" data-kind="${ls.sheet}">Get the ${ls.sheet} practice sheet</button>` : ''}</div>`;
  if (ls.more) h += `<div class="callout"><b>Other ways</b>${fmt(ls.more)}</div>`;
  h += `<div class="card"><h3>My notes</h3><textarea id="note" data-id="${ls.id}" placeholder="What worked, what to try next time, settings you used...">${esc(S.notes?.[ls.id] || '')}</textarea></div>`;
  return h;
}

async function loadNote(id) { S.notes = S.notes || {}; if (!(id in S.notes)) S.notes[id] = (await db.get('note:' + id)) || ''; }

function goPage(id, delta) {
  const ls = S.lessons[id]; const total = lessonPages(ls);
  const pg = Math.max(0, Math.min(total - 1, (S.page[id] || 0) + delta));
  S.page[id] = pg; S.progress.step[id] = pg; saveProgress();
  viewLesson(id);
}

async function markDone(id) {
  const ls = S.lessons[id];
  if (!isDone(id)) { S.progress.done[id] = new Date().toISOString(); }
  S.progress.step[id] = 0; S.page[id] = 0;
  await saveProgress();
  const idx = S.order.indexOf(id);
  const nxt = S.order.slice(idx + 1).find(x => !isDone(x)) || S.order[idx + 1];
  const nl = nxt && S.lessons[nxt];
  const lvDone = levelStats(ls.level);
  sheet(`<div class="center"><div style="font-size:2.6rem">🧵</div><h2>${ls.kind === 'project' ? 'You made it!' : 'Nice work!'}</h2>
    <p>${esc(ls.title)} is done.${lvDone.done === lvDone.total ? ` That's all of level ${ls.level}. Check the skill list on the level page.` : ''}</p>
    ${nl ? `<a class="btn wide" href="#/lesson/${nl.id}" data-act="close-sheet">Next: ${esc(nl.title)}</a>` : ''}
    <a class="btn ghost wide" style="margin-top:10px" href="#/level/${ls.level}" data-act="close-sheet">Back to level ${ls.level}</a></div>`);
}

// ---------- glossary term ----------
function showTerm(id) {
  const t = S.glossary[id]; if (!t) return;
  sheet(`<h2>${esc(t.t)}</h2><p class="big">${fmt(t.d)}</p>${t.dia ? dia(t.dia) : ''}${t.also ? `<p class="small muted">Also called: ${esc(t.also)}</p>` : ''}`);
}

// ---------- measurements ----------
function latest(key) {
  const es = S.meas.filter(m => m.key === key).sort((a, b) => b.date.localeCompare(a.date));
  return es[0];
}
function viewMeasure() {
  setTab('measure');
  const got = S.measures.filter(m => latest(m.id)).length;
  let h = `<div class="top"><h1 style="margin:0">My measurements</h1>${unitSeg()}</div>
    <p class="muted">These feed the size picker and the pattern drafting tool later. Re-measure every few months: bodies change, and that's normal.</p>
    <div class="card tint"><div class="row"><div class="grow"><b>${got} of ${S.measures.length}</b> taken</div><a class="btn sm" href="#/measure/${(S.measures.find(m => !latest(m.id)) || S.measures[0]).id}?guided=1">${got ? 'Keep measuring' : 'Measure me'}</a></div>
    <p class="small" style="margin:8px 0 0">You'll need a soft tape measure, a mirror, and a piece of elastic or string tied around your waist. A helper makes the back ones easier.</p></div>`;
  S.measureGroups.forEach(g => {
    h += `<h3 style="margin-top:18px">${esc(g.title)}</h3><div class="card" style="padding:4px 16px">`;
    S.measures.filter(m => m.group === g.id).forEach(m => {
      const e = latest(m.id);
      h += `<a class="m-item" href="#/measure/${m.id}"><div class="grow">${esc(m.name)}${m.optional ? ' <span class="chip">optional</span>' : ''}</div><div class="v ${e ? '' : 'none'}">${e ? showCm(e.cm, unit()) : 'Not yet'}</div></a>`;
    });
    h += `</div>`;
  });
  $app.innerHTML = h;
}
const unitSeg = () => `<div class="seg" role="group" aria-label="Units"><button data-act="units" data-u="in" class="${unit() === 'in' ? 'on' : ''}">in</button><button data-act="units" data-u="cm" class="${unit() === 'cm' ? 'on' : ''}">cm</button></div>`;

function viewMeasureOne(key, guided) {
  setTab('measure');
  const m = S.measures.find(x => x.id === key); if (!m) return viewMeasure();
  const idx = S.measures.indexOf(m);
  const hist = S.meas.filter(e => e.key === key).sort((a, b) => b.date.localeCompare(a.date));
  const last = hist[0];
  let h = `<div class="top"><a class="back" href="#/measure">Measurements</a>${unitSeg()}</div>
    ${guided ? `<div class="step-n">${idx + 1} of ${S.measures.length}</div>` : ''}
    <h1>${esc(m.name)}${m.optional ? ' <span class="chip">optional</span>' : ''}</h1><p class="muted">${fmt(m.why)}</p>
    ${dia(['body', { m: m.id }])}
    <div class="card"><h3>How to measure</h3><ol style="padding-left:1.2em;margin:0">${m.how.map(x => `<li>${fmt(x)}</li>`).join('')}</ol>
    ${m.tip ? `<div class="callout tip" style="margin-top:10px"><b>Tip</b>${fmt(m.tip)}</div>` : ''}</div>
    <div class="card"><label for="mval"><b>${last ? 'New measurement' : 'Your measurement'}</b></label>
    <div class="num-input" style="margin:8px 0 10px"><input id="mval" inputmode="decimal" autocomplete="off" placeholder="${unit() === 'in' ? 'e.g. 34 1/2' : 'e.g. 87.5'}"><span class="u">${unit()}</span></div>
    <button class="btn wide" data-act="save-m" data-key="${key}" data-guided="${guided ? 1 : ''}">Save${guided ? ' and next' : ''}</button>
    ${guided ? `<button class="btn ghost wide" style="margin-top:10px" data-act="skip-m" data-key="${key}">Skip for now</button>` : ''}</div>`;
  if (hist.length) {
    h += `<div class="card"><h3>History</h3>`;
    hist.forEach(e => { h += `<div class="hist"><span>${dateStr(e.date)}</span><span class="row"><b>${showCm(e.cm, unit())}</b><button class="x" data-act="del-m" data-id="${e.id}" aria-label="Delete">✕</button></span></div>`; });
    if (hist.length > 1) { const d = hist[0].cm - hist[hist.length - 1].cm; h += `<p class="small muted" style="margin:8px 0 0">Change since ${dateStr(hist[hist.length - 1].date)}: ${d >= 0 ? '+' : '−'}${showCm(Math.abs(d), unit())}</p>`; }
    h += `</div>`;
  }
  $app.innerHTML = h;
}

async function saveMeasure(key, guided) {
  const inp = document.getElementById('mval');
  const v = parseLen(inp.value);
  const lim = unit() === 'in' ? [1, 120] : [2.5, 300];
  if (isNaN(v) || v < lim[0] || v > lim[1]) { toast(unit() === 'in' ? 'Type a number like 34 or 34 1/2.' : 'Type a number like 87 or 87.5.'); inp.focus(); return; }
  const cm = unit() === 'in' ? v * CM_PER_IN : v;
  const rec = { id: db.uid(), type: 'measure', key, cm, date: new Date().toISOString() };
  await db.put(rec); S.meas.push(rec);
  toast(`Saved: ${showCm(cm, unit())}`);
  if (guided) nextMeasure(key); else viewMeasureOne(key, false);
}
function nextMeasure(key) {
  const i = S.measures.findIndex(m => m.id === key);
  const n = S.measures[i + 1];
  if (n) location.hash = `#/measure/${n.id}?guided=1`; else { location.hash = '#/measure'; toast('All done. Nice measuring!'); }
}

// ---------- more ----------
function viewMore() {
  setTab('more');
  const s = S.settings;
  const seg = (act, val, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="${act}" data-v="${v}" class="${val === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let h = `<h1>More</h1>
  <div class="card"><h3>Settings</h3>
    <div class="set-row"><span>Units</span>${seg('set-units', s.units, [['in', 'Inches'], ['cm', 'cm']])}</div>
    <div class="set-row"><span>Text size</span>${seg('set-size', s.size, [['normal', 'Normal'], ['big', 'Big']])}</div>
    <div class="set-row"><span>Look</span>${seg('set-theme', s.theme, [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
    <div class="set-row"><span>Keep screen awake in lessons</span>${seg('set-awake', s.awake ? 'on' : 'off', [['on', 'On'], ['off', 'Off']])}</div>
    <div class="set-row"><span>Paper for printing</span>${seg('set-paper', s.paper, [['letter', 'Letter'], ['a4', 'A4']])}</div>
  </div>
  <div class="card"><h3>Your data</h3>
    <p class="small">Everything you save (progress, measurements, and notes) stays on this phone only. Save a backup now and then, and keep it somewhere safe like Files or iCloud Drive.</p>
    ${s.lastBackup ? `<p class="small muted">Last backup: ${dateStr(s.lastBackup)}</p>` : '<p class="small muted">No backup saved yet.</p>'}
    <button class="btn wide" data-act="export">Export backup</button>
    <label class="btn ghost wide" style="margin-top:10px">Import backup<input type="file" accept="application/json,.json" id="import" hidden></label>
    <p class="small muted" style="margin:10px 0 0">Importing replaces what's in Notch now. A backup from a newer Notch is refused until this app updates, so nothing gets lost.</p>
  </div>
  <div class="card"><h3>Practice sheets</h3><p class="small">Print these and stitch along the lines with no thread. Each has a test square so you can check the size.</p>
    <div class="row wrap">${[['straight', 'Straight'], ['corners', 'Corners'], ['curves', 'Curves'], ['mixed', 'Mixed']].map(([k, l]) => `<button class="btn soft sm" data-act="sheet" data-kind="${k}">${l}</button>`).join('')}</div></div>
  <div class="card"><h3>How to read the diagrams</h3><div class="legend">
    ${draw(['legend', { k: 'right' }])}<span>Right side of the fabric (the "pretty" side)</span>
    ${draw(['legend', { k: 'wrong' }])}<span>Wrong side (the back)</span>
    ${draw(['legend', { k: 'lining' }])}<span>Lining fabric</span>
    ${draw(['legend', { k: 'stitch' }])}<span>Stitching</span>
    ${draw(['legend', { k: 'zig' }])}<span>Zigzag stitch</span>
    ${draw(['legend', { k: 'fold' }])}<span>Fold line</span>
    ${draw(['legend', { k: 'grain' }])}<span>Grainline (lengthwise grain)</span>
    ${draw(['legend', { k: 'hi' }])}<span>Look here: the part this step is about</span></div></div>
  <div class="card"><h3>About Notch</h3>
    <p class="small">Notch uses one seam allowance everywhere: <b>${showIn(5 / 8, 'in')} (${showIn(5 / 8, 'cm')})</b>, the same as most store-bought patterns in the US. If a step uses something different, it says so.</p>
    <p class="small">All lessons, diagrams, and patterns are original. No AI images.</p>
    <p class="small muted">Version ${db.APP_VERSION}</p></div>`;
  $app.innerHTML = h;
}

async function exportBackup() {
  try {
    const data = await db.makeBackup();
    const name = `notch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    await saveFile(new File([JSON.stringify(data)], name, { type: 'application/json' }), 'Notch backup');
    S.settings.lastBackup = new Date().toISOString(); await saveSettings();
    if (location.hash.startsWith('#/more')) viewMore();
  } catch (e) { if (e.name !== 'AbortError') toast('Could not make the backup: ' + e.message); }
}
async function saveFile(file, title) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (e) { if (e.name === 'AbortError') throw e; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function importBackup(file) {
  let data = null;
  try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
  const ck = db.checkBackup(data);
  if (!ck.ok) { toast(ck.why + ' Nothing was changed.', null, null, 6000); return; }
  const when = data.exportedAt ? dateStr(data.exportedAt) : 'an unknown date';
  if (!confirm(`Replace everything in Notch on this phone with the backup from ${when}?\n\nIf you're not sure, export a backup of what's here first.`)) return;
  try {
    await db.restoreBackup(data);
    S.notes = {}; S.page = {};
    await loadUser();
    toast('Backup loaded.');
    route();
  } catch (e) { toast('Could not load that backup, so nothing was changed. ' + e.message, null, null, 6000); }
}

async function makeSheet(kind) {
  try {
    const blob = practiceSheet(kind, S.settings.paper);
    await saveFile(new File([blob], `notch-practice-${kind}-${S.settings.paper}.pdf`, { type: 'application/pdf' }), 'Notch practice sheet');
  } catch (e) { if (e.name !== 'AbortError') toast('Could not make the sheet: ' + e.message); }
}

// ---------------- events ----------------
$app.addEventListener('click', async e => {
  const t = e.target.closest('.term'); if (t) { showTerm(t.dataset.term); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, id = (location.hash.match(/^#\/lesson\/([\w-]+)/) || [])[1];
  if (act === 'next') goPage(id, 1);
  else if (act === 'prev') goPage(id, -1);
  else if (act === 'done') { if (a.dataset.already) { location.hash = `#/level/${S.lessons[id].level}`; } else markDone(id); }
  else if (act === 'check') {
    const lv = a.dataset.level, i = a.dataset.i; S.progress.checks[lv] = S.progress.checks[lv] || {};
    S.progress.checks[lv][i] = !S.progress.checks[lv][i]; await saveProgress(); viewLevel(lv);
  }
  else if (act === 'units') { S.settings.units = a.dataset.u; await saveSettings(); route(); }
  else if (act === 'save-m') saveMeasure(a.dataset.key, !!a.dataset.guided);
  else if (act === 'skip-m') nextMeasure(a.dataset.key);
  else if (act === 'del-m') {
    const rec = S.meas.find(m => m.id === a.dataset.id); if (!rec) return;
    await db.remove(rec.id); S.meas = S.meas.filter(m => m !== rec); route();
    toast('Measurement deleted.', 'Undo', async () => { await db.put(rec); S.meas.push(rec); route(); }, 6000);
  }
  else if (act.startsWith('set-')) {
    const k = act.slice(4), v = a.dataset.v;
    S.settings[k] = k === 'awake' ? v === 'on' : v; await saveSettings(); viewMore();
  }
  else if (act === 'export') exportBackup();
  else if (act === 'sheet') makeSheet(a.dataset.kind);
});
$app.addEventListener('change', e => { if (e.target.id === 'import' && e.target.files[0]) { importBackup(e.target.files[0]); e.target.value = ''; } });
let noteTimer;
$app.addEventListener('input', e => {
  if (e.target.id !== 'note') return;
  const id = e.target.dataset.id, v = e.target.value; S.notes[id] = v;
  clearTimeout(noteTimer); noteTimer = setTimeout(() => db.set('note:' + id, v), 400);
});
$app.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'mval') document.querySelector('[data-act="save-m"]').click();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('term')) { e.preventDefault(); showTerm(e.target.dataset.term); }
});
// Swipe left/right between lesson steps.
let tx0 = null, ty0 = null;
$app.addEventListener('touchstart', e => { if (!document.body.classList.contains('lesson-mode') || e.target.closest('textarea')) { tx0 = null; return; } tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
$app.addEventListener('touchend', e => {
  if (tx0 == null) return;
  const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; tx0 = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
  const id = (location.hash.match(/^#\/lesson\/([\w-]+)/) || [])[1]; if (!id) return;
  const ls = S.lessons[id], pg = S.page[id] || 0;
  if (dx < 0 && pg < lessonPages(ls) - 1) goPage(id, 1); else if (dx > 0 && pg > 0) goPage(id, -1);
}, { passive: true });

// ---------------- router ----------------
let lastPath = '';
async function route() {
  closeSheet();
  const h = location.hash || '#/path';
  if (h.split('?')[0] !== lastPath) { lastPath = h.split('?')[0]; window.scrollTo(0, 0); }
  const [path, query] = h.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'lesson') { keepAwake(false); document.title = 'Notch'; }
  if (parts[0] === 'level') viewLevel(parts[1]);
  else if (parts[0] === 'lesson') { await loadNote(parts[1]); viewLesson(parts[1]); }
  else if (parts[0] === 'measure' && parts[1]) viewMeasureOne(parts[1], /guided=1/.test(query || ''));
  else if (parts[0] === 'measure') viewMeasure();
  else if (parts[0] === 'more') viewMore();
  else viewPath();
}
window.addEventListener('hashchange', route);

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="9" fill="var(--accent)"/><path d="M9 9L16 19L23 9" fill="none" stroke="var(--on-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 24H24" stroke="var(--on-accent)" stroke-width="2.2" stroke-dasharray="3 2.5" stroke-linecap="round"/></svg>`;

// ---------------- start ----------------
(async function start() {
  try {
    await db.open();
    const mg = await db.migrate();
    if (mg.newer) {
      $app.innerHTML = `<div class="card tint"><h2>Please update Notch</h2><p>Your saved data was made by a newer version of Notch than this one. To keep it safe, this older version won't touch it.</p><p>Close Notch fully (swipe it away) and open it again while online to get the update.</p></div>`;
      return;
    }
    await Promise.all([loadAll(), loadUser()]);
  } catch (e) {
    $app.innerHTML = `<div class="card tint"><h2>Notch couldn't start</h2><p>${esc(e.message)}</p><p>Try closing and reopening the app.</p></div>`;
    return;
  }
  route();
  if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch (e) { /* fine */ } }
  if ('serviceWorker' in navigator && !/[?&]nosw/.test(location.search)) { // ?nosw skips offline mode while testing
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) toast('Notch was updated.', 'Reload', () => location.reload(), 15000); });
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();

// for quick checks in the browser console
window.notch = { S, db };
