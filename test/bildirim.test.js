// Bildirim merkezi, ekran kilidi ve gelişmiş ayarlar
const ornekVeri = require("./ornek-veri");

module.exports = ({test}) => {
  test("Başka kullanıcının değişikliği bildirim olur; kendi değişikliğim olmaz", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(async () => {
      await Depo.kaydet("musteriler", {id:"m1", ad:"Ali Osman", tip:"musteri", telefon:"", adres:"", vergiNo:"", olusma:1});
      await Depo.kaydet("is_emirleri", Object.assign(isAlanlari({}), {id:"i1", no:"İE-0001", musteriId:"m1", baslik:"Mutfak", durum:"Sipariş alındı", oncelik:"Normal", sorumlu:"", adres:"",
        kalemler:[], asamalar:[{ad:"Kesim", tamam:false}, {ad:"Montaj", tamam:false}], teklif:{}, kesif:{}, tutar:0, aciklama:"", teslimTarihi:null, olusma:Date.now()}));
    });
    a.esit(await pg.evaluate(() => bildirimler.length), 0, "Kendi kaydım bildirim üretmemeli");
    // İbrahim başka cihazdan kesimi bitirdi ve yeni müşteri ekledi
    await pg.evaluate(async () => {
      const r = __db.is_emirleri[0]; r.asamalar = [{ad:"Kesim", tamam:true}, {ad:"Montaj", tamam:false}]; r.surum++; r.degistiren = "ibrahim@gunesmobilya.app"; r.degisme = Date.now() + 10;
      __db.musteriler.push({id:"m2", ad:"Ayşe Kaya", tip:"musteri", telefon:"", adres:"", vergi_no:"", olusma:2, surum:1, degisme:Date.now() + 10, degistiren:"ibrahim@gunesmobilya.app"});
      await Depo.esitle(); ciz();
    });
    const r = await pg.evaluate(() => ({l:bildirimler.map(b => [b.tur, b.baslik, b.yer]).sort(), sayi:document.querySelector(".zil-sayi").textContent}));
    a.esit(r.l, [["is", "ibrahim Kesim aşamasını bitirdi", "is/i1"], ["para", "ibrahim yeni müşteri ekledi", "cari/m2"]]);
    a.esit(r.sayi, "2", "Zildeki okunmamış sayısı");
    // Aynı sürüm tekrar gelirse yeni bildirim olmaz
    await pg.evaluate(() => Depo.esitle());
    a.esit(await pg.evaluate(() => bildirimler.length), 2, "Tekrar eşitleme");
    // Panel açılır, tıklayınca ilgili sayfaya gider ve okundu olur
    await pg.click('[data-is="bildirimPanel"]');
    a.dogru(/Kesim aşamasını bitirdi/.test(await pg.textContent(".bildirim-panel")), "Panelde görünmeli");
    await pg.click('.bp-satir:has-text("Kesim")'); await pg.waitForTimeout(200);
    a.esit(await pg.evaluate(() => [location.hash, bildirimler.filter(b => !b.okundu).length, document.querySelectorAll(".bildirim-panel").length]), ["#is/i1", 1, 0]);
    // Kategori kapatılırsa bildirim gelmez
    await pg.evaluate(async () => {
      cihazKaydet({bildirim:Object.assign(bildirimAyar(), {kategori:Object.assign(bildirimAyar().kategori, {para:false})})});
      __db.musteriler.push({id:"m3", ad:"Veli", tip:"musteri", telefon:"", adres:"", vergi_no:"", olusma:3, surum:1, degisme:Date.now() + 20, degistiren:"ibrahim@gunesmobilya.app"});
      await Depo.esitle();
    });
    a.esit(await pg.evaluate(() => bildirimler.length), 2, "Kapalı kategori");
    // Yeniden açınca bildirimler cihazdan geri gelir
    await pg.waitForTimeout(600); await pg.reload(); await pg.waitForFunction(() => hazir);
    a.esit(await pg.evaluate(() => bildirimler.length), 2, "Cihazda saklanmalı");
    await pg.kapat();
  });

  test("Mesaj şablonu, belge, takvim ve hatırlatma ayarları uygulanır", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.git("ayarlar/mesajlar");
    await pg.fill('[data-sablon="hazir"]', "Selam {ad}, {is} hazır!{kalan} — {firma}");
    await pg.click('[data-is="sablonKaydet"][data-arg="hazir"]'); await pg.waitForTimeout(200);
    const m = await pg.evaluate(() => { const ie = bul("is_emirleri", "i1"); return waIsSablonlari(ie, bul("musteriler", ie.musteriId)).find(x => x.ad === "Hazır").metin; });
    a.dogru(/^Selam Ali Osman Yılmaz, .+ hazır!/.test(m) && !/\{/.test(m), "Şablon: " + m);
    await pg.git("ayarlar/takvim");
    await pg.fill("#tSaat", "08:30"); await pg.click('#tGunler [data-g="6"]');   // cumartesi kapalı
    await pg.click('[data-is="takvimKaydet"]'); await pg.waitForTimeout(200);
    a.esit(await pg.evaluate(() => [takvimAyar().saat, takvimAyar().gunler]), ["08:30", [1, 2, 3, 4, 5]]);
    await pg.git("ayarlar/belge");
    await pg.fill("#bBaslik", "TEKLİF FORMU"); await pg.uncheck("#bImza");
    await pg.click('[data-is="belgeKaydet"]'); await pg.waitForTimeout(200);
    a.esit(await pg.evaluate(() => [belgeAyar().teklifBaslik, belgeAyar().imza, belgeAyar().logo]), ["TEKLİF FORMU", false, true]);
    // Yapılacaklardan bir tür kapatılınca listeden çıkar
    const once = await pg.evaluate(() => hatirlatmalar().filter(h => hatirlatmaTuru(h) === "stok").length);
    await pg.evaluate(() => cihazKaydet({bildirim:Object.assign(bildirimAyar(), {hatirlatma:Object.assign(bildirimAyar().hatirlatma, {stok:false})})}));
    a.esit(await pg.evaluate(() => hatirlatmalar().filter(h => hatirlatmaTuru(h) === "stok").length), 0, "Stok hatırlatması kapalı (önce " + once + ")");
    // Ayar arama
    await pg.git("ayarlar"); await pg.fill("#ayarAra", "pin");
    a.esit(await pg.evaluate(() => Array.from(document.querySelectorAll(".ayar-menu [data-anahtar]")).filter(b => b.style.display !== "none").map(b => b.getAttribute("data-git"))), ["ayarlar/guvenlik"]);
    // Varsayılana döndür: şablon ve takvim sıfırlanır, ortaklar kalır
    await pg.evaluate(() => EYLEM.ayarSifirla()); await pg.click('.perde [data-c="evet"]'); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => [mesajSablonu("hazir") === MESAJ_SABLON.hazir[1], takvimAyar().saat, sistem().ortaklar.map(x => x.ad)]), [true, "09:00", ["Samet", "İbrahim"]]);
    await pg.kapat();
  });

  test("Ekran kilidi: PIN olmadan açılmaz", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(async () => cihazKaydet({pin:await pinOzet("1234"), kilitDk:5}));
    await pg.reload(); await pg.waitForFunction(() => hazir);
    a.dogru(await pg.isVisible(".kilit-ekrani"), "Açılışta kilit");
    await pg.fill("#kilitPin", "1111"); await pg.click('.kilit-ekrani [data-c="ac"]'); await pg.waitForTimeout(150);
    a.dogru(await pg.isVisible(".kilit-ekrani") && /yanlış/.test(await pg.textContent("#kilitHata")), "Yanlış PIN");
    await pg.fill("#kilitPin", "1234"); await pg.keyboard.press("Enter"); await pg.waitForTimeout(150);
    a.esit(await pg.evaluate(() => document.querySelectorAll(".kilit-ekrani").length), 0, "Doğru PIN");
    await pg.kapat();
  });
};
