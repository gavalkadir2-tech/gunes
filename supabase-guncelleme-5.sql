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
