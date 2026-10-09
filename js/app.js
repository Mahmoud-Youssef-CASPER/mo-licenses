// Meta Origin — مدير التراخيص على الموبايل (PWA). Same keys, users and history as the desktop manager, kept in sync over
// the local network (sync.js ↔ MobileSync.cs). Licenses are signed here (codec.js, WebCrypto) with the program's key,
// opened by the generation password; numbers come from the serial block the PC gave this phone.
import * as db from './db.js';
import * as codec from './codec.js';
import { pair, sync, parsePairing, SyncError, certificatePage } from './sync.js';
import { scan } from './scanner.js';
import { t, lang, setLang } from './i18n.js';

const VERSION = '1.0.0';
const GEN_CHECK = 'license-manager/generation-password';
const LOCK_AFTER_MS = 10 * 60 * 1000;
const AUTO_SYNC_MS = 3 * 60 * 1000;

const s = {
  tab: 'new',
  user: null,
  data: null,
  pairing: null,
  pending: [],
  blocks: {},
  prefs: {},
  genPassword: null,
  keys: new Map(),
  draft: { duration: null, type: 'Server', seats: 5 },
  sync: { state: 'idle', at: null, msg: '' },
  search: '',
  pairStart: null,
  hiddenAt: 0,
  failures: 0,
};
const app = document.getElementById('app');

// ---------- helpers ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysBetween = (a, b) => Math.round((Date.UTC(...b.split('-').map((x, i) => (i === 1 ? x - 1 : +x))) - Date.UTC(...a.split('-').map((x, i) => (i === 1 ? x - 1 : +x)))) / 86400000);
const progName = (p) => (p ? (lang() === 'ar' ? p.nameAr : p.nameEn) || p.nameEn || p.id : '');
const program = (id) => s.data?.programs.find((p) => p.id === id);
const durLabel = (d) => t('dur.' + d);
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString(lang() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
/** A date / number inside Arabic text: its own direction, so 2027-10-08 does not come out as 08-10-2027. */
const iso = (v) => `<bdi class="ltr">${esc(v)}</bdi>`;
const phoneLink = (n) => {
  const d = String(n || '').replace(/[^\d]/g, '');
  if (d.length < 8) return null;
  return d.startsWith('0') ? '2' + d : d;
};

function toast(msg, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function icon(p, cls = '') {
  if (p?.icon) return `<img class="${cls}" src="${esc(p.icon)}" alt="">`;
  return `<span class="ph ${cls}" style="background:${esc(p?.color || '#1d4ed8')}">${esc((p?.prefix || '?').slice(0, 2))}</span>`;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied'));
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast(t('copied'));
  }
}

function sheet(html, onClick) {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => {
    if (e.target === bg) return close();
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'close') return close();
    if (a && onClick) onClick(a, e.target.closest('[data-a]'), close);
  });
  return { el: bg, close };
}

// ---------- start ----------
async function load() {
  s.pairing = (await db.get('pairing')) || null;
  s.data = (await db.get('data')) || null;
  s.pending = (await db.get('pending')) || [];
  s.blocks = (await db.get('blocks')) || {};
  s.prefs = (await db.get('prefs')) || {};
  setLang(s.prefs.lang || 'ar');
}

function render() {
  document.documentElement.lang = lang();
  document.documentElement.dir = lang() === 'ar' ? 'rtl' : 'ltr';
  if (!s.pairing || !s.data) return renderWelcome();
  if (!s.user) return renderLogin();
  return renderMain();
}

// ---------- welcome / pairing ----------
function renderWelcome() {
  const ps = s.pairStart;
  const name = s.prefs.deviceName || defaultDeviceName();
  app.innerHTML = `
    <main>
      <div class="hero"><img src="icons/icon-192.png" alt=""><h1>${t('appName')}</h1><div class="muted">${t('welcome.sub')}</div></div>
      ${ps ? `
      <div class="card">
        <h2>${t('pair.found', { pc: esc(ps.pc || ps.hosts[0]) })}</h2>
        <p class="small muted">${t('pair.certIntro')}</p>
        ${ps.hosts.map((h) => `<a class="btn light block" href="${esc(certificatePage(h, ps.port))}" target="_blank" rel="noopener">🔒 ${t('pair.certLink')} <span class="ltr small">${esc(h)}</span></a>`).join('')}
        <label class="f">${t('pair.deviceName')}</label>
        <input class="in" id="devname" value="${esc(name)}" maxlength="40">
        <button class="btn block" data-a="pair">🔗 ${t('pair.go')}</button>
        <button class="btn ghost block" data-a="rescan">${t('pair.rescan')}</button>
        <div id="perr" class="err"></div>
      </div>` : `
      <div class="card">
        <h2>${t('welcome.title')}</h2>
        <ol class="steps">
          <li>${t('welcome.s1')}</li>
          <li>${t('welcome.s2')}</li>
          <li>${t('welcome.s3')}</li>
        </ol>
        <button class="btn block" data-a="scanPair">📷 ${t('welcome.scan')}</button>
        <details style="margin-top:12px"><summary class="muted small">${t('welcome.manual')}</summary>
          <label class="f">${t('welcome.manualIp')}</label><input class="in ltr" id="mip" inputmode="decimal" placeholder="192.168.1.10">
          <label class="f">${t('welcome.manualCode')}</label><input class="in ltr mono" id="mcode" autocapitalize="characters">
          <button class="btn light block" data-a="manual">${t('welcome.manualGo')}</button>
        </details>
      </div>`}
      <div class="card small muted">${t('welcome.note')}</div>
      <div style="text-align:center"><button class="btn ghost" data-a="lang">${t('otherLang')}</button></div>
    </main>`;
  app.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'lang') return switchLang();
    if (a === 'scanPair' || a === 'rescan') {
      const p = await scan({ mode: 'pair', accept: parsePairing });
      if (p) { s.pairStart = p; render(); }
    }
    if (a === 'manual') {
      const ip = $('#mip').value.trim(), code = $('#mcode').value.trim().toUpperCase();
      if (!ip || !code) return toast(t('welcome.manualMissing'));
      s.pairStart = { hosts: [ip], port: 47390, code, pc: ip };
      render();
    }
    if (a === 'pair') {
      const btn = e.target.closest('button');
      const err = $('#perr');
      const deviceName = $('#devname').value.trim() || defaultDeviceName();
      s.prefs.deviceName = deviceName;
      await db.set('prefs', s.prefs);
      btn.disabled = true;
      err.textContent = '';
      btn.textContent = t('pair.working');
      try {
        s.pairing = await pair(db, s.pairStart, deviceName);
        await doSync({ quiet: true, throwErrors: true });
        s.pairStart = null;
        await db.persist();
        render();
      } catch (ex) {
        err.textContent = syncMessage(ex);
        btn.disabled = false;
        btn.textContent = '🔗 ' + t('pair.go');
      }
    }
  };
}

function defaultDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  const m = /Android[^;]*;\s*([^;)]+)/.exec(ua);
  return m ? m[1].trim().slice(0, 30) : 'Phone';
}

function syncMessage(ex) {
  const code = ex instanceof SyncError ? ex.code : 'unexpected';
  const key = 'sync.err.' + code;
  const msg = t(key);
  return msg === key ? t('sync.err.unexpected') + (ex?.message ? ` (${ex.message})` : '') : msg;
}

// ---------- login ----------
function renderLogin() {
  const users = s.data.users || [];
  app.innerHTML = `
    <main>
      <div class="hero"><img src="icons/icon-192.png" alt=""><h1>${t('appName')}</h1><div class="muted">${esc(s.data.pc || '')}</div></div>
      <form class="card" id="login" autocomplete="off">
        <label class="f">${t('login.user')}</label>
        <select class="in" id="lu">${users.map((u) => `<option ${u.name === s.prefs.lastUser ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
        <label class="f">${t('login.password')}</label>
        <input class="in" id="lp" type="password" autocomplete="current-password">
        <button class="btn block" type="submit">${t('login.go')}</button>
        <div id="lerr" class="err"></div>
      </form>
      <div style="text-align:center"><button class="btn ghost" data-a="lang" type="button">${t('otherLang')}</button></div>
    </main>`;
  app.onclick = (e) => { if (e.target.closest('[data-a=lang]')) switchLang(); };
  $('#login').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const name = $('#lu').value, pw = $('#lp').value;
    const u = users.find((x) => x.name === name);
    btn.disabled = true;
    btn.textContent = t('login.checking');
    const ok = u && pw && (await codec.checkUserPassword(u, pw));
    if (!ok) {
      s.failures++;
      await new Promise((r) => setTimeout(r, Math.min(s.failures, 10) * 700));
      $('#lerr').textContent = t('login.wrong');
      btn.disabled = false;
      btn.textContent = t('login.go');
      return;
    }
    s.failures = 0;
    s.user = { name: u.name, isAdmin: u.isAdmin };
    s.prefs.lastUser = u.name;
    await db.set('prefs', s.prefs);
    s.tab = 'new';
    render();
    doSync({ quiet: true });
  };
  setTimeout(() => $('#lp')?.focus(), 50);
}

// ---------- main ----------
function renderMain() {
  const dot = s.sync.state === 'ok' ? 'ok' : s.sync.state === 'error' ? 'bad' : s.pending.length ? 'pending' : '';
  const tabs = [
    ['new', '➕', t('tab.new')],
    ['list', '📋', t('tab.list')],
    ['sync', '🔄', t('tab.sync'), s.pending.length],
    ['more', '☰', t('tab.more')],
  ];
  app.innerHTML = `
    <header class="top">
      <img src="icons/icon-192.png" alt="">
      <h1>${t('appName')}<span class="sub">${esc(s.user.name)} · ${esc(s.data.pc || '')}</span></h1>
      <span class="dot ${dot}" title="${esc(s.sync.msg)}"></span>
    </header>
    <main id="view"></main>
    <nav class="tabs">${tabs.map(([id, i, label, n]) => `<button data-tab="${id}" class="${s.tab === id ? 'on' : ''}"><span class="i">${i}</span><span>${label}${n ? `<span class="badge">${n}</span>` : ''}</span></button>`).join('')}</nav>`;
  app.onclick = (e) => {
    const tab = e.target.closest('[data-tab]')?.dataset.tab;
    if (tab) { s.tab = tab; render(); window.scrollTo(0, 0); }
  };
  const view = $('#view');
  ({ new: viewNew, list: viewList, sync: viewSync, more: viewMore })[s.tab](view);
}

// ---------- new license ----------
function viewNew(view) {
  const d = s.draft;
  const p = d.programId && program(d.programId);
  if (!p) {
    const progs = s.data.programs || [];
    view.innerHTML = `
      <div class="card"><h2>${t('new.pick')}</h2><div class="hint">${t('new.pickHint')}</div></div>
      <div class="progs">${progs.map((x) => {
        const ready = !!x.key;
        const b = s.blocks[x.id];
        const left = b ? b.end - b.next : 0;
        return `<button class="prog ${ready && left > 0 ? '' : 'off'}" data-p="${esc(x.id)}">${icon(x)}<b>${esc(progName(x))}</b><small class="ltr">${esc(x.prefix)}${x.network ? ' · ' + t('new.network') : ''}</small>${!ready ? `<small>${t('new.noKey')}</small>` : left <= 0 ? `<small>${t('new.noSerials')}</small>` : ''}</button>`;
      }).join('')}</div>`;
    view.onclick = (e) => {
      const id = e.target.closest('[data-p]')?.dataset.p;
      if (!id) return;
      const x = program(id);
      if (!x.key) return toast(t('new.noKeyLong'), 3500);
      if (!(s.blocks[id] && s.blocks[id].end > s.blocks[id].next)) return toast(t('new.noSerialsLong'), 3500);
      s.draft = { ...s.draft, programId: id, type: 'Server', duration: x.durations.includes('1y') ? '1y' : x.durations[0], modules: (x.modules || []).map((m) => m.bit) };
      render();
    };
    return;
  }

  const mod = p.modules || [];
  const isClient = d.type === 'Client';
  const code = d.machine ? codec.normalizeMachineCode(d.machine) : null;
  let expiry = '';
  try { expiry = d.duration ? codec.expiryFor(d.duration, today(), d.customDate) : ''; } catch (_) { expiry = ''; }
  const b = s.blocks[p.id];
  view.innerHTML = `
    <div class="card">
      <div class="chosen">${icon(p)}<div class="grow"><b>${esc(progName(p))}</b><div class="small muted ltr">${esc(p.prefix)} · ${t('new.serialsLeft', { n: b ? b.end - b.next : 0 })}</div></div>
      <button class="btn ghost" data-a="change">${t('new.change')}</button></div>
      ${p.network ? `<label class="f">${t('new.type')}</label>
        <div class="seg">${['Server', 'Client'].map((k) => `<button data-type="${k}" class="${d.type === k ? 'on' : ''}">${t('type.' + k)}</button>`).join('')}</div>
        <div class="hint">${t(isClient ? 'new.clientHint' : 'new.serverHint')}</div>` : ''}

      <label class="f">${t('new.customer')}</label>
      <input class="in" id="customer" maxlength="60" value="${esc(d.customer || '')}" placeholder="${t('new.customerPh')}">
      <label class="f">${t('new.contact')}</label>
      <input class="in ltr" id="contact" type="tel" inputmode="tel" value="${esc(d.contact || '')}" placeholder="01xxxxxxxxx">

      <label class="f">${t(isClient ? 'new.machineClient' : 'new.machine')}</label>
      <div class="row">
        <input class="in grow mono ltr ${d.machine ? (code ? 'good' : 'bad') : ''}" id="machine" autocapitalize="characters" autocomplete="off" spellcheck="false"
          value="${esc(d.machine || '')}" placeholder="XXXXX-XXXXX-XXXXX-XXXXX">
        <button class="btn icon-btn" data-a="camera" title="${t('new.camera')}">📷</button>
      </div>
      <div class="hint" id="mhint">${d.machine ? (code ? '✓ ' + t('new.machineOk') : t('new.machineBad')) : t('new.machineHint')}</div>

      ${isClient ? `<label class="f">${t('new.seats')}</label><input class="in" id="seats" type="number" inputmode="numeric" min="1" max="999" value="${esc(d.seats || 5)}">` : ''}

      ${mod.length ? `<label class="f">${t('new.modules')}</label><div class="checks">${mod.map((m) => `<label><input type="checkbox" data-mod="${m.bit}" ${(d.modules || []).includes(m.bit) ? 'checked' : ''}> ${esc(lang() === 'ar' ? m.nameAr : m.nameEn)}</label>`).join('')}</div>` : ''}

      <label class="f">${t('new.duration')}</label>
      <div class="seg">${p.durations.map((k) => `<button data-dur="${k}" class="${d.duration === k ? 'on' : ''}">${durLabel(k)}</button>`).join('')}</div>
      ${d.duration === 'custom' ? `<label class="f">${t('new.endDate')}</label><input class="in" id="customDate" type="date" min="${today()}" value="${esc(d.customDate || '')}">` : ''}
      <div class="hint">${d.duration ? (expiry ? t('new.validUntil', { date: iso(expiry) }) : d.duration === 'life' ? t('new.lifetime') : '') : ''}</div>

      <label class="f">${t('new.notes')}</label>
      <input class="in" id="notes" value="${esc(d.notes || '')}">

      ${s.genPassword ? '' : `<label class="f">${t('new.genPassword')}</label>
        <input class="in" id="genpw" type="password" autocomplete="off">
        <label class="checks small"><label><input type="checkbox" id="remember" checked> ${t('new.remember')}</label></label>`}
      <button class="btn block" data-a="issue">🔑 ${t('new.issue')}</button>
      <div id="nerr" class="err"></div>
    </div>`;

  const keep = () => {
    d.customer = $('#customer')?.value ?? d.customer;
    d.contact = $('#contact')?.value ?? d.contact;
    d.machine = $('#machine')?.value ?? d.machine;
    d.seats = $('#seats') ? Number($('#seats').value) : d.seats;
    d.notes = $('#notes')?.value ?? d.notes;
    d.customDate = $('#customDate')?.value ?? d.customDate;
    if (mod.length) d.modules = [...view.querySelectorAll('[data-mod]')].filter((x) => x.checked).map((x) => Number(x.dataset.mod));
  };
  view.oninput = (e) => {
    keep();
    if (e.target.id === 'machine') {
      const ok = codec.normalizeMachineCode(e.target.value);
      e.target.classList.toggle('good', !!ok);
      e.target.classList.toggle('bad', !!e.target.value.trim() && !ok);
      $('#mhint').textContent = e.target.value.trim() ? (ok ? '✓ ' + t('new.machineOk') : t('new.machineBad')) : t('new.machineHint');
    }
    if (e.target.id === 'customDate') { keep(); render(); }
  };
  view.onchange = () => keep();
  view.onclick = async (e) => {
    const el = e.target.closest('[data-a],[data-type],[data-dur]');
    if (!el) return;
    keep();
    if (el.dataset.type) { d.type = el.dataset.type; return render(); }
    if (el.dataset.dur) { d.duration = el.dataset.dur; return render(); }
    const a = el.dataset.a;
    if (a === 'change') { d.programId = null; return render(); }
    if (a === 'camera') {
      const got = await scan({ mode: 'code', accept: codec.findMachineCode });
      if (got) { d.machine = got; toast('✓ ' + got); render(); }
    }
    if (a === 'issue') issue(p, el);
  };
}

async function issue(p, btn) {
  const d = s.draft;
  const err = $('#nerr');
  err.textContent = '';
  const fail = (k, params) => { err.textContent = t(k, params); };
  const customer = (d.customer || '').trim();
  if (customer.length < 2) return fail('new.err.customer');
  const machine = codec.normalizeMachineCode(d.machine || '');
  if (!machine) return fail('new.err.machine');
  const isClient = p.network && d.type === 'Client';
  const seats = isClient ? Math.floor(Number(d.seats)) : 0;
  if (isClient && !(seats >= 1 && seats <= 65535)) return fail('new.err.seats');
  if (!d.duration || !p.durations.includes(d.duration)) return fail('new.err.duration');
  let expires;
  try { expires = codec.expiryFor(d.duration, today(), d.customDate); } catch (_) { return fail('new.err.date'); }
  if (expires && expires < today()) return fail('new.err.date');
  const mods = (p.modules || []).length ? (d.modules || []).reduce((a, b) => a | b, 0) : 0;
  if ((p.modules || []).length && !mods) return fail('new.err.modules');
  const block = s.blocks[p.id];
  if (!block || block.next >= block.end) return fail('new.noSerialsLong');

  btn.disabled = true;
  btn.textContent = t('new.working');
  try {
    let key = s.keys.get(p.id);
    if (!key) {
      const pw = s.genPassword || $('#genpw')?.value || '';
      const check = s.data.genCheck && (await codec.unseal(s.data.genCheck, pw));
      if (!check || new TextDecoder().decode(check) !== GEN_CHECK) throw new Error('wrongGen');
      const pkcs8 = await codec.unseal(p.key, pw);
      if (!pkcs8) throw new Error('wrongGen');
      key = await codec.importPrivateKey(pkcs8);
      pkcs8.fill(0);
      if (s.genPassword || $('#remember')?.checked) {
        s.genPassword = pw;
        s.keys.set(p.id, key);
      }
    }
    // the number is taken (and saved) before signing: a number is never used twice, even if the app closes now
    const serial = block.next;
    s.blocks[p.id] = { ...block, next: block.next + 1 };
    await db.set('blocks', s.blocks);
    const data = { type: isClient ? 'Client' : 'Server', machineCode: machine, serial, seats, issued: today(), expires, customer: codec.trimTo(customer, codec.MAX_CUSTOMER_BYTES), modules: mods };
    const text = await codec.signLicense(data, key, p.prefix, (p.modules || []).length > 0);
    const check = await codec.verifyLicense(text, p.publicKey, p.prefix, (p.modules || []).length > 0);
    if (!check.data) throw new Error('keyMismatch');
    const rec = {
      programId: p.id, serial, type: data.type, customer: data.customer, contact: (d.contact || '').trim() || null, machineCode: machine, seats,
      issued: data.issued, expires, duration: d.duration, issuedBy: s.user.name, issuedAt: new Date().toISOString(), notes: (d.notes || '').trim() || null,
      key: text, modules: mods,
    };
    s.pending = [...s.pending, rec];
    await db.set('pending', s.pending);
    s.draft = { programId: p.id, type: d.type, duration: d.duration, seats: d.seats, modules: d.modules };
    render();
    showLicense(rec, true);
    doSync({ quiet: true });
  } catch (ex) {
    fail(ex.message === 'wrongGen' ? 'new.err.genPassword' : ex.message === 'keyMismatch' ? 'new.err.keyMismatch' : 'new.err.unexpected');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔑 ' + t('new.issue');
  }
}

function licenseMessage(l) {
  const p = program(l.programId);
  return t('share.text', {
    program: progName(p), customer: l.customer, until: l.expires || t('dur.life'), key: l.key,
  });
}

function showLicense(l, fresh) {
  const p = program(l.programId);
  const wa = phoneLink(l.contact);
  const st = status(l);
  const mods = (p?.modules || []).filter((m) => (l.modules || 0) & m.bit).map((m) => (lang() === 'ar' ? m.nameAr : m.nameEn)).join('، ');
  sheet(`
    ${fresh ? `<div class="okmsg" style="margin:0 0 8px">✓ ${t('result.done')}</div>` : ''}
    <div class="chosen" style="margin-bottom:10px">${icon(p)}<div class="grow"><b>${esc(l.customer)}</b><div class="small muted">${esc(progName(p))} · ${t('type.' + l.type)}</div></div>${st}</div>
    <div class="keybox" id="thekey">${esc(l.key)}</div>
    <div class="actions">
      <button class="btn" data-a="copy">📋 ${t('result.copy')}</button>
      <button class="btn light" data-a="share">📤 ${t('result.share')}</button>
      ${wa ? `<button class="btn green" data-a="wa">💬 ${t('result.whatsapp')}</button>` : `<button class="btn light" data-a="renew">🔁 ${t('result.renew')}</button>`}
    </div>
    <div class="card" style="margin-top:12px"><div class="facts">
      <span>${t('f.machine')}</span><b class="mono ltr">${esc(l.machineCode)}</b>
      <span>${t('f.serial')}</span><b>${esc(l.serial)}</b>
      ${l.type === 'Client' ? `<span>${t('f.seats')}</span><b>${esc(l.seats)}</b>` : ''}
      ${mods ? `<span>${t('f.modules')}</span><b>${esc(mods)}</b>` : ''}
      <span>${t('f.until')}</span><b>${l.expires ? iso(l.expires) : esc(t('dur.life'))}</b>
      <span>${t('f.issued')}</span><b>${esc(fmtTime(l.issuedAt))}</b>
      <span>${t('f.by')}</span><b>${esc(l.issuedBy)}</b>
      ${l.contact ? `<span>${t('f.contact')}</span><b class="ltr">${esc(l.contact)}</b>` : ''}
      ${l.notes ? `<span>${t('f.notes')}</span><b>${esc(l.notes)}</b>` : ''}
      ${l.refused ? `<span>${t('f.refused')}</span><b class="err">${esc(t('refused.' + l.refused))}</b>` : ''}
    </div></div>
    ${wa ? `<button class="btn ghost block" data-a="renew">🔁 ${t('result.renew')}</button>` : ''}
    <button class="btn ghost block" data-a="close">${t('close')}</button>`, async (a, _el, close) => {
    if (a === 'copy') copy(l.key);
    if (a === 'share') {
      const text = licenseMessage(l);
      if (navigator.share) { try { await navigator.share({ text }); } catch (_) { /* cancelled */ } } else copy(text);
    }
    if (a === 'wa') window.open(`https://wa.me/${wa}?text=${encodeURIComponent(licenseMessage(l))}`, '_blank');
    if (a === 'renew') {
      close();
      const prog = program(l.programId);
      s.draft = {
        programId: prog ? l.programId : null, type: l.type, customer: l.customer, contact: l.contact || '', machine: l.machineCode,
        seats: l.seats || 5, modules: prog?.modules?.length ? [] : undefined, duration: prog && (prog.durations.includes(l.duration) ? l.duration : prog.durations[0]),
      };
      if (prog?.modules?.length) s.draft.modules = prog.modules.filter((m) => (l.modules || 0) & m.bit).map((m) => m.bit);
      s.tab = 'new';
      render();
    }
  });
}

function status(l) {
  if (!l.expires) return `<span class="tag info">${t('st.life')}</span>`;
  const left = daysBetween(today(), l.expires);
  if (left < 0) return `<span class="tag bad">${t('st.expired')}</span>`;
  if (left <= 30) return `<span class="tag warn">${t('st.left', { n: left })}</span>`;
  return `<span class="tag ok">${iso(l.expires)}</span>`;
}

// ---------- licenses ----------
function allLicenses() {
  const pend = s.pending.map((l) => ({ ...l, pending: true }));
  const known = new Set(pend.map((l) => `${l.programId}|${l.serial}`));
  const hist = (s.data.history || []).filter((l) => !known.has(`${l.programId}|${l.serial}`));
  // by time, not by text: the PC writes local time with its offset, the phone UTC
  const at = (l) => Date.parse(l.issuedAt) || 0;
  const all = [...pend, ...hist].sort((a, b) => at(b) - at(a));
  // renewed: a later license for the same program, type and PC
  const seen = new Set();
  for (const l of all) {
    const k = `${l.programId}|${l.type}|${l.machineCode}`;
    l.superseded = seen.has(k);
    seen.add(k);
  }
  return all;
}

function viewList(view) {
  const q = s.search.trim().toLowerCase();
  const list = allLicenses().filter((l) => !q || [l.customer, l.contact, l.machineCode, String(l.serial), progName(program(l.programId))].some((v) => String(v || '').toLowerCase().includes(q)));
  view.innerHTML = `
    <div class="card"><input class="in" id="q" type="search" placeholder="🔎 ${t('list.search')}" value="${esc(s.search)}"></div>
    <div class="card">${list.length ? list.slice(0, 300).map((l, i) => `
      <div class="item" data-i="${i}">${icon(program(l.programId))}
        <div class="grow"><b>${esc(l.customer)}</b><div class="small muted">${esc(progName(program(l.programId)))} · ${t('type.' + l.type)} · #${esc(l.serial)}</div>
        ${l.pending ? `<span class="tag ${l.refused ? 'bad' : 'warn'}">${l.refused ? t('list.refused') : t('list.pending')}</span>` : ''}
        ${l.superseded ? `<span class="tag info">${t('list.renewed')}</span>` : ''}</div>
        ${l.superseded ? '' : status(l)}
      </div>`).join('') : `<div class="muted">${t('list.empty')}</div>`}</div>`;
  const q2 = $('#q');
  q2.oninput = () => {
    s.search = q2.value;
    const pos = q2.selectionStart;
    viewList(view);
    const n = $('#q');
    n.focus();
    n.setSelectionRange(pos, pos);
  };
  view.onclick = (e) => {
    const i = e.target.closest('[data-i]')?.dataset.i;
    if (i != null) showLicense(list[Number(i)], false);
  };
}

// ---------- sync ----------
async function doSync({ quiet, throwErrors } = {}) {
  if (s.sync.state === 'busy') return;
  s.sync.state = 'busy';
  try {
    const r = await sync(db);
    s.data = await db.get('data');
    s.pending = (await db.get('pending')) || [];
    s.blocks = (await db.get('blocks')) || {};
    s.pairing = await db.get('pairing');
    // a user removed on the PC cannot go on here
    if (s.user && !(s.data.users || []).some((u) => u.name === s.user.name)) lock();
    s.sync = { state: 'ok', at: new Date().toISOString(), msg: t('sync.ok') };
    if (!quiet) toast(r.rejected.length ? t('sync.someRefused', { n: r.rejected.length }) : t('sync.done', { n: r.accepted }));
  } catch (ex) {
    s.sync = { state: 'error', at: s.sync.at, msg: syncMessage(ex) };
    if (throwErrors) throw ex;
    if (!quiet) toast(s.sync.msg, 4000);
  } finally {
    if (s.sync.state === 'busy') s.sync.state = 'idle';
    if (s.user && s.tab !== 'new') render();
    else if (s.user) { const dot = $('.top .dot'); if (dot) dot.className = 'dot ' + (s.sync.state === 'ok' ? 'ok' : s.sync.state === 'error' ? 'bad' : ''); }
  }
}

function viewSync(view) {
  const link = s.pairing;
  const refused = s.pending.filter((l) => l.refused);
  view.innerHTML = `
    <div class="card">
      <h2>🖥️ ${esc(s.data.pc || link.pc)}</h2>
      <div class="facts">
        <span>${t('sync.addresses')}</span><b class="ltr">${esc(link.hosts.join(' · '))}</b>
        <span>${t('sync.last')}</span><b>${esc(fmtTime(s.data.syncedAt))}</b>
        <span>${t('sync.pending')}</span><b>${s.pending.length}</b>
        <span>${t('sync.state')}</span><b>${esc(s.sync.msg || '—')}</b>
      </div>
      <button class="btn block" data-a="sync">🔄 ${t('sync.now')}</button>
      <div class="hint">${t('sync.hint')}</div>
    </div>
    ${refused.length ? `<div class="card"><h3 class="err">${t('sync.refusedTitle')}</h3>${refused.map((l) => `<div class="item"><div class="grow"><b>${esc(l.customer)}</b><div class="small">#${l.serial} · ${esc(t('refused.' + l.refused))}</div></div></div>`).join('')}</div>` : ''}
    <div class="card">
      <h3>${t('sync.certTitle')}</h3><div class="hint">${t('sync.certHint')}</div>
      ${link.hosts.map((h) => `<a class="btn ghost block" href="${esc(certificatePage(h, link.port))}" target="_blank" rel="noopener">🔒 <span class="ltr">${esc(h)}</span></a>`).join('')}
    </div>
    <div class="card">
      <h3>${t('sync.serials')}</h3>
      ${(s.data.programs || []).map((p) => { const b = s.blocks[p.id]; return `<div class="item">${icon(p)}<div class="grow"><b>${esc(progName(p))}</b><div class="small muted">${b ? t('sync.serialRange', { from: iso(b.next), to: iso(b.end - 1) }) : '—'}</div></div></div>`; }).join('')}
    </div>
    <button class="btn danger block" data-a="unpair">${t('sync.unpair')}</button>`;
  view.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'sync') {
      e.target.closest('button').disabled = true;
      await doSync({ quiet: false });
      render();
    }
    if (a === 'unpair') {
      if (s.pending.length && !confirm(t('sync.unpairPending', { n: s.pending.length }))) return;
      if (!confirm(t('sync.unpairConfirm'))) return;
      for (const k of ['pairing', 'data', 'pending', 'blocks']) await db.del(k);
      lock();
      s.pairing = s.data = null;
      s.pending = [];
      s.blocks = {};
      render();
    }
  };
}

// ---------- more: language, help, about ----------
function viewMore(view) {
  view.innerHTML = `
    <div class="card">
      <button class="btn light block" data-a="help">❓ ${t('more.help')}</button>
      <button class="btn light block" data-a="about">ℹ️ ${t('more.about')}</button>
      <button class="btn light block" data-a="lang">🌐 ${t('otherLang')}</button>
      <button class="btn ghost block" data-a="forget">🔐 ${t('more.forgetGen')}</button>
      <button class="btn danger block" data-a="logout">🚪 ${t('more.logout')}</button>
    </div>
    <div class="muted small" style="text-align:center">Meta Origin · ${t('appName')} · ${VERSION}</div>`;
  view.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'lang') switchLang();
    if (a === 'help') showHelp();
    if (a === 'about') showAbout();
    if (a === 'forget') { s.genPassword = null; s.keys.clear(); toast(t('more.forgotten')); }
    if (a === 'logout') { lock(); render(); }
  };
}

function showHelp() {
  sheet(`<h2>❓ ${t('more.help')}</h2>${t('help.html')}<button class="btn ghost block" data-a="close">${t('close')}</button>`);
}

function showAbout() {
  const person = (img, name, role, phones) => `
    <div class="person"><img src="about/${img}.jpg" alt="" data-a="card" data-card="about/${img}-card.jpg">
      <div class="grow"><b>${name}</b><div class="small muted">${role}</div>
        <div class="phones">${phones.map((n) => `<a class="ltr" href="https://wa.me/2${n}" target="_blank" rel="noopener">💬 ${n}</a>`).join('')}</div></div></div>`;
  sheet(`
    <div class="hero" style="padding-top:6px"><img src="icons/icon-192.png" alt=""><h1>Meta Origin</h1><div class="muted">Software Studio</div></div>
    <div class="card">
      ${person('mahmoud', t('about.mahmoud'), t('about.mahmoudRole'), ['01277122615', '01150606002', '01011121145'])}
      ${person('omar', t('about.omar'), t('about.omarRole'), ['01200966258'])}
    </div>
    <div class="muted small" style="text-align:center">${t('appName')} ${VERSION}</div>
    <button class="btn ghost block" data-a="close">${t('close')}</button>`, (a, el) => {
    // the photo opens the full card
    if (a === 'card') sheet(`<img src="${el.dataset.card}" alt="" style="width:100%;border-radius:12px"><button class="btn ghost block" data-a="close">${t('close')}</button>`);
  });
}

async function switchLang() {
  setLang(lang() === 'ar' ? 'en' : 'ar');
  s.prefs.lang = lang();
  await db.set('prefs', s.prefs);
  render();
}

function lock() {
  s.user = null;
  s.genPassword = null;
  s.keys.clear();
}

// Lock after 10 minutes in the background; sync every few minutes while open.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) s.hiddenAt = Date.now();
  else {
    if (s.user && s.hiddenAt && Date.now() - s.hiddenAt > LOCK_AFTER_MS) { lock(); render(); }
    else if (s.user) doSync({ quiet: true });
  }
});
setInterval(() => { if (s.user && !document.hidden) doSync({ quiet: true }); }, AUTO_SYNC_MS);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

load().then(render);
