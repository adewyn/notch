// Library: the glossary, flashcards, the fabric guide, and the Fix it troubleshooter.
import * as db from './db.js';
import { $app, S, esc, fmt, list, dia, showTerm, toast } from './core.js';

const tab = () => { document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === 'library')); document.body.classList.remove('lesson-mode'); };
const back = (href, label) => `<a class="back" href="${href}">${label}</a>`;
const termIds = () => Object.keys(S.glossary).sort((a, b) => S.glossary[a].t.localeCompare(S.glossary[b].t));

// ---------- hub ----------
export function viewLibrary() {
  tab();
  const due = cardQueue().length;
  const tile = (href, title, sub, icon) => `<a class="tile" href="${href}"><span class="ic">${icon}</span><span><b>${title}</b><span class="small muted">${sub}</span></span></a>`;
  $app.innerHTML = `<h1>Library</h1>
    <div class="search"><input id="lib-q" type="search" placeholder="Look up a sewing word" autocomplete="off" enterkeyhint="search"></div>
    <div id="lib-hits"></div>
    <div class="tiles">
      ${tile('#/fix', 'Fix it', `${S.trouble.problems.length} common problems, solved step by step`, ICON.fix)}
      ${tile('#/library/fabrics', 'Fabric guide', `${S.fabrics.length} fabrics: what to sew, which needle, how hot to press`, ICON.fabric)}
      ${tile('#/library/glossary', 'Glossary', `${termIds().length} words, explained simply`, ICON.book)}
      ${tile('#/library/cards', 'Flashcards', due ? `${due} ready to practice` : 'All caught up', ICON.cards)}
    </div>`;
}
function searchHits(q) {
  q = q.trim().toLowerCase(); if (!q) return '';
  const hits = termIds().filter(id => id.includes(q) || S.glossary[id].t.toLowerCase().includes(q) || (S.glossary[id].also || '').toLowerCase().includes(q)).slice(0, 8);
  const fab = S.fabrics.filter(x => x.name.toLowerCase().includes(q)).slice(0, 3);
  if (!hits.length && !fab.length) return `<p class="small muted">No match for "${esc(q)}".</p>`;
  return `<div class="card" style="padding:4px 16px">${hits.map(id => `<button class="m-item linkrow" data-act="lib-term" data-id="${esc(id)}"><span class="grow">${esc(S.glossary[id].t)}</span><span class="v small muted">Word</span></button>`).join('')}
    ${fab.map(x => `<a class="m-item" href="#/library/fabric/${x.id}"><span class="grow">${esc(x.name)}</span><span class="v small muted">Fabric</span></a>`).join('')}</div>`;
}

// ---------- glossary ----------
export function viewGlossary() {
  tab();
  let h = `${back('#/library', 'Library')}<h1>Glossary</h1>
    <div class="search"><input id="lib-q2" type="search" placeholder="Filter words" autocomplete="off"></div><div class="card" id="gl-list" style="padding:4px 16px">`;
  let letter = '';
  for (const id of termIds()) {
    const t = S.glossary[id], L = t.t[0].toUpperCase();
    if (L !== letter) { letter = L; h += `<div class="gl-letter" data-l="${L}">${L}</div>`; }
    h += `<button class="m-item linkrow gl" data-act="lib-term" data-id="${esc(id)}" data-s="${esc((id + ' ' + t.t + ' ' + (t.also || '')).toLowerCase())}"><span class="grow">${esc(t.t)}</span></button>`;
  }
  $app.innerHTML = h + `</div>`;
}
function filterGlossary(q) {
  q = q.trim().toLowerCase();
  document.querySelectorAll('#gl-list .gl').forEach(b => { b.hidden = !!q && !b.dataset.s.includes(q); });
  document.querySelectorAll('#gl-list .gl-letter').forEach(l => {
    let n = l.nextElementSibling, any = false;
    while (n && !n.classList.contains('gl-letter')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
    l.hidden = !any;
  });
}

// ---------- flashcards ----------
// Each word keeps a box number. "Got it" moves it up a box (seen again later); "Still learning" sends it back to box 0.
const WAIT_DAYS = [1, 3, 7, 21, 60];
const DAY = 864e5;
function deckIds() {
  const words = new Set();
  for (const id of Object.keys(S.progress.done)) {
    const ls = S.lessons[id]; if (!ls) continue;
    (ls.words || []).forEach(w => S.glossary[w] && words.add(w));
    JSON.stringify(ls).replace(/\[\[([^\]|]+)/g, (_, w) => { w = w.toLowerCase().trim(); if (S.glossary[w]) words.add(w); return ''; });
  }
  return S.settings.deck === 'all' || !words.size ? termIds() : termIds().filter(id => words.has(id));
}
function cardQueue() {
  const now = Date.now(), ids = deckIds();
  const due = ids.filter(id => S.cards[id] && S.cards[id].due <= now).sort((a, b) => S.cards[a].due - S.cards[b].due);
  const fresh = ids.filter(id => !S.cards[id]).slice(0, 8);
  return [...due, ...fresh];
}
let session = null;
export function viewCards() {
  tab();
  if (!session) session = { queue: cardQueue(), flipped: false, seen: 0 };
  const learned = deckIds().filter(id => S.cards[id] && S.cards[id].box >= 2).length, total = deckIds().length;
  const doneLessons = Object.keys(S.progress.done).length;
  let h = `${back('#/library', 'Library')}<div class="top"><h1 style="margin:0">Flashcards</h1>
    <div class="seg"><button data-act="lib-deck" data-v="mine" class="${S.settings.deck !== 'all' ? 'on' : ''}">My words</button><button data-act="lib-deck" data-v="all" class="${S.settings.deck === 'all' ? 'on' : ''}">All</button></div></div>
    <p class="small muted">${learned} of ${total} words learned.${S.settings.deck !== 'all' && !doneLessons ? ' "My words" fills up as you finish lessons; for now it shows every word.' : ''}</p>`;
  const id = session.queue[0];
  if (!id) {
    h += `<div class="card sage center"><h2>All caught up</h2><p>${session.seen ? `You practiced ${session.seen} card${session.seen === 1 ? '' : 's'}. ` : ''}Words you know come back after a few days, so they stick.</p>
      <button class="btn soft" data-act="lib-more">Practice a few more anyway</button></div>`;
  } else {
    const t = S.glossary[id];
    h += `<div class="small muted center" style="margin-bottom:6px">${session.queue.length} to go</div>
      <button class="flash ${session.flipped ? 'flipped' : ''}" data-act="lib-flip" aria-live="polite">
        <span class="small muted">${session.flipped ? 'Meaning' : 'What does this mean?'}</span>
        <span class="ft">${esc(t.t)}</span>
        ${session.flipped ? `<span class="fd">${fmt(t.d)}</span>${t.dia ? dia(t.dia) : ''}` : '<span class="small muted">Tap to see the meaning</span>'}
      </button>
      ${session.flipped ? `<div class="row" style="margin-top:12px"><button class="btn ghost grow" data-act="lib-grade" data-g="0">Still learning</button><button class="btn grow" data-act="lib-grade" data-g="1">Got it</button></div>` : ''}`;
  }
  $app.innerHTML = h;
}
async function grade(ok) {
  const id = session.queue.shift(); if (!id) return;
  const c = S.cards[id] || { box: 0 };
  if (ok) { c.box = Math.min(c.box + 1, WAIT_DAYS.length); c.due = Date.now() + WAIT_DAYS[c.box - 1] * DAY; }
  else { c.box = 0; c.due = Date.now(); session.queue.splice(Math.min(3, session.queue.length), 0, id); }
  S.cards[id] = c; session.flipped = false; session.seen++;
  await db.set('cards', S.cards);
  viewCards();
}

// ---------- fabric guide ----------
const LEVEL = { 1: 'Great for beginners', 2: 'Needs a little care', 3: 'Tricky' };
export function swatch(weave, size = 56) {
  const s = 60; let inner = '';
  if (weave === 'twill') for (let i = -60; i < 60; i += 7) inner += `<path d="M${i} 60L${i + 60} 0" class="soft"/>`;
  else if (weave === 'satin') inner = `<path d="M0 0H60V60H0Z" class="hi-f" style="opacity:.25"/>` + [12, 30, 48].map(y => `<path d="M4 ${y}Q30 ${y - 6} 56 ${y}" class="soft"/>`).join('');
  else if (weave === 'knit' || weave === 'rib') for (let y = 6; y < 60; y += 10) for (let x = 4; x < 60; x += weave === 'rib' ? 8 : 12) inner += `<path d="M${x} ${y}l4 7l4 -7" class="soft"/>`;
  else if (weave === 'pile') for (let x = 5; x < 60; x += 10) inner += `<path d="M${x} 2V58" class="ink" style="stroke-width:5;opacity:.35"/>`;
  else if (weave === 'gauze') { for (let i = 6; i < 60; i += 9) inner += `<path d="M${i} 0V60M0 ${i}H60" class="soft" style="opacity:.7"/>`; }
  else if (weave === 'crinkle') for (let x = 0; x < 60; x += 12) inner += `<path d="M${x + 3} 0q4 7.5 0 15t0 15t0 15t0 15" class="soft"/>`;
  else for (let i = 5; i < 60; i += 6) inner += `<path d="M${i} 0V60M0 ${i}H60" class="soft" style="opacity:.6"/>`;
  return `<svg viewBox="0 0 ${s} ${s}" width="${size}" height="${size}" class="swatch" aria-hidden="true"><defs><clipPath id="sw-${weave}"><rect width="60" height="60" rx="12"/></clipPath></defs><g clip-path="url(#sw-${weave})"><rect width="60" height="60" class="fab-r"/>${inner}</g><rect x=".8" y=".8" width="58.4" height="58.4" rx="11.5" class="ink" style="stroke-width:1.2"/></svg>`;
}
let fabFilter = 'all';
export function viewFabrics() {
  tab();
  const opts = [['all', 'All'], ['easy', 'Beginner'], ['woven', 'Woven'], ['knit', 'Knit']];
  const shown = S.fabrics.filter(x => fabFilter === 'all' || (fabFilter === 'easy' ? x.level === 1 : x.group === fabFilter));
  $app.innerHTML = `${back('#/library', 'Library')}<h1>Fabric guide</h1>
    <p class="muted small">What each fabric is like, what it's for, and how to sew and press it. Always test on a scrap first.</p>
    <div class="chips">${opts.map(([v, l]) => `<button class="chip-btn ${fabFilter === v ? 'on' : ''}" data-act="lib-ff" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="card" style="padding:4px 14px">${shown.map(x => `<a class="fab-row" href="#/library/fabric/${x.id}">${swatch(x.weave, 44)}<span class="grow"><b>${esc(x.name)}</b><span class="small muted">${esc(x.fiber.split(' (')[0])} · ${x.weight} · ${esc(x.drape.toLowerCase())}</span></span><span class="dotlvl l${x.level}" title="${LEVEL[x.level]}"></span></a>`).join('')}</div>
    <p class="small muted center"><span class="dotlvl l1"></span> great for beginners <span class="dotlvl l2"></span> a little care <span class="dotlvl l3"></span> tricky</p>`;
}
export function viewFabric(id) {
  tab();
  const x = S.fabrics.find(f => f.id === id); if (!x) return viewFabrics();
  const row = (k, v) => `<div class="kv"><span>${k}</span><b>${fmt(v)}</b></div>`;
  $app.innerHTML = `${back('#/library/fabrics', 'Fabric guide')}
    <div class="row" style="gap:14px;margin:6px 0 10px">${swatch(x.weave, 72)}<div><h1 style="margin:0">${esc(x.name)}</h1><span class="chip lvl${x.level}">${LEVEL[x.level]}</span></div></div>
    <p class="big">${fmt(x.about)}</p>
    <div class="card">${row('Fiber', x.fiber)}${row('Made as', x.group === 'knit' ? (x.weave === 'rib' ? 'Rib knit' : 'Knit') : { plain: 'Plain weave', twill: 'Twill weave', satin: 'Satin weave', pile: 'Woven with a pile', gauze: 'Gauze weave', crinkle: 'Plain weave, puckered' }[x.weave])}${row('Weight', x.weight[0].toUpperCase() + x.weight.slice(1))}${row('Drape', x.drape)}${row('Stretch', x.stretch)}</div>
    <div class="card"><h3>Good for</h3>${list(x.uses)}</div>
    <div class="card"><h3>How to sew it</h3>${row('Needle', x.needle)}${row('Stitch length', x.stitch)}${row('Press', x.press)}${row('Prewash', x.prewash)}</div>
    ${x.tips && x.tips.length ? `<div class="callout tip"><b>Tips</b>${list(x.tips)}</div>` : ''}`;
}

// ---------- Fix it ----------
export function viewFix() {
  tab();
  let h = `${back('#/library', 'Library')}<h1>Fix it</h1><p class="muted">Pick what's going wrong. Try the fixes in order: the easiest and most likely come first.</p>`;
  for (const g of S.trouble.groups) {
    h += `<h3 style="margin-top:16px">${esc(g.title)}</h3><div class="card" style="padding:4px 16px">`;
    S.trouble.problems.filter(p => p.group === g.id).forEach(p => { h += `<a class="m-item" href="#/fix/${p.id}"><span class="grow">${esc(p.title)}</span></a>`; });
    h += `</div>`;
  }
  $app.innerHTML = h;
}
const fixStep = {};
export function viewFixOne(id) {
  tab();
  const p = S.trouble.problems.find(x => x.id === id); if (!p) return viewFix();
  const i = fixStep[id] || 0;
  let h = `${back('#/fix', 'Fix it')}<h1>${esc(p.title)}</h1>${p.about ? `<p class="muted">${fmt(p.about)}</p>` : ''}`;
  if (i >= p.steps.length) {
    h += `<div class="card gold"><h3>Still not fixed?</h3><p>Change the needle and rethread everything (top and bobbin) one more time: together they solve most problems. Then check your machine's manual, clean out the lint under the needle plate, or take it for a service.</p>
      <button class="btn soft" data-act="fix-restart" data-id="${id}">Start over</button></div>`;
  }
  p.steps.forEach((st, n) => {
    const state = n < i ? 'past' : n === i ? 'now' : 'later';
    h += `<div class="card fix ${state}"><div class="row" style="align-items:flex-start"><span class="fixn">${n + 1}</span><div class="grow"><b>${fmt(st.check)}</b>
      ${state === 'now' ? `<p>${fmt(st.fix)}</p>${st.dia ? dia(st.dia) : ''}${st.lesson && S.lessons[st.lesson] ? `<p class="small"><a href="#/lesson/${st.lesson}">Lesson: ${esc(S.lessons[st.lesson].title)}</a></p>` : ''}
      <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-act="fix-ok" data-id="${id}">That fixed it</button><button class="btn ghost sm" data-act="fix-next" data-id="${id}">Still wrong</button></div>` : state === 'past' ? `<p class="small muted" style="margin:4px 0 0">${fmt(st.fix)}</p>` : ''}
      </div></div></div>`;
  });
  $app.innerHTML = h;
}

// ---------- events ----------
$app.addEventListener('input', e => {
  if (e.target.id === 'lib-q') document.getElementById('lib-hits').innerHTML = searchHits(e.target.value);
  if (e.target.id === 'lib-q2') filterGlossary(e.target.value);
});
$app.addEventListener('click', async e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'lib-term') showTerm(a.dataset.id);
  else if (act === 'lib-flip') { if (!session.flipped) { session.flipped = true; viewCards(); } }
  else if (act === 'lib-grade') grade(a.dataset.g === '1');
  else if (act === 'lib-more') { const ids = deckIds().filter(id => S.cards[id]).sort(() => Math.random() - 0.5).slice(0, 8); session = { queue: ids.length ? ids : deckIds().slice(0, 8), flipped: false, seen: 0 }; viewCards(); }
  else if (act === 'lib-deck') { S.settings.deck = a.dataset.v; await db.set('settings', S.settings); session = null; viewCards(); }
  else if (act === 'lib-ff') { fabFilter = a.dataset.v; viewFabrics(); }
  else if (act === 'fix-next') { fixStep[a.dataset.id] = (fixStep[a.dataset.id] || 0) + 1; viewFixOne(a.dataset.id); }
  else if (act === 'fix-restart') { fixStep[a.dataset.id] = 0; viewFixOne(a.dataset.id); }
  else if (act === 'fix-ok') { fixStep[a.dataset.id] = 0; toast('Nice. Back to sewing!'); location.hash = '#/fix'; }
});
export function resetCardSession() { session = null; }

const ICON = {
  fix: '<svg viewBox="0 0 24 24"><path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/></svg>',
  fabric: '<svg viewBox="0 0 24 24"><path d="M4 5h12v14H4z"/><path d="M16 5q4 4 0 7t0 7"/><path d="M8 5v14M12 5v14" style="opacity:.5"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="7" y="4" width="13" height="16" rx="2"/><path d="M4 7v11a2 2 0 0 0 2 2"/></svg>',
};
