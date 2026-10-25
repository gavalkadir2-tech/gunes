-- Güneş Mobilya — TÜM KURULUM (tek dosya)
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştırıp Run.
-- Yeni kurulumda da, eski kurulumu güncellemede de kullanılabilir; tekrar çalıştırmak zarar vermez.
-- (İçinde supabase.sql ve supabase-guncelleme*.sql dosyaları doğru sırayla vardır.)

-- ===================== supabase.sql =====================
-- Güneş Mobilya Muhasebe — Supabase kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırıp "Run".

create table if not exists public.musteriler (
  id       text primary key,
  ad       text not null check (length(ad) between 1 and 80),
  telefon  text not null default '',
  adres    text not null default '',
  olusma   bigint not null default 0
);

create table if not exists public.hareketler (
  id          text primary key,
  tur         text not null check (tur in ('giris','cikis','borc')),
  tutar       numeric(14,2) not null check (tutar > 0),
  kategori    text not null,
  odeme       text check (odeme in ('Nakit','Kart','Havale')),
  aciklama    text not null default '',
  musteri_id  text references public.musteriler(id) on delete restrict,
  tarih       date not null,
  olusma      bigint not null default 0,
  kullanici   text default (auth.jwt() ->> 'email')
);
create index if not exists hareketler_tarih on public.hareketler (tarih);
create index if not exists hareketler_musteri on public.hareketler (musteri_id);

-- Sadece giriş yapmış kullanıcılar okuyup yazabilir.
alter table public.musteriler enable row level security;
alter table public.hareketler enable row level security;

drop policy if exists "giris yapanlar" on public.musteriler;
create policy "giris yapanlar" on public.musteriler for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.hareketler;
create policy "giris yapanlar" on public.hareketler for all to authenticated using (true) with check (true);

-- Telefon ve bilgisayar birbirinin kaydını anında görsün.
do $$
declare t text;
begin
  foreach t in array array['musteriler','hareketler'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Ardından supabase-guncelleme.sql dosyasını da çalıştırın (iş emirleri, faturalar, ayarlar).


-- ===================== supabase-guncelleme.sql =====================
-- Güneş Mobilya — Güncelleme 2: Cariler, İş Emirleri, Faturalar, Ayarlar
-- supabase.sql daha önce çalıştırıldıysa SADECE bu dosyayı çalıştırın.
-- Supabase panelinde: SQL Editor > New query > hepsini yapıştırıp "Run".
-- Birden fazla çalıştırmak zarar vermez.

-- Cari bilgileri (müşteri / tedarikçi)
alter table public.musteriler add column if not exists tip text not null default 'musteri';
alter table public.musteriler add column if not exists vergi_no text not null default '';

-- İş emirleri (projeler)
create table if not exists public.is_emirleri (
  id             text primary key,
  no             text not null default '',
  musteri_id     text not null references public.musteriler(id) on delete restrict,
  baslik         text not null,
  durum          text not null default 'Sipariş alındı',
  teslim_tarihi  date,
  tutar          numeric(14,2) not null default 0,
  aciklama       text not null default '',
  olusma         bigint not null default 0
);

-- Satış / alış faturaları
create table if not exists public.faturalar (
  id          text primary key,
  no          text not null default '',
  tur         text not null check (tur in ('satis','alis')),
  musteri_id  text not null references public.musteriler(id) on delete restrict,
  is_emri_id  text references public.is_emirleri(id) on delete set null,
  kategori    text not null default '',
  tarih       date not null,
  vade        date,
  kalemler    jsonb not null default '[]',
  ara_toplam  numeric(14,2) not null default 0,
  kdv_toplam  numeric(14,2) not null default 0,
  toplam      numeric(14,2) not null default 0 check (toplam >= 0),
  aciklama    text not null default '',
  olusma      bigint not null default 0
);

-- Kasa hareketleri iş emri ve faturaya bağlanabilsin
alter table public.hareketler add column if not exists is_emri_id text references public.is_emirleri(id) on delete set null;
alter table public.hareketler add column if not exists fatura_id  text references public.faturalar(id)  on delete set null;
alter table public.hareketler drop constraint if exists hareketler_odeme_check;

-- Ortak ayarlar (kategori listeleri vb.)
create table if not exists public.ayarlar (
  anahtar  text primary key,
  deger    jsonb
);

-- Sadece giriş yapmış kullanıcılar
alter table public.is_emirleri enable row level security;
alter table public.faturalar  enable row level security;
alter table public.ayarlar    enable row level security;
drop policy if exists "giris yapanlar" on public.is_emirleri;
create policy "giris yapanlar" on public.is_emirleri for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.faturalar;
create policy "giris yapanlar" on public.faturalar for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.ayarlar;
create policy "giris yapanlar" on public.ayarlar for all to authenticated using (true) with check (true);

-- Canlı güncelleme
do $$
declare t text;
begin
  foreach t in array array['musteriler','hareketler','is_emirleri','faturalar','ayarlar'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ===================== supabase-guncelleme-2.sql =====================
-- Güneş Mobilya — Güncelleme 3: İş emri detayları, notlar, fotoğraf/video/dosya deposu
-- supabase.sql ve supabase-guncelleme.sql çalıştırıldıktan sonra bunu çalıştırın.
-- SQL Editor > New query > hepsini yapıştırıp "Run". Tekrar çalıştırmak zarar vermez.

alter table public.is_emirleri add column if not exists oncelik text not null default 'Normal';
alter table public.is_emirleri add column if not exists sorumlu text not null default '';
alter table public.is_emirleri add column if not exists adres   text not null default '';
alter table public.is_emirleri add column if not exists kalemler jsonb not null default '[]';
alter table public.is_emirleri add column if not exists asamalar jsonb not null default '[]';

-- İş emri notları ve işlem geçmişi
create table if not exists public.is_notlari (
  id          text primary key,
  is_emri_id  text not null references public.is_emirleri(id) on delete cascade,
  metin       text not null,
  tur         text not null default 'not',
  yazan       text not null default '',
  olusma      bigint not null default 0
);
create index if not exists is_notlari_is on public.is_notlari (is_emri_id);

-- Yüklenen dosyaların kayıtları (dosyanın kendisi Storage'da durur)
create table if not exists public.dosyalar (
  id          text primary key,
  is_emri_id  text not null references public.is_emirleri(id) on delete cascade,
  ad          text not null,
  tur         text not null default '',
  boyut       bigint not null default 0,
  yol         text not null,
  yukleyen    text not null default '',
  olusma      bigint not null default 0
);
create index if not exists dosyalar_is on public.dosyalar (is_emri_id);

alter table public.is_notlari enable row level security;
alter table public.dosyalar   enable row level security;
drop policy if exists "giris yapanlar" on public.is_notlari;
create policy "giris yapanlar" on public.is_notlari for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.dosyalar;
create policy "giris yapanlar" on public.dosyalar for all to authenticated using (true) with check (true);

-- Dosya deposu (gizli; sadece giriş yapanlar görür). Tek dosya en çok 50 MB.
insert into storage.buckets (id, name, public, file_size_limit)
values ('dosyalar', 'dosyalar', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "dosyalar giris yapanlar" on storage.objects;
create policy "dosyalar giris yapanlar" on storage.objects
  for all to authenticated
  using (bucket_id = 'dosyalar') with check (bucket_id = 'dosyalar');

-- Canlı güncelleme
do $$
declare t text;
begin
  foreach t in array array['is_notlari','dosyalar'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ===================== supabase-guncelleme-3.sql =====================
-- Güneş Mobilya — Güncelleme 4: Proje kataloğu (mutfak, banyo, gardırop, TV ünitesi…)
-- Önceki SQL dosyaları çalıştırıldıktan sonra bunu çalıştırın.
-- SQL Editor > New query > hepsini yapıştırıp "Run". Tekrar çalıştırmak zarar vermez.
-- Fotoğraflar, "supabase-guncelleme-2.sql" ile kurulan "dosyalar" deposunda "katalog/" klasörüne yüklenir.

create table if not exists public.katalog (
  id        text primary key,
  baslik    text not null,
  kategori  text not null default '',
  aciklama  text not null default '',
  malzeme   text not null default '',
  olcu      text not null default '',
  fiyat     numeric(14,2) not null default 0 check (fiyat >= 0),
  olusma    bigint not null default 0
);

create table if not exists public.katalog_gorseller (
  id        text primary key,
  proje_id  text not null references public.katalog(id) on delete cascade,
  ad        text not null,
  tur       text not null default '',
  boyut     bigint not null default 0,
  yol       text not null,
  sira      bigint not null default 0,
  olusma    bigint not null default 0
);
create index if not exists katalog_gorseller_proje on public.katalog_gorseller (proje_id);

alter table public.katalog           enable row level security;
alter table public.katalog_gorseller enable row level security;
drop policy if exists "giris yapanlar" on public.katalog;
create policy "giris yapanlar" on public.katalog for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.katalog_gorseller;
create policy "giris yapanlar" on public.katalog_gorseller for all to authenticated using (true) with check (true);

-- Canlı güncelleme
do $$
declare t text;
begin
  foreach t in array array['katalog','katalog_gorseller'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ===================== supabase-guncelleme-4.sql =====================
-- Güneş Mobilya — Güncelleme 5: Müşteriye katalog bağlantısı, ayrıntılı teklif, ölçü / keşif formu
-- Önceki SQL dosyaları çalıştırıldıktan sonra bunu çalıştırın.
-- SQL Editor > New query > hepsini yapıştırıp "Run". Tekrar çalıştırmak zarar vermez.

-- İş emrine teklif (indirim, KDV, geçerlilik) ve ölçü / keşif bilgileri
alter table public.is_emirleri add column if not exists teklif jsonb not null default '{}';
alter table public.is_emirleri add column if not exists kesif  jsonb not null default '{}';

-- Müşteriye gönderilen katalog bağlantıları
create table if not exists public.paylasimlar (
  id          text primary key,              -- tahmin edilemeyen anahtar (bağlantıda görünür)
  baslik      text not null default '',
  musteri_id  text references public.musteriler(id) on delete set null,
  icerik      jsonb not null default '{}',   -- müşterinin göreceği bilgiler (fiyatlar sadece seçildiyse)
  bitis       bigint not null default 0,     -- 0 = süresiz
  olusma      bigint not null default 0
);
alter table public.paylasimlar enable row level security;
drop policy if exists "giris yapanlar" on public.paylasimlar;
create policy "giris yapanlar" on public.paylasimlar for all to authenticated using (true) with check (true);

-- Giriş yapmamış müşteri sadece anahtarını bildiği, süresi dolmamış bağlantıyı okuyabilir (liste göremez).
create or replace function public.vitrin_getir(anahtar text) returns jsonb
language sql stable security definer set search_path = public as $$
  select icerik from public.paylasimlar
  where id = anahtar and (bitis = 0 or bitis > (extract(epoch from now()) * 1000)::bigint)
$$;
revoke all on function public.vitrin_getir(text) from public;
grant execute on function public.vitrin_getir(text) to anon, authenticated;

-- Paylaşılan fotoğrafların kopyaları için herkese açık depo (asıl katalog fotoğrafları gizli "dosyalar" deposunda kalır)
insert into storage.buckets (id, name, public, file_size_limit)
values ('vitrin', 'vitrin', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "vitrin giris yapanlar" on storage.objects;
create policy "vitrin giris yapanlar" on storage.objects
  for all to authenticated
  using (bucket_id = 'vitrin') with check (bucket_id = 'vitrin');

-- Canlı güncelleme
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'paylasimlar') then
    alter publication supabase_realtime add table public.paylasimlar;
  end if;
end $$;


-- ===================== supabase-guncelleme-5.sql =====================
-- Güneş Mobilya — Güncelleme 6: Personel (puantaj, maaş / hakediş, avans, prim, kesinti)
-- Önceki SQL dosyaları çalıştırıldıktan sonra bunu çalıştırın.
-- SQL Editor > New query > hepsini yapıştırıp "Run". Tekrar çalıştırmak zarar vermez.

create table if not exists public.personel (
  id          text primary key,
  ad          text not null,
  gorev       text not null default '',
  telefon     text not null default '',
  iban        text not null default '',
  giris       date,                                   -- işe giriş
  cikis       date,                                   -- işten ayrılış (boşsa çalışıyor)
  ucret_tipi  text not null default 'aylik' check (ucret_tipi in ('aylik','haftalik','gunluk')),
  ucret       numeric(14,2) not null default 0 check (ucret >= 0),
  izin_hakki  integer not null default 14,            -- yıllık ücretli izin (gün)
  notlar      text not null default '',
  olusma      bigint not null default 0
);

-- Günlük devam: geldi, yarim, gelmedi, izinli, ucretsiz, raporlu, tatil
create table if not exists public.puantaj (
  id           text primary key,                      -- personel_id + '_' + tarih
  personel_id  text not null references public.personel(id) on delete cascade,
  tarih        date not null,
  durum        text not null default 'geldi',
  mesai        numeric(6,2) not null default 0,       -- fazla mesai (saat)
  notu         text not null default ''
);
create index if not exists puantaj_personel_tarih on public.puantaj (personel_id, tarih);

-- Personel hesabı: hakedis (+), prim (+), kesinti (-), avans (-), odeme (-)
create table if not exists public.personel_hareket (
  id           text primary key,
  personel_id  text not null references public.personel(id) on delete cascade,
  tur          text not null check (tur in ('hakedis','prim','kesinti','avans','odeme')),
  tutar        numeric(14,2) not null check (tutar >= 0),
  tarih        date not null,
  donem        text not null default '',              -- '2026-10' (aylık) veya 'H2026-10-19' (hafta)
  aciklama     text not null default '',
  hareket_id   text references public.hareketler(id) on delete set null,   -- kasadaki ödeme kaydı
  olusma       bigint not null default 0
);
create index if not exists personel_hareket_personel on public.personel_hareket (personel_id);

alter table public.personel         enable row level security;
alter table public.puantaj          enable row level security;
alter table public.personel_hareket enable row level security;
drop policy if exists "giris yapanlar" on public.personel;
create policy "giris yapanlar" on public.personel for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.puantaj;
create policy "giris yapanlar" on public.puantaj for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.personel_hareket;
create policy "giris yapanlar" on public.personel_hareket for all to authenticated using (true) with check (true);

-- Canlı güncelleme
do $$
declare t text;
begin
  foreach t in array array['personel','puantaj','personel_hareket'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ===================== supabase-guncelleme-6.sql =====================
-- Güneş Mobilya — Güncelleme 7: Kullanıcı yetkileri (yönetici / usta)
-- Önceki SQL dosyaları çalıştırıldıktan sonra bunu çalıştırın. Tekrar çalıştırmak zarar vermez.
-- ÖNEMLİ: Önceki SQL dosyalarından birini sonradan tekrar çalıştırırsanız bu dosyayı da yeniden çalıştırın
-- (eski dosyalar herkese tam yetki verir).
--
-- Kurallar:
--  * "kullanicilar" listesi boşsa giriş yapan herkes yöneticidir (eski davranış).
--  * Listeye en az bir kişi eklendikten sonra listede olmayan veya "usta" olan hesaplar usta yetkisindedir.
--  * Usta: iş emirlerini, müşteri adres / telefonunu, katalog ve sunumu görür; iş aşamalarını, durumunu, notları,
--    fotoğrafları ve ölçü / keşif bilgisini güncelleyebilir. Faturalar, kasa, personel, maaşlar ve müşteri bağlantıları görünmez.
--    Not: İş emrindeki fiyat alanı uygulamada ustaya gösterilmez, ancak veritabanı satır düzeyinde gizlenmez.

create table if not exists public.kullanicilar (
  eposta  text primary key,                 -- giriş e-postası (kullanıcı adı@gunesmobilya.app)
  ad      text not null default '',         -- iş emrindeki "sorumlu usta" adıyla aynı yazılmalı
  rol     text not null default 'usta' check (rol in ('yonetici','usta')),
  olusma  bigint not null default 0
);
alter table public.kullanicilar enable row level security;

create or replace function public.yonetici_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.kullanicilar) then true
    else coalesce((select k.rol = 'yonetici' from public.kullanicilar k
                   where lower(k.eposta) = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
  end
$$;
revoke all on function public.yonetici_mi() from public;
grant execute on function public.yonetici_mi() to authenticated;

drop policy if exists "kendi kaydi veya yonetici" on public.kullanicilar;
create policy "kendi kaydi veya yonetici" on public.kullanicilar for select to authenticated
  using (public.yonetici_mi() or lower(eposta) = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "yonetici yazar" on public.kullanicilar;
create policy "yonetici yazar" on public.kullanicilar for all to authenticated
  using (public.yonetici_mi()) with check (public.yonetici_mi());

do $$
declare t text;
begin
  -- Sadece yönetici: para, personel, paylaşım
  foreach t in array array['faturalar','hareketler','personel','puantaj','personel_hareket','paylasimlar'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "giris yapanlar" on public.%I', t);
      execute format('drop policy if exists "yonetici" on public.%I', t);
      execute format('create policy "yonetici" on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
    end if;
  end loop;
  -- Herkes okur, yönetici yazar
  foreach t in array array['musteriler','katalog','katalog_gorseller','ayarlar','is_emirleri'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "giris yapanlar" on public.%I', t);
      execute format('drop policy if exists "herkes okur" on public.%I', t);
      execute format('drop policy if exists "yonetici yazar" on public.%I', t);
      execute format('create policy "herkes okur" on public.%I for select to authenticated using (true)', t);
      execute format('create policy "yonetici yazar" on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
    end if;
  end loop;
  -- Usta iş emrini güncelleyebilir (aşama, durum, keşif); ekleyip silemez
  if to_regclass('public.is_emirleri') is not null then
    drop policy if exists "herkes gunceller" on public.is_emirleri;
    create policy "herkes gunceller" on public.is_emirleri for update to authenticated using (true) with check (true);
  end if;
end $$;


-- ===================== supabase-guncelleme-7.sql =====================
-- Güneş Mobilya — Güncelleme 8: Stok hareketleri, taksit planı, katalogda video
-- supabase-guncelleme-6.sql (yetkiler) çalıştırıldıktan sonra bunu çalıştırın. Tekrar çalıştırmak zarar vermez.

-- Stok: giriş (+), çıkış (-), sayım düzeltmesi (±). Malzeme listesi Ayarlar'daki "malzemeler" kaydıdır.
create table if not exists public.stok_hareket (
  id          text primary key,
  malzeme_id  text not null,
  tur         text not null check (tur in ('giris','cikis','duzeltme')),
  miktar      numeric(14,3) not null,                -- işaretli: çıkış eksi
  tarih       date not null,
  is_emri_id  text references public.is_emirleri(id) on delete set null,
  aciklama    text not null default '',
  olusma      bigint not null default 0
);
create index if not exists stok_hareket_malzeme on public.stok_hareket (malzeme_id);

-- Satış faturası taksit planı (ödenen tutar taksitlere vade sırasıyla dağıtılır)
create table if not exists public.taksitler (
  id         text primary key,
  fatura_id  text not null references public.faturalar(id) on delete cascade,
  sira       integer not null default 1,
  vade       date not null,
  tutar      numeric(14,2) not null check (tutar > 0),
  olusma     bigint not null default 0
);
create index if not exists taksitler_fatura on public.taksitler (fatura_id);

do $$
declare t text;
begin
  foreach t in array array['stok_hareket','taksitler'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "yonetici" on public.%I', t);
    execute format('create policy "yonetici" on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Katalog videoları müşteri bağlantısında da paylaşılabilsin (tek dosya en çok 50 MB)
update storage.buckets set file_size_limit = 52428800 where id = 'vitrin';


-- ===================== supabase-guncelleme-8.sql =====================
-- Güneş Mobilya — güncelleme 8: dosya boyutu sınırını kaldırır
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra).
-- "dosyalar" (iş emri / katalog dosyaları) ve "vitrin" (müşteri bağlantısı) depolarında
-- depo başına boyut sınırı kalmaz; geçerli olan, projenin genel sınırıdır:
--   • Ücretsiz plan: tek dosya en çok 50 MB (değiştirilemez)
--   • Pro plan: Storage → Settings → "Global file size limit" ile artırılabilir (ör. 5 GB)

update storage.buckets set file_size_limit = null where id in ('dosyalar', 'vitrin');


-- ===================== supabase-guncelleme-9.sql =====================
-- Güneş Mobilya — güncelleme 9: Çöp kutusu ve işlem geçmişi (sistem kaydı)
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * cop_kutusu   : Silinen kayıtlar (bağlı notlar, dosyalar, taksitler vb. ile birlikte) burada bekler.
--                   Ayarlar → Çöp kutusu'ndan geri yüklenir; süresi dolunca (varsayılan 30 gün) kalıcı silinir.
--  * islem_kaydi  : Kim, ne zaman, hangi cihazla, hangi işlemi yaptı. Kullanıcı ve zaman sunucuda yazılır,
--                   uygulamadan değiştirilemez; kayıtlar düzenlenemez, 30 günden yeni kayıtlar silinemez.

create table if not exists public.cop_kutusu (
  id       text primary key,
  baslik   text not null default '',
  tur      text not null default '',          -- ana kaydın tablosu (is_emirleri, faturalar …)
  icerik   jsonb not null default '{}'::jsonb, -- {kayitlar:[{t,k}], kopan:[{t,id,alan,deger}]}
  silen    text not null default '',
  silen_ad text not null default '',
  silinme  bigint not null default 0
);
alter table public.cop_kutusu enable row level security;

create table if not exists public.islem_kaydi (
  id        text primary key,
  zaman     bigint not null default 0,
  kullanici text not null default '',
  ad        text not null default '',
  cihaz     text not null default '',
  islem     text not null default '',
  tablo     text not null default '',
  kayit_id  text not null default '',
  baslik    text not null default '',
  ayrinti   jsonb not null default '{}'::jsonb
);
create index if not exists islem_kaydi_zaman on public.islem_kaydi (zaman desc);
alter table public.islem_kaydi enable row level security;

-- Kullanıcı ve zaman her zaman sunucudan gelir (uygulamadan başkası adına kayıt yazılamaz)
create or replace function public.islem_kaydi_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.kullanici := coalesce(auth.jwt() ->> 'email', new.kullanici);
  new.zaman := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  if coalesce(new.cihaz, '') = '' then
    new.cihaz := left(coalesce(current_setting('request.headers', true)::json ->> 'user-agent', ''), 200);
  end if;
  return new;
end $$;
drop trigger if exists islem_kaydi_damga on public.islem_kaydi;
create trigger islem_kaydi_damga before insert on public.islem_kaydi for each row execute function public.islem_kaydi_damga();

create or replace function public.cop_kutusu_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.silen := coalesce(auth.jwt() ->> 'email', new.silen);
  new.silinme := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end $$;
drop trigger if exists cop_kutusu_damga on public.cop_kutusu;
create trigger cop_kutusu_damga before insert on public.cop_kutusu for each row execute function public.cop_kutusu_damga();

do $$
begin
  -- Çöp kutusu: herkes (usta da) sildiği kaydı çöpe atabilir; görmek, geri yüklemek, boşaltmak yöneticinin
  drop policy if exists "herkes ekler" on public.cop_kutusu;
  drop policy if exists "yonetici okur" on public.cop_kutusu;
  drop policy if exists "yonetici siler" on public.cop_kutusu;
  create policy "herkes ekler" on public.cop_kutusu for insert to authenticated with check (true);
  create policy "yonetici okur" on public.cop_kutusu for select to authenticated using (public.yonetici_mi());
  create policy "yonetici siler" on public.cop_kutusu for delete to authenticated using (public.yonetici_mi());

  -- İşlem geçmişi: herkes ekler, yönetici okur; düzenlenemez; yalnız 30 günden eski kayıtlar silinebilir
  drop policy if exists "herkes ekler" on public.islem_kaydi;
  drop policy if exists "yonetici okur" on public.islem_kaydi;
  drop policy if exists "eskiyi yonetici siler" on public.islem_kaydi;
  create policy "herkes ekler" on public.islem_kaydi for insert to authenticated with check (true);
  create policy "yonetici okur" on public.islem_kaydi for select to authenticated using (public.yonetici_mi());
  create policy "eskiyi yonetici siler" on public.islem_kaydi for delete to authenticated
    using (public.yonetici_mi() and zaman < (extract(epoch from now()) * 1000)::bigint - 30::bigint * 86400000);
end $$;


-- ===================== supabase-guncelleme-10.sql =====================
-- Güneş Mobilya — güncelleme 10: Montaj takvimi, kesim listesi, proje maliyeti, malzeme siparişi, çek / senet portföyü
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.

-- İş emrine yeni alanlar
alter table public.is_emirleri add column if not exists kategori   text  not null default '';            -- iş türü (mutfak, gardırop …)
alter table public.is_emirleri add column if not exists montaj     jsonb not null default '[]'::jsonb;   -- randevular: [{id,tarih,saat,sure,tur,ekip,not,hatirlatildi,tamam}]
alter table public.is_emirleri add column if not exists kesim      jsonb not null default '{}'::jsonb;   -- kesim listesi: {parcalar:[…], testere, pay}
alter table public.is_emirleri add column if not exists maliyetler jsonb not null default '[]'::jsonb;   -- kasadan geçmeyen maliyetler: [{id,tur,ad,tutar,tarih}]

-- Tedarikçi siparişleri
create table if not exists public.siparisler (
  id            text primary key,
  no            text not null default '',
  tedarikci_id  text references public.musteriler(id) on delete set null,
  kalemler      jsonb not null default '[]'::jsonb,   -- [{malzemeId, ad, birim, miktar, fiyat, gelen}]
  durum         text not null default 'bekliyor',     -- bekliyor / kismi / geldi / iptal
  tarih         text not null default '',
  fatura_id     text references public.faturalar(id) on delete set null,
  aciklama      text not null default '',
  olusma        bigint not null default 0
);
alter table public.siparisler enable row level security;

-- Çek / senet portföyü
create table if not exists public.cekler (
  id          text primary key,
  tur         text not null default 'alinan',     -- alinan / verilen
  belge       text not null default 'cek',        -- cek / senet
  no          text not null default '',
  banka       text not null default '',
  kesideci    text not null default '',           -- çeki düzenleyen / borçlu
  musteri_id  text references public.musteriler(id) on delete set null,   -- alındığı / verildiği cari
  tutar       numeric not null default 0,
  vade        text not null default '',
  durum       text not null default 'portfoy',    -- portfoy / tahsilde / tahsil / ciro / karsiliksiz / odendi / iade
  ciro_id     text references public.musteriler(id) on delete set null,   -- ciro edilen cari
  hareket_id  text references public.hareketler(id) on delete set null,   -- kasadaki kaydı
  gecmis      jsonb not null default '[]'::jsonb,
  aciklama    text not null default '',
  olusma      bigint not null default 0
);
alter table public.cekler enable row level security;

do $$
declare t text;
begin
  foreach t in array array['siparisler','cekler'] loop
    execute format('drop policy if exists "yonetici" on public.%I', t);
    execute format('create policy "yonetici" on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ===================== supabase-guncelleme-11.sql =====================
-- Güneş Mobilya — güncelleme 11: Ortaklar (Samet, İbrahim) ve kişi kasaları
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--  * ortak : paranın kimin elinde olduğu / kimin ödediği ('' = ortak kasa; yoksa ortağın kimliği)
--  * hedef : kasalar arası aktarımda paranın gittiği kasa
--  * tur   : 'aktarim' eklendi (kasalar arası aktarım; gelir / gider sayılmaz)
alter table public.hareketler add column if not exists ortak text not null default '';
alter table public.hareketler add column if not exists hedef text not null default '';
alter table public.hareketler drop constraint if exists hareketler_tur_check;
alter table public.hareketler add constraint hareketler_tur_check check (tur in ('giris','cikis','borc','aktarim'));


-- ===================== supabase-guncelleme-12.sql =====================
-- Güneş Mobilya — güncelleme 12: Otomatik günlük yedek ve araç takibi
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * yedekler   : Tüm kayıtların günlük kopyası (son 30 gün). Her gece 03:15'te (Türkiye saati) sunucuda alınır (pg_cron).
--                 pg_cron açılamazsa yedek, bir yönetici uygulamayı her gün ilk açtığında alınır.
--                 Fotoğraf ve dosyalar yedeğe girmez (depoda zaten silinmeden durur; ZIP yedeği ayrıca alınabilir).
--  * arac_kayit : Araç yakıt, bakım, muayene, sigorta kayıtları.

create table if not exists public.arac_kayit (
  id          text primary key,
  arac_id     text not null default '',
  tur         text not null default 'yakit',     -- yakit / bakim / muayene / sigorta / kasko / diger
  tarih       text not null default '',
  km          numeric not null default 0,
  litre       numeric not null default 0,
  tutar       numeric not null default 0,
  dolu        boolean not null default true,      -- yakıtta depo dolduruldu mu (tüketim hesabı için)
  sonraki     text not null default '',           -- muayene / sigorta / kasko bitişi, bakımda sonraki bakım tarihi
  sonraki_km  numeric not null default 0,         -- bakımda sonraki bakım kilometresi
  aciklama    text not null default '',
  is_emri_id  text references public.is_emirleri(id) on delete set null,
  hareket_id  text references public.hareketler(id) on delete set null,
  olusma      bigint not null default 0
);
alter table public.arac_kayit enable row level security;

create table if not exists public.yedekler (
  id      bigserial primary key,
  zaman   bigint not null default 0,
  tur     text not null default 'otomatik',   -- otomatik / uygulama / elle
  boyut   integer not null default 0,
  sayilar jsonb not null default '{}'::jsonb,  -- tablo başına kayıt sayısı
  icerik  jsonb not null
);
create index if not exists yedekler_zaman on public.yedekler (zaman desc);
alter table public.yedekler enable row level security;

-- Tüm tabloların anlık kopyası; 30 günden eski kopyalar silinir. Uygulamadan yalnız yönetici çağırabilir.
create or replace function public.yedek_al(tur text default 'otomatik') returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v jsonb := '{}'::jsonb; s jsonb := '{}'::jsonb; r jsonb; t text; n bigint;
  simdi bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if auth.uid() is not null and not public.yonetici_mi() then raise exception 'Yedek almak için yönetici yetkisi gerekir'; end if;
  foreach t in array array['musteriler','is_emirleri','is_notlari','dosyalar','faturalar','hareketler','ayarlar','katalog','katalog_gorseller','paylasimlar',
                           'personel','puantaj','personel_hareket','stok_hareket','taksitler','siparisler','cekler','arac_kayit','kullanicilar'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into r;
      v := v || jsonb_build_object(t, r);
      s := s || jsonb_build_object(t, jsonb_array_length(r));
    end if;
  end loop;
  insert into public.yedekler (zaman, tur, boyut, sayilar, icerik) values (simdi, tur, length(v::text), s, v) returning id into n;
  delete from public.yedekler where zaman < simdi - 30::bigint * 86400000;
  return n;
end $$;
revoke all on function public.yedek_al(text) from public;
grant execute on function public.yedek_al(text) to authenticated;

do $$
begin
  drop policy if exists "yonetici" on public.arac_kayit;
  create policy "yonetici" on public.arac_kayit for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi());
  drop policy if exists "yonetici okur" on public.yedekler;
  create policy "yonetici okur" on public.yedekler for select to authenticated using (public.yonetici_mi());
  drop policy if exists "yonetici siler" on public.yedekler;
  create policy "yonetici siler" on public.yedekler for delete to authenticated using (public.yonetici_mi());
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'arac_kayit') then
    alter publication supabase_realtime add table public.arac_kayit;
  end if;
end $$;

-- Gece otomatik yedek (pg_cron). Açılamazsa uygulama günlük yedeği kendisi alır.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron açılamadı; günlük yedek uygulama açıldığında alınacak (%).', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''gunes-gunluk-yedek''';
    execute 'select cron.schedule(''gunes-gunluk-yedek'', ''15 0 * * *'', $c$select public.yedek_al(''otomatik'')$c$)';
  end if;
end $$;


-- ===================== supabase-guncelleme-13.sql =====================
-- Güneş Mobilya — güncelleme 13: Fiyatların ustalardan gizlenmesi, çakışma uyarısı, hızlı açılış
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * is_emri_fiyat : İş emrinin fiyat bilgileri (tutar, teklif, kalem fiyatları, maliyetler) ayrı tabloda; yalnız yönetici okur.
--                    Mevcut fiyatlar buraya taşınır ve iş emri tablosundan silinir (usta teknik yolla da göremez).
--  * surum / degisme / degistiren : Her kayıt değiştikçe sürüm artar. Uygulama, açtığınızdan sonra başkası değiştirdiyse
--                    kaydetmeden önce uyarır. "degisme" ile uygulama açılışta yalnız değişen kayıtları çeker.
--  * silinenler    : Silinen kayıtların izi (120 gün); açılışta silinenler cihazdaki kopyadan da çıkarılır.

-- 1) Fiyat tablosu
create table if not exists public.is_emri_fiyat (
  id          text primary key references public.is_emirleri(id) on delete cascade,
  tutar       numeric not null default 0,
  teklif      jsonb not null default '{}'::jsonb,
  maliyetler  jsonb not null default '[]'::jsonb,
  kalem_fiyat jsonb not null default '[]'::jsonb,   -- kalem sırasıyla [{fiyat, maliyet, hesap}]
  olusma      bigint not null default 0
);
alter table public.is_emri_fiyat enable row level security;
drop policy if exists "yonetici" on public.is_emri_fiyat;
create policy "yonetici" on public.is_emri_fiyat for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi());

-- Mevcut fiyatları taşı (bir kez; ikinci çalıştırmada var olanlara dokunmaz)
insert into public.is_emri_fiyat (id, tutar, teklif, maliyetler, kalem_fiyat, olusma)
select i.id, i.tutar, coalesce(i.teklif, '{}'::jsonb), coalesce(i.maliyetler, '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('fiyat', k -> 'fiyat', 'maliyet', k -> 'maliyet', 'hesap', k -> 'hesap')) order by n)
            from jsonb_array_elements(coalesce(i.kalemler, '[]'::jsonb)) with ordinality as e(k, n)), '[]'::jsonb), i.olusma
from public.is_emirleri i
where i.tutar <> 0 or i.teklif <> '{}'::jsonb or i.maliyetler <> '[]'::jsonb or i.kalemler::text ~ '"(fiyat|maliyet|hesap)"'
on conflict (id) do nothing;

-- İş emri tablosundan fiyatları kaldır (yalnız fiyat tablosuna taşınmış olanlarda)
update public.is_emirleri i set tutar = 0, teklif = '{}'::jsonb, maliyetler = '[]'::jsonb,
  kalemler = coalesce((select jsonb_agg(k - 'fiyat' - 'maliyet' - 'hesap' order by n) from jsonb_array_elements(coalesce(i.kalemler, '[]'::jsonb)) with ordinality as e(k, n)), '[]'::jsonb)
where exists (select 1 from public.is_emri_fiyat f where f.id = i.id)
  and (i.tutar <> 0 or i.teklif <> '{}'::jsonb or i.maliyetler <> '[]'::jsonb or i.kalemler::text ~ '"(fiyat|maliyet|hesap)"');

-- 2) Silinen kayıt izi
create table if not exists public.silinenler (
  id        bigserial primary key,
  tablo     text not null,
  kayit_id  text not null,
  zaman     bigint not null
);
create index if not exists silinenler_zaman on public.silinenler (zaman);
alter table public.silinenler enable row level security;
drop policy if exists "herkes okur" on public.silinenler;
create policy "herkes okur" on public.silinenler for select to authenticated using (true);

create or replace function public.surum_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.degisme := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  new.degistiren := coalesce(auth.jwt() ->> 'email', '');
  if tg_op = 'UPDATE' then new.surum := coalesce(old.surum, 0) + 1; else new.surum := 1; end if;
  return new;
end $$;

create or replace function public.silinen_kaydet() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.silinenler (tablo, kayit_id, zaman)
  values (tg_table_name, coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'anahtar'), (extract(epoch from clock_timestamp()) * 1000)::bigint);
  return old;
end $$;

-- 3) Sürüm sütunları ve tetikleyiciler
do $$
declare t text;
begin
  foreach t in array array['musteriler','is_emirleri','is_notlari','dosyalar','faturalar','hareketler','ayarlar','katalog','katalog_gorseller','paylasimlar',
                           'personel','puantaj','personel_hareket','stok_hareket','taksitler','siparisler','cekler','arac_kayit','is_emri_fiyat'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists surum bigint not null default 1', t);
    execute format('alter table public.%I add column if not exists degisme bigint not null default 0', t);
    execute format('alter table public.%I add column if not exists degistiren text not null default ''''', t);
    execute format('create index if not exists %I on public.%I (degisme)', t || '_degisme', t);
    -- eski kayıtlara başlangıç zamanı (tetikleyiciden önce)
    execute format('drop trigger if exists surum_damga on public.%I', t);
    execute format('update public.%I set degisme = (extract(epoch from now()) * 1000)::bigint where degisme = 0', t);
    execute format('create trigger surum_damga before insert or update on public.%I for each row execute function public.surum_damga()', t);
    execute format('drop trigger if exists silinen_kaydet on public.%I', t);
    execute format('create trigger silinen_kaydet after delete on public.%I for each row execute function public.silinen_kaydet()', t);
  end loop;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'is_emri_fiyat') then
    alter publication supabase_realtime add table public.is_emri_fiyat;
  end if;
end $$;

-- 4) Usta malzeme maliyetlerini göremesin: "malzemeler" ayarını yalnız yönetici okur
--    (kesim planı için plaka adları / ölçüleri fiyatsız olarak "plakalar" ayarında durur)
drop policy if exists "herkes okur" on public.ayarlar;
create policy "herkes okur" on public.ayarlar for select to authenticated using (anahtar <> 'malzemeler' or public.yonetici_mi());

-- 5) Günlük yedeğe fiyat tablosu eklensin, eski silinen izleri temizlensin
create or replace function public.yedek_al(tur text default 'otomatik') returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v jsonb := '{}'::jsonb; s jsonb := '{}'::jsonb; r jsonb; t text; n bigint;
  simdi bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if auth.uid() is not null and not public.yonetici_mi() then raise exception 'Yedek almak için yönetici yetkisi gerekir'; end if;
  foreach t in array array['musteriler','is_emirleri','is_emri_fiyat','is_notlari','dosyalar','faturalar','hareketler','ayarlar','katalog','katalog_gorseller','paylasimlar',
                           'personel','puantaj','personel_hareket','stok_hareket','taksitler','siparisler','cekler','arac_kayit','kullanicilar'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into r;
      v := v || jsonb_build_object(t, r);
      s := s || jsonb_build_object(t, jsonb_array_length(r));
    end if;
  end loop;
  insert into public.yedekler (zaman, tur, boyut, sayilar, icerik) values (simdi, tur, length(v::text), s, v) returning id into n;
  delete from public.yedekler where zaman < simdi - 30::bigint * 86400000;
  delete from public.silinenler where zaman < simdi - 120::bigint * 86400000;
  return n;
end $$;
revoke all on function public.yedek_al(text) from public;
grant execute on function public.yedek_al(text) to authenticated;


-- ===================== supabase-guncelleme-14.sql =====================
-- Güneş Mobilya — güncelleme 14: Muhasebeci yetkisi, atölye süresi, uygulama kapalıyken bildirim
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * Muhasebeci  : Kullanıcılar listesinde "muhasebeci" yetkisi. Her şeyi görür (kasa, fatura, personel, fiyatlar),
--                  hiçbir kaydı ekleyemez / değiştiremez / silemez; dosya yükleyemez.
--  * uretim_gun  : İş emrinin tahmini atölye süresi (iş günü) — atölye kapasitesi ve teslim tarihi önerisi için.
--  * Modül fiyatları ve sabit giderler ustalardan gizlenir (malzeme listesi gibi).
--  * push_abonelik / push_anahtar : Telefon kapalıyken bildirim (Web Push). Kurulum adımları uygulamada:
--                  Ayarlar → Bildirimler → "Uygulama kapalıyken bildirim".

-- 1) Atölye süresi
alter table public.is_emirleri add column if not exists uretim_gun numeric;

-- 2) Muhasebeci yetkisi
alter table public.kullanicilar drop constraint if exists kullanicilar_rol_check;
alter table public.kullanicilar add constraint kullanicilar_rol_check check (rol in ('yonetici','usta','muhasebeci'));

create or replace function public.muhasebeci_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select k.rol = 'muhasebeci' from public.kullanicilar k
                   where lower(k.eposta) = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
$$;
revoke all on function public.muhasebeci_mi() from public;
grant execute on function public.muhasebeci_mi() to authenticated;

do $$
declare t text;
begin
  -- Muhasebeci yönetici tablolarını da okur
  foreach t in array array['faturalar','hareketler','personel','puantaj','personel_hareket','paylasimlar','stok_hareket','taksitler','siparisler','cekler','arac_kayit','is_emri_fiyat'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "muhasebeci okur" on public.%I', t);
      execute format('create policy "muhasebeci okur" on public.%I for select to authenticated using (public.muhasebeci_mi())', t);
    end if;
  end loop;
  -- Muhasebeci hiçbir tabloya yazamaz (kısıtlayıcı kural; diğer kurallarla birlikte uygulanır). İşlem geçmişi hariç.
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('islem_kaydi', 'push_abonelik') loop
    execute format('drop policy if exists "muhasebeci eklemez" on public.%I', t);
    execute format('drop policy if exists "muhasebeci degistirmez" on public.%I', t);
    execute format('drop policy if exists "muhasebeci silmez" on public.%I', t);
    execute format('create policy "muhasebeci eklemez" on public.%I as restrictive for insert to authenticated with check (not public.muhasebeci_mi())', t);
    execute format('create policy "muhasebeci degistirmez" on public.%I as restrictive for update to authenticated using (not public.muhasebeci_mi())', t);
    execute format('create policy "muhasebeci silmez" on public.%I as restrictive for delete to authenticated using (not public.muhasebeci_mi())', t);
  end loop;
end $$;

-- Dosya deposu: muhasebeci yükleyemez, silemez
drop policy if exists "muhasebeci dosya eklemez" on storage.objects;
drop policy if exists "muhasebeci dosya degistirmez" on storage.objects;
drop policy if exists "muhasebeci dosya silmez" on storage.objects;
create policy "muhasebeci dosya eklemez" on storage.objects as restrictive for insert to authenticated with check (not public.muhasebeci_mi());
create policy "muhasebeci dosya degistirmez" on storage.objects as restrictive for update to authenticated using (not public.muhasebeci_mi());
create policy "muhasebeci dosya silmez" on storage.objects as restrictive for delete to authenticated using (not public.muhasebeci_mi());

-- 3) Fiyat içeren ayarlar ustalardan gizli (malzeme fiyatları, modül fiyatları, sabit giderler)
drop policy if exists "herkes okur" on public.ayarlar;
create policy "herkes okur" on public.ayarlar for select to authenticated
  using (anahtar not in ('malzemeler','urunModulleri','sabitGiderler') or public.yonetici_mi() or public.muhasebeci_mi());

-- 4) Uygulama kapalıyken bildirim (Web Push)
create extension if not exists pgcrypto with schema extensions;
-- Her cihazın bildirim aboneliği; kişi yalnız kendi aboneliklerini görür / siler
create table if not exists public.push_abonelik (
  endpoint  text primary key,
  eposta    text not null default '',
  abonelik  jsonb not null default '{}'::jsonb,   -- tarayıcının verdiği abonelik (endpoint + anahtarlar)
  tercih    jsonb not null default '{}'::jsonb,   -- bildirim türleri, sessiz saatler
  cihaz     text not null default '',
  olusma    bigint not null default 0
);
alter table public.push_abonelik enable row level security;
drop policy if exists "kendi aboneligi" on public.push_abonelik;
create policy "kendi aboneligi" on public.push_abonelik for all to authenticated
  using (lower(eposta) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(eposta) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- Abone olanın e-postası sunucuda yazılır
create or replace function public.push_abonelik_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.eposta := lower(coalesce(auth.jwt() ->> 'email', new.eposta));
  return new;
end $$;
drop trigger if exists push_abonelik_damga on public.push_abonelik;
create trigger push_abonelik_damga before insert or update on public.push_abonelik for each row execute function public.push_abonelik_damga();

-- VAPID anahtarı ve bildirim işlevinin adresi: tablo kimseye açık değil; uygulama aşağıdaki işlevlerle kurar / okur.
create table if not exists public.push_anahtar (
  id      int primary key default 1 check (id = 1),
  genel   text not null default '',   -- VAPID genel anahtar (tarayıcıya verilir)
  gizli   text not null default '',   -- VAPID gizli anahtar (yalnız sunucu)
  url     text not null default '',   -- Edge Function adresi
  apikey  text not null default '',   -- projenin anon anahtarı (işlevi çağırmak için)
  sir     text not null default encode(extensions.gen_random_bytes(24), 'hex'),   -- işlev bu değeri bekler
  olusma  bigint not null default 0
);
alter table public.push_anahtar enable row level security;   -- kural yok: doğrudan okunamaz
alter table public.push_anahtar add column if not exists url text not null default '';
alter table public.push_anahtar add column if not exists apikey text not null default '';
alter table public.push_anahtar add column if not exists sir text not null default encode(extensions.gen_random_bytes(24), 'hex');

create or replace function public.push_kur(p_genel text, p_gizli text, p_url text, p_apikey text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici_mi() then raise exception 'Yalnız yönetici kurabilir'; end if;
  insert into public.push_anahtar (id, genel, gizli, url, apikey, olusma)
  values (1, p_genel, p_gizli, p_url, p_apikey, (extract(epoch from now()) * 1000)::bigint)
  on conflict (id) do update set genel = excluded.genel, gizli = excluded.gizli, url = excluded.url, apikey = excluded.apikey, olusma = excluded.olusma;
end $$;
revoke all on function public.push_kur(text, text, text, text) from public;
grant execute on function public.push_kur(text, text, text, text) to authenticated;

create or replace function public.push_durum() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('genel', genel, 'url', url, 'olusma', olusma) from public.push_anahtar where id = 1 and genel <> ''), '{}'::jsonb)
$$;
revoke all on function public.push_durum() from public;
grant execute on function public.push_durum() to authenticated;

-- Her işlem kaydında (kim, ne yaptı) bildirim işlevi çağrılır; işlev diğer kullanıcıların cihazlarına gönderir
create extension if not exists pg_net with schema extensions;
create or replace function public.push_tetikle() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare a public.push_anahtar%rowtype;
begin
  select * into a from public.push_anahtar where id = 1;
  if not found or a.url = '' or a.genel = '' then return new; end if;
  perform net.http_post(
    url := a.url,
    body := jsonb_build_object('kayit', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || a.apikey, 'apikey', a.apikey, 'x-gunes-sir', a.sir),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;   -- bildirim gönderilemese de işlem kaydı yazılır
end $$;
drop trigger if exists push_tetikle on public.islem_kaydi;
create trigger push_tetikle after insert on public.islem_kaydi for each row execute function public.push_tetikle();

