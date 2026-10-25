"use strict";
// Güneş Mobilya — sesli komut balonu (sağ altta)
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
// Konuşma tarayıcının konuşma tanımasıyla yazıya çevrilir (Chrome, Edge, Safari); desteklenmeyen tarayıcıda komut yazılabilir.
// Para kayıtları kaydedilmez, form doldurulmuş olarak açılır; kontrol edip "Kaydet"e basarsınız.

/* --- Türkçe sayı okuma: "iki bin beş yüz" → 2500, "1.500" → 1500 --- */
const SAYI_KELIME = {sifir:0, bir:1, iki:2, uc:3, dort:4, bes:5, alti:6, yedi:7, sekiz:8, dokuz:9, on:10, yirmi:20, otuz:30, kirk:40, elli:50, altmis:60, yetmis:70, seksen:80, doksan:90};
function sayilariCevir(t){
  // önce rakamla yazılmış binlik ayraçlı sayılar: "1.500" / "1 500" → 1500, "12,5" → 12.5
  t = t.replace(/(\d{1,3})(?:[.\s](\d{3}))+(?![\d])/g, m => m.replace(/[.\s]/g, "")).replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
  const k = t.split(/\s+/), o = [];
  let top = 0, ara = 0, var_ = false;
  const bitir = () => { if(var_){ o.push(String(top + ara)); top = 0; ara = 0; var_ = false; } };
  k.forEach((w, i) => {
    if(SAYI_KELIME[w] != null){ ara += SAYI_KELIME[w]; var_ = true; }
    else if(w === "yuz"){ ara = (ara || 1) * 100; var_ = true; }
    else if(w === "bin"){ top += (ara || 1) * 1000; ara = 0; var_ = true; }
    else if(w === "milyon"){ top = (top + ara || 1) * 1e6; ara = 0; var_ = true; }
    else if(/^\d+(\.\d+)?$/.test(w) && (var_ && Number(w) < 1000 || /^(bin|yuz|milyon)$/.test(k[i + 1] || ""))){ ara += Number(w); var_ = true; }   // "2 bin 500"
    else { bitir(); o.push(w); }
  });
  bitir();
  return o.join(" ");
}
// Komut sözlüğü: yazı → gidilecek ekran
const SES_EKRAN = [
  [/\b(ana ?sayfa|anasayfa|baslangic)/, "ana"], [/\bkasa/, "kasa"], [/\b(cariler|musteriler|tedarikciler)/, "cariler"],
  [/\b(is emirleri|isler|siparisler listesi)/, "isler"], [/\b(takvim|randevular|montajlar)/, "takvim"], [/\bfaturalar/, "faturalar"],
  [/\bkatalog/, "katalog"], [/\bstok/, "stok"], [/\bmalzeme(ler| listesi)/, "malzemeler"], [/\b(malzeme siparis|siparisler)/, "siparisler"],
  [/\bpuantaj/, "puantaj"], [/\b(maas|maaslar)/, "maas/ay"], [/\bpersonel/, "personel"], [/\b(cek|senet)/, "cekler"], [/\bkdv/, "kdv"],
  [/\b(karlilik|proje kar)/, "karlilik"], [/\bortak hesab/, "ortakhesap"], [/\brapor/, "rapor"], [/\b(yapilacaklar|hatirlatmalar)/, "hatirlatmalar"],
  [/\b(atolye|kapasite)/, "kapasite"], [/\bsabit gider/, "sabitgiderler"], [/\bmodul/, "moduller"], [/\bacilis bakiye/, "acilis"], [/\btahsilat/, "tahsilat"],
  [/\b(arac|araclar)/, "araclar"], [/\bekstre/, "ekstre"], [/\bayarlar\b/, "ayarlar"]
];
const SES_ORNEK = ["kasaya 500 lira nakit girdi", "1500 lira kira çıktı", "Ali Osman'dan 2000 lira tahsilat", "yeni iş emri Ayşe Demir", "yeni müşteri Mehmet Kaya",
  "İE 12'yi aç", "Ali Osman'ı aç", "takvimi aç", "mutfak ara", "not ekle kapak rengi krem", "kesim listesi", "teklifi yazdır", "geri dön"];

// Cümledeki cari adı (en uzun eşleşme). "Ali Osman'dan", "Ali Osman'ı" gibi ekler sorun olmaz.
function sesCari(t){
  // Adın baştan kaç kelimesi cümlede art arda geçiyor ("Ali Osman'dan" → Ali Osman Yılmaz). En az 2 kelime, ya da tek kelimelik / 4+ harfli ilk ad tek cariye uyuyorsa.
  const puan = m => { const k = sade(m.ad).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean); let n = 0;
    for(let i = k.length; i >= 1; i--) if(new RegExp("(^|\\s)" + k.slice(0, i).join(" ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(t)){ n = i; break; }
    return {m, n, tam:n === k.length, ilk:(k[0] || "").length}; };
  const l = veri.musteriler.map(puan).filter(x => x.n >= 2 || (x.n === 1 && (x.tam || x.ilk >= 4))).sort((a, b) => b.n - a.n || b.tam - a.tam);
  if(!l.length) return null;
  if(l.length > 1 && l[0].n === l[1].n && l[0].tam === l[1].tam) return null;   // belirsiz
  return l[0].m;
}
// Yazıyı komuta çevirir (çalıştırmaz). Dönen: {tur, ...}
function komutCoz(metin){
  const ham = String(metin || "").trim(), t = sayilariCevir(sade(ham).replace(/[’'`]/g, " ").replace(/[.,!?]+$/g, "").replace(/\s+/g, " ")), [ekran, a] = yol();
  if(!t) return {tur:"bos"};
  if(/\b(yardim|komutlar|ne yapabilirsin|ne diyebilirim)\b/.test(t)) return {tur:"yardim"};
  if(/^(geri|geri don|geri git|onceki)\b/.test(t)) return {tur:"geri"};
  if(/\bbildirim/.test(t)) return {tur:"bildirim"};
  const sayi = (/(\d+(?:\.\d+)?)/.exec(t) || [])[1], tutar = sayi ? Number(sayi) : 0;
  const cari = sesCari(t);
  // Para giriş / çıkış
  const giris = /\b(girdi|geldi|tahsil|tahsilat|aldim|aldik|odedi|odeme aldik|para giris)/.test(t), cikis = /\b(cikti|odedim|odedik|harcadim|harcadik|verdim|verdik|para cikis|gider|odeme yap)/.test(t);
  if(tutar > 0 && (giris || cikis) && !/\bfatura/.test(t)){
    const tur = cikis && !giris ? "cikis" : giris && !cikis ? "giris" : /\b(girdi|geldi|tahsil)/.test(t) ? "giris" : "cikis";
    const odeme = /\bnakit\b|\bpesin\b/.test(t) ? "Nakit" : /\bkart|kredi karti|pos\b/.test(t) ? "Kart" : /\b(havale|eft|banka|iban)/.test(t) ? "Havale" : /\b(cek|senet)\b/.test(t) ? SENET : "";
    const tk = cari ? t.replace(new RegExp(sade(cari.ad).split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g"), " ") : t;   // cari adı kategori sanılmasın
    const kat = kategoriler(tur).find(k => sade(k).split(/[\s/(),]+/).filter(w => w.length >= 4).some(w => tk.indexOf(w) >= 0)) || "";
    return {tur:"para", yon:tur, tutar, odeme, kategori:kat, cari, not:ham};
  }
  // Yeni kayıtlar
  if(/\byeni (is|is emri|siparis)\b/.test(t) || /\bis emri (ac|olustur)\b/.test(t)) return {tur:"git", yer:"is-form" + (cari ? "/-/" + cari.id : ""), yazi:"Yeni iş emri" + (cari ? " · " + cari.ad : "")};
  if(/\b(olcu|kesif)\b/.test(t) && /\b(yeni|al|alacagim|ekle)\b/.test(t)) return {tur:"git", yer:"is-form/" + (cari ? "-/" + cari.id : "-/-") + "/-/kesif", yazi:"Yeni ölçü / keşif"};
  const yc = /\byeni (musteri|tedarikci|cari)\b ?(.*)$/.exec(t);
  if(yc) return {tur:"yeniCari", tip:yc[1] === "tedarikci" ? "tedarikci" : "musteri", ad:ham.replace(/^.*?\byeni\s+\S+\s*/i, "").trim()};
  if(/\b(satis|alis) faturasi\b/.test(t) && /\b(yeni|kes|ac|olustur|hazirla)\b/.test(t)) return {tur:"git", yer:"fatura-form/" + (/\balis\b/.test(t) ? "alis" : "satis") + (cari ? "/" + cari.id : ""), yazi:(/\balis\b/.test(t) ? "Alış" : "Satış") + " faturası"};
  // Bulunduğu iş emrinde
  const nt = /^(not ekle|not yaz|not al|not)\s+(.+)$/.exec(t);
  if(nt) return {tur:"not", metin:ham.replace(/^\s*not(\s+(ekle|yaz|al))?\s*:?\s*/i, "").trim(), isId:ekran === "is" || ekran === "kesif" || ekran === "kesim" ? a : null};
  if(/\bkesim\b/.test(t) && (ekran === "is" || ekran === "kesim")) return {tur:"git", yer:"kesim/" + a, yazi:"Kesim listesi"};
  if(/\b(teklif|teklifi) (yazdir|pdf)/.test(t) && ekran === "is") return {tur:"eylem", eylem:"teklifYazdir", arg:a, yazi:"Teklif yazdırılıyor"};
  if(/\b(olcu|kesif)\b/.test(t) && ekran === "is") return {tur:"git", yer:"kesif/" + a, yazi:"Ölçü / keşif"};
  // Numarayla aç: "iş emri 12", "İE 12", "fatura 5"
  const no = /\b(is emri|ie|is)\s*(?:no\s*)?(\d+)/.exec(t);
  if(no){ const ie = veri.is_emirleri.find(x => Number((x.no.match(/(\d+)\s*$/) || [])[1]) === Number(no[2])); if(ie) return {tur:"git", yer:"is/" + ie.id, yazi:ie.no + " · " + ie.baslik}; }
  const fno = /\bfatura\s*(?:no\s*)?(\d+)/.exec(t);
  if(fno){ const f = veri.faturalar.find(x => Number((x.no.match(/(\d+)\s*$/) || [])[1]) === Number(fno[1])); if(f) return {tur:"git", yer:"fatura/" + f.id, yazi:f.no}; }
  // Arama
  const ar = /^(ara|bul)\s+(.+)$/.exec(t) || /^(.+?)\s+(ara|bul)$/.exec(t);
  if(ar) return {tur:"ara", q:ham.replace(/^\s*(ara|bul)\s+/i, "").replace(/\s+(ara|bul)\s*$/i, "").trim()};
  // Cari adıyla aç
  if(cari && !/\bkasa|takvim|fatura/.test(t)) return {tur:"git", yer:"cari/" + cari.id, yazi:cari.ad};
  // Ekranlar
  for(const [r, yer] of SES_EKRAN) if(r.test(t)) return {tur:"git", yer, yazi:ham};
  // İş emri başlığıyla
  const ie = veri.is_emirleri.filter(x => { const b = sade(x.baslik); return b.length >= 4 && t.indexOf(b) >= 0; });
  if(ie.length === 1) return {tur:"git", yer:"is/" + ie[0].id, yazi:ie[0].no + " · " + ie[0].baslik};
  return {tur:"ara", q:ham, anlasilmadi:true};
}
// Açılan formu doldurmak için: ekran çizildikten sonra çalışır
function sonraDoldur(fn, kac = 0){ setTimeout(() => { if(document.querySelector(".sayfa .form-kart") || kac > 20) fn(); else sonraDoldur(fn, kac + 1); }, 60); }
const secenekSec = (ad, deger_) => { const b = Array.from(document.querySelectorAll('.secenekler[data-ad="' + ad + '"] .secenek')).find(x => x.getAttribute("data-deger") === deger_); if(b) b.click(); };
function komutUygula(k){
  const Y = yetki.yonetici && !yetki.salt;
  switch(k.tur){
    case "bos": return "Bir şey duyamadım.";
    case "yardim": return '<b>Örnekler:</b><br>' + SES_ORNEK.map(x => "• " + esc(x)).join("<br>");
    case "geri": geri(); return "Geri dönüldü";
    case "bildirim": EYLEM.bildirimPanel(); return "Bildirimler açıldı";
    case "para": {
      if(!Y) return "Kasa işlemleri için yetkiniz yok.";
      git(k.yon + (k.cari ? "/" + k.cari.id : ""));
      sonraDoldur(() => {
        const tu = document.getElementById("tutar"); if(tu){ tu.value = sayiYaz(k.tutar); tu.dispatchEvent(new Event("input", {bubbles:true})); }
        if(k.kategori) secenekSec("kategori", k.kategori);
        if(k.odeme) secenekSec("odeme", k.odeme);
        const n = document.getElementById("aciklama"); if(n && !n.value) n.value = k.not.slice(0, 200);
      });
      return (k.yon === "giris" ? "Para Girdi" : "Para Çıktı") + " formu dolduruldu: <b>" + para(k.tutar) + "</b>" + [k.odeme, k.kategori, k.cari && k.cari.ad].filter(Boolean).map(x => " · " + esc(x)).join("") + "<br>Kontrol edip <b>Kaydet</b>'e basın.";
    }
    case "yeniCari":
      if(!Y) return "Cari eklemek için yetkiniz yok.";
      git("cari-form/-/" + k.tip);
      sonraDoldur(() => { const e = document.getElementById("ad"); if(e && k.ad) e.value = k.ad.replace(/^./, c => c.toLocaleUpperCase("tr")); });
      return "Yeni " + (k.tip === "tedarikci" ? "tedarikçi" : "müşteri") + (k.ad ? ": <b>" + esc(k.ad) + "</b>" : "");
    case "not":
      if(!k.isId || !bul("is_emirleri", k.isId)) return "Not eklemek için önce bir iş emrini açın.";
      if(!k.metin) return "Notu söyleyin: “not ekle …”";
      islem(null, async () => { await notEkle(k.isId, k.metin, "not"); bildir("Not eklendi"); ciz(); });
      return "Not eklendi: “" + esc(k.metin) + "”";
    case "eylem": if(EYLEM[k.eylem]) EYLEM[k.eylem](null, k.arg); return esc(k.yazi);
    case "ara":
      aramaAc(); setTimeout(() => { const g = document.getElementById("genelAra"); if(g){ g.value = k.q; g.dispatchEvent(new Event("input", {bubbles:true})); } }, 30);
      return (k.anlasilmadi ? "Komut olarak anlayamadım, aranıyor: " : "Aranıyor: ") + "<b>" + esc(k.q) + "</b>";
    case "git": git(k.yer); return "Açıldı: " + esc(k.yazi || k.yer);
  }
  return "";
}

/* --- Balon --- */
let sesBalon = null, sesTanima = null;
function sesBalonKur(){
  if(sesBalon) return;
  sesBalon = document.createElement("div"); sesBalon.className = "ses-balon";
  sesBalon.innerHTML = '<div class="ses-panel" hidden><div class="ses-yazi"></div><form class="ses-form"><input class="kutu" placeholder="Komut yazın veya konuşun…" autocomplete="off" enterkeyhint="go"><button class="ikon-buton" aria-label="Çalıştır">' + ik("sag") + '</button></form>' +
    '<div class="ses-alt"><button type="button" class="baglanti" data-ses="yardim">Ne diyebilirim?</button><button type="button" class="baglanti" data-ses="kapat">Kapat</button></div></div>' +
    '<button type="button" class="ses-dugme" aria-label="Sesli komut" title="Sesli komut">' + ik("mikrofon") + '</button>';
  document.body.appendChild(sesBalon);
  const panel = sesBalon.querySelector(".ses-panel"), yazi = sesBalon.querySelector(".ses-yazi"), girdi = sesBalon.querySelector("input");
  const goster = h => { panel.hidden = false; yazi.innerHTML = h; };
  const calistir = m => { const k = komutCoz(m); goster('<div class="ses-duyulan">“' + esc(m) + '”</div>' + komutUygula(k)); girdi.value = "";
    clearTimeout(sesBalon.kapat); if(k.tur !== "yardim" && k.tur !== "bos") sesBalon.kapat = setTimeout(() => { if(!sesTanima) panel.hidden = true; }, 6000); };
  sesBalon.querySelector(".ses-form").addEventListener("submit", e => { e.preventDefault(); if(girdi.value.trim()) calistir(girdi.value.trim()); });
  sesBalon.querySelector('[data-ses="yardim"]').addEventListener("click", () => goster(komutUygula({tur:"yardim"})));
  sesBalon.querySelector('[data-ses="kapat"]').addEventListener("click", () => { if(sesTanima) sesTanima.abort(); panel.hidden = true; });
  sesBalon.querySelector(".ses-dugme").addEventListener("click", () => {
    clearTimeout(sesBalon.kapat);
    if(sesTanima){ sesTanima.stop(); return; }
    if(!SesTanima){ goster("Bu tarayıcı konuşmayı tanımıyor; komutu yazabilirsiniz (Chrome, Edge veya Safari'de konuşarak da olur)."); girdi.focus(); return; }
    const t = new SesTanima(); t.lang = "tr-TR"; t.interimResults = true; t.continuous = false; t.maxAlternatives = 1;
    let son = "";
    t.onresult = e => { son = Array.from(e.results).map(r => r[0].transcript).join(" "); goster('<div class="ses-duyulan dinleniyor">' + esc(son) + '…</div>'); };
    t.onerror = e => { if(e.error === "not-allowed" || e.error === "service-not-allowed") goster("Mikrofon izni verilmedi. Tarayıcının site ayarlarından mikrofona izin verin."); else if(e.error === "no-speech") goster("Bir şey duyamadım, tekrar deneyin."); };
    t.onend = () => { sesTanima = null; sesBalon.classList.remove("dinliyor"); if(son.trim()) calistir(son.trim()); };
    sesTanima = t; sesBalon.classList.add("dinliyor"); goster('<div class="ses-duyulan dinleniyor">Dinliyorum…</div><div class="alt-bilgi" style="margin:4px 0 0">Örn: “' + SES_ORNEK[Math.floor(Math.random() * SES_ORNEK.length)] + '”</div>');
    try{ t.start(); }catch(e){ sesTanima = null; sesBalon.classList.remove("dinliyor"); }
  });
}
// Görünürlük: giriş ekranında ve ayarlarda kapatılınca gizli
function sesBalonGuncelle(){
  if(!hazir || Number(cihaz().sesKomut) === 0){ if(sesBalon) sesBalon.hidden = true; return; }
  sesBalonKur(); sesBalon.hidden = false;
}
// Kısayol: Ctrl+Shift+Boşluk ile dinlemeyi başlat
document.addEventListener("keydown", e => { if(hazir && e.ctrlKey && e.shiftKey && e.code === "Space" && sesBalon && !sesBalon.hidden){ e.preventDefault(); sesBalon.querySelector(".ses-dugme").click(); } });
