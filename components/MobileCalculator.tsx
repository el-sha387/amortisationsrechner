"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { T, Lang } from "@/lib/i18n";

interface SessionTyp { id: string; name: string; nameEn: string; dauerMin: number; preisNetto: number; }
interface Paket { id: "starter" | "pro"; name: string; twinsJahr: number; kostenProTwin: number; jahreslizenz: number; }
interface Annahmen { raumQm: number; iscoJahr: number; arbeitszeitPuffer: number; lohnNebenkosten: number; vollzeitStunden: number; }

const SESSION_TYPEN: SessionTyp[] = [
  { id: "helm",      name: "Helmberatung",       nameEn: "Helmet Consultation", dauerMin: 60,  preisNetto: 167.23 },
  { id: "addon",     name: "Aero Add-On",         nameEn: "Aero Add-On",         dauerMin: 30,  preisNetto: 83.19  },
  { id: "aero",      name: "Aero Fit Potential",  nameEn: "Aero Fit Potential",  dauerMin: 60,  preisNetto: 167.23 },
  { id: "windkanal", name: "Digitaler Windkanal", nameEn: "Digital Wind Tunnel", dauerMin: 150, preisNetto: 411.76 },
];
const PAKETE: Paket[] = [
  { id: "starter", name: "Starter", twinsJahr: 50,  kostenProTwin: 50, jahreslizenz: 2500 },
  { id: "pro",     name: "PRO",     twinsJahr: 100, kostenProTwin: 35, jahreslizenz: 3500 },
];
const DEFAULT_ANNAHMEN: Annahmen = { raumQm: 10, iscoJahr: 348, arbeitszeitPuffer: 15, lohnNebenkosten: 20, vollzeitStunden: 172 };
const DEFAULT_MENGEN: Record<string, number> = { helm: 2, addon: 2, aero: 2, windkanal: 2 };
const GOLD = "#F5A800";
const BLACK = "#0d0d0d";
const TOTAL_SCREENS = 5;

function berechne(mengen: Record<string, number>, paket: Paket, gehalt: number, raumkosten: number, a: Annahmen) {
  const sessionsMonat = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id], 0);
  const einnahmen     = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id] * t.preisNetto, 0);
  const sessionsJahr  = sessionsMonat * 12;
  let effektivPaket = paket;
  let autoUpgrade = false;
  if (paket.id === "starter" && sessionsJahr > 50) { effektivPaket = PAKETE[1]; autoUpgrade = true; }
  const lizenzkosten   = sessionsMonat * effektivPaket.kostenProTwin;
  const totalDauerMin  = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id] * t.dauerMin, 0);
  const stundenGesamt  = sessionsMonat > 0 ? (totalDauerMin + sessionsMonat * a.arbeitszeitPuffer) / 60 : 0;
  const personalkosten = gehalt * (1 + a.lohnNebenkosten / 100) * stundenGesamt / a.vollzeitStunden;
  const fixKosten      = raumkosten * a.raumQm + a.iscoJahr / 12;
  const ausgaben       = lizenzkosten + personalkosten + fixKosten;
  const ueberschuss    = einnahmen - ausgaben;
  const umsatzProSession = sessionsMonat > 0 ? einnahmen / sessionsMonat : 0;
  const margeProSession  = umsatzProSession - effektivPaket.kostenProTwin;
  const twinsUeber       = sessionsJahr - paket.twinsJahr;
  const sparenMitPro     = paket.id === "starter" && sessionsJahr <= 50
    ? Math.max(0, sessionsJahr * (50 - 35) - (3500 - 2500)) : 0;
  const breakEvenSessions = margeProSession > 0 ? Math.ceil(fixKosten / margeProSession) : null;
  return { sessionsMonat, einnahmen, lizenzkosten, personalkosten, fixKosten,
           ausgaben, ueberschuss, umsatzProSession, margeProSession,
           sessionsJahr, twinsUeber, sparenMitPro, jahresgewinn: ueberschuss * 12,
           effektivPaket, autoUpgrade, breakEvenSessions };
}

function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

async function generateAndSharePDF(
  ergebnis: ReturnType<typeof berechne>, paket: Paket,
  gehalt: number, raumkosten: number, kundenName: string,
  lang: Lang, annahmen: Annahmen,
) {
  const t = T[lang];
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const GOLD_RGB: [number,number,number] = [245,168,0];
  const BLACK_RGB: [number,number,number] = [13,13,13];
  const GRAY_RGB: [number,number,number] = [107,114,128];
  const W = 210; const M = 18; const CW = W - M * 2;
  let y = M;

  // ── Gold-Header (nur AiRO + Titel) ──
  doc.setFillColor(...GOLD_RGB); doc.rect(0,0,W,22,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...BLACK_RGB);
  doc.text("AiRO", M, 14);
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,60);
  doc.text(t.pdfTitel, M+14, 14);
  y = 26;

  // ── Logo rechts oben ──
  const logoW = 38; const logoH = 13; const logoX = W-M-logoW; const logoY = y+1;
  try {
    const logoImg = new window.Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((res,rej) => { logoImg.onload=()=>res(); logoImg.onerror=()=>rej(); logoImg.src="/gebioMized-logo.png"; });
    const cv = document.createElement("canvas");
    cv.width=logoImg.naturalWidth; cv.height=logoImg.naturalHeight;
    cv.getContext("2d")!.drawImage(logoImg,0,0);
    doc.addImage(cv.toDataURL("image/png"),"PNG",logoX,logoY,logoW,logoH);
  } catch { /* Logo nicht ladbar */ }

  // ── Adresse unter dem Logo ──
  const adresse = ["SnM gebioMized GmbH","Wilhelm-Schickard-Str. 12, 48149 Münster","www.gebiomized.de · info@gebiomized.de"];
  doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
  adresse.forEach((line,i) => doc.text(line, W-M, logoY+logoH+3+i*4.5, {align:"right"}));

  // ── Kundenname + Datum links ──
  const adresseBottom = logoY+logoH+3+adresse.length*4.5+3;
  if (kundenName) {
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(...BLACK_RGB);
    doc.text(kundenName, M, y+6);
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
    doc.text(t.pdfUntertitel, M, y+13);
  }
  const now = new Date();
  const dateStr = now.toLocaleDateString(lang==="de"?"de-DE":"en-GB", {day:"2-digit",month:"long",year:"numeric"});
  doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
  doc.text(`${t.pdfDatum}: ${dateStr}`, M, kundenName ? y+20 : y+6);

  y = adresseBottom;
  doc.setDrawColor(...GOLD_RGB); doc.setLineWidth(0.5); doc.line(M,y,W-M,y); y+=8;

  doc.setFillColor(...BLACK_RGB); doc.roundedRect(M,y,CW,28,3,3,"F");
  doc.setTextColor(...GOLD_RGB); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text(t.jahresgewinn.toUpperCase(), M+6, y+8);
  doc.setFontSize(24); doc.text(`${fmt(ergebnis.jahresgewinn)} €`, M+6, y+21);
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(200,200,200);
  doc.text(`${fmt(ergebnis.ueberschuss)} € / ${lang==="de"?"Monat":"month"} · ${ergebnis.sessionsMonat} Sessions`, W-M-6, y+21, {align:"right"});
  y+=36;

  const col = CW/3-3;
  const cols3 = [M, M+col+4.5, M+(col+4.5)*2];
  const metrikDaten = [
    { title: t.margeSession,    val: `${fmt(ergebnis.margeProSession,0)} €`, sub: t.nachLizenz },
    { title: t.kostenGedecktAb, val: ergebnis.breakEvenSessions!==null?`${ergebnis.breakEvenSessions} / Mo.`:"—", sub: t.breakEven },
    { title: t.lizenzKostet,    val: `${ergebnis.effektivPaket.kostenProTwin} €`, sub: t.proTwin },
  ];
  metrikDaten.forEach((m,i) => {
    doc.setFillColor(245,245,245); doc.roundedRect(cols3[i],y,col,22,2,2,"F");
    doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
    doc.text(m.title.toUpperCase(), cols3[i]+4, y+6);
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(...BLACK_RGB);
    doc.text(m.val, cols3[i]+4, y+14);
    doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
    doc.text(m.sub, cols3[i]+4, y+19);
  });
  y+=28;

  function sectionTitle(title: string) {
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...GOLD_RGB);
    doc.text(title.toUpperCase(), M, y);
    doc.setDrawColor(220,220,220); doc.setLineWidth(0.2); doc.line(M,y+1,W-M,y+1); y+=6;
  }
  function tableRow(label: string, value: string, bold=false, goldVal=false) {
    doc.setFontSize(9); doc.setFont("helvetica", bold?"bold":"normal");
    doc.setTextColor(...(bold?BLACK_RGB:GRAY_RGB)); doc.text(label,M,y);
    if (goldVal) { doc.setTextColor(...GOLD_RGB); } else { doc.setTextColor(...BLACK_RGB); }
    doc.setFont("helvetica", bold?"bold":"normal");
    doc.text(value, W-M, y, {align:"right"});
    doc.setDrawColor(235,235,235); doc.setLineWidth(0.1); doc.line(M,y+1.5,W-M,y+1.5); y+=7;
  }

  sectionTitle(t.pdfKosten);
  tableRow(t.airoLizenz(ergebnis.sessionsMonat, ergebnis.effektivPaket.kostenProTwin), `${fmt(ergebnis.lizenzkosten)} €`, false, true);
  tableRow(t.personal, `${fmt(ergebnis.personalkosten)} €`);
  tableRow(t.raumkosten, `${fmt(raumkosten*annahmen.raumQm)} €`);
  tableRow(t.isco, `${fmt(annahmen.iscoJahr/12)} €`);
  tableRow(lang==="de"?"Gesamt Kosten":"Total costs", `${fmt(ergebnis.ausgaben)} €`, true);
  y+=2;
  sectionTitle(t.pdfErgebnis);
  tableRow(lang==="de"?"Einnahmen / Monat":"Revenue / month", `${fmt(ergebnis.einnahmen)} €`);
  tableRow(lang==="de"?"Überschuss / Monat":"Surplus / month", `${fmt(ergebnis.ueberschuss)} €`, true, ergebnis.ueberschuss>0);
  tableRow(t.jahresgewinn, `${fmt(ergebnis.jahresgewinn)} €`, true, ergebnis.jahresgewinn>0);
  y+=2;
  sectionTitle(lang==="de"?"Jahresübersicht":"Annual Overview");
  const jLabels=[t.einnahmenJahr,t.kostenJahr,t.gewinnJahr];
  const jVals=[`${fmt(ergebnis.einnahmen*12)} €`,`${fmt(ergebnis.ausgaben*12)} €`,`${fmt(ergebnis.jahresgewinn)} €`];
  cols3.forEach((x,i) => {
    if (i===2) { doc.setFillColor(...BLACK_RGB); } else { doc.setFillColor(245,245,245); }
    doc.roundedRect(x,y,CW/3-3,18,2,2,"F");
    doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
    doc.text(jLabels[i].toUpperCase(), x+3, y+6);
    doc.setFontSize(11); doc.setFont("helvetica","bold");
    if (i===2) { doc.setTextColor(...GOLD_RGB); } else { doc.setTextColor(...BLACK_RGB); }
    doc.text(jVals[i], x+3, y+14);
  });
  y+=24;

  doc.setDrawColor(...GOLD_RGB); doc.setLineWidth(0.3); doc.line(M,y,W-M,y); y+=4;
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY_RGB);
  doc.text(t.pdfHinweis, M, y); doc.text("gebioMized.com", W-M, y, {align:"right"});

  const safeName = kundenName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g,"").trim()||"Studio";
  const fileName = `AIRO_gebioMized_Rentabilitaet_fuer_${safeName}.pdf`;
  const pdfBlob  = doc.output("blob");
  const pdfFile  = new File([pdfBlob], fileName, {type:"application/pdf"});
  if (navigator.canShare && navigator.canShare({files:[pdfFile]})) {
    await navigator.share({files:[pdfFile], title:fileName});
  } else {
    const url=URL.createObjectURL(pdfBlob);
    const a=document.createElement("a");
    a.href=url; a.download=fileName; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} className="rounded-full transition-all duration-300" style={{
          width: i===current?22:7, height:7,
          background: i===current?GOLD:"rgba(255,255,255,0.25)",
        }}/>
      ))}
    </div>
  );
}

export default function MobileCalculator() {
  const [screen, setScreen]         = useState(0);
  const [isTablet, setIsTablet]     = useState(false);
  const [lang, setLang]             = useState<Lang>("de");
  const [paketId, setPaketId]       = useState<"starter"|"pro">("starter");
  const [mengen, setMengen]         = useState<Record<string,number>>(DEFAULT_MENGEN);
  const [gehalt, setGehalt]         = useState(2600);
  const [raumkosten, setRaumkosten] = useState(14);
  const [annahmen]                  = useState<Annahmen>(DEFAULT_ANNAHMEN);
  const [kundenName, setKundenName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(()=>{
    function check() { setIsTablet(window.innerWidth>=640); }
    check(); window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);

  const t = T[lang];
  const paket = PAKETE.find(p=>p.id===paketId)!;
  const ergebnis = useMemo(
    ()=>berechne(mengen,paket,gehalt,raumkosten,annahmen),
    [mengen,paket,gehalt,raumkosten,annahmen]
  );
  const positiv = ergebnis.ueberschuss>0;

  function navigate(delta: 1|-1) {
    setScreen(s=>Math.max(0,Math.min(TOTAL_SCREENS-1,s+delta)));
  }
  async function handlePDF() {
    setPdfLoading(true);
    try { await generateAndSharePDF(ergebnis,paket,gehalt,raumkosten,kundenName,lang,annahmen); }
    catch(e){ console.error(e); }
    finally { setPdfLoading(false); }
  }

  const px  = isTablet?"px-10":"px-5";
  const btn = isTablet?"py-5 text-lg":"py-4 text-base";
  const isStart = screen===0;
  const isLast  = screen===TOTAL_SCREENS-1;

  function renderContent() {
    switch(screen) {

      case 0: return (
        <div className={`flex flex-col items-center justify-between h-full text-center ${px}`}
          style={{paddingTop:isTablet?60:40,paddingBottom:20}}>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <Image src="/airo-logo.png" alt="AiRO" width={isTablet?180:140} height={isTablet?90:70}
              style={{objectFit:"contain"}}/>
            <div>
              <h1 className={`font-bold text-white leading-tight ${isTablet?"text-4xl":"text-3xl"}`}>
                {t.splashTitle}
              </h1>
              <p className="text-white/60 mt-3 leading-relaxed text-sm max-w-xs mx-auto">{t.splashSub}</p>
            </div>
            <div className="flex rounded-2xl overflow-hidden border border-white/20">
              {(["de","en"] as Lang[]).map(l=>(
                <button key={l} onClick={()=>setLang(l)}
                  className="px-8 py-3 text-sm font-bold transition-all"
                  style={{background:lang===l?GOLD:"transparent",color:lang===l?BLACK:"rgba(255,255,255,0.5)"}}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="text-white/25 text-xs">{t.poweredBy}</div>
        </div>
      );

      case 1: return (
        <div className={`${px} py-3 space-y-3`}>
          <div className="rounded-2xl px-5 py-4" style={{background:GOLD}}>
            <div className="text-black/60 text-xs font-bold uppercase tracking-wide mb-0.5">{t.paketTitle}</div>
            <div className="font-black text-black leading-tight" style={{fontSize:isTablet?52:42}}>{paket.name}</div>
            <div className="text-black/60 text-sm mt-1">{paket.kostenProTwin} € {t.proTwin} · {paket.twinsJahr} {t.twinsYear}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PAKETE.map(p=>(
              <button key={p.id} onClick={()=>setPaketId(p.id)}
                className="rounded-2xl border-2 p-4 text-left transition-all active:scale-95"
                style={{borderColor:paketId===p.id?GOLD:"rgba(255,255,255,0.15)",background:paketId===p.id?"rgba(245,168,0,0.15)":"rgba(255,255,255,0.06)"}}>
                <div className="font-black text-lg mb-1" style={{color:paketId===p.id?GOLD:"white"}}>{p.name}</div>
                <div className="font-black text-2xl" style={{color:paketId===p.id?GOLD:"rgba(255,255,255,0.6)"}}>{p.kostenProTwin} €</div>
                <div className="text-xs mt-1 text-white/40">{t.proTwin} · {p.twinsJahr}/{lang==="de"?"Jahr":"year"}</div>
              </button>
            ))}
          </div>
          <div className="rounded-2xl p-4" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div className="text-xs font-bold uppercase tracking-wide mb-3 text-white/40">{t.margePerSession}</div>
            {SESSION_TYPEN.map(t2=>(
              <div key={t2.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/70">{lang==="de"?t2.name:t2.nameEn}</span>
                <span className="font-bold text-sm" style={{color:GOLD}}>{fmt(t2.preisNetto-paket.kostenProTwin,0)} €</span>
              </div>
            ))}
          </div>
        </div>
      );

      case 2: return (
        <div className={`${px} py-3 space-y-3`}>
          <div className="rounded-2xl px-5 py-4" style={{background:GOLD}}>
            <div className="text-black/60 text-xs font-bold uppercase tracking-wide mb-0.5">{t.sessionsTitle}</div>
            <div className="font-black text-black leading-tight" style={{fontSize:isTablet?52:42}}>{ergebnis.sessionsMonat}</div>
            <div className="text-black/60 text-sm mt-1">
              {ergebnis.sessionsJahr} {t.twins} · {t.einnahmen} {fmt(ergebnis.einnahmen)} € {t.monat}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div className="text-xs font-bold uppercase tracking-wide px-4 pt-3 pb-2 text-white/40">{t.anzahlProTyp}</div>
            {SESSION_TYPEN.map(t2=>(
              <div key={t2.id} className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{lang==="de"?t2.name:t2.nameEn}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {t2.dauerMin} Min · <span style={{color:GOLD}}>{fmt(t2.preisNetto-paket.kostenProTwin,0)} €</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-none">
                  <button onClick={()=>setMengen(prev=>({...prev,[t2.id]:Math.max(0,prev[t2.id]-1)}))}
                    className="w-9 h-9 rounded-xl font-bold text-xl flex items-center justify-center active:scale-90"
                    style={{background:"rgba(255,255,255,0.1)",color:"white"}}>−</button>
                  <span className="font-black text-xl w-6 text-center" style={{color:GOLD}}>{mengen[t2.id]}</span>
                  <button onClick={()=>setMengen(prev=>({...prev,[t2.id]:prev[t2.id]+1}))}
                    className="w-9 h-9 rounded-xl font-bold text-xl flex items-center justify-center active:scale-90"
                    style={{background:GOLD,color:BLACK}}>+</button>
                </div>
              </div>
            ))}
          </div>
          {ergebnis.autoUpgrade && (
            <div className="rounded-xl px-4 py-3 text-xs font-semibold" style={{background:"rgba(245,168,0,0.15)",color:GOLD}}>
              💡 {t.autoProHinweis}
            </div>
          )}
          {ergebnis.twinsUeber>0 && paketId==="pro" && (
            <div className="rounded-xl px-4 py-3 text-xs font-semibold" style={{background:"rgba(239,68,68,0.15)",color:"#fca5a5"}}>
              {t.ueberLimit(ergebnis.twinsUeber)}
            </div>
          )}
          {ergebnis.sparenMitPro>0 && (
            <div className="rounded-xl px-4 py-3 text-xs font-semibold" style={{background:"rgba(245,168,0,0.15)",color:GOLD}}>
              {t.sparenMitPro(fmt(ergebnis.sparenMitPro))}
            </div>
          )}
        </div>
      );

      case 3: return (
        <div className={`${px} py-3 space-y-3`}>
          <div className="rounded-2xl px-5 py-4" style={{background:GOLD}}>
            <div className="text-black/60 text-xs font-bold uppercase tracking-wide mb-0.5">{t.kostenTitle}</div>
            <div className="font-black text-black leading-tight" style={{fontSize:isTablet?48:38}}>{fmt(ergebnis.ausgaben)} €</div>
            <div className="text-black/60 text-xs mt-1">{t.kostenSub(fmt(ergebnis.lizenzkosten),fmt(ergebnis.personalkosten))}</div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-white/40">{t.gehalt}</span>
              <span className="font-black text-lg" style={{color:GOLD}}>{gehalt.toLocaleString("de-DE")} €</span>
            </div>
            <input type="range" min={2000} max={4000} step={100} value={gehalt}
              onChange={e=>setGehalt(Number(e.target.value))} className="w-full"/>
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>2.000 €</span><span>4.000 €</span>
            </div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-white/40">{t.raummiete}</span>
              <span className="font-black text-lg" style={{color:GOLD}}>{raumkosten} €</span>
            </div>
            <input type="range" min={8} max={25} step={1} value={raumkosten}
              onChange={e=>setRaumkosten(Number(e.target.value))} className="w-full"/>
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>8 €</span><span>{t.flaeche(annahmen.raumQm)}</span><span>25 €</span>
            </div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div className="text-xs font-bold uppercase tracking-wide text-white/40 mb-2">{t.aufschluesselung}</div>
            {[
              {label:t.airoLizenz(ergebnis.sessionsMonat,ergebnis.effektivPaket.kostenProTwin),val:ergebnis.lizenzkosten,gold:true},
              {label:t.personal,   val:ergebnis.personalkosten},
              {label:t.raumkosten, val:raumkosten*annahmen.raumQm},
              {label:t.isco,       val:annahmen.iscoJahr/12},
            ].map(({label,val,gold})=>(
              <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className="text-white/50">{label}</span>
                <span className="font-semibold" style={{color:gold?GOLD:"white"}}>{fmt(val)} €</span>
              </div>
            ))}
          </div>
        </div>
      );

      case 4: return (
        <div className={`${px} py-3 space-y-3`}>
          <div className="rounded-2xl px-5 py-4" style={{background:positiv?GOLD:"#ef4444"}}>
            <div className="text-black/60 text-xs font-bold uppercase tracking-wide mb-0.5">{t.jahresgewinn}</div>
            <div className="font-black text-black leading-tight" style={{fontSize:isTablet?48:40}}>
              {positiv?"":"–"}{fmt(Math.abs(ergebnis.jahresgewinn))} €
            </div>
            <div className="text-black/60 text-xs mt-1">
              {t.proMonat(fmt(Math.abs(ergebnis.ueberschuss)),ergebnis.sessionsMonat)}
            </div>
            {!positiv && <div className="text-black/70 text-xs mt-1 font-semibold">{t.sessionsErhoehen}</div>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {label:t.margeSession,    value:`${fmt(ergebnis.margeProSession,0)} €`, sub:t.nachLizenz},
              {label:t.kostenGedecktAb, value:ergebnis.breakEvenSessions!==null?`${ergebnis.breakEvenSessions} / Mo.`:"—", sub:t.breakEven},
              {label:t.lizenzKostet,    value:`${ergebnis.effektivPaket.kostenProTwin} €`, sub:t.proTwin},
            ].map(({label,value,sub})=>(
              <div key={label} className="rounded-2xl p-3 text-center"
                style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>
                <div className="text-xs text-white/40 mb-1 leading-tight">{label}</div>
                <div className="font-black text-sm" style={{color:GOLD}}>{value}</div>
                <div className="text-xs text-white/30 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
          {ergebnis.autoUpgrade && (
            <div className="rounded-xl px-4 py-2 text-xs font-semibold" style={{background:"rgba(245,168,0,0.15)",color:GOLD}}>
              💡 {t.autoProHinweis}
            </div>
          )}
          <div className="rounded-2xl px-4 py-3" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div className="text-xs font-bold uppercase tracking-wide text-white/40 mb-2">{lang==="de"?"Kosten / Monat":"Costs / Month"}</div>
            {[
              {label:t.airoLizenz(ergebnis.sessionsMonat,ergebnis.effektivPaket.kostenProTwin),val:ergebnis.lizenzkosten,gold:true},
              {label:t.personal,val:ergebnis.personalkosten},
              {label:t.isco+" + "+t.raumkosten,val:ergebnis.fixKosten},
            ].map(({label,val,gold})=>(
              <div key={label} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                <span className="text-white/50">{label}</span>
                <span className="font-semibold" style={{color:gold?GOLD:"white"}}>{fmt(val)} €</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 mt-1">
              <span className="text-white">{lang==="de"?"Einnahmen":"Revenue"}</span>
              <span style={{color:GOLD}}>{fmt(ergebnis.einnahmen)} €</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {label:t.einnahmenJahr,val:`${fmt(ergebnis.einnahmen*12)} €`,gold:false},
              {label:t.kostenJahr,   val:`${fmt(ergebnis.ausgaben*12)} €`, gold:false},
              {label:t.gewinnJahr,   val:`${fmt(ergebnis.jahresgewinn)} €`,gold:true},
            ].map(({label,val,gold})=>(
              <div key={label} className="rounded-xl p-3 text-center" style={{background:"rgba(255,255,255,0.05)"}}>
                <div className="text-xs text-white/40 mb-1">{label}</div>
                <div className="font-black text-sm" style={{color:gold?GOLD:"white"}}>{val}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl px-4 py-3 space-y-2" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <input type="text" placeholder={t.pdfKundenname} value={kundenName}
              onChange={e=>setKundenName(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none"
              style={{background:"rgba(255,255,255,0.08)",color:"white",border:"1px solid rgba(255,255,255,0.15)"}}/>
            <button onClick={handlePDF} disabled={pdfLoading}
              className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{background:GOLD,color:BLACK,opacity:pdfLoading?0.7:1}}>
              {pdfLoading ? t.pdfErstellt : `📄 ${t.pdfButton}`}
            </button>
          </div>
        </div>
      );

      default: return null;
    }
  }

  return (
    <div className={`flex flex-col h-screen mx-auto ${isTablet?"max-w-2xl":"max-w-md"}`}
      style={{background:BLACK}}>

      {/* Header — nur Screens 1-4 */}
      {!isStart && (
        <div className={`flex-none ${px} pt-4 pb-3`} style={{background:BLACK}}>
          <div className="flex items-center justify-between mb-3">
            <Image src="/airo-logo.png" alt="AiRO" width={70} height={35} style={{objectFit:"contain"}}/>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-white/15">
                {(["de","en"] as Lang[]).map(l=>(
                  <button key={l} onClick={()=>setLang(l)}
                    className="px-2.5 py-1 text-xs font-bold transition-all"
                    style={{background:lang===l?GOLD:"transparent",color:lang===l?BLACK:"rgba(255,255,255,0.4)"}}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="rounded-xl px-2 py-1 text-xs font-bold"
                style={{background:"rgba(245,168,0,0.15)",color:GOLD}}>
                {paket.name} · {paket.kostenProTwin} €/Twin
              </div>
            </div>
          </div>
          <ProgressDots current={screen-1} total={TOTAL_SCREENS-1}/>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{background:BLACK}}>{renderContent()}</div>

      {/* Footer */}
      <div className={`flex-none ${px} pb-6 pt-3 flex gap-3`}
        style={{borderTop:isStart?"none":"1px solid rgba(255,255,255,0.06)",minHeight:isTablet?92:80}}>
        {isStart ? (
          <button onClick={()=>navigate(1)}
            className={`w-full rounded-2xl font-bold transition-all active:scale-95 ${btn}`}
            style={{background:GOLD,color:BLACK}}>
            {t.splashCta}
          </button>
        ) : (
          <div className="flex gap-3 w-full">
            <button onClick={()=>navigate(-1)}
              className={`flex-none px-5 rounded-2xl font-semibold transition-all active:scale-95 ${btn}`}
              style={{background:"rgba(255,255,255,0.08)",color:"white"}}>←</button>
            {isLast ? (
              <button onClick={()=>setScreen(0)}
                className={`flex-1 rounded-2xl font-bold transition-all active:scale-95 ${btn}`}
                style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)"}}>
                {t.neueBerechnung}
              </button>
            ) : (
              <button onClick={()=>navigate(1)}
                className={`flex-1 rounded-2xl font-bold transition-all active:scale-95 ${btn}`}
                style={{background:GOLD,color:BLACK}}>
                {lang==="de"?"Weiter →":"Next →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
