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
