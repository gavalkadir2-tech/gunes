"use strict";
// Güneş Mobilya — uretim
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= PROJE KÂRLILIĞI ================= */
// Tüm tutarlar KDV hariç. Maliyet kaynakları: işe bağlı alış faturaları, işe bağlı kasa giderleri (faturasız),
// stoktan işe çıkan malzeme (maliyet fiyatıyla) ve iş emrine elle yazılan maliyetler (kendi ustanızın işçiliği vb.).
const MALIYET_GRUP = {malzeme:"Malzeme", iscilik:"İşçilik", nakliye:"Nakliye / montaj", diger:"Diğer"};
const MALIYET_RENK = {malzeme:"var(--ana)", iscilik:"var(--borc)", nakliye:"#0d9488", diger:"#a8a29e"};
const giderGrubu = kat => /hammadde|mdf|sunta|kereste|kumaş|sünger|aksesuar|hırdavat|boya|cila|malzeme|tedarik/i.test(kat || "") ? "malzeme" :
  /usta|işçilik|iscilik|personel|maaş/i.test(kat || "") ? "iscilik" : /nakliye|montaj|kargo|yakıt/i.test(kat || "") ? "nakliye" : "diger";
function isNetSatis(ie){
  const fs = veri.faturalar.filter(f => f.isEmriId === ie.id && f.tur === "satis");
  return yuvarla(fs.length ? fs.reduce((t, f) => t + f.araToplam, 0) : isHesap(ie.kalemler, isTeklif(ie)).net);
}
function isKarlilik(ie){
  const kalemler = [], ml = malzemeListesi();
  veri.faturalar.filter(f => f.isEmriId === ie.id && f.tur === "alis").forEach(f => kalemler.push({grup:giderGrubu(f.kategori || "malzeme") === "diger" ? "malzeme" : giderGrubu(f.kategori), ad:"Alış faturası " + f.no + " · " + cariAdi(f.musteriId), tutar:f.araToplam, yer:"fatura/" + f.id}));
  veri.hareketler.filter(h => h.isEmriId === ie.id && h.tur === "cikis" && !(h.faturaId && bul("faturalar", h.faturaId)))
    .forEach(h => kalemler.push({grup:giderGrubu(h.kategori), ad:(h.kategori || "Gider") + (h.aciklama ? " · " + h.aciklama : ""), tutar:h.tutar, yer:"kayit/" + h.id}));
  veri.stok_hareket.filter(h => h.isEmriId === ie.id && h.tur === "cikis").forEach(h => {
    const m = ml.find(x => x.id === h.malzemeId); if(!m || !m.fiyat) return;
    kalemler.push({grup:"malzeme", ad:"Stoktan: " + m.ad + " (" + miktarYaz(-h.miktar) + " " + m.birim + ")", tutar:yuvarla(-h.miktar * m.fiyat), yer:"stok"});
  });
  (ie.maliyetler || []).forEach(x => kalemler.push({grup:MALIYET_GRUP[x.tur] ? x.tur : "diger", ad:x.ad || MALIYET_GRUP[x.tur], tutar:Number(x.tutar) || 0, elle:x.id}));
  const gruplar = {malzeme:0, iscilik:0, nakliye:0, diger:0};
  kalemler.forEach(k => { gruplar[k.grup] = yuvarla(gruplar[k.grup] + k.tutar); });
  const satis = isNetSatis(ie), maliyet = yuvarla(Object.values(gruplar).reduce((t, v) => t + v, 0)), kar = yuvarla(satis - maliyet), o = isOzet(ie.id);
  return {satis, maliyet, kar, marj: satis ? kar / satis * 100 : 0, gruplar, kalemler, tahsilat:o.tahsilat, kalan:o.kalan,
    tahmini: yuvarla(isHesap(ie.kalemler, isTeklif(ie)).maliyet)};
}
function karlilikKarti(ie){
  const k = isKarlilik(ie), oran = v => k.maliyet ? Math.round(v / k.maliyet * 100) : 0;
  return '<div class="kart"><div class="kart-baslik"><span>Kârlılık <span class="ist" style="font-weight:400">(KDV hariç)</span></span><button class="baglanti" style="margin:0" data-is="maliyetEkle" data-arg="' + ie.id + '">+ Maliyet ekle</button></div>' +
    '<div class="izgara uc" style="margin:6px 0 10px"><div><div class="alt-bilgi" style="margin:0">Satış</div><div class="deger" style="font-size:18px;font-weight:600">' + para(k.satis) + '</div></div>' +
      '<div><div class="alt-bilgi" style="margin:0">Maliyet</div><div class="deger" style="font-size:18px;font-weight:600">' + para(k.maliyet) + '</div></div>' +
      '<div><div class="alt-bilgi" style="margin:0">Net kâr</div><div class="deger ' + (k.kar >= 0 ? 't-giris' : 't-cikis') + '" style="font-size:18px;font-weight:600">' + para(k.kar) +
        (k.satis ? ' <span style="font-size:13px">%' + Math.round(k.marj) + '</span>' : '') + '</div></div></div>' +
    (k.maliyet ? '<div class="maliyet-cubuk">' + Object.keys(MALIYET_GRUP).filter(g => k.gruplar[g] > 0).map(g => '<i style="width:' + oran(k.gruplar[g]) + '%;background:' + MALIYET_RENK[g] + '" title="' + MALIYET_GRUP[g] + '"></i>').join("") + '</div>' +
      '<div class="maliyet-lejant">' + Object.keys(MALIYET_GRUP).filter(g => k.gruplar[g] > 0).map(g => '<span><i style="background:' + MALIYET_RENK[g] + '"></i>' + MALIYET_GRUP[g] + ' <b>' + para(k.gruplar[g]) + '</b></span>').join("") + '</div>' : '') +
    (k.kalemler.length ? '<details class="maliyet-ayrinti"><summary>Maliyet kalemleri (' + k.kalemler.length + ')</summary>' + k.kalemler.map(x => '<div class="bilgi-satir"><span' + (x.yer ? ' data-git="' + x.yer + '" style="cursor:pointer"' : '') + '>' +
      esc(x.ad) + ' <span class="ist">· ' + MALIYET_GRUP[x.grup] + '</span></span><b>' + para(x.tutar) + (x.elle ? ' <button class="ikon-buton" style="height:26px;min-width:26px;padding:0;margin-left:4px" data-is="maliyetSil" data-arg="' + ie.id + '|' + x.elle + '" aria-label="Sil">' + ik("x") + '</button>' : '') + '</b></div>').join("") + '</details>' :
      '<div class="alt-bilgi">Henüz maliyet yok. Malzeme alımlarını, işçilik ve nakliye giderlerini bu işe bağlayın veya “Maliyet ekle” ile yazın.</div>') +
    (k.tahmini && k.maliyet < k.tahmini * 0.5 ? '<div class="alt-bilgi">Teklif hesabındaki tahmini maliyet: <b>' + para(k.tahmini) + '</b></div>' : '') +
    bilgiSatir("Tahsil edilen", '<span class="t-giris">' + para(k.tahsilat) + '</span>') + bilgiSatir("Kalan alacak (KDV dahil)", para(Math.max(k.kalan, 0))) + '</div>';
}
EYLEM.maliyetEkle = (el, isId) => {
  const ie = bul("is_emirleri", isId); if(!ie) return;
  if(cevrimici && eksikSutun.maliyetler) return uyar("Önce veritabanı güncellemesi", "Supabase'de supabase-guncelleme-10.sql dosyasını çalıştırın.");
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:440px"><p>Maliyet ekle</p><div class="alt-bilgi">Kasadan geçmeyen maliyetler için (kendi ustanızın işçiliği, depodan kullanılan malzeme…). Kasadan ödenen giderleri “Gider Ekle” ile bu işe bağlayın.</div>' +
    '<label class="etiket">Tür</label><div class="secenekler" id="mlTur">' + Object.entries(MALIYET_GRUP).map(([k, v], i) => '<button type="button" class="secenek' + (i === 1 ? ' secili' : '') + '" data-t="' + k + '">' + v + '</button>').join("") + '</div>' +
    '<label class="etiket" for="mlAd">Açıklama</label><input id="mlAd" class="kutu" maxlength="120" placeholder="Örn: 2 usta × 3 gün montaj">' +
    '<label class="etiket" for="mlTutar">Tutar (KDV hariç)</label><input id="mlTutar" class="kutu tutar-kutu" inputmode="decimal" placeholder="0 ₺">' +
    '<div class="hata" id="mlHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Ekle</button></div></div>';
  p.addEventListener("click", e => {
    const t = e.target.closest("[data-t]"); if(t){ p.querySelectorAll("#mlTur .secenek").forEach(x => x.classList.toggle("secili", x === t)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const tutar = sayiOku(p.querySelector("#mlTutar").value);
    if(!(tutar > 0)) return p.querySelector("#mlHata").textContent = "Tutarı yazın.";
    const m = {id:yeniId(), tur:p.querySelector("#mlTur .secili").getAttribute("data-t"), ad:p.querySelector("#mlAd").value.trim(), tutar:yuvarla(tutar), tarih:bugun()};
    islem(b, async () => { await Depo.kaydet("is_emirleri", Object.assign({}, ie, {maliyetler:(ie.maliyetler || []).concat([m])})); p.remove(); bildir("Maliyet eklendi"); ciz(); });
  });
  document.body.appendChild(p); p.querySelector("#mlAd").focus();
};
EYLEM.maliyetSil = (el, arg) => {
  const [isId, mid] = arg.split("|"), ie = bul("is_emirleri", isId); if(!ie) return;
  onayla("Maliyet kalemi silinsin mi?", "", "Sil", () => islem(null, async () => { await Depo.kaydet("is_emirleri", Object.assign({}, ie, {maliyetler:ie.maliyetler.filter(x => x.id !== mid)})); ciz(); }));
};
const isTuru = ie => ie.kategori || ie.kalemler.map(x => (bul("katalog", x.katalogId) || {}).kategori).find(Boolean) || "Belirtilmemiş";
const DONEM = [["ay", "Bu ay"], ["3ay", "Son 3 ay"], ["yil", "Bu yıl"], ["gecenyil", "Geçen yıl"], ["tum", "Tümü"]];
function donemAraligi(d){
  const bg = bugun(), y = Number(bg.slice(0, 4));
  return d === "ay" ? [bg.slice(0, 7) + "-01", bg] : d === "3ay" ? [gunEkle(bg, -91), bg] : d === "yil" ? [y + "-01-01", bg] : d === "gecenyil" ? [(y - 1) + "-01-01", (y - 1) + "-12-31"] : ["0000", "9999"];
}
function ekranKarlilik(){
  const d = filtre.karDonem || "3ay", [a, b] = donemAraligi(d), dahil = filtre.karAcik === "1";
  const isler = veri.is_emirleri.filter(ie => {
    if(ie.durum === "İptal" || ie.durum === "Teklif") return false;
    if(ie.durum === "Teslim edildi"){ const t = isTeslimTarihi(ie) || tarihStr(new Date(ie.olusma)); return t >= a && t <= b; }
    return dahil && tarihStr(new Date(ie.olusma)) >= a;
  }).map(ie => ({ie, k:isKarlilik(ie), tur:isTuru(ie)}));
  const turler = {};
  isler.forEach(x => { const t = turler[x.tur] || (turler[x.tur] = {n:0, satis:0, maliyet:0, kar:0}); t.n++; t.satis += x.k.satis; t.maliyet += x.k.maliyet; t.kar += x.k.kar; });
  const top = isler.reduce((t, x) => ({satis:t.satis + x.k.satis, maliyet:t.maliyet + x.k.maliyet, kar:t.kar + x.k.kar}), {satis:0, maliyet:0, kar:0});
  const grup = {malzeme:0, iscilik:0, nakliye:0, diger:0}; isler.forEach(x => Object.keys(grup).forEach(g => { grup[g] += x.k.gruplar[g]; }));
  const maliyetsiz = isler.filter(x => !x.k.maliyet).length;
  const tl = Object.entries(turler).sort((x, y) => y[1].kar - x[1].kar), enCok = Math.max(1, ...tl.map(([, t]) => Math.abs(t.kar)));
  const html = '<div class="ust-arac"><div class="secenekler">' + DONEM.map(([k, v]) => '<button class="secenek' + (k === d ? ' secili' : '') + '" data-is="karDonem" data-arg="' + k + '">' + v + '</button>').join("") + '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" id="karAcik"' + (dahil ? ' checked' : '') + '> Devam eden işleri de katın</label></div>' +
    '<div class="izgara dort"><div class="kart ozet"><div class="kart-baslik">İş sayısı</div><div class="deger">' + isler.length + '</div><div class="alt-bilgi">' + (dahil ? 'teslim + devam eden' : 'teslim edilen') + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Ciro (KDV hariç)</div><div class="deger">' + para(top.satis) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Maliyet</div><div class="deger t-cikis">' + para(top.maliyet) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Net kâr</div><div class="deger ' + (top.kar >= 0 ? 't-giris' : 't-cikis') + '">' + para(top.kar) + '</div><div class="alt-bilgi">' + (top.satis ? 'Kâr oranı %' + Math.round(top.kar / top.satis * 100) : '—') + '</div></div></div>' +
    (maliyetsiz ? '<div class="uyari">' + maliyetsiz + ' işte hiç maliyet kaydı yok; kârları olduğundan yüksek görünür. Malzeme alımlarını ve giderleri iş emrine bağlayın.</div>' : '') +
    '<div class="iki-sutun"><div class="kart">' + kartBaslik("Hangi iş türü kazandırıyor?") +
      (tl.length ? tl.map(([ad, t]) => '<div class="cubuk-satir"><div class="cubuk-ust"><span>' + esc(ad) + ' <span class="t-soluk" style="font-size:13px">· ' + t.n + ' iş</span></span><span style="white-space:nowrap"><b class="' + (t.kar >= 0 ? 't-giris' : 't-cikis') + '">' + para(t.kar) + '</b>' +
        ' <span class="t-soluk" style="font-size:13px">· %' + (t.satis ? Math.round(t.kar / t.satis * 100) : 0) + '</span></span></div><div class="cubuk-yol"><div class="cubuk" style="width:' + Math.max(2, Math.abs(t.kar) / enCok * 100) + '%;background:' + (t.kar >= 0 ? 'var(--giris)' : 'var(--cikis)') + '"></div></div>' +
        '<div class="alt-bilgi" style="margin:2px 0 0">Ciro ' + para(t.satis) + ' · maliyet ' + para(t.maliyet) + ' · iş başı kâr ' + para(t.kar / t.n) + '</div></div>').join("") : bos("grafik", "Bu dönemde iş yok.")) + '</div>' +
      cubuklar("Maliyet nereye gidiyor?", Object.fromEntries(Object.entries(grup).filter(([, v]) => v > 0).map(([g, v]) => [MALIYET_GRUP[g], v])), top.maliyet, "var(--cikis)") + '</div>' +
    bolum("İşler (kâra göre)") + '<div class="kart liste-kart">' + (isler.length ? isler.sort((x, y) => y.k.kar - x.k.kar).map(x => '<button class="satir" data-git="is/' + x.ie.id + '"><span class="orta"><div class="s1">' +
      esc(x.ie.no + " · " + x.ie.baslik) + '</div><div class="s2">' + esc([cariAdi(x.ie.musteriId), x.tur, x.ie.durum].join(" · ")) + ' · satış ' + para(x.k.satis) + ' · maliyet ' + para(x.k.maliyet) + '</div></span>' +
      '<span class="sag"><div class="tutar ' + (x.k.kar >= 0 ? 't-giris' : 't-cikis') + '">' + para(x.k.kar) + '</div><div class="s2">' + (x.k.satis ? '%' + Math.round(x.k.marj) : '') + '</div></span></button>').join("") : bos("is", "Bu dönemde iş yok.")) + '</div>';
  return {baslik:"Proje kârlılığı", geri:true, html, sonra(){ const c = document.getElementById("karAcik"); if(c) c.addEventListener("change", () => { filtre.karAcik = c.checked ? "1" : ""; ciz(); }); }};
}
EYLEM.karDonem = (el, d) => { filtre.karDonem = d; ciz(); };

/* ================= MALZEME SİPARİŞİ ================= */
const SIPARIS_DURUM = {bekliyor:["Bekliyor", "d-sari"], kismi:["Kısmen geldi", "d-mavi"], geldi:["Geldi", "d-yesil"], iptal:["İptal", "d-gri"]};
const siparisNo = () => siradakiNo("SP-", veri.siparisler);
// Önerilen miktar: asgari stokun iki katına tamamla (en az asgari kadar)
const oneriMiktar = m => { const q = stokMiktar(m.id), hedef = (m.min || 0) * 2; return Math.max(m.min || 1, Math.ceil(hedef - q)); };
const yoldaki = mid => veri.siparisler.filter(s => s.durum === "bekliyor" || s.durum === "kismi").reduce((t, s) => t + s.kalemler.filter(k => k.malzemeId === mid).reduce((a, k) => a + Math.max(0, k.miktar - (k.gelen || 0)), 0), 0);
function siparisMesaji(s){
  const t = bul("musteriler", s.tedarikciId) || {};
  return sablonDoldur(mesajSablonu("tedarikci"), {ad:t.ad || "", no:s.no, liste:s.kalemler.map(k => "• " + k.ad + ": " + miktarYaz(k.miktar) + " " + k.birim).join("\n"),
    not:s.aciklama ? "\n\nNot: " + s.aciklama : "", firma:FIRMA, telefon:firma().telefon ? " · " + firma().telefon : ""});
}
const SIPARIS_SIRA = {yeni:["En yeni", kiyas(s => s.olusma, true)], eski:["En eski", kiyas(s => s.olusma)], tedarikci:["Tedarikçi (A–Z)", kiyas(s => cariAdi(s.tedarikciId))]};
function ekranSiparisler(){
  if(eksikTablo.siparisler) return {baslik:"Malzeme siparişi", geri:true, html:'<div class="uyari">Sipariş için Supabase\'de <b>supabase-guncelleme-10.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>'};
  const ml = malzemeListesi(), az = stokAzalanlar().filter(m => yoldaki(m.id) + stokMiktar(m.id) <= m.min), af = alisFiyatlari();
  const gruplar = {}; az.forEach(m => { (gruplar[m.tedarikciId || ""] = gruplar[m.tedarikciId || ""] || []).push(m); });
  const acik = veri.siparisler.filter(s => s.durum === "bekliyor" || s.durum === "kismi").sort((a, b) => b.olusma - a.olusma);
  const hz = listeHazirla("siparisGecmis", SIPARIS_SIRA, veri.siparisler.filter(s => acik.indexOf(s) < 0)), kapali = hz.l;
  const siparisSatir = s => {
    const t = bul("musteriler", s.tedarikciId), d = SIPARIS_DURUM[s.durum] || SIPARIS_DURUM.bekliyor, f = bul("faturalar", s.faturaId);
    return '<div class="satir" style="flex-wrap:wrap"><span class="rozet r-gri">' + ik("koli") + '</span><span class="orta"><div class="s1">' + esc(s.no + " · " + (t ? t.ad : "Tedarikçi yok")) + '</div>' +
      '<div class="s2" style="white-space:normal">' + esc(tarihYaz(s.tarih, true) + " · " + s.kalemler.map(k => k.ad + " " + miktarYaz(k.miktar) + " " + k.birim + (k.gelen ? " (gelen " + miktarYaz(k.gelen) + ")" : "")).join(", ")) + '</div></span>' +
      '<span class="sag"><span class="etiket-rozet ' + d[1] + '">' + d[0] + '</span>' + (f ? '<div class="s2" style="margin-top:3px;cursor:pointer" data-git="fatura/' + f.id + '">' + esc(f.no) + '</div>' : '') + '</span>' +
      '<span class="secenekler" style="width:100%;justify-content:flex-end;margin-top:6px">' +
        (s.durum === "bekliyor" || s.durum === "kismi" ? '<button class="secenek" data-is="siparisTeslim" data-arg="' + s.id + '">' + ik("tamam") + ' Teslim al</button><button class="secenek" data-is="siparisWa" data-arg="' + s.id + '">WhatsApp</button>' : '') +
        (!f && s.durum !== "iptal" && s.kalemler.some(k => k.gelen) ? '<button class="secenek" data-is="siparisFatura" data-arg="' + s.id + '">Alış faturası</button>' : '') +
        (s.durum === "bekliyor" ? '<button class="secenek" data-is="siparisIptal" data-arg="' + s.id + '">İptal</button>' : '') +
        '<button class="secenek" data-is="siparisSil" data-arg="' + s.id + '">' + ik("sil") + '</button></span></div>';
  };
  const html = '<div class="ust-arac"><div class="alt-bilgi" style="margin:0">Asgari stoku yazılmış malzemeler azalınca burada sipariş önerisi çıkar. Malzemenin tedarikçisini <b data-git="malzemeler" style="cursor:pointer;color:var(--borc)">malzeme listesinden</b> seçin.</div>' +
      '<button class="buton kucuk" data-is="siparisYeni" data-arg="">' + ik("arti") + 'Yeni sipariş</button></div>' +
    bolum("Sipariş önerisi (" + az.length + " malzeme)") +
    (az.length ? Object.entries(gruplar).map(([tid, l]) => {
      const t = bul("musteriler", tid);
      return '<div class="kart"><div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600"><span>' + esc(t ? t.ad : "Tedarikçisi seçilmemiş") + '</span>' +
        '<button class="buton kucuk" data-is="siparisYeni" data-arg="' + tid + '|' + l.map(m => m.id).join(",") + '">' + ik("mesaj") + 'Sipariş hazırla</button></div>' +
        l.map(m => { const e = enUcuzTedarikci(m.id, af), ucuz = e && e.hepsi.length > 1 && e.en.tid !== m.tedarikciId ? e.en : null;
          return bilgiSatir(esc(m.ad) + ' <span class="ist">· stok ' + miktarYaz(stokMiktar(m.id)) + ' / asgari ' + miktarYaz(m.min) + '</span>' +
            (ucuz ? '<div class="alt-bilgi" style="margin:2px 0 0;color:var(--giris)">En ucuz son fiyat: ' + esc(cariAdi(ucuz.tid)) + ' ' + para(ucuz.son.fiyat) + '</div>' : ''), 'öneri ' + miktarYaz(oneriMiktar(m)) + ' ' + esc(m.birim)); }).join("") + '</div>';
    }).join("") : '<div class="kart">' + bos("koli", "Azalan malzeme yok (yoldaki siparişler sayıldı).") + '</div>') +
    bolum("Bekleyen siparişler (" + acik.length + ")") + '<div class="kart liste-kart">' + (acik.length ? acik.map(siparisSatir).join("") : bos("koli", "Bekleyen sipariş yok.")) + '</div>' +
    (kapali.length ? bolum("Geçmiş siparişler (" + hz.toplam + ")") + listeArac("siparisGecmis", SIPARIS_SIRA) + '<div class="kart liste-kart">' + kapali.map(siparisSatir).join("") + dahaFazla("siparisGecmis", hz) + '</div>' : '');
  return {baslik:"Malzeme siparişi", geri:true, html};
}
// arg: "tedarikciId|malzemeId,malzemeId"
EYLEM.siparisYeni = (el, arg) => {
  const [tid0, ids] = (arg || "").split("|"), ml = malzemeListesi(), secili = (ids || "").split(",").filter(Boolean);
  const tedarikciler = veri.musteriler.filter(m => m.tip === "tedarikci").sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const satirlar = secili.length ? secili.map(id => { const m = ml.find(x => x.id === id); return {malzemeId:id, miktar:oneriMiktar(m)}; }) : [{malzemeId:"", miktar:1}];
  const p = document.createElement("div"); p.className = "perde";
  const satirHtml = (s, i) => '<div class="ikalem-alan alan-3" data-i="' + i + '" style="margin-top:8px"><label>Malzeme<select class="kutu sp-m"><option value="">— Seçin —</option>' +
    ml.map(m => '<option value="' + m.id + '"' + (m.id === s.malzemeId ? ' selected' : '') + '>' + esc(m.ad + " (" + m.birim + ")") + '</option>').join("") + '</select></label>' +
    '<label>Miktar<input class="kutu sp-q" inputmode="decimal" value="' + sayiYaz(s.miktar) + '"></label><button type="button" class="ikon-buton" data-c="sil" aria-label="Sil">' + ik("x") + '</button></div>';
  p.innerHTML = '<div class="pencere" style="max-width:560px;max-height:92vh;overflow:auto"><p>Malzeme siparişi</p>' +
    '<label class="etiket" for="spT">Tedarikçi</label><select id="spT" class="kutu"><option value="">— Seçin —</option>' + tedarikciler.map(t => '<option value="' + t.id + '"' + (t.id === tid0 ? ' selected' : '') + '>' + esc(t.ad) + '</option>').join("") + '</select>' +
    (tedarikciler.length ? '' : '<div class="alt-bilgi">Tedarikçi yok: önce Cariler\'den tedarikçi ekleyin.</div>') +
    '<div id="spSatir">' + satirlar.map(satirHtml).join("") + '</div><button type="button" class="buton ikincil kucuk" style="margin-top:10px" data-c="ekle">' + ik("arti") + 'Malzeme ekle</button>' +
    '<label class="etiket" for="spNot">Not <span class="ist">(isteğe bağlı)</span></label><input id="spNot" class="kutu" maxlength="200" placeholder="Örn: Cuma gününe kadar lazım">' +
    '<div class="hata" id="spHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton wa-buton" data-c="kaydet">' + ik("mesaj") + 'Kaydet ve WhatsApp\'tan gönder</button></div></div>';
  const oku = () => { satirlar.length = 0; p.querySelectorAll("[data-i]").forEach(d => satirlar.push({malzemeId:d.querySelector(".sp-m").value, miktar:sayiOku(d.querySelector(".sp-q").value) || 0})); };
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c"); oku();
    if(c === "hayir") return p.remove();
    if(c === "ekle"){ satirlar.push({malzemeId:"", miktar:1}); p.querySelector("#spSatir").innerHTML = satirlar.map(satirHtml).join(""); return; }
    if(c === "sil"){ satirlar.splice(Number(b.closest("[data-i]").getAttribute("data-i")), 1); if(!satirlar.length) satirlar.push({malzemeId:"", miktar:1}); p.querySelector("#spSatir").innerHTML = satirlar.map(satirHtml).join(""); return; }
    const tid = p.querySelector("#spT").value, l = satirlar.filter(s => s.malzemeId && s.miktar > 0);
    if(!tid) return p.querySelector("#spHata").textContent = "Tedarikçiyi seçin.";
    if(!l.length) return p.querySelector("#spHata").textContent = "En az bir malzeme ve miktar girin.";
    const s = {id:yeniId(), no:siparisNo(), tedarikciId:tid, kalemler:l.map(x => { const m = ml.find(y => y.id === x.malzemeId); return {malzemeId:m.id, ad:m.ad, birim:m.birim, miktar:yuvarla(x.miktar), fiyat:m.fiyat || 0, gelen:0}; }),
      durum:"bekliyor", tarih:bugun(), faturaId:null, aciklama:p.querySelector("#spNot").value.trim(), olusma:Date.now()};
    islem(b, async () => {
      await Depo.kaydet("siparisler", s);
      // Tedarikçinin malzeme listesinde kayıtlı değilse öğren
      const yeni = ml.map(m => s.kalemler.some(k => k.malzemeId === m.id) && !m.tedarikciId ? Object.assign({}, m, {tedarikciId:tid}) : m);
      if(yeni.some((m, i) => m !== ml[i])) await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:yeni});
      p.remove(); ciz(); EYLEM.siparisWa(null, s.id);
    });
  });
  document.body.appendChild(p);
};
EYLEM.siparisWa = (el, id) => {
  const s = bul("siparisler", id); if(!s) return; const t = bul("musteriler", s.tedarikciId) || {};
  waPencere({tel:t.telefon, ad:t.ad, sablonlar:[{ad:"Sipariş", metin:siparisMesaji(s)}]});
};
EYLEM.siparisTeslim = (el, id) => {
  const s = bul("siparisler", id); if(!s) return;
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:560px;max-height:92vh;overflow:auto"><p>' + esc(s.no) + ' · teslim al</p><div class="alt-bilgi">Gelen miktarlar stoka giriş olarak işlenir. Fiyat KDV hariç birim maliyettir; malzeme listesindeki fiyat da güncellenir.</div>' +
    s.kalemler.map((k, i) => '<div class="ikalem-alan alan-3" data-i="' + i + '" style="margin-top:10px"><label>' + esc(k.ad) + ' <span class="ist">(' + miktarYaz(k.miktar) + ' ' + esc(k.birim) + ' sipariş' + (k.gelen ? ', ' + miktarYaz(k.gelen) + ' geldi' : '') + ')</span>' +
      '<input class="kutu st-q" inputmode="decimal" value="' + sayiYaz(Math.max(0, k.miktar - (k.gelen || 0))) + '"></label><label>Birim fiyat<input class="kutu st-f" inputmode="decimal" value="' + sayiYaz(k.fiyat) + '"></label><span></span></div>').join("") +
    tarihAlani("stTarih", "Geliş tarihi", bugun()) +
    '<label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:14px"><input type="checkbox" id="stFatura" checked> Ardından alış faturasını hazırla</label>' +
    '<div class="hata" id="stHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Stoka işle</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const tarih = p.querySelector("#stTarih").value || bugun(), girisler = [];
    const kalemler = s.kalemler.map((k, i) => {
      const d = p.querySelector('[data-i="' + i + '"]'), q = Math.max(0, sayiOku(d.querySelector(".st-q").value) || 0), f = Math.max(0, sayiOku(d.querySelector(".st-f").value) || 0);
      if(q > 0) girisler.push({k, q, f});
      return Object.assign({}, k, {gelen:yuvarla((k.gelen || 0) + q), fiyat:f || k.fiyat});
    });
    if(!girisler.length) return p.querySelector("#stHata").textContent = "Gelen miktar girin.";
    const tamam = kalemler.every(k => k.gelen >= k.miktar - 1e-9), fatura = p.querySelector("#stFatura").checked;
    islem(b, async () => {
      await Depo.kaydet("stok_hareket", girisler.map(x => ({id:yeniId(), malzemeId:x.k.malzemeId, tur:"giris", miktar:Math.round(x.q * 1000) / 1000, tarih, isEmriId:null, aciklama:"Sipariş " + s.no + " · " + cariAdi(s.tedarikciId), olusma:Date.now()})));
      await Depo.kaydet("siparisler", Object.assign({}, s, {kalemler, durum: tamam ? "geldi" : "kismi"}));
      const ml = malzemeListesi(), yeni = ml.map(m => { const x = girisler.find(g => g.k.malzemeId === m.id); return x && x.f && x.f !== m.fiyat ? Object.assign({}, m, {fiyat:yuvarla(x.f)}) : m; });
      if(yeni.some((m, i) => m !== ml[i])) await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:yeni});
      p.remove(); bildir("Stoka işlendi");
      if(fatura) siparisFaturasi(bul("siparisler", s.id), girisler); else ciz();
    });
  });
  document.body.appendChild(p);
};
let faturaOnDoldur = null;
function siparisFaturasi(s, girisler){
  const l = girisler || s.kalemler.filter(k => k.gelen).map(k => ({k, q:k.gelen, f:k.fiyat}));
  faturaOnDoldur = {siparisId:s.id, kategori:kategoriler("cikis").find(k => /hammadde/i.test(k)) || kategoriler("cikis")[0],
    kalemler:l.map(x => ({ad:x.k.ad, miktar:yuvarla(x.q), fiyat:yuvarla(x.f || x.k.fiyat || 0), kdv:varsayilanKdv()})), aciklama:"Sipariş " + s.no};
  git("fatura-form/alis/" + s.tedarikciId);
}
EYLEM.siparisFatura = (el, id) => { const s = bul("siparisler", id); if(s) siparisFaturasi(s); };
EYLEM.siparisIptal = (el, id) => { const s = bul("siparisler", id); if(s) onayla("Sipariş iptal edilsin mi?", s.no, "İptal et", () => islem(null, async () => { await Depo.kaydet("siparisler", Object.assign({}, s, {durum:"iptal"})); ciz(); })); };
EYLEM.siparisSil = (el, id) => { const s = bul("siparisler", id); if(s) onayla("Sipariş silinsin mi?", s.no + " çöp kutusuna taşınır. Stoka işlenen girişler silinmez.", "Sil", () => islem(null, async () => { await Depo.sil("siparisler", id); bildir("Sipariş çöp kutusuna taşındı"); ciz(); })); };

/* ================= KESİM LİSTESİ VE PLAKA OPTİMİZASYONU ================= */
// İş emrinin "kesim" alanı: {parcalar:[{id, ad, en, boy, adet, malzemeId, damar, bantU, bantK}], testere, pay}
// Ölçüler mm. "damar": desen yönü korunur (parça döndürülmez). bantU / bantK: bantlanan uzun / kısa kenar sayısı (0–2).
// Plaka ölçüsü malzemeye aittir (malzeme listesi, örn. 2100×2800 veya 1830×3660); malzeme seçilmeyen parçalarda varsayılan plaka (sistem ayarı "plakaOlcu").
const PLAKA_OLCULERI = [[2100, 2800], [1830, 3660], [2070, 2800], [1220, 2440]];
const varsayilanPlaka = () => { const o = sistem().plakaOlcu || {}, en = Number(o.en) || 2100, boy = Number(o.boy) || 2800;
  return {id:"", ad:"Plaka " + en + "×" + boy + " (malzeme seçilmedi)", en, boy, fiyat:0, birim:"plaka"}; };
const plakaKaynak = () => { if(malzemeListesi().length) return malzemeListesi(); const a = veri.ayarlar.find(x => x.anahtar === "plakalar"); return a && Array.isArray(a.deger) ? a.deger : []; };
const plakaMalzemeleri = () => { const v = varsayilanPlaka(); return plakaKaynak().filter(m => m.birim === "plaka").map(m => Object.assign({}, m, {en:m.en || v.en, boy:m.boy || v.boy})); };
const plakaBul = id => plakaMalzemeleri().find(m => m.id === id) || varsayilanPlaka();
const plakaEtiket = m => m.ad + " · " + m.en + "×" + m.boy;
// Malzeme seçimi + yanında plaka ölçüsü düğmesi
function plakaSecici(id, v, bos_, sinif){
  const pm = plakaMalzemeleri(), vp = varsayilanPlaka();
  return '<div class="plaka-sec"><select ' + (id ? 'id="' + id + '" ' : '') + 'class="kutu' + (sinif ? ' ' + sinif : '') + '">' + (bos_ ? '<option value="">' + esc(bos_) + '</option>' : '') +
    (pm.length ? pm.map(m => '<option value="' + m.id + '"' + (m.id === v ? ' selected' : '') + '>' + esc(plakaEtiket(m)) + '</option>').join("") : '<option value="">Plaka ' + vp.en + '×' + vp.boy + '</option>') + '</select>' +
    (yetki.yonetici && !yetki.salt ? '<button type="button" class="ikon-buton" data-plaka-olcu="1" title="Plaka ölçüsünü değiştir" aria-label="Plaka ölçüsü">' + ik("cetvel") + '</button>' : '') + '</div>';
}
function plakaOlcuPenceresi(mid, sonra){
  const m = mid ? plakaBul(mid) : varsayilanPlaka(), p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:420px"><p>Plaka ölçüsü</p><div class="alt-bilgi">' + esc(mid ? m.ad : "Malzeme seçilmeyen parçalar için varsayılan plaka") + '</div>' +
    '<div class="secenekler" id="poHazir">' + PLAKA_OLCULERI.map(([e, b]) => '<button type="button" class="secenek' + (e === m.en && b === m.boy ? ' secili' : '') + '" data-o="' + e + 'x' + b + '">' + e + '×' + b + '</button>').join("") + '</div>' +
    '<div class="iki-alan"><div><label class="etiket" for="poEn">En (mm)</label><input id="poEn" class="kutu" inputmode="numeric" value="' + m.en + '"></div>' +
      '<div><label class="etiket" for="poBoy">Boy (mm)</label><input id="poBoy" class="kutu" inputmode="numeric" value="' + m.boy + '"></div></div>' +
    (mid ? '<div class="alt-bilgi">Aynı malzemenin iki farklı ebadını kullanıyorsanız malzeme listesine ayrı malzeme olarak ekleyin (örn. “18 mm beyaz sunta 1830×3660”).</div>' : '') +
    '<div class="hata" id="poHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const o = e.target.closest("[data-o]"); if(o){ const [en, boy] = o.getAttribute("data-o").split("x"); p.querySelector("#poEn").value = en; p.querySelector("#poBoy").value = boy;
      p.querySelectorAll("#poHazir .secenek").forEach(x => x.classList.toggle("secili", x === o)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const en = Math.round(sayiOku(p.querySelector("#poEn").value)), boy = Math.round(sayiOku(p.querySelector("#poBoy").value));
    if(!(en >= 300 && en <= 6000 && boy >= 300 && boy <= 6000)) return p.querySelector("#poHata").textContent = "Ölçüler 300–6000 mm arası olmalı.";
    islem(b, async () => {
      if(mid) await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:malzemeListesi().map(x => x.id === mid ? Object.assign({}, x, {en, boy}) : x)});
      else await sistemKaydet({plakaOlcu:{en, boy}});
      // Açık pencerelerdeki seçimler de güncellenir
      if(mid) document.querySelectorAll('option[value="' + mid + '"]').forEach(x => { x.textContent = plakaEtiket(plakaBul(mid)); });
      p.remove(); bildir("Plaka ölçüsü " + en + "×" + boy + " oldu"); if(sonra) sonra();
    });
  });
  document.body.appendChild(p);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-plaka-olcu]"); if(!b) return;
  const s = b.parentNode.querySelector("select"), mid = s ? s.value : "";
  if(!mid && plakaMalzemeleri().length) return uyar("Önce malzemeyi seçin", "Plaka ölçüsü seçilen malzemeye aittir.");
  plakaOlcuPenceresi(mid, mid ? null : () => { if(s) s.options[s.selectedIndex].textContent = "Plaka " + varsayilanPlaka().en + "×" + varsayilanPlaka().boy; });
});
EYLEM.plakaOlcu = (el, mid) => plakaOlcuPenceresi(mid, () => {
  const y = document.getElementById("vpYazi"); if(y){ y.textContent = varsayilanPlaka().en + "×" + varsayilanPlaka().boy; return; }   // malzeme listesindeki düzenlemeler kaybolmasın
  if(yol()[0] === "kesim" && kesimForm) kesimOku(); ciz(); });

// İki yöntem:
//  "kolay" (varsayılan): şeritli giyotin kesim — plaka önce boydan boya şeritlere ayrılır, her şerit enine parçalara bölünür.
//            Aynı enli parçalar aynı şeride toplanır; atölyede az ayar, düz kesim. Biraz daha fazla fire olabilir.
//  "fire":   serbest yerleşim (MaxRects, en kısa kenar uyumu) — en az plaka / fire, kesim sırası daha karışık.
// Testere payı her parçaya eklenir. Sonuçta "diger": öbür yöntemle kaç plaka çıktığı (karşılaştırma için).
function kesimHesapla(parcalar, o){
  const testere = Number(o.testere) || 0, pay = Number(o.pay) || 0, yontem = o.yontem === "fire" ? "fire" : "kolay", sonuc = {};
  const gruplar = {};
  parcalar.forEach((p, i) => { if(!(p.en > 0 && p.boy > 0 && p.adet > 0)) return; (gruplar[p.malzemeId || ""] = gruplar[p.malzemeId || ""] || []).push(Object.assign({no:i + 1}, p)); });
  for(const [mid, l] of Object.entries(gruplar)){
    const m = plakaBul(mid), W = m.en - 2 * pay + testere, H = m.boy - 2 * pay + testere;
    const tek = [];
    l.forEach(p => { for(let k = 0; k < p.adet; k++) tek.push(p); });
    const kolay = seritYerlestir(tek, W, H, testere), serbest = serbestYerlestir(tek, W, H, testere);
    const en = yontem === "fire" ? serbest : kolay;
    const plakalar = en.pls, sigmayan = en.sig;
    const alan = plakalar.length * m.en * m.boy, kullanilan = plakalar.reduce((t, pl) => t + pl.used.reduce((a, u) => a + u.p.en * u.p.boy, 0), 0);
    const bant = tek.reduce((t, p) => t + ((p.bantU || 0) * Math.max(p.en, p.boy) + (p.bantK || 0) * Math.min(p.en, p.boy)) / 1000, 0);
    sonuc[mid] = {m, plakalar:plakalar.map(pl => pl.used), seritler:yontem === "kolay" ? plakalar.map(pl => pl.seritler) : null, sigmayan, parcaSayisi:tek.length,
      kullanim: alan ? kullanilan / alan * 100 : 0, fireM2:(alan - kullanilan) / 1e6, kullanilanM2:kullanilan / 1e6, bant, maliyet:plakalar.length * (m.fiyat || 0), pay, testere,
      yontem, diger:(yontem === "fire" ? kolay : serbest).pls.length};
  }
  return sonuc;
}
// Şeritli (giyotin) yerleşim — her kesim plakayı / şeridi baştan sona böler (panel ebatlamaya uygun, 3 aşama):
//   1) plaka şeritlere ayrılır, 2) şerit enine bölümlere kesilir, 3) gerekirse bölüm içinde yan yana parçalar ayrılır.
// Aynı enli parçalar aynı şeride, aynı boylu küçük parçalar aynı bölüme yan yana konur; boşluğa sığmayan parça döndürülerek denenir.
// Şeritler plakanın boyu (varsayılan) veya eni boyunca denenir; en az plaka, sonra en az kesim, sonra son plakada en çok artan seçilir.
// Damarlı parça döndürülmez.
function seritYerlestir(tek, W, H, t){
  let en = null;
  for(const eksen of ["boy", "en"]) for(const yon of ["dar", "genis"]){
    // a: şerit enine gelen ölçü, b: şerit boyunca gelen ölçü
    const A = eksen === "boy" ? W : H, B = eksen === "boy" ? H : W;
    const yonlar = p => { const d = eksen === "boy" ? [p.en, p.boy] : [p.boy, p.en];
      if(p.damar || p.en === p.boy) return [d];
      const k = Math.min(p.en, p.boy), u = Math.max(p.en, p.boy), l = yon === "dar" ? [[k, u], [u, k]] : [[u, k], [k, u]];
      return l.filter(([a, b]) => a + t <= A + 1e-6 && b + t <= B + 1e-6); };
    const birim = tek.map(p => ({p, yonlar:yonlar(p)})).map(x => Object.assign(x, {a:(x.yonlar[0] || [0])[0], b:(x.yonlar[0] || [0, 0])[1]}))
      .sort((x, y) => y.a - x.a || y.b - x.b);
    const pls = [], sig = [];
    const yerlestir = (u, a, b, sadeceMevcut) => {
      const seritler = pls.flatMap(pl => pl.seritler), sigar = s => s.dolu + b + t <= B + 1e-6;
      // 1) aynı enli şeritte yeni bölüm
      let s = seritler.find(x => x.w === a && sigar(x));
      if(s) return bolumAc(s, u, a, b);
      // 2) aynı boylu bölümde yan yana (bölüm içi kesim)
      for(const x of seritler) for(const bl of x.bolumler) if(bl.h === b && bl.dolu + a + t <= x.w + 1e-6) return bolumeKoy(x, bl, u, a, b);
      // 3) mevcut plakada yeni şerit (en dar uyan plaka)
      const pl = pls.filter(x => x.kalan >= a + t - 1e-6).sort((x, y) => x.kalan - y.kalan)[0];
      if(pl) return bolumAc(seritAc(pl, a), u, a, b);
      // 4) daha geniş şeritte yeni bölüm (yanı başka parçaya kalır)
      s = seritler.filter(x => x.w > a && sigar(x)).sort((x, y) => x.w - y.w)[0];
      if(s) return bolumAc(s, u, a, b);
      if(sadeceMevcut) return false;
      const yeni = {kalan:A, seritler:[], used:[]}; pls.push(yeni);
      return bolumAc(seritAc(yeni, a), u, a, b);
    };
    const seritAc = (pl, a) => { const s = {pl, x0:A - pl.kalan, w:a, dolu:0, bolumler:[]}; pl.kalan -= a + t; pl.seritler.push(s); return s; };
    const bolumAc = (s, u, a, b) => { const bl = {y0:s.dolu, h:b, dolu:0, parcalar:[]}; s.dolu += b + t; s.bolumler.push(bl); return bolumeKoy(s, bl, u, a, b); };
    const bolumeKoy = (s, bl, u, a, b) => {
      const sa = s.x0 + bl.dolu, sb = bl.y0, dondu = (eksen === "boy" ? a : b) !== u.p.en;
      s.pl.used.push(eksen === "boy" ? {x:sa, y:sb, w:a + t, h:b + t, dondu, p:u.p} : {x:sb, y:sa, w:b + t, h:a + t, dondu, p:u.p});
      bl.dolu += a + t; bl.parcalar.push({no:u.p.no, a, b}); return true;
    };
    for(const u of birim){
      if(!u.yonlar.length){ if(sig.indexOf(u.p) < 0) sig.push(u.p); continue; }
      // Önce tercih edilen yönle mevcut plakalara; olmazsa döndürülmüş hâli; o da olmazsa yeni plaka
      if(u.yonlar.some(([a, b]) => yerlestir(u, a, b, true))) continue;
      yerlestir(u, u.a, u.b, false);
    }
    const kesim = pls.reduce((n, pl) => n + pl.seritler.reduce((m, s) => m + 1 + s.bolumler.reduce((k, bl) => k + 1 + Math.max(0, bl.parcalar.length - 1) + (bl.dolu < s.w + t - 1e-6 ? 1 : 0), 0), 0), 0);
    const son = pls.length ? pls[pls.length - 1].used.reduce((x, u) => x + u.w * u.h, 0) : 0;
    if(!en || pls.length < en.pls.length || (pls.length === en.pls.length && (kesim < en.kesim || (kesim === en.kesim && son < en.son)))) en = {pls, sig, kesim, son, eksen};
  }
  const A = en.eksen === "boy" ? W : H, B = en.eksen === "boy" ? H : W;
  en.pls.forEach(pl => { const artan = Math.max(0, Math.round(pl.kalan - t));
    pl.seritler = pl.seritler.map(s => ({w:s.w, eksen:en.eksen, artan, seritArtan:Math.max(0, Math.round(B - s.dolu - t)),
      bolumler:s.bolumler.map(bl => ({h:bl.h, artan:Math.max(0, Math.round(s.w - bl.dolu)), parcalar:bl.parcalar}))})); });
  return en;
}
// Serbest yerleşim (MaxRects): birkaç sıralama ve kural denenir; en az plaka, sonra son plakası en boş olan seçilir
function serbestYerlestir(tek, W, H, testere){
  const sira = [
    (a, b) => Math.max(b.en, b.boy) - Math.max(a.en, a.boy) || b.en * b.boy - a.en * a.boy,
    (a, b) => b.en * b.boy - a.en * a.boy,
    (a, b) => b.boy - a.boy || b.en - a.en,
    (a, b) => b.en - a.en || b.boy - a.boy,
    (a, b) => (b.damar ? 1 : 0) - (a.damar ? 1 : 0) || b.en * b.boy - a.en * a.boy,
    (a, b) => Math.min(b.en, b.boy) - Math.min(a.en, a.boy) || b.en * b.boy - a.en * a.boy];
  let en = null;
  for(const s of sira) for(const kural of ["kisa", "alan"]){
    const dizi = tek.slice().sort(s), pls = [], sig = [];
    for(const p of dizi){
      const w = p.en + testere, h = p.boy + testere, don = !p.damar;
      let yer = null;
      for(const pl of pls){ yer = mrBul(pl, w, h, don, kural); if(yer){ mrKoy(pl, yer, p); break; } }
      if(!yer){
        const pl = {free:[{x:0, y:0, w:W, h:H}], used:[]};
        yer = mrBul(pl, w, h, don, kural);
        if(!yer){ if(sig.indexOf(p) < 0) sig.push(p); continue; }
        mrKoy(pl, yer, p); pls.push(pl);
      }
    }
    const sonDoluluk = pls.length ? pls[pls.length - 1].used.reduce((t, u) => t + u.w * u.h, 0) : 0;
    if(!en || pls.length < en.pls.length || (pls.length === en.pls.length && sonDoluluk < en.son)) en = {pls, sig, son:sonDoluluk};
  }
  return en || {pls:[], sig:[]};
}
function mrBul(pl, w, h, don, kural){
  let en = null;
  const dene = (fr, ww, hh, dondu) => {
    if(ww > fr.w + 1e-6 || hh > fr.h + 1e-6) return;
    const kisa = kural === "alan" ? fr.w * fr.h - ww * hh : Math.min(fr.w - ww, fr.h - hh), uzun = kural === "alan" ? Math.min(fr.w - ww, fr.h - hh) : Math.max(fr.w - ww, fr.h - hh);
    if(!en || kisa < en.kisa || (kisa === en.kisa && uzun < en.uzun) || (kisa === en.kisa && uzun === en.uzun && fr.y + fr.x < en.y + en.x))
      en = {x:fr.x, y:fr.y, w:ww, h:hh, dondu, kisa, uzun};
  };
  pl.free.forEach(fr => { dene(fr, w, h, false); if(don && w !== h) dene(fr, h, w, true); });
  return en;
}
function mrKoy(pl, r, p){
  pl.used.push({x:r.x, y:r.y, w:r.w, h:r.h, dondu:r.dondu, p});
  const yeni = [];
  pl.free.forEach(f => {
    if(r.x >= f.x + f.w || r.x + r.w <= f.x || r.y >= f.y + f.h || r.y + r.h <= f.y){ yeni.push(f); return; }
    if(r.x > f.x) yeni.push({x:f.x, y:f.y, w:r.x - f.x, h:f.h});
    if(r.x + r.w < f.x + f.w) yeni.push({x:r.x + r.w, y:f.y, w:f.x + f.w - r.x - r.w, h:f.h});
    if(r.y > f.y) yeni.push({x:f.x, y:f.y, w:f.w, h:r.y - f.y});
    if(r.y + r.h < f.y + f.h) yeni.push({x:f.x, y:r.y + r.h, w:f.w, h:f.y + f.h - r.y - r.h});
  });
  pl.free = yeni.filter((a, i) => a.w > 1 && a.h > 1 && !yeni.some((b, j) => j !== i && b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h && (j < i || b.w * b.h > a.w * a.h)));
}
// Kolay kesim talimatı: 1) ana kesimler (şeritler), 2) her şeridin bölünmesi; artan parçalar da yazılır
function seritTalimati(seritler){
  if(!seritler || !seritler.length) return '';
  const s0 = seritler[0], art = n => n >= 20 ? ' <i>· artan ' + n + ' mm</i>' : '';
  return '<div class="kesim-talimat"><div><b>1) Ana kesimler</b> (plakanın ' + (s0.eksen === "boy" ? "boyu" : "eni") + ' boyunca): ' +
      seritler.map(s => '<span class="serit">' + s.w + '</span>').join(" ") + ' mm' + art(s0.artan) + '</div>' +
    '<div><b>2) Şeritleri bölün:</b></div><ol>' + seritler.map(s => '<li><b>' + s.w + ' mm şerit →</b> ' + s.bolumler.map(bl => {
      const p = bl.parcalar;
      if(p.length === 1) return '<span class="serit-parca">' + bl.h + ' <b>#' + p[0].no + '</b>' + (p[0].a < s.w ? ' <i>(' + p[0].a + ' mm\'ye kırp)</i>' : '') + '</span>';
      return '<span class="serit-parca">' + bl.h + ' → ' + p.map(x => x.a + ' <b>#' + x.no + '</b>').join(" + ") + '</span>';
    }).join(' <span class="ayrac">|</span> ') + art(s.seritArtan) + '</li>').join("") + '</ol></div>';
}
function plakaSvg(m, used, sira, toplam, o, seritler){
  const pay = o.pay || 0, t = o.testere || 0, fs = Math.max(28, Math.min(m.en, m.boy) / 40);
  const parca = used.map(u => {
    const w = u.w - t, h = u.h - t, x = pay + u.x, y = pay + u.y, olcu = (u.dondu ? u.p.boy + "×" + u.p.en : u.p.en + "×" + u.p.boy);
    const yazi = Math.min(fs, w / 6, h / 2.4);
    return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="kp' + (u.p.damar ? ' damar' : '') + '"/>' +
      (yazi > 9 ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2) + '" font-size="' + yazi + '" text-anchor="middle" dominant-baseline="middle"><tspan font-weight="700">' + u.p.no + '</tspan> ' + esc(olcu) + '</text>' +
        (h > yazi * 3 && w > yazi * 8 ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + yazi * 1.2) + '" font-size="' + yazi * .8 + '" text-anchor="middle" dominant-baseline="middle" class="kp-ad">' + esc(String(u.p.ad || "").slice(0, 24)) + (u.dondu ? ' ↻' : '') + '</text>' : '') : '') + '</g>';
  }).join("");
  return '<div class="plaka"><div class="plaka-baslik"><b>' + esc(m.ad) + ' — plaka ' + sira + '/' + toplam + '</b><span>' + m.en + ' × ' + m.boy + ' mm · ' + used.length + ' parça · doluluk %' +
    Math.round(used.reduce((a, u) => a + u.p.en * u.p.boy, 0) / (m.en * m.boy) * 100) + '</span></div>' +
    '<svg viewBox="-10 -10 ' + (m.en + 20) + ' ' + (m.boy + 20) + '" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="' + m.en + '" height="' + m.boy + '" class="kp-plaka"/>' + parca + '</svg>' + seritTalimati(seritler) + '</div>';
}
// "220x240x60" → en, boy, derinlik (mm). 1000'den küçük sayılar santimetre sayılır.
function olcuOku(s){
  const l = String(s || "").replace(/,/g, ".").match(/\d+(\.\d+)?/g); if(!l || l.length < 2) return null;
  const n = l.slice(0, 3).map(Number), cm = n.every(v => v < 1000);
  return n.map(v => Math.round(cm ? v * 10 : v));
}
// Basit dolap gövdesi → parça listesi
const DOLAP_TIP = {alt:"Alt dolap", ust:"Üst dolap", boy:"Boy dolap / gardırop", kutu:"Kutu / raf ünitesi"};
function dolapParcalari(d){
  const t = d.kalinlik || 18, W = d.en, H = d.boy, D = d.derinlik, ic = W - 2 * t, n = d.adet || 1, l = [], ad = d.ad ? d.ad + " · " : "";
  const p = (a, en, boy, adet, ek) => { if(en > 0 && boy > 0 && adet > 0) l.push(Object.assign({id:yeniId(), ad:ad + a, en:Math.round(en), boy:Math.round(boy), adet:adet * n, malzemeId:d.govde || "", damar:false, bantU:1, bantK:0}, ek || {})); };
  p("Yan", D, H, 2);
  p("Alt tabla", ic, D, 1);
  if(d.tip === "alt") p("Kuşak", ic, 100, 2, {bantU:0});
  else p("Üst tabla", ic, D, 1);
  if(d.raf) p("Raf", ic - 2, D - 20, d.raf);
  if(d.arkalik) p("Arkalık", W - 4, H - 4, 1, {malzemeId:d.arkalik, bantU:0});
  if(d.kapak){
    const ke = (W - 4 - (d.kapak - 1) * 3) / d.kapak;
    p("Kapak", ke, H - 4, d.kapak, {malzemeId:d.kapakMalzeme || d.govde || "", damar:true, bantU:2, bantK:2});
  }
  return l;
}
function tipTahmin(ad){ const a = trKucuk(ad); return /üst|ust/.test(a) ? "ust" : /alt|tezgah/.test(a) ? "alt" : /gardırop|gardirop|boy|dolap/.test(a) ? "boy" : "kutu"; }

let kesimForm = null;
function ekranKesim(isId){
  const ie = bul("is_emirleri", isId);
  if(!ie) return {baslik:"Kesim listesi", geri:true, html:'<div class="kart">' + bos("is", "İş emri bulunamadı.") + '</div>'};
  if(!kesimForm || kesimForm.isId !== isId){
    const k = ie.kesim || {};
    kesimForm = {isId, parcalar:(k.parcalar || []).map(x => Object.assign({}, x)), testere:k.testere != null ? k.testere : 4, pay:k.pay != null ? k.pay : 10, yontem:k.yontem || "kolay", degisti:false};
  }
  const f = kesimForm, pm = plakaMalzemeleri(), sonuc = kesimHesapla(f.parcalar, f), Y = yetki.yonetici;
  const vp = varsayilanPlaka();
  const mSec = (v, sinif) => '<select class="kutu ' + sinif + '">' + (pm.length ? '' : '<option value="">Plaka ' + vp.en + '×' + vp.boy + '</option>') + pm.map(m => '<option value="' + m.id + '"' + (m.id === v ? ' selected' : '') + '>' + esc(plakaEtiket(m)) + '</option>').join("") +
    (pm.length && !pm.some(m => m.id === v) ? '<option value=""' + (!v ? ' selected' : '') + '>— Malzeme seçin —</option>' : '') + '</select>';
  const toplamPlaka = Object.values(sonuc).reduce((t, s) => t + s.plakalar.length, 0), toplamBant = Object.values(sonuc).reduce((t, s) => t + s.bant, 0);
  const toplamMaliyet = Object.values(sonuc).reduce((t, s) => t + s.maliyet, 0), sigmayan = Object.values(sonuc).flatMap(s => s.sigmayan);
  const satir = (p, i) => '<tr data-i="' + i + '"><td class="kp-no">' + (i + 1) + '</td><td><input class="kutu kp-ad" maxlength="60" value="' + esc(p.ad) + '"></td>' +
    '<td><input class="kutu kp-en" inputmode="numeric" value="' + (p.en || "") + '"></td><td><input class="kutu kp-boy" inputmode="numeric" value="' + (p.boy || "") + '"></td>' +
    '<td><input class="kutu kp-adet" inputmode="numeric" value="' + (p.adet || "") + '"></td><td>' + mSec(p.malzemeId, "kp-m") + '</td>' +
    '<td><select class="kutu kp-bu">' + [0, 1, 2].map(v => '<option' + (v === (p.bantU || 0) ? ' selected' : '') + '>' + v + '</option>').join("") + '</select></td>' +
    '<td><select class="kutu kp-bk">' + [0, 1, 2].map(v => '<option' + (v === (p.bantK || 0) ? ' selected' : '') + '>' + v + '</option>').join("") + '</select></td>' +
    '<td style="text-align:center"><input type="checkbox" class="kp-d"' + (p.damar ? ' checked' : '') + ' style="width:18px;height:18px"></td>' +
    '<td><button class="ikon-buton" data-is="kpSil" data-arg="' + i + '" aria-label="Sil">' + ik("x") + '</button></td></tr>';
  const html = '<div class="kart yazdirma"><div class="kart-baslik"><span>' + esc(ie.no + " · " + ie.baslik + " · " + cariAdi(ie.musteriId)) + '</span>' + (f.degisti ? '<span class="t-cikis">Kaydedilmedi</span>' : '') + '</div>' +
      (ie.kalemler.length ? '<div class="alt-bilgi" style="margin:4px 0 8px">Sipariş kalemlerinden gövde parçası üretin (ölçü “en × boy × derinlik” cm):</div><div class="secenekler">' +
        ie.kalemler.map((k, i) => '<button class="secenek" data-is="dolapUret" data-arg="' + i + '">' + ik("arti") + ' ' + esc(k.ad + (k.olcu ? " (" + k.olcu + ")" : "")) + '</button>').join("") +
        '<button class="secenek" data-is="dolapUret" data-arg="">' + ik("arti") + ' Elle dolap ölçüsü</button>' +
        (ie.kalemler.some(k => k.modul) ? '<button class="secenek secili" data-is="modulParcaUret">' + ik("kup") + ' Tüm modüllerden parça üret</button>' : '') + '</div>' : '<button class="buton ikincil kucuk" data-is="dolapUret" data-arg="">' + ik("arti") + 'Dolap ölçüsünden parça üret</button>') +
      (pm.length ? '' : '<div class="uyari" style="margin:12px 0 0">Malzeme listesinde birimi “plaka” olan malzeme yok; ' + vp.en + '×' + vp.boy + ' mm varsayıldı' + (Y ? ' (<b data-is="plakaOlcu" data-arg="" style="cursor:pointer">değiştir</b>)' : '') + '. Gerçek plaka ölçüsü ve fiyatı için <b data-git="malzemeler" style="cursor:pointer">malzeme listesine</b> plaka ekleyin (örn. 18 mm beyaz sunta, 1830×3660).</div>') +
    '</div>' +
    '<div class="kart yazdirma" style="overflow:auto"><div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600"><span>Parça listesi (' + f.parcalar.length + ' satır, ' + f.parcalar.reduce((t, p) => t + (Number(p.adet) || 0), 0) + ' parça)</span></div>' +
      '<table class="kesim-tablo"><thead><tr><th>#</th><th>Parça adı</th><th>En (mm)</th><th>Boy (mm)</th><th>Adet</th><th>Malzeme</th><th title="Bantlı uzun kenar">Bant U</th><th title="Bantlı kısa kenar">Bant K</th><th title="Desen yönü: döndürülmez">Damar</th><th></th></tr></thead>' +
      '<tbody id="kpGovde">' + f.parcalar.map(satir).join("") + '</tbody></table>' +
      '<div class="buton-sira" style="margin-top:10px"><button class="buton ikincil kucuk" style="margin:0" data-is="kpEkle">' + ik("arti") + 'Parça ekle</button>' + (f.parcalar.length ? '<button class="buton ikincil kucuk" style="margin:0" data-is="kpTemizle">Listeyi temizle</button>' : '') + '</div>' +
      '<div class="izgara dort" style="margin:12px 0 0"><div><label class="etiket" for="kYontem">Kesim yöntemi</label><select id="kYontem" class="kutu">' +
        [["kolay", "Kolay kesim (şeritli)"], ["fire", "En az fire"]].map(([v, a]) => '<option value="' + v + '"' + (v === f.yontem ? ' selected' : '') + '>' + a + '</option>').join("") + '</select></div>' +
        '<div><label class="etiket" for="kTestere">Testere kalınlığı (mm)</label><input id="kTestere" class="kutu" inputmode="decimal" value="' + f.testere + '"></div>' +
        '<div><label class="etiket" for="kPay">Plaka kenar payı (mm)</label><input id="kPay" class="kutu" inputmode="decimal" value="' + f.pay + '"></div>' +
        '<div><label class="etiket">&nbsp;</label><button class="buton" style="margin:0" data-is="kesimKaydet">' + ik("tamam") + 'Kaydet</button></div></div></div>' +
    // Yazdırılan kısım
    '<div class="kesim-baski-baslik"><img src="logo.png" alt="" style="height:34px"><div><b>KESİM PLANI</b> · ' + esc(ie.no + " " + ie.baslik) + '<br><span>' + esc(cariAdi(ie.musteriId)) + ' · ' + tarihYaz(bugun()) + '</span></div></div>' +
    (sigmayan.length ? '<div class="uyari">Plakaya sığmayan parça: ' + esc(Array.from(new Set(sigmayan.map(p => "#" + p.no + " " + p.ad + " " + p.en + "×" + p.boy))).join(", ")) + '. Ölçüyü veya malzemenin plaka ölçüsünü kontrol edin.</div>' : '') +
    (toplamPlaka ? '<div class="izgara dort"><div class="kart ozet"><div class="kart-baslik">Plaka</div><div class="deger">' + toplamPlaka + '</div>' +
        (() => { const d = Object.values(sonuc).reduce((t, x) => t + (x.plakalar.length ? x.diger : 0), 0);
          return d === toplamPlaka ? '<div class="alt-bilgi">' + (f.yontem === "fire" ? "Kolay kesimde de" : "En az fire yönteminde de") + ' aynı</div>' :
            '<div class="alt-bilgi">' + (f.yontem === "fire" ? "Kolay kesimde " : "En az fire yönteminde ") + d + ' plaka</div>'; })() + '</div>' +
      '<div class="kart ozet"><div class="kart-baslik">Kenar bandı</div><div class="deger">' + miktarYaz(Math.ceil(toplamBant * 1.1 * 10) / 10) + ' m</div><div class="alt-bilgi">%10 payla</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Fire</div><div class="deger">%' + Math.round(100 - Object.values(sonuc).reduce((t, s) => t + s.kullanilanM2, 0) / Math.max(1e-9, Object.values(sonuc).reduce((t, s) => t + s.kullanilanM2 + s.fireM2, 0)) * 100) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Plaka maliyeti</div><div class="deger">' + (Y ? para(toplamMaliyet) : '—') + '</div><div class="alt-bilgi">KDV hariç</div></div></div>' +
      '<div class="kart"><table class="kesim-ozet"><thead><tr><th>Malzeme</th><th>Plaka</th><th>Parça</th><th>Doluluk</th><th>Fire</th><th>Bant</th>' + (Y ? '<th>Maliyet</th>' : '') + '</tr></thead><tbody>' +
        Object.values(sonuc).filter(s => s.plakalar.length).map(s => '<tr><td>' + esc(s.m.ad) + '<div class="s2">' + s.m.en + '×' + s.m.boy + ' mm' +
          (Y ? ' <button class="baglanti yazdirma" style="margin:0" data-is="plakaOlcu" data-arg="' + (s.m.id || "") + '">değiştir</button>' : '') + '</div></td><td>' + s.plakalar.length + '</td><td>' + s.parcaSayisi + '</td><td>%' + Math.round(s.kullanim) + '</td><td>' + miktarYaz(Math.round(s.fireM2 * 100) / 100) + ' m²</td><td>' +
          miktarYaz(Math.round(s.bant * 10) / 10) + ' m</td>' + (Y ? '<td>' + para(s.maliyet) + '</td>' : '') + '</tr>').join("") + '</tbody></table>' +
        (Y && Object.values(sonuc).some(s => s.m.id && s.plakalar.length) ? '<button class="buton ikincil kucuk yazdirma" style="margin-top:10px" data-is="kesimStok">' + ik("koli") + 'Plakaları stoktan düş</button>' : '') +
        '<button class="buton kucuk yazdirma" style="margin:10px 0 0 8px" onclick="window.print()">' + ik("yazdir") + 'Atölyeye yazdır</button>' +
        '<button class="buton kucuk ikincil yazdirma" style="margin:10px 0 0 8px" data-is="kesimExcel">' + ik("indir") + 'Excel</button>' +
        '<button class="buton kucuk ikincil yazdirma" style="margin:10px 0 0 8px" data-is="kesimCsv">' + ik("indir") + 'CSV (kesim makinesi)</button>' +
        '<button class="buton kucuk ikincil yazdirma" style="margin:10px 0 0 8px" data-git="etiket/' + ie.id + '">' + ik("yazdir") + 'Parça etiketleri</button></div>' +
      '<div class="kart kesim-parcalar"><div class="kart-baslik" style="font-size:14px;color:var(--yazi);font-weight:600">Kesilecek parçalar</div><table class="kesim-ozet"><thead><tr><th>#</th><th>Parça</th><th>Ölçü (mm)</th><th>Adet</th><th>Malzeme</th><th>Bant</th></tr></thead><tbody>' +
        f.parcalar.map((p, i) => p.en > 0 && p.boy > 0 && p.adet > 0 ? '<tr><td><b>' + (i + 1) + '</b></td><td>' + esc(p.ad) + (p.damar ? ' <span class="ist">(damar)</span>' : '') + '</td><td>' + p.en + ' × ' + p.boy + '</td><td>' + p.adet + '</td><td>' + esc(plakaBul(p.malzemeId).ad) + '</td><td>' +
          [p.bantU ? p.bantU + " uzun" : "", p.bantK ? p.bantK + " kısa" : ""].filter(Boolean).join(", ") + '</td></tr>' : '').join("") + '</tbody></table></div>' +
      Object.values(sonuc).map(s => s.plakalar.map((u, i) => plakaSvg(s.m, u, i + 1, s.plakalar.length, s, s.seritler && s.seritler[i])).join("")).join("") :
      '<div class="kart">' + bos("cetvel", "Parça ekleyin veya sipariş kaleminden dolap gövdesi üretin; plaka planı burada çıkar.") + '</div>');
  return {baslik:"Kesim listesi · " + ie.no, geri:true, baskiLogo:false, html, sonra(){
    const g = document.getElementById("kpGovde"); if(!g) return;
    const oku = () => {
      g.querySelectorAll("tr").forEach(tr => {
        const p = f.parcalar[Number(tr.getAttribute("data-i"))];
        p.ad = tr.querySelector(".kp-ad").value.trim(); p.en = Math.round(sayiOku(tr.querySelector(".kp-en").value) || 0); p.boy = Math.round(sayiOku(tr.querySelector(".kp-boy").value) || 0);
        p.adet = Math.round(sayiOku(tr.querySelector(".kp-adet").value) || 0); p.malzemeId = tr.querySelector(".kp-m").value; p.damar = tr.querySelector(".kp-d").checked;
        p.bantU = Number(tr.querySelector(".kp-bu").value); p.bantK = Number(tr.querySelector(".kp-bk").value);
      });
      f.testere = Math.max(0, sayiOku(deger("kTestere")) || 0); f.pay = Math.max(0, sayiOku(deger("kPay")) || 0); f.yontem = deger("kYontem") || "kolay"; f.degisti = true;
    };
    // Alandan çıkınca (değişince) plan yeniden hesaplanır; odak bir sonraki alanda kalır
    const izle = e => e.target.closest("#kpGovde") || e.target.id === "kTestere" || e.target.id === "kPay" || e.target.id === "kYontem";
    const sayfa = document.querySelector(".sayfa");
    sayfa.addEventListener("input", e => { if(izle(e)) oku(); });
    sayfa.addEventListener("change", e => {
      if(!izle(e)) return; oku();
      setTimeout(() => {
        const a = document.activeElement, tr = a && a.closest && a.closest("#kpGovde tr"), sinif = tr ? (a.className.split(" ").find(c => c.indexOf("kp-") === 0) || "") : (a && a.id) || "", y = window.scrollY;
        ciz(); window.scrollTo(0, y);
        const el = tr ? document.querySelector('#kpGovde tr[data-i="' + tr.getAttribute("data-i") + '"] .' + sinif) : sinif ? document.getElementById(sinif) : null;
        if(el) el.focus();
      }, 0);
    });
    kesimOku = oku;
  }};
}
let kesimOku = () => {};
EYLEM.kpEkle = () => { kesimOku(); const s = kesimForm.parcalar[kesimForm.parcalar.length - 1]; kesimForm.parcalar.push({id:yeniId(), ad:"", en:0, boy:0, adet:1, malzemeId:s ? s.malzemeId : (plakaMalzemeleri()[0] || {}).id || "", damar:false, bantU:1, bantK:0}); kesimForm.degisti = true; ciz();
  const l = document.querySelectorAll(".kp-ad"); if(l.length) l[l.length - 1].focus(); };
EYLEM.kpSil = (el, i) => { kesimOku(); kesimForm.parcalar.splice(Number(i), 1); kesimForm.degisti = true; ciz(); };
EYLEM.kpTemizle = () => onayla("Parça listesi temizlensin mi?", "Kaydetmediğiniz sürece iş emrindeki liste değişmez.", "Temizle", () => { kesimForm.parcalar = []; kesimForm.degisti = true; ciz(); });
EYLEM.kesimKaydet = btn => {
  kesimOku(); const f = kesimForm, ie = bul("is_emirleri", f.isId); if(!ie) return;
  if(cevrimici && eksikSutun.kesim) return uyar("Önce veritabanı güncellemesi", "Supabase'de supabase-guncelleme-10.sql dosyasını çalıştırın.");
  const parcalar = f.parcalar.filter(p => p.en > 0 && p.boy > 0 && p.adet > 0);
  islem(btn, async () => {
    await Depo.kaydet("is_emirleri", Object.assign({}, ie, {kesim:{parcalar, testere:f.testere, pay:f.pay, yontem:f.yontem}}));
    f.parcalar = parcalar.map(p => Object.assign({}, p)); f.degisti = false; bildir("Kesim listesi kaydedildi"); ciz();
  });
};
EYLEM.dolapUret = (el, i) => {
  kesimOku();
  const ie = bul("is_emirleri", kesimForm.isId), k = i === "" ? null : ie.kalemler[Number(i)], o = k ? olcuOku(k.olcu) : null, pm = plakaMalzemeleri();
  const d = {ad:k ? k.ad : "", tip:tipTahmin(k ? k.ad : ""), en:o ? o[0] : 600, boy:o ? o[1] : 720, derinlik:o && o[2] ? o[2] : 560, adet:k ? Math.max(1, Number(k.adet) || 1) : 1, kalinlik:18, raf:1, kapak:o && o[0] > 600 ? 2 : 1,
    govde:(pm[0] || {}).id || "", kapakMalzeme:(pm[0] || {}).id || "", arkalik:(pm.find(m => /duralit|arkal|\b[3-8] ?mm|hdf/i.test(m.ad)) || {}).id || ""};
  if(d.tip === "alt" && !(o && o[2])) d.derinlik = 560; if(d.tip === "ust" && !(o && o[2])) d.derinlik = 320;
  const md = k && k.modul && modulBul(k.modul.id);   // modülden eklenen kalem: modülün ayarları
  if(md && DOLAP_TIP[md.tip]) Object.assign(d, {tip:md.tip, en:k.modul.en, boy:k.modul.boy, derinlik:k.modul.derinlik, raf:md.raf || 0, kapak:md.kapak || 0, kalinlik:md.kalinlik || 18,
    govde:md.govde || d.govde, kapakMalzeme:md.kapakMalzeme || md.govde || d.kapakMalzeme, arkalik:md.arkalik || ""});
  const mSec = (id, v, bos_) => plakaSecici(id, v, bos_);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:560px;max-height:92vh;overflow:auto"><p>Dolap gövdesinden parça üret</p><div class="alt-bilgi">' + (k ? esc(k.ad + (k.olcu ? " · " + k.olcu : "")) : "Ölçüleri yazın") + ' · ölçüler mm</div>' +
    '<label class="etiket">Tür</label><div class="secenekler" id="dTip">' + Object.entries(DOLAP_TIP).map(([v, y]) => '<button type="button" class="secenek' + (v === d.tip ? ' secili' : '') + '" data-t="' + v + '">' + y + '</button>').join("") + '</div>' +
    '<div class="izgara dort" style="margin:0">' + [["dEn", "En", d.en], ["dBoy", "Boy (yükseklik)", d.boy], ["dDer", "Derinlik", d.derinlik], ["dAdet", "Adet", d.adet]].map(([id, a, v]) => '<div><label class="etiket" for="' + id + '">' + a + '</label><input id="' + id + '" class="kutu" inputmode="numeric" value="' + v + '"></div>').join("") + '</div>' +
    '<div class="izgara dort" style="margin:0">' + [["dKal", "Gövde kalınlığı", d.kalinlik], ["dRaf", "Raf sayısı", d.raf], ["dKapak", "Kapak sayısı", d.kapak]].map(([id, a, v]) => '<div><label class="etiket" for="' + id + '">' + a + '</label><input id="' + id + '" class="kutu" inputmode="numeric" value="' + v + '"></div>').join("") + '<div></div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="dGovde">Gövde malzemesi</label>' + mSec("dGovde", d.govde) + '</div><div><label class="etiket" for="dKapakM">Kapak malzemesi</label>' + mSec("dKapakM", d.kapakMalzeme) + '</div></div>' +
    '<label class="etiket" for="dArka">Arkalık</label>' + mSec("dArka", d.arkalik, "Arkalık yok / ayrıca kesilmeyecek") +
    '<div class="alt-bilgi">Yanlar tam boy, alt-üst tablalar yanların arasına girer; alt dolapta üst tabla yerine 2 kuşak (100 mm) çıkar. Kapaklar 4 mm boşlukla, 4 kenarı bantlı ve damarlı hesaplanır. Listeyi sonra düzenleyebilirsiniz.</div>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="ekle">' + ik("arti") + 'Parçaları ekle</button></div></div>';
  p.addEventListener("click", e => {
    const t = e.target.closest("[data-t]"); if(t){ p.querySelectorAll("#dTip .secenek").forEach(x => x.classList.toggle("secili", x === t)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const n = id => Math.max(0, Math.round(sayiOku(p.querySelector("#" + id).value) || 0));
    const y = {ad:d.ad, tip:p.querySelector("#dTip .secili").getAttribute("data-t"), en:n("dEn"), boy:n("dBoy"), derinlik:n("dDer"), adet:Math.max(1, n("dAdet")), kalinlik:n("dKal") || 18,
      raf:n("dRaf"), kapak:n("dKapak"), govde:p.querySelector("#dGovde").value, kapakMalzeme:p.querySelector("#dKapakM").value, arkalik:p.querySelector("#dArka").value};
    if(y.en < 100 || y.boy < 100 || y.derinlik < 100) return uyar("Ölçüleri kontrol edin", "En, boy ve derinlik mm cinsinden olmalı (örn. 600 × 720 × 560).");
    kesimForm.parcalar = kesimForm.parcalar.concat(dolapParcalari(y)); kesimForm.degisti = true; p.remove(); ciz(); bildir("Parçalar eklendi; kaydetmeyi unutmayın");
  });
  document.body.appendChild(p);
};
EYLEM.kesimStok = () => {
  kesimOku();
  const ie = bul("is_emirleri", kesimForm.isId), s = Object.values(kesimHesapla(kesimForm.parcalar, kesimForm)).filter(x => x.m.id && x.plakalar.length);
  if(!s.length) return;
  onayla("Plakalar stoktan düşülsün mü?", s.map(x => x.m.ad + ": " + x.plakalar.length + " plaka").join(", ") + " · " + ie.no + " işine yazılır, iş maliyetine eklenir.", "Stoktan düş",
    () => islem(null, async () => {
      await Depo.kaydet("stok_hareket", s.map(x => ({id:yeniId(), malzemeId:x.m.id, tur:"cikis", miktar:-x.plakalar.length, tarih:bugun(), isEmriId:ie.id, aciklama:"Kesim planı", olusma:Date.now()})));
      await notEkle(ie.id, "Kesim planına göre stoktan düşüldü: " + s.map(x => x.plakalar.length + " " + x.m.ad).join(", ")); bildir("Stoktan düşüldü"); ciz();
    }), false);
};
