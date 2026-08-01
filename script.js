document.addEventListener("DOMContentLoaded", () => {
    const anaMenu = document.getElementById("ana-menu");
    const oyunEkrani = document.getElementById("oyun-ekrani");
    const oyunSonuEkrani = document.getElementById("oyun-sonu-ekrani");
    const ucIkiBirEkrani = document.getElementById("uc-iki-bir-ekrani");
    
    const baslaButonu = document.getElementById("basla-butonu");
    const hizliModGecisButonu = document.getElementById("hizli-mod-gecis");
    const klasikMenuyeDonButonu = document.getElementById("klasik-menuye-don");
    const varIndirButonu = document.getElementById("var-indir-butonu");
    const yeniMacButonu = document.getElementById("yeni-mac-butonu");

    // YENİ VAR SEÇİM MODALI DEĞİŞKENLERİ
    const varModal = document.getElementById("var-modal");
    const varOyuncuAdiMetni = document.getElementById("var-oyuncu-adi");
    const varSeceneklerAlani = document.getElementById("var-secenekler-alani");
    const varGonderBtn = document.getElementById("var-gonder-btn");
    const varIptalBtn = document.getElementById("var-iptal-btn");
    let aktifItirazOyuncu = "";
    let aktifItirazPanelNo = 0;

    let varListesi = JSON.parse(localStorage.getItem("varKayitlari")) || [];

    varIndirButonu.addEventListener("click", () => {
        if(varListesi.length === 0) {
            alert("Harika! Henüz sisteme önerilen (itiraz edilen) bir oyuncu yok.");
            return;
        }
        
        let metin = "--- SİSTEME EKLENMESİ ÖNERİLEN OYUNCULAR (VAR LİSTESİ) ---\n";
        metin += "NOT: Köşeli parantez içindeki tarihler, itirazın yapıldığı günü gösterir.\n\n";
        
        // Listeyi şık bir şekilde formatla
        varListesi.forEach(kayit => {
            if (typeof kayit === "string") {
                metin += `[Tarihsiz Kayıt] - ${kayit.toUpperCase()}\n`;
            } else {
                let takimlarMetni = kayit.takimlar && kayit.takimlar.length > 0 ? ` | Seçilen Takımlar/Ülkeler: ${kayit.takimlar.join(", ")}` : " | (Takım seçilmedi)";
                metin += `[${kayit.tarih}] - ${kayit.isim.toUpperCase()}${takimlarMetni}\n`;
            }
        });

        const blob = new Blob([metin], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "VAR_Onerilenler_Listesi.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    const elitTakimlar = [
        "Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla",
        "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United", "Tottenham",
        "Bayern Münih", "Borussia Dortmund", "Bayer Leverkusen",
        "Juventus", "AC Milan", "Inter", "Napoli", "Roma",
        "PSG", "Marsilya", "Lyon", "Lille",
        "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor",
        "Ajax", "PSV", "Feyenoord", "Porto", "Benfica", "Sporting",
        "Boca Juniors", "River Plate"
    ];

    let futbolcularVerisi = [];
    let tumTakimlar = [];
    let tumUlkeler = [];
    let gecerliElitTakimlar = [];

    async function verileriGetir() {
        try {
            const response = await fetch("futbolcular.json");
            futbolcularVerisi = await response.json();
            
            let takimSet = new Set();
            let ulkeSet = new Set();
            futbolcularVerisi.forEach(o => {
                if(o.takimlar) o.takimlar.forEach(t => takimSet.add(t));
                if(o.uyruk) ulkeSet.add(o.uyruk);
            });
            tumTakimlar = Array.from(takimSet);
            tumUlkeler = Array.from(ulkeSet);
            gecerliElitTakimlar = elitTakimlar.filter(t => tumTakimlar.includes(t));
        } catch (error) {
            console.error("JSON Hatası:", error);
        }
    }
    verileriGetir();

    function rastgeleSecimliDizi(havuz, elitHavuz, adet) {
        let secilenler = new Set();
        let guvenlikSayaci = 0;
        while(secilenler.size < adet && guvenlikSayaci < 200) {
            let secim = "";
            if (Math.random() < 0.85 && elitHavuz.length > 0) secim = elitHavuz[Math.floor(Math.random() * elitHavuz.length)];
            else secim = havuz[Math.floor(Math.random() * havuz.length)];
            
            if (secim) secilenler.add(secim);
            guvenlikSayaci++;
        }
        return Array.from(secilenler);
    }

    // ==========================================
    // KLASİK OYUN MANTIĞI 
    // ==========================================
    const oyunModuSecim = document.getElementById("oyun-modu");
    const zorlukSecimi = document.getElementById("zorluk-secimi");
    const oyuncu2Input = document.getElementById("oyuncu2-isim");
    const takimEtiketleri = document.querySelectorAll(".takimlar-satiri .takim-etiketi");
    const inputs = document.querySelectorAll(".koyu-input");
    const sorgulaButonlari = document.querySelectorAll(".btn-sorgula");
    const oncekiTurButonu = document.getElementById("onceki-tur-butonu");
    const turBitirButonu = document.getElementById("tur-bitir-butonu");
    
    let guncelSkor1 = 0, guncelSkor2 = 0;
    let aktifTurIndex = 0; 
    const maxTur = 6;
    let isYapayZekaAktif = false;
    let oynananTurlar = [];

    klasikMenuyeDonButonu.addEventListener("click", () => { location.reload(); });
    yeniMacButonu.addEventListener("click", () => { location.reload(); });

    oyunModuSecim.addEventListener("change", (e) => {
        if (e.target.value === "yapay-zeka") {
            zorlukSecimi.classList.remove("gizli");
            oyuncu2Input.value = "Yapay Zeka";
            oyuncu2Input.disabled = true;
        } else {
            zorlukSecimi.classList.add("gizli");
            oyuncu2Input.value = "";
            oyuncu2Input.disabled = false;
        }
    });

    baslaButonu.addEventListener("click", () => {
        isYapayZekaAktif = document.getElementById("oyun-modu").value === "yapay-zeka";
        document.getElementById("panel1-isim").innerText = document.getElementById("oyuncu1-isim").value || "Ben";
        document.getElementById("panel2-isim").innerText = document.getElementById("oyuncu2-isim").value || (isYapayZekaAktif ? "Yapay Zeka" : "Arkadaşım");
        
        oynananTurlar = [];
        aktifTurIndex = 0;
        guncelSkor1 = 0;
        guncelSkor2 = 0;
        
        turuEkranaBas(aktifTurIndex);
        
        anaMenu.classList.add("gizli");
        oyunEkrani.classList.remove("gizli");
    });

    function turuEkranaBas(index) {
        if(!oynananTurlar[index]) {
            const kategori = document.getElementById("kategori-secimi").value;
            let secenekler = [];
            if (kategori === "ulkeler" && tumUlkeler.length >= 2) {
                secenekler = [...rastgeleSecimliDizi(tumUlkeler, tumUlkeler, 2), ...rastgeleSecimliDizi(tumTakimlar, gecerliElitTakimlar, 4)].sort(() => 0.5 - Math.random());
            } else {
                secenekler = rastgeleSecimliDizi(tumTakimlar, gecerliElitTakimlar, 6);
            }
            
            oynananTurlar[index] = {
                takimlar: secenekler,
                tahmin1: "", tahmin2: "",
                sonuc1HTML: "", sonuc2HTML: "",
                gizli1: true, gizli2: true
            };
        }

        let tur = oynananTurlar[index];
        
        for (let i = 0; i < 6; i++) {
            takimEtiketleri[i].innerText = tur.takimlar[i] || "-";
        }

        document.getElementById("tur-sayaci").innerText = (index + 1);
        
        const k1 = document.getElementById("sonuc1-kutusu");
        const k2 = document.getElementById("sonuc2-kutusu");

        if(tur.gizli1) { k1.classList.add("gizli"); } 
        else { k1.classList.remove("gizli"); k1.innerHTML = tur.sonuc1HTML; }

        if(tur.gizli2) { k2.classList.add("gizli"); } 
        else { k2.classList.remove("gizli"); k2.innerHTML = tur.sonuc2HTML; }

        if(isYapayZekaAktif) {
            inputs[1].disabled = true;
            sorgulaButonlari[1].disabled = true;
            inputs[1].placeholder = tur.tahmin2 ? "YZ Hamlesini Yaptı." : "YZ Hamle Bekliyor...";
        } else {
            let acikMi = (index === oynananTurlar.length - 1);
            inputs[1].disabled = !acikMi;
            sorgulaButonlari[1].disabled = !acikMi;
            inputs[1].placeholder = acikMi ? "Oyuncu adı yazın..." : "Geçmiş Tur (Kapalı)";
        }
        
        let acikMi = (index === oynananTurlar.length - 1);
        inputs[0].disabled = !acikMi;
        sorgulaButonlari[0].disabled = !acikMi;
        inputs[0].placeholder = acikMi ? "Oyuncu adı yazın..." : "Geçmiş Tur (Kapalı)";
        inputs[0].value = "";
        if(!isYapayZekaAktif) inputs[1].value = "";

        oncekiTurButonu.classList.toggle("gizli", index === 0);
        turBitirButonu.innerText = (index === maxTur - 1) ? "Müsabakayı Bitir 🏆" : "Sıradaki Tur ➔";
    }

    function puanAnimasyonuOlustur(panelNo, kazanilanPuan) {
        const panel = document.querySelectorAll(".oyuncu-paneli")[panelNo - 1];
        const puanElementi = document.createElement("div");
        puanElementi.className = "puan-animasyon";
        puanElementi.innerText = `+${kazanilanPuan}`;
        puanElementi.style.left = "50%";
        puanElementi.style.top = "40%";
        panel.style.position = "relative";
        panel.appendChild(puanElementi);
        setTimeout(() => puanElementi.remove(), 1200);
    }

    function tahminKontrolEt(tahminEdilenIsim, panelNo, aiTetikledi = false) {
        if (!tahminEdilenIsim.trim() || aktifTurIndex !== oynananTurlar.length - 1) return;

        const kutu = document.getElementById(`sonuc${panelNo}-kutusu`);
        kutu.classList.remove("gizli");
        
        kutu.innerHTML = `
            <div class="sonuc-baslik-alani">
                <h4 id="sonuc${panelNo}-isim">...</h4>
                <button id="itiraz${panelNo}-butonu" class="itiraz-butonu">İTİRAZ ET (VAR)</button>
            </div>
            <p id="sonuc${panelNo}-takimlar" class="oyuncu-takimlar"></p>
            <p id="sonuc${panelNo}-bilgi" class="oyuncu-bilgi"></p>
        `;

        const isimBaslik = document.getElementById(`sonuc${panelNo}-isim`);
        const takimlarMetin = document.getElementById(`sonuc${panelNo}-takimlar`);
        const bilgiMetin = document.getElementById(`sonuc${panelNo}-bilgi`);
        const itirazButonu = document.getElementById(`itiraz${panelNo}-butonu`);

        // YENİ: İTİRAZA BASILINCA MODALI AÇMA
        itirazButonu.onclick = () => {
            aktifItirazOyuncu = tahminEdilenIsim;
            aktifItirazPanelNo = panelNo;
            varOyuncuAdiMetni.innerText = tahminEdilenIsim.toUpperCase();
            
            // O an ekranda olan 6 seçeneği çekip checkboxları oluştur
            let ekrandakiSecenekler = oynananTurlar[aktifTurIndex].takimlar;
            varSeceneklerAlani.innerHTML = ""; // Temizle
            
            ekrandakiSecenekler.forEach(secenek => {
                let div = document.createElement("div");
                div.className = "var-checkbox-satiri";
                div.innerHTML = `
                    <input type="checkbox" value="${secenek}" id="chk-${secenek}">
                    <label for="chk-${secenek}">${secenek}</label>
                `;
                varSeceneklerAlani.appendChild(div);
            });
            
            varModal.classList.remove("gizli");
        };

        const bulunanOyuncu = futbolcularVerisi.find(o => o.isim.toLowerCase() === tahminEdilenIsim.toLowerCase());
        let tur = oynananTurlar[aktifTurIndex];
        tur["tahmin" + panelNo] = tahminEdilenIsim.toUpperCase(); 

        if (bulunanOyuncu) {
            let eslesenler = tur.takimlar.filter(secenek =>
                bulunanOyuncu.takimlar.includes(secenek) || bulunanOyuncu.uyruk === secenek
            );

            isimBaslik.innerText = bulunanOyuncu.isim.toUpperCase();
            const uyrukBilgisi = bulunanOyuncu.uyruk ? ` | Uyruk: ${bulunanOyuncu.uyruk}` : "";
            takimlarMetin.innerText = `Oynadığı Takımlar: ${bulunanOyuncu.takimlar.join(", ")}${uyrukBilgisi}`;
            bilgiMetin.innerText = bulunanOyuncu.bilgi || "Detaylı istatistikler eklenecek...";

            if (eslesenler.length > 0) {
                isimBaslik.className = "isim-yesil";
                itirazButonu.classList.add("gizli");
                puanAnimasyonuOlustur(panelNo, eslesenler.length);
                if (panelNo === 1) { guncelSkor1 += eslesenler.length; document.getElementById("skor1").innerText = guncelSkor1; } 
                else { guncelSkor2 += eslesenler.length; document.getElementById("skor2").innerText = guncelSkor2; }
            } else {
                isimBaslik.className = "isim-kirmizi";
                bilgiMetin.innerText = "Sistemde var ancak ekrandakilerle eşleşmiyor.";
            }
        } else {
            isimBaslik.innerText = tahminEdilenIsim.toUpperCase();
            isimBaslik.className = "isim-kirmizi";
            takimlarMetin.innerText = "";
            bilgiMetin.innerText = "Sistemde bulunamadı!";
        }
        
        if(!aiTetikledi) inputs[panelNo-1].value = "";

        tur["sonuc" + panelNo + "HTML"] = kutu.innerHTML;
        tur["gizli" + panelNo] = false;

        if(panelNo === 1 && isYapayZekaAktif && !aiTetikledi) {
            setTimeout(() => yapayZekaHamleYap(aktifTurIndex), 1000);
        }
    }

    // YENİ: MODAL BUTONLARI İŞLEVLERİ (Gönder ve İptal)
    varIptalBtn.addEventListener("click", () => {
        varModal.classList.add("gizli");
    });

    varGonderBtn.addEventListener("click", () => {
        let secilenCheckboxlar = document.querySelectorAll("#var-secenekler-alani input[type='checkbox']:checked");
        let secilenTakimlar = Array.from(secilenCheckboxlar).map(cb => cb.value);
        
        if (secilenTakimlar.length === 0) {
            alert("Lütfen oyuncunun oynadığını düşündüğünüz en az bir takım veya ülke seçin!");
            return;
        }
        
        let bugun = new Date().toLocaleDateString('tr-TR');
        let varMi = varListesi.some(kayit => typeof kayit === 'object' && kayit.isim === aktifItirazOyuncu);
        let eskiFormattaVarMi = varListesi.some(kayit => typeof kayit === 'string' && kayit === aktifItirazOyuncu);
        
        if(!varMi && !eskiFormattaVarMi) {
            varListesi.push({ isim: aktifItirazOyuncu, tarih: bugun, takimlar: secilenTakimlar });
            localStorage.setItem("varKayitlari", JSON.stringify(varListesi));
        }

        const asilItirazButonu = document.getElementById(`itiraz${aktifItirazPanelNo}-butonu`);
        if(asilItirazButonu) {
            asilItirazButonu.innerText = "VAR'A EKLENDİ ✔";
            asilItirazButonu.classList.add("itiraz-basarili");
            asilItirazButonu.disabled = true;
        }
        
        varModal.classList.add("gizli");
    });


    function yapayZekaHamleYap(turIndex) {
        if(turIndex !== aktifTurIndex) return; 
        
        let zorluk = document.getElementById("zorluk-modu").value;
        let basariIhtimali = zorluk === "kolay" ? 0.35 : (zorluk === "orta" ? 0.65 : 0.90);
        
        inputs[1].value = "Düşünüyor...";
        
        setTimeout(() => {
            if(turIndex !== aktifTurIndex) return; 
            
            let tur = oynananTurlar[turIndex];
            let eslesenOyuncular = futbolcularVerisi.filter(o => {
                return tur.takimlar.some(secenek => o.takimlar.includes(secenek) || o.uyruk === secenek);
            });

            if(Math.random() < basariIhtimali && eslesenOyuncular.length > 0) {
                let secilen = eslesenOyuncular[Math.floor(Math.random() * eslesenOyuncular.length)];
                tahminKontrolEt(secilen.isim, 2, true);
            } else {
                if(futbolcularVerisi.length > 0) {
                    let rastgeleYanlis = futbolcularVerisi[Math.floor(Math.random() * futbolcularVerisi.length)];
                    tahminKontrolEt(rastgeleYanlis.isim, 2, true);
                } else {
                    tahminKontrolEt("YZ Hata", 2, true);
                }
            }
            if(isYapayZekaAktif) inputs[1].placeholder = "YZ Hamlesini Yaptı.";
        }, 1500);
    }

    if(sorgulaButonlari.length >= 2) {
        sorgulaButonlari[0].addEventListener("click", () => tahminKontrolEt(inputs[0].value, 1));
        sorgulaButonlari[1].addEventListener("click", () => tahminKontrolEt(inputs[1].value, 2));
    }
    inputs[0].addEventListener("keypress", (e) => { if (e.key === "Enter") sorgulaButonlari[0].click(); });
    inputs[1].addEventListener("keypress", (e) => { if (e.key === "Enter") sorgulaButonlari[1].click(); });

    oncekiTurButonu.addEventListener("click", () => {
        if(aktifTurIndex > 0) {
            aktifTurIndex--;
            turuEkranaBas(aktifTurIndex);
        }
    });

    turBitirButonu.addEventListener("click", () => {
        if (aktifTurIndex < maxTur - 1) {
            aktifTurIndex++;
            turuEkranaBas(aktifTurIndex);
        } else {
            oyunSonuEkraniniGoster();
        }
    });

    function oyunSonuEkraniniGoster() {
        oyunEkrani.classList.add("gizli");
        oyunSonuEkrani.classList.remove("gizli");

        const isim1 = document.getElementById("panel1-isim").innerText;
        const isim2 = document.getElementById("panel2-isim").innerText;

        document.getElementById("sonuc-isim1").innerText = isim1;
        document.getElementById("sonuc-isim2").innerText = isim2;
        document.getElementById("sonuc-skor1").innerText = guncelSkor1;
        document.getElementById("sonuc-skor2").innerText = guncelSkor2;

        const baslik = document.getElementById("kazanan-baslik");
        const altMetin = document.getElementById("kazanan-alt-metin");

        if (guncelSkor1 > guncelSkor2) {
            baslik.innerText = `🏆 ${isim1.toUpperCase()} KAZANDI!`;
            baslik.style.background = "linear-gradient(90deg, #22c55e, #16a34a)";
            baslik.style.webkitTextFillColor = "white";
            altMetin.innerText = "Futbol zekanı herkese kanıtladın, harika bir maçtı!";
        } else if (guncelSkor2 > guncelSkor1) {
            baslik.innerText = `🏆 ${isim2.toUpperCase()} KAZANDI!`;
            baslik.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
            baslik.style.webkitTextFillColor = "white";
            if (isYapayZekaAktif) altMetin.innerText = "Bu seferlik şansın yaver gitmedi, bir dahakine!";
            else altMetin.innerText = "Rakibin bugün çok formdaydı, harika yarıştı!";
        } else {
            baslik.innerText = "🤝 DOSTLUK KAZANDI!";
            baslik.style.background = "linear-gradient(90deg, #3b82f6, #8b5cf6)";
            baslik.style.webkitTextFillColor = "white";
            altMetin.innerText = "İki taraf da tam bir futbol profesörü! Harika çekişme.";
        }

        const ozetAlani = document.getElementById("tur-ozetleri");
        ozetAlani.innerHTML = "";
        oynananTurlar.forEach((tur, i) => {
            ozetAlani.innerHTML += `
                <div class="ozet-satiri">
                    <div class="ozet-tur">Tur ${i+1}: ${tur.takimlar.join(", ")}</div>
                    <div class="ozet-tahminler">
                        <span><strong>${isim1}:</strong> ${tur.tahmin1 || "-"}</span>
                        <span><strong>${isim2}:</strong> ${tur.tahmin2 || "-"}</span>
                    </div>
                </div>
            `;
        });
    }

    // ==========================================
    // 3-2-1 HIZLI MOD 
    // ==========================================
    const sayacAlani = document.getElementById("sayac-alani");
    const ikiliKartAlani = document.getElementById("ikili-kart-alani");
    const kart1 = document.getElementById("kart-1");
    const kart2 = document.getElementById("kart-2");
    const siradakiButonu = document.getElementById("siradaki-butonu");
    const oncekiButonu = document.getElementById("onceki-butonu");
    const menuyeDonButonu = document.getElementById("menuye-don-butonu");
    
    let hizliMacGecmisi = [];
    let hizliMacIndex = -1;
    let sayacCalisiyor = false;

    hizliModGecisButonu.addEventListener("click", () => {
        anaMenu.classList.add("gizli");
        ucIkiBirEkrani.classList.remove("gizli");
    });

    menuyeDonButonu.addEventListener("click", () => { location.reload(); });

    function yeniHizliMacUret() {
        if(tumTakimlar.length < 2) return ["Bekleniyor", "Bekleniyor"];
        const mod = document.getElementById("hizli-kategori").value;
        let secim1, secim2;
        let gercekMod = mod === "karma" ? (Math.random() > 0.5 ? "takim-takim" : "takim-ulke") : mod;

        if(gercekMod === "takim-takim") {
            let takimlar = rastgeleSecimliDizi(tumTakimlar, gecerliElitTakimlar, 2);
            secim1 = takimlar[0]; secim2 = takimlar[1] || takimlar[0];
        } else {
            secim1 = rastgeleSecimliDizi(tumTakimlar, gecerliElitTakimlar, 1)[0];
            secim2 = rastgeleSecimliDizi(tumUlkeler, tumUlkeler, 1)[0];
        }
        return [secim1, secim2];
    }

    function sayaciBaslatVeGoster(ileriMi) {
        if(sayacCalisiyor) return;
        sayacCalisiyor = true;
        
        ikiliKartAlani.classList.add("gizli");
        sayacAlani.classList.remove("gizli");
        
        let sayi = 3;
        sayacAlani.innerText = sayi;
        sayacAlani.style.color = "#ef4444";

        const sayici = setInterval(() => {
            sayi--;
            if (sayi > 0) {
                sayacAlani.innerText = sayi;
                if(sayi === 2) sayacAlani.style.color = "#eab308";
                if(sayi === 1) sayacAlani.style.color = "#22c55e";
            } else {
                clearInterval(sayici);
                sayacAlani.classList.add("gizli");
                
                if(ileriMi) {
                    hizliMacGecmisi.push(yeniHizliMacUret());
                    hizliMacIndex++;
                }
                
                kart1.innerText = hizliMacGecmisi[hizliMacIndex][0];
                kart2.innerText = hizliMacGecmisi[hizliMacIndex][1];
                
                ikiliKartAlani.classList.remove("gizli");
                oncekiButonu.classList.toggle("gizli", hizliMacIndex === 0);
                sayacCalisiyor = false;
            }
        }, 800);
    }

    siradakiButonu.addEventListener("click", () => {
        if(hizliMacIndex < hizliMacGecmisi.length - 1 && hizliMacIndex !== -1) {
            hizliMacIndex++;
            kart1.innerText = hizliMacGecmisi[hizliMacIndex][0];
            kart2.innerText = hizliMacGecmisi[hizliMacIndex][1];
            oncekiButonu.classList.remove("gizli");
        } else sayaciBaslatVeGoster(true);
    });

    oncekiButonu.addEventListener("click", () => {
        if(hizliMacIndex > 0 && !sayacCalisiyor) {
            hizliMacIndex--;
            kart1.innerText = hizliMacGecmisi[hizliMacIndex][0];
            kart2.innerText = hizliMacGecmisi[hizliMacIndex][1];
            if(hizliMacIndex === 0) oncekiButonu.classList.add("gizli");
        }
    });
});