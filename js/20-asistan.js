"use strict";
// Güneş Mobilya — yardım asistanı: "nasıl yaparım?" sorularına adım adım cevap ve ekranda gösterme
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
// İki katman: 1) uygulamanın içindeki rehber (internetsiz, ücretsiz), 2) kuruluysa yapay zekâ (Claude, Supabase Edge Function "asistan").
// Yapay zekâya yalnız soru, bulunulan ekranın adı, kullanıcının yetkisi ve bu rehber gider; müşteri / kasa kayıtları gönderilmez.

/* ================= REHBER ================= */
// {id, b: başlık, k: anahtar kelimeler (sade), a: adımlar, yer: açılacak ekran, sec: ekranda işaretlenecek öğe, y: yetki ("yonetici" ise ustaya gösterilmez)}
const REHBER = [
  {id:"para-giris", b:"Kasaya para girişi", k:"para giris girdi tahsilat kasa gelir odeme aldim nakit kart havale", yer:"kasa", sec:'[data-git="giris"]', y:"yonetici",
    a:["Kasa'ya gidin, “Para Girdi”ye dokunun.", "Tutarı yazın, “Ne için geldi?” kategorisini seçin.", "Ödeme şeklini (Nakit / Kart / Havale) ve parayı kimin aldığını seçin.", "Müşteriden geldiyse Cari'yi, işe aitse İş emrini seçin.", "Kaydet. Sesle: “Ali Osman'dan 2000 lira tahsilat aldım havale”."]},
  {id:"para-cikis", b:"Kasadan para çıkışı (gider)", k:"para cikis cikti gider harcama odeme yaptim fatura odedim kira elektrik mazot", yer:"kasa", sec:'[data-git="cikis"]', y:"yonetici",
    a:["Kasa'ya gidin, “Para Çıktı”ya dokunun.", "Tutarı yazın, “Ne için çıktı?” kategorisini seçin (Kira, Hammadde, Nakliye…).", "Ödeme şeklini ve “Kim ödedi?” (Kasa / Samet / İbrahim) seçin.", "Tedarikçiye ödemeyse Cari'yi seçin; borcundan düşer.", "Kaydet. Sesle: “İbrahim 500 lira mazot ödedi”."]},
  {id:"aktarim", b:"Kasalar arası aktarım", k:"kasalar arasi aktarim aktar devret birakti kasaya verdi ortagin elindeki para samet ibrahim", yer:"kasa", sec:'[data-is="kasaAktarim"]', y:"yonetici",
    a:["Kasa'da “Kasalar arası aktarım”a dokunun.", "Tutarı yazın; Kimden (örn. İbrahim) ve Kime (örn. Kasa) seçin.", "Ödeme şeklini seçip Kaydet. Toplam para değişmez, gelir / gider sayılmaz.", "Sesle: “İbrahim'den kasaya 3000 lira aktar”."]},
  {id:"ortak-cekis", b:"Ortak çekişi (şahsi harcama)", k:"ortak cekisi sahsi cekti ozel harcama samet ibrahim kar payi", yer:"cikis", sec:'.secenekler[data-ad="kategori"]', y:"yonetici",
    a:["Para Çıktı'yı açın, kategori olarak “Ortak çekişi (şahsi)” seçin.", "“Kim?” sorusunda Samet veya İbrahim'i seçin.", "Tutarı yazıp Kaydet. Kâr hesabına gider olarak girmez; ortak hesabında görünür.", "Sesle: “Samet 2000 lira çekti”."]},
  {id:"ortak-hesap", b:"Ay sonu ortak hesabı", k:"ortak hesabi kar payi ay sonu samet ibrahim pay fark hesaplasma", yer:"ortakhesap", y:"yonetici",
    a:["Rapor → “Ortak hesabı”nı açın.", "Ayı seçin: gelir, gider, net kâr, her ortağın kâr payı, çektiği ve farkı görünür.", "“Yazdır / PDF” ile imzalı çıktı alın."]},
  {id:"sabit-gider", b:"Sabit gider (kira, elektrik, SGK)", k:"sabit gider kira elektrik su dogalgaz internet sgk vergi her ay duzenli odeme", yer:"sabitgiderler", sec:'[data-is="sabitDuzenle"]', y:"yonetici",
    a:["Kasa → “Sabit giderler”e gidin, “Sabit gider ekle”.", "Adı, tutarı, ayın kaçında ödendiğini ve sıklığı yazın.", "Vadesi gelince Yapılacaklar'da hatırlatılır; “Kasaya işle” ile tek tuşla gider olur."]},
  {id:"tahsilat-hatirlat", b:"Borçlu müşterilere hatırlatma", k:"tahsilat hatirlat borclu musteri whatsapp mesaj alacak geciken", yer:"tahsilat", y:"yonetici",
    a:["Cariler → “Tahsilat hatırlat”.", "Gecikenleri / tümünü seçin, mesaj şablonunu kontrol edin.", "“Sırayla gönder” ile her müşteriye WhatsApp mesajı açılır; IBAN ve hesap sahibi mesajda yer alır."]},
  {id:"cari-ekle", b:"Yeni müşteri / tedarikçi ekleme", k:"yeni musteri tedarikci cari ekle kayit", yer:"cariler", sec:'[data-git="cari-form/-/musteri"]', y:"yonetici",
    a:["Cariler → “Yeni Müşteri” veya “Yeni Tedarikçi”.", "Ad, telefon, vergi / TC no ve adresi yazın.", "Eski borcu varsa “Açılış bakiyesi”ne yazın. Kaydet. Sesle: “yeni müşteri Mehmet Kaya”."]},
  {id:"acilis", b:"Açılış bakiyesi (eski borç / alacak)", k:"acilis bakiyesi eski borc alacak devir onceki bakiye baslangic", yer:"acilis", y:"yonetici",
    a:["Cariler → “Açılış bakiyeleri”.", "Müşteriler / Tedarikçiler / Personel / Kasa sekmesinde tutarı ve kimin borçlu olduğunu yazın.", "Açılış tarihini seçip Kaydet. Gelir / gider sayılmaz."]},
  {id:"satis-fatura", b:"Satış faturası kesme", k:"satis faturasi fatura kes musteri faturasi e-arsiv e-fatura", yer:"faturalar", sec:'[data-git="fatura-form/satis"]', y:"yonetici",
    a:["Faturalar → “Satış Faturası”.", "Müşteriyi seçin, kalemleri, miktarı, fiyatı (KDV hariç) ve KDV'yi yazın.", "Peşin ödendiyse ödemeyi işaretleyin; vade ve taksit verilebilir. Kaydet.", "İş emrinden “Fatura hazırla” ile kalemler kendiliğinden gelir."]},
  {id:"alis-fatura", b:"Alış faturası girme", k:"alis faturasi tedarikci faturasi malzeme alis gider", yer:"faturalar", sec:'[data-git="fatura-form/alis"]', y:"yonetici",
    a:["Faturalar → “Alış Faturası”.", "Tedarikçiyi ve kalemleri yazın; işe aitse iş emrini seçin (kârlılığa maliyet olarak girer).", "Kaydet. Ödediyseniz ödemeyi işaretleyin."]},
  {id:"cek", b:"Çek / senet", k:"cek senet portfoy vade ciro tahsil karsiliksiz", yer:"cekler", sec:'[data-is="cekYeni"]',  y:"yonetici",
    a:["Kasa → “Çek / Senet”.", "“Çek / senet al” (müşteriden) veya “ver” (tedarikçiye) seçin, bilgileri yazın.", "Vadesi gelince Yapılacaklar'da hatırlatılır; çeke dokunup tahsil / ciro / karşılıksız işaretleyin."]},
  {id:"ekstre", b:"Banka ekstresini içe aktarma", k:"banka ekstresi excel hesap hareketi eslestir", yer:"ekstre", y:"yonetici",
    a:["Kasa → “Banka ekstresi”.", "Bankadan indirdiğiniz Excel / CSV dosyasını seçin.", "Gelen / giden hareketler müşterilerle eşleşir; onaylayıp kasaya işleyin."]},
  {id:"is-emri", b:"Yeni iş emri / sipariş", k:"yeni is emri siparis teklif musteri isi ac", yer:"isler", sec:'[data-git="is-form"]',
    a:["İş Emirleri → “Yeni iş emri”.", "Müşteriyi, iş başlığını ve kalemleri yazın; “Modülden ekle” ile fiyat hesaplanır.", "Teslim tarihini seçin; formda atölye yüküne göre en erken tarih önerilir.", "Kapora alındıysa yazın, Kaydet. Sesle: “yeni iş emri Ayşe Demir”."]},
  {id:"kesif", b:"Ölçü / keşif", k:"olcu kesif duvar olcusu tesisat yerinde olcu", yer:"ana", sec:'[data-git="is-form/-/-/-/kesif"]',
    a:["Ana sayfa → “Ölçü / Keşif” (ya da iş emrinde “Ölçü / keşif”).", "Duvar uzunluklarını, tavan yüksekliğini, tesisat yerlerini ve notları yazın; fotoğraf ekleyin.", "Kaydet. “Ölçülerden teklif kalemleri oluştur” ile modüllerden teklif çıkar."]},
  {id:"teklif", b:"Teklif hazırlama ve yazdırma", k:"teklif fiyat teklifi yazdir pdf gonder whatsapp", yer:"isler",
    a:["İş emrini açın (durumu “Teklif”).", "Kalemlere fiyat yazın veya “Modülden ekle” / “Malzemeden hesapla” kullanın.", "“Teklifi yazdır”: PDF alın veya WhatsApp ile “Fiyat teklifi” mesajı gönderin.", "Onaylanınca durumu “Sipariş alındı” yapın."]},
  {id:"kesim", b:"Kesim listesi ve plaka planı", k:"kesim listesi plaka sunta mdf parca kesim plani optimizasyon fire", yer:"isler",
    a:["İş emrini açın → “Kesim listesi”.", "“Tüm modüllerden parça üret” veya sipariş kaleminden dolap gövdesi üretin; parçaları düzenleyin.", "Kesim yöntemi “Kolay kesim” iken her plakanın altında sıralı kesim talimatı çıkar.", "“Atölyeye yazdır”, Excel / CSV, parça etiketleri; “Plakaları stoktan düş”."]},
  {id:"plaka", b:"Plaka ölçüsü (2100×2800, 1830×3660)", k:"plaka olcusu ebat 1830 3660 2100 2800 sunta boyutu", yer:"malzemeler", y:"yonetici",
    a:["Stok → “Malzeme listesi”nde birimi “plaka” olan malzemenin ölçüsünü yazın.", "Kesim veya dolap penceresinde malzeme seçiminin yanındaki cetvel düğmesiyle de değiştirilir.", "Aynı malzemenin iki ebadı varsa iki ayrı malzeme ekleyin."]},
  {id:"modul", b:"Modül kütüphanesi (alt / üst dolap fiyatı)", k:"modul kutuphanesi alt dolap ust dolap metretul fiyat m2 gardirop tezgah", yer:"moduller", y:"yonetici",
    a:["Stok → “Modüller”. “Örnek modülleri ekle” ile başlayın.", "Her modülün fiyatlandırmasını (metretül / m² / adet) ve fiyatını yazın.", "İş emrinde “Modülden ekle” ile ölçü yazınca fiyat hesaplanır."]},
  {id:"stok", b:"Stok giriş / çıkış ve sayım", k:"stok giris cikis sayim malzeme azalan", yer:"stok", y:"yonetici",
    a:["Stok sayfasında malzemenin altındaki “+ Giriş”, “− Çıkış” veya “Sayım”a dokunun.", "Miktarı yazın; işe harcandıysa iş emrini seçin (maliyete girer).", "Asgari stoğun altına düşen malzeme Yapılacaklar'da görünür."]},
  {id:"siparis", b:"Tedarikçiye malzeme siparişi", k:"malzeme siparisi tedarikci siparis ver eksik malzeme", yer:"siparisler", y:"yonetici",
    a:["Stok → “Sipariş”.", "Azalan malzemeler tedarikçiye göre gruplanır; “Sipariş hazırla” ile WhatsApp mesajı açılır.", "Malzeme gelince “Teslim al” deyin; stok artar, alış faturası hazırlanabilir."]},
  {id:"randevu", b:"Montaj / teslimat randevusu", k:"randevu montaj teslimat takvim usta ekip saat", yer:"takvim", sec:'[data-is="randevuAc"]',
    a:["Takvim → “Randevu” (ya da günün yanındaki +).", "İş emrini, tarihi, saati, süreyi, türü ve ekibi seçin.", "Aynı ekip aynı saatte iki yerdeyse uyarı çıkar. Müşteriye WhatsApp hatırlatması gönderilebilir."]},
  {id:"kapasite", b:"Atölye yükü ve teslim tarihi", k:"atolye yuku kapasite teslim tarihi gecikme is sirasi", yer:"kapasite",
    a:["İş Emirleri → “Atölye yükü”.", "Haftalık yük, iş sırası ve teslime yetişmeyecek işler görünür.", "Ekip sayısı ve iş süreleri: Ayarlar → Atölye kapasitesi."]},
  {id:"puantaj", b:"Personel puantajı", k:"puantaj personel geldi gelmedi izin mesai devam", yer:"puantaj", y:"yonetici",
    a:["Personel → “Puantaj”.", "Her çalışan için Geldi / Yarım gün / İzinli… işaretleyin, mesaiyi yazın.", "Ay sonunda “Maaş / Ödeme”de hakediş hesaplanır."]},
  {id:"maas", b:"Maaş ve avans ödeme", k:"maas avans odeme hakedis personel ucret prim kesinti", yer:"maas/ay", y:"yonetici",
    a:["Personel → “Maaş / Ödeme”.", "Hakedişleri kaydedin; ödeme veya avans verince kasaya da gider olarak işlenir.", "Personel kartında hesap hareketleri ve kalan alacak görünür."]},
  {id:"katalog-gonder", b:"Müşteriye katalog gönderme", k:"katalog gonder musteriye link baglanti proje fotograf paylas vitrin", yer:"katalog", y:"yonetici",
    a:["Katalog → “Müşteriye gönder”.", "Projeleri / kategoriyi seçin, süreyi belirleyin.", "Oluşan bağlantıyı WhatsApp ile gönderin; müşteri giriş yapmadan görür."]},
  {id:"kdv", b:"KDV özeti ve muhasebeci paketi", k:"kdv ozeti muhasebeci paketi beyanname excel zip vergi", yer:"rapor", sec:'[data-is="muhasebePaketi"]', y:"yonetici",
    a:["Rapor → “KDV özeti”: ayın hesaplanan / indirilecek KDV'si.", "Rapor → “Muhasebeci paketi”: KDV, faturalar, kasa, cari bakiyeleri, çekler ve personel ödemeleri tek ZIP.", "Telefonda doğrudan WhatsApp / e-postayla paylaşılır."]},
  {id:"yedek", b:"Yedek alma ve geri yükleme", k:"yedek al geri yukle zip yedekleme veri kaybi", yer:"ayarlar/yedek", y:"yonetici",
    a:["Ayarlar → “Yedek ve veri”.", "“Yedek al” (kayıtlar) veya “Dosyalı yedek (ZIP)” (fotoğraflarla).", "Sunucu her gece otomatik yedek de alır; “Geri yükle” ile dosyadan geri dönülür."]},
  {id:"cop", b:"Silineni geri getirme (çöp kutusu)", k:"cop kutusu silinen geri getir yanlislikla sildim", yer:"ayarlar/cop", y:"yonetici",
    a:["Ayarlar → “Çöp kutusu”.", "Silinen kaydı bulup “Geri yükle”ye dokunun; bağlı notları ve dosyalarıyla döner.", "Varsayılan 30 gün sonra kalıcı silinir."]},
  {id:"kullanici", b:"Usta / kullanıcı ekleme ve yetki", k:"kullanici ekle usta yetki muhasebeci giris sifre hesap", yer:"ayarlar/kullanicilar", y:"yonetici",
    a:["Ayarlar → “Kullanıcılar ve yetkiler”: kullanıcı adı, adı ve yetkisini (Yönetici / Usta / Muhasebeci) ekleyin.", "Supabase → Authentication → Users → Add user ile aynı kullanıcı adıyla (örn. ali@gunesmobilya.app) şifreli hesap açın.", "Usta fiyat, kasa ve faturaları görmez; muhasebeci her şeyi görür ama değiştiremez."]},
  {id:"bildirim", b:"Bildirimler", k:"bildirim zil telefon bildirimi sessiz saat uyari", yer:"ayarlar/bildirim",
    a:["Üstteki zil: ortağınızın / ustanın işlemleri ve Yapılacaklar.", "Ayarlar → Bildirimler: türler, ses, sessiz saatler.", "Uygulama kapalıyken bildirim için aynı sayfadaki kurulum adımlarını izleyin."]},
  {id:"sesli-komut", b:"Sesli komut ve asistan", k:"sesli komut mikrofon konus balon asistan yapay zeka", yer:"ana",
    a:["Sağ alttaki balona dokunup konuşun: “kasaya 500 lira nakit girdi”, “İbrahim'den kasaya 3000 aktar”, “takvimi aç”.", "“… nasıl yapılır?” diye sorun: adımları anlatır, “Göster” ile ekranda işaretler.", "Para komutları formu doldurur; kontrol edip Kaydet'e basarsınız."]},
  {id:"mesaj-sablon", b:"WhatsApp mesaj şablonları", k:"mesaj sablonu whatsapp metin degistir odeme hatirlatma iban hesap sahibi", yer:"ayarlar/mesajlar", y:"yonetici",
    a:["Ayarlar → “Mesaj şablonları”nda her mesajı değiştirin; {ad}, {tutar}, {hesap} gibi alanlar doldurulur.", "IBAN, banka ve hesap sahibi: Ayarlar → Firma bilgileri."]}
];
const DURAK = new Set("nasil nasil yapilir yaparim yapabilirim yapmaliyim nerede nereden neden niye ne nedir bir bu su ile ve icin mi mu mi acaba lutfen bana anlat goster ogret acikla yap yapiyorum istiyorum var".split(" "));
function rehberBul(soru, kac = 1){
  const k = sade(soru).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !DURAK.has(w));
  if(!k.length) return [];
  return REHBER.filter(r => r.y !== "yonetici" || (yetki.yonetici && !yetki.salt))
    .map(r => { const m = sade(r.b + " " + r.k);
      // Türkçe ekler için kelimenin kökü aranır: "muhasebeciye" → "muhasebeci"; uzun kök daha çok puan
      const puan = w => { for(let n = w.length; n >= 5 || n === w.length; n--){ if(n < 3) break; if(m.indexOf(w.slice(0, n)) >= 0) return n >= 8 || n === w.length && n > 4 ? 2 : 1; } return 0; };
      return {r, p:k.reduce((t, w) => t + puan(w), 0)}; })
    .filter(x => x.p > 0).sort((a, b) => b.p - a.p).filter((x, i, l) => i === 0 || x.p >= l[0].p * 0.75).slice(0, kac).map(x => x.r);   // ikinci konu yalnız neredeyse aynı uygunsa
}
const rehberHtml = r => '<div class="rehber-cevap"><b>' + esc(r.b) + '</b><ol>' + r.a.map(x => '<li>' + esc(x) + '</li>').join("") + '</ol>' +
  (r.yer ? '<button type="button" class="buton kucuk" data-rehber="' + r.id + '">' + ik("sag") + 'Göster</button>' : '') + '</div>';
// Ekrana gidip ilgili düğmeyi işaretler
function rehberGoster(id){
  const r = REHBER.find(x => x.id === id); if(!r) return;
  if(r.yer && location.hash !== "#" + r.yer) git(r.yer);
  let n = 0;
  const bak = () => {
    const el = r.sec && document.querySelector(".sayfa " + r.sec + ", .menu " + r.sec);
    if(!el && n++ < 15) return setTimeout(bak, 80);
    document.querySelectorAll(".rehber-isaret").forEach(x => x.classList.remove("rehber-isaret"));
    if(!el) return;
    el.scrollIntoView({block:"center", behavior:"smooth"}); el.classList.add("rehber-isaret");
    setTimeout(() => el.classList.remove("rehber-isaret"), 6000);
  };
  setTimeout(bak, 120);
}
// Yapay zekâya verilen rehber metni (rotalar dahil)
const rehberMetni = () => REHBER.map(r => "## " + r.b + " [konu:" + r.id + "]" + (r.yer ? " (ekran: " + r.yer + ")" : "") + (r.y === "yonetici" ? " — yalnız yönetici" : "") + "\n" + r.a.map((x, i) => (i + 1) + ". " + x).join("\n")).join("\n\n");

/* ================= YAPAY ZEKÂ (CLAUDE) ================= */
// Supabase Edge Function "asistan" (supabase/functions/asistan/index.ts). Kurulu değilse veya hata verirse rehber kullanılır.
let yzDurum = null;   // null: bilinmiyor, "var", "yok"
const yzGecmis = [];  // son sorular / cevaplar (takip soruları için)
const yzAcik = () => cevrimici && sb && sb.functions && Number(cihaz().yzKapali) !== 1 && yzDurum !== "yok";
async function yzSor(soru){
  const r = await sb.functions.invoke("asistan", {body:{soru, gecmis:yzGecmis.slice(-6), ekran:yol().filter(Boolean).join("/") || "ana",
    rol:yetki.salt ? "muhasebeci" : yetki.yonetici ? "yonetici" : "usta", rehber:rehberMetni()}});
  if(r.error || !r.data || !r.data.cevap) throw r.error || new Error((r.data && r.data.hata) || "cevap yok");
  yzDurum = "var";
  yzGecmis.push({role:"user", content:soru}, {role:"assistant", content:r.data.cevap});
  while(yzGecmis.length > 6) yzGecmis.splice(0, 2);
  return r.data.cevap;
}
// Cevaptaki [[git:rota|Yazı]] ve [[konu:kimlik]] işaretleri düğmeye çevrilir
function yzHtml(m){
  const dugme = [];
  let t = esc(m).replace(/\[\[git:([\w\-\/]+)(?:\|([^\]]{1,40}))?\]\]/g, (x, y, a) => { dugme.push('<button type="button" class="buton kucuk ikincil" data-yzgit="' + esc(y) + '">' + ik("sag") + esc(a || "Aç") + '</button>'); return ""; })
    .replace(/\[\[(?:konu|goster):([\w\-]+)\]\]/g, (x, id) => { if(REHBER.some(r => r.id === id)) dugme.push('<button type="button" class="buton kucuk" data-rehber="' + id + '">' + ik("sag") + 'Göster</button>'); return ""; });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  return '<div class="yz-cevap">' + t + (dugme.length ? '<div class="buton-sira" style="margin-top:8px">' + dugme.join("") + '</div>' : '') + '</div>';
}
// Sesli komut balonundan gelen soru: önce yapay zekâ (kuruluysa), olmazsa rehber
function asistanCevapla(soru, kutu){
  const yerel = rehberBul(soru, 2);
  const rehberle = not => { kutu.innerHTML = (not ? '<div class="alt-bilgi" style="margin:0 0 6px">' + not + '</div>' : '') +
    (yerel.length ? yerel.map(rehberHtml).join("") : 'Bunu rehberde bulamadım. “Ne diyebilirim?” ile örneklere bakın ya da başka kelimelerle sorun (örn. “kasalar arası aktarım nasıl yapılır”).'); };
  if(!yzAcik()){ rehberle(""); return; }
  kutu.innerHTML = '<div class="alt-bilgi" style="margin:0">Düşünüyorum…</div>';
  yzSor(soru).then(c => { kutu.innerHTML = yzHtml(c); })
    .catch(e => { const msg = String((e && (e.message || e.name)) || ""); if(!/Failed to fetch|network/i.test(msg)) yzDurum = "yok"; rehberle(yzDurum === "yok" && yetki.yonetici ? "Yapay zekâ kurulu değil; uygulama rehberinden:" : ""); });
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-yzgit]"); if(g){ const p = g.closest(".ses-panel"); if(p && matchMedia("(max-width:899px)").matches) p.hidden = true; git(g.getAttribute("data-yzgit")); return; }
  const r = e.target.closest("[data-rehber]"); if(!r) return;
  const p = r.closest(".ses-panel"); if(p) p.hidden = true;   // işaretlenen düğmenin üstünü kapatmasın
  rehberGoster(r.getAttribute("data-rehber"));
});

/* --- Ayarlar → Yapay zekâ asistanı --- */
const ASISTAN_KOD_ADRES = "https://github.com/gavalkadir2-tech/gunes/blob/main/supabase/functions/asistan/index.ts";
function ayarAsistan(){
  const c = cihaz(), kapali = Number(c.yzKapali) === 1;
  return '<div class="kart">' + kartBaslik("Yardım asistanı") +
      '<div class="alt-bilgi" style="margin:0 0 8px">Sağ alttaki balona “kasalar arası aktarım nasıl yapılır?” gibi sorular sorun: adımları anlatır, “Göster” ile ilgili düğmeyi ekranda işaretler. Uygulama rehberi internetsiz ve ücretsiz çalışır.</div>' +
      '<label class="satir" style="cursor:pointer"><span class="orta"><div class="s1">Sorularda yapay zekâ kullan</div><div class="s2" style="white-space:normal">Kuruluysa serbest sorulara Claude cevap verir; kurulu değilse rehber kullanılır.</div></span>' +
        '<span class="anahtar"><input type="checkbox" id="yzAcik"' + (kapali ? '' : ' checked') + '><i></i></span></label>' +
      (cevrimici ? '<div class="buton-sira"><button class="buton ikincil kucuk" style="margin:0" data-is="yzDene">' + ik("mesaj") + 'Yapay zekâyı dene</button></div><div class="alt-bilgi" id="yzSonuc"></div>' : '') + '</div>' +
    (cevrimici && yetki.yonetici && !yetki.salt ? '<div class="kart">' + kartBaslik("Yapay zekâ kurulumu", "(bir kerelik)") +
      '<ol class="adimlar"><li><b>console.anthropic.com</b> adresinden hesap açıp <b>API Keys</b> bölümünde bir anahtar oluşturun (kullanım başına ücretlidir; kısa bir soru yaklaşık 1–3 kuruş tutar).</li>' +
      '<li>Supabase → <b>Edge Functions</b> → <b>Secrets</b> → <b>Add new secret</b>: adı <b>ANTHROPIC_API_KEY</b>, değeri anahtarınız.</li>' +
      '<li>Supabase → <b>Edge Functions</b> → <b>Deploy a new function</b> → <b>Via Editor</b>: adı <b>asistan</b>, <a href="' + ASISTAN_KOD_ADRES + '" target="_blank" rel="noopener">bu dosyanın</a> içeriğini yapıştırıp <b>Deploy</b>.</li>' +
      '<li>Buradaki “Yapay zekâyı dene” düğmesiyle kontrol edin.</li></ol>' +
      '<div class="alt-bilgi">Yapay zekâya yalnız soru, bulunduğunuz ekranın adı ve yetkiniz gider; müşteri, kasa ve fatura kayıtları gönderilmez.</div></div>' : '');
}
document.addEventListener("change", e => { if(e.target.id === "yzAcik"){ cihazKaydet({yzKapali:e.target.checked ? 0 : 1}); if(e.target.checked) yzDurum = null; bildir("Kaydedildi"); } });
EYLEM.yzDene = btn => {
  const s = document.getElementById("yzSonuc"); yzDurum = null; s.textContent = "Soruluyor…";
  yzSor("Tek cümleyle: kasalar arası aktarım ne işe yarar?").then(c => { s.innerHTML = '<span style="color:var(--giris)">Çalışıyor.</span> ' + yzHtml(c); })
    .catch(e => { yzDurum = null; s.innerHTML = '<span class="t-cikis">Çalışmadı:</span> ' + esc(hataMesaji(e)) + '. Kurulum adımlarını kontrol edin.'; });
};
