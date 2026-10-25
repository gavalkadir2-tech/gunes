"use strict";
// Güneş Mobilya — paylasim fatura
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= MÜŞTERİYE PAYLAŞIM ================= */
// Seçilen projelerin fotoğrafları herkese açık "vitrin" deposuna kopyalanır; müşteri giriş yapmadan #vitrin/<anahtar> adresinden görür.
// Bağlantı kapatılınca kopyalar silinir; katalogdaki asıl fotoğraflar gizli kalır.
const VITRIN = "vitrin";
const PAYLASIM_SURE = [["7", "7 gün"], ["30", "30 gün"], ["90", "90 gün"], ["0", "Süresiz"]];
const rastgeleAnahtar = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => ("0" + b.toString(16)).slice(-2)).join("");
const paylasimLinki = k => location.origin + location.pathname + "#vitrin/" + k.id;
const paylasimBitti = k => k.bitis > 0 && k.bitis < Date.now();
const msTarih = ms => { const d = new Date(ms); return d.getDate() + " " + AYLAR[d.getMonth()] + " " + d.getFullYear(); };
const vitrinWaLink = (tel, yazi) => "https://wa.me/" + waNumara(tel) + "?text=" + encodeURIComponent("Merhaba, " + yazi);

function ekranPaylasimlar(){
  if(eksikTablo.paylasimlar) return {baslik:"Müşteri bağlantıları", geri:true, html:'<div class="uyari">Bu özellik için Supabase\'de <b>supabase-guncelleme-4.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>'};
  const l = veri.paylasimlar.slice().sort((a, b) => b.olusma - a.olusma);
  const html = (firma().telefon ? '' : '<div class="uyari">Müşterinin size WhatsApp\'tan yazabilmesi için <b data-git="ayarlar" style="cursor:pointer;text-decoration:underline">Ayarlar</b>\'dan firma telefonunu girin.</div>') +
    '<div class="ust-arac"><div class="alt-bilgi" style="margin:0">Müşteri bu bağlantıları giriş yapmadan açar. Kapattığınız bağlantı çalışmaz.</div>' +
    '<button class="buton kucuk" data-git="paylas-form">' + ik("arti") + 'Yeni bağlantı</button></div>' +
    '<div class="kart liste-kart">' + (l.length ? l.map(k => {
      const ic = k.icerik || {}, pl = ic.projeler || [], biten = paylasimBitti(k);
      const alt = [cariAdi(k.musteriId), pl.length + " proje", pl.reduce((t, p) => t + p.gorseller.length, 0) + " fotoğraf",
        k.bitis ? (biten ? "Süresi doldu" : "Son gün: " + msTarih(k.bitis)) : "Süresiz"].filter(Boolean).join(" · ");
      return '<div class="satir"><span class="rozet r-ana">' + ik("katalog") + '</span><span class="orta"><div class="s1">' + esc(k.baslik) + '</div>' +
        '<div class="s2"' + (biten ? ' style="color:#b91c1c"' : '') + '>' + esc(alt) + '</div></span>' +
        '<span class="sag" style="display:flex;gap:6px">' + (biten ? '' : '<button class="ikon-buton" data-is="paylasimAc" data-arg="' + k.id + '">' + ik("mesaj") + '<span class="yazi-gizle">Gönder</span></button>') +
        '<button class="ikon-buton" data-is="paylasimSil" data-arg="' + k.id + '" aria-label="Bağlantıyı kapat">' + ik("sil") + '</button></span></div>';
    }).join("") : bos("mesaj", "Henüz müşteriye gönderilmiş bağlantı yok.")) + '</div>';
  return {baslik:"Müşteri bağlantıları", geri:true, html};
}
function ekranPaylasForm(kategori, projeId){
  if(!cevrimici) return {baslik:"Müşteriye gönder", geri:true, html:'<div class="uyari">Bağlantı oluşturmak için bulut bağlantısı gerekir.</div>'};
  if(eksikTablo.paylasimlar) return ekranPaylasimlar();
  const projeler = projeSirali(veri.katalog), kat = katalogKategorileri();
  const secili = p => projeId ? p.id === projeId : !kategori || p.kategori === kategori;
  const pr = bul("katalog", projeId);
  form = {sure:String(sistem().paylasimSure)};
  const html = '<div class="kart form-kart">' +
    '<label class="etiket" for="cari" style="margin-top:0">Müşteri <span class="ist">(isteğe bağlı; WhatsApp numarası buradan alınır)</span></label>' + cariSecici("", false, "musteri") +
    '<label class="etiket" for="shBaslik">Başlık</label><input id="shBaslik" class="kutu" maxlength="120" value="' + esc(pr ? pr.baslik : kategori ? kategori + " projelerimiz" : "Proje kataloğumuz") + '">' +
    '<label class="etiket" for="shMesaj">Mesaj <span class="ist">(sayfanın başında görünür)</span></label><textarea id="shMesaj" class="kutu" maxlength="600">Sizin için seçtiğimiz örnek projelerimizi inceleyebilirsiniz. Beğendiğiniz model için bize WhatsApp\'tan yazabilirsiniz.</textarea>' +
    '<div class="form-bolum">Gönderilecek projeler</div>' +
    '<div class="secenekler" style="margin:10px 0"><button type="button" class="secenek" data-is="paylasSec" data-arg="hepsi">Tümünü seç</button>' +
      kat.filter(k => projeler.some(p => p.kategori === k)).map(k => '<button type="button" class="secenek" data-is="paylasSec" data-arg="' + esc(k) + '">Sadece ' + esc(k) + '</button>').join("") + '</div>' +
    (projeler.length ? projeler.map(p => {
      const g = projeMedya(p.id);
      return '<label class="satir" style="cursor:pointer"><input type="checkbox" class="pSec" value="' + p.id + '" data-kat="' + esc(p.kategori) + '"' + (secili(p) ? ' checked' : '') + ' style="width:20px;height:20px">' +
        '<span class="kapak" style="width:56px;flex:0 0 56px;border-radius:8px">' + (g.length ? medyaEtiket(projeKapak(p.id)).replace(/<span class="oynat">.*<\/span>$/, "") : ik("resim")) + '</span>' +
        '<span class="orta"><div class="s1">' + esc(p.baslik) + '</div><div class="s2">' + esc(p.kategori + " · " + g.length + " fotoğraf") + '</div></span></label>';
    }).join("") : bos("katalog", "Katalogda proje yok.")) +
    '<label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:14px"><input type="checkbox" id="shFiyat"> Tahmini fiyatları göster <span class="ist" style="color:var(--soluk)">(“Başlangıç: … ₺ + KDV” olarak)</span></label>' +
    '<label class="etiket">Bağlantı ne kadar açık kalsın?</label><div class="secenekler" data-ad="sure">' + PAYLASIM_SURE.map(x =>
      '<button type="button" class="secenek' + (x[0] === form.sure ? ' secili' : '') + '" data-deger="' + x[0] + '">' + x[1] + '</button>').join("") + '</div>' +
    '<div class="hata" id="hata"></div><button class="buton" data-is="paylasKaydet">' + ik("mesaj") + 'Bağlantı oluştur</button></div>';
  return {baslik:"Müşteriye gönder", geri:true, html, sonra(){ secenekBagla(); galeriDoldur(); }};
}
EYLEM.paylasSec = (el, k) => document.querySelectorAll(".pSec").forEach(x => { x.checked = k === "hepsi" || x.getAttribute("data-kat") === k; });
EYLEM.paylasKaydet = btn => {
  const projeler = Array.from(document.querySelectorAll(".pSec:checked")).map(x => bul("katalog", x.value)).filter(Boolean);
  if(!projeler.length) return hataYaz("En az bir proje seçin.");
  if(!projeler.some(p => projeMedya(p.id).length)) return hataYaz("Seçilen projelerde fotoğraf yok.");
  const o = {projeler, musteriId:deger("cari") || null, baslik:deger("shBaslik") || "Proje kataloğumuz", mesaj:deger("shMesaj"),
    fiyatli:document.getElementById("shFiyat").checked, gun:Number(form.sure) || 0};
  islem(btn, async () => {
    const k = await paylasimOlustur(o);
    history.replaceState(null, "", "#paylasimlar"); ciz(); paylasimPenceresi(k);
  });
};
async function paylasimOlustur(o){
  const id = rastgeleAnahtar(), yollar = [], tum = o.projeler.flatMap(p => projeMedya(p.id));
  try{
    for(let i = 0; i < tum.length; i += 100) await urlleriGetir(tum.slice(i, i + 100));
    const projeler = [];
    for(const p of o.projeler){
      const gorseller = [];
      for(const g of projeMedya(p.id)){
        yuklemeGoster("Fotoğraflar hazırlanıyor " + (yollar.length + 1) + "/" + tum.length + "…");
        const u = urlOnbellek[g.yol]; if(!u) throw new Error("fotoğraf alınamadı");
        const r0 = await fetch(u.url); if(!r0.ok) throw new Error("fotoğraf indirilemedi");
        const hedef = id + "/" + g.id + "_" + guvenliDosyaAdi(g.ad);
        const r = await sb.storage.from(VITRIN).upload(hedef, await r0.blob(), {contentType:g.tur || "image/jpeg", upsert:false});
        if(r.error) throw r.error;
        yollar.push(hedef);
        gorseller.push(sb.storage.from(VITRIN).getPublicUrl(hedef).data.publicUrl);
      }
      if(gorseller.length) projeler.push({baslik:p.baslik, kategori:p.kategori, aciklama:p.aciklama, malzeme:p.malzeme, olcu:p.olcu, fiyat: o.fiyatli ? p.fiyat : 0, gorseller});
    }
    const f = firma();
    const k = {id, baslik:o.baslik, musteriId:o.musteriId, bitis: o.gun ? Date.now() + o.gun * 86400000 : 0, olusma:Date.now(),
      icerik:{baslik:o.baslik, mesaj:o.mesaj, firma:{ad:FIRMA, telefon:f.telefon, adres:f.adres}, projeler, yollar}};
    await Depo.kaydet("paylasimlar", k);
    return k;
  }catch(e){
    if(yollar.length) sb.storage.from(VITRIN).remove(yollar).catch(() => {});
    if(/bucket not found/i.test((e && e.message) || "")) throw new Error("Paylaşım deposu kurulmamış: Supabase'de “supabase-guncelleme-4.sql” dosyasını çalıştırın.");
    throw e;
  }finally{ yuklemeKapat(); }
}
EYLEM.paylasimAc = (el, id) => { const k = bul("paylasimlar", id); if(k) paylasimPenceresi(k); };
function paylasimPenceresi(k){
  const link = paylasimLinki(k), m = bul("musteriler", k.musteriId) || {};
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:460px"><p>Bağlantı hazır</p><div class="alt-bilgi">' + esc(k.baslik) + (k.bitis ? ' · son gün ' + msTarih(k.bitis) : '') + '</div>' +
    '<input class="kutu" readonly value="' + esc(link) + '" style="margin-top:12px;font-size:14px" onclick="this.select()">' +
    '<div class="secim-liste"><button class="buton wa-buton" data-k="wa">' + ik("mesaj") + 'WhatsApp ile gönder</button>' +
    '<button class="buton ikincil" data-k="kopyala">' + ik("ataç") + 'Bağlantıyı kopyala</button>' +
    '<a class="buton ikincil" href="' + esc(link) + '" target="_blank" rel="noopener">' + ik("ekran") + 'Müşterinin göreceği sayfayı aç</a>' +
    '<button class="buton ikincil" data-k="kapat">Kapat</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-k]");
    if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-k");
    if(c === "kopyala"){
      const yedek = () => { const i = p.querySelector("input"); i.select(); try{ document.execCommand("copy"); }catch(x){} bildir("Bağlantı kopyalandı"); };
      if(navigator.clipboard) navigator.clipboard.writeText(link).then(() => bildir("Bağlantı kopyalandı"), yedek); else yedek();
      return;
    }
    p.remove();
    if(c === "wa") waPencere({tel:m.telefon, ad:m.ad, sablonlar:[{ad:"Katalog bağlantısı", metin:"Merhaba" + (m.ad ? " " + m.ad : "") + ", sizin için hazırladığımız örnek projelerimizi bu bağlantıdan inceleyebilirsiniz:\n" + link +
      (k.bitis ? "\n(Bağlantı " + msTarih(k.bitis) + " tarihine kadar açıktır.)" : "") + "\n\n" + FIRMA}]});
  });
  document.body.appendChild(p);
}
EYLEM.paylasimSil = (el, id) => {
  const k = bul("paylasimlar", id); if(!k) return;
  onayla("Bağlantı kapatılsın mı?", "Müşteri bu bağlantıyı artık açamaz; paylaşılan fotoğraf kopyaları silinir. Katalog etkilenmez.", "Kapat", () => islem(null, async () => {
    const yollar = (k.icerik && k.icerik.yollar) || [];
    if(yollar.length){ const r = await sb.storage.from(VITRIN).remove(yollar); if(r.error) throw r.error; }
    await Depo.sil("paylasimlar", id, {cop:false}); bildir("Bağlantı kapatıldı"); ciz();
  }));
};

/* --- Müşterinin gördüğü sayfa (giriş gerekmez) --- */
let vitrinVeri = null;
async function vitrinGoster(anahtar){
  document.body.classList.add("girissiz");
  window.addEventListener("hashchange", () => location.reload());
  const el = document.getElementById("uygulama"), mesaj = (b, a) => {
    el.innerHTML = '<div class="giris-ekrani"><div class="kart" style="text-align:center"><img src="logo.png" alt="' + esc(FIRMA) + '" style="height:40px;margin:0 auto">' +
      '<p style="font-weight:600;margin:16px 0 4px">' + esc(b) + '</p><div class="alt-bilgi">' + esc(a || "") + '</div></div></div>';
  };
  el.innerHTML = '<div class="yukleniyor"><span class="donen"></span>Yükleniyor…</div>';
  if(!sb) return mesaj("İnternet bağlantısı yok gibi görünüyor.", "Bağlantınızı kontrol edip sayfayı yenileyin.");
  let r;
  try{ r = await sb.rpc("vitrin_getir", {anahtar}); }catch(e){ r = {error:e}; }
  if(r.error && /fetch|network|Failed/i.test(r.error.message || "")) return mesaj("İnternet bağlantısı yok gibi görünüyor.", "Bağlantınızı kontrol edip sayfayı yenileyin.");
  if(r.error || !r.data || !Array.isArray(r.data.projeler)) return mesaj("Bu bağlantı geçersiz veya süresi dolmuş.", "Güncel bağlantı için bizimle iletişime geçebilirsiniz.");
  const v = vitrinVeri = r.data, fr = v.firma || {}, tel = waNumara(fr.telefon);
  v.projeler.forEach(p => p.gorseller.forEach(u => { urlOnbellek[u] = {url:u, bitis:Infinity}; }));
  document.title = v.baslik + " — " + (fr.ad || FIRMA);
  const iletisim = (tel ? '<a class="buton wa-buton" href="' + esc(vitrinWaLink(fr.telefon, "“" + v.baslik + "” sayfanızı inceledim, bilgi almak istiyorum.")) + '" target="_blank" rel="noopener">' + ik("mesaj") + 'WhatsApp\'tan yazın</a>' +
    '<a class="buton saydam" href="tel:+' + tel + '">' + ik("telefon") + 'Arayın</a>' : '');
  el.innerHTML = '<main class="sayfa" style="max-width:1100px">' +
    '<div class="vitrin"><div class="marka"><img src="logo-beyaz.png" alt="' + esc(fr.ad || FIRMA) + '"></div>' +
      '<h1 style="font-size:22px;margin:14px 0 4px;position:relative">' + esc(v.baslik) + '</h1>' +
      (v.mesaj ? '<div class="alt" style="white-space:pre-wrap">' + esc(v.mesaj) + '</div>' : '<div class="alt"></div>') +
      '<div class="buton-sira"><button class="buton altin" data-is="vitrinSunum" data-arg="-1">' + ik("oynat") + 'Tüm fotoğrafları izle</button>' + iletisim + '</div></div>' +
    '<div class="proje-izgara">' + v.projeler.map((p, i) => '<button class="proje-kart" data-is="vitrinSunum" data-arg="' + i + '"><span class="kapak">' + (() => { const k = p.gorseller.find(u => !videoMu({yol:u})) || p.gorseller[0];
        return videoMu({yol:k}) ? '<video src="' + esc(k) + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img src="' + esc(k) + '" loading="lazy" alt="' + esc(p.baslik) + '">'; })() +
      '<span class="sayi">' + p.gorseller.length + (p.gorseller.some(u => videoMu({yol:u})) ? ' medya' : ' foto') + '</span></span><span class="pk"><b>' + esc(p.baslik) + '</b><span>' + esc([p.kategori, p.malzeme].filter(Boolean).join(" · ")) + '</span>' +
      (p.fiyat ? '<span style="color:var(--yazi);font-weight:600;margin-top:2px;white-space:normal">' + 'Başlangıç: ' + para(p.fiyat) + ' + KDV</span>' : '') + '</span></button>').join("") + '</div>' +
    '<div class="alt-bilgi" style="text-align:center;margin:28px 0 12px">' + esc([fr.ad || FIRMA, fr.adres, fr.telefon].filter(Boolean).join(" · ")) + '</div></main>';
}
EYLEM.vitrinSunum = (el, i) => {
  if(!vitrinVeri) return;
  const n = Number(i), pl = n >= 0 ? [vitrinVeri.projeler[n]] : vitrinVeri.projeler;
  sunumAc(pl.flatMap(p => p.gorseller.map(u => ({g:{yol:u}, p}))), 0, {telefon:(vitrinVeri.firma || {}).telefon});
};

/* --- Teklif çıktısı --- */
EYLEM.teklifYazdir = async (el, id) => {
  const ie = bul("is_emirleri", id); if(!ie) return;
  const m = bul("musteriler", ie.musteriId) || {}, o = isOzet(id), fr = firma(), d = new Date();
  const h = isHesap(ie.kalemler, isTeklif(ie)), fiyatli = h.kalemli;
  const fotolar = isDosyalari(id).filter(x => dosyaTuru(x) === "g").slice(0, 6);
  if(fotolar.length) await urlleriGetir(fotolar).catch(() => {});
  document.querySelectorAll(".baski").forEach(x => x.remove());
  const b = document.createElement("div"); b.className = "baski";
  const toplamSatir = (k, v, kalin) => '<tr' + (kalin ? ' style="font-size:16px;font-weight:700"' : '') + '><td style="text-align:right;border:0">' + k + '</td><td style="text-align:right;border:0;white-space:nowrap;width:140px">' + v + '</td></tr>';
  b.innerHTML = '<div class="b-ust"><div><img src="logo.png" alt="' + esc(FIRMA) + '" style="height:46px;display:block;margin-bottom:6px"><div>' + esc([fr.adres, fr.telefon].filter(Boolean).join(" · ")) + '</div></div>' +
      '<div style="text-align:right"><b style="font-size:16px">FİYAT TEKLİFİ</b><br>Teklif no: <b>' + esc(ie.no) + '</b><br>Tarih: ' + d.getDate() + " " + AYLAR[d.getMonth()] + " " + d.getFullYear() + '</div></div>' +
    '<div>Sayın <b>' + esc(m.ad || "") + '</b>' + (m.telefon ? ' · ' + esc(m.telefon) : '') + (ie.adres ? '<br>' + esc(ie.adres) : '') + '</div>' +
    '<h2>' + esc(ie.baslik) + '</h2>' +
    (ie.kalemler.length ? '<table><tr><th>Ürün</th><th>Ölçü</th><th>Malzeme / renk</th><th>Adet</th>' + (fiyatli ? '<th style="text-align:right">Birim fiyat</th><th style="text-align:right">Tutar</th>' : '') + '</tr>' +
      ie.kalemler.map(k => '<tr><td>' + esc(k.ad) + '</td><td>' + esc(k.olcu) + '</td><td>' + esc(k.renk) + '</td><td>' + k.adet + '</td>' +
        (fiyatli ? '<td style="text-align:right;white-space:nowrap">' + (k.fiyat ? para(k.fiyat) : '') + '</td><td style="text-align:right;white-space:nowrap">' + (k.fiyat ? para(k.adet * k.fiyat) : '') + '</td>' : '') + '</tr>').join("") +
      '</table>' : '') +
    (h.ara > 0 ? '<table style="margin-top:6px">' + toplamSatir(h.kalemli ? "Ara toplam" : "Fiyat (KDV hariç)", para(h.ara)) + (h.indirim ? toplamSatir("İndirim", "−" + para(h.indirim)) : '') +
      toplamSatir(kdvYazi(h.kdvOran), para(h.kdv)) + toplamSatir("Genel toplam" + (h.kdvOran ? " (KDV dahil)" : ""), para(h.toplam), true) + '</table>' :
      o.fiyat ? '<div class="toplam">Toplam: ' + para(o.fiyat) + '</div>' : '') +
    (ie.aciklama ? '<p style="white-space:pre-wrap">' + esc(ie.aciklama) + '</p>' : '') +
    '<p>' + [ie.teslimTarihi ? 'Tahmini teslim: <b>' + esc(tamTarih(ie.teslimTarihi)) + '</b>' : '', ie.teklif.gecerlilik ? 'Teklif geçerlilik tarihi: <b>' + esc(tamTarih(ie.teklif.gecerlilik)) + '</b>' : ''].filter(Boolean).join("<br>") + '</p>' +
    (fr.teklifNotu ? '<p style="white-space:pre-wrap">' + esc(fr.teklifNotu) + '</p>' : '') +
    (fr.iban ? '<p>IBAN: <b>' + esc(fr.iban) + '</b> (' + esc(FIRMA) + ')</p>' : '') +
    (fotolar.length ? '<h2>Görseller</h2><div class="b-foto">' + fotolar.map(x => urlOnbellek[x.yol] ? '<img src="' + esc(urlOnbellek[x.yol].url) + '" alt="">' : '').join("") + '</div>' : '') +
    '<div style="display:flex;justify-content:space-between;margin-top:40px"><div>Müşteri onayı<br><br>……………………</div><div style="text-align:right">' + esc(FIRMA) + '<br><br>……………………</div></div>';
  document.body.appendChild(b);
  await Promise.all(Array.from(b.querySelectorAll("img")).map(x => x.complete ? 0 : new Promise(r => { x.onload = x.onerror = r; setTimeout(r, 5000); })));
  const temizle = () => { b.remove(); document.body.classList.remove("teklif-baski"); window.removeEventListener("afterprint", temizle); };
  window.addEventListener("afterprint", temizle);
  document.body.classList.add("teklif-baski");
  window.print();
};

/* ================= FATURALAR ================= */
function ekranFaturalar(){
  const ay = veri.faturalar.filter(f => f.tarih.slice(0, 7) === ayGoster);
  const liste = ay.filter(f => filtre.fatura === "hepsi" || f.tur === filtre.fatura).sort(tarihSira);
  let satis = 0, alis = 0, odenmemis = 0;
  ay.forEach(f => { if(f.tur === "satis") satis += f.toplam; else alis += f.toplam; });
  veri.faturalar.forEach(f => { if(f.tur === "satis") odenmemis += odemeDurumu(f).kalan; });
  const html = '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Bu ay satış faturaları</div><div class="deger t-giris">' + para(satis) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Bu ay alış faturaları</div><div class="deger t-cikis">' + para(alis) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Tahsil edilmemiş satış</div><div class="deger t-borc">' + para(odenmemis) + '</div></div></div>' +
    '<div class="hizli" style="grid-template-columns:1fr 1fr">' + hizliButon("fatura-form/satis", "r-borc", "fatura", "Satış Faturası") + hizliButon("fatura-form/alis", "r-gri", "fatura", "Alış Faturası") + '</div>' +
    '<div class="ust-arac">' + aySecici() + filtreButonlari("fatura", [["hepsi","Hepsi"], ["satis","Satış"], ["alis","Alış"]]) + '</div>' +
    '<div class="kart liste-kart">' + (liste.length ? liste.map(f => faturaSatir(f)).join("") : bos("fatura", "Bu ayda fatura yok.")) + '</div>';
  return {baslik:"Faturalar", html};
}
function kalemHtml(k, i){
  return '<div class="kalem" data-i="' + i + '"><input class="kutu k-ad" maxlength="200" placeholder="Ürün / hizmet adı" value="' + esc(k.ad) + '">' +
    '<div class="kalem-sayilar"><label>Miktar<input class="kutu k-miktar" inputmode="decimal" value="' + sayiYaz(k.miktar) + '"></label>' +
    '<label>Birim fiyat (KDV hariç)<input class="kutu k-fiyat" inputmode="decimal" placeholder="0" value="' + sayiYaz(k.fiyat) + '"></label>' +
    '<label>KDV<select class="kutu k-kdv">' + KDV_ORANLARI.map(o => '<option value="' + o + '"' + (o === k.kdv ? " selected" : "") + '>%' + o + '</option>').join("") + '</select></label>' +
    '<button type="button" class="ikon-buton" data-is="kalemSil" data-arg="' + i + '" aria-label="Kalemi sil">' + ik("x") + '</button></div>' +
    '<div class="kalem-alt">Tutar: <b class="k-tutar" style="margin-left:4px;color:var(--yazi)">' + para(k.miktar * k.fiyat * (1 + k.kdv / 100)) + '</b></div></div>';
}
function faturaHesap(kalemler){
  let ara = 0, kdv = 0;
  kalemler.forEach(k => { const t = k.miktar * k.fiyat; ara += t; kdv += t * k.kdv / 100; });
  return {ara:yuvarla(ara), kdv:yuvarla(kdv), toplam:yuvarla(ara + kdv)};
}
function toplamGuncelle(){
  const h = faturaHesap(form.kalemler);
  document.getElementById("toplamlar").innerHTML = bilgiSatir("Ara toplam", para(h.ara)) + bilgiSatir("KDV", para(h.kdv)) +
    '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Genel toplam</span><b>' + para(h.toplam) + '</b></div>';
  // Tutar değişmediyse düğmeyi yeniden çizme; yoksa tıklama boşa gider.
  const kalan = yuvarla(Math.max(h.toplam - (form.onOdeme || 0), 0));
  const t = document.getElementById("tamamiKutu"), yeni = String(kalan);
  if(t && t.getAttribute("data-son") !== yeni){
    t.setAttribute("data-son", yeni);
    t.innerHTML = kalan > 0 ? '<button type="button" class="secenek" data-is="tutarDoldur" data-arg="' + kalan + '">' + (form.onOdeme ? "Kalanın tamamı: " : "Tamamı: ") + para(kalan) + '</button>' : '';
  }
  const on = document.getElementById("onOdemeBilgi");
  if(on) on.style.display = form.onOdeme > 0 ? "" : "none";
}
// İşe ait, henüz faturaya bağlanmamış tahsilatlar (kapora vb.)
const bagsizTahsilatlar = (ieId, cariId) => ieId ? veri.hareketler.filter(x => x.isEmriId === ieId && x.musteriId === cariId && x.tur === "giris" && !bul("faturalar", x.faturaId)) : [];
function ekranFaturaForm(tur, cariId, ieId){
  const satis = tur !== "alis";
  const ie = bul("is_emirleri", ieId);
  if(ie && !cariId && satis) cariId = ie.musteriId;
  const yil = bugun().slice(0, 4);
  const ilk = satis && ie && ie.tutar && !veri.faturalar.some(f => f.isEmriId === ie.id && f.tur === "satis");
  const h = ilk ? isHesap(ie.kalemler, isTeklif(ie)) : null, kdv = h && KDV_ORANLARI.indexOf(h.kdvOran) >= 0 ? h.kdvOran : varsayilanKdv();
  form = {tur: satis ? "satis" : "alis", odeme:"Nakit", ortak:benimOrtak(), kategori: kategoriler("cikis")[0],
    kalemler:[{ad: satis && ie ? ie.baslik : "", miktar:1, fiyat: h ? h.net : 0, kdv}]};
  // Kalem fiyatlı tekliften: indirim kalemlere oranla dağıtılır, KDV teklifteki orandır.
  if(h && h.kalemli){
    const oran = h.ara ? 1 - h.indirim / h.ara : 1;
    form.kalemler = ie.kalemler.map(k => ({ad: k.ad + (k.olcu ? " (" + k.olcu + ")" : ""), miktar:k.adet, fiyat:yuvarla((k.fiyat || 0) * oran), kdv}));
    // Kuruş yuvarlamasından kalan farkı tek adetli (yoksa son) fiyatlı kaleme ekle; fatura teklif toplamını tutsun.
    const fark = yuvarla(h.net - form.kalemler.reduce((t, k) => t + k.miktar * k.fiyat, 0));
    const hedef = form.kalemler.filter(k => k.fiyat > 0).sort((x, y) => (x.miktar === 1 ? 0 : 1) - (y.miktar === 1 ? 0 : 1))[0];
    if(fark && hedef) hedef.fiyat = yuvarla(hedef.fiyat + fark / hedef.miktar);
  }
  if(!satis && faturaOnDoldur){ form.kalemler = faturaOnDoldur.kalemler.map(k => Object.assign({}, k)); form.kategori = faturaOnDoldur.kategori; form.siparisId = faturaOnDoldur.siparisId; }
  form.onOdeme = satis && ie ? yuvarla(bagsizTahsilatlar(ie.id, cariId).reduce((t, x) => t + x.tutar, 0)) : 0;
  const html = '<div class="kart form-kart">' +
    '<div class="iki-alan"><div><label class="etiket" for="cari" style="margin-top:0">' + (satis ? "Müşteri" : "Tedarikçi") + '</label>' + cariSecici(cariId, true, satis ? "musteri" : "tedarikci") +
      '<div class="alt-bilgi">Listede yoksa: <b data-git="cari-form/-/' + (satis ? "musteri" : "tedarikci") + '" style="cursor:pointer;color:var(--borc)">+ Yeni ' + (satis ? "müşteri" : "tedarikçi") + '</b></div></div>' +
    '<div><label class="etiket" for="isEmri" style="margin-top:0">İş emri <span class="ist">(isteğe bağlı)</span></label><select id="isEmri" class="kutu">' + isSecenekleri(satis ? cariId : null, ieId) + '</select></div></div>' +
    (satis ? '' : '<label class="etiket">Ne alındı? (gider türü)</label>' + secenekler("kategori", kategoriler("cikis"), form.kategori)) +
    '<div class="iki-alan"><div><label class="etiket" for="no">Fatura no' + (satis ? '' : ' <span class="ist">(tedarikçinin)</span>') + '</label><input id="no" class="kutu" maxlength="40" value="' +
      (satis ? siradakiNo(sistem().satisOnEk + yil + "-", veri.faturalar) : "") + '" placeholder="' + (satis ? "" : "Boşsa otomatik verilir") + '"></div>' +
    '<div class="iki-alan" style="gap:0 8px"><div>' + tarihAlani("tarih", "Tarih", bugun()) + '</div><div>' + tarihAlani("vade", "Vade", "") + '</div></div></div>' +
    '<div class="form-bolum">Kalemler</div><div id="kalemler">' + form.kalemler.map(kalemHtml).join("") + '</div>' +
    '<button type="button" class="buton ikincil kucuk" style="margin-top:10px" data-is="kalemEkle">' + ik("arti") + 'Kalem ekle</button>' +
    '<div class="toplamlar" id="toplamlar"></div>' +
    '<label class="etiket" for="aciklama">Açıklama <span class="ist">(isteğe bağlı)</span></label><input id="aciklama" class="kutu" maxlength="300" value="' + esc(!satis && faturaOnDoldur ? faturaOnDoldur.aciklama : "") + '">' +
    '<div class="form-bolum">' + (satis ? "Şimdi tahsil edilen" : "Şimdi ödenen") + '</div>' +
    (form.onOdeme > 0 ? '<div class="bilgi-kutu" id="onOdemeBilgi">Bu iş için daha önce alınan <b>' + para(form.onOdeme) + '</b> (kapora vb.) bu faturaya sayılacak.</div>' : '') +
    '<label class="etiket" for="odenen">Tutar <span class="ist">(veresiye ise boş bırakın)</span></label><input id="odenen" class="kutu" inputmode="decimal" placeholder="0 ₺">' +
    '<div class="secenekler" id="tamamiKutu" style="margin-top:8px"></div>' +
    '<label class="etiket">Ödeme şekli</label>' + secenekler("odeme", ODEME, "Nakit") + ortakSecici(form.ortak, satis) +
    '<div class="hata" id="hata"></div><button class="buton" style="background:var(--' + (satis ? "borc" : "cikis") + ')" data-is="faturaKaydet">' + ik("tamam") + 'Faturayı kaydet</button></div>';
  return {baslik: satis ? "Satış faturası" : "Alış faturası", geri:true, html, sonra(){
    secenekBagla(); if(satis) cariIsBagla();
    const kap = document.getElementById("kalemler");
    const oku = e => {
      const d = e.target.closest(".kalem"); if(!d) return;
      const k = form.kalemler[Number(d.getAttribute("data-i"))];
      k.ad = d.querySelector(".k-ad").value; k.miktar = sayiOku(d.querySelector(".k-miktar").value) || 0;
      k.fiyat = sayiOku(d.querySelector(".k-fiyat").value) || 0; k.kdv = Number(d.querySelector(".k-kdv").value);
      d.querySelector(".k-tutar").textContent = para(k.miktar * k.fiyat * (1 + k.kdv / 100));
      toplamGuncelle();
    };
    kap.addEventListener("input", oku); kap.addEventListener("change", oku);
    toplamGuncelle();
  }};
}
EYLEM.kalemEkle = () => { form.kalemler.push({ad:"", miktar:1, fiyat:0, kdv:varsayilanKdv()}); kalemleriCiz(); };
EYLEM.kalemSil = (el, i) => { if(form.kalemler.length > 1){ form.kalemler.splice(Number(i), 1); kalemleriCiz(); } };
function kalemleriCiz(){
  document.getElementById("kalemler").innerHTML = form.kalemler.map(kalemHtml).join(""); toplamGuncelle();
  const s = document.querySelectorAll(".k-ad"); if(s.length) s[s.length - 1].focus();
}
EYLEM.faturaKaydet = btn => {
  const cari = deger("cari");
  if(!cari) return hataYaz("Lütfen " + (form.tur === "satis" ? "müşteriyi" : "tedarikçiyi") + " seçin.");
  const kalemler = form.kalemler.filter(k => k.ad.trim() || k.fiyat).map(k => ({ad:k.ad.trim(), miktar:yuvarla(k.miktar), fiyat:yuvarla(k.fiyat), kdv:k.kdv}));
  if(!kalemler.length) return hataYaz("En az bir kalem girin.");
  if(kalemler.some(k => !k.ad || !(k.miktar > 0) || !(k.fiyat > 0))) return hataYaz("Her kalemin adı, miktarı ve fiyatı dolu olmalı.");
  const h = faturaHesap(kalemler);
  const odenenYazi = deger("odenen"), odenen = odenenYazi ? sayiOku(odenenYazi) : 0;
  const onceki = form.tur === "satis" ? bagsizTahsilatlar(deger("isEmri"), cari) : [];
  const oncekiToplam = onceki.reduce((t, x) => t + x.tutar, 0);
  if(!(odenen >= 0) || odenen + oncekiToplam > h.toplam + 0.001) return hataYaz("Ödenen tutar faturanın kalanından büyük olamaz.");
  const yil = (deger("tarih") || bugun()).slice(0, 4);
  const no = deger("no") || siradakiNo((form.tur === "satis" ? sistem().satisOnEk : sistem().alisOnEk) + yil + "-", veri.faturalar);
  if(form.tur === "satis" && veri.faturalar.some(f => f.tur === "satis" && f.no === no)) return hataYaz("Bu fatura numarası zaten kullanılmış.");
  const f = {id:yeniId(), no, tur:form.tur, musteriId:cari, isEmriId:deger("isEmri") || null, kategori: form.tur === "satis" ? "Satış" : form.kategori,
    tarih:deger("tarih") || bugun(), vade:deger("vade") || null, kalemler, araToplam:h.ara, kdvToplam:h.kdv, toplam:h.toplam, aciklama:deger("aciklama"), olusma:Date.now()};
  islem(btn, async () => {
    await Depo.kaydet("faturalar", f);
    if(onceki.length) await Depo.kaydet("hareketler", onceki.map(x => Object.assign({}, x, {faturaId:f.id})));
    if(odenen > 0) await Depo.kaydet("hareketler", {id:yeniId(), tur: f.tur === "satis" ? "giris" : "cikis", tutar:yuvarla(odenen),
      kategori: f.tur === "satis" ? "Cari Tahsilat" : f.kategori, odeme:form.odeme, musteriId:cari, isEmriId:f.isEmriId, faturaId:f.id,
      aciklama:"Fatura " + no, tarih:f.tarih, olusma:Date.now(), ortak:form.ortak || "", hedef:""});
    const sp = form.siparisId && bul("siparisler", form.siparisId);
    if(sp) await Depo.kaydet("siparisler", Object.assign({}, sp, {faturaId:f.id}));
    faturaOnDoldur = null;
    bildir("Fatura kaydedildi: " + no);
    history.replaceState(null, "", "#fatura/" + f.id); ciz();
  });
};
function ekranFatura(id){
  const f = bul("faturalar", id);
  if(!f) return {baslik:"Fatura", geri:true, html:'<div class="kart">' + bos("fatura", "Fatura bulunamadı.") + '</div>'};
  const m = bul("musteriler", f.musteriId) || {}, ie = bul("is_emirleri", f.isEmriId), od = odemeDurumu(f), satis = f.tur === "satis";
  const odemeler = veri.hareketler.filter(h => h.faturaId === id).sort(tarihSira);
  const html = '<div class="kart" style="max-width:820px">' +
    '<div class="fatura-ust"><div><img src="logo.png" alt="Güneş Mobilya" style="height:42px;display:block;margin-bottom:4px">' +
      (firma().adres || firma().telefon ? '<div class="alt-bilgi" style="margin:0 0 8px">' + esc([firma().adres, firma().telefon].filter(Boolean).join(" · ")) + '</div>' : '') +
      '<h2>' + (satis ? "SATIŞ FATURASI" : "ALIŞ FATURASI") + '</h2><div class="alt-bilgi">No: <b>' + esc(f.no) + '</b></div></div>' +
      '<div style="text-align:right"><div class="alt-bilgi">Tarih: <b>' + tamTarih(f.tarih) + '</b></div>' + (f.vade ? '<div class="alt-bilgi">Vade: <b>' + tamTarih(f.vade) + '</b></div>' : '') +
      '<div style="margin-top:8px"><span class="etiket-rozet ' + od.sinif + '">' + od.yazi + '</span></div></div></div>' +
    '<div style="margin-bottom:10px"><div class="alt-bilgi" style="margin:0">' + (satis ? "Sayın" : "Tedarikçi") + '</div>' +
      '<div style="font-weight:600"><button class="baglanti" style="text-align:left;color:inherit;font-weight:600" data-git="cari/' + f.musteriId + '">' + esc(m.ad || "") + '</button></div>' +
      (m.adres ? '<div class="alt-bilgi" style="margin:0;white-space:pre-wrap">' + esc(m.adres) + '</div>' : '') +
      (m.vergiNo ? '<div class="alt-bilgi" style="margin:0">Vergi/TC: ' + esc(m.vergiNo) + '</div>' : '') +
      (ie ? '<div class="alt-bilgi">İş emri: <button class="baglanti" data-git="is/' + ie.id + '">' + esc(ie.no + " · " + ie.baslik) + '</button></div>' : '') + '</div>' +
    '<div style="overflow-x:auto"><table class="fatura-tablo"><thead><tr><th>Ürün / hizmet</th><th class="s">Miktar</th><th class="s">Birim fiyat</th><th class="s">KDV</th><th class="s">Tutar</th></tr></thead><tbody>' +
      f.kalemler.map(k => '<tr><td>' + esc(k.ad) + '</td><td class="s">' + sayiYaz(k.miktar) + '</td><td class="s">' + para(k.fiyat) + '</td><td class="s">%' + k.kdv + '</td><td class="s">' + para(k.miktar * k.fiyat) + '</td></tr>').join("") +
    '</tbody></table></div>' +
    '<div class="toplamlar fatura-toplam">' + bilgiSatir("Ara toplam", para(f.araToplam)) + bilgiSatir("KDV", para(f.kdvToplam)) +
      '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Genel toplam</span><b>' + para(f.toplam) + '</b></div>' +
      bilgiSatir(satis ? "Tahsil edilen" : "Ödenen", para(f.toplam - od.kalan)) + bilgiSatir("Kalan", '<span class="' + (od.kalan ? "t-cikis" : "t-giris") + '">' + para(od.kalan) + '</span>') + '</div>' +
    (f.aciklama ? '<div class="alt-bilgi" style="margin-top:12px">Açıklama: ' + esc(f.aciklama) + '</div>' : '') +
    (!satis && f.kategori ? '<div class="alt-bilgi">Gider türü: ' + esc(f.kategori) + '</div>' : '') + '</div>' +
    '<div class="yazdirma" style="max-width:820px">' +
    '<div class="buton-sira">' + (od.kalan > 0 ? '<button class="buton" style="background:var(--' + (satis ? "giris" : "cikis") + ')" data-git="' + (satis ? "giris" : "cikis") + '/' + f.musteriId + '/' + (f.isEmriId || "-") + '/' + f.id + '">' +
      ik(satis ? "asagi" : "yukari") + (satis ? "Tahsilat al" : "Ödeme yap") + '</button>' : '') +
      '<button class="buton ikincil" onclick="window.print()">' + ik("yazdir") + 'Yazdır</button><button class="buton wa-buton" data-is="waFatura" data-arg="' + id + '">' + ik("mesaj") + 'WhatsApp</button></div>' +
    (satis ? '<button class="buton ikincil" data-is="eFatura" data-arg="' + id + '">' + ik("bulut") + 'e-Fatura / e-Arşiv XML</button>' : '') +
    (f.vade && od.kalan > 0 ? '<button class="buton ikincil" data-is="takvimFatura" data-arg="' + id + '">' + ik("takvim") + 'Vadeyi telefon takvimine ekle</button>' : '') +
    (satis ? taksitKarti(f) : '') +
    (odemeler.length ? bolum("Bu faturanın ödemeleri") + '<div class="kart liste-kart">' + odemeler.map(h => hareketSatir(h, true)).join("") + '</div>' : '') +
    '<div class="alt-bilgi" style="margin:12px 2px">Bu belge işletme içi kayıttır; resmî e-Fatura/e-Arşiv yerine geçmez.</div>' +
    '<button class="buton tehlike" data-is="faturaSil" data-arg="' + id + '">' + ik("sil") + 'Faturayı sil</button></div>';
  return {baslik:(satis ? "Satış" : "Alış") + " faturası " + f.no, geri:true, html, baskiLogo:false};
}
/* --- Taksit planı --- */
const taksitAdi = t => t.sira ? t.sira + ". taksit" : "Peşinat";
// Faturaya yapılan ödemeler taksitlere vade sırasıyla dağıtılır; her taksidin kalanı buradan çıkar.
function taksitDurumu(f){
  const l = veri.taksitler.filter(t => t.faturaId === f.id).sort((a, b) => a.sira - b.sira);
  let odenen = faturaOdenen(f.id);
  return l.map(t => { const o = Math.min(t.tutar, Math.max(odenen, 0)); odenen = yuvarla(odenen - o); return Object.assign({}, t, {odenen:o, kalan:yuvarla(t.tutar - o)}); });
}
function taksitKarti(f){
  if(eksikTablo.taksitler) return '';
  const l = taksitDurumu(f), od = odemeDurumu(f), bg = bugun();
  if(!l.length) return od.kalan > 0 ? '<div class="kart yazdirma"><div class="kart-baslik">Taksit planı</div><div class="alt-bilgi" style="margin:0">Kalan ' + para(od.kalan) + ' taksitlere bölünebilir; vadesi gelen taksitler “Yapılacaklar”da görünür.</div>' +
    '<button class="buton ikincil" data-is="taksitlendir" data-arg="' + f.id + '">' + ik("takvim") + 'Taksitlendir</button></div>' : '';
  return '<div class="kart yazdirma"><div class="kart-baslik"><span>Taksit planı (' + l.filter(t => t.sira).length + ' taksit)</span><span>' + l.filter(t => t.sira && !t.kalan).length + ' ödendi</span></div>' + l.map(t => {
    const durum = !t.kalan ? ["Ödendi", "d-yesil"] : t.vade < bg ? ["Gecikti", "d-kirmizi"] : t.odenen ? ["Kısmen", "d-sari"] : ["Bekliyor", "d-gri"];
    return '<div class="bilgi-satir"><span>' + taksitAdi(t) + ' · ' + tamTarih(t.vade) + '</span><b>' + para(t.tutar) + ' <span class="etiket-rozet ' + durum[1] + '">' + durum[0] + (t.kalan && t.odenen ? ' · kalan ' + para(t.kalan) : '') + '</span></b></div>';
  }).join("") +
    '<div class="buton-sira" style="margin-top:12px"><button class="buton ikincil" data-is="taksitYazdir" data-arg="' + f.id + '">' + ik("yazdir") + 'Planı yazdır</button>' +
    '<button class="buton ikincil" data-is="taksitTakvim" data-arg="' + f.id + '">' + ik("takvim") + 'Takvime ekle</button>' +
    '<button class="buton tehlike" data-is="taksitSil" data-arg="' + f.id + '">' + ik("sil") + 'Planı sil</button></div></div>';
}
const ayEkle = (t, n) => { const d = tarihOku(t), gun = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(gun, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return tarihStr(d); };
EYLEM.taksitlendir = (el, id) => {
  const f = bul("faturalar", id); if(!f) return;
  const kalan = odemeDurumu(f).kalan, p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:420px"><p>Taksitlendir</p><div class="alt-bilgi">Kalan tutar: <b>' + para(kalan) + '</b></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="tkSayi">Taksit sayısı</label><input id="tkSayi" class="kutu" inputmode="numeric" value="3"></div>' +
    '<div><label class="etiket" for="tkAralik">Aralık</label><select id="tkAralik" class="kutu"><option value="ay">Her ay</option><option value="hafta">Her hafta</option><option value="15">15 günde bir</option></select></div></div>' +
    tarihAlani("tkIlk", "İlk taksit tarihi", ayEkle(bugun(), 1)) + '<div class="alt-bilgi" id="tkOzet"></div>' +
    '<div class="hata" id="tkHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Oluştur</button></div></div>';
  const plan = () => {
    const n = Math.round(sayiOku(p.querySelector("#tkSayi").value)), ilk = p.querySelector("#tkIlk").value, ar = p.querySelector("#tkAralik").value;
    if(!(n >= 1 && n <= 60) || !ilk) return null;
    const parca = Math.floor(kalan / n * 100) / 100, odenen = faturaOdenen(f.id);
    // Daha önce alınan tutar "Peşinat" satırı (sıra 0) olur ki ödemeler taksitlere doğru dağıtılsın; son taksit kuruş farkını alır.
    const l = Array.from({length:n}, (_, i) => ({id:yeniId(), faturaId:f.id, sira:i + 1, vade: ar === "ay" ? ayEkle(ilk, i) : gunEkle(ilk, i * (ar === "hafta" ? 7 : 15)),
      tutar: yuvarla(i === n - 1 ? kalan - parca * (n - 1) : parca), olusma:Date.now() + i + 1}));
    if(odenen > 0) l.unshift({id:yeniId(), faturaId:f.id, sira:0, vade:bugun(), tutar:yuvarla(odenen), olusma:Date.now()});
    return l;
  };
  const ozet = () => { const l = plan(), n = l ? l.filter(t => t.sira).length : 0; p.querySelector("#tkOzet").textContent = l ? n + " taksit × yaklaşık " + para(kalan / n) + " · son taksit " + tamTarih(l[l.length - 1].vade) : ""; };
  p.addEventListener("input", ozet); p.addEventListener("change", ozet);
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const l = plan(); if(!l){ p.querySelector("#tkHata").textContent = "Taksit sayısı 1–60 arası olmalı ve ilk tarih seçilmeli."; return; }
    b.disabled = true;
    Depo.kaydet("taksitler", l).then(() => { p.remove(); bildir(l.filter(t => t.sira).length + " taksit oluşturuldu"); ciz(); }).catch(err => { b.disabled = false; p.querySelector("#tkHata").textContent = hataMesaji(err); });
  });
  document.body.appendChild(p); ozet();
};
EYLEM.taksitSil = (el, id) => onayla("Taksit planı silinsin mi?", "Ödemeler silinmez; sadece plan kalkar.", "Sil", () => islem(null, async () => {
  const f = bul("faturalar", id);
  await copGrubuyla("Taksit planı: " + (f ? f.no + " · " + cariAdi(f.musteriId) : ""), async () => { for(const t of veri.taksitler.filter(x => x.faturaId === id)) await Depo.sil("taksitler", t.id); });
  bildir("Plan silindi"); ciz();
}));
EYLEM.taksitTakvim = (el, id) => {
  const f = bul("faturalar", id); if(!f) return;
  const l = taksitDurumu(f).filter(t => t.kalan > 0); if(!l.length) return bildir("Ödenmemiş taksit yok");
  takvimIndirCok(l.map(t => ({baslik:taksitAdi(t) + ": " + cariAdi(f.musteriId) + " " + para(t.kalan), tarih:t.vade, aciklama:"Fatura " + f.no})), "taksitler-" + f.no);
};
EYLEM.taksitYazdir = (el, id) => {
  const f = bul("faturalar", id); if(!f) return;
  const m = bul("musteriler", f.musteriId) || {}, fr = firma(), l = taksitDurumu(f);
  baskiYap('<div class="b-ust"><div><img src="logo.png" alt="' + esc(FIRMA) + '" style="height:46px;display:block;margin-bottom:6px"><div>' + esc([fr.adres, fr.telefon].filter(Boolean).join(" · ")) + '</div></div>' +
    '<div style="text-align:right"><b style="font-size:16px">TAKSİT PLANI</b><br>Fatura: <b>' + esc(f.no) + '</b><br>Tarih: ' + tamTarih(bugun()) + '</div></div>' +
    '<div>Sayın <b>' + esc(m.ad || "") + '</b>' + (m.telefon ? ' · ' + esc(m.telefon) : '') + (m.adres ? '<br>' + esc(m.adres) : '') + '</div>' +
    '<p>Fatura toplamı <b>' + para(f.toplam) + '</b> aşağıdaki plana göre ödenecektir.</p>' +
    '<table><tr><th>Taksit</th><th>Vade</th><th style="text-align:right">Tutar</th><th>Durum</th></tr>' + l.map(t => '<tr><td>' + taksitAdi(t) + '</td><td>' + tamTarih(t.vade) + '</td><td style="text-align:right">' + para(t.tutar) + '</td><td>' +
      (!t.kalan ? 'Ödendi' : t.odenen ? 'Kalan ' + para(t.kalan) : '') + '</td></tr>').join("") + '</table>' +
    (fr.iban ? '<p>IBAN: <b>' + esc(fr.iban) + '</b> (' + esc(FIRMA) + ')</p>' : '') +
    '<div style="display:flex;justify-content:space-between;margin-top:48px"><div>Borçlu (ad, imza)<br><br>……………………</div><div style="text-align:right">' + esc(FIRMA) + '<br><br>……………………</div></div>');
};
// Bir belgeyi sayfanın geri kalanı olmadan yazdırır (taksit planı vb.).
async function baskiYap(icerik){
  document.querySelectorAll(".baski").forEach(x => x.remove());
  const b = document.createElement("div"); b.className = "baski"; b.innerHTML = icerik;
  document.body.appendChild(b);
  await Promise.all(Array.from(b.querySelectorAll("img")).map(x => x.complete ? 0 : new Promise(r => { x.onload = x.onerror = r; setTimeout(r, 5000); })));
  const temizle = () => { b.remove(); document.body.classList.remove("teklif-baski"); window.removeEventListener("afterprint", temizle); };
  window.addEventListener("afterprint", temizle);
  document.body.classList.add("teklif-baski");
  window.print();
}
EYLEM.faturaSil = (el, id) => {
  const n = veri.hareketler.filter(h => h.faturaId === id).length;
  onayla("Fatura silinsin mi?", (n ? "Bu faturaya bağlı " + n + " ödeme kaydı silinmez, carinin hesabında kalır. " : "") + "Fatura çöp kutusuna taşınır.", "Sil",
    () => islem(null, async () => {
      await Depo.sil("faturalar", id);
      bildir("Fatura çöp kutusuna taşındı"); geri();
    }));
};
