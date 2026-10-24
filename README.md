# ☀️ Güneş Mobilya — İşletme Yönetimi

![Güneş Mobilya](logo.png)

Telefondan ve bilgisayardan kullanılan sade kasa ve veresiye defteri.

## Neler var?
- **Katalog (showroom)**: Mutfak, banyo, gardırop, TV ünitesi (kategoriler Ayarlar'dan değiştirilebilir) projeleri; proje adı, açıklama, malzeme, ölçü ve isteğe bağlı tahmini fiyat. Telefondan fotoğraf çekme veya toplu fotoğraf / video yükleme; kapak seçme, sıralama, döndürme, başka projeye taşıma, silme
- **ZIP'ten toplu içe aktarma**: Klasörlere ayrılmış fotoğrafları (ör. Facebook yedeğindeki albümler) tek seferde içe aktarır; her klasör bir proje olur. Önizlemede gruplar seçilir, adı ve kategorisi değiştirilir. İsteğe bağlı `katalog.json` ile proje adı, kategori, malzeme ve açıklama hazır gelir
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
2. Sol menü **SQL Editor** → `supabase.sql` dosyasının içeriğini yapıştırın → **Run**. Ardından aynı şekilde sırayla `supabase-guncelleme.sql`, `supabase-guncelleme-2.sql` (dosya deposunu kurar) `supabase-guncelleme-3.sql` (katalog) `supabase-guncelleme-4.sql` (müşteri bağlantısı, teklif, keşif), `supabase-guncelleme-5.sql` (personel), `supabase-guncelleme-6.sql` (yetkiler) ve `supabase-guncelleme-7.sql` (stok, taksit, video) dosyalarını çalıştırın.
   **Önemli:** Eski dosyalardan birini sonradan tekrar çalıştırırsanız `supabase-guncelleme-6.sql` ve `-7.sql` dosyalarını da yeniden çalıştırın (eski dosyalar tablolara herkese tam yetki verir).
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
