// Everything the app keeps on the phone, in IndexedDB (key → value):
//   pairing  { deviceId, token, pc, hosts[], port }          — the link to the desktop manager
//   data     { programs[], users[], genCheck, history[], pc, syncedAt }  — the last sync (keys still sealed)
//   pending  [issued…]                                        — licenses issued here, not yet on the PC
//   blocks   { programId: { next, end } }                     — serial numbers this phone may use
//   prefs    { lang, deviceName }
const DB = 'mo-license-manager';
let opening;

function open() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return opening;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction('kv', mode);
    const r = fn(t.objectStore('kv'));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const get = (key) => tx('readonly', (s) => s.get(key));
export const set = (key, value) => tx('readwrite', (s) => s.put(value, key));
export const del = (key) => tx('readwrite', (s) => s.delete(key));

/** Asks the browser not to clear the app's data under storage pressure (installed apps usually get it). */
export async function persist() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch (_) { /* not supported */ }
}
