"use strict";
// Güneş Mobilya — giris acilis
// Uygulama dosyaları index.html'deki sırayla yüklenir; hepsi aynı genel kapsamı paylaşır.
/* ================= GİRİŞ ================= */
// Kullanıcı adı yazılırsa arkada "ad@gunesmobilya.app" e-postasına çevrilir.
const epostaYap = ad => { ad = ad.trim().toLocaleLowerCase("tr"); return ad.indexOf("@") >= 0 ? ad : ad + "@gunesmobilya.app"; };
const kullaniciAdi = () => ((oturum && oturum.user && oturum.user.email) || "").replace("@gunesmobilya.app", "");
function girisEkrani(mesaj){
  document.body.classList.add("girissiz");
  document.getElementById("uygulama").innerHTML =
    '<div class="giris-ekrani"><form class="kart" id="girisForm">' +
      '<img src="logo.png" alt="Güneş Mobilya" style="width:100%;max-width:260px;height:auto;display:block;margin:0 auto 6px">' +
      '<div class="alt-bilgi" style="text-align:center;margin-bottom:8px">İşletme yönetimi</div>' +
      '<label class="etiket" for="kadi">Kullanıcı adı</label><input id="kadi" class="kutu" autocomplete="username" autocapitalize="none" required>' +
      '<label class="etiket" for="sifre">Şifre</label><input id="sifre" type="password" class="kutu" autocomplete="current-password" required>' +
      '<div class="hata" id="hata">' + esc(mesaj || "") + '</div>' +
      '<button class="buton" type="submit" id="girisBtn">Giriş yap</button></form></div>';
  document.getElementById("girisForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("girisBtn");
    btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
    const r = await sb.auth.signInWithPassword({email:epostaYap(deger("kadi")), password:document.getElementById("sifre").value});
    if(r.error){
      btn.disabled = false; btn.textContent = "Giriş yap";
      return hataYaz(/invalid/i.test(r.error.message) ? "Kullanıcı adı veya şifre yanlış." : hataMesaji(r.error));
    }
    oturum = r.data.session; logla("giris", "oturum", "", "Giriş yaptı"); acilis();
  });
  document.getElementById("kadi").focus();
}
EYLEM.cikisYap = () => onayla("Çıkış yapılsın mı?", kuyruk.length ? kuyruk.length + " kayıt henüz gönderilmedi; internet gelince gönderilmesi için çıkış yapmayın." : "", "Çıkış yap", async () => {
  await logla("cikis", "oturum", "", "Çıkış yaptı");
  await IDB.yaz("anlik:" + benimEposta(), null);
  await sb.auth.signOut(); oturum = null; hazir = false; veri = bosVeri();
  history.replaceState(null, "", "#ana"); girisEkrani();
});

/* ================= AÇILIŞ & CANLI GÜNCELLEME ================= */
async function acilis(){
  document.getElementById("uygulama").innerHTML = '<div class="yukleniyor"><span class="donen"></span>Yükleniyor…</div>';
  if(cevrimici) kuyruk = (await IDB.al("kuyruk")) || [];
  // Hızlı açılış: cihazdaki son kopya (100 günden yeni) hemen gösterilir, değişenler arkada çekilir
  const hizli = cevrimici && navigator.onLine && await anlikYukle() && surumVar && imlec > 0 && Date.now() - sonEsitleme < 100 * 86400000;
  await bildirimYukle();
  if(hizli){
    hazir = true; ciz(); kilitGoster();
    try{ await Depo.esitle(); }
    catch(e){ if(/JWT/i.test(e.message || "")){ hazir = false; return girisEkrani("Oturum süresi doldu, tekrar giriş yapın."); } }
    sessizCiz();
    if(!cevrimdisi) canliBaglan();
    if(!cevrimdisi) copTemizle().then(() => logTemizle()).then(() => gunlukYedekKontrol()).catch(() => {});
    bildirimGonder();
    return;
  }
  try{ await Depo.yukle(); }
  catch(e){
    if(/JWT/i.test(e.message || "")) return girisEkrani("Oturum süresi doldu, tekrar giriş yapın.");
    document.body.classList.add("girissiz");
    document.getElementById("uygulama").innerHTML = '<div class="giris-ekrani"><div class="kart" style="text-align:center"><p>' + esc(hataMesaji(e)) + '</p>' +
      '<button class="buton" onclick="acilis()">Tekrar dene</button></div></div>';
    return;
  }
  if(!location.hash && cihaz().acilis !== "ana") history.replaceState(null, "", "#" + cihaz().acilis);
  hazir = true; ciz(); kilitGoster();
  if(cevrimici && !cevrimdisi) canliBaglan();
  if(!cevrimdisi) copTemizle().then(() => logTemizle()).then(() => gunlukYedekKontrol()).catch(() => {});
  bildirimGonder();
}
let kanal = null, yenileZamanlayici = null;
function canliBaglan(){
  if(kanal) return;
  kanal = sb.channel("degisiklikler");
  TABLOLAR.filter(t => !eksikTablo[t]).forEach(t => kanal.on("postgres_changes", {event:"*", schema:"public", table:t}, p => {
    const id = anahtarAdi(t);
    if(p.eventType === "DELETE") veri[t] = veri[t].filter(x => x[id] !== p.old[id]);
    else bellegeYaz(t, buluttanCevir(t, p.new), true);
    sessizCiz();
  }));
  if(fiyatAyri && yetki.yonetici) kanal.on("postgres_changes", {event:"*", schema:"public", table:"is_emri_fiyat"}, p => {
    const ie = p.new && bul("is_emirleri", p.new.id); if(ie){ fiyatBirlestir(ie, p.new); sessizCiz(); }
  });
  kanal.subscribe();
}
// Kullanıcı form dolduruyorsa ekranı yenileme, yazdığı kaybolmasın.
function sessizCiz(){
  clearTimeout(yenileZamanlayici);
  yenileZamanlayici = setTimeout(() => {
    if(!hazir || FORM_EKRANLARI[yol()[0]] || document.querySelector(".perde, .lb, .sunum")) return;
    if(/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName)){ yenileZamanlayici = setTimeout(sessizCiz, 4000); return; }   // yazı yazılıyorsa sonra dene
    const y = window.scrollY; ciz(); window.scrollTo(0, y);
  }, 250);
}
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState !== "visible" || !cevrimici || !hazir || !navigator.onLine) return;
  Depo.esitle().then(sessizCiz).catch(() => {});
});

(async () => {
  try{ ayarlariUygula(); }catch(e){}
  const vt = location.hash.match(/^#vitrin\/([\w-]+)/);
  if(vt) return vitrinGoster(vt[1]);
  if(!cevrimici) return acilis();
  if(!sb){
    document.body.classList.add("girissiz");
    document.getElementById("uygulama").innerHTML = '<div class="giris-ekrani"><div class="kart" style="text-align:center"><p>İnternet bağlantısı yok gibi görünüyor.</p>' +
      '<button class="buton" onclick="location.reload()">Tekrar dene</button></div></div>';
    return;
  }
  const r = await sb.auth.getSession();
  oturum = r.data.session;
  sb.auth.onAuthStateChange((olay, s) => { oturum = s; if(olay === "SIGNED_OUT" && hazir){ hazir = false; girisEkrani(); } });
  if(oturum) acilis(); else girisEkrani();
})();
