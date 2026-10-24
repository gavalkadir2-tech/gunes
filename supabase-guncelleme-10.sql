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
