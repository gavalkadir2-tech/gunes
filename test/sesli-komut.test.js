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
      ["git", "takvim", 0, "", "", ""], ["ara", "mutfak", 0, "", "", ""], ["git", "sabitgiderler", 0, "", "", ""], ["soru", "", 0, "", "", ""]]);
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

  test("Aktarım, ortak çekişi, kim ödedi ve sorular anlaşılır", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(() => {
      const c = m => { const k = komutCoz(m); return k.tur === "aktarim" ? [k.tur, k.tutar, k.kimden, k.kime, k.odeme] : k.tur === "para" ? [k.tur, k.yon, k.tutar, k.kategori, k.hedef || "", k.ortak || "", k.cari ? k.cari.id : ""] : [k.tur, k.soru || k.yer || ""]; };
      return [c("İbrahim'den kasaya 3000 lira aktar"), c("kasadan Samet'e 2000 lira aktar havale"), c("İbrahim kasaya 5000 bıraktı"), c("Samet 2000 lira çekti"),
        c("İbrahim 500 lira mazot ödedi"), c("Ali Osman 1500 lira ödedi"), c("para çıktı"), c("kasalar arası aktarım"), c("sabit gider nasıl eklenir?"), c("çek nedir")];
    });
    a.esit(r, [["aktarim", 3000, "ibrahim", "", "Nakit"], ["aktarim", 2000, "", "samet", "Havale"], ["aktarim", 5000, "ibrahim", "", "Nakit"],
      ["para", "cikis", 2000, "Ortak çekişi (şahsi)", "Samet", "", ""], ["para", "cikis", 500, "", "", "ibrahim", ""], ["para", "giris", 1500, "", "", "", "m1"],
      ["git", "cikis"], ["aktarim", 0, "", "", "Nakit"], ["soru", "sabit gider nasıl eklenir?"], ["soru", "çek nedir"]]);
    // Balondan aktarım: pencere doldurulur
    await pg.click(".ses-dugme"); await pg.waitForTimeout(100);
    await pg.fill(".ses-form input", "İbrahim'den kasaya 3000 lira aktar"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(500);
    a.esit(await pg.evaluate(() => [document.querySelector("#okTutar").value, document.querySelector("#okKimden").value, document.querySelector("#okKime").value]), ["3000", "ibrahim", ""]);
    await pg.evaluate(() => document.querySelectorAll(".perde").forEach(p => p.remove()));
    // Ortak çekişi: kategori ve "Kim?" seçilir
    await pg.fill(".ses-form input", "Samet 2000 lira çekti"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(500);
    a.esit(await pg.evaluate(() => [location.hash, (document.querySelector('.secenekler[data-ad="kategori"] .secili') || {}).textContent, (document.querySelector('.secenekler[data-ad="hedef"] .secili') || {}).textContent]),
      ["#cikis", "Ortak çekişi (şahsi)", "Samet"]);
    await pg.kapat();
  });

  test("Asistan: rehberden adımlar, Göster ile ekranda işaretleme; yapay zekâ cevabı düğmeye çevrilir", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    a.esit(await pg.evaluate(() => [rehberBul("kasalar arası aktarım nasıl yapılır")[0].id, rehberBul("sabit gider nasıl eklenir")[0].id, rehberBul("plaka ölçüsü 1830 nasıl")[0].id,
      rehberBul("kesim listesi nasıl çıkar")[0].id, rehberBul("muhasebeciye ne göndereyim")[0].id]), ["aktarim", "sabit-gider", "plaka", "kesim", "kdv"]);
    await pg.click(".ses-dugme"); await pg.waitForTimeout(100);
    await pg.fill(".ses-form input", "kasalar arası aktarım nasıl yapılır?"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(200);
    a.dogru(/Kasalar arası aktarım/.test(await pg.textContent(".ses-yazi")), "Rehber cevabı");
    await pg.click('.ses-yazi [data-rehber="aktarim"]'); await pg.waitForTimeout(800);
    a.esit(await pg.evaluate(() => [location.hash, !!document.querySelector('[data-is="kasaAktarim"].rehber-isaret')]), ["#kasa", true]);
    // Usta yönetici konularını görmez
    a.esit(await pg.evaluate(() => { const y = yetki; yetki = {yonetici:false, ad:"Mehmet", liste:[], kurulu:true}; const r = rehberBul("kasaya para girişi nasıl").map(x => x.id); yetki = y; return r; }), []);
    // Yapay zekâ cevabındaki işaretler
    const h = await pg.evaluate(() => yzHtml("1. **Kasa**'ya gidin.\n2. Aktarıma dokunun. [[git:kasa|Kasayı aç]] [[konu:aktarim]] [[konu:yok]]"));
    a.dogru(/<b>Kasa<\/b>/.test(h) && /data-yzgit="kasa"/.test(h) && /data-rehber="aktarim"/.test(h) && !/data-rehber="yok"/.test(h) && !/\[\[/.test(h), h);
    await pg.kapat();
  });

  test("Asistan yapay zekâ kuruluysa ona sorar, kurulu değilse rehbere döner", async (o, a) => {
    const pg = await o.sayfa({bulut:true});
    await pg.evaluate(() => { sb.functions = {invoke:async (ad, o) => ad === "asistan" && o.body.rehber.length > 1000 ? {data:{cevap:"Kasa → Kasalar arası aktarım. [[git:kasa|Kasa]]"}} : {error:new Error("yok")}}; ciz(); });
    await pg.click(".ses-dugme"); await pg.waitForTimeout(100);
    await pg.fill(".ses-form input", "ortağın elindeki parayı kasaya nasıl alırım?"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(300);
    a.dogru(/data-yzgit="kasa"/.test(await pg.innerHTML(".ses-yazi")), "Yapay zekâ cevabı");
    await pg.evaluate(() => { sb.functions = {invoke:async () => ({error:new Error("FunctionsHttpError")})}; yzDurum = null; });
    await pg.fill(".ses-form input", "sabit gider nasıl eklenir?"); await pg.press(".ses-form input", "Enter"); await pg.waitForTimeout(300);
    a.dogru(/Sabit gider/.test(await pg.textContent(".ses-yazi")) && /kurulu değil/.test(await pg.textContent(".ses-yazi")), "Rehbere dönmeli");
    await pg.kapat();
  });
};
