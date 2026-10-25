"use strict";
// Güneş Mobilya — ortak yedek arac
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= ORTAKLAR VE KİŞİ KASALARI ================= */
// Her kasa hareketinde para kimin elinde: "" = ortak kasa (dükkân), yoksa ortağın kimliği (h.ortak).
// Kasalar arası aktarım: tur "aktarim", h.ortak → h.hedef (gelir / gider sayılmaz).
// Ortak sermayesi ve şahsi çekişler kasadan geçer ama kâr hesabına girmez: h.ortak = paranın çıktığı / girdiği kasa, h.hedef = ilgili ortak.
const ORTAK_SERMAYE = "Ortak sermayesi", ORTAK_CEKIS = "Ortak çekişi (şahsi)";
const ortaklar = () => sistem().ortaklar;
const ortakAdi = id => !id ? "Kasa" : ((ortaklar().find(o => o.id === id) || {}).ad || "Kasa");
const ortakHazir = () => !cevrimici || !eksikSutun["hareketler.ortak"];
// Giriş yapan kullanıcının ortaklığı (Ortaklar ayarındaki kullanıcı veya ad eşleşmesi)
function benimOrtak(){
  const e = benimEposta(), a = trKucuk(yetki.ad || kullaniciAdi());
  const o = ortaklar().find(x => (x.eposta && x.eposta.toLowerCase() === e) || (a && trKucuk(x.ad) === a));
  return o ? o.id : "";
}
const ortakKategorisi = k => k === ORTAK_SERMAYE || k === ORTAK_CEKIS;
// Kişi kasaları: {"" : {nakit, banka, senet, toplam}, samet:{…}, …}
function kisiKasalari(sonTarih){
  const k = {"":{nakit:0, banka:0, senet:0, toplam:0}};
  ortaklar().forEach(o => { k[o.id] = {nakit:0, banka:0, senet:0, toplam:0}; });
  const ekle = (kim, odeme, t) => { const x = k[kim] || (k[kim] = {nakit:0, banka:0, senet:0, toplam:0}); const g = odeme === "Nakit" ? "nakit" : odeme === SENET ? "senet" : "banka"; x[g] += t; x.toplam += t; };
  veri.hareketler.forEach(h => {
    if(sonTarih && h.tarih > sonTarih) return;
    if(h.tur === "giris") ekle(h.ortak || "", h.odeme, h.tutar);
    else if(h.tur === "cikis") ekle(h.ortak || "", h.odeme, -h.tutar);
    else if(h.tur === "aktarim"){ ekle(h.ortak || "", h.odeme, -h.tutar); ekle(h.hedef || "", h.odeme, h.tutar); }
    else if(h.tur === "acilis" && !h.musteriId) ekle(h.ortak || "", h.odeme, h.tutar);
  });
  Object.values(k).forEach(x => Object.keys(x).forEach(a => { x[a] = yuvarla(x[a]); }));
  return k;
}
const kisiKasaVar = () => ortaklar().length && veri.hareketler.some(h => h.ortak || h.tur === "aktarim");
function kisiKasaSatiri(){
  if(!kisiKasaVar()) return '';
  const k = kisiKasalari();
  return '<div class="kisi-kasa">' + [""].concat(ortaklar().map(o => o.id)).filter(id => id === "" || k[id]).map(id => '<span' + (id ? '' : ' class="ortak-kasa"') + '>' + esc(id ? ortakAdi(id) + "'de" : "Kasada") +
    ' <b>' + para(k[id].toplam) + '</b>' + (k[id].nakit && k[id].nakit !== k[id].toplam ? ' <i>(nakit ' + para(k[id].nakit) + ')</i>' : '') + '</span>').join("") + '</div>';
}
// Para giriş / çıkış formunda "para kimde" seçimi
function ortakSecici(secili, giris){
  if(!ortaklar().length || !ortakHazir()) return '';
  if(giris === undefined) giris = form.tur === "giris";
  return '<label class="etiket" id="ortakEtiket">' + (giris ? "Para kimde?" : "Kim ödedi?") + '</label><div class="secenekler" data-ad="ortak">' +
    [["", "Kasa"]].concat(ortaklar().map(o => [o.id, o.ad])).map(([id, ad]) => '<button type="button" class="secenek' + (id === secili ? ' secili' : '') + '" data-deger="' + esc(id) + '">' + esc(ad) + '</button>').join("") + '</div>';
}
// Rapor: seçili ayda ortakların kâr payı ve şahsi çekişleri (kasa esaslı kâr; sermaye ve çekişler hariç)
function raporOrtakKarti(){
  if(!ortaklar().length) return '';
  const l = veri.hareketler.filter(h => (h.tur === "giris" || h.tur === "cikis") && h.tarih.slice(0, 7) === ayGoster);
  const kar = yuvarla(l.filter(h => h.tur === "giris" && !ortakKategorisi(h.kategori)).reduce((t, h) => t + h.tutar, 0) - l.filter(h => h.tur === "cikis" && !ortakKategorisi(h.kategori)).reduce((t, h) => t + h.tutar, 0));
  const toplamPay = ortaklar().reduce((t, o) => t + (Number(o.pay) || 0), 0) || 100, k = kisiKasalari();
  return '<div class="kart">' + kartBaslik("Ortaklar · bu ay", "(kasa esaslı kâr " + para(kar) + ")") +
    '<table class="kesim-ozet"><thead><tr><th>Ortak</th><th>Payı</th><th>Kâr payı</th><th>Şahsi çektiği</th><th>Fark</th><th>Elindeki para</th></tr></thead><tbody>' +
    ortaklar().map(o => {
      const pay = yuvarla(kar * (Number(o.pay) || 0) / toplamPay), cekti = l.filter(h => h.tur === "cikis" && h.kategori === ORTAK_CEKIS && h.hedef === o.id).reduce((t, h) => t + h.tutar, 0), fark = yuvarla(pay - cekti);
      return '<tr><td><b>' + esc(o.ad) + '</b></td><td>%' + sayiYaz(o.pay) + '</td><td>' + para(pay) + '</td><td class="t-cikis">' + para(cekti) + '</td><td class="' + (fark >= 0 ? 't-giris' : 't-cikis') + '">' +
        (fark >= 0 ? "+" : "−") + para(Math.abs(fark)) + '</td><td>' + para((k[o.id] || {toplam:0}).toplam) + '</td></tr>';
    }).join("") + '</tbody></table>' +
    '<div class="alt-bilgi">Kâr: kasaya giren − çıkan (ortak sermayesi ve şahsi çekişler hariç). Fark artıysa ortak payından daha çekebilir, eksiyse payından fazla çekmiş. Pay oranları: Ayarlar → Ortaklar.</div></div>';
}
// Kasalar arası aktarım (örn. İbrahim tahsil ettiği parayı kasaya bıraktı)
EYLEM.kasaAktarim = () => {
  const kasalar = [["", "Kasa"]].concat(ortaklar().map(x => [x.id, x.ad])), ben = benimOrtak();
  const sec = (id, s_) => '<select id="' + id + '" class="kutu">' + kasalar.map(([v, a]) => '<option value="' + esc(v) + '"' + (v === s_ ? ' selected' : '') + '>' + esc(a) + '</option>').join("") + '</select>';
  if(!ortakHazir()) return uyar("Önce veritabanı güncellemesi", "Supabase'de supabase-guncelleme-11.sql dosyasını çalıştırın.");
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:460px"><p>Kasalar arası aktarım</p><div class="alt-bilgi">Örn: İbrahim tahsil ettiği parayı kasaya bıraktı. Toplam para değişmez, gelir / gider sayılmaz.</div>' +
    '<label class="etiket" for="okTutar">Tutar</label><input id="okTutar" class="kutu tutar-kutu" inputmode="decimal" placeholder="0 ₺">' +
    '<div class="iki-alan"><div><label class="etiket" for="okKimden">Kimden</label>' + sec("okKimden", ben) + '</div><div><label class="etiket" for="okKime">Kime</label>' + sec("okKime", ben ? "" : (ortaklar()[0] || {}).id) + '</div></div>' +
    '<label class="etiket">Ödeme şekli</label><div class="secenekler" id="okOdeme">' + ODEME.filter(x => x !== SENET).map((x, i) => '<button type="button" class="secenek' + (i === 0 ? ' secili' : '') + '" data-o="' + esc(x) + '">' + esc(x) + '</button>').join("") + '</div>' +
    '<div class="iki-alan"><div>' + tarihAlani("okTarih", "Tarih", bugun()) + '</div><div><label class="etiket" for="okNot">Not <span class="ist">(isteğe bağlı)</span></label><input id="okNot" class="kutu" maxlength="200"></div></div>' +
    '<div class="hata" id="okHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const oo = e.target.closest("[data-o]"); if(oo){ p.querySelectorAll("#okOdeme .secenek").forEach(x => x.classList.toggle("secili", x === oo)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const tutar = sayiOku(p.querySelector("#okTutar").value), hata = t => { p.querySelector("#okHata").textContent = t; };
    const h = {id:yeniId(), tur:"aktarim", kategori:"Kasalar arası aktarım", tutar:yuvarla(tutar), odeme:p.querySelector("#okOdeme .secili").getAttribute("data-o"), musteriId:null, isEmriId:null, faturaId:null,
      aciklama:p.querySelector("#okNot").value.trim(), tarih:p.querySelector("#okTarih").value || bugun(), olusma:Date.now(), ortak:p.querySelector("#okKimden").value, hedef:p.querySelector("#okKime").value};
    if(!(tutar > 0)) return hata("Tutarı yazın.");
    if(h.ortak === h.hedef) return hata("Kimden ve kime aynı olamaz.");
    islem(b, async () => { await Depo.kaydet("hareketler", h); p.remove(); bildir("Aktarım kaydedildi"); ciz(); });
  });
  document.body.appendChild(p); p.querySelector("#okTutar").focus();
};
function ayarOrtaklar(){
  const l = ortaklar(), toplam = l.reduce((t, o) => t + (Number(o.pay) || 0), 0);
  return '<div class="kart">' + kartBaslik("Ortaklar", "(ikisi de patron / yönetici)") +
    '<div class="alt-bilgi" style="margin:0 0 8px">Kasada her paranın kimde olduğu (Kasa / ortak) seçilir; ortakların şahsi çekişi Para Çıktı → “' + ORTAK_CEKIS + '” ile girilir. Kâr payı ve çekişler Rapor sayfasında görünür.</div>' +
    '<div id="ortakListe">' + l.map((o, i) => '<div class="ikalem-alan alan-3" data-i="' + i + '" style="margin-top:8px"><label>Ad<input class="kutu or-ad" maxlength="40" value="' + esc(o.ad) + '"></label>' +
      '<label>Pay (%)<input class="kutu or-pay" inputmode="decimal" value="' + sayiYaz(o.pay) + '"></label>' +
      '<label>Giriş hesabı<select class="kutu or-e"><option value="">— Adına göre eşleşir —</option>' + yetki.liste.map(k => '<option value="' + esc(k.eposta) + '"' + (k.eposta === o.eposta ? ' selected' : '') + '>' + esc((k.ad || "") + " (" + k.eposta.replace("@gunesmobilya.app", "") + ")") + '</option>').join("") + '</select></label>' +
      '<button type="button" class="ikon-buton" data-is="ortakSil" data-arg="' + i + '" aria-label="Sil">' + ik("x") + '</button></div>').join("") + '</div>' +
    (Math.abs(toplam - 100) > 0.01 && l.length ? '<div class="uyari" style="margin:10px 0 0">Payların toplamı %' + sayiYaz(toplam) + '; %100 olmalı.</div>' : '') +
    '<div class="buton-sira"><button class="buton ikincil kucuk" style="margin:0" data-is="ortakEkle">' + ik("arti") + 'Ortak ekle</button><button class="buton kucuk" style="margin:0" data-is="ortakKaydet">' + ik("tamam") + 'Kaydet</button></div>' +
    (cevrimici ? '<div class="bilgi-kutu">Samet ve İbrahim\'in ayrı girişi için Supabase\'de iki hesap açın (örn. <b>samet@gunesmobilya.app</b>, <b>ibrahim@gunesmobilya.app</b>), sonra <b data-git="ayarlar/kullanicilar" style="cursor:pointer">Kullanıcılar ve yetkiler</b>\'den ikisini de <b>Yönetici</b> olarak ekleyin. Giriş yapan ortak para girerken “Para kimde?” kendiliğinden onun adıyla seçilir.</div>' : '') + '</div>';
}
function ortakFormOku(){
  return Array.from(document.querySelectorAll("#ortakListe [data-i]")).map((d, i) => Object.assign({}, ortaklar()[i] || {}, {id:(ortaklar()[i] || {}).id || yeniId(),
    ad:d.querySelector(".or-ad").value.trim(), pay:sayiOku(d.querySelector(".or-pay").value) || 0, eposta:d.querySelector(".or-e").value}));
}
EYLEM.ortakEkle = () => islem(null, async () => { await sistemKaydet({ortaklar:ortakFormOku().concat([{id:yeniId(), ad:"Yeni ortak", pay:0, eposta:""}])}); ciz(); });
EYLEM.ortakSil = (el, i) => {
  const l = ortakFormOku(), o = l[Number(i)];
  if(veri.hareketler.some(h => h.ortak === o.id || h.hedef === o.id)) return uyar("“" + o.ad + "” silinemez", "Bu ortağa ait kasa hareketleri var. Payını %0 yapabilirsiniz.");
  l.splice(Number(i), 1); islem(null, async () => { await sistemKaydet({ortaklar:l}); ciz(); });
};
EYLEM.ortakKaydet = btn => {
  const l = ortakFormOku();
  if(l.some(o => !o.ad)) return uyar("Ortak adı boş olamaz", "");
  const t = l.reduce((a, o) => a + o.pay, 0);
  if(l.length && Math.abs(t - 100) > 0.01) return uyar("Payları kontrol edin", "Toplam %100 olmalı (şu an %" + sayiYaz(t) + ").");
  islem(btn, async () => { await sistemKaydet({ortaklar:l}); bildir("Ortaklar kaydedildi"); ciz(); });
};

/* ================= ORTAK: KÜTÜPHANE YÜKLEME, DOSYA İNDİRME ================= */
const KUTUPHANE = {
  xlsx:{url:"https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", ad:"XLSX"},
  qr:{url:"https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js", ad:"qrcode"}
};
const kutuphaneSoz = {};
function kutuphane(k){
  const o = KUTUPHANE[k]; if(window[o.ad]) return Promise.resolve(window[o.ad]);
  return kutuphaneSoz[k] || (kutuphaneSoz[k] = new Promise((res, rej) => {
    const sc = document.createElement("script"); sc.src = o.url;
    sc.onload = () => res(window[o.ad]); sc.onerror = () => { delete kutuphaneSoz[k]; rej(new Error("Gerekli araç yüklenemedi; internet bağlantınızı kontrol edin.")); };
    document.head.appendChild(sc);
  }));
}
function dosyaIndir(icerik, ad, tur){
  const a = document.createElement("a"); a.href = URL.createObjectURL(icerik instanceof Blob ? icerik : new Blob([icerik], {type:tur || "application/octet-stream"}));
  a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
// Excel: sayfalar = [{ad, satirlar:[[...]], genislik:[...]}]
async function excelIndir(sayfalar, dosya, indirme = true){
  const X = await kutuphane("xlsx"), wb = X.utils.book_new();
  sayfalar.forEach(s => { const ws = X.utils.aoa_to_sheet(s.satirlar); if(s.genislik) ws["!cols"] = s.genislik.map(w => ({wch:w})); X.utils.book_append_sheet(wb, ws, s.ad.slice(0, 31)); });
  const veri_ = X.write(wb, {bookType:"xlsx", type:"array"});
  const blob = new Blob([veri_], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  if(indirme) dosyaIndir(blob, dosya);
  return blob;
}
const csvYap = satirlar => "﻿" + satirlar.map(r => r.map(v => { const t = v == null ? "" : String(v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(";")).join("\r\n");

/* ================= OTOMATİK GÜNLÜK YEDEK (SUNUCUDA) ================= */
// Sunucuda pg_cron her gece yedek_al() çağırır; çalışmıyorsa yönetici uygulamayı açtığında son yedek 24 saatten eskiyse alınır.
let sunucuYedekleri = null;
async function sunucuYedekleriGetir(){
  if(!cevrimici || eksikTablo.yedekler) return [];
  const r = await sb.from("yedekler").select("id,zaman,tur,boyut,sayilar").order("zaman", {ascending:false}).limit(60);
  if(r.error){ if(eksikTabloHatasi(r.error)) eksikTablo.yedekler = 1; throw r.error; }
  delete eksikTablo.yedekler;
  return sunucuYedekleri = r.data.map(x => Object.assign(x, {zaman:Number(x.zaman)}));
}
async function gunlukYedekKontrol(){
  if(!cevrimici || cevrimdisi || !yetki.yonetici) return;
  try{
    const l = await sunucuYedekleriGetir();
    if(l.length && Date.now() - l[0].zaman < 24 * 3600000) return;
    const r = await sb.rpc("yedek_al", {tur:"uygulama"});
    if(r.error){ if(eksikTabloHatasi(r.error)) eksikTablo.yedekler = 1; return; }
    sunucuYedekleri = null;
  }catch(e){}
}
// Sunucudaki kopyayı uygulamanın yedek biçimine çevirir (Ayarlar → Yedek → Geri yükle ile aynı)
async function sunucuYedegiOku(id){
  const r = await sb.from("yedekler").select("icerik,zaman").eq("id", id).single();
  if(r.error) throw r.error;
  const v = {surum:2, tarih:new Date(Number(r.data.zaman)).toISOString()};
  TABLOLAR.forEach(t => { v[t] = Array.isArray(r.data.icerik[t]) ? r.data.icerik[t].map(x => buluttanCevir(t, x)) : []; });
  return v;
}
function sunucuYedekKarti(){
  if(!cevrimici) return '<div class="kart">' + kartBaslik("Otomatik günlük yedek") + '<div class="alt-bilgi" style="margin:0">Bilgiler sadece bu cihazda; otomatik yedek bulut bağlantısıyla çalışır. Şimdilik “Yedek al” ile dosya indirin.</div></div>';
  if(eksikTablo.yedekler) return '<div class="kart">' + kartBaslik("Otomatik günlük yedek") + '<div class="uyari" style="margin:0">Otomatik yedek için Supabase\'de <b>supabase-guncelleme-12.sql</b> (veya supabase-tum-kurulum.sql) dosyasını çalıştırın.</div></div>';
  const l = sunucuYedekleri;
  return '<div class="kart" id="sunucuYedek">' + kartBaslik("Otomatik günlük yedek", "(sunucuda, son 30 gün)") +
    '<div class="alt-bilgi" style="margin:0 0 8px">Her gece 03:15\'te tüm kayıtların kopyası alınır. Telefon kaybolsa ya da bir kayıt yanlışlıkla değişse buradan geri dönebilirsiniz. Fotoğraf ve dosyalar bu kopyaya girmez (depoda durur).</div>' +
    (l == null ? '<div class="bos"><span class="donen"></span> Yükleniyor…</div>' : l.length ? l.slice(0, 31).map((y, i) => '<div class="satir"><span class="rozet ' + (i ? 'r-gri' : 'r-giris') + '">' + ik("bulut") + '</span><span class="orta"><div class="s1">' +
      esc(tamZaman(y.zaman)) + (i === 0 ? ' <span class="etiket-rozet d-yesil">en son</span>' : '') + '</div><div class="s2">' + esc(({otomatik:"Gece otomatik", uygulama:"Uygulama açılışında", elle:"Elle alındı"}[y.tur] || y.tur) + " · " +
      ((y.sayilar && (y.sayilar.hareketler || 0)) + " kasa, " + (y.sayilar && (y.sayilar.is_emirleri || 0)) + " iş, " + (y.sayilar && (y.sayilar.faturalar || 0)) + " fatura") + " · " + mbYaz(Math.max(y.boyut, 1048576 / 4)).replace(/^1 MB$/, "< 1 MB")) + '</div></span>' +
      '<button class="ikon-buton" data-is="sunucuYedekIndir" data-arg="' + y.id + '" title="Dosya olarak indir">' + ik("indir") + '</button>' +
      '<button class="ikon-buton" data-is="sunucuYedekDon" data-arg="' + y.id + '" title="Bu yedeğe dön">' + ik("dondur") + '</button></div>').join("") : bos("bulut", "Henüz otomatik yedek yok.")) +
    '<button class="buton ikincil kucuk" data-is="sunucuYedekAl" style="margin-top:10px">' + ik("bulut") + 'Şimdi yedek al</button></div>';
}
EYLEM.sunucuYedekAl = btn => islem(btn, async () => {
  const r = await sb.rpc("yedek_al", {tur:"elle"}); if(r.error) throw r.error;
  await sunucuYedekleriGetir(); logla("yedek", "yedek", "", "Sunucuda elle yedek alındı"); bildir("Yedek alındı"); ciz();
});
EYLEM.sunucuYedekIndir = (btn, id) => islem(btn, async () => {
  const v = await sunucuYedegiOku(id);
  dosyaIndir(JSON.stringify(v, null, 1), "gunes-mobilya-sunucu-yedek-" + v.tarih.slice(0, 10) + ".json", "application/json"); bildir("Yedek indirildi");
});
EYLEM.sunucuYedekDon = (btn, id) => {
  const y = (sunucuYedekleri || []).find(x => String(x.id) === String(id)); if(!y) return;
  onayla(tamZaman(y.zaman) + " yedeğine dönülsün mü?", "O andaki kayıtlar geri yazılır: silinen kayıtlar geri gelir, değiştirilenler o haline döner. Yedekten sonra eklenen yeni kayıtlar silinmez. Önce şu anki durumun da yedeği alınır.", "Yedeğe dön",
    () => islem(null, async () => {
      yuklemeGoster("Yedek hazırlanıyor…");
      try{
        await sb.rpc("yedek_al", {tur:"elle"});   // dönmeden önceki hal
        const v = await sunucuYedegiOku(id);
        yuklemeGoster("Kayıtlar geri yazılıyor…");
        await hepsiniKaydet(v);
        await Depo.yukle(); sunucuYedekleri = null; bildir("Yedeğe dönüldü"); ciz();
      } finally { yuklemeKapat(); }
    }));
};

/* ================= KDV ÖZETİ ================= */
function kdvOzeti(ay){
  const top = (tur) => {
    const oran = {}; let matrah = 0, kdv = 0;
    const l = veri.faturalar.filter(f => f.tur === tur && f.tarih.slice(0, 7) === ay).sort((a, b) => a.tarih < b.tarih ? -1 : 1);
    l.forEach(f => (f.kalemler && f.kalemler.length ? f.kalemler : [{miktar:1, fiyat:f.araToplam, kdv:f.araToplam ? Math.round(f.kdvToplam / f.araToplam * 100) : 0}]).forEach(k => {
      const m = (Number(k.miktar) || 0) * (Number(k.fiyat) || 0), o = Number(k.kdv) || 0, x = oran[o] || (oran[o] = {matrah:0, kdv:0});
      x.matrah += m; x.kdv += m * o / 100; matrah += m; kdv += m * o / 100;
    }));
    return {l, oran, matrah:yuvarla(matrah), kdv:yuvarla(kdv)};
  };
  const s = top("satis"), a = top("alis"), fark = yuvarla(s.kdv - a.kdv);
  return {s, a, fark};
}
function ekranKdv(){
  const o = kdvOzeti(ayGoster), p = ayGoster.split("-"), ayAd = AYLAR[Number(p[1]) - 1] + " " + p[0];
  const oranTablo = (x, baslik) => '<div class="kart">' + kartBaslik(baslik) + '<table class="kesim-ozet"><thead><tr><th>KDV oranı</th><th>Matrah (KDV hariç)</th><th>KDV</th></tr></thead><tbody>' +
    (Object.keys(x.oran).length ? Object.keys(x.oran).sort((a, b) => a - b).map(r => '<tr><td>%' + r + '</td><td>' + para(x.oran[r].matrah) + '</td><td>' + para(x.oran[r].kdv) + '</td></tr>').join("") : '<tr><td colspan="3" class="t-soluk">Fatura yok</td></tr>') +
    '<tr><td><b>Toplam</b></td><td><b>' + para(x.matrah) + '</b></td><td><b>' + para(x.kdv) + '</b></td></tr></tbody></table></div>';
  const html = '<div class="ust-arac">' + aySecici() + '<div class="buton-sira" style="margin:0"><button class="buton kucuk" data-is="kdvExcel">' + ik("indir") + 'Excel (muhasebeci)</button>' +
      '<button class="buton kucuk ikincil" data-is="kdvPaylas">' + ik("mesaj") + 'Gönder</button></div></div>' +
    '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Hesaplanan KDV (satış)</div><div class="deger">' + para(o.s.kdv) + '</div><div class="alt-bilgi">' + o.s.l.length + ' satış faturası</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">İndirilecek KDV (alış)</div><div class="deger">' + para(o.a.kdv) + '</div><div class="alt-bilgi">' + o.a.l.length + ' alış faturası</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">' + (o.fark >= 0 ? "Ödenecek KDV" : "Sonraki aya devreden KDV") + '</div><div class="deger ' + (o.fark >= 0 ? 't-cikis' : 't-giris') + '">' + para(Math.abs(o.fark)) + '</div><div class="alt-bilgi">' + ayAd + '</div></div></div>' +
    '<div class="iki-sutun">' + oranTablo(o.s, "Satışlar (hesaplanan KDV)") + oranTablo(o.a, "Alışlar (indirilecek KDV)") + '</div>' +
    '<div class="alt-bilgi" style="margin:0 2px 12px">Ön bilgi amaçlıdır; önceki aylardan devreden KDV, tevkifat ve faturasız giderler hesaba katılmaz. Kesin beyanname için muhasebecinize Excel dosyasını gönderin.</div>' +
    bolum("Faturalar") + '<div class="kart liste-kart">' + (o.s.l.concat(o.a.l).length ? o.s.l.concat(o.a.l).map(f => faturaSatir(f)).join("") : bos("fatura", "Bu ay fatura yok.")) + '</div>';
  return {baslik:"KDV özeti", geri:true, html};
}
async function kdvExcelYap(indirme = true){
  const o = kdvOzeti(ayGoster), p = ayGoster.split("-"), ayAd = AYLAR[Number(p[1]) - 1] + " " + p[0], fr = firma();
  const fat = l => [["Tarih", "Fatura no", "Cari", "Vergi / TC no", "Matrah (KDV hariç)", "KDV", "Toplam", "Açıklama"]].concat(l.map(f => {
    const m = bul("musteriler", f.musteriId) || {}; return [f.tarih, f.no, m.ad || "", m.vergiNo || "", yuvarla(f.araToplam), yuvarla(f.kdvToplam), yuvarla(f.toplam), f.aciklama || ""]; }));
  const oran = x => Object.keys(x.oran).sort((a, b) => a - b).map(r => ["  %" + r, yuvarla(x.oran[r].matrah), yuvarla(x.oran[r].kdv)]);
  return excelIndir([
    {ad:"Özet", genislik:[34, 20, 18], satirlar:[[fr.ad + " — KDV özeti"], ["Dönem", ayAd], ["Vergi no", fr.vergiNo || ""], [], ["", "Matrah", "KDV"], ["Satışlar (hesaplanan)", o.s.matrah, o.s.kdv]].concat(oran(o.s),
      [["Alışlar (indirilecek)", o.a.matrah, o.a.kdv]], oran(o.a), [[], [o.fark >= 0 ? "Ödenecek KDV" : "Devreden KDV", "", Math.abs(o.fark)], [], ["Not: önceki dönemden devreden KDV ve tevkifat dahil değildir."]])},
    {ad:"Satış faturaları", genislik:[12, 16, 30, 14, 16, 12, 14, 30], satirlar:fat(o.s.l)},
    {ad:"Alış faturaları", genislik:[12, 16, 30, 14, 16, 12, 14, 30], satirlar:fat(o.a.l)}
  ], "kdv-ozeti-" + ayGoster + ".xlsx", indirme);
}
EYLEM.kdvExcel = btn => islem(btn, async () => { await kdvExcelYap(); logla("dosya", "faturalar", "", "KDV özeti Excel (" + ayGoster + ")"); });
EYLEM.kdvPaylas = btn => islem(btn, async () => {
  const blob = await kdvExcelYap(), ad = "kdv-ozeti-" + ayGoster + ".xlsx", f = new File([blob], ad, {type:blob.type});
  if(navigator.canShare && navigator.canShare({files:[f]})) await navigator.share({files:[f], title:"KDV özeti " + ayGoster, text:FIRMA + " KDV özeti " + ayGoster}).catch(() => {});
  else uyar("Dosya indirildi", "Bu cihaz doğrudan paylaşmayı desteklemiyor; indirilen “" + ad + "” dosyasını WhatsApp veya e-postayla muhasebecinize gönderin.");
});

/* ================= TOPLU FİYAT GÜNCELLEME ================= */
let fiyatForm = null;
function ekranFiyatGuncelle(){
  if(!fiyatForm) fiyatForm = {hedef:"malzeme", yuzde:10, filtre:"", kategori:"", yuvarla:0};
  const f = fiyatForm, ml = malzemeListesi(), yuzde = Number(f.yuzde) || 0;
  const yeni = (v, yuv) => { const x = v * (1 + yuzde / 100); return yuv ? Math.round(x / yuv) * yuv : yuvarla(x); };
  const malz = ml.filter(m => !f.filtre || trKucuk(m.ad).indexOf(trKucuk(f.filtre)) >= 0 || (m.tedarikciId && trKucuk(cariAdi(m.tedarikciId)).indexOf(trKucuk(f.filtre)) >= 0));
  const kat = veri.katalog.filter(k => k.fiyat > 0 && (!f.kategori || k.kategori === f.kategori));
  // Açık tekliflerin yeni malzeme fiyatlarıyla maliyeti
  const yeniFiyat = {}; if(f.hedef === "malzeme") malz.forEach(m => { yeniFiyat[m.id] = yeni(m.fiyat || 0); });
  const etki = veri.is_emirleri.filter(ie => ie.durum === "Teklif" || (ac(ie) && ie.durum === "Sipariş alındı")).map(ie => {
    const h = isHesap(ie.kalemler, isTeklif(ie)); let eski = 0, yn = 0, var_ = false;
    ie.kalemler.forEach(k => { if(!k.hesap) return; const a = Number(k.adet) || 0;
      const top = fn => (k.hesap.satirlar || []).reduce((t, s) => t + (s.miktar || 0) * fn(s), 0) + (k.hesap.iscilik || 0);
      eski += a * top(s => s.fiyat || 0); yn += a * top(s => s.malzemeId && yeniFiyat[s.malzemeId] != null ? yeniFiyat[s.malzemeId] : (s.fiyat || 0));
      if((k.hesap.satirlar || []).some(s => yeniFiyat[s.malzemeId] != null)) var_ = true; });
    return var_ ? {ie, net:h.net, eski:yuvarla(eski), yeni:yuvarla(yn)} : null;
  }).filter(Boolean);
  const html = '<div class="kart form-kart">' +
    '<label class="etiket" style="margin-top:0">Neyin fiyatı?</label><div class="secenekler">' + [["malzeme", "Malzeme listesi (maliyet)"], ["katalog", "Katalog fiyatları (satış)"]].map(([k, v]) => '<button class="secenek' + (k === f.hedef ? ' secili' : '') + '" data-is="fgAyar" data-arg="hedef|' + k + '">' + v + '</button>').join("") + '</div>' +
    '<div class="iki-alan"><div><label class="etiket" for="fgYuzde">Değişim (%)</label><input id="fgYuzde" class="kutu tutar-kutu" inputmode="decimal" value="' + sayiYaz(f.yuzde) + '" placeholder="Zam için 10, indirim için -5"></div>' +
      (f.hedef === "malzeme" ? '<div><label class="etiket" for="fgFiltre">Sadece adı / tedarikçisi içeren <span class="ist">(boşsa hepsi)</span></label><input id="fgFiltre" class="kutu" value="' + esc(f.filtre) + '" placeholder="Örn: sunta, Kaya Kereste"></div>' :
        '<div><label class="etiket" for="fgKat">Kategori</label><select id="fgKat" class="kutu"><option value="">Hepsi</option>' + katalogListesi().map(k => '<option' + (k === f.kategori ? ' selected' : '') + '>' + esc(k) + '</option>').join("") + '</select></div>') + '</div>' +
    (f.hedef === "katalog" ? '<label class="etiket">Yuvarla</label><div class="secenekler">' + [[0, "Yuvarlama"], [10, "10 ₺"], [50, "50 ₺"], [100, "100 ₺"], [500, "500 ₺"]].map(([k, v]) => '<button class="secenek' + (k === Number(f.yuvarla) ? ' secili' : '') + '" data-is="fgAyar" data-arg="yuvarla|' + k + '">' + v + '</button>').join("") + '</div>' : '') +
    '</div>' +
    bolum("Önizleme (" + (f.hedef === "malzeme" ? malz.length : kat.length) + ")") + '<div class="kart"><table class="kesim-ozet"><thead><tr><th>' + (f.hedef === "malzeme" ? "Malzeme" : "Katalog projesi") + '</th><th>Şimdi</th><th>Yeni</th><th>Fark</th></tr></thead><tbody>' +
      (f.hedef === "malzeme" ? malz.map(m => '<tr><td>' + esc(m.ad) + ' <span class="ist">/ ' + esc(m.birim) + '</span></td><td>' + para(m.fiyat || 0) + '</td><td><b>' + para(yeni(m.fiyat || 0)) + '</b></td><td class="' + (yuzde >= 0 ? 't-cikis' : 't-giris') + '">' + para(yeni(m.fiyat || 0) - (m.fiyat || 0)) + '</td></tr>').join("") :
        kat.map(k => '<tr><td>' + esc(k.baslik) + ' <span class="ist">· ' + esc(k.kategori) + '</span></td><td>' + para(k.fiyat) + '</td><td><b>' + para(yeni(k.fiyat, Number(f.yuvarla))) + '</b></td><td class="' + (yuzde >= 0 ? 't-giris' : 't-cikis') + '">' + para(yeni(k.fiyat, Number(f.yuvarla)) - k.fiyat) + '</td></tr>').join("")) +
      '</tbody></table>' + (yuzde ? '<button class="buton" data-is="fgUygula">' + ik("tamam") + 'Fiyatları %' + sayiYaz(yuzde) + ' ' + (yuzde > 0 ? "artır" : "düşür") + '</button>' : '<div class="alt-bilgi">Değişim oranını yazın.</div>') + '</div>' +
    (f.hedef === "malzeme" ? bolum("Açık tekliflere etkisi (" + etki.length + ")") + '<div class="kart liste-kart">' + (etki.length ? etki.map(x => {
      const ek = x.net - x.eski, yk = x.net - x.yeni;
      return '<button class="satir" data-git="is/' + x.ie.id + '"><span class="orta"><div class="s1">' + esc(x.ie.no + " · " + x.ie.baslik) + '</div><div class="s2">' + esc(cariAdi(x.ie.musteriId) + " · " + x.ie.durum) +
        ' · fiyat ' + para(x.net) + ' · maliyet ' + para(x.eski) + ' → ' + para(x.yeni) + '</div></span><span class="sag"><div class="tutar ' + (yk >= 0 ? 't-giris' : 't-cikis') + '">' + para(yk) + '</div><div class="s2">önce ' + para(ek) +
        (x.net ? ' · %' + Math.round(ek / x.net * 100) + ' → %' + Math.round(yk / x.net * 100) : '') + '</div></span></button>';
    }).join("") : bos("is", "Malzemeden hesaplanmış açık teklif yok (teklif kaleminde “Malzemeden hesapla” kullanılanlar burada görünür).")) + '</div>' : '');
  return {baslik:"Toplu fiyat güncelleme", geri:true, html, sonra(){
    const y = document.getElementById("fgYuzde"), fl = document.getElementById("fgFiltre"), kt = document.getElementById("fgKat");
    const yenile = () => { const a = document.activeElement && document.activeElement.id, p = a && document.activeElement.selectionStart; ciz(); const e = a && document.getElementById(a); if(e){ e.focus(); try{ e.setSelectionRange(p, p); }catch(x){} } };
    let z; const gecik = fn => { clearTimeout(z); z = setTimeout(fn, 400); };
    y.addEventListener("input", () => { f.yuzde = sayiOku(y.value) || 0; gecik(yenile); });
    if(fl) fl.addEventListener("input", () => { f.filtre = fl.value; gecik(yenile); });
    if(kt) kt.addEventListener("change", () => { f.kategori = kt.value; yenile(); });
  }};
}
EYLEM.fgAyar = (el, arg) => { const [k, v] = arg.split("|"); fiyatForm[k] = v; ciz(); };
EYLEM.fgUygula = btn => {
  const f = fiyatForm, yuzde = Number(f.yuzde) || 0; if(!yuzde) return;
  const yeni = (v, yuv) => { const x = v * (1 + yuzde / 100); return yuv ? Math.round(x / yuv) * yuv : yuvarla(x); };
  if(f.hedef === "malzeme"){
    const uyan = m => !f.filtre || trKucuk(m.ad).indexOf(trKucuk(f.filtre)) >= 0 || (m.tedarikciId && trKucuk(cariAdi(m.tedarikciId)).indexOf(trKucuk(f.filtre)) >= 0);
    const l = malzemeListesi().map(m => uyan(m) ? Object.assign({}, m, {fiyat:yeni(m.fiyat || 0)}) : m), n = malzemeListesi().filter(uyan).length;
    onayla(n + " malzemenin fiyatı %" + sayiYaz(yuzde) + " değişsin mi?", "Kayıtlı teklif fiyatları değişmez; yeni tekliflerde yeni fiyatlar kullanılır.", "Güncelle", () => islem(null, async () => {
      await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:l}); bildir(n + " malzeme güncellendi"); fiyatForm.yuzde = 0; ciz(); }), false);
  } else {
    const l = veri.katalog.filter(k => k.fiyat > 0 && (!f.kategori || k.kategori === f.kategori)).map(k => Object.assign({}, k, {fiyat:yeni(k.fiyat, Number(f.yuvarla))}));
    onayla(l.length + " katalog projesinin fiyatı %" + sayiYaz(yuzde) + " değişsin mi?", "Müşteriye gönderilmiş eski bağlantılardaki fiyatlar değişmez.", "Güncelle", () => islem(null, async () => {
      await Depo.kaydet("katalog", l); bildir(l.length + " proje güncellendi"); fiyatForm.yuzde = 0; ciz(); }), false);
  }
};

/* ================= AYLIK HEDEFLER ================= */
// Bu ay: alınan siparişler (KDV hariç), teslim edilen işlerin kârı, teklif → sipariş dönüşümü
function ayMetrikleri(ay){
  const ayda = t => t && t.slice(0, 7) === ay, ayMs = ms => ayda(tarihStr(new Date(ms)));
  const ciro = veri.is_emirleri.filter(ie => ayMs(ie.olusma) && ie.durum !== "İptal" && ie.durum !== "Teklif").reduce((t, ie) => t + isHesap(ie.kalemler, isTeklif(ie)).net, 0);
  const kar = veri.is_emirleri.filter(ie => ie.durum === "Teslim edildi" && ayda(isTeslimTarihi(ie))).reduce((t, ie) => t + isKarlilik(ie).kar, 0);
  const teklifler = veri.is_emirleri.filter(ie => ayMs(ie.olusma) && (ie.durum === "Teklif" || veri.is_notlari.some(n => n.isEmriId === ie.id && /Teklif onaylandı|Durum: Teklif →|Katalogdan teklif/.test(n.metin))));
  const onay = teklifler.filter(ie => ie.durum !== "Teklif" && ie.durum !== "İptal").length;
  return {ciro:yuvarla(ciro), kar:yuvarla(kar), donusum: teklifler.length ? onay / teklifler.length * 100 : 0, teklif:teklifler.length, onay};
}
function hedefKarti(){
  const h = sistem().hedefler || {}; if(!(h.ciro > 0 || h.kar > 0 || h.donusum > 0)) return '';
  const m = ayMetrikleri(bugun().slice(0, 7)), d = new Date(), gun = d.getDate(), ayGun = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), beklenen = gun / ayGun * 100;
  const cubuk = (ad, v, hedef, yaz) => { if(!(hedef > 0)) return ''; const y = Math.min(100, v / hedef * 100), iyi = y >= beklenen - 5;
    return '<div class="hedef"><div class="cubuk-ust"><span>' + ad + '</span><span><b>' + yaz(v) + '</b> <span class="t-soluk">/ ' + yaz(hedef) + ' · %' + Math.round(v / hedef * 100) + '</span></span></div>' +
      '<div class="hedef-yol"><div class="cubuk" style="width:' + Math.max(1.5, y) + '%;background:' + (y >= 100 ? 'var(--giris)' : iyi ? 'var(--ana)' : 'var(--cikis)') + '"></div><i style="left:' + beklenen + '%" title="Ayın bu gününde olması gereken"></i></div></div>'; };
  return '<div class="kart">' + kartBaslik("Bu ayın hedefleri", '<button class="baglanti" style="margin:0" data-git="ayarlar/hedef">Düzenle</button>') +
    cubuk("Alınan sipariş (KDV hariç)", m.ciro, h.ciro, para) + cubuk("Teslim edilen işlerin kârı", m.kar, h.kar, para) + cubuk("Teklif → sipariş", m.donusum, h.donusum, v => "%" + Math.round(v)) +
    '<div class="alt-bilgi">Dikey çizgi ayın bugününe göre olması gereken yer (' + gun + '/' + ayGun + ' gün).</div></div>';
}
function ayarHedef(){
  const h = sistem().hedefler || {}, m = ayMetrikleri(bugun().slice(0, 7));
  return '<div class="kart">' + kartBaslik("Aylık hedefler", "(ana sayfada ilerleme çubuğu)") +
    '<div class="izgara uc" style="margin:0">' + sayiAlan("hCiro", "Alınan sipariş (₺, KDV hariç)", h.ciro ? sayiYaz(h.ciro) : "") + sayiAlan("hKar", "Teslim edilen işlerin kârı (₺)", h.kar ? sayiYaz(h.kar) : "") + sayiAlan("hDon", "Teklif → sipariş (%)", h.donusum || "") + '</div>' +
    '<div class="alt-bilgi">Bu ay şu ana kadar: sipariş ' + para(m.ciro) + ' · kâr ' + para(m.kar) + ' · dönüşüm %' + Math.round(m.donusum) + ' (' + m.onay + '/' + m.teklif + '). Boş bırakılan hedef gösterilmez.</div>' +
    '<button class="buton" data-is="hedefKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
EYLEM.hedefKaydet = btn => {
  const d = {ciro:Math.max(0, sayiOku(deger("hCiro")) || 0), kar:Math.max(0, sayiOku(deger("hKar")) || 0), donusum:Math.min(100, Math.max(0, sayiOku(deger("hDon")) || 0))};
  islem(btn, async () => { await sistemKaydet({hedefler:d}); bildir("Hedefler kaydedildi"); ciz(); });
};

/* ================= ARAÇ VE YAKIT TAKİBİ ================= */
// Araçlar "ayarlar" tablosunda "araclar" anahtarıyla; kayıtlar arac_kayit tablosunda. Masraf istenirse kasaya da çıkış olarak işlenir.
const ARAC_TUR = {yakit:"Yakıt", bakim:"Bakım / onarım", muayene:"Muayene", sigorta:"Trafik sigortası", kasko:"Kasko", diger:"Diğer"};
const ARAC_IKON = {yakit:"kasa", bakim:"ayar", muayene:"tamam", sigorta:"bilgi", kasko:"bilgi", diger:"kalem"};
function aracListesi(){ const a = veri.ayarlar.find(x => x.anahtar === "araclar"); return a && Array.isArray(a.deger) ? a.deger : []; }
const aracBul = id => aracListesi().find(a => a.id === id);
const aracKayitlari = id => veri.arac_kayit.filter(k => k.aracId === id).sort((a, b) => (b.tarih + b.olusma) < (a.tarih + a.olusma) ? -1 : 1);
function aracDurumu(a){
  const l = aracKayitlari(a.id), km = Math.max(a.km || 0, ...l.map(k => k.km || 0));
  const son = t => l.find(k => k.tur === t);
  // Tüketim: iki "depo dolu" yakıt arasındaki litre / km
  const yakit = l.filter(k => k.tur === "yakit" && k.km > 0).sort((x, y) => x.km - y.km);
  let tuketim = null;
  const dolular = yakit.filter(k => k.dolu);
  if(dolular.length >= 2){ const ilk = dolular[0], sonD = dolular[dolular.length - 1]; const litre = yakit.filter(k => k.km > ilk.km && k.km <= sonD.km).reduce((t, k) => t + (k.litre || 0), 0); if(sonD.km > ilk.km && litre) tuketim = litre / (sonD.km - ilk.km) * 100; }
  const bakim = son("bakim");
  return {km, tuketim, muayene:(son("muayene") || {}).sonraki || a.muayene || "", sigorta:(son("sigorta") || {}).sonraki || a.sigorta || "", kasko:(son("kasko") || {}).sonraki || a.kasko || "",
    bakimTarih:(bakim || {}).sonraki || "", bakimKm:(bakim || {}).sonrakiKm || 0,
    ayMasraf:l.filter(k => k.tarih.slice(0, 7) === bugun().slice(0, 7)).reduce((t, k) => t + (k.tutar || 0), 0), yilMasraf:l.filter(k => k.tarih.slice(0, 4) === bugun().slice(0, 4)).reduce((t, k) => t + (k.tutar || 0), 0)};
}
function aracUyarilari(){
  const l = [], bg = bugun(), s30 = gunEkle(bg, 30);
  aracListesi().forEach(a => {
    const d = aracDurumu(a), tarih = (t, ad) => { if(t && t <= s30) l.push({seviye: t <= bg ? 0 : t <= gunEkle(bg, 7) ? 1 : 2, tarih:t, ikon:"bilgi", yer:"araclar", yazi:a.plaka + " · " + ad + (t < bg ? " süresi geçti" : t === bg ? " bugün bitiyor" : " " + tarihYaz(t, true) + " bitiyor"), alt:a.ad || ""}); };
    tarih(d.muayene, "muayene"); tarih(d.sigorta, "trafik sigortası"); tarih(d.kasko, "kasko"); tarih(d.bakimTarih, "bakım");
    if(d.bakimKm && d.km >= d.bakimKm - 500) l.push({seviye: d.km >= d.bakimKm ? 0 : 1, tarih:bg, ikon:"ayar", yer:"araclar", yazi:a.plaka + " · bakım kilometresi " + (d.km >= d.bakimKm ? "geçti" : "yaklaştı") + " (" + miktarYaz(d.km) + " / " + miktarYaz(d.bakimKm) + " km)", alt:a.ad || ""});
  });
  return l;
}
function ekranAraclar(){
  if(eksikTablo.arac_kayit) return {baslik:"Araçlar", geri:true, html:'<div class="uyari">Araç takibi için Supabase\'de <b>supabase-guncelleme-12.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>'};
  const al = aracListesi(), bg = bugun();
  const tarihYazi = (t, ad) => !t ? '' : '<span class="' + (t < bg ? 't-cikis' : t <= gunEkle(bg, 30) ? 'arac-yakin' : '') + '">' + ad + ' ' + tarihYaz(t, true) + '</span>';
  const html = '<div class="ust-arac"><div class="alt-bilgi" style="margin:0">Yakıt, bakım, muayene ve sigorta kayıtları; masraflar kasaya ve iş emrine bağlanabilir.</div>' +
      '<div class="buton-sira" style="margin:0"><button class="buton kucuk ikincil" data-is="aracDuzenle" data-arg="">' + ik("arti") + 'Araç ekle</button>' + (al.length ? '<button class="buton kucuk" data-is="aracKayit" data-arg="">' + ik("arti") + 'Kayıt gir</button>' : '') + '</div></div>' +
    (al.length ? al.map(a => {
      const d = aracDurumu(a), l = aracKayitlari(a.id).slice(0, 8);
      return '<div class="kart"><div class="kart-baslik" style="font-size:14px;color:var(--yazi)"><span><b style="font-size:17px">' + esc(a.plaka) + '</b> ' + esc(a.ad || "") + '</span><button class="baglanti" style="margin:0" data-is="aracDuzenle" data-arg="' + a.id + '">Düzenle</button></div>' +
        '<div class="izgara dort" style="margin:8px 0"><div><div class="alt-bilgi" style="margin:0">Kilometre</div><b>' + miktarYaz(d.km) + ' km</b></div><div><div class="alt-bilgi" style="margin:0">Ortalama tüketim</div><b>' + (d.tuketim ? sayiYaz(Math.round(d.tuketim * 10) / 10) + ' L/100 km' : '—') + '</b></div>' +
          '<div><div class="alt-bilgi" style="margin:0">Bu ay masraf</div><b>' + para(d.ayMasraf) + '</b></div><div><div class="alt-bilgi" style="margin:0">Bu yıl</div><b>' + para(d.yilMasraf) + '</b></div></div>' +
        '<div class="arac-tarihler">' + [tarihYazi(d.muayene, "Muayene"), tarihYazi(d.sigorta, "Sigorta"), tarihYazi(d.kasko, "Kasko"), tarihYazi(d.bakimTarih, "Bakım"), d.bakimKm ? '<span>Bakım ' + miktarYaz(d.bakimKm) + ' km</span>' : ''].filter(Boolean).join("") + '</div>' +
        '<div class="secenekler" style="margin:10px 0 4px">' + Object.entries(ARAC_TUR).map(([k, v]) => '<button class="secenek" data-is="aracKayit" data-arg="' + a.id + '|' + k + '">+ ' + v + '</button>').join("") + '</div>' +
        (l.length ? l.map(k => '<div class="satir"><span class="rozet r-gri">' + ik(ARAC_IKON[k.tur] || "kalem") + '</span><span class="orta"><div class="s1">' + esc(ARAC_TUR[k.tur] || k.tur) + (k.litre ? ' · ' + sayiYaz(k.litre) + ' L' : '') + '</div>' +
          '<div class="s2">' + esc([tarihYaz(k.tarih, true), k.km ? miktarYaz(k.km) + " km" : "", k.sonraki ? "sonraki " + tarihYaz(k.sonraki, true) : "", (bul("is_emirleri", k.isEmriId) || {}).no, k.aciklama].filter(Boolean).join(" · ")) + '</div></span>' +
          '<span class="tutar">' + (k.tutar ? para(k.tutar) : '') + '</span><button class="ikon-buton" style="margin-left:6px" data-is="aracKayitSil" data-arg="' + k.id + '" aria-label="Sil">' + ik("sil") + '</button></div>').join("") : '<div class="alt-bilgi">Henüz kayıt yok.</div>') + '</div>';
    }).join("") : '<div class="kart">' + bos("koli", "Henüz araç eklenmedi.") + '<button class="buton" data-is="aracDuzenle" data-arg="">' + ik("arti") + 'Araç ekle</button></div>');
  return {baslik:"Araçlar", geri: matchMedia("(max-width:899px)").matches, html};
}
EYLEM.aracDuzenle = (el, id) => {
  const a = aracBul(id) || {id:yeniId(), plaka:"", ad:"", km:0, muayene:"", sigorta:"", kasko:""};
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:460px"><p>' + (id ? "Aracı düzenle" : "Araç ekle") + '</p>' +
    '<div class="iki-alan"><div><label class="etiket" for="arP">Plaka</label><input id="arP" class="kutu" maxlength="15" value="' + esc(a.plaka) + '" placeholder="45 ABC 123"></div><div><label class="etiket" for="arA">Araç</label><input id="arA" class="kutu" maxlength="40" value="' + esc(a.ad) + '" placeholder="Ford Transit"></div></div>' +
    '<label class="etiket" for="arK">Şu anki kilometre</label><input id="arK" class="kutu" inputmode="numeric" value="' + (a.km || "") + '">' +
    '<div class="izgara uc" style="margin:0"><div>' + tarihAlani("arM", "Muayene bitişi", a.muayene, true) + '</div><div>' + tarihAlani("arS", "Sigorta bitişi", a.sigorta, true) + '</div><div>' + tarihAlani("arKa", "Kasko bitişi", a.kasko, true) + '</div></div>' +
    '<div class="hata" id="arHata"></div><div class="buton-sira">' + (id ? '<button class="buton tehlike" data-c="sil">' + ik("sil") + 'Sil</button>' : '') + '<button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c"); if(c === "hayir") return p.remove();
    if(c === "sil"){ if(veri.arac_kayit.some(k => k.aracId === a.id)) return uyar("Araç silinemez", "Bu araca ait kayıtlar var."); return onayla("Araç silinsin mi?", a.plaka, "Sil", () => islem(null, async () => { await Depo.kaydet("ayarlar", {anahtar:"araclar", deger:aracListesi().filter(x => x.id !== a.id)}); p.remove(); ciz(); })); }
    const y = Object.assign({}, a, {plaka:p.querySelector("#arP").value.trim().toLocaleUpperCase("tr"), ad:p.querySelector("#arA").value.trim(), km:Math.round(sayiOku(p.querySelector("#arK").value) || 0),
      muayene:p.querySelector("#arM").value, sigorta:p.querySelector("#arS").value, kasko:p.querySelector("#arKa").value});
    if(!y.plaka) return p.querySelector("#arHata").textContent = "Plakayı yazın.";
    const l = aracListesi().filter(x => x.id !== y.id).concat([y]);
    islem(b, async () => { await Depo.kaydet("ayarlar", {anahtar:"araclar", deger:l}); p.remove(); bildir("Araç kaydedildi"); ciz(); });
  });
  document.body.appendChild(p);
};
// arg: "aracId|tur"
EYLEM.aracKayit = (el, arg) => {
  const [aid0, tur0] = (arg || "").split("|"), al = aracListesi(), aid = aid0 || (al[0] || {}).id, tur = tur0 || "yakit";
  const isler = veri.is_emirleri.filter(ac).sort((a, b) => b.olusma - a.olusma), d = aracBul(aid) ? aracDurumu(aracBul(aid)) : {km:0};
  const p = document.createElement("div"); p.className = "perde";
  const govde = t => '<div class="iki-alan"><div>' + tarihAlani("akT", "Tarih", bugun()) + '</div><div><label class="etiket" for="akKm">Kilometre</label><input id="akKm" class="kutu" inputmode="numeric" placeholder="' + (d.km || "") + '"></div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="akTutar">Tutar</label><input id="akTutar" class="kutu tutar-kutu" inputmode="decimal" placeholder="0 ₺"></div>' +
      (t === "yakit" ? '<div><label class="etiket" for="akL">Litre</label><input id="akL" class="kutu" inputmode="decimal"></div>' : t === "bakim" ? '<div><label class="etiket" for="akSkm">Sonraki bakım km</label><input id="akSkm" class="kutu" inputmode="numeric"></div>' : '<div></div>') + '</div>' +
    (t === "yakit" ? '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="akDolu" checked> Depo dolduruldu <span class="ist" style="color:var(--soluk)">(tüketim hesabı için)</span></label>' : '') +
    (t === "muayene" || t === "sigorta" || t === "kasko" || t === "bakim" ? tarihAlani("akS", t === "bakim" ? "Sonraki bakım tarihi" : "Yeni bitiş tarihi", "", t === "bakim") : '') +
    '<label class="etiket" for="akIs">İş emri <span class="ist">(masraf bu işe yazılsın)</span></label><select id="akIs" class="kutu"><option value="">— Yok —</option>' + isler.map(ie => '<option value="' + ie.id + '">' + esc(ie.no + " · " + ie.baslik) + '</option>').join("") + '</select>' +
    '<label class="etiket" for="akNot">Not</label><input id="akNot" class="kutu" maxlength="200" placeholder="' + (t === "bakim" ? "Yağ, filtre, balata…" : "") + '">' +
    '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="akKasa" checked> Kasaya çıkış olarak işle</label>' +
    '<div id="akOdemeKutu"><label class="etiket">Ödeme şekli</label><div class="secenekler" id="akOdeme">' + ODEME.filter(x => x !== SENET).map((x, i) => '<button type="button" class="secenek' + (i === 0 ? ' secili' : '') + '" data-o="' + esc(x) + '">' + esc(x) + '</button>').join("") + '</div></div>';
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:92vh;overflow:auto"><p>Araç kaydı</p>' +
    '<div class="iki-alan"><div><label class="etiket" for="akA">Araç</label><select id="akA" class="kutu">' + al.map(a => '<option value="' + a.id + '"' + (a.id === aid ? ' selected' : '') + '>' + esc(a.plaka + (a.ad ? " · " + a.ad : "")) + '</option>').join("") + '</select></div>' +
    '<div><label class="etiket" for="akTur">Tür</label><select id="akTur" class="kutu">' + Object.entries(ARAC_TUR).map(([k, v]) => '<option value="' + k + '"' + (k === tur ? ' selected' : '') + '>' + v + '</option>').join("") + '</select></div></div>' +
    '<div id="akGovde">' + govde(tur) + '</div><div class="hata" id="akHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.querySelector("#akTur").addEventListener("change", e => { p.querySelector("#akGovde").innerHTML = govde(e.target.value); });
  p.addEventListener("change", e => { if(e.target.id === "akKasa") p.querySelector("#akOdemeKutu").style.display = e.target.checked ? "" : "none"; });
  p.addEventListener("click", e => {
    const oo = e.target.closest("[data-o]"); if(oo){ p.querySelectorAll("#akOdeme .secenek").forEach(x => x.classList.toggle("secili", x === oo)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const v = id => { const x = p.querySelector("#" + id); return x ? x.value.trim() : ""; }, t = v("akTur"), a = aracBul(v("akA"));
    const k = {id:yeniId(), aracId:a.id, tur:t, tarih:v("akT") || bugun(), km:Math.round(sayiOku(v("akKm")) || 0), litre:yuvarla(sayiOku(v("akL")) || 0), tutar:yuvarla(sayiOku(v("akTutar")) || 0),
      dolu:!!(p.querySelector("#akDolu") && p.querySelector("#akDolu").checked), sonraki:v("akS"), sonrakiKm:Math.round(sayiOku(v("akSkm")) || 0), aciklama:v("akNot"), isEmriId:v("akIs") || null, hareketId:null, olusma:Date.now()};
    const hata = m => { p.querySelector("#akHata").textContent = m; };
    if(t === "yakit" && !(k.tutar > 0 || k.litre > 0)) return hata("Tutar veya litre yazın.");
    if((t === "muayene" || t === "sigorta" || t === "kasko") && !k.sonraki) return hata("Yeni bitiş tarihini seçin.");
    const kasaya = p.querySelector("#akKasa").checked && k.tutar > 0;
    islem(b, async () => {
      if(kasaya){
        const kat = kategoriler("cikis").find(x => /nakliye/i.test(x)) || "Nakliye ve Montaj";
        const h = {id:yeniId(), tur:"cikis", tutar:k.tutar, kategori: t === "yakit" ? kat : t === "bakim" ? (kategoriler("cikis").find(x => /bakım/i.test(x)) || kat) : kat, odeme:p.querySelector("#akOdeme .secili").getAttribute("data-o"),
          musteriId:null, isEmriId:k.isEmriId, faturaId:null, aciklama:a.plaka + " · " + ARAC_TUR[t] + (k.litre ? " " + sayiYaz(k.litre) + " L" : "") + (k.aciklama ? " · " + k.aciklama : ""), tarih:k.tarih, olusma:Date.now(), ortak:benimOrtak(), hedef:""};
        await Depo.kaydet("hareketler", h); k.hareketId = h.id;
      }
      await Depo.kaydet("arac_kayit", k);
      if(k.km > (a.km || 0)) await Depo.kaydet("ayarlar", {anahtar:"araclar", deger:aracListesi().map(x => x.id === a.id ? Object.assign({}, x, {km:k.km}) : x)});
      p.remove(); bildir(ARAC_TUR[t] + " kaydedildi"); ciz();
    });
  });
  document.body.appendChild(p);
};
EYLEM.aracKayitSil = (el, id) => {
  const k = bul("arac_kayit", id); if(!k) return;
  onayla("Kayıt silinsin mi?", k.hareketId ? "Kasadaki çıkış kaydı da silinir." : "", "Sil", () => islem(null, async () => {
    await copGrubuyla("Araç kaydı: " + kayitBasligi("arac_kayit", k), async () => { const hid = k.hareketId; await Depo.sil("arac_kayit", id); if(hid && bul("hareketler", hid)) await Depo.sil("hareketler", hid); });
    ciz();
  }));
};

/* ================= QR KODLU İŞ ETİKETİ ================= */
// QR, uygulamanın "#qr/<iş emri id>" adresini taşır: telefon kamerasıyla okutunca iş açılır, usta sıradaki aşamayı işaretler.
const qrAdres = isId => location.origin + location.pathname + "#qr/" + isId;
function qrSvg(Q, metin, boy){
  const q = Q(0, "M"); q.addData(metin); q.make();
  return q.createSvgTag({cellSize:2, margin:0, scalable:true}).replace("<svg ", '<svg style="width:' + boy + ';height:' + boy + '" ');
}
let etiketForm = null;
function ekranEtiket(isId){
  const ie = bul("is_emirleri", isId);
  if(!ie) return {baslik:"Etiket", geri:true, html:'<div class="kart">' + bos("is", "İş emri bulunamadı.") + '</div>'};
  if(!etiketForm || etiketForm.isId !== isId) etiketForm = {isId, tur:"paket", paket:Math.max(1, ie.kalemler.reduce((t, k) => t + (Number(k.adet) || 1), 0)), boy:"orta"};
  const f = etiketForm, parcalar = ((ie.kesim && ie.kesim.parcalar) || []).flatMap((p, i) => Array.from({length:p.adet || 1}, (_, j) => ({p, no:i + 1, sira:j + 1})));
  const etiketler = f.tur === "parca" ? parcalar.map(x => ({ust:"#" + x.no + " " + x.p.ad, alt:x.p.en + " × " + x.p.boy + " mm" + (x.p.adet > 1 ? " (" + x.sira + "/" + x.p.adet + ")" : ""), ek:plakaBul(x.p.malzemeId).ad}))
    : Array.from({length:Number(f.paket) || 1}, (_, i) => ({ust:"PAKET " + (i + 1) + " / " + f.paket, alt:ie.baslik, ek:cariAdi(ie.musteriId) + (ie.adres ? " · " + ie.adres.split("\n")[0] : "")}));
  const html = '<div class="kart yazdirma">' + kartBaslik(esc(ie.no + " · " + ie.baslik)) +
      '<label class="etiket">Etiket</label><div class="secenekler">' + [["paket", "Paket / koli etiketi"], ["parca", "Parça etiketi (kesim listesinden, " + parcalar.length + ")"]].map(([k, v]) => '<button class="secenek' + (k === f.tur ? ' secili' : '') + '" data-is="etiketAyar" data-arg="tur|' + k + '">' + v + '</button>').join("") + '</div>' +
      (f.tur === "paket" ? '<label class="etiket" for="etSay">Kaç paket?</label><input id="etSay" class="kutu" inputmode="numeric" style="max-width:120px" value="' + f.paket + '">' : '') +
      '<label class="etiket">Boyut</label><div class="secenekler">' + [["kucuk", "Küçük (A4'te 24)"], ["orta", "Orta (A4'te 12)"], ["buyuk", "Büyük (A4'te 4)"]].map(([k, v]) => '<button class="secenek' + (k === f.boy ? ' secili' : '') + '" data-is="etiketAyar" data-arg="boy|' + k + '">' + v + '</button>').join("") + '</div>' +
      '<div class="alt-bilgi">QR\'ı telefon kamerasıyla okutunca bu iş açılır ve usta sıradaki aşamayı tek dokunuşla işaretler. Yapışkanlı A4 etiket kağıdına yazdırabilirsiniz.</div>' +
      '<button class="buton" onclick="window.print()">' + ik("yazdir") + 'Yazdır (' + etiketler.length + ' etiket)</button></div>' +
    (f.tur === "parca" && !parcalar.length ? '<div class="kart yazdirma">' + bos("cetvel", "Kesim listesi boş. Önce iş emrinde kesim listesini oluşturun.") + '<button class="buton ikincil" data-git="kesim/' + ie.id + '">Kesim listesi</button></div>' : '') +
    '<div class="etiketler boy-' + f.boy + '" id="etiketler">' + etiketler.map(e => '<div class="etiket-kutu"><div class="qr" data-qr="1"></div><div class="et-yazi"><b>' + esc(ie.no) + '</b><div class="et-ust">' + esc(e.ust) + '</div>' +
      '<div class="et-alt">' + esc(e.alt) + '</div><div class="et-ek">' + esc(e.ek || "") + '</div><div class="et-firma">' + esc(FIRMA) + '</div></div></div>').join("") + '</div>';
  return {baslik:"Etiket · " + ie.no, geri:true, baskiLogo:false, html, sonra(){
    const s = document.getElementById("etSay");
    if(s) s.addEventListener("change", () => { f.paket = Math.min(200, Math.max(1, Math.round(sayiOku(s.value) || 1))); ciz(); });
    kutuphane("qr").then(Q => { const svg = qrSvg(Q, qrAdres(ie.id), "100%"); document.querySelectorAll("#etiketler [data-qr]").forEach(e => { e.innerHTML = svg; }); })
      .catch(err => document.querySelectorAll("#etiketler [data-qr]").forEach(e => { e.textContent = "QR yüklenemedi"; }));
  }};
}
EYLEM.etiketAyar = (el, arg) => { const [k, v] = arg.split("|"); etiketForm[k] = v; ciz(); };
// QR okutulunca açılan sade ekran
function ekranQr(isId){
  const ie = bul("is_emirleri", isId);
  if(!ie) return {baslik:"İş", geri:true, html:'<div class="kart">' + bos("is", "Bu etiketteki iş emri bulunamadı.") + '</div>'};
  const as = ie.asamalar, sira = as.findIndex(a => !a.tamam), yap = as.filter(a => a.tamam).length, m = bul("musteriler", ie.musteriId) || {};
  const html = '<div class="usta-kart"><div class="usta-baslik">' + esc(ie.baslik) + ' <span>' + esc(ie.no) + '</span></div><div class="usta-alt">' + esc(m.ad || "") + ' · ' + esc(ie.durum) +
      (ie.teslimTarihi ? ' · teslim ' + tarihYaz(ie.teslimTarihi, true) : '') + '</div>' +
      (as.length ? '<div class="ilerleme" style="margin-top:10px"><i style="width:' + Math.round(yap / as.length * 100) + '%"></i></div><div class="usta-alt">' + yap + '/' + as.length + ' aşama</div>' : '') +
      '<div class="usta-dugmeler">' + (sira >= 0 ? '<button class="buton" data-is="asamaDegis" data-arg="' + ie.id + '|' + sira + '">' + ik("tamam") + esc(as[sira].ad) + ' bitti</button>' : '<div class="alt-bilgi">Tüm aşamalar tamam.</div>') +
      '<button class="buton ikincil" data-is="sesliNot" data-arg="' + ie.id + '">' + ik("mikrofon") + 'Sesli not</button><button class="buton ikincil" data-git="is/' + ie.id + '">' + ik("is") + 'İş emrini aç</button></div></div>' +
    (as.length ? '<div class="kart">' + as.map((a, i) => '<button class="asama' + (a.tamam ? " tamam" : "") + '" data-is="asamaDegis" data-arg="' + ie.id + '|' + i + '"><span class="kutucuk">' + (a.tamam ? ik("tamam") : "") + '</span><span class="ad">' + esc(a.ad) + '</span></button>').join("") + '</div>' : '');
  return {baslik:ie.no, geri:true, html};
}

/* ================= KESİM LİSTESİ: EXCEL / CSV ================= */
function kesimSatirlari(ie){
  const f = kesimForm && kesimForm.isId === ie.id ? kesimForm : Object.assign({parcalar:[]}, ie.kesim);
  return (f.parcalar || []).filter(p => p.en > 0 && p.boy > 0 && p.adet > 0).map((p, i) => {
    const m = plakaBul(p.malzemeId), kal = (/(\d+(?:[.,]\d+)?)\s*mm/i.exec(m.ad || "") || [0, ""])[1];
    const uzunEn = p.en >= p.boy, bU = p.bantU || 0, bK = p.bantK || 0;
    // Kenar bantları: boy kenarları (uzun) / en kenarları (kısa) — kesim merkezlerinin "B1 B2 E1 E2" sütunları
    const boyKenar = uzunEn ? bK : bU, enKenar = uzunEn ? bU : bK;
    return {no:i + 1, ad:p.ad, boy:p.boy, en:p.en, adet:p.adet, malzeme:m.ad, kal:String(kal).replace(",", "."), damar:p.damar ? 1 : 0, b1:boyKenar >= 1 ? 1 : 0, b2:boyKenar >= 2 ? 1 : 0, e1:enKenar >= 1 ? 1 : 0, e2:enKenar >= 2 ? 1 : 0};
  });
}
EYLEM.kesimCsv = () => {
  kesimOku(); const ie = bul("is_emirleri", kesimForm.isId), l = kesimSatirlari(ie);
  if(!l.length) return uyar("Parça listesi boş", "");
  dosyaIndir(csvYap([["No", "Parça", "Boy (mm)", "En (mm)", "Adet", "Malzeme", "Kalınlık (mm)", "Damar", "Bant Boy1", "Bant Boy2", "Bant En1", "Bant En2", "İş emri"]]
    .concat(l.map(x => [x.no, x.ad, x.boy, x.en, x.adet, x.malzeme, x.kal, x.damar, x.b1, x.b2, x.e1, x.e2, ie.no]))), "kesim-" + ie.no + ".csv", "text/csv;charset=utf-8");
};
EYLEM.kesimExcel = btn => islem(btn, async () => {
  kesimOku(); const ie = bul("is_emirleri", kesimForm.isId), l = kesimSatirlari(ie), s = Object.values(kesimHesapla(kesimForm.parcalar, kesimForm));
  if(!l.length) return uyar("Parça listesi boş", "");
  await excelIndir([
    {ad:"Parçalar", genislik:[5, 28, 10, 10, 7, 26, 10, 7, 9, 9, 9, 9], satirlar:[["No", "Parça", "Boy (mm)", "En (mm)", "Adet", "Malzeme", "Kalınlık (mm)", "Damar", "Bant Boy1", "Bant Boy2", "Bant En1", "Bant En2"]]
      .concat(l.map(x => [x.no, x.ad, x.boy, x.en, x.adet, x.malzeme, x.kal ? Number(x.kal) : "", x.damar, x.b1, x.b2, x.e1, x.e2]))},
    {ad:"Plaka özeti", genislik:[30, 8, 8, 10, 10, 12], satirlar:[["Malzeme", "Plaka", "Parça", "Doluluk %", "Fire m²", "Bant (m)"]].concat(s.filter(x => x.plakalar.length).map(x => [x.m.ad, x.plakalar.length, x.parcaSayisi, Math.round(x.kullanim), Math.round(x.fireM2 * 100) / 100, Math.round(x.bant * 10) / 10]))},
    {ad:"Bilgi", genislik:[18, 40], satirlar:[["İş emri", ie.no], ["İş", ie.baslik], ["Müşteri", cariAdi(ie.musteriId)], ["Testere (mm)", kesimForm.testere], ["Kenar payı (mm)", kesimForm.pay], ["Tarih", bugun()], [], ["Bant sütunları: 1 = o kenar bantlı. Boy1/Boy2 uzun kenarlar, En1/En2 kısa kenarlar."]]}
  ], "kesim-" + ie.no + ".xlsx");
});
