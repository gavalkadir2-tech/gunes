// Güneş Mobilya — çevrimdışı açılış için önbellek.
// Uygulama dosyaları önbellekten de açılır; Supabase istekleri (veri, giriş, dosya) asla önbelleğe alınmaz.
const SURUM = "gunes-v8";
const TEMEL = ["./", "index.html", "css/uygulama.css", "js/01-cekirdek.js", "js/02-arayuz.js", "js/03-kasa-cari.js", "js/04-is-emirleri.js", "js/05-katalog.js", "js/06-hatirlatma-stok-kesif.js", "js/07-paylasim-fatura.js", "js/08-rapor-personel.js", "js/09-takvim-usta-arama.js", "js/10-uretim.js", "js/11-cek-cevrimdisi-efatura.js", "js/12-ortak-yedek-arac.js", "js/13-iletisim-banka.js", "js/14-sistem-ayarlar.js", "js/15-bildirim-ayar.js", "js/16-modul-kapasite.js", "js/17-gider-muhasebe.js", "js/18-push-paylas.js", "js/19-giris-acilis.js",
  "manifest.webmanifest", "logo.png", "logo-beyaz.png", "logo-ikon.png", "favicon.png", "apple-touch-icon.png", "ikon-192.png", "ikon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SURUM).then(c => Promise.all(TEMEL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== SURUM).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Telefondan paylaşma (manifest "share_target"): dosyalar cihaza yazılır, uygulama #paylasilan sayfasında açılır
function idbYaz(k, v){
  return new Promise(res => { const q = indexedDB.open("gunes-mobilya", 1); q.onupgradeneeded = () => q.result.createObjectStore("kv");
    q.onsuccess = () => { const t = q.result.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = res; }; q.onerror = res; });
}
async function paylasimAl(r){
  try{
    const f = await r.formData(), dosyalar = f.getAll("dosyalar").filter(x => x && x.size);
    await idbYaz("paylasilan", {dosyalar, metin:[f.get("title"), f.get("text"), f.get("url")].filter(Boolean).join(" "), zaman:Date.now()});
    (await self.clients.matchAll({type:"window"})).forEach(c => c.postMessage({tur:"paylasim"}));
  }catch(e){}
  return Response.redirect(new URL("./#paylasilan", self.registration.scope).href, 303);
}
// Uygulama kapalıyken bildirim (Web Push). Uygulama açık ve önündeyse kendi uyarısı gösterilir.
self.addEventListener("push", e => {
  let d = {}; try{ d = e.data.json(); }catch(x){ d = {baslik:"Güneş Mobilya", govde:e.data ? e.data.text() : ""}; }
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(l => {
    if(d.etiket !== "gunes-deneme" && l.some(c => c.visibilityState === "visible")) return;
    return self.registration.showNotification(d.baslik || "Güneş Mobilya", {body:d.govde || "", icon:"ikon-192.png", badge:"ikon-192.png", tag:d.etiket, data:{yer:d.yer || "ana"}});
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const yer = (e.notification.data || {}).yer || "ana";
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(l => {
    if(l[0]){ l[0].postMessage({tur:"git", yer}); return l[0].focus(); }
    return self.clients.openWindow(new URL("./#" + yer, self.registration.scope).href);
  }));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if(r.method === "POST" && u.origin === location.origin && /\/paylas$/.test(u.pathname)){ e.respondWith(paylasimAl(r)); return; }
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
  // Kendi dosyalarımız: önce ağ (sayfa ile kod hep aynı sürümde kalsın), internet yoksa önbellek
  if(u.origin === location.origin){
    e.respondWith(fetch(r).then(z => { if(z.ok){ const k = z.clone(); caches.open(SURUM).then(c => c.put(r, k)); } return z; })
      .catch(() => caches.match(r, {ignoreSearch:true})));
  }
});
