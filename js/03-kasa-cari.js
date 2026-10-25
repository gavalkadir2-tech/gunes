"use strict";
// Güneş Mobilya — kasa cari
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= PARA GİRDİ / ÇIKTI ================= */
function ekranPara(tur, cariId, ieId, faturaId){
  const giris = tur === "giris", f = bul("faturalar", faturaId);
  if(f){ cariId = f.musteriId; ieId = ieId || f.isEmriId; }
  const kat = kategoriler(tur);
  const varsayilan = f && !giris && f.kategori ? f.kategori : cariId ? (giris ? "Cari Tahsilat" : "Tedarikçi Ödemesi") : kat[0];
  form = {tur, kategori: varsayilan, odeme:"Nakit", faturaId: f ? f.id : null, ortak:benimOrtak()};
  let katListe = kat.indexOf(varsayilan) >= 0 ? kat : [varsayilan].concat(kat);
  const ortakKat = giris ? ORTAK_SERMAYE : ORTAK_CEKIS;
  if(ortaklar().length && ortakHazir() && katListe.indexOf(ortakKat) < 0) katListe = katListe.concat([ortakKat]);
  const html = '<div class="kart form-kart">' +
    (f ? '<div class="bilgi-kutu" style="margin:0 0 14px">' + (f.tur === "satis" ? "Satış" : "Alış") + ' faturası <b>' + esc(f.no) + '</b> · ' + esc(cariAdi(f.musteriId)) +
      '<br>Kalan: <b>' + para(odemeDurumu(f).kalan) + '</b></div>' : '') +
    '<label class="etiket" for="tutar" style="margin-top:0">Tutar</label><input id="tutar" class="kutu tutar-kutu" inputmode="decimal" autocomplete="off" placeholder="0 ₺">' +
    '<div class="secenekler" id="tamamiKutu" style="margin-top:8px"></div>' +
    '<label class="etiket">' + (giris ? "Ne için geldi?" : "Ne için çıktı?") + '</label>' + secenekler("kategori", katListe, varsayilan) +
    (ortaklar().length ? '<div id="ortakKimKutu" style="display:none"><label class="etiket">Kim?</label>' + secenekler("hedef", ortaklar().map(o => o.ad), "") + '</div>' : '') +
    '<label class="etiket">Ödeme şekli</label>' + secenekler("odeme", ODEME, "Nakit") + ortakSecici(form.ortak) +
    '<div class="iki-alan"><div><label class="etiket" for="cari">Cari <span class="ist">(isteğe bağlı)</span></label>' + cariSecici(cariId, false, giris ? "musteri" : "tedarikci") + '</div>' +
    '<div><label class="etiket" for="isEmri">İş emri <span class="ist">(isteğe bağlı)</span></label><select id="isEmri" class="kutu">' + isSecenekleri(cariId, ieId) + '</select></div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="aciklama">Not <span class="ist">(isteğe bağlı)</span></label><input id="aciklama" class="kutu" maxlength="200"></div>' +
    '<div>' + tarihAlani("tarih", "Tarih", bugun()) + '</div></div>' +
    '<div class="hata" id="hata"></div>' +
    '<button class="buton" style="background:var(--' + tur + ')" data-is="paraKaydet">' + ik("tamam") + 'Kaydet</button></div>';
  return {baslik: giris ? (cariId ? "Tahsilat Al" : "Para Girdi") : (cariId ? "Ödeme Yap" : "Para Çıktı"), geri:true, html, sonra(){
    secenekBagla(); cariIsBagla();
    const kim = document.getElementById("ortakKimKutu"), katGrup = document.querySelector('.secenekler[data-ad="kategori"]');
    if(kim && katGrup) katGrup.addEventListener("click", () => setTimeout(() => {
      const o = ortakKategorisi(form.kategori), et = document.getElementById("ortakEtiket");
      kim.style.display = o ? "" : "none";
      if(et) et.textContent = o ? (form.tur === "giris" ? "Hangi kasaya girdi?" : "Hangi kasadan çıktı?") : (form.tur === "giris" ? "Para kimde?" : "Kim ödedi?");
    }, 0));
    form.cariDegisti = tamamiGuncelle; tamamiGuncelle();
    document.getElementById("tutar").focus();
  }};
}
// "Tamamı" kısayolu: fatura varsa fatura kalanı, yoksa cari bakiyesi.
function tamamiGuncelle(){
  const k = document.getElementById("tamamiKutu"); if(!k) return;
  const f = bul("faturalar", form.faturaId), c = deger("cari");
  let miktar = 0, yazi = "";
  if(f){ miktar = odemeDurumu(f).kalan; yazi = "Kalanın tamamı"; }
  else if(c){ const b = cariBakiye(c); miktar = form.tur === "giris" ? b : -b; yazi = "Bakiyenin tamamı"; }
  k.innerHTML = miktar > 0 ? '<button type="button" class="secenek" data-is="tutarDoldur" data-arg="' + miktar + '">' + yazi + ': ' + para(miktar) + '</button>' : '';
}
EYLEM.tutarDoldur = (el, m) => { const t = document.getElementById("tutar") || document.getElementById("odenen"); t.value = sayiYaz(Number(m)); };
EYLEM.paraKaydet = btn => {
  const tutar = tutarAl("tutar"); if(tutar === null) return;
  const ortakKim = ortakKategorisi(form.kategori) ? (ortaklar().find(o => o.ad === form.hedef) || {}).id : "";
  if(ortakKategorisi(form.kategori) && !ortakKim) return hataYaz("Kim? Ortağı seçin.");
  const k = {id:yeniId(), tur:form.tur, tutar, kategori:form.kategori, odeme:form.odeme, musteriId:deger("cari") || null,
    isEmriId:deger("isEmri") || null, faturaId:form.faturaId, aciklama:deger("aciklama"), tarih:deger("tarih") || bugun(), olusma:Date.now(), ortak:form.ortak || "", hedef:ortakKim || ""};
  const f = bul("faturalar", k.faturaId);
  if(f && k.musteriId !== f.musteriId) k.faturaId = null;   // cari değiştirildiyse faturadan kopar
  islem(btn, async () => { await Depo.kaydet("hareketler", k); bildir("Kaydedildi: " + para(tutar)); geri(); });
};

/* ================= KASA ================= */
function ekranKasa(){
  const k = kasa();
  const liste = veri.hareketler.filter(h => h.tur !== "borc" && h.tarih.slice(0, 7) === ayGoster && (filtre.kasa === "hepsi" || h.tur === filtre.kasa || (filtre.kasa === "ortak" && (h.tur === "aktarim" || ortakKategorisi(h.kategori))))).sort(tarihSira);
  let gir = 0, cik = 0; liste.forEach(h => { if(h.tur === "giris") gir += h.tutar; else if(h.tur === "cikis") cik += h.tutar; });
  let html = '<div class="izgara uc"><div class="kart"><div class="kart-baslik">Kasadaki para (toplam)</div><div class="buyuk-sayi" style="font-size:24px">' + para(k.toplam) + '</div>' +
      '<div class="alt-bilgi">Nakit <b>' + para(k.nakit) + '</b> · Banka <b>' + para(k.banka) + '</b>' + (k.senet ? ' · Çek/Senet <b>' + para(k.senet) + '</b>' : '') + '</div>' + kisiKasaSatiri() + '</div>' +
    '<div class="kart ozet"><div class="kart-baslik">Bu ay giren</div><div class="deger t-giris">' + para(gir) + '</div></div>' +
    '<div class="kart ozet"><div class="kart-baslik">Bu ay çıkan</div><div class="deger t-cikis">' + para(cik) + '</div></div></div>' +
    '<div class="hizli">' + hizliButon("giris", "r-giris", "asagi", "Para Girdi") + hizliButon("cikis", "r-cikis", "yukari", "Para Çıktı") + hizliButon("cekler", "r-borc", "fatura", "Çek / Senet") +
      (ortaklar().length ? '<button data-is="kasaAktarim"><span class="rozet r-ana">' + ik("dondur") + '</span>Kasalar arası aktarım</button>' : '') +
      hizliButon("ekstre", "r-gri", "yukle", "Banka ekstresi") + hizliButon("sabitgiderler", "r-ana", "takvim", "Sabit giderler") + '</div>' +
    '<div class="ust-arac">' + aySecici() + filtreButonlari("kasa", [["hepsi","Hepsi"], ["giris","Giren"], ["cikis","Çıkan"]].concat(ortaklar().length ? [["ortak", "Ortak hareketleri"]] : [])) + '</div>';
  if(!liste.length) return {baslik:"Kasa", html: html + '<div class="kart">' + bos("kasa", "Bu ayda kayıt yok.") + '</div>'};
  const gunler = {}, sira = [];
  liste.forEach(h => { if(!gunler[h.tarih]){ gunler[h.tarih] = []; sira.push(h.tarih); } gunler[h.tarih].push(h); });
  html += sira.map(t => {
    const net = gunler[t].reduce((s, h) => s + (h.tur === "giris" ? h.tutar : h.tur === "cikis" ? -h.tutar : 0), 0);
    return '<div class="gun-baslik"><span>' + tarihYaz(t) + '</span><span>' + (net >= 0 ? "+" : "") + para(net) + '</span></div>' +
      '<div class="kart liste-kart">' + gunler[t].map(h => hareketSatir(h)).join("") + '</div>';
  }).join("");
  return {baslik:"Kasa", html};
}
function ekranKayit(id){
  const h = bul("hareketler", id);
  if(!h) return {baslik:"Kayıt", geri:true, html:'<div class="kart">' + bos("kasa", "Kayıt bulunamadı.") + '</div>'};
  const tip = h.tur === "giris" ? "Para Girdi" : h.tur === "cikis" ? "Para Çıktı" : h.tur === "aktarim" ? "Kasalar arası aktarım" : "Veresiye Satış";
  const ie = bul("is_emirleri", h.isEmriId), f = bul("faturalar", h.faturaId);
  const bag = (yer, yazi) => '<button class="baglanti" data-git="' + yer + '">' + esc(yazi) + '</button>';
  const html = '<div class="kart form-kart">' + bilgiSatir("Tutar", '<span class="t-' + h.tur + '" style="font-weight:600">' + para(h.tutar) + '</span>') +
    bilgiSatir("Ne için", esc(h.tur === "borc" ? "Veresiye" : h.kategori)) + (h.odeme ? bilgiSatir("Ödeme", esc(h.odeme)) : '') +
    (h.tur === "aktarim" ? bilgiSatir("Kimden → kime", esc(ortakAdi(h.ortak) + " → " + ortakAdi(h.hedef))) : ortaklar().length && h.tur !== "borc" ? bilgiSatir(h.tur === "giris" ? "Para kimde" : "Kim ödedi", esc(ortakAdi(h.ortak))) : '') +
    (ortakKategorisi(h.kategori) && h.hedef ? bilgiSatir("Ortak", esc(ortakAdi(h.hedef))) : '') +
    (h.musteriId ? bilgiSatir("Cari", bag("cari/" + h.musteriId, cariAdi(h.musteriId))) : '') +
    (ie ? bilgiSatir("İş emri", bag("is/" + ie.id, ie.no + " · " + ie.baslik)) : '') +
    (f ? bilgiSatir("Fatura", bag("fatura/" + f.id, f.no)) : '') +
    (h.aciklama ? bilgiSatir("Not", esc(h.aciklama)) : '') + bilgiSatir("Tarih", tarihYaz(h.tarih)) + '</div>' +
    '<div class="form-kart"><button class="buton tehlike" data-is="kayitSil" data-arg="' + h.id + '">' + ik("sil") + 'Bu kaydı sil</button></div>';
  return {baslik:tip, geri:true, html};
}
EYLEM.kayitSil = (el, id) => veri.personel_hareket.some(x => x.hareketId === id) ? uyar("Bu kayıt personel ödemesine bağlı", "Personel sayfasındaki hesap hareketlerinden silin; kasa kaydı da birlikte silinir.") : onayla("Bu kayıt silinsin mi?", "Çöp kutusuna taşınır.", "Sil",
  () => islem(null, async () => { await Depo.sil("hareketler", id); bildir("Kayıt silindi"); geri(); }));

/* ================= CARİLER ================= */
function ekranCariler(){
  const liste = veri.musteriler.filter(m => filtre.cari === "hepsi" || m.tip === filtre.cari)
    .map(m => ({m, b:cariBakiye(m.id)})).sort((a, b) => Math.abs(b.b) - Math.abs(a.b) || a.m.ad.localeCompare(b.m.ad, "tr"));
  let alacak = 0, borc = 0; veri.musteriler.forEach(m => { const b = cariBakiye(m.id); if(b > 0) alacak += b; else borc -= b; });
  const html = '<div class="izgara"><div class="kart ozet"><div class="kart-baslik">Alacağımız</div><div class="deger t-borc">' + para(alacak) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Borcumuz</div><div class="deger t-cikis">' + para(borc) + '</div></div></div>' +
    '<div class="hizli">' + hizliButon("cari-form/-/musteri", "r-borc", "kisi", "Yeni Müşteri") + hizliButon("cari-form/-/tedarikci", "r-gri", "koli", "Yeni Tedarikçi") +
      hizliButon("tahsilat", "r-cikis", "mesaj", "Tahsilat hatırlat") + hizliButon("kampanya", "r-ana", "yildiz", "Kampanya mesajı") + '</div>' +
    '<div class="ust-arac">' + filtreButonlari("cari", [["hepsi","Hepsi"], ["musteri","Müşteriler"], ["tedarikci","Tedarikçiler"]]) + '</div>' +
    (veri.musteriler.length > 6 ? '<div class="ara">' + ik("ara") + '<input id="ara" class="kutu" placeholder="Ad veya telefon ile ara…" value="' + esc(aramaYazi) + '"></div>' : '') +
    '<div class="kart liste-kart" id="cariListe">' + cariListesi(liste) + '</div>';
  return {baslik:"Cariler", html, sonra(){
    const a = document.getElementById("ara");
    if(a) a.addEventListener("input", () => { aramaYazi = a.value; document.getElementById("cariListe").innerHTML = cariListesi(liste); });
  }};
}
function cariListesi(liste){
  if(!liste.length) return bos("kisiler", "Henüz cari yok.");
  const q = aramaYazi.toLocaleLowerCase("tr");
  const l = liste.filter(x => !q || x.m.ad.toLocaleLowerCase("tr").indexOf(q) >= 0 || (x.m.telefon || "").replace(/\s/g, "").indexOf(q.replace(/\s/g, "")) >= 0);
  if(!l.length) return bos("ara", "Bulunamadı.");
  return l.map(x => {
    const by = bakiyeYazi(x.b);
    return '<button class="satir" data-git="cari/' + x.m.id + '"><span class="rozet ' + (x.m.tip === "tedarikci" ? "r-gri" : "r-borc") + '">' + ik(x.m.tip === "tedarikci" ? "koli" : "kisi") + '</span>' +
      '<span class="orta"><div class="s1">' + esc(x.m.ad) + '</div><div class="s2">' + (x.m.tip === "tedarikci" ? "Tedarikçi" : "Müşteri") + (x.m.telefon ? " · " + esc(x.m.telefon) : "") + '</div></span>' +
      '<span class="sag">' + (x.b ? '<div class="tutar ' + by.sinif + '">' + para(Math.abs(x.b)) + '</div><div class="s2">' + by.yazi + '</div>' : '<span class="s2">Hesap kapalı</span>') + '</span></button>';
  }).join("");
}
function ekranCariForm(id, tip){
  const m = bul("musteriler", id);
  form = {tip: m ? m.tip : (tip === "tedarikci" ? "tedarikci" : "musteri"), _surum: m ? m._surum : null};
  const tipAd = {musteri:"Müşteri", tedarikci:"Tedarikçi"};
  const html = '<div class="kart form-kart">' +
    '<label class="etiket" style="margin-top:0">Cari türü</label>' + secenekler("tipAd", ["Müşteri", "Tedarikçi"], tipAd[form.tip]) +
    '<label class="etiket" for="ad">Adı / Firma adı</label><input id="ad" class="kutu" maxlength="80" value="' + esc(m ? m.ad : "") + '" placeholder="Örn: Ahmet Yılmaz veya Yıldız Kereste">' +
    '<div class="iki-alan"><div><label class="etiket" for="telefon">Telefon <span class="ist">(isteğe bağlı)</span></label><input id="telefon" class="kutu" inputmode="tel" maxlength="20" value="' + esc(m ? m.telefon : "") + '"></div>' +
    '<div><label class="etiket" for="vergiNo">Vergi / TC no <span class="ist">(isteğe bağlı)</span></label><input id="vergiNo" class="kutu" maxlength="40" value="' + esc(m ? m.vergiNo : "") + '"></div></div>' +
    '<label class="etiket" for="adres">Adres <span class="ist">(isteğe bağlı)</span></label><textarea id="adres" class="kutu" maxlength="300">' + esc(m ? m.adres : "") + '</textarea>' +
    '<div class="hata" id="hata"></div><button class="buton" data-is="cariKaydet" data-arg="' + (m ? m.id : "") + '">' + ik("tamam") + 'Kaydet</button></div>';
  return {baslik: m ? "Cariyi düzenle" : "Yeni cari", geri:true, html, sonra(){ secenekBagla(); document.getElementById("ad").focus(); }};
}
EYLEM.cariKaydet = (btn, id) => {
  const ad = deger("ad");
  if(!ad) return hataYaz("Lütfen adı yazın.");
  const kucuk = ad.toLocaleLowerCase("tr");
  if(veri.musteriler.some(x => x.id !== id && x.ad.toLocaleLowerCase("tr") === kucuk)) return hataYaz("Bu isimde bir cari zaten var.");
  const eski = bul("musteriler", id);
  const tip = form.tipAd ? (form.tipAd === "Tedarikçi" ? "tedarikci" : "musteri") : form.tip;
  const k = {id: id || yeniId(), ad, tip, telefon:deger("telefon"), adres:deger("adres"), vergiNo:deger("vergiNo"), olusma: eski ? eski.olusma : Date.now()};
  islem(btn, async () => {
    await Depo.kaydet("musteriler", Object.assign(k, form._surum != null ? {_surum:form._surum} : {}));
    if(id){ bildir("Kaydedildi"); geri(); }
    else { bildir("Cari eklendi"); history.replaceState(null, "", "#cari/" + k.id); ciz(); }
  });
};
function cariEkstre(id){
  const l = [];
  veri.faturalar.forEach(f => { if(f.musteriId === id) l.push({tarih:f.tarih, olusma:f.olusma, yer:"fatura/" + f.id,
    yazi:(f.tur === "satis" ? "Satış faturası " : "Alış faturası ") + f.no, alt:f.isEmriId ? (bul("is_emirleri", f.isEmriId) || {}).no : "", tutar: f.tur === "satis" ? f.toplam : -f.toplam}); });
  veri.hareketler.forEach(h => { if(h.musteriId === id) l.push({tarih:h.tarih, olusma:h.olusma, yer:"kayit/" + h.id,
    yazi: h.tur === "giris" ? "Tahsilat · " + h.odeme : h.tur === "cikis" ? "Ödeme · " + h.odeme : "Veresiye satış", alt:h.aciklama,
    tutar: h.tur === "giris" ? -h.tutar : h.tutar}); });
  l.sort((a, b) => a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : (a.olusma || 0) - (b.olusma || 0));
  let b = 0; l.forEach(x => { b = yuvarla(b + x.tutar); x.bakiye = b; });
  return l.reverse();
}
function ekranCari(id){
  const m = bul("musteriler", id);
  if(!m) return {baslik:"Cari", geri:true, html:'<div class="kart">' + bos("kisi", "Cari bulunamadı.") + '</div>'};
  const b = cariBakiye(id), by = bakiyeYazi(b), ted = m.tip === "tedarikci";
  const isler = veri.is_emirleri.filter(ie => ie.musteriId === id).sort((x, y) => y.olusma - x.olusma);
  const ekstre = cariEkstre(id);
  const butonlar = ted
    ? [hizliButon("fatura-form/alis/" + id, "r-gri", "fatura", "Alış Faturası"), hizliButon("cikis/" + id, "r-cikis", "yukari", "Ödeme Yap"),
       hizliButon("fatura-form/satis/" + id, "r-borc", "fatura", "Satış Faturası"), hizliButon("giris/" + id, "r-giris", "asagi", "Tahsilat Al")]
    : [hizliButon("is-form/-/" + id, "r-ana", "is", "Yeni İş Emri"), hizliButon("fatura-form/satis/" + id, "r-borc", "fatura", "Satış Faturası"),
       hizliButon("giris/" + id, "r-giris", "asagi", "Tahsilat Al"), hizliButon("cikis/" + id, "r-cikis", "yukari", "Ödeme Yap")];
  const html = '<div class="iki-sutun genis"><div>' +
    '<div class="kart"><div class="kart-baslik"><span>' + (ted ? "Tedarikçi" : "Müşteri") + '</span><span>' + by.yazi + '</span></div>' +
      '<div class="buyuk-sayi ' + by.sinif + '">' + para(Math.abs(b)) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px">' + (m.telefon ? '<a class="tel" href="tel:' + esc(m.telefon.replace(/[^\d+]/g, "")) + '">' + ik("telefon") + esc(m.telefon) + '</a>' : '') +
      (m.vergiNo ? '<span class="alt-bilgi" style="margin:0">Vergi/TC: ' + esc(m.vergiNo) + '</span>' : '') + '</div>' +
      (m.adres ? '<div class="alt-bilgi">' + esc(m.adres) + '</div>' : '') + '</div>' +
    '<div class="hizli" style="grid-template-columns:1fr 1fr">' + butonlar.join("") + '</div>' +
    '<button class="buton wa-buton" style="margin:0 0 12px" data-is="waCari" data-arg="' + id + '">' + ik("mesaj") + 'WhatsApp ile yaz</button>' +
    (isler.length || !ted ? bolum("İş emirleri (" + isler.length + ")") + '<div class="kart liste-kart">' + (isler.length ? isler.map(ie => isSatir(ie, true)).join("") : bos("is", "Bu cariye ait iş emri yok.")) + '</div>' : '') +
    '<div class="buton-sira" style="margin:12px 0"><button class="buton ikincil" data-git="cari-form/' + id + '">' + ik("kalem") + 'Düzenle</button>' +
    '<button class="buton tehlike" data-is="cariSil" data-arg="' + id + '">' + ik("sil") + 'Sil</button></div>' +
    '</div><div>' + bolum("Hesap ekstresi") +
    '<div class="kart liste-kart">' + (ekstre.length ? ekstre.map(x =>
      '<button class="satir" data-git="' + x.yer + '"><span class="orta"><div class="s1">' + esc(x.yazi) + '</div><div class="s2">' + esc([tarihYaz(x.tarih, true), x.alt].filter(Boolean).join(" · ")) + '</div></span>' +
      '<span class="sag"><div class="tutar ' + (x.tutar > 0 ? "t-borc" : "t-giris") + '">' + (x.tutar > 0 ? "+" : "−") + para(Math.abs(x.tutar)) + '</div><div class="s2">Bakiye: ' + para(x.bakiye) + '</div></span></button>').join("")
      : bos("fatura", "Henüz hareket yok.")) + '</div>' +
    '<div class="alt-bilgi" style="margin:0 4px">+ cari bize borçlandı, − carinin borcundan düştü.</div></div></div>';
  return {baslik:m.ad, geri:true, html};
}
EYLEM.cariSil = (el, id) => {
  if(veri.hareketler.some(h => h.musteriId === id) || veri.faturalar.some(f => f.musteriId === id) || veri.is_emirleri.some(i => i.musteriId === id))
    return uyar("Bu cari silinemez", "Carinin faturası, iş emri veya ödemesi var. Önce onları silmeniz gerekir.");
  onayla("Cari silinsin mi?", "Çöp kutusuna taşınır.", "Sil", () => islem(null, async () => { await Depo.sil("musteriler", id); bildir("Cari silindi"); git("cariler"); }));
};

/* ================= WHATSAPP ================= */
let FIRMA = "Güneş Mobilya";
function waNumara(t){
  let n = String(t || "").replace(/\D/g, "");
  if(!n) return "";
  if(n.indexOf("00") === 0) n = n.slice(2);
  else if(n[0] === "0") n = "90" + n.slice(1);
  else if(n.length === 10) n = "90" + n;
  return n;
}
// Mesajı düzenlenebilir şekilde gösterir; "WhatsApp'ta aç" ile uygulamayı/WhatsApp Web'i açar.
function waPencere(o){
  const tel = waNumara(o.tel), p = document.createElement("div");
  p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:500px"><p>WhatsApp mesajı</p>' +
    (o.ad ? '<div class="alt-bilgi">Alıcı: <b>' + esc(o.ad) + '</b>' + (tel ? ' · +' + tel : '') + '</div>' : '') +
    (tel ? '' : '<label class="etiket" for="waTel">Telefon numarası <span class="ist">(boş bırakırsanız kişiyi WhatsApp\'ta seçersiniz)</span></label><input id="waTel" class="kutu" inputmode="tel" placeholder="05xx xxx xx xx">') +
    (o.sablonlar.length > 1 ? '<div class="secenekler" style="margin-top:12px">' + o.sablonlar.map((s, i) =>
      '<button type="button" class="secenek' + (i === (o.varsayilan || 0) ? ' secili' : '') + '" data-i="' + i + '">' + esc(s.ad) + '</button>').join("") + '</div>' : '') +
    '<textarea id="waMetin" class="kutu" style="min-height:170px;margin-top:12px"></textarea><div class="hata" id="waHata"></div>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton wa-buton" data-c="gonder">' + ik("mesaj") + 'WhatsApp\'ta aç</button></div></div>';
  const metin = p.querySelector("#waMetin");
  metin.value = o.sablonlar[o.varsayilan || 0].metin;
  p.addEventListener("click", e => {
    const s = e.target.closest("[data-i]");
    if(s){
      p.querySelectorAll("[data-i]").forEach(x => x.classList.remove("secili")); s.classList.add("secili");
      metin.value = o.sablonlar[Number(s.getAttribute("data-i"))].metin; return;
    }
    const b = e.target.closest("[data-c]");
    if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const girilen = p.querySelector("#waTel") ? p.querySelector("#waTel").value.trim() : "";
    const t = tel || waNumara(girilen);
    if(girilen && t.length < 11) { p.querySelector("#waHata").textContent = "Telefon numarası eksik görünüyor."; return; }
    window.open("https://wa.me/" + t + "?text=" + encodeURIComponent(metin.value), "_blank", "noopener");
    if(o.isEmriId) notEkle(o.isEmriId, "WhatsApp mesajı hazırlandı").catch(() => {});
    if(o.gonderildi) o.gonderildi();
    p.remove();
  });
  document.body.appendChild(p);
}
function waIsSablonlari(ie, m){
  const o = isOzet(ie.id), tes = ie.teslimTarihi ? tarihYaz(ie.teslimTarihi) : "";
  const bas = "Merhaba " + (m.ad || "") + ", ", imza = "\n\n" + FIRMA, isAd = "“" + ie.baslik + "”";
  const ozet = o.fiyat ? "\nToplam tutar: " + para(o.fiyat) + "\nAlınan: " + para(o.tahsilat) + "\nKalan: " + para(Math.max(o.kalan, 0)) : "";
  // Ayarlar → Mesaj şablonları
  const al = {ad:m.ad || "", no:ie.no, is:ie.baslik, ozet, firma:FIRMA, tutar:para(Math.max(o.kalan, 0)), kalan:o.kalan > 0 ? "\nTeslimatta kalan ödeme: " + para(o.kalan) : ""};
  const sb_ = (k, tesYazi) => sablonDoldur(mesajSablonu(k), Object.assign({teslim:tes ? tesYazi + tes : ""}, al));
  return [
    {ad:"Sipariş onayı", metin: sb_("siparisOnay", "\nTahmini teslim: ")},
    {ad:"Üretimde", metin: sb_("uretim", "\nTahmini teslim tarihi: ")},
    {ad:"Hazır", metin: sb_("hazir", "")},
    {ad:"Teslim edildi", metin: sb_("teslim", "")},
    {ad:"Ödeme hatırlatma", metin: sb_("odeme", "")},
    {ad:"Fiyat teklifi", metin: bas + isAd + " için fiyat teklifimiz:" + ie.kalemler.map(k => "\n• " + k.ad + (k.olcu ? " (" + k.olcu + ")" : "") + (k.renk ? " — " + k.renk : "") +
        (k.adet > 1 ? " × " + k.adet : "") + (k.fiyat ? ": " + para(k.adet * k.fiyat) : "")).join("") +
      (() => { const h = isHesap(ie.kalemler, isTeklif(ie)); if(!(h.ara > 0)) return "";
        return "\n" + (h.kalemli ? "Ara toplam" : "Fiyat (KDV hariç)") + ": " + para(h.ara) + (h.indirim ? "\nİndirim: −" + para(h.indirim) : "") +
          (h.kdvOran ? "\nKDV (%" + h.kdvOran + "): " + para(h.kdv) : "") + "\nGenel toplam" + (h.kdvOran ? " (KDV dahil)" : "") + ": " + para(h.toplam); })() +
      (ie.teklif.gecerlilik ? "\nTeklif geçerlilik: " + tarihYaz(ie.teklif.gecerlilik) : "") + "\nOnaylarsanız siparişinizi hemen üretime alabiliriz." + imza},
    {ad:"Boş mesaj", metin: bas + imza}
  ];
}
const WA_DURUM = {"Sipariş alındı":0, "Üretimde":1, "Hazır":2, "Teslim edildi":3, "Teklif":5};
EYLEM.waIs = (el, id) => {
  const ie = bul("is_emirleri", id); if(!ie) return;
  const m = bul("musteriler", ie.musteriId) || {};
  waPencere({tel:m.telefon, ad:m.ad, isEmriId:id, sablonlar:waIsSablonlari(ie, m), varsayilan:WA_DURUM[ie.durum] || 0});
};
EYLEM.waCari = (el, id) => {
  const m = bul("musteriler", id); if(!m) return;
  const b = cariBakiye(id), bas = "Merhaba " + m.ad + ", ", imza = "\n\n" + FIRMA;
  waPencere({tel:m.telefon, ad:m.ad, varsayilan: b > 0 ? 0 : 1, sablonlar:[
    {ad:"Ödeme hatırlatma", metin: bas + "hesabınızda " + para(Math.max(b, 0)) + " tutarında ödenmemiş bakiye görünmektedir. Uygun olduğunuzda ödeme yapabilirseniz seviniriz." + imza},
    {ad:"Boş mesaj", metin: bas + imza}]});
};
EYLEM.waFatura = (el, id) => {
  const f = bul("faturalar", id); if(!f) return;
  const m = bul("musteriler", f.musteriId) || {}, od = odemeDurumu(f);
  waPencere({tel:m.telefon, ad:m.ad, isEmriId:f.isEmriId, sablonlar:[
    {ad:"Fatura bilgisi", metin:"Merhaba " + (m.ad || "") + ", " + f.no + " numaralı faturanız:\nToplam: " + para(f.toplam) + "\nÖdenen: " + para(f.toplam - od.kalan) +
      "\nKalan: " + para(od.kalan) + (f.vade ? "\nVade: " + tarihYaz(f.vade) : "") + "\n\n" + FIRMA},
    {ad:"Boş mesaj", metin:"Merhaba " + (m.ad || "") + ", \n\n" + FIRMA}]});
};
