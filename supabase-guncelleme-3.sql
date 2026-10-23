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
