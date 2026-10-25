"use strict";
// Güneş Mobilya — takvim usta arama
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= MONTAJ VE TESLİMAT TAKVİMİ ================= */
// Randevular iş emrinin "montaj" alanında: [{id, tarih, saat, sure (saat; 0 = tüm gün), tur, ekip:[ad], not, hatirlatildi, tamam}]
const RANDEVU_TUR = ["Montaj", "Teslimat", "Ölçü / keşif", "Servis"];
const RANDEVU_RENK = {"Montaj":"var(--ana)", "Teslimat":"var(--borc)", "Ölçü / keşif":"#7c3aed", "Servis":"#0d9488"};
const GUN_UZUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const trKucuk = s => String(s || "").toLocaleLowerCase("tr").trim();
// Montaja gidebilecek kişiler: çalışan personel, kullanıcı adları, iş emirlerindeki sorumlular
function ekipListesi(){
  const l = veri.personel.filter(p => calisiyor(p, bugun())).map(p => p.ad)
    .concat(yetki.liste.map(k => k.ad), veri.is_emirleri.map(i => i.sorumlu), veri.is_emirleri.flatMap(i => i.montaj.flatMap(r => r.ekip || [])));
  const g = {}; return l.filter(Boolean).filter(a => { const k = trKucuk(a); if(g[k]) return false; g[k] = 1; return true; }).sort((a, b) => a.localeCompare(b, "tr"));
}
const randevular = () => veri.is_emirleri.flatMap(ie => (ie.montaj || []).map(r => ({ie, r})));
const dakika = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
// Saat yazılmamışsa veya "tüm gün" ise 08:00–18:00 sayılır
function randevuAraligi(r){
  const b = dakika(r.saat); if(b == null || !r.sure) return [8 * 60, 18 * 60];
  return [b, b + Math.round(r.sure * 60)];
}
// Aynı gün, saatleri çakışan ve ortak ekip üyesi olan diğer randevular
function cakisanlar(r, haric){
  const a = randevuAraligi(r), ekip = (r.ekip || []).map(trKucuk);
  if(!ekip.length) return [];
  return randevular().filter(x => x.r.id !== r.id && x.r.id !== haric && x.r.tarih === r.tarih && !x.r.tamam && x.ie.durum !== "İptal").filter(x => {
    const b = randevuAraligi(x.r); if(!(a[0] < b[1] && b[0] < a[1])) return false;
    return (x.r.ekip || []).some(e => ekip.indexOf(trKucuk(e)) >= 0);
  });
}
const saatYazi = r => r.saat ? r.saat + (r.sure ? "–" + (() => { const s = randevuAraligi(r)[1]; return ("0" + Math.floor(s / 60) % 24).slice(-2) + ":" + ("0" + s % 60).slice(-2); })() : "") : "Tüm gün";
const benimAdim = () => trKucuk(yetki.ad);
const bendeMi = (ie, r) => { const b = benimAdim(); return !!b && ((r && (r.ekip || []).some(e => trKucuk(e) === b)) || trKucuk(ie.sorumlu) === b); };
const haritaLink = adres => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(adres);

function randevuKarti(x, o = {}){
  const {ie, r} = x, m = bul("musteriler", ie.musteriId) || {}, c = cakisanlar(r);
  return '<div class="randevu' + (r.tamam ? ' tamam' : '') + (c.length ? ' cakisma' : '') + '" style="--renk:' + (RANDEVU_RENK[r.tur] || "var(--ana)") + '">' +
    '<button class="randevu-ust" data-is="randevuAc" data-arg="' + ie.id + '|' + r.id + '"><b>' + esc(saatYazi(r)) + '</b><span>' + esc(r.tur) + (r.tamam ? ' ✓' : '') + '</span></button>' +
    '<div class="randevu-is" data-git="is/' + ie.id + '">' + esc(ie.no + " · " + ie.baslik) + '</div>' +
    '<div class="randevu-alt">' + esc(m.ad || "") + (ie.adres && !o.kisa ? ' · ' + esc(ie.adres.split("\n")[0].slice(0, 60)) : '') + '</div>' +
    ((r.ekip || []).length ? '<div class="randevu-ekip">' + r.ekip.map(e => '<span>' + esc(e) + '</span>').join("") + '</div>' : '') +
    (c.length ? '<div class="randevu-uyari">⚠ Çakışma: ' + esc(c.map(y => y.ie.no + " (" + saatYazi(y.r) + ")").join(", ")) + '</div>' : '') +
    (r.not ? '<div class="randevu-alt">' + esc(r.not) + '</div>' : '') +
    (!r.tamam && yetki.yonetici && r.tarih >= bugun() ? '<button class="randevu-wa' + (r.hatirlatildi ? ' gitti' : '') + '" data-is="randevuHatirlat" data-arg="' + ie.id + '|' + r.id + '">' + ik("mesaj") +
      (r.hatirlatildi ? 'Hatırlatıldı' : 'Müşteriye hatırlat') + '</button>' : '') + '</div>';
}
function ekranTakvim(bas){
  const hb = haftaBasi(/^\d{4}-\d{2}-\d{2}$/.test(bas || "") ? bas : bugun()), gunler = [0, 1, 2, 3, 4, 5, 6].map(i => gunEkle(hb, i)), son = gunler[6];
  const kisi = filtre.takvimKisi || "", bg = bugun();
  const l = randevular().filter(x => x.r.tarih >= hb && x.r.tarih <= son && x.ie.durum !== "İptal" && (!kisi || (x.r.ekip || []).some(e => trKucuk(e) === trKucuk(kisi))))
    .sort((a, b) => (a.r.saat || "") < (b.r.saat || "") ? -1 : 1);
  // Teslim tarihi bu hafta olup randevusu olmayan işler
  const plansiz = veri.is_emirleri.filter(ie => ac(ie) && ie.durum !== "Teklif" && ie.teslimTarihi && ie.teslimTarihi >= hb && ie.teslimTarihi <= son && !ie.montaj.some(r => !r.tamam && r.tur !== "Ölçü / keşif"));
  const cakisma = l.filter(x => cakisanlar(x.r).length).length;
  const d0 = tarihOku(hb), d6 = tarihOku(son);
  const baslik = d0.getDate() + (d0.getMonth() !== d6.getMonth() ? " " + AYLAR[d0.getMonth()] : "") + " – " + d6.getDate() + " " + AYLAR[d6.getMonth()] + " " + d6.getFullYear();
  const html = '<div class="ust-arac"><div class="ay-sec"><button class="ikon-buton" data-git="takvim/' + gunEkle(hb, -7) + '" aria-label="Önceki hafta">' + ik("sol") + '</button>' +
      '<b style="min-width:150px;text-align:center">' + baslik + '</b><button class="ikon-buton" data-git="takvim/' + gunEkle(hb, 7) + '" aria-label="Sonraki hafta">' + ik("sag") + '</button>' +
      (hb !== haftaBasi(bg) ? '<button class="secenek" data-git="takvim">Bu hafta</button>' : '') + '</div>' +
      '<div class="buton-sira" style="margin:0;flex-wrap:nowrap"><select id="takvimKisi" class="kutu" style="width:auto"><option value="">Herkes</option>' + ekipListesi().map(e => '<option' + (e === kisi ? ' selected' : '') + '>' + esc(e) + '</option>').join("") + '</select>' +
      (yetki.yonetici ? '<button class="buton kucuk" data-is="randevuAc" data-arg="|">' + ik("arti") + 'Randevu</button>' : '') + '</div></div>' +
    (cevrimici && eksikSutun.montaj ? '<div class="uyari">Takvim için Supabase\'de <b>supabase-guncelleme-10.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>' : '') +
    (cakisma ? '<div class="uyari">Bu hafta <b>' + cakisma + '</b> randevuda aynı kişi aynı saatte iki yerde görünüyor (kırmızı kartlar).</div>' : '') +
    (plansiz.length ? '<div class="kart liste-kart"><div class="kart-baslik" style="margin:12px 0 2px">Bu hafta teslim edilecek, randevusu verilmemiş işler (' + plansiz.length + ')</div>' +
      plansiz.map(ie => '<div class="satir"><span class="rozet r-ana">' + ik("takvim") + '</span><span class="orta"><div class="s1">' + esc(ie.no + " · " + ie.baslik) + '</div><div class="s2">' +
        esc(cariAdi(ie.musteriId) + " · teslim " + tarihYaz(ie.teslimTarihi, true)) + '</div></span>' + (yetki.yonetici ? '<button class="buton kucuk ikincil" data-is="randevuAc" data-arg="' + ie.id + '|">Planla</button>' : '') + '</div>').join("") + '</div>' : '') +
    '<div class="hafta">' + gunler.map(t => {
      const g = l.filter(x => x.r.tarih === t), d = tarihOku(t);
      return '<div class="hafta-gun' + (t === bg ? ' bugun' : '') + (t < bg ? ' gecmis' : '') + (takvimAyar().gunler.indexOf(d.getDay()) < 0 ? ' kapali' : '') + '"><div class="hafta-baslik"><span><b>' + d.getDate() + ' ' + AYLAR[d.getMonth()].slice(0, 3) + '</b> ' + GUN_UZUN[d.getDay()] + (t === bg ? ' · bugün' : '') + '</span>' +
        (yetki.yonetici ? '<button class="hafta-ekle" data-is="randevuAc" data-arg="||' + t + '" aria-label="Bu güne randevu ekle">' + ik("arti") + '</button>' : '') + '</div>' +
        (g.length ? g.map(x => randevuKarti(x)).join("") : '<div class="hafta-bos">—</div>') + '</div>';
    }).join("") + '</div>';
  return {baslik:"Montaj takvimi", html, sonra(){
    const s = document.getElementById("takvimKisi"); if(s) s.addEventListener("change", () => { filtre.takvimKisi = s.value; ciz(); });
  }};
}
// Randevu ekle / düzenle: arg = "isId|randevuId|tarih"
EYLEM.randevuAc = (el, arg) => {
  const [isId, rid, gun] = (arg || "").split("|"), ie0 = bul("is_emirleri", isId), r0 = ie0 && rid ? ie0.montaj.find(x => x.id === rid) : null;
  if(!yetki.yonetici && !r0) return;
  const isler = veri.is_emirleri.filter(ie => ac(ie) || ie.id === isId).sort((a, b) => b.olusma - a.olusma);
  const r = Object.assign({id:yeniId(), tarih:gun || (ie0 && ie0.teslimTarihi >= bugun() ? ie0.teslimTarihi : gunSonra(1)), saat:takvimAyar().saat, sure:takvimAyar().sure, tur:ie0 && ie0.durum === "Teklif" ? "Ölçü / keşif" : "Montaj",
    ekip: ie0 && ie0.sorumlu ? [ie0.sorumlu] : [], not:"", hatirlatildi:false, tamam:false}, r0 ? JSON.parse(JSON.stringify(r0)) : {});
  const ekip = ekipListesi(); r.ekip.forEach(e => { if(ekip.indexOf(e) < 0) ekip.push(e); });
  const p = document.createElement("div"); p.className = "perde";
  const ust = !yetki.yonetici;
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:92vh;overflow:auto"><p>' + (r0 ? "Randevu" : "Yeni randevu") + '</p>' +
    (ust ? '<div class="alt-bilgi">' + esc(ie0.no + " · " + ie0.baslik) + ' · ' + esc(tarihYaz(r.tarih) + " " + saatYazi(r)) + '</div>' :
    '<label class="etiket" for="rIs">İş emri</label><select id="rIs" class="kutu"><option value="">— Seçin —</option>' + isler.map(ie => '<option value="' + ie.id + '"' + (ie.id === isId ? ' selected' : '') + '>' + esc(ie.no + " · " + ie.baslik + " · " + cariAdi(ie.musteriId)) + '</option>').join("") + '</select>' +
    '<label class="etiket">Tür</label><div class="secenekler" id="rTur">' + RANDEVU_TUR.map(t => '<button type="button" class="secenek' + (t === r.tur ? ' secili' : '') + '" data-t="' + t + '">' + t + '</button>').join("") + '</div>' +
    '<div class="izgara uc" style="margin:0"><div>' + tarihAlani("rTarih", "Tarih", r.tarih) + '</div><div><label class="etiket" for="rSaat">Saat</label><input id="rSaat" type="time" class="kutu" value="' + esc(r.saat) + '"></div>' +
    '<div><label class="etiket" for="rSure">Süre</label><select id="rSure" class="kutu">' + [[1, "1 saat"], [2, "2 saat"], [3, "3 saat"], [4, "4 saat"], [6, "6 saat"], [8, "8 saat"], [0, "Tüm gün"]].map(([v, y]) => '<option value="' + v + '"' + (v === Number(r.sure) ? ' selected' : '') + '>' + y + '</option>').join("") + '</select></div></div>' +
    '<label class="etiket">Ekip <span class="ist">(gidecek kişiler)</span></label><div class="secenekler" id="rEkip">' + ekip.map(e => '<button type="button" class="secenek' + (r.ekip.indexOf(e) >= 0 ? ' secili' : '') + '" data-e="' + esc(e) + '">' + esc(e) + '</button>').join("") + '</div>' +
    '<div class="buton-sira" style="flex-wrap:nowrap;margin-top:8px"><input id="rYeniKisi" class="kutu" maxlength="40" placeholder="Listede olmayan kişi"><button type="button" class="buton ikincil kucuk" data-c="kisi">Ekle</button></div>') +
    '<label class="etiket" for="rNot">Not <span class="ist">(isteğe bağlı)</span></label><textarea id="rNot" class="kutu" style="min-height:56px" maxlength="400"' + (ust ? ' placeholder="Montajla ilgili not"' : ' placeholder="Örn: Kapıcıdan anahtar alınacak"') + '>' + esc(r.not) + '</textarea>' +
    (r0 ? '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:15px"><input type="checkbox" id="rTamam"' + (r.tamam ? ' checked' : '') + ' style="width:20px;height:20px"> Yapıldı / tamamlandı</label>' : '') +
    '<div class="hata" id="rHata"></div><div class="buton-sira">' + (r0 && !ust ? '<button class="buton tehlike" data-c="sil">' + ik("sil") + 'Sil</button>' : '') +
    '<button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  const kaydet = async (zorla) => {
    if(cevrimici && eksikSutun.montaj) return p.querySelector("#rHata").textContent = "Randevuların kaydedilmesi için Supabase'de supabase-guncelleme-10.sql dosyasını çalıştırın.";
    const hedef = ust ? ie0 : bul("is_emirleri", p.querySelector("#rIs").value);
    if(!hedef) return p.querySelector("#rHata").textContent = "İş emrini seçin.";
    if(!ust){
      r.tarih = p.querySelector("#rTarih").value; r.saat = p.querySelector("#rSaat").value; r.sure = Number(p.querySelector("#rSure").value);
      r.tur = (p.querySelector("#rTur .secili") || {}).getAttribute ? p.querySelector("#rTur .secili").getAttribute("data-t") : r.tur;
      r.ekip = Array.from(p.querySelectorAll("#rEkip .secili")).map(b => b.getAttribute("data-e"));
    }
    r.not = p.querySelector("#rNot").value.trim(); if(p.querySelector("#rTamam")) r.tamam = p.querySelector("#rTamam").checked;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.tarih)) return p.querySelector("#rHata").textContent = "Tarihi seçin.";
    const c = r.tamam ? [] : cakisanlar(r);
    if(!(zorla >= 1) && !r.tamam && takvimAyar().gunler.indexOf(tarihOku(r.tarih).getDay()) < 0){
      p.querySelector("#rHata").innerHTML = "⚠ " + GUN_UZUN[tarihOku(r.tarih).getDay()] + " çalışma günü değil (Ayarlar → Takvim). " + '<button class="baglanti" data-c="zorlaGun">Yine de kaydet</button>';
      return;
    }
    if(c.length && !(zorla >= 2)){
      p.querySelector("#rHata").innerHTML = "⚠ " + esc(c.map(x => (x.r.ekip || []).filter(e => r.ekip.some(y => trKucuk(y) === trKucuk(e))).join(", ") + " aynı saatte " + x.ie.no + " (" + saatYazi(x.r) + ") işinde").join("; ")) +
        ' <button class="baglanti" data-c="zorla">Yine de kaydet</button>';
      return;
    }
    const eskiIs = r0 ? ie0 : null;
    if(eskiIs && eskiIs.id !== hedef.id) await Depo.kaydet("is_emirleri", Object.assign({}, eskiIs, {montaj:eskiIs.montaj.filter(x => x.id !== r.id)}));
    const ml = (bul("is_emirleri", hedef.id).montaj || []).filter(x => x.id !== r.id).concat([r]).sort((a, b) => (a.tarih + a.saat) < (b.tarih + b.saat) ? -1 : 1);
    await Depo.kaydet("is_emirleri", Object.assign({}, bul("is_emirleri", hedef.id), {montaj:ml}));
    if(!r0) await notEkle(hedef.id, r.tur + " randevusu: " + tarihYaz(r.tarih) + " " + saatYazi(r) + (r.ekip.length ? " · " + r.ekip.join(", ") : ""));
    else if(r.tamam && !r0.tamam) await notEkle(hedef.id, r.tur + " tamamlandı" + (r.not ? ": " + r.not : ""));
    p.remove(); bildir("Randevu kaydedildi"); ciz();
  };
  p.addEventListener("click", e => {
    const t = e.target.closest("[data-t]"); if(t){ p.querySelectorAll("#rTur .secenek").forEach(x => x.classList.toggle("secili", x === t)); return; }
    const k = e.target.closest("[data-e]"); if(k){ k.classList.toggle("secili"); return; }
    const b = e.target.closest("[data-c]");
    if(!b){ if(e.target === p) p.remove(); return; }
    const c = b.getAttribute("data-c");
    if(c === "hayir") return p.remove();
    if(c === "kisi"){ const v = p.querySelector("#rYeniKisi").value.trim(); if(!v) return; const y = document.createElement("button"); y.type = "button"; y.className = "secenek secili"; y.setAttribute("data-e", v); y.textContent = v; p.querySelector("#rEkip").appendChild(y); p.querySelector("#rYeniKisi").value = ""; return; }
    if(c === "sil") return onayla("Randevu silinsin mi?", "", "Sil", () => islem(null, async () => { await Depo.kaydet("is_emirleri", Object.assign({}, ie0, {montaj:ie0.montaj.filter(x => x.id !== r.id)})); p.remove(); bildir("Randevu silindi"); ciz(); }));
    b.disabled = true;
    kaydet(c === "zorla" ? 2 : c === "zorlaGun" ? 1 : 0).catch(err => { p.querySelector("#rHata").textContent = hataMesaji(err); }).finally(() => { b.disabled = false; });
  });
  document.body.appendChild(p);
};
function randevuMesaji(ie, r){
  const m = bul("musteriler", ie.musteriId) || {}, d = tarihOku(r.tarih), fark = Math.round((d - tarihOku(bugun())) / 86400000);
  const gun = fark === 0 ? "bugün" : fark === 1 ? "yarın" : d.getDate() + " " + AYLAR[d.getMonth()] + " " + GUN_UZUN[d.getDay()];
  const ne = {"Montaj":"montaj", "Teslimat":"teslimat", "Ölçü / keşif":"ölçü almak", "Servis":"servis"}[r.tur] || "montaj";
  return sablonDoldur(mesajSablonu("randevu"), {ad:m.ad || "", is:ie.baslik, gun, saat:r.saat ? " saat " + r.saat + " civarında" : "", ne, adres:ie.adres ? "\nAdres: " + ie.adres : "", firma:FIRMA});
}
EYLEM.randevuHatirlat = (el, arg) => {
  const [isId, rid] = arg.split("|"), ie = bul("is_emirleri", isId), r = ie && ie.montaj.find(x => x.id === rid); if(!r) return;
  const m = bul("musteriler", ie.musteriId) || {};
  waPencere({tel:m.telefon, ad:m.ad, isEmriId:ie.id, sablonlar:[{ad:"Randevu hatırlatma", metin:randevuMesaji(ie, r)}], gonderildi:() => {
    const g = bul("is_emirleri", isId);
    Depo.kaydet("is_emirleri", Object.assign({}, g, {montaj:g.montaj.map(x => x.id === rid ? Object.assign({}, x, {hatirlatildi:true}) : x)})).then(() => sessizCiz()).catch(() => {});
  }});
};
function isRandevuKarti(ie){
  const l = (ie.montaj || []).map(r => ({ie, r}));
  if(!l.length && !yetki.yonetici) return '';
  return '<div class="kart"><div class="kart-baslik"><span>Montaj / teslimat randevuları</span>' + (yetki.yonetici ? '<button class="baglanti" style="margin:0" data-is="randevuAc" data-arg="' + ie.id + '|">+ Randevu ver</button>' : '') + '</div>' +
    (l.length ? '<div class="randevu-liste">' + l.map(x => '<div class="randevu-tarih">' + esc(GUN_UZUN[tarihOku(x.r.tarih).getDay()] + ", " + tarihYaz(x.r.tarih)) + '</div>' + randevuKarti(x, {kisa:true})).join("") + '</div>' :
      '<div class="alt-bilgi">Henüz randevu yok. Montaj günü verince takvimde görünür, çakışmalar uyarılır.</div>') + '</div>';
}

function kesimKarti(ie){
  const p = (ie.kesim && ie.kesim.parcalar) || [];
  if(!p.length) return '<div class="kart yazdirma"><div class="kart-baslik"><span>Kesim listesi</span><button class="baglanti" style="margin:0" data-git="kesim/' + ie.id + '">Oluştur</button></div>' +
    '<div class="alt-bilgi">Parçaları girin veya sipariş kalemlerinden üretin; kaç plaka gerektiği, fire ve atölye kesim planı çıkar.</div></div>';
  const s = Object.values(kesimHesapla(p, ie.kesim));
  return '<div class="kart"><div class="kart-baslik"><span>Kesim listesi</span><button class="baglanti" style="margin:0" data-git="kesim/' + ie.id + '">Aç / yazdır</button></div>' +
    s.filter(x => x.plakalar.length).map(x => bilgiSatir(esc(x.m.ad), x.plakalar.length + ' plaka · %' + Math.round(100 - x.kullanim) + ' fire')).join("") +
    '<div class="alt-bilgi">' + p.length + ' parça satırı · ' + miktarYaz(Math.round(s.reduce((t, x) => t + x.bant, 0) * 10) / 10) + ' m kenar bandı</div></div>';
}

/* ================= USTA EKRANI ================= */
function ekranUstaAna(){
  const bg = bugun(), b = benimAdim(), d = new Date();
  const acik = veri.is_emirleri.filter(ie => ac(ie) && ie.durum !== "Teklif");
  const bugunku = randevular().filter(x => x.r.tarih === bg && x.ie.durum !== "İptal" && (!b || bendeMi(x.ie, x.r))).sort((x, y) => (x.r.saat || "") < (y.r.saat || "") ? -1 : 1);
  const yaklasan = randevular().filter(x => x.r.tarih > bg && x.r.tarih <= gunEkle(bg, 7) && !x.r.tamam && x.ie.durum !== "İptal" && (!b || bendeMi(x.ie, x.r))).sort((x, y) => (x.r.tarih + x.r.saat) < (y.r.tarih + y.r.saat) ? -1 : 1);
  const benim = acik.filter(ie => !b || bendeMi(ie) || ie.montaj.some(r => bendeMi(ie, r))).sort((x, y) => ((x.teslimTarihi || "9999") < (y.teslimTarihi || "9999") ? -1 : 1));
  const diger = acik.filter(ie => benim.indexOf(ie) < 0);
  const randevuBuyuk = x => {
    const {ie, r} = x, m = bul("musteriler", ie.musteriId) || {};
    return '<div class="usta-kart' + (r.tamam ? ' tamam' : '') + '" style="--renk:' + (RANDEVU_RENK[r.tur] || "var(--ana)") + '"><div class="usta-saat"><b>' + esc(r.saat || "Tüm gün") + '</b><span>' + esc(r.tur) + (r.tamam ? ' ✓' : '') + '</span></div>' +
      '<div class="usta-baslik" data-git="is/' + ie.id + '">' + esc(ie.baslik) + ' <span>' + esc(ie.no) + '</span></div><div class="usta-alt">' + esc(m.ad || "") + (ie.adres ? '<br>' + esc(ie.adres) : '') + '</div>' +
      (r.not ? '<div class="usta-not">' + esc(r.not) + '</div>' : '') +
      '<div class="usta-dugmeler">' + (ie.adres ? '<a class="buton ikincil" href="' + haritaLink(ie.adres) + '" target="_blank" rel="noopener">' + ik("konum") + 'Yol tarifi</a>' : '') +
      (m.telefon ? '<a class="buton ikincil" href="tel:' + esc(m.telefon.replace(/[^\d+]/g, "")) + '">' + ik("telefon") + 'Ara</a>' : '') +
      '<button class="buton ikincil" data-is="sesliNot" data-arg="' + ie.id + '">' + ik("mikrofon") + 'Sesli not</button>' +
      (r.tamam ? '' : '<button class="buton" data-is="randevuBitti" data-arg="' + ie.id + '|' + r.id + '">' + ik("tamam") + 'Bitti</button>') + '</div></div>';
  };
  const isBuyuk = ie => {
    const as = ie.asamalar, yap = as.filter(a => a.tamam).length, sira = as.findIndex(a => !a.tamam), gec = ie.teslimTarihi && ie.teslimTarihi < bg;
    return '<div class="usta-kart"><div class="usta-baslik" data-git="is/' + ie.id + '">' + esc(ie.baslik) + ' <span>' + esc(ie.no) + '</span>' + (ie.oncelik === "Acil" ? ' <span class="etiket-rozet d-kirmizi">Acil</span>' : '') + '</div>' +
      '<div class="usta-alt">' + esc(cariAdi(ie.musteriId)) + (ie.teslimTarihi ? ' · <span' + (gec ? ' style="color:#b91c1c"' : '') + '>' + (gec ? "⚠ Gecikti: " : "Teslim: ") + tarihYaz(ie.teslimTarihi, true) + '</span>' : '') + '</div>' +
      (as.length ? '<div class="ilerleme" style="margin-top:10px"><i style="width:' + Math.round(yap / as.length * 100) + '%"></i></div><div class="usta-alt">' + yap + '/' + as.length + ' aşama' + (sira >= 0 ? ' · sıradaki: <b>' + esc(as[sira].ad) + '</b>' : ' · hepsi bitti') + '</div>' : '') +
      '<div class="usta-dugmeler">' + (sira >= 0 ? '<button class="buton" data-is="asamaDegis" data-arg="' + ie.id + '|' + sira + '">' + ik("tamam") + esc(as[sira].ad) + ' bitti</button>' : '') +
      '<button class="buton ikincil" data-is="sesliNot" data-arg="' + ie.id + '">' + ik("mikrofon") + 'Sesli not</button>' +
      '<button class="buton ikincil" data-git="is/' + ie.id + '">' + ik("kamera") + 'Fotoğraf / ayrıntı</button></div></div>';
  };
  const html = '<div class="kart usta-selam"><div><div class="kart-baslik">' + GUN_UZUN[d.getDay()] + ', ' + d.getDate() + ' ' + AYLAR[d.getMonth()] + '</div>' +
      '<div style="font-size:20px;font-weight:600">Merhaba ' + esc(yetki.ad || kullaniciAdi()) + '</div>' +
      '<div class="alt-bilgi">' + (bugunku.length ? 'Bugün ' + bugunku.length + ' randevun var' : 'Bugün randevun yok') + ' · ' + benim.length + ' açık işin var</div></div>' +
      '<button class="ikon-buton" data-git="takvim" aria-label="Takvim">' + ik("takvim") + '</button></div>' +
    bolum(ik("takvim") + ' Bugün') + (bugunku.length ? bugunku.map(randevuBuyuk).join("") : '<div class="kart">' + bos("takvim", "Bugün için randevu yok.") + '</div>') +
    bolum(ik("is") + ' İşlerim (' + benim.length + ')') + (benim.length ? benim.map(isBuyuk).join("") : '<div class="kart">' + bos("is", "Sana atanmış açık iş yok.") + '</div>') +
    (yaklasan.length ? bolum("Önümüzdeki 7 gün") + '<div class="kart liste-kart">' + yaklasan.map(x => '<button class="satir" data-git="is/' + x.ie.id + '"><span class="rozet r-gri">' + ik("takvim") + '</span><span class="orta"><div class="s1">' +
      esc(GUN_UZUN[tarihOku(x.r.tarih).getDay()] + " " + (x.r.saat || "") + " · " + x.r.tur) + '</div><div class="s2">' + esc(x.ie.no + " " + x.ie.baslik + " · " + cariAdi(x.ie.musteriId)) + '</div></span></button>').join("") + '</div>' : '') +
    (diger.length ? '<details class="kart liste-kart" style="padding:4px 14px"><summary style="padding:10px 0;cursor:pointer;font-weight:500">Diğer açık işler (' + diger.length + ')</summary>' + diger.map(ie => isSatir(ie)).join("") + '</details>' : '');
  return {baslik:FIRMA, html};
}
EYLEM.randevuBitti = (el, arg) => {
  const [isId, rid] = arg.split("|"), ie = bul("is_emirleri", isId), r = ie && ie.montaj.find(x => x.id === rid); if(!r) return;
  islem(el, async () => {
    await Depo.kaydet("is_emirleri", Object.assign({}, ie, {montaj:ie.montaj.map(x => x.id === rid ? Object.assign({}, x, {tamam:true}) : x)}));
    await notEkle(isId, r.tur + " tamamlandı"); bildir(r.tur + " tamamlandı"); ciz();
  });
};

/* ================= SESLE NOT ================= */
// Tarayıcının konuşma tanıma özelliği (Chrome, Edge, Safari). Ses telefondan çıkmaz; yazıya çevirme tarayıcıda / cihaz servisinde yapılır.
const SesTanima = window.SpeechRecognition || window.webkitSpeechRecognition;
let sesAktif = null;
function sesleYaz(kutu, dugme){
  if(sesAktif){ sesAktif.stop(); return; }
  if(!SesTanima) return uyar("Bu tarayıcı sesle yazmayı desteklemiyor", "Telefon klavyesindeki mikrofon tuşuna basarak da konuşarak yazabilirsiniz. Chrome veya Safari'de bu düğme çalışır.");
  const t = new SesTanima(); t.lang = "tr-TR"; t.continuous = true; t.interimResults = true;
  const bas = kutu.value ? kutu.value.replace(/\s*$/, " ") : "", eskiYazi = dugme.innerHTML;
  let kesin = "";
  t.onresult = e => {
    let ara = "";
    for(let i = e.resultIndex; i < e.results.length; i++){ if(e.results[i].isFinal) kesin += e.results[i][0].transcript + " "; else ara += e.results[i][0].transcript; }
    kutu.value = bas + kesin + ara;
  };
  t.onerror = e => { if(e.error === "not-allowed" || e.error === "service-not-allowed") uyar("Mikrofon izni verilmedi", "Tarayıcının site ayarlarından mikrofona izin verin."); else if(e.error !== "no-speech" && e.error !== "aborted") bildir("Ses tanınamadı: " + e.error); };
  t.onend = () => { sesAktif = null; dugme.classList.remove("dinliyor"); dugme.innerHTML = eskiYazi; kutu.value = kutu.value.trim(); };
  sesAktif = t; t.start();
  dugme.classList.add("dinliyor"); dugme.innerHTML = ik("mikrofon") + "Dinliyorum… bitirmek için dokunun";
}
EYLEM.sesleNot = btn => { const k = document.getElementById("yeniNot"); if(k) sesleYaz(k, btn); };
EYLEM.sesliNot = (el, isId) => {
  const ie = bul("is_emirleri", isId); if(!ie) return;
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:480px"><p>Sesli not</p><div class="alt-bilgi">' + esc(ie.no + " · " + ie.baslik) + '</div>' +
    '<button class="buton ikincil ses-dugme" data-c="ses">' + ik("mikrofon") + 'Konuşmaya başla</button>' +
    '<textarea id="snMetin" class="kutu" style="min-height:120px;margin-top:10px" maxlength="1000" placeholder="Konuştuklarınız burada yazıya dönüşür; düzeltebilirsiniz."></textarea>' +
    '<div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Notu kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if(!b){ if(e.target === p){ if(sesAktif) sesAktif.stop(); p.remove(); } return; }
    const c = b.getAttribute("data-c");
    if(c === "ses") return sesleYaz(p.querySelector("#snMetin"), b);
    if(sesAktif) sesAktif.stop();
    if(c === "hayir") return p.remove();
    const t = p.querySelector("#snMetin").value.trim(); if(!t) return;
    islem(b, async () => { await notEkle(isId, t, "not"); p.remove(); bildir("Not eklendi"); ciz(); });
  });
  document.body.appendChild(p);
  if(SesTanima) sesleYaz(p.querySelector("#snMetin"), p.querySelector(".ses-dugme"));
};

/* ================= GENEL ARAMA ================= */
// Türkçe harfleri sadeleştirir: "Güneş" ile "gunes" eşleşir
const sade = s => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşüâî]/g, c => ({ç:"c", ğ:"g", ı:"i", ö:"o", ş:"s", ü:"u", â:"a", î:"i"}[c]));
function aramaSonuclari(q){
  const s = sade(q).trim(), rakam = q.replace(/\D/g, ""), Y = yetki.yonetici;
  if(s.length < 2) return [];
  const kelimeler = s.split(/\s+/), uyar_ = (...alanlar) => { const m = sade(alanlar.join(" ")); return kelimeler.every(k => m.indexOf(k) >= 0); };
  const telUyar = t => rakam.length >= 4 && String(t || "").replace(/\D/g, "").indexOf(rakam.replace(/^0/, "")) >= 0;
  const g = [];
  const ekle = (baslik, l) => { if(l.length) g.push({baslik, l:l.slice(0, 8), fazla:l.length - 8}); };
  if(Y) ekle("Cariler", veri.musteriler.filter(m => uyar_(m.ad, m.adres, m.vergiNo) || telUyar(m.telefon)).map(m => ({yer:"cari/" + m.id, ikon:"kisi", s1:m.ad, s2:[m.tip === "tedarikci" ? "Tedarikçi" : "Müşteri", m.telefon].filter(Boolean).join(" · ")})));
  ekle("İş emirleri", veri.is_emirleri.filter(ie => uyar_(ie.no, ie.baslik, ie.adres, ie.sorumlu, ie.kategori, cariAdi(ie.musteriId), ie.kalemler.map(k => k.ad).join(" ")) || telUyar((bul("musteriler", ie.musteriId) || {}).telefon))
    .sort((a, b) => b.olusma - a.olusma).map(ie => ({yer:"is/" + ie.id, ikon:"is", s1:ie.no + " · " + ie.baslik, s2:[cariAdi(ie.musteriId), ie.durum].join(" · ")})));
  if(Y) ekle("Faturalar", veri.faturalar.filter(f => uyar_(f.no, cariAdi(f.musteriId), f.aciklama) || (rakam && String(Math.round(f.toplam)) === rakam)).sort((a, b) => a.tarih < b.tarih ? 1 : -1)
    .map(f => ({yer:"fatura/" + f.id, ikon:"fatura", s1:f.no + " · " + cariAdi(f.musteriId), s2:(f.tur === "satis" ? "Satış" : "Alış") + " · " + tarihYaz(f.tarih, true) + " · " + para(f.toplam)})));
  ekle("Katalog", veri.katalog.filter(p => uyar_(p.baslik, p.kategori, p.malzeme, p.aciklama)).map(p => ({yer:"proje/" + p.id, ikon:"katalog", s1:p.baslik, s2:p.kategori})));
  if(Y) ekle("Personel", veri.personel.filter(p => uyar_(p.ad, p.gorev) || telUyar(p.telefon)).map(p => ({yer:"personel/" + p.id, ikon:"kisi", s1:p.ad, s2:p.gorev || ""})));
  if(Y) ekle("Kasa", veri.hareketler.filter(h => h.tur !== "borc" && (uyar_(h.aciklama, h.kategori, cariAdi(h.musteriId)) || (rakam.length >= 2 && String(Math.round(h.tutar)) === rakam))).sort(tarihSira)
    .map(h => ({yer:"kayit/" + h.id, ikon:h.tur === "giris" ? "asagi" : "yukari", s1:(h.tur === "giris" ? "+" : "−") + para(h.tutar) + " · " + (h.kategori || ""), s2:[tarihYaz(h.tarih, true), cariAdi(h.musteriId), h.aciklama].filter(Boolean).join(" · ")})));
  if(Y) ekle("Çek / senet", veri.cekler.filter(c => uyar_(c.no, c.banka, c.kesideci, cariAdi(c.musteriId)) || (rakam.length >= 2 && String(Math.round(c.tutar)) === rakam))
    .map(c => ({yer:"cekler/" + c.id, ikon:"kasa", s1:(c.belge === "senet" ? "Senet " : "Çek ") + (c.no || "") + " · " + para(c.tutar), s2:[cariAdi(c.musteriId), "vade " + tarihYaz(c.vade, true), CEK_DURUM[c.durum]].filter(Boolean).join(" · ")})));
  if(Y) ekle("Malzeme", malzemeListesi().filter(m => uyar_(m.ad)).map(m => ({yer:"stok", ikon:"koli", s1:m.ad, s2:"Stokta " + miktarYaz(stokMiktar(m.id)) + " " + m.birim})));
  return g;
}
function aramaAc(){
  if(document.querySelector(".arama-perde")) return;
  const p = document.createElement("div"); p.className = "perde arama-perde";
  p.innerHTML = '<div class="arama-kutu"><div class="arama-ust">' + ik("ara") + '<input id="genelAra" placeholder="Müşteri, telefon, iş emri no, fatura, katalog…" autocomplete="off" enterkeyhint="search"><button data-c="kapat" aria-label="Kapat">' + ik("x") + '</button></div>' +
    '<div class="arama-sonuc"><div class="alt-bilgi" style="padding:14px">En az 2 harf yazın. Telefonun son 4 hanesiyle de arayabilirsiniz.</div></div></div>';
  const girdi = p.querySelector("input"), kutu = p.querySelector(".arama-sonuc");
  let secili = 0, duz = [];
  const goster = () => {
    const g = aramaSonuclari(girdi.value); duz = g.flatMap(x => x.l); secili = Math.min(secili, Math.max(0, duz.length - 1));
    let i = 0;
    kutu.innerHTML = !girdi.value.trim() || girdi.value.trim().length < 2 ? '<div class="alt-bilgi" style="padding:14px">En az 2 harf yazın. Telefonun son 4 hanesiyle de arayabilirsiniz.</div>' :
      g.length ? g.map(x => '<div class="arama-grup">' + esc(x.baslik) + (x.fazla > 0 ? ' <span>+' + x.fazla + ' daha</span>' : '') + '</div>' + x.l.map(s => '<button class="satir' + (i === secili ? ' secili' : '') + '" data-yer="' + esc(s.yer) + '" data-n="' + (i++) + '"><span class="rozet r-gri">' + ik(s.ikon) + '</span>' +
        '<span class="orta"><div class="s1">' + esc(s.s1) + '</div><div class="s2">' + esc(s.s2 || "") + '</div></span></button>').join("")).join("") : bos("ara", "Sonuç bulunamadı.");
  };
  const ac_ = yer => { p.remove(); git(yer); };
  girdi.addEventListener("input", () => { secili = 0; goster(); });
  girdi.addEventListener("keydown", e => {
    if(e.key === "Escape") return p.remove();
    if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); secili = Math.max(0, Math.min(duz.length - 1, secili + (e.key === "ArrowDown" ? 1 : -1))); goster();
      const s = kutu.querySelector(".secili"); if(s) s.scrollIntoView({block:"nearest"}); }
    if(e.key === "Enter" && duz[secili]) ac_(duz[secili].yer);
  });
  p.addEventListener("click", e => {
    const s = e.target.closest("[data-yer]"); if(s) return ac_(s.getAttribute("data-yer"));
    if(e.target === p || e.target.closest("[data-c]")) p.remove();
  });
  document.body.appendChild(p); girdi.focus();
}
EYLEM.aramaAc = () => aramaAc();
document.addEventListener("keydown", e => {
  if(!hazir) return;
  const yaziyor = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName);
  if(((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !yaziyor)){ e.preventDefault(); aramaAc(); }
});
