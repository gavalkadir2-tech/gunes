"use strict";
// Güneş Mobilya — sistem ayarlar
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= SİSTEM AYARLARI ================= */
// Firmanın ayarları "ayarlar" tablosunda "sistem" anahtarıyla (her cihazda aynı),
// cihaza ait olanlar (tema, yazı boyu, açılış sayfası, otomatik çıkış) bu cihazda saklanır.
const SISTEM_VARSAYILAN = {
  isOnEk:"İE-", satisOnEk:"S", alisOnEk:"A",
  kdvOranlari:[0, 1, 10, 20], varsayilanKdv:20,
  odeme:ODEME.slice(), asamalar:ASAMALAR.slice(), birimler:BIRIMLER.slice(), tesisat:TESISAT.slice(),
  teslimGun:2, vadeGun:3, teklifGun:2, yedekGun:7, paylasimSure:"30",
  copGun:30, logGun:365, efOnEk:"GNS", efEntegrator:"",
  ortaklar:[{id:"samet", ad:"Samet", pay:50, eposta:""}, {id:"ibrahim", ad:"İbrahim", pay:50, eposta:""}],
  anaRenk:"#dc7e03", moduller:{katalog:true, faturalar:true, personel:true, stok:true, rapor:true}
};
const MODUL_ADI = {katalog:"Katalog", faturalar:"Faturalar", personel:"Personel", stok:"Stok", rapor:"Rapor"};
const ANA_RENKLER = [["#dc7e03", "Güneş turuncusu"], ["#b91c1c", "Bordo"], ["#1d4ed8", "Mavi"], ["#0f766e", "Petrol yeşili"], ["#15803d", "Yeşil"], ["#7c3aed", "Mor"], ["#44403c", "Antrasit"]];
function sistem(){
  const a = veri.ayarlar.find(x => x.anahtar === "sistem"), d = a && a.deger && typeof a.deger === "object" ? a.deger : {};
  const s = Object.assign({}, SISTEM_VARSAYILAN, d);
  s.moduller = Object.assign({}, SISTEM_VARSAYILAN.moduller, d.moduller || {});
  if(!Array.isArray(s.ortaklar)) s.ortaklar = SISTEM_VARSAYILAN.ortaklar.map(o => Object.assign({}, o));
  ["odeme", "asamalar", "birimler", "tesisat", "kdvOranlari"].forEach(k => { if(!Array.isArray(s[k]) || !s[k].length) s[k] = SISTEM_VARSAYILAN[k].slice(); });
  return s;
}
async function sistemKaydet(degisen){
  const a = veri.ayarlar.find(x => x.anahtar === "sistem"), eski = a && a.deger && typeof a.deger === "object" ? a.deger : {};
  await Depo.kaydet("ayarlar", {anahtar:"sistem", deger:Object.assign({}, eski, degisen)});
}
const CIHAZ_VARSAYILAN = {tema:"acik", yazi:1, acilis:"ana", otoCikis:0, pin:"", kilitDk:5, satir:20, listeler:{}, sesKomut:1};
function cihaz(){ try{ return Object.assign({}, CIHAZ_VARSAYILAN, JSON.parse(ayarOku("cihaz") || "{}")); }catch(e){ return Object.assign({}, CIHAZ_VARSAYILAN); } }
function cihazKaydet(d){ ayarYaz("cihaz", JSON.stringify(Object.assign(cihaz(), d))); ayarlariUygula(); }
// İki rengi karıştırır (oran 0 → a, 1 → b)
function renkKaristir(a, b, oran){
  const c = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const x = c(a), y = c(b);
  return "#" + x.map((v, i) => ("0" + Math.round(v + (y[i] - v) * oran).toString(16)).slice(-2)).join("");
}
const koyuTema = () => { const t = cihaz().tema; return t === "koyu" || (t === "sistem" && matchMedia("(prefers-color-scheme: dark)").matches); };
function ayarlariUygula(){
  const s = sistem(), c = cihaz(), kok = document.documentElement;
  FIRMA = firma().ad || FIRMA_VARSAYILAN.ad;
  ODEME = s.odeme; ASAMALAR = s.asamalar; BIRIMLER = s.birimler; TESISAT = s.tesisat;
  KDV_ORANLARI = s.kdvOranlari.map(Number).sort((a, b) => a - b);
  const koyu = koyuTema(), renk = /^#[0-9a-f]{6}$/i.test(s.anaRenk) ? s.anaRenk : SISTEM_VARSAYILAN.anaRenk;
  kok.setAttribute("data-tema", koyu ? "koyu" : "acik");
  kok.style.setProperty("--ana", koyu ? renkKaristir(renk, "#ffffff", .15) : renk);
  kok.style.setProperty("--ana-koyu", koyu ? renkKaristir(renk, "#ffffff", .35) : renkKaristir(renk, "#000000", .2));
  kok.style.setProperty("--ana-acik", koyu ? renkKaristir(renk, "#1c1917", .75) : renkKaristir(renk, "#ffffff", .85));
  document.body.style.zoom = c.yazi && c.yazi !== 1 ? c.yazi : "";
  Object.keys(MODUL_ADI).forEach(m => document.body.classList.toggle("gizle-" + m, s.moduller[m] === false));
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if(cihaz().tema === "sistem") ayarlariUygula(); });
const varsayilanKdv = () => sistem().varsayilanKdv;

// Hareketsiz kalınca otomatik çıkış (paylaşılan bilgisayar / telefon için)
let sonHareket = Date.now();
["click", "keydown", "touchstart", "scroll"].forEach(o => window.addEventListener(o, () => { sonHareket = Date.now(); }, {passive:true}));
setInterval(() => {
  const dk = cihaz().otoCikis;
  if(!dk || !cevrimici || !hazir || !oturum || Date.now() - sonHareket < dk * 60000) return;
  hazir = false;
  Promise.resolve(logla("cikis", "oturum", "", "Otomatik çıkış (" + dk + " dk hareketsiz)")).finally(() => sb.auth.signOut().then(() => {
    oturum = null; veri = bosVeri(); history.replaceState(null, "", "#ana"); girisEkrani("Uzun süre işlem yapılmadığı için çıkış yapıldı.");
  }));
}, 30000);

/* ================= İŞLEM GEÇMİŞİ ================= */
const ISLEM_ADI = {ekle:"Ekledi", guncelle:"Değiştirdi", sil:"Sildi", geri:"Çöpten geri yükledi", kalici:"Kalıcı sildi", giris:"Giriş yaptı", cikis:"Çıkış yaptı",
  yedek:"Yedek aldı", yedekYukle:"Yedekten yükledi", dosya:"Dosya işlemi"};
const ISLEM_RENK = {ekle:"d-yesil", guncelle:"d-mavi", sil:"d-kirmizi", geri:"d-sari", kalici:"d-kirmizi", giris:"d-gri", cikis:"d-gri", yedek:"d-koyu", yedekYukle:"d-koyu", dosya:"d-gri"};
const TABLO_ADI = {musteriler:"Cari", is_emirleri:"İş emri", is_notlari:"İş notu", dosyalar:"Dosya", faturalar:"Fatura", hareketler:"Kasa", ayarlar:"Ayarlar",
  katalog:"Katalog", katalog_gorseller:"Katalog fotoğrafı", paylasimlar:"Müşteri bağlantısı", personel:"Personel", puantaj:"Puantaj", personel_hareket:"Personel hesabı",
  stok_hareket:"Stok", taksitler:"Taksit", siparisler:"Malzeme siparişi", cekler:"Çek / senet", arac_kayit:"Araç", kullanicilar:"Kullanıcı", oturum:"Oturum", cop_kutusu:"Çöp kutusu", yedek:"Yedek"};
const AYAR_ADI = {firma:"Firma bilgileri", sistem:"Sistem ayarları", kategoriler:"Gelir / gider kategorileri", katalogKategorileri:"Katalog kategorileri",
  malzemeler:"Malzeme fiyat listesi", personelAyar:"Personel hesaplama ayarları", plakalar:"Plaka ölçüleri (kesim)", araclar:"Araçlar", hatirlatmaGecmisi:"Hatırlatma geçmişi"};
const ALAN_ADI = {ortak:"Kasa (kimde)", hedef:"Ortak / hedef kasa", ortaklar:"Ortaklar", ad:"Ad", tip:"Tür", telefon:"Telefon", adres:"Adres", vergiNo:"Vergi no", no:"No", musteriId:"Cari", baslik:"Başlık", durum:"Durum", teslimTarihi:"Teslim tarihi",
  tutar:"Tutar", aciklama:"Açıklama", oncelik:"Öncelik", sorumlu:"Sorumlu", kalemler:"Kalemler", asamalar:"Aşamalar", teklif:"Teklif", kesif:"Ölçü / keşif", metin:"Not",
  tur:"Tür", kategori:"Kategori", tarih:"Tarih", vade:"Vade", toplam:"Toplam", araToplam:"Ara toplam", kdvToplam:"KDV", odeme:"Ödeme şekli", isEmriId:"İş emri", faturaId:"Fatura",
  malzeme:"Malzeme", olcu:"Ölçü", fiyat:"Fiyat", gorev:"Görev", iban:"IBAN", giris:"İşe giriş", cikis:"Ayrılış", ucretTipi:"Ücret tipi", ucret:"Ücret", izinHakki:"İzin hakkı",
  notlar:"Notlar", mesai:"Mesai", miktar:"Miktar", sira:"Sıra", bitis:"Bitiş", donem:"Dönem", yol:"Dosya yolu", boyut:"Boyut", projeId:"Proje",
  isOnEk:"İş emri no öneki", satisOnEk:"Satış faturası öneki", alisOnEk:"Alış faturası öneki", kdvOranlari:"KDV oranları", varsayilanKdv:"Varsayılan KDV",
  teslimGun:"Teslim hatırlatma (gün)", vadeGun:"Vade hatırlatma (gün)", teklifGun:"Teklif hatırlatma (gün)", yedekGun:"Yedek hatırlatma (gün)", paylasimSure:"Bağlantı süresi",
  copGun:"Çöp kutusu süresi (gün)", logGun:"Geçmiş saklama (gün)", anaRenk:"Ana renk", moduller:"Modüller", haftaGun:"Haftalık çalışma günü", gunSaat:"Günlük saat",
  mesaiKat:"Mesai katsayısı", gecerlilik:"Teklif geçerliliği", kar:"Kâr oranı", teklifNotu:"Teklif notu", faturaNotu:"Fatura notu", eposta:"E-posta", web:"Web sitesi",
  vergiDairesi:"Vergi dairesi", banka:"Banka", giris_:"Gelir kategorileri", cikis_:"Gider kategorileri"};
function kayitBasligi(t, k){
  if(!k) return "";
  const ad = (tb, id) => { const x = bul(tb, id); return x ? x.ad : ""; };
  switch(t){
    case "musteriler": case "personel": case "dosyalar": case "katalog_gorseller": return k.ad || "";
    case "is_emirleri": return [k.no, k.baslik].filter(Boolean).join(" ");
    case "is_notlari": { const ie = bul("is_emirleri", k.isEmriId); return (ie ? ie.no + ": " : "") + String(k.metin || "").slice(0, 80); }
    case "faturalar": return [k.no, cariAdi(k.musteriId), para(k.toplam || 0)].filter(Boolean).join(" · ");
    case "hareketler": return ({giris:"Giriş", cikis:"Çıkış", borc:"Borç"}[k.tur] || k.tur) + " " + para(k.tutar || 0) + [k.kategori, cariAdi(k.musteriId), k.aciklama].filter(Boolean).map(x => " · " + x).join("");
    case "ayarlar": return AYAR_ADI[k.anahtar] || k.anahtar;
    case "katalog": case "paylasimlar": return k.baslik || "";
    case "puantaj": { const d = PUANTAJ.find(x => x[0] === k.durum); return ad("personel", k.personelId) + " · " + tarihYaz(k.tarih) + " · " + (d ? d[1] : k.durum || "") + (k.mesai ? " · " + k.mesai + " saat mesai" : ""); }
    case "personel_hareket": return ad("personel", k.personelId) + " · " + ((PH_TUR[k.tur] || [k.tur])[0]) + " " + para(k.tutar || 0);
    case "stok_hareket": { const m = malzemeListesi().find(x => x.id === k.malzemeId); return (m ? m.ad + " · " : "") + (STOK_TUR[k.tur] || k.tur) + " " + k.miktar; }
    case "arac_kayit": return [(aracBul(k.aracId) || {}).plaka, ARAC_TUR[k.tur] || k.tur, k.tutar ? para(k.tutar) : "", tarihYaz(k.tarih || bugun(), true)].filter(Boolean).join(" · ");
    case "siparisler": return [k.no, cariAdi(k.tedarikciId)].filter(Boolean).join(" · ");
    case "cekler": return (k.belge === "senet" ? "Senet " : "Çek ") + (k.no || "") + " · " + para(k.tutar || 0) + " · " + (cariAdi(k.musteriId) || k.kesideci || "") + " · vade " + tarihYaz(k.vade || bugun(), true);
    case "taksitler": { const f = bul("faturalar", k.faturaId); return (f ? f.no + " · " : "") + k.sira + ". taksit " + para(k.tutar || 0); }
  }
  return k.id || "";
}
function degerYaz(a, v){
  if(v == null || v === "") return "—";
  if(a === "musteriId") return cariAdi(v) || v;
  if(a === "isEmriId"){ const ie = bul("is_emirleri", v); return ie ? ie.no : v; }
  if(typeof v === "boolean") return v ? "Açık" : "Kapalı";
  if(Array.isArray(v)) return v.every(x => typeof x !== "object") ? v.join(", ").slice(0, 160) : v.length + " satır";
  if(typeof v === "object") return Object.entries(v).filter(([, x]) => typeof x !== "object").map(([k, x]) => (ALAN_ADI[k] || MODUL_ADI[k] || k) + ": " + degerYaz(k, x)).join(", ").slice(0, 160) || "…";
  if(typeof v === "number" && /tutar|toplam|fiyat|ucret|maliyet/i.test(a)) return para(v);
  return String(v).slice(0, 160);
}
function kayitFarki(t, eski, yeni){
  // Ayarlarda değerin içindeki alanlar karşılaştırılır
  if(t === "ayarlar"){
    const x = eski.deger, y = yeni.deger;
    if(x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y)){
      const ad = k => eski.anahtar === "kategoriler" ? (k === "giris" ? "giris_" : k === "cikis" ? "cikis_" : k) : k;
      return alanFarki(Object.fromEntries(Object.entries(x).map(([k, v]) => [ad(k), v])), Object.fromEntries(Object.entries(y).map(([k, v]) => [ad(k), v])));
    }
    return JSON.stringify(x) === JSON.stringify(y) ? {} : {"Değer":[degerYaz("deger", x), degerYaz("deger", y)]};
  }
  return alanFarki(eski, yeni);
}
function alanFarki(eski, yeni){
  const d = {};
  Object.keys(Object.assign({}, eski, yeni)).forEach(a => {
    if(a === "olusma" || a === "id" || a[0] === "_") return;
    const x = eski[a], y = yeni[a];
    const tj = v => JSON.stringify(v, (k_, z) => z === "" || z === null ? undefined : z);
    if(tj(x) === tj(y) || ((x == null || x === "") && (y == null || y === ""))) return;
    if(typeof x === "number" && typeof y === "number" && Math.abs(x - y) < 1e-9) return;
    let ex = degerYaz(a, x), ey = degerYaz(a, y);
    if(ex === ey && typeof x === "object"){ ex = "(önceki)"; ey = "(değişti)"; }
    d[ALAN_ADI[a] || a] = [ex, ey];
  });
  return d;
}
function cihazAdi(){
  const u = navigator.userAgent;
  const os = /iPhone/.test(u) ? "iPhone" : /iPad|Macintosh.*Mobile/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "Diğer";
  const tr = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /YaBrowser/.test(u) ? "Yandex" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "Tarayıcı";
  return os + " · " + tr + (matchMedia("(display-mode: standalone)").matches ? " (uygulama)" : "");
}
const kullaniciGorunen = () => yetki.ad || kullaniciAdi() || (cevrimici ? "" : "Bu cihaz");
const LOG_YEREL = "islemKaydi";
let logSessiz = 0;   // toplu işlemlerde (yedek yükleme, çöpten geri alma) tek tek kayıt tutulmaz
const eksikTabloHatasi = e => /does not exist|schema cache|Could not find/i.test((e && e.message) || "");
function logla(islem, tablo, kayitId, baslik, ayrinti){
  if(logSessiz) return;
  const k = {id:yeniId(), zaman:Date.now(), kullanici:benimEposta(), ad:kullaniciGorunen(), cihaz:cihazAdi(), islem, tablo, kayit_id:String(kayitId || ""),
    baslik:String(baslik || "").slice(0, 300), ayrinti:ayrinti || {}};
  if(!cevrimici){
    try{ const l = JSON.parse(ayarOku(LOG_YEREL) || "[]"); l.unshift(k); ayarYaz(LOG_YEREL, JSON.stringify(l.slice(0, 5000))); }catch(e){}
    return;
  }
  if(!sb || eksikTablo.islem_kaydi) return;
  return bulutYaz({tip:"insert", tablo:"islem_kaydi", satirlar:k}).catch(e => { if(eksikTabloHatasi(e)) eksikTablo.islem_kaydi = 1; });
}
async function logGetir(f, bas){
  const gun = Number(f.gun) || 0, ara = (f.ara || "").toLocaleLowerCase("tr");
  if(!cevrimici){
    let l = []; try{ l = JSON.parse(ayarOku(LOG_YEREL) || "[]"); }catch(e){}
    l = l.filter(x => (!gun || x.zaman >= Date.now() - gun * 86400000) && (!f.kullanici || x.ad === f.kullanici) && (!f.islem || x.islem === f.islem) &&
      (!f.tablo || x.tablo === f.tablo) && (!ara || (x.baslik + " " + x.ad).toLocaleLowerCase("tr").indexOf(ara) >= 0));
    return l.slice(bas, bas + 100);
  }
  let q = sb.from("islem_kaydi").select("*").order("zaman", {ascending:false}).range(bas, bas + 99);
  if(gun) q = q.gte("zaman", Date.now() - gun * 86400000);
  if(f.kullanici) q = q.eq("kullanici", f.kullanici);
  if(f.islem) q = q.eq("islem", f.islem);
  if(f.tablo) q = q.eq("tablo", f.tablo);
  if(ara) q = q.ilike("baslik", "%" + ara.replace(/[%_,()\\]/g, " ") + "%");
  const r = await q;
  if(r.error){ if(eksikTabloHatasi(r.error)) eksikTablo.islem_kaydi = 1; throw r.error; }
  delete eksikTablo.islem_kaydi;
  return r.data.map(x => Object.assign(x, {zaman:Number(x.zaman)}));
}
// Saklama süresi dolan geçmiş kayıtlarını siler (en az 30 gün tutulur)
async function logTemizle(){
  const gun = Number(sistem().logGun) || 0; if(!gun || !yetki.yonetici) return;
  const sinir = Date.now() - Math.max(30, gun) * 86400000;
  if(!cevrimici){ try{ ayarYaz(LOG_YEREL, JSON.stringify(JSON.parse(ayarOku(LOG_YEREL) || "[]").filter(x => x.zaman >= sinir))); }catch(e){} return; }
  if(!eksikTablo.islem_kaydi) await sb.from("islem_kaydi").delete().lt("zaman", sinir).then(() => {}, () => {});
}

/* ================= ÇÖP KUTUSU ================= */
// Veritabanında birlikte silinen (1) veya bağı boşaltılan (0) kayıtlar
const BAGLI = {
  is_emirleri: [["is_notlari", "isEmriId", 1], ["dosyalar", "isEmriId", 1], ["faturalar", "isEmriId", 0], ["hareketler", "isEmriId", 0], ["stok_hareket", "isEmriId", 0], ["arac_kayit", "isEmriId", 0]],
  katalog: [["katalog_gorseller", "projeId", 1]],
  personel: [["puantaj", "personelId", 1], ["personel_hareket", "personelId", 1]],
  faturalar: [["taksitler", "faturaId", 1], ["hareketler", "faturaId", 0], ["siparisler", "faturaId", 0]],
  musteriler: [["paylasimlar", "musteriId", 0], ["siparisler", "tedarikciId", 0], ["cekler", "musteriId", 0], ["cekler", "ciroId", 0]],
  hareketler: [["personel_hareket", "hareketId", 0], ["cekler", "hareketId", 0], ["arac_kayit", "hareketId", 0]]
};
// Geri yüklerken olması gereken üst kayıtlar
const GEREKLI = {is_emirleri:{musteriId:"musteriler"}, faturalar:{musteriId:"musteriler"}, is_notlari:{isEmriId:"is_emirleri"}, dosyalar:{isEmriId:"is_emirleri"},
  katalog_gorseller:{projeId:"katalog"}, puantaj:{personelId:"personel"}, personel_hareket:{personelId:"personel"}, taksitler:{faturaId:"faturalar"}};
const ISTEGE_BAGLI = {isEmriId:"is_emirleri", faturaId:"faturalar", musteriId:"musteriler", hareketId:"hareketler", tedarikciId:"musteriler", ciroId:"musteriler"};
const DOSYA_KAYIT = {dosyalar:1, katalog_gorseller:1};
let cop = [], copGrubu = null;
const COP_YEREL = "copKutusu";
function bagliTopla(t, k, kayitlar, kopan){
  (BAGLI[t] || []).forEach(([ct, alan, birlikte]) => (veri[ct] || []).forEach(c => {
    if(c[alan] !== k.id) return;
    if(!birlikte) kopan.push({t:ct, id:c.id, alan, deger:k.id});
    else if(!kayitlar.some(x => x.k === c)){ kayitlar.push({t:ct, k:c}); bagliTopla(ct, c, kayitlar, kopan); }
  }));
}
function copGirdisi(kayitlar, kopan, baslik){
  const ana = kayitlar[0];
  return {id:yeniId(), baslik: baslik || (TABLO_ADI[ana.t] || ana.t) + ": " + kayitBasligi(ana.t, ana.k), tur:ana.t,
    icerik:{kayitlar:JSON.parse(JSON.stringify(kayitlar)), kopan:kopan.slice()}, silen:benimEposta(), silenAd:kullaniciGorunen(), silinme:Date.now()};
}
// Birden çok silmeyi tek çöp kaydında toplar (örn. taksit planı)
async function copGrubuyla(baslik, fn){
  if(copGrubu) return fn();
  const g = copGrubu = {kayitlar:[], kopan:[]};
  try{ await fn(); }
  finally{
    copGrubu = null;
    if(g.kayitlar.length && !(await copKaydet(copGirdisi(g.kayitlar, g.kopan, baslik)).catch(() => false))) await dosyalariKaldir(g.kayitlar);
  }
}
function copYerelYaz(){ ayarYaz(COP_YEREL, JSON.stringify(cop)); }
async function copYukle(){
  if(!cevrimici){ try{ cop = JSON.parse(ayarOku(COP_YEREL) || "[]"); }catch(e){ cop = []; } return; }
  if(!yetki.yonetici){ cop = []; return; }
  const r = await sb.from("cop_kutusu").select("*").order("silinme", {ascending:false});
  if(r.error){ if(eksikTabloHatasi(r.error)) eksikTablo.cop_kutusu = 1; cop = []; return; }
  delete eksikTablo.cop_kutusu;
  cop = r.data.map(x => ({id:x.id, baslik:x.baslik, tur:x.tur, icerik:x.icerik || {}, silen:x.silen, silenAd:x.silen_ad, silinme:Number(x.silinme)}));
}
// Çöpe yazılamazsa (tablo kurulmamış) false döner; kayıt yine silinir
async function copKaydet(e){
  if(!cevrimici){ cop.unshift(e); copYerelYaz(); return true; }
  if(eksikTablo.cop_kutusu) return false;
  try{ await bulutYaz({tip:"insert", tablo:"cop_kutusu", satirlar:{id:e.id, baslik:e.baslik, tur:e.tur, icerik:e.icerik, silen:e.silen, silen_ad:e.silenAd, silinme:e.silinme}}); }
  catch(h){ if(eksikTabloHatasi(h)){ eksikTablo.cop_kutusu = 1; return false; } throw h; }
  if(yetki.yonetici) cop.unshift(e);
  return true;
}
async function copKaldir(id){
  if(cevrimici) await bulutYaz({tip:"delete", tablo:"cop_kutusu", anahtar:"id", id});
  cop = cop.filter(x => x.id !== id);
  if(!cevrimici) copYerelYaz();
}
async function dosyalariKaldir(kayitlar){
  if(!cevrimici) return;
  const yollar = kayitlar.filter(x => DOSYA_KAYIT[x.t] && x.k.yol).map(x => x.k.yol);
  if(yollar.length) await sb.storage.from(BUCKET).remove(yollar).catch(() => {});
}
const copKisaBaslik = e => (e.baslik || "").replace(/^[^:]+: /, "");
const copKalanGun = e => Math.max(0, Math.ceil((e.silinme + sistem().copGun * 86400000 - Date.now()) / 86400000));
async function copGeriYukle(e){
  const l = (e.icerik.kayitlar || []).slice().sort((a, b) => TABLOLAR.indexOf(a.t) - TABLOLAR.indexOf(b.t));
  const icinde = (t, id) => l.some(x => x.t === t && x.k.id === id);
  for(const {t, k} of l) for(const [alan, ut] of Object.entries(GEREKLI[t] || {})){
    if(!k[alan] || bul(ut, k[alan]) || icinde(ut, k[alan])) continue;
    const ust = cop.find(c => c !== e && (c.icerik.kayitlar || []).some(x => x.t === ut && x.k.id === k[alan]));
    throw new Error(ust ? "Önce “" + ust.baslik + "” geri yüklenmeli; o da çöp kutusunda." : "Bağlı olduğu " + (TABLO_ADI[ut] || ut).toLocaleLowerCase("tr") + " artık yok, bu kayıt geri yüklenemez.");
  }
  logSessiz++;
  try{
    for(const t of TABLOLAR){
      const k = l.filter(x => x.t === t).map(x => {
        const y = Object.assign({}, x.k);
        for(const [a, ut] of Object.entries(ISTEGE_BAGLI)) if(y[a] && !(GEREKLI[t] || {})[a] && !bul(ut, y[a]) && !icinde(ut, y[a])) y[a] = null;
        return y;
      });
      if(k.length) await Depo.kaydet(t, k);
    }
    for(const x of e.icerik.kopan || []){ const y = bul(x.t, x.id); if(y && !y[x.alan]) await Depo.kaydet(x.t, Object.assign({}, y, {[x.alan]:x.deger})); }
  } finally { logSessiz--; }
  await copKaldir(e.id);
  logla("geri", e.tur, l.length ? l[0].k.id : "", copKisaBaslik(e), l.length > 1 ? {"Kayıt sayısı":String(l.length)} : {});
}
async function copKaliciSil(e, neden){
  await dosyalariKaldir(e.icerik.kayitlar || []);
  await copKaldir(e.id);
  logla("kalici", e.tur, "", copKisaBaslik(e), neden ? {"Neden":neden} : {});
}
// Süresi dolanları kalıcı siler (yönetici uygulamayı açtığında)
async function copTemizle(){
  if(!yetki.yonetici) return;
  const sinir = Date.now() - sistem().copGun * 86400000;
  for(const e of cop.filter(x => x.silinme < sinir)) await copKaliciSil(e, sistem().copGun + " gün doldu").catch(() => {});
}

/* ================= AYARLAR EKRANI ================= */
const AYAR_BOLUM = [
  ["firma", "Firma bilgileri", "ev", "Ad, iletişim, vergi, banka"],
  ["ortaklar", "Ortaklar", "kisiler", "Samet, İbrahim · pay oranları"],
  ["teklif", "Teklif ve fatura", "fatura", "KDV, numaralar, notlar, kâr"],
  ["is", "İş emirleri", "is", "Aşamalar, keşif listesi, hatırlatmalar"],
  ["liste", "Listeler ve kategoriler", "kalem", "Ödeme şekli, kategori, birim, malzeme"],
  ["personel", "Personel", "kisi", "Çalışma günü, saat, mesai"],
  ["kullanicilar", "Kullanıcılar ve yetkiler", "kisiler", "Yönetici ve usta hesapları"],
  ["gorunum", "Görünüm ve modüller", "resim", "Tema, renk, yazı boyutu, menü"],
  ["bildirim", "Bildirimler", "zil", "Zil, ses, sessiz saatler, yapılacaklar"],
  ["guvenlik", "Güvenlik", "kilit", "Ekran kilidi (PIN), otomatik çıkış"],
  ["mesajlar", "Mesaj şablonları", "mesaj", "WhatsApp mesajları"],
  ["belge", "Yazdırma ve belgeler", "fatura", "Teklif çıktısı: başlık, logo, imza"],
  ["takvim", "Takvim ve randevular", "takvim", "Varsayılan saat, süre, çalışma günleri"],
  ["kapasite", "Atölye kapasitesi", "grafik", "Ekip sayısı, iş süreleri"],
  ["anasayfa", "Ana sayfa", "ev", "Kartların sırası ve görünürlüğü"],
  ["yedek", "Yedek ve veri", "bulut", "Yedek, geri yükleme, ayar aktarımı"],
  ["cop", "Çöp kutusu", "sil", "Silinenler, geri yükleme"],
  ["gecmis", "İşlem geçmişi", "gecmis", "Kim, ne zaman, ne yaptı"],
  ["hedef", "Aylık hedefler", "grafik", "Sipariş, kâr, teklif dönüşümü"],
  ["hesap", "Hesap", "cikis", "Oturum"]
];
const USTA_AYAR = {gorunum:1, bildirim:1, guvenlik:1, hesap:1};
const kartBaslik = (b, ek) => '<div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600">' + b + (ek ? ' <span class="ist" style="font-weight:400">' + ek + '</span>' : '') + '</div>';
const sayiAlan = (id, etiket, v, ek) => '<div><label class="etiket" for="' + id + '">' + etiket + (ek ? ' <span class="ist">' + ek + '</span>' : '') + '</label><input id="' + id + '" class="kutu" inputmode="numeric" value="' + esc(v) + '"></div>';
const yaziAlan = (id, etiket, v, o = {}) => '<div><label class="etiket" for="' + id + '">' + etiket + (o.ek ? ' <span class="ist">' + o.ek + '</span>' : '') + '</label><input id="' + id + '" class="kutu"' +
  (o.tip ? ' inputmode="' + o.tip + '"' : '') + ' maxlength="' + (o.max || 120) + '" value="' + esc(v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></div>';
// Sıralanabilir liste düzenleyici (ödeme şekilleri, aşamalar …): sistem ayarındaki dizi
function listeKarti(anahtar, baslik, aciklama, o = {}){
  const l = sistem()[anahtar];
  return '<div class="kart">' + kartBaslik(baslik) + (aciklama ? '<div class="alt-bilgi" style="margin:0 0 8px">' + aciklama + '</div>' : '') +
    '<div class="ayar-liste">' + l.map((x, i) => '<div class="ayar-oge"><span>' + esc(o.yaz ? o.yaz(x) : x) + '</span>' +
      '<button data-is="listeTasi" data-arg="' + anahtar + '|' + i + '|-1" aria-label="Yukarı"' + (i ? '' : ' disabled') + '>↑</button>' +
      '<button data-is="listeTasi" data-arg="' + anahtar + '|' + i + '|1" aria-label="Aşağı"' + (i < l.length - 1 ? '' : ' disabled') + '>↓</button>' +
      (o.kilitli && o.kilitli.indexOf(x) >= 0 ? '<button disabled title="Silinemez">' + ik("kilit") + '</button>' : '<button data-is="listeSil" data-arg="' + anahtar + '|' + i + '" aria-label="Sil">' + ik("x") + '</button>') + '</div>').join("") + '</div>' +
    '<div class="buton-sira" style="flex-wrap:nowrap"><input id="yeni-' + anahtar + '" class="kutu" maxlength="50"' + (o.sayi ? ' inputmode="decimal"' : '') + ' placeholder="' + esc(o.ph || "Yeni ekle") + '">' +
    '<button class="buton kucuk" data-is="listeEkle" data-arg="' + anahtar + '">' + ik("arti") + 'Ekle</button></div>' +
    '<button class="baglanti" data-is="listeSifirla" data-arg="' + anahtar + '">Varsayılana döndür</button></div>';
}
EYLEM.listeEkle = (btn, anahtar) => {
  let v = deger("yeni-" + anahtar); if(!v) return;
  const l = sistem()[anahtar].slice();
  if(anahtar === "kdvOranlari"){ v = sayiOku(v); if(!(v >= 0 && v <= 100)) return uyar("Oranı kontrol edin", "0 ile 100 arası bir sayı yazın."); }
  if(l.some(x => String(x).toLocaleLowerCase("tr") === String(v).toLocaleLowerCase("tr"))) return uyar("Bu zaten listede", "");
  l.push(v);
  islem(btn, async () => { await sistemKaydet({[anahtar]:l}); bildir("Eklendi"); ciz(); });
};
EYLEM.listeSil = (btn, arg) => {
  const [anahtar, i] = arg.split("|"), l = sistem()[anahtar].slice();
  if(l.length <= 1) return uyar("En az bir seçenek kalmalı", "");
  const x = l.splice(Number(i), 1)[0];
  if(anahtar === "kdvOranlari" && Number(x) === Number(sistem().varsayilanKdv)) return uyar("Varsayılan KDV oranı silinemez", "Önce başka bir oranı varsayılan yapın.");
  onayla("“" + x + "” listeden kaldırılsın mı?", "Eski kayıtlar etkilenmez.", "Kaldır", () => islem(null, async () => { await sistemKaydet({[anahtar]:l}); ciz(); }));
};
EYLEM.listeTasi = (btn, arg) => {
  const [anahtar, i, y] = arg.split("|"), l = sistem()[anahtar].slice(), a = Number(i), b = a + Number(y);
  if(b < 0 || b >= l.length) return;
  [l[a], l[b]] = [l[b], l[a]];
  islem(btn, async () => { await sistemKaydet({[anahtar]:l}); ciz(); });
};
EYLEM.listeSifirla = (btn, anahtar) => onayla("Liste varsayılana dönsün mü?", "", "Döndür", () => islem(null, async () => { await sistemKaydet({[anahtar]:SISTEM_VARSAYILAN[anahtar].slice()}); bildir("Varsayılana döndü"); ciz(); }), false);

// Sayı alanlarını okuyup sınırları kontrol eder: [[id, anahtar, en az, en çok, ad]]
function sayilariOku(l){
  const d = {};
  for(const [id, k, a, b, ad] of l){
    const v = sayiOku(deger(id));
    if(!(v >= a && v <= b)){ uyar(ad + " alanını kontrol edin", a + " ile " + b + " arası olmalı."); return null; }
    d[k] = Math.round(v * 100) / 100;
  }
  return d;
}

function ayarFirma(){
  const fr = firma();
  return '<div class="kart">' + kartBaslik("Firma bilgileri", "(teklif, fatura, müşteri sayfası ve WhatsApp mesajlarında görünür)") +
    yaziAlan("fAd", "Firma adı", fr.ad, {max:80}) +
    '<div class="iki-alan">' + yaziAlan("fTelefon", "Telefon / WhatsApp", fr.telefon, {tip:"tel", max:30, ph:"05xx xxx xx xx"}) + yaziAlan("fEposta", "E-posta", fr.eposta, {tip:"email", max:80}) + '</div>' +
    yaziAlan("fAdres", "Adres", fr.adres, {max:200}) +
    '<div class="iki-alan">' + yaziAlan("fIl", "İl", fr.il, {max:40, ph:"Manisa"}) + yaziAlan("fIlce", "İlçe", fr.ilce, {max:40, ph:"Akhisar"}) + '</div>' +
    '<div class="iki-alan">' + yaziAlan("fWeb", "Web / Instagram", fr.web, {max:120}) + yaziAlan("fVergiDairesi", "Vergi dairesi", fr.vergiDairesi, {max:60}) + '</div>' +
    '<div class="iki-alan">' + yaziAlan("fVergiNo", "Vergi / T.C. no", fr.vergiNo, {tip:"numeric", max:20}) + yaziAlan("fBanka", "Banka", fr.banka, {max:60}) + '</div>' +
    yaziAlan("fIban", "IBAN", fr.iban, {max:40}) +
    '<button class="buton" data-is="firmaKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
function ayarTeklif(){
  const fr = firma(), s = sistem();
  return '<div class="kart">' + kartBaslik("Teklif") +
      '<div class="iki-alan">' + sayiAlan("fGecerlilik", "Teklif geçerliliği", fr.gecerlilik, "(gün)") + sayiAlan("fKar", "Varsayılan kâr oranı", sayiYaz(fr.kar), "(%)") + '</div>' +
      '<label class="etiket" for="fNot">Teklif alt notu <span class="ist">(örn: Fiyatlara montaj ve nakliye dahildir.)</span></label><textarea id="fNot" class="kutu" maxlength="600" style="min-height:64px">' + esc(fr.teklifNotu) + '</textarea>' +
      '<label class="etiket" for="fFNot">Fatura alt notu <span class="ist">(yazdırılan faturanın altında)</span></label><textarea id="fFNot" class="kutu" maxlength="600" style="min-height:64px">' + esc(fr.faturaNotu) + '</textarea>' +
      '<button class="buton" data-is="teklifKaydet">' + ik("tamam") + 'Kaydet</button></div>' +
    '<div class="kart">' + kartBaslik("Numaralandırma") +
      '<div class="alt-bilgi" style="margin:0">Yeni kayıtlar önekten sonra sıradaki numarayı alır. Fatura numarasına yıl da eklenir (örn. ' + esc(s.satisOnEk) + new Date().getFullYear() + '-0001).</div>' +
      '<div class="izgara uc" style="margin:0">' + yaziAlan("nIs", "İş emri öneki", s.isOnEk, {max:10}) + yaziAlan("nSatis", "Satış faturası öneki", s.satisOnEk, {max:10}) + yaziAlan("nAlis", "Alış faturası öneki", s.alisOnEk, {max:10}) + '</div>' +
      '<label class="etiket" for="nKdv">Varsayılan KDV oranı</label><select id="nKdv" class="kutu">' + KDV_ORANLARI.map(o => '<option value="' + o + '"' + (o === Number(s.varsayilanKdv) ? ' selected' : '') + '>%' + o + '</option>').join("") + '</select>' +
      '<button class="buton" data-is="numaraKaydet">' + ik("tamam") + 'Kaydet</button></div>' +
    listeKarti("kdvOranlari", "KDV oranları", "Teklif ve faturada seçilebilen oranlar.", {sayi:true, yaz:x => "%" + x, ph:"Örn: 8"}) +
    '<div class="kart">' + kartBaslik("e-Fatura / e-Arşiv") +
      '<div class="alt-bilgi" style="margin:0">Satış faturasında <b>e-Fatura / e-Arşiv XML</b> düğmesi GİB\'in UBL-TR 1.2 dosyasını hazırlar; özel entegratörünüzün paneline “XML içe aktar” ile yüklersiniz, imza ve GİB\'e gönderim orada yapılır. ' +
        'Doğrudan otomatik gönderim için entegratörünüzün API bilgileri ve sunucu tarafı bir bağlantı gerekir.</div>' +
      '<div class="iki-alan">' + yaziAlan("efOn", "GİB fatura no öneki", s.efOnEk, {max:3, ph:"GNS", ek:"(3 harf, entegratörde tanımlı seri)"}) + yaziAlan("efEnt", "Entegratör", s.efEntegrator, {max:40, ph:"Paraşüt, Uyumsoft…"}) + '</div>' +
      '<button class="buton ikincil" data-is="efKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
function ayarIs(){
  const s = sistem();
  return listeKarti("asamalar", "Üretim aşamaları", "Yeni iş emrinde işaretli gelen aşamalar; sırası iş takibindeki sıradır.", {ph:"Örn: Cam takımı"}) +
    listeKarti("tesisat", "Keşif: tesisat ve engeller", "Ölçü / keşif formundaki işaretlenebilir maddeler.", {ph:"Örn: Klima"}) +
    '<div class="kart">' + kartBaslik("Hatırlatmalar", "(Yapılacaklar listesi ve bildirimler)") +
      '<div class="izgara uc" style="margin:0">' + sayiAlan("hTeslim", "Teslimden kaç gün önce", s.teslimGun) + sayiAlan("hVade", "Vadeden / taksitten kaç gün önce", s.vadeGun) + sayiAlan("hTeklif", "Teklif bitiminden kaç gün önce", s.teklifGun) + '</div>' +
      '<label class="etiket">Müşteri bağlantısı varsayılan süresi</label><select id="hSure" class="kutu">' + PAYLASIM_SURE.map(x => '<option value="' + x[0] + '"' + (x[0] === String(s.paylasimSure) ? ' selected' : '') + '>' + x[1] + '</option>').join("") + '</select>' +
      '<button class="buton" data-is="hatirlatmaKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
function ayarListe(){
  const katKart = (tur, baslik) => '<div class="kart">' + kartBaslik(baslik) +
    '<div class="kategori-liste">' + kategoriler(tur).map((k, i) => '<span>' + esc(k) + '<button data-is="katSil" data-arg="' + tur + '|' + i + '" aria-label="Sil">' + ik("x") + '</button></span>').join("") + '</div>' +
    '<div class="buton-sira" style="flex-wrap:nowrap"><input id="yeniKat-' + tur + '" class="kutu" maxlength="40" placeholder="Yeni kategori adı"><button class="buton kucuk" data-is="katEkle" data-arg="' + tur + '">' + ik("arti") + 'Ekle</button></div></div>';
  return listeKarti("odeme", "Ödeme şekilleri", "“Nakit” kasada nakit, “Çek / Senet” senet, diğerleri banka olarak toplanır.", {kilitli:["Nakit", "Çek / Senet"], ph:"Örn: Kredi kartı (taksitli)"}) +
    katKart("giris", "Gelir kategorileri") + katKart("cikis", "Gider kategorileri") +
    '<button class="buton ikincil" data-is="katSifirla" style="margin:0 0 12px">Gelir / gider kategorilerini varsayılana döndür</button>' +
    '<div class="kart">' + kartBaslik("Katalog kategorileri") +
      '<div class="kategori-liste">' + katalogListesi().map((k, i) => '<span>' + esc(k) + '<button data-is="kKatSil" data-arg="' + i + '" aria-label="Sil">' + ik("x") + '</button></span>').join("") + '</div>' +
      '<div class="buton-sira" style="flex-wrap:nowrap"><input id="yeniKat-katalog" class="kutu" maxlength="40" placeholder="Örn: Yatak odası"><button class="buton kucuk" data-is="kKatEkle">' + ik("arti") + 'Ekle</button></div></div>' +
    listeKarti("birimler", "Malzeme birimleri", "", {ph:"Örn: paket"}) +
    '<div class="kart">' + kartBaslik("Malzeme fiyat listesi") +
      '<div class="alt-bilgi" style="margin:0">' + malzemeListesi().length + ' malzeme kayıtlı. Teklifte “Malzemeden hesapla” bu fiyatları kullanır.</div>' +
      '<div class="buton-sira"><button class="buton ikincil" style="margin:0" data-git="malzemeler">' + ik("kalem") + 'Listeyi düzenle</button><button class="buton ikincil" style="margin:0" data-git="fiyat">' + ik("grafik") + 'Toplu fiyat güncelle</button></div></div>';
}
function ayarGorunum(){
  const s = sistem(), c = cihaz();
  const sec = (ad, l, v) => '<div class="secenekler" data-ad="' + ad + '">' + l.map(([d, y]) => '<button type="button" class="secenek' + (String(d) === String(v) ? ' secili' : '') + '" data-is="cihazSec" data-arg="' + ad + '|' + d + '">' + y + '</button>').join("") + '</div>';
  return '<div class="kart">' + kartBaslik("Bu cihaz", "(sadece bu telefon / bilgisayarda geçerli)") +
      '<label class="etiket">Tema</label>' + sec("tema", [["acik", "Açık"], ["koyu", "Koyu"], ["sistem", "Cihaza göre"]], c.tema) +
      '<label class="etiket">Yazı ve düğme boyutu</label>' + sec("yazi", [["0.9", "Küçük"], ["1", "Normal"], ["1.1", "Büyük"], ["1.2", "Çok büyük"]], c.yazi) +
      '<label class="etiket">Açılış sayfası</label>' + sec("acilis", [["ana", "Ana sayfa"], ["isler", "İş emirleri"], ["katalog", "Katalog"]].concat(yetki.yonetici ? [["kasa", "Kasa"], ["hatirlatmalar", "Yapılacaklar"]] : []), c.acilis) +
      '<label class="etiket">Sesli komut balonu <span class="ist">(sağ altta; Ctrl+Shift+Boşluk)</span></label>' + sec("sesKomut", [[1, "Göster"], [0, "Gizle"]], Number(c.sesKomut)) +
      '<label class="etiket">Listelerde gösterilecek satır</label>' + sec("satir", SATIR_SECENEK.map(n => [n, n ? n + " satır" : "Tümü"]), c.satir) +
      '<div class="alt-bilgi">Her listenin üstündeki “Sırala” ve “Göster” kutularıyla o liste ayrıca ayarlanır.' +
        (Object.keys(c.listeler || {}).length ? ' <b data-is="listeGorunumSifirla" style="cursor:pointer;color:var(--borc)">Liste ayarlarını sıfırla</b>' : '') + '</div>' +
    '</div>' +
    (yetki.yonetici ? '<div class="kart">' + kartBaslik("Firma rengi", "(herkeste)") +
      '<div class="renk-sec">' + ANA_RENKLER.map(([r, ad]) => '<button data-is="anaRenk" data-arg="' + r + '" title="' + ad + '" aria-label="' + ad + '" class="' + (r === s.anaRenk ? 'secili' : '') + '" style="background:' + r + '"></button>').join("") +
        '<label title="Özel renk" class="ozel"><input type="color" value="' + esc(s.anaRenk) + '" onchange="EYLEM.anaRenk(this, this.value)"></label></div></div>' +
    '<div class="kart">' + kartBaslik("Menüde görünen modüller", "(herkeste)") +
      '<div class="alt-bilgi" style="margin:0 0 6px">Kullanmadığınız bölümleri gizleyin; kayıtları silinmez, tekrar açınca geri gelir.</div>' +
      Object.entries(MODUL_ADI).map(([m, ad]) => '<label class="satir" style="cursor:pointer"><input type="checkbox" data-modul="' + m + '"' + (s.moduller[m] !== false ? ' checked' : '') + ' style="width:20px;height:20px"><span class="orta"><div class="s1">' + ad + '</div></span></label>').join("") +
    '</div>' : '');
}
function ayarGuvenlik(){
  const c = cihaz();
  return '<div class="kart">' + kartBaslik("Ekran kilidi", "(bu cihaz)") +
      '<div class="alt-bilgi" style="margin:0 0 8px">Uygulama açılırken ve bir süre işlem yapılmayınca PIN sorulur. Ortak kullanılan bilgisayar veya atölyedeki tablet için.</div>' +
      (c.pin ? '<div style="display:flex;gap:8px;align-items:center;color:var(--giris);font-weight:500;margin-bottom:8px">' + ik("kilit") + 'Ekran kilidi açık</div>' +
        '<label class="etiket">Kilitlenme süresi</label><div class="secenekler">' + [[1, "1 dk"], [5, "5 dk"], [15, "15 dk"], [30, "30 dk"], [0, "Yalnız açılışta"]].map(([d, y]) => '<button type="button" class="secenek' + (d === Number(c.kilitDk) ? ' secili' : '') + '" data-is="cihazSec" data-arg="kilitDk|' + d + '">' + y + '</button>').join("") + '</div>' : '') +
      '<div class="buton-sira"><button class="buton ' + (c.pin ? 'ikincil' : '') + '" data-is="pinAyarla">' + ik("kilit") + (c.pin ? "PIN'i değiştir / kaldır" : "PIN belirle") + '</button>' +
        (c.pin ? '<button class="buton ikincil" data-is="simdiKilitle">Şimdi kilitle</button>' : '') + '</div></div>' +
    (cevrimici ? '<div class="kart">' + kartBaslik("Otomatik çıkış", "(bu cihaz)") +
      '<div class="alt-bilgi" style="margin:0 0 8px">Ortak kullanılan bilgisayar veya telefonda, işlem yapılmazsa oturum kendiliğinden kapanır.</div>' +
      '<div class="secenekler">' + [[0, "Kapalı"], [15, "15 dk"], [30, "30 dk"], [60, "1 saat"], [240, "4 saat"]].map(([d, y]) => '<button type="button" class="secenek' + (d === Number(c.otoCikis) ? ' secili' : '') + '" data-is="cihazSec" data-arg="otoCikis|' + d + '">' + y + '</button>').join("") + '</div></div>' : '');
}
// Hangi SQL güncellemesi eksik? (uygulamanın açılışta bulduğu eksik tablo / sütunlardan)
function veritabaniEksikleri(){
  if(!cevrimici) return [];
  const l = [], ekle = (no, ne) => { if(!l.some(x => x[0] === no)) l.push([no, ne]); };
  const T = {is_notlari:[2, "İş notları ve dosyalar"], dosyalar:[2, "İş notları ve dosyalar"], katalog:[3, "Katalog"], katalog_gorseller:[3, "Katalog"], paylasimlar:[4, "Müşteri bağlantısı"],
    personel:[5, "Personel"], puantaj:[5, "Personel"], personel_hareket:[5, "Personel"], stok_hareket:[7, "Stok, taksit"], taksitler:[7, "Stok, taksit"], cop_kutusu:[9, "Çöp kutusu, işlem geçmişi"],
    islem_kaydi:[9, "Çöp kutusu, işlem geçmişi"], siparisler:[10, "Takvim, kesim, sipariş, çek"], cekler:[10, "Takvim, kesim, sipariş, çek"], arac_kayit:[12, "Otomatik yedek, araç takibi"], yedekler:[12, "Otomatik yedek, araç takibi"], is_emri_fiyat:[13, "Fiyat gizleme, çakışma uyarısı, hızlı açılış"]};
  Object.keys(eksikTablo).forEach(t => { if(T[t]) ekle(T[t][0], T[t][1]); });
  Object.values(eksikSutun).forEach(no => ekle(no, {4:"Teklif / keşif bilgileri", 10:"Takvim, kesim, sipariş, çek", 11:"Ortaklar ve kişi kasaları"}[no] || ""));
  if(!yetki.kurulu) ekle(6, "Kullanıcı yetkileri (usta / yönetici)");
  if(!surumVar) ekle(13, "Fiyat gizleme, çakışma uyarısı, hızlı açılış");
  return l.sort((a, b) => a[0] - b[0]);
}
function ayarYedek(){
  const son = Number(ayarOku("sonYedek")), eski = cevrimici ? yerelOku() : null, s = sistem();
  let html = '';
  if(cevrimici){
    const e = veritabaniEksikleri();
    html += '<div class="kart">' + kartBaslik("Veritabanı durumu") + (e.length ?
      '<div class="alt-bilgi" style="margin:0 0 6px">Bazı özellikler için Supabase güncellemesi eksik:</div>' + e.map(([no, ne]) => bilgiSatir(esc(ne), '<span class="t-cikis">supabase-guncelleme-' + no + '.sql</span>')).join("") +
      '<div class="bilgi-kutu">En kolayı: Supabase → <b>SQL Editor</b> → <b>New query</b> → <b>supabase-tum-kurulum.sql</b> dosyasının tamamını yapıştırıp <b>Run</b>; sonra sayfayı yenileyin. Tekrar çalıştırmak zarar vermez.</div>' :
      '<div style="display:flex;gap:8px;align-items:center;color:var(--giris);font-weight:500">' + ik("tamam") + 'Veritabanı güncel; tüm özellikler açık.</div>') + '</div>';
  }
  if(cevrimici && TABLOLAR.some(t => t !== "ayarlar" && eski[t].length))
    html += '<div class="kart">' + kartBaslik("Bu cihazdaki eski kayıtlar") + '<div>Bu cihazda bulut öncesinden kalan <b>' + eski.hareketler.length + ' kayıt</b> ve <b>' + eski.musteriler.length + ' cari</b> var.</div>' +
      '<div class="hata" id="hata"></div><button class="buton" data-is="buluttaAktar">' + ik("bulut") + 'Buluta aktar</button></div>';
  if(!cevrimici) html += '<div class="uyari">Bilgiler şu an <b>sadece bu cihazda</b> saklanıyor.</div>';
  html += depolamaKarti() + fotoKarti() + videoArsivKarti();
  html += sunucuYedekKarti();
  html += '<div class="kart">' + kartBaslik("Yedek") + '<div>Tüm kayıtları küçük bir dosya olarak indirir (fotoğraf ve videolar dahil değildir).</div>' +
    '<div class="alt-bilgi">Son yedek (bu cihazda): <b>' + (son ? tarihYaz(tarihStr(new Date(son))) : "Hiç alınmadı") + '</b></div>' +
    '<div class="buton-sira" style="margin-top:16px"><button class="buton" data-is="yedekAl">' + ik("indir") + 'Yedek al</button>' +
    '<button class="buton ikincil" onclick="document.getElementById(\'yedekDosya\').click()">' + ik("yukle") + 'Geri yükle</button></div>' +
    '<input type="file" id="yedekDosya" accept=".json,.zip,application/json,application/zip" style="display:none" onchange="yedekYukle(this)">' +
    (cevrimici ? '' : '<div class="iki-alan">' + sayiAlan("yGun", "Yedek hatırlatması", s.yedekGun, "(gün)") + '<div><label class="etiket">&nbsp;</label><button class="buton ikincil" style="margin:0" data-is="yedekGunKaydet">Kaydet</button></div></div>') + '</div>';
  if(cevrimici) html += '<div class="kart">' + kartBaslik("Dosyalı yedek (ZIP)") + '<div>Kayıtlarla birlikte tüm fotoğraf ve belgeleri tek ZIP dosyası olarak indirir. “Geri yükle” bu ZIP\'i de kabul eder.</div>' +
    '<div class="alt-bilgi">Şu an ' + (veri.dosyalar.length + veri.katalog_gorseller.length) + ' dosya (' + mbYaz(veri.dosyalar.concat(veri.katalog_gorseller).reduce((t, d) => t + d.boyut, 0)) + ') var; ' + veri.dosyalar.filter(d => dosyaTuru(d) === "v").length + ' tanesi video.</div>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="videoDahil"> Videoları da dahil et <span class="ist" style="color:var(--soluk)">(dosya çok büyüyebilir)</span></label>' +
    '<button class="buton ikincil" data-is="zipYedek">' + ik("indir") + 'Dosyalı yedek al (ZIP)</button></div>';
  html += '<div class="kart">' + kartBaslik("Ayarları aktar") + '<div>Firma bilgileri, listeler, kategoriler, malzeme fiyatları ve sistem ayarlarını tek dosyaya alır; başka bir hesaba / cihaza yükleyebilirsiniz.</div>' +
    '<div class="buton-sira" style="margin-top:12px"><button class="buton ikincil" data-is="ayarDisa">' + ik("indir") + 'Ayarları indir</button>' +
    '<button class="buton ikincil" onclick="document.getElementById(\'ayarDosya\').click()">' + ik("yukle") + 'Ayarları yükle</button></div>' +
    '<input type="file" id="ayarDosya" accept=".json,application/json" style="display:none" onchange="ayarIceAktar(this)"></div>' +
    '<div class="kart">' + kartBaslik("Varsayılan ayarlar") + '<div>Sistem ayarlarını (numaralar, listeler, hatırlatma süreleri, şablonlar, belge ve takvim ayarları, görünüm) ilk haline döndürür. Firma bilgileri, ortaklar, hedefler ve kayıtlar değişmez.</div>' +
    '<button class="buton tehlike" data-is="ayarSifirla">' + ik("dondur") + 'Tüm ayarları varsayılana döndür</button></div>';
  html += '<div class="kart">' + bilgiSatir("Cari", veri.musteriler.length) + bilgiSatir("İş emri", veri.is_emirleri.length) + bilgiSatir("Fatura", veri.faturalar.length) + bilgiSatir("Kasa hareketi", veri.hareketler.length) +
    bilgiSatir("Katalog projesi", veri.katalog.length + " (" + veri.katalog_gorseller.length + " fotoğraf)") + bilgiSatir("Personel", veri.personel.length) + bilgiSatir("Çöp kutusunda", cop.length) + '</div>';
  return html;
}
function ayarCop(){
  if(cevrimici && eksikTablo.cop_kutusu) return '<div class="uyari">Çöp kutusu için Supabase\'de <b>supabase-guncelleme-9.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin. O zamana kadar silinenler doğrudan silinir.</div>';
  const s = sistem(), ara = (filtre.cop || "").toLocaleLowerCase("tr");
  const l = cop.filter(e => !ara || (e.baslik + " " + e.silenAd).toLocaleLowerCase("tr").indexOf(ara) >= 0);
  return '<div class="kart">' + kartBaslik("Çöp kutusu", "(" + cop.length + " kayıt)") +
      '<div class="alt-bilgi" style="margin:0 0 8px">Silinen kayıtlar bağlı notları, dosyaları ve taksitleriyle birlikte burada <b>' + s.copGun + ' gün</b> bekler; bu sürede geri yüklenmezse kalıcı olarak silinir.</div>' +
      '<div class="iki-alan">' + sayiAlan("copGun", "Bekleme süresi", s.copGun, "(gün, 7–365)") + '<div><label class="etiket">&nbsp;</label><button class="buton ikincil" style="margin:0" data-is="copGunKaydet">Kaydet</button></div></div></div>' +
    (cop.length ? '<div class="ust-arac"><input class="kutu" id="copAra" placeholder="Çöpte ara…" value="' + esc(filtre.cop || "") + '" style="max-width:320px">' +
      '<button class="buton tehlike kucuk" style="margin:0;width:auto" data-is="copBosalt">' + ik("sil") + 'Çöpü boşalt</button></div>' : '') +
    '<div class="kart liste-kart">' + (l.length ? l.map(e => {
      const n = (e.icerik.kayitlar || []).length, kalan = copKalanGun(e);
      return '<div class="satir"><span class="rozet r-gri">' + ik("sil") + '</span><span class="orta"><div class="s1">' + esc(e.baslik) + '</div>' +
        '<div class="s2">' + esc(tamZaman(e.silinme) + (e.silenAd || e.silen ? " · " + (e.silenAd || e.silen.replace("@gunesmobilya.app", "")) : "") + (n > 1 ? " · " + (n - 1) + " bağlı kayıtla" : "")) +
        ' · <span class="' + (kalan <= 3 ? 't-cikis' : '') + '">' + (kalan ? kalan + " gün sonra silinecek" : "bugün silinecek") + '</span></div></span>' +
        '<button class="ikon-buton" data-is="copGeri" data-arg="' + e.id + '">' + ik("dondur") + '<span class="masaustu-yazi">Geri yükle</span></button>' +
        '<button class="ikon-buton" data-is="copSil" data-arg="' + e.id + '" aria-label="Kalıcı sil">' + ik("x") + '</button></div>';
    }).join("") : bos("sil", cop.length ? "Aramaya uyan kayıt yok." : "Çöp kutusu boş.")) + '</div>';
}
function ayarGecmis(){
  if(cevrimici && eksikTablo.islem_kaydi) return '<div class="uyari">İşlem geçmişi için Supabase\'de <b>supabase-guncelleme-9.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>';
  const f = gecmisFiltre, s = sistem();
  const sec = (id, l, v) => '<select id="' + id + '" class="kutu">' + l.map(([d, y]) => '<option value="' + esc(d) + '"' + (String(d) === String(v || "") ? ' selected' : '') + '>' + esc(y) + '</option>').join("") + '</select>';
  const kisiler = [["", "Herkes"]].concat(cevrimici ? yetki.liste.map(k => [k.eposta, (k.ad || k.eposta.replace("@gunesmobilya.app", ""))]) : []);
  if(cevrimici && benimEposta() && !kisiler.some(k => k[0] === benimEposta())) kisiler.push([benimEposta(), kullaniciAdi() + " (siz)"]);
  return '<div class="kart gecmis-filtre"><div class="izgara dort" style="margin:0">' +
      '<div><label class="etiket" for="gGun">Zaman</label>' + sec("gGun", [["1", "Son 24 saat"], ["7", "Son 7 gün"], ["30", "Son 30 gün"], ["365", "Son 1 yıl"], ["0", "Tümü"]], f.gun) + '</div>' +
      (cevrimici ? '<div><label class="etiket" for="gKisi">Kişi</label>' + sec("gKisi", kisiler, f.kullanici) + '</div>' : '') +
      '<div><label class="etiket" for="gIslem">İşlem</label>' + sec("gIslem", [["", "Tümü"]].concat(Object.entries(ISLEM_ADI)), f.islem) + '</div>' +
      '<div><label class="etiket" for="gTablo">Bölüm</label>' + sec("gTablo", [["", "Tümü"]].concat(Object.entries(TABLO_ADI)), f.tablo) + '</div></div>' +
      '<div class="buton-sira" style="flex-wrap:nowrap;margin-top:10px"><input id="gAra" class="kutu" placeholder="Kayıtta ara (örn. iş emri no, müşteri adı)" value="' + esc(f.ara || "") + '">' +
      '<button class="buton kucuk" data-is="gecmisAra">' + ik("ara") + 'Ara</button><button class="buton ikincil kucuk" data-is="gecmisCsv" title="Excel için indir">' + ik("indir") + 'CSV</button></div>' +
      '<div class="alt-bilgi">Kayıtlar ' + (Number(s.logGun) ? s.logGun + " gün" : "süresiz") + ' saklanır. Kişi ve zaman sunucuda yazılır; geçmiş düzenlenemez.' +
        ' <button class="baglanti" data-is="logGunDegis">Süreyi değiştir</button></div></div>' +
    '<div class="kart liste-kart" id="gecmisListe"><div class="bos"><span class="donen"></span> Yükleniyor…</div></div>' +
    '<button class="buton ikincil" id="gecmisDaha" style="display:none" data-is="gecmisDaha">Daha eski kayıtlar</button>';
}
let gecmisFiltre = {gun:"7"}, gecmisSatirlar = [];
const tamZaman = ms => { const d = new Date(ms); return d.getDate() + " " + AYLAR[d.getMonth()].slice(0, 3) + " " + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
function gecmisSatir(x, i){
  const ayr = Object.entries(x.ayrinti || {});
  const kim = x.ad || (x.kullanici || "").replace("@gunesmobilya.app", "") || "—";
  return '<details class="gecmis-satir"' + (ayr.length ? '' : ' data-bos') + '><summary><span class="etiket-rozet ' + (ISLEM_RENK[x.islem] || "d-gri") + '">' + esc(ISLEM_ADI[x.islem] || x.islem) + '</span>' +
    '<span class="orta"><div class="s1">' + esc((TABLO_ADI[x.tablo] || x.tablo || "") + (x.baslik ? ": " + x.baslik : "")) + '</div>' +
    '<div class="s2">' + ik("kisi") + esc(kim) + ' · ' + esc(tamZaman(x.zaman)) + ' · ' + esc(kisaCihaz(x.cihaz)) + '</div></span></summary>' +
    (ayr.length ? '<div class="gecmis-ayrinti">' + ayr.map(([a, v]) => '<div><b>' + esc(a) + '</b>' + (Array.isArray(v) ? '<span class="eski">' + esc(v[0]) + '</span> → <span>' + esc(v[1]) + '</span>' : '<span>' + esc(v) + '</span>') + '</div>').join("") + '</div>' : '') +
    '</details>';
}
// Sunucunun yazdığı tarayıcı bilgisi (uygulama göndermediyse) kısaltılır
const kisaCihaz = c => !c ? "cihaz bilinmiyor" : c.length > 60 ? c.replace(/^Mozilla\/5\.0 \(([^)]*)\).*$/, "$1").slice(0, 60) : c;
async function gecmisYukle(ekle){
  const k = document.getElementById("gecmisListe"); if(!k) return;
  try{
    const l = await logGetir(gecmisFiltre, ekle ? gecmisSatirlar.length : 0);
    gecmisSatirlar = ekle ? gecmisSatirlar.concat(l) : l;
    k.innerHTML = gecmisSatirlar.length ? gecmisSatirlar.map(gecmisSatir).join("") : bos("gecmis", "Bu filtrelere uyan işlem yok.");
    document.getElementById("gecmisDaha").style.display = l.length === 100 ? "" : "none";
  }catch(e){ k.innerHTML = '<div class="bos">' + esc(hataMesaji(e)) + '</div>'; }
}
function gecmisFiltreOku(){
  gecmisFiltre = {gun:deger("gGun"), kullanici:deger("gKisi"), islem:deger("gIslem"), tablo:deger("gTablo"), ara:deger("gAra")};
}
EYLEM.gecmisAra = () => { gecmisFiltreOku(); gecmisYukle(false); };
EYLEM.gecmisDaha = () => gecmisYukle(true);
EYLEM.gecmisCsv = () => {
  const h = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const satirlar = [["Zaman", "Kişi", "E-posta", "Cihaz", "İşlem", "Bölüm", "Kayıt", "Ayrıntı"]].concat(gecmisSatirlar.map(x => [tamZaman(x.zaman), x.ad, x.kullanici, x.cihaz,
    ISLEM_ADI[x.islem] || x.islem, TABLO_ADI[x.tablo] || x.tablo, x.baslik, Object.entries(x.ayrinti || {}).map(([a, v]) => a + ": " + (Array.isArray(v) ? v[0] + " → " + v[1] : v)).join(" | ")]));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + satirlar.map(r => r.map(h).join(";")).join("\r\n")], {type:"text/csv;charset=utf-8"}));
  a.download = "islem-gecmisi-" + bugun() + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
EYLEM.logGunDegis = () => {
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere"><p>İşlem geçmişi ne kadar saklansın?</p><div class="alt-bilgi">Süresi dolan kayıtlar yönetici uygulamayı açtığında silinir. En az 30 gün.</div>' +
    '<select id="logGunSec" class="kutu" style="margin-top:10px">' + [[90, "3 ay"], [180, "6 ay"], [365, "1 yıl"], [730, "2 yıl"], [1825, "5 yıl"], [0, "Süresiz"]].map(([d, y]) => '<option value="' + d + '"' + (d === Number(sistem().logGun) ? ' selected' : '') + '>' + y + '</option>').join("") + '</select>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="evet">Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if(b && b.getAttribute("data-c") === "evet"){ const v = Number(p.querySelector("select").value); p.remove(); islem(null, async () => { await sistemKaydet({logGun:v}); bildir("Kaydedildi"); ciz(); }); }
    else if(b || e.target === p) p.remove();
  });
  document.body.appendChild(p);
};
function ayarHesap(){
  return '<div class="kart">' + kartBaslik("Hesap") + '<div style="font-weight:500">' + esc(kullaniciGorunen() || "—") + '</div>' +
    '<div class="alt-bilgi">' + (cevrimici ? (yetki.yonetici ? "Yönetici" : "Usta yetkisi: iş emirleri, aşamalar, notlar, fotoğraflar, ölçü ve katalog.") + " · Bilgiler bulutta; telefon ve bilgisayarda aynı bilgiler görünür." : "Bilgiler sadece bu cihazda saklanıyor.") + '</div>' +
    '<div class="alt-bilgi">Bu cihaz: ' + esc(cihazAdi()) + '</div>' +
    (cevrimici ? '<button class="buton ikincil" data-is="cikisYap">' + ik("cikis") + 'Çıkış yap</button>' : '') + '</div>';
}
function ekranAyarlar(){
  const masaustu = matchMedia("(min-width:900px)").matches;
  const izinli = b => ((yetki.yonetici && !yetki.salt) || USTA_AYAR[b[0]]) && (b[0] !== "kullanicilar" || cevrimici) && (b[0] !== "hesap" || cevrimici || !yetki.yonetici);
  const bolumler = AYAR_BOLUM.filter(izinli);
  let b = yol()[1];
  if(!bolumler.some(x => x[0] === b)) b = masaustu ? bolumler[0][0] : null;
  const ozet = x => x[0] === "cop" ? (cop.length ? cop.length + " kayıt" : "Boş") : x[0] === "yedek" && veritabaniEksikleri().length ? "⚠ Veritabanı güncellemesi eksik" : x[3];
  const menu = '<div class="ayar-menu' + (b ? '' : ' tam') + '"><input class="kutu ayar-ara" id="ayarAra" type="search" placeholder="Ayarlarda ara… (KDV, PIN, şablon)" autocomplete="off">' +
    bolumler.map(x => '<button data-git="ayarlar/' + x[0] + '" data-anahtar="' + esc((x[1] + " " + x[3] + " " + (AYAR_ANAHTAR[x[0]] || "")).toLocaleLowerCase("tr")) + '" class="' + (x[0] === b ? 'aktif' : '') + '">' +
    '<span class="rozet r-gri">' + ik(x[2]) + '</span><span class="orta"><div class="s1">' + x[1] + '</div><div class="s2">' + esc(ozet(x)) + '</div></span>' + ik("sag") + '</button>').join("") + '<div class="bos ayar-yok" style="display:none">Eşleşen ayar yok</div>' +
    (yetki.yonetici ? '<button class="baglanti" style="margin:14px 4px" data-git="ayarlar/gecmis">' + ik("gecmis") + ' Ayar değişiklik geçmişi</button>' : '') + '</div>';
  if(!b) return {baslik:"Ayarlar", html:menu};
  const icerik = {hedef:ayarHedef, ortaklar:ayarOrtaklar, firma:ayarFirma, teklif:ayarTeklif, is:ayarIs, liste:ayarListe, personel:() => personelAyarKarti().replace('style="margin-top:12px"', ''), kullanicilar:kullaniciKarti,
    gorunum:ayarGorunum, bildirim:ayarBildirim, guvenlik:ayarGuvenlik, mesajlar:ayarMesajlar, belge:ayarBelge, takvim:ayarTakvim, kapasite:ayarKapasite, anasayfa:ayarAnaSayfa, yedek:ayarYedek, cop:ayarCop, gecmis:ayarGecmis, hesap:ayarHesap}[b]();
  const baslik = bolumler.find(x => x[0] === b)[1];
  const sonra = () => {
    if(b === "gecmis") gecmisYukle(false);
    if(b === "bildirim" && pushDurumu == null && cevrimici) pushDurumGetir().then(() => { if(yol()[1] === "bildirim") ciz(); }).catch(() => { pushDurumu = {}; });
    if(b === "yedek" && cevrimici && sunucuYedekleri == null && !eksikTablo.yedekler) sunucuYedekleriGetir().then(() => { if(yol()[1] === "yedek") ciz(); }).catch(() => { sunucuYedekleri = []; });
    if(b === "cop"){ const a = document.getElementById("copAra"); if(a) a.addEventListener("input", () => { filtre.cop = a.value; const p = a.selectionStart; ciz(); const y = document.getElementById("copAra"); y.focus(); y.setSelectionRange(p, p); }); }
    document.querySelectorAll("[data-modul]").forEach(k => k.addEventListener("change", () => {
      const m = Object.assign({}, sistem().moduller, {[k.getAttribute("data-modul")]:k.checked});
      islem(null, async () => { await sistemKaydet({moduller:m}); bildir("Kaydedildi"); });
    }));
  };
  if(masaustu) return {baslik:"Ayarlar", html:'<div class="ayar-duzen">' + menu + '<div class="ayar-icerik"><h2 class="ayar-baslik">' + baslik + '</h2>' + icerik + '</div></div>', sonra};
  return {baslik, geri:true, html:icerik, sonra};
}
EYLEM.listeGorunumSifirla = () => { cihazKaydet({listeler:{}}); bildir("Listeler varsayılana döndü"); ciz(); };
EYLEM.cihazSec = (btn, arg) => {
  const [k, v] = arg.split("|");
  cihazKaydet({[k]:k === "tema" || k === "acilis" ? v : Number(v)}); bildir("Bu cihazda kaydedildi"); ciz();
};
EYLEM.anaRenk = (btn, renk) => { if(!/^#[0-9a-f]{6}$/i.test(renk)) return; islem(null, async () => { await sistemKaydet({anaRenk:renk}); ciz(); }); };
EYLEM.teklifKaydet = btn => {
  const d = sayilariOku([["fGecerlilik", "gecerlilik", 1, 365, "Teklif geçerliliği"], ["fKar", "kar", 0, 500, "Kâr oranı"]]); if(!d) return;
  d.gecerlilik = Math.round(d.gecerlilik); d.teklifNotu = deger("fNot"); d.faturaNotu = deger("fFNot");
  islem(btn, async () => { await Depo.kaydet("ayarlar", {anahtar:"firma", deger:Object.assign(firma(), d)}); bildir("Kaydedildi"); ciz(); });
};
EYLEM.numaraKaydet = btn => {
  const d = {isOnEk:deger("nIs"), satisOnEk:deger("nSatis"), alisOnEk:deger("nAlis"), varsayilanKdv:Number(deger("nKdv"))};
  if(!d.isOnEk || !d.satisOnEk || !d.alisOnEk) return uyar("Önekler boş olamaz", "");
  if(d.satisOnEk === d.alisOnEk) return uyar("Satış ve alış önekleri farklı olmalı", "");
  islem(btn, async () => { await sistemKaydet(d); bildir("Kaydedildi"); ciz(); });
};
EYLEM.efKaydet = btn => {
  const on = deger("efOn").toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(on)) return uyar("Öneki kontrol edin", "3 harf veya rakam olmalı (örn. GNS).");
  islem(btn, async () => { await sistemKaydet({efOnEk:on, efEntegrator:deger("efEnt")}); bildir("Kaydedildi"); ciz(); });
};
EYLEM.hatirlatmaKaydet = btn => {
  const d = sayilariOku([["hTeslim", "teslimGun", 0, 30, "Teslim hatırlatması"], ["hVade", "vadeGun", 0, 30, "Vade hatırlatması"], ["hTeklif", "teklifGun", 0, 30, "Teklif hatırlatması"]]); if(!d) return;
  d.paylasimSure = deger("hSure");
  islem(btn, async () => { await sistemKaydet(d); bildir("Kaydedildi"); ciz(); });
};
EYLEM.yedekGunKaydet = btn => { const d = sayilariOku([["yGun", "yedekGun", 1, 90, "Yedek hatırlatması"]]); if(d) islem(btn, async () => { await sistemKaydet(d); bildir("Kaydedildi"); ciz(); }); };
EYLEM.copGunKaydet = btn => { const d = sayilariOku([["copGun", "copGun", 7, 365, "Bekleme süresi"]]); if(d) islem(btn, async () => { d.copGun = Math.round(d.copGun); await sistemKaydet(d); bildir("Kaydedildi"); ciz(); }); };
EYLEM.copGeri = (btn, id) => {
  const e = cop.find(x => x.id === id); if(!e) return;
  islem(btn, async () => { await copGeriYukle(e); bildir("Geri yüklendi"); ciz(); });
};
EYLEM.copSil = (btn, id) => {
  const e = cop.find(x => x.id === id); if(!e) return;
  onayla("Kalıcı olarak silinsin mi?", e.baslik + " — bu işlem geri alınamaz.", "Kalıcı sil", () => islem(null, async () => { await copKaliciSil(e, "Elle silindi"); bildir("Kalıcı silindi"); ciz(); }));
};
EYLEM.copBosalt = () => onayla("Çöp kutusu boşaltılsın mı?", cop.length + " kayıt ve dosyaları kalıcı olarak silinir. Bu işlem geri alınamaz.", "Boşalt", () => islem(null, async () => {
  for(const e of cop.slice()) await copKaliciSil(e, "Çöp boşaltıldı");
  bildir("Çöp kutusu boşaltıldı"); ciz();
}));
const AYAR_AKTAR = ["firma", "sistem", "kategoriler", "katalogKategorileri", "malzemeler", "personelAyar"];
EYLEM.ayarDisa = () => {
  const v = {tur:"gunes-ayarlar", surum:1, tarih:new Date().toISOString(), ayarlar:veri.ayarlar.filter(a => AYAR_AKTAR.indexOf(a.anahtar) >= 0)};
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(v, null, 1)], {type:"application/json"}));
  a.download = "gunes-mobilya-ayarlar-" + bugun() + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  bildir("Ayarlar indirildi");
};
async function ayarIceAktar(input){
  const f = input.files && input.files[0]; input.value = ""; if(!f) return;
  let v; try{ v = JSON.parse(await f.text()); }catch(e){ return uyar("Dosya okunamadı", "Bu bir ayar dosyası değil."); }
  const l = v && v.tur === "gunes-ayarlar" && Array.isArray(v.ayarlar) ? v.ayarlar.filter(a => a && AYAR_AKTAR.indexOf(a.anahtar) >= 0) : [];
  if(!l.length) return uyar("Bu bir ayar dosyası değil", "“Ayarları indir” ile alınmış dosyayı seçin.");
  onayla("Ayarlar yüklensin mi?", l.map(a => AYAR_ADI[a.anahtar] || a.anahtar).join(", ") + " değiştirilecek. Kayıtlarınız (cari, iş, fatura…) etkilenmez.", "Yükle",
    () => islem(null, async () => { await Depo.kaydet("ayarlar", l.map(a => ({anahtar:a.anahtar, deger:a.deger}))); bildir("Ayarlar yüklendi"); ciz(); }), false);
}
async function kategoriKaydet(tur, liste){
  const mevcut = {giris:kategoriler("giris"), cikis:kategoriler("cikis")};
  mevcut[tur] = liste;
  await Depo.kaydet("ayarlar", {anahtar:"kategoriler", deger:mevcut});
}
EYLEM.katEkle = (btn, tur) => {
  const ad = deger("yeniKat-" + tur); if(!ad) return;
  const l = kategoriler(tur).slice();
  if(l.some(x => x.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) return uyar("Bu kategori zaten var", "");
  l.push(ad);
  islem(btn, async () => { await kategoriKaydet(tur, l); bildir("Kategori eklendi"); ciz(); });
};
EYLEM.katSil = (btn, arg) => {
  const [tur, i] = arg.split("|"), l = kategoriler(tur).slice();
  if(l.length <= 1) return uyar("En az bir kategori kalmalı", "");
  const ad = l.splice(Number(i), 1)[0];
  onayla("“" + ad + "” silinsin mi?", "Eski kayıtlardaki kategori adı değişmez.", "Sil", () => islem(null, async () => { await kategoriKaydet(tur, l); ciz(); }));
};
EYLEM.kKatEkle = btn => {
  const ad = deger("yeniKat-katalog"); if(!ad) return;
  const l = katalogListesi();
  if(l.some(x => x.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) return uyar("Bu kategori zaten var", "");
  l.push(ad);
  islem(btn, async () => { await Depo.kaydet("ayarlar", {anahtar:"katalogKategorileri", deger:l}); bildir("Kategori eklendi"); ciz(); });
};
EYLEM.kKatSil = (btn, i) => {
  const l = katalogListesi(), ad = l[Number(i)], n = veri.katalog.filter(p => p.kategori === ad).length;
  if(l.length <= 1) return uyar("En az bir kategori kalmalı", "");
  if(n) return uyar("“" + ad + "” silinemez", "Bu kategoride " + n + " proje var. Önce projeleri başka kategoriye alın veya silin.");
  l.splice(Number(i), 1);
  onayla("“" + ad + "” silinsin mi?", "", "Sil", () => islem(null, async () => { await Depo.kaydet("ayarlar", {anahtar:"katalogKategorileri", deger:l}); ciz(); }));
};
EYLEM.katSifirla =() => onayla("Kategoriler varsayılana dönsün mü?", "Eklediğiniz kategoriler listeden kalkar; eski kayıtlar etkilenmez.", "Döndür",
  () => islem(null, async () => { await Depo.kaydet("ayarlar", {anahtar:"kategoriler", deger:VARSAYILAN_KATEGORI}); bildir("Kategoriler sıfırlandı"); ciz(); }));

EYLEM.yedekAl = () => {
  const v = {surum:2, tarih:new Date().toISOString()}; TABLOLAR.forEach(t => { if(!DOSYA_TABLO[t]) v[t] = veri[t]; });
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(v, null, 1)], {type:"application/json"}));
  a.download = "gunes-mobilya-yedek-" + bugun() + ".json"; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  ayarYaz("sonYedek", Date.now()); logla("yedek", "yedek", "", "Kayıt yedeği indirildi (JSON)"); bildir("Yedek dosyası indirildi"); ciz();
};
function yedekGecerli(v){
  return v && Array.isArray(v.hareketler) && Array.isArray(v.musteriler) &&
    v.hareketler.every(h => h && typeof h.id === "string" && /^(giris|cikis|borc|aktarim)$/.test(h.tur) && Number(h.tutar) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(h.tarih)) &&
    v.musteriler.every(m => m && typeof m.id === "string" && typeof m.ad === "string") &&
    (v.faturalar || []).every(f => f && typeof f.id === "string" && /^(satis|alis)$/.test(f.tur)) &&
    (v.is_emirleri || []).every(i => i && typeof i.id === "string" && typeof i.baslik === "string");
}
async function hepsiniKaydet(v){
  logSessiz++;
  try{ for(const t of TABLOLAR) await Depo.kaydet(t, v[t]); }
  finally{ logSessiz--; }
  logla("yedekYukle", "yedek", "", TABLOLAR.reduce((n, t) => n + (Array.isArray(v[t]) ? v[t].length : 0), 0) + " kayıt yüklendi");
}
const mbYaz = b => b >= 1073741824 ? (b / 1073741824).toFixed(1) + " GB" : Math.max(1, Math.round(b / 1048576)) + " MB";
const guvenliAd = a => String(a).replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 80) || "dosya";
function jszipYukle(){
  if(window.JSZip) return Promise.resolve();
  return new Promise((res, rej) => {
    const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    sc.onload = res; sc.onerror = () => rej(new Error("ZIP aracı yüklenemedi; internet bağlantınızı kontrol edin.")); document.head.appendChild(sc);
  });
}
EYLEM.zipYedek = () => {
  const video = document.getElementById("videoDahil").checked;
  const dl = veri.dosyalar.filter(d => video || dosyaTuru(d) !== "v"), atlanan = veri.dosyalar.length - dl.length;
  const hepsi = dl.concat(veri.katalog_gorseller);
  onayla(hepsi.length + " dosya (" + mbYaz(hepsi.reduce((t, d) => t + d.boyut, 0)) + ") indirilecek",
    (atlanan ? atlanan + " video dahil edilmiyor. " : "") + "Büyük yedeklerde Wi-Fi önerilir; bitene kadar sayfayı kapatmayın.", "Başlat", () => zipYedekYap(dl, veri.katalog_gorseller), false);
};
async function zipYedekYap(dl, gl){
  try{
    await jszipYukle();
    const zip = new JSZip(), v = {surum:3, tarih:new Date().toISOString()}, hata = [], tamam = {dosyalar:[], katalog_gorseller:[]};
    TABLOLAR.forEach(t => { if(!DOSYA_TABLO[t]) v[t] = veri[t]; });
    const hepsi = dl.map(d => ({t:"dosyalar", d})).concat(gl.map(d => ({t:"katalog_gorseller", d})));
    for(let i = 0; i < hepsi.length; i += 100) await urlleriGetir(hepsi.slice(i, i + 100).map(x => x.d));
    for(let i = 0; i < hepsi.length; i++){
      const {t, d} = hepsi[i];
      yuklemeGoster("Dosyalar indiriliyor " + (i + 1) + "/" + hepsi.length + "…");
      try{
        const u = urlOnbellek[d.yol]; if(!u) throw new Error("bağlantı alınamadı");
        const r = await fetch(u.url); if(!r.ok) throw new Error("indirilemedi");
        const ie = bul("is_emirleri", d.isEmriId), pr = bul("katalog", d.projeId);
        const klasor = t === "dosyalar" ? "dosyalar/" + guvenliAd(ie ? ie.no + " " + ie.baslik : "silinmis-is") : "katalog/" + guvenliAd(pr ? pr.kategori + " - " + pr.baslik : "silinmis-proje");
        const yolu = klasor + "/" + (i + 1) + "_" + guvenliAd(d.ad);
        zip.file(yolu, await r.blob(), {compression:"STORE"});
        tamam[t].push(Object.assign({}, d, {zip:yolu}));
      }catch(e){ hata.push(d.ad); }
    }
    v.dosyalar = tamam.dosyalar; v.katalog_gorseller = tamam.katalog_gorseller;
    zip.file("yedek.json", JSON.stringify(v, null, 1));
    const blob = await zip.generateAsync({type:"blob", compression:"STORE", streamFiles:true}, m => yuklemeGoster("ZIP hazırlanıyor %" + Math.round(m.percent)));
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gunes-mobilya-dosyali-yedek-" + bugun() + ".zip";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
    ayarYaz("sonYedek", Date.now()); yuklemeKapat(); logla("yedek", "yedek", "", "Dosyalı yedek indirildi (ZIP, " + mbYaz(blob.size) + ")");
    bildir("Yedek indirildi (" + mbYaz(blob.size) + ")");
    if(hata.length) uyar(hata.length + " dosya yedeğe alınamadı", hata.join("; "));
  }catch(e){ yuklemeKapat(); uyar("Yedek alınamadı", hataMesaji(e)); }
}
async function zipGeriYukle(f){
  try{
    await jszipYukle();
    const zip = await JSZip.loadAsync(f), e = zip.file("yedek.json");
    if(!e) return uyar("Bu ZIP bir yedek dosyası değil", "İçinde yedek.json bulunamadı.");
    let v = JSON.parse(await e.async("string"));
    if(!yedekGecerli(v)) return uyar("Bu ZIP bir yedek dosyası değil", "");
    if(!cevrimici) return uyar("Dosyalı yedek yüklenemedi", "Dosyaları yüklemek için bulut bağlantısı gerekir.");
    const zipte = t => (Array.isArray(v[t]) ? v[t] : []).filter(d => d && d.zip && d.yol && zip.file(d.zip)).map(d => ({t, d}));
    const dosyalar = zipte("dosyalar").concat(zipte("katalog_gorseller"));
    v = duzenle(v); v.hareketler.forEach(h => { h.tutar = Number(h.tutar); }); v.dosyalar = []; v.katalog_gorseller = [];
    onayla(v.hareketler.length + " kasa kaydı, " + v.faturalar.length + " fatura, " + v.musteriler.length + " cari, " + v.katalog.length + " katalog projesi ve " + dosyalar.length + " dosya yüklensin mi?",
      "Yedekteki kayıtlar buluta eklenecek; aynı kayıtlar varsa üzerine yazılır.", "Yükle", () => islem(null, async () => {
        try{
          await hepsiniKaydet(v);
          const tamam = {dosyalar:[], katalog_gorseller:[]}, hata = [];
          for(let i = 0; i < dosyalar.length; i++){
            const {t, d} = dosyalar[i]; yuklemeGoster("Dosyalar yükleniyor " + (i + 1) + "/" + dosyalar.length + "…");
            try{
              const blob = await zip.file(d.zip).async("blob");
              const r = await sb.storage.from(BUCKET).upload(d.yol, new Blob([blob], {type:d.tur || "application/octet-stream"}), {contentType:d.tur || "application/octet-stream", upsert:true});
              if(r.error) throw r.error;
              const k = Object.assign({}, d); delete k.zip; tamam[t].push(k);
            }catch(err){ hata.push(d.ad); }
          }
          await Depo.kaydet("dosyalar", tamam.dosyalar);
          await Depo.kaydet("katalog_gorseller", tamam.katalog_gorseller);
          bildir("Yedek yüklendi (" + (tamam.dosyalar.length + tamam.katalog_gorseller.length) + " dosya)");
          if(hata.length) uyar(hata.length + " dosya yüklenemedi", hata.join("; "));
          else git("ana");
        } finally { yuklemeKapat(); }
      }), false);
  }catch(e){ uyar("ZIP açılamadı", hataMesaji(e)); }
}
function yedekYukle(input){
  const f = input.files[0]; if(!f) return;
  if(/\.zip$/i.test(f.name)){ input.value = ""; return zipGeriYukle(f); }
  const r = new FileReader();
  r.onload = () => {
    let v; try{ v = JSON.parse(r.result); }catch(e){}
    input.value = "";
    if(!yedekGecerli(v)) return uyar("Bu dosya bir yedek dosyası değil", "");
    v = duzenle(v);
    v.hareketler.forEach(h => { h.tutar = Number(h.tutar); });
    const yazi = cevrimici ? "Yedekteki kayıtlar buluta eklenecek; aynı kayıtlar varsa üzerine yazılır." : "Bu cihazdaki bilgilerin yerine yedekteki bilgiler gelecek.";
    onayla(v.hareketler.length + " kasa kaydı, " + v.faturalar.length + " fatura ve " + v.musteriler.length + " cari yüklensin mi?", yazi, "Yükle", () =>
      islem(null, async () => { if(!cevrimici) veri = bosVeri(); await hepsiniKaydet(v); bildir("Yedek yüklendi"); git("ana"); }), false);
  };
  r.readAsText(f);
}
EYLEM.buluttaAktar = btn => islem(btn, async () => {
  await hepsiniKaydet(yerelOku());
  try{ localStorage.removeItem(YEREL_ANAHTAR); }catch(e){}
  bildir("Eski kayıtlar buluta aktarıldı"); ciz();
});

EYLEM.ayarSifirla = () => onayla("Tüm ayarlar varsayılana dönsün mü?", "Önce “Ayarları indir” ile yedek almanızı öneririz. Firma bilgileri, ortaklar, hedefler ve kayıtlar değişmez. Bu cihazın tema, bildirim ve kilit ayarları da sıfırlanır.", "Varsayılana döndür", () => {
  const s = sistem(), c = cihaz();
  islem(null, async () => { await Depo.kaydet("ayarlar", {anahtar:"sistem", deger:{ortaklar:s.ortaklar, hedefler:s.hedefler}}); ayarYaz("cihaz", JSON.stringify({pin:c.pin, kilitDk:c.kilitDk})); ayarlariUygula(); bildir("Ayarlar varsayılana döndü"); ciz(); });
});
EYLEM.simdiKilitle = () => kilitGoster();
document.addEventListener("input", e => {
  if(e.target.id !== "ayarAra") return;
  const q = e.target.value.trim().toLocaleLowerCase("tr").split(/\s+/).filter(Boolean); let n = 0;
  document.querySelectorAll(".ayar-menu [data-anahtar]").forEach(b => { const v = !q.length || q.every(k => b.getAttribute("data-anahtar").indexOf(k) >= 0); b.style.display = v ? "" : "none"; if(v) n++; });
  const y = document.querySelector(".ayar-yok"); if(y) y.style.display = n ? "none" : "";
});
