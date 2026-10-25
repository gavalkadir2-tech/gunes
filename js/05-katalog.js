"use strict";
// Güneş Mobilya — katalog
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= KATALOG ================= */
// Projeler "katalog" tablosunda, fotoğrafları "katalog_gorseller" tablosunda; dosyalar Storage'da "katalog/<proje>/" altında durur.
const KATALOG_KLASOR = "katalog";
// Kayıtları Storage'daki dosyalara bağlı tablolar: JSON yedeğe girmez (dosyalar, katalog fotoğrafları ZIP yedekte; paylaşımlar yedeklenmez).
const DOSYA_TABLO = {dosyalar:1, katalog_gorseller:1, paylasimlar:1};
const guvenliDosyaAdi = a => String(a).normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80);
// İş türü seçenekleri: katalog kategorileri (+ kayıttaki eski değer)
const isTurleri = mevcut => { const l = katalogListesi().slice(); if(mevcut && l.indexOf(mevcut) < 0) l.push(mevcut); return l; };
function katalogListesi(){
  const a = veri.ayarlar.find(x => x.anahtar === "katalogKategorileri");
  return a && Array.isArray(a.deger) && a.deger.length ? a.deger.slice() : VARSAYILAN_KATALOG.slice();
}
// Ayarlardaki liste + projelerde kullanılıp listeden çıkarılmış kategoriler
function katalogKategorileri(){
  const l = katalogListesi();
  veri.katalog.forEach(p => { if(p.kategori && l.indexOf(p.kategori) < 0) l.push(p.kategori); });
  return l;
}
const gorselSira = (a, b) => a.sira - b.sira || a.olusma - b.olusma;
// Katalogda fotoğrafın yanında video da durabilir; kapak olarak ilk fotoğraf kullanılır.
const videoMu = g => /^video\//.test(g.tur || "") || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(g.yol || "");
const medyaEtiket = (g, ek) => videoMu(g) ? '<video data-yol="' + esc(g.yol) + '" preload="metadata" muted playsinline></video><span class="oynat">' + ik("oynat") + '</span>'
  : '<img data-yol="' + esc(g.yol) + '" loading="lazy" alt="' + esc(ek || "") + '">';
// 3B çizimler (DWG / STL) aynı tabloda durur ama kapak, galeri, sunum ve paylaşımda kullanılmaz.
const CAD_UZANTI = /\.(dwg|stl)$/i;
const cadMi = g => CAD_UZANTI.test(g.ad || "") || /^(application\/acad|model\/stl)$/.test(g.tur || "");
const projeMedya = id => projeGorselleri(id).filter(g => !cadMi(g));
const projeCizimleri = id => projeGorselleri(id).filter(cadMi);
const projeKapak = id => { const l = projeMedya(id); return l.find(g => !videoMu(g)) || l[0] || null; };
const projeGorselleri = id => veri.katalog_gorseller.filter(g => g.projeId === id).sort(gorselSira);
function projeSirali(liste){
  const kat = katalogKategorileri();
  return liste.slice().sort((a, b) => kat.indexOf(a.kategori) - kat.indexOf(b.kategori) || b.olusma - a.olusma);
}
let katalogArama = "";

function ekranKatalog(){
  if(eksikTablo.katalog || eksikTablo.katalog_gorseller)
    return {baslik:"Katalog", html:'<div class="uyari">Katalog için veritabanı güncellemesi gerekiyor: Supabase\'de <b>supabase-guncelleme-3.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>'};
  const kat = katalogKategorileri();
  if(filtre.katalog !== "hepsi" && kat.indexOf(filtre.katalog) < 0) filtre.katalog = "hepsi";
  const f = filtre.katalog, projeler = projeSirali(veri.katalog);
  const sec = projeler.filter(p => f === "hepsi" || p.kategori === f);
  const yeniYer = "proje-form/-/" + (f === "hepsi" ? "-" : encodeURIComponent(f));
  const kutu = (ad, d, liste) => {
    const kp = liste.map(p => projeKapak(p.id)).find(Boolean);
    return '<button class="kat-kutu' + (kp ? '' : ' bos-kapak') + (f === d ? ' secili' : '') + '" data-is="katalogFiltre" data-arg="' + esc(d) + '">' +
      (kp ? medyaEtiket(kp).replace(/<span class="oynat">.*<\/span>$/, "") : '') + '<span class="yazi"><b>' + esc(ad) + '</b><small>' + liste.length + ' proje</small></span></button>';
  };
  const html = '<div class="vitrin"><div class="marka"><img src="logo-beyaz.png" alt="Güneş Mobilya"></div>' +
      '<div class="alt">Proje kataloğu · ' + projeler.length + ' proje · ' + veri.katalog_gorseller.length + ' fotoğraf</div>' +
      '<div class="buton-sira"><button class="buton altin" data-is="katalogSunum">' + ik("oynat") + (f === "hepsi" ? 'Sunumu başlat' : esc(f) + ' sunumu') + '</button>' +
      (cevrimici ? '<button class="buton saydam yonetici-ozel" data-git="paylas-form/' + (f === "hepsi" ? "-" : encodeURIComponent(f)) + '">' + ik("mesaj") + 'Müşteriye gönder</button>' : '') +
      '<button class="buton saydam" data-is="cadYerel">' + ik("kup") + '3B çizim aç</button>' +
      '<button class="buton saydam yonetici-ozel" data-git="' + yeniYer + '">' + ik("arti") + 'Yeni proje</button></div></div>' +
    '<div class="kat-izgara">' + kutu("Tümü", "hepsi", projeler) + kat.map(k => kutu(k, k, projeler.filter(p => p.kategori === k))).join("") + '</div>' +
    bolum((f === "hepsi" ? "Tüm projeler" : esc(f)) + " (" + sec.length + ")", '<span class="yonetici-ozel" style="display:flex;gap:14px">' +
      (cevrimici ? '<button data-git="katalog-ice">ZIP\'ten içe aktar</button>' : '') + '<button data-git="' + yeniYer + '">+ Yeni proje</button></span>') +
    listeArac("katalog", KATALOG_SIRA) +
    (veri.katalog.length > 6 ? '<div class="ara">' + ik("ara") + '<input id="ara" class="kutu" placeholder="Proje, malzeme veya ölçü ara…" value="' + esc(katalogArama) + '"></div>' : '') +
    '<div id="projeListe">' + projeListesi(sec) + '</div>' +
    (veri.paylasimlar.length ? bolum("Müşteriye gönderilen bağlantılar (" + veri.paylasimlar.filter(k => !paylasimBitti(k)).length + " açık)", '<button data-git="paylasimlar">Tümü</button>') : '');
  return {baslik:"Katalog", html, sonra(){
    const a = document.getElementById("ara");
    if(a) a.addEventListener("input", () => { katalogArama = a.value; document.getElementById("projeListe").innerHTML = projeListesi(sec); galeriDoldur(); });
    galeriDoldur();
  }};
}
// "Katalog sırası": projelerin elle verilen sırası (liste zaten o sırada gelir)
const KATALOG_SIRA = {sira:["Katalog sırası", () => 0], yeni:["En yeni", kiyas(p => p.olusma, true)], eski:["En eski", kiyas(p => p.olusma)], ad:["Ad (A–Z)", kiyas(p => p.baslik)],
  fiyat:["Fiyat (yüksek)", kiyas(p => Number(p.fiyat) || 0, true)]};
function projeListesi(liste){
  if(!veri.katalog.length) return '<div class="kart">' + bos("katalog", "Henüz proje yok. “Yeni proje” ile ilk mutfak, banyo, gardırop veya TV ünitesi projenizi ekleyin.") + '</div>';
  const q = katalogArama.toLocaleLowerCase("tr");
  const hz = listeHazirla("katalog", KATALOG_SIRA, liste.filter(p => !q || [p.baslik, p.kategori, p.malzeme, p.olcu, p.aciklama].join(" ").toLocaleLowerCase("tr").indexOf(q) >= 0)), l = hz.l;
  if(!l.length) return '<div class="kart">' + (q ? bos("ara", "Bulunamadı.") : bos("katalog", "Bu kategoride henüz proje yok.")) + '</div>';
  return '<div class="proje-izgara">' + l.map(p => {
    const g = projeMedya(p.id), cz = projeCizimleri(p.id).length;
    return '<button class="proje-kart" data-git="proje/' + p.id + '"><span class="kapak">' +
      (g.length ? medyaEtiket(projeKapak(p.id)) + '<span class="sayi">' + g.length + ' ' + (g.some(videoMu) ? 'medya' : 'foto') + (cz ? ' · 3B' : '') + '</span>' : cz ? ik("kup") + '<span class="sayi">' + cz + ' çizim</span>' : ik("resim")) + '</span>' +
      '<span class="pk"><b>' + esc(p.baslik) + '</b><span>' + esc([p.kategori, p.malzeme].filter(Boolean).join(" · ")) + '</span></span></button>';
  }).join("") + '</div>' + dahaFazla("katalog", hz);
}
EYLEM.katalogFiltre = (el, k) => { filtre.katalog = k; ciz(); };
EYLEM.katalogSunum = () => {
  const f = filtre.katalog;
  sunumAc(sunumListesi(projeSirali(veri.katalog.filter(p => f === "hepsi" || p.kategori === f))), 0);
};

/* --- Proje sayfası --- */
function ekranProje(id){
  const p = bul("katalog", id);
  if(!p) return {baslik:"Proje", geri:true, html:'<div class="kart">' + bos("katalog", "Proje bulunamadı.") + '</div>'};
  const g = projeMedya(id), cz = projeCizimleri(id);
  const isler = veri.is_emirleri.filter(ie => ie.kalemler.some(k => k.katalogId === id)).sort((a, b) => b.olusma - a.olusma);
  const html = '<div class="iki-sutun genis"><div>' +
    (g.length ? '<button class="kapak buyuk-kapak" data-is="projeSunum" data-arg="' + id + '|' + Math.max(0, g.indexOf(projeKapak(id))) + '">' + medyaEtiket(projeKapak(id), p.baslik).replace(' loading="lazy"', '') +
      '<span class="oynat-rozet">' + ik("oynat") + 'Sunum modu</span></button>' : '') +
    '<div class="kart"><div class="kart-baslik"><span>Fotoğraflar (' + g.length + ')</span></div>' +
    (cevrimici ? '<div class="buton-sira yonetici-ozel" style="margin-top:8px"><button class="buton ikincil kucuk" onclick="document.getElementById(\'kKamera\').click()">' + ik("kamera") + 'Fotoğraf çek</button>' +
      '<button class="buton ikincil kucuk" onclick="document.getElementById(\'kGaleri\').click()">' + ik("yukle") + 'Fotoğraf / video / çizim yükle</button></div>' +
      '<input type="file" id="kKamera" accept="image/*" capture="environment" style="display:none" onchange="gorselSecildi(this,\'' + id + '\')">' +
      '<input type="file" id="kGaleri" accept="image/*,video/*,.dwg,.stl" multiple style="display:none" onchange="gorselSecildi(this,\'' + id + '\')">'
      : '<div class="alt-bilgi">Fotoğraf yüklemek için bulut bağlantısı gerekir.</div>') +
    (g.length ? '<div class="galeri">' + g.map((x, i) => '<div class="foto-sar"><button class="foto" data-is="projeSunum" data-arg="' + id + '|' + i + '">' + medyaEtiket(x, x.ad) + '</button>' +
        (x === projeKapak(id) ? '<span class="kapak-rozet">Kapak</span>' : '') + '<button class="menu-dugme yonetici-ozel" data-is="gorselMenu" data-arg="' + x.id + '" aria-label="Fotoğraf işlemleri">⋯</button></div>').join("") + '</div>' +
      '<div class="alt-bilgi">⋯ ile kapak yapabilir, sırasını değiştirebilir, döndürebilir, başka projeye taşıyabilir veya silebilirsiniz.</div>' : bos("kamera", "Henüz fotoğraf yok.")) + '</div>' +
    (cz.length ? '<div class="kart"><div class="kart-baslik"><span>3B çizimler (' + cz.length + ')</span></div>' + cz.map(x =>
      '<div class="satir"><span class="rozet r-borc">' + ik("kup") + '</span><span class="orta"><div class="s1">' + esc(x.ad) + '</div><div class="s2">' + mbYaz(x.boyut) + '</div></span>' +
      '<button class="buton kucuk" style="margin:0" data-is="cadKatalog" data-arg="' + x.id + '">' + ik("kup") + '3B görüntüle</button>' +
      '<button class="ikon-buton yonetici-ozel" style="margin-left:6px" data-is="gorselMenu" data-arg="' + x.id + '" aria-label="Çizim işlemleri">⋯</button></div>').join("") +
      '<div class="alt-bilgi">IntelliCAD çizimi (DWG) veya STL. Katılar görünmezse çizimi “AutoCAD 2010 Çizimi” olarak kaydedin.</div></div>' : '') +
    '</div><div>' +
    '<div class="kart"><span class="etiket-rozet d-sari">' + esc(p.kategori || "Kategorisiz") + '</span>' +
      '<div style="font-size:19px;font-weight:600;margin:8px 0 6px">' + esc(p.baslik) + '</div>' +
      (p.malzeme ? bilgiSatir("Malzeme", esc(p.malzeme)) : '') + (p.olcu ? bilgiSatir("Ölçüler", esc(p.olcu)) : '') +
      (p.fiyat && yetki.yonetici ? bilgiSatir("Tahmini fiyat", para(p.fiyat) + " + KDV") : '') +
      (p.aciklama ? '<div style="white-space:pre-wrap;font-size:14px;margin-top:10px;background:var(--hafif);border-radius:10px;padding:10px 12px">' + esc(p.aciklama) + '</div>' : '') + '</div>' +
    '<button class="buton yonetici-ozel" style="margin-top:0" data-git="is-form/-/-/' + id + '">' + ik("is") + 'Bu projeden teklif / iş emri oluştur</button>' +
    (cevrimici && g.length ? '<button class="buton ikincil yonetici-ozel" style="margin-top:12px" data-git="paylas-form/-/' + id + '">' + ik("mesaj") + 'Müşteriye bağlantı gönder</button>' : '') +
    '<div class="buton-sira" style="margin:12px 0"><button class="buton ikincil" data-is="projeSunum" data-arg="' + id + '|0">' + ik("ekran") + 'Sunum</button>' +
      '<button class="buton ikincil yonetici-ozel" data-git="proje-form/' + id + '">' + ik("kalem") + 'Düzenle</button>' +
      '<button class="buton tehlike yonetici-ozel" data-is="projeSil" data-arg="' + id + '">' + ik("sil") + 'Sil</button></div>' +
    bolum("Bu projeden açılan işler (" + isler.length + ")") +
    '<div class="kart liste-kart">' + (isler.length ? isler.map(ie => isSatir(ie)).join("") : bos("is", "Henüz teklif veya iş emri yok.")) + '</div>' +
    '</div></div>';
  return {baslik:p.baslik, geri:true, html, sonra: galeriDoldur};
}
EYLEM.projeSunum = (el, arg) => {
  const [id, i] = arg.split("|"), p = bul("katalog", id);
  if(p) sunumAc(sunumListesi([p]), Number(i) || 0);
};
EYLEM.projeSil = (el, id) => {
  const g = projeGorselleri(id);
  onayla("Proje silinsin mi?", (g.length ? g.length + " fotoğrafıyla birlikte " : "") + "çöp kutusuna taşınır. Bu projeden açılmış iş emirleri silinmez.", "Sil", () => islem(null, async () => {
    await Depo.sil("katalog", id);
    bildir("Proje çöp kutusuna taşındı"); git("katalog");
  }));
};

/* --- Proje formu --- */
function ekranProjeForm(id, kategori){
  const p = bul("katalog", id), kat = katalogKategorileri();
  form = {kategori: p ? p.kategori : kat.indexOf(kategori) >= 0 ? kategori : kat[0], yeniFotolar:[], _surum: p ? p._surum : null};
  const html = '<div class="kart form-kart">' +
    '<label class="etiket" for="pAd" style="margin-top:0">Proje adı</label><input id="pAd" class="kutu" maxlength="120" value="' + esc(p ? p.baslik : "") + '" placeholder="Örn: Beyaz lake U mutfak">' +
    '<label class="etiket">Kategori</label>' + secenekler("kategori", kat, form.kategori) +
    '<div class="alt-bilgi">Kategorileri Ayarlar sayfasından ekleyip çıkarabilirsiniz.</div>' +
    '<label class="etiket" for="pMalzeme">Malzeme <span class="ist">(isteğe bağlı)</span></label><input id="pMalzeme" class="kutu" maxlength="200" value="' + esc(p ? p.malzeme : "") + '" placeholder="Lake MDF kapak, kuvars tezgah, frenli menteşe">' +
    '<label class="etiket" for="pOlcu">Ölçüler <span class="ist">(isteğe bağlı)</span></label><input id="pOlcu" class="kutu" maxlength="200" value="' + esc(p ? p.olcu : "") + '" placeholder="Alt dolap 420 cm, üst dolap 360 cm, yükseklik 240 cm">' +
    '<label class="etiket" for="pAciklama">Açıklama <span class="ist">(sunumda görünür)</span></label><textarea id="pAciklama" class="kutu" maxlength="2000">' + esc(p ? p.aciklama : "") + '</textarea>' +
    '<label class="etiket" for="pFiyat">Tahmini fiyat <span class="ist">(KDV hariç, isteğe bağlı; sunumda görünmez, teklife aktarılır)</span></label><input id="pFiyat" class="kutu" inputmode="decimal" value="' + (p ? sayiYaz(p.fiyat) : "") + '" placeholder="0 ₺">' +
    (!p && cevrimici ? '<div class="form-bolum">Fotoğraflar</div><button type="button" class="buton ikincil kucuk" style="margin-top:10px" onclick="document.getElementById(\'pFoto\').click()">' + ik("yukle") + 'Fotoğraf seç</button>' +
      '<input type="file" id="pFoto" accept="image/*,video/*" multiple style="display:none"><div class="alt-bilgi" id="pFotoYazi">Kaydettikten sonra proje sayfasından da ekleyebilirsiniz.</div>' : '') +
    '<div class="hata" id="hata"></div><button class="buton" data-is="projeKaydet" data-arg="' + (p ? p.id : "") + '">' + ik("tamam") + 'Kaydet</button></div>';
  return {baslik: p ? "Projeyi düzenle" : "Yeni proje", geri:true, html, sonra(){
    secenekBagla();
    const f = document.getElementById("pFoto");
    if(f) f.addEventListener("change", () => {
      form.yeniFotolar = Array.from(f.files || []);
      document.getElementById("pFotoYazi").textContent = form.yeniFotolar.length ? form.yeniFotolar.length + " fotoğraf seçildi; kaydedince yüklenecek." : "";
    });
    document.getElementById("pAd").focus();
  }};
}
EYLEM.projeKaydet = (btn, id) => {
  const baslik = deger("pAd");
  if(!baslik) return hataYaz("Lütfen proje adını yazın.");
  if(!form.kategori) return hataYaz("Lütfen kategori seçin.");
  const fy = deger("pFiyat"), fiyat = fy ? sayiOku(fy) : 0;
  if(!(fiyat >= 0) || fiyat > 1e9) return hataYaz("Fiyatı kontrol edin.");
  const eski = bul("katalog", id), fotolar = form.yeniFotolar || [];
  const k = {id: id || yeniId(), baslik, kategori:form.kategori, malzeme:deger("pMalzeme"), olcu:deger("pOlcu"), aciklama:deger("pAciklama"),
    fiyat:yuvarla(fiyat), olusma: eski ? eski.olusma : Date.now()};
  islem(btn, async () => {
    await Depo.kaydet("katalog", Object.assign(k, form._surum != null ? {_surum:form._surum} : {}));
    if(id){ bildir("Kaydedildi"); geri(); return; }
    bildir("Proje eklendi"); history.replaceState(null, "", "#proje/" + k.id); ciz();
    if(fotolar.length && await gorselleriYukle(k.id, fotolar) && yol()[0] === "proje") ciz();
  });
};

/* --- ZIP'ten toplu içe aktarma --- */
// Her klasör bir proje olur (Facebook "bilgilerini indir" dosyasında albüm klasörleri gibi).
// İsteğe bağlı katalog.json: {kategori, projeler:[{klasor, baslik, kategori, aciklama, malzeme, olcu}]}
const RESIM_UZANTI = {jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", mp4:"video/mp4", m4v:"video/mp4", mov:"video/quicktime", webm:"video/webm", dwg:"application/acad", stl:"model/stl"};
const dogalSira = (a, b) => a.localeCompare(b, "tr", {numeric:true});
function ekranKatalogIce(){
  if(!cevrimici) return {baslik:"ZIP'ten içe aktar", geri:true, html:'<div class="uyari">İçe aktarmak için bulut bağlantısı gerekir.</div>'};
  if(eksikTablo.katalog) return ekranKatalog();
  form = {ice:null};
  const html = '<div class="kart form-kart"><div>Fotoğrafları içeren bir ZIP dosyası seçin. <b>Her klasör bir proje</b> olur; klasör adı proje adı olarak gelir. ' +
    'Fotoğraf ve videolar (mp4, mov, webm) alınır. Önizlemede istemediğiniz grupları çıkarabilir, adını ve kategorisini değiştirebilirsiniz.</div>' +
    '<div class="alt-bilgi">Facebook\'tan indirdiğiniz yedekte albümler ayrı klasörlerdedir. Büyük dosyalar için bilgisayar ve Wi-Fi önerilir.</div>' +
    '<button class="buton ikincil" onclick="document.getElementById(\'iceZip\').click()">' + ik("yukle") + 'ZIP dosyası seç</button>' +
    '<input type="file" id="iceZip" accept=".zip,application/zip" style="display:none" onchange="iceZipSecildi(this)">' +
    '<div id="iceOnizleme"></div></div>';
  return {baslik:"ZIP'ten içe aktar", geri:true, html};
}
async function iceZipSecildi(input){
  const f = input.files[0]; input.value = ""; if(!f) return;
  try{
    yuklemeGoster("ZIP açılıyor…");
    await jszipYukle();
    const zip = await JSZip.loadAsync(f);
    let tanim = null;
    const j = zip.file(/(^|\/)katalog\.json$/)[0];
    if(j){ try{ tanim = JSON.parse(await j.async("string")); }catch(e){} }
    const gruplar = {};
    zip.forEach((yol_, e) => {
      const uz = (yol_.match(/\.(\w+)$/) || [])[1];
      if(e.dir || !uz || !RESIM_UZANTI[uz.toLowerCase()] || /(^|\/)(__MACOSX|\.)/.test(yol_)) return;
      const p = yol_.split("/"), klasor = p.length > 1 ? p[p.length - 2] : "Fotoğraflar";
      (gruplar[klasor] = gruplar[klasor] || []).push(e);
    });
    const tp = (tanim && Array.isArray(tanim.projeler)) ? tanim.projeler : [];
    const sirali = Object.keys(gruplar).sort((a, b) => {
      const x = tp.findIndex(t => t.klasor === a), y = tp.findIndex(t => t.klasor === b);
      return (x < 0 ? 1e9 : x) - (y < 0 ? 1e9 : y) || dogalSira(a, b);
    });
    if(!sirali.length){ yuklemeKapat(); return uyar("ZIP içinde fotoğraf bulunamadı", "JPG, PNG veya WEBP fotoğraflar klasörler halinde olmalı."); }
    const varsayilanKat = (tanim && tanim.kategori) || (filtre.katalog !== "hepsi" ? filtre.katalog : katalogKategorileri()[0]);
    form.ice = sirali.map(k => {
      const t = tp.find(x => x.klasor === k) || {}, baslik = String(t.baslik || k).slice(0, 120);
      return {klasor:k, dosyalar:gruplar[k].sort((a, b) => dogalSira(a.name, b.name)), baslik, kategori:String(t.kategori || varsayilanKat).slice(0, 40),
        aciklama:String(t.aciklama || "").slice(0, 2000), malzeme:String(t.malzeme || "").slice(0, 200), olcu:String(t.olcu || "").slice(0, 200),
        var: veri.katalog.some(p => p.baslik === baslik), sec: !veri.katalog.some(p => p.baslik === baslik)};
    });
    // Önizleme küçük resimleri (ilk fotoğraf)
    for(const g of form.ice){ const ilk = g.dosyalar.find(e => !/\.(mp4|m4v|mov|webm)$/i.test(e.name)) || g.dosyalar[0]; g.onizlemeVideo = ilk !== g.dosyalar.find(e => !/\.(mp4|m4v|mov|webm)$/i.test(e.name)); g.onizleme = URL.createObjectURL(await ilk.async("blob")); }
    yuklemeKapat();
    iceOnizlemeCiz();
  }catch(e){ yuklemeKapat(); uyar("ZIP açılamadı", hataMesaji(e)); }
}
function iceOnizlemeCiz(){
  const kat = Array.from(new Set(katalogKategorileri().concat(form.ice.map(g => g.kategori))));
  const sec = form.ice.filter(g => g.sec), foto = sec.reduce((t, g) => t + g.dosyalar.length, 0);
  document.getElementById("iceOnizleme").innerHTML = '<div class="form-bolum">' + form.ice.length + ' grup bulundu</div>' +
    '<div class="secenekler" style="margin:10px 0"><button type="button" class="secenek" data-is="iceHepsi" data-arg="1">Tümünü seç</button><button type="button" class="secenek" data-is="iceHepsi" data-arg="0">Hiçbirini seçme</button></div>' +
    form.ice.map((g, i) => '<div class="kalem" data-i="' + i + '" style="display:flex;gap:10px;align-items:flex-start' + (g.sec ? '' : ';opacity:.55') + '">' +
      '<input type="checkbox" class="i-sec"' + (g.sec ? ' checked' : '') + ' style="width:20px;height:20px;margin-top:10px;flex-shrink:0" aria-label="İçe aktar">' +
      '<span class="kapak" style="width:64px;flex:0 0 64px;border-radius:8px">' + (g.onizlemeVideo ? '<video src="' + g.onizleme + '" muted playsinline preload="metadata"></video>' : '<img src="' + g.onizleme + '" alt="">') + '</span>' +
      '<div style="flex:1;min-width:0"><input class="kutu i-ad" maxlength="120" value="' + esc(g.baslik) + '" style="padding:8px 10px;font-size:15px">' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap"><select class="kutu i-kat" style="width:auto;padding:6px 10px;font-size:14px">' +
        kat.map(k => '<option' + (k === g.kategori ? ' selected' : '') + '>' + esc(k) + '</option>').join("") + '</select>' +
      '<span class="alt-bilgi" style="margin:0">' + g.dosyalar.length + ' dosya' + (g.var ? ' · <b style="color:#b45309">bu adla proje zaten var</b>' : '') + '</span></div></div></div>').join("") +
    '<div class="hata" id="hata"></div><button class="buton" data-is="iceAktar"' + (sec.length ? '' : ' disabled') + '>' + ik("yukle") + sec.length + ' proje, ' + foto + ' dosya içe aktar</button>';
  const k = document.getElementById("iceOnizleme");
  if(!k.dataset.bagli){
    k.dataset.bagli = 1;
    k.addEventListener("change", e => {
      const d = e.target.closest("[data-i]"); if(!d) return;
      const g = form.ice[Number(d.getAttribute("data-i"))];
      if(e.target.classList.contains("i-sec")){ g.sec = e.target.checked; iceOnizlemeCiz(); }
      else if(e.target.classList.contains("i-kat")) g.kategori = e.target.value;
    });
    k.addEventListener("input", e => { const d = e.target.closest("[data-i]"); if(d && e.target.classList.contains("i-ad")) form.ice[Number(d.getAttribute("data-i"))].baslik = e.target.value; });
  }
}
EYLEM.iceHepsi = (el, v) => { form.ice.forEach(g => { g.sec = v === "1"; }); iceOnizlemeCiz(); };
EYLEM.iceAktar = btn => {
  const secilen = form.ice.filter(g => g.sec);
  if(secilen.some(g => !g.baslik.trim())) return hataYaz("Her projenin adı dolu olmalı.");
  islem(btn, async () => {
    const liste = katalogListesi(), yeniKat = Array.from(new Set(secilen.map(g => g.kategori))).filter(k => k && liste.indexOf(k) < 0);
    if(yeniKat.length) await Depo.kaydet("ayarlar", {anahtar:"katalogKategorileri", deger:liste.concat(yeniKat)});
    const toplu = {sorunlu:[]}; let proje = 0, foto = 0;
    try{
      for(let i = 0; i < secilen.length; i++){
        const g = secilen[i];
        toplu.etiket = (i + 1) + "/" + secilen.length + " " + g.baslik.trim();
        yuklemeGoster(toplu.etiket + " · hazırlanıyor…");
        const k = {id:yeniId(), baslik:g.baslik.trim(), kategori:g.kategori, malzeme:g.malzeme, olcu:g.olcu, aciklama:g.aciklama, fiyat:0, olusma:Date.now() - i};
        await Depo.kaydet("katalog", k); proje++;
        const dosyalar = [];
        for(const e of g.dosyalar){
          const ad = e.name.split("/").pop(), uz = ad.split(".").pop().toLowerCase();
          dosyalar.push(new File([await e.async("blob")], ad, {type:RESIM_UZANTI[uz]}));
        }
        foto += await gorselleriYukle(k.id, dosyalar, toplu);
      }
    } finally { yuklemeKapat(); }
    form.ice.forEach(g => URL.revokeObjectURL(g.onizleme));
    bildir(proje + " proje, " + foto + " fotoğraf içe aktarıldı");
    if(toplu.sorunlu.length) uyar(toplu.sorunlu.length + " fotoğraf yüklenemedi", toplu.sorunlu.slice(0, 20).join("; "));
    filtre.katalog = secilen.length && secilen.every(g => g.kategori === secilen[0].kategori) ? secilen[0].kategori : "hepsi";
    history.replaceState(null, "", "#katalog"); ciz();
  });
};

/* --- Katalog fotoğrafları --- */
async function gorselSecildi(input, projeId){
  const liste = Array.from(input.files || []); input.value = "";
  if(liste.length && await gorselleriYukle(projeId, liste) && yol()[0] === "proje") ciz();
}
// Sunumda net görünsün diye 2400 piksele kadar küçültülür.
// toplu: {etiket, sorunlu:[]} verilirse ilerleme yazısına etiket eklenir, hatalar listeye yazılır (toplu içe aktarma).
async function gorselleriYukle(projeId, liste, toplu){
  const uygun = f => /^(image|video)\//.test(f.type) || CAD_UZANTI.test(f.name);
  const turu = f => /\.dwg$/i.test(f.name) ? "application/acad" : /\.stl$/i.test(f.name) ? "model/stl" : f.type;
  const resimler = liste.filter(uygun), sorunlu = liste.filter(f => !uygun(f)).map(f => f.name + " (fotoğraf, video veya DWG / STL çizimi değil)");
  let sira = projeGorselleri(projeId).reduce((m, g) => Math.max(m, g.sira), 0), tamam = 0;
  for(let i = 0; i < resimler.length; i++){
    yuklemeGoster((toplu ? toplu.etiket + " · " : "") + (/^video\//.test(resimler[i].type) ? "Video" : CAD_UZANTI.test(resimler[i].name) ? "Çizim" : "Fotoğraf") + " yükleniyor " + (i + 1) + "/" + resimler.length + "…");
    let yuklenen = null;
    try{
      const f = await gorselKucult(resimler[i], 2400);
      const id = yeniId(), anahtar = KATALOG_KLASOR + "/" + projeId + "/" + id + "_" + guvenliDosyaAdi(f.name);
      const r = await sb.storage.from(BUCKET).upload(anahtar, f, {contentType: turu(f) || "image/jpeg", upsert:false});
      if(r.error) throw r.error;
      yuklenen = anahtar; sira += 10;
      await Depo.kaydet("katalog_gorseller", {id, projeId, ad:f.name, tur:turu(f) || "", boyut:f.size, yol:anahtar, sira, olusma:Date.now() + i});
      tamam++;
    }catch(e){
      if(yuklenen) sb.storage.from(BUCKET).remove([yuklenen]).catch(() => {});
      sorunlu.push(resimler[i].name + " — " + hataMesaji(e));
    }
  }
  if(toplu){ toplu.sorunlu.push(...sorunlu); return tamam; }
  yuklemeKapat();
  if(tamam) bildir(tamam + " dosya yüklendi");
  if(sorunlu.length) uyar("Bazı dosyalar yüklenemedi", sorunlu.join("; "));
  return tamam;
}
EYLEM.gorselMenu = (el, gid) => {
  const g = bul("katalog_gorseller", gid); if(!g) return;
  const liste = cadMi(g) ? [g] : projeMedya(g.projeId), i = liste.findIndex(x => x.id === gid);
  const digerleri = projeSirali(veri.katalog.filter(p => p.id !== g.projeId));
  const dugme = (k, ikon, yazi) => '<button class="buton ikincil" data-k="' + k + '">' + ik(ikon) + yazi + '</button>';
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere"><p>' + (cadMi(g) ? 'Çizim' : videoMu(g) ? 'Video' : 'Fotoğraf') + ' işlemleri</p><div class="alt-bilgi">' + (i + 1) + '. fotoğraf / ' + liste.length + '</div><div class="secim-liste">' +
    (i > 0 && !videoMu(g) && projeKapak(g.projeId) !== g ? dugme("kapak", "yildiz", "Kapak fotoğrafı yap") : '') + (i > 0 ? dugme("once", "sol", "Bir öne al") : '') +
    (i < liste.length - 1 ? dugme("sonra", "sag", "Bir sona al") : '') +
    (cevrimici && !videoMu(g) && !cadMi(g) ? dugme("dondur", "dondur", "90° sağa döndür") : '') +
    (digerleri.length ? '<div style="display:flex;gap:8px"><select id="tasiHedef" class="kutu" aria-label="Taşınacak proje">' +
      digerleri.map(x => '<option value="' + x.id + '">' + esc(x.kategori + " · " + x.baslik) + '</option>').join("") + '</select>' +
      '<button class="buton ikincil kucuk" data-k="tasi">Taşı</button></div>' : '') +
    '<button class="buton tehlike" data-k="sil">' + ik("sil") + 'Sil</button>' + dugme("kapat", "x", "Kapat") + '</div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-k]");
    if(!b){ if(e.target === p) p.remove(); return; }
    const k = b.getAttribute("data-k"), hedef = p.querySelector("#tasiHedef");
    p.remove();
    if(k === "kapak") gorselSiraDegis(g, 0);
    else if(k === "once") gorselSiraDegis(g, i - 1);
    else if(k === "sonra") gorselSiraDegis(g, i + 1);
    else if(k === "dondur") gorselDondur(g);
    else if(k === "tasi") gorselTasi(g, hedef.value);
    else if(k === "sil") onayla("Fotoğraf silinsin mi?", "Çöp kutusuna taşınır.", "Sil", () => islem(null, async () => {
      await Depo.sil("katalog_gorseller", g.id); bildir("Fotoğraf çöp kutusuna taşındı"); ciz();
    }));
  });
  document.body.appendChild(p);
};
function gorselSiraDegis(g, yeniYer){
  const l = projeMedya(g.projeId).filter(x => x.id !== g.id);
  l.splice(yeniYer, 0, g);
  const degisen = l.map((x, i) => x.sira === (i + 1) * 10 ? null : Object.assign({}, x, {sira:(i + 1) * 10})).filter(Boolean);
  islem(null, async () => { await Depo.kaydet("katalog_gorseller", degisen); ciz(); });
}
function gorselTasi(g, projeId){
  const hedef = bul("katalog", projeId); if(!hedef) return;
  const sira = projeGorselleri(projeId).reduce((m, x) => Math.max(m, x.sira), 0) + 10;
  islem(null, async () => { await Depo.kaydet("katalog_gorseller", Object.assign({}, g, {projeId, sira})); bildir("Taşındı: " + hedef.baslik); ciz(); });
}
async function gorselDondur(g){
  let yeni = null;
  yuklemeGoster("Döndürülüyor…");
  try{
    await urlleriGetir([g]);
    const u = urlOnbellek[g.yol]; if(!u) throw new Error("fotoğraf alınamadı");
    const bmp = await createImageBitmap(await (await fetch(u.url)).blob());
    const c = document.createElement("canvas"); c.width = bmp.height; c.height = bmp.width;
    const x = c.getContext("2d"); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(bmp, 0, 0);
    if(bmp.close) bmp.close();
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
    if(!blob) throw new Error("fotoğraf işlenemedi");
    const ad = g.ad.replace(/\.\w+$/, "") + ".jpg";
    yeni = KATALOG_KLASOR + "/" + g.projeId + "/" + yeniId() + "_" + guvenliDosyaAdi(ad);
    const r = await sb.storage.from(BUCKET).upload(yeni, blob, {contentType:"image/jpeg", upsert:false});
    if(r.error) throw r.error;
    await Depo.kaydet("katalog_gorseller", Object.assign({}, g, {yol:yeni, ad, tur:"image/jpeg", boyut:blob.size}));
    yeni = null;
    sb.storage.from(BUCKET).remove([g.yol]).catch(() => {});
    bildir("Fotoğraf döndürüldü");
  }catch(e){
    if(yeni) sb.storage.from(BUCKET).remove([yeni]).catch(() => {});
    uyar("Döndürülemedi", hataMesaji(e));
  }finally{ yuklemeKapat(); }
  if(yol()[0] === "proje") ciz();
}
// Teklif açılırken projenin fotoğrafları iş emrinin dosyalarına kopyalanır (katalogdaki asıl fotoğraflar yerinde kalır).
async function projeFotolariniKopyala(projeId, ieId){
  if(!cevrimici) return;
  const g = projeGorselleri(projeId); let tamam = 0;
  for(let i = 0; i < g.length; i++){
    yuklemeGoster("Fotoğraflar iş emrine ekleniyor " + (i + 1) + "/" + g.length + "…");
    try{
      const id = yeniId(), hedef = ieId + "/" + id + "_" + guvenliDosyaAdi(g[i].ad);
      const r = await sb.storage.from(BUCKET).copy(g[i].yol, hedef);
      if(r.error) throw r.error;
      await Depo.kaydet("dosyalar", {id, isEmriId:ieId, ad:g[i].ad, tur:g[i].tur, boyut:g[i].boyut, yol:hedef, yukleyen:kullaniciAdi(), olusma:Date.now() + i});
      tamam++;
    }catch(e){}
  }
  yuklemeKapat();
  if(tamam < g.length) uyar("Bazı fotoğraflar iş emrine eklenemedi", (g.length - tamam) + " fotoğraf kopyalanamadı; iş emri sayfasından elle ekleyebilirsiniz.");
}

/* --- 3B çizim görüntüleyici (cad3b.js; DWG / STL) --- */
async function cadAc(ad, veri, kaydet, kaydetYazi){
  let m;
  try{ m = await import(new URL("cad3b.js", document.baseURI).href); }catch(e){ return uyar("3B görüntüleyici yüklenemedi", "İnternet bağlantınızı kontrol edin. (" + (e && e.message || e) + ")"); }
  m.cadGoster({ad, veri, kaydet, kaydetYazi});
}
async function depoDosyasi(yol_){
  await urlleriGetir([{yol:yol_}]);
  const u = urlOnbellek[yol_]; if(!u) throw new Error("Dosya bağlantısı alınamadı");
  const r = await fetch(u.url); if(!r.ok) throw new Error("Dosya indirilemedi");
  return r.arrayBuffer();
}
const gorselDosyasi = (blob, ad) => new File([blob], ad.replace(/\.\w+$/, "") + "-3b.jpg", {type:"image/jpeg"});
EYLEM.cadYerel = () => {
  const i = document.createElement("input"); i.type = "file"; i.accept = ".dwg,.stl";
  i.onchange = () => { const f = i.files[0]; if(f) cadAc(f.name, f.arrayBuffer()); };
  i.click();
};
EYLEM.cadKatalog = (el, gid) => {
  const g = bul("katalog_gorseller", gid); if(!g) return;
  cadAc(g.ad, depoDosyasi(g.yol), yetki.yonetici && cevrimici ? async blob => {
    if(await gorselleriYukle(g.projeId, [gorselDosyasi(blob, g.ad)])) bildir("Görüntü projeye eklendi");
  } : null, "Projeye fotoğraf olarak ekle");
};
EYLEM.cadIs = (el, arg) => {
  const [ieId, id] = arg.split("|"), d = bul("dosyalar", id); if(!d) return;
  cadAc(d.ad, depoDosyasi(d.yol), cevrimici ? blob => dosyaSecildi({files:[gorselDosyasi(blob, d.ad)], value:""}, ieId) : null, "İş emrine fotoğraf olarak ekle");
};

/* --- Sunum modu --- */
const sunumListesi = projeler => projeler.flatMap(p => projeMedya(p.id).map(g => ({g, p})));
// musteri: paylaşılan bağlantıdan açıldı (teklif düğmesi yerine WhatsApp, fiyat paylaşıldıysa gösterilir)
function sunumAc(liste, bas, musteri){
  if(!liste.length) return uyar("Sunulacak fotoğraf yok", musteri ? "" : "Önce projelere fotoğraf yükleyin.");
  let i = Math.min(bas || 0, liste.length - 1), oto = null, dokunX = null;
  const s = document.createElement("div"); s.className = "sunum";
  s.innerHTML = '<div class="sn-ust"><span class="marka"><img src="logo-beyaz.png" alt="Güneş Mobilya"></span><span class="sayac"></span>' +
    (liste.length > 1 ? '<button data-k="oto" aria-label="Otomatik geçiş">' + ik("oynat") + '<span class="yazi-gizle">Otomatik</span></button>' : '') +
    '<button data-k="bilgi" class="acik" aria-label="Bilgileri göster / gizle">' + ik("bilgi") + '</button>' +
    (document.fullscreenEnabled ? '<button data-k="tam" aria-label="Tam ekran">' + ik("ekran") + '</button>' : '') +
    (musteri ? (waNumara(musteri.telefon) ? '<button data-k="sor" aria-label="WhatsApp ile sor">' + ik("mesaj") + '<span class="yazi-gizle">Bilgi al</span></button>' : '') :
      '<button data-k="teklif" class="yonetici-ozel" aria-label="Teklif hazırla">' + ik("is") + '<span class="yazi-gizle">Teklif hazırla</span></button>') +
    '<button data-k="kapat" aria-label="Kapat">' + ik("x") + '</button></div>' +
    '<div class="sn-orta"><img alt=""><video class="sn-gizli" controls playsinline preload="metadata"></video>' + (liste.length > 1 ? '<button class="ok sol" data-k="geri" aria-label="Önceki">' + ik("sol") + '</button>' +
    '<button class="ok sag" data-k="ileri" aria-label="Sonraki">' + ik("sag") + '</button>' : '') + '</div><div class="sn-alt"></div>';
  const img = s.querySelector(".sn-orta img"), vid = s.querySelector(".sn-orta video");
  const goster = () => {
    const {g, p} = liste[i], u = urlOnbellek[g.yol], v = videoMu(g);
    img.classList.toggle("sn-gizli", v); vid.classList.toggle("sn-gizli", !v);
    if(v){ img.removeAttribute("src"); if(u && vid.getAttribute("src") !== u.url){ vid.src = u.url; vid.play().catch(() => {}); } }
    else { vid.pause(); vid.removeAttribute("src"); if(u) img.src = u.url; else img.removeAttribute("src"); }
    img.alt = p.baslik;
    s.querySelector(".sayac").textContent = (i + 1) + " / " + liste.length;
    s.querySelector(".sn-alt").innerHTML = '<div class="k">' + esc(p.kategori) + '</div><h3>' + esc(p.baslik) + '</h3>' +
      (p.malzeme || p.olcu || (musteri && p.fiyat) ? '<div class="o">' + (p.malzeme ? '<div><span>Malzeme:</span> ' + esc(p.malzeme) + '</div>' : '') + (p.olcu ? '<div><span>Ölçü:</span> ' + esc(p.olcu) + '</div>' : '') +
        (musteri && p.fiyat ? '<div><span>Başlangıç fiyatı:</span> ' + para(p.fiyat) + ' + KDV</div>' : '') + '</div>' : '') +
      (p.aciklama ? '<div class="d">' + esc(p.aciklama) + '</div>' : '');
    [1, -1].forEach(n => { const x = liste[(i + n + liste.length) % liste.length].g, v = urlOnbellek[x.yol]; if(v && !videoMu(x)) new Image().src = v.url; });   // komşuları önceden yükle
  };
  const adim = n => { i = (i + n + liste.length) % liste.length; goster(); };
  const otoAyarla = ac => {
    clearInterval(oto); oto = ac ? setInterval(() => { if(!videoMu(liste[i].g) || vid.ended || vid.paused) adim(1); }, 5000) : null;   // video oynarken bekler
    const b = s.querySelector('[data-k="oto"]');
    if(b){ b.classList.toggle("acik", !!ac); b.innerHTML = ik(ac ? "duraklat" : "oynat") + '<span class="yazi-gizle">' + (ac ? "Durdur" : "Otomatik") + '</span>'; }
  };
  const bilgi = () => { s.classList.toggle("bilgisiz"); s.querySelector('[data-k="bilgi"]').classList.toggle("acik", !s.classList.contains("bilgisiz")); };
  const tamEkran = () => { if(document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if(s.requestFullscreen) s.requestFullscreen().catch(() => {}); };
  const kapat = () => {
    otoAyarla(false); vid.pause(); document.removeEventListener("keydown", tus); window.removeEventListener("hashchange", kapat);
    if(document.fullscreenElement) document.exitFullscreen().catch(() => {});
    s.remove();
  };
  const tus = e => {
    if(e.key === "ArrowRight" || e.key === "PageDown"){ adim(1); e.preventDefault(); }
    else if(e.key === "ArrowLeft" || e.key === "PageUp"){ adim(-1); e.preventDefault(); }
    else if(e.key === "Escape") kapat();
    else if(e.key === " " && liste.length > 1){ otoAyarla(!oto); e.preventDefault(); }
    else if(e.key === "i") bilgi();
    else if(e.key === "f") tamEkran();
  };
  s.addEventListener("click", e => {
    const b = e.target.closest("[data-k]");
    if(!b){ if(e.target === img) bilgi(); return; }
    const k = b.getAttribute("data-k");
    if(k === "ileri") adim(1); else if(k === "geri") adim(-1);
    else if(k === "oto") otoAyarla(!oto); else if(k === "bilgi") bilgi(); else if(k === "tam") tamEkran();
    else if(k === "kapat") kapat();
    else if(k === "teklif"){ const id = liste[i].p.id; kapat(); git("is-form/-/-/" + id); }
    else if(k === "sor") window.open(vitrinWaLink(musteri.telefon, "“" + liste[i].p.baslik + "” projesi hakkında bilgi almak istiyorum."), "_blank", "noopener");
  });
  s.addEventListener("touchstart", e => { dokunX = e.touches.length === 1 ? e.touches[0].clientX : null; }, {passive:true});
  s.addEventListener("touchend", e => {
    if(dokunX === null) return;
    const dx = e.changedTouches[0].clientX - dokunX; dokunX = null;
    if(Math.abs(dx) > 50) adim(dx < 0 ? 1 : -1);
  });
  document.addEventListener("keydown", tus);
  window.addEventListener("hashchange", kapat);   // telefonun geri tuşu sunumu kapatsın
  document.body.appendChild(s);
  goster();
  (async () => { for(let k = 0; k < liste.length; k += 100) await urlleriGetir(liste.slice(k, k + 100).map(x => x.g)); })()
    .then(() => { if(document.body.contains(s)) goster(); }).catch(() => {});
}
