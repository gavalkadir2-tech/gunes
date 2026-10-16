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
