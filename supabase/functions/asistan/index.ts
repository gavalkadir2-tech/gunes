// Güneş Mobilya — yardım asistanı (Claude)
// Supabase → Edge Functions → "Deploy a new function" → "Via Editor" → adı: asistan → bu dosyanın tamamını yapıştırıp Deploy.
// Supabase → Edge Functions → Secrets: ANTHROPIC_API_KEY = console.anthropic.com'dan alınan anahtar.
// Uygulama giriş yapmış kullanıcının oturumuyla çağırır (Supabase JWT doğrulaması açık kalmalı).
// Gelen: {soru, gecmis:[{role, content}], ekran, rol, rehber}. Giden: {cevap}. Kayıt verisi (müşteri, kasa…) gönderilmez.
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SISTEM = `Sen Güneş Mobilya uygulamasının yardım asistanısın. Kullanıcılar Akhisar'daki bir mobilya atölyesinin ortakları (Samet, İbrahim), ustaları ve muhasebecisi.
Görevin: uygulamada bir işin nasıl yapılacağını kısa, sade Türkçeyle, numaralı adımlarla (en fazla 6 adım) anlatmak.
Kurallar:
- Yalnız aşağıdaki rehberde ve uygulamada olan özellikleri anlat. Bilmediğin bir özelliği uydurma; "Bunu uygulamada göremiyorum" de ve en yakın özelliği öner.
- Kullanıcının yetkisi "usta" ise yalnız yönetici özelliklerini (kasa, fatura, personel, rapor) anlatma; yöneticiye sormasını söyle.
- Uygun ekranı açmak için cevabın sonuna [[git:ekran|Düğme yazısı]] ekle (ekran: rehberde parantez içinde yazan değer). Rehberde ilgili konu varsa [[konu:kimlik]] de ekle; kullanıcıya düğmeyi ekranda gösterir.
- Muhasebe / vergi sorularında genel bilgi verebilirsin; kesin karar için muhasebeciye danışmasını söyle.
- Kullanıcının kayıtlarına (müşteri, kasa, fatura) erişimin yok; rakam soran sorularda ilgili ekranı aç.
- Sesli komut önerebilirsin (örn. "kasaya 500 lira nakit girdi", "İbrahim'den kasaya 3000 aktar").
- Selamlama ve gereksiz giriş cümlesi yazma; doğrudan cevap ver.`;

const client = new Anthropic(); // ANTHROPIC_API_KEY ortam değişkeninden

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "yalnız POST" }, 405);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ hata: "ANTHROPIC_API_KEY tanımlı değil" }, 503);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ hata: "geçersiz istek" }, 400); }

  const soru = String(b.soru ?? "").trim().slice(0, 600);
  if (!soru) return json({ hata: "soru boş" }, 400);
  const rehber = String(b.rehber ?? "").slice(0, 40000);
  const ekran = String(b.ekran ?? "ana").slice(0, 60), rol = String(b.rol ?? "usta").slice(0, 20);
  // Önceki konuşma: kullanıcı ile başlayan, sırayla devam eden son 6 mesaj
  const gecmis: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of (Array.isArray(b.gecmis) ? b.gecmis : []).slice(-6) as { role?: string; content?: unknown }[]) {
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    if (!gecmis.length && m.role !== "user") continue;
    if (gecmis.length && gecmis[gecmis.length - 1].role === m.role) continue;
    gecmis.push({ role: m.role, content: m.content.slice(0, 3000) });
  }
  if (gecmis.length && gecmis[gecmis.length - 1].role === "user") gecmis.pop();

  try {
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },            // kısa yardım cevapları: hızlı ve ucuz
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",                        // güvenlik nedeniyle reddedilirse uygun modelde yeniden dener
      system: [{ type: "text", text: SISTEM + "\n\n# Uygulama rehberi\n" + rehber, cache_control: { type: "ephemeral" } }],
      messages: [...gecmis, { role: "user", content: `[Ekran: ${ekran} · Yetki: ${rol}]\n${soru}` }],
    } as never) as Anthropic.Beta.BetaMessage;
    if (r.stop_reason === "refusal") return json({ cevap: "Bu soruya yardımcı olamıyorum." });
    const cevap = r.content.filter((x) => x.type === "text").map((x) => (x as { text: string }).text).join("\n").trim();
    return json({ cevap: cevap || "Cevap üretilemedi, tekrar deneyin." });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ hata: "Çok fazla istek; biraz sonra tekrar deneyin." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ hata: "ANTHROPIC_API_KEY geçersiz" }, 503);
    if (e instanceof Anthropic.APIError) return json({ hata: "Yapay zekâ hatası (" + e.status + ")" }, 502);
    return json({ hata: "Bağlantı hatası" }, 502);
  }
});
