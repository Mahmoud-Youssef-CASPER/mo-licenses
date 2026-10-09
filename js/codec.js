// License keys and machine codes in the browser (WebCrypto) — byte for byte the same format as js/license-core/codec.js
// and src/Lm.Licensing (the desktop manager). Keep them identical: a key issued here must open in every program.
// Tests: mobile/tests/codec.test.mjs signs here and verifies with the desktop codec (and the other way round).

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const MACHINE_LENGTH = 13;
const MACHINE_CHARS = 20;
const VERSION = 2;
const LIFETIME = 0xffff;
const SIGNATURE_LENGTH = 64;
const HEADER_LENGTH = 25;
const MODULES_HEADER_LENGTH = 27;
export const MAX_CUSTOMER_BYTES = 60;
const EPOCH = Date.UTC(2025, 0, 1);
const DAY = 86400000;
const TYPE_BYTE = { Server: 1, Client: 2 };
const TYPES = { 1: 'Server', 2: 'Client' };
const utf8 = new TextEncoder();

// ---------- SHA-256 (synchronous: the machine-code check runs on every camera frame) ----------
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(bytes) {
  const len = bytes.length;
  const total = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(total);
  m.set(bytes);
  m[len] = 0x80;
  const bits = len * 8;
  m[total - 4] = (bits >>> 24) & 0xff;
  m[total - 3] = (bits >>> 16) & 0xff;
  m[total - 2] = (bits >>> 8) & 0xff;
  m[total - 1] = bits & 0xff;
  m[total - 5] = Math.floor(bits / 0x100000000) & 0xff;
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = (m[off + i * 4] << 24) | (m[off + i * 4 + 1] << 16) | (m[off + i * 4 + 2] << 8) | m[off + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (hh + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = h[i] >>> 24; out[i * 4 + 1] = (h[i] >>> 16) & 0xff; out[i * 4 + 2] = (h[i] >>> 8) & 0xff; out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}

// ---------- Crockford base32 ----------
export function b32encode(data) {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const b of data) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function b32decode(text) {
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (const raw of String(text)) {
    if (raw === '-' || raw === ' ' || raw === '\r' || raw === '\n' || raw === '\t') continue;
    let c = raw.toUpperCase();
    if (c === 'I' || c === 'L') c = '1';
    else if (c === 'O') c = '0';
    const v = ALPHABET.indexOf(c);
    if (v < 0) return null;
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
    buffer &= (1 << bits) - 1;
  }
  return Uint8Array.from(out);
}

const group = (text, size) => text.match(new RegExp(`.{1,${size}}`, 'g')).join('-');

// ---------- Machine codes ----------
function group5(label, value) {
  const d = sha256(utf8.encode(`MetaOrigin-Machine|${label}|${value}`));
  const n = (((d[0] << 24) | (d[1] << 16) | (d[2] << 8) | d[3]) >>> 0) >>> 7;
  let out = '';
  for (let i = 4; i >= 0; i--) out += ALPHABET[(n >>> (i * 5)) & 31];
  return out;
}

function machineChars(code) {
  if (!code || !String(code).trim()) return null;
  let s = '';
  for (const raw of String(code)) {
    if (raw === '-' || raw === ' ' || raw === '\r' || raw === '\n' || raw === '\t') continue;
    let c = raw.toUpperCase();
    if (c === 'I' || c === 'L') c = '1';
    else if (c === 'O') c = '0';
    if (ALPHABET.indexOf(c) < 0) return null;
    s += c;
  }
  if (s.length !== MACHINE_CHARS || group5('SUM', s.slice(0, 15)) !== s.slice(15)) return null;
  return s;
}

/** The canonical spelling (upper case, dashes), or null when malformed or mistyped (the last 5 characters check the rest). */
export function normalizeMachineCode(code) {
  const s = machineChars(code);
  return s ? group(s, 5) : null;
}

/**
 * A machine code somewhere in a text (a QR, or what the camera read): every run of 20 code characters, with or without
 * dashes, whose check group matches. OCR mixes up some letters, so the common confusions are tried too.
 */
export function findMachineCode(text) {
  const up = String(text || '').toUpperCase();
  const runs = up.replace(/[^0-9A-Z]+/g, ' ').trim();
  const compact = runs.replace(/ /g, '');
  const candidates = new Set();
  const re = /[0-9A-Z]{5}[\s\-–—_.]*[0-9A-Z]{5}[\s\-–—_.]*[0-9A-Z]{5}[\s\-–—_.]*[0-9A-Z]{5}/g;
  for (const m of up.matchAll(re)) candidates.add(m[0].replace(/[^0-9A-Z]/g, ''));
  for (let i = 0; i + 20 <= compact.length; i++) candidates.add(compact.slice(i, i + 20));
  for (const c of candidates) {
    const ok = normalizeMachineCode(c);
    if (ok) return ok;
  }
  // OCR look-alikes not covered by base32's own (I/L→1, O→0): U↔V, S↔5, Z↔2, B↔8, G↔6, Q↔0, D↔0
  const swaps = { U: 'V', S: '5', Z: '2', B: '8', G: '6', Q: '0', D: '0', '5': 'S', '2': 'Z', '8': 'B', '6': 'G', '0': 'D' };
  for (const c of candidates) {
    const positions = [...c].map((ch, i) => (swaps[ch] ? i : -1)).filter((i) => i >= 0);
    // one or two swapped characters (more would let random text pass the 25-bit check)
    for (let a = 0; a < positions.length; a++) {
      const one = c.slice(0, positions[a]) + swaps[c[positions[a]]] + c.slice(positions[a] + 1);
      const ok1 = normalizeMachineCode(one);
      if (ok1) return ok1;
      for (let b = a + 1; b < positions.length; b++) {
        const two = one.slice(0, positions[b]) + swaps[one[positions[b]]] + one.slice(positions[b] + 1);
        const ok2 = normalizeMachineCode(two);
        if (ok2) return ok2;
      }
    }
  }
  return null;
}

function parseMachineCode(code) {
  const s = machineChars(code);
  if (!s) return null;
  const bytes = new Uint8Array(MACHINE_LENGTH);
  let bit = 0;
  for (const c of s) {
    const v = ALPHABET.indexOf(c);
    for (let i = 4; i >= 0; i--, bit++) if ((v >> i) & 1) bytes[bit >> 3] |= 0x80 >> (bit & 7);
  }
  return bytes;
}

function machineCodeFromBytes(bytes) {
  let s = '';
  for (let k = 0; k < MACHINE_CHARS; k++) {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const bit = k * 5 + i;
      v = (v << 1) | ((bytes[bit >> 3] >> (7 - (bit & 7))) & 1);
    }
    s += ALPHABET[v];
  }
  return group(s, 5);
}

// ---------- License keys ----------
const dayNumber = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);
};
const ymdOf = (days) => new Date(EPOCH + days * DAY).toISOString().slice(0, 10);
const clampDays = (ymd) => Math.min(Math.max(dayNumber(ymd), 0), LIFETIME - 1);

/** Cuts a name to at most `bytes` UTF-8 bytes, a character at a time from the end (as the desktop manager does). */
export function trimTo(s, bytes) {
  let out = String(s);
  while (utf8.encode(out).length > bytes) out = out.slice(0, -1);
  return out;
}

function payload(d, withModules) {
  const header = withModules ? MODULES_HEADER_LENGTH : HEADER_LENGTH;
  const machine = parseMachineCode(d.machineCode);
  if (!machine) throw new Error('badMachine');
  const name = utf8.encode(trimTo(String(d.customer).trim(), MAX_CUSTOMER_BYTES));
  const buf = new Uint8Array(header + name.length);
  const view = new DataView(buf.buffer);
  buf[0] = VERSION;
  buf[1] = TYPE_BYTE[d.type];
  buf.set(machine, 2);
  view.setInt32(15, d.serial);
  view.setUint16(19, Math.min(Math.max(d.seats | 0, 0), 0xffff));
  view.setUint16(21, clampDays(d.issued));
  view.setUint16(23, d.expires ? clampDays(d.expires) : LIFETIME);
  if (withModules) view.setUint16(25, (d.modules | 0) & 0xffff);
  buf.set(name, header);
  return buf;
}

function read(p, withModules) {
  const header = withModules ? MODULES_HEADER_LENGTH : HEADER_LENGTH;
  if (p.length < header || p[0] !== VERSION || !TYPES[p[1]]) return null;
  let customer;
  try {
    customer = new TextDecoder('utf-8', { fatal: true }).decode(p.subarray(header));
  } catch (_) {
    return null;
  }
  const view = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const expires = view.getUint16(23);
  return {
    type: TYPES[p[1]],
    machineCode: machineCodeFromBytes(p.subarray(2, 2 + MACHINE_LENGTH)),
    serial: view.getInt32(15),
    seats: view.getUint16(19),
    issued: ymdOf(view.getUint16(21)),
    expires: expires === LIFETIME ? null : ymdOf(expires),
    customer,
    ...(withModules ? { modules: view.getUint16(25) } : {}),
  };
}

const fromB64 = (s) => Uint8Array.from(atob(String(s).trim()), (c) => c.charCodeAt(0));

export const importPrivateKey = (pkcs8) =>
  crypto.subtle.importKey('pkcs8', pkcs8 instanceof Uint8Array ? pkcs8 : fromB64(pkcs8), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
export const importPublicKey = (spkiB64) =>
  crypto.subtle.importKey('spki', fromB64(spkiB64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);

/** { type, machineCode, serial, seats, issued, expires|null, customer, modules? } → "PREFIX-XXXXX-…". WebCrypto signs r||s (P1363). */
export async function signLicense(data, privateKey, prefix, withModules = false) {
  const body = payload(data, withModules);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, body));
  const all = new Uint8Array(body.length + sig.length);
  all.set(body);
  all.set(sig, body.length);
  return `${prefix}-${group(b32encode(all), 5)}`;
}

/** { data } or { problem: 'format' | 'product' | 'signature' } — same answers as the desktop codec. */
export async function verifyLicense(key, publicKey, prefix, withModules = false) {
  if (!key || !String(key).trim()) return { problem: 'format' };
  let text = String(key).trim();
  if (text.toUpperCase().startsWith(prefix.toUpperCase() + '-')) text = text.slice(prefix.length);
  else if (/^[A-Za-z]{3,4}-/.test(text)) return { problem: 'product' };
  const bytes = b32decode(text);
  if (!bytes || bytes.length < (withModules ? MODULES_HEADER_LENGTH : HEADER_LENGTH) + SIGNATURE_LENGTH) return { problem: 'format' };
  const body = bytes.subarray(0, bytes.length - SIGNATURE_LENGTH);
  const signature = bytes.subarray(bytes.length - SIGNATURE_LENGTH);
  const data = read(body, withModules);
  if (!data) return { problem: 'format' };
  let ok = false;
  try {
    const pub = typeof publicKey === 'string' ? await importPublicKey(publicKey) : publicKey;
    ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, signature, body);
  } catch (_) {
    ok = false;
  }
  return ok ? { data } : { problem: 'signature' };
}

// ---------- The manager's sealed secrets (ManagerStore.Seal: PBKDF2-SHA256 210 000 + AES-GCM, base64 parts) ----------
const ITERATIONS = 210000;

export async function deriveKey(password, saltB64) {
  const base = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations: ITERATIONS }, base, 256);
  return new Uint8Array(bits);
}

/** The plain bytes of a Sealed { salt, nonce, cipher, tag }, or null when the password is wrong. */
export async function unseal(sealed, password) {
  try {
    const raw = await deriveKey(password, sealed.salt);
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const cipher = fromB64(sealed.cipher);
    const tag = fromB64(sealed.tag);
    const both = new Uint8Array(cipher.length + tag.length);
    both.set(cipher);
    both.set(tag, cipher.length);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.nonce), tagLength: 128 }, key, both));
  } catch (_) {
    return null;
  }
}

/** ManagerStore.SignIn: PBKDF2 of the password with the user's salt equals the stored hash. */
export async function checkUserPassword(user, password) {
  const hash = await deriveKey(password, user.salt);
  const want = fromB64(user.hash);
  if (want.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ want[i];
  return diff === 0;
}

/** ManagerStore.ExpiryFor: the last valid day (a one-month license issued on the 5th works until the 4th of next month). */
export function expiryFor(code, today, custom) {
  const [y, m, d] = today.split('-').map(Number);
  const add = (months, years = 0) => {
    // DateOnly.AddMonths: the same day, or the month's last day when it is shorter
    const ty = y + years + Math.floor((m - 1 + months) / 12);
    const tm = ((m - 1 + months) % 12 + 12) % 12;
    const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    const t = new Date(Date.UTC(ty, tm, Math.min(d, last)) - DAY);
    return t.toISOString().slice(0, 10);
  };
  switch (code) {
    case '1m': return add(1);
    case '2m': return add(2);
    case '3m': return add(3);
    case '6m': return add(6);
    case '1y': return add(0, 1);
    case '2y': return add(0, 2);
    case 'life': return null;
    case 'custom':
      if (!custom) throw new Error('badDuration');
      return custom;
    default: throw new Error('badDuration');
  }
}
