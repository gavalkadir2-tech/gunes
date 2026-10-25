# ☀️ Güneş Mobilya — İşletme Yönetimi

![Güneş Mobilya](logo.png)

Telefondan ve bilgisayardan kullanılan sade kasa ve veresiye defteri.

## Neler var?
- **Katalog (showroom)**: Mutfak, banyo, gardırop, TV ünitesi (kategoriler Ayarlar'dan değiştirilebilir) projeleri; proje adı, açıklama, malzeme, ölçü ve isteğe bağlı tahmini fiyat. Telefondan fotoğraf çekme veya toplu fotoğraf / video yükleme; kapak seçme, sıralama, döndürme, başka projeye taşıma, silme
- **ZIP'ten toplu içe aktarma**: Klasörlere ayrılmış fotoğrafları (ör. Facebook yedeğindeki albümler) tek seferde içe aktarır; her klasör bir proje olur. Önizlemede gruplar seçilir, adı ve kategorisi değiştirilir. İsteğe bağlı `katalog.json` ile proje adı, kategori, malzeme ve açıklama hazır gelir
- **Ustalardan fiyat gizleme**: İş emrinin tutarı, teklif ve kalem fiyatları, maliyetleri ayrı bir tabloda durur; yalnız yönetici okuyabilir (usta teknik yolla da göremez). Malzeme maliyet listesi de yalnız yöneticiye açıktır; usta kesim planı için plaka adlarını ve ölçülerini fiyatsız görür.
- **Çakışma uyarısı**: Bir kaydı siz açtıktan sonra başka biri (örn. diğer ortak) değiştirdiyse kaydederken “Bu kaydı İbrahim 14:32'de değiştirdi” penceresi çıkar; farklar gösterilir, “Onun halini kullan” veya “Benimkini yine de kaydet” seçilir. İş emrinde son değişikliği kimin yaptığı görünür.
- **Hızlı açılış**: Uygulama cihazdaki son kopyayla hemen açılır, ardından yalnız değişen ve silinen kayıtları çeker; ilk açılışta tüm tablolar aynı anda yüklenir.
- **Toplu tahsilat hatırlatması**: Cariler → Tahsilat hatırlat; vadesi geçen alacaklar, düzenlenebilir mesaj şablonu, WhatsApp'tan sırayla gönderim, son hatırlatma tarihi.
- **Banka ekstresi**: Kasa → Banka ekstresi; bankadan indirilen Excel / CSV okunur, gelen havaleler müşteri adı ve açık fatura tutarıyla eşleştirilir, kasada zaten olanlar işaretlenir, seçilenler kasaya işlenir.
- **Tedarikçi fiyat karşılaştırma**: Stok → Tedarikçi fiyatları; alış faturaları ve siparişlerden her malzemenin tedarikçi bazında son / en düşük / en yüksek fiyatı, en ucuz tedarikçi; sipariş önerisinde de gösterilir.
- **Müşteri kampanyası**: Cariler → Kampanya mesajı; son işi belirli yıl önce olan, iş türüne göre süzülmüş müşterilere katalog bağlantısıyla sıralı WhatsApp mesajı.
- **Önce / sonra görseli**: İş emrinin fotoğraflarından keşif ve teslim fotoğrafı yan yana (kare, dikey, yatay), logolu; indirme, paylaşma, kataloğa ekleme.
- **Otomatik günlük yedek**: Her gece 03:15'te (Supabase pg_cron) tüm kayıtların kopyası sunucuda alınır, son 30 gün saklanır; pg_cron yoksa yönetici uygulamayı her gün ilk açtığında alınır. Ayarlar → Yedek ve veri'den yedek dosya olarak indirilir veya “Bu yedeğe dön” ile geri yazılır (önce o anki durumun da yedeği alınır).
- **KDV özeti**: Rapor → KDV özeti; seçilen ayın satış (hesaplanan) ve alış (indirilecek) KDV'si oranlara göre, ödenecek / devreden KDV; muhasebeci için 3 sayfalık Excel (özet, satış ve alış faturaları), telefonda doğrudan paylaşma.
- **Toplu fiyat güncelleme**: Stok → Toplu fiyat; malzeme maliyetlerini (ada / tedarikçiye göre süzerek) veya katalog fiyatlarını (kategoriye göre, yuvarlayarak) yüzdeyle güncelleme, önizleme ve açık tekliflerin kârına etkisi.
- **Aylık hedefler**: Ayarlar → Aylık hedefler; alınan sipariş, teslim edilen işlerin kârı ve teklif dönüşümü için hedef; ana sayfada ayın gününe göre beklenen çizgisiyle ilerleme çubukları.
- **Araç ve yakıt takibi**: Araçlar sayfası; yakıt (litre, km, ortalama L/100 km), bakım (sonraki bakım km / tarih), muayene, sigorta, kasko; masraf kasaya ve iş emrine yazılabilir; bitiş tarihleri ve bakım kilometresi Yapılacaklar'da hatırlatılır.
- **QR kodlu etiket**: İş emrinde “QR etiket bas”; paket / koli etiketleri veya kesim listesinden parça etiketleri (küçük, orta, büyük; A4 yapışkanlı etikete). Telefon kamerasıyla okutunca iş açılır, usta sıradaki aşamayı tek dokunuşla işaretler.
- **Kesim listesi Excel / CSV**: Kesim sayfasında parça listesi (boy, en, adet, malzeme, kalınlık, damar, kenar bantları) kesim makinesi / kesim yapan tedarikçi için Excel ve CSV olarak indirilir.
- **Ortaklar ve kişi kasaları** (Kasa içinde): İki patron ortak (Samet ve İbrahim, varsayılan %50 / %50; Ayarlar → Ortaklar). Para girerken / çıkarken “para kimde / kim ödedi” (Kasa, Samet, İbrahim) seçilir; Kasa'nın üstünde “Kasada …, Samet'te …, İbrahim'de …” görünür. Ortağın şahsi aldığı para Para Çıktı → “Ortak çekişi (şahsi)” → Kim? ile, koyduğu para Para Girdi → “Ortak sermayesi” ile girilir; elden ele / kasaya bırakılan para “Kasalar arası aktarım” ile. Kasa'da “Ortak hareketleri” filtresi, Rapor'da ortakların aylık kâr payı ve çektikleri.
- **Montaj takvimi**: Haftalık montaj / teslimat / keşif / servis randevuları; ekip seçimi, aynı kişinin aynı saatte iki yerde olduğu çakışma uyarısı, teslim tarihi olup randevusu verilmemiş işler, müşteriye tek dokunuşla WhatsApp hatırlatma (yarınki randevular Yapılacaklar'da hatırlatılır).
- **Usta ekranı**: Usta girişte bugünkü randevularını (saat, adres, yol tarifi, müşteriyi arama, sesli not, “Bitti”) ve kendi işlerini büyük düğmelerle görür; sıradaki aşamayı tek dokunuşla tamamlar.
- **Sesle not**: Tarayıcının konuşma tanıma özelliğiyle (Chrome, Edge, Safari) not yazıya dönüşür.
- **Genel arama** (Ctrl+K veya üstteki büyüteç): cari, telefonun son haneleri, iş emri, fatura, katalog, personel, kasa, çek, malzeme.
- **Kesim listesi ve plaka optimizasyonu**: İş emrinde parça listesi (elle veya sipariş kalemindeki dolap ölçüsünden gövde, raf, arkalık, kapak üretimi), testere kalınlığı ve kenar payıyla plaka yerleşimi (desen yönü korunur), plaka sayısı, fire, kenar bandı metresi, plaka maliyeti, atölyeye yazdırılabilir kesim planı, plakaları stoktan düşme.
- **Proje kârlılığı**: İş başına KDV hariç satış, malzeme / işçilik / nakliye / diğer maliyet (işe bağlı alış faturaları, giderler, stoktan çıkan malzeme, elle eklenen maliyetler) ve net kâr; Rapor → Proje kârlılığı'nda iş türüne göre kâr ve marj.
- **Malzeme siparişi**: Asgari stokun altına düşen malzemeler tedarikçiye göre gruplanır, önerilen miktarla sipariş ve WhatsApp mesajı hazırlanır; teslim alınca stoka girer, alış faturası sipariş kalemleriyle hazır açılır.
- **Çek / senet portföyü**: Alınan ve verilen çek / senetler, vadeye göre aylık liste; tahsile verme, tahsil, ciro, karşılıksız, iade, ödeme işlemleri kasa ve cari hesaplarına doğru yansır; vadesi yaklaşanlar hatırlatılır.
- **e-Fatura / e-Arşiv**: Satış faturasından GİB UBL-TR 1.2 XML dosyası (VKN / TCKN kontrolüyle); özel entegratörün paneline “XML içe aktar” ile yüklenir. Doğrudan gönderim için entegratör API hesabı gerekir.
- **İnternetsiz çalışma**: Uygulama dosyaları cihazda saklanır (sw.js); internet yokken son eşitlenen bilgiler açılır, yapılan kayıtlar cihazda sıraya alınır ve internet gelince sırayla gönderilir. Fotoğraf / dosya yükleme için internet gerekir.
- **Ayarlar** (bölümlere ayrılmış): firma bilgileri (ad, telefon, e-posta, adres, vergi, banka / IBAN), teklif ve fatura (geçerlilik, kâr, teklif / fatura notu, iş emri ve fatura numara önekleri, varsayılan KDV, KDV oranları), iş emirleri (üretim aşamaları, keşif listesi, hatırlatma günleri, müşteri bağlantısı süresi), listeler (ödeme şekilleri, gelir / gider / katalog kategorileri, birimler, malzeme fiyatları), personel hesaplama, kullanıcılar ve yetkiler, görünüm (açık / koyu tema, yazı boyutu, açılış sayfası, firma rengi, menüde görünen modüller), bildirimler (kategori, ses, ekranda uyarı, telefon bildirimi, sessiz saatler, günlük özet, hangi hatırlatmaların görüneceği), güvenlik (PIN ile ekran kilidi, otomatik çıkış), **mesaj şablonları** ({ad}, {is}, {tutar}… alanlı WhatsApp mesajları: sipariş onayı, üretim, hazır, teslim, ödeme, randevu, tedarikçi siparişi, tahsilat, kampanya), **yazdırma ve belgeler** (teklif başlığı, logo, fotoğraf sayısı, kalem fiyatları, IBAN, imza alanı, alt bilgi), **takvim** (varsayılan randevu saati / süresi, çalışma günleri, müşteriye kaç gün önce hatırlatılacağı), depolama kullanımı, yedek ve ayarları dosyaya alma / yükleme, tüm ayarları varsayılana döndürme. Ayarlar menüsünün üstünde arama kutusu vardır.
- **Bildirim merkezi**: Üst çubuktaki zil; ortağınızın veya ustanın yaptığı işlemler (yeni iş emri, biten aşama, verilen randevu, kasaya giren / çıkan para, fatura, çek, sipariş, eklenen fotoğraf, ayar değişikliği) ve Yapılacaklar tek panelde. Okunmamışlar sayılır, türe göre süzülür, tıklayınca ilgili kayda gider. Uygulama açıkken ekranda kısa uyarı, ses ve telefon bildirimi verilebilir (Ayarlar → Bildirimler). Bildirimler her cihazda kişiye özel saklanır (son 30 gün).
- **Uygulama kapalıyken bildirim**: Telefon ekranı kapalıyken de “İbrahim iş emri ekledi” gibi bildirimler gelir. Bir kerelik kurulum (Ayarlar → Bildirimler'de adımlar yazar): `supabase-guncelleme-14.sql` çalıştırılır; Supabase → **Edge Functions → Deploy a new function → Via Editor** ile adı `bildirim-gonder` olan işlev oluşturulup `supabase/functions/bildirim-gonder/index.ts` dosyasının içeriği yapıştırılır; uygulamada **Kur** denir; her telefonda **Bu cihazda aç** denir. iPhone'da uygulama “Ana Ekrana Ekle” ile eklenip oradan açılmalıdır (iOS 16.4+).
- **Modül kütüphanesi**: Alt / üst dolap, boy dolap, gardırop, tezgah gibi standart ürünler metretül, m² veya adet fiyatıyla tanımlanır (Stok → Modüller). İş emrinde **Modülden ekle** ile ölçü yazılınca fiyat hesaplanır; maliyet yazılmamışsa plaka fiyatlarından tahmin edilir. Kesim listesinde **Tüm modüllerden parça üret** gövde, raf, kapak ve arkalık parçalarını çıkarır.
- **Keşiften teklife**: Ölçü / keşif ekranında duvar uzunlukları yazıldıktan sonra **Ölçülerden teklif kalemleri oluştur** ile her duvara gelecek modüller seçilir; teklif kalemleri ve fiyatı kendiliğinden oluşur.
- **Atölye kapasitesi**: Sıradaki ve üretimdeki işler, ekip sayısına göre iş günlerine yerleştirilir; haftalık atölye yükü, teslim tarihine yetişmeyecek işler ve yeni bir işe verilebilecek en erken teslim tarihi görünür (İş Emirleri → Atölye yükü). İş emri formunda “atölye süresi” ve teslim önerisi vardır. Ekip sayısı ve iş türüne göre süreler: Ayarlar → Atölye kapasitesi.
- **Açılış bakiyeleri**: Uygulamaya geçmeden önceki bakiyeler — müşterinin borcu, tedarikçiye borcunuz, personelin alacağı / avansı, kasadaki ve ortakların elindeki para (nakit / banka). Cari ve personel formunda veya toplu olarak Cariler → **Açılış bakiyeleri** ekranından girilir; cari ekstresinin en başında görünür, gelir / gider sayılmaz (`supabase-guncelleme-15.sql`).
- **Sabit giderler**: Kira, elektrik, internet, SGK gibi düzenli ödemeler (her ay, 2 / 3 / 6 ayda bir, yılda bir) tanımlanır; vadesi yaklaşınca Yapılacaklar'da hatırlatılır, tek tuşla (tutar düzeltilerek) kasaya işlenir (Kasa → Sabit giderler).
- **Ay sonu ortak hesabı**: Seçilen ayın gelir / gider dökümü, net kâr, Samet ve İbrahim'in kâr payı, şahsi çekişleri, koyduğu sermaye, bu ayki ve yıl içi birikmiş farkı, ay sonunda elindeki para; imza alanlarıyla yazdırılır / PDF alınır (Rapor → Ortak hesabı).
- **Muhasebeci**: Rapor → **Muhasebeci paketi** ayın KDV özeti ve faturaları, kasa hareketleri, cari bakiyeleri, çek / senet listesi ve personel ödemelerini tek ZIP olarak verir (telefonda doğrudan WhatsApp / e-postayla paylaşılır). Kullanıcılar'da **Muhasebeci** yetkisi verilen hesap her şeyi görür, hiçbir şeyi değiştiremez (veritabanında da engellidir; `supabase-guncelleme-14.sql`).
- **Telefondan paylaşma**: Uygulama telefona eklendiyse galeriden veya WhatsApp'tan fotoğraf, video ya da PDF seçip **Paylaş → Güneş Mobilya** denir; açılan ekranda iş emri seçilince dosyalar o işe yüklenir.
- **Fotoğraf boyutu ve video arşivi**: Fotoğraflar yüklenirken seçilen boyuta küçültülür (Ayarlar → Yedek ve veri); daha önce yüklenmiş büyük fotoğraflar da tek tuşla küçültülebilir. Belirli bir süreden eski videolar ZIP olarak indirilip buluttan silinebilir.
- **Ana sayfa düzeni**: Ana sayfadaki kartların sırası ve görünürlüğü Ayarlar → Ana sayfa'dan herkes için ayarlanır.
- **Çöp kutusu**: Silinen her kayıt bağlı notları, dosyaları, taksitleriyle birlikte çöp kutusuna gider; Ayarlar → Çöp kutusu'ndan geri yüklenir. Süresi (varsayılan 30 gün, 7–365 arası ayarlanır) dolan kayıtlar ve dosyaları kalıcı silinir.
- **İşlem geçmişi**: Kim, ne zaman, hangi cihazla (telefon / bilgisayar, tarayıcı), hangi kaydı ekledi / değiştirdi / sildi / geri yükledi; değişen alanlar eski → yeni olarak görünür. Giriş-çıkış ve yedekler de kaydedilir. Kişi, işlem, bölüm, zaman ve metinle süzülür, CSV (Excel) olarak indirilir. Kişi ve zaman sunucuda yazılır; kayıtlar düzenlenemez, 30 günden yeniler silinemez.
- **3B çizim görüntüleyici**: IntelliCAD / AutoCAD çizimleri (*.dwg) ve *.stl dosyaları tarayıcıda 3B açılır: döndürme, kaydırma, yakınlaştırma, üst / ön / yan / 3B görünüm, katı / tel kafes, katman aç-kapa, model boyutu (çizim birimiyle), görüntüyü projeye veya iş emrine fotoğraf olarak ekleme. Katalog projesine ve iş emri dosyalarına DWG / STL yüklenebilir; katalogdaki “3B çizim aç” ile dosya yüklemeden de bakılabilir.
  - Okunanlar: çizgi, yay, daire, elips, çoklu çizgi (kavisli, kalınlıklı), 3B çoklu çizgi, spline, 3DFACE, SOLID, blok (INSERT, dizi), çok yüzlü ağlar (PFACE — ADeko gibi mutfak programlarının çıktısı), 3B katılar (3DSOLID / REGION / BODY; düz yüzler katı, eğri yüzler kenar çizgisi olarak).
  - **Gerçekçi görünüm** (varsayılan): katman adlarına göre malzeme atanır — gövde / kapak / korniş / baza krem lake, tezgah beyaz mermer, cam saydam, kulp ve alüminyum metal, beyaz eşya paslanmaz, zemin koyu parlak; tavan ve HITBOX gibi yardımcı katmanlar gizlenir. Yansımalar için oda ışığı kullanılır. *CAD renkleri* düğmesi çizimdeki orijinal renklere döner.
  - DWG 2000–2018 okunur. **3B katılar DWG 2000–2010'da** görünür; 2013 ve sonrası DWG'de katı verisi okunamaz → IntelliCAD'de *Farklı Kaydet → AutoCAD 2010 Çizimi (*.dwg)* ile kaydedin veya katıları `STLOUT` ile STL olarak alın.
  - Henüz gösterilmeyenler: çokyüzlü / mesh (PFACE, MESH), yazılar ve ölçülendirmeler.
  - DWG okuma için [LibreDWG](https://github.com/mlightcad/libredwg-web) (GPL-3.0) bir çizim açıldığında CDN'den yüklenir; 3B çizim için three.js (MIT). ACIS okuyucu (`acis.js`) ezdxf'in (MIT) ACIS yapısı örnek alınarak yazılmıştır.
- **Sunum modu**: Fotoğrafları müşteriye tam ekranda gösterir; ileri/geri oklar, telefonda kaydırma, klavye (← → Boşluk, Esc), otomatik geçiş, proje bilgilerini aç/kapat. Tek proje, tek kategori veya tüm katalog sunulabilir
- **Müşteriye katalog bağlantısı**: Seçilen projeler giriş gerektirmeyen bir sayfa olarak WhatsApp'tan gönderilir (7 / 30 / 90 gün veya süresiz). Müşteri fotoğrafları tam ekran izler, tek dokunuşla WhatsApp'tan yazar veya arar. Bağlantı kapatılınca paylaşılan fotoğraf kopyaları silinir; asıl katalog gizli kalır
- **Ayrıntılı teklif**: Tüm fiyatlar KDV hariç yazılır; seçilen KDV oranı (yok / %1 / %10 / %20) üstüne eklenir. Kalem kalem birim fiyat, indirim, geçerlilik tarihi; firma telefonu / adresi / IBAN ve teklif notu ile yazdırılabilir / PDF teklif. “Teklif onaylandı — siparişe çevir” ile sipariş olur, kalemler ve fiyatlar satış faturasına aktarılır
- **Malzeme fiyat listesi ve hızlı hesap**: Malzemelerin maliyetleri bir kez girilir; teklifte “Malzemeden hesapla” ile miktar + işçilik + kâr oranından önerilen birim fiyat ve tahmini kâr çıkar
- **Ölçü / keşif formu**: Mekân, tavan yüksekliği, duvar ölçüleri, tesisat ve engeller (su, elektrik, doğalgaz, pencere…), notlar ve fotoğraflar; iş emrine bağlı. Ana sayfadan “Ölçü / Keşif” ile başlar
- **Katalogdan teklif / iş emri**: Seçilen projeden bilgiler ve fotoğraflar aktarılmış, “Teklif” durumunda iş emri açılır (fiyat isteğe bağlı); müşteriye yazdırılabilir / PDF fiyat teklifi ve WhatsApp teklif mesajı
- **Cariler**: Müşteri ve tedarikçiler, bakiye (alacak/borç), hesap ekstresi
- **İş emirleri**: Sipariş kalemleri (ürün, ölçü, renk, adet), öncelik, sorumlu usta, teslimat adresi, üretim aşamaları (tek dokunuşla işaretlenir), notlar ve işlem geçmişi, **fotoğraf / video / dosya yükleme** (telefondan doğrudan kamera), kapora; işe bağlı faturalar, ödemeler, maliyet ve kâr; yazdırılabilir iş formu
- **WhatsApp**: Müşteriye hazır mesaj şablonlarıyla (sipariş onayı, üretimde, hazır, teslim, ödeme hatırlatma) mesaj; cari ve fatura için de. Durum değişince "müşteriye haber verilsin mi?" diye sorar. Fotoğraf/videoyu telefondan doğrudan WhatsApp'a paylaşır. Mesaj WhatsApp'ta açılır, **Gönder**'e siz basarsınız (WhatsApp Business API gerekmez).
- **Personel**: Çalışan kartı (görev, telefon, IBAN, işe giriş / ayrılış, aylık maaş / haftalık ücret / günlük yevmiye, yıllık izin hakkı); günlük puantaj (geldi, yarım gün, gelmedi, ücretli / ücretsiz izin, raporlu, tatil, fazla mesai) ve aylık takvim; haftalık / aylık hakediş hesabı (devamsızlık kesintisi, fazla mesai ücreti); avans, prim, kesinti; maaş ödemesi ve avans kasaya “Personel Maaşı” gideri olarak işlenir, kısmi ödemede kalan devreder; personel hesap ekstresi ve WhatsApp ile hesap özeti
- **Hatırlatmalar**: Ana sayfada “Yapılacaklar” (geciken / bugün teslim edilecek işler, süresi dolan teklifler, vadesi gelen tahsilat, ödeme ve taksitler, azalan stok, girilmemiş puantaj, ay sonu maaş). İzin verilirse günde bir kez telefon bildirimi; teslim tarihi, fatura vadesi ve taksitler telefon takvimine eklenebilir (bir gün önce 09:00 hatırlatma)
- **Kullanıcı yetkileri**: Yönetici ve usta. Usta iş emirlerini, aşamaları, notları, fotoğrafları, ölçü / keşif bilgilerini ve kataloğu görür; fiyat, kasa, fatura, personel ve maaşları göremez. Ayarlar → Kullanıcılar ve yetkiler
- **Stok**: Malzeme listesine bağlı giriş / çıkış (iş emrine bağlanabilir) / sayım, asgari stok uyarısı, stok değeri
- **Taksit planı**: Satış faturasının kalanı taksitlere bölünür (alınan tutar peşinat olarak görünür); ödemeler vade sırasıyla dağıtılır, gecikenler işaretlenir; plan yazdırılıp müşteriye imzalatılabilir
- **Satış / alış faturası**: Kalem kalem, KDV hesaplı, yazdırılabilir; kısmi ödeme takibi
- **Kasa**: Para girdi / çıktı (Nakit, Kart, Havale, Çek/Senet)
- **Rapor**: Aylık giren/çıkan, fatura toplamları, gider dağılımı, en çok satış yapılan müşteriler; teslim edilen işlerin KDV hariç kârı, kategoriye göre siparişler, teklif → sipariş oranı, personel ödemesi
- **Ayarlar**: Gelir/gider kategorilerini düzenleme, yedek alma / geri yükleme; **dosyalı ZIP yedek** (fotoğraf ve belgeler iş emri klasörlerine ayrılır, videolar isteğe bağlı) ve ZIP ile geri yükleme

Bir cihazda kaydedilen bilgi diğer cihazlarda anında görünür.

## Kurulum (bir kerelik)

### 1. Veritabanı (Supabase, ücretsiz)
1. https://supabase.com → **Start your project** → yeni proje açın (bölge: Frankfurt).
2. **En kolayı:** Sol menü **SQL Editor → New query** → `supabase-tum-kurulum.sql` dosyasının tamamını yapıştırıp **Run**. Bu tek dosya tüm kurulum ve güncellemeleri doğru sırayla içerir; yeni kurulumda da, eskiyi güncellemede de çalışır, tekrar çalıştırmak zarar vermez. Uygulamada **Ayarlar → Yedek ve veri → Veritabanı durumu** eksik bir güncelleme olup olmadığını gösterir.
   Ayrı ayrı çalıştırmak isterseniz: Sol menü **SQL Editor** → `supabase.sql` dosyasının içeriğini yapıştırın → **Run**. Ardından aynı şekilde sırayla `supabase-guncelleme.sql`, `supabase-guncelleme-2.sql` (dosya deposunu kurar) `supabase-guncelleme-3.sql` (katalog) `supabase-guncelleme-4.sql` (müşteri bağlantısı, teklif, keşif), `supabase-guncelleme-5.sql` (personel), `supabase-guncelleme-6.sql` (yetkiler) `supabase-guncelleme-7.sql` (stok, taksit, video) `supabase-guncelleme-8.sql` (dosya boyutu sınırını kaldırır) `supabase-guncelleme-9.sql` (çöp kutusu, işlem geçmişi) `supabase-guncelleme-10.sql` (takvim, kesim, maliyet, sipariş, çek / senet) `supabase-guncelleme-11.sql` (ortaklar, kişi kasaları) `supabase-guncelleme-12.sql` (otomatik yedek, araçlar) `supabase-guncelleme-13.sql` (fiyat gizleme, çakışma uyarısı, hızlı açılış) `supabase-guncelleme-14.sql` (muhasebeci yetkisi, atölye süresi, uygulama kapalıyken bildirim) ve `supabase-guncelleme-15.sql` (açılış bakiyeleri) dosyalarını çalıştırın. Ücretsiz Supabase planında tek dosya en çok 50 MB olabilir; daha büyük dosyalar için Pro planda **Storage → Settings → Global file size limit** değerini artırın.
   **Önemli:** Eski dosyalardan birini sonradan tekrar çalıştırırsanız `supabase-guncelleme-6.sql`, `-7.sql`, `-8.sql`, `-9.sql`, `-10.sql`, `-11.sql`, `-12.sql`, `-13.sql`, `-14.sql` ve `-15.sql` dosyalarını da yeniden çalıştırın (eski dosyalar tablolara herkese tam yetki verir ve dosya sınırını 50 MB’a geri alır).
   (Önceki dosyalar daha önce çalıştırıldıysa sadece eksik olanları çalıştırın; örneğin katalog kuruluysa sadece `supabase-guncelleme-4.sql` yeterli.)
   Firma telefonu, adresi, IBAN ve teklif notu uygulamada **Ayarlar → Firma bilgileri**'nden girilir.
3. **Authentication → Sign In / Providers → Email**: "Allow new users to sign up" kapalı olsun.
4. **Authentication → Users → Add user → Create new user**:
   - E-posta: `dukkan@gunesmobilya.app` (giriş ekranında sadece `dukkan` yazılır)
   - Şifre belirleyin, **Auto Confirm User** işaretli olsun.
   - Her çalışan için ayrı kullanıcı açılabilir. Ustalar için önce uygulamada **Ayarlar → Kullanıcılar ve yetkiler**'den kullanıcı adını “Usta” olarak ekleyin, sonra burada aynı adla hesap açın.
5. **Project Settings → API**: `Project URL` ve `anon public` anahtarını kopyalayın.

### 2. Ayarı uygulamaya yazın
`index.html` dosyasının başındaki `BULUT` bölümüne bu iki değeri yazın.
(Ayar boşsa uygulama sadece o cihazda çalışır.)

### 3. Yayınlama (GitHub Pages, ücretsiz)
Repo → **Settings → Pages** → Source: *Deploy from a branch* → dalı seçin → **Save**.
Birkaç dakika sonra adres verilir; telefon ve bilgisayarda o adres açılır.
Telefonda tarayıcı menüsünden **"Ana ekrana ekle"** denirse uygulama gibi açılır.


## Geliştirici notları

- **Dosya yapısı:** `index.html` (sayfa iskeleti ve bulut ayarı), `css/uygulama.css`, `js/01-cekirdek.js` … `js/19-giris-acilis.js` (sırayla yüklenen, aynı genel kapsamı paylaşan düz JavaScript dosyaları; derleme adımı yok), `cad3b.js` + `acis.js` (3B çizim, gerektiğinde yüklenir), `sw.js` (çevrimdışı önbellek; yeni dosya eklenirse `TEMEL` listesine de ekleyin).
- **Testler:** `test/` klasöründe. Supabase yerine tarayıcıda çalışan sahte bir istemci (`test/sahte-supabase.js`) kullanılır; gerçek veriye dokunmaz.
  ```
  cd test
  npm install
  npx playwright install chromium
  npm test              # hepsi
  node calistir.js bulut   # yalnız adı "bulut" içeren dosya
  ```
  Testler: tüm ekranların dört modda (yönetici, koyu tema, usta, telefon) açılması; kasa / ortak / çek / kesim / KDV / kârlılık / banka ekstresi hesapları; çöp kutusu ve işlem geçmişi; fiyat gizleme, çakışma uyarısı, hızlı açılış ve çevrimdışı kuyruk; Excel / CSV / e-Fatura XML / QR çıktıları. GitHub'a her gönderimde `.github/workflows/testler.yml` ile kendiliğinden çalışır.
