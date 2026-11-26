// My projects: things you're making or want to make, with notes and photos.
// Saved as records of type 'project'; photos are blobs with { id, project, blob, w, h }.
import * as db from './db.js';
import { $app, S, esc, fmt, dateStr, toast, sheet, closeSheet } from './core.js';

const STATUS = [['idea', 'Idea'], ['sewing', 'Sewing'], ['done', 'Finished']];
const urls = new Map(); // photo id -> object URL (made once, kept while the app is open)
async function photoUrl(id) {
  if (urls.has(id)) return urls.get(id);
  const b = await db.getBlob(id); if (!b) return '';
  const u = URL.createObjectURL(b.blob); urls.set(id, u); return u;
}
const tab = () => { document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === 'projects')); document.body.classList.remove('lesson-mode'); };
const byUpdated = (a, b) => (b.updated || '').localeCompare(a.updated || '');
let filter = 'all';

export async function viewProjects() {
  tab();
  const all = S.projects.slice().sort(byUpdated);
  const shown = all.filter(p => filter === 'all' || p.status === filter);
  let h = `<div class="top"><h1 style="margin:0">My projects</h1><button class="btn sm" data-act="pj-new">New</button></div>`;
  if (!all.length) {
    h += `<div class="card tint"><h3>Keep track of what you make</h3><p>Add a project for anything you're sewing or dreaming of: the pattern, the size you cut, your fabric, photos, and what you'd change next time. Future you will thank you.</p>
      <p class="small muted">Tip: every Notch project lesson has a button to add it here.</p><button class="btn" data-act="pj-new">Add my first project</button></div>`;
    $app.innerHTML = h; return;
  }
  h += `<div class="chips">${[['all', 'All'], ...STATUS].map(([v, l]) => `<button class="chip-btn ${filter === v ? 'on' : ''}" data-act="pj-filter" data-v="${v}">${l} <span class="muted">${v === 'all' ? all.length : all.filter(p => p.status === v).length}</span></button>`).join('')}</div>`;
  h += `<div class="pj-grid">${shown.map(p => `<a class="pj-card" href="#/project/${p.id}"><div class="pj-thumb" data-photo="${(p.photos || [])[0] || ''}">${(p.photos || []).length ? '' : THUMB}</div>
    <div class="pj-meta"><b>${esc(p.name || 'Untitled')}</b><span class="chip st-${p.status}">${STATUS.find(s => s[0] === p.status)?.[1] || ''}</span></div></a>`).join('') || '<p class="muted">Nothing here yet.</p>'}</div>`;
  $app.innerHTML = h;
  fillPhotos();
}
async function fillPhotos() {
  for (const el of $app.querySelectorAll('[data-photo]')) {
    const id = el.dataset.photo; if (!id) continue;
    const u = await photoUrl(id); if (u) el.style.backgroundImage = `url("${u}")`;
  }
}

export async function newProject(lessonId) {
  const ls = lessonId && S.lessons[lessonId];
  const now = new Date().toISOString();
  const p = { id: db.uid(), type: 'project', name: ls ? ls.title.replace(/^Project:\s*/i, '').replace(/^./, c => c.toUpperCase()) : '', status: ls ? 'sewing' : 'idea',
    lesson: ls ? ls.id : '', pattern: ls ? 'Notch lesson' : '', size: '', fabric: ls && ls.fabric ? ls.fabric.map(x => x.replace(/\{\{([^}]+)\}\}/g, '$1')).join('\n') : '',
    notes: '', changes: '', photos: [], created: now, updated: now, started: ls ? now.slice(0, 10) : '', finished: '' };
  await db.put(p); S.projects.push(p);
  location.hash = `#/project/${p.id}`;
}

const FIELDS = [
  ['name', 'Name', 'input', 'What are you making?'],
  ['pattern', 'Pattern', 'input', 'Which pattern, or "my own"'],
  ['size', 'Size and changes to the pattern', 'input', 'e.g. size 14, blended to 16 at the hip, +1 in length'],
  ['fabric', 'Fabric and notions', 'textarea', 'What fabric, how much, and anything else (zipper, buttons, elastic)'],
  ['notes', 'Notes', 'textarea', 'Settings, steps that went well, things to remember'],
  ['changes', 'Next time I would...', 'textarea', 'Fit changes and lessons learned'],
];
export async function viewProject(id) {
  tab();
  const p = S.projects.find(x => x.id === id); if (!p) { location.hash = '#/projects'; return; }
  const ls = p.lesson && S.lessons[p.lesson];
  let h = `<a class="back" href="#/projects">My projects</a>
    <div class="seg wide-seg" style="margin:8px 0 14px">${STATUS.map(([v, l]) => `<button data-act="pj-status" data-v="${v}" class="${p.status === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Photos</h3><label class="btn soft sm">Add photos<input type="file" accept="image/*" multiple id="pj-photo" hidden></label></div>
      <div class="pj-photos">${(p.photos || []).map(ph => `<button class="pj-ph" data-act="pj-view" data-ph="${ph}" data-photo="${ph}" aria-label="Open photo"></button>`).join('') || '<p class="small muted" style="margin:10px 0 0">Before, during, and after photos are fun to look back on.</p>'}</div></div>`;
  h += `<div class="card">`;
  for (const [k, label, kind, ph] of FIELDS) {
    h += `<label class="fld"><span>${label}</span>${kind === 'input' ? `<input data-pj="${k}" value="${esc(p[k] || '')}" placeholder="${esc(ph)}">` : `<textarea data-pj="${k}" placeholder="${esc(ph)}">${esc(p[k] || '')}</textarea>`}</label>`;
  }
  h += `<div class="row"><label class="fld grow"><span>Started</span><input type="date" data-pj="started" value="${esc(p.started || '')}"></label><label class="fld grow"><span>Finished</span><input type="date" data-pj="finished" value="${esc(p.finished || '')}"></label></div></div>`;
  if (ls) h += `<p class="small"><a href="#/lesson/${ls.id}">Open the lesson: ${esc(ls.title)}</a></p>`;
  h += `<p class="small muted">Saved as you type. Last changed ${dateStr(p.updated)}.</p>
    <button class="btn ghost wide danger" data-act="pj-delete">Delete this project</button>`;
  $app.innerHTML = h;
  fillPhotos();
}

// Shrink photos before saving so backups stay a sensible size (longest side 1600 px).
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That photo couldn't be opened.")); i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k), hgt = Math.round(img.naturalHeight * k);
    const c = document.createElement('canvas'); c.width = w; c.height = hgt;
    c.getContext('2d').drawImage(img, 0, 0, w, hgt);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
    if (!blob) throw new Error("That photo couldn't be saved.");
    return { blob, w, h: hgt };
  } finally { URL.revokeObjectURL(url); }
}
async function addPhotos(p, files) {
  let n = 0;
  for (const file of files) {
    try {
      const s = await shrink(file); const id = db.uid();
      await db.putBlob({ id, project: p.id, blob: s.blob, w: s.w, h: s.h, date: new Date().toISOString() });
      p.photos = [...(p.photos || []), id]; n++;
    } catch (e) { toast(e.message); }
  }
  if (n) { await save(p); toast(n === 1 ? 'Photo added.' : `${n} photos added.`); viewProject(p.id); }
}
async function save(p) { p.updated = new Date().toISOString(); await db.put(p); }

let timer = null, pending = null;
function flush() { if (pending) { const p = pending; pending = null; clearTimeout(timer); save(p); } }
export function flushProject() { flush(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

$app.addEventListener('input', e => {
  const k = e.target.dataset?.pj; if (!k) return;
  const id = (location.hash.match(/^#\/project\/([\w-]+)/) || [])[1];
  const p = S.projects.find(x => x.id === id); if (!p) return;
  p[k] = e.target.value; pending = p; clearTimeout(timer); timer = setTimeout(flush, 500);
});
$app.addEventListener('change', e => {
  if (e.target.id !== 'pj-photo' || !e.target.files.length) return;
  const id = (location.hash.match(/^#\/project\/([\w-]+)/) || [])[1];
  const p = S.projects.find(x => x.id === id); if (p) addPhotos(p, [...e.target.files]);
  e.target.value = '';
});
$app.addEventListener('click', async e => {
  const a = e.target.closest('[data-act]'); if (!a || !a.dataset.act.startsWith('pj-')) return;
  const act = a.dataset.act, id = (location.hash.match(/^#\/project\/([\w-]+)/) || [])[1], p = S.projects.find(x => x.id === id);
  if (act === 'pj-new') newProject();
  else if (act === 'pj-filter') { filter = a.dataset.v; viewProjects(); }
  else if (act === 'pj-status' && p) {
    p.status = a.dataset.v;
    if (p.status === 'done' && !p.finished) p.finished = new Date().toISOString().slice(0, 10);
    if (p.status === 'sewing' && !p.started) p.started = new Date().toISOString().slice(0, 10);
    flush(); await save(p); viewProject(p.id);
    if (p.status === 'done') toast('Finished! Add a photo of it.');
  }
  else if (act === 'pj-view' && p) {
    const u = await photoUrl(a.dataset.ph);
    sheet(`<img src="${u}" alt="Project photo" class="pj-full"><button class="btn ghost wide danger" style="margin-top:10px" data-act="pj-delphoto" data-ph="${a.dataset.ph}">Delete this photo</button>`);
    document.querySelector('#sheet [data-act="pj-delphoto"]').onclick = async () => {
      if (!confirm('Delete this photo? This can\'t be undone.')) return;
      p.photos = p.photos.filter(x => x !== a.dataset.ph); await db.delBlob(a.dataset.ph); await save(p);
      closeSheet(); viewProject(p.id);
    };
  }
  else if (act === 'pj-delete' && p) {
    if (!confirm(`Delete "${p.name || 'this project'}" and its ${(p.photos || []).length} photo(s)? This can't be undone.`)) return;
    flush(); pending = null;
    for (const ph of p.photos || []) await db.delBlob(ph);
    await db.remove(p.id); S.projects = S.projects.filter(x => x !== p);
    location.hash = '#/projects'; toast('Project deleted.');
  }
});

const THUMB = '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M14 46L30 14L46 46" class="soft" style="stroke-width:2.5"/><path d="M12 50H48" class="soft" style="stroke-width:2;stroke-dasharray:4 3"/></svg>';
