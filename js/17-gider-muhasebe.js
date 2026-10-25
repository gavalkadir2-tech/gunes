"use strict";
// Güneş Mobilya — sabit giderler, ay sonu ortak hesabı, muhasebeci (paket + salt okunur yetki), ana sayfa düzeni
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.

/* ================= SABİT GİDERLER ================= */
// Kira, elektrik, SGK gibi her ay / dönemde tekrarlanan ödemeler. "ayarlar" tablosunda "sabitGiderler" anahtarıyla.
// {id, ad, tutar, kategori, odeme, gun (ayın günü), periyot (ay: 1 / 2 / 3 / 6 / 12), basAy "YYYY-MM", aktif, islenen:{"YYYY-MM": hareketId | "atla"}}
const PERIYOT = {1:"Her ay", 2:"2 ayda bir", 3:"3 ayda bir", 6:"6 ayda bir", 12:"Yılda bir"};
const sabitGiderler = () => { const a = veri.ayarlar.find(x => x.anahtar === "sabitGiderler"); return a && Array.isArray(a.deger) ? a.deger : []; };
const sabitKaydet = l => Depo.kaydet("ayarlar", {anahtar:"sabitGiderler", deger:l});
const ayNo = ay => { const p = ay.split("-"); return Number(p[0]) * 12 + Number(p[1]) - 1; };
const ayYaz = ay => { const p = ay.split("-"); return AYLAR[Number(p[1]) - 1] + " " + p[0]; };
const ayKaydir = (ay, n) => { const t = ayNo(ay) + n; return Math.floor(t / 12) + "-" + ("0" + (t % 12 + 1)).slice(-2); };
const sabitVadesi = (g, ay) => ay + "-" + ("0" + Math.min(Number(g.gun) || 1, ayGunSayisi(ay))).slice(-2);
const sabitBuAyda = (g, ay) => g.aktif !== false && ay >= (g.basAy || ay) && (ayNo(ay) - ayNo(g.basAy || ay)) % (Number(g.periyot) || 1) === 0;
// Ödenmemiş dönemler (son 3 ay + gelecek ay, vadesi yaklaşan)
function bekleyenSabitler(ileriGun){
  const bg = bugun(), sinir = gunEkle(bg, ileriGun == null ? sistem().vadeGun : ileriGun), l = [];
  sabitGiderler().forEach(g => { for(let i = -3; i <= 1; i++){ const ay = ayKaydir(bg.slice(0, 7), i), v = sabitVadesi(g, ay);
    if(sabitBuAyda(g, ay) && !(g.islenen || {})[ay] && v <= sinir) l.push({g, ay, vade:v}); } });
  return l.sort((a, b) => a.vade < b.vade ? -1 : 1);
}
function sabitHatirlatmalari(){
  if(!yetki.yonetici || yetki.salt) return [];
  const bg = bugun();
  return bekleyenSabitler().map(x => ({seviye:x.vade <= bg ? 0 : 1, tarih:x.vade, ikon:"yukari", yer:"sabitgiderler",
    yazi:x.g.ad + " " + (x.vade < bg ? "ödemesi gecikti" : x.vade === bg ? "bugün ödenecek" : "ödemesi yaklaşıyor (" + tarihYaz(x.vade, true) + ")") + ": " + para(x.g.tutar), alt:ayYaz(x.ay) + " · " + x.g.kategori}));
}
function ekranSabitGiderler(){
  const l = sabitGiderler(), ay = bugun().slice(0, 7), bek = bekleyenSabitler(31), vadeli = bekleyenSabitler();
  const aylik = l.filter(g => g.aktif !== false).reduce((t, g) => t + (Number(g.tutar) || 0) / (Number(g.periyot) || 1), 0);
  const durum = g => { const v = sabitVadesi(g, ay), is_ = (g.islenen || {})[ay];
    if(g.aktif === false) return '<span class="etiket-rozet d-gri">durduruldu</span>';
    if(!sabitBuAyda(g, ay)) return '<span class="etiket-rozet d-gri">bu ay yok</span>';
    return is_ === "atla" ? '<span class="etiket-rozet d-gri">bu ay atlandı</span>' : is_ ? '<span class="etiket-rozet d-yesil">bu ay ödendi</span>' :
      '<span class="etiket-rozet ' + (v < bugun() ? 'd-kirmizi' : 'd-sari') + '">' + tarihYaz(v, true) + '</span>'; };
  const html = '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Aylık sabit gider (ortalama)</div><div class="deger t-cikis">' + para(aylik) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Ödenmeyi bekleyen</div><div class="deger">' + para(bek.reduce((t, x) => t + (Number(x.g.tutar) || 0), 0)) + '</div><div class="alt-bilgi">' + bek.length + ' ödeme (30 gün içinde)</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Kayıtlı</div><div class="deger">' + l.length + '</div></div></div>' +
    '<div class="ust-arac"><div class="alt-bilgi" style="margin:0;flex:1">Vadesi yaklaşınca Yapılacaklar\'da hatırlatılır; “Kasaya işle” ile tek tuşla gider olarak kaydedilir. Tutarı değişenler (elektrik, su) işlerken düzeltilir.</div>' +
      '<button class="buton kucuk" data-is="sabitDuzenle" data-arg="">' + ik("arti") + 'Sabit gider ekle</button></div>' +
    (bek.length ? bolum("Ödenecekler") + '<div class="kart liste-kart">' + bek.map(x => '<div class="satir"><span class="rozet ' + (x.vade <= bugun() ? 'r-cikis' : 'r-ana') + '">' + ik("yukari") + '</span>' +
      '<span class="orta"><div class="s1">' + esc(x.g.ad) + ' · ' + para(x.g.tutar) + '</div><div class="s2">' + esc(ayYaz(x.ay) + " · vade " + tarihYaz(x.vade, true) + " · " + x.g.kategori) + '</div></span>' +
      '<button class="buton kucuk" style="margin:0;width:auto" data-is="sabitIsle" data-arg="' + x.g.id + '|' + x.ay + '">Kasaya işle</button></div>').join("") +
      (vadeli.length > 1 ? '<div style="padding:10px 0 4px"><button class="buton ikincil kucuk" style="margin:0" data-is="sabitHepsi">' + ik("tamam") + 'Vadesi gelenleri tutarıyla kasaya işle (' + vadeli.length + ')</button></div>' : '') + '</div>' : '') +
    bolum("Tanımlı sabit giderler") + '<div class="kart liste-kart">' + (l.length ? l.map(g => '<button class="satir" data-is="sabitDuzenle" data-arg="' + g.id + '"><span class="rozet r-gri">' + ik("takvim") + '</span>' +
      '<span class="orta"><div class="s1">' + esc(g.ad) + '</div><div class="s2">' + esc([PERIYOT[g.periyot] || "Her ay", "ayın " + g.gun + "'i", g.kategori, g.odeme, g.ortak ? ortakAdi(g.ortak) + " öder" : ""].filter(Boolean).join(" · ")) + '</div></span>' +
      '<span class="sag"><div class="tutar">' + para(g.tutar) + '</div>' + durum(g) + '</span></button>').join("") : bos("takvim", "Kira, elektrik, internet, SGK gibi düzenli ödemelerinizi ekleyin.")) + '</div>';
  return {baslik:"Sabit giderler", geri:true, html};
}
EYLEM.sabitDuzenle = (el, id) => {
  const g0 = sabitGiderler().find(x => x.id === id), g = Object.assign({id:yeniId(), ad:"", tutar:0, kategori:"Kira", odeme:"Havale", gun:1, periyot:1, basAy:bugun().slice(0, 7), aktif:true, ortak:"", islenen:{}}, g0 || {});
  const kat = kategoriler("cikis"), sec = (id_, l, v) => '<select id="' + id_ + '" class="kutu">' + l.map(([a, b]) => '<option value="' + esc(a) + '"' + (String(a) === String(v) ? ' selected' : '') + '>' + esc(b) + '</option>').join("") + '</select>';
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:92vh;overflow:auto"><p>' + (g0 ? "Sabit gideri düzenle" : "Sabit gider ekle") + '</p>' +
    '<label class="etiket" for="sgAd">Ad</label><input id="sgAd" class="kutu" maxlength="80" value="' + esc(g.ad) + '" placeholder="Örn: Atölye kirası">' +
    '<div class="iki-alan"><div><label class="etiket" for="sgTutar">Tutar</label><input id="sgTutar" class="kutu" inputmode="decimal" value="' + sayiYaz(g.tutar) + '"></div>' +
      '<div><label class="etiket" for="sgKat">Kategori</label>' + sec("sgKat", kat.concat(kat.indexOf(g.kategori) < 0 ? [g.kategori] : []).map(k => [k, k]), g.kategori) + '</div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="sgGun">Ayın kaçında</label><input id="sgGun" class="kutu" inputmode="numeric" value="' + g.gun + '"></div>' +
      '<div><label class="etiket" for="sgPer">Sıklık</label>' + sec("sgPer", Object.entries(PERIYOT), g.periyot) + '</div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="sgBas">İlk ödeme ayı</label><input id="sgBas" type="month" class="kutu" value="' + esc(g.basAy) + '"></div>' +
      '<div><label class="etiket" for="sgOdeme">Ödeme şekli</label>' + sec("sgOdeme", ODEME.filter(x => x !== SENET).map(x => [x, x]), g.odeme) + '</div></div>' +
    (ortaklar().length ? '<label class="etiket" for="sgOrtak">Kim öder</label>' + sec("sgOrtak", [["", "Kasa"]].concat(ortaklar().map(o => [o.id, o.ad])), g.ortak) : '') +
    (g0 ? '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="sgAktif"' + (g.aktif !== false ? ' checked' : '') + '> Devam ediyor <span class="ist" style="color:var(--soluk)">(kaldırınca hatırlatma durur)</span></label>' : '') +
    '<div class="hata" id="sgHata"></div><div class="buton-sira">' + (g0 ? '<button class="buton tehlike" data-c="sil">Sil</button>' : '') + '<button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c");
    if(c === "hayir") return p.remove();
    if(c === "sil") return onayla("Silinsin mi?", "Daha önce kasaya işlenen ödemeler silinmez.", "Sil", () => islem(null, async () => { await sabitKaydet(sabitGiderler().filter(x => x.id !== g.id)); p.remove(); bildir("Silindi"); ciz(); }));
    const v = id_ => p.querySelector("#" + id_) ? p.querySelector("#" + id_).value.trim() : "";
    const y = Object.assign({}, g, {ad:v("sgAd"), tutar:yuvarla(sayiOku(v("sgTutar")) || 0), kategori:v("sgKat"), gun:Math.round(sayiOku(v("sgGun")) || 0), periyot:Number(v("sgPer")) || 1,
      basAy:v("sgBas") || bugun().slice(0, 7), odeme:v("sgOdeme"), ortak:v("sgOrtak"), aktif:p.querySelector("#sgAktif") ? p.querySelector("#sgAktif").checked : true});
    const h = t => { p.querySelector("#sgHata").textContent = t; };
    if(!y.ad) return h("Adını yazın."); if(!(y.tutar > 0)) return h("Tutarı yazın."); if(!(y.gun >= 1 && y.gun <= 31)) return h("Gün 1–31 arası olmalı.");
    const l = sabitGiderler().slice(), i = l.findIndex(x => x.id === y.id); if(i >= 0) l[i] = y; else l.push(y);
    islem(b, async () => { await sabitKaydet(l); p.remove(); bildir("Kaydedildi"); ciz(); });
  });
  document.body.appendChild(p);
};
async function sabitKasayaIsle(g, ay, tutar, odeme, tarih){
  const h = {id:yeniId(), tur:"cikis", tutar:yuvarla(tutar), kategori:g.kategori, odeme:odeme || g.odeme || "Nakit", musteriId:null, isEmriId:null, faturaId:null,
    aciklama:g.ad + " (" + ayYaz(ay) + ")", tarih:tarih || bugun(), olusma:Date.now(), ortak:g.ortak || "", hedef:""};
  await Depo.kaydet("hareketler", h);
  return h.id;
}
async function sabitIsaretle(isaret){   // isaret: [{id, ay, deger}]
  const l = sabitGiderler().map(x => { const s = isaret.filter(y => y.id === x.id); if(!s.length) return x;
    const is_ = Object.assign({}, x.islenen || {}); s.forEach(y => { is_[y.ay] = y.deger; });
    Object.keys(is_).sort().slice(0, -24).forEach(k => delete is_[k]);   // son 2 yıl tutulur
    return Object.assign({}, x, {islenen:is_}); });
  await sabitKaydet(l);
}
EYLEM.sabitIsle = (el, arg) => {
  const [id, ay] = arg.split("|"), g = sabitGiderler().find(x => x.id === id); if(!g) return;
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:420px"><p>' + esc(g.ad) + ' · ' + ayYaz(ay) + '</p><div class="alt-bilgi">Kasaya “' + esc(g.kategori) + '” gideri olarak işlenir.</div>' +
    '<label class="etiket" for="siTutar">Tutar</label><input id="siTutar" class="kutu tutar-kutu" inputmode="decimal" value="' + sayiYaz(g.tutar) + '">' +
    '<div class="iki-alan"><div>' + tarihAlani("siTarih", "Ödeme tarihi", bugun()) + '</div><div><label class="etiket" for="siOdeme">Ödeme şekli</label><select id="siOdeme" class="kutu">' +
      ODEME.filter(x => x !== SENET).map(x => '<option' + (x === g.odeme ? ' selected' : '') + '>' + esc(x) + '</option>').join("") + '</select></div></div>' +
    '<div class="hata" id="siHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="atla">Bu ay ödenmeyecek</button><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="isle">' + ik("tamam") + 'Kasaya işle</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c"); if(c === "hayir") return p.remove();
    if(c === "atla") return islem(b, async () => { await sabitIsaretle([{id, ay, deger:"atla"}]); p.remove(); bildir(ayYaz(ay) + " atlandı"); ciz(); });
    const t = sayiOku(p.querySelector("#siTutar").value); if(!(t > 0)) return p.querySelector("#siHata").textContent = "Tutarı yazın.";
    islem(b, async () => { const hid = await sabitKasayaIsle(g, ay, t, p.querySelector("#siOdeme").value, p.querySelector("#siTarih").value);
      await sabitIsaretle([{id, ay, deger:hid}]); p.remove(); bildir("Kasaya işlendi"); ciz(); });
  });
  document.body.appendChild(p);
};
EYLEM.sabitHepsi = btn => {
  const l = bekleyenSabitler();
  onayla(l.length + " ödeme kasaya işlensin mi?", l.map(x => x.g.ad + " " + para(x.g.tutar)).join(", ") + " · bugünün tarihiyle, kayıtlı tutarlarla.", "Kasaya işle", () => islem(null, async () => {
    const is_ = []; for(const x of l) is_.push({id:x.g.id, ay:x.ay, deger:await sabitKasayaIsle(x.g, x.ay, x.g.tutar)});
    await sabitIsaretle(is_); bildir(l.length + " ödeme işlendi"); ciz(); }), false);
};

/* ================= AY SONU ORTAK HESABI ================= */
// Kasa esaslı kâr, ortakların payı, şahsi çekiş / sermaye, elindeki para; yıl başından birikmiş fark. Yazdırılabilir.
function ortakHesabi(ay){
  const yil = ay.slice(0, 4), son = ay + "-" + ayGunSayisi(ay), toplamPay = ortaklar().reduce((t, o) => t + (Number(o.pay) || 0), 0) || 100;
  const donem = f => veri.hareketler.filter(h => (h.tur === "giris" || h.tur === "cikis") && f(h.tarih));
  const ozet = l => { const gelir = {}, gider = {};
    l.forEach(h => { if(ortakKategorisi(h.kategori)) return; const g = h.tur === "giris" ? gelir : gider; g[h.kategori] = yuvarla((g[h.kategori] || 0) + h.tutar); });
    const tg = yuvarla(Object.values(gelir).reduce((t, v) => t + v, 0)), tc = yuvarla(Object.values(gider).reduce((t, v) => t + v, 0));
    return {gelir, gider, tg, tc, kar:yuvarla(tg - tc)}; };
  const buAy = donem(t => t.slice(0, 7) === ay), yilda = donem(t => t.slice(0, 4) === yil && t <= son), a = ozet(buAy), y = ozet(yilda), kk = kisiKasalari(son);
  const kisi = ortaklar().map(o => {
    const cek = l => l.filter(h => h.tur === "cikis" && h.kategori === ORTAK_CEKIS && h.hedef === o.id), ser = l => l.filter(h => h.tur === "giris" && h.kategori === ORTAK_SERMAYE && h.hedef === o.id);
    const oran = (Number(o.pay) || 0) / toplamPay, pay = yuvarla(a.kar * oran), yPay = yuvarla(y.kar * oran);
    const cekti = yuvarla(cek(buAy).reduce((t, h) => t + h.tutar, 0)), yCekti = yuvarla(cek(yilda).reduce((t, h) => t + h.tutar, 0));
    return {o, oran, pay, cekti, fark:yuvarla(pay - cekti), sermaye:yuvarla(ser(buAy).reduce((t, h) => t + h.tutar, 0)), yPay, yCekti, yFark:yuvarla(yPay - yCekti),
      elinde:(kk[o.id] || {toplam:0}).toplam, cekisler:cek(buAy)};
  });
  return {ay, a, y, kisi, kasa:(kk[""] || {toplam:0}).toplam};
}
function ekranOrtakHesap(){
  if(!ortaklar().length) return {baslik:"Ortak hesabı", geri:true, html:'<div class="kart">' + bos("kisiler", "Ayarlar → Ortaklar bölümünde ortakları tanımlayın.") + '</div>'};
  const r = ortakHesabi(ayGoster), fr = firma(), sat = (o, k) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([a, v]) => '<tr><td>' + esc(a) + '</td><td style="text-align:right">' + para(v) + '</td></tr>').join("") ||
    '<tr><td colspan="2" class="t-soluk">Kayıt yok</td></tr>';
  const isaret = v => '<span class="' + (v >= 0 ? 't-giris' : 't-cikis') + '">' + (v >= 0 ? "+" : "−") + para(Math.abs(v)) + '</span>';
  const html = '<div class="ust-arac yazdirma">' + aySecici() + '<div class="buton-sira" style="margin:0"><button class="buton kucuk" onclick="window.print()">' + ik("yazdir") + 'Yazdır / PDF</button></div></div>' +
    '<div class="kart"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="kart-baslik" style="margin:0">' + esc(fr.ad || FIRMA) + '</div><h2 style="margin:4px 0 0;font-size:20px">Ortak hesabı · ' + ayYaz(ayGoster) + '</h2></div>' +
      '<div class="alt-bilgi" style="text-align:right">Hazırlanma: ' + tarihYaz(bugun()) + '<br>Kasa esaslı (giren − çıkan)</div></div></div>' +
    '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Bu ay giren (gelir)</div><div class="deger t-giris">' + para(r.a.tg) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Bu ay çıkan (gider)</div><div class="deger t-cikis">' + para(r.a.tc) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Net kâr</div><div class="deger">' + isaret(r.a.kar) + '</div><div class="alt-bilgi">Yıl başından beri ' + para(r.y.kar) + '</div></div></div>' +
    '<div class="kart" style="overflow:auto">' + kartBaslik("Ortaklar · " + ayYaz(ayGoster)) + '<table class="kesim-ozet"><thead><tr><th>Ortak</th><th>Pay</th><th>Kâr payı</th><th>Şahsi çektiği</th><th>Sermaye koyduğu</th><th>Bu ay fark</th><th>Yıl içi birikmiş fark</th><th>Ay sonu elindeki para</th></tr></thead><tbody>' +
      r.kisi.map(x => '<tr><td><b>' + esc(x.o.ad) + '</b></td><td>%' + sayiYaz(x.o.pay) + '</td><td>' + para(x.pay) + '</td><td class="t-cikis">' + para(x.cekti) + '</td><td>' + para(x.sermaye) + '</td><td>' + isaret(x.fark) + '</td><td>' + isaret(x.yFark) + '</td><td>' + para(x.elinde) + '</td></tr>').join("") +
      '<tr><td><b>Kasa</b></td><td colspan="6"></td><td>' + para(r.kasa) + '</td></tr></tbody></table>' +
      '<div class="alt-bilgi">Fark artıysa ortak payından daha çekebilir, eksiyse payından fazla çekmiş. Sermaye kâr payına eklenmez, ayrıca gösterilir.</div></div>' +
    '<div class="iki-sutun"><div class="kart">' + kartBaslik("Gelirler") + '<table class="kesim-ozet"><tbody>' + sat(r.a.gelir) + '<tr><td><b>Toplam</b></td><td style="text-align:right"><b>' + para(r.a.tg) + '</b></td></tr></tbody></table></div>' +
      '<div class="kart">' + kartBaslik("Giderler") + '<table class="kesim-ozet"><tbody>' + sat(r.a.gider) + '<tr><td><b>Toplam</b></td><td style="text-align:right"><b>' + para(r.a.tc) + '</b></td></tr></tbody></table></div></div>' +
    (r.kisi.some(x => x.cekisler.length) ? '<div class="kart">' + kartBaslik("Şahsi çekişler") + '<table class="kesim-ozet"><thead><tr><th>Tarih</th><th>Ortak</th><th>Açıklama</th><th style="text-align:right">Tutar</th></tr></thead><tbody>' +
      r.kisi.flatMap(x => x.cekisler.map(h => '<tr><td>' + tarihYaz(h.tarih, true) + '</td><td>' + esc(x.o.ad) + '</td><td>' + esc(h.aciklama || "") + '</td><td style="text-align:right">' + para(h.tutar) + '</td></tr>')).join("") + '</tbody></table></div>' : '') +
    '<div class="kart imza-alani"><div style="display:flex;justify-content:space-around;gap:20px;margin-top:20px;text-align:center">' + r.kisi.map(x => '<div>' + esc(x.o.ad) + '<br><br>……………………</div>').join("") + '</div></div>';
  return {baslik:"Ortak hesabı", geri:true, html};
}

/* ================= MUHASEBECİ ================= */
// Muhasebeci hesabı: her şeyi görür, hiçbir şeyi değiştiremez (veritabanında da engelli: supabase-guncelleme-14.sql).
function rolUygula(k){
  if(k && k.rol === "muhasebeci") yetki = Object.assign(yetki, {yonetici:true, salt:true});
  else delete yetki.salt;
}
const SALT_HATA = "Muhasebeci hesabı yalnız görüntüleyebilir; değişiklik yapamaz.";
// Muhasebeci paketi: ayın KDV özeti, kasa, cari bakiyeleri, çek / senet ve personel ödemeleri tek ZIP
async function muhasebePaketi(ay){
  await jszipYukle();
  const eski = ayGoster; ayGoster = ay;
  try{
    const zip = new JSZip(), son = ay + "-" + ayGunSayisi(ay), fr = firma(), ad = "muhasebe-" + ay;
    const hl = veri.hareketler.filter(h => h.tarih.slice(0, 7) === ay && h.tur !== "borc").sort((a, b) => a.tarih < b.tarih ? -1 : 1);
    const TUR = {giris:"Giriş", cikis:"Çıkış", aktarim:"Aktarım"};
    zip.file("1-KDV-ozeti-ve-faturalar.xlsx", await kdvExcelYap(false));
    zip.file("2-Kasa-hareketleri.xlsx", await excelIndir([{ad:"Kasa " + ay, genislik:[12, 10, 28, 28, 12, 14, 40, 12], satirlar:[["Tarih", "Tür", "Kategori", "Cari", "Ödeme", "Tutar", "Açıklama", "Kasa"]].concat(
      hl.map(h => [h.tarih, TUR[h.tur] || h.tur, h.kategori, cariAdi(h.musteriId), h.odeme, (h.tur === "cikis" ? -1 : 1) * yuvarla(h.tutar), h.aciklama || "", h.tur === "aktarim" ? ortakAdi(h.ortak) + " → " + ortakAdi(h.hedef) : ortakAdi(h.ortak)]))}], "", false));
    zip.file("3-Cari-bakiyeler.xlsx", await excelIndir([{ad:"Cariler", genislik:[32, 12, 16, 16, 16], satirlar:[["Cari", "Tür", "Vergi / TC no", "Bakiye", "Durum"]].concat(
      veri.musteriler.map(m => [m, cariBakiye(m.id)]).filter(x => Math.abs(x[1]) >= 0.01).sort((a, b) => b[1] - a[1]).map(([m, b]) => [m.ad, m.tip === "tedarikci" ? "Tedarikçi" : "Müşteri", m.vergiNo || "", yuvarla(b), b > 0 ? "Bize borçlu" : "Biz borçluyuz"]))}], "", false));
    const cl = veri.cekler.filter(c => cekAcik(c) || (c.vade || "").slice(0, 7) === ay);
    zip.file("4-Cek-senet.xlsx", await excelIndir([{ad:"Çek senet", genislik:[10, 10, 14, 28, 14, 12, 18], satirlar:[["Tür", "Belge", "No", "Cari / keşideci", "Banka", "Vade", "Tutar", "Durum"]].concat(
      cl.map(c => [c.tur === "alinan" ? "Alınan" : "Verilen", c.belge === "senet" ? "Senet" : "Çek", c.no || "", cariAdi(c.musteriId) || c.kesideci || "", c.banka || "", c.vade || "", yuvarla(c.tutar), CEK_DURUM[c.durum] || c.durum]))}], "", false));
    const ph = veri.personel_hareket.filter(h => (h.tarih || "").slice(0, 7) === ay || h.donem === ay);
    if(ph.length) zip.file("5-Personel-odemeleri.xlsx", await excelIndir([{ad:"Personel", genislik:[12, 26, 14, 14, 30], satirlar:[["Tarih", "Personel", "Tür", "Tutar", "Açıklama"]].concat(
      ph.map(h => [h.tarih || h.donem, (bul("personel", h.personelId) || {}).ad || "", h.tur, yuvarla(h.tutar), h.aciklama || ""]))}], "", false));
    const k = kdvOzeti(ay);
    zip.file("BENIOKU.txt", [fr.ad || FIRMA, "Dönem: " + ayYaz(ay), "Vergi no: " + (fr.vergiNo || "-"), "", "Satış faturası: " + k.s.l.length + " adet, matrah " + para(k.s.matrah) + ", KDV " + para(k.s.kdv),
      "Alış faturası: " + k.a.l.length + " adet, matrah " + para(k.a.matrah) + ", KDV " + para(k.a.kdv), (k.fark >= 0 ? "Ödenecek" : "Devreden") + " KDV (ön bilgi): " + para(Math.abs(k.fark)), "",
      "Kasa: " + hl.length + " hareket. Bu paket " + tarihYaz(bugun()) + " tarihinde Güneş Mobilya uygulamasından alındı."].join("\r\n"));
    const blob = await zip.generateAsync({type:"blob"}), f = new File([blob], ad + ".zip", {type:"application/zip"});
    logla("dosya", "faturalar", "", "Muhasebeci paketi (" + ay + ")");
    return f;
  }finally{ ayGoster = eski; }
}
EYLEM.muhasebePaketi = btn => islem(btn, async () => {
  const f = await muhasebePaketi(ayGoster);
  if(navigator.canShare && navigator.canShare({files:[f]}) && matchMedia("(pointer:coarse)").matches) await navigator.share({files:[f], title:"Muhasebe " + ayGoster, text:FIRMA + " · " + ayYaz(ayGoster) + " muhasebe dosyaları"}).catch(() => dosyaIndir(f, f.name));
  else { dosyaIndir(f, f.name); bildir("Paket indirildi; muhasebecinize gönderin"); }
});

/* ================= ANA SAYFA DÜZENİ ================= */
// Kartların sırası ve görünürlüğü herkes için (sistem ayarı "anaSayfa": [{id, gizli}])
const ANA_KART = {yapilacak:"Yapılacaklar", hedef:"Aylık hedefler", randevu:"Bugünkü randevular", kapasite:"Atölye yükü", ozet:"Kasa, bugün, alacak, borç", hizli:"Hızlı işlemler",
  isler:"Açık iş emirleri", sonKasa:"Son kasa hareketleri"};
function anaSayfaDuzeni(){
  const k = Array.isArray(sistem().anaSayfa) ? sistem().anaSayfa.filter(x => ANA_KART[x.id]) : [];
  Object.keys(ANA_KART).forEach(id => { if(!k.some(x => x.id === id)) k.push({id, gizli:false}); });
  return k;
}
function ayarAnaSayfa(){
  const l = anaSayfaDuzeni();
  return '<div class="kart">' + kartBaslik("Ana sayfa kartları", "(herkeste)") + '<div class="alt-bilgi" style="margin:0 0 8px">Okla sıralayın, kullanmadıklarınızı gizleyin. Ustaların ana sayfası ayrıdır.</div>' +
    '<div id="anaKartlar">' + l.map((x, i) => '<div class="satir" data-id="' + x.id + '"><label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer"><input type="checkbox" class="ak-gor"' + (x.gizli ? '' : ' checked') + ' style="width:20px;height:20px">' +
      '<span class="s1"' + (x.gizli ? ' style="color:var(--soluk)"' : '') + '>' + ANA_KART[x.id] + '</span></label>' +
      '<button class="ikon-buton" data-is="anaKartTasi" data-arg="' + i + '|-1" aria-label="Yukarı"' + (i ? '' : ' disabled') + ' style="transform:rotate(180deg)">' + ik("asagi") + '</button>' +
      '<button class="ikon-buton" data-is="anaKartTasi" data-arg="' + i + '|1" aria-label="Aşağı"' + (i < l.length - 1 ? '' : ' disabled') + '>' + ik("asagi") + '</button></div>').join("") + '</div>' +
    '<div class="buton-sira"><button class="buton ikincil kucuk" style="margin:0" data-is="anaKartSifirla">Varsayılan düzen</button></div></div>';
}
EYLEM.anaKartTasi = (el, arg) => {
  const [i, y] = arg.split("|").map(Number), l = anaSayfaDuzeni(), j = i + y; if(j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]]; islem(null, async () => { await sistemKaydet({anaSayfa:l}); ciz(); });
};
EYLEM.anaKartSifirla = () => islem(null, async () => { await sistemKaydet({anaSayfa:[]}); bildir("Varsayılan düzen"); ciz(); });
document.addEventListener("change", e => {
  if(!e.target.classList || !e.target.classList.contains("ak-gor")) return;
  const id = e.target.closest("[data-id]").getAttribute("data-id"), l = anaSayfaDuzeni().map(x => x.id === id ? Object.assign({}, x, {gizli:!e.target.checked}) : x);
  islem(null, async () => { await sistemKaydet({anaSayfa:l}); bildir("Kaydedildi"); ciz(); });
});
