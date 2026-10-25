"use strict";
// Güneş Mobilya — uygulama kapalıyken bildirim (Web Push), telefondan paylaşma, fotoğraf küçültme ayarı, video arşivi
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.

/* ================= UYGULAMA KAPALIYKEN BİLDİRİM ================= */
// Sunucu: supabase-guncelleme-14.sql (abonelik tablosu, tetikleyici) + supabase/functions/bildirim-gonder (Edge Function).
// Yönetici bir kez "Kur" der: VAPID anahtarı tarayıcıda üretilir, gizli kısmı yalnız sunucuda saklanır.
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64Coz = s => { const t = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(t, c => c.charCodeAt(0)); };
let pushDurumu = null;   // {genel, url, olusma} | {} | {hata}
const pushDestek = () => "serviceWorker" in navigator && "PushManager" in window && window.Notification && cevrimici;
async function pushDurumGetir(){
  if(!pushDestek() || !sb) return (pushDurumu = {});
  const r = await sb.rpc("push_durum");
  pushDurumu = r.error ? {hata:/push_durum|function|does not exist|schema cache/i.test(r.error.message || "") ? "sql" : hataMesaji(r.error)} : (r.data || {});
  return pushDurumu;
}
async function vapidUret(){
  const k = await crypto.subtle.generateKey({name:"ECDSA", namedCurve:"P-256"}, true, ["sign", "verify"]);
  const j = await crypto.subtle.exportKey("jwk", k.privateKey), ham = await crypto.subtle.exportKey("raw", k.publicKey);
  return {genel:b64url(ham), gizli:j.d};
}
EYLEM.pushKur = btn => onayla("Telefon bildirimleri kurulsun mu?", "Önce supabase-guncelleme-14.sql çalıştırılmış ve “bildirim-gonder” işlevi Supabase'e yüklenmiş olmalı. Daha önce abone olan cihazların yeniden açması gerekir.", "Kur", () => islem(btn, async () => {
  const a = await vapidUret();
  const r = await sb.rpc("push_kur", {p_genel:a.genel, p_gizli:a.gizli, p_url:BULUT.adres.replace(/\/+$/, "") + "/functions/v1/bildirim-gonder", p_apikey:BULUT.anahtar});
  if(r.error) throw r.error;
  await pushDurumGetir(); logla("guncelle", "ayarlar", "push", "Telefon bildirimleri kuruldu");
  await pushAboneOl(); bildir("Kuruldu; bu cihaz abone oldu"); ciz();
}), false);
async function pushAboneOl(){
  if(!pushDurumu || !pushDurumu.genel) await pushDurumGetir();
  if(!pushDurumu.genel) throw new Error("Önce yönetici telefon bildirimlerini kurmalı.");
  if(Notification.permission !== "granted" && await Notification.requestPermission() !== "granted") throw new Error("Bildirim izni verilmedi. Tarayıcının site ayarlarından izin verin.");
  const reg = await navigator.serviceWorker.ready;
  let ab = await reg.pushManager.getSubscription();
  // Anahtar değiştiyse eski abonelik iptal edilir
  if(ab && ab.options && ab.options.applicationServerKey && b64url(ab.options.applicationServerKey) !== pushDurumu.genel){ await ab.unsubscribe().catch(() => {}); ab = null; }
  if(!ab) ab = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64Coz(pushDurumu.genel)});
  const j = ab.toJSON(), a = bildirimAyar();
  const r = await sb.from("push_abonelik").upsert({endpoint:j.endpoint, eposta:benimEposta(), abonelik:j, cihaz:cihazAdi(), olusma:Date.now(),
    tercih:{kategori:a.kategori, sessizBas:a.sessizBas, sessizBit:a.sessizBit, yonetici:!!yetki.yonetici}});
  if(r.error) throw r.error;
  cihazKaydet({push:true});
}
async function pushTercihGuncelle(){
  if(!cihaz().push || !pushDestek()) return;
  try{ const reg = await navigator.serviceWorker.ready, ab = await reg.pushManager.getSubscription(); if(!ab) return;
    const a = bildirimAyar(); await sb.from("push_abonelik").update({tercih:{kategori:a.kategori, sessizBas:a.sessizBas, sessizBit:a.sessizBit, yonetici:!!yetki.yonetici}}).eq("endpoint", ab.endpoint); }catch(e){}
}
async function pushIptal(){
  try{ const reg = await navigator.serviceWorker.ready, ab = await reg.pushManager.getSubscription();
    if(ab){ await sb.from("push_abonelik").delete().eq("endpoint", ab.endpoint); await ab.unsubscribe(); } }catch(e){}
  cihazKaydet({push:false});
}
EYLEM.pushAc = btn => islem(btn, async () => { await pushAboneOl(); bildir("Bu cihaz kapalıyken de bildirim alacak"); ciz(); });
EYLEM.pushKapat = btn => islem(btn, async () => { await pushIptal(); bildir("Kapatıldı"); ciz(); });
EYLEM.pushDeneme = () => { logla("push_deneme", "sistem", "", "Deneme bildirimi"); bildir("Gönderildi; birkaç saniye içinde gelmeli"); };
const PUSH_KOD_ADRES = "https://github.com/gavalkadir2-tech/gunes/blob/main/supabase/functions/bildirim-gonder/index.ts";
function pushKarti(){
  if(!cevrimici) return '';
  if(!pushDestek()) return '<div class="kart">' + kartBaslik("Uygulama kapalıyken bildirim") + '<div class="alt-bilgi" style="margin:0">Bu tarayıcı desteklemiyor. iPhone\'da uygulamayı Safari\'de “Paylaş → Ana Ekrana Ekle” ile ekleyip oradan açın (iOS 16.4 ve sonrası).</div></div>';
  const d = pushDurumu, c = cihaz();
  if(!d) return '<div class="kart">' + kartBaslik("Uygulama kapalıyken bildirim") + '<div class="alt-bilgi" style="margin:0">Durum okunuyor…</div></div>';
  if(d.hata === "sql") return '<div class="kart">' + kartBaslik("Uygulama kapalıyken bildirim") + '<div class="alt-bilgi" style="margin:0">Supabase\'de <b>supabase-guncelleme-14.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div></div>';
  const kurulum = '<ol class="adimlar"><li>Supabase\'de <b>supabase-guncelleme-14.sql</b> dosyasını çalıştırın.</li>' +
    '<li>Supabase → <b>Edge Functions</b> → <b>Deploy a new function</b> → <b>Via Editor</b>. Adını <b>bildirim-gonder</b> yazın, <a href="' + PUSH_KOD_ADRES + '" target="_blank" rel="noopener">bu dosyanın</a> içeriğinin tamamını yapıştırıp <b>Deploy</b> deyin.</li>' +
    '<li>Buradaki <b>Kur</b> düğmesine basın. Sonra her telefonda “Bu cihazda aç” deyin.</li></ol>';
  return '<div class="kart">' + kartBaslik("Uygulama kapalıyken bildirim", d.genel ? '<span class="etiket-rozet d-yesil">kurulu</span>' : '') +
    (d.genel ? '<div class="alt-bilgi" style="margin:0 0 8px">Ortağınız veya usta bir şey eklediğinde / değiştirdiğinde telefon ekranı kapalıyken de bildirim gelir. Türler ve sessiz saatler yukarıdaki ayarlara göre.</div>' +
        (c.push ? '<div style="display:flex;gap:8px;align-items:center;color:var(--giris);font-weight:500">' + ik("tamam") + 'Bu cihaz abone</div><div class="buton-sira"><button class="buton ikincil kucuk" style="margin:0" data-is="pushDeneme">' + ik("zil") + 'Deneme gönder</button>' +
          '<button class="buton ikincil kucuk" style="margin:0" data-is="pushKapat">Bu cihazda kapat</button></div>' :
          '<button class="buton" data-is="pushAc">' + ik("zil") + 'Bu cihazda aç</button>') +
        (yetki.yonetici && !yetki.salt ? '<details style="margin-top:12px"><summary class="alt-bilgi" style="cursor:pointer">Kurulum adımları / yeniden kur</summary>' + kurulum + '<button class="buton ikincil kucuk" data-is="pushKur">Yeniden kur</button></details>' : '') :
      yetki.yonetici && !yetki.salt ? '<div class="alt-bilgi" style="margin:0">Bir kerelik kurulum (5 dakika):</div>' + kurulum + '<button class="buton" data-is="pushKur">' + ik("ayar") + 'Kur</button>' :
      '<div class="alt-bilgi" style="margin:0">Henüz kurulmamış; yöneticiden Ayarlar → Bildirimler\'den kurmasını isteyin.</div>') + '</div>';
}

/* ================= TELEFONDAN PAYLAŞMA ================= */
// Galeri / WhatsApp → Paylaş → Güneş Mobilya: dosyalar service worker'da cihaza yazılır, burada iş emri seçilip yüklenir.
async function paylasilanlar(){ return (await IDB.al("paylasilan")) || null; }
function ekranPaylasilan(){
  const p = paylasimBekleyen;
  if(!p) { paylasilanlar().then(x => { paylasimBekleyen = x || {dosyalar:[]}; if(yol()[0] === "paylasilan") ciz(); }); return {baslik:"Paylaşılan dosyalar", geri:true, html:'<div class="kart"><div class="alt-bilgi">Okunuyor…</div></div>'}; }
  const l = p.dosyalar || [], q = trKucuk(filtre.paylasAra || "");
  const isler = veri.is_emirleri.filter(ie => ie.durum !== "İptal" && (!q || trKucuk(ie.no + " " + ie.baslik + " " + cariAdi(ie.musteriId)).indexOf(q) >= 0))
    .sort((a, b) => (ac(b) - ac(a)) || b.olusma - a.olusma).slice(0, 30);
  const html = !l.length ? '<div class="kart">' + bos("resim", "Paylaşılan dosya yok. Telefonun galerisinde veya WhatsApp\'ta bir fotoğrafı seçip <b>Paylaş → Güneş Mobilya</b> deyin.") + '</div>' :
    '<div class="kart">' + kartBaslik(l.length + " dosya geldi", p.metin ? esc(p.metin.slice(0, 80)) : '') + '<div class="paylas-onizleme">' + l.map((f, i) => /^image\//.test(f.type) ?
      '<img data-pi="' + i + '" alt="">' : '<div class="paylas-dosya">' + ik(/^video\//.test(f.type) ? "oynat" : "fatura") + '<span>' + esc(f.name) + '</span></div>').join("") + '</div>' +
      '<button class="baglanti" style="margin:8px 0 0" data-is="paylasilanSil">Vazgeç, dosyaları sil</button></div>' +
    bolum("Hangi işe eklensin?") + '<div class="ara">' + ik("ara") + '<input id="paylasAra" class="kutu" placeholder="İş, müşteri veya numara ara…" value="' + esc(filtre.paylasAra || "") + '"></div>' +
    '<div class="kart liste-kart">' + (isler.length ? isler.map(ie => '<button class="satir" data-is="paylasilanYukle" data-arg="' + ie.id + '"><span class="rozet r-ana">' + ik("is") + '</span><span class="orta"><div class="s1">' + esc(ie.no + " · " + ie.baslik) + '</div>' +
      '<div class="s2">' + esc(cariAdi(ie.musteriId) + " · " + ie.durum) + '</div></span>' + ik("arti") + '</button>').join("") : bos("ara", "Bulunamadı.")) + '</div>';
  return {baslik:"Paylaşılan dosyalar", geri:true, html, sonra(){
    document.querySelectorAll("[data-pi]").forEach(e => { const f = l[Number(e.getAttribute("data-pi"))]; e.src = URL.createObjectURL(f); });
    const a = document.getElementById("paylasAra");
    if(a) a.addEventListener("input", () => { filtre.paylasAra = a.value; const s = a.selectionStart; ciz(); const y = document.getElementById("paylasAra"); y.focus(); y.setSelectionRange(s, s); });
  }};
}
let paylasimBekleyen = null;
EYLEM.paylasilanSil = async () => { await IDB.yaz("paylasilan", null); paylasimBekleyen = null; git("ana"); };
EYLEM.paylasilanYukle = async (el, ieId) => {
  const l = (paylasimBekleyen || {}).dosyalar || []; if(!l.length) return;
  await dosyaSecildi({files:l, value:""}, ieId);
  await IDB.yaz("paylasilan", null); paylasimBekleyen = null; filtre.paylasAra = "";
  if(veri.dosyalar.some(d => d.isEmriId === ieId)) git("is/" + ieId);
};
// Açılışta veya uygulama açıkken paylaşım gelirse
async function paylasimKontrol(){
  const p = await paylasilanlar();
  if(p && p.dosyalar && p.dosyalar.length && yol()[0] !== "paylasilan"){ paylasimBekleyen = p; git("paylasilan"); }
}
if(navigator.serviceWorker) navigator.serviceWorker.addEventListener("message", e => { if(e.data && e.data.tur === "paylasim" && hazir) paylasimKontrol(); if(e.data && e.data.tur === "git" && hazir) git(e.data.yer); });

/* ================= FOTOĞRAF KÜÇÜLTME VE VİDEO ARŞİVİ ================= */
const FOTO_BOYUT = [[1280, "Küçük (1280 px · ~200 KB)"], [1600, "Orta (1600 px · ~350 KB)"], [2400, "Büyük (2400 px · ~700 KB)"], [0, "Küçültme (orijinal)"]];
const fotoAyar = () => ({boyut:sistem().fotoBoyut == null ? 1600 : Number(sistem().fotoBoyut), kalite:Number(sistem().fotoKalite) || 0.82});
function fotoKarti(){
  const f = fotoAyar(), fotolar = veri.dosyalar.filter(d => dosyaTuru(d) === "g"), buyuk = fotolar.filter(d => d.boyut > 900 * 1024);
  return '<div class="kart">' + kartBaslik("Fotoğraf boyutu", "(yüklenirken)") +
    '<div class="alt-bilgi" style="margin:0 0 8px">İş emrine eklenen fotoğraflar yüklenmeden önce küçültülür; ekranda ve baskıda net görünür, depolama ve internet azalır.</div>' +
    '<div class="secenekler">' + FOTO_BOYUT.map(([v, a]) => '<button type="button" class="secenek' + (v === f.boyut ? ' secili' : '') + '" data-is="fotoBoyutSec" data-arg="' + v + '">' + a + '</button>').join("") + '</div>' +
    (cevrimici && buyuk.length && f.boyut ? '<div class="alt-bilgi">Daha önce yüklenmiş <b>' + buyuk.length + '</b> büyük fotoğraf var (' + mbYaz(buyuk.reduce((t, d) => t + d.boyut, 0)) + ').</div>' +
      '<button class="buton ikincil kucuk" data-is="eskiFotoKucult">' + ik("resim") + 'Eski fotoğrafları da küçült</button>' : '') + '</div>';
}
EYLEM.fotoBoyutSec = (el, v) => islem(null, async () => { await sistemKaydet({fotoBoyut:Number(v)}); bildir("Kaydedildi"); ciz(); });
// Yüklenmiş büyük fotoğraflar indirilip küçültülür, yeni dosya yüklenip kayıt güncellenir, eskisi silinir
EYLEM.eskiFotoKucult = () => {
  const l = veri.dosyalar.filter(d => dosyaTuru(d) === "g" && d.boyut > 900 * 1024), once = l.reduce((t, d) => t + d.boyut, 0);
  onayla(l.length + " fotoğraf küçültülsün mü?", "Toplam " + mbYaz(once) + ". Uzun sürebilir; bitene kadar sayfayı kapatmayın. Orijinaller geri alınamaz.", "Küçült", async () => {
    let kazanc = 0, hata = 0;
    for(let i = 0; i < l.length; i++){
      yuklemeGoster("Fotoğraflar küçültülüyor " + (i + 1) + "/" + l.length + "…");
      const d = l[i];
      try{
        await urlleriGetir([d]); const r = await fetch(urlOnbellek[d.yol].url); if(!r.ok) throw new Error("indirilemedi");
        const b = await r.blob(), f = await gorselKucult(new File([b], d.ad, {type:d.tur || b.type}));
        if(f.size >= d.boyut * 0.9) continue;
        const yeni = d.yol.replace(/[^/]+$/, "") + yeniId() + "_" + guvenliDosyaAdi(f.name), u = await sb.storage.from(BUCKET).upload(yeni, f, {contentType:"image/jpeg", upsert:false});
        if(u.error) throw u.error;
        await Depo.kaydet("dosyalar", Object.assign({}, d, {ad:f.name, tur:"image/jpeg", boyut:f.size, yol:yeni}));
        await sb.storage.from(BUCKET).remove([d.yol]).catch(() => {});
        kazanc += d.boyut - f.size;
      }catch(e){ hata++; }
    }
    yuklemeKapat(); logla("guncelle", "dosyalar", "", "Eski fotoğraflar küçültüldü (" + mbYaz(kazanc) + " kazanıldı)");
    uyar("Bitti", mbYaz(kazanc) + " yer açıldı." + (hata ? " " + hata + " fotoğraf işlenemedi." : "")); ciz();
  }, false);
};
function videoArsivKarti(){
  if(!cevrimici) return '';
  const ay = Number(filtre.videoAy) || 6, sinir = Date.now() - ay * 30 * 86400000;
  const l = veri.dosyalar.filter(d => dosyaTuru(d) === "v" && d.olusma < sinir && (bul("is_emirleri", d.isEmriId) || {}).durum !== "Üretimde");
  return '<div class="kart">' + kartBaslik("Eski videoları arşivle") +
    '<div class="alt-bilgi" style="margin:0 0 8px">Videolar depolamanın çoğunu kaplar. Seçilen süreden eski videolar bilgisayarınıza ZIP olarak indirilir, sonra buluttan silinir.</div>' +
    '<div class="secenekler">' + [[3, "3 aydan eski"], [6, "6 aydan eski"], [12, "1 yıldan eski"]].map(([v, a]) => '<button type="button" class="secenek' + (v === ay ? ' secili' : '') + '" data-is="videoAySec" data-arg="' + v + '">' + a + '</button>').join("") + '</div>' +
    (l.length ? '<div class="alt-bilgi"><b>' + l.length + '</b> video · <b>' + mbYaz(l.reduce((t, d) => t + d.boyut, 0)) + '</b></div><button class="buton ikincil" data-is="videoArsivle">' + ik("indir") + 'İndir ve buluttan sil</button>' :
      '<div class="alt-bilgi">Bu süreden eski video yok.</div>') + '</div>';
}
EYLEM.videoAySec = (el, v) => { filtre.videoAy = Number(v); ciz(); };
EYLEM.videoArsivle = () => {
  const ay = Number(filtre.videoAy) || 6, sinir = Date.now() - ay * 30 * 86400000;
  const l = veri.dosyalar.filter(d => dosyaTuru(d) === "v" && d.olusma < sinir && (bul("is_emirleri", d.isEmriId) || {}).durum !== "Üretimde");
  onayla(l.length + " video arşivlensin mi?", "Önce ZIP dosyası (" + mbYaz(l.reduce((t, d) => t + d.boyut, 0)) + ") indirilir. İndirme bitince buluttan silmek için ayrıca onay istenir.", "İndir", async () => {
    try{
      await jszipYukle(); const zip = new JSZip(), tamam = [];
      for(let i = 0; i < l.length; i += 100) await urlleriGetir(l.slice(i, i + 100));
      for(let i = 0; i < l.length; i++){
        yuklemeGoster("Videolar indiriliyor " + (i + 1) + "/" + l.length + "…");
        const d = l[i], ie = bul("is_emirleri", d.isEmriId);
        try{ const r = await fetch(urlOnbellek[d.yol].url); if(!r.ok) throw 0;
          zip.file(guvenliAd(ie ? ie.no + " " + ie.baslik : "is") + "/" + guvenliAd(d.ad), await r.blob(), {compression:"STORE"}); tamam.push(d); }catch(e){}
      }
      const blob = await zip.generateAsync({type:"blob", compression:"STORE", streamFiles:true}, m => yuklemeGoster("ZIP hazırlanıyor %" + Math.round(m.percent)));
      yuklemeKapat(); dosyaIndir(blob, "gunes-video-arsivi-" + bugun() + ".zip");
      onayla("ZIP indirildi. " + tamam.length + " video buluttan silinsin mi?", "Dosyanın bilgisayarınıza indiğini kontrol edin. Silinen videolar çöp kutusuna gitmez.", "Buluttan sil", () => islem(null, async () => {
        for(const d of tamam) await Depo.sil("dosyalar", d.id, {cop:false});
        const isler = Array.from(new Set(tamam.map(d => d.isEmriId)));
        for(const id of isler) if(bul("is_emirleri", id)) await notEkle(id, tamam.filter(d => d.isEmriId === id).length + " video arşive alındı (ZIP, " + tarihYaz(bugun()) + ")");
        bildir(tamam.length + " video arşivlendi"); ciz(); }));
    }catch(e){ yuklemeKapat(); uyar("Arşivlenemedi", hataMesaji(e)); }
  }, false);
};
