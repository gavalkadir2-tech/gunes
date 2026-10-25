"use strict";
// Güneş Mobilya — bildirim merkezi, ekran kilidi ve gelişmiş ayarlar (mesaj şablonları, belgeler, takvim, depolama)

/* ================= BİLDİRİM MERKEZİ ================= */
// Bildirimler: başka kullanıcıların yaptığı değişiklikler (canlı veya açılıştaki eşitlemede gelen) + Yapılacaklar.
// Cihazda saklanır (kişiye özel, son 300 / 30 gün). Uygulama açıkken telefon / masaüstü bildirimi ve ses de verilebilir.
const BILDIRIM_TUR = {is:["İş emirleri", "is"], para:["Para ve faturalar", "kasa"], stok:["Stok ve sipariş", "koli"], katalog:["Katalog", "katalog"], personel:["Personel", "kisi"], sistem:["Ayarlar ve kullanıcılar", "ayar"]};
const TABLO_BILDIRIM = {is_emirleri:"is", is_notlari:"is", dosyalar:"is", hareketler:"para", faturalar:"para", taksitler:"para", cekler:"para", paylasimlar:"katalog", katalog:"katalog",
  katalog_gorseller:"katalog", stok_hareket:"stok", siparisler:"stok", personel:"personel", puantaj:"personel", personel_hareket:"personel", arac_kayit:"stok", ayarlar:"sistem", musteriler:"para"};
const SESSIZ_AYAR = {hatirlatmaGecmisi:1, plakalar:1};   // bildirim üretmeyen ayar kayıtları
const BILDIRIM_VARSAYILAN = {kategori:{is:true, para:true, stok:true, katalog:true, personel:true, sistem:true}, telefon:true, ses:false, anlik:true, sessizBas:"22:00", sessizBit:"08:00",
  gunlukOzet:true, hatirlatma:{teslim:true, randevu:true, tahsilat:true, cek:true, stok:true, arac:true, personel:true, teklif:true, sabit:true}};
function bildirimAyar(){ const c = cihaz().bildirim || {}; const d = BILDIRIM_VARSAYILAN;
  return Object.assign({}, d, c, {kategori:Object.assign({}, d.kategori, c.kategori || {}), hatirlatma:Object.assign({}, d.hatirlatma, c.hatirlatma || {})}); }
let bildirimler = [], bildirimHazir = false;
const bildirimAnahtar = () => "bildirim:" + (benimEposta() || "yerel");
async function bildirimYukle(){ bildirimler = ((await IDB.al(bildirimAnahtar())) || []).filter(b => Date.now() - b.zaman < 30 * 86400000); bildirimHazir = true; zilGuncelle(); }
let bildirimZaman = null;
function bildirimYaz(){ clearTimeout(bildirimZaman); bildirimZaman = setTimeout(() => IDB.yaz(bildirimAnahtar(), bildirimler.slice(0, 300)), 400); }
const sessizMi = () => { const a = bildirimAyar(), s = new Date(), d = s.getHours() * 60 + s.getMinutes(), b = dakika(a.sessizBas), e = dakika(a.sessizBit);
  if(b == null || e == null || b === e) return false; return b < e ? d >= b && d < e : d >= b || d < e; };
// Uzaktan gelen bir değişiklik için bildirim metni (null → bildirim yok)
function degisiklikMetni(t, eski, k){
  const kim = kisiAdi(k._degistiren), b = kayitBasligi(t, k);
  switch(t){
    case "is_emirleri": {
      if(!eski) return [kim + " yeni iş emri açtı", b];
      if(eski.durum !== k.durum) return [kim + " durumu “" + k.durum + "” yaptı", b];
      const biten = (k.asamalar || []).filter((a, i) => a.tamam && !((eski.asamalar || [])[i] || {}).tamam);
      if(biten.length) return [kim + " " + biten.map(a => a.ad).join(", ") + " aşamasını bitirdi", b];
      const yeniR = (k.montaj || []).filter(r => !(eski.montaj || []).some(x => x.id === r.id));
      if(yeniR.length) return [kim + " " + yeniR[0].tur.toLocaleLowerCase("tr") + " randevusu verdi", b + " · " + tarihYaz(yeniR[0].tarih, true) + " " + (yeniR[0].saat || "")];
      const bitenR = (k.montaj || []).filter(r => r.tamam && !((eski.montaj || []).find(x => x.id === r.id) || {}).tamam);
      if(bitenR.length) return [kim + " " + bitenR[0].tur.toLocaleLowerCase("tr") + " işini tamamladı", b];
      return [kim + " iş emrini değiştirdi", b];
    }
    case "is_notlari": return eski ? null : [kim + (k.tur === "not" ? " not ekledi" : " işlem yaptı"), b];
    case "dosyalar": return eski ? null : [kim + " dosya / fotoğraf ekledi", (bul("is_emirleri", k.isEmriId) || {}).no + " · " + k.ad];
    case "hareketler": return eski ? null : [kim + (k.tur === "giris" ? " kasaya para girdi" : k.tur === "cikis" ? " kasadan para çıkardı" : " kasa kaydı ekledi"), b];
    case "faturalar": return eski ? null : [kim + " " + (k.tur === "satis" ? "satış" : "alış") + " faturası kesti", b];
    case "cekler": return !eski ? [kim + " çek / senet kaydetti", b] : eski.durum !== k.durum ? [kim + " çek / senedi “" + (CEK_DURUM[k.durum] || k.durum) + "” yaptı", b] : null;
    case "siparisler": return !eski ? [kim + " malzeme siparişi verdi", b] : eski.durum !== k.durum ? [kim + " siparişi “" + (SIPARIS_DURUM[k.durum] || [k.durum])[0] + "” yaptı", b] : null;
    case "musteriler": return eski ? null : [kim + " yeni " + (k.tip === "tedarikci" ? "tedarikçi" : "müşteri") + " ekledi", b];
    case "katalog": return eski ? null : [kim + " kataloğa proje ekledi", b];
    case "paylasimlar": return eski ? null : [kim + " müşteriye katalog bağlantısı gönderdi", b];
    case "personel_hareket": return eski ? null : [kim + " personel hesabına kayıt girdi", b];
    case "stok_hareket": return eski ? null : [kim + " stok " + (STOK_TUR[k.tur] || "").toLocaleLowerCase("tr") + " girdi", b];
    case "ayarlar": return SESSIZ_AYAR[k.anahtar] ? null : [kim + " ayarları değiştirdi", AYAR_ADI[k.anahtar] || k.anahtar];
  }
  return null;
}
const BILDIRIM_YER = (t, k) => ({is_emirleri:"is/" + k.id, is_notlari:"is/" + k.isEmriId, dosyalar:"is/" + k.isEmriId, hareketler:"kayit/" + k.id, faturalar:"fatura/" + k.id, cekler:"cekler/" + k.id,
  siparisler:"siparisler", musteriler:"cari/" + k.id, katalog:"proje/" + k.id, paylasimlar:"paylasimlar", personel_hareket:"personel/" + k.personelId, stok_hareket:"stok", ayarlar:"ayarlar"}[t] || "ana");
let toplu = 0;
// bellegeYaz (sunucudan) her uzak değişiklikte çağırır
function uzakDegisiklik(t, eski, k){
  if(!hazir || !k || !k._degistiren || !benimEposta() || k._degistiren.toLowerCase() === benimEposta()) return;
  if(eski && eski._surum != null && k._surum != null && k._surum <= eski._surum) return;   // aynı sürüm tekrar geldi
  const tur = TABLO_BILDIRIM[t]; if(!tur) return;
  const m = degisiklikMetni(t, eski, k); if(!m) return;
  const a = bildirimAyar(); if(!a.kategori[tur]) return;
  const kayit = {id:yeniId(), zaman:k._degisme || Date.now(), tur, baslik:m[0], alt:m[1] || "", yer:BILDIRIM_YER(t, k), kim:k._degistiren, okundu:false};
  // Aynı kişinin aynı kayıttaki art arda değişiklikleri tek bildirimde
  const son = bildirimler[0];
  if(son && !son.okundu && son.yer === kayit.yer && son.kim === kayit.kim && son.baslik === kayit.baslik && kayit.zaman - son.zaman < 10 * 60000) son.zaman = kayit.zaman;
  else bildirimler.unshift(kayit);
  bildirimler.sort((x, y) => y.zaman - x.zaman); bildirimYaz(); zilGuncelle();
  if(toplu) return;   // açılıştaki toplu eşitlemede tek tek uyarı verilmez
  if(a.anlik) bildirTip(kayit);
  if(!sessizMi()){
    if(a.ses) bipCal();
    if(a.telefon && !cihaz().push && document.visibilityState !== "visible") sistemBildirimi(kayit);   // abone cihazda sunucu bildirimi gelir
  }
}
function bildirTip(b){
  document.querySelectorAll(".bildirim-tost").forEach(x => x.remove());
  const e = document.createElement("button"); e.className = "bildirim-tost"; e.innerHTML = '<span class="rozet r-ana">' + ik(BILDIRIM_TUR[b.tur][1]) + '</span><span><b>' + esc(b.baslik) + '</b><br><span>' + esc(b.alt) + '</span></span>';
  e.onclick = () => { e.remove(); bildirimAc(b.id); };
  document.body.appendChild(e); setTimeout(() => e.remove(), 6000);
}
function sistemBildirimi(b){
  try{
    if(!window.Notification || Notification.permission !== "granted") return;
    const n = new Notification(b.baslik, {body:b.alt, icon:"ikon-192.png", tag:"gunes-" + b.id});
    n.onclick = () => { window.focus(); bildirimAc(b.id); n.close(); };
  }catch(e){}
}
let sesBag = null;
function bipCal(){
  try{ sesBag = sesBag || new (window.AudioContext || window.webkitAudioContext)(); const o = sesBag.createOscillator(), g = sesBag.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(0.0001, sesBag.currentTime); g.gain.exponentialRampToValueAtTime(0.15, sesBag.currentTime + .02); g.gain.exponentialRampToValueAtTime(0.0001, sesBag.currentTime + .35);
    o.connect(g); g.connect(sesBag.destination); o.start(); o.stop(sesBag.currentTime + .4); }catch(e){}
}
// Yapılacaklar: ayarlarda kapatılan türler gösterilmez
const hatirlatmaTuru = h => /^is\//.test(h.yer) && /Teklif/.test(h.yazi) ? "teklif" : /^is\//.test(h.yer) ? "teslim" : /^takvim/.test(h.yer) ? "randevu" : /^fatura\//.test(h.yer) ? "tahsilat" :
  /^cekler/.test(h.yer) ? "cek" : /^(siparisler|stok)/.test(h.yer) ? "stok" : /^araclar/.test(h.yer) ? "arac" : /^sabitgiderler/.test(h.yer) ? "sabit" : /^(puantaj|maas)/.test(h.yer) ? "personel" : "teslim";
const okunmamis = () => bildirimler.filter(b => !b.okundu).length;
function zilSayisi(){ if(!hazir) return 0; return okunmamis() + hatirlatmalar().filter(h => h.seviye === 0).length; }
function zilGuncelle(){ const n = zilSayisi(); document.querySelectorAll(".zil-sayi").forEach(e => { e.textContent = n > 99 ? "99+" : n; e.style.display = n ? "" : "none"; }); }
const zilDugmesi = () => { const n = zilSayisi();
  return '<button class="ikon-buton zil" data-is="bildirimPanel" aria-label="Bildirimler" title="Bildirimler">' + ik("zil") + '<i class="zil-sayi"' + (n ? '' : ' style="display:none"') + '>' + (n > 99 ? "99+" : n) + '</i></button>'; };
function bildirimAc(id){
  const b = bildirimler.find(x => x.id === id); if(!b) return;
  b.okundu = true; bildirimYaz(); zilGuncelle();
  document.querySelectorAll(".bildirim-perde").forEach(x => x.remove());
  git(b.yer);
}
EYLEM.bildirimPanel = () => {
  if(document.querySelector(".bildirim-perde")) return document.querySelector(".bildirim-perde").remove();
  const p = document.createElement("div"); p.className = "perde bildirim-perde";
  let f = "hepsi";
  const ciz_ = () => {
    const hl = hatirlatmalar(), l = bildirimler.filter(b => f === "hepsi" || (f === "okunmamis" ? !b.okundu : b.tur === f));
    const gun = b => { const g = tarihStr(new Date(b.zaman)); return g === bugun() ? "Bugün" : g === gunEkle(bugun(), -1) ? "Dün" : tarihYaz(g); };
    let son = "";
    p.innerHTML = '<div class="bildirim-panel"><div class="bp-ust"><b>Bildirimler</b><button class="baglanti" style="margin:0" data-c="hepsiOkundu">Tümünü okundu say</button>' +
        '<button class="ikon-buton" data-c="ayar" aria-label="Bildirim ayarları">' + ik("ayar") + '</button><button class="ikon-buton" data-c="kapat" aria-label="Kapat">' + ik("x") + '</button></div>' +
      '<div class="bp-govde">' +
      (hl.length ? '<details class="bp-yapilacak"' + (hl.some(h => h.seviye === 0) ? ' open' : '') + '><summary>' + ik("zil") + ' Yapılacaklar (' + hl.length + ')' + (hl.filter(h => h.seviye === 0).length ? ' <span class="etiket-rozet d-kirmizi">' + hl.filter(h => h.seviye === 0).length + ' acil</span>' : '') + '</summary>' +
        hl.slice(0, 8).map(hatirlatmaSatir).join("") + (hl.length > 8 ? '<button class="baglanti" data-git="hatirlatmalar">Tümünü göster</button>' : '') + '</details>' : '') +
      '<div class="secenekler bp-filtre">' + [["hepsi", "Tümü"], ["okunmamis", "Okunmamış (" + okunmamis() + ")"]].concat(Object.entries(BILDIRIM_TUR).filter(([k]) => bildirimler.some(b => b.tur === k)).map(([k, v]) => [k, v[0]]))
        .map(([k, v]) => '<button class="secenek' + (k === f ? ' secili' : '') + '" data-f="' + k + '">' + esc(v) + '</button>').join("") + '</div>' +
      (l.length ? l.slice(0, 150).map(b => { const g = gun(b), ust = g !== son ? '<div class="bp-gun">' + g + '</div>' : ''; son = g;
        return ust + '<button class="bp-satir' + (b.okundu ? '' : ' yeni') + '" data-b="' + b.id + '"><span class="rozet r-gri">' + ik(BILDIRIM_TUR[b.tur][1]) + '</span><span class="orta"><div class="s1">' + esc(b.baslik) + '</div>' +
          '<div class="s2">' + esc(b.alt) + '</div></span><span class="bp-saat">' + ("0" + new Date(b.zaman).getHours()).slice(-2) + ":" + ("0" + new Date(b.zaman).getMinutes()).slice(-2) + '</span></button>'; }).join("") +
        (bildirimler.length ? '<button class="baglanti" style="margin:12px 4px" data-c="temizle">Bildirimleri temizle</button>' : '') :
        bos("zil", cevrimici ? "Yeni bildirim yok. Başka bir kullanıcı (ortağınız veya usta) bir şey eklediğinde ya da değiştirdiğinde burada görünür." : "Bildirim yok. Diğer kullanıcıların işlemleri bulut bağlantısıyla bildirilir.")) +
      '</div></div>';
  };
  p.addEventListener("click", e => {
    if(e.target === p) return p.remove();
    const fb = e.target.closest("[data-f]"); if(fb){ f = fb.getAttribute("data-f"); return ciz_(); }
    const bb = e.target.closest("[data-b]"); if(bb) return bildirimAc(bb.getAttribute("data-b"));
    if(e.target.closest("[data-git]")) return p.remove();
    const c = e.target.closest("[data-c]"); if(!c) return;
    const k = c.getAttribute("data-c");
    if(k === "kapat") return p.remove();
    if(k === "ayar"){ p.remove(); return git("ayarlar/bildirim"); }
    if(k === "hepsiOkundu"){ bildirimler.forEach(b => { b.okundu = true; }); bildirimYaz(); zilGuncelle(); return ciz_(); }
    if(k === "temizle"){ bildirimler = []; bildirimYaz(); zilGuncelle(); return ciz_(); }
  });
  ciz_(); document.body.appendChild(p);
};
EYLEM.bildirimTest = () => {
  const b = {id:yeniId(), zaman:Date.now(), tur:"sistem", baslik:"Deneme bildirimi", alt:"Bildirimler bu cihazda çalışıyor.", yer:"ayarlar/bildirim", kim:"", okundu:false};
  bildirimler.unshift(b); bildirimYaz(); zilGuncelle(); bildirTip(b); if(bildirimAyar().ses) bipCal(); sistemBildirimi(b);
};

/* ================= EKRAN KİLİDİ (PIN) ================= */
// Ortak kullanılan cihazda uygulama açılırken ve belirli süre işlem yapılmayınca 4–6 haneli PIN sorulur. PIN bu cihazda özetlenerek saklanır.
async function pinOzet(pin){ const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gunes:" + pin)); return Array.from(new Uint8Array(b)).map(x => ("0" + x.toString(16)).slice(-2)).join(""); }
let kilitli = false;
function kilitGoster(){
  const c = cihaz(); if(!c.pin || kilitli) return;
  kilitli = true;
  const p = document.createElement("div"); p.className = "kilit-ekrani";
  p.innerHTML = '<div class="kilit-kutu"><img src="logo.png" alt="" style="height:40px;margin:0 auto 12px;display:block">' + ik("kilit") + '<p>Devam etmek için PIN girin</p>' +
    '<input id="kilitPin" class="kutu" type="password" inputmode="numeric" maxlength="6" autocomplete="off" style="text-align:center;font-size:22px;letter-spacing:8px">' +
    '<div class="hata" id="kilitHata"></div><button class="buton" data-c="ac">Aç</button>' + (cevrimici ? '<button class="baglanti" data-c="cikis" style="display:block;margin:14px auto 0">PIN\'i unuttum: çıkış yap</button>' : '') + '</div>';
  let deneme = 0;
  const ac = async () => {
    const v = p.querySelector("#kilitPin").value;
    if(await pinOzet(v) === cihaz().pin){ kilitli = false; sonHareket = Date.now(); p.remove(); return; }
    deneme++; p.querySelector("#kilitPin").value = ""; p.querySelector("#kilitHata").textContent = "PIN yanlış" + (deneme >= 3 ? " (" + deneme + ". deneme)" : "");
  };
  p.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if(!b) return;
    if(b.getAttribute("data-c") === "ac") ac();
    else { cihazKaydet({pin:""}); kilitli = false; p.remove(); EYLEM.cikisYap(); } });
  p.addEventListener("keydown", e => { if(e.key === "Enter") ac(); });
  document.body.appendChild(p); setTimeout(() => p.querySelector("#kilitPin").focus(), 50);
}
setInterval(() => { const c = cihaz(); if(c.pin && c.kilitDk && hazir && !kilitli && Date.now() - sonHareket > c.kilitDk * 60000) kilitGoster(); }, 15000);
document.addEventListener("visibilitychange", () => { const c = cihaz(); if(document.visibilityState === "visible" && c.pin && c.kilitDk && hazir && Date.now() - sonHareket > c.kilitDk * 60000) kilitGoster(); });
EYLEM.pinAyarla = () => {
  const var_ = !!cihaz().pin, p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:380px"><p>' + (var_ ? "PIN'i değiştir" : "Ekran kilidi PIN'i") + '</p><div class="alt-bilgi">4–6 rakam. PIN yalnız bu cihazda geçerlidir.</div>' +
    (var_ ? '<label class="etiket" for="pinEski">Şu anki PIN</label><input id="pinEski" class="kutu" type="password" inputmode="numeric" maxlength="6">' : '') +
    '<label class="etiket" for="pin1">Yeni PIN</label><input id="pin1" class="kutu" type="password" inputmode="numeric" maxlength="6"><label class="etiket" for="pin2">Yeni PIN (tekrar)</label><input id="pin2" class="kutu" type="password" inputmode="numeric" maxlength="6">' +
    '<div class="hata" id="pinHata"></div><div class="buton-sira">' + (var_ ? '<button class="buton tehlike" data-c="kaldir">Kilidi kaldır</button>' : '') + '<button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">Kaydet</button></div></div>';
  p.addEventListener("click", async e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c"), h = t => { p.querySelector("#pinHata").textContent = t; };
    if(c === "hayir") return p.remove();
    if(var_ && await pinOzet(p.querySelector("#pinEski").value) !== cihaz().pin) return h("Şu anki PIN yanlış.");
    if(c === "kaldir"){ cihazKaydet({pin:""}); p.remove(); bildir("Ekran kilidi kaldırıldı"); return ciz(); }
    const a = p.querySelector("#pin1").value, y = p.querySelector("#pin2").value;
    if(!/^\d{4,6}$/.test(a)) return h("PIN 4–6 rakam olmalı."); if(a !== y) return h("İki PIN aynı değil.");
    cihazKaydet({pin:await pinOzet(a), kilitDk:cihaz().kilitDk || 5}); p.remove(); bildir("Ekran kilidi açıldı"); ciz();
  });
  document.body.appendChild(p);
};

/* ================= MESAJ ŞABLONLARI ================= */
// Müşteriye / tedarikçiye giden WhatsApp mesajları. {alan} yerine bilgiler gelir; ayarlardan değiştirilebilir.
const MESAJ_SABLON = {
  siparisOnay:["Sipariş onayı", "Merhaba {ad}, {no} numaralı “{is}” siparişinizi aldık.{ozet}{teslim}\n\n{firma}", "{ad} {no} {is} {ozet} {teslim} {firma}"],
  uretim:["Üretime alındı", "Merhaba {ad}, “{is}” siparişiniz üretime alındı.{teslim}\n\n{firma}", "{ad} {is} {teslim} {firma}"],
  hazir:["Sipariş hazır", "Merhaba {ad}, “{is}” siparişiniz hazır. Teslimat için uygun olduğunuz gün ve saati bildirir misiniz?{kalan}\n\n{firma}", "{ad} {is} {kalan} {firma}"],
  teslim:["Teslim edildi", "Merhaba {ad}, “{is}” siparişiniz teslim edilmiştir. Bizi tercih ettiğiniz için teşekkür ederiz.\n\n{firma}", "{ad} {is} {firma}"],
  odeme:["Ödeme hatırlatma (iş)", "Merhaba {ad}, {no} numaralı siparişinizle ilgili {tutar} tutarında ödemeniz bulunmaktadır. Uygun olduğunuzda bilgi verirseniz seviniriz.\n\n{firma}", "{ad} {no} {tutar} {firma}"],
  randevu:["Montaj / teslimat randevusu", "Merhaba {ad},\n{is} siparişiniz için {gun}{saat} {ne} için geleceğiz.{adres}\nUygun değilseniz lütfen bize haber verin.\n\n{firma}", "{ad} {is} {gun} {saat} {ne} {adres} {firma}"],
  tedarikci:["Tedarikçiye sipariş", "Merhaba {ad},\nAşağıdaki malzemeleri sipariş etmek istiyoruz ({no}):\n\n{liste}{not}\n\nFiyat ve teslim tarihini bildirir misiniz?\n{firma}{telefon}", "{ad} {no} {liste} {not} {firma} {telefon}"],
  tahsilat:["Toplu tahsilat hatırlatması", TAHSILAT_SABLON, "{ad} {tutar} {gecikme} {iban} {firma}"],
  kampanya:["Müşteri kampanyası", KAMPANYA_SABLON, "{ad} {is} {yil} {baglanti} {firma}"]
};
const mesajSablonu = k => ((sistem().mesajlar || {})[k]) || MESAJ_SABLON[k][1];
function ayarMesajlar(){
  const m = sistem().mesajlar || {};
  return '<div class="alt-bilgi" style="margin:0 2px 10px">Müşteriye ve tedarikçiye giden WhatsApp mesajları. Süslü parantez içindeki alanlar ({ad}, {is}…) gönderirken doldurulur. Mesaj göndermeden önce yine düzenlenebilir.</div>' +
    Object.entries(MESAJ_SABLON).map(([k, v]) => '<div class="kart">' + kartBaslik(v[0], m[k] ? '<span class="etiket-rozet d-mavi">özel</span>' : '') +
      '<textarea class="kutu" data-sablon="' + k + '" style="min-height:110px">' + esc(m[k] || v[1]) + '</textarea>' +
      '<div class="alt-bilgi">Alanlar: ' + esc(v[2]) + '</div>' +
      '<div class="buton-sira"><button class="buton kucuk" style="margin:0" data-is="sablonKaydet" data-arg="' + k + '">' + ik("tamam") + 'Kaydet</button>' +
        (m[k] ? '<button class="buton kucuk ikincil" style="margin:0" data-is="sablonSifirla" data-arg="' + k + '">Varsayılana döndür</button>' : '') + '</div></div>').join("");
}
EYLEM.sablonKaydet = (btn, k) => {
  const v = document.querySelector('[data-sablon="' + k + '"]').value.trim(); if(!v) return uyar("Şablon boş olamaz", "");
  islem(btn, async () => { await sistemKaydet({mesajlar:Object.assign({}, sistem().mesajlar || {}, {[k]:v})}); if(k === "tahsilat") delete filtre.tahsilatSablon; if(k === "kampanya" && filtre.kampanya) filtre.kampanya.sablon = v; bildir("Şablon kaydedildi"); ciz(); });
};
EYLEM.sablonSifirla = (btn, k) => islem(btn, async () => { const m = Object.assign({}, sistem().mesajlar || {}); delete m[k]; await sistemKaydet({mesajlar:m}); bildir("Varsayılana döndü"); ciz(); });

/* ================= BELGE (YAZDIRMA) AYARLARI ================= */
const BELGE_VARSAYILAN = {teklifBaslik:"FİYAT TEKLİFİ", logo:true, fotolar:6, imza:true, iban:true, kalemFiyat:true, musteriTel:true, altBilgi:""};
const belgeAyar = () => Object.assign({}, BELGE_VARSAYILAN, sistem().belge || {});
function ayarBelge(){
  const b = belgeAyar(), kutu = (id, ad, v) => '<label class="satir" style="cursor:pointer"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + ' style="width:20px;height:20px"><span class="orta"><div class="s1">' + ad + '</div></span></label>';
  return '<div class="kart">' + kartBaslik("Teklif çıktısı", "(İş emri → Teklifi yazdır / PDF)") +
      '<div class="iki-alan">' + yaziAlan("bBaslik", "Belge başlığı", b.teklifBaslik, {max:40}) + '<div><label class="etiket" for="bFoto">Gösterilecek fotoğraf</label><select id="bFoto" class="kutu">' +
        [0, 3, 6, 9, 12].map(n => '<option value="' + n + '"' + (n === Number(b.fotolar) ? ' selected' : '') + '>' + (n ? n + " fotoğraf" : "Fotoğraf yok") + '</option>').join("") + '</select></div></div>' +
      kutu("bLogo", "Logo", b.logo) + kutu("bFiyat", "Kalem bazında birim fiyat ve tutar", b.kalemFiyat) + kutu("bTel", "Müşteri telefonu", b.musteriTel) + kutu("bIban", "IBAN ve banka", b.iban) + kutu("bImza", "İmza alanları (müşteri onayı / firma)", b.imza) +
      '<label class="etiket" for="bAlt">Alt bilgi <span class="ist">(her teklifin en altında; örn. adres, web, sosyal medya)</span></label><textarea id="bAlt" class="kutu" maxlength="300" style="min-height:56px">' + esc(b.altBilgi) + '</textarea>' +
      '<div class="alt-bilgi">Teklif ve fatura notları: <b data-git="ayarlar/teklif" style="cursor:pointer;color:var(--borc)">Teklif ve fatura</b> bölümünde.</div>' +
      '<button class="buton" data-is="belgeKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
EYLEM.belgeKaydet = btn => {
  const c = id => document.getElementById(id).checked;
  const d = {teklifBaslik:deger("bBaslik") || BELGE_VARSAYILAN.teklifBaslik, fotolar:Number(deger("bFoto")), logo:c("bLogo"), kalemFiyat:c("bFiyat"), musteriTel:c("bTel"), iban:c("bIban"), imza:c("bImza"), altBilgi:deger("bAlt")};
  islem(btn, async () => { await sistemKaydet({belge:d}); bildir("Belge ayarları kaydedildi"); ciz(); });
};

/* ================= TAKVİM VE ÇALIŞMA SAATLERİ ================= */
const TAKVIM_VARSAYILAN = {saat:"09:00", sure:3, gunler:[1, 2, 3, 4, 5, 6], hatirlatGun:1};
const takvimAyar = () => Object.assign({}, TAKVIM_VARSAYILAN, sistem().takvim || {});
function ayarTakvim(){
  const t = takvimAyar();
  return '<div class="kart">' + kartBaslik("Montaj takvimi") +
    '<div class="izgara uc" style="margin:0"><div><label class="etiket" for="tSaat">Varsayılan randevu saati</label><input id="tSaat" type="time" class="kutu" value="' + esc(t.saat) + '"></div>' +
      '<div><label class="etiket" for="tSure">Varsayılan süre</label><select id="tSure" class="kutu">' + [[1, "1 saat"], [2, "2 saat"], [3, "3 saat"], [4, "4 saat"], [6, "6 saat"], [8, "8 saat"], [0, "Tüm gün"]].map(([v, a]) => '<option value="' + v + '"' + (v === Number(t.sure) ? ' selected' : '') + '>' + a + '</option>').join("") + '</select></div>' +
      '<div><label class="etiket" for="tHat">Müşteriye hatırlatma</label><select id="tHat" class="kutu">' + [[0, "Aynı gün"], [1, "1 gün önce"], [2, "2 gün önce"]].map(([v, a]) => '<option value="' + v + '"' + (v === Number(t.hatirlatGun) ? ' selected' : '') + '>' + a + '</option>').join("") + '</select></div></div>' +
    '<label class="etiket">Çalışma günleri <span class="ist">(takvimde kapalı günler soluk gösterilir, randevu verirken uyarılır)</span></label><div class="secenekler" id="tGunler">' +
      [1, 2, 3, 4, 5, 6, 0].map(g => '<button type="button" class="secenek' + (t.gunler.indexOf(g) >= 0 ? ' secili' : '') + '" data-g="' + g + '">' + GUN_UZUN[g] + '</button>').join("") + '</div>' +
    '<button class="buton" data-is="takvimKaydet">' + ik("tamam") + 'Kaydet</button></div>';
}
EYLEM.takvimKaydet = btn => {
  const gunler = Array.from(document.querySelectorAll("#tGunler .secili")).map(b => Number(b.getAttribute("data-g")));
  if(!gunler.length) return uyar("En az bir çalışma günü seçin", "");
  islem(btn, async () => { await sistemKaydet({takvim:{saat:deger("tSaat") || "09:00", sure:Number(deger("tSure")), hatirlatGun:Number(deger("tHat")), gunler}}); bildir("Takvim ayarları kaydedildi"); ciz(); });
};
document.addEventListener("click", e => { const b = e.target.closest("#tGunler [data-g]"); if(b) b.classList.toggle("secili"); });

/* ================= BİLDİRİM AYARLARI EKRANI ================= */
function ayarBildirim(){
  const a = bildirimAyar(), izin = window.Notification ? Notification.permission : "yok";
  const anahtar = (yol_, ad, v, alt) => '<label class="satir" style="cursor:pointer"><span class="orta"><div class="s1">' + ad + '</div>' + (alt ? '<div class="s2" style="white-space:normal">' + alt + '</div>' : '') + '</span>' +
    '<span class="anahtar"><input type="checkbox" data-bayar="' + yol_ + '"' + (v ? ' checked' : '') + '><i></i></span></label>';
  const hatAd = {teslim:"Teslim tarihi yaklaşan / geciken işler", randevu:"Randevu hatırlatma ve çakışmaları", tahsilat:"Tahsilat ve vade", cek:"Çek / senet vadeleri", stok:"Azalan stok", arac:"Araç muayene, sigorta, bakım", personel:"Puantaj ve maaş", teklif:"Süresi dolan teklifler", sabit:"Sabit giderler (kira, fatura, SGK)"};
  return '<div class="kart">' + kartBaslik("Telefon / masaüstü bildirimi") +
      '<div class="alt-bilgi" style="margin:0 0 6px">' + (izin === "granted" ? "Bu cihazda bildirim izni var. Uygulama açıkken (arka planda da olsa) yeni gelişmeler bildirilir." :
        izin === "denied" ? "Bildirimler tarayıcı / telefon ayarlarından engellenmiş; site ayarlarından izin verin." : izin === "yok" ? "Bu tarayıcı bildirim desteklemiyor." : "Bildirim almak için izin verin.") +
        ' Uygulama tamamen kapalıyken bildirim için sunucu tarafı bildirim hizmeti gerekir.</div>' +
      (izin === "default" ? '<button class="buton ikincil" data-is="bildirimIzni">' + ik("zil") + 'Bildirimlere izin ver</button>' : '') +
      anahtar("telefon", "Telefon / masaüstü bildirimi", a.telefon, "Uygulama arka plandayken") + anahtar("anlik", "Ekranda kısa uyarı", a.anlik, "Uygulama açıkken sağ altta") + anahtar("ses", "Sesli uyarı", a.ses) +
      anahtar("gunlukOzet", "Günlük acil işler özeti", a.gunlukOzet, "Günün ilk açılışında tek bildirim") +
      '<div class="iki-alan"><div><label class="etiket" for="bsBas">Sessiz saatler başlangıcı</label><input id="bsBas" type="time" class="kutu" value="' + esc(a.sessizBas) + '"></div>' +
        '<div><label class="etiket" for="bsBit">Bitişi</label><input id="bsBit" type="time" class="kutu" value="' + esc(a.sessizBit) + '"></div></div>' +
      '<div class="alt-bilgi">Sessiz saatlerde ses ve telefon bildirimi verilmez; bildirim merkezine yine düşer.</div>' +
      '<div class="buton-sira"><button class="buton ikincil kucuk" style="margin:0" data-is="bildirimTest">' + ik("zil") + 'Deneme bildirimi</button></div></div>' +
    '<div class="kart">' + kartBaslik("Kimin ne yaptığı", "(diğer kullanıcıların işlemleri)") +
      Object.entries(BILDIRIM_TUR).map(([k, v]) => anahtar("kategori." + k, v[0], a.kategori[k])).join("") + '</div>' +
    '<div class="kart">' + kartBaslik("Yapılacaklar", "(bu cihazda gösterilecek hatırlatmalar)") +
      Object.entries(hatAd).map(([k, v]) => anahtar("hatirlatma." + k, v, a.hatirlatma[k])).join("") + '</div>' + pushKarti();
}
document.addEventListener("change", e => {
  const k = e.target.getAttribute && e.target.getAttribute("data-bayar"); if(!k) return;
  const a = bildirimAyar(), [ust, alt] = k.split(".");
  if(alt) a[ust] = Object.assign({}, a[ust], {[alt]:e.target.checked}); else a[ust] = e.target.checked;
  cihazKaydet({bildirim:a}); zilGuncelle(); pushTercihGuncelle(); bildir("Kaydedildi");
});
document.addEventListener("change", e => {
  if(e.target.id !== "bsBas" && e.target.id !== "bsBit") return;
  cihazKaydet({bildirim:Object.assign(bildirimAyar(), {sessizBas:deger("bsBas"), sessizBit:deger("bsBit")})}); pushTercihGuncelle(); bildir("Kaydedildi");
});

/* ================= DEPOLAMA KULLANIMI ================= */
// Supabase ücretsiz plan: veritabanı 500 MB, dosya deposu 1 GB. Dosyalar kayıtlardaki boyuttan, veri JSON boyutundan yaklaşık hesaplanır.
function depolamaKarti(){
  if(!cevrimici) return '';
  const dosya = veri.dosyalar.concat(veri.katalog_gorseller).reduce((t, d) => t + (d.boyut || 0), 0);
  let kayit = 0; TABLOLAR.forEach(t => { kayit += veri[t].length; });
  const vt = new Blob([JSON.stringify(veri)]).size * 2.2;   // tablo, dizin ve sürüm sütunları için pay
  const cubuk = (ad, v, sinir) => { const y = Math.min(100, v / sinir * 100);
    return '<div class="hedef"><div class="cubuk-ust"><span>' + ad + '</span><span><b>' + mbYaz(v).replace(/^1 MB$/, v < 1048576 ? "< 1 MB" : "1 MB") + '</b> <span class="t-soluk">/ ' + mbYaz(sinir) + ' · %' + Math.round(y) + '</span></span></div>' +
      '<div class="hedef-yol"><div class="cubuk" style="width:' + Math.max(1.5, y) + '%;background:' + (y > 85 ? 'var(--cikis)' : y > 60 ? 'var(--ana)' : 'var(--giris)') + '"></div></div></div>'; };
  return '<div class="kart">' + kartBaslik("Depolama kullanımı", "(yaklaşık · Supabase ücretsiz plan sınırları)") +
    cubuk("Fotoğraf, video ve dosyalar", dosya, 1073741824) + cubuk("Veritabanı (" + kayit.toLocaleString("tr-TR") + " kayıt)", vt, 524288000) +
    '<div class="alt-bilgi">Sınıra yaklaşınca büyük videoları ZIP yedeğe alıp silebilir ya da Supabase Pro plana geçebilirsiniz. Ücretsiz projeler bir hafta hiç kullanılmazsa Supabase tarafından durdurulur; uygulamayı haftada en az bir kez açmanız yeterli.</div></div>';
}

/* ================= AYARLARDA ARAMA ================= */
// Her bölümün aranabilir anahtar kelimeleri
const AYAR_ANAHTAR = {firma:"firma adı telefon e-posta adres il ilçe vergi dairesi iban banka web instagram", ortaklar:"ortak samet ibrahim pay kâr payı kasa",
  teklif:"teklif fatura kdv oran önek numara geçerlilik kâr oranı not e-fatura e-arşiv entegratör", is:"aşama üretim keşif tesisat hatırlatma teslim vade müşteri bağlantısı süre",
  liste:"ödeme şekli nakit kart havale çek senet kategori gelir gider katalog birim malzeme fiyat listesi", personel:"personel çalışma günü saat mesai katsayı maaş",
  kullanicilar:"kullanıcı yetki usta yönetici hesap şifre giriş", gorunum:"tema koyu açık renk yazı boyutu açılış sayfası modül menü gizle sesli komut balon mikrofon liste satır",
  bildirim:"bildirim zil ses sessiz saat telefon uyarı yapılacaklar hatırlatma özet", guvenlik:"güvenlik pin kilit otomatik çıkış şifre", mesajlar:"mesaj şablon whatsapp sipariş onay randevu tahsilat kampanya tedarikçi",
  belge:"belge yazdır pdf teklif çıktısı logo imza iban fotoğraf alt bilgi başlık", takvim:"takvim randevu saat süre çalışma günü cumartesi pazar hatırlatma",
  yedek:"yedek geri yükle zip otomatik günlük indir ayar aktar depolama kullanım veritabanı durumu", cop:"çöp kutusu silinen geri yükle", gecmis:"işlem geçmişi log kim ne zaman",
  hedef:"hedef ciro kâr dönüşüm aylık", hesap:"hesap çıkış oturum cihaz", kapasite:"atölye kapasite ekip iş süresi teslim montaj gün",
  anasayfa:"ana sayfa kart sıra gizle düzen"};
