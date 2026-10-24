-- Güneş Mobilya — güncelleme 9: Çöp kutusu ve işlem geçmişi (sistem kaydı)
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * cop_kutusu   : Silinen kayıtlar (bağlı notlar, dosyalar, taksitler vb. ile birlikte) burada bekler.
--                   Ayarlar → Çöp kutusu'ndan geri yüklenir; süresi dolunca (varsayılan 30 gün) kalıcı silinir.
--  * islem_kaydi  : Kim, ne zaman, hangi cihazla, hangi işlemi yaptı. Kullanıcı ve zaman sunucuda yazılır,
--                   uygulamadan değiştirilemez; kayıtlar düzenlenemez, 30 günden yeni kayıtlar silinemez.

create table if not exists public.cop_kutusu (
  id       text primary key,
  baslik   text not null default '',
  tur      text not null default '',          -- ana kaydın tablosu (is_emirleri, faturalar …)
  icerik   jsonb not null default '{}'::jsonb, -- {kayitlar:[{t,k}], kopan:[{t,id,alan,deger}]}
  silen    text not null default '',
  silen_ad text not null default '',
  silinme  bigint not null default 0
);
alter table public.cop_kutusu enable row level security;

create table if not exists public.islem_kaydi (
  id        text primary key,
  zaman     bigint not null default 0,
  kullanici text not null default '',
  ad        text not null default '',
  cihaz     text not null default '',
  islem     text not null default '',
  tablo     text not null default '',
  kayit_id  text not null default '',
  baslik    text not null default '',
  ayrinti   jsonb not null default '{}'::jsonb
);
create index if not exists islem_kaydi_zaman on public.islem_kaydi (zaman desc);
alter table public.islem_kaydi enable row level security;

-- Kullanıcı ve zaman her zaman sunucudan gelir (uygulamadan başkası adına kayıt yazılamaz)
create or replace function public.islem_kaydi_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.kullanici := coalesce(auth.jwt() ->> 'email', new.kullanici);
  new.zaman := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  if coalesce(new.cihaz, '') = '' then
    new.cihaz := left(coalesce(current_setting('request.headers', true)::json ->> 'user-agent', ''), 200);
  end if;
  return new;
end $$;
drop trigger if exists islem_kaydi_damga on public.islem_kaydi;
create trigger islem_kaydi_damga before insert on public.islem_kaydi for each row execute function public.islem_kaydi_damga();

create or replace function public.cop_kutusu_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.silen := coalesce(auth.jwt() ->> 'email', new.silen);
  new.silinme := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end $$;
drop trigger if exists cop_kutusu_damga on public.cop_kutusu;
create trigger cop_kutusu_damga before insert on public.cop_kutusu for each row execute function public.cop_kutusu_damga();

do $$
begin
  -- Çöp kutusu: herkes (usta da) sildiği kaydı çöpe atabilir; görmek, geri yüklemek, boşaltmak yöneticinin
  drop policy if exists "herkes ekler" on public.cop_kutusu;
  drop policy if exists "yonetici okur" on public.cop_kutusu;
  drop policy if exists "yonetici siler" on public.cop_kutusu;
  create policy "herkes ekler" on public.cop_kutusu for insert to authenticated with check (true);
  create policy "yonetici okur" on public.cop_kutusu for select to authenticated using (public.yonetici_mi());
  create policy "yonetici siler" on public.cop_kutusu for delete to authenticated using (public.yonetici_mi());

  -- İşlem geçmişi: herkes ekler, yönetici okur; düzenlenemez; yalnız 30 günden eski kayıtlar silinebilir
  drop policy if exists "herkes ekler" on public.islem_kaydi;
  drop policy if exists "yonetici okur" on public.islem_kaydi;
  drop policy if exists "eskiyi yonetici siler" on public.islem_kaydi;
  create policy "herkes ekler" on public.islem_kaydi for insert to authenticated with check (true);
  create policy "yonetici okur" on public.islem_kaydi for select to authenticated using (public.yonetici_mi());
  create policy "eskiyi yonetici siler" on public.islem_kaydi for delete to authenticated
    using (public.yonetici_mi() and zaman < (extract(epoch from now()) * 1000)::bigint - 30::bigint * 86400000);
end $$;
