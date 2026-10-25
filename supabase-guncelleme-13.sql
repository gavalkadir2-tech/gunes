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
