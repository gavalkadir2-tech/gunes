// Güneş Mobilya — uygulama kapalıyken telefon bildirimi (Web Push)
// Supabase → Edge Functions → "Deploy a new function" → "Via Editor" → adı: bildirim-gonder → bu dosyanın tamamını yapıştırıp Deploy.
// Veritabanı her işlem kaydında (islem_kaydi) bu işlevi çağırır (supabase-guncelleme-14.sql). İşlev, işlemi yapan kişi
// dışındaki herkesin abone cihazlarına bildirim gönderir; kişinin seçtiği türler ve sessiz saatler dikkate alınır.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const TABLO: Record<string, [string, string]> = {   // tablo → [tür, okunur ad]
  is_emirleri: ["is", "İş emri"], is_notlari: ["is", "İş notu"], dosyalar: ["is", "Dosya"], hareketler: ["para", "Kasa"], faturalar: ["para", "Fatura"],
  taksitler: ["para", "Taksit"], cekler: ["para", "Çek / senet"], musteriler: ["para", "Cari"], siparisler: ["stok", "Malzeme siparişi"], stok_hareket: ["stok", "Stok"],
  arac_kayit: ["stok", "Araç"], katalog: ["katalog", "Katalog"], katalog_gorseller: ["katalog", "Katalog fotoğrafı"], paylasimlar: ["katalog", "Müşteri bağlantısı"],
  personel: ["personel", "Personel"], puantaj: ["personel", "Puantaj"], personel_hareket: ["personel", "Personel ödemesi"], ayarlar: ["sistem", "Ayarlar"], kullanicilar: ["sistem", "Kullanıcı"],
};
const ISLEM: Record<string, string> = { ekle: "ekledi", guncelle: "değiştirdi", sil: "sildi", geri: "geri yükledi" };
const YER: Record<string, string> = { is_emirleri: "is/", hareketler: "kayit/", faturalar: "fatura/", musteriler: "cari/", cekler: "cekler/", katalog: "proje/", personel: "personel/" };
const SESSIZ_AYAR = ["hatirlatmaGecmisi", "plakalar"];

const dakika = (s: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
function sessizMi(t: Record<string, string>) {
  const b = dakika(t.sessizBas), e = dakika(t.sessizBit);
  if (b == null || e == null || b === e) return false;
  const s = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })), d = s.getHours() * 60 + s.getMinutes();
  return b < e ? d >= b && d < e : d >= b || d < e;
}

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: a } = await sb.from("push_anahtar").select("*").eq("id", 1).maybeSingle();
  if (!a || req.headers.get("x-gunes-sir") !== a.sir) return new Response("yetkisiz", { status: 401 });
  const { kayit: k } = await req.json();
  if (!k) return new Response("kayıt yok", { status: 400 });

  const deneme = k.islem === "push_deneme";
  const tur = TABLO[k.tablo];
  if (!deneme && (!tur || !ISLEM[k.islem] || (k.tablo === "ayarlar" && SESSIZ_AYAR.includes(k.kayit_id)))) return new Response("atlandı");

  const kim = k.ad || String(k.kullanici || "").replace("@gunesmobilya.app", "") || "Biri";
  const mesaj = deneme
    ? { baslik: "Deneme bildirimi", govde: "Uygulama kapalıyken de bildirim alacaksınız.", yer: "ayarlar/bildirim", etiket: "gunes-deneme" }
    : { baslik: kim + " " + tur[1].toLocaleLowerCase("tr") + " " + ISLEM[k.islem], govde: k.baslik || "", yer: YER[k.tablo] && k.islem !== "sil" ? YER[k.tablo] + k.kayit_id : "ana", etiket: "gunes-" + k.tablo + "-" + k.kayit_id };

  webpush.setVapidDetails("mailto:bildirim@gunesmobilya.app", a.genel, a.gizli);
  const { data: abonelikler } = await sb.from("push_abonelik").select("*");
  const ben = String(k.kullanici || "").toLowerCase();
  let gonderilen = 0;
  await Promise.all((abonelikler || []).map(async (ab) => {
    const t = ab.tercih || {};
    if (deneme ? ab.eposta !== ben : ab.eposta === ben) return;                  // deneme yalnız kendine, diğerleri başkalarına
    if (!deneme && (t.kategori && t.kategori[tur[0]] === false || sessizMi(t))) return;
    if (!deneme && t.yonetici === false && tur[0] !== "is" && tur[0] !== "katalog") return;   // ustaya para / personel bildirimi gitmez
    try { await webpush.sendNotification(ab.abonelik, JSON.stringify(mesaj), { TTL: 86400 }); gonderilen++; }
    catch (e) { const s = (e as { statusCode?: number }).statusCode; if (s === 404 || s === 410) await sb.from("push_abonelik").delete().eq("endpoint", ab.endpoint); }
  }));
  return new Response(JSON.stringify({ gonderilen }), { headers: { "Content-Type": "application/json" } });
});
