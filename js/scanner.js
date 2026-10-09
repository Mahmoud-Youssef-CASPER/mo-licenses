// The camera: reads a machine code (or the manager's pairing QR) from
//   • a QR (the setup wizard, the machine-code tool and the programs' license screens show one) — every few frames:
//     BarcodeDetector where the phone has it (Android Chrome), else ZXing (iPhone);
//   • the printed code itself (OCR, tesseract.js inside the app, so it works offline) — on demand and once on its own;
//   • a picture (a screenshot sent on WhatsApp…).
// Every result passes `accept(text)`: for machine codes the last 5 characters check the rest, so a misread is never filled in.
import { t } from './i18n.js';

const base = new URL('../', import.meta.url);
let zxingLoading;
let ocrWorker;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('load ' + src));
    document.head.appendChild(s);
  });
}

async function qrFromCanvas(canvas) {
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const r = await det.detect(canvas);
      if (r[0]) return r[0].rawValue;
      return null;
    } catch (_) { /* fall back to ZXing */ }
  }
  zxingLoading ||= loadScript(new URL('vendor/zxing.min.js', base).href);
  await zxingLoading;
  const Z = window.ZXing;
  try {
    const src = new Z.HTMLCanvasElementLuminanceSource(canvas);
    const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(src));
    const hints = new Map([[Z.DecodeHintType.TRY_HARDER, true]]);
    return new Z.QRCodeReader().decode(bitmap, hints).getText();
  } catch (_) {
    return null;
  }
}

/** OCR of a canvas: letters and digits only (the code's alphabet), the text back. */
async function ocrCanvas(canvas, onProgress) {
  if (!ocrWorker) {
    await loadScript(new URL('vendor/tesseract/tesseract.min.js', base).href);
    const T = window.Tesseract;
    ocrWorker = T.createWorker('eng', 1, {
      workerPath: new URL('vendor/tesseract/worker.min.js', base).href,
      corePath: new URL('vendor/tesseract/', base).href,
      langPath: new URL('vendor/tesseract/lang', base).href,
      gzip: true,
      cacheMethod: 'none',
      logger: (m) => onProgress && m.status === 'recognizing text' && onProgress(m.progress),
    }).then(async (w) => {
      await w.setParameters({ tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-', preserve_interword_spaces: '1' });
      return w;
    });
  }
  const w = await ocrWorker;
  const { data } = await w.recognize(canvas);
  return data.text || '';
}

/** A grey, enlarged, high-contrast copy of part of a picture: what OCR reads best. */
function prepare(source, sx, sy, sw, sh, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * scale));
  c.height = Math.max(1, Math.round(sh * scale));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    d[i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - min) * 255) / span;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Reads a picture file: QR first, then OCR of the whole picture. */
export async function readImageFile(file, accept, onProgress) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const full = prepare(img, 0, 0, img.naturalWidth, img.naturalHeight, scale);
    const q = await qrFromCanvas(full);
    const fromQr = q && accept(q);
    if (fromQr) return fromQr;
    const big = prepare(img, 0, 0, img.naturalWidth, img.naturalHeight, Math.min(2, 2400 / Math.max(img.naturalWidth, img.naturalHeight)));
    return accept(await ocrCanvas(big, onProgress)) || null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The full-screen camera. mode: 'code' (a machine code: QR + OCR) or 'pair' (the manager's pairing QR).
 * Resolves with what `accept` returned, or null when closed.
 */
export function scan({ mode = 'code', accept, title }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'cam';
    el.innerHTML = `
      <video playsinline muted autoplay></video>
      <div class="frame ${mode === 'pair' ? 'qr' : ''}"></div>
      <div class="bar"><span class="t"></span><button class="btn ghost icon-btn" data-a="torch" hidden>🔦</button><button class="btn ghost icon-btn" data-a="close">✕</button></div>
      <div class="bottom">
        <div class="status"></div>
        <div class="row">
          ${mode === 'code' ? `<button class="btn light" data-a="ocr">🔤 ${t('scan.readText')}</button>` : ''}
          <label class="btn ghost">🖼️ ${t('scan.picture')}<input type="file" accept="image/*" hidden></label>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.t').textContent = title || t(mode === 'pair' ? 'scan.pairTitle' : 'scan.codeTitle');
    const video = el.querySelector('video');
    const status = el.querySelector('.status');
    const say = (s) => { status.textContent = s; };
    let stream = null;
    let stopped = false;
    let busyOcr = false;
    const frame = document.createElement('canvas');

    function finish(value) {
      if (stopped) return;
      stopped = true;
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
      el.remove();
      resolve(value || null);
    }

    function grab(region) {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return null;
      if (!region) {
        const s = Math.min(1, 1000 / Math.max(vw, vh));
        frame.width = Math.round(vw * s);
        frame.height = Math.round(vh * s);
        frame.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, frame.width, frame.height);
        return frame;
      }
      // the guide box (shown over a video that fills the screen with object-fit: cover)
      const box = el.querySelector('.frame').getBoundingClientRect();
      const vr = video.getBoundingClientRect();
      const k = Math.max(vr.width / vw, vr.height / vh);
      const ox = (vr.width - vw * k) / 2, oy = (vr.height - vh * k) / 2;
      const sx = Math.max(0, (box.left - vr.left - ox) / k), sy = Math.max(0, (box.top - vr.top - oy) / k);
      const sw = Math.min(vw - sx, box.width / k), sh = Math.min(vh - sy, box.height / k);
      return prepare(video, sx, sy, sw, sh, Math.min(3, 1400 / sw));
    }

    async function readText(auto) {
      if (busyOcr || stopped) return;
      busyOcr = true;
      say(t('scan.reading'));
      try {
        const c = grab(true);
        const text = c ? await ocrCanvas(c, (p) => say(`${t('scan.reading')} ${Math.round(p * 100)}%`)) : '';
        const v = accept(text);
        if (v) return finish(v);
        say(auto ? t('scan.hintQr') : t('scan.notRead'));
      } catch (e) {
        say(t('scan.ocrFailed'));
      } finally {
        busyOcr = false;
      }
    }

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') finish(null);
      if (a === 'ocr') readText(false);
      if (a === 'torch' && stream) {
        const track = stream.getVideoTracks()[0];
        const on = !track.__torch;
        try { await track.applyConstraints({ advanced: [{ torch: on }] }); track.__torch = on; } catch (_) { /* no torch */ }
      }
    });
    el.querySelector('input[type=file]').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      say(t('scan.reading'));
      try {
        const v = await readImageFile(f, accept, (p) => say(`${t('scan.reading')} ${Math.round(p * 100)}%`));
        if (v) finish(v);
        else say(t('scan.notInPicture'));
      } catch (_) {
        say(t('scan.notInPicture'));
      }
    });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      } catch (e) {
        say(t(window.isSecureContext ? 'scan.noCamera' : 'scan.needHttps'));
        return;
      }
      if (stopped) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      video.srcObject = stream;
      try { await video.play(); } catch (_) { /* autoplay */ }
      const caps = stream.getVideoTracks()[0].getCapabilities?.() || {};
      if (caps.torch) el.querySelector('[data-a=torch]').hidden = false;
      say(t(mode === 'pair' ? 'scan.pointPair' : 'scan.pointCode'));
      // QR every ~250 ms; the printed code once by itself after 3 s (then by the button)
      const started = Date.now();
      let autoOcr = mode === 'code';
      while (!stopped) {
        const c = grab(false);
        if (c) {
          const q = await qrFromCanvas(c);
          const v = q && accept(q);
          if (v) return finish(v);
          if (q && !v) say(t(mode === 'pair' ? 'scan.notPairQr' : 'scan.notCodeQr'));
        }
        if (autoOcr && Date.now() - started > 3000) {
          autoOcr = false;
          readText(true);
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
  });
}
