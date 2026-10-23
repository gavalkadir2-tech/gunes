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
