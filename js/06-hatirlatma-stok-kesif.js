"use strict";
// Güneş Mobilya — hatirlatma stok kesif
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= HATIRLATMALAR ================= */
// Ana sayfadaki "Yapılacaklar". seviye: 0 acil (kırmızı), 1 yaklaşan (sarı), 2 bilgi.
function hatirlatmalar(){
  const bg = bugun(), l = [], ss = sistem();
  const gunFark = t => Math.round((tarihOku(t) - tarihOku(bg)) / 86400000);
  const ne = t => { const g = gunFark(t); return g < 0 ? -g + " gün gecikti" : g === 0 ? "bugün" : g === 1 ? "yarın" : g + " gün sonra"; };
  veri.is_emirleri.forEach(ie => {
    const m = cariAdi(ie.musteriId);
    if(ac(ie) && ie.durum !== "Teklif" && ie.teslimTarihi && ie.teslimTarihi <= gunEkle(bg, ss.teslimGun))
      l.push({seviye: ie.teslimTarihi <= bg ? 0 : 1, tarih:ie.teslimTarihi, ikon:"is", yer:"is/" + ie.id,
        yazi:"Teslim " + ne(ie.teslimTarihi) + ": " + ie.no + " " + ie.baslik, alt:[m, ie.durum].filter(Boolean).join(" · ")});
    const g = ie.durum === "Teklif" && ie.teklif && ie.teklif.gecerlilik;
    if(g && g <= gunEkle(bg, ss.teklifGun) && g >= gunEkle(bg, -14))
      l.push({seviye: g < bg ? 1 : 2, tarih:g, ikon:"fatura", yer:"is/" + ie.id, yazi:(g < bg ? "Teklif süresi geçti: " : "Teklif süresi doluyor (" + ne(g) + "): ") + ie.baslik,
        alt:m + " · müşteriyi arayın"});
  });
  veri.faturalar.forEach(f => {
    const tk = taksitDurumu(f);
    if(tk.length){
      tk.filter(t => t.kalan > 0 && t.vade <= gunEkle(bg, ss.vadeGun)).forEach(t => l.push({seviye: t.vade <= bg ? 0 : 1, tarih:t.vade, ikon:"asagi", yer:"fatura/" + f.id,
        yazi:taksitAdi(t) + " " + ne(t.vade) + ": " + para(t.kalan), alt:cariAdi(f.musteriId) + " · " + f.no}));
      return;
    }
    if(!f.vade || f.vade > gunEkle(bg, ss.vadeGun)) return;
    const od = odemeDurumu(f); if(!(od.kalan > 0)) return;
    l.push({seviye: f.vade <= bg ? 0 : 1, tarih:f.vade, ikon: f.tur === "satis" ? "asagi" : "yukari", yer:"fatura/" + f.id,
      yazi:(f.tur === "satis" ? "Tahsilat " : "Ödeme ") + ne(f.vade) + ": " + para(od.kalan), alt:cariAdi(f.musteriId) + " · " + f.no});
  });
  randevular().filter(x => !x.r.tamam && x.ie.durum !== "İptal" && x.r.tarih >= bg && x.r.tarih <= gunEkle(bg, 14)).forEach(x => {
    const c = cakisanlar(x.r);
    if(c.length && x.r.id < c[0].r.id) l.push({seviye:0, tarih:x.r.tarih, ikon:"takvim", yer:"takvim/" + haftaBasi(x.r.tarih), yazi:"Randevu çakışması " + ne(x.r.tarih) + ": " + x.ie.no + " ile " + c[0].ie.no,
      alt:"Aynı ekip aynı saatte iki yerde"});
    if(yetki.yonetici && !x.r.hatirlatildi && x.r.tarih <= gunEkle(bg, takvimAyar().hatirlatGun) && x.r.tur !== "Ölçü / keşif") l.push({seviye:1, tarih:x.r.tarih, ikon:"mesaj", yer:"takvim/" + haftaBasi(x.r.tarih),
      yazi:x.r.tur + " " + ne(x.r.tarih) + " " + (x.r.saat || "") + ": müşteriye hatırlatma gönderin", alt:x.ie.no + " " + x.ie.baslik + " · " + cariAdi(x.ie.musteriId)});
  });
  if(yetki.yonetici) veri.cekler.filter(c => cekAcik(c) && c.vade && c.vade <= gunEkle(bg, ss.vadeGun)).forEach(c => l.push({seviye: c.vade <= bg ? 0 : 1, tarih:c.vade, ikon:c.tur === "alinan" ? "asagi" : "yukari", yer:"cekler/" + c.id,
    yazi:(c.tur === "alinan" ? (c.durum === "tahsilde" ? "Tahsildeki " : "Tahsile verin: ") : "Ödenecek ") + belgeAdi(c).toLocaleLowerCase("tr") + " " + ne(c.vade) + ": " + para(c.tutar), alt:(cariAdi(c.musteriId) || c.kesideci) + (c.banka ? " · " + c.banka : "")}));
  if(yetki.yonetici) aracUyarilari().forEach(x => l.push(x));
  sabitHatirlatmalari().forEach(x => l.push(x));
  stokAzalanlar().forEach(m => l.push({seviye:1, tarih:bg, ikon:"koli", yer:"siparisler", yazi:"Stok azaldı: " + m.ad, alt:"Kalan " + miktarYaz(stokMiktar(m.id)) + " " + m.birim + " · asgari " + miktarYaz(m.min)}));
  if(!personelEksik()){
    const aktif = veri.personel.filter(p => calisiyor(p, bg));
    const eksik = aktif.filter(p => !veri.puantaj.some(x => x.personelId === p.id && x.tarih === bg)).length;
    if(eksik && new Date().getHours() >= 10) l.push({seviye:1, tarih:bg, ikon:"tamam", yer:"puantaj", yazi:"Bugünün puantajı girilmedi (" + eksik + " kişi)", alt:"Personel → Puantaj"});
    const ay = bg.slice(0, 7), sonGun = ay + "-" + ayGunSayisi(ay);
    if(gunFark(sonGun) <= 2){
      const odenmedi = aktif.filter(p => p.ucretTipi === "aylik" && !veri.personel_hareket.some(h => h.personelId === p.id && h.tur === "hakedis" && h.donem === ay));
      if(odenmedi.length) l.push({seviye:2, tarih:sonGun, ikon:"kasa", yer:"maas/ay", yazi:"Maaş zamanı: " + odenmedi.length + " kişinin bu ay hakedişi kaydedilmedi", alt:odenmedi.map(p => p.ad).join(", ")});
    }
  }
  const ha = bildirimAyar().hatirlatma;   // Ayarlar → Bildirimler'de kapatılan türler
  return l.filter(h => ha[hatirlatmaTuru(h)] !== false).sort((a, b) => a.seviye - b.seviye || (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
}
const HATIRLATMA_RENK = ["r-cikis", "r-ana", "r-borc"];
const hatirlatmaSatir = h => '<button class="satir" data-git="' + h.yer + '"><span class="rozet ' + HATIRLATMA_RENK[h.seviye] + '">' + ik(h.ikon) + '</span>' +
  '<span class="orta"><div class="s1"' + (h.seviye === 0 ? ' style="color:#b91c1c"' : '') + '>' + esc(h.yazi) + '</div><div class="s2">' + esc(h.alt || "") + '</div></span>' + ik("sag") + '</button>';
function ekranHatirlatmalar(){
  const l = hatirlatmalar(), izin = window.Notification ? Notification.permission : "yok";
  const html = (izin === "default" ? '<div class="uyari">Uygulamayı açtığınızda acil işler için telefon bildirimi almak ister misiniz? <b data-is="bildirimIzni" style="cursor:pointer;text-decoration:underline">Bildirimlere izin ver</b></div>' : '') +
    '<div class="kart liste-kart">' + (l.length ? l.map(hatirlatmaSatir).join("") : bos("zil", "Şu an yapılacak bir şey yok.")) + '</div>' +
    '<div class="alt-bilgi" style="margin:12px 2px">Uygulama kapalıyken hatırlatma için iş emri ve fatura sayfalarındaki “telefon takvimine ekle” düğmesini kullanın; telefonunuz bir gün önceden hatırlatır.</div>';
  return {baslik:"Yapılacaklar", geri:true, html};
}
EYLEM.bildirimIzni = () => {
  if(!window.Notification) return uyar("Bu tarayıcı bildirim desteklemiyor", "Telefonda uygulamayı “Ana ekrana ekle” ile açmayı deneyin.");
  Notification.requestPermission().then(r => { if(r === "granted"){ ayarYaz("sonBildirim", ""); bildirimGonder(); bildir("Bildirimler açıldı"); } ciz(); });
};
// Gün içinde ilk açılışta acil işler için tek bir özet bildirim.
function bildirimGonder(){
  try{
    if(!window.Notification || Notification.permission !== "granted" || ayarOku("sonBildirim") === bugun() || !bildirimAyar().gunlukOzet || sessizMi()) return;
    const acil = hatirlatmalar().filter(h => h.seviye === 0); if(!acil.length) return;
    ayarYaz("sonBildirim", bugun());
    const n = new Notification(FIRMA + ": " + acil.length + " acil iş", {body:acil.slice(0, 3).map(h => h.yazi).join("\n"), icon:"ikon-192.png", tag:"gunes-hatirlatma"});
    n.onclick = () => { window.focus(); git("hatirlatmalar"); n.close(); };
  }catch(e){}
}
// Telefon takvimine eklenecek .ics dosyası: tüm gün etkinlik, bir gün önce saat 09:00'da hatırlatma.
function takvimIndir(baslik, tarih, aciklama, dosya){ takvimIndirCok([{baslik, tarih, aciklama}], dosya); }
function takvimIndirCok(olaylar, dosya){
  const kac = s => String(s || "").replace(/[\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const damga = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gunes Mobilya//TR", "CALSCALE:GREGORIAN"].concat(...olaylar.map(o => ["BEGIN:VEVENT",
    "UID:" + yeniId() + "@gunesmobilya", "DTSTAMP:" + damga, "DTSTART;VALUE=DATE:" + o.tarih.replace(/-/g, ""), "DTEND;VALUE=DATE:" + gunEkle(o.tarih, 1).replace(/-/g, ""),
    "SUMMARY:" + kac(o.baslik), "DESCRIPTION:" + kac(o.aciklama), "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + kac(o.baslik), "TRIGGER:-PT15H", "END:VALARM",
    "END:VEVENT"]), ["END:VCALENDAR"]).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], {type:"text/calendar;charset=utf-8"}));
  a.download = guvenliAd(dosya) + ".ics"; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  bildir("Takvim dosyası indirildi; açıp takvime ekleyin");
}
EYLEM.takvimIs = (el, id) => {
  const ie = bul("is_emirleri", id); if(!ie || !ie.teslimTarihi) return;
  const m = bul("musteriler", ie.musteriId) || {};
  takvimIndir("Teslim: " + ie.no + " " + ie.baslik, ie.teslimTarihi, [m.ad, m.telefon, ie.adres].filter(Boolean).join("\n"), "teslim-" + ie.no);
};
EYLEM.takvimFatura = (el, id) => {
  const f = bul("faturalar", id); if(!f || !f.vade) return;
  takvimIndir((f.tur === "satis" ? "Tahsilat: " : "Ödeme: ") + cariAdi(f.musteriId) + " " + para(odemeDurumu(f).kalan), f.vade, "Fatura " + f.no, "vade-" + f.no);
};

/* ================= MALZEME FİYAT LİSTESİ & HESAPLAMA ================= */
// Liste "ayarlar" tablosunda "malzemeler" anahtarıyla durur. Fiyatlar maliyettir (KDV hariç).
let BIRIMLER = ["m²", "mtül", "adet", "plaka", "takım", "kg", "lt"];
const bosMalzeme = () => ({id:yeniId(), ad:"", birim:"m²", fiyat:0, min:0});
function malzemeListesi(){
  const a = veri.ayarlar.find(x => x.anahtar === "malzemeler");
  return a && Array.isArray(a.deger) ? a.deger : [];
}
function malzemeSatir(m, i){
  return '<div class="kalem" data-i="' + i + '"><div class="ikalem-alan alan-4">' +
    '<label>Malzeme<input class="kutu m-ad" maxlength="80" placeholder="Örn: 18 mm beyaz MDF lam" value="' + esc(m.ad) + '"></label>' +
    '<label>Birim<select class="kutu m-birim">' + BIRIMLER.map(b => '<option' + (b === m.birim ? ' selected' : '') + '>' + b + '</option>').join("") + '</select></label>' +
    '<label>Birim maliyet<input class="kutu m-fiyat" inputmode="decimal" placeholder="0 ₺" value="' + sayiYaz(m.fiyat) + '"></label>' +
    '<label>Asgari stok<input class="kutu m-min" inputmode="decimal" placeholder="—" value="' + sayiYaz(m.min) + '"></label>' +
    '<button type="button" class="ikon-buton" data-is="malzemeSil" data-arg="' + i + '" aria-label="Sil">' + ik("x") + '</button></div>' +
    '<div class="ikalem-alan alan-2" style="margin-top:8px"><label>Tedarikçi<select class="kutu m-ted"><option value="">—</option>' +
      veri.musteriler.filter(c => c.tip === "tedarikci").sort((a, b) => a.ad.localeCompare(b.ad, "tr")).map(c => '<option value="' + c.id + '"' + (c.id === m.tedarikciId ? ' selected' : '') + '>' + esc(c.ad) + '</option>').join("") + '</select></label>' +
    (m.birim === "plaka" ? '<label>Plaka ölçüsü (mm, en × boy)<input class="kutu m-olcu" placeholder="2100x2800" value="' + (m.en && m.boy ? m.en + "x" + m.boy : "") + '"></label>' : '<span></span>') + '</div></div>';
}
const malzemeleriCiz = () => { document.getElementById("mListe").innerHTML = form.malzemeler.map(malzemeSatir).join(""); };
function ekranMalzemeler(){
  form = {malzemeler: malzemeListesi().map(x => Object.assign({}, x))};
  if(!form.malzemeler.length) form.malzemeler.push(bosMalzeme());
  const html = '<div class="kart form-kart"><div class="alt-bilgi" style="margin:0">Stok bu listedeki malzemelerle tutulur; <b>asgari stok</b> yazarsanız altına düşünce uyarılırsınız (<b data-git="stok" style="cursor:pointer;color:var(--borc)">Stok sayfası</b>). Malzemelerin alış / maliyet fiyatlarını (KDV hariç) yazın. Teklif hazırlarken kalemdeki <b>Malzemeden hesapla</b> bu listeyi kullanır; kâr oranı Ayarlar\'daki varsayılandan gelir.</div>' +
    '<div id="mListe">' + form.malzemeler.map(malzemeSatir).join("") + '</div>' +
    '<button type="button" class="buton ikincil kucuk" style="margin-top:10px" data-is="malzemeEkle">' + ik("arti") + 'Malzeme ekle</button>' +
    '<div class="hata" id="hata"></div><button class="buton" data-is="malzemeKaydet">' + ik("tamam") + 'Kaydet</button></div>';
  return {baslik:"Malzeme fiyat listesi", geri:true, html, sonra(){
    document.getElementById("mListe").addEventListener("input", e => {
      const d = e.target.closest(".kalem"); if(!d) return;
      const m = form.malzemeler[Number(d.getAttribute("data-i"))];
      m.ad = d.querySelector(".m-ad").value; m.birim = d.querySelector(".m-birim").value; m.fiyat = sayiOku(d.querySelector(".m-fiyat").value) || 0;
      m.min = Math.max(0, sayiOku(d.querySelector(".m-min").value) || 0);
      const o = d.querySelector(".m-olcu"); if(o){ const x = /(\d{3,4})\s*[x×*]\s*(\d{3,4})/i.exec(o.value); m.en = x ? Number(x[1]) : 0; m.boy = x ? Number(x[2]) : 0; }
    });
    document.getElementById("mListe").addEventListener("change", e => {
      const d = e.target.closest(".kalem"); if(!d) return;
      const m = form.malzemeler[Number(d.getAttribute("data-i"))]; m.tedarikciId = d.querySelector(".m-ted").value || "";
      if(e.target.classList.contains("m-birim")){ m.birim = e.target.value; if(m.birim === "plaka" && !m.en){ m.en = 2100; m.boy = 2800; } malzemeleriCiz(); }
    });
  }};
}
EYLEM.malzemeEkle = () => { form.malzemeler.push(bosMalzeme()); malzemeleriCiz(); const s = document.querySelectorAll(".m-ad"); s[s.length - 1].focus(); };
EYLEM.malzemeSil = (el, i) => { form.malzemeler.splice(Number(i), 1); if(!form.malzemeler.length) form.malzemeler.push(bosMalzeme()); malzemeleriCiz(); };
EYLEM.malzemeKaydet = btn => {
  const l = form.malzemeler.filter(m => m.ad.trim()).map(m => Object.assign({id:m.id, ad:m.ad.trim(), birim:m.birim, fiyat:yuvarla(m.fiyat), min:yuvarla(m.min || 0)},
    m.tedarikciId ? {tedarikciId:m.tedarikciId} : {}, m.birim === "plaka" && m.en && m.boy ? {en:m.en, boy:m.boy} : {}));
  if(l.some(m => !(m.fiyat >= 0) || m.fiyat > 1e8)) return hataYaz("Fiyatları kontrol edin.");
  islem(btn, async () => { await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:l}); bildir("Malzeme listesi kaydedildi"); geri(); });
};
// Bir kalemin 1 adedi için: malzeme + işçilik = maliyet; maliyet × (1 + kâr) = önerilen birim fiyat (KDV hariç).
function malzemeHesap(h){
  const malzeme = yuvarla(h.satirlar.reduce((t, s) => t + (s.miktar || 0) * (s.fiyat || 0), 0));
  const maliyet = yuvarla(malzeme + (h.iscilik || 0));
  return {malzeme, maliyet, satis:yuvarla(maliyet * (1 + (h.kar || 0) / 100))};
}
EYLEM.kalemHesap = (el, i) => {
  const k = form.ikalemler[Number(i)]; if(!k) return;
  const ml = malzemeListesi();
  const h = k.hesap ? JSON.parse(JSON.stringify(k.hesap)) : {satirlar:[], iscilik:0, kar:firma().kar};
  if(!h.satirlar.length) h.satirlar.push({malzemeId:"", ad:"", birim:"", fiyat:0, miktar:0});
  const p = document.createElement("div"); p.className = "perde";
  const satirHtml = (s, j) => '<div class="kalem" data-j="' + j + '" style="margin-top:8px"><div class="ikalem-alan alan-3">' +
    '<label>Malzeme<select class="kutu h-m"><option value="">— Elle yaz —</option>' + ml.map(m => '<option value="' + m.id + '"' + (m.id === s.malzemeId ? ' selected' : '') + '>' + esc(m.ad + " (" + m.birim + ")") + '</option>').join("") + '</select></label>' +
    '<label>Miktar' + (s.birim ? ' (' + esc(s.birim) + ')' : '') + '<input class="kutu h-miktar" inputmode="decimal" value="' + sayiYaz(s.miktar) + '"></label>' +
    '<label>Birim maliyet<input class="kutu h-fiyat" inputmode="decimal" value="' + sayiYaz(s.fiyat) + '"></label>' +
    '<button type="button" class="ikon-buton" data-k="sil" aria-label="Satırı sil">' + ik("x") + '</button></div>' +
    (s.malzemeId ? '' : '<input class="kutu h-ad" maxlength="80" placeholder="Malzeme adı (örn: Kuvars tezgah)" value="' + esc(s.ad) + '" style="margin-top:8px">') + '</div>';
  const ciz_ = () => { p.querySelector("#hSatir").innerHTML = h.satirlar.map(satirHtml).join(""); ozet(); };
  const ozet = () => {
    const r = malzemeHesap(h);
    p.querySelector("#hOzet").innerHTML = bilgiSatir("Malzeme", para(r.malzeme)) + bilgiSatir("İşçilik / montaj", para(h.iscilik || 0)) + bilgiSatir("Maliyet", para(r.maliyet)) +
      '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Önerilen birim fiyat <span class="ist" style="font-weight:400">(KDV hariç, %' + sayiYaz(h.kar || 0).replace(/^$/, "0") + ' kâr)</span></span><b>' + para(r.satis) + '</b></div>';
  };
  p.innerHTML = '<div class="pencere" style="max-width:600px;max-height:90vh;overflow:auto"><p>Malzemeden fiyat hesapla</p><div class="alt-bilgi">' + esc(k.ad || "Kalem") + ' · <b>1 adet</b> için</div>' +
    (ml.length ? '' : '<div class="uyari" style="margin:12px 0 0">Malzeme fiyat listeniz boş. Ayarlar → Malzeme fiyat listesi\'nden ekleyebilirsiniz; şimdilik satırlara elle yazabilirsiniz.</div>') +
    '<div id="hSatir"></div><button type="button" class="buton ikincil kucuk" style="margin-top:10px" data-k="ekle">' + ik("arti") + 'Satır ekle</button>' +
    '<div class="iki-alan"><div><label class="etiket" for="hIscilik">İşçilik / montaj / nakliye (₺)</label><input id="hIscilik" class="kutu" inputmode="decimal" value="' + sayiYaz(h.iscilik) + '"></div>' +
    '<div><label class="etiket" for="hKar">Kâr oranı (%)</label><input id="hKar" class="kutu" inputmode="decimal" value="' + sayiYaz(h.kar) + '"></div></div>' +
    '<div class="toplamlar" id="hOzet"></div><div class="hata" id="hHata"></div>' +
    '<div class="buton-sira"><button class="buton ikincil" data-k="kapat">Vazgeç</button><button class="buton" data-k="aktar">' + ik("tamam") + 'Fiyatı kaleme aktar</button></div></div>';
  const oku = e => {
    if(e.target.id === "hIscilik") h.iscilik = Math.max(0, sayiOku(e.target.value) || 0);
    else if(e.target.id === "hKar") h.kar = Math.max(0, sayiOku(e.target.value) || 0);
    const d = e.target.closest("[data-j]");
    if(d){
      const s = h.satirlar[Number(d.getAttribute("data-j"))];
      if(e.target.classList.contains("h-m")){
        const m = ml.find(x => x.id === e.target.value);
        Object.assign(s, m ? {malzemeId:m.id, ad:m.ad, birim:m.birim, fiyat:m.fiyat} : {malzemeId:"", birim:""});
        return ciz_();
      }
      s.miktar = Math.max(0, sayiOku(d.querySelector(".h-miktar").value) || 0);
      s.fiyat = Math.max(0, sayiOku(d.querySelector(".h-fiyat").value) || 0);
      if(d.querySelector(".h-ad")) s.ad = d.querySelector(".h-ad").value.trim();
    }
    ozet();
  };
  p.addEventListener("input", oku); p.addEventListener("change", e => { if(e.target.classList.contains("h-m")) oku(e); });
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-k]");
    if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-k");
    if(c === "kapat") return p.remove();
    if(c === "ekle"){ h.satirlar.push({malzemeId:"", ad:"", birim:"", fiyat:0, miktar:0}); return ciz_(); }
    if(c === "sil"){ h.satirlar.splice(Number(b.closest("[data-j]").getAttribute("data-j")), 1); if(!h.satirlar.length) h.satirlar.push({malzemeId:"", ad:"", birim:"", fiyat:0, miktar:0}); return ciz_(); }
    if(c === "aktar"){
      h.satirlar = h.satirlar.filter(s => s.miktar > 0 && s.fiyat > 0);
      const r = malzemeHesap(h);
      if(!(r.satis > 0)){ if(!h.satirlar.length) h.satirlar.push({malzemeId:"", ad:"", birim:"", fiyat:0, miktar:0}); ciz_(); p.querySelector("#hHata").textContent = "En az bir malzemenin miktarını ve fiyatını yazın."; return; }
      k.fiyat = r.satis; k.maliyet = r.maliyet; k.hesap = h;
      p.remove(); ikalemleriCiz(); bildir("Birim fiyat: " + para(r.satis));
    }
  });
  document.body.appendChild(p);
  ciz_();
};

/* ================= STOK ================= */
// Stok miktarı = hareketlerin toplamı (giriş +, çıkış -, sayım düzeltmesi ±).
const STOK_TUR = {giris:"Giriş", cikis:"Çıkış", duzeltme:"Sayım düzeltmesi"};
const miktarYaz = n => String(Math.round(n * 1000) / 1000).replace(".", ",");
const stokMiktar = mid => Math.round(veri.stok_hareket.reduce((t, h) => h.malzemeId === mid ? t + h.miktar : t, 0) * 1000) / 1000;
const stokAzalanlar = () => malzemeListesi().filter(m => m.min > 0 && stokMiktar(m.id) <= m.min);
const STOK_SIRA = {ad:["Ad (A–Z)", kiyas(m => m.ad)], az:["Stok (azdan çoğa)", kiyas(m => stokMiktar(m.id))], cok:["Stok (çoktan aza)", kiyas(m => stokMiktar(m.id), true)],
  deger:["Stok değeri (yüksek)", kiyas(m => Math.max(0, stokMiktar(m.id)) * (m.fiyat || 0), true)]};
const STOK_HAREKET_SIRA = {yeni:["En yeni", kiyas(h => h.olusma, true)], eski:["En eski", kiyas(h => h.olusma)], miktar:["Miktar (büyük)", kiyas(h => Math.abs(h.miktar), true)]};
function ekranStok(){
  if(eksikTablo.stok_hareket) return {baslik:"Stok", geri:true, html:'<div class="uyari">Stok için Supabase\'de <b>supabase-guncelleme-7.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>'};
  const ml = malzemeListesi(), f = filtre.stok || "hepsi";
  const deger_ = ml.reduce((t, m) => t + Math.max(0, stokMiktar(m.id)) * (m.fiyat || 0), 0), az = stokAzalanlar();
  const hz = listeHazirla("stok", STOK_SIRA, ml.filter(m => f === "hepsi" || az.indexOf(m) >= 0)), l = hz.l;
  const hh = listeHazirla("stokHareket", STOK_HAREKET_SIRA, veri.stok_hareket), son = hh.l;
  const malzemeAdi = id => (ml.find(m => m.id === id) || {ad:"Silinmiş malzeme"}).ad;
  const html = '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Malzeme</div><div class="deger">' + ml.length + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Azalan</div><div class="deger' + (az.length ? ' t-cikis' : '') + '">' + az.length + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Stok değeri (maliyet)</div><div class="deger">' + para(deger_) + '</div></div></div>' +
    '<div class="ust-arac">' + filtreButonlari("stok", [["hepsi", "Hepsi"], ["azalan", "Azalanlar"]]) + '<div class="buton-sira" style="margin:0"><button class="buton kucuk' + (az.length ? '' : ' ikincil') + '" data-git="siparisler">' + ik("mesaj") + 'Sipariş' + (az.length ? ' ver (' + az.length + ')' : 'ler') + '</button>' +
      '<button class="buton kucuk ikincil" data-git="malzemeler">' + ik("kalem") + 'Malzeme listesi</button><button class="buton kucuk ikincil" data-git="moduller">' + ik("kup") + 'Modüller</button><button class="buton kucuk ikincil" data-git="fiyat">' + ik("grafik") + 'Toplu fiyat</button><button class="buton kucuk ikincil" data-git="fiyatkarsilastir">' + ik("kasa") + 'Tedarikçi fiyatları</button></div></div>' +
    (ml.length ? listeArac("stok", STOK_SIRA) + '<div class="kart liste-kart">' + (l.length ? l.map(m => {
      const q = stokMiktar(m.id), azMi = m.min > 0 && q <= m.min;
      return '<div class="satir" style="flex-wrap:wrap"><span class="rozet ' + (azMi ? 'r-cikis' : 'r-gri') + '">' + ik("koli") + '</span><span class="orta"><div class="s1">' + esc(m.ad) + '</div>' +
        '<div class="s2">' + (m.min ? 'Asgari ' + miktarYaz(m.min) + ' ' + esc(m.birim) + ' · ' : '') + (m.fiyat ? para(m.fiyat) + ' / ' + esc(m.birim) : 'fiyat yok') + '</div></span>' +
        '<span class="sag"><div class="tutar ' + (azMi ? 't-cikis' : q < 0 ? 't-cikis' : '') + '">' + miktarYaz(q) + ' ' + esc(m.birim) + '</div>' + (azMi ? '<div class="s2" style="color:#b91c1c">Azaldı</div>' : '') + '</span>' +
        '<span class="secenekler" style="width:100%;justify-content:flex-end;margin-top:6px">' +
          '<button class="secenek" data-is="stokIslem" data-arg="' + m.id + '|giris">+ Giriş</button><button class="secenek" data-is="stokIslem" data-arg="' + m.id + '|cikis">− Çıkış</button>' +
          '<button class="secenek" data-is="stokIslem" data-arg="' + m.id + '|duzeltme">Sayım</button></span></div>';
    }).join("") + dahaFazla("stok", hz) : bos("koli", "Azalan malzeme yok.")) + '</div>' :
      '<div class="kart">' + bos("koli", "Önce malzeme listesine malzeme ekleyin.") + '<button class="buton" data-git="malzemeler">' + ik("arti") + 'Malzeme listesi</button></div>') +
    bolum("Son hareketler") + listeArac("stokHareket", STOK_HAREKET_SIRA) + '<div class="kart liste-kart">' + (son.length ? son.map(h => {
      const m = ml.find(x => x.id === h.malzemeId) || {birim:""}, ie = bul("is_emirleri", h.isEmriId);
      return '<div class="satir"><span class="rozet ' + (h.miktar >= 0 ? 'r-giris' : 'r-cikis') + '">' + ik(h.miktar >= 0 ? "asagi" : "yukari") + '</span><span class="orta"><div class="s1">' + esc(malzemeAdi(h.malzemeId)) + '</div>' +
        '<div class="s2">' + esc([STOK_TUR[h.tur], tarihYaz(h.tarih, true), ie ? ie.no + " " + ie.baslik : "", h.aciklama].filter(Boolean).join(" · ")) + '</div></span>' +
        '<span class="tutar ' + (h.miktar >= 0 ? 't-giris' : 't-cikis') + '">' + (h.miktar > 0 ? "+" : "") + miktarYaz(h.miktar) + ' ' + esc(m.birim) + '</span>' +
        '<button class="ikon-buton" style="margin-left:6px" data-is="stokSil" data-arg="' + h.id + '" aria-label="Sil">' + ik("sil") + '</button></div>';
    }).join("") + dahaFazla("stokHareket", hh) : bos("koli", "Henüz stok hareketi yok.")) + '</div>';
  return {baslik:"Stok", geri: matchMedia("(max-width:899px)").matches, html};
}
EYLEM.stokIslem = (el, arg) => {
  const [mid, tur] = arg.split("|"), m = malzemeListesi().find(x => x.id === mid); if(!m) return;
  const mevcut = stokMiktar(mid), isler = veri.is_emirleri.filter(ac).sort((a, b) => b.olusma - a.olusma);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:420px"><p>' + esc(m.ad) + ' · ' + STOK_TUR[tur] + '</p><div class="alt-bilgi">Şu an stokta: <b>' + miktarYaz(mevcut) + ' ' + esc(m.birim) + '</b></div>' +
    '<label class="etiket" for="skMiktar">' + (tur === "duzeltme" ? "Sayılan miktar" : "Miktar") + ' (' + esc(m.birim) + ')</label><input id="skMiktar" class="kutu tutar-kutu" inputmode="decimal">' +
    tarihAlani("skTarih", "Tarih", bugun()) +
    (tur === "cikis" ? '<label class="etiket" for="skIs">Hangi iş için? <span class="ist">(isteğe bağlı)</span></label><select id="skIs" class="kutu"><option value="">— Yok —</option>' +
      isler.map(ie => '<option value="' + ie.id + '">' + esc(ie.no + " · " + ie.baslik) + '</option>').join("") + '</select>' : '') +
    '<label class="etiket" for="skNot">Açıklama <span class="ist">(isteğe bağlı)</span></label><input id="skNot" class="kutu" maxlength="200" placeholder="' + (tur === "giris" ? "Tedarikçi, fatura no…" : "") + '">' +
    '<div class="hata" id="skHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const q = sayiOku(p.querySelector("#skMiktar").value);
    if(!(tur === "duzeltme" ? q >= 0 : q > 0) || q > 1e7){ p.querySelector("#skHata").textContent = "Lütfen geçerli bir miktar yazın."; return; }
    const miktar = tur === "giris" ? q : tur === "cikis" ? -q : q - mevcut;
    if(tur === "duzeltme" && !miktar){ p.remove(); return bildir("Stok zaten doğru"); }
    b.disabled = true;
    Depo.kaydet("stok_hareket", {id:yeniId(), malzemeId:mid, tur, miktar:Math.round(miktar * 1000) / 1000, tarih:p.querySelector("#skTarih").value || bugun(),
      isEmriId: tur === "cikis" ? p.querySelector("#skIs").value || null : null, aciklama:p.querySelector("#skNot").value.trim(), olusma:Date.now()})
      .then(() => { p.remove(); bildir(STOK_TUR[tur] + " kaydedildi"); ciz(); })
      .catch(err => { b.disabled = false; p.querySelector("#skHata").textContent = hataMesaji(err); });
  });
  document.body.appendChild(p); p.querySelector("#skMiktar").focus();
};
EYLEM.stokSil = (el, id) => onayla("Stok hareketi silinsin mi?", "Stok miktarı buna göre değişir.", "Sil", () => islem(null, async () => { await Depo.sil("stok_hareket", id); bildir("Silindi"); ciz(); }));
function isMalzemeKarti(id){
  const l = veri.stok_hareket.filter(h => h.isEmriId === id && h.tur === "cikis"); if(!l.length) return '';
  const ml = malzemeListesi(); let toplam = 0;
  return '<div class="kart liste-kart"><div class="kart-baslik" style="margin:12px 0 2px">Stoktan kullanılan malzeme</div>' + l.map(h => {
    const m = ml.find(x => x.id === h.malzemeId) || {ad:"Silinmiş malzeme", birim:"", fiyat:0}, t = -h.miktar * (m.fiyat || 0); toplam += t;
    return '<div class="satir"><span class="orta"><div class="s1">' + esc(m.ad) + '</div><div class="s2">' + tarihYaz(h.tarih, true) + '</div></span><span class="sag"><div class="tutar t-soluk">' + miktarYaz(-h.miktar) + ' ' + esc(m.birim) + '</div>' +
      (t ? '<div class="s2">' + para(t) + '</div>' : '') + '</span></div>';
  }).join("") + (toplam ? '<div class="alt-bilgi" style="padding-bottom:10px">Maliyet karşılığı ' + para(toplam) + ' (bilgi amaçlı; alış faturası / gider olarak zaten kayıtlıdır)</div>' : '') + '</div>';
}

/* ================= ÖLÇÜ / KEŞİF ================= */
// İş emrinin "kesif" alanında durur; fotoğraflar iş emrinin dosyalarına eklenir.
let TESISAT = ["Su / gider", "Elektrik prizi", "Doğalgaz", "Kombi", "Aspiratör çıkışı", "Pencere", "Kapı", "Kolon / kiriş", "Kalorifer peteği"];
const kesifDolu = k => !!(k && (k.tarih || (k.duvarlar || []).length || k.notlar));
function kesifKarti(ie){
  const k = ie.kesif || {};
  if(!kesifDolu(k)) return '<div class="kart yazdirma"><div class="kart-baslik"><span>Ölçü / keşif</span></div><div class="alt-bilgi">Henüz ölçü alınmadı.</div>' +
    '<button class="buton ikincil" data-git="kesif/' + ie.id + '">' + ik("cetvel") + 'Ölçü / keşif formu doldur</button></div>';
  const kutu = t => '<div style="white-space:pre-wrap;font-size:14px;margin-top:10px;background:var(--hafif);border-radius:10px;padding:10px 12px">' + esc(t) + '</div>';
  return '<div class="kart"><div class="kart-baslik"><span>Ölçü / keşif</span><button class="baglanti yazdirma" data-git="kesif/' + ie.id + '">Düzenle</button></div>' +
    (k.tarih ? bilgiSatir("Tarih", tarihYaz(k.tarih)) : '') + (k.olcen ? bilgiSatir("Ölçüyü alan", esc(k.olcen)) : '') +
    (k.mekan ? bilgiSatir("Mekân", esc(k.mekan)) : '') + (k.yukseklik ? bilgiSatir("Tavan yüksekliği", esc(k.yukseklik) + " cm") : '') +
    (k.duvarlar || []).map(d => bilgiSatir(esc(d.ad || "Duvar"), esc([d.olcu ? d.olcu + " cm" : "", d.not].filter(Boolean).join(" · ")))).join("") +
    ((k.tesisat || []).length ? '<div class="secenekler" style="margin-top:10px">' + k.tesisat.map(t => '<span class="etiket-rozet d-sari">' + esc(t) + '</span>').join("") + '</div>' : '') +
    (k.tesisatNot ? kutu(k.tesisatNot) : '') + (k.notlar ? kutu(k.notlar) : '') + '</div>';
}
function duvarSatir(d, i){
  return '<div class="kalem" data-i="' + i + '"><div class="ikalem-alan alan-duvar">' +
    '<label>Duvar<input class="kutu d-ad" maxlength="40" value="' + esc(d.ad) + '"></label>' +
    '<label>Uzunluk (cm)<input class="kutu d-olcu" inputmode="decimal" maxlength="20" value="' + esc(d.olcu) + '"></label>' +
    '<label>Not<input class="kutu d-not" maxlength="200" placeholder="Pencere 90 cm, soldan 120 cm…" value="' + esc(d.not) + '"></label>' +
    '<button type="button" class="ikon-buton" data-is="duvarSil" data-arg="' + i + '" aria-label="Sil">' + ik("x") + '</button></div></div>';
}
const duvarlariCiz = () => { document.getElementById("duvarlar").innerHTML = form.duvarlar.map(duvarSatir).join(""); };
function ekranKesif(id){
  const ie = bul("is_emirleri", id);
  if(!ie) return {baslik:"Ölçü / keşif", geri:true, html:'<div class="kart">' + bos("is", "İş emri bulunamadı.") + '</div>'};
  const k = ie.kesif || {};
  form = {mekan:k.mekan || "", tesisat:(k.tesisat || []).slice(),
    duvarlar:(k.duvarlar || []).length ? k.duvarlar.map(d => Object.assign({}, d)) : ["A", "B", "C"].map(h => ({ad:h + " duvarı", olcu:"", not:""}))};
  const mekanlar = Array.from(new Set(katalogKategorileri().concat(["Yatak odası", "Salon", "Diğer"])));
  const ustalar = Array.from(new Set(veri.is_emirleri.map(i => i.sorumlu).concat(veri.is_emirleri.map(i => (i.kesif || {}).olcen)).filter(Boolean)));
  const html = '<div class="kart form-kart">' +
    (eksikSutun.teklif && cevrimici ? '<div class="uyari">Ölçü bilgilerinin kaydedilmesi için önce Supabase\'de <b>supabase-guncelleme-4.sql</b> dosyasını çalıştırın.</div>' : '') +
    '<div class="alt-bilgi" style="margin:0">' + esc([ie.no, ie.baslik, cariAdi(ie.musteriId)].filter(Boolean).join(" · ")) + '</div>' +
    '<div class="iki-alan"><div>' + tarihAlani("kTarih", "Keşif tarihi", k.tarih || bugun()) + '</div>' +
    '<div><label class="etiket" for="kOlcen">Ölçüyü alan</label><input id="kOlcen" class="kutu" list="kUstalar" maxlength="60" value="' + esc(k.olcen || kullaniciAdi()) + '">' +
    '<datalist id="kUstalar">' + ustalar.map(u => '<option value="' + esc(u) + '">').join("") + '</datalist></div></div>' +
    '<label class="etiket">Mekân</label>' + secenekler("mekan", mekanlar, form.mekan) +
    '<label class="etiket" for="kYukseklik">Tavan yüksekliği (cm) <span class="ist">(isteğe bağlı)</span></label><input id="kYukseklik" class="kutu" inputmode="decimal" maxlength="20" value="' + esc(k.yukseklik || "") + '" style="max-width:200px">' +
    '<div class="form-bolum">Duvar ölçüleri</div><div class="alt-bilgi" style="margin:0">Duvarları soldan sağa harflendirin; pencere, kapı ve tesisat yerlerini nota yazın.</div>' +
    '<div id="duvarlar">' + form.duvarlar.map(duvarSatir).join("") + '</div>' +
    '<button type="button" class="buton ikincil kucuk" style="margin-top:10px" data-is="duvarEkle">' + ik("arti") + 'Duvar ekle</button>' +
    '<div class="form-bolum">Tesisat ve engeller</div><div class="secenekler" style="margin-top:10px">' + TESISAT.map((t, i) =>
      '<button type="button" class="secenek' + (form.tesisat.indexOf(t) >= 0 ? ' secili' : '') + '" data-is="tesisatSec" data-arg="' + i + '">' + esc(t) + '</button>').join("") + '</div>' +
    '<label class="etiket" for="kTesisatNot">Tesisat yerleri <span class="ist">(isteğe bağlı)</span></label><textarea id="kTesisatNot" class="kutu" maxlength="1000" placeholder="Örn: Su çıkışı A duvarında soldan 120 cm, yerden 50 cm">' + esc(k.tesisatNot || "") + '</textarea>' +
    '<label class="etiket" for="kNotlar">Genel notlar <span class="ist">(müşteri istekleri, zemin, eğim…)</span></label><textarea id="kNotlar" class="kutu" maxlength="2000">' + esc(k.notlar || "") + '</textarea>' +
    (cevrimici ? '<div class="form-bolum">Fotoğraflar</div><div class="buton-sira" style="margin-top:10px"><button type="button" class="buton ikincil kucuk" onclick="document.getElementById(\'kesifFoto\').click()">' + ik("kamera") + 'Fotoğraf çek / ekle</button></div>' +
      '<input type="file" id="kesifFoto" accept="image/*,video/*" multiple style="display:none" onchange="dosyaSecildi(this,\'' + id + '\')">' +
      '<div class="alt-bilgi">Fotoğraflar iş emrinin dosyalarına eklenir (şu an ' + isDosyalari(id).length + ' dosya).</div>' : '') +
    '<div class="hata" id="hata"></div><button class="buton" data-is="kesifKaydet" data-arg="' + id + '">' + ik("tamam") + 'Kaydet</button>' +
    (yetki.yonetici ? '<button class="buton ikincil" data-is="kesiftenTeklif" data-arg="' + id + '">' + ik("fatura") + 'Ölçülerden teklif kalemleri oluştur</button>' : '') + '</div>';
  return {baslik:"Ölçü / keşif", geri:true, html, sonra(){
    secenekBagla();
    document.getElementById("duvarlar").addEventListener("input", e => {
      const d = e.target.closest(".kalem"); if(!d) return;
      const w = form.duvarlar[Number(d.getAttribute("data-i"))];
      w.ad = d.querySelector(".d-ad").value; w.olcu = d.querySelector(".d-olcu").value; w.not = d.querySelector(".d-not").value;
    });
  }};
}
EYLEM.duvarEkle = () => { form.duvarlar.push({ad:String.fromCharCode(65 + form.duvarlar.length % 26) + " duvarı", olcu:"", not:""}); duvarlariCiz(); };
EYLEM.duvarSil = (el, i) => { form.duvarlar.splice(Number(i), 1); duvarlariCiz(); };
EYLEM.tesisatSec = (el, i) => {
  const t = TESISAT[Number(i)], j = form.tesisat.indexOf(t);
  if(j >= 0) form.tesisat.splice(j, 1); else form.tesisat.push(t);
  el.classList.toggle("secili");
};
EYLEM.kesifKaydet = (btn, id) => {
  const ie = bul("is_emirleri", id); if(!ie) return;
  if(eksikSutun.kesif && cevrimici) return hataYaz("Önce Supabase'de “supabase-guncelleme-4.sql” dosyasını çalıştırın; yoksa ölçüler kaydedilmez.");
  const kesif = {tarih:deger("kTarih") || bugun(), olcen:deger("kOlcen"), mekan:form.mekan || "", yukseklik:deger("kYukseklik"),
    duvarlar:form.duvarlar.map(d => ({ad:String(d.ad || "").trim(), olcu:String(d.olcu || "").trim(), not:String(d.not || "").trim()})).filter(d => d.olcu || d.not),
    tesisat:TESISAT.filter(t => form.tesisat.indexOf(t) >= 0), tesisatNot:deger("kTesisatNot"), notlar:deger("kNotlar")};
  islem(btn, async () => {
    await Depo.kaydet("is_emirleri", Object.assign({}, bul("is_emirleri", id), {kesif}));
    await notEkle(id, kesifDolu(ie.kesif) ? "Ölçü / keşif bilgileri güncellendi" : "Ölçü / keşif bilgileri girildi");
    bildir("Ölçüler kaydedildi"); geri();
  });
};
