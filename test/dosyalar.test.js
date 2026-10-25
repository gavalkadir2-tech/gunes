// İndirilen dosyalar: Excel, CSV, e-Fatura XML, QR etiket
const ornekVeri = require("./ornek-veri");

async function indir(pg, secici){
  const [d] = await Promise.all([pg.waitForEvent("download"), pg.click(secici)]);
  const p = await d.path(); return require("fs").readFileSync(p);
}
module.exports = ({test}) => {
  test("Kesim listesi CSV", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.git("kesim/i1");
    const csv = (await indir(pg, '[data-is="kesimCsv"]')).toString("utf8").replace(/^﻿/, "").split("\r\n");
    a.esit(csv[0].split(";").slice(0, 5), ["No", "Parça", "Boy (mm)", "En (mm)", "Adet"]);
    a.esit(csv[1].split(";").slice(1, 5), ["Alt · Yan", "720", "560", "2"]);
    await pg.kapat();
  });

  test("KDV özeti ve kesim Excel dosyaları açılır", async (o, a) => {
    if(!o.kutuphane.xlsx) return console.log("    (xlsx paketi yok, atlandı)");
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.git("kdv");
    const x1 = await indir(pg, '[data-is="kdvExcel"]');
    await pg.git("kesim/i1");
    const x2 = await indir(pg, '[data-is="kesimExcel"]');
    a.dogru(x1.slice(0, 2).toString() === "PK" && x2.slice(0, 2).toString() === "PK", "xlsx (zip) olmalı");
    const sayfa = await pg.evaluate(b => { const wb = XLSX.read(new Uint8Array(b), {type:"array"}); return [wb.SheetNames, XLSX.utils.sheet_to_json(wb.Sheets["Özet"], {header:1})[5]]; }, Array.from(x1));
    a.esit(sayfa[0], ["Özet", "Satış faturaları", "Alış faturaları"]);
    a.esit(sayfa[1][0], "Satışlar (hesaplanan)");
    await pg.kapat();
  });

  test("e-Arşiv UBL-TR XML", async (o, a) => {
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    const xml = await pg.evaluate(() => {
      let vkn = null; for(let i = 1000000000; i < 1000000100; i++) if(vknGecerli(String(i))){ vkn = String(i); break; }
      const f = bul("faturalar", "f1");
      return ublXml(f, {senaryo:"EARSIVFATURA", no:gibNo(f), satici:{vkn, ad:"Güneş Mobilya", il:"Manisa", ilce:"Akhisar"}, alici:{vkn:"10000000146", ad:"Ali Osman Yılmaz", il:"Manisa"}});
    });
    const sonuc = await pg.evaluate(x => { const d = new DOMParser().parseFromString(x, "application/xml"); return d.querySelector("parsererror") ? "BOZUK" :
      [d.getElementsByTagName("cbc:ProfileID")[0].textContent, d.getElementsByTagName("cbc:PayableAmount")[0].textContent, d.getElementsByTagName("cbc:FirstName")[0].textContent]; }, xml);
    a.esit(sonuc, ["EARSIVFATURA", "48000.00", "Ali Osman"]);
    await pg.kapat();
  });

  test("QR etiketleri oluşur", async (o, a) => {
    if(!o.kutuphane.qr) return console.log("    (qrcode-generator paketi yok, atlandı)");
    const pg = await o.sayfa(); await pg.evaluate(ornekVeri);
    await pg.git("etiket/i1"); await pg.waitForTimeout(500);
    a.dogru(await pg.evaluate(() => document.querySelectorAll("#etiketler svg").length) >= 1, "QR svg");
    await pg.kapat();
  });
};
