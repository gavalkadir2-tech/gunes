// Otomatik puantaj (Pazar hariç "Geldi") ve iş kolları (mobilya + müteahhitlik)
const ornekVeri = require("./ornek-veri");
module.exports = ({test}) => {
  test("Otomatik puantaj: girişten bugüne Pazar hariç; elle girilenler korunur, kaldırılan tekrar yazılmaz", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const r = await pg.evaluate(async () => {
      const bg = bugun(), gunler = (bas, son) => { const l = []; for(let t = bas; t <= son; t = gunEkle(t, 1)) if(tarihOku(t).getDay() !== 0) l.push(t); return l; };
      await Depo.kaydet("personel", Object.assign({}, bul("personel", "p1"), {giris:gunEkle(bg, -13)}));
      let izinGun = gunEkle(bg, -2); if(tarihOku(izinGun).getDay() === 0) izinGun = gunEkle(bg, -3);
      await Depo.kaydet("puantaj", {id:"p1_" + izinGun, personelId:"p1", tarih:izinGun, durum:"izinli", mesai:0, not:""});
      const n1 = await puantajOtomatik(), beklenen = gunler(gunEkle(bg, -13), bg).length - 1;
      const pazar = veri.puantaj.some(x => tarihOku(x.tarih).getDay() === 0), izin = bul("puantaj", "p1_" + izinGun).durum;
      const n2 = await puantajOtomatik();
      const sil = veri.puantaj.find(x => x.personelId === "p1" && x.durum === "geldi"); await Depo.sil("puantaj", sil.id, {cop:false});
      const n3 = await puantajOtomatik();
      await Depo.kaydet("personel", {id:"p2", ad:"Hasan", gorev:"Usta", telefon:"", iban:"", giris:gunEkle(bg, -3), cikis:null, ucretTipi:"gunluk", ucret:1500, izinHakki:14, notlar:"", olusma:Date.now()});
      const n4 = await puantajOtomatik(), b4 = gunler(gunEkle(bg, -3), bg).length;
      await Depo.kaydet("ayarlar", {anahtar:"puantajOto", deger:Object.assign(puantajOtoAyar(), {acik:false})});
      await Depo.kaydet("personel", {id:"p3", ad:"Can", gorev:"", telefon:"", iban:"", giris:gunEkle(bg, -1), cikis:null, ucretTipi:"gunluk", ucret:1000, izinHakki:14, notlar:"", olusma:Date.now()});
      const n5 = await puantajOtomatik();
      return {n1, beklenen, pazar, izin, n2, n3, silindiMi:!bul("puantaj", sil.id), n4, b4, n5, hatirlatma:hatirlatmalar().some(h => /puantajı girilmedi/.test(h.yazi) && /Hasan/.test(h.alt || ""))};
    });
    a.esit([r.n1, r.pazar, r.izin, r.n2, r.n3, r.silindiMi, r.n4, r.n5], [r.beklenen, false, "izinli", 0, 0, true, r.b4, 0]);
    await pg.kapat();
  });

  test("İş kolları: müteahhitlik işi, kasa ve fatura iş koluna göre; süzgeç ve rapor", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    // Yeni iş emri: Müteahhitlik seçilince aşamalar inşaat aşamaları olur
    await pg.git("is-form"); await pg.selectOption("#cari", "m2"); await pg.fill("#baslik", "Villa kaba inşaat");
    await pg.click('#kolSec [data-deger="muteahhit"]'); await pg.waitForTimeout(100);
    a.dogru(/Kaba inşaat/.test(await pg.textContent("#asamaKutu")) && !/Kenar bantlama/.test(await pg.textContent("#asamaKutu")), "İnşaat aşamaları");
    await pg.click('[data-is="isKaydet"]'); await pg.waitForTimeout(300);
    const ie = await pg.evaluate(() => { const x = veri.is_emirleri.find(i => i.baslik === "Villa kaba inşaat"); return {id:x.id, kol:x.kol, as:x.asamalar.length}; });
    a.esit([ie.kol, ie.as], ["muteahhit", 10]);
    // Para çıktı: iş emri seçilince iş kolu ve kategoriler değişir
    await pg.git("cikis"); await pg.fill("#tutar", "25000"); await pg.selectOption("#isEmri", ie.id); await pg.waitForTimeout(150);
    a.esit(await pg.evaluate(() => [(document.querySelector('#kolSec .secili') || {}).textContent, /Taşeron ödemesi/.test(document.querySelector('.secenekler[data-ad="kategori"]').textContent)]), ["Müteahhitlik", true]);
    await pg.click('.secenekler[data-ad="kategori"] [data-deger="Taşeron ödemesi"]'); await pg.click('[data-is="paraKaydet"]'); await pg.waitForTimeout(300);
    // Kasa süzgeci ve rapor
    const r = await pg.evaluate(() => {
      const h = veri.hareketler.find(x => x.kategori === "Taşeron ödemesi"), s = kolOzeti(bugun().slice(0, 7));
      filtre.kol = "muteahhit"; git("kasa"); return {kol:h.kol, hKol:hareketKolu(h), muteahhitGider:s.muteahhit.gider, mobilyaGider:s[""].gider, acik:s.muteahhit.acik};
    });
    await pg.waitForTimeout(200);
    a.esit([r.kol, r.hKol, r.muteahhitGider, r.mobilyaGider, r.acik], ["muteahhit", "muteahhit", 25000, 3000, 1]);
    a.esit(await pg.evaluate(() => Array.from(document.querySelectorAll("main .liste-kart .satir .s1")).map(x => x.textContent)), ["Taşeron ödemesi"]);
    await pg.evaluate(() => { filtre.kol = "hepsi"; git("rapor"); }); await pg.waitForTimeout(200);
    a.dogru(/İş kollarına göre/.test(await pg.textContent("main")) && /Müteahhitlik/.test(await pg.textContent("main")), "Rapor tablosu");
    await pg.evaluate(() => { filtre.kol = "muteahhit"; git("isler"); }); await pg.waitForTimeout(200);
    a.esit(await pg.evaluate(() => Array.from(document.querySelectorAll("#isListe .satir .s1")).map(x => x.textContent.replace(/\s+Müteahhitlik$/, ""))), ["İE-0003 · Villa kaba inşaat"]);
    await pg.kapat();
  });
};
