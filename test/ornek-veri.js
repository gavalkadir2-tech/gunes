// Testlerin ortak örnek verisi. Sayfanın içinde çalışır (page.evaluate), uygulamanın kendi fonksiyonlarını kullanır.
module.exports = async function ornekVeri(){
  const t = bugun(), once = gunEkle(t, -40);
  await Depo.kaydet("musteriler", [
    {id:"m1", ad:"Ali Osman Yılmaz", tip:"musteri", telefon:"0555 111 22 33", adres:"Akhisar", vergiNo:"10000000146", olusma:1},
    {id:"m2", ad:"Ayşe Demir", tip:"musteri", telefon:"0532 444 55 66", adres:"", vergiNo:"", olusma:2},
    {id:"t1", ad:"Kaya Kereste", tip:"tedarikci", telefon:"0532 111 22 33", adres:"", vergiNo:"", olusma:3},
    {id:"t2", ad:"Demir Ahşap", tip:"tedarikci", telefon:"0533 000 00 00", adres:"", vergiNo:"", olusma:4}]);
  await Depo.kaydet("ayarlar", {anahtar:"malzemeler", deger:[
    {id:"mz1", ad:"18 mm beyaz sunta", birim:"plaka", fiyat:1450, min:10, en:2100, boy:2800, tedarikciId:"t1"},
    {id:"mz2", ad:"8 mm duralit", birim:"plaka", fiyat:420, min:0, en:2100, boy:2800},
    {id:"mz3", ad:"Menteşe", birim:"adet", fiyat:50, min:0}]});
  await Depo.kaydet("katalog", {id:"k1", baslik:"Krem mutfak", kategori:"Mutfak", aciklama:"", malzeme:"Lake", olcu:"", fiyat:90000, olusma:1});
  await Depo.kaydet("personel", {id:"p1", ad:"Mehmet", gorev:"Usta", telefon:"", iban:"", giris:"2024-01-01", cikis:null, ucretTipi:"aylik", ucret:30000, izinHakki:14, notlar:"", olusma:1});
  const kalem = {ad:"Alt dolap", olcu:"240x72x56", adet:1, fiyat:40000, maliyet:24000, hesap:{satirlar:[{malzemeId:"mz1", ad:"18 mm beyaz sunta", birim:"plaka", fiyat:1450, miktar:6}, {malzemeId:"mz3", ad:"Menteşe", birim:"adet", fiyat:50, miktar:8}], iscilik:5000, kar:30}};
  await Depo.kaydet("is_emirleri", [
    Object.assign(isAlanlari({}), {id:"i1", no:"İE-0001", musteriId:"m1", baslik:"Mutfak", durum:"Üretimde", oncelik:"Acil", sorumlu:"Mehmet", adres:"Akhisar", kategori:"Mutfak",
      kalemler:[kalem], asamalar:[{ad:"Kesim", tamam:true}, {ad:"Montaj", tamam:false}], teklif:{kdv:20}, kesif:{}, tutar:48000, aciklama:"", teslimTarihi:t, olusma:Date.now(),
      montaj:[{id:"r1", tarih:t, saat:"10:00", sure:3, tur:"Montaj", ekip:["Mehmet"], not:"", hatirlatildi:false, tamam:false}],
      kesim:{parcalar:dolapParcalari({ad:"Alt", tip:"alt", en:2400, boy:720, derinlik:560, adet:1, kalinlik:18, raf:1, kapak:4, govde:"mz1", kapakMalzeme:"mz1", arkalik:"mz2"}), testere:4, pay:10}}),
    Object.assign(isAlanlari({}), {id:"i2", no:"İE-0002", musteriId:"m2", baslik:"Gardırop teklifi", durum:"Teklif", oncelik:"Normal", sorumlu:"", adres:"", kalemler:[Object.assign({}, kalem, {ad:"Gardırop"})],
      asamalar:[], teklif:{kdv:20, gecerlilik:t}, kesif:{}, tutar:48000, aciklama:"", teslimTarihi:null, olusma:Date.now()})]);
  await Depo.kaydet("faturalar", [
    {id:"f1", no:"S2026-0001", tur:"satis", musteriId:"m1", isEmriId:"i1", kategori:"Satış", tarih:once, vade:gunEkle(t, -10), kalemler:[{ad:"Mutfak", miktar:1, fiyat:40000, kdv:20}], araToplam:40000, kdvToplam:8000, toplam:48000, aciklama:"", olusma:1},
    {id:"f2", no:"A2026-0001", tur:"alis", musteriId:"t1", isEmriId:"i1", kategori:"Hammadde (MDF, Sunta, Kereste)", tarih:t, vade:null, kalemler:[{ad:"18mm beyaz sunta 2100x2800", miktar:10, fiyat:1500, kdv:20}], araToplam:15000, kdvToplam:3000, toplam:18000, aciklama:"", olusma:2},
    {id:"f3", no:"A2026-0002", tur:"alis", musteriId:"t2", isEmriId:null, kategori:"Hammadde (MDF, Sunta, Kereste)", tarih:t, vade:null, kalemler:[{ad:"Beyaz sunta 18 mm", miktar:5, fiyat:1380, kdv:20}], araToplam:6900, kdvToplam:1380, toplam:8280, aciklama:"", olusma:3}]);
  await Depo.kaydet("hareketler", [
    {id:"h1", tur:"giris", tutar:10000, kategori:"Kapora / Peşinat", odeme:"Nakit", aciklama:"", musteriId:"m1", isEmriId:"i1", faturaId:"f1", tarih:once, olusma:1, ortak:"samet", hedef:""},
    {id:"h2", tur:"cikis", tutar:3000, kategori:"Usta / İşçilik", odeme:"Nakit", aciklama:"Montaj", musteriId:null, isEmriId:"i1", faturaId:null, tarih:t, olusma:2, ortak:"", hedef:""}]);
  await Depo.kaydet("cekler", {id:"c1", tur:"alinan", belge:"cek", no:"1", banka:"Ziraat", kesideci:"", musteriId:"m1", tutar:5000, vade:t, durum:"portfoy", ciroId:null, hareketId:null, gecmis:[], aciklama:"", olusma:1});
  await Depo.kaydet("siparisler", {id:"s1", no:"SP-0001", tedarikciId:"t1", kalemler:[{malzemeId:"mz1", ad:"18 mm beyaz sunta", birim:"plaka", miktar:10, fiyat:1450, gelen:0}], durum:"bekliyor", tarih:t, faturaId:null, aciklama:"", olusma:1});
  await Depo.kaydet("ayarlar", {anahtar:"araclar", deger:[{id:"a1", plaka:"45 ABC 123", ad:"Transit", km:100000, muayene:gunEkle(t, 10), sigorta:"", kasko:""}]});
  await Depo.kaydet("arac_kayit", [{id:"y1", aracId:"a1", tur:"yakit", tarih:t, km:100000, litre:50, tutar:2500, dolu:true, sonraki:"", sonrakiKm:0, aciklama:"", isEmriId:null, hareketId:null, olusma:1},
    {id:"y2", aracId:"a1", tur:"yakit", tarih:t, km:100500, litre:45, tutar:2300, dolu:true, sonraki:"", sonrakiKm:0, aciklama:"", isEmriId:null, hareketId:null, olusma:2}]);
};
