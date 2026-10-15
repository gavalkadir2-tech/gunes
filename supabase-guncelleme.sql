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
