-- Güneş Mobilya — güncelleme 15: Açılış bakiyeleri
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * Müşteri / tedarikçi, personel ve kasa için uygulamadan önceki bakiye "acilis" türünde tek kayıt olarak tutulur.
--    Tutar işaretlidir (artı: bize borçlu / personelin alacağı / kasada var; eksi: biz borçluyuz / personel bize borçlu).
--    Açılış bakiyesi gelir veya gider sayılmaz.

alter table public.hareketler drop constraint if exists hareketler_tur_check;
alter table public.hareketler add constraint hareketler_tur_check check (tur in ('giris','cikis','borc','aktarim','acilis'));
alter table public.hareketler drop constraint if exists hareketler_tutar_check;
alter table public.hareketler add constraint hareketler_tutar_check check (tutar > 0 or (tur = 'acilis' and tutar <> 0));

do $$
begin
  if to_regclass('public.personel_hareket') is not null then
    alter table public.personel_hareket drop constraint if exists personel_hareket_tur_check;
    alter table public.personel_hareket add constraint personel_hareket_tur_check check (tur in ('hakedis','prim','kesinti','avans','odeme','acilis'));
    alter table public.personel_hareket drop constraint if exists personel_hareket_tutar_check;
    alter table public.personel_hareket add constraint personel_hareket_tutar_check check (tutar >= 0 or tur = 'acilis');
  end if;
end $$;
