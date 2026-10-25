// Testler için tarayıcıda çalışan sahte Supabase istemcisi.
// Veri localStorage'da durur (sayfa yenilenince kaybolmaz); güncelleme 13 davranışı: sürüm / değişim zamanı,
// silinen kayıt izi, yalnız yöneticinin okuyabildiği fiyat tablosu ve malzeme listesi.
// Ayarlar: localStorage "__yonetici" ("0" = usta), "__eposta" (giriş yapan); window.__agYok = true → internet yok.
(function(){
  let db; try{ db = JSON.parse(localStorage.getItem("__sahte_db")); }catch(e){}
  if(!db) db = {};
  window.__db = db; window.__agYok = false; window.__yonetici = window.__yonetici !== undefined ? window.__yonetici : (localStorage.getItem("__yonetici") !== "0");
  window.__eposta = localStorage.getItem("__eposta") || "samet@gunesmobilya.app";
  const kaydet = () => localStorage.setItem("__sahte_db", JSON.stringify(db));
  const anahtar = t => t === "ayarlar" ? "anahtar" : t === "kullanicilar" ? "eposta" : "id";
  const SURUMSUZ = {kullanicilar:1, silinenler:1, islem_kaydi:1, cop_kutusu:1, yedekler:1};
  let saat = Date.now();
  const simdi = () => (saat = Math.max(saat + 1, Date.now()));
  const damga = (t, r, eski) => { if(SURUMSUZ[t]) return r; r.degisme = simdi(); r.degistiren = __eposta; r.surum = eski ? (eski.surum || 0) + 1 : 1; return r; };
  function sorgu(t){
    const s = {f:[], gt:[], islem:"select", don:null, tek:false};
    const bitir = () => {
      if(window.__agYok) return Promise.resolve({data:null, error:{message:"TypeError: Failed to fetch"}});
      if(t === "is_emri_fiyat" && !__yonetici) { if(s.islem === "select") return Promise.resolve({data:s.tek ? null : [], error:null}); return Promise.resolve({data:null, error:{message:"new row violates row-level security"}}); }
      const l = db[t] || (db[t] = []), k = anahtar(t), uy = x => s.f.every(([a, v]) => x[a] === v) && s.gt.every(([a, v]) => (x[a] || 0) > v);
      let sonuc = null;
      if(s.islem === "select"){ let r = l.filter(uy); if(t === "ayarlar" && !__yonetici) r = r.filter(x => x.anahtar !== "malzemeler"); r = r.slice(s.bas || 0, s.son == null ? 1e9 : s.son + 1); sonuc = s.tek ? (r[0] || null) : r; }
      else if(s.islem === "upsert" || s.islem === "insert"){ sonuc = []; [].concat(s.veri).forEach(r => { const i = l.findIndex(x => x[k] === r[k]); const y = damga(t, Object.assign({}, i >= 0 ? l[i] : {}, r), i >= 0 ? l[i] : null); if(i >= 0) l[i] = y; else l.push(y); sonuc.push(y); }); }
      else if(s.islem === "update"){ sonuc = []; l.forEach((x, i) => { if(uy(x)){ l[i] = damga(t, Object.assign({}, x, s.veri), x); sonuc.push(l[i]); } }); }
      else if(s.islem === "delete"){ const gid = l.filter(uy); db[t] = l.filter(x => !uy(x)); gid.forEach(x => { if(!SURUMSUZ[t]) (db.silinenler = db.silinenler || []).push({id:Date.now(), tablo:t, kayit_id:x[k], zaman:simdi()}); if(t === "is_emirleri") db.is_emri_fiyat = (db.is_emri_fiyat || []).filter(f => f.id !== x.id); }); }
      kaydet();
      if(s.islem !== "select" && !s.don) sonuc = null;
      return Promise.resolve({data:JSON.parse(JSON.stringify(sonuc)), error:null});
    };
    const z = {select(c){ if(s.islem !== "select") s.don = c || "*"; return z; }, order(){ return z; }, limit(){ return z; }, range(a, b){ s.bas = a; s.son = b; return z; },
      gte(){ return z; }, lt(){ return z; }, ilike(){ return z; }, gt(a, v){ s.gt.push([a, v]); return z; }, eq(a, v){ s.f.push([a, v]); return z; },
      maybeSingle(){ s.tek = true; return z; }, single(){ s.tek = true; return z; },
      upsert(v){ s.islem = "upsert"; s.veri = v; return z; }, insert(v){ s.islem = "insert"; s.veri = v; return z; },
      update(v){ s.islem = "update"; s.veri = v; return z; }, delete(){ s.islem = "delete"; return z; }, then(ok, no){ return bitir().then(ok, no); }};
    return z;
  }
  const istemci = {from:sorgu, rpc:(ad) => Promise.resolve(window.__agYok ? {error:{message:"TypeError: Failed to fetch"}} : ad === "yonetici_mi" ? {data:__yonetici, error:null} : {data:1, error:null}),
    auth:{getSession:async () => ({data:{session:{user:{email:__eposta}}}}), onAuthStateChange:() => ({data:{subscription:{unsubscribe(){}}}}), signOut:async () => ({}), signInWithPassword:async () => ({data:{session:{user:{email:__eposta}}}})},
    storage:{from:() => ({upload:async () => ({error:null}), remove:async () => ({error:null}), createSignedUrls:async (l) => ({data:l.map(p => ({path:p, signedUrl:"/" + p.split("/").pop()}))})})},
    channel:() => { const c = {on(){ return c; }, subscribe(){ return c; }}; return c; }};
  window.supabase = {createClient:() => istemci};
})();
