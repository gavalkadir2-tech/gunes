// Tüm ekranlar yönetici, koyu tema, usta ve telefon modunda hatasız açılmalı.
const ornekVeri = require("./ornek-veri");
const ROTALAR = ["ana", "kasa", "kayit/h1", "giris", "cikis", "cariler", "cari/m1", "cari-form/m1", "isler", "is/i1", "is/i2", "is-form/i1", "is-form", "kesif/i1", "kesim/i1", "takvim",
  "faturalar", "fatura/f1", "fatura-form/satis", "fatura-form/alis", "katalog", "proje/k1", "proje-form/k1", "katalog-ice", "paylasimlar", "paylas-form", "malzemeler", "stok",
  "siparisler", "cekler", "cekler/c1", "personel", "personel/p1", "personel-form/p1", "puantaj", "maas/ay", "rapor", "karlilik", "kdv", "fiyat", "fiyatkarsilastir", "araclar",
  "etiket/i1", "qr/i1", "tahsilat", "ekstre", "kampanya", "oncesonra/i1", "hatirlatmalar", "moduller", "kapasite", "sabitgiderler", "ortakhesap", "paylasilan", "acilis",
  "ayarlar", "ayarlar/firma", "ayarlar/ortaklar", "ayarlar/teklif", "ayarlar/is", "ayarlar/liste", "ayarlar/personel", "ayarlar/gorunum", "ayarlar/bildirim", "ayarlar/guvenlik", "ayarlar/mesajlar", "ayarlar/belge", "ayarlar/takvim", "ayarlar/kapasite", "ayarlar/anasayfa", "ayarlar/yedek",
  "ayarlar/cop", "ayarlar/gecmis", "ayarlar/hedef", "ayarlar/hesap"];

module.exports = ({test}) => {
  for(const mod of ["yonetici", "koyu", "usta", "telefon"]){
    test("Tüm ekranlar açılıyor · " + mod, async (o, a) => {
      const pg = await o.sayfa({ad:mod, boyut: mod === "telefon" ? {width:390, height:844} : undefined});
      await pg.evaluate(ornekVeri);
      if(mod === "koyu") await pg.evaluate(() => cihazKaydet({tema:"koyu"}));
      if(mod === "usta") await pg.evaluate(() => { yetki = {yonetici:false, ad:"Mehmet", liste:[], kurulu:true}; });
      const bos = [];
      for(const r of ROTALAR){
        await pg.git(r);
        const durum = await pg.evaluate(() => { const m = document.querySelector("main"); return m ? (m.textContent.trim() ? "" : "boş") : "ana alan yok"; });
        if(durum) bos.push(r + " (" + durum + ")");
      }
      a.esit(bos, [], "Açılmayan ekran");
      await pg.kapat();
    });
  }
  test("3B görüntüleyici dosyası doğru adresten yüklenir", async (o, a) => {
    const pg = await o.sayfa();
    // Uygulama kodu js/ klasöründe; 3B modülü kökte aranmalı (import yolu sayfaya göre çözülür)
    const r = await pg.evaluate(async () => { const u = new URL("cad3b.js", document.baseURI); return [(await fetch(u)).status, (await fetch(new URL("acis.js", document.baseURI))).status]; });
    a.esit(r, [200, 200], "cad3b.js / acis.js");
    a.dogru(/import\(new URL\("cad3b\.js", document\.baseURI\)/.test(require("fs").readFileSync(require("path").join(__dirname, "..", "js", "05-katalog.js"), "utf8")), "import yolu sayfaya göre olmalı");
    await pg.kapat();
  });
};
