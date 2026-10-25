// Bulut davranışı (sahte Supabase): fiyat gizleme, çakışma uyarısı, hızlı açılış, çevrimdışı kuyruk
module.exports = ({test}) => {
  const isEmri = () => Depo.kaydet("is_emirleri", Object.assign(isAlanlari({}), {id:"i1", no:"İE-0001", musteriId:"m1", baslik:"Mutfak", durum:"Teklif", oncelik:"Normal", sorumlu:"", adres:"",
    kalemler:[{ad:"Alt dolap", olcu:"", adet:1, fiyat:40000, maliyet:25000}], asamalar:[], teklif:{kdv:20, indirim:500}, kesif:{}, tutar:47400, aciklama:"", teslimTarihi:null, olusma:Date.now()}));
  const hazirla = async () => { await Depo.kaydet("musteriler", {id:"m1", ad:"Ali Osman", tip:"musteri", telefon:"", adres:"", vergiNo:"", olusma:1}); };

  test("İş emri fiyatları ayrı tabloda; usta göremez", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(hazirla); await pg.evaluate(isEmri);
    const r = await pg.evaluate(() => ({db:__db.is_emirleri[0], f:__db.is_emri_fiyat[0], ayri:fiyatAyri, surum:surumVar}));
    a.dogru(r.ayri && r.surum, "Güncelleme 13 algılanmalı");
    a.esit([r.db.tutar, r.db.kalemler[0].fiyat, r.db.teklif], [0, undefined, {}], "İş emri tablosunda fiyat kalmamalı");
    a.esit([r.f.tutar, r.f.kalem_fiyat[0].fiyat, r.f.teklif.indirim], [47400, 40000, 500]);
    await pg.evaluate(() => { localStorage.setItem("__yonetici", "0"); localStorage.setItem("__eposta", "ali@gunesmobilya.app"); });
    await pg.reload(); await pg.waitForFunction(() => hazir);
    const u = await pg.evaluate(() => ({yon:yetki.yonetici, tutar:bul("is_emirleri", "i1").tutar, kalem:bul("is_emirleri", "i1").kalemler[0].fiyat}));
    a.esit(u, {yon:false, tutar:0, kalem:undefined});
    await pg.kapat();
  });

  test("Başkası değiştirdiyse çakışma uyarısı; 'benimkini kaydet' çalışır", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(hazirla); await pg.evaluate(isEmri);
    await pg.git("is-form/i1");
    await pg.evaluate(() => { const r = __db.is_emirleri[0]; r.baslik = "İbrahim'in değişikliği"; r.surum++; r.degistiren = "ibrahim@gunesmobilya.app"; r.degisme = Date.now(); localStorage.setItem("__sahte_db", JSON.stringify(__db)); });
    await pg.fill("#baslik", "Samet'in değişikliği"); await pg.click('[data-is="isKaydet"]'); await pg.waitForTimeout(300);
    const metin = await pg.textContent(".perde .pencere");
    a.dogru(/başkası değiştirdi/.test(metin) && /ibrahim/i.test(metin), "Çakışma penceresi: " + metin.slice(0, 80));
    a.esit(await pg.evaluate(() => __db.is_emirleri[0].baslik), "İbrahim'in değişikliği", "Sessizce üzerine yazılmamalı");
    await pg.click('.perde [data-c="benim"]'); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => [__db.is_emirleri[0].baslik, __db.is_emri_fiyat[0].tutar]), ["Samet'in değişikliği", 47400]);
    await pg.kapat();
  });

  test("Hızlı açılış: cihazdaki kopya + yalnız değişen / silinen kayıtlar", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(hazirla); await pg.evaluate(isEmri);
    await pg.evaluate(() => Depo.kaydet("musteriler", {id:"m2", ad:"Silinecek", tip:"musteri", telefon:"", adres:"", vergiNo:"", olusma:2}));
    await pg.waitForTimeout(1000);   // cihaz kopyası yazılsın
    await pg.evaluate(() => {
      __db.musteriler.push({id:"m9", ad:"Başka cihazdan", tip:"musteri", telefon:"", adres:"", vergi_no:"", olusma:3, surum:1, degisme:Date.now() + 10, degistiren:"ibrahim@gunesmobilya.app"});
      __db.musteriler = __db.musteriler.filter(x => x.id !== "m2"); (__db.silinenler = __db.silinenler || []).push({id:1, tablo:"musteriler", kayit_id:"m2", zaman:Date.now() + 10});
      localStorage.setItem("__sahte_db", JSON.stringify(__db));
    });
    await pg.reload(); await pg.waitForFunction(() => hazir); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => ({ad:veri.musteriler.map(m => m.ad).sort(), fiyat:bul("is_emirleri", "i1").tutar}));
    a.esit(r.ad, ["Ali Osman", "Başka cihazdan"]);
    a.esit(r.fiyat, 47400, "Fiyat kopyadan korunmalı");
    await pg.kapat();
  });

  test("İnternet yokken kayıtlar sıraya alınır, gelince gönderilir", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(hazirla);
    await pg.evaluate(async () => {
      __agYok = true; window.dispatchEvent(new Event("offline"));
      await Depo.kaydet("musteriler", {id:"m5", ad:"Çevrimdışı müşteri", tip:"musteri", telefon:"", adres:"", vergiNo:"", olusma:5});
      await Depo.sil("musteriler", "m1");
    });
    a.esit(await pg.evaluate(() => [cevrimdisi, kuyruk.length > 0, __db.musteriler.map(x => x.ad)]), [true, true, ["Ali Osman"]]);
    await pg.evaluate(async () => { __agYok = false; await kuyrukGonder(); });
    a.esit(await pg.evaluate(() => [kuyruk.length, __db.musteriler.map(x => x.ad)]), [0, ["Çevrimdışı müşteri"]]);
    await pg.kapat();
  });
};
