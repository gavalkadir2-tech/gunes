"use strict";
// Güneş Mobilya — rapor personel
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= RAPOR ================= */
function ekranRapor(){
  let gir = 0, cik = 0, fSatis = 0, fAlis = 0, kdvS = 0, kdvA = 0;
  const giderler = {}, gelirler = {}, musteriSatis = {};
  veri.hareketler.forEach(h => {
    if(h.tarih.slice(0, 7) !== ayGoster) return;
    if(h.tur === "giris"){ gir += h.tutar; gelirler[h.kategori] = (gelirler[h.kategori] || 0) + h.tutar; }
    else if(h.tur === "cikis"){ cik += h.tutar; giderler[h.kategori] = (giderler[h.kategori] || 0) + h.tutar; }
  });
  veri.faturalar.forEach(f => {
    if(f.tarih.slice(0, 7) !== ayGoster) return;
    if(f.tur === "satis"){ fSatis += f.toplam; kdvS += f.kdvToplam; const a = cariAdi(f.musteriId); musteriSatis[a] = (musteriSatis[a] || 0) + f.toplam; }
    else { fAlis += f.toplam; kdvA += f.kdvToplam; }
  });
  let alacak = 0, borc = 0; veri.musteriler.forEach(m => { const b = cariBakiye(m.id); if(b > 0) alacak += b; else borc -= b; });
  const html = '<div class="ust-arac">' + aySecici() + '<div class="buton-sira" style="margin:0"><button class="buton kucuk ikincil" data-git="karlilik">' + ik("grafik") + 'Proje kârlılığı</button><button class="buton kucuk ikincil" data-git="kdv">' + ik("fatura") + 'KDV özeti</button></div></div>' +
    '<div class="izgara uc"><div class="kart"><div class="kart-baslik">' + (gir - cik >= 0 ? "Kasada bu ay kalan" : "Bu ay çıkan, girenden fazla") + '</div>' +
      '<div class="buyuk-sayi ' + (gir - cik >= 0 ? "t-giris" : "t-cikis") + '" style="font-size:24px">' + para(gir - cik) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Kasaya giren</div><div class="deger t-giris">' + para(gir) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Kasadan çıkan</div><div class="deger t-cikis">' + para(cik) + '</div></div></div>' +
    '<div class="izgara dort"><div class="kart ozet"><div class="kart-baslik">Satış faturaları</div><div class="deger">' + para(fSatis) + '</div><div class="alt-bilgi">KDV ' + para(kdvS) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Alış faturaları</div><div class="deger">' + para(fAlis) + '</div><div class="alt-bilgi">KDV ' + para(kdvA) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Toplam alacak</div><div class="deger t-borc">' + para(alacak) + '</div><div class="alt-bilgi">Bugün itibarıyla</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Toplam borç</div><div class="deger t-cikis">' + para(borc) + '</div><div class="alt-bilgi">Bugün itibarıyla</div></div></div>' +
    '<div class="iki-sutun">' + cubuklar("Para nereye gitti?", giderler, cik, "var(--cikis)") + cubuklar("Para nereden geldi?", gelirler, gir, "var(--giris)") + '</div>' +
    cubuklar("En çok satış yapılan müşteriler", musteriSatis, fSatis, "var(--borc)", 8) + raporOrtakKarti() +
    rapor2();
  return {baslik:"Rapor", html};
}
// İşletme analizi: teslim edilen işlerin kârı, kategoriye göre siparişler, teklif dönüşümü, personel gideri (seçili ay).
function isTeslimTarihi(ie){
  const n = veri.is_notlari.filter(x => x.isEmriId === ie.id && /→ Teslim edildi$/.test(x.metin)).sort((a, b) => b.olusma - a.olusma)[0];
  return n ? tarihStr(new Date(n.olusma)) : ie.durum === "Teslim edildi" ? ie.teslimTarihi || "" : "";
}
function rapor2(){
  const ay = ayGoster, ayda = t => t && t.slice(0, 7) === ay, ayMs = ms => ayda(tarihStr(new Date(ms)));
  // Teslim edilen işler ve kârları
  // Kâr KDV hariç: faturalıysa faturaların ara toplamı, değilse teklifin KDV hariç tutarı
  const netSatis = ie => { const fs = veri.faturalar.filter(f => f.isEmriId === ie.id && f.tur === "satis"); return fs.length ? fs.reduce((t, f) => t + f.araToplam, 0) : isHesap(ie.kalemler, isTeklif(ie)).net; };
  const teslim = veri.is_emirleri.filter(ie => ie.durum === "Teslim edildi" && ayda(isTeslimTarihi(ie))).map(ie => {
    const k = isKarlilik(ie); return {ie, o:{fiyat:k.satis, maliyet:k.maliyet, kar:k.kar}};
  }).sort((a, b) => b.o.kar - a.o.kar);
  const tCiro = teslim.reduce((t, x) => t + x.o.fiyat, 0), tKar = teslim.reduce((t, x) => t + x.o.kar, 0);
  // Bu ay açılan siparişler (KDV hariç) — katalog kategorisine göre
  const kat = {}; let siparis = 0;
  veri.is_emirleri.filter(ie => ayMs(ie.olusma) && ie.durum !== "İptal" && ie.durum !== "Teklif").forEach(ie => {
    const h = isHesap(ie.kalemler, isTeklif(ie)); siparis += h.net;
    const k = ie.kalemler.map(x => (bul("katalog", x.katalogId) || {}).kategori).find(Boolean) || "Diğer";
    kat[k] = (kat[k] || 0) + h.net;
  });
  // Teklif dönüşümü: bu ay teklif olarak açılan işlerin durumu
  const teklifler = veri.is_emirleri.filter(ie => ayMs(ie.olusma) && (ie.durum === "Teklif" || veri.is_notlari.some(n => n.isEmriId === ie.id && /Teklif onaylandı|Durum: Teklif →|Katalogdan teklif/.test(n.metin))));
  const onay = teklifler.filter(ie => ie.durum !== "Teklif" && ie.durum !== "İptal").length;
  // Personel gideri (ödeme + avans)
  const pers = veri.personel_hareket.filter(h => (h.tur === "odeme" || h.tur === "avans") && ayda(h.tarih)).reduce((t, h) => t + h.tutar, 0);
  return bolum("İşletme analizi") +
    '<div class="izgara dort"><div class="kart ozet"><div class="kart-baslik">Teslim edilen iş</div><div class="deger">' + teslim.length + '</div><div class="alt-bilgi">Ciro ' + para(tCiro) + ' (KDV hariç)</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Teslim edilen işlerin kârı</div><div class="deger ' + (tKar >= 0 ? 't-giris' : 't-cikis') + '">' + para(tKar) + '</div><div class="alt-bilgi">' + (tCiro ? 'Kâr oranı %' + Math.round(tKar / tCiro * 100) : '—') + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Teklif → sipariş</div><div class="deger">' + (teklifler.length ? '%' + Math.round(onay / teklifler.length * 100) : '—') + '</div><div class="alt-bilgi">' + onay + ' / ' + teklifler.length + ' teklif onaylandı</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Personel ödemesi</div><div class="deger t-cikis">' + para(pers) + '</div><div class="alt-bilgi">' + (siparis ? 'Siparişlerin %' + Math.round(pers / siparis * 100) + '’i' : 'Maaş + avans') + '</div></div></div>' +
    '<div class="iki-sutun">' + cubuklar("Bu ay alınan siparişler (KDV hariç, kategoriye göre)", kat, siparis, "var(--ana)") +
    '<div class="kart"><div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600">Bu ay teslim edilen işler (kâra göre)</div>' +
      (teslim.length ? teslim.slice(0, 10).map(x => '<button class="satir" data-git="is/' + x.ie.id + '"><span class="orta"><div class="s1">' + esc(x.ie.no + " · " + x.ie.baslik) + '</div><div class="s2">' +
        esc(cariAdi(x.ie.musteriId)) + ' · satış ' + para(x.o.fiyat) + ' · maliyet ' + para(x.o.maliyet) + '</div></span><span class="tutar ' + (x.o.kar >= 0 ? 't-giris' : 't-cikis') + '">' + para(x.o.kar) + '</span></button>').join("") :
        bos("is", "Bu ay teslim edilen iş yok.")) +
      '<div class="alt-bilgi">Satış KDV hariç; maliyet: işe bağlı alış faturaları, giderler, stoktan çıkan malzeme ve elle yazılan maliyetler. <b data-git="karlilik" style="cursor:pointer;color:var(--borc)">Ayrıntılı kârlılık raporu</b></div></div></div>';
}
function cubuklar(baslik, obj, toplam, renk, sinir){
  const anahtar = Object.keys(obj).sort((a, b) => obj[b] - obj[a]).slice(0, sinir || 99);
  const govde = !anahtar.length ? '<div class="bos" style="padding:16px">Bu ay kayıt yok.</div>' : anahtar.map(k => {
    const yuzde = toplam ? Math.round(obj[k] / toplam * 100) : 0;
    return '<div class="cubuk-satir" title="' + esc(k) + ': ' + para(obj[k]) + '"><div class="cubuk-ust"><span>' + esc(k) + '</span><span style="white-space:nowrap">' + para(obj[k]) +
      ' <span class="t-soluk" style="font-size:13px">· %' + yuzde + '</span></span></div><div class="cubuk-yol"><div class="cubuk" style="width:' +
      Math.max(obj[k] / obj[anahtar[0]] * 100, 2) + '%;background:' + renk + '"></div></div></div>';
  }).join("");
  return '<div class="kart"><div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600">' + baslik + '</div>' + govde + '</div>';
}

/* ================= PERSONEL ================= */
// Hesap: hakediş ve prim personelin alacağını artırır; avans, ödeme ve kesinti azaltır.
// Ödeme ve avans kasaya "Personel Maaşı" gideri olarak da işlenir (hareketId ile bağlı).
const UCRET_TIPI = {aylik:"Aylık maaş", haftalik:"Haftalık ücret", gunluk:"Günlük yevmiye"};
const PUANTAJ = [["geldi", "Geldi"], ["yarim", "Yarım gün"], ["gelmedi", "Gelmedi"], ["izinli", "Ücretli izin"], ["ucretsiz", "Ücretsiz izin"], ["raporlu", "Raporlu"], ["tatil", "Tatil"]];
const PUANTAJ_RENK = {geldi:"#16a34a", yarim:"#f59e0b", gelmedi:"#dc2626", izinli:"#2563eb", ucretsiz:"#9ca3af", raporlu:"#7c3aed", tatil:"#0d9488"};
const PH_TUR = {hakedis:["Hakediş", 1], prim:["Prim", 1], kesinti:["Kesinti", -1], avans:["Avans", -1], odeme:["Ödeme", -1]};
const PERSONEL_AYAR = {haftaGun:6, gunSaat:9, mesaiKat:1.5};
function personelAyar(){
  const a = veri.ayarlar.find(x => x.anahtar === "personelAyar");
  return Object.assign({}, PERSONEL_AYAR, a && a.deger && typeof a.deger === "object" ? a.deger : {});
}
const tarihOku = t => { const p = t.split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); };
const gunEkle = (t, n) => { const d = tarihOku(t); d.setDate(d.getDate() + n); return tarihStr(d); };
const haftaBasi = t => { const d = tarihOku(t); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return tarihStr(d); };
const ayGunSayisi = ay => new Date(Number(ay.slice(0, 4)), Number(ay.slice(5, 7)), 0).getDate();
const GUN_ADI = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const calisiyor = (p, t) => (!p.giris || p.giris <= t) && (!p.cikis || p.cikis >= t);
const personelHareketleri = id => veri.personel_hareket.filter(h => h.personelId === id).sort(tarihSira);
function personelBakiye(id){
  return yuvarla(veri.personel_hareket.reduce((t, h) => h.personelId === id && PH_TUR[h.tur] ? t + PH_TUR[h.tur][1] * h.tutar : t, 0));
}
function donemBilgi(tip, bas){
  if(tip === "ay"){ const ay = bas.slice(0, 7); return {anahtar:ay, bas:ay + "-01", bit:ay + "-" + ("0" + ayGunSayisi(ay)).slice(-2), ad:AYLAR[Number(ay.slice(5, 7)) - 1] + " " + ay.slice(0, 4)}; }
  const h = haftaBasi(bas), bit = gunEkle(h, 6), kisa = t => Number(t.slice(8)) + " " + AYLAR[Number(t.slice(5, 7)) - 1];
  return {anahtar:"H" + h, bas:h, bit, ad:kisa(h) + " – " + kisa(bit) + " " + bit.slice(0, 4)};
}
const donemAdi = d => d.charAt(0) === "H" ? donemBilgi("hafta", d.slice(1)).ad + " haftası" : donemBilgi("ay", d).ad;
// Dönem hakedişi. Aylık / haftalık personelde işaretlenmeyen gün "geldi" sayılır; yevmiyelide sadece işaretli günler ödenir.
function hakedisHesap(p, bas, bit){
  const ay = personelAyar(), kayit = {}, sayac = {}; let gun = 0, isaretsiz = 0, mesai = 0;
  veri.puantaj.forEach(x => { if(x.personelId === p.id && x.tarih >= bas && x.tarih <= bit) kayit[x.tarih] = x; });
  for(let t = bas; t <= bit; t = gunEkle(t, 1)){
    if(!calisiyor(p, t)) continue;
    gun++;
    const k = kayit[t];
    if(!k){ isaretsiz++; continue; }
    sayac[k.durum] = (sayac[k.durum] || 0) + 1; mesai += k.mesai || 0;
  }
  const s = d => sayac[d] || 0, toplamGun = Math.round((tarihOku(bit) - tarihOku(bas)) / 86400000) + 1;
  const gunluk = p.ucretTipi === "aylik" ? p.ucret / 30 : p.ucretTipi === "haftalik" ? p.ucret / ay.haftaGun : p.ucret;
  let temel, kesinti = 0;
  if(p.ucretTipi === "gunluk") temel = gunluk * (s("geldi") + s("izinli") + s("yarim") / 2);
  else {
    temel = p.ucret * gun / toplamGun;   // dönemin tamamında çalıştıysa tam ücret
    kesinti = gunluk * (s("gelmedi") + s("ucretsiz") + s("raporlu") + s("yarim") / 2);
  }
  const mesaiUcret = mesai * gunluk / ay.gunSaat * ay.mesaiKat;
  return {gun, isaretsiz, sayac, mesai, gunluk:yuvarla(gunluk), temel:yuvarla(temel), kesinti:yuvarla(kesinti), mesaiUcret:yuvarla(mesaiUcret),
    toplam:yuvarla(Math.max(0, temel - kesinti + mesaiUcret))};
}
const puantajOzet = h => PUANTAJ.filter(x => h.sayac[x[0]]).map(x => h.sayac[x[0]] + " " + x[1].toLocaleLowerCase("tr")).concat(h.mesai ? [sayiYaz(h.mesai) + " saat mesai"] : []).join(" · ");
const personelEksik = () => eksikTablo.personel || eksikTablo.puantaj || eksikTablo.personel_hareket;
const personelUyari = () => '<div class="uyari">Personel bölümü için Supabase\'de <b>supabase-guncelleme-5.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>';
// Kasaya gider yazar ve personel hesabına işler.
async function personelOdemeKaydet(p, tur, tutar, o){
  let hid = null;
  if(tur === "odeme" || tur === "avans"){
    hid = yeniId();
    await Depo.kaydet("hareketler", {id:hid, tur:"cikis", tutar, kategori:"Personel Maaşı", odeme:o.odeme || "Nakit", musteriId:null, isEmriId:null, faturaId:null,
      aciklama:(tur === "avans" ? "Avans: " : "Maaş / ücret: ") + p.ad + (o.donem ? " (" + donemAdi(o.donem) + ")" : "") + (o.aciklama ? " · " + o.aciklama : ""), tarih:o.tarih || bugun(), olusma:Date.now()});
  }
  try{
    await Depo.kaydet("personel_hareket", {id:yeniId(), personelId:p.id, tur, tutar, tarih:o.tarih || bugun(), donem:o.donem || "", aciklama:o.aciklama || "", hareketId:hid, olusma:Date.now()});
  }catch(e){ if(hid) await Depo.sil("hareketler", hid, {cop:false}).catch(() => {}); throw e; }
}

function ekranPersonel(){
  if(personelEksik()) return {baslik:"Personel", html:personelUyari()};
  const bg = bugun(), ayB = donemBilgi("ay", bg), f = filtre.personel;
  const aktif = veri.personel.filter(p => calisiyor(p, bg));
  const liste = veri.personel.filter(p => f === "hepsi" || (f === "ayrilan" ? !calisiyor(p, bg) : calisiyor(p, bg))).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const bugunKayit = aktif.filter(p => veri.puantaj.some(x => x.personelId === p.id && x.tarih === bg)).length;
  const odenen = veri.personel_hareket.filter(h => (h.tur === "odeme" || h.tur === "avans") && h.tarih >= ayB.bas && h.tarih <= ayB.bit).reduce((t, h) => t + h.tutar, 0);
  const borc = veri.personel.reduce((t, p) => t + Math.max(personelBakiye(p.id), 0), 0);
  const html = '<div class="izgara dort">' +
      '<div class="kart ozet"><div class="kart-baslik">Çalışan</div><div class="deger">' + aktif.length + '</div></div>' +
      '<button class="kart ozet" data-git="puantaj"><div class="kart-baslik">Bugün puantaj ' + ik("sag") + '</div><div class="deger">' + bugunKayit + ' / ' + aktif.length + '</div></button>' +
      '<div class="kart ozet"><div class="kart-baslik">' + esc(ayB.ad) + ' ödenen</div><div class="deger t-cikis">' + para(odenen) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Personele borcumuz</div><div class="deger">' + para(borc) + '</div></div></div>' +
    '<div class="hizli" style="grid-template-columns:repeat(3,1fr)">' + hizliButon("puantaj", "r-giris", "tamam", "Puantaj") +
      hizliButon("maas/ay", "r-cikis", "kasa", "Maaş / Ödeme") + hizliButon("personel-form", "r-ana", "arti", "Yeni Personel") + '</div>' +
    '<div class="ust-arac">' + filtreButonlari("personel", [["aktif", "Çalışanlar"], ["ayrilan", "Ayrılanlar"], ["hepsi", "Hepsi"]]) + '</div>' +
    '<div class="kart liste-kart">' + (liste.length ? liste.map(p => {
      const b = personelBakiye(p.id);
      return '<button class="satir" data-git="personel/' + p.id + '"><span class="rozet r-ana">' + ik("kisi") + '</span><span class="orta"><div class="s1">' + esc(p.ad) + '</div>' +
        '<div class="s2">' + esc([p.gorev, UCRET_TIPI[p.ucretTipi] + " " + para(p.ucret), calisiyor(p, bg) ? "" : "Ayrıldı"].filter(Boolean).join(" · ")) + '</div></span>' +
        '<span class="sag"><div class="tutar ' + (b > 0 ? 't-cikis' : b < 0 ? 't-borc' : 't-soluk') + '">' + para(Math.abs(b)) + '</div><div class="s2">' + (b > 0 ? "Alacağı" : b < 0 ? "Avans fazlası" : "Hesap kapalı") + '</div></span></button>';
    }).join("") : bos("kisiler", f === "ayrilan" ? "Ayrılan personel yok." : "Henüz personel eklenmedi.")) + '</div>' +
    personelAyarKarti();
  return {baslik:"Personel", geri: matchMedia("(max-width:899px)").matches, html};
}
function personelAyarKarti(){
  const a = personelAyar();
  return '<div class="kart" style="margin-top:12px"><div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600">Hesaplama ayarları</div>' +
    '<div class="alt-bilgi" style="margin:0">Aylık maaşta günlük ücret = maaş ÷ 30; haftalıkta = ücret ÷ haftalık çalışma günü. Fazla mesai saat ücreti = günlük ücret ÷ günlük saat × katsayı.</div>' +
    '<div class="izgara uc" style="margin:4px 0 0"><div><label class="etiket" for="paHafta">Haftalık çalışma günü</label><input id="paHafta" class="kutu" inputmode="numeric" value="' + a.haftaGun + '"></div>' +
    '<div><label class="etiket" for="paSaat">Günlük çalışma saati</label><input id="paSaat" class="kutu" inputmode="decimal" value="' + sayiYaz(a.gunSaat) + '"></div>' +
    '<div><label class="etiket" for="paKat">Fazla mesai katsayısı</label><input id="paKat" class="kutu" inputmode="decimal" value="' + sayiYaz(a.mesaiKat) + '"></div></div>' +
    '<button class="buton ikincil" data-is="personelAyarKaydet">' + ik("tamam") + 'Ayarları kaydet</button></div>';
}
EYLEM.personelAyarKaydet = btn => {
  const d = {haftaGun:Math.round(sayiOku(deger("paHafta"))), gunSaat:sayiOku(deger("paSaat")), mesaiKat:sayiOku(deger("paKat"))};
  if(!(d.haftaGun >= 1 && d.haftaGun <= 7) || !(d.gunSaat > 0 && d.gunSaat <= 24) || !(d.mesaiKat >= 1 && d.mesaiKat <= 5)) return uyar("Ayarları kontrol edin", "Çalışma günü 1–7, saat 1–24, katsayı 1–5 arası olmalı.");
  islem(btn, async () => { await Depo.kaydet("ayarlar", {anahtar:"personelAyar", deger:d}); bildir("Ayarlar kaydedildi"); ciz(); });
};

function ekranPersonelForm(id){
  if(personelEksik()) return {baslik:"Personel", geri:true, html:personelUyari()};
  const p = bul("personel", id);
  form = {ucretTipi: p ? p.ucretTipi : "aylik", _surum: p ? p._surum : null};
  const html = '<div class="kart form-kart">' +
    '<label class="etiket" for="pAd" style="margin-top:0">Ad soyad</label><input id="pAd" class="kutu" maxlength="80" value="' + esc(p ? p.ad : "") + '">' +
    '<div class="iki-alan"><div><label class="etiket" for="pGorev">Görevi <span class="ist">(isteğe bağlı)</span></label><input id="pGorev" class="kutu" maxlength="60" list="gorevler" value="' + esc(p ? p.gorev : "") + '" placeholder="Usta, kalfa, montajcı…">' +
      '<datalist id="gorevler">' + ["Usta", "Kalfa", "Çırak", "Montajcı", "Döşemeci", "Boyacı", "Şoför", "Satış"].map(g => '<option value="' + g + '">').join("") + '</datalist></div>' +
    '<div><label class="etiket" for="pTel">Telefon <span class="ist">(isteğe bağlı)</span></label><input id="pTel" class="kutu" inputmode="tel" maxlength="30" value="' + esc(p ? p.telefon : "") + '"></div></div>' +
    '<label class="etiket">Ücret şekli</label><div class="secenekler" data-ad="ucretTipi">' + Object.keys(UCRET_TIPI).map(k =>
      '<button type="button" class="secenek' + (k === form.ucretTipi ? ' secili' : '') + '" data-deger="' + k + '">' + UCRET_TIPI[k] + '</button>').join("") + '</div>' +
    '<div class="iki-alan"><div><label class="etiket" for="pUcret">Ücret <span class="ist">(net, ele geçen)</span></label><input id="pUcret" class="kutu" inputmode="decimal" value="' + (p ? sayiYaz(p.ucret) : "") + '" placeholder="0 ₺"></div>' +
    '<div><label class="etiket" for="pIzin">Yıllık izin hakkı (gün)</label><input id="pIzin" class="kutu" inputmode="numeric" value="' + (p ? p.izinHakki : 14) + '"></div></div>' +
    '<div class="iki-alan"><div>' + tarihAlani("pGiris", "İşe giriş tarihi", p ? p.giris : bugun(), true) + '</div>' +
    (p ? '<div>' + tarihAlani("pCikis", "İşten ayrılış tarihi", p.cikis, true) + '</div>' : '<div></div>') + '</div>' +
    '<label class="etiket" for="pIban">IBAN <span class="ist">(isteğe bağlı)</span></label><input id="pIban" class="kutu" maxlength="40" value="' + esc(p ? p.iban : "") + '">' +
    '<label class="etiket" for="pNot">Notlar <span class="ist">(isteğe bağlı)</span></label><textarea id="pNot" class="kutu" maxlength="1000" style="min-height:64px">' + esc(p ? p.notlar : "") + '</textarea>' +
    '<div class="hata" id="hata"></div><button class="buton" data-is="personelKaydet" data-arg="' + (p ? p.id : "") + '">' + ik("tamam") + 'Kaydet</button></div>';
  return {baslik: p ? "Personeli düzenle" : "Yeni personel", geri:true, html, sonra(){ secenekBagla(); document.getElementById("pAd").focus(); }};
}
EYLEM.personelKaydet = (btn, id) => {
  const ad = deger("pAd"), ucret = sayiOku(deger("pUcret")), izin = Math.round(sayiOku(deger("pIzin") || "0"));
  if(!ad) return hataYaz("Lütfen adını yazın.");
  if(!(ucret >= 0) || ucret > 1e7) return hataYaz("Ücreti kontrol edin.");
  if(!(izin >= 0 && izin <= 60)) return hataYaz("İzin hakkı 0–60 gün arası olmalı.");
  const giris = deger("pGiris") || null, cikis = deger("pCikis") || null;
  if(giris && cikis && cikis < giris) return hataYaz("Ayrılış tarihi girişten önce olamaz.");
  const eski = bul("personel", id);
  const k = {id: id || yeniId(), ad, gorev:deger("pGorev"), telefon:deger("pTel"), iban:deger("pIban"), giris, cikis, ucretTipi:form.ucretTipi, ucret:yuvarla(ucret),
    izinHakki:izin, notlar:deger("pNot"), olusma: eski ? eski.olusma : Date.now()};
  islem(btn, async () => {
    await Depo.kaydet("personel", Object.assign(k, form._surum != null ? {_surum:form._surum} : {}));
    bildir(id ? "Kaydedildi" : "Personel eklendi");
    if(id) geri(); else { history.replaceState(null, "", "#personel/" + k.id); ciz(); }
  });
};

function ekranPersonelKart(id){
  if(personelEksik()) return {baslik:"Personel", geri:true, html:personelUyari()};
  const p = bul("personel", id);
  if(!p) return {baslik:"Personel", geri:true, html:'<div class="kart">' + bos("kisi", "Personel bulunamadı.") + '</div>'};
  const bg = bugun(), b = personelBakiye(id), hl = personelHareketleri(id), yil = bg.slice(0, 4);
  const ay = filtre.personelAy || bg.slice(0, 7), ayB = donemBilgi("ay", ay), hes = hakedisHesap(p, ayB.bas, ayB.bit);
  const izinKul = veri.puantaj.filter(x => x.personelId === id && x.durum === "izinli" && x.tarih.slice(0, 4) === yil).length;
  const puan = {}; veri.puantaj.forEach(x => { if(x.personelId === id && x.tarih.slice(0, 7) === ay) puan[x.tarih] = x; });
  const ilkGun = (tarihOku(ayB.bas).getDay() + 6) % 7;
  let takvim = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:12px;text-align:center;margin-top:8px">' +
    ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(g => '<div style="color:var(--soluk)">' + g + '</div>').join("") + '<div></div>'.repeat(ilkGun);
  for(let t = ayB.bas; t <= ayB.bit; t = gunEkle(t, 1)){
    const k = puan[t], renk = k ? PUANTAJ_RENK[k.durum] : null, ad = k ? (PUANTAJ.find(x => x[0] === k.durum) || [])[1] : "İşaretsiz";
    takvim += '<button data-git="puantaj/' + t + '" title="' + esc(ad + (k && k.mesai ? " · " + sayiYaz(k.mesai) + " sa mesai" : "")) + '" style="border:1px solid ' + (t === bg ? 'var(--yazi)' : 'var(--cizgi)') + ';border-radius:8px;padding:6px 0;background:' +
      (renk ? renk + "22" : "#fff") + ';color:' + (renk || "var(--soluk)") + ';font-weight:600;opacity:' + (calisiyor(p, t) ? 1 : .35) + '">' + Number(t.slice(8)) + (k && k.mesai ? '<sup>+</sup>' : '') + '</button>';
  }
  takvim += '</div><div class="secenekler" style="margin-top:8px;gap:6px">' + PUANTAJ.map(x => '<span style="font-size:12px;color:' + PUANTAJ_RENK[x[0]] + '">● ' + x[1] + '</span>').join("") + '</div>';
  const html = '<div class="iki-sutun"><div>' +
    '<div class="kart"><div class="kart-baslik"><span>' + esc(p.gorev || "Personel") + '</span>' + (calisiyor(p, bg) ? '' : '<span class="etiket-rozet d-gri">Ayrıldı</span>') + '</div>' +
      '<div style="font-size:18px;font-weight:600;margin:2px 0 6px">' + esc(p.ad) + '</div>' +
      bilgiSatir("Ücret", UCRET_TIPI[p.ucretTipi] + " · " + para(p.ucret)) +
      (p.telefon ? bilgiSatir("Telefon", '<a class="tel" style="margin:0" href="tel:' + esc(p.telefon.replace(/[^\d+]/g, "")) + '">' + esc(p.telefon) + '</a>') : '') +
      (p.giris ? bilgiSatir("İşe giriş", tarihYaz(p.giris)) : '') + (p.cikis ? bilgiSatir("Ayrılış", tarihYaz(p.cikis)) : '') +
      (p.iban ? bilgiSatir("IBAN", esc(p.iban)) : '') + bilgiSatir(yil + " ücretli izin", izinKul + " / " + p.izinHakki + " gün") +
      (p.notlar ? '<div style="white-space:pre-wrap;font-size:14px;margin-top:10px;background:var(--hafif);border-radius:10px;padding:10px 12px">' + esc(p.notlar) + '</div>' : '') + '</div>' +
    '<div class="kart"><div class="kart-baslik">' + (b >= 0 ? 'Personelin alacağı' : 'Avans fazlası (personelin borcu)') + '</div><div class="buyuk-sayi ' + (b > 0 ? 't-cikis' : b < 0 ? 't-borc' : '') + '">' + para(Math.abs(b)) + '</div></div>' +
    '<div class="hizli" style="grid-template-columns:1fr 1fr">' +
      '<button data-is="phEkle" data-arg="' + id + '|avans"><span class="rozet r-cikis">' + ik("yukari") + '</span>Avans ver</button>' +
      '<button data-git="maas/' + (p.ucretTipi === "aylik" ? "ay" : "hafta") + '"><span class="rozet r-giris">' + ik("kasa") + '</span>Maaş / ödeme</button>' +
      '<button data-is="phEkle" data-arg="' + id + '|prim"><span class="rozet r-borc">' + ik("arti") + '</span>Prim ekle</button>' +
      '<button data-is="phEkle" data-arg="' + id + '|kesinti"><span class="rozet r-gri">' + ik("x") + '</span>Kesinti ekle</button></div>' +
    (p.telefon ? '<button class="buton wa-buton" style="margin-top:0" data-is="waPersonel" data-arg="' + id + '">' + ik("mesaj") + 'Hesap özetini WhatsApp\'tan gönder</button>' : '') +
    '<div class="buton-sira" style="margin:12px 0"><button class="buton ikincil" data-git="personel-form/' + id + '">' + ik("kalem") + 'Düzenle</button>' +
      '<button class="buton tehlike" data-is="personelSil" data-arg="' + id + '">' + ik("sil") + 'Sil</button></div>' +
    '</div><div>' +
    '<div class="kart"><div class="kart-baslik"><span>Puantaj</span><span class="ay-sec" style="gap:4px"><button class="ikon-buton" data-is="personelAy" data-arg="-1" aria-label="Önceki ay">' + ik("sol") + '</button>' +
      '<b style="color:var(--yazi);min-width:110px;text-align:center">' + esc(ayB.ad) + '</b><button class="ikon-buton" data-is="personelAy" data-arg="1" aria-label="Sonraki ay">' + ik("sag") + '</button></span></div>' +
      takvim + '<div class="alt-bilgi">' + (puantajOzet(hes) || "Bu ay kayıt yok.") + (hes.isaretsiz ? ' · ' + hes.isaretsiz + ' gün işaretsiz' + (p.ucretTipi === "gunluk" ? ' (ödenmez)' : ' (geldi sayılır)') : '') + '</div>' +
      '<div class="alt-bilgi">Bu ayın hesaplanan hakedişi: <b>' + para(hes.toplam) + '</b></div></div>' +
    bolum("Hesap hareketleri (" + hl.length + ")") + '<div class="kart liste-kart">' + (hl.length ? hl.map(h => {
      const [ad, yon] = PH_TUR[h.tur] || [h.tur, 0];
      return '<div class="satir"><span class="rozet ' + (yon > 0 ? 'r-giris' : 'r-cikis') + '">' + ik(yon > 0 ? "arti" : "yukari") + '</span><span class="orta"><div class="s1">' + ad + (h.donem ? ' · ' + esc(donemAdi(h.donem)) : '') + '</div>' +
        '<div class="s2">' + esc([tarihYaz(h.tarih, true), h.aciklama, h.hareketId ? "kasaya işlendi" : ""].filter(Boolean).join(" · ")) + '</div></span>' +
        '<span class="tutar ' + (yon > 0 ? 't-giris' : 't-cikis') + '">' + (yon > 0 ? '+' : '−') + para(h.tutar) + '</span>' +
        '<button class="ikon-buton" style="margin-left:6px" data-is="phSil" data-arg="' + h.id + '" aria-label="Sil">' + ik("sil") + '</button></div>';
    }).join("") : bos("kasa", "Henüz hareket yok.")) + '</div>' +
    '</div></div>';
  return {baslik:p.ad, geri:true, html};
}
EYLEM.personelAy = (el, n) => {
  const t = tarihOku((filtre.personelAy || bugun().slice(0, 7)) + "-01"); t.setMonth(t.getMonth() + Number(n));
  filtre.personelAy = tarihStr(t).slice(0, 7); ciz();
};
EYLEM.phEkle = (el, arg) => {
  const [id, tur] = arg.split("|"), p = bul("personel", id); if(!p) return;
  const kasa_ = tur === "avans", pp = document.createElement("div"); pp.className = "perde";
  pp.innerHTML = '<div class="pencere" style="max-width:420px"><p>' + PH_TUR[tur][0] + ' · ' + esc(p.ad) + '</p>' +
    (kasa_ ? '<div class="alt-bilgi">Kasadan çıkış olarak da işlenir; sonraki maaştan düşülür.</div>' : tur === "prim" ? '<div class="alt-bilgi">Personelin alacağına eklenir; ödeme yapınca kasadan çıkar.</div>' : '<div class="alt-bilgi">Personelin alacağından düşülür (ör. hasar, ceza).</div>') +
    '<label class="etiket" for="phTutar">Tutar</label><input id="phTutar" class="kutu tutar-kutu" inputmode="decimal" placeholder="0 ₺">' +
    '<div class="iki-alan"><div>' + tarihAlani("phTarih", "Tarih", bugun()) + '</div>' +
    (kasa_ ? '<div><label class="etiket" for="phOdeme">Ödeme şekli</label><select id="phOdeme" class="kutu">' + ODEME.map(o => '<option>' + o + '</option>').join("") + '</select></div>' : '<div></div>') + '</div>' +
    '<label class="etiket" for="phAciklama">Açıklama <span class="ist">(isteğe bağlı)</span></label><input id="phAciklama" class="kutu" maxlength="200">' +
    '<div class="hata" id="phHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  pp.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if(!b){ if(e.target === pp) pp.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return pp.remove();
    const tutar = sayiOku(pp.querySelector("#phTutar").value);
    if(!(tutar > 0) || tutar > 1e8){ pp.querySelector("#phHata").textContent = "Lütfen geçerli bir tutar yazın."; return; }
    b.disabled = true;
    personelOdemeKaydet(p, tur, yuvarla(tutar), {tarih:pp.querySelector("#phTarih").value || bugun(), aciklama:pp.querySelector("#phAciklama").value.trim(),
      odeme: kasa_ ? pp.querySelector("#phOdeme").value : null})
      .then(() => { pp.remove(); bildir(PH_TUR[tur][0] + " kaydedildi"); ciz(); })
      .catch(err => { b.disabled = false; pp.querySelector("#phHata").textContent = hataMesaji(err); });
  });
  document.body.appendChild(pp);
  pp.querySelector("#phTutar").focus();
};
EYLEM.phSil = (el, id) => {
  const h = bul("personel_hareket", id); if(!h) return;
  onayla(PH_TUR[h.tur][0] + " kaydı silinsin mi?", para(h.tutar) + (h.hareketId ? " · Kasadaki çıkış kaydı da silinir." : ""), "Sil", () => islem(null, async () => {
    await copGrubuyla("Personel hesabı: " + kayitBasligi("personel_hareket", h), async () => {
      const hid = h.hareketId;
      await Depo.sil("personel_hareket", id);
      if(hid && bul("hareketler", hid)) await Depo.sil("hareketler", hid);
    });
    bildir("Silindi"); ciz();
  }));
};
EYLEM.personelSil = (el, id) => {
  const p = bul("personel", id); if(!p) return;
  if(veri.personel_hareket.some(h => h.personelId === id))
    return uyar("Bu personel silinemez", "Hesap hareketleri var. İşten ayrıldıysa “Düzenle”den ayrılış tarihini girin; kayıtları korunur.");
  onayla("“" + p.ad + "” silinsin mi?", "Puantaj kayıtlarıyla birlikte çöp kutusuna taşınır.", "Sil", () => islem(null, async () => {
    await Depo.sil("personel", id);
    bildir("Silindi"); git("personel");
  }));
};
EYLEM.waPersonel = (el, id) => {
  const p = bul("personel", id); if(!p) return;
  const b = personelBakiye(id), son = personelHareketleri(id).slice(0, 8);
  waPencere({tel:p.telefon, ad:p.ad, sablonlar:[{ad:"Hesap özeti", metin:"Merhaba " + p.ad + ", hesap özetiniz:\n" +
    son.map(h => "• " + tarihYaz(h.tarih, true) + " " + PH_TUR[h.tur][0] + (h.donem ? " (" + donemAdi(h.donem) + ")" : "") + ": " + (PH_TUR[h.tur][1] > 0 ? "+" : "−") + para(h.tutar)).join("\n") +
    "\n\n" + (b >= 0 ? "Kalan alacağınız: " : "Avans fazlası: ") + para(Math.abs(b)) + "\n\n" + FIRMA}]});
};

/* --- Puantaj --- */
function ekranPuantaj(t){
  if(personelEksik()) return {baslik:"Puantaj", geri:true, html:personelUyari()};
  t = /^\d{4}-\d{2}-\d{2}$/.test(t || "") ? t : bugun();
  const kisiler = veri.personel.filter(p => calisiyor(p, t)).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const kayit = {}; veri.puantaj.forEach(x => { if(x.tarih === t) kayit[x.personelId] = x; });
  const d = tarihOku(t), eksik = kisiler.filter(p => !kayit[p.id]).length;
  const html = '<div class="ust-arac"><div class="ay-sec"><button class="ikon-buton" data-git="puantaj/' + gunEkle(t, -1) + '" aria-label="Önceki gün">' + ik("sol") + '</button>' +
      '<strong>' + GUN_ADI[d.getDay()] + ', ' + d.getDate() + ' ' + AYLAR[d.getMonth()] + '</strong><button class="ikon-buton" data-git="puantaj/' + gunEkle(t, 1) + '" aria-label="Sonraki gün">' + ik("sag") + '</button></div>' +
      '<input type="date" class="kutu" style="width:auto" value="' + t + '" onchange="if(this.value) git(\'puantaj/\' + this.value)"></div>' +
    (kisiler.length && eksik ? '<button class="buton ikincil" style="margin:0 0 12px" data-is="puantajHepsi" data-arg="' + t + '">' + ik("tamam") + 'İşaretlenmeyen ' + eksik + ' kişiyi “Geldi” yap</button>' : '') +
    (kisiler.length ? kisiler.map(p => {
      const k = kayit[p.id];
      return '<div class="kart" style="padding:12px 14px"><div class="kart-baslik" style="margin-bottom:8px"><b style="color:var(--yazi);font-size:15px">' + esc(p.ad) + '</b><span>' + esc(p.gorev) + '</span></div>' +
        '<div class="secenekler">' + PUANTAJ.map(x => '<button class="secenek' + (k && k.durum === x[0] ? ' secili' : '') + '" style="' + (k && k.durum === x[0] ? 'background:' + PUANTAJ_RENK[x[0]] + ';border-color:' + PUANTAJ_RENK[x[0]] : '') + '" data-is="puantajSec" data-arg="' + p.id + '|' + t + '|' + x[0] + '">' + x[1] + '</button>').join("") + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><label for="m-' + p.id + '" style="font-size:14px;color:var(--soluk)">Fazla mesai (saat)</label>' +
        '<input id="m-' + p.id + '" class="kutu" inputmode="decimal" style="width:90px;padding:6px 10px" value="' + (k && k.mesai ? sayiYaz(k.mesai) : "") + '" placeholder="0" onchange="puantajMesai(\'' + p.id + '\',\'' + t + '\',this)"></div></div>';
    }).join("") : '<div class="kart">' + bos("kisiler", "Bu tarihte çalışan personel yok.") + '</div>');
  return {baslik:"Puantaj", geri:true, html};
}
async function puantajYaz(pid, t, degis){
  const id = pid + "_" + t, eski = bul("puantaj", id);
  await Depo.kaydet("puantaj", Object.assign({id, personelId:pid, tarih:t, durum:"geldi", mesai:0, not:""}, eski, degis));
}
EYLEM.puantajSec = (el, arg) => {
  const [pid, t, durum] = arg.split("|"), eski = bul("puantaj", pid + "_" + t);
  islem(null, async () => {
    if(eski && eski.durum === durum && !eski.mesai) await Depo.sil("puantaj", eski.id, {cop:false});   // aynı düğmeye tekrar basınca işaret kalkar
    else await puantajYaz(pid, t, {durum});
    sessizCiz();
  });
};
function puantajMesai(pid, t, input){
  const m = input.value.trim() ? sayiOku(input.value) : 0;
  if(!(m >= 0 && m <= 16)){ input.value = ""; return uyar("Mesai saatini kontrol edin", "0 ile 16 saat arası olmalı."); }
  islem(null, async () => { await puantajYaz(pid, t, {mesai:yuvarla(m)}); bildir("Mesai kaydedildi"); });
}
EYLEM.puantajHepsi = (btn, t) => {
  const l = veri.personel.filter(p => calisiyor(p, t) && !bul("puantaj", p.id + "_" + t));
  islem(btn, async () => { await Depo.kaydet("puantaj", l.map(p => ({id:p.id + "_" + t, personelId:p.id, tarih:t, durum:"geldi", mesai:0, not:""}))); bildir(l.length + " kişi işaretlendi"); ciz(); });
};

/* --- Maaş / ödeme --- */
function ekranMaas(tip, bas){
  if(personelEksik()) return {baslik:"Maaş / ödeme", geri:true, html:personelUyari()};
  tip = tip === "hafta" ? "hafta" : "ay";
  const d = donemBilgi(tip, bas && /^\d{4}-\d{2}/.test(bas) ? (bas.length === 7 ? bas + "-01" : bas) : bugun());
  const once = tip === "ay" ? tarihStr(new Date(tarihOku(d.bas).getFullYear(), tarihOku(d.bas).getMonth() - 1, 1)) : gunEkle(d.bas, -7);
  const sonra = tip === "ay" ? gunEkle(d.bit, 1) : gunEkle(d.bas, 7);
  const kisiler = veri.personel.filter(p => (tip === "ay" ? p.ucretTipi === "aylik" : p.ucretTipi !== "aylik") && (!p.giris || p.giris <= d.bit) && (!p.cikis || p.cikis >= d.bas))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  form = {maas:{}};
  let toplamOdenecek = 0;
  const satirlar = kisiler.map(p => {
    const hes = hakedisHesap(p, d.bas, d.bit), kayitli = veri.personel_hareket.find(h => h.personelId === p.id && h.tur === "hakedis" && h.donem === d.anahtar);
    const bakiye = personelBakiye(p.id), odenecek = yuvarla(Math.max(0, bakiye + (kayitli ? 0 : hes.toplam)));
    const odenen = veri.personel_hareket.filter(h => h.personelId === p.id && h.tur === "odeme" && h.donem === d.anahtar).reduce((t, h) => t + h.tutar, 0);
    form.maas[p.id] = {hes, kayitli:!!kayitli};
    toplamOdenecek += odenecek;
    return '<div class="kart"><div class="kart-baslik"><b style="color:var(--yazi);font-size:15px" data-git="personel/' + p.id + '">' + esc(p.ad) + '</b><span>' + UCRET_TIPI[p.ucretTipi] + ' ' + para(p.ucret) + '</span></div>' +
      '<div class="alt-bilgi" style="margin:0 0 6px">' + (puantajOzet(hes) || "Puantaj kaydı yok") + (hes.isaretsiz ? ' · ' + hes.isaretsiz + ' gün işaretsiz' + (p.ucretTipi === "gunluk" ? ' <b style="color:#b91c1c">(ödenmez)</b>' : ' (geldi sayıldı)') : '') + '</div>' +
      (kayitli ? bilgiSatir("Bu dönemin hakedişi", para(kayitli.tutar) + ' <span class="etiket-rozet d-yesil">kaydedildi</span>') :
        bilgiSatir(p.ucretTipi === "gunluk" ? "Yevmiye (" + para(hes.gunluk) + " × gün)" : "Dönem ücreti", para(hes.temel)) +
        (hes.kesinti ? bilgiSatir("Devamsızlık kesintisi", "−" + para(hes.kesinti)) : '') + (hes.mesaiUcret ? bilgiSatir("Fazla mesai (" + sayiYaz(hes.mesai) + " sa)", "+" + para(hes.mesaiUcret)) : '') +
        bilgiSatir("<b>Bu dönemin hakedişi</b>", '<b>' + para(hes.toplam) + '</b>')) +
      (bakiye ? bilgiSatir(bakiye > 0 ? "Önceki alacağı" : "Avans / fazla ödeme", (bakiye > 0 ? "+" : "−") + para(Math.abs(bakiye))) : '') +
      (odenen ? bilgiSatir("Bu dönem ödenen", para(odenen)) : '') +
      '<div class="iki-alan" style="align-items:end"><div><label class="etiket" for="o-' + p.id + '">Ödenecek</label><input id="o-' + p.id + '" class="kutu" inputmode="decimal" value="' + sayiYaz(odenecek) + '" placeholder="0 ₺"></div>' +
      '<div><label class="etiket" for="s-' + p.id + '">Ödeme şekli</label><select id="s-' + p.id + '" class="kutu">' + ODEME.map(o => '<option>' + o + '</option>').join("") + '</select></div></div>' +
      '<button class="buton" data-is="maasOde" data-arg="' + p.id + '|' + tip + '|' + d.bas + '">' + ik("tamam") + (kayitli ? 'Ödemeyi kaydet' : 'Hakedişi ve ödemeyi kaydet') + '</button></div>';
  });
  const html = '<div class="ust-arac"><div class="secenekler"><button class="secenek' + (tip === "ay" ? ' secili' : '') + '" data-git="maas/ay">Aylık maaşlar</button>' +
      '<button class="secenek' + (tip === "hafta" ? ' secili' : '') + '" data-git="maas/hafta">Haftalık / yevmiye</button></div>' +
    '<div class="ay-sec"><button class="ikon-buton" data-git="maas/' + tip + '/' + once + '" aria-label="Önceki">' + ik("sol") + '</button><strong>' + esc(d.ad) + '</strong>' +
      '<button class="ikon-buton" data-git="maas/' + tip + '/' + sonra + '" aria-label="Sonraki">' + ik("sag") + '</button></div></div>' +
    '<div class="alt-bilgi" style="margin:0 0 12px">Hakediş = dönem ücreti − devamsızlık + fazla mesai. Ödenecek tutara önceki alacak eklenir, avanslar düşülür. Ödeme kasaya “Personel Maaşı” gideri olarak işlenir; tutarı değiştirerek kısmi ödeme yapabilirsiniz, kalanı sonraki döneme devreder.</div>' +
    (kisiler.length ? satirlar.join("") + '<div class="kart ozet"><div class="kart-baslik">Bu dönem toplam ödenecek</div><div class="deger">' + para(toplamOdenecek) + '</div></div>' :
      '<div class="kart">' + bos("kisiler", tip === "ay" ? "Aylık maaşlı personel yok." : "Haftalık veya yevmiyeli personel yok.") + '</div>');
  return {baslik:"Maaş / ödeme", geri:true, html};
}
EYLEM.maasOde = (btn, arg) => {
  const [id, tip, bas] = arg.split("|"), p = bul("personel", id), m = form.maas && form.maas[id]; if(!p || !m) return;
  const d = donemBilgi(tip, bas), yazi = deger("o-" + id), tutar = yazi ? sayiOku(yazi) : 0;
  if(!(tutar >= 0) || tutar > 1e8) return uyar("Tutarı kontrol edin", "");
  if(m.kayitli && !(tutar > 0)) return uyar("Ödenecek tutar yok", "");
  const odeme = deger("s-" + id);
  onayla(p.ad + (tutar > 0 ? ": " + para(tutar) + " ödensin mi?" : ": hakediş kaydedilsin mi?"),
    (m.kayitli ? "" : "Hakediş " + para(m.hes.toplam) + " olarak kaydedilir. ") + (tutar > 0 ? "Kasaya " + odeme + " çıkış yazılır." : "Ödeme yapılmadı; alacak olarak kalır."), "Kaydet", () => islem(btn, async () => {
      const tarih = d.bit < bugun() ? d.bit : bugun();
      if(!m.kayitli) await personelOdemeKaydet(p, "hakedis", m.hes.toplam, {tarih, donem:d.anahtar, aciklama:puantajOzet(m.hes)});
      if(tutar > 0) await personelOdemeKaydet(p, "odeme", yuvarla(tutar), {tarih:bugun(), donem:d.anahtar, odeme});
      bildir(tutar > 0 ? "Ödeme kaydedildi" : "Hakediş kaydedildi"); ciz();
    }), false);
};

/* ================= AYARLAR ================= */
const FIRMA_VARSAYILAN = {ad:"Güneş Mobilya", telefon:"", eposta:"", adres:"", il:"", ilce:"", web:"", vergiDairesi:"", vergiNo:"", banka:"", iban:"", teklifNotu:"", faturaNotu:"", gecerlilik:15, kar:30};
function firma(){
  const a = veri.ayarlar.find(x => x.anahtar === "firma");
  return Object.assign({}, FIRMA_VARSAYILAN, a && a.deger && typeof a.deger === "object" ? a.deger : {});
}
EYLEM.firmaKaydet = btn => {
  const d = {ad:deger("fAd"), telefon:deger("fTelefon"), eposta:deger("fEposta"), adres:deger("fAdres"), il:deger("fIl"), ilce:deger("fIlce"), web:deger("fWeb"), vergiDairesi:deger("fVergiDairesi"),
    vergiNo:deger("fVergiNo"), banka:deger("fBanka"), iban:deger("fIban")};
  if(!d.ad) return uyar("Firma adı boş olamaz", "");
  if(d.eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.eposta)) return uyar("E-posta adresini kontrol edin", "");
  islem(btn, async () => { await Depo.kaydet("ayarlar", {anahtar:"firma", deger:Object.assign(firma(), d)}); bildir("Firma bilgileri kaydedildi"); ciz(); });
};
const benimEposta = () => ((oturum && oturum.user && oturum.user.email) || "").toLowerCase();
function kullaniciKarti(){
  if(!cevrimici) return '';
  const baslik = '<div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600">Kullanıcılar ve yetkiler</div>';
  if(!yetki.kurulu) return '<div class="kart">' + baslik + '<div class="alt-bilgi" style="margin:0">Ustalara fiyat ve kasa görmeyen ayrı giriş vermek için Supabase\'de <b>supabase-guncelleme-6.sql</b> dosyasını çalıştırın.</div></div>';
  const ad = e => e.replace("@gunesmobilya.app", "");
  return '<div class="kart">' + baslik +
    '<div class="alt-bilgi" style="margin:0 0 8px"><b>Usta</b>: iş emirlerini, aşamaları, notları, fotoğrafları, ölçüleri ve kataloğu görür; fiyat, kasa, fatura ve personel bilgilerini görmez. ' +
    (yetki.liste.length ? 'Listede olmayan hesaplar usta sayılır.' : 'Liste boşken herkes yöneticidir; ilk kişiyi eklediğinizde siz de yönetici olarak eklenirsiniz.') + '</div>' +
    (yetki.liste.length ? yetki.liste.map(k => '<div class="satir"><span class="rozet ' + (k.rol === "yonetici" ? "r-ana" : "r-gri") + '">' + ik("kisi") + '</span><span class="orta"><div class="s1">' + esc(ad(k.eposta)) +
      (k.eposta.toLowerCase() === benimEposta() ? ' <span class="etiket-rozet d-gri">siz</span>' : '') + '</div><div class="s2">' + esc([k.ad, k.rol === "yonetici" ? "Yönetici" : "Usta"].filter(Boolean).join(" · ")) + '</div></span>' +
      (k.eposta.toLowerCase() === benimEposta() ? '' : '<button class="ikon-buton" data-is="kullaniciSil" data-arg="' + esc(k.eposta) + '" aria-label="Kaldır">' + ik("sil") + '</button>') + '</div>').join("") : '') +
    '<div class="iki-alan" style="margin-top:6px"><div><label class="etiket" for="kuAd">Kullanıcı adı</label><input id="kuAd" class="kutu" autocapitalize="none" maxlength="60" placeholder="ali"></div>' +
    '<div><label class="etiket" for="kuIsim">Adı <span class="ist">(iş emrindeki sorumlu usta ile aynı)</span></label><input id="kuIsim" class="kutu" maxlength="60" list="kuPersonel">' +
    '<datalist id="kuPersonel">' + veri.personel.map(p => '<option value="' + esc(p.ad) + '">').join("") + '</datalist></div></div>' +
    '<label class="etiket">Yetki</label><select id="kuRol" class="kutu"><option value="usta">Usta</option><option value="yonetici">Yönetici</option></select>' +
    '<button class="buton ikincil" data-is="kullaniciEkle">' + ik("arti") + 'Ekle / güncelle</button>' +
    '<div class="bilgi-kutu">Listeye eklemek giriş hesabı açmaz. Supabase → <b>Authentication → Users → Add user</b> ile aynı kullanıcı adıyla (örn. <b>ali@gunesmobilya.app</b>) şifre belirleyip <b>Auto Confirm</b> işaretli hesap oluşturun.</div></div>';
}
async function yetkiYenile(){
  const yr = await sb.rpc("yonetici_mi"), kr = await sb.from("kullanicilar").select("*").order("eposta");
  if(yr.error) throw yr.error; if(kr.error) throw kr.error;
  const k = kr.data.find(x => x.eposta.toLowerCase() === benimEposta());
  yetki = {yonetici:yr.data !== false, ad: k ? k.ad : "", liste:kr.data, kurulu:true};
}
EYLEM.kullaniciEkle = btn => {
  const kadi = deger("kuAd"), isim = deger("kuIsim"), rol = deger("kuRol");
  if(!/^[a-z0-9._-]+(@[^\s@]+\.[^\s@]+)?$/i.test(kadi)) return uyar("Kullanıcı adını kontrol edin", "Türkçe karakter ve boşluk olmadan yazın (örn. ali, mehmet.usta).");
  const eposta = epostaYap(kadi), ben = benimEposta();
  if(eposta === ben && rol !== "yonetici") return uyar("Kendi yetkinizi düşüremezsiniz", "Önce başka bir yönetici ekleyin; o sizin yetkinizi değiştirebilir.");
  islem(btn, async () => {
    const satirlar = [];
    if(!yetki.liste.length && eposta !== ben) satirlar.push({eposta:ben, ad:"", rol:"yonetici", olusma:Date.now()});
    satirlar.push({eposta, ad:isim, rol, olusma:Date.now()});
    const eski = yetki.liste.find(k => k.eposta.toLowerCase() === eposta);
    const r = await sb.from("kullanicilar").upsert(satirlar); if(r.error) throw r.error;
    logla(eski ? "guncelle" : "ekle", "kullanicilar", eposta, eposta.replace("@gunesmobilya.app", "") + " · " + (rol === "yonetici" ? "Yönetici" : "Usta"),
      eski ? alanFarki({ad:eski.ad, Yetki:eski.rol}, {ad:isim, Yetki:rol}) : {});
    await yetkiYenile(); bildir("Kaydedildi"); ciz();
  });
};
EYLEM.kullaniciSil = (el, eposta) => onayla(eposta.replace("@gunesmobilya.app", "") + " listeden kaldırılsın mı?", "Hesabı Supabase'den de silmezseniz usta yetkisiyle girmeye devam eder.", "Kaldır",
  () => islem(null, async () => { const r = await sb.from("kullanicilar").delete().eq("eposta", eposta); if(r.error) throw r.error;
    logla("sil", "kullanicilar", eposta, eposta.replace("@gunesmobilya.app", "")); await yetkiYenile(); ciz(); }));
