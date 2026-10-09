// The link to the desktop manager (src/LicenseManager/MobileSync.cs) over the local network:
//   pair(qr)   — the QR on the manager's "Phone" page: { t: "mo-lm-pair", h: [addresses], p: port, c: one-time code, n: PC }
//   sync()     — sends the licenses issued here, gets programs / users / history / serial blocks back.
// Plain functions over a small storage interface ({ get, set }) so tests can run them in Node against a real manager.

export class SyncError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

/** The pairing QR (or its text pasted by hand). */
export function parsePairing(text) {
  try {
    const p = JSON.parse(String(text).trim());
    if (p && p.t === 'mo-lm-pair' && Array.isArray(p.h) && p.h.length && p.p && p.c) return { hosts: p.h.map(String), port: Number(p.p), code: String(p.c), pc: String(p.n || '') };
  } catch (_) { /* not JSON */ }
  return null;
}

async function request(host, port, path, body, token, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://${host}:${port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* empty */ }
    if (!res.ok) throw new SyncError((json && json.error) || `http${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries the PC's addresses one by one. A network / certificate failure goes on to the next address; an answer from the
 * manager (even a refusal) stops there.
 */
async function anyHost(hosts, port, path, body, token, timeoutMs = 5000) {
  let last = new SyncError('unreachable');
  for (const host of hosts) {
    try {
      const r = await request(host, port, path, body, token, timeoutMs);
      return { host, r };
    } catch (e) {
      if (e instanceof SyncError) throw e;
      last = new SyncError('unreachable', `${host}: ${e && e.message}`);
    }
  }
  throw last;
}

/** Pairs with the manager: the device id and token are kept, the one-time code is used up. */
export async function pair(store, pairing, deviceName) {
  const { host, r } = await anyHost(pairing.hosts, pairing.port, '/api/pair', { code: pairing.code, device: deviceName });
  const link = { deviceId: r.deviceId, token: r.token, pc: r.pc || pairing.pc, hosts: [host, ...pairing.hosts.filter((h) => h !== host)], port: pairing.port };
  await store.set('pairing', link);
  return link;
}

/**
 * One sync: the pending licenses go up (each one checked by the manager), the manager's data comes down. Pending licenses
 * the manager accepted (or already had) leave the queue; refused ones stay, with the reason, for the user to see.
 */
export async function sync(store, { timeoutMs } = {}) {
  const link = await store.get('pairing');
  if (!link) throw new SyncError('notPaired');
  const pending = (await store.get('pending')) || [];
  const blocks = (await store.get('blocks')) || {};
  const next = Object.fromEntries(Object.entries(blocks).map(([id, b]) => [id, b.next]));
  const { host, r } = await anyHost(link.hosts, link.port, '/api/sync', { issued: pending, next }, `${link.deviceId}.${link.token}`, timeoutMs);

  const done = new Set(r.accepted.map((a) => `${a.programId}|${a.serial}`));
  const refused = new Map(r.rejected.map((a) => [`${a.programId}|${a.serial}`, a.reason]));
  // Licenses issued while this sync was on the way stay in the queue too.
  const now = (await store.get('pending')) || [];
  const left = now.filter((l) => !done.has(`${l.programId}|${l.serial}`)).map((l) => ({ ...l, refused: refused.get(`${l.programId}|${l.serial}`) || l.refused || null }));
  await store.set('pending', left);

  // Serial blocks: never go back inside a block (a license may have been issued during the sync).
  const mine = (await store.get('blocks')) || {};
  const merged = {};
  for (const [id, b] of Object.entries(r.blocks || {})) {
    const cur = mine[id];
    merged[id] = cur && cur.end === b.end && cur.next > b.next ? cur : b;
  }
  await store.set('blocks', merged);
  await store.set('data', { programs: r.programs, users: r.users, genCheck: r.genCheck, history: r.history, pc: r.pc, syncedAt: new Date().toISOString() });
  if (host !== link.hosts[0]) await store.set('pairing', { ...link, hosts: [host, ...link.hosts.filter((h) => h !== host)] });
  return { accepted: r.accepted.length, rejected: r.rejected, left: left.length };
}

/** The certificate page on the PC (plain http, the port after the sync port): where the phone gets the manager's certificate. */
export const certificatePage = (host, port) => `http://${host}:${port + 1}/`;
