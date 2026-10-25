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
