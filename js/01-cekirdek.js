"use strict";
// Güneş Mobilya — cekirdek
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= SİMGELER ================= */
const IK = {
  gunes:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  ev:'<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  kisiler:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  kisi:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  koli:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>',
  is:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  fatura:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  kasa:'<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  grafik:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  ayar:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  asagi:'<path d="M12 5v14M19 12l-7 7-7-7"/>', yukari:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  sol:'<path d="m15 18-6-6 6-6"/>', sag:'<path d="m9 18 6-6-6-6"/>',
  sil:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  kalem:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  telefon:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  indir:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  yukle:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  ara:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  cikis:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  tamam:'<path d="M20 6 9 17l-5-5"/>', arti:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>',
  yazdir:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  bulut:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  kamera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  ataç:'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  mesaj:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
  oynat:'<polygon points="6 4 20 12 6 20 6 4" fill="currentColor"/>',
  duraklat:'<path d="M8 5v14M16 5v14"/>',
  katalog:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  resim:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  ekran:'<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  bilgi:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  dondur:'<path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/>',
  zil:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  kup:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  takvim:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  cetvel:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
  kilit:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  gecmis:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  konum:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  mikrofon:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>',
  "ataç":'<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  yildiz:'<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'
};
const ik = ad => '<svg class="ik" viewBox="0 0 24 24" aria-hidden="true">' + IK[ad] + '</svg>';
document.querySelectorAll("[data-ik]").forEach(e => { e.outerHTML = ik(e.getAttribute("data-ik")); });

/* ================= SABİTLER ================= */
const VARSAYILAN_KATEGORI = {
  giris: ["Peşin Satış", "Kapora / Peşinat", "Cari Tahsilat", "Taksit / Senet Tahsilatı", "Diğer Gelir"],
  cikis: ["Hammadde (MDF, Sunta, Kereste)", "Kumaş ve Sünger", "Aksesuar ve Hırdavat", "Boya ve Cila", "Usta / İşçilik",
          "Personel Maaşı", "Kira", "Elektrik, Su, Doğalgaz", "Nakliye ve Montaj", "Vergi ve SGK", "Tedarikçi Ödemesi",
          "Bakım ve Onarım", "Genel Giderler", "Diğer Gider"]
};
let ODEME = ["Nakit", "Kart", "Havale", "Çek / Senet"];
const DURUMLAR = ["Teklif", "Sipariş alındı", "Üretimde", "Hazır", "Teslim edildi", "İptal"];
const DURUM_SINIF = {"Teklif":"d-gri", "Sipariş alındı":"d-mavi", "Üretimde":"d-sari", "Hazır":"d-yesil", "Teslim edildi":"d-koyu", "İptal":"d-kirmizi"};
const KAPALI_DURUM = {"Teslim edildi":1, "İptal":1};
let KDV_ORANLARI = [0, 1, 10, 20];
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const YEREL_ANAHTAR = "gunes_muhasebe_v1";
const FORM_EKRANLARI = {giris:1, cikis:1, "cari-form":1, "is-form":1, "fatura-form":1, "proje-form":1, "paylas-form":1, "katalog-ice":1, "personel-form":1, kesif:1, malzemeler:1, ayarlar:1};
const VARSAYILAN_KATALOG = ["Mutfak", "Banyo", "Gardırop", "TV ünitesi"];

/* ================= VERİ & DEPO ================= */
// Tablolar yabancı anahtar sırasıyla (önce cari, sonra iş, fatura, hareket).
const TABLOLAR = ["musteriler", "is_emirleri", "is_notlari", "dosyalar", "faturalar", "hareketler", "ayarlar", "katalog", "katalog_gorseller", "paylasimlar",
  "personel", "puantaj", "personel_hareket", "stok_hareket", "taksitler", "siparisler", "cekler", "arac_kayit"];
// Sonradan eklenen tablolar: Supabase'de henüz kurulmadıysa uygulama yine açılır.
const SONRADAN = {is_notlari:1, dosyalar:1, katalog:1, katalog_gorseller:1, paylasimlar:1, personel:1, puantaj:1, personel_hareket:1, stok_hareket:1, taksitler:1, siparisler:1, cekler:1, arac_kayit:1};
const eksikTablo = {};
// İş emrine sonradan eklenen sütunlar (supabase-guncelleme-4.sql). Kurulmadıysa kayıtta gönderilmez, iş emirleri yine kaydedilir.
const SONRADAN_SUTUN = {teklif:4, kesif:4, kategori:10, montaj:10, kesim:10, maliyetler:10, uretimGun:14};   // sütun → SQL güncelleme no
let eksikSutun = {};
const ALANLAR = {
  musteriler:  {id:"id", ad:"ad", tip:"tip", telefon:"telefon", adres:"adres", vergiNo:"vergi_no", olusma:"olusma"},
  is_emirleri: {id:"id", no:"no", musteriId:"musteri_id", baslik:"baslik", durum:"durum", teslimTarihi:"teslim_tarihi", tutar:"tutar", aciklama:"aciklama", olusma:"olusma",
                oncelik:"oncelik", sorumlu:"sorumlu", adres:"adres", kalemler:"kalemler", asamalar:"asamalar", teklif:"teklif", kesif:"kesif",
                kategori:"kategori", montaj:"montaj", kesim:"kesim", maliyetler:"maliyetler", uretimGun:"uretim_gun"},
  is_notlari:  {id:"id", isEmriId:"is_emri_id", metin:"metin", tur:"tur", yazan:"yazan", olusma:"olusma"},
  dosyalar:    {id:"id", isEmriId:"is_emri_id", ad:"ad", tur:"tur", boyut:"boyut", yol:"yol", yukleyen:"yukleyen", olusma:"olusma"},
  faturalar:   {id:"id", no:"no", tur:"tur", musteriId:"musteri_id", isEmriId:"is_emri_id", kategori:"kategori", tarih:"tarih", vade:"vade",
                kalemler:"kalemler", araToplam:"ara_toplam", kdvToplam:"kdv_toplam", toplam:"toplam", aciklama:"aciklama", olusma:"olusma"},
  hareketler:  {id:"id", tur:"tur", tutar:"tutar", kategori:"kategori", odeme:"odeme", aciklama:"aciklama", musteriId:"musteri_id",
                isEmriId:"is_emri_id", faturaId:"fatura_id", tarih:"tarih", olusma:"olusma", ortak:"ortak", hedef:"hedef"},
  ayarlar:     {anahtar:"anahtar", deger:"deger"},
  katalog:     {id:"id", baslik:"baslik", kategori:"kategori", aciklama:"aciklama", malzeme:"malzeme", olcu:"olcu", fiyat:"fiyat", olusma:"olusma"},
  katalog_gorseller: {id:"id", projeId:"proje_id", ad:"ad", tur:"tur", boyut:"boyut", yol:"yol", sira:"sira", olusma:"olusma"},
  paylasimlar: {id:"id", baslik:"baslik", musteriId:"musteri_id", icerik:"icerik", bitis:"bitis", olusma:"olusma"},
  personel:    {id:"id", ad:"ad", gorev:"gorev", telefon:"telefon", iban:"iban", giris:"giris", cikis:"cikis", ucretTipi:"ucret_tipi", ucret:"ucret",
                izinHakki:"izin_hakki", notlar:"notlar", olusma:"olusma"},
  puantaj:     {id:"id", personelId:"personel_id", tarih:"tarih", durum:"durum", mesai:"mesai", not:"notu"},
  personel_hareket: {id:"id", personelId:"personel_id", tur:"tur", tutar:"tutar", tarih:"tarih", donem:"donem", aciklama:"aciklama", hareketId:"hareket_id", olusma:"olusma"},
  stok_hareket: {id:"id", malzemeId:"malzeme_id", tur:"tur", miktar:"miktar", tarih:"tarih", isEmriId:"is_emri_id", aciklama:"aciklama", olusma:"olusma"},
  taksitler:   {id:"id", faturaId:"fatura_id", sira:"sira", vade:"vade", tutar:"tutar", olusma:"olusma"},
  siparisler:  {id:"id", no:"no", tedarikciId:"tedarikci_id", kalemler:"kalemler", durum:"durum", tarih:"tarih", faturaId:"fatura_id", aciklama:"aciklama", olusma:"olusma"},
  cekler:      {id:"id", tur:"tur", belge:"belge", no:"no", banka:"banka", kesideci:"kesideci", musteriId:"musteri_id", tutar:"tutar", vade:"vade", durum:"durum",
                ciroId:"ciro_id", hareketId:"hareket_id", gecmis:"gecmis", aciklama:"aciklama", olusma:"olusma"},
  arac_kayit:  {id:"id", aracId:"arac_id", tur:"tur", tarih:"tarih", km:"km", litre:"litre", tutar:"tutar", dolu:"dolu", sonraki:"sonraki", sonrakiKm:"sonraki_km",
                aciklama:"aciklama", isEmriId:"is_emri_id", hareketId:"hareket_id", olusma:"olusma"}
};
const SAYISAL = {tutar:1, toplam:1, araToplam:1, kdvToplam:1, olusma:1, boyut:1, fiyat:1, sira:1, bitis:1, ucret:1, mesai:1, izinHakki:1, miktar:1, km:1, litre:1, sonrakiKm:1};
const JSONLI = {kalemler:1, asamalar:1, teklif:1, kesif:1, icerik:1, montaj:1, kesim:1, maliyetler:1, gecmis:1};
const JSON_NESNE = {teklif:1, kesif:1, icerik:1, kesim:1};   // boşsa [] değil {} olur
const bosJson = a => JSON_NESNE[a] ? {} : [];
const BOSSA_NULL = {tedarikciId:1, ciroId:1, musteriId:1, isEmriId:1, faturaId:1, teslimTarihi:1, vade:1, odeme:1, deger:1, giris:1, cikis:1, hareketId:1};
const anahtarAdi = t => t === "ayarlar" ? "anahtar" : "id";
const bosVeri = () => ({musteriler:[], is_emirleri:[], is_notlari:[], dosyalar:[], faturalar:[], hareketler:[], ayarlar:[], katalog:[], katalog_gorseller:[], paylasimlar:[],
  personel:[], puantaj:[], personel_hareket:[], stok_hareket:[], taksitler:[], siparisler:[], cekler:[], arac_kayit:[]});

const cevrimici = !!(BULUT.adres && BULUT.anahtar);
const sb = cevrimici && window.supabase ? window.supabase.createClient(BULUT.adres, BULUT.anahtar) : null;
let veri = bosVeri();
let oturum = null;
// Kullanıcı yetkisi (supabase-guncelleme-6.sql). Kurulmadıysa veya liste boşsa herkes yöneticidir.
let yetki = {yonetici:true, ad:"", liste:[], kurulu:false};

function duzenle(v){
  const d = bosVeri();
  if(v) TABLOLAR.forEach(t => { if(Array.isArray(v[t])) d[t] = v[t]; });
  d.musteriler.forEach(m => { if(!m.tip) m.tip = "musteri"; });
  d.faturalar.forEach(f => { if(!Array.isArray(f.kalemler)) f.kalemler = []; });
  d.is_emirleri.forEach(i => { if(!Array.isArray(i.kalemler)) i.kalemler = []; if(!Array.isArray(i.asamalar)) i.asamalar = []; if(!i.oncelik) i.oncelik = "Normal"; i.sorumlu = i.sorumlu || ""; i.adres = i.adres || "";
    if(!i.teklif || typeof i.teklif !== "object") i.teklif = {}; if(!i.kesif || typeof i.kesif !== "object") i.kesif = {}; isAlanlari(i); });
  return d;
}
// Güncelleme 10 ile gelen iş emri alanları: eski kayıtlarda boş başlar
function isAlanlari(i){
  if(!Array.isArray(i.montaj)) i.montaj = []; if(!Array.isArray(i.maliyetler)) i.maliyetler = [];
  if(!i.kesim || typeof i.kesim !== "object" || Array.isArray(i.kesim)) i.kesim = {}; i.kategori = i.kategori || "";
  return i;
}
function yerelOku(){ try{ return duzenle(JSON.parse(localStorage.getItem(YEREL_ANAHTAR))); }catch(e){ return bosVeri(); } }
function yerelYaz(v){ try{ localStorage.setItem(YEREL_ANAHTAR, JSON.stringify(v)); }catch(e){ throw new Error("Bu cihazda kayıt yapılamadı."); } }
function ayarOku(k){ try{ return localStorage.getItem("gunes_" + k); }catch(e){ return null; } }
function ayarYaz(k, v){ try{ localStorage.setItem("gunes_" + k, v); }catch(e){} }

// Güncelleme 13: iş emri fiyatları ayrı tabloda (yalnız yönetici okur)
let fiyatAyri = false, surumVar = false, imlec = 0;
const KALEM_FIYAT = ["fiyat", "maliyet", "hesap"];
const fiyatsizKalem = x => { const y = Object.assign({}, x); KALEM_FIYAT.forEach(a => delete y[a]); return y; };
function fiyatSatiri(k){
  return {id:k.id, tutar:Number(k.tutar) || 0, teklif:k.teklif || {}, maliyetler:k.maliyetler || [], olusma:k.olusma || 0,
    kalem_fiyat:(k.kalemler || []).map(x => { const y = {}; KALEM_FIYAT.forEach(a => { if(x[a] != null) y[a] = x[a]; }); return y; })};
}
function fiyatBirlestir(ie, f){
  ie.tutar = Number(f.tutar) || 0; ie.teklif = f.teklif && typeof f.teklif === "object" ? f.teklif : {}; ie.maliyetler = Array.isArray(f.maliyetler) ? f.maliyetler : [];
  (f.kalem_fiyat || []).forEach((x, i) => { if(ie.kalemler[i]) Object.assign(ie.kalemler[i], x); });
}
// Sunucudan fiyatsız gelen iş emrine bellekteki fiyatları geri koy
function fiyatKoru(yeni, eski){
  if(!fiyatAyri || !eski || !yetki.yonetici) return yeni;
  fiyatBirlestir(yeni, fiyatSatiri(eski));
  return yeni;
}
function bulutaCevir(t, k){
  const r = {};
  for(const [a, b] of Object.entries(ALANLAR[t])){
    if((t === "is_emirleri" && eksikSutun[a]) || eksikSutun[t + "." + a]) continue;
    let v = k[a];
    if(BOSSA_NULL[a] && (v === "" || v === undefined)) v = null;
    else if(v === undefined) v = SAYISAL[a] ? 0 : JSONLI[a] ? bosJson(a) : "";
    r[b] = v;
  }
  if(t === "is_emirleri" && fiyatAyri){
    r.tutar = 0; if("teklif" in r) r.teklif = {}; if("maliyetler" in r) r.maliyetler = [];
    r.kalemler = (k.kalemler || []).map(fiyatsizKalem);
  }
  return r;
}
function buluttanCevir(t, r){
  const k = {};
  for(const [a, b] of Object.entries(ALANLAR[t])){
    let v = r[b];
    if(SAYISAL[a]) v = Number(v) || 0;
    else if(v == null && !BOSSA_NULL[a]) v = JSONLI[a] ? bosJson(a) : "";
    k[a] = v;
  }
  if(t === "musteriler" && !k.tip) k.tip = "musteri";
  if(t === "is_emirleri"){ if(!k.oncelik) k.oncelik = "Normal"; isAlanlari(k); }
  if(r.surum != null){ k._surum = Number(r.surum); k._degisme = Number(r.degisme) || 0; k._degistiren = r.degistiren || ""; }
  return k;
}
function bellegeYaz(t, k, sunucudan){
  const id = anahtarAdi(t), l = veri[t];
  const i = l.findIndex(x => x[id] === k[id]);
  if(sunucudan && t === "is_emirleri" && i >= 0) fiyatKoru(k, l[i]);
  const eski = i >= 0 ? l[i] : null;
  if(i >= 0) l[i] = k; else l.push(k);
  if(sunucudan && typeof uzakDegisiklik === "function") uzakDegisiklik(t, eski, k);   // bildirim merkezi
}

// Sayfa sayfa (1000'er) tüm satırları getirir; sorgu her sayfa için yeniden kurulur
async function sayfali(kur){
  const l = [];
  for(let bas = 0; ; bas += 1000){
    const r = await kur().range(bas, bas + 999);
    if(r.error) throw r.error;
    l.push(...r.data);
    if(r.data.length < 1000) return l;
  }
}
const eksikMi = e => /does not exist|schema cache|Could not find/i.test((e && e.message) || "");
const Depo = {
  async yukle(){
    if(!cevrimici){ veri = yerelOku(); await copYukle(); return; }
    await kuyrukGonder().catch(() => {});
    if(!navigator.onLine || (cevrimdisi && kuyruk.length)){ if(await anlikYukle()){ cevrimdisi = true; return; } }
    try{ await this.bulutYukle(); cevrimdisi = false; sonEsitleme = Date.now(); anlikKaydet(); }
    catch(e){ if(agHatasi(e) && await anlikYukle()){ cevrimdisi = true; return; } throw e; }
  },
  // Yetki ve hangi güncellemelerin kurulu olduğu
  async yapiOku(){
    const yr = await sb.rpc("yonetici_mi"), kr = await sb.from("kullanicilar").select("*").order("eposta");
    if(yr.error && agHatasi(yr.error)) throw yr.error;
    const ben = benimEposta();
    if(yr.error || kr.error) yetki = {yonetici:true, ad:"", liste:[], kurulu:false};
    else { const k = kr.data.find(x => x.eposta.toLowerCase() === ben); yetki = {yonetici:yr.data !== false, ad: k ? k.ad : "", liste:kr.data, kurulu:true}; rolUygula(k); }
    eksikSutun = {};
    const [s4, s10, s11, s13, f13, s14] = await Promise.all([
      sb.from("is_emirleri").select(Object.keys(SONRADAN_SUTUN).filter(a => SONRADAN_SUTUN[a] === 4).join(",")).limit(1),
      sb.from("is_emirleri").select(Object.keys(SONRADAN_SUTUN).filter(a => SONRADAN_SUTUN[a] === 10).join(",")).limit(1),
      sb.from("hareketler").select("ortak,hedef").limit(1),
      sb.from("musteriler").select("surum").limit(1),
      sb.from("is_emri_fiyat").select("id").limit(1),
      sb.from("is_emirleri").select("uretim_gun").limit(1)]);
    Object.keys(SONRADAN_SUTUN).forEach(a => { if(({4:s4, 10:s10, 14:s14}[SONRADAN_SUTUN[a]]).error) eksikSutun[a] = SONRADAN_SUTUN[a]; });
    if(s11.error){ eksikSutun["hareketler.ortak"] = 11; eksikSutun["hareketler.hedef"] = 11; }
    surumVar = !s13.error; fiyatAyri = !f13.error;
    if(f13.error) eksikTablo.is_emri_fiyat = 1; else delete eksikTablo.is_emri_fiyat;
  },
  // Tüm tablolar aynı anda yüklenir
  async bulutYukle(){
    await this.yapiOku();
    const sonuc = bosVeri(); let enBuyuk = 1;
    await Promise.all(TABLOLAR.map(async t => {
      try{
        const l = await sayfali(() => sb.from(t).select("*").order(anahtarAdi(t)));
        delete eksikTablo[t];
        l.forEach(x => { sonuc[t].push(buluttanCevir(t, x)); if(x.degisme > enBuyuk) enBuyuk = Number(x.degisme); });
      }catch(e){ if(SONRADAN[t] && eksikMi(e)) eksikTablo[t] = 1; else throw e; }
    }));
    if(fiyatAyri && yetki.yonetici){
      const l = await sayfali(() => sb.from("is_emri_fiyat").select("*").order("id")), ie = {};
      sonuc.is_emirleri.forEach(x => { ie[x.id] = x; });
      l.forEach(f => { if(ie[f.id]) fiyatBirlestir(ie[f.id], f); if(f.degisme > enBuyuk) enBuyuk = Number(f.degisme); });
    }
    veri = sonuc; imlec = surumVar ? enBuyuk : 0;
    await copYukle();
  },
  // Hızlı eşitleme: cihazdaki kopyadan sonra değişen ve silinen kayıtlar (güncelleme 13)
  async esitle(){
    if(!cevrimici) return;
    await kuyrukGonder().catch(() => {});
    if(!navigator.onLine) { cevrimdisiOl(); return; }
    if(!surumVar || !imlec) return this.yukle();
    try{
      await this.yapiOku();
      if(!surumVar) return this.yukle();
      const bas = imlec - 5000; let enBuyuk = imlec;
      const tablolar = TABLOLAR.filter(t => !eksikTablo[t] || !SONRADAN[t]);
      const gelen = await Promise.all(tablolar.map(t => sayfali(() => sb.from(t).select("*").gt("degisme", bas).order("degisme")).then(l => [t, l], e => { if(SONRADAN[t] && eksikMi(e)){ eksikTablo[t] = 1; return [t, []]; } throw e; })));
      const fiyat = fiyatAyri && yetki.yonetici ? await sayfali(() => sb.from("is_emri_fiyat").select("*").gt("degisme", bas).order("degisme")) : [];
      const silinen = await sayfali(() => sb.from("silinenler").select("tablo,kayit_id,zaman").gt("zaman", bas).order("zaman"));
      toplu++;
      try{ gelen.forEach(([t, l]) => l.forEach(x => { bellegeYaz(t, buluttanCevir(t, x), true); if(x.degisme > enBuyuk) enBuyuk = Number(x.degisme); })); }finally{ toplu--; }
      fiyat.forEach(f => { const ie = bul("is_emirleri", f.id); if(ie) fiyatBirlestir(ie, f); if(f.degisme > enBuyuk) enBuyuk = Number(f.degisme); });
      silinen.forEach(x => { if(veri[x.tablo]){ const a = anahtarAdi(x.tablo); veri[x.tablo] = veri[x.tablo].filter(y => y[a] !== x.kayit_id); } if(x.zaman > enBuyuk) enBuyuk = Number(x.zaman); });
      imlec = enBuyuk; cevrimdisi = false; sonEsitleme = Date.now();
      await copYukle(); anlikKaydet();
    }catch(e){ if(agHatasi(e)){ cevrimdisiOl(); return; } throw e; }
  },
  async kaydet(t, kayitlar, o = {}){
    if(yetki.salt) throw new Error(SALT_HATA);
    if(!Array.isArray(kayitlar)) kayitlar = [kayitlar];
    if(!kayitlar.length) return;
    const ka = anahtarAdi(t), eskiler = kayitlar.map(k => { const e = veri[t].find(x => x[ka] === k[ka]); return e ? {ayni:e === k, k:JSON.parse(JSON.stringify(e))} : null; });
    if(cevrimici){
      // Tek kayıt düzenleniyorsa: açıldığındaki sürüm hâlâ sunucudaki sürümse yazılır, değilse çakışma uyarısı
      const kosullu = surumVar && !o.zorla && kayitlar.length === 1 && eskiler[0] && typeof kayitlar[0]._surum === "number" && !cevrimdisi && navigator.onLine;
      const usta = !yetki.yonetici && t === "is_emirleri";
      if(kosullu) await kosulluYaz(t, kayitlar[0]);
      else if(usta) for(const k of kayitlar) await bulutYaz({tip:"update", tablo:t, satir:bulutaCevir(t, k), anahtar:"id", id:k.id});
      else {
        const d = await bulutYaz({tip:"upsert", tablo:t, satirlar:kayitlar.map(k => bulutaCevir(t, k)), don: surumVar ? ka + ",surum,degisme,degistiren" : ""});
        if(Array.isArray(d)) d.forEach(x => { const k = kayitlar.find(y => y[ka] === x[ka]); if(k){ k._surum = Number(x.surum); k._degisme = Number(x.degisme); k._degistiren = x.degistiren; } });
      }
      if(t === "is_emirleri" && fiyatAyri && yetki.yonetici) await bulutYaz({tip:"upsert", tablo:"is_emri_fiyat", satirlar:kayitlar.map(fiyatSatiri)});
    }
    kayitlar.forEach(k => bellegeYaz(t, k));
    if(!cevrimici) yerelYaz(veri); else anlikKaydet();
    kayitlar.forEach((k, i) => {   // işlem geçmişi: yeni kayıt veya değişen alanlar
      const e = eskiler[i], f = e ? kayitFarki(t, e.k, k) : {};
      if(e && !e.ayni && !Object.keys(f).length) return;
      logla(e ? "guncelle" : "ekle", t, k[ka], kayitBasligi(t, k), f);
    });
    // Usta kesim planında plaka adlarını görebilsin diye malzeme listesinin fiyatsız kopyası
    if(t === "ayarlar" && cevrimici && yetki.yonetici && kayitlar.some(k => k.anahtar === "malzemeler")){
      logSessiz++;
      try{ await this.kaydet("ayarlar", {anahtar:"plakalar", deger:malzemeListesi().filter(m => m.birim === "plaka").map(m => ({id:m.id, ad:m.ad, birim:m.birim, en:m.en, boy:m.boy}))}); }
      finally{ logSessiz--; }
    }
  },
  // Silinen kayıt (veritabanının birlikte sildiği bağlı kayıtlarla) çöp kutusuna gider; o:{cop:false} ile doğrudan silinir.
  async sil(t, id, o = {}){
    if(yetki.salt) throw new Error(SALT_HATA);
    const k = veri[t].find(x => x[anahtarAdi(t)] === id);
    const kayitlar = k ? [{t, k}] : [], kopan = [];
    if(k) bagliTopla(t, k, kayitlar, kopan);
    const baslik = k ? kayitBasligi(t, k) : "", cope = !!k && o.cop !== false && t !== "ayarlar", grup = copGrubu;
    let girdi = null, copte = false;
    if(cope && !grup){ girdi = copGirdisi(kayitlar, kopan); copte = await copKaydet(girdi); }
    if(cevrimici){
      try{ await bulutYaz({tip:"delete", tablo:t, anahtar:anahtarAdi(t), id}); }
      catch(e){ if(copte) await copKaldir(girdi.id).catch(() => {}); throw e; }
    }
    // Bellekte de veritabanındaki gibi: bağlı kayıtlar gider, bağı kopan kayıtların alanı boşalır
    const giden = new Set(kayitlar.map(x => x.k));
    kayitlar.forEach(x => { veri[x.t] = veri[x.t].filter(y => !giden.has(y)); });
    kopan.forEach(x => { const y = bul(x.t, x.id); if(y) y[x.alan] = null; });
    if(t === "ayarlar") veri.ayarlar = veri.ayarlar.filter(x => x.anahtar !== id);
    if(!cevrimici) yerelYaz(veri); else anlikKaydet();
    if(cope && grup){ grup.kayitlar.push(...kayitlar); grup.kopan.push(...kopan); }
    else if(!copte) await dosyalariKaldir(kayitlar);
    if(k) logla("sil", t, id, baslik, Object.assign(cope && (grup || copte) ? {"Çöp kutusu":"Taşındı"} : {"Çöp kutusu":"Kalıcı silindi"},
      kayitlar.length > 1 ? {"Bağlı kayıt":String(kayitlar.length - 1)} : {}));
  }
};

// Sürüm koşullu güncelleme (güncelleme 13). Başkası değiştirmişse çakışma hatası fırlatır.
async function kosulluYaz(t, k){
  const ka = anahtarAdi(t), satir = bulutaCevir(t, k);
  let r; try{ r = await sb.from(t).update(satir).eq(ka, k[ka]).eq("surum", k._surum).select("surum,degisme,degistiren"); }catch(e){ r = {error:e}; }
  if(r.error){ if(agHatasi(r.error)){ cevrimdisiOl(); kuyrugaEkle({tip:"upsert", tablo:t, satirlar:[satir]}); return; } throw r.error; }
  if(r.data.length){ const x = r.data[0]; k._surum = Number(x.surum); k._degisme = Number(x.degisme); k._degistiren = x.degistiren; return; }
  const g = await sb.from(t).select("*").eq(ka, k[ka]).maybeSingle();
  let sunucu = g.data ? buluttanCevir(t, g.data) : null;
  if(sunucu && t === "is_emirleri" && fiyatAyri && yetki.yonetici){ const f = await sb.from("is_emri_fiyat").select("*").eq("id", k.id).maybeSingle(); if(f.data) fiyatBirlestir(sunucu, f.data); }
  const h = new Error("Bu kaydı siz açtıktan sonra başkası değiştirdi; değişikliğiniz kaydedilmedi.");
  h.cakisma = {t, benim:k, sunucu};
  throw h;
}
const kisiAdi = e => { if(!e) return "başka biri"; const k = yetki.liste.find(x => x.eposta.toLowerCase() === String(e).toLowerCase()); return (k && k.ad) || String(e).replace("@gunesmobilya.app", ""); };
function cakismaPenceresi(c){
  const {t, benim, sunucu} = c, ad = kayitBasligi(t, benim) || TABLO_ADI[t];
  const fark = sunucu ? alanFarki(sunucu, benim) : {};
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:90vh;overflow:auto"><p>' + (sunucu ? "Bu kaydı başkası değiştirdi" : "Bu kayıt silinmiş") + '</p>' +
    '<div class="alt-bilgi"><b>' + esc(ad) + '</b> — ' + (sunucu ? esc(kisiAdi(sunucu._degistiren)) + ' ' + (sunucu._degisme ? esc(tamZaman(sunucu._degisme)) + ' ' : '') + 'siz açtıktan sonra değiştirdi.' : 'siz düzenlerken başka biri sildi.') +
    ' Sizin değişikliğiniz <b>kaydedilmedi</b>.</div>' +
    (Object.keys(fark).length ? '<div class="gecmis-ayrinti" style="margin:12px 0 0">' + Object.entries(fark).map(([a, v]) => '<div><b>' + esc(a) + '</b><span class="eski">onun: ' + esc(v[0]) + '</span> · <span>sizin: ' + esc(v[1]) + '</span></div>').join("") + '</div>' : '') +
    '<div class="buton-sira">' + (sunucu ? '<button class="buton ikincil" data-c="onun">Onun halini kullan</button>' : '<button class="buton ikincil" data-c="hayir">Vazgeç</button>') +
    '<button class="buton" data-c="benim">' + (sunucu ? "Benimkini yine de kaydet" : "Yeniden oluştur") + '</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const k_ = b.getAttribute("data-c");
    if(k_ === "hayir"){ p.remove(); return; }
    if(k_ === "onun"){ bellegeYaz(t, sunucu); anlikKaydet(); p.remove(); bildir("Güncel hali yüklendi"); if(FORM_EKRANLARI[yol()[0]]) geri(); else ciz(); return; }
    islem(b, async () => {
      await Depo.kaydet(t, Object.assign({}, benim, sunucu ? {_surum:sunucu._surum} : {}), {zorla:!sunucu});
      p.remove(); bildir("Kaydedildi"); if(FORM_EKRANLARI[yol()[0]]) geri(); else ciz();
    });
  });
  document.body.appendChild(p);
}
function hataMesaji(e){
  const m = (e && (e.message || e.error_description)) || String(e);
  if(/does not exist|Could not find the table|schema cache|column .* not found/i.test(m))
    return "Veritabanı güncellemesi gerekiyor: Supabase'de sırayla “supabase-guncelleme.sql”, “supabase-guncelleme-2.sql”, “supabase-guncelleme-3.sql”, “supabase-guncelleme-4.sql”, “-5” … “-13” dosyalarını çalıştırın (en kolayı: supabase-tum-kurulum.sql dosyasının tamamını bir kez çalıştırmak).";
  if(/maximum allowed size|too large|413/i.test(m))
    return "Dosya, Supabase'in izin verdiği boyuttan büyük. Supabase'de “supabase-guncelleme-8.sql” dosyasını çalıştırın; ücretsiz planda tek dosya en çok 50 MB olabilir (daha büyüğü için Pro plan ve Storage → Settings → Global file size limit).";
  if(/bucket not found/i.test(m)) return "Dosya deposu kurulmamış: Supabase'de “supabase-guncelleme-2.sql” dosyasını çalıştırın.";
  if(/fetch|network|Failed/i.test(m)) return "İnternet bağlantısı yok gibi görünüyor. Tekrar deneyin.";
  if(/JWT|row-level|permission/i.test(m)) return "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
  return "Bir sorun oldu: " + m;
}
async function islem(btn, fn){
  if(btn) btn.disabled = true;
  try{ await fn(); }
  catch(e){ if(e && e.cakisma) return cakismaPenceresi(e.cakisma); const h = document.getElementById("hata"); if(h) h.textContent = hataMesaji(e); else uyar("İşlem yapılamadı", hataMesaji(e)); }
  finally{ if(btn && document.body.contains(btn)) btn.disabled = false; }
}

/* ================= YARDIMCI ================= */
const yeniId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const yuvarla = n => Math.round(n * 100) / 100;
function para(n){
  const neg = n < 0; n = Math.abs(yuvarla(n));
  const tam = Math.floor(n), kurus = Math.round((n - tam) * 100);
  let s = tam.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if(kurus) s += "," + (kurus < 10 ? "0" : "") + kurus;
  return (neg ? "-" : "") + s + " ₺";
}
/* "12.500" , "12500,50" , "12.500,50" , "12500.5" hepsini anlar */
function sayiOku(s){
  s = String(s || "").replace(/[₺\s]/g, "");
  if(!s) return NaN;
  if(s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return Number(s);
}
const sayiYaz = n => n ? String(yuvarla(n)).replace(".", ",") : "";
const tarihStr = d => d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
const bugun = () => tarihStr(new Date());
function tarihYaz(t, kisa){
  if(!t) return "";
  if(t === bugun()) return "Bugün";
  const d = new Date(); d.setDate(d.getDate() - 1);
  if(t === tarihStr(d)) return "Dün";
  const p = t.split("-"); return Number(p[2]) + " " + AYLAR[Number(p[1]) - 1] + (kisa && p[0] === bugun().slice(0, 4) ? "" : " " + p[0]);
}
// Belgelerde "Bugün / Dün" yerine tam tarih
const tamTarih = t => { if(!t) return ""; const p = t.split("-"); return Number(p[2]) + " " + AYLAR[Number(p[1]) - 1] + " " + p[0]; };
const bul = (t, id) => id ? veri[t].find(x => x.id === id) || null : null;
const cariAdi = id => { const m = bul("musteriler", id); return m ? m.ad : ""; };
const tarihSira = (a, b) => a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : (b.olusma || 0) - (a.olusma || 0);
const deger = id => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
const hataYaz = m => { const h = document.getElementById("hata"); if(h) h.textContent = m; };
const ac = ie => !KAPALI_DURUM[ie.durum];

function kategoriler(tur){
  const a = veri.ayarlar.find(x => x.anahtar === "kategoriler");
  const l = a && a.deger && a.deger[tur];
  return Array.isArray(l) && l.length ? l : VARSAYILAN_KATEGORI[tur];
}
// Kasa listelerinde görünen hareketler (veresiye ve cari / personel açılış bakiyesi kasadan geçmez)
const kasaHareketi = h => h.tur !== "borc" && !(h.tur === "acilis" && h.musteriId);
function kasa(){
  const s = {nakit:0, banka:0, senet:0};
  veri.hareketler.forEach(h => {
    if(h.tur !== "giris" && h.tur !== "cikis" && !(h.tur === "acilis" && !h.musteriId)) return;
    const k = h.tur === "cikis" ? -h.tutar : h.tutar;   // açılış bakiyesi işaretli tutardır
    if(h.odeme === "Nakit") s.nakit += k; else if(h.odeme === "Çek / Senet") s.senet += k; else s.banka += k;
  });
  s.toplam = s.nakit + s.banka + s.senet;
  return s;
}
// Pozitif: cari bize borçlu (alacağımız). Negatif: biz cariye borçluyuz.
function cariBakiye(id){
  let b = 0;
  veri.faturalar.forEach(f => { if(f.musteriId === id) b += f.tur === "satis" ? f.toplam : -f.toplam; });
  veri.hareketler.forEach(h => {
    if(h.musteriId !== id) return;
    if(h.tur === "giris") b -= h.tutar; else if(h.tur === "cikis" || h.tur === "borc" || h.tur === "acilis") b += h.tutar;
  });
  return yuvarla(b);
}
const faturaOdenen = id => yuvarla(veri.hareketler.filter(h => h.faturaId === id).reduce((s, h) => s + h.tutar, 0));
function odemeDurumu(f){
  const kalan = yuvarla(f.toplam - faturaOdenen(f.id));
  if(kalan <= 0) return {yazi:"Ödendi", sinif:"d-yesil", kalan:0};
  if(kalan < f.toplam) return {yazi:"Kısmen ödendi", sinif:"d-sari", kalan};
  return {yazi:"Ödenmedi", sinif:"d-kirmizi", kalan};
}
function isOzet(id){
  const ie = bul("is_emirleri", id) || {};
  let satis = 0, alis = 0, gider = 0, tahsilat = 0;
  veri.faturalar.forEach(f => { if(f.isEmriId === id){ if(f.tur === "satis") satis += f.toplam; else alis += f.toplam; } });
  veri.hareketler.forEach(h => {
    if(h.isEmriId !== id) return;
    if(h.tur === "giris") tahsilat += h.tutar;
    else if(h.tur === "cikis" && !(h.faturaId && bul("faturalar", h.faturaId))) gider += h.tutar;
  });
  const fiyat = satis || ie.tutar || 0, maliyet = alis + gider;
  return {fiyat, satis, maliyet, tahsilat, kalan: yuvarla(fiyat - tahsilat), kar: yuvarla(fiyat - maliyet)};
}
function siradakiNo(onEk, liste){
  let en = 0;
  liste.forEach(x => { if(x.no && x.no.indexOf(onEk) === 0){ const n = parseInt(x.no.slice(onEk.length), 10); if(n > en) en = n; } });
  return onEk + ("000" + (en + 1)).slice(-4);
}

/* ================= BİLDİRİM & ONAY ================= */
function bildir(yazi){
  document.querySelectorAll(".bildirim").forEach(x => x.remove());
  const e = document.createElement("div"); e.className = "bildirim"; e.innerHTML = ik("tamam") + esc(yazi);
  document.body.appendChild(e); setTimeout(() => e.remove(), 2200);
}
function onayla(soru, aciklama, evetYazi, evet, tehlikeli = true){
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere"><p>' + esc(soru) + '</p>' + (aciklama ? '<div class="alt-bilgi">' + esc(aciklama) + '</div>' : '') +
    '<div class="buton-sira">' + (evet ? '<button class="buton ikincil" data-c="hayir">Vazgeç</button>' : '') +
    '<button class="buton" ' + (tehlikeli ? 'style="background:#b91c1c"' : '') + ' data-c="evet">' + esc(evetYazi) + '</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if(b && b.getAttribute("data-c") === "evet"){ p.remove(); if(evet) evet(); }
    else if(b || e.target === p) p.remove();
  });
  document.body.appendChild(p);
}
const uyar = (baslik, yazi) => onayla(baslik, yazi, "Tamam", null, false);
