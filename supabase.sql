-- Güneş Mobilya Muhasebe — Supabase kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırıp "Run".

create table if not exists public.musteriler (
  id       text primary key,
  ad       text not null check (length(ad) between 1 and 80),
  telefon  text not null default '',
  adres    text not null default '',
  olusma   bigint not null default 0
);

create table if not exists public.hareketler (
  id          text primary key,
  tur         text not null check (tur in ('giris','cikis','borc')),
  tutar       numeric(14,2) not null check (tutar > 0),
  kategori    text not null,
  odeme       text check (odeme in ('Nakit','Kart','Havale')),
  aciklama    text not null default '',
  musteri_id  text references public.musteriler(id) on delete restrict,
  tarih       date not null,
  olusma      bigint not null default 0,
  kullanici   text default (auth.jwt() ->> 'email')
);
create index if not exists hareketler_tarih on public.hareketler (tarih);
create index if not exists hareketler_musteri on public.hareketler (musteri_id);

-- Sadece giriş yapmış kullanıcılar okuyup yazabilir.
alter table public.musteriler enable row level security;
alter table public.hareketler enable row level security;

drop policy if exists "giris yapanlar" on public.musteriler;
create policy "giris yapanlar" on public.musteriler for all to authenticated using (true) with check (true);
drop policy if exists "giris yapanlar" on public.hareketler;
create policy "giris yapanlar" on public.hareketler for all to authenticated using (true) with check (true);

-- Telefon ve bilgisayar birbirinin kaydını anında görsün.
alter publication supabase_realtime add table public.musteriler, public.hareketler;
