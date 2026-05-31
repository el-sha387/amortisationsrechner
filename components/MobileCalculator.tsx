"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";

// ─── Typen & Daten ────────────────────────────────────────────────────────────

interface SessionTyp {
  id: string; name: string; dauerMin: number; preisNetto: number;
}
interface Paket {
  id: "starter" | "pro"; name: string; twinsJahr: number;
  kostenProTwin: number; jahreslizenz: number;
}
interface Annahmen {
  raumQm: number; iscoJahr: number;
  arbeitszeitPuffer: number; lohnNebenkosten: number; vollzeitStunden: number;
}

const SESSION_TYPEN: SessionTyp[] = [
  { id: "helm",      name: "Helmberatung",         dauerMin: 60,  preisNetto: 167.23 },
  { id: "addon",     name: "Aero Add-On",           dauerMin: 30,  preisNetto: 83.19  },
  { id: "aero",      name: "Aero Fit Potential",    dauerMin: 60,  preisNetto: 167.23 },
  { id: "windkanal", name: "Digitaler Windkanal",   dauerMin: 150, preisNetto: 411.76 },
];

const PAKETE: Paket[] = [
  { id: "starter", name: "Starter", twinsJahr: 50,  kostenProTwin: 50, jahreslizenz: 2500 },
  { id: "pro",     name: "PRO",     twinsJahr: 100, kostenProTwin: 35, jahreslizenz: 3500 },
];

const DEFAULT_ANNAHMEN: Annahmen = {
  raumQm: 10, iscoJahr: 348, arbeitszeitPuffer: 15,
  lohnNebenkosten: 20, vollzeitStunden: 172,
};
const DEFAULT_MENGEN: Record<string, number> = { helm: 2, addon: 2, aero: 2, windkanal: 2 };

const GOLD  = "#F5A800";
const BLACK = "#0d0d0d";

// ─── Berechnung (Fix 3: Paket-Automatik) ─────────────────────────────────────

function berechne(
  mengen: Record<string, number>, paket: Paket,
  gehalt: number, raumkosten: number, a: Annahmen,
) {
  const sessionsMonat = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id], 0);
  const einnahmen     = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id] * t.preisNetto, 0);
  const sessionsJahr  = sessionsMonat * 12;

  // Fix 3: Effektiv-Paket ermitteln
  let effektivPaket = paket;
  let effektivHinweis: string | null = null;
  if (paket.id === "starter" && sessionsJahr > 50) {
    effektivPaket = PAKETE.find(p => p.id === "pro")!;
    effektivHinweis = "Kosten berechnet mit PRO (automatisch wegen Volumen)";
  } else if (paket.id === "pro" && sessionsJahr > 100) {
    effektivHinweis = "Über PRO-Limit — bitte Kontingent prüfen";
  }

  const lizenzkosten  = sessionsMonat * effektivPaket.kostenProTwin;
  const totalDauerMin = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id] * t.dauerMin, 0);
  const stundenGesamt = sessionsMonat > 0
    ? (totalDauerMin + sessionsMonat * a.arbeitszeitPuffer) / 60 : 0;
  const personalkosten = gehalt * (1 + a.lohnNebenkosten / 100) * stundenGesamt / a.vollzeitStunden;
  const fixKosten  = raumkosten * a.raumQm + a.iscoJahr / 12;
  const ausgaben   = lizenzkosten + personalkosten + fixKosten;
  const ueberschuss = einnahmen - ausgaben;
  const umsatzProSession = sessionsMonat > 0 ? einnahmen / sessionsMonat : 0;
  const margeProSession  = umsatzProSession - effektivPaket.kostenProTwin;
  const twinsUeber       = sessionsJahr - paket.twinsJahr;

  // sparenMitPro nur wenn Starter gewählt UND nach Wechsel tatsächlich günstiger
  const sparenMitPro = paket.id === "starter" && sessionsJahr <= 50
    ? Math.max(0, sessionsJahr * (PAKETE[0].kostenProTwin - PAKETE[1].kostenProTwin)
        - (PAKETE[1].jahreslizenz - PAKETE[0].jahreslizenz))
    : 0;

  // Break-even: ab wie vielen Sessions/Monat sind alle Fixkosten gedeckt
  const breakEvenSessions = margeProSession > 0
    ? Math.ceil(fixKosten / margeProSession)
    : null;

  return {
    sessionsMonat, einnahmen, lizenzkosten, personalkosten, fixKosten,
    ausgaben, ueberschuss, umsatzProSession, margeProSession,
    sessionsJahr, twinsUeber, sparenMitPro, jahresgewinn: ueberschuss * 12,
    effektivPaket, effektivHinweis, breakEvenSessions,
  };
}

function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300" style={{
          width: i === current ? 22 : 7, height: 7,
          background: i === current ? GOLD : "rgba(255,255,255,0.25)",
        }}/>
      ))}
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

const TOTAL_SCREENS = 5;

export default function MobileCalculator() {
  const [screen, setScreen]     = useState(0);
  const [isTablet, setIsTablet] = useState(false);
  const [paketId, setPaketId]   = useState<"starter" | "pro">("starter");
  const [mengen, setMengen]     = useState<Record<string, number>>(DEFAULT_MENGEN);
  const [gehalt, setGehalt]     = useState(2600);
  const [raumkosten, setRaumkosten] = useState(14);
  const [annahmen]              = useState<Annahmen>(DEFAULT_ANNAHMEN);

  useEffect(() => {
    function check() { setIsTablet(window.innerWidth >= 640); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const paket   = PAKETE.find(p => p.id === paketId)!;
  const ergebnis = useMemo(
    () => berechne(mengen, paket, gehalt, raumkosten, annahmen),
    [mengen, paket, gehalt, raumkosten, annahmen]
  );

  const positiv = ergebnis.ueberschuss > 0;

  function navigate(delta: 1 | -1) {
    setScreen(s => Math.max(0, Math.min(TOTAL_SCREENS - 1, s + delta)));
  }

  const sz = isTablet
    ? { h: "text-3xl", px: "px-10", gap: "space-y-8", btn: "py-5 text-lg" }
    : { h: "text-2xl", px: "px-5",  gap: "space-y-6", btn: "py-4 text-base" };

  const isStart  = screen === 0;
  const isLast   = screen === TOTAL_SCREENS - 1;
  const wizardStep = screen; // 1-4 on screens 1-4

  // ── Screen-Inhalte (nur Content, Header/Footer sind außen) ─────────────────

  function renderContent() {
    switch (screen) {

      // 0: Splash
      case 0:
        return (
          <div className={`flex flex-col items-center justify-center h-full text-center gap-8 ${sz.px}`}>
            <div className="space-y-4">
              <Image src="/airo-logo.png" alt="AiRO" width={isTablet ? 160 : 120} height={isTablet ? 80 : 60}
                style={{ objectFit: "contain", margin: "0 auto", filter: "none"}}/>
              <div>
                <h1 className={`font-bold text-white leading-tight mt-4 ${isTablet ? "text-4xl" : "text-3xl"}`}>
                  Rentabilitäts&shy;rechner
                </h1>
                <p className="text-white/60 mt-2 leading-relaxed text-sm">
                  Berechne in 3 Schritten, ob sich AiRO für dein Studio lohnt.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="h-px flex-1 bg-white/20"/>
              <span className="text-white/50 text-xs">powered by gebioMized</span>
              <div className="h-px flex-1 bg-white/20"/>
            </div>
          </div>
        );

      // 1: Paket-Auswahl
      case 1:
        return (
          <div className={`${sz.px} py-4 ${sz.gap}`}>
            <div>
              <h2 className={`font-bold text-white mb-1 ${sz.h}`}>AiRO Paket wählen</h2>
              <p className="text-white/50 text-sm">Die Lizenzkosten pro Twin bestimmen deine Marge.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {PAKETE.map(p => (
                <button key={p.id} onClick={() => setPaketId(p.id)}
                  className="rounded-2xl border-2 p-5 text-left transition-all active:scale-95"
                  style={{
                    borderColor: paketId === p.id ? GOLD : "rgba(255,255,255,0.15)",
                    background:  paketId === p.id ? GOLD : "rgba(255,255,255,0.06)",
                  }}>
                  <div className={`font-black text-xl mb-1 ${paketId === p.id ? "text-black" : "text-white"}`}>
                    {p.name}
                  </div>
                  <div className={`text-2xl font-black mb-2 ${paketId === p.id ? "text-black" : "text-white"}`}>
                    {p.kostenProTwin} €
                  </div>
                  <div className={`text-xs font-semibold ${paketId === p.id ? "text-black/60" : "text-white/50"}`}>
                    pro Twin
                  </div>
                  <div className={`text-xs mt-2 ${paketId === p.id ? "text-black/60" : "text-white/40"}`}>
                    {p.twinsJahr} Twins / Jahr<br/>
                    {p.jahreslizenz.toLocaleString("de-DE")} € / Jahr
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="text-xs font-bold uppercase tracking-wide mb-3 text-white/50">Margen-Übersicht</div>
              {SESSION_TYPEN.map(t => (
                <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white/70">{t.name}</span>
                  <span className="font-bold text-sm" style={{ color: GOLD }}>
                    {fmt(t.preisNetto - paket.kostenProTwin, 0)} € Marge
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      // 2: Session-Mix
      case 2:
        return (
          <div className={`${sz.px} py-4 space-y-3`}>
            <div>
              <h2 className={`font-bold text-white mb-1 ${sz.h}`}>Sessions / Monat</h2>
              <p className="text-white/50 text-sm">Wie viele Sessions planst du pro Typ?</p>
            </div>
            {SESSION_TYPEN.map(t => (
              <div key={t.id} className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{t.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {t.dauerMin} Min · {fmt(t.preisNetto, 0)} € · Marge{" "}
                    <span style={{ color: GOLD }}>{fmt(t.preisNetto - paket.kostenProTwin, 0)} €</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    onClick={() => setMengen(prev => ({ ...prev, [t.id]: Math.max(0, prev[t.id] - 1) }))}
                    className="w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center active:scale-90 transition-all"
                    style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>−</button>
                  <span className="font-black text-xl w-7 text-center" style={{ color: GOLD }}>
                    {mengen[t.id]}
                  </span>
                  <button
                    onClick={() => setMengen(prev => ({ ...prev, [t.id]: prev[t.id] + 1 }))}
                    className="w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center active:scale-90 transition-all"
                    style={{ background: GOLD, color: BLACK }}>+</button>
                </div>
              </div>
            ))}

            <div className="rounded-2xl p-4 flex justify-between items-center"
              style={{ background: GOLD }}>
              <div>
                <div className="font-black text-black text-sm">Gesamt</div>
                <div className="text-black/60 text-xs">{ergebnis.sessionsJahr} Twins / Jahr</div>
              </div>
              <div className="text-right">
                <div className="font-black text-black text-2xl">{ergebnis.sessionsMonat}</div>
                <div className="text-black/60 text-xs">Sessions / Mo.</div>
              </div>
            </div>

            {ergebnis.effektivHinweis && (
              <div className="rounded-xl px-4 py-3 text-xs font-semibold"
                style={{ background: "rgba(245,168,0,0.15)", color: GOLD }}>
                💡 {ergebnis.effektivHinweis}
              </div>
            )}
            {ergebnis.twinsUeber > 0 && paketId === "pro" && (
              <div className="rounded-xl px-4 py-3 text-xs font-semibold"
                style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
                ⚠️ {ergebnis.sessionsJahr} Twins / Jahr — {ergebnis.twinsUeber} über Paket-Limit
              </div>
            )}
            {ergebnis.sparenMitPro > 0 && (
              <div className="rounded-xl px-4 py-3 text-xs font-semibold"
                style={{ background: "rgba(245,168,0,0.15)", color: GOLD }}>
                💡 Mit PRO sparst du {fmt(ergebnis.sparenMitPro)} € / Jahr
              </div>
            )}
          </div>
        );

      // 3: Kosten
      case 3:
        return (
          <div className={`${sz.px} py-4 ${sz.gap}`}>
            <div>
              <h2 className={`font-bold text-white mb-1 ${sz.h}`}>Mitarbeiter & Raum</h2>
              <p className="text-white/50 text-sm">Deine laufenden Kosten</p>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-white/70 text-sm font-semibold">Bruttogehalt / Monat</span>
                <span className="font-black text-2xl" style={{ color: GOLD }}>
                  {gehalt.toLocaleString("de-DE")} €
                </span>
              </div>
              <input type="range" min={2000} max={4000} step={100} value={gehalt}
                onChange={e => setGehalt(Number(e.target.value))}
                className="w-full" style={{ accentColor: GOLD }}/>
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>2.000 €</span><span>4.000 €</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-white/70 text-sm font-semibold">Raummiete / m²</span>
                <span className="font-black text-2xl" style={{ color: GOLD }}>{raumkosten} €</span>
              </div>
              <input type="range" min={8} max={25} step={1} value={raumkosten}
                onChange={e => setRaumkosten(Number(e.target.value))}
                className="w-full" style={{ accentColor: GOLD }}/>
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>8 €</span><span>Fläche: {annahmen.raumQm} m²</span><span>25 €</span>
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Kostenvorschau / Monat</div>
              {[
                { label: `AiRO-Lizenz (${ergebnis.sessionsMonat} × ${ergebnis.effektivPaket.kostenProTwin} €)`, val: ergebnis.lizenzkosten, gold: true },
                { label: "Personalkosten",   val: ergebnis.personalkosten },
                { label: "Raumkosten",       val: raumkosten * annahmen.raumQm },
                { label: "ISCO / Sonstiges", val: annahmen.iscoJahr / 12 },
              ].map(({ label, val, gold }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/50">{label}</span>
                  <span className="font-semibold" style={{ color: gold ? GOLD : "white" }}>
                    {fmt(val)} €
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10">
                <span className="text-white">Gesamt</span>
                <span style={{ color: GOLD }}>{fmt(ergebnis.ausgaben)} €</span>
              </div>
            </div>
          </div>
        );

      // 4: Auswertung (Fix 4: Sales-optimiert)
      case 4:
        return (
          <div className={`${sz.px} py-4 space-y-4`}>

            {/* 1. Große Gewinn-Card */}
            <div className="rounded-2xl p-5" style={{ background: positiv ? GOLD : "#ef4444" }}>
              <div className="text-black/60 text-xs font-bold uppercase tracking-wide mb-1">
                Dein Jahresgewinn
              </div>
              <div className="font-black text-black leading-tight" style={{ fontSize: isTablet ? 52 : 44 }}>
                {positiv ? "" : "–"}{fmt(Math.abs(ergebnis.jahresgewinn))} €
              </div>
              <div className="text-black/60 text-sm mt-2">
                = {fmt(Math.abs(ergebnis.ueberschuss))} € pro Monat
                {" · "}{ergebnis.sessionsMonat} Sessions / Mo.
              </div>
              {!positiv && (
                <div className="text-black/70 text-xs mt-1 font-semibold">
                  Sessions erhöhen für positive Rentabilität
                </div>
              )}
            </div>

            {/* 2. 3 Sales-Metriken */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Marge / Session",
                  value: `${fmt(ergebnis.margeProSession, 0)} €`,
                  sub: `nach Lizenz`,
                },
                {
                  label: "Kosten gedeckt ab",
                  value: ergebnis.breakEvenSessions !== null
                    ? `${ergebnis.breakEvenSessions} / Mo.`
                    : "—",
                  sub: "Break-even",
                },
                {
                  label: "Lizenz kostet",
                  value: `${ergebnis.effektivPaket.kostenProTwin} €`,
                  sub: `pro Twin`,
                },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-2xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="text-xs text-white/40 mb-1 leading-tight">{label}</div>
                  <div className="font-black text-base" style={{ color: GOLD }}>{value}</div>
                  <div className="text-xs text-white/30 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Effektiv-Paket Hinweis */}
            {ergebnis.effektivHinweis && (
              <div className="rounded-xl px-4 py-3 text-xs font-semibold"
                style={{ background: "rgba(245,168,0,0.15)", color: GOLD }}>
                💡 {ergebnis.effektivHinweis}
              </div>
            )}

            {/* 3. Kostenaufschlüsselung */}
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Kosten / Monat</div>
              {[
                { label: `AiRO-Lizenz (${ergebnis.sessionsMonat} × ${ergebnis.effektivPaket.kostenProTwin} €)`, val: ergebnis.lizenzkosten, gold: true },
                { label: "Personalkosten",   val: ergebnis.personalkosten },
                { label: "Fixkosten",        val: ergebnis.fixKosten },
              ].map(({ label, val, gold }) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white/50">{label}</span>
                  <span className="font-semibold" style={{ color: gold ? GOLD : "white" }}>
                    {fmt(val)} €
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 mt-1">
                <span className="text-white">Einnahmen</span>
                <span style={{ color: GOLD }}>{fmt(ergebnis.einnahmen)} €</span>
              </div>
            </div>

            {/* Jahresübersicht */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Einnahmen p.a.", val: `${fmt(ergebnis.einnahmen * 12)} €` },
                { label: "Kosten p.a.",    val: `${fmt(ergebnis.ausgaben * 12)} €` },
                { label: "Gewinn p.a.",    val: `${fmt(ergebnis.jahresgewinn)} €`, gold: true },
              ].map(({ label, val, gold }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="text-xs text-white/40 mb-1">{label}</div>
                  <div className="font-black text-sm" style={{ color: gold ? GOLD : "white" }}>{val}</div>
                </div>
              ))}
            </div>

            {/* 4. CTA */}
            <button onClick={() => setScreen(0)}
              className={`w-full rounded-2xl border font-semibold ${sz.btn}`}
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}>
              Neue Berechnung
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-screen mx-auto ${isTablet ? "max-w-2xl" : "max-w-md"}`}
      style={{ background: BLACK }}>

      {/* Fix 2: Header — immer gleiche Höhe */}
      <div className={`flex-none ${sz.px} pt-4 pb-3`}
        style={{ background: BLACK, minHeight: isTablet ? 80 : 64 }}>
        {isStart ? (
          // Screen 0: nur Logo, kein ProgressDots
          <div className="flex items-center justify-center h-full">
            <Image src="/airo-logo.png" alt="AiRO" width={70} height={35}
              style={{ objectFit: "contain", filter: "none"}}/>
          </div>
        ) : (
          // Screens 1-4: Logo + Paket-Chip + ProgressDots
          <>
            <div className="flex items-center justify-between mb-3">
              <Image src="/airo-logo.png" alt="AiRO" width={70} height={35}
                style={{ objectFit: "contain", filter: "none"}}/>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/30">{wizardStep} / {TOTAL_SCREENS - 1}</span>
                <div className="rounded-xl px-2 py-1 text-xs font-bold"
                  style={{ background: "rgba(245,168,0,0.15)", color: GOLD }}>
                  {paket.name} · {paket.kostenProTwin} €/Twin
                </div>
              </div>
            </div>
            <ProgressDots current={wizardStep - 1} total={TOTAL_SCREENS - 1}/>
          </>
        )}
      </div>

      {/* Fix 2: Content — immer flex-1, overflow-y-auto */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      {/* Fix 2: Footer — immer gleiche Höhe */}
      <div className={`flex-none ${sz.px} pb-6 pt-3`}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", minHeight: isTablet ? 92 : 80 }}>
        {isStart ? (
          // Screen 0: "Jetzt berechnen" Button
          <button onClick={() => navigate(1)}
            className={`w-full rounded-2xl font-bold transition-all active:scale-95 ${sz.btn}`}
            style={{ background: GOLD, color: BLACK }}>
            Jetzt berechnen →
          </button>
        ) : (
          // Screens 1-4: Zurück / Weiter
          <div className="flex gap-3">
            {screen > 1 && (
              <button onClick={() => navigate(-1)}
                className={`flex-none px-5 rounded-2xl font-semibold transition-all active:scale-95 ${sz.btn}`}
                style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>
                ←
              </button>
            )}
            {!isLast && (
              <button onClick={() => navigate(1)}
                className={`flex-1 rounded-2xl font-bold transition-all active:scale-95 ${sz.btn}`}
                style={{ background: GOLD, color: BLACK }}>
                Weiter →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
