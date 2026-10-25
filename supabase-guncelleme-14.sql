-- Güneş Mobilya — güncelleme 14: Muhasebeci yetkisi, atölye süresi, uygulama kapalıyken bildirim
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * Muhasebeci  : Kullanıcılar listesinde "muhasebeci" yetkisi. Her şeyi görür (kasa, fatura, personel, fiyatlar),
--                  hiçbir kaydı ekleyemez / değiştiremez / silemez; dosya yükleyemez.
--  * uretim_gun  : İş emrinin tahmini atölye süresi (iş günü) — atölye kapasitesi ve teslim tarihi önerisi için.
--  * Modül fiyatları ve sabit giderler ustalardan gizlenir (malzeme listesi gibi).
--  * push_abonelik / push_anahtar : Telefon kapalıyken bildirim (Web Push). Kurulum adımları uygulamada:
--                  Ayarlar → Bildirimler → "Uygulama kapalıyken bildirim".

-- 1) Atölye süresi
alter table public.is_emirleri add column if not exists uretim_gun numeric;

-- 2) Muhasebeci yetkisi
alter table public.kullanicilar drop constraint if exists kullanicilar_rol_check;
alter table public.kullanicilar add constraint kullanicilar_rol_check check (rol in ('yonetici','usta','muhasebeci'));

create or replace function public.muhasebeci_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select k.rol = 'muhasebeci' from public.kullanicilar k
                   where lower(k.eposta) = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
$$;
revoke all on function public.muhasebeci_mi() from public;
grant execute on function public.muhasebeci_mi() to authenticated;

do $$
declare t text;
begin
  -- Muhasebeci yönetici tablolarını da okur
  foreach t in array array['faturalar','hareketler','personel','puantaj','personel_hareket','paylasimlar','stok_hareket','taksitler','siparisler','cekler','arac_kayit','is_emri_fiyat'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "muhasebeci okur" on public.%I', t);
      execute format('create policy "muhasebeci okur" on public.%I for select to authenticated using (public.muhasebeci_mi())', t);
    end if;
  end loop;
  -- Muhasebeci hiçbir tabloya yazamaz (kısıtlayıcı kural; diğer kurallarla birlikte uygulanır). İşlem geçmişi hariç.
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('islem_kaydi', 'push_abonelik') loop
    execute format('drop policy if exists "muhasebeci eklemez" on public.%I', t);
    execute format('drop policy if exists "muhasebeci degistirmez" on public.%I', t);
    execute format('drop policy if exists "muhasebeci silmez" on public.%I', t);
    execute format('create policy "muhasebeci eklemez" on public.%I as restrictive for insert to authenticated with check (not public.muhasebeci_mi())', t);
    execute format('create policy "muhasebeci degistirmez" on public.%I as restrictive for update to authenticated using (not public.muhasebeci_mi())', t);
    execute format('create policy "muhasebeci silmez" on public.%I as restrictive for delete to authenticated using (not public.muhasebeci_mi())', t);
  end loop;
end $$;

-- Dosya deposu: muhasebeci yükleyemez, silemez
drop policy if exists "muhasebeci dosya eklemez" on storage.objects;
drop policy if exists "muhasebeci dosya degistirmez" on storage.objects;
drop policy if exists "muhasebeci dosya silmez" on storage.objects;
create policy "muhasebeci dosya eklemez" on storage.objects as restrictive for insert to authenticated with check (not public.muhasebeci_mi());
create policy "muhasebeci dosya degistirmez" on storage.objects as restrictive for update to authenticated using (not public.muhasebeci_mi());
create policy "muhasebeci dosya silmez" on storage.objects as restrictive for delete to authenticated using (not public.muhasebeci_mi());

-- 3) Fiyat içeren ayarlar ustalardan gizli (malzeme fiyatları, modül fiyatları, sabit giderler)
drop policy if exists "herkes okur" on public.ayarlar;
create policy "herkes okur" on public.ayarlar for select to authenticated
  using (anahtar not in ('malzemeler','urunModulleri','sabitGiderler') or public.yonetici_mi() or public.muhasebeci_mi());

-- 4) Uygulama kapalıyken bildirim (Web Push)
create extension if not exists pgcrypto with schema extensions;
-- Her cihazın bildirim aboneliği; kişi yalnız kendi aboneliklerini görür / siler
create table if not exists public.push_abonelik (
  endpoint  text primary key,
  eposta    text not null default '',
  abonelik  jsonb not null default '{}'::jsonb,   -- tarayıcının verdiği abonelik (endpoint + anahtarlar)
  tercih    jsonb not null default '{}'::jsonb,   -- bildirim türleri, sessiz saatler
  cihaz     text not null default '',
  olusma    bigint not null default 0
);
alter table public.push_abonelik enable row level security;
drop policy if exists "kendi aboneligi" on public.push_abonelik;
create policy "kendi aboneligi" on public.push_abonelik for all to authenticated
  using (lower(eposta) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(eposta) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- Abone olanın e-postası sunucuda yazılır
create or replace function public.push_abonelik_damga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.eposta := lower(coalesce(auth.jwt() ->> 'email', new.eposta));
  return new;
end $$;
drop trigger if exists push_abonelik_damga on public.push_abonelik;
create trigger push_abonelik_damga before insert or update on public.push_abonelik for each row execute function public.push_abonelik_damga();

-- VAPID anahtarı ve bildirim işlevinin adresi: tablo kimseye açık değil; uygulama aşağıdaki işlevlerle kurar / okur.
create table if not exists public.push_anahtar (
  id      int primary key default 1 check (id = 1),
  genel   text not null default '',   -- VAPID genel anahtar (tarayıcıya verilir)
  gizli   text not null default '',   -- VAPID gizli anahtar (yalnız sunucu)
  url     text not null default '',   -- Edge Function adresi
  apikey  text not null default '',   -- projenin anon anahtarı (işlevi çağırmak için)
  sir     text not null default encode(extensions.gen_random_bytes(24), 'hex'),   -- işlev bu değeri bekler
  olusma  bigint not null default 0
);
alter table public.push_anahtar enable row level security;   -- kural yok: doğrudan okunamaz
alter table public.push_anahtar add column if not exists url text not null default '';
alter table public.push_anahtar add column if not exists apikey text not null default '';
alter table public.push_anahtar add column if not exists sir text not null default encode(extensions.gen_random_bytes(24), 'hex');

create or replace function public.push_kur(p_genel text, p_gizli text, p_url text, p_apikey text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici_mi() then raise exception 'Yalnız yönetici kurabilir'; end if;
  insert into public.push_anahtar (id, genel, gizli, url, apikey, olusma)
  values (1, p_genel, p_gizli, p_url, p_apikey, (extract(epoch from now()) * 1000)::bigint)
  on conflict (id) do update set genel = excluded.genel, gizli = excluded.gizli, url = excluded.url, apikey = excluded.apikey, olusma = excluded.olusma;
end $$;
revoke all on function public.push_kur(text, text, text, text) from public;
grant execute on function public.push_kur(text, text, text, text) to authenticated;

create or replace function public.push_durum() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('genel', genel, 'url', url, 'olusma', olusma) from public.push_anahtar where id = 1 and genel <> ''), '{}'::jsonb)
$$;
revoke all on function public.push_durum() from public;
grant execute on function public.push_durum() to authenticated;

-- Her işlem kaydında (kim, ne yaptı) bildirim işlevi çağrılır; işlev diğer kullanıcıların cihazlarına gönderir
create extension if not exists pg_net with schema extensions;
create or replace function public.push_tetikle() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare a public.push_anahtar%rowtype;
begin
  select * into a from public.push_anahtar where id = 1;
  if not found or a.url = '' or a.genel = '' then return new; end if;
  perform net.http_post(
    url := a.url,
    body := jsonb_build_object('kayit', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || a.apikey, 'apikey', a.apikey, 'x-gunes-sir', a.sir),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;   -- bildirim gönderilemese de işlem kaydı yazılır
end $$;
drop trigger if exists push_tetikle on public.islem_kaydi;
create trigger push_tetikle after insert on public.islem_kaydi for each row execute function public.push_tetikle();
