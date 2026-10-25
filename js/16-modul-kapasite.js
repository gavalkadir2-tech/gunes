"use strict";
// Güneş Mobilya — modül kütüphanesi, keşiften teklif, atölye kapasitesi
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.

/* ================= MODÜL KÜTÜPHANESİ ================= */
// Standart ürünler (alt / üst dolap, tezgah, gardırop…): ölçü girilince fiyat ve kesim listesi kendiliğinden çıkar.
// "ayarlar" tablosunda "urunModulleri" anahtarıyla; ölçüler mm, fiyatlar KDV hariç.
//   fiyatTuru: "mtul" (en × birim fiyat), "m2" (en × boy), "adet"
const FIYAT_TURU = {mtul:"Metretül (en)", m2:"Metrekare (en × boy)", adet:"Adet"};
const FIYAT_BIRIM = {mtul:"mtül", m2:"m²", adet:"adet"};
const MODUL_TIP = Object.assign({}, DOLAP_TIP, {tezgah:"Tezgah", diger:"Diğer (kesim yok)"});
const modulListesi = () => { const a = veri.ayarlar.find(x => x.anahtar === "urunModulleri"); return a && Array.isArray(a.deger) ? a.deger : []; };
const modulBul = id => modulListesi().find(m => m.id === id);
const modulKesimli = m => m && m.kesim !== false && !!DOLAP_TIP[m.tip];
const ORNEK_MODULLER = () => [
  {ad:"Alt dolap", tip:"alt", fiyatTuru:"mtul", en:600, boy:720, derinlik:560, raf:1, kapak:1},
  {ad:"Üst dolap", tip:"ust", fiyatTuru:"mtul", en:600, boy:720, derinlik:320, raf:1, kapak:1},
  {ad:"Boy dolap (buzdolabı / fırın)", tip:"boy", fiyatTuru:"adet", en:600, boy:2100, derinlik:560, raf:3, kapak:2},
  {ad:"Gardırop", tip:"boy", fiyatTuru:"m2", en:2000, boy:2400, derinlik:600, raf:3, kapak:4},
  {ad:"Tezgah", tip:"tezgah", fiyatTuru:"mtul", en:1000, boy:40, derinlik:620, raf:0, kapak:0, kesim:false},
  {ad:"TV ünitesi", tip:"kutu", fiyatTuru:"mtul", en:1800, boy:450, derinlik:400, raf:1, kapak:2}
].map(m => Object.assign({id:yeniId(), fiyat:0, maliyet:0, govde:"", kapakMalzeme:"", arkalik:"", kesim:true}, m));
// Ölçüye göre miktar (fiyat birimi cinsinden)
function modulMiktar(m, en, boy){
  if(m.fiyatTuru === "mtul") return (Number(en) || 0) / 1000;
  if(m.fiyatTuru === "m2") return (Number(en) || 0) * (Number(boy) || 0) / 1e6;
  return 1;
}
// Kesim parçalarından plaka maliyeti (plaka fiyatı / plaka alanı × parça alanı, %15 fire)
function parcaMaliyeti(parcalar){
  let t = 0;
  parcalar.forEach(p => { const m = plakaBul(p.malzemeId); if(!(m.fiyat > 0)) return; t += p.en * p.boy * p.adet / (m.en * m.boy) * m.fiyat; });
  return yuvarla(t * 1.15);
}
const modulOlculeri = (m, o) => Object.assign({en:m.en, boy:m.boy, derinlik:m.derinlik}, o || {});
function modulParcalari(m, o, adet, ad){
  if(!modulKesimli(m)) return [];
  const d = modulOlculeri(m, o), pm = plakaMalzemeleri(), varsayilan = (pm[0] || {}).id || "";
  return dolapParcalari({ad:ad || m.ad, tip:m.tip, en:d.en, boy:d.boy, derinlik:d.derinlik, adet:adet || 1, kalinlik:m.kalinlik || 18, raf:Number(m.raf) || 0, kapak:Number(m.kapak) || 0,
    govde:m.govde || varsayilan, kapakMalzeme:m.kapakMalzeme || m.govde || varsayilan, arkalik:m.arkalik || ""});
}
// 1 adet için fiyat ve maliyet. Maliyet yazılmamışsa kesim parçalarından tahmin edilir.
function modulHesap(m, o){
  const d = modulOlculeri(m, o), mk = modulMiktar(m, d.en, d.boy);
  const maliyet = m.maliyet > 0 ? yuvarla(mk * m.maliyet) : parcaMaliyeti(modulParcalari(m, d, 1));
  return {miktar:mk, fiyat:yuvarla(mk * (Number(m.fiyat) || 0)), maliyet, tahmini:!(m.maliyet > 0)};
}
const cmYaz = mm => sayiYaz(Math.round(mm) / 10) || "0";
const modulOlcuYazi = d => [d.en, d.boy, d.derinlik].map(cmYaz).join("×");
// Teklif kalemi (iş emri formundaki biçim)
function modulKalemi(m, o, adet, renk, ad){
  const d = modulOlculeri(m, o), h = modulHesap(m, d);
  const k = {ad:ad || m.ad, olcu:modulOlcuYazi(d), renk:renk || "", adet:adet || 1, modul:{id:m.id, en:d.en, boy:d.boy, derinlik:d.derinlik}};
  if(h.fiyat > 0){ k.fiyat = h.fiyat; if(h.maliyet > 0){ k.maliyet = h.maliyet; k.hesap = {modul:m.id}; } }
  return k;
}

function ekranModuller(){
  const l = modulListesi(), pm = plakaMalzemeleri();
  const satir = m => { const h = modulHesap(m);
    return '<button class="satir" data-is="modulDuzenle" data-arg="' + m.id + '"><span class="rozet r-ana">' + ik(m.tip === "tezgah" ? "cetvel" : "kup") + '</span><span class="orta"><div class="s1">' + esc(m.ad) + '</div>' +
      '<div class="s2">' + esc([MODUL_TIP[m.tip] || "", modulOlcuYazi(m) + " cm", modulKesimli(m) ? (m.raf || 0) + " raf · " + (m.kapak || 0) + " kapak" : "kesim yok"].join(" · ")) + '</div></span>' +
      '<span class="sag"><div class="tutar">' + (m.fiyat > 0 ? para(m.fiyat) + ' <span class="t-soluk" style="font-weight:400">/ ' + FIYAT_BIRIM[m.fiyatTuru] + '</span>' : '<span class="t-cikis">fiyat yok</span>') + '</div>' +
      '<div class="alt-bilgi" style="margin:0">' + (h.maliyet > 0 ? (h.tahmini ? "tahmini " : "") + "maliyet " + para(h.maliyet) : "") + '</div></span></button>'; };
  const html = '<div class="ust-arac"><div class="alt-bilgi" style="margin:0;flex:1">Sık yaptığınız ürünleri bir kez tanımlayın. İş emrinde <b>Modülden ekle</b> deyip ölçüyü yazınca fiyat hesaplanır; kesim listesinde parçalar tek tuşla çıkar.</div>' +
      '<div class="buton-sira" style="margin:0"><button class="buton kucuk" data-is="modulDuzenle" data-arg="">' + ik("arti") + 'Yeni modül</button>' +
      (l.length ? '' : '<button class="buton kucuk ikincil" data-is="ornekModuller">Örnek modülleri ekle</button>') + '</div></div>' +
    (pm.length ? '' : '<div class="uyari">Malzeme listesinde birimi “plaka” olan malzeme yok. Plaka ekleyip fiyatını yazarsanız modüllerin maliyeti kesim parçalarından tahmin edilir. <b data-git="malzemeler" style="cursor:pointer">Malzeme listesi</b></div>') +
    '<div class="kart liste-kart">' + (l.length ? l.map(satir).join("") : bos("kup", "Henüz modül yok. “Örnek modülleri ekle” ile başlayıp fiyatlarını yazabilirsiniz.")) + '</div>';
  return {baslik:"Modül kütüphanesi", geri:true, html};
}
const modulleriKaydet = l => Depo.kaydet("ayarlar", {anahtar:"urunModulleri", deger:l});
EYLEM.ornekModuller = btn => islem(btn, async () => { await modulleriKaydet(ORNEK_MODULLER()); bildir("Örnek modüller eklendi; fiyatlarını yazın"); ciz(); });
EYLEM.modulDuzenle = (el, id) => {
  const m0 = modulBul(id), m = Object.assign({id:yeniId(), ad:"", tip:"alt", fiyatTuru:"mtul", fiyat:0, maliyet:0, en:600, boy:720, derinlik:560, raf:1, kapak:1, kalinlik:18, govde:"", kapakMalzeme:"", arkalik:"", kesim:true}, m0 || {});
  const pm = plakaMalzemeleri();
  const mSec = (id_, v, bos_) => plakaSecici(id_, v, bos_);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:600px;max-height:92vh;overflow:auto"><p>' + (m0 ? "Modülü düzenle" : "Yeni modül") + '</p>' +
    '<label class="etiket" for="mdAd">Ad</label><input id="mdAd" class="kutu" maxlength="80" value="' + esc(m.ad) + '" placeholder="Örn: Alt dolap (mat lake)">' +
    '<label class="etiket">Tür</label><div class="secenekler" id="mdTip">' + Object.entries(MODUL_TIP).map(([v, y]) => '<button type="button" class="secenek' + (v === m.tip ? ' secili' : '') + '" data-t="' + v + '">' + y + '</button>').join("") + '</div>' +
    '<label class="etiket">Fiyatlandırma</label><div class="secenekler" id="mdFt">' + Object.entries(FIYAT_TURU).map(([v, y]) => '<button type="button" class="secenek' + (v === m.fiyatTuru ? ' secili' : '') + '" data-f="' + v + '">' + y + '</button>').join("") + '</div>' +
    '<div class="iki-alan"><div><label class="etiket" for="mdFiyat">Satış fiyatı <span class="ist" id="mdBirim1">(₺ / ' + FIYAT_BIRIM[m.fiyatTuru] + ', KDV hariç)</span></label><input id="mdFiyat" class="kutu" inputmode="decimal" value="' + sayiYaz(m.fiyat) + '"></div>' +
      '<div><label class="etiket" for="mdMaliyet">Maliyet <span class="ist" id="mdBirim2">(₺ / ' + FIYAT_BIRIM[m.fiyatTuru] + ', boşsa plakadan tahmin)</span></label><input id="mdMaliyet" class="kutu" inputmode="decimal" value="' + sayiYaz(m.maliyet) + '"></div></div>' +
    '<div class="form-bolum">Varsayılan ölçü (cm)</div><div class="izgara uc" style="margin:0">' + [["mdEn", "En", m.en], ["mdBoy", "Boy (yükseklik)", m.boy], ["mdDer", "Derinlik", m.derinlik]].map(([i, a, v]) =>
      '<div><label class="etiket" for="' + i + '">' + a + '</label><input id="' + i + '" class="kutu" inputmode="decimal" value="' + cmYaz(v) + '"></div>').join("") + '</div>' +
    '<div id="mdKesim"><div class="form-bolum">Kesim</div><div class="izgara uc" style="margin:0">' + [["mdRaf", "Raf sayısı", m.raf], ["mdKapak", "Kapak sayısı", m.kapak], ["mdKal", "Gövde kalınlığı (mm)", m.kalinlik || 18]].map(([i, a, v]) =>
      '<div><label class="etiket" for="' + i + '">' + a + '</label><input id="' + i + '" class="kutu" inputmode="numeric" value="' + (v || 0) + '"></div>').join("") + '</div>' +
      '<div class="iki-alan"><div><label class="etiket" for="mdGovde">Gövde malzemesi</label>' + mSec("mdGovde", m.govde) + '</div><div><label class="etiket" for="mdKapakM">Kapak malzemesi</label>' + mSec("mdKapakM", m.kapakMalzeme, "Gövde ile aynı") + '</div></div>' +
      '<label class="etiket" for="mdArka">Arkalık</label>' + mSec("mdArka", m.arkalik, "Arkalık yok") + '</div>' +
    '<div class="toplamlar" id="mdOzet"></div><div class="hata" id="mdHata"></div>' +
    '<div class="buton-sira">' + (m0 ? '<button class="buton tehlike" data-c="sil">Sil</button>' : '') + '<button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  const oku = () => {
    const n = id_ => sayiOku(p.querySelector("#" + id_).value) || 0, s = id_ => p.querySelector("#" + id_) ? p.querySelector("#" + id_).value : "";
    return Object.assign({}, m, {ad:p.querySelector("#mdAd").value.trim(), tip:p.querySelector("#mdTip .secili").getAttribute("data-t"), fiyatTuru:p.querySelector("#mdFt .secili").getAttribute("data-f"),
      fiyat:Math.max(0, n("mdFiyat")), maliyet:Math.max(0, n("mdMaliyet")), en:Math.round(n("mdEn") * 10), boy:Math.round(n("mdBoy") * 10), derinlik:Math.round(n("mdDer") * 10),
      raf:Math.max(0, Math.round(n("mdRaf"))), kapak:Math.max(0, Math.round(n("mdKapak"))), kalinlik:Math.round(n("mdKal")) || 18, govde:s("mdGovde"), kapakMalzeme:s("mdKapakM"), arkalik:s("mdArka")});
  };
  const ozet = () => {
    const y = oku(); y.kesim = !!DOLAP_TIP[y.tip];
    p.querySelector("#mdKesim").style.display = y.kesim ? "" : "none";
    p.querySelector("#mdBirim1").textContent = "(₺ / " + FIYAT_BIRIM[y.fiyatTuru] + ", KDV hariç)"; p.querySelector("#mdBirim2").textContent = "(₺ / " + FIYAT_BIRIM[y.fiyatTuru] + ", boşsa plakadan tahmin)";
    const h = modulHesap(y), parca = modulParcalari(y, null, 1);
    p.querySelector("#mdOzet").innerHTML = '<div class="alt-bilgi" style="margin:0 0 4px">Varsayılan ölçüde 1 adet:</div>' + bilgiSatir("Satış fiyatı", para(h.fiyat)) +
      bilgiSatir((h.tahmini ? "Tahmini maliyet (plaka)" : "Maliyet"), h.maliyet > 0 ? para(h.maliyet) : "—") + (parca.length ? bilgiSatir("Kesim", parca.reduce((t, x) => t + x.adet, 0) + " parça") : '');
  };
  p.addEventListener("input", ozet);
  p.addEventListener("click", e => {
    const t = e.target.closest("[data-t]"); if(t){ p.querySelectorAll("#mdTip .secenek").forEach(x => x.classList.toggle("secili", x === t)); return ozet(); }
    const f = e.target.closest("[data-f]"); if(f){ p.querySelectorAll("#mdFt .secenek").forEach(x => x.classList.toggle("secili", x === f)); return ozet(); }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c");
    if(c === "hayir") return p.remove();
    if(c === "sil") return onayla("Modül silinsin mi?", "Daha önce bu modülle hazırlanan teklifler etkilenmez.", "Sil", () => islem(null, async () => { await modulleriKaydet(modulListesi().filter(x => x.id !== m.id)); p.remove(); bildir("Silindi"); ciz(); }));
    const y = oku(); y.kesim = !!DOLAP_TIP[y.tip];
    if(!y.ad) return p.querySelector("#mdHata").textContent = "Modülün adını yazın.";
    if(y.en < 100 || (y.kesim && (y.boy < 100 || y.derinlik < 100))) return p.querySelector("#mdHata").textContent = "Ölçüleri cm olarak kontrol edin.";
    const l = modulListesi().slice(), i = l.findIndex(x => x.id === y.id);
    if(i >= 0) l[i] = y; else l.push(y);
    islem(b, async () => { await modulleriKaydet(l); p.remove(); bildir("Modül kaydedildi"); ciz(); });
  });
  document.body.appendChild(p); ozet();
};

// İş emri formunda: modülden kalem ekle
EYLEM.modulKalemEkle = () => {
  const l = modulListesi();
  if(!l.length) return onayla("Modül kütüphanesi boş", "Önce sık yaptığınız ürünleri (alt dolap, üst dolap, gardırop…) fiyatlarıyla tanımlayın.", "Modüllere git", () => git("moduller"), false);
  let m = l[0];
  const p = document.createElement("div"); p.className = "perde";
  const alanlar = () => '<div class="izgara dort" style="margin:0">' + [["mkEn", "En (cm)", cmYaz(m.en)], ["mkBoy", "Boy (cm)", cmYaz(m.boy)], ["mkDer", "Derinlik (cm)", cmYaz(m.derinlik)], ["mkAdet", "Adet", 1]].map(([i, a, v]) =>
    '<div><label class="etiket" for="' + i + '">' + a + '</label><input id="' + i + '" class="kutu" inputmode="decimal" value="' + v + '"></div>').join("") + '</div>';
  p.innerHTML = '<div class="pencere" style="max-width:560px;max-height:92vh;overflow:auto"><p>Modülden ekle</p>' +
    '<div class="secenekler" id="mkModul">' + l.map(x => '<button type="button" class="secenek' + (x === m ? ' secili' : '') + '" data-m="' + x.id + '">' + esc(x.ad) + '</button>').join("") + '</div>' +
    '<div id="mkAlan">' + alanlar() + '</div><label class="etiket" for="mkRenk">Renk / malzeme <span class="ist">(isteğe bağlı)</span></label><input id="mkRenk" class="kutu" maxlength="60">' +
    '<div class="toplamlar" id="mkOzet"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="ekle">' + ik("arti") + 'Kaleme ekle</button></div></div>';
  const oku = () => { const n = id_ => sayiOku(p.querySelector("#" + id_).value) || 0; return {o:{en:Math.round(n("mkEn") * 10), boy:Math.round(n("mkBoy") * 10), derinlik:Math.round(n("mkDer") * 10)}, adet:Math.max(1, Math.round(n("mkAdet")) || 1)}; };
  const ozet = () => { const r = oku(), h = modulHesap(m, r.o);
    p.querySelector("#mkOzet").innerHTML = bilgiSatir("Miktar", miktarYaz(Math.round(h.miktar * 100) / 100) + " " + FIYAT_BIRIM[m.fiyatTuru] + (r.adet > 1 ? " × " + r.adet : "")) +
      bilgiSatir("Birim fiyat (KDV hariç)", h.fiyat > 0 ? para(h.fiyat) : '<span class="t-cikis">modülde fiyat yok</span>') +
      '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Tutar</span><b>' + para(h.fiyat * r.adet) + '</b></div>' + (h.maliyet > 0 ? '<div class="alt-bilgi">' + (h.tahmini ? "Tahmini " : "") + 'maliyet ' + para(h.maliyet * r.adet) + '</div>' : ''); };
  p.addEventListener("input", ozet);
  p.addEventListener("click", e => {
    const mb = e.target.closest("[data-m]"); if(mb){ m = modulBul(mb.getAttribute("data-m")); p.querySelectorAll("#mkModul .secenek").forEach(x => x.classList.toggle("secili", x === mb)); p.querySelector("#mkAlan").innerHTML = alanlar(); return ozet(); }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const r = oku(); if(!(r.o.en > 0)) return;
    const k = modulKalemi(m, r.o, r.adet, p.querySelector("#mkRenk").value.trim());
    if(form.ikalemler.length === 1 && !form.ikalemler[0].ad.trim()) form.ikalemler = [];
    form.ikalemler.push(k); p.remove(); ikalemleriCiz(); bildir(m.ad + " eklendi");
  });
  document.body.appendChild(p); ozet();
};

// Kesim ekranında: modülden eklenmiş tüm kalemlerin parçaları
EYLEM.modulParcaUret = () => {
  kesimOku();
  const ie = bul("is_emirleri", kesimForm.isId), yeni = [];
  ie.kalemler.forEach(k => { const m = k.modul && modulBul(k.modul.id); if(m) yeni.push(...modulParcalari(m, k.modul, Number(k.adet) || 1, k.ad)); });
  if(!yeni.length) return uyar("Parça üretilecek modül yok", "Bu işteki kalemler modül kütüphanesinden eklenmemiş veya modüllerin kesimi kapalı (tezgah gibi).");
  kesimForm.parcalar = kesimForm.parcalar.concat(yeni); kesimForm.degisti = true; ciz(); bildir(yeni.length + " satır parça eklendi; kaydetmeyi unutmayın");
};

/* ================= KEŞİFTEN TEKLİFE ================= */
// Duvar uzunluklarından, seçilen modüllerle teklif kalemleri
EYLEM.kesiftenTeklif = (el, id) => {
  const ie = bul("is_emirleri", id), l = modulListesi();
  if(!l.length) return onayla("Modül kütüphanesi boş", "Teklif kalemlerinin fiyatı modüllerden hesaplanır. Önce modülleri tanımlayın.", "Modüllere git", () => git("moduller"), false);
  const duvarlar = (form.duvarlar || []).map(d => ({ad:d.ad, uzunluk:Math.round((sayiOku(d.olcu) || 0) * 10)})).filter(d => d.uzunluk > 0);
  if(!duvarlar.length) return uyar("Duvar ölçüsü yok", "Önce duvarların uzunluklarını (cm) yazın.");
  const yuk = Math.round((sayiOku(deger("kYukseklik")) || 0) * 10);
  const varsayilan = m => ["alt", "ust", "tezgah"].indexOf(m.tip) >= 0;
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:620px;max-height:92vh;overflow:auto"><p>Keşiften teklif kalemleri</p><div class="alt-bilgi">Her duvara gelecek modülleri işaretleyin. Metretül fiyatlı modüller duvar boyunca, m² fiyatlılar duvar × ' + (yuk ? "tavan yüksekliği" : "modül yüksekliği") + ' ile hesaplanır. Sonra iş emrinde düzenleyebilirsiniz.</div>' +
    duvarlar.map((d, i) => '<div class="kart" style="margin:12px 0 0;padding:12px"><b>' + esc(d.ad) + '</b> · ' + cmYaz(d.uzunluk) + ' cm<div class="secenekler" style="margin-top:8px" data-d="' + i + '">' +
      l.map(m => '<button type="button" class="secenek' + (varsayilan(m) && i === 0 ? ' secili' : '') + '" data-m="' + m.id + '">' + esc(m.ad) + '</button>').join("") + '</div></div>').join("") +
    '<div class="toplamlar" id="ktOzet"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="ekle">' + ik("tamam") + 'Teklife ekle</button></div></div>';
  const kalemler = () => {
    const r = [];
    p.querySelectorAll("[data-d]").forEach(g => { const d = duvarlar[Number(g.getAttribute("data-d"))];
      g.querySelectorAll(".secili").forEach(b => { const m = modulBul(b.getAttribute("data-m"));
        const o = m.fiyatTuru === "adet" ? {} : {en:d.uzunluk, boy:m.fiyatTuru === "m2" && yuk ? yuk : m.boy};
        r.push(modulKalemi(m, o, 1, "", m.ad + " · " + d.ad)); }); });
    return r;
  };
  const ozet = () => { const r = kalemler(), t = r.reduce((s, k) => s + (k.fiyat || 0) * k.adet, 0);
    p.querySelector("#ktOzet").innerHTML = r.map(k => bilgiSatir(esc(k.ad + " (" + k.olcu + ")"), k.fiyat ? para(k.fiyat) : '<span class="t-cikis">fiyat yok</span>')).join("") +
      '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Toplam (KDV hariç)</span><b>' + para(t) + '</b></div>'; };
  p.addEventListener("click", e => {
    const mb = e.target.closest("[data-m]"); if(mb){ mb.classList.toggle("secili"); return ozet(); }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const yeni = kalemler(); if(!yeni.length) return;
    const g = bul("is_emirleri", id), kl = g.kalemler.filter(k => k.ad).concat(yeni), t = Object.assign({}, isTeklif(g));
    if(fiyatliMi(kl)) t.fiyat = 0;
    const h = isHesap(kl, t);
    islem(b, async () => {
      await Depo.kaydet("is_emirleri", Object.assign({}, g, {kalemler:kl, teklif:t, tutar:h.toplam, kesif:Object.assign({}, g.kesif, {duvarlar:form.duvarlar.filter(d => d.olcu || d.not)})}));
      await notEkle(id, "Keşiften " + yeni.length + " teklif kalemi eklendi (" + para(h.toplam) + ")");
      p.remove(); bildir("Teklif kalemleri eklendi"); git("is-form/" + id);
    });
  });
  document.body.appendChild(p); ozet();
};

/* ================= ATÖLYE KAPASİTESİ ================= */
// Açık siparişler, ekip sayısı kadar paralel hatta teslim tarihine göre sıralanıp iş günlerine yerleştirilir.
// İş süresi: iş emrindeki "atölye süresi" → iş türünün varsayılanı → genel varsayılan. Biten aşamalar kadar düşülür.
const KAPASITE_VARSAYILAN = {ekip:2, gun:5, montajGun:1, turGun:{}};
const kapasiteAyar = () => { const k = sistem().kapasite || {}; return Object.assign({}, KAPASITE_VARSAYILAN, k, {turGun:Object.assign({}, k.turGun || {})}); };
const isGunu = ie => Number(ie.uretimGun) > 0 ? Number(ie.uretimGun) : Number(kapasiteAyar().turGun[ie.kategori]) > 0 ? Number(kapasiteAyar().turGun[ie.kategori]) : kapasiteAyar().gun;
const URETIM_DURUM = {"Sipariş alındı":1, "Üretimde":1};
function calismaGunleri(bas, n){
  const g = takvimAyar().gunler, l = []; let d = tarihOku(bas);
  for(let i = 0; l.length < n && i < n * 7 + 14; i++){ if(g.indexOf(d.getDay()) >= 0) l.push(tarihStr(d)); d.setDate(d.getDate() + 1); }
  return l;
}
function kapasitePlani(haric){
  const a = kapasiteAyar(), ekip = Math.max(1, Number(a.ekip) || 1), gunler = calismaGunleri(bugun(), 400);
  const isler = veri.is_emirleri.filter(ie => URETIM_DURUM[ie.durum] && ie.id !== haric).map(ie => {
    const as = (ie.asamalar || []).filter(x => !/teslim|kurulum|ölçü|keşif/i.test(x.ad)), biten = as.filter(x => x.tamam).length;
    const gun = isGunu(ie), kalan = Math.max(as.length && biten === as.length ? 0 : 0.5, Math.round(gun * (as.length ? 1 - biten / as.length : 1) * 2) / 2);
    return {ie, gun, kalan};
  }).sort((x, y) => { const tx = x.ie.teslimTarihi || "9999", ty = y.ie.teslimTarihi || "9999";
    return (y.ie.durum === "Üretimde") - (x.ie.durum === "Üretimde") || (tx < ty ? -1 : tx > ty ? 1 : x.ie.olusma - y.ie.olusma); });
  const hat = Array(ekip).fill(0);
  isler.forEach(x => {
    const h = hat.indexOf(Math.min(...hat)); x.hat = h; x.basI = hat[h]; hat[h] += x.kalan;
    x.bas = gunler[Math.floor(x.basI)]; x.bit = gunler[Math.max(0, Math.ceil(hat[h]) - 1)] || gunler[gunler.length - 1];
    x.gec = !!(x.ie.teslimTarihi && x.bit > x.ie.teslimTarihi);
  });
  return {isler, hat, gunler, ekip};
}
// Yeni / düzenlenen iş için en erken teslim: en boş hat + iş süresi + montaj payı
function teslimOnerisi(gun, haric){
  const p = kapasitePlani(haric), bos = Math.min(...p.hat), bitis = Math.ceil(bos + Math.max(0.5, gun)) - 1 + Math.max(0, Number(kapasiteAyar().montajGun) || 0);
  return p.gunler[Math.max(0, bitis)];
}
function haftalikYuk(p, hafta){
  const l = [], bas = haftaBasi(bugun());
  for(let w = 0; w < hafta; w++){
    const hb = gunEkle(bas, w * 7), hs = gunEkle(hb, 6), gunIdx = p.gunler.map((g, i) => g >= hb && g <= hs ? i : -1).filter(i => i >= 0);
    const kap = gunIdx.length * p.ekip; let dolu = 0;
    gunIdx.forEach(i => p.isler.forEach(x => { dolu += Math.max(0, Math.min(x.basI + x.kalan, i + 1) - Math.max(x.basI, i)); }));
    if(kap) l.push({hb, kap, dolu:Math.round(dolu * 10) / 10, oran:dolu / kap});   // bu haftanın kalanı tatilse atlanır
  }
  return l;
}
function yukCubugu(w){
  const y = Math.round(w.oran * 100), d = tarihOku(w.hb);
  return '<div class="hedef"><div class="cubuk-ust"><span>' + (w.hb === haftaBasi(bugun()) ? "Bu hafta" : d.getDate() + " " + AYLAR[d.getMonth()].slice(0, 3) + " haftası") + '</span><span><b>%' + y + '</b> <span class="t-soluk">' + miktarYaz(w.dolu) + ' / ' + w.kap + ' iş günü</span></span></div>' +
    '<div class="hedef-yol"><div class="cubuk" style="width:' + Math.min(100, Math.max(1.5, y)) + '%;background:' + (y > 95 ? 'var(--cikis)' : y > 70 ? 'var(--ana)' : 'var(--giris)') + '"></div></div></div>';
}
function ekranKapasite(){
  const a = kapasiteAyar(), p = kapasitePlani(), hf = haftalikYuk(p, 8), gec = p.isler.filter(x => x.gec);
  const ilkBos = p.gunler[Math.floor(Math.min(...p.hat))], oneri = teslimOnerisi(a.gun);
  const html = '<div class="izgara dort"><div class="kart ozet"><div class="kart-baslik">Üretimdeki / sıradaki iş</div><div class="deger">' + p.isler.length + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Toplam iş yükü</div><div class="deger">' + miktarYaz(p.isler.reduce((t, x) => t + x.kalan, 0)) + ' <span style="font-size:14px">iş günü</span></div><div class="alt-bilgi">' + p.ekip + ' ekip</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Atölye boşalıyor</div><div class="deger" style="font-size:18px">' + tarihYaz(ilkBos, true) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Yeni işe önerilen teslim</div><div class="deger" style="font-size:18px">' + tarihYaz(oneri, true) + '</div><div class="alt-bilgi">' + a.gun + ' iş günlük iş için</div></div></div>' +
    (gec.length ? '<div class="uyari"><b>' + gec.length + ' iş</b> bu hızla teslim tarihine yetişmiyor (kırmızı). Teslim tarihini öne almak, mesai veya iş sırasını değiştirmek gerekebilir.</div>' : '') +
    '<div class="kart">' + kartBaslik("Haftalık atölye yükü", '<button class="baglanti" style="margin:0" data-git="ayarlar/kapasite">Ayarlar</button>') + hf.map(yukCubugu).join("") + '</div>' +
    bolum("İş sırası (tahmini)") + '<div class="kart liste-kart">' + (p.isler.length ? p.isler.map(x => '<button class="satir" data-git="is/' + x.ie.id + '"><span class="rozet ' + (x.gec ? 'r-cikis' : 'r-gri') + '">' + (x.hat + 1) + '</span>' +
      '<span class="orta"><div class="s1">' + esc(x.ie.no + " · " + x.ie.baslik) + '</div><div class="s2">' + esc([cariAdi(x.ie.musteriId), x.ie.durum, miktarYaz(x.kalan) + (x.kalan !== x.gun ? " / " + x.gun : "") + " iş günü"].join(" · ")) + '</div></span>' +
      '<span class="sag"><div class="' + (x.gec ? 't-cikis' : '') + '" style="font-weight:600;white-space:nowrap">' + tarihYaz(x.bas, true) + ' – ' + tarihYaz(x.bit, true) + '</div><div class="alt-bilgi" style="margin:0">' + (x.ie.teslimTarihi ? "teslim " + tarihYaz(x.ie.teslimTarihi, true) : "teslim tarihi yok") + '</div></span></button>').join("") :
      bos("is", "Üretimde veya sırada bekleyen iş yok.")) + '</div>' +
    '<div class="alt-bilgi" style="margin:8px 2px">Numara: işin yapılacağı ekip / hat. İş süresi iş emrindeki “atölye süresi”nden, yoksa iş türüne göre Ayarlar → Atölye kapasitesi\'nden gelir; biten üretim aşamaları kadar azalır.</div>';
  return {baslik:"Atölye kapasitesi", geri:true, html};
}
// Ana sayfa kartı
function kapasiteKarti(){
  const p = kapasitePlani(); if(!p.isler.length) return '';
  const hf = haftalikYuk(p, 2), gec = p.isler.filter(x => x.gec).length;
  return '<div class="kart">' + kartBaslik("Atölye yükü", '<button class="baglanti" style="margin:0" data-git="kapasite">Ayrıntı</button>') + hf.map(yukCubugu).join("") +
    '<div class="alt-bilgi">' + p.isler.length + ' iş sırada · yeni işe en erken teslim <b>' + tarihYaz(teslimOnerisi(kapasiteAyar().gun), true) + '</b>' + (gec ? ' · <span class="t-cikis">' + gec + ' iş gecikme riskinde</span>' : '') + '</div></div>';
}
// İş emri formu: süre alanı ve teslim önerisi
function isSureAlani(ie){
  const v = ie && Number(ie.uretimGun) > 0 ? ie.uretimGun : "";
  return '<div class="iki-alan"><div><label class="etiket" for="uretimGun">Atölye süresi <span class="ist">(iş günü, boşsa iş türünden)</span></label><input id="uretimGun" class="kutu" inputmode="decimal" value="' + esc(v) + '" placeholder="' + kapasiteAyar().gun + '"></div>' +
    '<div><label class="etiket">&nbsp;</label><div class="alt-bilgi" id="teslimOneri" style="margin:10px 0 0"></div></div></div>';
}
function teslimOneriGuncelle(id){
  const k = document.getElementById("teslimOneri"); if(!k) return;
  const tur = deger("isTuru"), g = sayiOku(deger("uretimGun")) || Number(kapasiteAyar().turGun[tur]) || kapasiteAyar().gun, o = teslimOnerisi(g, id), t = deger("teslim");
  k.innerHTML = 'Atölye yüküne göre en erken: <b>' + tarihYaz(o, true) + '</b>' + (t && t < o ? ' <span class="t-cikis">(yazılan tarih erken)</span>' : '') +
    (t === o ? '' : ' <button type="button" class="baglanti" style="margin:0" data-is="teslimOneriKullan" data-arg="' + o + '">Bu tarihi yaz</button>');
}
EYLEM.teslimOneriKullan = (el, t) => { const e = document.getElementById("teslim"); if(e){ e.value = t; teslimOneriGuncelle(yol()[1]); } };
function ayarKapasite(){
  const a = kapasiteAyar(), turler = isTurleri("");
  return '<div class="kart">' + kartBaslik("Atölye kapasitesi") +
    '<div class="alt-bilgi" style="margin:0 0 8px">Aynı anda kaç iş yürütülebildiği ve işlerin ortalama kaç iş gününde çıktığı. Çalışma günleri: <b data-git="ayarlar/takvim" style="cursor:pointer;color:var(--borc)">Takvim</b>.</div>' +
    '<div class="izgara uc" style="margin:0">' + sayiAlan("kpEkip", "Aynı anda yürüyen iş", a.ekip, "(ekip)") + sayiAlan("kpGun", "Varsayılan iş süresi", a.gun, "(iş günü)") + sayiAlan("kpMontaj", "Montaj / teslim payı", a.montajGun, "(iş günü)") + '</div>' +
    (turler.length ? '<div class="form-bolum">İş türüne göre süre <span style="text-transform:none;font-weight:500">(boşsa varsayılan)</span></div><div class="izgara uc" style="margin:0">' +
      turler.map((t, i) => '<div><label class="etiket" for="kpT' + i + '">' + esc(t) + '</label><input id="kpT' + i + '" data-tur="' + esc(t) + '" class="kutu" inputmode="decimal" value="' + esc(a.turGun[t] || "") + '" placeholder="' + a.gun + '"></div>').join("") + '</div>' : '') +
    '<button class="buton" data-is="kapasiteKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
EYLEM.kapasiteKaydet = btn => {
  const n = id => sayiOku(deger(id)), turGun = {};
  document.querySelectorAll("[data-tur]").forEach(e => { const v = sayiOku(e.value); if(v > 0) turGun[e.getAttribute("data-tur")] = v; });
  const d = {ekip:Math.round(n("kpEkip")), gun:n("kpGun"), montajGun:n("kpMontaj") || 0, turGun};
  if(!(d.ekip >= 1 && d.ekip <= 50)) return uyar("Ekip sayısı 1–50 arası olmalı", "");
  if(!(d.gun > 0 && d.gun <= 120)) return uyar("İş süresini kontrol edin", "");
  islem(btn, async () => { await sistemKaydet({kapasite:d}); bildir("Kaydedildi"); ciz(); });
};
