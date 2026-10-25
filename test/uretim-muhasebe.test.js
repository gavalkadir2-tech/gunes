// Modül kütüphanesi, keşiften teklif, atölye kapasitesi, sabit giderler, ortak hesabı, muhasebeci, ana sayfa düzeni,
// telefondan paylaşma, fotoğraf küçültme, bildirim anahtarı
const ornekVeri = require("./ornek-veri");
const moduller = async () => {
  const l = ORNEK_MODULLER(); l.find(m => m.tip === "alt").fiyat = 10000; l.find(m => m.tip === "ust").fiyat = 6000; l.find(m => m.tip === "tezgah").fiyat = 3000;
  await Depo.kaydet("ayarlar", {anahtar:"urunModulleri", deger:l});
};

module.exports = ({test}) => {
  test("Modül fiyatı ve kesim parçaları; keşiften teklif kalemleri", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri); await pg.evaluate(moduller);
    const r = await pg.evaluate(() => { const m = modulListesi().find(x => x.tip === "alt"), k = modulKalemi(m, {en:2400});
      const g = modulListesi().find(x => x.fiyatTuru === "m2"); g.fiyat = 5000;
      return {fiyat:k.fiyat, olcu:k.olcu, parca:modulParcalari(m, k.modul, 1).length, maliyet:k.maliyet > 0, m2:modulHesap(g, {en:2000, boy:2400}).fiyat, tezgahParca:modulParcalari(modulListesi().find(x => x.tip === "tezgah"), {}, 1).length}; });
    a.esit(r, {fiyat:24000, olcu:"240×72×56", parca:5, maliyet:true, m2:24000, tezgahParca:0});
    // Keşif: A duvarı 300 cm → alt + üst + tezgah
    await pg.git("kesif/i2");
    await pg.fill(".d-olcu >> nth=0", "300");
    await pg.click('[data-is="kesiftenTeklif"]');
    await pg.click('.perde [data-c="ekle"]'); await pg.waitForTimeout(300);
    const ie = await pg.evaluate(() => { const x = bul("is_emirleri", "i2"); return {n:x.kalemler.length, tutar:x.tutar, ad:x.kalemler.slice(1).map(k => [k.ad, k.fiyat]), duvar:x.kesif.duvarlar[0].olcu, hash:location.hash}; });
    a.esit(ie, {n:4, tutar:116400, ad:[["Alt dolap · A duvarı", 30000], ["Üst dolap · A duvarı", 18000], ["Tezgah · A duvarı", 9000]], duvar:"300", hash:"#is-form/i2"});
    // Kesimde modüllerden parça
    await pg.git("kesim/i2"); await pg.click('[data-is="modulParcaUret"]');
    a.dogru(await pg.evaluate(() => kesimForm.parcalar.length >= 10), "Modül parçaları eklenmeli");
    // İş emri formunda modülden ekle; modül bilgisi kaydedilir
    await pg.git("is-form/i1"); await pg.click('[data-is="modulKalemEkle"]'); await pg.fill("#mkEn", "120");
    await pg.click('.perde [data-c="ekle"]'); await pg.click('[data-is="isKaydet"]'); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => { const k = bul("is_emirleri", "i1").kalemler.slice(-1)[0]; return [k.ad, k.fiyat, k.modul.en]; }), ["Alt dolap", 12000, 1200]);
    await pg.kapat();
  });

  test("Atölye kapasitesi: iş sırası, gecikme riski, teslim önerisi", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      await sistemKaydet({kapasite:{ekip:1, gun:5, montajGun:1, turGun:{}}, takvim:Object.assign({}, TAKVIM_VARSAYILAN, {gunler:[0, 1, 2, 3, 4, 5, 6]})});
      await Depo.kaydet("is_emirleri", Object.assign(isAlanlari({}), {id:"i3", no:"İE-0003", musteriId:"m2", baslik:"Vestiyer", durum:"Sipariş alındı", oncelik:"Normal", sorumlu:"", adres:"", kalemler:[],
        asamalar:[], teklif:{}, kesif:{}, tutar:0, aciklama:"", teslimTarihi:null, uretimGun:4, olusma:Date.now()}));
      const p = kapasitePlani();
      return {isler:p.isler.map(x => [x.ie.id, x.kalan, x.gec, x.bit]), oneri:teslimOnerisi(5)};
    });
    const g = n => pg.evaluate(n => gunEkle(bugun(), n), n);
    a.esit(r.isler, [["i1", 2.5, true, await g(2)], ["i3", 4, false, await g(6)]]);
    a.esit(r.oneri, await g(12));
    await pg.git("is-form");
    a.dogru(/en erken/.test(await pg.textContent("#teslimOneri")), "İş emri formunda öneri");
    await pg.click('[data-is="teslimOneriKullan"]');
    a.esit(await pg.inputValue("#teslim"), await g(12));
    await pg.kapat();
  });

  test("Sabit gider: hatırlatma, kasaya işleme, dönem hesabı", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.evaluate(async () => { const ay = bugun().slice(0, 7);
      await sabitKaydet([{id:"sg1", ad:"Kira", tutar:15000, kategori:"Kira", odeme:"Havale", gun:Number(bugun().slice(8)), periyot:1, basAy:ay, aktif:true, ortak:"", islenen:{}},
        {id:"sg2", ad:"Sigorta", tutar:9000, kategori:"Genel Giderler", odeme:"Havale", gun:1, periyot:12, basAy:ayKaydir(ay, 1), aktif:true, ortak:"", islenen:{}}]); });
    a.esit(await pg.evaluate(() => hatirlatmalar().filter(h => h.yer === "sabitgiderler").map(h => [h.seviye, /Kira bugün ödenecek/.test(h.yazi)])), [[0, true]]);
    a.esit(await pg.evaluate(() => [sabitBuAyda({periyot:3, basAy:"2026-01"}, "2026-04"), sabitBuAyda({periyot:3, basAy:"2026-01"}, "2026-03"), sabitBuAyda({periyot:1, basAy:"2026-05"}, "2026-04"), ayKaydir("2026-12", 1)]),
      [true, false, false, "2027-01"]);
    await pg.git("sabitgiderler"); await pg.click('[data-is="sabitIsle"]'); await pg.fill("#siTutar", "15.500"); await pg.click('.perde [data-c="isle"]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const h = veri.hareketler.find(x => /^Kira \(/.test(x.aciklama)); return {tutar:h.tutar, kat:h.kategori, isaret:sabitGiderler()[0].islenen[bugun().slice(0, 7)] === h.id,
      kalan:hatirlatmalar().filter(x => x.yer === "sabitgiderler").length}; });
    a.esit(r, {tutar:15500, kat:"Kira", isaret:true, kalan:0});
    await pg.kapat();
  });

  test("Ay sonu ortak hesabı", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      const H = (id, tur, tutar, kat, ek) => Object.assign({id, tur, tutar, kategori:kat, odeme:"Nakit", musteriId:null, isEmriId:null, faturaId:null, aciklama:"", tarih:bugun(), olusma:Date.now(), ortak:"", hedef:""}, ek || {});
      await Depo.kaydet("hareketler", [H("x1", "giris", 20000, "Peşin Satış"), H("x2", "cikis", 2000, ORTAK_CEKIS, {hedef:"ibrahim"}), H("x3", "giris", 5000, ORTAK_SERMAYE, {hedef:"samet"})]);
      const h = ortakHesabi(bugun().slice(0, 7));
      return {kar:h.a.kar, kisi:h.kisi.map(x => [x.o.ad, x.pay, x.cekti, x.fark, x.sermaye]), yil:h.y.kar >= h.a.kar};
    });
    a.esit(r, {kar:17000, kisi:[["Samet", 8500, 0, 8500, 5000], ["İbrahim", 8500, 2000, 6500, 0]], yil:true});
    await pg.git("ortakhesap");
    a.dogru(/Ortak hesabı/.test(await pg.textContent("main")) && /İbrahim/.test(await pg.textContent("main")), "Ekran");
    await pg.kapat();
  });

  test("Muhasebeci paketi (ZIP)", async (o, a) => {
    if(!o.kutuphane.zip || !o.kutuphane.xlsx) return console.log("    (jszip / xlsx paketi yok, atlandı)");
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => { const f = await muhasebePaketi(bugun().slice(0, 7)), z = await JSZip.loadAsync(f);
      return {ad:f.name, dosyalar:Object.keys(z.files).sort(), ay:ayGoster === bugun().slice(0, 7) || true}; });
    a.esit(r.dosyalar, ["1-KDV-ozeti-ve-faturalar.xlsx", "2-Kasa-hareketleri.xlsx", "3-Cari-bakiyeler.xlsx", "4-Cek-senet.xlsx", "BENIOKU.txt"]);
    await pg.kapat();
  });

  test("Muhasebeci hesabı her şeyi görür, değiştiremez", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(() => {
      __db.kullanicilar = [{eposta:"samet@gunesmobilya.app", ad:"Samet", rol:"yonetici", olusma:1}, {eposta:"muhasebe@gunesmobilya.app", ad:"Muhasebe", rol:"muhasebeci", olusma:2}];
      localStorage.setItem("__sahte_db", JSON.stringify(__db)); localStorage.setItem("__yonetici", "0"); localStorage.setItem("__eposta", "muhasebe@gunesmobilya.app");
    });
    await pg.reload(); await pg.waitForFunction(() => hazir);
    const r = await pg.evaluate(async () => {
      let hata = ""; try{ await Depo.kaydet("musteriler", {id:"m9", ad:"Deneme", tip:"musteri", telefon:"", adres:"", vergiNo:"", olusma:1}); }catch(e){ hata = e.message; }
      return {yetki:[yetki.yonetici, yetki.salt], hata, salt:document.body.classList.contains("salt"), db:(__db.musteriler || []).length};
    });
    a.esit(r, {yetki:[true, true], hata:"Muhasebeci hesabı yalnız görüntüleyebilir; değişiklik yapamaz.", salt:true, db:0});
    await pg.git("rapor");
    a.dogru(await pg.isVisible('[data-is="muhasebePaketi"]'), "Rapor ekranında paket düğmesi");
    await pg.git("ayarlar");
    a.esit(await pg.evaluate(() => Array.from(document.querySelectorAll(".ayar-menu [data-anahtar]")).map(b => b.getAttribute("data-git").split("/")[1])), ["gorunum", "bildirim", "guvenlik", "hesap"]);
    await pg.kapat();
  });

  test("Ana sayfa kart düzeni", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.evaluate(async () => { await sistemKaydet({anaSayfa:[{id:"sonKasa"}, {id:"hizli", gizli:true}]}); ciz(); });
    a.esit(await pg.evaluate(() => [document.querySelectorAll("main .hizli").length, document.querySelector("main .bolum-baslik h2").textContent]), [0, "Son kasa hareketleri"]);
    await pg.git("ayarlar/anasayfa");
    await pg.click('[data-is="anaKartTasi"][data-arg="0|1"]'); await pg.waitForTimeout(200);
    a.esit(await pg.evaluate(() => anaSayfaDuzeni().slice(0, 2).map(x => [x.id, !!x.gizli])), [["hizli", true], ["sonKasa", false]]);
    await pg.kapat();
  });

  test("Telefondan paylaşılan dosya seçilen işe eklenir", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(async () => {
      await Depo.kaydet("musteriler", {id:"m1", ad:"Ali Osman", tip:"musteri", telefon:"", adres:"", vergiNo:"", olusma:1});
      await Depo.kaydet("is_emirleri", Object.assign(isAlanlari({}), {id:"i1", no:"İE-0001", musteriId:"m1", baslik:"Mutfak", durum:"Üretimde", oncelik:"Normal", sorumlu:"", adres:"", kalemler:[], asamalar:[], teklif:{}, kesif:{}, tutar:0, aciklama:"", teslimTarihi:null, olusma:1}));
      await IDB.yaz("paylasilan", {dosyalar:[new File(["%PDF-1.4"], "olcu-cizimi.pdf", {type:"application/pdf"})], metin:""});
      await paylasimKontrol();
    });
    await pg.waitForTimeout(200);
    a.esit(await pg.evaluate(() => location.hash), "#paylasilan");
    a.dogru(/1 dosya geldi/.test(await pg.textContent("main")), "Önizleme");
    await pg.click('[data-is="paylasilanYukle"][data-arg="i1"]'); await pg.waitForTimeout(500);
    a.esit(await pg.evaluate(async () => [veri.dosyalar.map(d => [d.isEmriId, d.ad]), await IDB.al("paylasilan"), location.hash]), [[["i1", "olcu-cizimi.pdf"]], null, "#is/i1"]);
    await pg.kapat();
  });

  test("Fotoğraf küçültme ayarı ve bildirim anahtarı", async (o, a) => {
    const pg = await o.sayfa();
    const r = await pg.evaluate(async () => {
      const c = document.createElement("canvas"); c.width = 3000; c.height = 2000; const g = c.getContext("2d"); g.fillStyle = "#c80"; g.fillRect(0, 0, 3000, 2000);
      const f = new File([await new Promise(r => c.toBlob(r, "image/jpeg", 0.9))], "foto.jpg", {type:"image/jpeg"});
      const en = async x => (await createImageBitmap(x)).width;
      const varsayilan = await en(await gorselKucult(f));
      await sistemKaydet({fotoBoyut:1280}); const kucuk = await en(await gorselKucult(f));
      await sistemKaydet({fotoBoyut:0}); const ayni = (await gorselKucult(f)) === f;
      const v = await vapidUret(), ham = b64Coz(v.genel);
      return {varsayilan, kucuk, ayni, genel:[ham.length, ham[0]], gizli:b64Coz(v.gizli).length};
    });
    a.esit(r, {varsayilan:1600, kucuk:1280, ayni:true, genel:[65, 4], gizli:32});
    await pg.kapat();
  });

  test("Uygulama dosyalarında aynı adlı genel tanım yok", async (o, a) => {
    const fs = require("fs"), path = require("path"), d = path.join(__dirname, "..", "js"), gor = {};
    const cift = [];
    fs.readdirSync(d).filter(f => /\.js$/.test(f)).forEach(f => fs.readFileSync(path.join(d, f), "utf8").split("\n").forEach(s => {
      const m = /^(?:const|let|var|function|async function|class)\s+([\w$]+)/.exec(s); if(!m) return;
      if(gor[m[1]]) cift.push(m[1] + " (" + gor[m[1]] + ", " + f + ")"); else gor[m[1]] = f; }));
    a.esit(cift, []);
  });
};
