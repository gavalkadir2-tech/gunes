// Güneş Mobilya — 3B çizim görüntüleyici (DWG / STL)
// DWG: LibreDWG (GPL-3.0, @mlightcad/libredwg-web) ile okunur; 3B katılar (3DSOLID, REGION, BODY) acis.js ile yüzlere çevrilir.
// Çizim: three.js. Kütüphaneler ancak bir çizim açıldığında CDN'den yüklenir.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { acisGeometri } from "./acis.js";

const DWG_CDN = "https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@0.7.17/";
const BIRIM = {1:"inç", 2:"ft", 4:"mm", 5:"cm", 6:"m"};

/* ---------- DWG okuma ---------- */
let dwgHazir = null;
// WebAssembly belleğine erişmek için modül kendimiz başlatılır (katı verisi bellekte işaretçi olarak gelir).
function dwgYukle(){
  if(dwgHazir) return dwgHazir;
  dwgHazir = (async () => {
    const [{default:createModule}, kutuphane, wasm] = await Promise.all([
      import(DWG_CDN + "wasm/libredwg-web.js"), import(DWG_CDN + "dist/libredwg-web.js"),
      fetch(DWG_CDN + "wasm/libredwg-web.wasm").then(r => { if(!r.ok) throw new Error("DWG okuyucu indirilemedi"); return r.arrayBuffer(); })]);
    let bellek = null;
    const mod = await createModule({instantiateWasm(imports, tamam){
      WebAssembly.instantiate(wasm, imports).then(r => { bellek = r.instance.exports.memory; tamam(r.instance, r.module); });
      return {};
    }});
    return {lib:kutuphane.LibreDwg.createByWasmInstance(mod), tur:kutuphane.Dwg_File_Type, mod, bellek:() => bellek};
  })();
  dwgHazir.catch(() => { dwgHazir = null; });
  return dwgHazir;
}
// Katı verisi: SAT metni (R2000–R2004) veya SAB baytları (R2007+). Bellek serbest bırakılmadan kopyalanmalı.
function acisKopyala(d, ptr){
  if(typeof ptr !== "number" || !ptr) return null;
  const H = new Uint8Array(d.bellek().buffer);
  const bas = String.fromCharCode(H[ptr], H[ptr + 1], H[ptr + 2], H[ptr + 3]);
  if(bas === "ACIS" || bas === "ASM ") return H.slice(ptr, Math.min(H.length, ptr + 64 * 1024 * 1024));
  return d.mod.UTF8ToString(ptr);
}
async function dwgOku(veri){
  const d = await dwgYukle();
  const dwg = d.lib.dwg_read_data(veri, d.tur.DWG);
  if(!dwg) throw new Error("DWG dosyası okunamadı");
  try{
    const db = d.lib.convert(dwg);
    const kati = e => e.type === "3DSOLID" || e.type === "REGION" || e.type === "BODY";
    const isle = l => (l || []).forEach(e => { if(kati(e)) e._acis = acisKopyala(d, e.data); });
    isle(db.entities);
    ((db.tables.BLOCK_RECORD || {}).entries || []).forEach(b => isle(b.entities));
    cokyuzluEkle(d, dwg, db);
    return db;
  } finally { try{ d.lib.dwg_free(dwg); }catch(e){} }
}
// Çokyüzlü mesh (POLYLINE_PFACE) dönüştürücüde yok: ham nesnelerden okunur. ADeko gibi programlar dolapları böyle kaydeder.
// Her bloğun sahip olduğu nesneler dolaşılır (sahip bilgisi kayıp nesneler de böylece doğru bloğa düşer).
const TUR_BLOK = 49, TUR_PFACE = 29, TUR_PFACE_KOSE = 13, TUR_PFACE_YUZ = 14;
const kimlik = v => v.toString(16).toUpperCase();
function cokyuzluEkle(d, dwg, db){
  const L = d.lib, w = L.wasmInstance;
  const katmanAdi = {}; ((db.tables.LAYER || {}).entries || []).forEach(k => { katmanAdi[k.handle] = k.name; });
  const bloklar = {}; let model = null;
  ((db.tables.BLOCK_RECORD || {}).entries || []).forEach(b => { bloklar[b.handle] = b; if(/^\*model_space$/i.test(b.name)) model = b.handle; });
  let ofset = null;
  const n = w.dwg_get_num_objects(dwg);
  for(let i = 0; i < n; i++){
    const o = w.dwg_get_object(dwg, i);
    if(!o || L.dwg_object_get_fixedtype(o) !== TUR_BLOK) continue;
    const bh = kimlik(L.dwg_object_get_handle_object(o).value);
    let e = w.get_first_owned_entity(o), k = 0;
    while(e && k++ < 1e6){
      if(L.dwg_object_get_fixedtype(e) === TUR_PFACE){
        try{
          const ent = L.dwg_object_to_entity(e), c = L.dwg_object_entity_get_color_object(ent);
          const pf = {type:"PFACE", ownerBlockRecordSoftId:bh, isVisible:!L.dwg_object_entity_get_invisible(ent),
            layer: katmanAdi[kimlik(L.dwg_object_entity_get_layer_object_ref(ent).handleref.value)] || "0",
            colorIndex:c.index, color: c.method == 194 || (c.rgb >>> 24 & 255) === 194 ? c.rgb & 0xffffff : undefined, kose:[], yuz:[]};
          let s = w.get_first_owned_subentity(e), m = 0;
          while(s && m++ < 1e6){
            const ft = L.dwg_object_get_fixedtype(s), t = L.dwg_object_to_entity_tio(s);
            if(ft === TUR_PFACE_KOSE){ const p = L.dwg_dynapi_entity_data(t, "point"); pf.kose.push([p.x, p.y, p.z]); }
            else if(ft === TUR_PFACE_YUZ){
              if(ofset === null) ofset = w.dwg_dynapi_entity_field_offset(t, "vertind");
              if(ofset >= 0){ const dv = new DataView(d.bellek().buffer); pf.yuz.push([0, 1, 2, 3].map(q => dv.getInt16(t + ofset + q * 2, true))); }
            }
            s = w.get_next_owned_subentity(e, s);
          }
          if(pf.kose.length && pf.yuz.length){
            if(bh === model) db.entities.push(pf); else if(bloklar[bh]) (bloklar[bh].entities = bloklar[bh].entities || []).push(pf);
          }
        }catch(hata){}
      }
      e = w.get_next_owned_entity(o, e);
    }
  }
}

/* ---------- Renk (AutoCAD renk dizini) ---------- */
const ACI_TEMEL = {1:0xff0000, 2:0xffff00, 3:0x00ff00, 4:0x00ffff, 5:0x0000ff, 6:0xff00ff, 7:0x2b2b2b, 8:0x808080, 9:0xc0c0c0,
  250:0x333333, 251:0x505050, 252:0x696969, 253:0x828282, 254:0xbebebe, 255:0xe6e6e6};
function aciRenk(i){
  if(ACI_TEMEL[i] !== undefined) return ACI_TEMEL[i];
  if(i < 10 || i > 249) return 0x2b2b2b;
  const k = i - 10, ton = Math.floor(k / 10) * 15, j = k % 10;
  const deger = [1, 1, .8, .8, .6, .6, .5, .5, .3, .3][j], doygun = j % 2 ? .5 : 1;
  return new THREE.Color().setHSL(ton / 360, 1, 0.5).lerp(new THREE.Color(1, 1, 1), 1 - doygun).multiplyScalar(deger).getHex();
}

/* ---------- Matris yardımcıları (4x4, sütun öncelikli) ---------- */
const birim = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function carp(a, b){
  const r = new Array(16);
  for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){ let s = 0; for(let k = 0; k < 4; k++) s += a[k * 4 + i] * b[j * 4 + k]; r[j * 4 + i] = s; }
  return r;
}
const uygula = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const oteleme = (x, y, z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
const olcek = (x, y, z) => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
const donZ = a => { const c = Math.cos(a), s = Math.sin(a); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; };
// Nesne koordinat sistemi (OCS): AutoCAD "keyfi eksen" kuralı
function ocs(n){
  if(!n) return birim();
  let z = [n.x || 0, n.y || 0, n.z || 0];
  const u = Math.hypot(...z); if(u < 1e-9) return birim();
  z = z.map(v => v / u);
  if(Math.abs(z[0]) < 1e-9 && Math.abs(z[1]) < 1e-9 && z[2] > 0) return birim();
  let x = Math.abs(z[0]) < 1 / 64 && Math.abs(z[1]) < 1 / 64 ? [z[2], 0, -z[0]] : [-z[1], z[0], 0];
  const xu = Math.hypot(...x); x = x.map(v => v / xu);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [x[0],x[1],x[2],0, y[0],y[1],y[2],0, z[0],z[1],z[2],0, 0,0,0,1];
}
const P = p => [p.x || 0, p.y || 0, p.z || 0];

/* ---------- Geometri toplama ---------- */
class Toplayici {
  constructor(){ this.gruplar = new Map(); this.min = [Infinity, Infinity, Infinity]; this.max = [-Infinity, -Infinity, -Infinity];
    this.ymin = [Infinity, Infinity, Infinity]; this.ymax = [-Infinity, -Infinity, -Infinity]; this.sayac = {cizgi:0, yuz:0, kati:0, katiSorun:0, katiBos:0, atlanan:{}}; }
  grup(katman, renk){
    const k = katman + "|" + renk;
    let g = this.gruplar.get(k);
    if(!g){ g = {katman, renk, cizgi:[], ucgen:[], kenar:[]}; this.gruplar.set(k, g); }
    return g;
  }
  sinir(p){ for(let i = 0; i < 3; i++){ if(p[i] < this.min[i]) this.min[i] = p[i]; if(p[i] > this.max[i]) this.max[i] = p[i]; } }
  cizgi(g, a, b, kenar){ if(!isFinite(a[0] + a[1] + a[2] + b[0] + b[1] + b[2])) return; (kenar ? g.kenar : g.cizgi).push(...a, ...b); this.sinir(a); this.sinir(b); this.sayac.cizgi++; }
  cokCizgi(g, l, kapali, kenar){ for(let i = 0; i < l.length - 1; i++) this.cizgi(g, l[i], l[i + 1], kenar); if(kapali && l.length > 2) this.cizgi(g, l[l.length - 1], l[0], kenar); }
  ucgen(g, a, b, c){ if(!isFinite(a[0] + a[1] + a[2] + b[0] + b[1] + b[2] + c[0] + c[1] + c[2])) return; g.ucgen.push(...a, ...b, ...c);
    [a, b, c].forEach(p => { this.sinir(p); for(let i = 0; i < 3; i++){ if(p[i] < this.ymin[i]) this.ymin[i] = p[i]; if(p[i] > this.ymax[i]) this.ymax[i] = p[i]; } }); this.sayac.yuz++; }
}

function yay(cx, cy, r, a1, a2, cz){
  let s = a2 - a1; if(s <= 0) s += 2 * Math.PI;
  const n = Math.max(8, Math.ceil(s / (2 * Math.PI) * 64)), l = [];
  for(let i = 0; i <= n; i++){ const a = a1 + s * i / n; l.push([cx + r * Math.cos(a), cy + r * Math.sin(a), cz]); }
  return l;
}
// Çoklu çizgi kavisi (bulge): iki köşe arasında yay noktaları
function kavis(a, b, bulge, z){
  if(!bulge) return [[a.x, a.y, z]];
  const dx = b.x - a.x, dy = b.y - a.y, c = Math.hypot(dx, dy); if(c < 1e-12) return [[a.x, a.y, z]];
  const teta = 4 * Math.atan(bulge), r = c / (2 * Math.sin(teta / 2)), h = r * Math.cos(teta / 2);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, cx = mx - h * dy / c, cy = my + h * dx / c;
  const a0 = Math.atan2(a.y - cy, a.x - cx), n = Math.max(4, Math.ceil(Math.abs(teta) / (2 * Math.PI) * 64)), l = [];
  for(let i = 0; i < n; i++){ const t = a0 + teta * i / n; l.push([cx + Math.abs(r) * Math.cos(t), cy + Math.abs(r) * Math.sin(t), z]); }
  return l;
}
// B-spline (de Boor); düğüm yoksa uydurma noktalarından geçen eğri yaklaşık çizilir.
function splineNoktalari(e){
  const kn = e.knots || [], cp = (e.controlPoints || []).map(P), d = e.degree || 3;
  if(cp.length > d && kn.length === cp.length + d + 1){
    const l = [], t0 = kn[d], t1 = kn[cp.length], n = Math.max(16, cp.length * 8);
    for(let s = 0; s <= n; s++){
      const t = s === n ? t1 - 1e-9 * (t1 - t0) : t0 + (t1 - t0) * s / n;
      let k = d; while(k < cp.length - 1 && t >= kn[k + 1]) k++;
      const dd = []; for(let j = 0; j <= d; j++) dd.push(cp[j + k - d].slice());
      for(let r = 1; r <= d; r++) for(let j = d; j >= r; j--){
        const i = j + k - d, al = (t - kn[i]) / ((kn[i + d - r + 1] - kn[i]) || 1);
        dd[j] = [0, 1, 2].map(q => (1 - al) * dd[j - 1][q] + al * dd[j][q]);
      }
      l.push(dd[d]);
    }
    return l;
  }
  const fp = (e.fitPoints || []).map(P);
  if(fp.length >= 2){
    const v = new THREE.CatmullRomCurve3(fp.map(p => new THREE.Vector3(...p)));
    return v.getPoints(Math.max(16, fp.length * 8)).map(p => [p.x, p.y, p.z]);
  }
  return cp;
}

function sahneTopla(db){
  const T = new Toplayici();
  const katmanlar = {}; ((db.tables.LAYER || {}).entries || []).forEach(k => { katmanlar[k.name] = k; });
  const bloklar = {}; let modelHandle = null;
  ((db.tables.BLOCK_RECORD || {}).entries || []).forEach(b => { bloklar[b.name] = b; if(/^\*model_space$/i.test(b.name)) modelHandle = b.handle; });
  const katmanRenk = ad => { const k = katmanlar[ad]; return k ? aciRenk(Math.abs(k.colorIndex || 7)) : 0x2b2b2b; };
  const gizli = ad => { const k = katmanlar[ad]; return k && (k.off || k.frozen || k.colorIndex < 0); };

  function ciz(e, M, ust){
    if(e.isVisible === false) return;
    const katman = e.layer === "0" && ust ? ust.katman : e.layer || "0";
    if(gizli(katman)) return;
    const ci = e.colorIndex;
    const renk = typeof e.color === "number" ? e.color : ci === 0 && ust ? ust.renk : ci === 256 || ci === undefined || ci === 0 ? katmanRenk(katman) : aciRenk(ci);
    const g = () => T.grup(katman, renk), W = p => uygula(M, p);
    switch(e.type){
      case "LINE": {
        const a = W(P(e.startPoint)), b = W(P(e.endPoint)); T.cizgi(g(), a, b);
        if(e.thickness){ const n = e.extrusionDirection || {x:0, y:0, z:1}, t = [n.x * e.thickness, n.y * e.thickness, n.z * e.thickness];
          const a2 = W(P(e.startPoint).map((v, i) => v + t[i])), b2 = W(P(e.endPoint).map((v, i) => v + t[i])); T.ucgen(g(), a, b, b2); T.ucgen(g(), a, b2, a2); }
        break;
      }
      case "CIRCLE": case "ARC": {
        const O = carp(M, ocs(e.extrusionDirection)), c = P(e.center);
        const l = e.type === "CIRCLE" ? yay(c[0], c[1], e.radius, 0, 2 * Math.PI, c[2]) : yay(c[0], c[1], e.radius, e.startAngle, e.endAngle, c[2]);
        T.cokCizgi(g(), l.map(p => uygula(O, p)), false);
        if(e.thickness){ const ust_ = l.map(p => uygula(O, [p[0], p[1], p[2] + e.thickness])), alt = l.map(p => uygula(O, p));
          for(let i = 0; i < l.length - 1; i++){ T.ucgen(g(), alt[i], alt[i + 1], ust_[i + 1]); T.ucgen(g(), alt[i], ust_[i + 1], ust_[i]); } }
        break;
      }
      case "ELLIPSE": {
        const c = P(e.center), ma = P(e.majorAxisEndPoint), n = P(e.extrusionDirection || {z:1});
        const nu = Math.hypot(...n) || 1, nn = n.map(v => v / nu), r = e.axisRatio || 1;
        const mi = [(nn[1] * ma[2] - nn[2] * ma[1]) * r, (nn[2] * ma[0] - nn[0] * ma[2]) * r, (nn[0] * ma[1] - nn[1] * ma[0]) * r];
        let a1 = e.startAngle || 0, a2 = e.endAngle; if(a2 === undefined) a2 = 2 * Math.PI; if(a2 <= a1) a2 += 2 * Math.PI;
        const l = [], k = Math.max(16, Math.ceil((a2 - a1) / (2 * Math.PI) * 64));
        for(let i = 0; i <= k; i++){ const t = a1 + (a2 - a1) * i / k; l.push(W([0, 1, 2].map(q => c[q] + ma[q] * Math.cos(t) + mi[q] * Math.sin(t)))); }
        T.cokCizgi(g(), l, false); break;
      }
      case "LWPOLYLINE": case "POLYLINE2D": {
        const O = carp(M, ocs(e.extrusionDirection)), v = e.vertices || [], z = e.elevation || 0, kapali = (e.flag & 1) === 1;
        const l = [];
        for(let i = 0; i < v.length; i++){ const b = v[(i + 1) % v.length]; if(i === v.length - 1 && !kapali){ l.push([v[i].x, v[i].y, z]); break; } l.push(...kavis(v[i], b, v[i].bulge || 0, z)); }
        if(kapali && l.length) l.push(l[0]);
        const w = l.map(p => uygula(O, p)); T.cokCizgi(g(), w, false);
        if(e.thickness){ const u = l.map(p => uygula(O, [p[0], p[1], p[2] + e.thickness]));
          for(let i = 0; i < l.length - 1; i++){ T.ucgen(g(), w[i], w[i + 1], u[i + 1]); T.ucgen(g(), w[i], u[i + 1], u[i]); } }
        break;
      }
      case "POLYLINE3D": T.cokCizgi(g(), (e.vertices || []).map(v => W(P(v))), (e.flag & 1) === 1); break;
      case "SPLINE": T.cokCizgi(g(), splineNoktalari(e).map(W), false); break;
      case "3DFACE": {
        const c = [e.corner1, e.corner2, e.corner3, e.corner4].map(p => W(P(p || e.corner3)));
        T.ucgen(g(), c[0], c[1], c[2]);
        if(Math.hypot(c[3][0] - c[2][0], c[3][1] - c[2][1], c[3][2] - c[2][2]) > 1e-9) T.ucgen(g(), c[0], c[2], c[3]);
        T.cokCizgi(g(), c, true, true); break;
      }
      case "SOLID": case "TRACE": {
        const O = carp(M, ocs(e.extrusionDirection)), z = e.elevation || 0;
        const c = [e.corner1, e.corner2, e.corner4 || e.corner3, e.corner3].map(p => uygula(O, [p.x, p.y, p.z !== undefined ? p.z : z]));
        T.ucgen(g(), c[0], c[1], c[3]); T.ucgen(g(), c[1], c[2], c[3]); break;
      }
      case "INSERT": {
        const b = bloklar[e.name]; if(!b || !b.entities || (ust && ust.derinlik > 16)) break;
        // Yerleştirme noktası OCS'dedir: M · OCS · Öteleme(nokta + dizi kayması) · Dönme · Ölçek · Öteleme(-taban)
        const taban = b.basePoint || {x:0, y:0, z:0}, R = donZ(e.rotation || 0);
        const temel = carp(carp(R, olcek(e.xScale || 1, e.yScale || 1, e.zScale || 1)), oteleme(-taban.x, -taban.y, -(taban.z || 0)));
        const MO = carp(M, ocs(e.extrusionDirection)), ip = P(e.insertionPoint);
        const sut = Math.max(1, e.columnCount || 1), sat = Math.max(1, e.rowCount || 1);
        for(let i = 0; i < sut; i++) for(let j = 0; j < sat; j++){
          const kay = uygula(R, [i * (e.columnSpacing || 0), j * (e.rowSpacing || 0), 0]);
          const M2 = carp(MO, carp(oteleme(ip[0] + kay[0], ip[1] + kay[1], ip[2] + kay[2]), temel));
          b.entities.forEach(c => ciz(c, M2, {katman, renk, derinlik:(ust ? ust.derinlik : 0) + 1}));
        }
        break;
      }
      case "PFACE": {
        // Yüz köşe numaraları 1'den başlar; eksi = o kenar görünmez, 0 = dördüncü köşe yok
        const gg = g(), kg = T.grup(katman, koyulas(renk)), K = e.kose.map(W);
        e.yuz.forEach(f => {
          const ix = f.filter(v => v !== 0).map(v => Math.abs(v) - 1);
          if(ix.length < 3 || ix.some(v => !K[v])) return;
          T.ucgen(gg, K[ix[0]], K[ix[1]], K[ix[2]]);
          if(ix.length === 4) T.ucgen(gg, K[ix[0]], K[ix[2]], K[ix[3]]);
          const fv = f.filter(v => v !== 0);
          for(let q = 0; q < fv.length; q++) if(fv[q] > 0) T.cizgi(kg, K[Math.abs(fv[q]) - 1], K[Math.abs(fv[(q + 1) % fv.length]) - 1], true);
        });
        break;
      }
      case "3DSOLID": case "REGION": case "BODY": {
        if(!e._acis){ T.sayac.katiBos++; break; }
        let geo; try{ geo = acisGeometri(e._acis); }catch(hata){ T.sayac.katiSorun++; break; }
        T.sayac.kati++;
        const gg = g();
        geo.yuzler.forEach(y => yuzUcgenle(T, gg, y, W));
        const kenarRengi = T.grup(katman, koyulas(renk));
        geo.kenarlar.forEach(l => T.cokCizgi(kenarRengi, l.map(W), false, true));
        if(geo.hata) T.sayac.katiSorun++;
        break;
      }
      default: T.sayac.atlanan[e.type] = (T.sayac.atlanan[e.type] || 0) + 1;
    }
  }
  const ust = (db.entities || []).filter(e => !modelHandle || e.ownerBlockRecordSoftId === modelHandle);
  ust.forEach(e => { try{ ciz(e, birim(), null); }catch(h){ T.sayac.atlanan[e.type + " (hatalı)"] = (T.sayac.atlanan[e.type + " (hatalı)"] || 0) + 1; } });
  return {T, birim:BIRIM[db.header && db.header.INSUNITS] || ""};
}
const koyulas = h => new THREE.Color(h).multiplyScalar(0.45).getHex();
// Düz ACIS yüzünü (delikli olabilir) üçgenlere böl
function yuzUcgenle(T, g, y, W){
  const n = y.normal, nu = Math.hypot(...n); if(!nu) return;
  const z = n.map(v => v / nu), yard = Math.abs(z[0]) < .9 ? [1, 0, 0] : [0, 1, 0];
  const u = [z[1] * yard[2] - z[2] * yard[1], z[2] * yard[0] - z[0] * yard[2], z[0] * yard[1] - z[1] * yard[0]], uu = Math.hypot(...u);
  const ux = u.map(v => v / uu), vy = [z[1] * ux[2] - z[2] * ux[1], z[2] * ux[0] - z[0] * ux[2], z[0] * ux[1] - z[1] * ux[0]];
  const iki = d => d.map(p => new THREE.Vector2(p[0] * ux[0] + p[1] * ux[1] + p[2] * ux[2], p[0] * vy[0] + p[1] * vy[1] + p[2] * vy[2]));
  const alan = l => { let s = 0; for(let i = 0; i < l.length; i++){ const a = l[i], b = l[(i + 1) % l.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
  const dl = y.donguler.map(d => ({d, v:iki(d)})).sort((a, b) => Math.abs(alan(b.v)) - Math.abs(alan(a.v)));
  const dis = dl[0], delikler = dl.slice(1);
  const tum = dis.d.concat(...delikler.map(h => h.d));
  let ucgenler;
  try{ ucgenler = THREE.ShapeUtils.triangulateShape(dis.v, delikler.map(h => h.v)); }catch(e){ return; }
  ucgenler.forEach(t => T.ucgen(g, W(tum[t[0]]), W(tum[t[1]]), W(tum[t[2]])));
}

/* ---------- STL ---------- */
function stlTopla(veri){
  const T = new Toplayici(), geo = new STLLoader().parse(veri), p = geo.getAttribute("position"), g = T.grup("STL", 0xc8a27a);
  for(let i = 0; i < p.count; i += 3) T.ucgen(g, [p.getX(i), p.getY(i), p.getZ(i)], [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)], [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)]);
  geo.dispose();
  return {T, birim:""};
}

/* ---------- Sunum malzemeleri ---------- */
// ADeko, IntelliCAD vb. mutfak programlarının katman adlarına göre gerçekçi malzeme seçilir.
// Eşleşmeyen katmanlar CAD rengini korur. "CAD renkleri" düğmesi orijinal renklere döner.
const KREM = 0xdfdbc4, PASLANMAZ = {renk:0xc4c7c9, metal:.75, puruz:.32};
const SUNUM = [
  [/hitbox|ceiling|tavan|^defpoints$/i, null],
  [/glass|cam/i, {renk:0xd4e6ea, puruz:.05, saydam:.3}],
  [/handle|knob|kulp|alumin/i, {renk:0x9a9a9a, metal:.85, puruz:.3}],
  [/worktop|tezgah|counter|backsplash/i, {renk:0xf1efea, puruz:.18}],
  [/floor|zemin|döşeme|doseme/i, {renk:0x3b3633, puruz:.35}],
  [/^(walls?|duvar)/i, {renk:0xf3f1ec, puruz:.9}],
  [/leg|ayak/i, {renk:0x2f2f2f, metal:.4, puruz:.45}],
  [/refrig|buzdolab|app|hood|davlumbaz|sink|evye|sanitary|batarya|_defaultmaterial/i, "cihaz"],
  [/cab|door|kapak|govde|gövde|cornice|korniş|kornis|plinth|baza|panel|shel|raf|dolap/i, {renk:KREM, puruz:.55}],
];
function sunumMalzemesi(katman, renk){
  for(const [d, m] of SUNUM){
    if(!d.test(katman)) continue;
    if(m === "cihaz"){ const c = new THREE.Color(renk), l = c.r * .3 + c.g * .59 + c.b * .11; return l < .3 ? {renk:0x262626, puruz:.15} : renk === 0xbce1ff ? {renk:0x2c3438, puruz:.1} : PASLANMAZ; }
    return m;
  }
  return undefined;
}
const ODA = /floor|zemin|döşeme|doseme|ceiling|tavan|hitbox|^(walls?|duvar)/i;
const sunumGizli = katman => SUNUM.some(([d, m]) => m === null && d.test(katman));

/* ---------- Görüntüleyici ---------- */
const CSS = `
.cad{position:fixed;inset:0;z-index:76;background:#eceae6;display:flex;flex-direction:column;font-family:inherit;color:#1c1917}
.cad-ust{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fff;border-bottom:1px solid #e7e5e4;flex-wrap:wrap}
.cad-ust b{flex:1;min-width:120px;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cad button{border:1px solid #e7e5e4;background:#fff;border-radius:9px;height:34px;padding:0 10px;font:inherit;font-size:13px;font-weight:500;color:#1c1917;cursor:pointer}
.cad button.acik{background:#1c1917;color:#fff;border-color:#1c1917}
.cad-ust b{order:0}.cad-ust button{order:2}.cad-ust button[data-m="kapat"]{order:1}
.cad-alan{flex:1;min-height:0;position:relative;touch-action:none}
.cad-alan canvas{display:block;width:100%;height:100%}
.cad-bilgi{padding:6px 12px calc(6px + env(safe-area-inset-bottom));font-size:12px;color:#57534e;background:#fff;border-top:1px solid #e7e5e4;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.cad-bilgi .uyari{color:#b45309}
.cad-katman{position:absolute;right:10px;top:10px;background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:8px 12px;max-height:60%;overflow:auto;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.cad-katman label{display:flex;gap:8px;align-items:center;padding:3px 0;white-space:nowrap}
.cad-katman i{width:12px;height:12px;border-radius:3px;display:inline-block}
.cad-yuk{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;font-size:14px;color:#57534e;text-align:center;padding:20px}
`;
let cssEklendi = false;

/**
 * Tam ekran 3B görüntüleyici açar.
 * @param {{ad:string, veri:ArrayBuffer|Promise<ArrayBuffer>, kaydet?:(blob:Blob)=>Promise<void>, kaydetYazi?:string}} o
 */
export async function cadGoster(o){
  if(!cssEklendi){ const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); cssEklendi = true; }
  const k = document.createElement("div"); k.className = "cad";
  k.innerHTML = '<div class="cad-ust"><b></b>' +
    '<button data-g="iso">3B</button><button data-g="ust">Üst</button><button data-g="on">Ön</button><button data-g="sag">Yan</button><button data-g="tum">Tümü</button>' +
    '<button data-m="sunum" class="acik">Gerçekçi</button><button data-m="kati" class="acik">Katı</button><button data-m="tel">Tel kafes</button><button data-m="katman">Katmanlar</button>' +
    (o.kaydet ? '<button data-m="kaydet"></button>' : '') + '<button data-m="indir">Görüntü indir</button><button data-m="kapat" aria-label="Kapat">✕</button></div>' +
    '<div class="cad-alan"><div class="cad-yuk">Çizim hazırlanıyor…</div></div><div class="cad-bilgi"></div>';
  k.querySelector("b").textContent = o.ad || "Çizim";
  if(o.kaydet) k.querySelector('[data-m="kaydet"]').textContent = o.kaydetYazi || "Görüntüyü kaydet";
  document.body.appendChild(k);
  const alan = k.querySelector(".cad-alan"), bilgi = k.querySelector(".cad-bilgi"), yuk = k.querySelector(".cad-yuk");
  let renderer = null, kapandi = false, gozlemci = null;
  const kapat = () => {
    kapandi = true; window.removeEventListener("hashchange", kapat); document.removeEventListener("keydown", tus);
    if(gozlemci) gozlemci.disconnect();
    if(renderer){ renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); }
    k.remove();
  };
  const tus = e => { if(e.key === "Escape") kapat(); };
  window.addEventListener("hashchange", kapat); document.addEventListener("keydown", tus);
  k.querySelector('[data-m="kapat"]').onclick = kapat;

  let sonuc;
  try{
    const veri = await o.veri;
    if(kapandi) return;
    const stl = /\.stl$/i.test(o.ad || "");
    if(!stl) yuk.textContent = "DWG okuyucu yükleniyor (ilk açılışta ~3 MB)…";
    sonuc = stl ? stlTopla(veri) : sahneTopla(await dwgOku(veri));
  }catch(e){
    if(kapandi) return;
    const m = String(e && e.message || e);
    yuk.innerHTML = "<b>Çizim açılamadı.</b><div>" + (/memory|Memory|RangeError/.test(m) ? "Cihazın belleği yetmedi; bilgisayarda açmayı deneyin." : m.replace(/[<>&]/g, "")) + "</div>" +
      "<div>DWG dosyasını IntelliCAD'de <b>Farklı Kaydet → AutoCAD 2010 Çizimi (*.dwg)</b> olarak kaydedip tekrar deneyin.</div>";
    return;
  }
  if(kapandi) return;
  const {T, birim:br} = sonuc;
  if(!isFinite(T.min[0])){ yuk.innerHTML = "<b>Çizimde gösterilecek 3B geometri bulunamadı.</b>" + uyariYazisi(T); return; }

  // Kadraj: 3B yüzeyler varsa onlara, yoksa çizgilerin %1–%99 aralığına göre (uzaktaki tek tük çizgiler modeli küçültmesin).
  // Hassasiyet için çizim bu kutunun merkezine taşınır.
  let omin = T.ymin, omax = T.ymax;
  // Zemin, tavan, duvar gibi oda parçaları kadraja katılmaz; mobilya ekranı doldursun
  { const a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity];
    T.gruplar.forEach(g => { if(ODA.test(g.katman)) return; const u = g.ucgen; for(let i = 0; i < u.length; i += 3) for(let q = 0; q < 3; q++){ const v = u[i + q]; if(v < a[q]) a[q] = v; if(v > b[q]) b[q] = v; } });
    if(isFinite(a[0])){ omin = a; omax = b; } }
  if(!isFinite(omin[0])){
    const l = []; T.gruplar.forEach(g => { const c = g.cizgi.length ? g.cizgi : g.kenar, adim = Math.max(1, Math.floor(c.length / 3 / 50000)) * 3; for(let i = 0; i < c.length; i += adim) l.push([c[i], c[i + 1], c[i + 2]]); });
    const q = (eks, o) => { const v = l.map(p => p[eks]).sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.max(0, Math.round(o * (v.length - 1))))]; };
    omin = [0, 1, 2].map(i => q(i, .01)); omax = [0, 1, 2].map(i => q(i, .99));
  }
  const mrk = [0, 1, 2].map(i => (omin[i] + omax[i]) / 2), boy = [0, 1, 2].map(i => omax[i] - omin[i]);
  const tumBoy = [0, 1, 2].map(i => T.max[i] - T.min[i]), tumMrk = [0, 1, 2].map(i => (T.min[i] + T.max[i]) / 2 - mrk[i]);
  const cap = Math.max(...boy) || Math.max(...tumBoy) || 1, kosegen = Math.hypot(...boy) || cap;
  const sahne = new THREE.Scene(); sahne.background = new THREE.Color(0xf2f0ec);
  const kamera = new THREE.PerspectiveCamera(40, 1, cap / 1000, Math.max(cap * 100, Math.hypot(...tumBoy) * 4)); kamera.up.set(0, 0, 1);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8580, 1.6); hemi.position.set(0, 0, 1); sahne.add(hemi);
  const isik = new THREE.DirectionalLight(0xffffff, 1.6); isik.position.set(0.4, 0.3, 1); kamera.add(isik); sahne.add(kamera);
  const katmanNesne = {}, kenarlar = [], yuzeyler = [], cizgiler = [];
  let sunum = true;
  const diz = (l) => { const a = new Float32Array(l.length); for(let i = 0; i < l.length; i += 3){ a[i] = l[i] - mrk[0]; a[i + 1] = l[i + 1] - mrk[1]; a[i + 2] = l[i + 2] - mrk[2]; } return a; };
  T.gruplar.forEach(g => {
    const grup = katmanNesne[g.katman] || (katmanNesne[g.katman] = {g:new THREE.Group(), renk:g.renk});
    if(g.ucgen.length){
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(diz(g.ucgen), 3)); geo.computeVertexNormals();
      // AutoCAD'in 7 numaralı rengi (siyah / beyaz) yüzeylerde açık gri gösterilir; çizgiler koyu kalır
      const ortak = {side:THREE.DoubleSide, flatShading:true, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1};
      const cad = new THREE.MeshStandardMaterial({...ortak, color: g.renk === ACI_TEMEL[7] ? 0xd9d5cf : g.renk, roughness:.85, metalness:0});
      const s = sunumMalzemesi(g.katman, g.renk);
      const gercek = s ? new THREE.MeshStandardMaterial({...ortak, color:s.renk, roughness:s.puruz, metalness:s.metal || 0,
        transparent:!!s.saydam, opacity:s.saydam || 1, depthWrite:!s.saydam}) : cad;
      const m = new THREE.Mesh(geo, gercek); m.userData = {cad, gercek};
      grup.g.add(m); yuzeyler.push(m);
      if(s && grup.sunumRenk === undefined) grup.sunumRenk = s.renk;
    }
    [["cizgi", false], ["kenar", true]].forEach(([alanAdi, kenar]) => {
      if(!g[alanAdi].length) return;
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(diz(g[alanAdi]), 3));
      // Gerçekçi görünümde kenarlar malzemenin koyu tonunda ve hafif saydam: panel çizgileri seçilir ama ağ gibi durmaz
      const s = sunumMalzemesi(g.katman, g.renk), cad = new THREE.LineBasicMaterial({color:g.renk});
      const gercek = kenar && s ? new THREE.LineBasicMaterial({color:new THREE.Color(s.renk).multiplyScalar(.55), transparent:true, opacity:.45}) : cad;
      const l = new THREE.LineSegments(geo, gercek); l.userData = {cad, gercek}; grup.g.add(l); (kenar ? kenarlar : cizgiler).push(l);
    });
  });
  Object.entries(katmanNesne).forEach(([ad, x]) => { if(sunumGizli(ad)) x.g.visible = false; sahne.add(x.g); });

  yuk.remove();
  renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  // Yansımalar için yumuşak oda ışığı (metal kulplar, cam, parlak zemin)
  const pmrem = new THREE.PMREMGenerator(renderer), ortam = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  const ortamAyarla = () => { sahne.environment = sunum ? ortam : null; hemi.intensity = sunum ? .7 : 1.6; isik.intensity = sunum ? 1.2 : 1.6; };
  ortamAyarla();
  alan.appendChild(renderer.domElement);
  const kontrol = new OrbitControls(kamera, renderer.domElement); kontrol.screenSpacePanning = true;
  const ciz = () => renderer.render(sahne, kamera);
  kontrol.addEventListener("change", ciz);
  const boyutla = () => { const w = alan.clientWidth, h = alan.clientHeight; if(!w || !h) return; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); ciz(); };
  gozlemci = new ResizeObserver(boyutla); gozlemci.observe(alan);
  // Kutunun çevrel küresi görüş açısına sığacak uzaklık
  const gorunum = (ad, hepsi) => {
    const y = {iso:[1, -1.2, 0.9], ust:[0, -0.0001, 1], on:[0, -1, 0], sag:[1, 0, 0], tum:[1, -1.2, 0.9]}[ad], u = Math.hypot(...y);
    const yaricap = (hepsi ? Math.hypot(...tumBoy) : kosegen) / 2, mesafe = yaricap / Math.sin(THREE.MathUtils.degToRad(kamera.fov / 2)) * 1.05;
    const h = hepsi ? tumMrk : [0, 0, 0];
    kamera.position.set(h[0] + y[0] / u * mesafe, h[1] + y[1] / u * mesafe, h[2] + y[2] / u * mesafe);
    kamera.up.set(0, 0, 1); kontrol.target.set(...h); kontrol.update();
    k.querySelectorAll("[data-g]").forEach(b => b.classList.toggle("acik", b.getAttribute("data-g") === ad)); ciz();
  };
  boyutla(); gorunum(yuzeyler.length ? "iso" : "ust");

  const say = T.sayac, ol = v => Math.round(v * 10) / 10;
  bilgi.innerHTML = '<span>' + (isFinite(T.ymin[0]) ? 'Model' : 'Çizim') + ' boyutu: <b>' + ol(boy[0]) + ' × ' + ol(boy[1]) + ' × ' + ol(boy[2]) + (br ? ' ' + br : '') + '</b> (en × derinlik × yükseklik)</span>' +
    '<span>' + (say.kati ? say.kati + ' katı · ' : '') + say.yuz + ' yüzey · ' + say.cizgi + ' çizgi</span>' + uyariYazisi(say) +
    '<span style="margin-left:auto">Döndür: sürükle · Kaydır: iki parmak / sağ tık · Yakınlaş: tekerlek' +
    (/\.stl$/i.test(o.ad || "") ? '' : ' · DWG okuma: <a href="https://github.com/mlightcad/libredwg-web" target="_blank" rel="noopener" style="color:inherit">LibreDWG</a> (GPL-3.0)') + '</span>';

  k.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    const gAd = b.getAttribute("data-g"), m = b.getAttribute("data-m");
    if(gAd) return gorunum(gAd, gAd === "tum");
    if(m === "sunum"){
      sunum = !sunum; b.classList.toggle("acik", sunum); b.textContent = sunum ? "Gerçekçi" : "CAD renkleri";
      yuzeyler.concat(kenarlar, cizgiler).forEach(x => { x.material = sunum ? x.userData.gercek : x.userData.cad; });
      ortamAyarla(); sahne.background.set(sunum ? 0xf2f0ec : 0xeceae6);
      const p = alan.querySelector(".cad-katman"); if(p){ p.remove(); k.querySelector('[data-m="katman"]').classList.remove("acik"); }
      ciz();
    } else if(m === "kati" || m === "tel"){
      yuzeyler.forEach(x => { x.visible = m === "kati"; }); kenarlar.forEach(x => { x.visible = true; });
      k.querySelector('[data-m="kati"]').classList.toggle("acik", m === "kati"); k.querySelector('[data-m="tel"]').classList.toggle("acik", m === "tel"); ciz();
    } else if(m === "katman"){
      const p = alan.querySelector(".cad-katman"); if(p){ p.remove(); b.classList.remove("acik"); return; }
      b.classList.add("acik");
      const d = document.createElement("div"); d.className = "cad-katman";
      d.innerHTML = Object.keys(katmanNesne).sort().map(ad => '<label><input type="checkbox" data-k="' + ad.replace(/"/g, "&quot;") + '"' + (katmanNesne[ad].g.visible ? ' checked' : '') + '><i style="background:#' +
        (sunum && katmanNesne[ad].sunumRenk !== undefined ? katmanNesne[ad].sunumRenk : katmanNesne[ad].renk).toString(16).padStart(6, "0") + '"></i>' + ad.replace(/[<>&]/g, "") + '</label>').join("");
      d.addEventListener("change", ev => { const ad = ev.target.getAttribute("data-k"); if(katmanNesne[ad]){ katmanNesne[ad].g.visible = ev.target.checked; ciz(); } });
      alan.appendChild(d);
    } else if(m === "indir" || m === "kaydet"){
      ciz();
      renderer.domElement.toBlob(async blob => {
        if(!blob) return;
        if(m === "indir"){ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (o.ad || "cizim").replace(/\.\w+$/, "") + ".jpg"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
        else { b.disabled = true; try{ await o.kaydet(blob); } finally { b.disabled = false; } }
      }, "image/jpeg", 0.92);
    }
  });
}
function uyariYazisi(say){
  const l = [];
  if(say.katiBos) l.push(say.katiBos + " katı okunamadı (DWG 2013 ve sonrası katı verisi desteklenmiyor: IntelliCAD'de “AutoCAD 2010 Çizimi” olarak kaydedin)");
  if(say.katiSorun) l.push(say.katiSorun + " katının bir kısmı çözülemedi");
  const at = Object.keys(say.atlanan || {}).filter(t => !/^(TEXT|MTEXT|DIMENSION|ATTRIB|ATTDEF|HATCH|POINT|VIEWPORT|XLINE|RAY|MULTILEADER|LEADER|TOLERANCE|ACAD_TABLE|TABLE|WIPEOUT|IMAGE|MLINE|SHAPE|ARC_DIMENSION|OLE2FRAME|OLEFRAME)$/.test(t));
  if(at.length) l.push("Gösterilmeyen: " + at.map(t => t + " (" + say.atlanan[t] + ")").join(", "));
  return l.length ? '<span class="uyari">' + l.join(" · ").replace(/[<>&]/g, "") + '</span>' : '';
}
