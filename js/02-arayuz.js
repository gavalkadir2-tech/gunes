"use strict";
// Güneş Mobilya — arayuz
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= YÖNLENDİRME ================= */
// Telefonun "geri" tuşu çalışsın diye adresteki # kullanılır. Boş parça "-" yazılır.
function git(yer){ if(location.hash === "#" + yer) ciz(); else location.hash = yer; }
function geri(){ if(history.length > 1) history.back(); else git("ana"); }
window.addEventListener("hashchange", ciz);

const EYLEM = {};   // data-is="..." ile tıklanan işlemler
document.addEventListener("click", e => {
  const g = e.target.closest("[data-git]");
  if(g){ e.preventDefault(); git(g.getAttribute("data-git")); return; }
  const a = e.target.closest("[data-is]");
  if(a && EYLEM[a.getAttribute("data-is")]){ e.preventDefault(); EYLEM[a.getAttribute("data-is")](a, a.getAttribute("data-arg")); }
});

let ayGoster = bugun().slice(0, 7);
const filtre = {tahsilat:"geciken", ekstre:"gelen", kasa:"hepsi", fatura:"hepsi", is:"acik", cari:"hepsi", katalog:"hepsi", personel:"aktif", personelAy:null, stok:"hepsi"};
let aramaYazi = "";
let hazir = false;
const USTA_EKRAN = {ana:1, isler:1, is:1, kesif:1, katalog:1, proje:1, ayarlar:1, hatirlatmalar:1, takvim:1, kesim:1, etiket:1, qr:1, kapasite:1, paylasilan:1};   // ustanın açabildiği sayfalar
const yol = () => (location.hash || "#ana").slice(1).split("/").map(x => x && x !== "-" ? decodeURIComponent(x) : null);

function ciz(){
  if(!hazir) return;
  ayarlariUygula();
  document.body.classList.remove("girissiz");
  const [ekran, a, b, c, d] = yol();
  const sayfalar = {
    ana: ekranAna, kasa: ekranKasa, kayit: () => ekranKayit(a), rapor: ekranRapor, ayarlar: ekranAyarlar,
    giris: () => ekranPara("giris", a, b, c), cikis: () => ekranPara("cikis", a, b, c),
    cariler: ekranCariler, cari: () => ekranCari(a), "cari-form": () => ekranCariForm(a, b),
    isler: ekranIsler, is: () => ekranIs(a), "is-form": () => ekranIsForm(a, b, c, d), kesif: () => ekranKesif(a),
    paylasimlar: ekranPaylasimlar, "paylas-form": () => ekranPaylasForm(a, b), malzemeler: ekranMalzemeler, "katalog-ice": ekranKatalogIce, hatirlatmalar: ekranHatirlatmalar, stok: ekranStok,
    personel: () => a ? ekranPersonelKart(a) : ekranPersonel(), "personel-form": () => ekranPersonelForm(a), puantaj: () => ekranPuantaj(a), maas: () => ekranMaas(a, b),
    faturalar: ekranFaturalar, fatura: () => ekranFatura(a), "fatura-form": () => ekranFaturaForm(a, b, c),
    katalog: ekranKatalog, proje: () => ekranProje(a), "proje-form": () => ekranProjeForm(a, b), takvim: () => ekranTakvim(a), karlilik: ekranKarlilik, siparisler: ekranSiparisler, kesim: () => ekranKesim(a), cekler: () => ekranCekler(a), kdv: ekranKdv, fiyat: ekranFiyatGuncelle, araclar: ekranAraclar, etiket: () => ekranEtiket(a), qr: () => ekranQr(a),
    tahsilat: ekranTahsilat, ekstre: ekranEkstre, fiyatkarsilastir: ekranFiyatKarsilastir, kampanya: ekranKampanya, oncesonra: () => ekranOnceSonra(a), moduller: ekranModuller, kapasite: ekranKapasite, sabitgiderler: ekranSabitGiderler, ortakhesap: ekranOrtakHesap, paylasilan: ekranPaylasilan
  };
  document.body.classList.toggle("usta", !yetki.yonetici);
  document.body.classList.toggle("salt", !!yetki.salt);
  if(ekran !== "fatura-form") faturaOnDoldur = null;
  const s = (sayfalar[ekran] && (yetki.yonetici || USTA_EKRAN[ekran]) ? sayfalar[ekran] : ekranAna)();
  document.getElementById("uygulama").innerHTML =
    '<header class="ust">' +
      (s.geri ? '<button class="ikon-buton" onclick="geri()" aria-label="Geri">' + ik("sol") + '</button>' : '<div class="logo"><img src="logo-ikon.png" alt="Güneş Mobilya" class="logo-ikon"></div>') +
      '<h1>' + esc(s.baslik) + '</h1>' +
      durumYazisi() +
 zilDugmesi() +
      '<button class="ikon-buton arama-dugme" data-is="aramaAc" aria-label="Ara" title="Ara (Ctrl+K)">' + ik("ara") + '<span class="masaustu-yazi">Ara</span><kbd>Ctrl K</kbd></button>' +
      (!s.geri ? '<button class="ikon-buton sadece-mobil" data-git="takvim" aria-label="Takvim">' + ik("takvim") + '</button><button class="ikon-buton sadece-mobil yonetici-ozel" data-git="kasa" aria-label="Kasa">' + ik("kasa") + '</button><button class="ikon-buton sadece-mobil yonetici-ozel" data-git="personel" aria-label="Personel">' + ik("kisi") + '</button><button class="ikon-buton sadece-mobil" data-git="ayarlar" aria-label="Ayarlar">' + ik("ayar") + '</button>' : '') +
    '</header><main class="sayfa">' + (s.baskiLogo === false ? '' : '<div class="baski-logo"><img src="logo.png" alt="Güneş Mobilya"></div>') + cevrimdisiUyari() + s.html + '</main>';
  const sekme = {cari:"cariler", "cari-form":"cariler", is:"isler", "is-form":"isler", fatura:"faturalar", "fatura-form":"faturalar",
    kayit:"kasa", giris:"kasa", cikis:"kasa", proje:"katalog", "proje-form":"katalog", paylasimlar:"katalog", "paylas-form":"katalog", "katalog-ice":"katalog", kesif:"isler", "personel-form":"personel", puantaj:"personel", maas:"personel", malzemeler:"stok", karlilik:"rapor", siparisler:"stok", kesim:"isler", kdv:"rapor", fiyat:"stok", etiket:"isler", qr:"isler", tahsilat:"cariler", ekstre:"kasa", fiyatkarsilastir:"stok", kampanya:"cariler", oncesonra:"isler", moduller:"stok", kapasite:"isler", sabitgiderler:"kasa", ortakhesap:"rapor", paylasilan:"isler"}[ekran] || ekran;
  document.querySelectorAll("#menu button").forEach(x => x.classList.toggle("aktif", x.getAttribute("data-git") === sekme));
  if(s.sonra) s.sonra();
  window.scrollTo(0, 0);
}

/* ================= ORTAK PARÇALAR ================= */
const bos = (ikon, yazi) => '<div class="bos">' + ik(ikon) + yazi + '</div>';
const hizliButon = (yer, renk, ikon, yazi) => '<button data-git="' + yer + '"><span class="rozet ' + renk + '">' + ik(ikon) + '</span>' + yazi + '</button>';
const durumRozet = d => '<span class="etiket-rozet ' + (DURUM_SINIF[d] || "d-gri") + '">' + esc(d) + '</span>';
const bolum = (baslik, sag) => '<div class="bolum-baslik"><h2>' + baslik + '</h2>' + (sag || '') + '</div>';
const bilgiSatir = (k, v) => '<div class="bilgi-satir"><span>' + k + '</span><b>' + v + '</b></div>';
function bakiyeYazi(b){
  if(b > 0) return {yazi:"Bize borcu", sinif:"t-borc"};
  if(b < 0) return {yazi:"Bizim borcumuz", sinif:"t-cikis"};
  return {yazi:"Hesap kapalı", sinif:"t-soluk"};
}

function secenekler(ad, liste, secili){
  return '<div class="secenekler" data-ad="' + ad + '">' + liste.map(x =>
    '<button type="button" class="secenek' + (x === secili ? ' secili' : '') + '" data-deger="' + esc(x) + '">' + esc(x) + '</button>').join("") + '</div>';
}
let form = {};
function secenekBagla(){
  document.querySelectorAll(".secenekler[data-ad]").forEach(grup => {
    grup.addEventListener("click", e => {
      const b = e.target.closest(".secenek"); if(!b) return;
      grup.querySelectorAll(".secenek").forEach(x => x.classList.remove("secili"));
      b.classList.add("secili");
      form[grup.getAttribute("data-ad")] = b.getAttribute("data-deger");
    });
  });
}
function cariSecici(secili, zorunlu, oncelikTip){
  const l = veri.musteriler.slice().sort((a, b) => (a.tip === oncelikTip ? 0 : 1) - (b.tip === oncelikTip ? 0 : 1) || a.ad.localeCompare(b.ad, "tr"));
  return '<select id="cari" class="kutu"><option value="">' + (zorunlu ? "— Cari seçin —" : "— Yok —") + '</option>' +
    l.map(m => '<option value="' + m.id + '"' + (m.id === secili ? " selected" : "") + '>' + esc(m.ad) + (m.tip === "tedarikci" ? " (tedarikçi)" : "") + '</option>').join("") + '</select>';
}
function isSecenekleri(cariId, secili){
  const l = veri.is_emirleri.filter(ie => (!cariId || ie.musteriId === cariId) && (ac(ie) || ie.id === secili)).sort((a, b) => b.olusma - a.olusma);
  return '<option value="">— Yok —</option>' + l.map(ie => '<option value="' + ie.id + '"' + (ie.id === secili ? " selected" : "") + '>' +
    esc(ie.no + " · " + ie.baslik + (cariId ? "" : " (" + cariAdi(ie.musteriId) + ")")) + '</option>').join("");
}
// Cari değişince iş emri listesini o cariye göre süz.
function cariIsBagla(){
  const c = document.getElementById("cari"), i = document.getElementById("isEmri");
  if(c && i) c.addEventListener("change", () => { i.innerHTML = isSecenekleri(c.value, ""); if(form.cariDegisti) form.cariDegisti(); });
}
const tarihAlani = (id, etiket, t, ist) => '<label class="etiket" for="' + id + '">' + etiket + (ist ? ' <span class="ist">(isteğe bağlı)</span>' : '') + '</label><input id="' + id + '" type="date" class="kutu" value="' + (t || "") + '">';
function tutarAl(alanId){
  const v = sayiOku(document.getElementById(alanId).value);
  if(!(v > 0) || v > 1e9){ hataYaz("Lütfen geçerli bir tutar yazın."); document.getElementById(alanId).focus(); return null; }
  return yuvarla(v);
}

function hareketSatir(h, gizleCari){
  if(h.tur === "aktarim") return '<button class="satir" data-git="kayit/' + h.id + '"><span class="rozet r-gri">' + ik("dondur") + '</span><span class="orta"><div class="s1">Aktarım: ' + esc(ortakAdi(h.ortak) + " → " + ortakAdi(h.hedef)) + '</div>' +
    '<div class="s2">' + esc([h.aciklama, h.odeme, tarihYaz(h.tarih, true)].filter(Boolean).join(" · ")) + '</div></span><span class="tutar t-soluk">' + para(h.tutar) + '</span></button>';
  const cari = !gizleCari && h.musteriId ? cariAdi(h.musteriId) : "";
  const ie = h.isEmriId ? bul("is_emirleri", h.isEmriId) : null;
  const ikon = h.tur === "giris" ? "asagi" : h.tur === "cikis" ? "yukari" : "kisi";
  const isaret = h.tur === "giris" ? "+" : h.tur === "cikis" ? "−" : "";
  const baslik = h.tur === "borc" ? "Veresiye satış (eski kayıt)" : h.kategori + (ortakKategorisi(h.kategori) && h.hedef ? " · " + ortakAdi(h.hedef) : "");
  const kimde = h.tur !== "borc" && ortaklar().length && (h.ortak || kisiKasaVar()) ? (h.ortak ? ortakAdi(h.ortak) + "'de" : "Kasada") : "";
  const alt = [cari, ie ? ie.no : "", h.aciklama, h.tur !== "borc" ? h.odeme : "", kimde, tarihYaz(h.tarih, true)].filter(Boolean).join(" · ");
  return '<button class="satir" data-git="kayit/' + h.id + '"><span class="rozet r-' + (h.tur === "borc" ? "borc" : h.tur) + '">' + ik(ikon) + '</span>' +
    '<span class="orta"><div class="s1">' + esc(baslik) + '</div><div class="s2">' + esc(alt) + '</div></span>' +
    '<span class="tutar t-' + h.tur + '">' + isaret + para(h.tutar) + '</span></button>';
}
function faturaSatir(f, gizleCari){
  const od = odemeDurumu(f), ie = bul("is_emirleri", f.isEmriId);
  const alt = [gizleCari ? "" : cariAdi(f.musteriId), ie ? ie.no : "", tarihYaz(f.tarih, true)].filter(Boolean).join(" · ");
  return '<button class="satir" data-git="fatura/' + f.id + '"><span class="rozet ' + (f.tur === "satis" ? "r-giris" : "r-cikis") + '">' + ik("fatura") + '</span>' +
    '<span class="orta"><div class="s1">' + (f.tur === "satis" ? "Satış" : "Alış") + ' · ' + esc(f.no) + '</div><div class="s2">' + esc(alt) + '</div></span>' +
    '<span class="sag"><div class="tutar">' + para(f.toplam) + '</div><span class="etiket-rozet ' + od.sinif + '">' + od.yazi + '</span></span></button>';
}
function isSatir(ie, gizleCari){
  const gec = ac(ie) && ie.teslimTarihi && ie.teslimTarihi < bugun();
  const as = ie.asamalar || [], yap = as.filter(a => a.tamam).length;
  const alt = [gizleCari ? "" : cariAdi(ie.musteriId), ie.sorumlu, as.length ? yap + "/" + as.length + " aşama" : "",
    ie.teslimTarihi ? (gec ? "⚠ Gecikti: " : "Teslim: ") + tarihYaz(ie.teslimTarihi, true) : ""].filter(Boolean).join(" · ");
  return '<button class="satir" data-git="is/' + ie.id + '"><span class="rozet r-ana">' + ik("is") + '</span>' +
    '<span class="orta"><div class="s1">' + esc(ie.no + " · " + ie.baslik) + (ie.oncelik === "Acil" ? ' <span class="etiket-rozet d-kirmizi">Acil</span>' : '') + '</div><div class="s2"' + (gec ? ' style="color:#b91c1c"' : '') + '>' + esc(alt) + '</div></span>' +
    '<span class="sag">' + durumRozet(ie.durum) + (ie.tutar && yetki.yonetici ? '<div class="s2" style="margin-top:3px">' + para(ie.tutar) + '</div>' : '') + '</span></button>';
}
function aySecici(){
  const p = ayGoster.split("-");
  return '<div class="ay-sec"><button class="ikon-buton" data-is="ayDegistir" data-arg="-1" aria-label="Önceki ay">' + ik("sol") + '</button>' +
    '<strong>' + AYLAR[Number(p[1]) - 1] + ' ' + p[0] + '</strong>' +
    '<button class="ikon-buton" data-is="ayDegistir" data-arg="1" aria-label="Sonraki ay">' + ik("sag") + '</button></div>';
}
EYLEM.ayDegistir = (el, n) => {
  const p = ayGoster.split("-"), d = new Date(Number(p[0]), Number(p[1]) - 1 + Number(n), 1);
  ayGoster = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); ciz();
};
function filtreButonlari(ad, liste){
  return '<div class="secenekler">' + liste.map(f =>
    '<button class="secenek' + (filtre[ad] === f[0] ? " secili" : "") + '" data-is="filtre" data-arg="' + ad + '|' + f[0] + '">' + f[1] + '</button>').join("") + '</div>';
}
EYLEM.filtre = (el, arg) => { const [ad, d] = arg.split("|"); filtre[ad] = d; ciz(); };

/* ================= ANA SAYFA ================= */
// Usta ana sayfası: açık işler (kendine atananlar önce) ve teslim hatırlatmaları; para bilgisi yok.
function ekranAna(){
  if(!yetki.yonetici) return ekranUstaAna();
  const k = kasa(), bg = bugun();
  let gir = 0, cik = 0, alacak = 0, borc = 0;
  veri.hareketler.forEach(h => { if(h.tarih !== bg) return; if(h.tur === "giris") gir += h.tutar; else if(h.tur === "cikis") cik += h.tutar; });
  veri.musteriler.forEach(m => { const b = cariBakiye(m.id); if(b > 0) alacak += b; else borc -= b; });
  const acikIsler = veri.is_emirleri.filter(ac).sort((a, b) => (a.teslimTarihi || "9999") < (b.teslimTarihi || "9999") ? -1 : 1);
  const son = veri.hareketler.filter(h => h.tur !== "borc").sort(tarihSira).slice(0, 6);

  const hl = hatirlatmalar();
  // Kartlar Ayarlar → Ana sayfa'daki sıraya göre
  const kart = {
    yapilacak:() => hl.length ? bolum(ik("zil") + ' Yapılacaklar (' + hl.length + ')', '<button data-git="hatirlatmalar">' + (hl.length > 5 ? 'Tümü' : 'Bildirim ayarı') + '</button>') +
      '<div class="kart liste-kart" style="margin-bottom:12px">' + hl.slice(0, 5).map(hatirlatmaSatir).join("") + '</div>' : '',
    hedef:hedefKarti,
    randevu:() => { const r = randevular().filter(x => x.r.tarih === bg && x.ie.durum !== "İptal").sort((a, b) => (a.r.saat || "") < (b.r.saat || "") ? -1 : 1);
      return r.length ? bolum(ik("takvim") + ' Bugünkü randevular (' + r.length + ')', '<button data-git="takvim">Takvim</button>') + '<div class="bugun-randevu">' + r.map(x => randevuKarti(x)).join("") + '</div>' : ''; },
    kapasite:kapasiteKarti,
    ozet:() => '<div class="izgara dort">' +
      '<button class="kart genis-mobil" data-git="kasa"><div class="kart-baslik">Kasadaki para ' + ik("sag") + '</div><div class="buyuk-sayi">' + para(k.toplam) + '</div>' +
        '<div class="alt-bilgi">Nakit <b>' + para(k.nakit) + '</b> · Banka <b>' + para(k.banka) + '</b>' + (k.senet ? ' · Çek/Senet <b>' + para(k.senet) + '</b>' : '') + '</div>' + kisiKasaSatiri() + '</button>' +
      '<div class="kart ozet"><div class="kart-baslik">Bugün</div><div class="deger t-giris" style="font-size:16px">+' + para(gir) + '</div><div class="deger t-cikis" style="font-size:16px">−' + para(cik) + '</div></div>' +
      '<button class="kart ozet" data-git="cariler"><div class="kart-baslik"><span><span class="nokta" style="background:var(--borc)"></span>Alacağımız</span></div><div class="deger">' + para(alacak) + '</div></button>' +
      '<button class="kart ozet" data-git="cariler"><div class="kart-baslik"><span><span class="nokta" style="background:var(--cikis)"></span>Borcumuz</span></div><div class="deger">' + para(borc) + '</div></button>' +
      '</div>',
    hizli:() => yetki.salt ? '' : '<div class="hizli">' +
      hizliButon("giris", "r-giris", "asagi", "Para Girdi") + hizliButon("cikis", "r-cikis", "yukari", "Para Çıktı") +
      hizliButon("fatura-form/satis", "r-borc", "fatura", "Satış Faturası") + hizliButon("fatura-form/alis", "r-gri", "fatura", "Alış Faturası") +
      hizliButon("is-form", "r-ana", "is", "Yeni İş Emri") + hizliButon("is-form/-/-/-/kesif", "r-borc", "cetvel", "Ölçü / Keşif") + hizliButon("stok", "r-gri", "koli", "Stok") +
      '</div>',
    isler:() => bolum("Açık iş emirleri (" + acikIsler.length + ")", '<button data-git="isler">Tümü</button>') +
      '<div class="kart liste-kart">' + (acikIsler.length ? acikIsler.slice(0, 6).map(ie => isSatir(ie)).join("") : bos("is", "Açık iş emri yok.")) + '</div>',
    sonKasa:() => bolum("Son kasa hareketleri", '<button data-git="kasa">Tümü</button>') +
      '<div class="kart liste-kart">' + (son.length ? son.map(h => hareketSatir(h)).join("") : bos("kasa", "Henüz kayıt yok.")) + '</div>'
  };
  const sira = anaSayfaDuzeni().filter(x => !x.gizli).map(x => x.id);
  let html = yedekUyarisi() + (yetki.salt ? '<div class="bilgi-kutu" style="margin-top:0">Muhasebeci hesabı: kayıtları görebilir, değiştiremezsiniz. Aylık dosyalar: <b data-git="rapor" style="cursor:pointer">Rapor → Muhasebeci paketi</b></div>' : '');
  for(let i = 0; i < sira.length; i++){
    // Açık işler ile son kasa yan yana gelirse masaüstünde iki sütun
    const ikili = {isler:"sonKasa", sonKasa:"isler"}[sira[i]];
    if(ikili && sira[i + 1] === ikili){ html += '<div class="iki-sutun"><div>' + kart[sira[i]]() + '</div><div>' + kart[sira[i + 1]]() + '</div></div>'; i++; }
    else html += kart[sira[i]]();
  }
  return {baslik:"Güneş Mobilya", html};
}
function yedekUyarisi(){
  if(cevrimici || !veri.hareketler.length) return "";
  const ilk = Math.min(...veri.hareketler.map(h => h.olusma || Date.now()));
  const gun = sistem().yedekGun;
  if((Date.now() - (Number(ayarOku("sonYedek")) || ilk)) / 86400000 < gun) return "";
  return '<div class="uyari">Bilgiler sadece bu cihazda ve ' + gun + ' gündür yedek alınmadı. <b data-git="ayarlar/yedek" style="cursor:pointer;text-decoration:underline">Yedek al</b></div>';
}
