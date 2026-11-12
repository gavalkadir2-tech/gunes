-- Güneş Mobilya — güncelleme 16: İş kolları (mobilya + müteahhitlik)
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra). Tekrar çalıştırmak zarar vermez.
--
--  * kol : iş emri, kasa hareketi ve faturanın iş kolu. Boş = ana iş kolu (Mobilya); örn. 'muteahhit' = Müteahhitlik.
--          Kasa hareketi / faturada boşsa uygulama bağlı iş emrinin kolunu kullanır. İş kollarının adları Ayarlar → İş kolları'nda.

alter table public.is_emirleri add column if not exists kol text not null default '';
alter table public.hareketler  add column if not exists kol text not null default '';
alter table public.faturalar   add column if not exists kol text not null default '';
create index if not exists is_emirleri_kol on public.is_emirleri (kol);
