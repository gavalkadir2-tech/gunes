-- Güneş Mobilya — Güncelleme 7: Kullanıcı yetkileri (yönetici / usta)
-- Önceki SQL dosyaları çalıştırıldıktan sonra bunu çalıştırın. Tekrar çalıştırmak zarar vermez.
-- ÖNEMLİ: Önceki SQL dosyalarından birini sonradan tekrar çalıştırırsanız bu dosyayı da yeniden çalıştırın
-- (eski dosyalar herkese tam yetki verir).
--
-- Kurallar:
--  * "kullanicilar" listesi boşsa giriş yapan herkes yöneticidir (eski davranış).
--  * Listeye en az bir kişi eklendikten sonra listede olmayan veya "usta" olan hesaplar usta yetkisindedir.
--  * Usta: iş emirlerini, müşteri adres / telefonunu, katalog ve sunumu görür; iş aşamalarını, durumunu, notları,
--    fotoğrafları ve ölçü / keşif bilgisini güncelleyebilir. Faturalar, kasa, personel, maaşlar ve müşteri bağlantıları görünmez.
--    Not: İş emrindeki fiyat alanı uygulamada ustaya gösterilmez, ancak veritabanı satır düzeyinde gizlenmez.

create table if not exists public.kullanicilar (
  eposta  text primary key,                 -- giriş e-postası (kullanıcı adı@gunesmobilya.app)
  ad      text not null default '',         -- iş emrindeki "sorumlu usta" adıyla aynı yazılmalı
  rol     text not null default 'usta' check (rol in ('yonetici','usta')),
  olusma  bigint not null default 0
);
alter table public.kullanicilar enable row level security;

create or replace function public.yonetici_mi() returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.kullanicilar) then true
    else coalesce((select k.rol = 'yonetici' from public.kullanicilar k
                   where lower(k.eposta) = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
  end
$$;
revoke all on function public.yonetici_mi() from public;
grant execute on function public.yonetici_mi() to authenticated;

drop policy if exists "kendi kaydi veya yonetici" on public.kullanicilar;
create policy "kendi kaydi veya yonetici" on public.kullanicilar for select to authenticated
  using (public.yonetici_mi() or lower(eposta) = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "yonetici yazar" on public.kullanicilar;
create policy "yonetici yazar" on public.kullanicilar for all to authenticated
  using (public.yonetici_mi()) with check (public.yonetici_mi());

do $$
declare t text;
begin
  -- Sadece yönetici: para, personel, paylaşım
  foreach t in array array['faturalar','hareketler','personel','puantaj','personel_hareket','paylasimlar'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "giris yapanlar" on public.%I', t);
      execute format('drop policy if exists "yonetici" on public.%I', t);
      execute format('create policy "yonetici" on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
    end if;
  end loop;
  -- Herkes okur, yönetici yazar
  foreach t in array array['musteriler','katalog','katalog_gorseller','ayarlar','is_emirleri'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "giris yapanlar" on public.%I', t);
      execute format('drop policy if exists "herkes okur" on public.%I', t);
      execute format('drop policy if exists "yonetici yazar" on public.%I', t);
      execute format('create policy "herkes okur" on public.%I for select to authenticated using (true)', t);
      execute format('create policy "yonetici yazar" on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
    end if;
  end loop;
  -- Usta iş emrini güncelleyebilir (aşama, durum, keşif); ekleyip silemez
  if to_regclass('public.is_emirleri') is not null then
    drop policy if exists "herkes gunceller" on public.is_emirleri;
    create policy "herkes gunceller" on public.is_emirleri for update to authenticated using (true) with check (true);
  end if;
end $$;
