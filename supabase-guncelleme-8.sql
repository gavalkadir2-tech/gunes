-- Güneş Mobilya — güncelleme 8: dosya boyutu sınırını kaldırır
-- Supabase → SQL Editor'de çalıştırın (önceki güncellemelerden sonra).
-- "dosyalar" (iş emri / katalog dosyaları) ve "vitrin" (müşteri bağlantısı) depolarında
-- depo başına boyut sınırı kalmaz; geçerli olan, projenin genel sınırıdır:
--   • Ücretsiz plan: tek dosya en çok 50 MB (değiştirilemez)
--   • Pro plan: Storage → Settings → "Global file size limit" ile artırılabilir (ör. 5 GB)

update storage.buckets set file_size_limit = null where id in ('dosyalar', 'vitrin');
