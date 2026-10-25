// Güneş Mobilya — otomatik testler
// Çalıştırma:  cd test && npm install && npx playwright install chromium && npm test
// Belirli bir dosya:  node calistir.js hesaplar
// Uygulama dosyaları depo kökünden küçük bir sunucuyla verilir; Supabase yerine sahte-supabase.js kullanılır,
// "/yerel.html" adresi bulut ayarı boş (yalnız bu cihazda çalışan) sürümü verir.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");

const KOK = path.resolve(__dirname, ".."), BURA = __dirname;
const TUR = {".html":"text/html; charset=utf-8", ".js":"application/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".json":"application/json", ".webmanifest":"application/manifest+json", ".wasm":"application/wasm"};

// Excel / QR kütüphaneleri: test/node_modules'tan (CI) veya GUNES_KUTUPHANE klasöründen
function kutuphaneYolu(paket, dosya){
  try{ return require.resolve(paket + "/" + dosya, {paths:[BURA]}); }catch(e){}
  const d = process.env.GUNES_KUTUPHANE;
  if(d){ const y = fs.readdirSync(d).map(x => path.join(d, x, "package", dosya)).find(x => fs.existsSync(x) && x.indexOf(paket) >= 0); if(y) return y; }
  return null;
}
const KUTUPHANE = {xlsx:kutuphaneYolu("xlsx", "dist/xlsx.full.min.js"), qr:kutuphaneYolu("qrcode-generator", "qrcode.js"), zip:kutuphaneYolu("jszip", "dist/jszip.min.js")};

function sunucu(){
  return new Promise(res => {
    const s = http.createServer((q, c) => {
      let u = decodeURIComponent(q.url.split("?")[0]);
      if(u === "/") u = "/index.html";
      if(u === "/yerel.html"){
        const h = fs.readFileSync(path.join(KOK, "index.html"), "utf8").replace(/adres:\s*"[^"]*"/, 'adres: ""');
        c.writeHead(200, {"Content-Type":TUR[".html"]}); return c.end(h);
      }
      const d = path.join(KOK, u);
      if(!d.startsWith(KOK) || !fs.existsSync(d) || fs.statSync(d).isDirectory()){ c.writeHead(404); return c.end(); }
      c.writeHead(200, {"Content-Type":TUR[path.extname(d)] || "application/octet-stream"}); fs.createReadStream(d).pipe(c);
    });
    s.listen(0, "127.0.0.1", () => res(s));
  });
}

// Testlerin kullandığı yardımcılar
function ortam(tarayici, adres, hatalar){
  return {
    adres,
    // bulut:true → sahte Supabase ile; false → yalnız bu cihazda (yerel.html)
    async sayfa(o = {}){
      const ctx = await tarayici.newContext({viewport:o.boyut || {width:1300, height:900}, serviceWorkers:"block", acceptDownloads:true});
      const pg = await ctx.newPage();
      pg.on("pageerror", e => hatalar.push((o.ad || "sayfa") + ": " + e.message));
      await pg.route(/supabase-js@/, r => o.bulut ? r.fulfill({path:path.join(BURA, "sahte-supabase.js"), contentType:"application/javascript"}) : r.fulfill({body:"", contentType:"application/javascript"}));
      await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await pg.route(/xlsx\.full\.min\.js/, r => KUTUPHANE.xlsx ? r.fulfill({path:KUTUPHANE.xlsx, contentType:"application/javascript"}) : r.abort());
      await pg.route(/qrcode\.min\.js/, r => KUTUPHANE.qr ? r.fulfill({path:KUTUPHANE.qr, contentType:"application/javascript"}) : r.abort());
      await pg.route(/jszip\.min\.js/, r => KUTUPHANE.zip ? r.fulfill({path:KUTUPHANE.zip, contentType:"application/javascript"}) : r.abort());
      await pg.goto(adres + (o.bulut ? "/index.html" : "/yerel.html") + "#ana");
      await pg.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase("gunes-mobilya"); });
      if(o.hazirla) await pg.evaluate(o.hazirla);
      await pg.reload(); await pg.waitForFunction(() => typeof hazir !== "undefined" && hazir, null, {timeout:15000});
      pg.git = async h => { await pg.evaluate(x => { document.querySelectorAll(".perde").forEach(p => p.remove()); location.hash = x; }, h); await pg.waitForTimeout(150); };
      pg.kapat = () => ctx.close();
      return pg;
    },
    kutuphane:KUTUPHANE
  };
}

async function main(){
  const secim = process.argv[2];
  const dosyalar = fs.readdirSync(BURA).filter(f => /\.test\.js$/.test(f) && (!secim || f.indexOf(secim) >= 0)).sort();
  const s = await sunucu(), adres = "http://127.0.0.1:" + s.address().port;
  const tarayici = await chromium.launch();
  let gecen = 0, kalan = 0;
  for(const f of dosyalar){
    const testler = [];
    require(path.join(BURA, f))({test:(ad, fn) => testler.push({ad, fn})});
    console.log("\n" + f);
    for(const t of testler){
      const hatalar = [], basla = Date.now();
      try{
        await t.fn(ortam(tarayici, adres, hatalar), {
          esit:(a, b, m) => { if(JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || "Eşit değil") + ": " + JSON.stringify(a) + " ≠ " + JSON.stringify(b)); },
          dogru:(a, m) => { if(!a) throw new Error(m || "Beklenen doğru değil"); },
          yakin:(a, b, m, f) => { if(Math.abs(a - b) > (f || 0.01)) throw new Error((m || "Yakın değil") + ": " + a + " ≠ " + b); }
        });
        if(hatalar.length) throw new Error("Sayfa hatası: " + hatalar.join(" | "));
        gecen++; console.log("  ✓ " + t.ad + " (" + (Date.now() - basla) + " ms)");
      }catch(e){ kalan++; console.log("  ✗ " + t.ad + "\n    " + String(e && e.message || e).split("\n")[0]); }
    }
  }
  await tarayici.close(); s.close();
  console.log("\n" + gecen + " geçti, " + kalan + " başarısız");
  process.exit(kalan ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
