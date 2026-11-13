"use strict";
// Güneş Mobilya — sözleşme / hakediş / metraj, taşeronlar, teklif sürümleri, garanti ve servis, müşteri iş sayfası ve teklif onayı, nakit akışı tahmini
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
// Fiyatlı ekler iş emrinin "ekler" alanında (fiyat tablosunda, ustalar görmez): {sozlesme, taseronlar, surumler}.
// Servis kayıtları "servis" alanında (ustalar da görür / girer): {garantiAy, kayitlar}. Veritabanı: supabase-guncelleme-17.sql.

const ekHazir = () => !cevrimici || !eksikSutun.ekler;
const ekUyari = () => ekHazir() ? '' : '<div class="uyari">Bu bilgilerin kaydedilmesi için Supabase\'de <b>supabase-guncelleme-17.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>';
const ieEk = ie => Object.assign({}, ie.ekler || {});
async function ekKaydet(ie, degis, not){
  if(!ekHazir()) throw new Error("Önce Supabase'de supabase-guncelleme-17.sql dosyasını çalıştırın.");
  await Depo.kaydet("is_emirleri", Object.assign({}, ie, {ekler:Object.assign(ieEk(ie), degis)}));
  if(not) await notEkle(ie.id, not);
}
// Yazdırma: geçici bir baskı alanı (teklif yazdırmadaki gibi)
function baskiAl(html){
  document.querySelectorAll(".baski").forEach(x => x.remove());
  const b = document.createElement("div"); b.className = "baski"; b.innerHTML = html; document.body.appendChild(b);
  const temizle = () => { b.remove(); document.body.classList.remove("teklif-baski"); window.removeEventListener("afterprint", temizle); };
  window.addEventListener("afterprint", temizle); document.body.classList.add("teklif-baski"); window.print();
}
const baskiUst = (baslik, alt) => { const fr = firma(), d = new Date();
  return '<div class="b-ust"><div><img src="logo.png" alt="" style="height:42px;display:block;margin-bottom:6px"><div>' + esc([fr.adres, fr.telefon].filter(Boolean).join(" · ")) + '</div></div>' +
    '<div style="text-align:right"><b style="font-size:16px">' + esc(baslik) + '</b><br>' + esc(alt || "") + '<br>Tarih: ' + d.getDate() + " " + AYLAR[d.getMonth()] + " " + d.getFullYear() + '</div></div>'; };

/* ================= TEKLİF SÜRÜMLERİ ================= */
// Teklif aşamasında kalem / fiyat değişince önceki hâl sürüm olarak saklanır (en çok 20).
const surumOzu = ie => JSON.stringify({k:(ie.kalemler || []).map(k => [k.ad, k.olcu, Number(k.adet) || 0, Number(k.fiyat) || 0]), t:[(ie.teklif || {}).fiyat || 0, (ie.teklif || {}).indirim || 0, (ie.teklif || {}).kdv], u:Number(ie.tutar) || 0});
const teklifSurumu = ie => ({zaman:Date.now(), kim:kullaniciAdi(), kalemler:JSON.parse(JSON.stringify(ie.kalemler || [])), teklif:Object.assign({}, ie.teklif || {}), tutar:Number(ie.tutar) || 0});
// isKaydet çağırır: değiştiyse eski hâli sürüm listesine ekler
function teklifSurumEkle(eski, yeni){
  if(!eski || !(eski.durum === "Teklif" || yeni.durum === "Teklif") || !fiyatliMi(eski.kalemler) && !(eski.tutar > 0) || surumOzu(eski) === surumOzu(yeni)) return;
  const e = ieEk(eski); yeni.ekler = Object.assign({}, yeni.ekler || {}, {surumler:(e.surumler || []).concat([teklifSurumu(eski)]).slice(-20)});
}
function kalemFarki(a, b){   // a: eski, b: yeni
  const ad = k => String(k.ad || "").trim().toLocaleLowerCase("tr"), l = [];
  b.forEach(k => { const e = a.find(x => ad(x) === ad(k));
    if(!e) l.push('<span class="t-giris">+ ' + esc(k.ad) + (k.fiyat ? ' (' + para(k.fiyat * k.adet) + ')' : '') + '</span>');
    else if((e.fiyat || 0) !== (k.fiyat || 0) || Number(e.adet) !== Number(k.adet)) l.push(esc(k.ad) + ': ' + (Number(e.adet) !== Number(k.adet) ? e.adet + ' → ' + k.adet + ' adet ' : '') + ((e.fiyat || 0) !== (k.fiyat || 0) ? para(e.fiyat || 0) + ' → ' + para(k.fiyat || 0) : '')); });
  a.forEach(k => { if(!b.some(x => ad(x) === ad(k))) l.push('<span class="t-cikis">− ' + esc(k.ad) + '</span>'); });
  return l.length ? l.join("<br>") : 'Kalemler aynı; KDV / indirim değişti.';
}
function teklifSurumKarti(ie){
  const l = ieEk(ie).surumler || []; if(!l.length || !yetki.yonetici) return '';
  const hepsi = l.concat([{zaman:ie._degisme || Date.now(), kim:"", kalemler:ie.kalemler, teklif:ie.teklif, tutar:ie.tutar, guncel:true}]);
  return '<div class="kart yazdirma">' + kartBaslik("Teklif sürümleri (" + hepsi.length + ")", "(pazarlık geçmişi)") + hepsi.map((s, i) => {
    const onceki = hepsi[i - 1];
    return '<details class="surum"><summary><b>' + (s.guncel ? "Güncel teklif" : (i + 1) + ". teklif") + '</b> · ' + esc(tarihYaz(tarihStr(new Date(s.zaman)), true)) + (s.kim ? ' · ' + esc(s.kim) : '') +
      '<span class="sag-yazi">' + para(s.tutar) + (onceki ? ' <span class="' + (s.tutar < onceki.tutar ? 't-cikis' : 't-giris') + '">(' + (s.tutar >= onceki.tutar ? "+" : "−") + para(Math.abs(s.tutar - onceki.tutar)) + ')</span>' : '') + '</span></summary>' +
      '<div class="alt-bilgi" style="margin:6px 0">' + (onceki ? kalemFarki(onceki.kalemler || [], s.kalemler || []) : (s.kalemler || []).map(k => esc(k.ad) + (k.fiyat ? ' · ' + k.adet + ' × ' + para(k.fiyat) : '')).join("<br>")) + '</div>' +
      (s.guncel ? '' : '<button class="baglanti" style="margin:0" data-is="surumeDon" data-arg="' + ie.id + '|' + i + '">Bu teklife geri dön</button>') + '</details>';
  }).join("") + '</div>';
}
EYLEM.surumeDon = (el, arg) => {
  const [id, i] = arg.split("|"), ie = bul("is_emirleri", id), s = (ieEk(ie).surumler || [])[Number(i)]; if(!s) return;
  onayla((Number(i) + 1) + ". teklife geri dönülsün mü?", "Kalemler ve fiyatlar o teklifteki hâline döner; şimdiki hâl de sürüm olarak saklanır.", "Geri dön", () => islem(null, async () => {
    const e = ieEk(ie); e.surumler = (e.surumler || []).concat([teklifSurumu(ie)]).slice(-20);
    await Depo.kaydet("is_emirleri", Object.assign({}, ie, {kalemler:JSON.parse(JSON.stringify(s.kalemler)), teklif:Object.assign({}, s.teklif), tutar:s.tutar, ekler:e}));
    await notEkle(id, (Number(i) + 1) + ". teklife geri dönüldü (" + para(s.tutar) + ")"); bildir("Teklif geri alındı"); ciz();
  }), false);
};

/* ================= SÖZLEŞME / METRAJ / HAKEDİŞ ================= */
// sozlesme: {kalemler:[{id, ad, birim, miktar, fiyat}], teminat:%, kdv:%, tevkifat:(x/10), avans:₺, hakedisler:[{id, no, tarih, miktar:{kalemId: kümülatif}, avansMahsup, kesinti, kesintiAd, aciklama}]}
const sozlesmeVar = s => s && Array.isArray(s.kalemler) && s.kalemler.length;
const sozlesmeAl = ie => Object.assign({kalemler:[], teminat:5, kdv:varsayilanKdv(), tevkifat:0, avans:0, hakedisler:[]}, ieEk(ie).sozlesme || {});
const sozlesmeBedeli = s => yuvarla(s.kalemler.reduce((t, k) => t + (Number(k.miktar) || 0) * (Number(k.fiyat) || 0), 0));
function hakedisHesapla(s, i){
  const h = s.hakedisler[i], o = s.hakedisler[i - 1] || {miktar:{}};
  const detay = s.kalemler.map(k => { const simdi = Number((h.miktar || {})[k.id]) || 0, onceki = Number((o.miktar || {})[k.id]) || 0;
    return {k, onceki, simdi, fark:yuvarla((simdi - onceki) * 1000) / 1000, tutar:yuvarla((simdi - onceki) * (Number(k.fiyat) || 0)), kum:yuvarla(simdi * (Number(k.fiyat) || 0))}; });
  const buDonem = yuvarla(detay.reduce((t, x) => t + x.tutar, 0)), kumulatif = yuvarla(detay.reduce((t, x) => t + x.kum, 0));
  const kdv = yuvarla(buDonem * (Number(s.kdv) || 0) / 100), tevkifat = yuvarla(kdv * (Number(s.tevkifat) || 0) / 10), teminat = yuvarla(buDonem * (Number(s.teminat) || 0) / 100);
  const avansMahsup = yuvarla(Number(h.avansMahsup) || 0), kesinti = yuvarla(Number(h.kesinti) || 0);
  return {h, detay, buDonem, kumulatif, kdv, tevkifat, teminat, avansMahsup, kesinti, odenecek:yuvarla(buDonem + kdv - tevkifat - teminat - avansMahsup - kesinti), oran:sozlesmeBedeli(s) ? kumulatif / sozlesmeBedeli(s) * 100 : 0};
}
const hakedisFaturasi = (ie, h) => veri.faturalar.find(f => f.isEmriId === ie.id && f.tur === "satis" && new RegExp("^Hakediş " + h.no + "\\b").test(f.aciklama || ""));
function sozlesmeKarti(ie){
  if(!yetki.yonetici || yetki.salt && !sozlesmeVar(ieEk(ie).sozlesme) && !(ieEk(ie).taseronlar || []).length) return '';
  const s = sozlesmeAl(ie), t = ieEk(ie).taseronlar || [], muteahhit = ie.kol && ie.kol !== "";
  if(!sozlesmeVar(s) && !t.length && !muteahhit) return '<div class="yazdirma" style="margin:-4px 0 12px"><button class="baglanti" style="margin:0" data-git="hakedis/' + ie.id + '">' + ik("fatura") + ' Sözleşme / hakediş / taşeron</button></div>';
  const son = s.hakedisler.length ? hakedisHesapla(s, s.hakedisler.length - 1) : null, bedel = sozlesmeBedeli(s);
  return '<div class="kart yazdirma">' + kartBaslik("Sözleşme ve hakediş", '<button class="baglanti" style="margin:0" data-git="hakedis/' + ie.id + '">Aç</button>') +
    (sozlesmeVar(s) ? bilgiSatir("Sözleşme bedeli (KDV hariç)", para(bedel)) + bilgiSatir("Hakediş", s.hakedisler.length + " adet · yapılan %" + Math.round(son ? son.oran : 0)) +
      '<div class="hedef-yol" style="margin:6px 0 4px"><div class="cubuk" style="width:' + Math.min(100, son ? son.oran : 0) + '%;background:var(--ana)"></div></div>' :
      '<div class="alt-bilgi" style="margin:0 0 6px">Sözleşme kalemleri (metraj, birim fiyat) girilmedi.</div>') +
    (t.length ? bilgiSatir("Taşeron", t.length + " sözleşme · " + para(t.reduce((x, y) => x + (Number(y.tutar) || 0), 0))) : '') + '</div>';
}
function ekranHakedis(id){
  const ie = bul("is_emirleri", id);
  if(!ie) return {baslik:"Hakediş", geri:true, html:'<div class="kart">' + bos("is", "İş emri bulunamadı.") + '</div>'};
  const s = sozlesmeAl(ie), bedel = sozlesmeBedeli(s), sek = filtre.hakedisSekme || "hakedis";
  const sekme = '<div class="secenekler" style="margin-bottom:12px">' + [["hakedis", "Hakedişler"], ["sozlesme", "Sözleşme / metraj"], ["taseron", "Taşeronlar"]].map(([k, a]) =>
    '<button class="secenek' + (k === sek ? ' secili' : '') + '" data-is="hakedisSekme" data-arg="' + k + '">' + a + '</button>').join("") + '</div>';
  let govde = "";
  if(sek === "sozlesme"){
    govde = '<div class="kart" style="overflow:auto">' + kartBaslik("Sözleşme kalemleri", "(metraj · KDV hariç birim fiyat)") +
      '<table class="kesim-tablo"><thead><tr><th>İş kalemi</th><th>Birim</th><th>Miktar</th><th>Birim fiyat</th><th>Tutar</th><th></th></tr></thead><tbody id="szGovde">' +
      (s.kalemler.length ? s.kalemler : [{id:yeniId(), ad:"", birim:"m²", miktar:0, fiyat:0}]).map(k => '<tr data-id="' + k.id + '"><td><input class="kutu sz-ad" maxlength="120" value="' + esc(k.ad) + '" placeholder="Örn: Kaba sıva"></td>' +
        '<td><input class="kutu sz-birim" maxlength="12" value="' + esc(k.birim || "") + '" style="width:70px"></td><td><input class="kutu sz-miktar" inputmode="decimal" value="' + sayiYaz(k.miktar) + '" style="width:90px"></td>' +
        '<td><input class="kutu sz-fiyat" inputmode="decimal" value="' + sayiYaz(k.fiyat) + '" style="width:110px"></td><td class="sz-tutar" style="white-space:nowrap">' + para((k.miktar || 0) * (k.fiyat || 0)) + '</td>' +
        '<td><button class="ikon-buton" data-is="szSatirSil" aria-label="Sil">' + ik("x") + '</button></td></tr>').join("") + '</tbody></table>' +
      '<div class="buton-sira" style="margin-top:10px"><button class="buton ikincil kucuk" style="margin:0" data-is="szSatirEkle">' + ik("arti") + 'Kalem ekle</button>' +
        (ie.kalemler.length ? '<button class="buton ikincil kucuk" style="margin:0" data-is="szIsKalemleri" data-arg="' + id + '">İş emri kalemlerinden al</button>' : '') + '</div>' +
      '<div class="izgara dort" style="margin:12px 0 0">' + sayiAlan("szTeminat", "Teminat kesintisi", s.teminat, "(%)") + sayiAlan("szKdv", "KDV", s.kdv, "(%)") + sayiAlan("szTevkifat", "KDV tevkifatı", s.tevkifat, "(x/10)") + sayiAlan("szAvans", "Alınan avans", s.avans, "(₺)") + '</div>' +
      '<div class="toplamlar" id="szToplam">' + bilgiSatir("Sözleşme bedeli (KDV hariç)", para(bedel)) + '</div>' +
      '<button class="buton" data-is="szKaydet" data-arg="' + id + '">' + ik("tamam") + 'Kaydet</button></div>';
  } else if(sek === "taseron"){
    const t = ieEk(ie).taseronlar || [];
    govde = '<div class="kart liste-kart">' + kartBaslik("Taşeron sözleşmeleri", '<button class="baglanti" style="margin:0" data-is="taseronDuzenle" data-arg="' + id + '|">+ Taşeron ekle</button>') +
      (t.length ? t.map(x => { const o = taseronOdenen(ie.id, x.cariId), kal = yuvarla((Number(x.tutar) || 0) - o);
        return '<div class="satir" style="flex-wrap:wrap"><span class="rozet r-gri">' + ik("kisiler") + '</span><span class="orta"><div class="s1">' + esc(cariAdi(x.cariId) || "Taşeron") + ' · ' + esc(x.is || "") + '</div>' +
          '<div class="s2">' + esc(["Sözleşme " + para(x.tutar), x.tarih ? tarihYaz(x.tarih, true) : "", x.not].filter(Boolean).join(" · ")) + '</div>' +
          '<div class="hedef-yol" style="margin-top:6px"><div class="cubuk" style="width:' + Math.min(100, x.tutar ? o / x.tutar * 100 : 0) + '%;background:var(--ana)"></div></div></span>' +
          '<span class="sag"><div class="tutar">' + para(o) + '</div><div class="s2 ' + (kal < 0 ? 't-cikis' : '') + '">' + (kal >= 0 ? "kalan " + para(kal) : "fazla ödendi " + para(-kal)) + '</div></span>' +
          '<span class="secenekler" style="width:100%;justify-content:flex-end;margin-top:6px"><button class="secenek" data-is="taseronOde" data-arg="' + id + '|' + x.id + '">' + ik("yukari") + ' Ödeme yap</button>' +
            '<button class="secenek" data-is="taseronDuzenle" data-arg="' + id + '|' + x.id + '">Düzenle</button></span></div>'; }).join("") :
        bos("kisiler", "Bu işte taşeron yok. Taşeronları önce cari (tedarikçi) olarak ekleyin, sonra burada sözleşme tutarını girin.")) + '</div>' +
      '<div class="alt-bilgi" style="margin:0 2px">Ödenen: bu işe bağlı, taşerona yapılan kasa çıkışları. Tüm işlerdeki taşeronlar: <b data-git="taseronlar" style="cursor:pointer;color:var(--borc)">Taşeronlar</b>.</div>';
  } else {
    govde = !sozlesmeVar(s) ? '<div class="kart">' + bos("fatura", "Önce “Sözleşme / metraj” sekmesinde iş kalemlerini, miktarları ve birim fiyatları girin.") + '</div>' :
      '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Sözleşme bedeli</div><div class="deger">' + para(bedel) + '</div><div class="alt-bilgi">KDV hariç</div></div>' +
        '<div class="kart ozet"><div class="kart-baslik">Yapılan iş</div><div class="deger">' + para(s.hakedisler.length ? hakedisHesapla(s, s.hakedisler.length - 1).kumulatif : 0) + '</div><div class="alt-bilgi">%' +
          Math.round(s.hakedisler.length ? hakedisHesapla(s, s.hakedisler.length - 1).oran : 0) + '</div></div>' +
        '<div class="kart ozet"><div class="kart-baslik">Kalan iş</div><div class="deger">' + para(bedel - (s.hakedisler.length ? hakedisHesapla(s, s.hakedisler.length - 1).kumulatif : 0)) + '</div></div></div>' +
      '<button class="buton" style="margin:0 0 12px" data-is="hakedisYeni" data-arg="' + id + '">' + ik("arti") + (s.hakedisler.length + 1) + '. hakedişi hazırla</button>' +
      '<div class="kart liste-kart">' + (s.hakedisler.length ? s.hakedisler.map((h, i) => { const r = hakedisHesapla(s, i), f = hakedisFaturasi(ie, h);
        return '<div class="satir" style="flex-wrap:wrap"><span class="rozet r-ana">' + h.no + '</span><span class="orta"><div class="s1">' + h.no + '. hakediş · ' + tarihYaz(h.tarih, true) + '</div>' +
          '<div class="s2">Bu dönem ' + para(r.buDonem) + ' · kümülatif %' + Math.round(r.oran) + (f ? ' · fatura ' + esc(f.no) : '') + '</div></span>' +
          '<span class="sag"><div class="tutar">' + para(r.odenecek) + '</div><div class="s2">ödenecek</div></span>' +
          '<span class="secenekler" style="width:100%;justify-content:flex-end;margin-top:6px"><button class="secenek" data-is="hakedisYazdir" data-arg="' + id + '|' + i + '">' + ik("yazdir") + ' Yazdır</button>' +
            (f ? '<button class="secenek" data-git="fatura/' + f.id + '">Faturayı aç</button>' : '<button class="secenek" data-is="hakedisFatura" data-arg="' + id + '|' + i + '">' + ik("fatura") + ' Fatura kes</button>') +
            (i === s.hakedisler.length - 1 ? '<button class="secenek" data-is="hakedisSil" data-arg="' + id + '|' + i + '">' + ik("sil") + '</button>' : '') + '</span></div>'; }).join("") :
        bos("fatura", "Henüz hakediş yok.")) + '</div>';
  }
  return {baslik:"Hakediş · " + ie.no, geri:true, html:ekUyari() + '<div class="alt-bilgi" style="margin:0 2px 10px">' + esc(ie.baslik + " · " + cariAdi(ie.musteriId)) + '</div>' + sekme + govde, sonra(){
    const g = document.getElementById("szGovde"); if(!g) return;
    const top = () => { let t = 0; g.querySelectorAll("tr").forEach(tr => { const v = (sayiOku(tr.querySelector(".sz-miktar").value) || 0) * (sayiOku(tr.querySelector(".sz-fiyat").value) || 0); t += v; tr.querySelector(".sz-tutar").textContent = para(v); });
      document.getElementById("szToplam").innerHTML = bilgiSatir("Sözleşme bedeli (KDV hariç)", para(t)); };
    g.addEventListener("input", top);
  }};
}
EYLEM.hakedisSekme = (el, k) => { filtre.hakedisSekme = k; ciz(); };
const szSatirHtml = () => '<tr data-id="' + yeniId() + '"><td><input class="kutu sz-ad" maxlength="120" placeholder="İş kalemi"></td><td><input class="kutu sz-birim" maxlength="12" value="m²" style="width:70px"></td>' +
  '<td><input class="kutu sz-miktar" inputmode="decimal" style="width:90px"></td><td><input class="kutu sz-fiyat" inputmode="decimal" style="width:110px"></td><td class="sz-tutar">0 ₺</td><td><button class="ikon-buton" data-is="szSatirSil" aria-label="Sil">' + ik("x") + '</button></td></tr>';
EYLEM.szSatirEkle = () => { document.getElementById("szGovde").insertAdjacentHTML("beforeend", szSatirHtml()); };
EYLEM.szSatirSil = el => { const tr = el.closest("tr"), g = tr.parentNode; tr.remove(); if(!g.children.length) g.insertAdjacentHTML("beforeend", szSatirHtml()); };
EYLEM.szIsKalemleri = (el, id) => { const ie = bul("is_emirleri", id), g = document.getElementById("szGovde");
  Array.from(g.querySelectorAll("tr")).filter(tr => !tr.querySelector(".sz-ad").value.trim()).forEach(tr => tr.remove());
  ie.kalemler.forEach(k => { g.insertAdjacentHTML("beforeend", szSatirHtml()); const tr = g.lastElementChild; tr.querySelector(".sz-ad").value = k.ad; tr.querySelector(".sz-birim").value = "adet";
    tr.querySelector(".sz-miktar").value = sayiYaz(k.adet); tr.querySelector(".sz-fiyat").value = sayiYaz(k.fiyat || 0); });
  g.dispatchEvent(new Event("input"));
};
EYLEM.szKaydet = (btn, id) => {
  const ie = bul("is_emirleri", id), s = sozlesmeAl(ie), n = x => sayiOku(deger(x)) || 0;
  const kalemler = Array.from(document.querySelectorAll("#szGovde tr")).map(tr => ({id:tr.getAttribute("data-id"), ad:tr.querySelector(".sz-ad").value.trim(), birim:tr.querySelector(".sz-birim").value.trim(),
    miktar:sayiOku(tr.querySelector(".sz-miktar").value) || 0, fiyat:yuvarla(sayiOku(tr.querySelector(".sz-fiyat").value) || 0)})).filter(k => k.ad);
  if(kalemler.some(k => !(k.miktar > 0))) return uyar("Miktarları kontrol edin", "Her iş kaleminin sözleşme miktarı olmalı.");
  islem(btn, async () => { await ekKaydet(ie, {sozlesme:Object.assign(s, {kalemler, teminat:n("szTeminat"), kdv:n("szKdv"), tevkifat:Math.min(10, n("szTevkifat")), avans:yuvarla(n("szAvans"))})}); bildir("Sözleşme kaydedildi"); ciz(); });
};
EYLEM.hakedisYeni = (el, id) => {
  const ie = bul("is_emirleri", id), s = sozlesmeAl(ie), o = s.hakedisler[s.hakedisler.length - 1] || {miktar:{}}, bedel = sozlesmeBedeli(s);
  const mahsupEdilen = s.hakedisler.reduce((t, h) => t + (Number(h.avansMahsup) || 0), 0), kalanAvans = Math.max(0, (Number(s.avans) || 0) - mahsupEdilen);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:880px;max-height:92vh;overflow:auto"><p>' + (s.hakedisler.length + 1) + '. hakediş</p><div class="alt-bilgi">Her kalemde şimdiye kadar yapılan <b>toplam</b> miktarı yazın (kümülatif); bu döneme düşen kendiliğinden hesaplanır.</div>' +
    '<div style="overflow:auto"><table class="kesim-tablo hk-tablo"><thead><tr><th>İş kalemi</th><th>Sözleşme</th><th>Önceki</th><th>Şimdiye kadar</th><th>Bu dönem</th></tr></thead><tbody>' +
    s.kalemler.map(k => '<tr data-id="' + k.id + '"><td>' + esc(k.ad) + '</td><td>' + miktarYaz(k.miktar) + ' ' + esc(k.birim || "") + '</td><td>' + miktarYaz(Number(o.miktar[k.id]) || 0) + '</td>' +
      '<td><input class="kutu hk-m" inputmode="decimal" value="' + sayiYaz(Number(o.miktar[k.id]) || 0) + '" style="width:100px"></td><td class="hk-fark"></td></tr>').join("") + '</tbody></table></div>' +
    '<div class="izgara uc" style="margin:0">' + tarihAlani("hkTarih", "Tarih", bugun()).replace(/^/, '<div>') + '</div>' +
      '<div><label class="etiket" for="hkAvans">Avans mahsubu</label><input id="hkAvans" class="kutu" inputmode="decimal" value="0"><div class="alt-bilgi">Kalan avans ' + para(kalanAvans) + '</div></div>' +
      '<div><label class="etiket" for="hkKesinti">Diğer kesinti</label><input id="hkKesinti" class="kutu" inputmode="decimal" placeholder="0"><input id="hkKesintiAd" class="kutu" maxlength="60" placeholder="Açıklaması" style="margin-top:6px"></div></div>' +
    '<div class="toplamlar" id="hkOzet"></div><div class="hata" id="hkHata"></div>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Hakedişi kaydet</button></div></div>';
  const oku = () => { const m = {}; p.querySelectorAll("tr[data-id]").forEach(tr => { m[tr.getAttribute("data-id")] = sayiOku(tr.querySelector(".hk-m").value) || 0; }); return m; };
  const hesap = () => {
    const h = {id:"x", no:s.hakedisler.length + 1, tarih:p.querySelector("#hkTarih").value, miktar:oku(), avansMahsup:sayiOku(p.querySelector("#hkAvans").value) || 0, kesinti:sayiOku(p.querySelector("#hkKesinti").value) || 0};
    const s2 = Object.assign({}, s, {hakedisler:s.hakedisler.concat([h])}), r = hakedisHesapla(s2, s2.hakedisler.length - 1);
    p.querySelectorAll("tr[data-id]").forEach((tr, i) => { const d = r.detay[i]; tr.querySelector(".hk-fark").innerHTML = miktarYaz(d.fark) + ' · <b>' + para(d.tutar) + '</b>'; });
    p.querySelector("#hkOzet").innerHTML = bilgiSatir("Bu dönem iş tutarı", para(r.buDonem)) + bilgiSatir("KDV (%" + sayiYaz(s.kdv || 0) + ")", para(r.kdv)) + (r.tevkifat ? bilgiSatir("KDV tevkifatı (" + s.tevkifat + "/10)", "−" + para(r.tevkifat)) : '') +
      (r.teminat ? bilgiSatir("Teminat (%" + sayiYaz(s.teminat) + ")", "−" + para(r.teminat)) : '') + (r.avansMahsup ? bilgiSatir("Avans mahsubu", "−" + para(r.avansMahsup)) : '') + (r.kesinti ? bilgiSatir("Diğer kesinti", "−" + para(r.kesinti)) : '') +
      '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Ödenecek</span><b>' + para(r.odenecek) + '</b></div><div class="alt-bilgi">Kümülatif %' + Math.round(r.oran) + ' (' + para(r.kumulatif) + ' / ' + para(bedel) + ')</div>';
    return {h, r};
  };
  // Avans: yapılan işle orantılı önerilir
  p.addEventListener("input", e => { if(e.target.classList.contains("hk-m") && !p.querySelector("#hkAvans").dataset.elle){ const x = hesap(); if(bedel && s.avans) p.querySelector("#hkAvans").value = sayiYaz(Math.min(kalanAvans, yuvarla(s.avans * x.r.buDonem / bedel))); }
    if(e.target.id === "hkAvans") e.target.dataset.elle = 1; hesap(); });
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const {h, r} = hesap();
    if(!(r.buDonem > 0)) return p.querySelector("#hkHata").textContent = "Bu döneme düşen iş yok; miktarları kontrol edin.";
    if(r.detay.some(d => d.simdi > d.k.miktar * 1.5)) return p.querySelector("#hkHata").textContent = "Bir kalemde miktar sözleşmenin çok üstünde; kontrol edin.";
    h.id = yeniId(); h.kesintiAd = p.querySelector("#hkKesintiAd").value.trim(); h.avansMahsup = yuvarla(h.avansMahsup); h.kesinti = yuvarla(h.kesinti);
    islem(b, async () => { await ekKaydet(ie, {sozlesme:Object.assign(s, {hakedisler:s.hakedisler.concat([h])})}, h.no + ". hakediş: " + para(r.buDonem) + " (ödenecek " + para(r.odenecek) + ")"); p.remove(); bildir(h.no + ". hakediş kaydedildi"); ciz(); });
  });
  document.body.appendChild(p); hesap();
};
EYLEM.hakedisSil = (el, arg) => { const [id, i] = arg.split("|"), ie = bul("is_emirleri", id), s = sozlesmeAl(ie);
  onayla(s.hakedisler[Number(i)].no + ". hakediş silinsin mi?", "Kesilmiş fatura varsa ayrıca silin.", "Sil", () => islem(null, async () => { s.hakedisler.splice(Number(i), 1); await ekKaydet(ie, {sozlesme:s}); ciz(); })); };
EYLEM.hakedisYazdir = (el, arg) => {
  const [id, i] = arg.split("|"), ie = bul("is_emirleri", id), s = sozlesmeAl(ie), r = hakedisHesapla(s, Number(i)), m = bul("musteriler", ie.musteriId) || {};
  baskiAl(baskiUst(r.h.no + ". HAKEDİŞ RAPORU", ie.no + " · " + ie.baslik) + '<div>İş sahibi: <b>' + esc(m.ad || "") + '</b>' + (ie.adres ? ' · ' + esc(ie.adres) : '') + ' · Hakediş tarihi: ' + tarihYaz(r.h.tarih) + '</div>' +
    '<table><tr><th>İş kalemi</th><th>Birim</th><th style="text-align:right">Sözleşme</th><th style="text-align:right">Önceki</th><th style="text-align:right">Toplam</th><th style="text-align:right">Bu dönem</th><th style="text-align:right">Birim fiyat</th><th style="text-align:right">Tutar</th></tr>' +
    r.detay.map(d => '<tr><td>' + esc(d.k.ad) + '</td><td>' + esc(d.k.birim || "") + '</td><td style="text-align:right">' + miktarYaz(d.k.miktar) + '</td><td style="text-align:right">' + miktarYaz(d.onceki) + '</td><td style="text-align:right">' +
      miktarYaz(d.simdi) + '</td><td style="text-align:right">' + miktarYaz(d.fark) + '</td><td style="text-align:right">' + para(d.k.fiyat) + '</td><td style="text-align:right">' + para(d.tutar) + '</td></tr>').join("") + '</table>' +
    '<table style="margin-top:8px">' + [["Bu dönem iş tutarı", r.buDonem], ["KDV (%" + sayiYaz(s.kdv || 0) + ")", r.kdv]].concat(r.tevkifat ? [["KDV tevkifatı", -r.tevkifat]] : [], r.teminat ? [["Teminat kesintisi", -r.teminat]] : [],
      r.avansMahsup ? [["Avans mahsubu", -r.avansMahsup]] : [], r.kesinti ? [[r.h.kesintiAd || "Diğer kesinti", -r.kesinti]] : []).map(([a, v]) => '<tr><td style="text-align:right;border:0">' + esc(a) + '</td><td style="text-align:right;border:0;width:150px">' + (v < 0 ? "−" : "") + para(Math.abs(v)) + '</td></tr>').join("") +
      '<tr style="font-size:16px;font-weight:700"><td style="text-align:right;border:0">Ödenecek tutar</td><td style="text-align:right;border:0">' + para(r.odenecek) + '</td></tr></table>' +
    '<p>Kümülatif yapılan iş: <b>' + para(r.kumulatif) + '</b> / sözleşme bedeli ' + para(sozlesmeBedeli(s)) + ' (%' + Math.round(r.oran) + ')</p>' + odemeHesabi().replace(/\n/g, "<br>") +
    '<div style="display:flex;justify-content:space-between;margin-top:40px"><div>İş sahibi<br><br>……………………</div><div style="text-align:right">' + esc(FIRMA) + '<br><br>……………………</div></div>');
};
EYLEM.hakedisFatura = (el, arg) => {
  const [id, i] = arg.split("|"), ie = bul("is_emirleri", id), s = sozlesmeAl(ie), r = hakedisHesapla(s, Number(i));
  faturaOnDoldur = {kalemler:[{ad:ie.baslik + " — " + r.h.no + ". hakediş", miktar:1, fiyat:r.buDonem, kdv:Number(s.kdv) || 0}], kategori:"Satış", aciklama:"Hakediş " + r.h.no + " · ödenecek " + para(r.odenecek)};
  git("fatura-form/satis/" + ie.musteriId + "/" + id);
};

/* ================= TAŞERONLAR ================= */
const taseronOdenen = (ieId, cariId) => yuvarla(veri.hareketler.filter(h => h.tur === "cikis" && h.musteriId === cariId && h.isEmriId === ieId).reduce((t, h) => t + h.tutar, 0));
EYLEM.taseronDuzenle = (el, arg) => {
  const [id, tid] = arg.split("|"), ie = bul("is_emirleri", id), l = ieEk(ie).taseronlar || [], t = l.find(x => x.id === tid) || {id:yeniId(), cariId:"", is:"", tutar:0, tarih:bugun(), not:""};
  const ted = veri.musteriler.filter(m => m.tip === "tedarikci").sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:480px"><p>' + (tid ? "Taşeron sözleşmesi" : "Taşeron ekle") + '</p>' +
    '<label class="etiket" for="tsCari">Taşeron <span class="ist">(tedarikçi carisi)</span></label><select id="tsCari" class="kutu"><option value="">— Seçin —</option>' + ted.map(m => '<option value="' + m.id + '"' + (m.id === t.cariId ? ' selected' : '') + '>' + esc(m.ad) + '</option>').join("") + '</select>' +
    '<div class="alt-bilgi">Listede yoksa: <b data-git="cari-form/-/tedarikci" style="cursor:pointer;color:var(--borc)">+ Yeni tedarikçi</b></div>' +
    '<label class="etiket" for="tsIs">Yaptığı iş</label><input id="tsIs" class="kutu" maxlength="100" value="' + esc(t.is) + '" placeholder="Örn: Kaba sıva, elektrik tesisatı">' +
    '<div class="iki-alan"><div><label class="etiket" for="tsTutar">Sözleşme tutarı</label><input id="tsTutar" class="kutu" inputmode="decimal" value="' + sayiYaz(t.tutar) + '"></div><div>' + tarihAlani("tsTarih", "Tarih", t.tarih) + '</div></div>' +
    '<label class="etiket" for="tsNot">Not</label><input id="tsNot" class="kutu" maxlength="200" value="' + esc(t.not || "") + '">' +
    '<div class="hata" id="tsHata"></div><div class="buton-sira">' + (tid ? '<button class="buton tehlike" data-c="sil">Sil</button>' : '') + '<button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    if(e.target.closest("[data-git]")) return p.remove();
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c"); if(c === "hayir") return p.remove();
    if(c === "sil") return islem(b, async () => { await ekKaydet(ie, {taseronlar:l.filter(x => x.id !== t.id)}); p.remove(); ciz(); });
    const y = Object.assign({}, t, {cariId:p.querySelector("#tsCari").value, is:p.querySelector("#tsIs").value.trim(), tutar:yuvarla(sayiOku(p.querySelector("#tsTutar").value) || 0), tarih:p.querySelector("#tsTarih").value || bugun(), not:p.querySelector("#tsNot").value.trim()});
    if(!y.cariId) return p.querySelector("#tsHata").textContent = "Taşeronu seçin.";
    islem(b, async () => { await ekKaydet(ie, {taseronlar:l.filter(x => x.id !== y.id).concat([y])}, tid ? "" : "Taşeron eklendi: " + cariAdi(y.cariId) + " · " + y.is + " · " + para(y.tutar)); p.remove(); bildir("Kaydedildi"); ciz(); });
  });
  document.body.appendChild(p);
};
EYLEM.taseronOde = (el, arg) => {
  const [id, tid] = arg.split("|"), ie = bul("is_emirleri", id), t = (ieEk(ie).taseronlar || []).find(x => x.id === tid); if(!t) return;
  const kal = Math.max(0, yuvarla((Number(t.tutar) || 0) - taseronOdenen(id, t.cariId)));
  git("cikis/" + t.cariId + "/" + id);
  sonraDoldur(() => { const e = document.getElementById("tutar"); if(e && kal) e.placeholder = "Kalan " + para(kal);
    secenekSec("kategori", "Taşeron ödemesi"); const n = document.getElementById("aciklama"); if(n) n.value = t.is || ""; });
};
function ekranTaseronlar(){
  const l = [];
  veri.is_emirleri.forEach(ie => (ieEk(ie).taseronlar || []).forEach(t => l.push({ie, t, odenen:taseronOdenen(ie.id, t.cariId)})));
  const gr = {}; l.forEach(x => { (gr[x.t.cariId] = gr[x.t.cariId] || []).push(x); });
  const html = ekUyari() + '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Taşeron sözleşmeleri</div><div class="deger">' + para(l.reduce((t, x) => t + (Number(x.t.tutar) || 0), 0)) + '</div><div class="alt-bilgi">' + l.length + ' sözleşme</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Ödenen</div><div class="deger t-cikis">' + para(l.reduce((t, x) => t + x.odenen, 0)) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Kalan</div><div class="deger">' + para(l.reduce((t, x) => t + Math.max(0, (Number(x.t.tutar) || 0) - x.odenen), 0)) + '</div></div></div>' +
    (l.length ? Object.entries(gr).map(([cid, xs]) => bolum(esc(cariAdi(cid) || "Taşeron")) + '<div class="kart liste-kart">' + xs.map(x => '<button class="satir" data-is="hakedisSekmeGit" data-arg="' + x.ie.id + '"><span class="orta"><div class="s1">' +
      esc(x.ie.no + " · " + x.ie.baslik) + '</div><div class="s2">' + esc((x.t.is || "") + " · sözleşme " + para(x.t.tutar)) + '</div></span><span class="sag"><div class="tutar">' + para(x.odenen) + '</div><div class="s2">kalan ' +
      para(Math.max(0, (Number(x.t.tutar) || 0) - x.odenen)) + '</div></span></button>').join("") + '</div>').join("") : '<div class="kart">' + bos("kisiler", "Henüz taşeron sözleşmesi yok. İş emrinde “Sözleşme / hakediş / taşeron” → Taşeronlar.") + '</div>');
  return {baslik:"Taşeronlar", geri:true, html};
}
EYLEM.hakedisSekmeGit = (el, id) => { filtre.hakedisSekme = "taseron"; git("hakedis/" + id); };

/* ================= GARANTİ VE SERVİS ================= */
// servis: {garantiAy, kayitlar:[{id, tarih, sikayet, yapilan, durum:"acik"|"kapali", ucret, garantide, kapanis, kim}]}
const garantiAyi = ie => Number((ie.servis || {}).garantiAy) >= 0 && (ie.servis || {}).garantiAy !== undefined && (ie.servis || {}).garantiAy !== "" ? Number(ie.servis.garantiAy) : Number(sistem().garantiAy) || 24;
function garantiBitisi(ie){ const t = isTeslimTarihi(ie); if(!t) return ""; const d = tarihOku(t); d.setMonth(d.getMonth() + garantiAyi(ie)); return tarihStr(d); }
const servisKayitlari = ie => ((ie.servis || {}).kayitlar || []);
function servisKarti(ie){
  const l = servisKayitlari(ie), bit = garantiBitisi(ie); if(ie.durum !== "Teslim edildi" && !l.length) return '';
  const kalan = bit ? Math.round((tarihOku(bit) - tarihOku(bugun())) / 86400000) : null;
  return '<div class="kart">' + kartBaslik("Garanti ve servis", ekHazir() ? '<button class="baglanti" style="margin:0" data-is="servisAc" data-arg="' + ie.id + '|">+ Servis kaydı</button>' : '') + ekUyari() +
    (bit ? bilgiSatir("Garanti", garantiAyi(ie) + " ay · " + (kalan >= 0 ? tarihYaz(bit) + "'e kadar (" + kalan + " gün)" : '<span class="t-cikis">' + tarihYaz(bit) + "'de bitti</span>") +
      (yetki.yonetici ? ' <button class="baglanti" style="margin:0" data-is="garantiDegis" data-arg="' + ie.id + '">değiştir</button>' : '')) : '') +
    (l.length ? l.slice().reverse().map(s => '<button class="satir" data-is="servisAc" data-arg="' + ie.id + '|' + s.id + '"><span class="rozet ' + (s.durum === "kapali" ? 'r-giris' : 'r-cikis') + '">' + ik(s.durum === "kapali" ? "tamam" : "ayar") + '</span>' +
      '<span class="orta"><div class="s1">' + esc(s.sikayet) + '</div><div class="s2">' + esc([tarihYaz(s.tarih, true), s.durum === "kapali" ? "kapandı" : "açık", s.garantide ? "garantide" : s.ucret ? para(s.ucret) : "", s.yapilan].filter(Boolean).join(" · ")) + '</div></span></button>').join("") :
      '<div class="alt-bilgi">Servis kaydı yok.</div>') + '</div>';
}
EYLEM.garantiDegis = (el, id) => {
  const ie = bul("is_emirleri", id), p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:360px"><p>Garanti süresi</p><label class="etiket" for="gAy">Teslimden itibaren (ay)</label><input id="gAy" class="kutu" inputmode="numeric" value="' + garantiAyi(ie) + '">' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">Kaydet</button></div></div>';
  p.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; } if(b.getAttribute("data-c") === "hayir") return p.remove();
    const a = Math.round(sayiOku(p.querySelector("#gAy").value)); if(!(a >= 0 && a <= 240)) return;
    islem(b, async () => { await Depo.kaydet("is_emirleri", Object.assign({}, ie, {servis:Object.assign({}, ie.servis, {garantiAy:a})})); p.remove(); ciz(); }); });
  document.body.appendChild(p);
};
EYLEM.servisAc = (el, arg) => {
  const [id, sid] = arg.split("|"), ie = bul("is_emirleri", id), l = servisKayitlari(ie), bit = garantiBitisi(ie);
  const s = l.find(x => x.id === sid) || {id:yeniId(), tarih:bugun(), sikayet:"", yapilan:"", durum:"acik", ucret:0, garantide:!bit || bit >= bugun(), kim:kullaniciAdi()};
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:500px"><p>' + (sid ? "Servis kaydı" : "Yeni servis kaydı") + '</p><div class="alt-bilgi">' + esc(ie.no + " · " + ie.baslik + " · " + cariAdi(ie.musteriId)) + (bit ? ' · garanti ' + tarihYaz(bit, true) + (bit < bugun() ? " (bitti)" : "") : '') + '</div>' +
    '<label class="etiket" for="svSikayet">Şikâyet / arıza</label><textarea id="svSikayet" class="kutu" maxlength="500" style="min-height:64px" placeholder="Örn: Alt dolap kapağı sarktı">' + esc(s.sikayet) + '</textarea>' +
    '<div class="iki-alan"><div>' + tarihAlani("svTarih", "Bildirim tarihi", s.tarih) + '</div><div><label class="etiket">Durum</label><div class="secenekler" id="svDurum">' +
      [["acik", "Açık"], ["kapali", "Kapandı"]].map(([v, a]) => '<button type="button" class="secenek' + (s.durum === v ? ' secili' : '') + '" data-d="' + v + '">' + a + '</button>').join("") + '</div></div></div>' +
    '<label class="etiket" for="svYapilan">Yapılan iş</label><textarea id="svYapilan" class="kutu" maxlength="500" style="min-height:56px">' + esc(s.yapilan || "") + '</textarea>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="svGaranti"' + (s.garantide ? ' checked' : '') + '> Garanti kapsamında (ücretsiz)</label>' +
    (yetki.yonetici ? '<div id="svUcretKutu"' + (s.garantide ? ' style="display:none"' : '') + '><label class="etiket" for="svUcret">Servis ücreti</label><input id="svUcret" class="kutu" inputmode="decimal" value="' + sayiYaz(s.ucret) + '"></div>' : '') +
    '<div class="hata" id="svHata"></div><div class="buton-sira">' + (sid && yetki.yonetici ? '<button class="buton tehlike" data-c="sil">Sil</button>' : '') +
      '<button class="buton ikincil" data-c="randevu">' + ik("takvim") + 'Randevu</button><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("change", e => { if(e.target.id === "svGaranti"){ const k = p.querySelector("#svUcretKutu"); if(k) k.style.display = e.target.checked ? "none" : ""; } });
  p.addEventListener("click", e => {
    const d = e.target.closest("[data-d]"); if(d){ p.querySelectorAll("#svDurum .secenek").forEach(x => x.classList.toggle("secili", x === d)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c"); if(c === "hayir") return p.remove();
    if(c === "randevu"){ p.remove(); return EYLEM.randevuAc(null, id + "||" + bugun()); }
    const kaydet = async (liste, not) => { await Depo.kaydet("is_emirleri", Object.assign({}, bul("is_emirleri", id), {servis:Object.assign({}, ie.servis, {kayitlar:liste})})); if(not) await notEkle(id, not); };
    if(c === "sil") return islem(b, async () => { await kaydet(l.filter(x => x.id !== s.id)); p.remove(); ciz(); });
    const y = Object.assign({}, s, {sikayet:p.querySelector("#svSikayet").value.trim(), tarih:p.querySelector("#svTarih").value || bugun(), yapilan:p.querySelector("#svYapilan").value.trim(),
      durum:p.querySelector("#svDurum .secili").getAttribute("data-d"), garantide:p.querySelector("#svGaranti").checked, ucret:p.querySelector("#svUcret") ? yuvarla(sayiOku(p.querySelector("#svUcret").value) || 0) : s.ucret || 0});
    if(!y.sikayet) return p.querySelector("#svHata").textContent = "Şikâyeti yazın.";
    if(y.durum === "kapali" && s.durum !== "kapali") y.kapanis = bugun();
    const not = !sid ? "Servis kaydı açıldı: " + y.sikayet : y.durum === "kapali" && s.durum !== "kapali" ? "Servis kapandı: " + (y.yapilan || y.sikayet) : "";
    islem(b, async () => { await kaydet(l.filter(x => x.id !== y.id).concat([y]), not); p.remove(); bildir("Servis kaydı kaydedildi"); ciz();
      if(!y.garantide && y.ucret > 0 && y.durum === "kapali" && s.durum !== "kapali" && yetki.yonetici) onayla("Servis ücreti kasaya işlensin mi?", para(y.ucret) + " · " + cariAdi(ie.musteriId), "Tahsilat al", () => {
        git("giris/" + ie.musteriId + "/" + id); sonraDoldur(() => { const t = document.getElementById("tutar"); if(t) t.value = sayiYaz(y.ucret); const n = document.getElementById("aciklama"); if(n) n.value = "Servis: " + y.sikayet.slice(0, 150); }); }, false); });
  });
  document.body.appendChild(p);
};
function servisHatirlatmalari(){
  const l = [];
  veri.is_emirleri.forEach(ie => servisKayitlari(ie).forEach(s => { if(s.durum !== "kapali") l.push({seviye:Math.round((tarihOku(bugun()) - tarihOku(s.tarih)) / 86400000) >= 7 ? 0 : 1, tarih:s.tarih, ikon:"ayar", yer:"is/" + ie.id,
    yazi:"Servis bekliyor: " + ie.no + " · " + s.sikayet.slice(0, 60), alt:cariAdi(ie.musteriId) + " · " + tarihYaz(s.tarih, true)}); }));
  return l;
}
function ekranServis(){
  const acik = [], yakin = [], bg = bugun(), s30 = gunEkle(bg, 30);
  veri.is_emirleri.forEach(ie => { servisKayitlari(ie).forEach(s => { if(s.durum !== "kapali") acik.push({ie, s}); }); const b = garantiBitisi(ie); if(b && b >= bg && b <= s30) yakin.push({ie, b}); });
  const html = '<div class="izgara uc"><div class="kart ozet"><div class="kart-baslik">Açık servis</div><div class="deger' + (acik.length ? ' t-cikis' : '') + '">' + acik.length + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Garantisi 30 günde biten</div><div class="deger">' + yakin.length + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Varsayılan garanti</div><div class="deger">' + (Number(sistem().garantiAy) || 24) + ' ay</div>' + (yetki.yonetici && !yetki.salt ? '<button class="baglanti" style="margin:0" data-is="garantiVarsayilan">değiştir</button>' : '') + '</div></div>' +
    bolum("Açık servis kayıtları") + '<div class="kart liste-kart">' + (acik.length ? acik.sort((a, b) => a.s.tarih < b.s.tarih ? -1 : 1).map(x => '<button class="satir" data-is="servisAc" data-arg="' + x.ie.id + '|' + x.s.id + '"><span class="rozet r-cikis">' + ik("ayar") + '</span>' +
      '<span class="orta"><div class="s1">' + esc(x.s.sikayet) + '</div><div class="s2">' + esc([x.ie.no + " · " + x.ie.baslik, cariAdi(x.ie.musteriId), tarihYaz(x.s.tarih, true), x.s.garantide ? "garantide" : "ücretli"].join(" · ")) + '</div></span>' + ik("sag") + '</button>').join("") :
      bos("tamam", "Açık servis kaydı yok.")) + '</div>' +
    (yakin.length ? bolum("Garantisi yakında bitenler") + '<div class="kart liste-kart">' + yakin.map(x => '<button class="satir" data-git="is/' + x.ie.id + '"><span class="orta"><div class="s1">' + esc(x.ie.no + " · " + x.ie.baslik) + '</div><div class="s2">' +
      esc(cariAdi(x.ie.musteriId) + " · garanti " + tarihYaz(x.b, true)) + '</div></span>' + ik("sag") + '</button>').join("") + '</div>' : '') +
    '<div class="alt-bilgi" style="margin:8px 2px">Servis kaydı açmak için teslim edilmiş iş emrini açın → “Garanti ve servis” → “+ Servis kaydı”.</div>';
  return {baslik:"Garanti ve servis", geri:true, html};
}
EYLEM.garantiVarsayilan = () => {
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:360px"><p>Varsayılan garanti süresi</p><label class="etiket" for="gvAy">Ay</label><input id="gvAy" class="kutu" inputmode="numeric" value="' + (Number(sistem().garantiAy) || 24) + '">' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">Kaydet</button></div></div>';
  p.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; } if(b.getAttribute("data-c") === "hayir") return p.remove();
    const a = Math.round(sayiOku(p.querySelector("#gvAy").value)); if(!(a >= 0 && a <= 240)) return; islem(b, async () => { await sistemKaydet({garantiAy:a}); p.remove(); ciz(); }); });
  document.body.appendChild(p);
};

/* ================= MÜŞTERİ İŞ SAYFASI VE TEKLİF ONAYI ================= */
// Paylaşım bağlantısı (paylasimlar) içerik türü "is": müşteri giriş yapmadan #vitrin/<anahtar> adresinden işinin durumunu görür,
// teklifse "Onaylıyorum / Değişiklik istiyorum" der (teklif_onayla işlevi, supabase-guncelleme-17.sql).
const isSayfasi = ie => veri.paylasimlar.filter(k => k.icerik && k.icerik.tur === "is" && k.icerik.isEmriId === ie.id && !paylasimBitti(k)).sort((a, b) => b.olusma - a.olusma)[0];
function isSayfasiIcerik(ie, ayar, gorseller){
  const fr = firma(), o = isOzet(ie.id), h = isHesap(ie.kalemler, isTeklif(ie)), bg = bugun();
  return {tur:"is", isEmriId:ie.id, baslik:ie.baslik, no:ie.no, durum:ie.durum, musteri:cariAdi(ie.musteriId), teslim:ie.teslimTarihi || "", guncelleme:Date.now(), ayar,
    firma:{ad:FIRMA, telefon:fr.telefon, adres:fr.adres}, hesap:ayar.odeme ? odemeHesabi().trim() : "",
    asamalar:(ie.asamalar || []).map(a => ({ad:a.ad, tamam:!!a.tamam})),
    randevular:(ie.montaj || []).filter(r => !r.tamam && r.tarih >= bg).map(r => ({tarih:r.tarih, saat:r.saat || "", tur:r.tur})),
    kalemler:(ie.kalemler || []).map(k => Object.assign({ad:k.ad, olcu:k.olcu || "", renk:k.renk || "", adet:k.adet}, ayar.fiyat && k.fiyat ? {fiyat:k.fiyat} : {})),
    teklif:ayar.fiyat && h.ara > 0 ? {ara:h.ara, indirim:h.indirim, kdvOran:h.kdvOran, kdv:h.kdv, toplam:h.toplam, gecerlilik:(ie.teklif || {}).gecerlilik || ""} : null,
    odeme:ayar.odeme && o.fiyat ? {toplam:o.fiyat, odenen:o.tahsilat, kalan:Math.max(0, o.kalan)} : null,
    gorseller:gorseller || [], kopyalanan:[]};
}
EYLEM.isSayfasiOlustur = (el, id) => {
  const ie = bul("is_emirleri", id), var_ = isSayfasi(ie), a = var_ ? var_.icerik.ayar || {} : {fiyat:ie.durum === "Teklif", odeme:ie.durum !== "Teklif", foto:true};
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:460px"><p>Müşteri iş sayfası</p><div class="alt-bilgi">Müşteri giriş yapmadan işinin durumunu, aşamaları, randevuları ve seçtiklerinizi görür' + (ie.durum === "Teklif" ? '; teklifi telefondan onaylayabilir' : '') + '.</div>' +
    [["isFiyat", "Teklif kalemleri ve fiyatlar", a.fiyat], ["isOdeme", "Ödeme durumu (toplam, ödenen, kalan) ve IBAN", a.odeme], ["isFoto", "Fotoğraflar (son 30)", a.foto]].map(([i, t, v]) =>
      '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="' + i + '"' + (v ? ' checked' : '') + '> ' + t + '</label>').join("") +
    (var_ ? '' : '<label class="etiket">Bağlantı ne kadar açık kalsın?</label><div class="secenekler" id="isSure">' + [["90", "3 ay"], ["365", "1 yıl"], ["0", "Süresiz"]].map(([v, t], i) => '<button type="button" class="secenek' + (i === 1 ? ' secili' : '') + '" data-s="' + v + '">' + t + '</button>').join("") + '</div>') +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("mesaj") + (var_ ? 'Güncelle ve gönder' : 'Oluştur ve gönder') + '</button></div></div>';
  p.addEventListener("click", e => {
    const s = e.target.closest("[data-s]"); if(s){ p.querySelectorAll("#isSure .secenek").forEach(x => x.classList.toggle("secili", x === s)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; } if(b.getAttribute("data-c") === "hayir") return p.remove();
    const ayar = {fiyat:p.querySelector("#isFiyat").checked, odeme:p.querySelector("#isOdeme").checked, foto:p.querySelector("#isFoto").checked};
    const gun = var_ ? null : Number(p.querySelector("#isSure .secili").getAttribute("data-s"));
    islem(b, async () => { const k = await isSayfasiYaz(ie, ayar, var_, gun); p.remove(); ciz();
      const m = bul("musteriler", ie.musteriId) || {};
      waPencere({tel:m.telefon, ad:m.ad, isEmriId:id, sablonlar:[{ad:"İş sayfası", metin:"Merhaba " + (m.ad || "") + ", " + (ie.durum === "Teklif" ? "“" + ie.baslik + "” teklifimizi inceleyip onaylayabilirsiniz" : "“" + ie.baslik + "” siparişinizin durumunu takip edebilirsiniz") + ":\n" + paylasimLinki(k) + "\n\n" + FIRMA}]}); });
  });
  document.body.appendChild(p);
};
async function isSayfasiYaz(ie, ayar, eski, gun){
  let gorseller = eski ? (eski.icerik.gorseller || []) : [], kop = eski ? (eski.icerik.kopyalanan || []) : [];
  const id = eski ? eski.id : rastgeleAnahtar(), yollar = eski ? (eski.icerik.yollar || []) : [];
  if(ayar.foto && cevrimici){
    const yeni = isDosyalari(ie.id).filter(d => dosyaTuru(d) === "g" && kop.indexOf(d.id) < 0).slice(-30);
    if(yeni.length) await urlleriGetir(yeni);
    for(let i = 0; i < yeni.length; i++){ const d = yeni[i]; yuklemeGoster("Fotoğraflar hazırlanıyor " + (i + 1) + "/" + yeni.length + "…");
      try{ const r0 = await fetch(urlOnbellek[d.yol].url); const hedef = id + "/" + d.id + "_" + guvenliDosyaAdi(d.ad);
        const r = await sb.storage.from(VITRIN).upload(hedef, await r0.blob(), {contentType:d.tur || "image/jpeg", upsert:true}); if(r.error) throw r.error;
        yollar.push(hedef); gorseller.push(sb.storage.from(VITRIN).getPublicUrl(hedef).data.publicUrl); kop.push(d.id); }catch(e){}
    }
    yuklemeKapat(); gorseller = gorseller.slice(-30);
  } else if(!ayar.foto) gorseller = [];
  const icerik = Object.assign(isSayfasiIcerik(ie, ayar, gorseller), {kopyalanan:kop, yollar});
  const k = Object.assign({}, eski || {id, baslik:"İş sayfası · " + ie.no, musteriId:ie.musteriId, bitis:gun ? Date.now() + gun * 86400000 : 0, olusma:Date.now()}, {icerik});
  await Depo.kaydet("paylasimlar", k);
  return k;
}
// İş emri değişince bağlı müşteri sayfası da (fotoğraflar hariç) güncellenir
let isSayfasiZaman = {};
function isSayfasiGuncelleZamanla(ieId){
  if(!cevrimici || !yetki.yonetici || yetki.salt) return;
  clearTimeout(isSayfasiZaman[ieId]);
  isSayfasiZaman[ieId] = setTimeout(() => { const ie = bul("is_emirleri", ieId), k = ie && isSayfasi(ie); if(!k) return;
    const yeni = Object.assign(isSayfasiIcerik(ie, k.icerik.ayar || {}, k.icerik.gorseller), {kopyalanan:k.icerik.kopyalanan || [], yollar:k.icerik.yollar || []});
    const ozet = x => JSON.stringify(Object.assign({}, x, {guncelleme:0}));
    if(ozet(yeni) !== ozet(k.icerik)) Depo.kaydet("paylasimlar", Object.assign({}, k, {icerik:yeni})).catch(() => {}); }, 3000);
}
function isSayfasiKarti(ie){
  if(!cevrimici || !yetki.yonetici || yetki.salt || eksikTablo.paylasimlar) return '';
  const k = isSayfasi(ie), onay = veri.teklif_onay.filter(x => x.isEmriId === ie.id).sort((a, b) => b.zaman - a.zaman);
  return '<div class="kart yazdirma">' + kartBaslik("Müşteri iş sayfası") +
    (onay.length ? onay.slice(0, 3).map(x => '<div class="' + (x.karar === "onay" ? 'bilgi-kutu' : 'uyari') + '" style="margin:0 0 8px"><b>' + esc(x.ad || "Müşteri") + '</b> ' + (x.karar === "onay" ? "teklifi onayladı" : "değişiklik istiyor") +
      ' · ' + esc(tamZaman(x.zaman)) + (x.not ? '<br>“' + esc(x.not) + '”' : '') + (!x.islendi ? '<div class="buton-sira" style="margin-top:8px">' + (x.karar === "onay" && ie.durum === "Teklif" ? '<button class="buton kucuk" style="margin:0" data-is="onayIsle" data-arg="' + x.id + '|siparis">Siparişe çevir</button>' : '') +
        '<button class="buton ikincil kucuk" style="margin:0" data-is="onayIsle" data-arg="' + x.id + '|">Tamam, gördüm</button></div>' : '') + '</div>').join("") : '') +
    (k ? '<div class="alt-bilgi" style="margin:0 0 8px">Bağlantı açık' + (k.bitis ? ' · ' + tarihYaz(tarihStr(new Date(k.bitis)), true) + "'e kadar" : '') + ' · iş değiştikçe sayfa kendiliğinden güncellenir.</div>' +
      '<div class="buton-sira"><button class="buton ikincil kucuk" style="margin:0" data-is="isSayfasiOlustur" data-arg="' + ie.id + '">' + ik("mesaj") + 'Fotoğrafları güncelle / gönder</button>' +
      '<button class="buton ikincil kucuk" style="margin:0" onclick="window.open(\'' + paylasimLinki(k) + '\')">' + ik("sag") + 'Sayfayı gör</button></div>' :
      '<div class="alt-bilgi" style="margin:0 0 8px">Müşteriye işinin durumunu ' + (ie.durum === "Teklif" ? "ve teklifi gösteren, telefondan onaylayabileceği" : "gösteren") + ' bir bağlantı gönderin.</div>' +
      '<button class="buton ikincil kucuk" style="margin:0" data-is="isSayfasiOlustur" data-arg="' + ie.id + '">' + ik("mesaj") + 'Bağlantı oluştur</button>') + '</div>';
}
EYLEM.onayIsle = (el, arg) => {
  const [oid, ne] = arg.split("|"), x = bul("teklif_onay", oid), ie = x && bul("is_emirleri", x.isEmriId); if(!x) return;
  islem(null, async () => {
    await Depo.kaydet("teklif_onay", Object.assign({}, x, {islendi:true}));
    if(ne === "siparis" && ie){ await Depo.kaydet("is_emirleri", Object.assign({}, ie, {durum:"Sipariş alındı"})); await notEkle(ie.id, "Müşteri teklifi internetten onayladı (" + (x.ad || "") + ") · Durum: Teklif → Sipariş alındı"); bildir("Siparişe çevrildi"); }
    ciz();
  });
};
function teklifOnayHatirlatmalari(){
  if(!yetki.yonetici || yetki.salt) return [];
  return veri.teklif_onay.filter(x => !x.islendi).map(x => { const ie = bul("is_emirleri", x.isEmriId);
    return {seviye:0, tarih:bugun(), ikon:"tamam", yer:ie ? "is/" + ie.id : "isler", yazi:(x.ad || "Müşteri") + (x.karar === "onay" ? " teklifi onayladı" : " teklifte değişiklik istiyor") + (ie ? ": " + ie.no : ""), alt:x.not || (ie ? ie.baslik : "")}; });
}
function teklifOnayGeldi(k){
  const ie = bul("is_emirleri", k.isEmriId);
  const b = {id:yeniId(), zaman:Date.now(), tur:"is", baslik:(k.ad || "Müşteri") + (k.karar === "onay" ? " teklifi onayladı" : " teklifte değişiklik istiyor"), alt:(ie ? ie.no + " · " + ie.baslik : "") + (k.not ? " · " + k.not : ""), yer:ie ? "is/" + ie.id : "isler", kim:"", okundu:false};
  bildirimler.unshift(b); bildirimYaz(); zilGuncelle(); bildirTip(b); if(document.visibilityState !== "visible") sistemBildirimi(b);
}
// Müşterinin gördüğü sayfa (vitrinGoster "is" türünde bunu çağırır)
function isSayfasiGoster(v, anahtar, el){
  const fr = v.firma || {}, tel = waNumara(fr.telefon), yap = v.asamalar.filter(a => a.tamam).length, cevap = (() => { try{ return localStorage.getItem("gunes_onay_" + anahtar); }catch(e){ return null; } })();
  document.title = v.baslik + " — " + (fr.ad || FIRMA);
  el.innerHTML = '<main class="sayfa is-sayfasi" style="max-width:760px">' +
    '<div class="vitrin"><div class="marka"><img src="logo-beyaz.png" alt="' + esc(fr.ad || FIRMA) + '"></div><h1 style="font-size:22px;margin:14px 0 4px;position:relative">' + esc(v.baslik) + '</h1>' +
      '<div class="alt">' + esc([v.no, v.musteri].filter(Boolean).join(" · ")) + '</div></div>' +
    '<div class="kart"><div class="kart-baslik"><span>Durum</span>' + durumRozet(v.durum) + '</div>' +
      (v.asamalar.length ? '<div class="ilerleme"><i style="width:' + Math.round(yap / v.asamalar.length * 100) + '%"></i></div><div class="alt-bilgi">' + yap + ' / ' + v.asamalar.length + ' aşama tamamlandı</div>' +
        v.asamalar.map(a => '<div class="asama' + (a.tamam ? ' tamam' : '') + '" style="cursor:default"><span class="kutucuk">' + (a.tamam ? ik("tamam") : '') + '</span><span class="ad">' + esc(a.ad) + '</span></div>').join("") : '') +
      (v.teslim ? bilgiSatir("Tahmini teslim", tarihYaz(v.teslim)) : '') +
      v.randevular.map(r => bilgiSatir(esc(r.tur), tarihYaz(r.tarih) + (r.saat ? " " + esc(r.saat) : ""))).join("") + '</div>' +
    (v.kalemler.length ? '<div class="kart">' + kartBaslik(v.durum === "Teklif" ? "Teklif" : "Sipariş") + v.kalemler.map(k => bilgiSatir(esc(k.ad) + (k.olcu || k.renk ? ' <span class="ist">' + esc([k.olcu, k.renk].filter(Boolean).join(" · ")) + '</span>' : ''),
        k.fiyat ? k.adet + ' × ' + para(k.fiyat) : '× ' + k.adet)).join("") +
      (v.teklif ? '<div class="toplamlar">' + bilgiSatir("Ara toplam", para(v.teklif.ara)) + (v.teklif.indirim ? bilgiSatir("İndirim", "−" + para(v.teklif.indirim)) : '') + bilgiSatir(kdvYazi(v.teklif.kdvOran), para(v.teklif.kdv)) +
        '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Genel toplam</span><b>' + para(v.teklif.toplam) + '</b></div>' + (v.teklif.gecerlilik ? '<div class="alt-bilgi">Teklif geçerlilik: ' + tarihYaz(v.teklif.gecerlilik) + '</div>' : '') + '</div>' : '') + '</div>' : '') +
    (v.durum === "Teklif" ? '<div class="kart" id="onayKutu">' + (cevap ? '<div class="bilgi-kutu" style="margin:0">Cevabınız iletildi, teşekkür ederiz. ' + esc(fr.ad || FIRMA) + ' sizinle iletişime geçecek.</div>' :
      kartBaslik("Teklifi onaylıyor musunuz?") + '<label class="etiket" for="onAd">Adınız</label><input id="onAd" class="kutu" maxlength="80" value="' + esc(v.musteri || "") + '">' +
      '<label class="etiket" for="onNot">Notunuz <span class="ist">(isteğe bağlı)</span></label><textarea id="onNot" class="kutu" maxlength="1000" style="min-height:64px"></textarea><div class="hata" id="onHata"></div>' +
      '<div class="buton-sira"><button class="buton ikincil" data-is="teklifCevap" data-arg="' + anahtar + '|revize">Değişiklik istiyorum</button><button class="buton" data-is="teklifCevap" data-arg="' + anahtar + '|onay">' + ik("tamam") + 'Teklifi onaylıyorum</button></div>') + '</div>' : '') +
    (v.odeme ? '<div class="kart">' + kartBaslik("Ödeme") + bilgiSatir("Toplam", para(v.odeme.toplam)) + bilgiSatir("Ödenen", para(v.odeme.odenen)) +
      '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Kalan</span><b>' + para(v.odeme.kalan) + '</b></div>' + (v.hesap ? '<div style="white-space:pre-wrap;margin-top:8px;font-size:14px">' + esc(v.hesap) + '</div>' : '') + '</div>' : '') +
    (v.gorseller.length ? '<div class="kart">' + kartBaslik("Fotoğraflar") + '<div class="is-foto">' + v.gorseller.map(u => '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" loading="lazy" alt=""></a>').join("") + '</div></div>' : '') +
    (tel ? '<div class="buton-sira"><a class="buton wa-buton" href="' + esc(vitrinWaLink(fr.telefon, "“" + v.baslik + "” hakkında yazıyorum.")) + '" target="_blank" rel="noopener">' + ik("mesaj") + 'WhatsApp\'tan yazın</a>' +
      '<a class="buton saydam" style="color:var(--yazi);border-color:var(--cizgi)" href="tel:+' + tel + '">' + ik("telefon") + 'Arayın</a></div>' : '') +
    '<div class="alt-bilgi" style="text-align:center;margin:20px 0 12px">' + esc([fr.ad || FIRMA, fr.adres, fr.telefon].filter(Boolean).join(" · ")) + '<br>Son güncelleme: ' + esc(tamZaman(v.guncelleme)) + '</div></main>';
}
EYLEM.teklifCevap = (btn, arg) => {
  const [anahtar, karar] = arg.split("|"), ad = deger("onAd"), not = deger("onNot");
  if(!ad) return document.getElementById("onHata").textContent = "Adınızı yazın.";
  if(karar === "revize" && !not) return document.getElementById("onHata").textContent = "Ne değişsin istiyorsunuz? Notunuzu yazın.";
  btn.disabled = true;
  sb.rpc("teklif_onayla", {anahtar, karar, ad, notu:not}).then(r => {
    if(r.error || (r.data && r.data.hata)) throw r.error || new Error(r.data.hata);
    try{ localStorage.setItem("gunes_onay_" + anahtar, karar); }catch(e){}
    document.getElementById("onayKutu").innerHTML = '<div class="bilgi-kutu" style="margin:0">' + (karar === "onay" ? "Onayınız iletildi, teşekkür ederiz." : "İsteğiniz iletildi.") + ' En kısa sürede sizinle iletişime geçeceğiz.</div>';
  }).catch(() => { btn.disabled = false; document.getElementById("onHata").textContent = "Gönderilemedi; internet bağlantınızı kontrol edip tekrar deneyin veya bizi arayın."; });
};

/* ================= NAKİT AKIŞI TAHMİNİ ================= */
// Bugünkü kasa (nakit + banka) üstüne vadesi gelen tahsilat / ödemeler eklenerek günlük bakiye tahmini.
function nakitOlaylari(gun){
  const bg = bugun(), son = gunEkle(bg, gun), l = [], ekle = (tarih, tutar, yazi, yer, tur) => { if(!(Math.abs(tutar) > 0)) return; l.push({tarih:tarih < bg ? bg : tarih, tutar:yuvarla(tutar), yazi, yer, tur, gecikmis:tarih < bg}); };
  veri.faturalar.forEach(f => {
    const tk = taksitDurumu(f), isaret = f.tur === "satis" ? 1 : -1;
    if(tk.length) tk.forEach(t => { if(t.kalan > 0 && t.vade <= son) ekle(t.vade, isaret * t.kalan, (f.tur === "satis" ? "Taksit tahsilatı · " : "Taksit ödemesi · ") + cariAdi(f.musteriId), "fatura/" + f.id, f.tur === "satis" ? "tahsilat" : "odeme"); });
    else { const od = odemeDurumu(f); if(od.kalan > 0 && f.vade && f.vade <= son) ekle(f.vade, isaret * od.kalan, (f.tur === "satis" ? "Tahsilat · " : "Ödeme · ") + cariAdi(f.musteriId) + " · " + f.no, "fatura/" + f.id, f.tur === "satis" ? "tahsilat" : "odeme"); }
  });
  veri.cekler.filter(c => cekAcik(c) && c.vade && c.vade <= son).forEach(c => ekle(c.vade, (c.tur === "alinan" ? 1 : -1) * c.tutar, (c.tur === "alinan" ? "Çek / senet tahsili · " : "Çek / senet ödemesi · ") + (cariAdi(c.musteriId) || c.kesideci || ""), "cekler/" + c.id, "cek"));
  bekleyenSabitler(gun).forEach(x => ekle(x.vade, -x.g.tutar, x.g.ad + " (sabit gider)", "sabitgiderler", "sabit"));
  for(let ay = bg.slice(0, 7); ay + "-01" <= son; ay = ayKaydir(ay, 1)){
    const t = ay + "-" + ("0" + ayGunSayisi(ay)).slice(-2); if(t < bg || t > son) continue;
    const m = veri.personel.filter(p => calisiyor(p, t) && p.ucretTipi === "aylik").reduce((s, p) => s + (Number(p.ucret) || 0), 0);
    if(m) ekle(t, -m, "Maaşlar (" + AYLAR[Number(ay.slice(5)) - 1] + ")", "maas/ay", "maas");
  }
  // Teslimde alınacak kalan (faturalanmamış iş emirleri)
  if(filtre.nakitIsler !== false) veri.is_emirleri.filter(ie => ac(ie) && ie.durum !== "Teklif" && ie.teslimTarihi && ie.teslimTarihi <= son && !veri.faturalar.some(f => f.isEmriId === ie.id && f.tur === "satis"))
    .forEach(ie => { const o = isOzet(ie.id); if(o.kalan > 0) ekle(ie.teslimTarihi, o.kalan, "Teslimde kalan · " + ie.no + " " + ie.baslik, "is/" + ie.id, "is"); });
  return l.sort((a, b) => a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : b.tutar - a.tutar);
}
function nakitAkisi(gun){
  const k = kasa(), bas = yuvarla(k.nakit + k.banka), ol = nakitOlaylari(gun), gunler = [];
  let b = bas;
  for(let i = 0; i <= gun; i++){ const t = gunEkle(bugun(), i), o = ol.filter(x => x.tarih === t); o.forEach(x => { b = yuvarla(b + x.tutar); }); gunler.push({t, b, o}); }
  return {bas, gunler, ol, enAz:gunler.reduce((m, g) => g.b < m.b ? g : m, gunler[0]), son:gunler[gunler.length - 1].b, giren:yuvarla(ol.filter(x => x.tutar > 0).reduce((s, x) => s + x.tutar, 0)), cikan:yuvarla(ol.filter(x => x.tutar < 0).reduce((s, x) => s - x.tutar, 0))};
}
function nakitGrafik(n){
  const W = 760, H = 240, P = {l:64, r:16, t:16, b:28}, g = n.gunler, vals = g.map(x => x.b).concat([0]);
  let mn = Math.min(...vals), mx = Math.max(...vals); if(mn === mx){ mx += 1000; mn -= 1000; } const pay = (mx - mn) * 0.08; mn -= pay; mx += pay;
  const x = i => P.l + i * (W - P.l - P.r) / Math.max(1, g.length - 1), y = v => P.t + (mx - v) * (H - P.t - P.b) / (mx - mn);
  const yol = g.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.b).toFixed(1)).join(" ");
  const tik = [mn + pay, (mn + mx) / 2, mx - pay].map(v => Math.round(v / 1000) * 1000);
  const ay = g.map((d, i) => ({d, i})).filter(o => o.i === 0 || Number(o.d.t.slice(8)) === 1 || o.i === g.length - 1);
  return '<div class="nakit-grafik"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Günlük tahmini kasa bakiyesi">' +
    tik.map(v => '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="ng-izgara"/><text x="' + (P.l - 8) + '" y="' + (y(v) + 4) + '" class="ng-eksen" text-anchor="end">' + (Math.abs(v) >= 1000 ? Math.round(v / 1000) + "B" : v) + '</text>').join("") +
    (mn < 0 && mx > 0 ? '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="ng-sifir"/>' : '') +
    ay.map(o => '<text x="' + x(o.i) + '" y="' + (H - 8) + '" class="ng-eksen" text-anchor="' + (o.i === 0 ? "start" : o.i === g.length - 1 ? "end" : "middle") + '">' + Number(o.d.t.slice(8)) + ' ' + AYLAR[Number(o.d.t.slice(5, 7)) - 1].slice(0, 3) + '</text>').join("") +
    '<path d="' + yol + ' L' + x(g.length - 1) + ' ' + y(Math.max(mn, Math.min(0, mx))) + ' L' + x(0) + ' ' + y(Math.max(mn, Math.min(0, mx))) + ' Z" class="ng-alan"/>' +
    '<path d="' + yol + '" class="ng-cizgi"/>' +
    g.map((d, i) => d.o.length ? '<circle cx="' + x(i) + '" cy="' + y(d.b) + '" r="4" class="ng-nokta' + (d.b < 0 ? ' eksi' : '') + '"/>' : '').join("") +
    '<line class="ng-imlec" x1="0" x2="0" y1="' + P.t + '" y2="' + (H - P.b) + '" style="display:none"/>' +
    '<rect x="' + P.l + '" y="' + P.t + '" width="' + (W - P.l - P.r) + '" height="' + (H - P.t - P.b) + '" fill="transparent" class="ng-alani" data-n="' + g.length + '" data-l="' + P.l + '" data-w="' + (W - P.l - P.r) + '"/></svg><div class="ng-ipucu" hidden></div></div>';
}
function ekranNakitAkisi(){
  const gun = Number(filtre.nakitGun) || 60, n = nakitAkisi(gun), eksi = n.gunler.find(g => g.b < 0);
  const html = '<div class="ust-arac"><div class="secenekler">' + [30, 60, 90].map(g => '<button class="secenek' + (g === gun ? ' secili' : '') + '" data-is="nakitGun" data-arg="' + g + '">' + g + ' gün</button>').join("") + '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:14px"><input type="checkbox" id="nakitIsler"' + (filtre.nakitIsler !== false ? ' checked' : '') + '> Teslimde alınacakları dahil et</label></div>' +
    (eksi ? '<div class="uyari"><b>' + tarihYaz(eksi.t) + '</b> günü kasa eksiye düşüyor (' + para(eksi.b) + '). O tarihten önce tahsilat yapın veya ödemeleri erteleyin.</div>' : '') +
    '<div class="izgara dort"><div class="kart ozet"><div class="kart-baslik">Bugün kasa + banka</div><div class="deger">' + para(n.bas) + '</div><div class="alt-bilgi">çek / senet hariç</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Girecek</div><div class="deger t-giris">+' + para(n.giren) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Çıkacak</div><div class="deger t-cikis">−' + para(n.cikan) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">' + gun + ' gün sonra</div><div class="deger ' + (n.son < 0 ? 't-cikis' : '') + '">' + para(n.son) + '</div><div class="alt-bilgi">en düşük ' + para(n.enAz.b) + ' · ' + tarihYaz(n.enAz.t, true) + '</div></div></div>' +
    '<div class="kart">' + kartBaslik("Günlük tahmini bakiye") + nakitGrafik(n) + '</div>' +
    bolum("Beklenen hareketler (" + n.ol.length + ")") + '<div class="kart liste-kart">' + (n.ol.length ? n.ol.map(o => '<button class="satir" data-git="' + o.yer + '"><span class="rozet ' + (o.tutar > 0 ? 'r-giris' : 'r-cikis') + '">' + ik(o.tutar > 0 ? "asagi" : "yukari") + '</span>' +
      '<span class="orta"><div class="s1">' + esc(o.yazi) + '</div><div class="s2"' + (o.gecikmis ? ' style="color:#b91c1c"' : '') + '>' + (o.gecikmis ? "Vadesi geçmiş · bugüne sayıldı" : tarihYaz(o.tarih, true)) + '</div></span>' +
      '<span class="tutar ' + (o.tutar > 0 ? 't-giris' : 't-cikis') + '">' + (o.tutar > 0 ? "+" : "−") + para(Math.abs(o.tutar)) + '</span></button>').join("") : bos("kasa", "Bu sürede vadesi gelen tahsilat / ödeme yok.")) + '</div>' +
    '<div class="alt-bilgi" style="margin:8px 2px">Hesaba katılanlar: satış / alış faturalarının ve taksitlerin kalanları (vade tarihinde), çek / senetler, sabit giderler, aylık maaşlar' + (filtre.nakitIsler !== false ? ', faturası kesilmemiş işlerin teslimde alınacak kalanı' : '') + '. Vadesi geçmiş tahsilat / ödemeler bugüne sayılır. Tahmindir; günlük harcamalar dahil değildir.</div>';
  return {baslik:"Nakit akışı tahmini", geri:true, html, sonra(){
    const c = document.getElementById("nakitIsler"); if(c) c.addEventListener("change", () => { filtre.nakitIsler = c.checked; ciz(); });
    const a = document.querySelector(".ng-alani"); if(!a) return;
    const svg = a.ownerSVGElement, ip = document.querySelector(".ng-ipucu"), im = svg.querySelector(".ng-imlec");
    const goster = e => { const r = svg.getBoundingClientRect(), sx = 760 / r.width, px = (e.clientX - r.left) * sx, i = Math.max(0, Math.min(n.gunler.length - 1, Math.round((px - 64) / (680 / Math.max(1, n.gunler.length - 1))))), d = n.gunler[i];
      const xx = 64 + i * 680 / Math.max(1, n.gunler.length - 1); im.setAttribute("x1", xx); im.setAttribute("x2", xx); im.style.display = "";
      ip.hidden = false; ip.innerHTML = '<b>' + tarihYaz(d.t) + '</b><br>Bakiye: <b' + (d.b < 0 ? ' class="t-cikis"' : '') + '>' + para(d.b) + '</b>' + d.o.map(o => '<br>' + (o.tutar > 0 ? "+" : "−") + para(Math.abs(o.tutar)) + ' ' + esc(o.yazi.slice(0, 40))).join("");
      ip.style.left = Math.min(r.width - 220, Math.max(0, xx / sx + 8)) + "px"; };
    a.addEventListener("pointermove", goster); a.addEventListener("pointerdown", goster);
    a.addEventListener("pointerleave", () => { ip.hidden = true; im.style.display = "none"; });
  }};
}
EYLEM.nakitGun = (el, g) => { filtre.nakitGun = Number(g); ciz(); };

/* ================= ADEKO / EXCEL / CSV KESİM LİSTESİ AKTARMA ================= */
// ADeko ve benzeri programların verdiği parça listesi (Excel / CSV) kesim listesine eklenir. Sütunlar başlıktan tahmin edilir, elle değiştirilebilir.
const AKTAR_ALAN = [["ad", "Parça adı", /parca|parça|aciklama|açıklama|tanim|tanım|isim|^ad|name|part/i], ["boy", "Boy (uzunluk)", /boy|uzunluk|length|^l$|yukseklik|yükseklik/i],
  ["en", "En (genişlik)", /^en$|^en |genislik|genişlik|width|^w$/i], ["adet", "Adet", /adet|miktar|qty|quantity|sayi|sayı/i], ["malzeme", "Malzeme", /malzeme|material|renk|desen|plaka|kalinlik|kalınlık/i],
  ["bantU", "Uzun kenar bandı (0–2)", /uzun.*bant|bant.*uzun|bant ?u|kenar ?1/i], ["bantK", "Kısa kenar bandı (0–2)", /kisa.*bant|kısa.*bant|bant.*kisa|bant.*kısa|bant ?k|kenar ?2/i],
  ["damar", "Damar / desen yönü", /damar|grain|desen yonu|desen yönü|yon|yön/i], ["modul", "Modül / dolap", /modul|modül|dolap|kabin|cabinet|grup/i]];
EYLEM.kesimAktar = () => { const i = document.createElement("input"); i.type = "file"; i.accept = ".xlsx,.xls,.csv,.txt"; i.onchange = () => { if(i.files[0]) kesimDosyaOku(i.files[0]); }; i.click(); };
async function kesimDosyaOku(f){
  let satirlar;
  try{
    if(/\.(csv|txt)$/i.test(f.name)){ const t = await f.text(), ayr = (t.split("\n")[0].match(/;/g) || []).length >= (t.split("\n")[0].match(/,/g) || []).length ? ";" : (t.indexOf("\t") >= 0 ? "\t" : ",");
      satirlar = t.replace(/^﻿/, "").split(/\r?\n/).filter(s => s.trim()).map(s => s.split(ayr).map(x => x.replace(/^"|"$/g, "").trim())); }
    else { const X = await kutuphane("xlsx"), wb = X.read(new Uint8Array(await f.arrayBuffer()), {type:"array"}); satirlar = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, raw:false, defval:""}); }
  }catch(e){ return uyar("Dosya okunamadı", hataMesaji(e)); }
  kesimAktarPenceresi(satirlar.map(r => r.map(x => String(x == null ? "" : x).trim())), f.name);
}
// Başlık satırı: en çok alan adı eşleşen ilk 10 satırdan biri
function aktarBaslik(sat){
  let en = {i:0, p:-1};
  sat.slice(0, 10).forEach((r, i) => { const p = AKTAR_ALAN.filter(([, , re]) => r.some(h => re.test(h))).length; if(p > en.p) en = {i, p}; });
  const h = sat[en.i] || [], es = {};
  AKTAR_ALAN.forEach(([a, , re]) => { const j = h.findIndex((x, k) => re.test(x) && !Object.values(es).includes(k)); es[a] = j; });
  return {satir:en.i, eslesme:es, basliklar:h};
}
const sayiHucre = v => { const n = sayiOku(String(v).replace(/[^\d.,-]/g, "")); return n || 0; };
function kesimAktarPenceresi(sat, ad){
  const b = aktarBaslik(sat), pm = plakaMalzemeleri(), veri_ = sat.slice(b.satir + 1).filter(r => r.some(Boolean));
  const p = document.createElement("div"); p.className = "perde";
  const sec = (a, j) => '<select class="kutu ak-sec" data-a="' + a + '"><option value="-1">— yok —</option>' + b.basliklar.map((h, k) => '<option value="' + k + '"' + (k === j ? ' selected' : '') + '>' + esc(h || ("Sütun " + (k + 1))) + '</option>').join("") + '</select>';
  p.innerHTML = '<div class="pencere" style="max-width:720px;max-height:92vh;overflow:auto"><p>Kesim listesini aktar</p><div class="alt-bilgi">' + esc(ad) + ' · ' + veri_.length + ' satır. Sütunları kontrol edin.</div>' +
    '<div class="izgara uc" style="margin:0">' + AKTAR_ALAN.map(([a, t]) => '<div><label class="etiket">' + t + '</label>' + sec(a, b.eslesme[a]) + '</div>').join("") + '</div>' +
    '<div class="iki-alan"><div><label class="etiket">Ölçü birimi</label><div class="secenekler" id="akBirim">' + [["mm", "mm"], ["cm", "cm"]].map(([v, t]) => '<button type="button" class="secenek" data-b="' + v + '">' + t + '</button>').join("") + '</div></div>' +
      '<div><label class="etiket">Malzeme eşleşmeyenler için</label><select id="akVars" class="kutu">' + (pm.length ? pm.map(m => '<option value="' + m.id + '">' + esc(plakaEtiket(m)) + '</option>').join("") : '<option value="">Varsayılan plaka</option>') + '</select></div></div>' +
    '<div id="akOnizleme" style="overflow:auto;margin-top:10px"></div><div class="hata" id="akHata"></div>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="ekle">' + ik("arti") + 'Kesim listesine ekle</button></div></div>';
  const birimSec = v => p.querySelectorAll("#akBirim .secenek").forEach(x => x.classList.toggle("secili", x.getAttribute("data-b") === v));
  const oku = () => {
    const es = {}; p.querySelectorAll(".ak-sec").forEach(s => { es[s.getAttribute("data-a")] = Number(s.value); });
    const kat = (p.querySelector("#akBirim .secili") || {}).getAttribute ? p.querySelector("#akBirim .secili").getAttribute("data-b") === "cm" ? 10 : 1 : 1, vars = p.querySelector("#akVars").value;
    const malz = ad_ => { const s = sade(ad_); if(!s) return vars; const m = pm.find(x => sade(x.ad) === s) || pm.find(x => sade(x.ad).indexOf(s) >= 0 || s.indexOf(sade(x.ad)) >= 0) ||
      pm.find(x => { const k = (sade(x.ad).match(/\d+\s*mm/) || [""])[0], r = sade(x.ad).replace(/\d+\s*mm/, "").trim().split(/\s+/)[0]; return k && s.indexOf(k.replace(/\s/g, "")) >= 0 || (r && s.indexOf(r) >= 0); }); return m ? m.id : vars; };
    const h = j => j >= 0 ? j : null, l = [];
    veri_.forEach(r => { const g = (a) => h(es[a]) == null ? "" : r[es[a]] || "";
      const boy = Math.round(sayiHucre(g("boy")) * kat), en = Math.round(sayiHucre(g("en")) * kat), adet = Math.max(1, Math.round(sayiHucre(g("adet")) || 1));
      if(!(boy > 0 && en > 0)) return;
      const bant = x => { const n = Math.round(sayiHucre(x)); return n >= 0 && n <= 2 ? n : 0; }, dm = sade(g("damar"));
      l.push({id:yeniId(), ad:[g("modul"), g("ad")].filter(Boolean).join(" · ").slice(0, 60) || "Parça", en, boy, adet, malzemeId:malz(g("malzeme")), bantU:bant(g("bantU")), bantK:bant(g("bantK")),
        damar:!!dm && !/^(0|yok|hayir|hayır|no|false|-)$/.test(dm)}); });
    return l;
  };
  const onizle = () => { const l = oku();
    p.querySelector("#akOnizleme").innerHTML = l.length ? '<table class="kesim-ozet"><thead><tr><th>Parça</th><th>En</th><th>Boy</th><th>Adet</th><th>Malzeme</th><th>Bant U/K</th></tr></thead><tbody>' +
      l.slice(0, 8).map(x => '<tr><td>' + esc(x.ad) + (x.damar ? ' <span class="ist">(damar)</span>' : '') + '</td><td>' + x.en + '</td><td>' + x.boy + '</td><td>' + x.adet + '</td><td>' + esc(plakaBul(x.malzemeId).ad) + '</td><td>' + x.bantU + '/' + x.bantK + '</td></tr>').join("") +
      '</tbody></table><div class="alt-bilgi">' + l.length + ' parça satırı · ' + l.reduce((t, x) => t + x.adet, 0) + ' adet' + (l.length > 8 ? ' (ilk 8 gösteriliyor)' : '') + '</div>' : '<div class="alt-bilgi">Okunabilen parça yok; Boy ve En sütunlarını seçin.</div>'; };
  // Birim tahmini: boylar 300'den küçükse büyük ihtimalle cm
  const ilk = (() => { const j = b.eslesme.boy; if(j < 0) return "mm"; const v = veri_.map(r => sayiHucre(r[j])).filter(x => x > 0); return v.length && Math.max(...v) < 300 ? "cm" : "mm"; })();
  birimSec(ilk);
  p.addEventListener("change", onizle);
  p.addEventListener("click", e => {
    const bb = e.target.closest("[data-b]"); if(bb){ birimSec(bb.getAttribute("data-b")); return onizle(); }
    const c = e.target.closest("[data-c]"); if(!c){ if(e.target === p) p.remove(); return; } if(c.getAttribute("data-c") === "hayir") return p.remove();
    const l = oku(); if(!l.length) return p.querySelector("#akHata").textContent = "Aktarılacak parça yok.";
    kesimOku(); kesimForm.parcalar = kesimForm.parcalar.concat(l); kesimForm.degisti = true; p.remove(); ciz(); bildir(l.length + " parça satırı eklendi; kaydetmeyi unutmayın");
  });
  document.body.appendChild(p); onizle();
}
