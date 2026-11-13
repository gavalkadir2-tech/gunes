-- Güneş Mobilya — güncelleme 17: Hakediş / taşeron / teklif sürümleri, garanti ve servis, müşteri iş sayfası ve teklif onayı
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * ekler  : iş emrinin fiyat içeren ekleri (sözleşme kalemleri, hakedişler, taşeron sözleşmeleri, teklif sürümleri).
--             Fiyat tablosu (is_emri_fiyat) varsa orada durur; ustalar göremez.
--  * servis : iş emrinin garanti süresi ve servis kayıtları (ustalar da görür ve girer).
--  * teklif_onay : müşterinin iş sayfasından verdiği "onaylıyorum / değişiklik istiyorum" cevapları.
--             Müşteri giriş yapmaz; yalnız kendisine gönderilen bağlantının anahtarıyla teklif_onayla() işlevini çağırabilir.

alter table public.is_emirleri add column if not exists ekler  jsonb not null default '{}'::jsonb;
alter table public.is_emirleri add column if not exists servis jsonb not null default '{}'::jsonb;
do $$ begin
  if to_regclass('public.is_emri_fiyat') is not null then
    alter table public.is_emri_fiyat add column if not exists ekler jsonb not null default '{}'::jsonb;
  end if;
end $$;

create table if not exists public.teklif_onay (
  id           text primary key default gen_random_uuid()::text,
  paylasim_id  text not null default '',
  is_emri_id   text,
  karar        text not null default 'onay' check (karar in ('onay','revize')),
  ad           text not null default '',
  notu         text not null default '',
  zaman        bigint not null default 0,
  islendi      boolean not null default false,
  surum        bigint not null default 1,
  degisme      bigint not null default 0,
  degistiren   text not null default ''
);
create index if not exists teklif_onay_degisme on public.teklif_onay (degisme);
alter table public.teklif_onay enable row level security;
drop policy if exists "yonetici" on public.teklif_onay;
create policy "yonetici" on public.teklif_onay for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi());
do $$ begin
  if to_regprocedure('public.surum_damga()') is not null then
    drop trigger if exists surum_damga on public.teklif_onay;
    create trigger surum_damga before insert or update on public.teklif_onay for each row execute function public.surum_damga();
    drop trigger if exists silinen_kaydet on public.teklif_onay;
    create trigger silinen_kaydet after delete on public.teklif_onay for each row execute function public.silinen_kaydet();
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teklif_onay') then
    alter publication supabase_realtime add table public.teklif_onay;
  end if;
end $$;

-- Müşterinin cevabı: yalnız geçerli (süresi dolmamış) bir iş sayfası bağlantısıyla; bağlantı başına en çok 20 cevap
create or replace function public.teklif_onayla(anahtar text, karar text, ad text, notu text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select icerik into v from public.paylasimlar
   where id = anahtar and (bitis = 0 or bitis > (extract(epoch from now()) * 1000)::bigint);
  if v is null or coalesce(v ->> 'tur', '') <> 'is' then return jsonb_build_object('hata', 'gecersiz'); end if;
  if (select count(*) from public.teklif_onay where paylasim_id = anahtar) >= 20 then return jsonb_build_object('hata', 'cok'); end if;
  insert into public.teklif_onay (paylasim_id, is_emri_id, karar, ad, notu, zaman)
  values (anahtar, v ->> 'isEmriId', case when karar = 'revize' then 'revize' else 'onay' end, left(coalesce(ad, ''), 80), left(coalesce(notu, ''), 1000),
          (extract(epoch from now()) * 1000)::bigint);
  return jsonb_build_object('tamam', true);
end $$;
revoke all on function public.teklif_onayla(text, text, text, text) from public;
grant execute on function public.teklif_onayla(text, text, text, text) to anon, authenticated;
