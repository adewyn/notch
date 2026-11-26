// Everything you save lives on your phone in IndexedDB.
//   kv:      single values (settings, progress, notes), key -> value
//   records: lists (measurement entries now; projects, sketches, and stash later), each with an id and a type
//   blobs:   photos and other files, each with an id
// Never rename the database or change these stores without a migration below.

export const APP_VERSION = '0.1.0';
export const DB_NAME = 'notch';
export const DB_VERSION = 1;      // IndexedDB schema (stores). Raise only with an onupgradeneeded step.
export const DATA_VERSION = 1;    // shape of the saved values. Raise only with a step in MIGRATIONS.
export const BACKUP_VERSION = 1;  // backup file format. Older apps refuse files with a higher number.
export const BACKUP_APP = 'notch-backup';

let dbp = null;
export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = e => {
      const db = r.result;
      // Version 1: the three stores. Future versions add steps here and never delete data.
      if (e.oldVersion < 1) {
        db.createObjectStore('kv');
        const rec = db.createObjectStore('records', { keyPath: 'id' });
        rec.createIndex('type', 'type');
        db.createObjectStore('blobs', { keyPath: 'id' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Close other Notch tabs and try again.'));
  });
  return dbp;
}

function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function done(tx) { return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Cancelled')); }); }

export async function get(key) { const db = await open(); return req(db.transaction('kv').objectStore('kv').get(key)); }
export async function set(key, val) { const db = await open(); const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); return done(tx); }
export async function del(key) { const db = await open(); const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(key); return done(tx); }

export async function list(type) {
  const db = await open();
  return req(db.transaction('records').objectStore('records').index('type').getAll(type));
}
export async function put(rec) { const db = await open(); const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').put(rec); return done(tx); }
export async function remove(id) { const db = await open(); const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').delete(id); return done(tx); }

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- data migrations ----------
// Each step turns data saved by an older version into the current shape, in one transaction, so a
// failure leaves the old data untouched. Add new steps to the end; never edit an old one.
const MIGRATIONS = {
  // 2: async tx => { ... },
};
export async function migrate() {
  const have = (await get('dataVersion')) || 0;
  if (have > DATA_VERSION) return { newer: true, have };
  for (let v = have + 1; v <= DATA_VERSION; v++) {
    if (MIGRATIONS[v]) await MIGRATIONS[v]();
    await set('dataVersion', v);
  }
  return { newer: false, have };
}

// ---------- backups ----------
function blobToB64(blob) {
  return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.onerror = () => rej(f.error); f.readAsDataURL(blob); });
}
function b64ToBlob(b64, type) {
  const bin = atob(b64); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: type || 'application/octet-stream' });
}

export async function makeBackup() {
  const db = await open();
  const tx = db.transaction(['kv', 'records', 'blobs']);
  const kvStore = tx.objectStore('kv');
  const [keys, vals, records, blobs] = await Promise.all([
    req(kvStore.getAllKeys()), req(kvStore.getAll()),
    req(tx.objectStore('records').getAll()), req(tx.objectStore('blobs').getAll()),
  ]);
  const kv = {}; keys.forEach((k, i) => { kv[k] = vals[i]; });
  const outBlobs = [];
  for (const b of blobs) {
    const { blob, ...meta } = b;
    outBlobs.push({ ...meta, mime: blob ? blob.type : '', data: blob ? await blobToB64(blob) : '' });
  }
  return { app: BACKUP_APP, backupVersion: BACKUP_VERSION, dataVersion: DATA_VERSION, appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(), kv, records, blobs: outBlobs };
}

// Checks the whole file before anything is touched. Returns { ok, why }.
export function checkBackup(data) {
  if (!data || typeof data !== 'object') return { ok: false, why: "That file isn't a Notch backup." };
  if (data.app !== BACKUP_APP) return { ok: false, why: "That file isn't a Notch backup." };
  if (typeof data.backupVersion !== 'number' || typeof data.dataVersion !== 'number')
    return { ok: false, why: "That backup is missing its version number, so it can't be loaded safely." };
  if (data.backupVersion > BACKUP_VERSION || data.dataVersion > DATA_VERSION)
    return { ok: false, why: `That backup was made by a newer Notch (${data.appVersion || 'unknown'}). Update this app first (close it fully and reopen), then try again.` };
  if (!data.kv || typeof data.kv !== 'object' || !Array.isArray(data.records) || !Array.isArray(data.blobs))
    return { ok: false, why: 'That backup looks damaged, so nothing was changed.' };
  if (data.records.some(r => !r || typeof r.id !== 'string' || typeof r.type !== 'string'))
    return { ok: false, why: 'That backup looks damaged, so nothing was changed.' };
  if (data.blobs.some(b => !b || typeof b.id !== 'string' || typeof b.data !== 'string'))
    return { ok: false, why: 'That backup looks damaged, so nothing was changed.' };
  return { ok: true };
}

// Replaces everything with the backup in ONE transaction: if any part fails, nothing changes.
export async function restoreBackup(data) {
  const check = checkBackup(data);
  if (!check.ok) throw new Error(check.why);
  const blobs = data.blobs.map(b => { const { data: d, mime, ...meta } = b; return { ...meta, blob: b64ToBlob(d, mime) }; });
  const db = await open();
  const tx = db.transaction(['kv', 'records', 'blobs'], 'readwrite');
  const kv = tx.objectStore('kv'), rec = tx.objectStore('records'), bl = tx.objectStore('blobs');
  kv.clear(); rec.clear(); bl.clear();
  for (const [k, v] of Object.entries(data.kv)) kv.put(v, k);
  kv.put(data.dataVersion, 'dataVersion');
  data.records.forEach(r => rec.put(r));
  blobs.forEach(b => bl.put(b));
  await done(tx);
  await migrate(); // bring an older backup up to today's shape
}
