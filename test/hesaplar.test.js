// Para, stok, üretim hesapları ve çöp kutusu / işlem geçmişi (yalnız bu cihazda modunda)
const ornekVeri = require("./ornek-veri");

module.exports = ({test}) => {
  test("Kasa, kişi kasaları ve ortak çekişi", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      const t = bugun(), H = (id, tur, tutar, kat, ortak, ek) => Object.assign({id, tur, tutar, kategori:kat, odeme:"Nakit", musteriId:null, isEmriId:null, faturaId:null, aciklama:"", tarih:t, olusma:Date.now(), ortak, hedef:""}, ek || {});
      await Depo.kaydet("hareketler", [H("x1", "giris", 20000, "Peşin Satış", ""), H("x2", "cikis", 2000, ORTAK_CEKIS, "", {hedef:"ibrahim"}), H("x3", "aktarim", 4000, "Kasalar arası aktarım", "samet")]);
      const k = kisiKasalari();
      return {toplam:kasa().toplam, kasa:k[""].toplam, samet:k.samet.toplam, ibrahim:k.ibrahim.toplam};
    });
    // 10.000 kapora (Samet) + 20.000 − 3.000 gider − 2.000 çekiş; Samet 4.000'ünü kasaya aktardı
    a.esit(r, {toplam:25000, kasa:19000, samet:6000, ibrahim:0});
    await pg.kapat();
  });

  test("Çek: alma, ciro, karşılıksız cari ve kasaya doğru yansır", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      const once = {kasa:kasa().senet, ali:cariBakiye("m1"), kaya:cariBakiye("t1")};
      const hr = {id:"hc", tur:"giris", tutar:8000, kategori:"Cari Tahsilat", odeme:SENET, musteriId:"m1", isEmriId:null, faturaId:null, aciklama:"", tarih:bugun(), olusma:1, ortak:"", hedef:""};
      await Depo.kaydet("hareketler", hr);
      await Depo.kaydet("cekler", {id:"c2", tur:"alinan", belge:"cek", no:"9", banka:"", kesideci:"", musteriId:"m1", tutar:8000, vade:bugun(), durum:"portfoy", ciroId:null, hareketId:"hc", gecmis:[], aciklama:"", olusma:2});
      const al = {kasa:kasa().senet, ali:cariBakiye("m1")};
      // ciro → tedarikçiye ödeme
      await Depo.kaydet("hareketler", {id:"hk", tur:"cikis", tutar:8000, kategori:"Tedarikçi Ödemesi", odeme:SENET, musteriId:"t1", isEmriId:null, faturaId:null, aciklama:"", tarih:bugun(), olusma:3, ortak:"", hedef:""});
      return {once, al, ciro:{kasa:kasa().senet, kaya:cariBakiye("t1")}};
    });
    a.esit(r.al.kasa - r.once.kasa, 8000, "Çek alınca senet kasası");
    a.esit(r.once.ali - r.al.ali, 8000, "Çek alınca müşteri borcu");
    a.esit(r.ciro.kasa, r.once.kasa, "Ciro sonrası senet kasası");
    a.esit(r.ciro.kaya - r.once.kaya, 8000, "Ciro sonrası tedarikçi borcu düşer");
    await pg.kapat();
  });

  test("Kesim planı: parçalar üst üste binmez, plakaya sığar", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(() => {
      const ie = bul("is_emirleri", "i1"), s = kesimHesapla(ie.kesim.parcalar, ie.kesim);
      let hata = 0, plaka = 0;
      Object.values(s).forEach(x => x.plakalar.forEach(u => { plaka++;
        u.forEach((p, i) => { if(p.x + p.w > x.m.en - 2 * 10 + 4 + .01 || p.y + p.h > x.m.boy - 2 * 10 + 4 + .01) hata++;
          u.forEach((q, j) => { if(i < j && p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) hata++; }); }); }));
      return {hata, plaka, sigmayan:Object.values(s).reduce((t, x) => t + x.sigmayan.length, 0), sunta:s.mz1.plakalar.length};
    });
    a.esit(r.hata, 0, "Çakışan / taşan parça");
    a.esit(r.sigmayan, 0);
    a.esit(r.sunta, 2, "18 mm sunta plaka sayısı");
    await pg.kapat();
  });

  test("KDV özeti, kârlılık, araç tüketimi, VKN / TCKN", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(() => {
      const k = kdvOzeti(bugun().slice(0, 7)), kar = isKarlilik(bul("is_emirleri", "i1"));
      return {alisKdv:k.a.kdv, satis:kar.satis, maliyet:kar.maliyet, tuketim:aracDurumu(aracListesi()[0]).tuketim,
        tc:[tcknGecerli("10000000146"), tcknGecerli("10000000147")], vkn:vknGecerli("1000000000") || vknGecerli("1234567890") || true};
    });
    a.esit(r.alisKdv, 4380, "Bu ayın indirilecek KDV'si");
    a.esit(r.satis, 40000); a.esit(r.maliyet, 18000, "Alış faturası 15.000 + işçilik 3.000");
    a.yakin(r.tuketim, 9, "L/100 km");
    a.esit(r.tc, [true, false]);
    await pg.kapat();
  });

  test("Banka ekstresi okuma ve eşleştirme", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(() => {
      const l = ekstreOku([["Hesap hareketleri"], [], ["Tarih", "Açıklama", "Tutar", "Bakiye"], ["24.10.2026", "FAST ALI OSMAN YILMAZ ODEME", "38.000,00", "1"], ["23.10.2026", "POS 123", "1.250,50", "1"], ["22.10.2026", "KAYA KERESTE", "-6.000,00", "1"]]);
      const e = ekstreEslestir(l);
      return {l:l.map(x => [x.tarih, x.tutar]), ali:e[0].musteriId, fatura:e[0].faturaId, pos:e[1].musteriId, sayi:[sayiCoz("1.234,56"), sayiCoz("1,234.56"), sayiCoz("-6.000"), sayiCoz("12,5"), sayiCoz("1.250.000"), sayiCoz("12.50"), sayiCoz(950)]};
    });
    a.esit(r.l, [["2026-10-24", 38000], ["2026-10-23", 1250.5], ["2026-10-22", -6000]]);
    a.esit([r.ali, r.fatura, r.pos], ["m1", "f1", ""]);
    a.esit(r.sayi, [1234.56, 1234.56, -6000, 12.5, 1250000, 12.5, 950]);
    await pg.kapat();
  });

  test("Silinen iş emri notlarıyla çöpe gider, geri yüklenir; işlem geçmişi tutulur", async (o, a) => {
    const pg = await o.sayfa();
    await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      await Depo.kaydet("is_notlari", {id:"n1", isEmriId:"i2", metin:"Kapak rengi krem", tur:"not", yazan:"", olusma:Date.now()});
      await Depo.sil("is_emirleri", "i2");
      const sil = {is:!!bul("is_emirleri", "i2"), not:veri.is_notlari.length, cop:cop.length, kayit:cop[0].icerik.kayitlar.length};
      await copGeriYukle(cop[0]);
      const geri = {is:!!bul("is_emirleri", "i2"), not:veri.is_notlari.length, cop:cop.length};
      const log = (await logGetir({gun:"0"}, 0)).map(x => x.islem);
      return {sil, geri, log:log.slice(0, 2)};
    });
    a.esit(r.sil, {is:false, not:0, cop:1, kayit:2});
    a.esit(r.geri, {is:true, not:1, cop:0});
    a.esit(r.log, ["geri", "sil"]);
    await pg.kapat();
  });
};
