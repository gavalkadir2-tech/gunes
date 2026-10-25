"use strict";
// Güneş Mobilya — is emirleri
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= İŞ EMİRLERİ ================= */
const BUCKET = "dosyalar";
let ASAMALAR = ["Ölçü / Keşif", "Kesim", "Kenar bantlama", "Montaj / İskelet", "Boya / Cila", "Döşeme", "Paketleme", "Teslimat / Kurulum"];
const ONCELIK = ["Normal", "Acil"];
const zamanYaz = ms => { const d = new Date(ms); return d.getDate() + " " + AYLAR[d.getMonth()] + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
const isNotlari = id => veri.is_notlari.filter(n => n.isEmriId === id).sort((a, b) => b.olusma - a.olusma);
const isDosyalari = id => veri.dosyalar.filter(d => d.isEmriId === id).sort((a, b) => a.olusma - b.olusma);
const dosyaTuru = d => /^image\//.test(d.tur) ? "g" : /^video\//.test(d.tur) ? "v" : "d";
const bosKalem = () => ({ad:"", olcu:"", renk:"", adet:1});
// Notlar sadece eklenir (üst üste yazma sorunu olmasın diye ayrı tablo).
const notEkle = (ieId, metin, tur) => Depo.kaydet("is_notlari", {id:yeniId(), isEmriId:ieId, metin, tur:tur || "islem", yazan:kullaniciAdi(), olusma:Date.now()});

function ekranIsler(){
  const f = filtre.is;
  const liste = veri.is_emirleri.filter(ie => f === "hepsi" || (f === "teslim" ? ie.durum === "Teslim edildi" : f === "acil" ? ac(ie) && ie.oncelik === "Acil" : ac(ie)));
  const sayac = {}; veri.is_emirleri.forEach(ie => { sayac[ie.durum] = (sayac[ie.durum] || 0) + 1; });
  const html = '<div class="izgara dort">' + ["Sipariş alındı", "Üretimde", "Hazır", "Teklif"].map(d =>
      '<div class="kart ozet"><div class="kart-baslik">' + d + '</div><div class="deger">' + (sayac[d] || 0) + '</div></div>').join("") + '</div>' +
    '<div class="ust-arac">' + filtreButonlari("is", [["acik","Açık işler"], ["acil","Acil"], ["teslim","Teslim edilenler"], ["hepsi","Hepsi"]]) +
    '<div class="buton-sira" style="margin:0"><button class="buton kucuk ikincil" data-git="kapasite">' + ik("grafik") + 'Atölye yükü</button>' +
    (yetki.yonetici ? '<button class="buton kucuk" data-git="is-form">' + ik("arti") + 'Yeni iş emri</button>' : '') + '</div></div>' +
    listeArac("isler", isSiralari()) +
    (veri.is_emirleri.length > 6 ? '<div class="ara">' + ik("ara") + '<input id="ara" class="kutu" placeholder="İş, müşteri veya numara ara…" value="' + esc(aramaYazi) + '"></div>' : '') +
    '<div class="kart liste-kart" id="isListe">' + isListesi(liste) + '</div>';
  return {baslik:"İş Emirleri", html, sonra(){
    const a = document.getElementById("ara");
    if(a) a.addEventListener("input", () => { aramaYazi = a.value; document.getElementById("isListe").innerHTML = isListesi(liste); });
  }};
}
const isSiralari = () => Object.assign({teslim:["Teslim tarihi (yakın)", kiyas(ie => ie.teslimTarihi || "9999")], yeni:["En yeni", kiyas(ie => ie.olusma, true)], eski:["En eski", kiyas(ie => ie.olusma)],
  no:["İş no", kiyas(ie => ie.no, true)], musteri:["Müşteri (A–Z)", kiyas(ie => cariAdi(ie.musteriId))], durum:["Durum", kiyas(ie => DURUMLAR.indexOf(ie.durum))]},
  yetki.yonetici ? {tutar:["Tutar (yüksek)", kiyas(ie => Number(ie.tutar) || 0, true)]} : {});
function isListesi(liste){
  if(!liste.length) return bos("is", "Burada iş emri yok.");
  const q = aramaYazi.toLocaleLowerCase("tr");
  const h = listeHazirla("isler", isSiralari(), liste.filter(ie => !q || (ie.no + " " + ie.baslik + " " + cariAdi(ie.musteriId) + " " + ie.sorumlu).toLocaleLowerCase("tr").indexOf(q) >= 0));
  return h.toplam ? h.l.map(ie => isSatir(ie)).join("") + dahaFazla("isler", h) : bos("ara", "Bulunamadı.");
}

/* --- İş emri formu --- */
function ikalemHtml(k, i){
  return '<div class="kalem" data-i="' + i + '"><input class="kutu k-ad" maxlength="120" placeholder="Ürün (örn: Gardırop, TV ünitesi, yatak başlığı)" value="' + esc(k.ad) + '">' +
    '<div class="ikalem-alan"><label>Ölçü<input class="kutu k-olcu" maxlength="60" placeholder="220x240x60" value="' + esc(k.olcu) + '"></label>' +
    '<label>Renk / malzeme<input class="kutu k-renk" maxlength="60" placeholder="Ceviz, beyaz mat…" value="' + esc(k.renk) + '"></label>' +
    '<label>Adet<input class="kutu k-adet" inputmode="numeric" value="' + esc(k.adet) + '"></label>' +
    '<label>Birim fiyat<input class="kutu k-fiyat" inputmode="decimal" placeholder="KDV hariç" value="' + sayiYaz(k.fiyat) + '"></label>' +
    '<button type="button" class="ikon-buton" data-is="ikalemSil" data-arg="' + i + '" aria-label="Kalemi sil">' + ik("x") + '</button></div>' +
    '<div class="kalem-alt" style="justify-content:space-between;align-items:center"><button type="button" class="baglanti" data-is="kalemHesap" data-arg="' + i + '">' + ik("kasa") + ' Malzemeden hesapla</button>' +
    '<span class="k-tutar">' + (k.fiyat ? 'Tutar: <b style="color:var(--yazi)">' + para((Number(k.adet) || 0) * k.fiyat) + '</b>' : '') + '</span></div></div>';
}
function ikalemleriCiz(){ document.getElementById("ikalemler").innerHTML = form.ikalemler.map(ikalemHtml).join(""); isToplamGuncelle(); }
EYLEM.ikalemEkle = () => { form.ikalemler.push(bosKalem()); ikalemleriCiz(); const s = document.querySelectorAll(".k-ad"); s[s.length - 1].focus(); };
EYLEM.ikalemSil = (el, i) => { form.ikalemler.splice(Number(i), 1); if(!form.ikalemler.length) form.ikalemler.push(bosKalem()); ikalemleriCiz(); };
// Kalem fiyatları KDV hariçtir; indirim KDV'den önce düşülür.
// Tüm fiyatlar KDV hariçtir: kalem fiyatı varsa kalemlerin toplamı, yoksa elle yazılan fiyat (t.fiyat) esas alınır;
// indirim düşülür, seçilen KDV oranı üstüne eklenir.
function isHesap(kalemler, t){
  const kalemli = fiyatliMi(kalemler);
  const ara = yuvarla(kalemli ? kalemler.reduce((s, k) => s + (Number(k.adet) || 0) * (k.fiyat || 0), 0) : (Number(t.fiyat) || 0));
  const indirim = Math.min(yuvarla(Number(t.indirim) || 0), ara), net = yuvarla(ara - indirim);
  const kdvOran = t.kdv == null ? varsayilanKdv() : Number(t.kdv), kdv = yuvarla(net * kdvOran / 100);
  const maliyet = yuvarla(kalemler.reduce((s, k) => s + (Number(k.adet) || 0) * (k.maliyet || 0), 0));
  return {ara, indirim, net, kdvOran, kdv, toplam:yuvarla(net + kdv), maliyet, kalemli};
}
const fiyatliMi = kalemler => kalemler.some(k => k.fiyat > 0);
// Eski kayıtlarda KDV hariç fiyat tutulmuyordu: toplam KDV dahil (varsayılan %20) sayılıp geri hesaplanır.
function isTeklif(ie){
  const t = Object.assign({}, ie.teklif);
  if(t.fiyat == null && !fiyatliMi(ie.kalemler) && ie.tutar) t.fiyat = yuvarla(ie.tutar / (1 + (t.kdv == null ? varsayilanKdv() : Number(t.kdv)) / 100));
  return t;
}
const kdvYazi = o => o ? "KDV (%" + o + ")" : "KDV yok";
const toplamHtml = h => bilgiSatir(h.kalemli ? "Ara toplam" : "Fiyat (KDV hariç)", para(h.ara)) + (h.indirim ? bilgiSatir("İndirim", "−" + para(h.indirim)) : '') +
  bilgiSatir(kdvYazi(h.kdvOran), para(h.kdv)) + '<div class="bilgi-satir genel"><span style="color:var(--yazi)">Genel toplam' + (h.kdvOran ? ' (KDV dahil)' : '') + '</span><b>' + para(h.toplam) + '</b></div>';
function isToplamGuncelle(){
  const kutu = document.getElementById("isToplam"); if(!kutu) return;
  const f = document.getElementById("fiyat"), not = document.getElementById("fiyatNot"), kalemli = fiyatliMi(form.ikalemler);
  if(kalemli){ f.readOnly = true; not.textContent = "Kalem fiyatlarının toplamı."; }
  else { if(f.readOnly){ f.value = ""; f.readOnly = false; } not.textContent = "Kalemlere birim fiyat yazarsanız toplam otomatik hesaplanır."; }
  const h = isHesap(form.ikalemler, {fiyat:sayiOku(f.value) || 0, indirim:sayiOku(deger("indirim")) || 0, kdv:Number(deger("kdvOran"))});
  if(kalemli) f.value = sayiYaz(h.ara);
  kutu.innerHTML = h.ara > 0 ? toplamHtml(h) +
    (h.maliyet ? '<div class="alt-bilgi">Tahmini maliyet <b>' + para(h.maliyet) + '</b> · tahmini kâr <b>' + para(h.net - h.maliyet) + '</b> (KDV hariç)</div>' : '') : '';
}
function asamaChipleri(){
  return form.asamaTum.map((a, i) => '<button type="button" class="secenek' + (form.asamaSecili.indexOf(a) >= 0 ? " secili" : "") + '" data-is="asamaSec" data-arg="' + i + '">' + esc(a) + '</button>').join("");
}
EYLEM.asamaSec = (el, i) => {
  const ad = form.asamaTum[Number(i)], k = form.asamaSecili.indexOf(ad);
  if(k >= 0) form.asamaSecili.splice(k, 1); else form.asamaSecili.push(ad);
  el.classList.toggle("secili");
};
EYLEM.asamaEkle = () => {
  const ad = deger("yeniAsama"); if(!ad) return;
  if(form.asamaTum.indexOf(ad) < 0) form.asamaTum.push(ad);
  if(form.asamaSecili.indexOf(ad) < 0) form.asamaSecili.push(ad);
  document.getElementById("asamaKutu").innerHTML = asamaChipleri(); document.getElementById("yeniAsama").value = "";
};
const gunSonra = n => { const d = new Date(); d.setDate(d.getDate() + n); return tarihStr(d); };
// sonra === "kesif": kayıttan sonra ölçü / keşif formu açılır
function ekranIsForm(id, cariId, projeId, sonra){
  const ie = bul("is_emirleri", id), m0 = bul("musteriler", ie ? ie.musteriId : cariId);
  const pr = ie ? null : bul("katalog", projeId), prFoto = pr && cevrimici ? projeGorselleri(pr.id).length : 0;
  const tk = ie ? isTeklif(ie) : {}, mevcut = ie ? ie.asamalar.map(a => a.ad) : ASAMALAR.slice();
  form = {durum: ie ? ie.durum : pr || sonra === "kesif" ? "Teklif" : "Sipariş alındı", oncelik: ie ? ie.oncelik : "Normal", odeme:"Nakit", ortak:benimOrtak(), projeId: pr ? pr.id : null,
    sonraKesif: !ie && sonra === "kesif",
    ikalemler: ie && ie.kalemler.length ? ie.kalemler.map(k => Object.assign({}, k)) :
      pr ? [{ad: pr.kategori ? pr.kategori + " — " + pr.baslik : pr.baslik, olcu:pr.olcu, renk:pr.malzeme, adet:1, katalogId:pr.id}] : [bosKalem()],
    asamaTum: ASAMALAR.concat(mevcut.filter(a => ASAMALAR.indexOf(a) < 0)), asamaSecili: mevcut, _surum: ie ? ie._surum : null};
  const kdv = tk.kdv == null ? varsayilanKdv() : tk.kdv, gecerlilik = ie ? tk.gecerlilik || "" : gunSonra(firma().gecerlilik);
  const ustalar = Array.from(new Set(veri.personel.filter(p => calisiyor(p, bugun())).map(p => p.ad).concat(veri.is_emirleri.map(i => i.sorumlu)).filter(Boolean)));
  const html = '<div class="kart form-kart">' +
    (pr ? '<div class="bilgi-kutu" style="margin:0 0 4px">Katalog projesinden: <b>' + esc(pr.baslik) + '</b>. Bilgiler aşağıya aktarıldı; fiyat isteğe bağlıdır, durum “Teklif” olarak açılır.</div>' : '') +
    (form.sonraKesif ? '<div class="bilgi-kutu" style="margin:0 0 4px">Önce müşteriyi ve işin adını yazın; kaydedince ölçü / keşif formu açılır.</div>' : '') +
    '<label class="etiket" for="cari"' + (pr || form.sonraKesif ? '' : ' style="margin-top:0"') + '>Müşteri</label>' + cariSecici(ie ? ie.musteriId : cariId, true, "musteri") +
    '<div class="alt-bilgi">Listede yoksa: <b data-git="cari-form/-/musteri" style="cursor:pointer;color:var(--borc)">+ Yeni müşteri ekle</b></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="baslik">İş başlığı</label><input id="baslik" class="kutu" maxlength="120" value="' + esc(ie ? ie.baslik : pr ? pr.baslik : "") + '" placeholder="Örn: Yatak odası takımı"></div>' +
    '<div><label class="etiket" for="isTuru">İş türü <span class="ist">(kârlılık raporu için)</span></label><select id="isTuru" class="kutu"><option value="">— Seçin —</option>' +
      isTurleri(ie ? ie.kategori : pr ? pr.kategori : "").map(t => '<option' + (t === (ie ? ie.kategori : pr ? pr.kategori : "") ? ' selected' : '') + '>' + esc(t) + '</option>').join("") + '</select></div></div>' +
    '<div class="form-bolum">Sipariş kalemleri</div><div id="ikalemler">' + form.ikalemler.map(ikalemHtml).join("") + '</div>' +
    '<div class="buton-sira" style="margin-top:10px"><button type="button" class="buton ikincil kucuk" style="margin:0" data-is="ikalemEkle">' + ik("arti") + 'Ürün ekle</button>' +
      '<button type="button" class="buton ikincil kucuk" style="margin:0" data-is="modulKalemEkle">' + ik("kup") + 'Modülden ekle</button></div>' +
    '<label class="etiket" for="aciklama">Notlar / özel istekler <span class="ist">(kumaş, kulp, montaj detayı…)</span></label><textarea id="aciklama" class="kutu" maxlength="2000">' + esc(ie ? ie.aciklama : pr ? pr.aciklama : "") + '</textarea>' +
    (prFoto ? '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px"><input type="checkbox" id="fotoKopyala" checked> Projenin ' + prFoto + ' fotoğrafını iş emrine ekle</label>' : '') +
    '<div class="form-bolum">Fiyat <span style="text-transform:none;font-weight:500">(KDV hariç yazın; KDV seçtiğiniz orana göre eklenir)</span></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="fiyat">' + (pr || form.durum === "Teklif" ? 'Teklif fiyatı' : 'Anlaşılan fiyat') + ' <span class="ist">(KDV hariç)</span></label>' +
      '<input id="fiyat" class="kutu" inputmode="decimal" value="' + (ie ? sayiYaz(tk.fiyat) : pr ? sayiYaz(pr.fiyat) : "") + '" placeholder="0 ₺"><div class="alt-bilgi" id="fiyatNot"></div></div>' +
    '<div>' + tarihAlani("gecerlilik", "Teklif geçerlilik tarihi", gecerlilik, true) + '</div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="indirim">İndirim <span class="ist">(₺, isteğe bağlı)</span></label><input id="indirim" class="kutu" inputmode="decimal" value="' + sayiYaz(tk.indirim) + '" placeholder="0 ₺"></div>' +
    '<div><label class="etiket" for="kdvOran">KDV</label><select id="kdvOran" class="kutu">' + KDV_ORANLARI.map(o => '<option value="' + o + '"' + (o === kdv ? ' selected' : '') + '>' + (o ? '%' + o + ' ekle' : 'KDV yok (%0)') + '</option>').join("") + '</select></div></div>' +
    '<div class="toplamlar" id="isToplam"></div>' +
    (eksikSutun.teklif && cevrimici ? '<div class="uyari" style="margin-top:12px">İndirim, KDV oranı ve geçerlilik tarihinin kaydedilmesi için Supabase\'de <b>supabase-guncelleme-4.sql</b> dosyasını çalıştırın.</div>' : '') +
    '<div class="form-bolum">Teslimat ve sorumlu</div>' +
    '<div class="iki-alan"><div>' + tarihAlani("teslim", "Teslim tarihi", ie ? ie.teslimTarihi : "", true) + '</div>' +
    '<div><label class="etiket" for="sorumlu">Sorumlu usta <span class="ist">(isteğe bağlı)</span></label><input id="sorumlu" class="kutu" list="ustalar" maxlength="60" value="' + esc(ie ? ie.sorumlu : "") + '">' +
    '<datalist id="ustalar">' + ustalar.map(u => '<option value="' + esc(u) + '">').join("") + '</datalist></div></div>' + isSureAlani(ie) +
    '<label class="etiket">Öncelik</label>' + secenekler("oncelik", ONCELIK, form.oncelik) +
    '<label class="etiket" for="adres">Teslimat / montaj adresi <span class="ist">(isteğe bağlı)</span></label><textarea id="adres" class="kutu" maxlength="300" style="min-height:64px">' + esc(ie ? ie.adres : (m0 ? m0.adres : "")) + '</textarea>' +
    '<div class="form-bolum">Üretim aşamaları</div><div class="alt-bilgi" style="margin:0 0 8px">Bu işte olacak aşamaları seçin; işlerken tek dokunuşla işaretlersiniz.</div>' +
    '<div class="secenekler" id="asamaKutu">' + asamaChipleri() + '</div>' +
    '<div class="buton-sira" style="flex-wrap:nowrap;margin-top:10px"><input id="yeniAsama" class="kutu" maxlength="40" placeholder="Başka aşama ekle"><button type="button" class="buton ikincil kucuk" data-is="asamaEkle">Ekle</button></div>' +
    '<label class="etiket">Durum</label>' + secenekler("durum", DURUMLAR, form.durum) +
    (ie ? '' : '<div class="form-bolum">Kapora</div><label class="etiket" for="kapora" style="margin-top:0">Alınan kapora / peşinat <span class="ist">(yoksa boş bırakın)</span></label>' +
      '<input id="kapora" class="kutu" inputmode="decimal" placeholder="0 ₺"><label class="etiket">Ödeme şekli</label>' + secenekler("odeme", ODEME, "Nakit") + ortakSecici(form.ortak, true)) +
    '<div class="hata" id="hata"></div><button class="buton" data-is="isKaydet" data-arg="' + (ie ? ie.id : "") + '">' + ik("tamam") + (form.sonraKesif ? 'Kaydet ve ölçüye geç' : 'Kaydet') + '</button></div>';
  return {baslik: ie ? "İş emrini düzenle" : form.sonraKesif ? "Yeni ölçü / keşif" : "Yeni iş emri", geri:true, html, sonra(){
    secenekBagla();
    const kap = document.getElementById("ikalemler");
    kap.addEventListener("input", e => {
      const d = e.target.closest(".kalem"); if(!d) return;
      const k = form.ikalemler[Number(d.getAttribute("data-i"))];
      k.ad = d.querySelector(".k-ad").value; k.olcu = d.querySelector(".k-olcu").value; k.renk = d.querySelector(".k-renk").value; k.adet = d.querySelector(".k-adet").value;
      k.fiyat = Math.max(0, sayiOku(d.querySelector(".k-fiyat").value) || 0);
      if(e.target.classList.contains("k-fiyat")) delete k.hesap;   // fiyat elle değiştiyse eski hesap geçersiz
      d.querySelector(".k-tutar").innerHTML = k.fiyat ? 'Tutar: <b style="color:var(--yazi)">' + para((Number(k.adet) || 0) * k.fiyat) + '</b>' : '';
      isToplamGuncelle();
    });
    document.getElementById("indirim").addEventListener("input", isToplamGuncelle);
    document.getElementById("fiyat").addEventListener("input", isToplamGuncelle);
    document.getElementById("kdvOran").addEventListener("change", isToplamGuncelle);
    isToplamGuncelle();
    ["uretimGun", "isTuru", "teslim"].forEach(x => { const e = document.getElementById(x); if(e) e.addEventListener(x === "uretimGun" ? "input" : "change", () => teslimOneriGuncelle(id)); });
    teslimOneriGuncelle(id);
    const c = document.getElementById("cari");
    c.addEventListener("change", () => { const m = bul("musteriler", c.value), a = document.getElementById("adres"); if(m && m.adres && !a.value.trim()) a.value = m.adres; });
    document.getElementById(ie || cariId ? "baslik" : "cari").focus();
  }};
}
EYLEM.isKaydet = (btn, id) => {
  const cari = deger("cari"), baslik = deger("baslik");
  if(!cari) return hataYaz("Lütfen müşteriyi seçin.");
  if(!baslik) return hataYaz("Lütfen işin başlığını yazın.");
  const fiyatYazi = deger("fiyat"), fiyat = fiyatYazi ? sayiOku(fiyatYazi) : 0;
  if(!(fiyat >= 0)) return hataYaz("Fiyatı kontrol edin.");
  const indirimYazi = deger("indirim"), indirim = indirimYazi ? sayiOku(indirimYazi) : 0;
  if(!(indirim >= 0)) return hataYaz("İndirim tutarını kontrol edin.");
  const kaporaYazi = deger("kapora"), kapora = kaporaYazi ? sayiOku(kaporaYazi) : 0;
  if(!(kapora >= 0)) return hataYaz("Kapora tutarını kontrol edin.");
  const eski = bul("is_emirleri", id);
  const kalemler = form.ikalemler.filter(k => k.ad.trim()).map(k => {
    const y = {ad:k.ad.trim(), olcu:String(k.olcu || "").trim(), renk:String(k.renk || "").trim(), adet:Math.max(1, Math.round(Number(k.adet)) || 1)};
    if(k.fiyat > 0) y.fiyat = yuvarla(k.fiyat);
    if(k.fiyat > 0 && k.maliyet > 0 && k.hesap) { y.maliyet = yuvarla(k.maliyet); y.hesap = k.hesap; }
    if(k.katalogId) y.katalogId = k.katalogId;
    if(k.modul) y.modul = k.modul;
    return y;
  });
  const kalemli = fiyatliMi(kalemler);
  const teklif = {fiyat: kalemli ? 0 : yuvarla(fiyat), indirim:yuvarla(indirim), kdv:Number(deger("kdvOran")), gecerlilik:deger("gecerlilik")};
  const h = isHesap(kalemler, teklif);
  if(indirim > h.ara) return hataYaz("İndirim, fiyattan büyük olamaz.");
  const pr = !id && bul("katalog", form.projeId), fotoKopyala = !!(pr && document.getElementById("fotoKopyala") && document.getElementById("fotoKopyala").checked);
  const eskiAs = eski ? eski.asamalar : [];
  const asamalar = form.asamaTum.filter(a => form.asamaSecili.indexOf(a) >= 0).map(a => ({ad:a, tamam: !!(eskiAs.find(x => x.ad === a) || {}).tamam}));
  const k = Object.assign(isAlanlari({}), eski || {}, {id: id || yeniId(), no: eski ? eski.no : siradakiNo(sistem().isOnEk, veri.is_emirleri), musteriId:cari, baslik, durum:form.durum, oncelik:form.oncelik, kategori:deger("isTuru"),
    sorumlu:deger("sorumlu"), adres:deger("adres"), kalemler, asamalar, teslimTarihi:deger("teslim") || null, tutar:h.toplam, uretimGun:Math.max(0, sayiOku(deger("uretimGun")) || 0) || null,
    aciklama:deger("aciklama"), teklif, kesif: eski ? eski.kesif : {}, olusma: eski ? eski.olusma : Date.now()});
  islem(btn, async () => {
    await Depo.kaydet("is_emirleri", Object.assign(k, form._surum != null ? {_surum:form._surum} : {}));
    if(!id) await notEkle(k.id, pr ? "Katalogdan teklif açıldı: " + pr.baslik : "İş emri açıldı");
    else if(eski.durum !== k.durum) await notEkle(k.id, "Durum: " + eski.durum + " → " + k.durum);
    if(fotoKopyala) await projeFotolariniKopyala(pr.id, k.id);
    if(kapora > 0) await Depo.kaydet("hareketler", {id:yeniId(), tur:"giris", tutar:yuvarla(kapora), kategori:"Kapora / Peşinat", odeme:form.odeme,
      musteriId:cari, isEmriId:k.id, faturaId:null, aciklama:baslik, tarih:bugun(), olusma:Date.now(), ortak:form.ortak || "", hedef:""});
    if(id){ bildir("Kaydedildi"); geri(); }
    else if(form.sonraKesif){ bildir("İş emri açıldı: " + k.no); history.replaceState(null, "", "#is/" + k.id); history.pushState(null, "", "#kesif/" + k.id); ciz(); }
    else { bildir("İş emri açıldı: " + k.no); history.replaceState(null, "", "#is/" + k.id); ciz(); }
  });
};

/* --- İş emri sayfası --- */
function galeriHtml(ieId){
  const dl = isDosyalari(ieId);
  if(!dl.length) return bos("kamera", "Henüz fotoğraf veya dosya yok.");
  return '<div class="galeri">' + dl.map(d => {
    const t = dosyaTuru(d), y = esc(d.yol), arg = ieId + "|" + d.id;
    if(t === "g") return '<button class="foto" data-is="dosyaAc" data-arg="' + arg + '"><img data-yol="' + y + '" loading="lazy" alt="' + esc(d.ad) + '"></button>';
    if(t === "v") return '<button class="foto" data-is="dosyaAc" data-arg="' + arg + '"><video data-yol="' + y + '" preload="metadata" muted playsinline></video><span class="oynat">' + ik("oynat") + '</span></button>';
    if(CAD_UZANTI.test(d.ad)) return '<button class="foto belge" data-is="cadIs" data-arg="' + arg + '">' + ik("kup") + '<span>' + esc(d.ad) + '</span><b style="color:var(--borc)">3B görüntüle</b></button>';
    return '<a class="foto belge" data-yol="' + y + '" target="_blank" rel="noopener" href="#">' + ik("fatura") + '<span>' + esc(d.ad) + '</span></a>';
  }).join("") + '</div>';
}
function ekranIs(id){
  const ie = bul("is_emirleri", id);
  if(!ie) return {baslik:"İş emri", geri:true, html:'<div class="kart">' + bos("is", "İş emri bulunamadı.") + '</div>'};
  const m = bul("musteriler", ie.musteriId) || {}, o = isOzet(id), cari = ie.musteriId;
  const faturalar = veri.faturalar.filter(f => f.isEmriId === id).sort(tarihSira);
  const hareketler = veri.hareketler.filter(h => h.isEmriId === id).sort(tarihSira);
  const gec = ac(ie) && ie.teslimTarihi && ie.teslimTarihi < bugun();
  const as = ie.asamalar, yap = as.filter(a => a.tamam).length, dl = isDosyalari(id), notlar = isNotlari(id), Y = yetki.yonetici;
  const html = '<div class="iki-sutun genis"><div>' +
    '<div class="kart"><div class="kart-baslik"><span>' + esc(ie.no) + (ie.oncelik === "Acil" ? ' <span class="etiket-rozet d-kirmizi">Acil</span>' : '') + '</span>' + durumRozet(ie.durum) + '</div>' +
      '<div style="font-size:18px;font-weight:600;margin:2px 0 6px">' + esc(ie.baslik) + '</div>' +
      bilgiSatir("Müşteri", Y ? '<button class="baglanti" data-git="cari/' + cari + '">' + esc(m.ad || "") + '</button>' : esc(m.ad || "")) +
      (m.telefon ? bilgiSatir("Telefon", '<a class="tel" style="margin:0" href="tel:' + esc(m.telefon.replace(/[^\d+]/g, "")) + '">' + esc(m.telefon) + '</a>') : '') +
      (ie.sorumlu ? bilgiSatir("Sorumlu usta", esc(ie.sorumlu)) : '') +
      (ie.teslimTarihi ? bilgiSatir("Teslim tarihi", '<span' + (gec ? ' style="color:#b91c1c"' : '') + '>' + (gec ? "⚠ Gecikti · " : "") + tarihYaz(ie.teslimTarihi) + '</span>') : '') +
      (ie.adres ? bilgiSatir("Teslimat adresi", esc(ie.adres)) : '') +
      (ie._degisme && ie._degistiren ? '<div class="alt-bilgi">Son değişiklik: ' + esc(kisiAdi(ie._degistiren) + " · " + tamZaman(ie._degisme)) + '</div>' : '') +
      (ie.aciklama ? '<div style="white-space:pre-wrap;font-size:14px;margin-top:10px;background:var(--hafif);border-radius:10px;padding:10px 12px">' + esc(ie.aciklama) + '</div>' : '') +
      '<div class="yazdirma"><label class="etiket">Durumu değiştir</label><div class="secenekler">' + DURUMLAR.map(d =>
        '<button class="secenek' + (d === ie.durum ? " secili" : "") + '" data-is="durumDegistir" data-arg="' + id + '|' + d + '">' + d + '</button>').join("") + '</div></div></div>' +
    (Y && ie.durum === "Teklif" ? teklifKutusu(ie) : '') +
    (ie.kalemler.length ? '<div class="kart liste-kart"><div class="kart-baslik" style="margin:12px 0 2px">Sipariş kalemleri</div>' + ie.kalemler.map(k =>
      '<div class="satir"><span class="orta"><div class="s1" style="white-space:normal">' + esc(k.ad) + '</div><div class="s2" style="white-space:normal">' + esc([k.olcu, k.renk].filter(Boolean).join(" · ")) +
        (k.katalogId && bul("katalog", k.katalogId) ? ' · <b data-git="proje/' + esc(k.katalogId) + '" style="cursor:pointer;color:var(--borc);font-weight:500">Katalogda gör</b>' : '') + '</div></span>' +
      '<span class="sag"><div class="tutar' + (k.fiyat && Y ? '' : ' t-soluk') + '">' + (k.fiyat && Y ? para(k.adet * k.fiyat) : '× ' + k.adet) + '</div>' +
        (k.fiyat && Y ? '<div class="s2">' + k.adet + ' × ' + para(k.fiyat) + '</div>' : '') + '</span></div>').join("") +
      ((() => { const h = isHesap(ie.kalemler, isTeklif(ie)); if(!(h.ara > 0) || !Y) return '';
        return '<div class="toplamlar" style="padding:4px 0 10px">' + toplamHtml(h) +
          (h.maliyet ? '<div class="alt-bilgi yazdirma">Malzeme hesabına göre tahmini maliyet <b>' + para(h.maliyet) + '</b> · tahmini kâr <b>' + para(h.net - h.maliyet) + '</b> (KDV hariç)</div>' : '') + '</div>'; })()) +
      '</div>' : '') +
    isRandevuKarti(ie) + kesimKarti(ie) + kesifKarti(ie) + (Y ? isMalzemeKarti(id) : '') +
    (as.length ? '<div class="kart"><div class="kart-baslik"><span>Üretim aşamaları</span><span>' + yap + '/' + as.length + '</span></div><div class="ilerleme"><i style="width:' + Math.round(yap / as.length * 100) + '%"></i></div>' +
      as.map((a, i) => '<button class="asama' + (a.tamam ? " tamam" : "") + '" data-is="asamaDegis" data-arg="' + id + '|' + i + '"><span class="kutucuk">' + (a.tamam ? ik("tamam") : "") + '</span><span class="ad">' + esc(a.ad) + '</span></button>').join("") + '</div>' : '') +
    (Y ? karlilikKarti(ie) : '') +
    '<div class="yazdirma">' + (Y ? '<div class="hizli" style="grid-template-columns:1fr 1fr">' +
      hizliButon("giris/" + cari + "/" + id, "r-giris", "asagi", "Tahsilat Al") + hizliButon("fatura-form/satis/" + cari + "/" + id, "r-borc", "fatura", "Satış Faturası") +
      hizliButon("cikis/-/" + id, "r-cikis", "yukari", "Gider Ekle") + hizliButon("fatura-form/alis/-/" + id, "r-gri", "fatura", "Alış Faturası") + '</div>' : '') +
    '<button class="buton ikincil" style="margin:0 0 12px" data-git="etiket/' + id + '">' + ik("yazdir") + 'QR etiket bas (paket / parça)</button>' +
    (ie.teslimTarihi && ac(ie) ? '<button class="buton ikincil" style="margin:0 0 12px" data-is="takvimIs" data-arg="' + id + '">' + ik("takvim") + 'Teslim tarihini telefon takvimine ekle</button>' : '') +
    (Y ? '<button class="buton wa-buton" style="margin-top:0" data-is="waIs" data-arg="' + id + '">' + ik("mesaj") + 'Müşteriye WhatsApp mesajı</button>' : '') +
    (ie.durum === "Teklif" || !Y ? '' : '<button class="buton ikincil" style="margin-top:12px" data-is="teklifYazdir" data-arg="' + id + '">' + ik("fatura") + 'Müşteriye fiyat teklifi yazdır / PDF</button>') +
    '<div class="buton-sira" style="margin:12px 0"><button class="buton ikincil" onclick="window.print()">' + ik("yazdir") + 'Yazdır</button>' +
    (Y ? '<button class="buton ikincil" data-git="is-form/' + id + '">' + ik("kalem") + 'Düzenle</button>' +
    '<button class="buton tehlike" data-is="isSil" data-arg="' + id + '">' + ik("sil") + 'Sil</button>' : '') + '</div></div>' +
    '</div><div>' +
    '<div class="kart"><div class="kart-baslik"><span>Fotoğraf, video ve dosyalar (' + dl.length + ')</span></div>' +
    (cevrimici ? '<div class="buton-sira yazdirma" style="margin-top:8px"><button class="buton ikincil kucuk" onclick="document.getElementById(\'kameraSec\').click()">' + ik("kamera") + 'Fotoğraf çek</button>' +
      '<button class="buton ikincil kucuk" onclick="document.getElementById(\'dosyaSec\').click()">' + ik("ataç") + 'Dosya / video ekle</button>' +
      (Y && dl.filter(d => dosyaTuru(d) === "g").length >= 2 ? '<button class="buton ikincil kucuk" data-git="oncesonra/' + id + '">' + ik("resim") + 'Önce / sonra görseli</button>' : '') + '</div>' +
      '<input type="file" id="kameraSec" accept="image/*" capture="environment" style="display:none" onchange="dosyaSecildi(this,\'' + id + '\')">' +
      '<input type="file" id="dosyaSec" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.txt" style="display:none" onchange="dosyaSecildi(this,\'' + id + '\')">'
      : '<div class="alt-bilgi">Dosya yüklemek için bulut bağlantısı gerekir.</div>') + galeriHtml(id) + '</div>' +
    '<div class="kart"><div class="kart-baslik"><span>Notlar ve geçmiş</span></div>' +
      '<div class="yazdirma"><textarea id="yeniNot" class="kutu" style="min-height:64px" maxlength="1000" placeholder="Not yazın (örn: Müşteri kumaşı değiştirmek istedi)"></textarea>' +
      '<div class="buton-sira" style="margin-top:8px"><button class="buton ikincil kucuk" style="margin:0" data-is="notKaydet" data-arg="' + id + '">' + ik("arti") + 'Not ekle</button>' +
      '<button class="buton ikincil kucuk" style="margin:0" data-is="sesleNot">' + ik("mikrofon") + 'Sesle yaz</button></div></div>' +
      (notlar.length ? notlar.map(n => '<div class="not-satir"><span class="nokta-ince' + (n.tur === "not" ? " koyu" : "") + '"></span><div style="flex:1;min-width:0"><div style="white-space:pre-wrap;word-break:break-word' +
        (n.tur === "not" ? '' : ';color:var(--soluk);font-size:14px') + '">' + esc(n.metin) + '</div><div style="color:var(--soluk);font-size:12px">' +
        esc([n.yazan, zamanYaz(n.olusma)].filter(Boolean).join(" · ")) + '</div></div></div>').join("") : '') + '</div>' +
    (Y ? bolum("Faturalar (" + faturalar.length + ")") + '<div class="kart liste-kart">' + (faturalar.length ? faturalar.map(f => faturaSatir(f)).join("") : bos("fatura", "Bu işe bağlı fatura yok.")) + '</div>' +
    bolum("Ödemeler ve giderler (" + hareketler.length + ")") + '<div class="kart liste-kart">' + (hareketler.length ? hareketler.map(h => hareketSatir(h)).join("") : bos("kasa", "Bu işe bağlı kasa hareketi yok.")) + '</div>' : '') +
    '</div></div>';
  return {baslik: ie.no + " · " + ie.baslik, geri:true, html, sonra: galeriDoldur};
}
function teklifKutusu(ie){
  const g = ie.teklif.gecerlilik, gecti = g && g < bugun();
  return '<div class="kart yazdirma" style="background:#fffbeb;border-color:#fde68a"><div class="kart-baslik"><span style="color:#92400e">Teklif aşamasında</span>' +
    (g ? '<span' + (gecti ? ' style="color:#b91c1c"' : '') + '>' + (gecti ? "⚠ Süresi geçti: " : "Geçerli: ") + tarihYaz(g) + '</span>' : '') + '</div>' +
    '<div class="alt-bilgi" style="margin-bottom:12px">Müşteri onaylayınca siparişe çevirin; isterseniz teklifteki kalemlerle satış faturası da hazırlanır.</div>' +
    '<div class="buton-sira"><button class="buton ikincil" data-is="teklifYazdir" data-arg="' + ie.id + '">' + ik("fatura") + 'Teklifi yazdır / PDF</button>' +
    '<button class="buton wa-buton" data-is="waTeklif" data-arg="' + ie.id + '">' + ik("mesaj") + 'WhatsApp ile gönder</button></div>' +
    '<button class="buton" style="background:var(--giris)" data-is="siparisCevir" data-arg="' + ie.id + '">' + ik("tamam") + 'Teklif onaylandı — siparişe çevir</button></div>';
}
EYLEM.waTeklif = (el, id) => {
  const ie = bul("is_emirleri", id); if(!ie) return;
  const m = bul("musteriler", ie.musteriId) || {}, s = waIsSablonlari(ie, m);
  waPencere({tel:m.telefon, ad:m.ad, isEmriId:id, sablonlar:s, varsayilan:s.findIndex(x => x.ad === "Fiyat teklifi")});
};
EYLEM.siparisCevir = (el, id) => {
  const ie = bul("is_emirleri", id); if(!ie) return;
  onayla("Teklif siparişe çevrilsin mi?", "Durum “Sipariş alındı” olur.", "Siparişe çevir", () => islem(null, async () => {
    await Depo.kaydet("is_emirleri", Object.assign({}, ie, {durum:"Sipariş alındı"}));
    await notEkle(id, "Teklif onaylandı, siparişe çevrildi");
    bildir("Sipariş alındı"); ciz();
    if(!veri.faturalar.some(f => f.isEmriId === id && f.tur === "satis"))
      onayla("Satış faturası da hazırlansın mı?", ie.tutar ? "Teklifteki kalemler, fiyatlar ve KDV faturaya aktarılır." : "Daha sonra iş emri sayfasından da hazırlayabilirsiniz.",
        "Fatura hazırla", () => git("fatura-form/satis/" + ie.musteriId + "/" + id), false);
  }), false);
};
EYLEM.durumDegistir = (el, arg) => {
  const [id, d] = arg.split("|"), ie = bul("is_emirleri", id);
  if(!ie || ie.durum === d) return;
  islem(null, async () => {
    await Depo.kaydet("is_emirleri", Object.assign({}, ie, {durum:d}));
    await notEkle(id, "Durum: " + ie.durum + " → " + d);
    bildir("Durum: " + d); ciz();
    if(WA_DURUM[d] > 0 && yetki.yonetici) onayla("Müşteriye WhatsApp ile haber verilsin mi?", "", "Mesaj hazırla", () => EYLEM.waIs(null, id), false);
  });
};
EYLEM.asamaDegis = (el, arg) => {
  const [id, i] = arg.split("|"), ie = bul("is_emirleri", id); if(!ie) return;
  const as = ie.asamalar.map(a => Object.assign({}, a)), a = as[Number(i)]; a.tamam = !a.tamam;
  islem(null, async () => {
    await Depo.kaydet("is_emirleri", Object.assign({}, ie, {asamalar:as}));
    await notEkle(id, (a.tamam ? "Aşama tamamlandı: " : "Aşama geri alındı: ") + a.ad); ciz();
  });
};
EYLEM.notKaydet = (btn, id) => {
  const t = deger("yeniNot"); if(!t) return;
  islem(btn, async () => { await notEkle(id, t, "not"); ciz(); });
};
EYLEM.isSil = (el, id) => {
  if(veri.faturalar.some(f => f.isEmriId === id) || veri.hareketler.some(h => h.isEmriId === id))
    return uyar("Bu iş emri silinemez", "İşe bağlı fatura veya ödeme var. İsterseniz durumunu “İptal” yapabilirsiniz.");
  onayla("İş emri silinsin mi?", "Notları, fotoğraf ve dosyalarıyla birlikte çöp kutusuna taşınır; " + sistem().copGun + " gün içinde geri yüklenebilir.", "Sil", () => islem(null, async () => {
    await Depo.sil("is_emirleri", id);
    bildir("İş emri çöp kutusuna taşındı"); git("isler");
  }));
};

/* --- Dosya yükleme / gösterme --- */
let yuklemeEl = null;
function yuklemeGoster(y){
  if(!yuklemeEl){ yuklemeEl = document.createElement("div"); yuklemeEl.className = "yukleme"; document.body.appendChild(yuklemeEl); }
  yuklemeEl.textContent = y;
}
function yuklemeKapat(){ if(yuklemeEl){ yuklemeEl.remove(); yuklemeEl = null; } }
// Fotoğrafları küçültür (telefon fotoğrafı 5 MB yerine ~300 KB olur); video ve belgeler olduğu gibi yüklenir.
async function gorselKucult(file, enFazla){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const fa = fotoAyar(); if(!enFazla && !fa.boyut) return file;   // Ayarlar → Yedek ve veri → Fotoğraf boyutu
  try{
    const bmp = await createImageBitmap(file, {imageOrientation:"from-image"});
    const oran = Math.min(1, (enFazla || fa.boyut) / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * oran); c.height = Math.round(bmp.height * oran);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    if(bmp.close) bmp.close();
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", fa.kalite));
    if(blob && (blob.size < file.size || oran < 1)) return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {type:"image/jpeg"});
  }catch(e){}
  return file;
}
async function dosyaSecildi(input, ieId){
  const liste = Array.from(input.files || []); input.value = "";
  if(!liste.length) return;
  let tamam = 0; const sorunlu = [];
  for(let i = 0; i < liste.length; i++){
    yuklemeGoster("Yükleniyor " + (i + 1) + "/" + liste.length + "…");
    let yuklenen = null;
    try{
      const f = await gorselKucult(liste[i]);
      const id = yeniId(), guvenli = f.name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80), anahtar = ieId + "/" + id + "_" + guvenli;
      const r = await sb.storage.from(BUCKET).upload(anahtar, f, {contentType: f.type || "application/octet-stream", upsert:false});
      if(r.error) throw r.error;
      yuklenen = anahtar;
      await Depo.kaydet("dosyalar", {id, isEmriId:ieId, ad:f.name, tur:f.type || "", boyut:f.size, yol:anahtar, yukleyen:kullaniciAdi(), olusma:Date.now() + i});
      tamam++;
    }catch(e){
      if(yuklenen) sb.storage.from(BUCKET).remove([yuklenen]).catch(() => {});
      sorunlu.push(liste[i].name + " — " + hataMesaji(e));
    }
  }
  yuklemeKapat();
  if(tamam){ try{ await notEkle(ieId, tamam + " dosya eklendi"); }catch(e){} bildir(tamam + " dosya yüklendi"); }
  if(sorunlu.length) uyar("Bazı dosyalar yüklenemedi", sorunlu.join("; "));
  if(yol()[0] === "is") ciz();
}
const urlOnbellek = {};
async function urlleriGetir(dosyalar){
  const simdi = Date.now(), eksik = dosyalar.filter(d => !urlOnbellek[d.yol] || urlOnbellek[d.yol].bitis < simdi);
  if(!eksik.length || !sb) return;
  const r = await sb.storage.from(BUCKET).createSignedUrls(eksik.map(d => d.yol), 3600);
  if(!r.error) r.data.forEach(x => { if(x.signedUrl) urlOnbellek[x.path] = {url:x.signedUrl, bitis:simdi + 3300000}; });
}
function galeriDoldur(){
  const el = Array.from(document.querySelectorAll("[data-yol]"));
  if(!el.length) return;
  urlleriGetir(el.map(e => ({yol:e.getAttribute("data-yol")}))).then(() => el.forEach(e => {
    const u = urlOnbellek[e.getAttribute("data-yol")]; if(!u || !document.body.contains(e)) return;
    if(e.tagName === "A") e.href = u.url; else e.src = e.tagName === "VIDEO" ? u.url + "#t=0.1" : u.url;
  })).catch(() => {});
}
EYLEM.dosyaAc = (el, arg) => { const [ieId, id] = arg.split("|"); lightbox(ieId, id); };
function lightbox(ieId, id){
  const liste = isDosyalari(ieId).filter(d => dosyaTuru(d) !== "d");
  let i = Math.max(0, liste.findIndex(d => d.id === id));
  const p = document.createElement("div"); p.className = "lb";
  const goster = () => {
    const d = liste[i], u = (urlOnbellek[d.yol] || {}).url || "";
    p.innerHTML = '<div class="lb-bar"><span>' + (i + 1) + ' / ' + liste.length + ' · ' + esc(d.ad) + '</span><button data-k="kapat" aria-label="Kapat">' + ik("x") + '</button></div>' +
      '<div class="lb-orta"><button data-k="geri" aria-label="Önceki">' + ik("sol") + '</button>' +
      (dosyaTuru(d) === "v" ? '<video src="' + esc(u) + '" controls playsinline autoplay></video>' : '<img src="' + esc(u) + '" alt="">') +
      '<button data-k="ileri" aria-label="Sonraki">' + ik("sag") + '</button></div>' +
      '<div class="lb-bar"><button data-k="paylas">' + ik("mesaj") + 'WhatsApp / Paylaş</button><a href="' + esc(u) + '" download="' + esc(d.ad) + '" target="_blank" rel="noopener">' + ik("indir") + 'İndir</a><button data-k="sil">' + ik("sil") + 'Sil</button></div>';
  };
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-k]"); if(!b){ return; }
    const k = b.getAttribute("data-k");
    if(k === "kapat") p.remove();
    else if(k === "geri"){ i = (i + liste.length - 1) % liste.length; goster(); }
    else if(k === "ileri"){ i = (i + 1) % liste.length; goster(); }
    else if(k === "paylas") dosyaPaylas(ieId, liste[i]);
    else if(k === "sil"){
      const d = liste[i];
      onayla("Dosya silinsin mi?", d.ad + " — çöp kutusuna taşınır.", "Sil", () => islem(null, async () => {
        await Depo.sil("dosyalar", d.id); p.remove(); bildir("Dosya çöp kutusuna taşındı"); if(yol()[0] === "is") ciz();
      }));
    }
  });
  document.body.appendChild(p);
  urlleriGetir(liste).then(goster).catch(goster);
}
// Telefonda doğrudan WhatsApp'a (paylaşma menüsü) gönderir; olmazsa 7 gün geçerli bağlantı ekler.
async function dosyaPaylas(ieId, d){
  const ie = bul("is_emirleri", ieId), m = bul("musteriler", ie.musteriId) || {};
  try{
    await urlleriGetir([d]);
    const blob = await (await fetch(urlOnbellek[d.yol].url)).blob();
    const f = new File([blob], d.ad, {type: d.tur || blob.type});
    if(navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], text: FIRMA + " · " + ie.no + " " + ie.baslik}); return; }
  }catch(e){ if(e && e.name === "AbortError") return; }
  try{
    const r = await sb.storage.from(BUCKET).createSignedUrl(d.yol, 604800);
    if(r.error) throw r.error;
    waPencere({tel:m.telefon, ad:m.ad, isEmriId:ieId, sablonlar:[{ad:"Dosya bağlantısı", metin:"Merhaba " + (m.ad || "") + ", " + ie.no + " siparişinize ait dosya:\n" + r.data.signedUrl + "\n(Bağlantı 7 gün geçerlidir)\n\n" + FIRMA}]});
  }catch(e){ uyar("Paylaşılamadı", hataMesaji(e)); }
}
