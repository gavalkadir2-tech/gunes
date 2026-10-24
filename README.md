# ☀️ Güneş Mobilya — İşletme Yönetimi

![Güneş Mobilya](logo.png)

Telefondan ve bilgisayardan kullanılan sade kasa ve veresiye defteri.

## Neler var?
- **Katalog (showroom)**: Mutfak, banyo, gardırop, TV ünitesi (kategoriler Ayarlar'dan değiştirilebilir) projeleri; proje adı, açıklama, malzeme, ölçü ve isteğe bağlı tahmini fiyat. Telefondan fotoğraf çekme veya toplu fotoğraf / video yükleme; kapak seçme, sıralama, döndürme, başka projeye taşıma, silme
- **ZIP'ten toplu içe aktarma**: Klasörlere ayrılmış fotoğrafları (ör. Facebook yedeğindeki albümler) tek seferde içe aktarır; her klasör bir proje olur. Önizlemede gruplar seçilir, adı ve kategorisi değiştirilir. İsteğe bağlı `katalog.json` ile proje adı, kategori, malzeme ve açıklama hazır gelir
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
- **Ayarlar** (bölümlere ayrılmış): firma bilgileri (ad, telefon, e-posta, adres, vergi, banka / IBAN), teklif ve fatura (geçerlilik, kâr, teklif / fatura notu, iş emri ve fatura numara önekleri, varsayılan KDV, KDV oranları), iş emirleri (üretim aşamaları, keşif listesi, hatırlatma günleri, müşteri bağlantısı süresi), listeler (ödeme şekilleri, gelir / gider / katalog kategorileri, birimler, malzeme fiyatları), personel hesaplama, kullanıcılar ve yetkiler, görünüm (açık / koyu tema, yazı boyutu, açılış sayfası, firma rengi, menüde görünen modüller), bildirim ve otomatik çıkış, yedek ve ayarları dosyaya alma / yükleme.
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
2. Sol menü **SQL Editor** → `supabase.sql` dosyasının içeriğini yapıştırın → **Run**. Ardından aynı şekilde sırayla `supabase-guncelleme.sql`, `supabase-guncelleme-2.sql` (dosya deposunu kurar) `supabase-guncelleme-3.sql` (katalog) `supabase-guncelleme-4.sql` (müşteri bağlantısı, teklif, keşif), `supabase-guncelleme-5.sql` (personel), `supabase-guncelleme-6.sql` (yetkiler) `supabase-guncelleme-7.sql` (stok, taksit, video) `supabase-guncelleme-8.sql` (dosya boyutu sınırını kaldırır) `supabase-guncelleme-9.sql` (çöp kutusu, işlem geçmişi) ve `supabase-guncelleme-10.sql` (takvim, kesim, maliyet, sipariş, çek / senet) dosyalarını çalıştırın. Ücretsiz Supabase planında tek dosya en çok 50 MB olabilir; daha büyük dosyalar için Pro planda **Storage → Settings → Global file size limit** değerini artırın.
   **Önemli:** Eski dosyalardan birini sonradan tekrar çalıştırırsanız `supabase-guncelleme-6.sql`, `-7.sql`, `-8.sql`, `-9.sql` ve `-10.sql` dosyalarını da yeniden çalıştırın (eski dosyalar tablolara herkese tam yetki verir ve dosya sınırını 50 MB’a geri alır).
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
