-- Güneş Mobilya — güncelleme 11: Ortaklar (Samet, İbrahim) ve kişi kasaları
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--  * ortak : paranın kimin elinde olduğu / kimin ödediği ('' = ortak kasa; yoksa ortağın kimliği)
--  * hedef : kasalar arası aktarımda paranın gittiği kasa
--  * tur   : 'aktarim' eklendi (kasalar arası aktarım; gelir / gider sayılmaz)
alter table public.hareketler add column if not exists ortak text not null default '';
alter table public.hareketler add column if not exists hedef text not null default '';
alter table public.hareketler drop constraint if exists hareketler_tur_check;
alter table public.hareketler add constraint hareketler_tur_check check (tur in ('giris','cikis','borc','aktarim'));
