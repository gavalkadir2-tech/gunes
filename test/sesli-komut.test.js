// Sesli komut: yazıyı komuta çevirme ve balondan çalıştırma (konuşma tanıma yerine yazılarak)
const ornekVeri = require("./ornek-veri");
module.exports = ({test}) => {
  test("Komutlar doğru anlaşılır", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(() => {
      const c = m => { const k = komutCoz(m); return [k.tur, k.yon || k.yer || k.q || k.tip || "", k.tutar || 0, k.odeme || "", k.kategori || "", k.cari ? k.cari.id : ""]; };
      return {
        sayi:[sayilariCevir("iki bin bes yuz lira"), sayilariCevir("1.500 tl"), sayilariCevir("2 bin 500"), sayilariCevir("yuz elli"), sayilariCevir("on iki bin")],
        l:[c("Kasaya 500 lira nakit girdi"), c("1500 lira kira çıktı"), c("Ali Osman'dan iki bin lira tahsilat aldım havale"), c("Kaya Kereste'ye 3.000 lira ödedim"),
          c("yeni iş emri Ayşe Demir"), c("yeni müşteri Mehmet Kaya"), c("İE 1'i aç"), c("Ali Osman'ı aç"), c("takvimi aç"), c("mutfak ara"), c("sabit giderler"), c("bugün hava nasıl")]
      };
    });
    a.esit(r.sayi, ["2500 lira", "1500 tl", "2500", "150", "12000"]);
    a.esit(r.l, [
      ["para", "giris", 500, "Nakit", "", ""], ["para", "cikis", 1500, "", "Kira", ""], ["para", "giris", 2000, "Havale", "Cari Tahsilat", "m1"], ["para", "cikis", 3000, "", "", "t1"],
      ["git", "is-form/-/m2", 0, "", "", ""], ["yeniCari", "musteri", 0, "", "", ""], ["git", "is/i1", 0, "", "", ""], ["git", "cari/m1", 0, "", "", ""],
      ["git", "takvim", 0, "", "", ""], ["ara", "mutfak", 0, "", "", ""], ["git", "sabitgiderler", 0, "", "", ""], ["ara", "bugün hava nasıl", 0, "", "", ""]]);
    await pg.kapat();
  });

  test("Balondan komut: para formu doldurulur, not eklenir", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    a.dogru(await pg.isVisible(".ses-dugme"), "Balon görünmeli");
    await pg.click(".ses-dugme"); await pg.waitForTimeout(100);   // test tarayıcısında konuşma tanıma yok: yazma kutusu açılır
    await pg.fill(".ses-form input", "kasaya 750 lira kartla girdi"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(500);
    a.esit(await pg.evaluate(() => [location.hash, document.getElementById("tutar").value, (document.querySelector('.secenekler[data-ad="odeme"] .secili') || {}).textContent]), ["#giris", "750", "Kart"]);
    a.dogru(/Kaydet/.test(await pg.textContent(".ses-yazi")), "Kontrol edip kaydet uyarısı");
    await pg.evaluate(() => git("is/i1")); await pg.waitForTimeout(150);
    await pg.fill(".ses-form input", "not ekle kapak rengi krem olacak"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(300);
    a.esit(await pg.evaluate(() => veri.is_notlari.filter(n => n.isEmriId === "i1" && n.tur === "not").map(n => n.metin)), ["kapak rengi krem olacak"]);
    await pg.evaluate(() => cihazKaydet({sesKomut:0})); await pg.evaluate(() => ciz());
    a.dogru(!(await pg.isVisible(".ses-dugme")), "Ayardan gizlenebilmeli");
    await pg.kapat();
  });
};
