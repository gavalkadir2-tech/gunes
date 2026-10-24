// Güneş Mobilya — çevrimdışı açılış için önbellek.
// Uygulama dosyaları önbellekten de açılır; Supabase istekleri (veri, giriş, dosya) asla önbelleğe alınmaz.
const SURUM = "gunes-v1";
const TEMEL = ["./", "index.html", "manifest.webmanifest", "logo.png", "logo-beyaz.png", "logo-ikon.png", "favicon.png", "apple-touch-icon.png", "ikon-192.png", "ikon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SURUM).then(c => Promise.all(TEMEL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== SURUM).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if(r.method !== "GET" || /supabase\.(co|in)$/.test(u.hostname) || u.protocol === "chrome-extension:") return;
  // Sayfanın kendisi: önce ağ (güncel sürüm), yoksa önbellek
  if(r.mode === "navigate" || (u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname))){
    e.respondWith(fetch(r).then(y => { const k = y.clone(); caches.open(SURUM).then(c => c.put("index.html", k)); return y; })
      .catch(() => caches.match("index.html").then(y => y || caches.match("./"))));
    return;
  }
  // CDN kütüphaneleri ve yazı tipleri sürümlüdür: önce önbellek
  if(/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(y => y || fetch(r).then(z => { if(z.ok || z.type === "opaque"){ const k = z.clone(); caches.open(SURUM).then(c => c.put(r, k)); } return z; })));
    return;
  }
  // Kendi dosyalarımız: önbellekten hemen ver, arkada yenile
  if(u.origin === location.origin){
    e.respondWith(caches.match(r).then(y => {
      const ag = fetch(r).then(z => { if(z.ok){ const k = z.clone(); caches.open(SURUM).then(c => c.put(r, k)); } return z; }).catch(() => y);
      return y || ag;
    }));
  }
});
