// Güneş Mobilya — ACIS (SAT / SAB) okuyucu
// DWG içindeki 3B katıların (3DSOLID) sınır yüzlerini çıkarır: düz yüzler üçgenlenir,
// eğri yüzlerin (silindir, küre, spline…) yalnızca kenarları çizgi olarak verilir.
// Kayıt yapısı ezdxf'in (MIT, Manfred Moitzi) ACIS okuyucusu örnek alınarak yazılmıştır.

const SAB_IMZA = ["ACIS BinaryFile", "ASM BinaryFile4"];
const BITIS = ["End-of-ACIS-data", "End-of-ASM-data", "Begin-of-ACIS-History-data"];
const DESEN_SURUMU = 700, TOL_SURUMU = 500;   // ACIS sürümüne göre eklenen alanlar

/* ---------- SAT (metin) ---------- */
function satKayitlari(metin){
  const satirlar = metin.split(/\r?\n/);
  const surum = parseInt(satirlar[0], 10) || 0;
  const govde = [];
  for(const s of satirlar.slice(3)){
    if(BITIS.some(b => s.startsWith(b))) break;
    govde.push(s);
  }
  const kayitlar = [];
  for(let r of govde.join(" ").split("#")){
    r = r.trim(); if(!r) continue;
    const t = satParcala(r);
    if(/^-\d+$/.test(t[0])) t.shift();                   // sıra numarası
    if(BITIS.indexOf(t[0]) >= 0) break;
    const ad = t[0], ozellik = t[1];
    const veri = t.slice(surum >= DESEN_SURUMU ? 3 : 2);
    kayitlar.push({ad, ozellik, veri});
  }
  return {surum, kayitlar, sab:false};
}
// "@7 example" biçimindeki dizgileri tek parça tutar.
function satParcala(r){
  const t = []; let i = 0;
  while(i < r.length){
    while(r[i] === " ") i++;
    if(i >= r.length) break;
    if(r[i] === "@"){
      let j = i + 1; while(/\d/.test(r[j])) j++;
      const n = parseInt(r.slice(i + 1, j), 10) || 0;
      t.push("@"); t.push(r.slice(j + 1, j + 1 + n)); i = j + 1 + n; continue;
    }
    let j = i; while(j < r.length && r[j] !== " ") j++;
    t.push(r.slice(i, j)); i = j;
  }
  return t;
}

/* ---------- SAB (ikili) ---------- */
function sabKayitlari(b){
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 0;
  const imza = SAB_IMZA.find(s => String.fromCharCode(...b.subarray(0, s.length)) === s);
  if(!imza) throw new Error("SAB imzası yok");
  i = imza.length;
  const int = () => { const v = dv.getInt32(i, true); i += 4; return v; };
  const dbl = () => { const v = dv.getFloat64(i, true); i += 8; return v; };
  const str = n => { const s = new TextDecoder().decode(b.subarray(i, i + n)); i += n; return s; };
  const surum = int(); int(); int(); int();
  // başlık: ürün, ACIS sürümü, tarih (dizgi) + 3 ondalık
  for(let k = 0; k < 3; k++){ if(b[i++] !== 7) throw new Error("SAB başlığı"); str(b[i++]); }
  for(let k = 0; k < 3; k++){ if(b[i++] !== 6) throw new Error("SAB başlığı"); dbl(); }
  const kayitlar = [];
  while(i < b.length){
    const kayit = [], tur = [];
    let bitti = false;
    while(!bitti){
      if(i >= b.length) return {surum, kayitlar, sab:true};
      const etiket = b[i++];
      switch(etiket){
        case 0x04: kayit.push({e:"i", v:int()}); break;
        case 0x06: kayit.push({e:"d", v:dbl()}); break;
        case 0x07: kayit.push({e:"s", v:str(b[i++])}); break;
        case 0x0C: kayit.push({e:"p", v:int()}); break;
        case 0x0A: kayit.push({e:"b", v:true}); break;
        case 0x0B: kayit.push({e:"b", v:false}); break;
        case 0x12: kayit.push({e:"s", v:str(int())}); break;
        case 0x0E: tur.push(str(b[i++])); break;
        case 0x0D: tur.push(str(b[i++])); kayit.push({e:"t", v:tur.join("-")}); tur.length = 0;
          if(BITIS.indexOf(kayit[kayit.length - 1].v) >= 0) return {surum, kayitlar, sab:true};   // veri sonu (ardından kayıt sonu baytı gelmez)
          break;
        case 0x13: case 0x14: kayit.push({e:"v", v:[dbl(), dbl(), dbl()]}); break;
        case 0x15: kayit.push({e:"i", v:int()}); break;
        case 0x17: kayit.push({e:"d", v:dbl()}); break;
        case 0x0F: case 0x10: kayit.push({e:"x"}); break;     // alt tür başı / sonu
        case 0x11: bitti = true; break;
        default: throw new Error("Bilinmeyen SAB etiketi 0x" + etiket.toString(16));
      }
    }
    if(!kayit.length || kayit[0].e !== "t") continue;
    const ad = kayit[0].v;
    if(BITIS.indexOf(ad) >= 0) break;
    kayitlar.push({ad, ozellik:kayit[1] && kayit[1].v, veri:kayit.slice(surum >= DESEN_SURUMU ? 3 : 2)});
  }
  return {surum, kayitlar, sab:true};
}

/* ---------- Kayıt okuyucu ---------- */
function okuyucu(dosya, kayit){
  let i = 0;
  const v = kayit.veri, sab = dosya.sab;
  const r = {
    ptr(){ const x = v[i++]; if(sab){ if(!x || x.e !== "p") throw new Error("işaretçi bekleniyordu"); return x.v; }
      if(typeof x !== "string" || x[0] !== "$") throw new Error("işaretçi bekleniyordu: " + x); return parseInt(x.slice(1), 10); },
    dbl(){ const x = v[i++]; if(sab){ if(!x || (x.e !== "d" && x.e !== "i")) throw new Error("sayı bekleniyordu"); return x.v; } const n = parseFloat(x); if(isNaN(n)) throw new Error("sayı bekleniyordu: " + x); return n; },
    int(satta){ if(!sab && satta !== undefined) return satta; return r.dbl(); },
    // Bazı ASM sürümlerinde bulunan, bazılarında olmayan tamsayı alanı (ör. köşe başvuru sayısı)
    belkiInt(){ if(sab && v[i] && v[i].e === "i") i++; },
    vec(){ if(sab){ const x = v[i++]; if(!x || x.e !== "v") throw new Error("vektör bekleniyordu"); return x.v; } return [r.dbl(), r.dbl(), r.dbl()]; },
    bool(dogru){ const x = v[i++]; if(sab){ if(!x || x.e !== "b") throw new Error("mantıksal bekleniyordu"); return x.v; } return x === dogru; },
    str(){ if(sab){ const x = v[i++]; return x ? String(x.v) : ""; }
      if(v[i] === "@"){ i += 2; return v[i - 1]; } if(dosya.surum < DESEN_SURUMU){ i += 2; return v[i - 1]; } return v[i++]; },
    desen(){ if(dosya.surum >= DESEN_SURUMU) r.ptr(); },
    kalan(){ return v.slice(i); }
  };
  return r;
}

/* ---------- Topoloji ---------- */
function cozumle(dosya){
  const K = dosya.kayitlar, onbellek = {};
  const tur = n => n >= 0 && K[n] ? K[n].ad : "";
  const al = (n, beklenen) => {
    if(n < 0 || !K[n]) return null;
    if(onbellek[n]) return onbellek[n];
    const k = K[n], r = okuyucu(dosya, k), ad = k.ad; let e = {n, ad};
    onbellek[n] = e;
    try{
      if(ad === "body"){ r.desen(); e.lump = r.ptr(); e.wire = r.ptr(); e.transform = r.ptr(); }
      else if(ad === "lump"){ r.desen(); e.next = r.ptr(); e.shell = r.ptr(); }
      else if(ad === "shell"){ r.desen(); e.next = r.ptr(); e.subshell = r.ptr(); e.face = r.ptr(); }
      else if(ad === "face"){ r.desen(); e.next = r.ptr(); e.loop = r.ptr(); e.shell = r.ptr(); e.subshell = r.ptr(); e.surface = r.ptr(); e.ters = r.bool("reversed"); }
      else if(ad === "loop"){ r.desen(); e.next = r.ptr(); e.coedge = r.ptr(); }
      else if(ad === "coedge"){ r.desen(); e.next = r.ptr(); e.prev = r.ptr(); e.partner = r.ptr(); e.edge = r.ptr(); e.ters = r.bool("reversed"); }
      else if(ad === "edge"){ r.desen(); e.v1 = r.ptr(); if(dosya.surum >= TOL_SURUMU) e.p1 = r.dbl(); e.v2 = r.ptr(); if(dosya.surum >= TOL_SURUMU) e.p2 = r.dbl();
        e.coedge = r.ptr(); e.curve = r.ptr(); e.ters = r.bool("reversed"); }
      else if(ad === "vertex"){ r.desen(); e.edge = r.ptr(); r.belkiInt(); e.point = r.ptr(); }
      else if(ad === "point"){ r.desen(); e.p = r.vec(); }
      else if(ad === "transform"){ const t = (dosya.sab ? r.str() : r.kalan().join(" ")).trim().split(/\s+/).map(Number); e.m = t.slice(0, 12); }
      else if(/plane-surface$/.test(ad)){ r.desen(); e.o = r.vec(); e.normal = r.vec(); }
      else if(/straight-curve$/.test(ad)){ r.desen(); e.o = r.vec(); e.d = r.vec(); }
      else if(/ellipse-curve$/.test(ad)){ r.desen(); e.c = r.vec(); e.normal = r.vec(); e.major = r.vec(); e.oran = r.dbl(); }
    }catch(hata){ e.hata = hata.message; }
    if(beklenen && ad.slice(-beklenen.length) !== beklenen) e.hata = e.hata || ("beklenen " + beklenen + ", bulunan " + ad);
    return e;
  };
  return {al, tur, K};
}

const cikar = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nokta = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const capraz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const uzunluk = a => Math.sqrt(nokta(a, a));
const olcekle = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const topla = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// Kenarın başlangıçtan bitişe çokgen noktaları (eğriye göre)
function kenarNoktalari(C, edge){
  const v1 = C.al(edge.v1), v2 = C.al(edge.v2);
  const p1 = v1 && C.al(v1.point), p2 = v2 && C.al(v2.point);
  if(!p1 || !p2 || !p1.p || !p2.p) return null;
  const a = p1.p, b = p2.p, egri = C.al(edge.curve);
  if(egri && /ellipse-curve$/.test(egri.ad) && egri.c && egri.major){
    const n = olcekle(egri.normal, 1 / (uzunluk(egri.normal) || 1)), ma = egri.major;
    const mi = olcekle(capraz(n, ma), egri.oran || 1);
    const aci = p => { const d = cikar(p, egri.c); return Math.atan2(nokta(d, mi) / (nokta(mi, mi) || 1), nokta(d, ma) / (nokta(ma, ma) || 1)); };
    let t1 = aci(a), t2 = aci(b);
    const ayni = uzunluk(cikar(a, b)) < 1e-9 * Math.max(1, uzunluk(ma));
    if(!edge.ters){ if(ayni) t2 = t1 + 2 * Math.PI; else if(t2 <= t1) t2 += 2 * Math.PI; }
    else { if(ayni) t2 = t1 - 2 * Math.PI; else if(t2 >= t1) t2 -= 2 * Math.PI; }
    const adim = Math.max(2, Math.ceil(Math.abs(t2 - t1) / (2 * Math.PI) * 48));
    const l = [];
    for(let k = 0; k <= adim; k++){ const t = t1 + (t2 - t1) * k / adim; l.push(topla(egri.c, topla(olcekle(ma, Math.cos(t)), olcekle(mi, Math.sin(t))))); }
    l[0] = a; l[l.length - 1] = b;
    return l;
  }
  return [a, b];   // düz kenar (spline vb. eğriler de uçlarıyla yaklaşık)
}

function donustur(m, p){
  if(!m) return p;
  return [p[0] * m[0] + p[1] * m[3] + p[2] * m[6] + m[9], p[0] * m[1] + p[1] * m[4] + p[2] * m[7] + m[10], p[0] * m[2] + p[1] * m[5] + p[2] * m[8] + m[11]];
}

/**
 * ACIS verisini (SAT metni veya SAB baytları) yüzlere ve kenarlara çevirir.
 * Dönen: {yuzler:[{normal, donguler:[[p,…],…]}], kenarlar:[[p,…],…], egriYuz:sayı, hata:sayı}
 * Düz yüzlerde ilk döngü dış sınır olmayabilir; üçgenleme sırasında alanı en büyük olan dış sınır sayılır.
 */
export function acisGeometri(veri){
  const dosya = typeof veri === "string" ? satKayitlari(veri) : sabKayitlari(veri);
  const C = cozumle(dosya), sonuc = {yuzler:[], kenarlar:[], egriYuz:0, hata:0, surum:dosya.surum};
  const gorulenKenar = new Set();
  const zincir = (bas, sonraki, sinir) => { const l = []; let n = bas, k = 0; const gor = new Set();
    while(n >= 0 && !gor.has(n) && k++ < sinir){ gor.add(n); const e = C.al(n); if(!e) break; l.push(e); n = sonraki(e); } return l; };
  C.K.forEach((k, n) => {
    if(k.ad !== "body") return;
    const body = C.al(n), tr = C.al(body.transform), m = tr && tr.m && tr.m.length === 12 ? tr.m : null;
    zincir(body.lump, e => e.next, 1e5).forEach(lump => zincir(lump.shell, e => e.next, 1e5).forEach(shell =>
      zincir(shell.face, e => e.next, 1e6).forEach(face => {
        if(face.hata){ sonuc.hata++; return; }
        const yuzey = C.al(face.surface), duz = yuzey && /plane-surface$/.test(yuzey.ad) && yuzey.normal;
        const donguler = [];
        zincir(face.loop, e => e.next, 1e4).forEach(loop => {
          const pts = [];
          zincir(loop.coedge, e => e.next, 1e5).forEach(co => {
            const edge = C.al(co.edge); if(!edge || edge.hata){ sonuc.hata++; return; }
            const l = kenarNoktalari(C, edge); if(!l) return;
            if(!gorulenKenar.has(edge.n)){ gorulenKenar.add(edge.n); sonuc.kenarlar.push(l.map(p => donustur(m, p))); }
            const s = co.ters ? l.slice().reverse() : l;
            for(let k = 0; k < s.length - 1; k++) pts.push(donustur(m, s[k]));
          });
          if(pts.length >= 3) donguler.push(pts);
        });
        if(duz && donguler.length){
          let nr = yuzey.normal; if(m) nr = cikar(donustur(m, nr), donustur(m, [0, 0, 0]));
          if(face.ters) nr = olcekle(nr, -1);
          sonuc.yuzler.push({normal:nr, donguler});
        } else sonuc.egriYuz++;
      })));
  });
  return sonuc;
}
