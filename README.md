# ☀️ Güneş Mobilya — Muhasebe

Telefondan ve bilgisayardan kullanılan sade kasa ve veresiye defteri.

## Neler var?
- **Cariler**: Müşteri ve tedarikçiler, bakiye (alacak/borç), hesap ekstresi
- **İş emirleri**: Sipariş kalemleri (ürün, ölçü, renk, adet), öncelik, sorumlu usta, teslimat adresi, üretim aşamaları (tek dokunuşla işaretlenir), notlar ve işlem geçmişi, **fotoğraf / video / dosya yükleme** (telefondan doğrudan kamera), kapora; işe bağlı faturalar, ödemeler, maliyet ve kâr; yazdırılabilir iş formu
- **WhatsApp**: Müşteriye hazır mesaj şablonlarıyla (sipariş onayı, üretimde, hazır, teslim, ödeme hatırlatma) mesaj; cari ve fatura için de. Durum değişince "müşteriye haber verilsin mi?" diye sorar. Fotoğraf/videoyu telefondan doğrudan WhatsApp'a paylaşır. Mesaj WhatsApp'ta açılır, **Gönder**'e siz basarsınız (WhatsApp Business API gerekmez).
- **Satış / alış faturası**: Kalem kalem, KDV hesaplı, yazdırılabilir; kısmi ödeme takibi
- **Kasa**: Para girdi / çıktı (Nakit, Kart, Havale, Çek/Senet)
- **Rapor**: Aylık giren/çıkan, fatura toplamları, gider dağılımı, en çok satış yapılan müşteriler
- **Ayarlar**: Gelir/gider kategorilerini düzenleme, yedek alma / geri yükleme; **dosyalı ZIP yedek** (fotoğraf ve belgeler iş emri klasörlerine ayrılır, videolar isteğe bağlı) ve ZIP ile geri yükleme

Bir cihazda kaydedilen bilgi diğer cihazlarda anında görünür.

## Kurulum (bir kerelik)

### 1. Veritabanı (Supabase, ücretsiz)
1. https://supabase.com → **Start your project** → yeni proje açın (bölge: Frankfurt).
2. Sol menü **SQL Editor** → `supabase.sql` dosyasının içeriğini yapıştırın → **Run**. Ardından aynı şekilde sırayla `supabase-guncelleme.sql` ve `supabase-guncelleme-2.sql` dosyalarını çalıştırın (ikincisi dosya deposunu da kurar).
   (Daha önce `supabase.sql` çalıştırıldıysa sadece `supabase-guncelleme.sql` yeterli.)
3. **Authentication → Sign In / Providers → Email**: "Allow new users to sign up" kapalı olsun.
4. **Authentication → Users → Add user → Create new user**:
   - E-posta: `dukkan@gunesmobilya.app` (giriş ekranında sadece `dukkan` yazılır)
   - Şifre belirleyin, **Auto Confirm User** işaretli olsun.
   - Her çalışan için ayrı kullanıcı açılabilir.
5. **Project Settings → API**: `Project URL` ve `anon public` anahtarını kopyalayın.

### 2. Ayarı uygulamaya yazın
`index.html` dosyasının başındaki `BULUT` bölümüne bu iki değeri yazın.
(Ayar boşsa uygulama sadece o cihazda çalışır.)

### 3. Yayınlama (GitHub Pages, ücretsiz)
Repo → **Settings → Pages** → Source: *Deploy from a branch* → dalı seçin → **Save**.
Birkaç dakika sonra adres verilir; telefon ve bilgisayarda o adres açılır.
Telefonda tarayıcı menüsünden **"Ana ekrana ekle"** denirse uygulama gibi açılır.
