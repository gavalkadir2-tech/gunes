"use strict";
// Güneş Mobilya — cek cevrimdisi efatura
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= ÇEK / SENET PORTFÖYÜ ================= */
// Alınan çek kasaya "Çek / Senet" ödeme şekliyle giriş olarak işlenir (cari alacağı düşer, kasadaki senet artar).
// Tahsil edilince o kaydın ödeme şekli banka / nakit olur; ciro edilince ciro edilen cariye senetle çıkış yazılır;
// karşılıksız / iade olunca müşteriye senetle çıkış yazılır (müşteri yeniden borçlanır). Verilen çek de böyle izlenir.
const SENET = "Çek / Senet";
const CEK_DURUM = {portfoy:"Portföyde", tahsilde:"Tahsilde (bankada)", tahsil:"Tahsil edildi", ciro:"Ciro edildi", karsiliksiz:"Karşılıksız", iade:"İade edildi", odendi:"Ödendi", verildi:"Ödenecek"};
const CEK_RENK = {portfoy:"d-mavi", tahsilde:"d-sari", tahsil:"d-yesil", ciro:"d-gri", karsiliksiz:"d-kirmizi", iade:"d-gri", odendi:"d-yesil", verildi:"d-sari"};
const cekAcik = c => c.tur === "alinan" ? c.durum === "portfoy" || c.durum === "tahsilde" : c.durum === "verildi";
const belgeAdi = c => c.belge === "senet" ? "Senet" : "Çek";
function cekOlay(c, olay, ek){ return Object.assign({}, c, ek || {}, {gecmis:(c.gecmis || []).concat([{tarih:bugun(), olay, kim:kullaniciGorunen()}])}); }
const CEK_SIRA = {vade:["Vade (yakın)", kiyas(c => c.vade || "9999")], uzak:["Vade (uzak)", kiyas(c => c.vade || "", true)], tutar:["Tutar (büyük)", kiyas(c => c.tutar, true)],
  cari:["Cari (A–Z)", kiyas(c => cariAdi(c.musteriId) || c.kesideci || "")], yeni:["En yeni kayıt", kiyas(c => c.olusma, true)]};
function ekranCekler(id){
  if(eksikTablo.cekler) return {baslik:"Çek / senet", geri:true, html:'<div class="uyari">Çek / senet portföyü için Supabase\'de <b>supabase-guncelleme-10.sql</b> dosyasını çalıştırın, sonra sayfayı yenileyin.</div>'};
  if(id && bul("cekler", id)) setTimeout(() => cekDetay(id), 0);
  const tur = filtre.cekTur || "alinan", gor = filtre.cekGor || "acik", bg = bugun(), s30 = gunEkle(bg, 30);
  const hz = listeHazirla("cekler", CEK_SIRA, veri.cekler.filter(c => c.tur === tur && (gor === "hepsi" || cekAcik(c)))), l = hz.l, ayliMi = hz.sira === "vade" || hz.sira === "uzak";
  const toplam = (t, f) => veri.cekler.filter(c => c.tur === t && cekAcik(c) && (!f || f(c))).reduce((x, c) => x + c.tutar, 0);
  const bagsiz = veri.hareketler.filter(h => h.odeme === SENET && (h.tur === "giris" || h.tur === "cikis") && !/karşılıksız|iade/i.test(h.kategori || "") && !veri.cekler.some(c => c.hareketId === h.id));
  const ayGrup = {};
  l.forEach(c => { const a = ayliMi ? (c.vade || "").slice(0, 7) : "tumu"; (ayGrup[a] = ayGrup[a] || []).push(c); });
  const html = '<div class="izgara dort">' +
      '<div class="kart ozet"><div class="kart-baslik">Portföydeki alınan</div><div class="deger t-borc">' + para(toplam("alinan")) + '</div><div class="alt-bilgi">' + veri.cekler.filter(c => c.tur === "alinan" && cekAcik(c)).length + ' belge</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">30 gün içinde tahsil</div><div class="deger">' + para(toplam("alinan", c => c.vade <= s30)) + '</div><div class="alt-bilgi">vadesi geçenler dahil</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">Ödenecek (verilen)</div><div class="deger t-cikis">' + para(toplam("verilen")) + '</div></div>' +
      '<div class="kart ozet"><div class="kart-baslik">30 gün içinde ödeme</div><div class="deger t-cikis">' + para(toplam("verilen", c => c.vade <= s30)) + '</div><div class="alt-bilgi">bankada olmalı</div></div></div>' +
    '<div class="ust-arac"><div class="secenekler">' + [["alinan", "Alınan (müşteriden)"], ["verilen", "Verilen (tedarikçiye)"]].map(([k, v]) => '<button class="secenek' + (k === tur ? ' secili' : '') + '" data-is="cekFiltre" data-arg="cekTur|' + k + '">' + v + '</button>').join("") +
      '<span style="width:8px"></span>' + [["acik", tur === "alinan" ? "Portföyde" : "Ödenecek"], ["hepsi", "Tümü"]].map(([k, v]) => '<button class="secenek' + (k === gor ? ' secili' : '') + '" data-is="cekFiltre" data-arg="cekGor|' + k + '">' + v + '</button>').join("") + '</div>' +
      '<div class="buton-sira" style="margin:0"><button class="buton kucuk" data-is="cekYeni" data-arg="alinan">' + ik("asagi") + 'Çek / senet al</button><button class="buton kucuk ikincil" data-is="cekYeni" data-arg="verilen">' + ik("yukari") + 'Çek / senet ver</button></div></div>' +
    (bagsiz.length ? '<div class="uyari">Kasada “' + SENET + '” ile işlenmiş ' + bagsiz.length + ' kayıt portföyde yok. <b data-is="cekBagsiz" style="cursor:pointer;text-decoration:underline">Bilgilerini girin</b> ki vadesi takip edilsin.</div>' : '') +
    listeArac("cekler", CEK_SIRA) +
    (l.length ? Object.entries(ayGrup).map(([a, cl]) => (a === "tumu" ? '' : bolum((a ? AYLAR[Number(a.slice(5)) - 1] + " " + a.slice(0, 4) : "Vadesiz") + ' <span class="t-soluk" style="font-weight:400;font-size:13px">· ' + para(cl.reduce((t, c) => t + c.tutar, 0)) + '</span>')) +
      '<div class="kart liste-kart">' + cl.map(c => {
        const gec = cekAcik(c) && c.vade && c.vade < bg, yakin = cekAcik(c) && c.vade && c.vade <= gunEkle(bg, sistem().vadeGun);
        return '<button class="satir" data-is="cekAc" data-arg="' + c.id + '"><span class="rozet ' + (c.tur === "alinan" ? 'r-borc' : 'r-cikis') + '">' + ik(c.tur === "alinan" ? "asagi" : "yukari") + '</span>' +
          '<span class="orta"><div class="s1">' + esc(belgeAdi(c) + (c.no ? " " + c.no : "") + " · " + (cariAdi(c.musteriId) || c.kesideci || "—")) + '</div>' +
          '<div class="s2"' + (gec ? ' style="color:#b91c1c"' : '') + '>' + esc([(gec ? "⚠ Vadesi geçti: " : "Vade: ") + tarihYaz(c.vade, true), c.banka, c.durum === "ciro" ? "→ " + cariAdi(c.ciroId) : ""].filter(Boolean).join(" · ")) + '</div></span>' +
          '<span class="sag"><div class="tutar">' + para(c.tutar) + '</div><span class="etiket-rozet ' + (yakin && !gec ? 'd-sari' : CEK_RENK[c.durum]) + '">' + CEK_DURUM[c.durum] + '</span></span></button>';
      }).join("") + '</div>').join("") + dahaFazla("cekler", hz) : '<div class="kart">' + bos("kasa", gor === "acik" ? (tur === "alinan" ? "Portföyde çek / senet yok." : "Ödenecek çek / senet yok.") : "Kayıt yok.") + '</div>');
  return {baslik:"Çek / senet portföyü", geri: matchMedia("(max-width:899px)").matches, html};
}
EYLEM.cekFiltre = (el, arg) => { const [k, v] = arg.split("|"); filtre[k] = v; ciz(); };
EYLEM.cekAc = (el, id) => cekDetay(id);
// Yeni çek / senet. arg: "alinan" | "verilen" | "h:<hareketId>" (kasadaki kayda bilgi ekleme)
EYLEM.cekYeni = (el, arg) => {
  const h = arg && arg.indexOf("h:") === 0 ? bul("hareketler", arg.slice(2)) : null, tur = h ? (h.tur === "giris" ? "alinan" : "verilen") : arg;
  const cariler = veri.musteriler.filter(m => tur === "alinan" ? m.tip !== "tedarikci" : true).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:92vh;overflow:auto"><p>' + (tur === "alinan" ? "Müşteriden çek / senet al" : "Tedarikçiye çek / senet ver") + '</p>' +
    (h ? '<div class="alt-bilgi">Kasadaki kayıt: ' + esc(tarihYaz(h.tarih) + " · " + para(h.tutar) + " · " + (cariAdi(h.musteriId) || h.aciklama || "")) + '</div>' : '') +
    '<label class="etiket">Belge</label><div class="secenekler" id="ckBelge"><button type="button" class="secenek secili" data-b="cek">Çek</button><button type="button" class="secenek" data-b="senet">Senet</button></div>' +
    '<label class="etiket" for="ckCari">' + (tur === "alinan" ? "Kimden alındı" : "Kime verildi") + '</label><select id="ckCari" class="kutu"><option value="">— Seçin —</option>' + cariler.map(m => '<option value="' + m.id + '"' + (h && h.musteriId === m.id ? ' selected' : '') + '>' + esc(m.ad) + '</option>').join("") + '</select>' +
    '<div class="iki-alan"><div><label class="etiket" for="ckTutar">Tutar</label><input id="ckTutar" class="kutu tutar-kutu" inputmode="decimal" value="' + (h ? sayiYaz(h.tutar) : "") + '"' + (h ? ' readonly' : '') + '></div><div>' + tarihAlani("ckVade", "Vade tarihi", "") + '</div></div>' +
    '<div class="iki-alan"><div><label class="etiket" for="ckNo">Çek / senet no</label><input id="ckNo" class="kutu" maxlength="40"></div><div><label class="etiket" for="ckBanka">Banka / şube</label><input id="ckBanka" class="kutu" maxlength="80" placeholder="Örn: Ziraat Akhisar"></div></div>' +
    '<label class="etiket" for="ckKes">Keşideci / borçlu <span class="ist">(çeki yazan kişi; müşteriden farklıysa)</span></label><input id="ckKes" class="kutu" maxlength="80">' +
    '<label class="etiket" for="ckNot">Açıklama <span class="ist">(isteğe bağlı)</span></label><input id="ckNot" class="kutu" maxlength="200">' +
    (h ? '' : '<div class="alt-bilgi" style="margin-top:10px">Kasaya “' + SENET + '” ' + (tur === "alinan" ? "girişi" : "çıkışı") + ' olarak işlenir; carinin hesabı buna göre düşer.</div>') +
    '<div class="hata" id="ckHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="kaydet">' + ik("tamam") + 'Kaydet</button></div></div>';
  p.addEventListener("click", e => {
    const bb = e.target.closest("[data-b]"); if(bb){ p.querySelectorAll("#ckBelge .secenek").forEach(x => x.classList.toggle("secili", x === bb)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const v = id => p.querySelector("#" + id).value.trim(), tutar = h ? h.tutar : sayiOku(v("ckTutar")), cari = v("ckCari"), vade = v("ckVade");
    const hata = m => { p.querySelector("#ckHata").textContent = m; };
    if(!cari) return hata("Cariyi seçin.");
    if(!(tutar > 0)) return hata("Tutarı yazın.");
    if(!vade) return hata("Vade tarihini seçin.");
    const c = {id:yeniId(), tur, belge:p.querySelector("#ckBelge .secili").getAttribute("data-b"), no:v("ckNo"), banka:v("ckBanka"), kesideci:v("ckKes"), musteriId:cari, tutar:yuvarla(tutar), vade,
      durum: tur === "alinan" ? "portfoy" : "verildi", ciroId:null, hareketId:h ? h.id : null, gecmis:[{tarih:bugun(), olay:tur === "alinan" ? "Alındı" : "Verildi", kim:kullaniciGorunen()}], aciklama:v("ckNot"), olusma:Date.now()};
    islem(b, async () => {
      if(!h){
        const hr = {id:yeniId(), tur: tur === "alinan" ? "giris" : "cikis", tutar:c.tutar, kategori: tur === "alinan" ? "Cari Tahsilat" : "Tedarikçi Ödemesi", odeme:SENET, musteriId:cari, isEmriId:null, faturaId:null,
          aciklama:belgeAdi(c) + (c.no ? " " + c.no : "") + " · vade " + tarihYaz(vade, true), tarih:bugun(), olusma:Date.now()};
        await Depo.kaydet("hareketler", hr); c.hareketId = hr.id;
      }
      await Depo.kaydet("cekler", c); p.remove(); bildir(belgeAdi(c) + " kaydedildi"); ciz();
    });
  });
  document.body.appendChild(p);
};
EYLEM.cekBagsiz = () => {
  const l = veri.hareketler.filter(h => h.odeme === SENET && (h.tur === "giris" || h.tur === "cikis") && !/karşılıksız|iade/i.test(h.kategori || "") && !veri.cekler.some(c => c.hareketId === h.id)).sort(tarihSira);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:90vh;overflow:auto"><p>Portföyde olmayan çek / senet kayıtları</p><div class="kart liste-kart" style="margin-top:10px">' +
    l.map(h => '<button class="satir" data-h="' + h.id + '"><span class="orta"><div class="s1">' + esc((h.tur === "giris" ? "Alınan · " : "Verilen · ") + (cariAdi(h.musteriId) || h.aciklama || "")) + '</div><div class="s2">' + tarihYaz(h.tarih, true) + '</div></span><span class="tutar">' + para(h.tutar) + '</span></button>').join("") +
    '</div><button class="buton ikincil" data-c="hayir">Kapat</button></div>';
  p.addEventListener("click", e => { const s = e.target.closest("[data-h]"); if(s){ p.remove(); return EYLEM.cekYeni(null, "h:" + s.getAttribute("data-h")); } if(e.target === p || e.target.closest("[data-c]")) p.remove(); });
  document.body.appendChild(p);
};
function cekDetay(id){
  const c = bul("cekler", id); if(!c) return;
  const h = bul("hareketler", c.hareketId), acik = cekAcik(c);
  const islemler = c.tur === "alinan" ? (c.durum === "portfoy" ? [["tahsilde", "Bankaya tahsile verdim"], ["tahsil", "Tahsil edildi"], ["ciro", "Ciro et (ödemede kullan)"], ["karsiliksiz", "Karşılıksız çıktı"], ["iade", "Müşteriye iade"]] :
    c.durum === "tahsilde" ? [["tahsil", "Tahsil edildi"], ["karsiliksiz", "Karşılıksız çıktı"], ["portfoy", "Bankadan geri aldım"]] : []) :
    (c.durum === "verildi" ? [["odendi", "Ödendi (hesaptan çıktı)"], ["iade", "Tedarikçi iade etti"]] : []);
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:520px;max-height:92vh;overflow:auto"><p>' + esc(belgeAdi(c) + (c.no ? " " + c.no : "")) + ' · ' + para(c.tutar) + '</p>' +
    '<div style="margin:6px 0 10px"><span class="etiket-rozet ' + CEK_RENK[c.durum] + '">' + CEK_DURUM[c.durum] + '</span></div>' +
    bilgiSatir(c.tur === "alinan" ? "Alındığı cari" : "Verildiği cari", esc(cariAdi(c.musteriId) || "—")) + bilgiSatir("Vade", tarihYaz(c.vade)) +
    (c.banka ? bilgiSatir("Banka", esc(c.banka)) : '') + (c.kesideci ? bilgiSatir("Keşideci", esc(c.kesideci)) : '') + (c.ciroId ? bilgiSatir("Ciro edilen", esc(cariAdi(c.ciroId))) : '') +
    (c.aciklama ? bilgiSatir("Açıklama", esc(c.aciklama)) : '') + bilgiSatir("Kasa kaydı", h ? esc(h.odeme + " · " + tarihYaz(h.tarih, true)) : '<span class="t-cikis">yok</span>') +
    '<div class="form-bolum" style="margin-top:12px">Geçmiş</div>' + (c.gecmis || []).map(g => '<div class="alt-bilgi" style="margin:4px 0">' + esc(tarihYaz(g.tarih, true) + " · " + g.olay + (g.kim ? " · " + g.kim : "")) + '</div>').join("") +
    (acik && islemler.length ? '<div class="form-bolum">İşlem</div><div class="secenekler" style="margin-top:8px">' + islemler.map(([k, v]) => '<button class="secenek" data-d="' + k + '">' + v + '</button>').join("") + '</div>' : '') +
    '<div id="ckEk"></div><div class="hata" id="ckHata"></div><div class="buton-sira"><button class="buton tehlike" data-c="sil">' + ik("sil") + 'Sil</button><button class="buton ikincil" data-c="hayir">Kapat</button></div></div>';
  const ek = p.querySelector("#ckEk");
  const uygula = async (d, o) => {
    const ad = belgeAdi(c) + (c.no ? " " + c.no : ""), hr = bul("hareketler", c.hareketId);
    if(d === "tahsil" || d === "odendi"){
      if(hr) await Depo.kaydet("hareketler", Object.assign({}, hr, {odeme:o.hesap}));
      await Depo.kaydet("cekler", cekOlay(c, (d === "tahsil" ? "Tahsil edildi" : "Ödendi") + " · " + o.hesap, {durum:d}));
    } else if(d === "ciro"){
      await Depo.kaydet("hareketler", {id:yeniId(), tur:"cikis", tutar:c.tutar, kategori:"Tedarikçi Ödemesi", odeme:SENET, musteriId:o.cari, isEmriId:null, faturaId:null, aciklama:ad + " ciro edildi", tarih:bugun(), olusma:Date.now()});
      await Depo.kaydet("cekler", cekOlay(c, "Ciro edildi → " + cariAdi(o.cari), {durum:"ciro", ciroId:o.cari}));
    } else if(d === "karsiliksiz" || (d === "iade" && c.tur === "alinan")){
      await Depo.kaydet("hareketler", {id:yeniId(), tur:"cikis", tutar:c.tutar, kategori: d === "karsiliksiz" ? "Karşılıksız çek / senet" : "Çek / senet iadesi", odeme:SENET, musteriId:c.musteriId, isEmriId:null, faturaId:null,
        aciklama:ad + (d === "karsiliksiz" ? " karşılıksız" : " iade"), tarih:bugun(), olusma:Date.now()});
      await Depo.kaydet("cekler", cekOlay(c, CEK_DURUM[d] + " · müşteri yeniden borçlandı", {durum:d}));
    } else if(d === "iade"){
      if(hr) await Depo.sil("hareketler", hr.id);
      await Depo.kaydet("cekler", cekOlay(c, "Tedarikçi iade etti", {durum:"iade"}));
    } else await Depo.kaydet("cekler", cekOlay(c, CEK_DURUM[d], {durum:d}));
    p.remove(); bildir(CEK_DURUM[d]); ciz();
  };
  p.addEventListener("click", e => {
    const dd = e.target.closest("[data-d]");
    if(dd){
      const d = dd.getAttribute("data-d");
      p.querySelectorAll("[data-d]").forEach(x => x.classList.toggle("secili", x === dd));
      if(d === "tahsil" || d === "odendi") ek.innerHTML = '<label class="etiket">Hangi hesaba / hesaptan?</label><div class="secenekler" id="ckHesap">' + ODEME.filter(o => o !== SENET).map((o, i) => '<button type="button" class="secenek' + (o === "Havale" || (i === 0 && ODEME.indexOf("Havale") < 0) ? ' secili' : '') + '" data-o="' + esc(o) + '">' + esc(o) + '</button>').join("") + '</div>';
      else if(d === "ciro") ek.innerHTML = '<label class="etiket" for="ckCiro">Kime ciro edildi?</label><select id="ckCiro" class="kutu"><option value="">— Seçin —</option>' + veri.musteriler.filter(m => m.id !== c.musteriId).sort((a, b) => a.ad.localeCompare(b.ad, "tr")).map(m => '<option value="' + m.id + '">' + esc(m.ad) + '</option>').join("") + '</select>';
      else ek.innerHTML = '';
      ek.innerHTML += '<div class="alt-bilgi">' + ({tahsil:"Kasadaki kaydın ödeme şekli seçilen hesaba geçer.", odendi:"Kasadaki çıkış kaydı seçilen hesaptan ödenmiş olur.", ciro:"Ciro edilen cariye bu tutarda ödeme yazılır (borcu düşer).",
        karsiliksiz:"Müşteriye bu tutarda borç yazılır, kasadaki senet düşer.", iade:c.tur === "alinan" ? "Müşteriye bu tutarda borç yazılır, kasadaki senet düşer." : "Kasadaki çıkış kaydı silinir, tedarikçiye borcunuz geri gelir.", tahsilde:"Sadece durum değişir.", portfoy:"Sadece durum değişir."}[d] || "") +
        '</div><button class="buton" data-c="uygula" data-arg="' + d + '">' + ik("tamam") + 'Onayla</button>';
      return;
    }
    const o_ = e.target.closest("[data-o]"); if(o_){ p.querySelectorAll("[data-o]").forEach(x => x.classList.toggle("secili", x === o_)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    const k = b.getAttribute("data-c");
    if(k === "hayir") return p.remove();
    if(k === "sil") return onayla("Kayıt silinsin mi?", "Çek / senet bilgisi çöp kutusuna taşınır; kasadaki kaydı silinmez.", "Sil", () => islem(null, async () => { await Depo.sil("cekler", id); p.remove(); ciz(); }));
    if(k === "uygula"){
      const d = b.getAttribute("data-arg"), o = {};
      if(d === "tahsil" || d === "odendi") o.hesap = p.querySelector("#ckHesap .secili").getAttribute("data-o");
      if(d === "ciro"){ o.cari = p.querySelector("#ckCiro").value; if(!o.cari) return p.querySelector("#ckHata").textContent = "Ciro edilen cariyi seçin."; }
      b.disabled = true;
      uygula(d, o).catch(err => { b.disabled = false; p.querySelector("#ckHata").textContent = hataMesaji(err); });
    }
  });
  document.body.appendChild(p);
}


/* ================= ÇEVRİMDIŞI ÇALIŞMA ================= */
// İnternet yokken son eşitlenen veri cihazdan (IndexedDB) açılır; kayıtlar sıraya alınır ve internet gelince sırayla gönderilir.
let cevrimdisi = false, kuyruk = [], gonderiliyor = false, sonEsitleme = 0;
const agHatasi = e => /failed to fetch|fetch failed|networkerror|network request failed|load failed|err_internet|err_network|internet bağlantısı/i.test(String((e && (e.message || e.details)) || e));
const IDB = {
  ac(){ return this.p || (this.p = new Promise((res, rej) => { const r = indexedDB.open("gunes-mobilya", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async al(k){ try{ const db = await this.ac(); return await new Promise(res => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); }catch(e){ return undefined; } },
  async yaz(k, v){ try{ const db = await this.ac(); await new Promise(res => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = res; }); }catch(e){} }
};
function bulutIslem(o){
  const q = sb.from(o.tablo);
  return o.tip === "upsert" ? (o.don ? q.upsert(o.satirlar).select(o.don) : q.upsert(o.satirlar)) : o.tip === "insert" ? q.insert(o.satirlar) : o.tip === "update" ? q.update(o.satir).eq(o.anahtar, o.id) : q.delete().eq(o.anahtar, o.id);
}
// Buluta yazar; internet yoksa sıraya alır (hata fırlatmaz). Diğer hatalar (yetki, eksik tablo) fırlatılır.
async function bulutYaz(o){
  if(cevrimdisi || !navigator.onLine) return kuyrugaEkle(o);
  let r; try{ r = await bulutIslem(o); }catch(e){ r = {error:e}; }
  if(r.error){ if(agHatasi(r.error)){ cevrimdisiOl(); return kuyrugaEkle(o); } throw r.error; }
  return r.data;
}
function kuyrugaEkle(o){ kuyruk.push(Object.assign({zaman:Date.now()}, o, {don:""})); IDB.yaz("kuyruk", kuyruk); durumGuncelle(); }
function cevrimdisiOl(){ if(!cevrimdisi){ cevrimdisi = true; durumGuncelle(); sessizCiz(); } }
async function kuyrukGonder(){
  if(gonderiliyor || !kuyruk.length || !navigator.onLine || !sb) return;
  gonderiliyor = true; const hatalar = [];
  try{
    while(kuyruk.length){
      const o = kuyruk[0]; let r;
      try{ r = await bulutIslem(o); }catch(e){ r = {error:e}; }
      if(r.error){
        if(agHatasi(r.error)){ cevrimdisi = true; break; }
        hatalar.push((TABLO_ADI[o.tablo] || o.tablo) + ": " + hataMesaji(r.error));
      }
      kuyruk.shift(); await IDB.yaz("kuyruk", kuyruk);
    }
    if(!kuyruk.length) cevrimdisi = false;
  } finally { gonderiliyor = false; durumGuncelle(); }
  if(hatalar.length) uyar(hatalar.length + " çevrimdışı kayıt gönderilemedi", hatalar.slice(0, 5).join("\n"));
}
let anlikZaman = null;
function anlikKaydet(){
  if(!cevrimici || !benimEposta()) return;
  clearTimeout(anlikZaman);
  anlikZaman = setTimeout(() => IDB.yaz("anlik:" + benimEposta(), {veri, yetki, eksikTablo:Object.assign({}, eksikTablo), eksikSutun:Object.assign({}, eksikSutun), cop, zaman:sonEsitleme, imlec, fiyatAyri, surumVar}), 800);
}
async function anlikYukle(){
  const a = benimEposta() && await IDB.al("anlik:" + benimEposta());
  if(!a || !a.veri) return false;
  veri = Object.assign(bosVeri(), a.veri); yetki = a.yetki || yetki; cop = a.cop || [];
  Object.assign(eksikTablo, a.eksikTablo || {}); eksikSutun = a.eksikSutun || {}; sonEsitleme = a.zaman || 0;
  imlec = a.imlec || 0; fiyatAyri = !!a.fiyatAyri; surumVar = !!a.surumVar;
  return true;
}
function durumYazisi(){
  if(!cevrimici) return '<span class="durum-isik yerel"><i></i>Bu cihazda</span>';
  if(cevrimdisi) return '<span class="durum-isik cevrimdisi" title="İnternet yok"><i></i>Çevrimdışı' + (kuyruk.length ? ' · ' + kuyruk.length + ' bekliyor' : '') + '</span>';
  return '<span class="durum-isik"><i></i>' + (kuyruk.length ? 'Gönderiliyor (' + kuyruk.length + ')' : 'Çevrimiçi') + '</span>';
}
function durumGuncelle(){ const e = document.querySelector(".ust .durum-isik"); if(e) e.outerHTML = durumYazisi(); }
const cevrimdisiUyari = () => cevrimici && cevrimdisi ? '<div class="uyari cevrimdisi-uyari">' + ik("bulut") + '<span><b>İnternet yok.</b> ' +
  (sonEsitleme ? tamZaman(sonEsitleme) + ' itibarıyla kaydedilen bilgiler gösteriliyor. ' : '') + 'Yaptığınız kayıtlar bu cihazda bekliyor' + (kuyruk.length ? ' (' + kuyruk.length + ')' : '') +
  ', internet gelince kendiliğinden gönderilir. Fotoğraf ve dosya yüklemek için internet gerekir.</span></div>' : '';
window.addEventListener("online", () => { if(!cevrimici || !hazir) return; kuyrukGonder().then(() => Depo.esitle()).then(() => { if(!kanal) canliBaglan(); sessizCiz(); durumGuncelle(); }).catch(() => {}); });
window.addEventListener("offline", () => { if(cevrimici && hazir) cevrimdisiOl(); });
setInterval(() => { if(cevrimici && hazir && kuyruk.length && navigator.onLine) kuyrukGonder().then(() => { if(!cevrimdisi) Depo.esitle().then(sessizCiz).catch(() => {}); }); }, 30000);
if("serviceWorker" in navigator && /^(https:|http:\/\/(localhost|127\.0\.0\.1))/.test(location.href)) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

/* ================= e-FATURA / e-ARŞİV (UBL-TR 1.2) ================= */
// Satış faturasından GİB'in UBL-TR 1.2 biçiminde XML üretilir. Bu dosya özel entegratörün (Paraşüt, Uyumsoft, Logo, Mysoft…)
// paneline "XML / UBL içe aktar" ile yüklenir; entegratör mali mühürle imzalayıp GİB'e iletir. Doğrudan gönderim için
// entegratörün API hesabı ve sunucu tarafı bağlantı gerekir (tarayıcıdan gizli anahtar kullanılamaz).
function vknGecerli(v){
  if(!/^\d{10}$/.test(v)) return false;
  let t = 0;
  for(let i = 0; i < 9; i++){ const d = (Number(v[i]) + 9 - i) % 10; let p = (d * Math.pow(2, 9 - i)) % 9; if(d !== 0 && p === 0) p = 9; t += p; }
  return (10 - t % 10) % 10 === Number(v[9]);
}
function tcknGecerli(v){
  if(!/^[1-9]\d{10}$/.test(v)) return false;
  const d = v.split("").map(Number);
  return ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10 === d[9] && d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}
const kimlikTuru = v => v.length === 11 ? "TCKN" : "VKN";
const xe = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;"}[c]));
const tutar2 = n => (Math.round(n * 100) / 100).toFixed(2);
// GİB fatura numarası: 3 karakter önek + yıl + 9 hane (örn. GNS2026000000012)
function gibNo(f){
  const on = (sistem().efOnEk || "GNS").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3).padEnd(3, "X");
  const sira = (/(\d+)\s*$/.exec(f.no) || [0, 1])[1];
  return on + f.tarih.slice(0, 4) + ("000000000" + Number(sira)).slice(-9);
}
function ublXml(f, o){
  const fr = firma(), m = bul("musteriler", f.musteriId) || {}, uuid = (crypto.randomUUID ? crypto.randomUUID() : yeniId() + "-0000-4000-8000-" + Date.now().toString(16).slice(-12)).toUpperCase();
  const taraf = (k) => {
    const kim = String(k.vkn || "").replace(/\D/g, ""), tur = kimlikTuru(kim), ad = (k.ad || "").trim(), parca = ad.split(/\s+/);
    return '<cac:Party>' + (k.web ? '<cbc:WebsiteURI>' + xe(k.web) + '</cbc:WebsiteURI>' : '') +
      '<cac:PartyIdentification><cbc:ID schemeID="' + tur + '">' + xe(kim) + '</cbc:ID></cac:PartyIdentification>' +
      (tur === "VKN" ? '<cac:PartyName><cbc:Name>' + xe(ad) + '</cbc:Name></cac:PartyName>' : '') +
      '<cac:PostalAddress><cbc:StreetName>' + xe(k.adres || "-") + '</cbc:StreetName><cbc:CitySubdivisionName>' + xe(k.ilce || "-") + '</cbc:CitySubdivisionName><cbc:CityName>' + xe(k.il || "-") + '</cbc:CityName>' +
        (k.posta ? '<cbc:PostalZone>' + xe(k.posta) + '</cbc:PostalZone>' : '') + '<cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country></cac:PostalAddress>' +
      (k.vergiDairesi ? '<cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>' + xe(k.vergiDairesi) + '</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>' : '') +
      (k.telefon || k.eposta ? '<cac:Contact>' + (k.telefon ? '<cbc:Telephone>' + xe(k.telefon) + '</cbc:Telephone>' : '') + (k.eposta ? '<cbc:ElectronicMail>' + xe(k.eposta) + '</cbc:ElectronicMail>' : '') + '</cac:Contact>' : '') +
      (tur === "TCKN" ? '<cac:Person><cbc:FirstName>' + xe(parca.slice(0, -1).join(" ") || ad) + '</cbc:FirstName><cbc:FamilyName>' + xe(parca.length > 1 ? parca[parca.length - 1] : "-") + '</cbc:FamilyName></cac:Person>' : '') +
      '</cac:Party>';
  };
  // KDV oranlarına göre ara toplamlar
  const oranlar = {};
  f.kalemler.forEach(k => { const net = k.miktar * k.fiyat, o_ = Number(k.kdv) || 0; const x = oranlar[o_] || (oranlar[o_] = {matrah:0, kdv:0}); x.matrah += net; x.kdv += net * o_ / 100; });
  const vergi = (matrah, kdv, oran) => '<cac:TaxSubtotal><cbc:TaxableAmount currencyID="TRY">' + tutar2(matrah) + '</cbc:TaxableAmount><cbc:TaxAmount currencyID="TRY">' + tutar2(kdv) + '</cbc:TaxAmount>' +
    '<cbc:Percent>' + oran + '</cbc:Percent><cac:TaxCategory>' + (oran ? '' : '<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>İstisna Olmayan Diğer</cbc:TaxExemptionReason>') +
    '<cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>';
  const ara = f.kalemler.reduce((t, k) => t + k.miktar * k.fiyat, 0), kdvT = Object.values(oranlar).reduce((t, x) => t + x.kdv, 0);
  const saat = new Date(f.olusma || Date.now()), hhmmss = [saat.getHours(), saat.getMinutes(), saat.getSeconds()].map(v => ("0" + v).slice(-2)).join(":");
  const notlar = [f.aciklama, firma().faturaNotu, o.senaryo === "EARSIVFATURA" ? "Gönderim şekli: ELEKTRONIK" : "", fr.iban ? "IBAN: " + fr.iban + (fr.banka ? " (" + fr.banka + ")" : "") : ""].filter(Boolean);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" ' +
    'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">\n' +
    '<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>\n' +
    '<cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>TR1.2</cbc:CustomizationID><cbc:ProfileID>' + o.senaryo + '</cbc:ProfileID>\n' +
    '<cbc:ID>' + xe(o.no) + '</cbc:ID><cbc:CopyIndicator>false</cbc:CopyIndicator><cbc:UUID>' + uuid + '</cbc:UUID>\n' +
    '<cbc:IssueDate>' + f.tarih + '</cbc:IssueDate><cbc:IssueTime>' + hhmmss + '</cbc:IssueTime><cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>\n' +
    notlar.map(n => '<cbc:Note>' + xe(n) + '</cbc:Note>').join("") + (f.no !== o.no ? '<cbc:Note>' + xe("İç fatura no: " + f.no) + '</cbc:Note>' : '') +
    '<cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode><cbc:LineCountNumeric>' + f.kalemler.length + '</cbc:LineCountNumeric>\n' +
    '<cac:Signature><cbc:ID schemeID="VKN_TCKN">' + xe(o.satici.vkn) + '</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID schemeID="' + kimlikTuru(o.satici.vkn) + '">' + xe(o.satici.vkn) + '</cbc:ID></cac:PartyIdentification>' +
      '<cac:PostalAddress><cbc:CitySubdivisionName>' + xe(o.satici.ilce || "-") + '</cbc:CitySubdivisionName><cbc:CityName>' + xe(o.satici.il || "-") + '</cbc:CityName><cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country></cac:PostalAddress></cac:SignatoryParty>' +
      '<cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#Signature_' + xe(o.no) + '</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>\n' +
    '<cac:AccountingSupplierParty>' + taraf(o.satici) + '</cac:AccountingSupplierParty>\n<cac:AccountingCustomerParty>' + taraf(o.alici) + '</cac:AccountingCustomerParty>\n' +
    (f.vade ? '<cac:PaymentTerms><cbc:Note>Vade: ' + f.vade + '</cbc:Note><cbc:PaymentDueDate>' + f.vade + '</cbc:PaymentDueDate></cac:PaymentTerms>\n' : '') +
    '<cac:TaxTotal><cbc:TaxAmount currencyID="TRY">' + tutar2(kdvT) + '</cbc:TaxAmount>' + Object.entries(oranlar).map(([o_, x]) => vergi(x.matrah, x.kdv, Number(o_))).join("") + '</cac:TaxTotal>\n' +
    '<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="TRY">' + tutar2(ara) + '</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="TRY">' + tutar2(ara) + '</cbc:TaxExclusiveAmount>' +
      '<cbc:TaxInclusiveAmount currencyID="TRY">' + tutar2(ara + kdvT) + '</cbc:TaxInclusiveAmount><cbc:AllowanceTotalAmount currencyID="TRY">0.00</cbc:AllowanceTotalAmount><cbc:PayableAmount currencyID="TRY">' + tutar2(ara + kdvT) + '</cbc:PayableAmount></cac:LegalMonetaryTotal>\n' +
    f.kalemler.map((k, i) => {
      const net = k.miktar * k.fiyat, oran = Number(k.kdv) || 0;
      return '<cac:InvoiceLine><cbc:ID>' + (i + 1) + '</cbc:ID><cbc:InvoicedQuantity unitCode="C62">' + k.miktar + '</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="TRY">' + tutar2(net) + '</cbc:LineExtensionAmount>' +
        '<cac:TaxTotal><cbc:TaxAmount currencyID="TRY">' + tutar2(net * oran / 100) + '</cbc:TaxAmount>' + vergi(net, net * oran / 100, oran) + '</cac:TaxTotal>' +
        '<cac:Item><cbc:Name>' + xe(k.ad) + '</cbc:Name></cac:Item><cac:Price><cbc:PriceAmount currencyID="TRY">' + tutar2(k.fiyat) + '</cbc:PriceAmount></cac:Price></cac:InvoiceLine>\n';
    }).join("") + '</Invoice>\n';
}
// Bilgileri tamamla → XML indir. arg: fatura id
EYLEM.eFatura = (el, id) => {
  const f = bul("faturalar", id); if(!f || f.tur !== "satis") return;
  const fr = firma(), s = sistem(), m = bul("musteriler", f.musteriId) || {};
  const vknM = String(m.vergiNo || "").replace(/\D/g, ""), ilTahmin = (fr.il || "");
  const p = document.createElement("div"); p.className = "perde";
  p.innerHTML = '<div class="pencere" style="max-width:560px;max-height:92vh;overflow:auto"><p>e-Fatura / e-Arşiv XML</p>' +
    '<div class="alt-bilgi">UBL-TR 1.2 dosyası hazırlanır; entegratörünüzün (' + esc(s.efEntegrator || "Paraşüt, Uyumsoft, Logo…") + ') paneline <b>XML / UBL içe aktar</b> ile yükleyin. İmzalama ve GİB\'e gönderim entegratörde yapılır.</div>' +
    '<label class="etiket">Senaryo</label><div class="secenekler" id="efSen">' + [["EARSIVFATURA", "e-Arşiv (alıcı e-faturaya kayıtlı değil)"], ["TEMELFATURA", "e-Fatura · Temel"], ["TICARIFATURA", "e-Fatura · Ticari"]].map(([k, v], i) =>
      '<button type="button" class="secenek' + ((m.efatura ? k === "TEMELFATURA" : i === 0) ? ' secili' : '') + '" data-s="' + k + '">' + v + '</button>').join("") + '</div>' +
    '<div class="form-bolum">Fatura</div><div class="iki-alan"><div><label class="etiket" for="efNo">GİB fatura no <span class="ist">(16 karakter)</span></label><input id="efNo" class="kutu" maxlength="16" value="' + esc(gibNo(f)) + '"></div>' +
      '<div><label class="etiket">Tutar</label><div style="padding:10px 0;font-weight:600">' + para(f.toplam) + ' <span class="ist" style="font-weight:400">(KDV ' + para(f.kdvToplam) + ')</span></div></div></div>' +
    '<div class="form-bolum">Satıcı (siz)</div><div class="iki-alan"><div><label class="etiket" for="efSV">VKN / TCKN</label><input id="efSV" class="kutu" inputmode="numeric" maxlength="11" value="' + esc(String(fr.vergiNo || "").replace(/\D/g, "")) + '"></div>' +
      '<div><label class="etiket" for="efSD">Vergi dairesi</label><input id="efSD" class="kutu" maxlength="60" value="' + esc(fr.vergiDairesi) + '"></div></div>' +
      '<div class="iki-alan"><div><label class="etiket" for="efSIl">İl</label><input id="efSIl" class="kutu" maxlength="40" value="' + esc(fr.il) + '" placeholder="Manisa"></div><div><label class="etiket" for="efSIlce">İlçe</label><input id="efSIlce" class="kutu" maxlength="40" value="' + esc(fr.ilce) + '" placeholder="Akhisar"></div></div>' +
    '<div class="form-bolum">Alıcı · ' + esc(m.ad || "") + '</div><div class="iki-alan"><div><label class="etiket" for="efAV">VKN / TCKN</label><input id="efAV" class="kutu" inputmode="numeric" maxlength="11" value="' + esc(vknM) + '" placeholder="Bireysel ise TC kimlik no"></div>' +
      '<div><label class="etiket" for="efAD">Vergi dairesi <span class="ist">(şirketse)</span></label><input id="efAD" class="kutu" maxlength="60" value="' + esc(m.vergiDairesi || "") + '"></div></div>' +
      '<label class="etiket" for="efAAdr">Adres</label><input id="efAAdr" class="kutu" maxlength="200" value="' + esc(m.adres || "") + '">' +
      '<div class="iki-alan"><div><label class="etiket" for="efAIl">İl</label><input id="efAIl" class="kutu" maxlength="40" value="' + esc(m.il || ilTahmin) + '"></div><div><label class="etiket" for="efAIlce">İlçe</label><input id="efAIlce" class="kutu" maxlength="40" value="' + esc(m.ilce || "") + '"></div></div>' +
      '<label class="etiket" for="efAE">E-posta <span class="ist">(e-Arşiv faturası gönderilecekse)</span></label><input id="efAE" class="kutu" type="email" maxlength="80" value="' + esc(m.eposta || "") + '">' +
    '<div class="hata" id="efHata"></div><div class="buton-sira"><button class="buton ikincil" data-c="hayir">Vazgeç</button><button class="buton" data-c="indir">' + ik("indir") + 'XML indir</button></div></div>';
  p.addEventListener("click", e => {
    const sn = e.target.closest("[data-s]"); if(sn){ p.querySelectorAll("#efSen .secenek").forEach(x => x.classList.toggle("secili", x === sn)); return; }
    const b = e.target.closest("[data-c]"); if(!b){ if(e.target === p) p.remove(); return; }
    if(b.getAttribute("data-c") === "hayir") return p.remove();
    const v = id => p.querySelector("#" + id).value.trim(), hata = t => { p.querySelector("#efHata").textContent = t; };
    const o = {senaryo:p.querySelector("#efSen .secili").getAttribute("data-s"), no:v("efNo").toUpperCase(),
      satici:{vkn:v("efSV").replace(/\D/g, ""), ad:fr.ad, adres:fr.adres, il:v("efSIl"), ilce:v("efSIlce"), vergiDairesi:v("efSD"), telefon:fr.telefon, eposta:fr.eposta, web:fr.web},
      alici:{vkn:v("efAV").replace(/\D/g, ""), ad:m.ad, adres:v("efAAdr"), il:v("efAIl"), ilce:v("efAIlce"), vergiDairesi:v("efAD"), telefon:m.telefon, eposta:v("efAE")}};
    const kimlik = k => k.length === 10 ? vknGecerli(k) : tcknGecerli(k);
    if(!/^[A-Z0-9]{3}\d{13}$/.test(o.no)) return hata("GİB fatura no 3 harf + yıl + 9 rakam olmalı (örn. GNS2026000000001).");
    if(!kimlik(o.satici.vkn)) return hata("Kendi VKN (10 hane) veya TCKN (11 hane) numaranızı kontrol edin.");
    if(!o.satici.il || !o.satici.ilce) return hata("Kendi il ve ilçenizi yazın.");
    if(!kimlik(o.alici.vkn)) return hata("Alıcının VKN / TCKN numarası geçersiz. Kimliği bilinmeyen bireysel alıcı için 11111111111 yazılabilir." );
    if(!o.alici.il) return hata("Alıcının ilini yazın.");
    if(o.senaryo !== "EARSIVFATURA" && o.alici.vkn.length === 10 && !o.alici.vergiDairesi) return hata("e-Fatura için alıcının vergi dairesini yazın.");
    const xml = ublXml(f, o);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([xml], {type:"application/xml"})); a.download = o.no + ".xml"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    // Girilen bilgiler bir dahaki sefere hazır gelsin
    islem(null, async () => {
      if(!fr.il || !fr.ilce || fr.vergiNo !== o.satici.vkn || fr.vergiDairesi !== o.satici.vergiDairesi)
        await Depo.kaydet("ayarlar", {anahtar:"firma", deger:Object.assign(firma(), {il:o.satici.il, ilce:o.satici.ilce, vergiNo:o.satici.vkn, vergiDairesi:o.satici.vergiDairesi})});
      if(m.id && (m.vergiNo !== o.alici.vkn || (o.alici.adres && m.adres !== o.alici.adres))) await Depo.kaydet("musteriler", Object.assign({}, m, {vergiNo:o.alici.vkn, adres:o.alici.adres || m.adres}));
      logla("dosya", "faturalar", f.id, f.no + " → " + o.no + " (" + (o.senaryo === "EARSIVFATURA" ? "e-Arşiv" : "e-Fatura") + " XML)");
      p.remove(); bildir("XML indirildi: " + o.no);
    });
  });
  document.body.appendChild(p);
};
