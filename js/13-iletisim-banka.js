"use strict";
// Güneş Mobilya — iletisim banka
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= SIRALI WHATSAPP GÖNDERİMİ ================= */
// Tarayıcı aynı anda çok pencere açtırmaz: kişiler tek tek gösterilir, "Gönder ve sıradaki" ile ilerlenir.
// l: [{tel, ad, metin, kimlik}] · o.gonderildi(kimlik) her gönderimde çağrılır
function siraliWhatsapp(baslik, l, o = {}){
  if(!l.length) return;
  let i = 0, gonderilen = 0;
  const p = document.createElement("div"); p.className = "perde";
  const ciz_ = () => {
    const x = l[i], tel = waNumara(x.tel);
    p.innerHTML = '<div class="pencere" style="max-width:520px"><p>' + esc(baslik) + ' · ' + (i + 1) + ' / ' + l.length + '</p>' +
      '<div class="ilerleme" style="margin:6px 0 10px"><i style="width:' + Math.round(i / l.length * 100) + '%"></i></div>' +
      '<div class="alt-bilgi">Alıcı: <b>' + esc(x.ad) + '</b>' + (tel ? ' · +' + tel : ' · <span class="t-cikis">telefon yok</span>') + '</div>' +
      '<textarea id="swMetin" class="kutu" style="min-height:170px;margin-top:10px">' + esc(x.metin) + '</textarea>' +
      '<div class="buton-sira"><button class="buton ikincil" data-c="bitir">Bitir (' + gonderilen + ' gönderildi)</button><button class="buton ikincil" data-c="atla">Atla</button>' +
      '<button class="buton wa-buton" data-c="gonder"' + (tel ? '' : ' disabled') + '>' + ik("mesaj") + 'Gönder' + (i < l.length - 1 ? ' ve sıradaki' : '') + '</button></div></div>';
  };
  const sonraki = () => { i++; if(i >= l.length){ p.remove(); bildir(gonderilen + " mesaj hazırlandı"); if(o.bitti) o.bitti(gonderilen); } else ciz_(); };
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b) return;
    const c = b.getAttribute("data-c");
    if(c === "bitir"){ p.remove(); if(o.bitti) o.bitti(gonderilen); return; }
    if(c === "gonder"){ window.open("https://wa.me/" + waNumara(l[i].tel) + "?text=" + encodeURIComponent(p.querySelector("#swMetin").value), "_blank", "noopener"); gonderilen++; if(o.gonderildi) o.gonderildi(l[i].kimlik); }
    sonraki();
  });
  ciz_(); document.body.appendChild(p);
}
// Kime ne zaman hatırlatma / kampanya gönderildi: ayarlar "hatirlatmaGecmisi" {tahsilat:{musteriId:ms}, kampanya:{…}}
function gonderimGecmisi(tur){ const a = veri.ayarlar.find(x => x.anahtar === "hatirlatmaGecmisi"); return (a && a.deger && a.deger[tur]) || {}; }
async function gonderimKaydet(tur, idler){
  if(!idler.length) return;
  const a = veri.ayarlar.find(x => x.anahtar === "hatirlatmaGecmisi"), d = Object.assign({}, a && a.deger || {});
  d[tur] = Object.assign({}, d[tur] || {}); idler.forEach(id => { d[tur][id] = Date.now(); });
  logSessiz++; try{ await Depo.kaydet("ayarlar", {anahtar:"hatirlatmaGecmisi", deger:d}); } finally { logSessiz--; }
  logla("dosya", "musteriler", "", (tur === "tahsilat" ? "Tahsilat hatırlatması" : "Kampanya mesajı") + ": " + idler.length + " müşteri");
}
const sablonDoldur = (m, d) => m.replace(/\{(\w+)\}/g, (x, a) => d[a] != null ? d[a] : x);

/* ================= TOPLU TAHSİLAT HATIRLATMASI ================= */
// Müşteri başına: bakiye, vadesi geçen fatura / taksitler ve en eski gecikme
function alacakListesi(){
  const bg = bugun();
  return veri.musteriler.filter(m => m.tip !== "tedarikci").map(m => {
    const bakiye = cariBakiye(m.id); if(!(bakiye > 0)) return null;
    const geciken = [];
    veri.faturalar.filter(f => f.musteriId === m.id && f.tur === "satis").forEach(f => {
      const tk = taksitDurumu(f);
      if(tk.length) tk.filter(t => t.kalan > 0 && t.vade < bg).forEach(t => geciken.push({ad:f.no + " " + taksitAdi(t), tutar:t.kalan, vade:t.vade}));
      else { const od = odemeDurumu(f); if(od.kalan > 0 && f.vade && f.vade < bg) geciken.push({ad:f.no, tutar:od.kalan, vade:f.vade}); }
    });
    const enEski = geciken.reduce((a, g) => !a || g.vade < a ? g.vade : a, "");
    return {m, bakiye, geciken, gecikenToplam:yuvarla(geciken.reduce((t, g) => t + g.tutar, 0)), gun: enEski ? Math.round((tarihOku(bg) - tarihOku(enEski)) / 86400000) : 0};
  }).filter(Boolean).sort((a, b) => b.gun - a.gun || b.bakiye - a.bakiye);
}
const TAHSILAT_SABLON = "Merhaba {ad},\nhesabınızda {tutar} tutarında ödenmemiş bakiye bulunmaktadır.{gecikme}\nUygun olduğunuzda ödeme yapabilirseniz seviniriz.{iban}\n\n{firma}";
function ekranTahsilat(){
  const f = filtre.tahsilat || "geciken", l = alacakListesi().filter(x => f === "hepsi" || x.geciken.length), gecmis = gonderimGecmisi("tahsilat");
  if(!filtre.tahsilatSecili) filtre.tahsilatSecili = {};
  const sec = filtre.tahsilatSecili, sablon = filtre.tahsilatSablon || mesajSablonu("tahsilat");
  l.forEach(x => { if(sec[x.m.id] === undefined) sec[x.m.id] = !!x.m.telefon && !(gecmis[x.m.id] && Date.now() - gecmis[x.m.id] < 3 * 86400000); });
  const toplam = l.reduce((t, x) => t + x.bakiye, 0), secili = l.filter(x => sec[x.m.id]);
  const html = '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Alacaklı müşteri</div><div class="deger">' + l.length + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Toplam alacak</div><div class="deger t-borc">' + para(toplam) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Vadesi geçen</div><div class="deger t-cikis">' + para(l.reduce((t, x) => t + x.gecikenToplam, 0)) + '</div></div></div>' +
    '<div class="ust-arac">' + filtreButonlari("tahsilat", [["geciken", "Vadesi geçenler"], ["hepsi", "Tüm alacaklılar"]]) +
      '<button class="buton kucuk wa-buton" data-is="tahsilatGonder"' + (secili.length ? '' : ' disabled') + '>' + ik("mesaj") + secili.length + ' kişiye sırayla gönder</button></div>' +
    '<div class="kart liste-kart">' + (l.length ? l.map(x => '<label class="satir" style="cursor:pointer"><input type="checkbox" data-tsec="' + x.m.id + '"' + (sec[x.m.id] ? ' checked' : '') + (x.m.telefon ? '' : ' disabled') + ' style="width:20px;height:20px">' +
      '<span class="orta"><div class="s1">' + esc(x.m.ad) + '</div><div class="s2">' + esc([x.m.telefon || "telefon yok", x.geciken.length ? x.geciken.length + " gecikmiş ödeme · " + x.gun + " gün" : "vadesi gelmemiş",
        gecmis[x.m.id] ? "son hatırlatma " + tarihYaz(tarihStr(new Date(gecmis[x.m.id])), true) : ""].filter(Boolean).join(" · ")) + '</div></span>' +
      '<span class="sag"><div class="tutar t-borc">' + para(x.bakiye) + '</div>' + (x.gecikenToplam ? '<div class="s2 t-cikis">gecikmiş ' + para(x.gecikenToplam) + '</div>' : '') + '</span></label>').join("") : bos("kisiler", "Alacaklı müşteri yok.")) + '</div>' +
    '<div class="kart">' + kartBaslik("Mesaj şablonu", "({ad} {tutar} {gecikme} {iban} {firma} yerine bilgiler gelir)") +
      '<textarea id="tsSablon" class="kutu" style="min-height:130px">' + esc(sablon) + '</textarea><button class="baglanti" data-is="tahsilatSablonSifirla">Varsayılan şablona dön</button></div>';
  return {baslik:"Toplu tahsilat hatırlatması", geri:true, html, sonra(){
    document.querySelectorAll("[data-tsec]").forEach(c => c.addEventListener("change", () => { sec[c.getAttribute("data-tsec")] = c.checked; const y = window.scrollY; ciz(); window.scrollTo(0, y); }));
    const t = document.getElementById("tsSablon"); t.addEventListener("input", () => { filtre.tahsilatSablon = t.value; });
  }};
}
EYLEM.tahsilatSablonSifirla = () => { filtre.tahsilatSablon = mesajSablonu("tahsilat"); ciz(); };
EYLEM.tahsilatGonder = () => {
  const f = filtre.tahsilat || "geciken", fr = firma(), sablon = filtre.tahsilatSablon || mesajSablonu("tahsilat");
  const l = alacakListesi().filter(x => (f === "hepsi" || x.geciken.length) && filtre.tahsilatSecili[x.m.id] && x.m.telefon);
  const gonderilen = [];
  siraliWhatsapp("Tahsilat hatırlatması", l.map(x => ({tel:x.m.telefon, ad:x.m.ad, kimlik:x.m.id, metin:sablonDoldur(sablon, {ad:x.m.ad, tutar:para(x.bakiye), firma:FIRMA,
    gecikme: x.geciken.length ? "\nVadesi geçen: " + x.geciken.map(g => g.ad + " " + para(g.tutar) + " (vade " + tarihYaz(g.vade, true) + ")").join(", ") : "",
    iban: fr.iban ? "\nIBAN: " + fr.iban + (fr.banka ? " (" + fr.banka + ")" : "") + " · " + FIRMA : ""})})),
    {gonderildi:id => gonderilen.push(id), bitti:() => gonderimKaydet("tahsilat", gonderilen).then(() => ciz()).catch(() => {})});
};

/* ================= BANKA EKSTRESİ EŞLEŞTİRME ================= */
// Bankanın Excel / CSV ekstresi okunur; gelen paralar müşteri ve açık faturayla, gidenler tedarikçiyle eşleştirilmeye çalışılır.
let ekstre = null;
function sayiCoz(v){
  if(typeof v === "number") return v;
  let t = String(v == null ? "" : v).replace(/[^\d,.\-]/g, "");
  if(!t) return NaN;
  const v_ = t.indexOf(","), n_ = t.indexOf(".");
  // Tek tür ayraç varsa: arkasından hep 3'lü gruplar geliyorsa binlik ayracıdır (6.000 · 1.250.000), değilse ondalık (12,5 · 12.5)
  const binlik = (x, ay) => x.split(ay).slice(1).every(g => g.length === 3);
  if(v_ >= 0 && n_ >= 0){ if(t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/,/g, ""); }   // 1.234,56 · 1,234.56
  else if(n_ >= 0){ if(binlik(t, ".") && (t.split(".").length > 2 || !/^-?0\./.test(t))) t = t.replace(/\./g, ""); }
  else if(v_ >= 0){ t = binlik(t, ",") && t.split(",").length > 2 ? t.replace(/,/g, "") : t.replace(",", "."); }
  return Number(t);
}
function tarihCoz(v){
  if(v instanceof Date) return tarihStr(v);
  if(typeof v === "number" && v > 20000 && v < 80000){ const d = new Date(Math.round((v - 25569) * 86400000)); return tarihStr(new Date(d.getTime() + d.getTimezoneOffset() * 60000)); }   // Excel gün sayısı
  const s = String(v || "").trim(); let m;
  if((m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s))) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  if((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return m[0];
  return "";
}
function ekstreOku(satirlar){
  // Başlık satırını bul: tarih + açıklama + (tutar | borç / alacak)
  const ad = x => sade(String(x || "")).trim();
  let bi = -1, kol = {};
  for(let i = 0; i < Math.min(satirlar.length, 40); i++){
    const r = satirlar[i].map(ad), bul_ = re => r.findIndex(x => re.test(x));
    const k = {tarih:bul_(/^(islem )?tarih|^valor|^date/), aciklama:bul_(/aciklama|açıklama|islem detay|description|detay/), tutar:bul_(/^(islem )?tutar|^tutar|^amount|^miktar/), borc:bul_(/^borc|cikis|giden/), alacak:bul_(/^alacak|giris|gelen/)};
    if(k.tarih >= 0 && k.aciklama >= 0 && (k.tutar >= 0 || k.borc >= 0 || k.alacak >= 0)){ bi = i; kol = k; break; }
  }
  if(bi < 0) throw new Error("Ekstrede “Tarih”, “Açıklama” ve “Tutar” (veya “Borç / Alacak”) sütunları bulunamadı.");
  const l = [];
  satirlar.slice(bi + 1).forEach((r, i) => {
    const tarih = tarihCoz(r[kol.tarih]); if(!tarih) return;
    let tutar = kol.tutar >= 0 ? sayiCoz(r[kol.tutar]) : (sayiCoz(r[kol.alacak]) || 0) - (sayiCoz(r[kol.borc]) || 0);
    if(!isFinite(tutar) || !tutar) return;
    l.push({id:"e" + i, tarih, aciklama:String(r[kol.aciklama] || "").trim(), tutar:yuvarla(tutar)});
  });
  return l;
}
function ekstreEslestir(l){
  const musteriler = veri.musteriler.map(m => ({m, kelimeler:sade(m.ad).split(/[^a-z0-9]+/).filter(k => k.length >= 3)}));
  return l.map(x => {
    const ac = sade(x.aciklama), gelen = x.tutar > 0, tutar = Math.abs(x.tutar);
    // Zaten kayıtlı mı? (aynı tutar, ±3 gün, nakit dışı)
    const kayitli = veri.hareketler.find(h => h.tur === (gelen ? "giris" : "cikis") && Math.abs(h.tutar - tutar) < 0.01 && h.odeme !== "Nakit" &&
      Math.abs(tarihOku(h.tarih) - tarihOku(x.tarih)) <= 3 * 86400000);
    let en = null;
    musteriler.forEach(c => {
      if(gelen === (c.m.tip === "tedarikci")) return;
      const isim = c.kelimeler.filter(k => ac.indexOf(k) >= 0).length; if(!isim) return;
      let puan = isim / Math.max(1, c.kelimeler.length) * 60 + isim * 10;
      const acik = veri.faturalar.filter(f => f.musteriId === c.m.id && f.tur === (gelen ? "satis" : "alis") && odemeDurumu(f).kalan > 0);
      const fatura = acik.find(f => Math.abs(odemeDurumu(f).kalan - tutar) < 0.01);
      if(fatura) puan += 30; else if(Math.abs(Math.abs(cariBakiye(c.m.id)) - tutar) < 0.01) puan += 20;
      if(!en || puan > en.puan) en = {puan, musteriId:c.m.id, faturaId:fatura ? fatura.id : ""};
    });
    // İsim yoksa: tutarı tam tutan tek açık fatura
    if(!en){
      const f = veri.faturalar.filter(f => f.tur === (gelen ? "satis" : "alis") && Math.abs(odemeDurumu(f).kalan - tutar) < 0.01);
      if(f.length === 1) en = {puan:35, musteriId:f[0].musteriId, faturaId:f[0].id};
    }
    return Object.assign({}, x, {gelen, kayitli:kayitli ? kayitli.id : "", musteriId:en ? en.musteriId : "", faturaId:en ? en.faturaId : "", guven:en ? Math.min(100, Math.round(en.puan)) : 0,
      sec: !kayitli && !!en && en.puan >= 50 && gelen});
  });
}
function ekranEkstre(){
  const l = ekstre && ekstre.satirlar;
  const cariSec = (x) => '<select class="kutu ek-cari" data-e="' + x.id + '"><option value="">— Cari yok —</option>' + veri.musteriler.filter(m => x.gelen ? m.tip !== "tedarikci" : true).sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
    .map(m => '<option value="' + m.id + '"' + (m.id === x.musteriId ? ' selected' : '') + '>' + esc(m.ad) + '</option>').join("") + '</select>';
  const faturaSec = (x) => { const f = veri.faturalar.filter(f => f.musteriId === x.musteriId && f.tur === (x.gelen ? "satis" : "alis") && odemeDurumu(f).kalan > 0);
    return '<select class="kutu ek-fatura" data-e="' + x.id + '"><option value="">— Faturasız —</option>' + f.map(f => '<option value="' + f.id + '"' + (f.id === x.faturaId ? ' selected' : '') + '>' + esc(f.no + " · kalan " + para(odemeDurumu(f).kalan)) + '</option>').join("") + '</select>'; };
  const html = '<div class="kart">' + kartBaslik("Banka ekstresi yükle") +
      '<div class="alt-bilgi" style="margin:0 0 8px">Bankanızın internet şubesinden hesap hareketlerini <b>Excel (.xlsx / .xls)</b> veya <b>CSV</b> olarak indirip buraya yükleyin. Gelen havaleler müşteri adı ve açık fatura tutarına göre eşleştirilir; zaten kasada kayıtlı olanlar işaretlenir.</div>' +
      '<div class="buton-sira" style="margin:0"><button class="buton kucuk" onclick="document.getElementById(\'ekstreDosya\').click()">' + ik("yukle") + 'Ekstre seç</button>' +
      (l ? '<span class="alt-bilgi" style="margin:0;align-self:center">' + esc(ekstre.ad) + ' · ' + l.length + ' hareket</span>' : '') + '</div>' +
      '<input type="file" id="ekstreDosya" accept=".xlsx,.xls,.csv,.txt" style="display:none" onchange="ekstreYukle(this)">' +
      (ortaklar().length ? '<label class="etiket">Hangi hesap? <span class="ist">(kasada kimin hesabı)</span></label>' + secenekler("ekHesap", ["Kasa"].concat(ortaklar().map(o => o.ad)), ekstre && ekstre.hesap || "Kasa") : '') + '</div>' +
    (l ? '<div class="ust-arac">' + filtreButonlari("ekstre", [["gelen", "Gelen (" + l.filter(x => x.gelen).length + ")"], ["giden", "Giden (" + l.filter(x => !x.gelen).length + ")"], ["hepsi", "Hepsi"]]) +
        '<button class="buton kucuk" data-is="ekstreKaydet">' + ik("tamam") + 'Seçilenleri kasaya işle (' + l.filter(x => x.sec).length + ')</button></div>' +
      '<div class="kart" style="overflow:auto"><table class="kesim-ozet ekstre-tablo"><thead><tr><th></th><th>Tarih</th><th>Açıklama</th><th>Tutar</th><th>Cari</th><th>Fatura</th><th>Durum</th></tr></thead><tbody>' +
      l.filter(x => (filtre.ekstre || "gelen") === "hepsi" || (filtre.ekstre || "gelen") === (x.gelen ? "gelen" : "giden")).map(x => '<tr class="' + (x.kayitli ? 'soluk' : '') + '"><td><input type="checkbox" class="ek-sec" data-e="' + x.id + '"' + (x.sec ? ' checked' : '') + (x.kayitli ? '' : '') + ' style="width:18px;height:18px"></td>' +
        '<td style="white-space:nowrap">' + tarihYaz(x.tarih, true) + '</td><td style="min-width:200px">' + esc(x.aciklama) + '</td><td class="' + (x.gelen ? 't-giris' : 't-cikis') + '" style="white-space:nowrap;font-weight:600">' + (x.gelen ? "+" : "−") + para(Math.abs(x.tutar)) + '</td>' +
        '<td style="min-width:170px">' + cariSec(x) + '</td><td style="min-width:150px">' + (x.musteriId ? faturaSec(x) : '') + '</td>' +
        '<td style="white-space:nowrap">' + (x.kayitli ? '<span class="etiket-rozet d-gri">Kasada var</span>' : x.musteriId ? '<span class="etiket-rozet ' + (x.guven >= 70 ? 'd-yesil' : 'd-sari') + '">Eşleşme %' + x.guven + '</span>' : '<span class="etiket-rozet d-gri">Eşleşmedi</span>') + '</td></tr>').join("") +
      '</tbody></table></div>' : '');
  return {baslik:"Banka ekstresi", geri:true, html, sonra(){
    secenekBagla();
    document.querySelectorAll(".secenekler[data-ad=ekHesap] .secenek").forEach(b => b.addEventListener("click", () => { if(ekstre) ekstre.hesap = b.getAttribute("data-deger"); }));
    const satir = id => ekstre.satirlar.find(x => x.id === id);
    document.querySelectorAll(".ek-sec").forEach(c => c.addEventListener("change", () => { satir(c.getAttribute("data-e")).sec = c.checked; }));
    document.querySelectorAll(".ek-cari").forEach(c => c.addEventListener("change", () => { const x = satir(c.getAttribute("data-e")); x.musteriId = c.value; x.faturaId = ""; x.guven = 100; x.sec = !!c.value && !x.kayitli; const y = window.scrollY; ciz(); window.scrollTo(0, y); }));
    document.querySelectorAll(".ek-fatura").forEach(c => c.addEventListener("change", () => { satir(c.getAttribute("data-e")).faturaId = c.value; }));
  }};
}
async function ekstreYukle(input){
  const f = input.files && input.files[0]; input.value = ""; if(!f) return;
  try{
    yuklemeGoster("Ekstre okunuyor…");
    const X = await kutuphane("xlsx");
    const wb = /\.(csv|txt)$/i.test(f.name) ? X.read(await f.text(), {type:"string", raw:true, cellDates:true}) : X.read(await f.arrayBuffer(), {type:"array", cellDates:true});
    const ws = wb.Sheets[wb.SheetNames[0]], satirlar = X.utils.sheet_to_json(ws, {header:1, raw:true, defval:""});
    const l = ekstreOku(satirlar);
    ekstre = {ad:f.name, satirlar:ekstreEslestir(l), hesap:(ekstre && ekstre.hesap) || "Kasa"};
    filtre.ekstre = "gelen"; ciz();
    bildir(l.length + " hareket okundu, " + ekstre.satirlar.filter(x => x.musteriId && !x.kayitli).length + " eşleşme");
  }catch(e){ uyar("Ekstre okunamadı", hataMesaji(e).replace(/^Bir sorun oldu: /, "")); }
  finally{ yuklemeKapat(); }
}
EYLEM.ekstreKaydet = btn => {
  const l = ekstre.satirlar.filter(x => x.sec);
  if(!l.length) return uyar("Seçili hareket yok", "Kasaya işlenecek satırları işaretleyin.");
  const ortak = (ortaklar().find(o => o.ad === ekstre.hesap) || {}).id || "";
  const kayitli = l.filter(x => x.kayitli).length;
  onayla(l.length + " hareket kasaya işlensin mi?", (kayitli ? kayitli + " tanesi kasada zaten var gibi görünüyor; iki kez işlenebilir. " : "") + "Ödeme şekli “Havale” olarak işlenir.", "Kasaya işle", () => islem(btn, async () => {
    await Depo.kaydet("hareketler", l.map((x, i) => ({id:yeniId(), tur:x.gelen ? "giris" : "cikis", tutar:Math.abs(x.tutar), kategori: x.gelen ? (x.musteriId ? "Cari Tahsilat" : (kategoriler("giris")[0])) : (x.musteriId ? "Tedarikçi Ödemesi" : "Genel Giderler"),
      odeme:ODEME.indexOf("Havale") >= 0 ? "Havale" : ODEME[1] || "Havale", musteriId:x.musteriId || null, isEmriId:x.faturaId ? (bul("faturalar", x.faturaId) || {}).isEmriId || null : null, faturaId:x.faturaId || null,
      aciklama:"Banka: " + x.aciklama.slice(0, 150), tarih:x.tarih, olusma:Date.now() + i, ortak, hedef:""})));
    ekstre.satirlar = ekstreEslestir(ekstre.satirlar.map(x => ({id:x.id, tarih:x.tarih, aciklama:x.aciklama, tutar:x.tutar})));
    bildir(l.length + " hareket kasaya işlendi"); ciz();
  }), false);
};

/* ================= TEDARİKÇİ FİYAT KARŞILAŞTIRMA ================= */
// Kaynak: alış faturası kalemleri (malzeme adıyla eşleşenler) ve teslim alınan siparişler
function alisFiyatlari(){
  const ml = malzemeListesi(), sonuc = {};
  const ekle = (mid, tid, fiyat, tarih, kaynak) => { if(!mid || !tid || !(fiyat > 0)) return; const m = sonuc[mid] || (sonuc[mid] = {}); const t = m[tid] || (m[tid] = []); t.push({fiyat, tarih, kaynak}); };
  const anahtarlar = ml.map(m => ({m, k:sade(m.ad).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(x => x.length >= 2)}));
  veri.faturalar.filter(f => f.tur === "alis").forEach(f => (f.kalemler || []).forEach(k => {
    const ad = sade(k.ad);
    const m = anahtarlar.filter(a => a.k.length && a.k.every(x => ad.indexOf(x) >= 0)).sort((a, b) => b.k.length - a.k.length)[0];
    if(m) ekle(m.m.id, f.musteriId, Number(k.fiyat), f.tarih, "Fatura " + f.no);
  }));
  veri.siparisler.forEach(s => s.kalemler.forEach(k => { if(k.gelen > 0) ekle(k.malzemeId, s.tedarikciId, Number(k.fiyat), s.tarih, "Sipariş " + s.no); }));
  return sonuc;
}
function enUcuzTedarikci(mid, af){
  const m = (af || alisFiyatlari())[mid]; if(!m) return null;
  const l = Object.entries(m).map(([tid, x]) => { const son = x.slice().sort((a, b) => a.tarih < b.tarih ? 1 : -1)[0]; return {tid, son}; }).sort((a, b) => a.son.fiyat - b.son.fiyat);
  return l.length ? {en:l[0], hepsi:l} : null;
}
function ekranFiyatKarsilastir(){
  const ml = malzemeListesi(), af = alisFiyatlari(), ara = trKucuk(filtre.fkAra || "");
  const l = ml.filter(m => af[m.id] && (!ara || trKucuk(m.ad).indexOf(ara) >= 0)).map(m => ({m, e:enUcuzTedarikci(m.id, af)}));
  const tasarruf = l.reduce((t, x) => { const sec = x.e.hepsi.find(y => y.tid === x.m.tedarikciId); return t + (sec && sec.son.fiyat > x.e.en.son.fiyat ? 1 : 0); }, 0);
  const html = '<div class="alt-bilgi" style="margin:0 2px 10px">Alış faturalarındaki kalem adları malzeme listesindeki adlarla eşleştirilir; teslim alınan siparişlerin fiyatları da eklenir. Fiyatlar KDV hariç birim fiyattır.</div>' +
    (tasarruf ? '<div class="uyari">' + tasarruf + ' malzemede kayıtlı tedarikçiniz en ucuz değil.</div>' : '') +
    '<div class="ara" style="margin-bottom:12px">' + ik("ara") + '<input id="fkAra" class="kutu" placeholder="Malzeme ara…" value="' + esc(filtre.fkAra || "") + '"></div>' +
    (l.length ? l.map(x => '<div class="kart">' + kartBaslik(esc(x.m.ad) + ' <span class="ist">/ ' + esc(x.m.birim) + '</span>', x.m.fiyat ? "listedeki maliyet " + para(x.m.fiyat) : "") +
      '<table class="kesim-ozet"><thead><tr><th>Tedarikçi</th><th>Son fiyat</th><th>Tarih</th><th>Alım</th><th>En düşük / en yüksek</th><th></th></tr></thead><tbody>' +
      x.e.hepsi.map((y, i) => { const tum = af[x.m.id][y.tid].map(z => z.fiyat), fark = i ? Math.round((y.son.fiyat / x.e.en.son.fiyat - 1) * 100) : 0;
        return '<tr' + (i === 0 ? ' class="en-ucuz"' : '') + '><td><b>' + esc(cariAdi(y.tid)) + '</b>' + (y.tid === x.m.tedarikciId ? ' <span class="etiket-rozet d-gri">kayıtlı</span>' : '') + '</td><td><b>' + para(y.son.fiyat) + '</b>' +
          (i === 0 && x.e.hepsi.length > 1 ? ' <span class="etiket-rozet d-yesil">en ucuz</span>' : fark ? ' <span class="t-cikis">+%' + fark + '</span>' : '') + '</td><td>' + tarihYaz(y.son.tarih, true) + '</td><td>' + tum.length + '</td><td>' + para(Math.min(...tum)) + ' / ' + para(Math.max(...tum)) + '</td>' +
          '<td>' + (y.tid !== x.m.tedarikciId ? '<button class="baglanti" style="margin:0" data-is="fkTedarikci" data-arg="' + x.m.id + '|' + y.tid + '">Tedarikçi yap</button>' : '') + '</td></tr>'; }).join("") +
      '</tbody></table></div>').join("") : '<div class="kart">' + bos("koli", "Karşılaştırılacak alış fiyatı bulunamadı. Alış faturası kalem adlarını malzeme listesindeki adlarla yazın veya siparişleri uygulamadan verip teslim alın.") + '</div>');
  return {baslik:"Tedarikçi fiyat karşılaştırma", geri:true, html, sonra(){ const a = document.getElementById("fkAra"); let z; a.addEventListener("input", () => { clearTimeout(z); z = setTimeout(() => { filtre.fkAra = a.value; const p = a.selectionStart; ciz(); const y = document.getElementById("fkAra"); y.focus(); y.setSelectionRange(p, p); }, 300); }); }};
}
EYLEM.fkTedarikci = (el, arg) => {
  const [mid, tid] = arg.split("|");
  islem(el, async () => { await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:malzemeListesi().map(m => m.id === mid ? Object.assign({}, m, {tedarikciId:tid}) : m)}); bildir("Tedarikçi değiştirildi"); ciz(); });
};

/* ================= MÜŞTERİ KAMPANYASI ================= */
const KAMPANYA_SABLON = "Merhaba {ad},\n{yil} yılında {is} işinizi yapmıştık, umarız memnun kalmışsınızdır. Yeni katalog ve kampanyalarımızı görmek için bizi ziyaret edebilir ya da bu mesaja yazabilirsiniz.{baglanti}\n\n{firma}";
function kampanyaListesi(){
  const f = filtre.kampanya || {yil:2, tur:"", aktifHaric:true};
  const sinir = gunEkle(bugun(), -Math.round((Number(f.yil) || 0) * 365));
  return veri.musteriler.filter(m => m.tip !== "tedarikci" && m.telefon).map(m => {
    const isler = veri.is_emirleri.filter(ie => ie.musteriId === m.id && ie.durum !== "İptal" && ie.durum !== "Teklif").sort((a, b) => b.olusma - a.olusma);
    if(!isler.length) return null;
    const son = isler[0], sonTarih = tarihStr(new Date(son.olusma));
    if(f.tur && !isler.some(ie => isTuru(ie) === f.tur)) return null;
    if(sonTarih > sinir) return null;
    if(f.aktifHaric && isler.some(ac)) return null;
    return {m, son, sonTarih, sayi:isler.length};
  }).filter(Boolean).sort((a, b) => a.sonTarih < b.sonTarih ? -1 : 1);
}
function ekranKampanya(){
  if(!filtre.kampanya) filtre.kampanya = {yil:2, tur:"", aktifHaric:true, sablon:mesajSablonu("kampanya"), baglanti:"", secili:{}};
  const f = filtre.kampanya, l = kampanyaListesi(), gecmis = gonderimGecmisi("kampanya");
  l.forEach(x => { if(f.secili[x.m.id] === undefined) f.secili[x.m.id] = !(gecmis[x.m.id] && Date.now() - gecmis[x.m.id] < 90 * 86400000); });
  const secili = l.filter(x => f.secili[x.m.id]);
  const paylasim = veri.paylasimlar.filter(p => !paylasimBitti(p)).sort((a, b) => b.olusma - a.olusma);
  const html = '<div class="kart">' + kartBaslik("Kime?") +
      '<div class="izgara uc" style="margin:0"><div><label class="etiket" for="kmYil">Son işi en az kaç yıl önce?</label><select id="kmYil" class="kutu">' + [[0, "Hepsi"], [1, "1 yıl"], [2, "2 yıl"], [3, "3 yıl"], [5, "5 yıl"]].map(([v, a]) => '<option value="' + v + '"' + (v === Number(f.yil) ? ' selected' : '') + '>' + a + '</option>').join("") + '</select></div>' +
      '<div><label class="etiket" for="kmTur">İş türü</label><select id="kmTur" class="kutu"><option value="">Hepsi</option>' + isTurleri("").map(t => '<option' + (t === f.tur ? ' selected' : '') + '>' + esc(t) + '</option>').join("") + '</select></div>' +
      '<div><label class="etiket">&nbsp;</label><label style="display:flex;align-items:center;gap:8px;font-size:14px;padding-top:8px"><input type="checkbox" id="kmAktif"' + (f.aktifHaric ? ' checked' : '') + '> Devam eden işi olanlar hariç</label></div></div></div>' +
    '<div class="kart">' + kartBaslik("Mesaj", "({ad} {is} {yil} {baglanti} {firma})") +
      (paylasim.length ? '<label class="etiket" for="kmBag" style="margin-top:4px">Katalog bağlantısı ekle <span class="ist">(Katalog → Müşteriye gönder ile oluşturulanlar)</span></label><select id="kmBag" class="kutu"><option value="">— Yok —</option>' +
        paylasim.map(p => '<option value="' + p.id + '"' + (p.id === f.baglanti ? ' selected' : '') + '>' + esc(p.baslik || "Bağlantı") + '</option>').join("") + '</select>' : '<div class="alt-bilgi" style="margin:0 0 6px">Katalogdan “Müşteriye gönder” ile bağlantı oluşturursanız mesaja ekleyebilirsiniz.</div>') +
      '<textarea id="kmSablon" class="kutu" style="min-height:120px;margin-top:10px">' + esc(f.sablon) + '</textarea></div>' +
    '<div class="ust-arac"><b>' + l.length + ' müşteri</b><button class="buton kucuk wa-buton" data-is="kampanyaGonder"' + (secili.length ? '' : ' disabled') + '>' + ik("mesaj") + secili.length + ' kişiye sırayla gönder</button></div>' +
    '<div class="kart liste-kart">' + (l.length ? l.map(x => '<label class="satir" style="cursor:pointer"><input type="checkbox" data-ksec="' + x.m.id + '"' + (f.secili[x.m.id] ? ' checked' : '') + ' style="width:20px;height:20px">' +
      '<span class="orta"><div class="s1">' + esc(x.m.ad) + '</div><div class="s2">' + esc([x.son.baslik + " (" + isTuru(x.son) + ")", tarihYaz(x.sonTarih, true), x.sayi > 1 ? x.sayi + " iş" : "", gecmis[x.m.id] ? "son kampanya " + tarihYaz(tarihStr(new Date(gecmis[x.m.id])), true) : ""].filter(Boolean).join(" · ")) + '</div></span></label>').join("") :
      bos("kisiler", "Bu ölçütlere uyan müşteri yok.")) + '</div>';
  return {baslik:"Müşteri kampanyası", geri:true, html, sonra(){
    const y = () => { const s = window.scrollY; ciz(); window.scrollTo(0, s); };
    document.getElementById("kmYil").addEventListener("change", e => { f.yil = Number(e.target.value); y(); });
    document.getElementById("kmTur").addEventListener("change", e => { f.tur = e.target.value; y(); });
    document.getElementById("kmAktif").addEventListener("change", e => { f.aktifHaric = e.target.checked; y(); });
    const b = document.getElementById("kmBag"); if(b) b.addEventListener("change", () => { f.baglanti = b.value; });
    document.getElementById("kmSablon").addEventListener("input", e => { f.sablon = e.target.value; });
    document.querySelectorAll("[data-ksec]").forEach(c => c.addEventListener("change", () => { f.secili[c.getAttribute("data-ksec")] = c.checked; y(); }));
  }};
}
EYLEM.kampanyaGonder = () => {
  const f = filtre.kampanya, l = kampanyaListesi().filter(x => f.secili[x.m.id]), p = bul("paylasimlar", f.baglanti);
  const bag = p ? "\n" + paylasimLinki(p) : "", gonderilen = [];
  siraliWhatsapp("Kampanya", l.map(x => ({tel:x.m.telefon, ad:x.m.ad, kimlik:x.m.id, metin:sablonDoldur(f.sablon, {ad:x.m.ad, is:x.son.baslik.toLocaleLowerCase("tr"), yil:x.sonTarih.slice(0, 4), baglanti:bag, firma:FIRMA})})),
    {gonderildi:id => gonderilen.push(id), bitti:() => gonderimKaydet("kampanya", gonderilen).then(() => ciz()).catch(() => {})});
};

/* ================= ÖNCE / SONRA GÖRSELİ ================= */
const OS_BOY = {kare:[1080, 1080, "Kare (Instagram gönderi)"], dikey:[1080, 1920, "Dikey (hikâye / reels)"], yatay:[1600, 900, "Yatay (Facebook / web)"]};
let osForm = null;
function ekranOnceSonra(isId){
  const ie = bul("is_emirleri", isId);
  if(!ie) return {baslik:"Önce / sonra", geri:true, html:'<div class="kart">' + bos("is", "İş emri bulunamadı.") + '</div>'};
  const fotolar = isDosyalari(isId).filter(d => dosyaTuru(d) === "g");
  if(!osForm || osForm.isId !== isId) osForm = {isId, once:(fotolar[0] || {}).id || "", sonra:(fotolar[fotolar.length - 1] || {}).id || "", boy:"kare", yazi:ie.baslik};
  const f = osForm;
  const secici = (alan, baslik) => '<label class="etiket">' + baslik + '</label><div class="os-secici">' + fotolar.map(d => '<button class="foto' + (d.id === f[alan] ? ' os-secili' : '') + '" data-is="osSec" data-arg="' + alan + '|' + d.id + '" data-yol="' + esc(d.yol) + '"><img alt=""></button>').join("") + '</div>';
  const html = (!cevrimici ? '<div class="uyari">Fotoğraflar bulutta saklandığı için bu özellik bulut bağlantısıyla çalışır.</div>' : fotolar.length < 2 ? '<div class="kart">' + bos("resim", "Bu işte en az 2 fotoğraf olmalı (ölçü / keşifte çekilen “önce” ve teslimde çekilen “sonra”).") + '</div>' :
    '<div class="iki-sutun"><div class="kart">' + secici("once", "Önce (keşif) fotoğrafı") + secici("sonra", "Sonra (teslim) fotoğrafı") +
      '<label class="etiket">Boyut</label><div class="secenekler">' + Object.entries(OS_BOY).map(([k, v]) => '<button class="secenek' + (k === f.boy ? ' secili' : '') + '" data-is="osSec" data-arg="boy|' + k + '">' + v[2] + '</button>').join("") + '</div>' +
      '<label class="etiket" for="osYazi">Başlık</label><input id="osYazi" class="kutu" maxlength="60" value="' + esc(f.yazi) + '"></div>' +
    '<div class="kart"><canvas id="osTuval" class="os-tuval"></canvas><div class="hata" id="osHata"></div>' +
      '<div class="buton-sira"><button class="buton" data-is="osIndir">' + ik("indir") + 'Görseli indir</button><button class="buton ikincil" data-is="osPaylas">' + ik("mesaj") + 'Paylaş</button>' +
      '<button class="buton ikincil" data-is="osKataloga">' + ik("katalog") + 'Kataloğa ekle</button></div></div></div>');
  return {baslik:"Önce / sonra · " + ie.no, geri:true, html, sonra(){
    if(fotolar.length < 2 || !cevrimici) return;
    urlleriGetir(fotolar).then(() => {
      document.querySelectorAll(".os-secici [data-yol]").forEach(b => { const u = urlOnbellek[b.getAttribute("data-yol")]; if(u) b.querySelector("img").src = u.url; });
      osCiz();
    });
    const y = document.getElementById("osYazi"); let z; y.addEventListener("input", () => { f.yazi = y.value; clearTimeout(z); z = setTimeout(osCiz, 300); });
  }};
}
const resimYukle = url => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => rej(new Error("Fotoğraf yüklenemedi")); i.src = url; });
async function osCiz(){
  const c = document.getElementById("osTuval"); if(!c) return;
  const f = osForm, [W, H] = OS_BOY[f.boy], d1 = bul("dosyalar", f.once), d2 = bul("dosyalar", f.sonra);
  try{
    await urlleriGetir([d1, d2]); const [a, b, logo] = await Promise.all([resimYukle(urlOnbellek[d1.yol].url), resimYukle(urlOnbellek[d2.yol].url), resimYukle("logo-beyaz.png").catch(() => null)]);
    c.width = W; c.height = H; const g = c.getContext("2d");
    g.fillStyle = "#1c1917"; g.fillRect(0, 0, W, H);
    const dikey = H > W, bant = Math.round(H * (dikey ? .09 : .12)), bosluk = Math.round(W * .012);
    // İki fotoğraf: yatay ve karede yan yana, dikeyde üst üste; kırpılarak doldurulur
    const alan = dikey ? [[0, bant, W, (H - bant * 2 - bosluk) / 2], [0, bant + (H - bant * 2 - bosluk) / 2 + bosluk, W, (H - bant * 2 - bosluk) / 2]]
      : [[0, bant, (W - bosluk) / 2, H - bant * 2], [(W + bosluk) / 2, bant, (W - bosluk) / 2, H - bant * 2]];
    [[a, "ÖNCE"], [b, "SONRA"]].forEach(([im, et], i) => {
      const [x, y, w, h] = alan[i], o = Math.max(w / im.width, h / im.height), sw = w / o, sh = h / o;
      g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
      const fs = Math.round(Math.min(W, H) * .045);
      g.font = "700 " + fs + "px Inter, system-ui, sans-serif"; const tw = g.measureText(et).width;
      g.fillStyle = i ? getComputedStyle(document.documentElement).getPropertyValue("--ana").trim() || "#dc7e03" : "rgba(28,25,23,.85)";
      g.fillRect(x + fs * .6, y + fs * .6, tw + fs * 1.4, fs * 1.7);
      g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(et, x + fs * 1.2, y + fs * 1.45);
    });
    g.fillStyle = "#fff"; g.textBaseline = "middle";
    const bf = Math.round(bant * .36); g.font = "600 " + bf + "px Inter, system-ui, sans-serif";
    g.fillText((f.yazi || "").slice(0, 60), Math.round(W * .04), Math.round(bant / 2));
    if(logo){ const lh = bant * .55, lw = logo.width * lh / logo.height; g.drawImage(logo, W - lw - W * .04, H - bant + (bant - lh) / 2, lw, lh); }
    g.font = "400 " + Math.round(bant * .26) + "px Inter, system-ui, sans-serif"; g.fillStyle = "#d6d3d1";
    g.fillText([firma().telefon, firma().web].filter(Boolean).join("  ·  "), Math.round(W * .04), H - Math.round(bant / 2));
    document.getElementById("osHata").textContent = "";
  }catch(e){ const h = document.getElementById("osHata"); if(h) h.textContent = hataMesaji(e).replace(/^Bir sorun oldu: /, ""); }
}
EYLEM.osSec = (el, arg) => { const [k, v] = arg.split("|"); osForm[k] = v; ciz(); };
const osBlob = () => new Promise((res, rej) => { const c = document.getElementById("osTuval"); try{ c.toBlob(b => b ? res(b) : rej(new Error("Görsel hazırlanamadı")), "image/jpeg", 0.9); }catch(e){ rej(new Error("Görsel hazırlanamadı (fotoğraf erişimi)")); } });
const osDosyaAdi = () => { const ie = bul("is_emirleri", osForm.isId); return "once-sonra-" + guvenliAd((ie ? ie.no + "-" : "") + osForm.boy).replace(/\s+/g, "-") + ".jpg"; };
EYLEM.osIndir = btn => islem(btn, async () => { dosyaIndir(await osBlob(), osDosyaAdi()); });
EYLEM.osPaylas = btn => islem(btn, async () => {
  const f = new File([await osBlob()], osDosyaAdi(), {type:"image/jpeg"});
  if(navigator.canShare && navigator.canShare({files:[f]})) await navigator.share({files:[f], text:osForm.yazi + " · " + FIRMA}).catch(() => {});
  else { dosyaIndir(f, f.name); bildir("Görsel indirildi; Instagram / WhatsApp'tan paylaşabilirsiniz"); }
});
EYLEM.osKataloga = btn => {
  const ie = bul("is_emirleri", osForm.isId), kat = isTuru(ie);
  const projeler = veri.katalog.slice().sort((a, b) => b.olusma - a.olusma);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:440px"><p>Kataloğa ekle</p><label class="etiket" for="osProje">Hangi projeye?</label><select id="osProje" class="kutu"><option value="">+ Yeni proje: ' + esc(ie.baslik) + '</option>' +
    projeler.map(x => '<option value="' + x.id + '">' + esc(x.kategori + " · " + x.baslik) + '</option>').join("") + '</select>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="ekle">' + ik("tamam") + 'Ekle</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    islem(b, async () => {
      let pid = p.querySelector("#osProje").value;
      if(!pid){ pid = yeniId(); await Depo.kaydet("katalog", {id:pid, baslik:ie.baslik, kategori:katalogListesi().indexOf(kat) >= 0 ? kat : katalogListesi()[0], aciklama:"", malzeme:"", olcu:"", fiyat:0, olusma:Date.now()}); }
      const blob = await osBlob(); p.remove();
      await gorselleriYukle(pid, [new File([blob], osDosyaAdi(), {type:"image/jpeg"})]);
      git("proje/" + pid);
    });
  });
  document.body.appendChild(p);
};
