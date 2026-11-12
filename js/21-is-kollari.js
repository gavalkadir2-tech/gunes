"use strict";
// Güneş Mobilya — iş kolları: mobilya ve müteahhitlik (inşaat) işleri aynı sistemde
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
// İş emri, kasa hareketi ve fatura "kol" alanı taşır ("" = ana iş kolu, Mobilya). Kasa hareketi / faturada boşsa bağlı iş emrinin kolu sayılır.
// Kasa, cariler ve ortaklar ortaktır; listeler ve rapor iş koluna göre süzülür. Veritabanı: supabase-guncelleme-16.sql.

const KOL_VARSAYILAN = [
  {id:"", ad:"Mobilya"},
  {id:"muteahhit", ad:"Müteahhitlik",
    asamalar:["Keşif / metraj", "Sözleşme", "Hafriyat / temel", "Kaba inşaat", "Çatı", "Tesisat (elektrik / su)", "Sıva / alçı", "Boya", "İnce işler", "Teslim"],
    giris:["Hakediş tahsilatı", "İş sahibinden avans"],
    cikis:["Taşeron ödemesi", "İnşaat malzemesi (çimento, demir, tuğla)", "Şantiye işçiliği", "Makine / ekipman kirası", "Ruhsat, harç, proje", "Nakliye / hafriyat"]}
];
const isKollari = () => { const k = sistem().kollar; return Array.isArray(k) && k.length ? k : KOL_VARSAYILAN; };
const kolHazir = () => !cevrimici || !eksikSutun["hareketler.kol"];
const kolVar = () => isKollari().length > 1 && kolHazir();
const kolBul = id => isKollari().find(k => k.id === (id || "")) || isKollari()[0];
const kolAdi = id => kolBul(id).ad;
const faturaKolu = f => f.kol || ((f.isEmriId && bul("is_emirleri", f.isEmriId)) || {}).kol || "";
function hareketKolu(h){
  if(h.kol) return h.kol;
  const ie = h.isEmriId && bul("is_emirleri", h.isEmriId); if(ie) return ie.kol || "";
  const f = h.faturaId && bul("faturalar", h.faturaId); return f ? faturaKolu(f) : "";
}
const kolAsamalari = id => { const k = kolBul(id); return k.id && Array.isArray(k.asamalar) && k.asamalar.length ? k.asamalar.slice() : ASAMALAR.slice(); };
// İş koluna özel kategoriler önce gelir, ortak kategoriler arkasından
const kolKategorileri = (tur, id) => Array.from(new Set(((kolBul(id) || {})[tur] || []).concat(kategoriler(tur))));

/* --- Liste süzgeci (İş Emirleri, Kasa, Faturalar, Rapor) --- */
const kolFiltre = () => filtre.kol == null ? "hepsi" : filtre.kol;
const kolUygun = kol => kolFiltre() === "hepsi" || kolFiltre() === (kol || "");
const kolSecici = () => !kolVar() ? '' : '<div class="secenekler kol-sec">' + [["hepsi", "Tüm işler"]].concat(isKollari().map(k => [k.id, k.ad])).map(([v, a]) =>
  '<button type="button" class="secenek' + (kolFiltre() === v ? ' secili' : '') + '" data-is="kolFiltre" data-arg="' + esc(v) + '">' + esc(a) + '</button>').join("") + '</div>';
EYLEM.kolFiltre = (el, v) => { filtre.kol = v; listeFazla.isler = listeFazla.kasa = listeFazla.faturalar = 0; const y = window.scrollY; ciz(); window.scrollTo(0, y); };
const kolRozet = kol => kolVar() && kol ? ' <span class="etiket-rozet d-mavi kol-rozet">' + esc(kolAdi(kol)) + '</span>' : '';

/* --- Formlarda iş kolu seçimi --- */
function kolAlani(secili){
  if(!kolVar()) return '';
  form.kol = secili || "";
  return '<label class="etiket">İş kolu</label><div class="secenekler" data-ad="kol" id="kolSec">' + isKollari().map(k =>
    '<button type="button" class="secenek' + (k.id === form.kol ? ' secili' : '') + '" data-deger="' + esc(k.id) + '">' + esc(k.ad) + '</button>').join("") + '</div>';
}
const varsayilanKol = ie => ie ? (ie.kol || "") : kolFiltre() !== "hepsi" ? kolFiltre() : "";
// İş emri seçilince iş kolu ona göre seçilir; kol değişince "sonra" çağrılır
function kolBagla(sonra){
  const sec = document.getElementById("kolSec"); if(!sec) return;
  const sec_ = id => { const b = sec.querySelector('[data-deger="' + (id || "") + '"]'); if(b && !b.classList.contains("secili")) b.click(); };
  sec.addEventListener("click", () => setTimeout(() => { if(sonra) sonra(form.kol); }, 0));
  const ie = document.getElementById("isEmri");
  if(ie) ie.addEventListener("change", () => { const x = bul("is_emirleri", ie.value); if(x) sec_(x.kol); });
}
// Para giriş / çıkış: kategoriler iş koluna göre
function paraKolBagla(){
  kolBagla(kol => {
    const g = document.querySelector('.secenekler[data-ad="kategori"]'); if(!g) return;
    const ortakKat = form.tur === "giris" ? ORTAK_SERMAYE : ORTAK_CEKIS;
    let l = kolKategorileri(form.tur, kol); if(ortaklar().length && ortakHazir() && l.indexOf(ortakKat) < 0) l = l.concat([ortakKat]);
    // Seçili kategori önceki iş kolunun kendi kategorisi ya da varsayılansa yeni kolun ilk kategorisi seçilir
    const ozel = kolBul(kol)[form.tur] || [], baskaKol = isKollari().some(k => k.id !== kol && (k[form.tur] || []).indexOf(form.kategori) >= 0);
    if(!form.faturaId && !deger("cari") && (ozel.length ? ozel.indexOf(form.kategori) < 0 : baskaKol)) form.kategori = (ozel.length ? ozel : kategoriler(form.tur))[0];
    if(form.faturaId || deger("cari")) l = [form.kategori].concat(l.filter(x => x !== form.kategori));
    if(l.indexOf(form.kategori) < 0) form.kategori = l[0];
    g.innerHTML = l.map(x => '<button type="button" class="secenek' + (x === form.kategori ? ' secili' : '') + '" data-deger="' + esc(x) + '">' + esc(x) + '</button>').join("");
  });
}
// İş emri formu: yeni işte iş kolu değişince aşamalar o kolun aşamalarıyla değişir
function isKolBagla(yeni){
  kolBagla(kol => {
    if(!yeni) return;
    const l = kolAsamalari(kol); form.asamaTum = l.slice(); form.asamaSecili = l.slice();
    const k = document.getElementById("asamaKutu"); if(k) k.innerHTML = asamaChipleri();
  });
}

/* --- Rapor: iş kollarına göre --- */
function kolOzeti(ay){
  const s = {}; isKollari().forEach(k => { s[k.id] = {gelir:0, gider:0, satis:0, acik:0}; });
  const kol = id => s[id] || (s[id] = {gelir:0, gider:0, satis:0, acik:0});
  veri.hareketler.forEach(h => { if((h.tur !== "giris" && h.tur !== "cikis") || h.tarih.slice(0, 7) !== ay || ortakKategorisi(h.kategori)) return; kol(hareketKolu(h))[h.tur === "giris" ? "gelir" : "gider"] += h.tutar; });
  veri.faturalar.forEach(f => { if(f.tur === "satis" && f.tarih.slice(0, 7) === ay) kol(faturaKolu(f)).satis += f.toplam; });
  veri.is_emirleri.forEach(ie => { if(ac(ie)) kol(ie.kol || "").acik++; });
  return s;
}
function raporKolKarti(){
  if(!kolVar()) return '';
  const s = kolOzeti(ayGoster);
  return '<div class="kart">' + kartBaslik("İş kollarına göre · bu ay", "(kasa esaslı; ortak sermaye / çekişleri hariç)") +
    '<table class="kesim-ozet"><thead><tr><th>İş kolu</th><th>Kasaya giren</th><th>Kasadan çıkan</th><th>Fark</th><th>Satış faturası</th><th>Açık iş</th></tr></thead><tbody>' +
    isKollari().map(k => { const x = s[k.id], f = yuvarla(x.gelir - x.gider);
      return '<tr><td><b>' + esc(k.ad) + '</b></td><td class="t-giris">' + para(x.gelir) + '</td><td class="t-cikis">' + para(x.gider) + '</td><td class="' + (f >= 0 ? 't-giris' : 't-cikis') + '">' + (f >= 0 ? "+" : "−") + para(Math.abs(f)) + '</td><td>' +
        para(x.satis) + '</td><td>' + x.acik + '</td></tr>'; }).join("") + '</tbody></table>' +
    '<div class="alt-bilgi">Kasa hareketinin iş kolu, kayıtta seçilen veya bağlı iş emrinden gelir. Kasadaki para ve ortak hesabı iş kollarının toplamıdır.</div></div>';
}

/* --- Ayarlar → İş kolları --- */
function ayarKollar(){
  const l = isKollari();
  return (cevrimici && !kolHazir() ? '<div class="uyari">İş kollarının kaydedilmesi için Supabase\'de <b>supabase-guncelleme-16.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>' : '') +
    '<div class="alt-bilgi" style="margin:0 2px 10px">Mobilya ve müteahhitlik (inşaat) işleri aynı kasada, aynı carilerle tutulur; iş emri, kasa hareketi ve faturada iş kolu seçilir. İş Emirleri, Kasa, Faturalar ve Rapor ekranlarında iş koluna göre süzülür.</div>' +
    l.map((k, i) => '<div class="kart" data-kol="' + i + '">' + kartBaslik(i === 0 ? "Ana iş kolu" : "İş kolu " + (i + 1), i === 0 ? "(eski kayıtlar buna aittir)" : "") +
      yaziAlan("kolAd" + i, "Adı", k.ad, {max:40}) +
      (i === 0 ? '<div class="alt-bilgi">Aşamalar ve kategoriler: Ayarlar → İş emirleri ve Listeler.</div>' :
        '<label class="etiket" for="kolAs' + i + '">Üretim / iş aşamaları <span class="ist">(her satıra bir)</span></label><textarea id="kolAs' + i + '" class="kutu" style="min-height:120px">' + esc((k.asamalar || []).join("\n")) + '</textarea>' +
        '<div class="iki-alan"><div><label class="etiket" for="kolGi' + i + '">Gelir kategorileri</label><textarea id="kolGi' + i + '" class="kutu" style="min-height:80px">' + esc((k.giris || []).join("\n")) + '</textarea></div>' +
        '<div><label class="etiket" for="kolCi' + i + '">Gider kategorileri</label><textarea id="kolCi' + i + '" class="kutu" style="min-height:80px">' + esc((k.cikis || []).join("\n")) + '</textarea></div></div>' +
        '<button class="baglanti" style="margin:8px 0 0" data-is="kolSil" data-arg="' + i + '">Bu iş kolunu kaldır</button>') + '</div>').join("") +
    '<div class="buton-sira"><button class="buton ikincil" style="margin:0" data-is="kolEkle">' + ik("arti") + 'İş kolu ekle</button><button class="buton" style="margin:0" data-is="kollarKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
const satirlar = id => (deger(id) || "").split("\n").map(x => x.trim()).filter(Boolean);
function kollarOku(){
  return isKollari().map((k, i) => i === 0 ? {id:"", ad:deger("kolAd0") || "Mobilya"} :
    {id:k.id, ad:deger("kolAd" + i) || k.ad, asamalar:satirlar("kolAs" + i), giris:satirlar("kolGi" + i), cikis:satirlar("kolCi" + i)});
}
EYLEM.kollarKaydet = btn => { const l = kollarOku(); if(l.some(k => !k.ad)) return uyar("İş kolu adı boş olamaz", ""); islem(btn, async () => { await sistemKaydet({kollar:l}); bildir("Kaydedildi"); ciz(); }); };
EYLEM.kolEkle = btn => islem(btn, async () => { await sistemKaydet({kollar:kollarOku().concat([{id:yeniId(), ad:"Yeni iş kolu", asamalar:[], giris:[], cikis:[]}])}); ciz(); });
EYLEM.kolSil = (el, i) => {
  const k = isKollari()[Number(i)], n = veri.is_emirleri.filter(ie => ie.kol === k.id).length + veri.hareketler.filter(h => h.kol === k.id).length;
  onayla("“" + k.ad + "” kaldırılsın mı?", n ? n + " kayıt bu iş koluna bağlı; kayıtlar silinmez ama süzgeçte görünmez olur. Önce kayıtları başka iş koluna almanız önerilir." : "", "Kaldır",
    () => islem(null, async () => { await sistemKaydet({kollar:kollarOku().filter((x, j) => j !== Number(i))}); ciz(); }));
};
