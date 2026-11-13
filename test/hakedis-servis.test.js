// Teklif sürümleri, sözleşme / hakediş, taşeron, garanti ve servis, müşteri iş sayfası ve onay, nakit akışı, ADeko / CSV aktarma
const ornekVeri = require("./ornek-veri");
module.exports = ({test}) => {
  test("Teklif değişince önceki hâli sürüm olur; geri dönülebilir", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.git("is-form/i2"); await pg.fill(".k-fiyat >> nth=0", "36000"); await pg.click('[data-is="isKaydet"]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const ie = bul("is_emirleri", "i2"); return {n:(ie.ekler.surumler || []).length, eski:ie.ekler.surumler[0].kalemler[0].fiyat, yeni:ie.kalemler[0].fiyat}; });
    a.esit(r, {n:1, eski:40000, yeni:36000});
    await pg.git("is/i2");
    a.dogru(/Teklif sürümleri \(2\)/.test(await pg.textContent("main")), "Sürüm kartı");
    await pg.evaluate(() => EYLEM.surumeDon(null, "i2|0")); await pg.click('.perde [data-c="evet"]'); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => { const ie = bul("is_emirleri", "i2"); return [ie.kalemler[0].fiyat, ie.ekler.surumler.length]; }), [40000, 2]);
    await pg.kapat();
  });

  test("Sözleşme, hakediş hesabı (teminat, KDV, avans mahsubu), hakediş faturası, taşeron", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.evaluate(() => ekKaydet(bul("is_emirleri", "i1"), {sozlesme:{kalemler:[{id:"a", ad:"Kaba sıva", birim:"m²", miktar:100, fiyat:500}, {id:"b", ad:"Kapı montajı", birim:"adet", miktar:10, fiyat:2000}],
      teminat:5, kdv:20, tevkifat:0, avans:10000, hakedisler:[]}}));
    await pg.git("hakedis/i1"); await pg.click('[data-is="hakedisYeni"]');
    await pg.fill('.perde tr[data-id="a"] .hk-m', "40"); await pg.fill('.perde tr[data-id="b"] .hk-m', "5"); await pg.waitForTimeout(100);
    a.esit(await pg.inputValue("#hkAvans"), "4285,71", "Avans mahsubu orantılı önerilmeli");
    await pg.click('.perde [data-c="kaydet"]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const s = sozlesmeAl(bul("is_emirleri", "i1")), h = hakedisHesapla(s, 0); return [s.hakedisler.length, h.buDonem, h.kdv, h.teminat, h.avansMahsup, h.odenecek, Math.round(h.oran)]; });
    a.esit(r, [1, 30000, 6000, 1500, 4285.71, 30214.29, 43]);
    // Hakediş faturası: satış faturası formu dolu gelir
    await pg.evaluate(() => EYLEM.hakedisFatura(null, "i1|0")); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => [location.hash, document.querySelector(".k-fiyat").value, document.getElementById("aciklama").value.slice(0, 9)]), ["#fatura-form/satis/m1/i1", "30000", "Hakediş 1"]);
    await pg.click('[data-is="faturaKaydet"]'); await pg.waitForTimeout(300);
    a.dogru(await pg.evaluate(() => !!hakedisFaturasi(bul("is_emirleri", "i1"), sozlesmeAl(bul("is_emirleri", "i1")).hakedisler[0])), "Fatura hakedişe bağlanmalı");
    // Taşeron
    const t = await pg.evaluate(async () => { await ekKaydet(bul("is_emirleri", "i1"), {taseronlar:[{id:"ts1", cariId:"t1", is:"Sıva ekibi", tutar:20000, tarih:bugun(), not:""}]});
      await Depo.kaydet("hareketler", {id:"tsh", tur:"cikis", tutar:5000, kategori:"Taşeron ödemesi", odeme:"Nakit", musteriId:"t1", isEmriId:"i1", faturaId:null, aciklama:"", tarih:bugun(), olusma:Date.now(), ortak:"", hedef:""});
      return taseronOdenen("i1", "t1"); });
    a.esit(t, 5000);
    await pg.git("taseronlar");
    a.dogru(/Kaya Kereste/.test(await pg.textContent("main")) && /kalan 15\.000/.test(await pg.textContent("main")), "Taşeron listesi");
    await pg.kapat();
  });

  test("Garanti ve servis kaydı; Yapılacaklar'da görünür", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.evaluate(async () => { const ie = bul("is_emirleri", "i1"); await Depo.kaydet("is_emirleri", Object.assign({}, ie, {durum:"Teslim edildi"})); await notEkle("i1", "Durum: Üretimde → Teslim edildi"); });
    await pg.git("is/i1");
    a.dogru(/Garanti ve servis/.test(await pg.textContent("main")) && /24 ay/.test(await pg.textContent("main")), "Garanti kartı");
    await pg.click('[data-is="servisAc"][data-arg="i1|"]'); await pg.fill("#svSikayet", "Alt dolap kapağı sarktı"); await pg.click('.perde [data-c="kaydet"]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const ie = bul("is_emirleri", "i1"); return {n:servisKayitlari(ie).length, garantide:servisKayitlari(ie)[0].garantide, bit:garantiBitisi(ie) > bugun(),
      h:hatirlatmalar().some(h => /^Servis bekliyor/.test(h.yazi)), tur:hatirlatmaTuru(hatirlatmalar().find(h => /^Servis/.test(h.yazi)))}; });
    a.esit(r, {n:1, garantide:true, bit:true, h:true, tur:"servis"});
    await pg.git("servis");
    a.dogru(/Alt dolap kapağı sarktı/.test(await pg.textContent("main")), "Servis ekranı");
    await pg.kapat();
  });

  test("Müşteri iş sayfası: teklif görünür, müşteri onaylar, siparişe çevrilir", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(async () => {
      await Depo.kaydet("musteriler", {id:"m1", ad:"Ali Osman", tip:"musteri", telefon:"05551112233", adres:"", vergiNo:"", olusma:1});
      await Depo.kaydet("is_emirleri", Object.assign(isAlanlari({}), {id:"i1", no:"İE-0001", musteriId:"m1", baslik:"Mutfak", durum:"Teklif", oncelik:"Normal", sorumlu:"", adres:"", kalemler:[{ad:"Alt dolap", olcu:"", adet:1, fiyat:40000}],
        asamalar:[{ad:"Kesim", tamam:false}], teklif:{kdv:20}, kesif:{}, tutar:48000, aciklama:"", teslimTarihi:null, olusma:1}));
    });
    const anahtar = await pg.evaluate(async () => (await isSayfasiYaz(bul("is_emirleri", "i1"), {fiyat:true, odeme:false, foto:false}, null, 90)).id);
    await pg.git("is/i1");
    a.dogru(/Müşteri iş sayfası/.test(await pg.textContent("main")) && /Bağlantı açık/.test(await pg.textContent("main")), "İş emrinde kart");
    // Müşterinin gördüğü sayfa
    await pg.evaluate(k => { sb.rpc = async (ad, x) => ad === "vitrin_getir" ? {data:bul("paylasimlar", x.anahtar).icerik} : (window.__cevap = x, {data:{tamam:true}}); vitrinGoster(k); }, anahtar);
    await pg.waitForTimeout(300);
    const m = await pg.textContent("main");
    a.dogru(/Genel toplam/.test(m) && /48\.000/.test(m) && /Teklifi onaylıyorum/.test(m), "Teklif ve onay düğmesi");
    await pg.click('[data-is="teklifCevap"][data-arg$="|onay"]'); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => [/Onayınız iletildi/.test(document.getElementById("onayKutu").textContent), window.__cevap.karar, window.__cevap.ad]), [true, "onay", "Ali Osman"]);
    // Yönetici tarafı: onay gelince Yapılacaklar ve siparişe çevirme
    const r = await pg.evaluate(async () => {
      document.body.classList.remove("girissiz");
      await Depo.kaydet("teklif_onay", {id:"o1", paylasimId:"x", isEmriId:"i1", karar:"onay", ad:"Ali Osman", not:"", zaman:Date.now(), islendi:false});
      const h = hatirlatmalar().some(x => /teklifi onayladı/.test(x.yazi));
      await new Promise(r => { EYLEM.onayIsle(null, "o1|siparis"); setTimeout(r, 300); });
      return [h, bul("is_emirleri", "i1").durum, bul("teklif_onay", "o1").islendi, hatirlatmalar().some(x => /teklifi onayladı/.test(x.yazi))];
    });
    a.esit(r, [true, "Sipariş alındı", true, false]);
    await pg.kapat();
  });

  test("Nakit akışı: vadeler, çekler, maaş; eksiye düşüş uyarısı", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      const n = nakitAkisi(30), tur = n.ol.map(x => x.tur).sort();
      await Depo.kaydet("faturalar", {id:"f9", no:"A9", tur:"alis", musteriId:"t1", isEmriId:null, kategori:"Hammadde (MDF, Sunta, Kereste)", tarih:bugun(), vade:gunEkle(bugun(), 5), kalemler:[{ad:"x", miktar:1, fiyat:500000, kdv:0}], araToplam:500000, kdvToplam:0, toplam:500000, aciklama:"", olusma:9});
      const n2 = nakitAkisi(30);
      return {gun:n.gunler.length, bas:n.bas, tahsilat:n.ol.filter(x => x.tur === "tahsilat").map(x => [x.tutar, x.gecikmis]), cek:n.ol.some(x => x.tur === "cek" && x.tutar === 5000), eksi:!!n2.gunler.find(g => g.b < 0), tur};
    });
    a.esit([r.gun, r.tahsilat, r.cek, r.eksi], [31, [[38000, true]], true, true]);
    a.esit(r.bas, await pg.evaluate(() => kasa().nakit + kasa().banka));
    await pg.evaluate(() => Depo.kaydet("faturalar", Object.assign({}, bul("faturalar", "f9"), {vade:gunEkle(bugun(), 5)})));
    await pg.git("nakitakisi"); await pg.waitForTimeout(150);
    a.dogru(/kasa eksiye düşüyor/.test(await pg.textContent("main")) && await pg.isVisible(".nakit-grafik svg"), "Uyarı ve grafik");
    await pg.kapat();
  });

  test("ADeko / CSV kesim listesi aktarma: sütun ve birim tahmini, malzeme eşleşmesi", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.git("kesim/i2");
    await pg.evaluate(() => kesimDosyaOku(new File(["﻿Modül;Parça Adı;Boy;En;Adet;Malzeme;Damar;Uzun Bant;Kısa Bant\nAlt 60;Yan;72;56;2;18 mm Beyaz Sunta;Hayır;1;0\nAlt 60;Kapak;71,6;59,6;1;18mm beyaz sunta;Evet;2;2\nAlt 60;Arkalık;71,6;59,6;1;8 mm Duralit;;0;0\n"], "adeko.csv", {type:"text/csv"})));
    await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => (document.querySelector("#akBirim .secili") || {}).textContent), "cm", "cm tahmini");
    await pg.click('.perde [data-c="ekle"]'); await pg.waitForTimeout(200);
    const r = await pg.evaluate(() => kesimForm.parcalar.slice(-3).map(p => [p.ad, p.boy, p.en, p.adet, p.malzemeId, p.damar, p.bantU, p.bantK]));
    a.esit(r, [["Alt 60 · Yan", 720, 560, 2, "mz1", false, 1, 0], ["Alt 60 · Kapak", 716, 596, 1, "mz1", true, 2, 2], ["Alt 60 · Arkalık", 716, 596, 1, "mz2", false, 0, 0]]);
    await pg.kapat();
  });
};
