# ☀️ Güneş Mobilya — Muhasebe

Telefondan ve bilgisayardan kullanılan sade kasa ve veresiye defteri.

## Neler var?
- **Para Girdi / Para Çıktı**: Satış, peşinat, tahsilat · malzeme, kira, maaş, fatura…
- **Veresiye defteri**: Müşteri, veresiye satış (peşinatla), ödeme alma, kalan borç
- **Kayıtlar**: Ay ay, gün gün tüm hareketler
- **Rapor**: Ayın giren/çıkan parası, elde kalan, paranın nereye gittiği
- **Ayarlar**: Yedek alma / geri yükleme, çıkış

Bir cihazda kaydedilen bilgi diğer cihazlarda anında görünür.

## Kurulum (bir kerelik)

### 1. Veritabanı (Supabase, ücretsiz)
1. https://supabase.com → **Start your project** → yeni proje açın (bölge: Frankfurt).
2. Sol menü **SQL Editor** → `supabase.sql` dosyasının içeriğini yapıştırın → **Run**.
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
