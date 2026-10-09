// يشغّل التطبيق من غير نت: كل الملفات بتتحفظ على الموبايل أول مرة. build.js بيكتب FILES و VERSION (بصمة الملفات)
// في النسخة اللي بتترفع، فأي تعديل = نسخة جديدة بتنزل لوحدها.
const VERSION = 'a923e8248e70';
const FILES = ["./","about/mahmoud-card.jpg","about/mahmoud.jpg","about/omar-card.jpg","about/omar.jpg","app.css","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","js/app.js","js/codec.js","js/db.js","js/i18n.js","js/scanner.js","js/sync.js","manifest.webmanifest","vendor/tesseract/LICENSE-tesseract-core","vendor/tesseract/LICENSE-tesseract.js.md","vendor/tesseract/lang/eng.traineddata.gz","vendor/tesseract/tesseract-core-lstm.wasm.js","vendor/tesseract/tesseract-core-simd-lstm.wasm.js","vendor/tesseract/tesseract.min.js","vendor/tesseract/worker.min.js","vendor/zxing.min.js"];
const CACHE = 'mo-lm-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mo-lm-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // only the app's own files (the PC's sync address is never cached)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
