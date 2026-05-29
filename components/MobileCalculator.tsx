"use client";

import { useState, useMemo } from "react";
import { fmt } from "@/lib/calc";

// ─── Konstanten & Typen ───────────────────────────────────────────────────────

const STUFEN = [
  { label: "Stufe 1", betrag: 2500 },
  { label: "Stufe 2", betrag: 5000 },
  { label: "Stufe 3", betrag: 8000 },
];

const ANNAHMEN = {
  lizenzMonat:        25,
  ersatzfolieGesamt:  749,
  abschreibungMonate: 36,
  raumQm:             10,
  iscoJahr:           348,
  arbeitszeitTermin:  1.25,
  vollzeitStunden:    172,
  lohnNebenkosten:    0.20,
};

interface DL {
  name:         string;
  uvp:          string;
  dlNetto:      number;
  sattelAnteil: number;   // 0–100 %
  sattelUvp:    number;   // Verkaufspreis netto
  sattelEK:     number;   // Händler-Einkaufspreis netto
}

const DEFAULT_D1: DL = {
  name: "Sattel-Analyse", uvp: "99 € UVP",
  dlNetto: 83.20, sattelAnteil: 70, sattelUvp: 88.60, sattelEK: 0,
};
const DEFAULT_D2: DL = {
  name: "Bikefitting Basis", uvp: "149 € UVP",
  dlNetto: 125.21, sattelAnteil: 50, sattelUvp: 77.62, sattelEK: 0,
};

const TOTAL_SCREENS = 6; // 0=Start, 1–5=Wizard

// ─── Berechnungslogik ────────────────────────────────────────────────────────

function berechne(
  investition: number, termine: number, gehalt: number,
  raumkosten: number, mix: number, d1: DL, d2: DL
) {
  const d1Umsatz = d1.dlNetto + (d1.sattelAnteil / 100) * (d1.sattelUvp - d1.sattelEK);
  const d2Umsatz = d2.dlNetto + (d2.sattelAnteil / 100) * (d2.sattelUvp - d2.sattelEK);

  const abschreibung   = investition / ANNAHMEN.abschreibungMonate;
  const technikLaufend = ANNAHMEN.lizenzMonat + ANNAHMEN.ersatzfolieGesamt / ANNAHMEN.abschreibungMonate;
  const mitarbeiter    = gehalt * (1 + ANNAHMEN.lohnNebenkosten) *
                         ((termine * ANNAHMEN.arbeitszeitTermin) / ANNAHMEN.vollzeitStunden);
  const raum    = raumkosten * ANNAHMEN.raumQm;
  const isco    = ANNAHMEN.iscoJahr / 12;
  const ausgaben = abschreibung + technikLaufend + mitarbeiter + raum + isco;

  const umsatzTermin = (1 - mix) * d1Umsatz + mix * d2Umsatz;
  const einnahmen    = termine * umsatzTermin;
  const ueberschuss  = einnahmen - ausgaben;
  const cashGewinn   = ueberschuss + abschreibung;

  const breakEvenMonate  = cashGewinn > 0 ? investition / cashGewinn : Infinity;
  const breakEvenTermine = ueberschuss > 0
    ? ausgaben / (umsatzTermin - ausgaben / termine) : Infinity;

  return { ausgaben, einnahmen, ueberschuss, cashGewinn,
           umsatzTermin, breakEvenMonate, breakEvenTermine, abschreibung };
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width:  i === current ? 20 : 7,
            height: 7,
            background: i === current ? "#AADD00" : "rgba(255,255,255,0.3)",
          }} />
      ))}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, display, onChange, hint,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-gray-600" style={{ fontFamily: "var(--font-heading)" }}>
          {label}
        </span>
        <span className="text-2xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
          {display}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ResultRow({ label, value, sub, lime }: {
  label: string; value: string; sub?: string; lime?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm text-gray-500" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <div className="font-bold text-lg text-right"
        style={{ color: lime ? "#AADD00" : "#3D5278", fontFamily: "var(--font-body)" }}>
        {value}
      </div>
    </div>
  );
}

// Kleines Zahlen-Input für Settings
function SettingsInput({
  label, value, onChange, suffix, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number" value={value} step={step} min={0}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) onChange(v); }}
          className="w-24 border-2 rounded-xl px-2 py-1.5 text-right font-semibold text-sm focus:outline-none"
          style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}
        />
        {suffix && <span className="text-xs text-gray-400 w-5">{suffix}</span>}
      </div>
    </div>
  );
}

function SettingsInputWithHint({
  label, value, onChange, suffix, step = 1, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; hint?: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 flex-1">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number" value={value} step={step} min={0}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) onChange(v); }}
            className="w-24 border-2 rounded-xl px-2 py-1.5 text-right font-semibold text-sm focus:outline-none"
            style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}
          />
          {suffix && <span className="text-xs text-gray-400 w-5">{suffix}</span>}
        </div>
      </div>
      {hint && (
        <div className="text-xs mt-1 font-semibold" style={{ color: "#AADD00" }}>
          ↳ {hint}
        </div>
      )}
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function MobileCalculator() {
  const [screen, setScreen]       = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Eingaben
  const [termine, setTermine]         = useState(20);
  const [mix, setMix]                 = useState(0.5);
  const [gehalt, setGehalt]           = useState(2600);
  const [raumkosten, setRaumkosten]   = useState(14);
  const [stufeIdx, setStufeIdx]       = useState<number | null>(0);
  const [investition, setInvestition] = useState(2500);
  const [investInput, setInvestInput] = useState("2.500");

  // Settings
  const [calcMode, setCalcMode] = useState<"monat" | "termin">("monat");
  const [d1, setD1] = useState<DL>(DEFAULT_D1);
  const [d2, setD2] = useState<DL>(DEFAULT_D2);

  function navigate(delta: 1 | -1) {
    setScreen(s => Math.max(0, Math.min(TOTAL_SCREENS - 1, s + delta)));
  }

  function handleStufe(idx: number) {
    setStufeIdx(idx);
    setInvestition(STUFEN[idx].betrag);
    setInvestInput(STUFEN[idx].betrag.toLocaleString("de-DE"));
  }

  function handleInvestInput(raw: string) {
    setInvestInput(raw);
    setStufeIdx(null);
    const parsed = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 500) setInvestition(parsed);
  }

  // Berechnungen
  const basis = useMemo(
    () => berechne(investition, termine, gehalt, raumkosten, mix, d1, d2),
    [investition, termine, gehalt, raumkosten, mix, d1, d2]
  );

  const starr   = useMemo(() => berechne(investition, termine,        gehalt, raumkosten, mix, d1, d2), [investition, termine, gehalt, raumkosten, mix, d1, d2]);
  const variJ2  = useMemo(() => berechne(investition, termine * 1.10, gehalt, raumkosten, mix, d1, d2), [investition, termine, gehalt, raumkosten, mix, d1, d2]);
  const variJ3  = useMemo(() => berechne(investition, termine * 1.20, gehalt, raumkosten, mix, d1, d2), [investition, termine, gehalt, raumkosten, mix, d1, d2]);

  // Darstellungshelfer: monatlich oder pro Termin
  function anzeige(monatsWert: number, suffix = "€") {
    if (calcMode === "monat") return `${fmt(monatsWert)} ${suffix}`;
    const perTermin = termine > 0 ? monatsWert / termine : 0;
    return `${fmt(perTermin, 2)} ${suffix}`;
  }
  const modeLabel = calcMode === "monat" ? "/ Monat" : "/ Termin";

  // ── Settings-Panel ─────────────────────────────────────────────────────────
  const settingsPanel = settingsOpen && (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)} />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto rounded-t-3xl overflow-hidden"
        style={{ background: "white", maxHeight: "85vh" }}>

        {/* Handle + Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Einstellungen
            </h3>
            <button onClick={() => setSettingsOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400"
              style={{ background: "#f4f6f9" }}>
              ✕
            </button>
          </div>
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
          <div className="px-5 py-4 space-y-6">

            {/* Ansicht */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Ansicht
              </div>
              <div className="flex rounded-xl overflow-hidden border-2" style={{ borderColor: "#e5e7eb" }}>
                {(["monat", "termin"] as const).map(mode => (
                  <button key={mode} onClick={() => setCalcMode(mode)}
                    className="flex-1 py-3 text-sm font-semibold transition-all"
                    style={{
                      background: calcMode === mode ? "#3D5278" : "white",
                      color:      calcMode === mode ? "white"   : "#6b7280",
                      fontFamily: "var(--font-body)",
                    }}>
                    {mode === "monat" ? "pro Monat" : "pro Termin"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {calcMode === "monat"
                  ? "Alle Ergebnisse als monatliche Summe"
                  : "Alle Ergebnisse als Wert je Einzeltermin"}
              </p>
            </div>

            {/* D1 Preise */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "#AADD00" }} />
                <span className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                  {d1.name}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  Ø {fmt(d1.dlNetto + (d1.sattelAnteil / 100) * (d1.sattelUvp - d1.sattelEK), 2)} € / Termin
                </span>
              </div>
              <div className="rounded-2xl border border-gray-100 px-4 py-1 divide-y divide-gray-50">
                <SettingsInput label="DL-Preis netto" value={d1.dlNetto}
                  onChange={v => setD1(p => ({ ...p, dlNetto: v }))} suffix="€" step={0.5} />
                <SettingsInput label="Sattelanteil" value={d1.sattelAnteil}
                  onChange={v => setD1(p => ({ ...p, sattelAnteil: Math.min(100, v) }))} suffix="%" step={5} />
                <SettingsInput label="UVP Sattel netto" value={d1.sattelUvp}
                  onChange={v => setD1(p => ({ ...p, sattelUvp: v }))} suffix="€" step={1} />
                <SettingsInputWithHint label="Händler EK netto" value={d1.sattelEK}
                  onChange={v => setD1(p => ({ ...p, sattelEK: v }))} suffix="€" step={1}
                  hint={`Marge: ${fmt(d1.sattelUvp - d1.sattelEK, 2)} €`} />
              </div>
            </div>

            {/* D2 Preise */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "#3D5278" }} />
                <span className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                  {d2.name}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  Ø {fmt(d2.dlNetto + (d2.sattelAnteil / 100) * (d2.sattelUvp - d2.sattelEK), 2)} € / Termin
                </span>
              </div>
              <div className="rounded-2xl border border-gray-100 px-4 py-1 divide-y divide-gray-50">
                <SettingsInput label="DL-Preis netto" value={d2.dlNetto}
                  onChange={v => setD2(p => ({ ...p, dlNetto: v }))} suffix="€" step={0.5} />
                <SettingsInput label="Sattelanteil" value={d2.sattelAnteil}
                  onChange={v => setD2(p => ({ ...p, sattelAnteil: Math.min(100, v) }))} suffix="%" step={5} />
                <SettingsInput label="UVP Sattel netto" value={d2.sattelUvp}
                  onChange={v => setD2(p => ({ ...p, sattelUvp: v }))} suffix="€" step={1} />
                <SettingsInputWithHint label="Händler EK netto" value={d2.sattelEK}
                  onChange={v => setD2(p => ({ ...p, sattelEK: v }))} suffix="€" step={1}
                  hint={`Marge: ${fmt(d2.sattelUvp - d2.sattelEK, 2)} €`} />
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => { setD1(DEFAULT_D1); setD2(DEFAULT_D2); setCalcMode("monat"); }}
              className="w-full py-3 rounded-2xl border-2 text-sm font-semibold"
              style={{ borderColor: "#e5e7eb", color: "#9ca3af", fontFamily: "var(--font-body)" }}>
              Standardwerte zurücksetzen
            </button>

            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );

  // ── Screens ────────────────────────────────────────────────────────────────

  const screens = [
    // ── 0: Start ─────────────────────────────────────────────────────────────
    <div key="start" className="flex flex-col items-center justify-center h-full px-8 text-center gap-8">
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-2"
          style={{ background: "rgba(170,221,0,0.15)" }}>
          <span className="text-4xl font-black" style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>g</span>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-widest uppercase mb-1"
            style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>
            gebioMized
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Rentabilitäts&shy;rechner
          </h1>
        </div>
        <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
          Berechne in 4 Schritten, wie schnell sich deine Bikefitting-Investition auszahlt.
        </p>
      </div>
      <button onClick={() => navigate(1)}
        className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
        style={{ background: "#AADD00", color: "#3D5278", fontFamily: "var(--font-heading)" }}>
        Jetzt berechnen →
      </button>
    </div>,

    // ── 1: Termine + Mix ─────────────────────────────────────────────────────
    <div key="s1" className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Termine & Leistungs-Mix</h2>
        <p className="text-xs text-gray-400 mt-1">Wie viele Termine planst du pro Monat?</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8">
        <SliderRow label="Termine / Monat" value={termine} min={5} max={80} step={5}
          display={`${termine}`} onChange={setTermine}
          hint="Realistisch: 20–40 Termine/Monat" />

        <div className="space-y-3">
          <span className="text-sm font-semibold text-gray-600" style={{ fontFamily: "var(--font-heading)" }}>
            Leistungs-Mix
          </span>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{d1.name}<br/><span className="text-gray-400">{d1.uvp}</span></span>
            <span className="text-right">{d2.name}<br/><span className="text-gray-400">{d2.uvp}</span></span>
          </div>
          <input type="range" min={0} max={1} step={0.1} value={mix}
            onChange={e => setMix(Number(e.target.value))} />
          <div className="flex justify-between">
            <span className="font-bold text-base" style={{ color: "#3D5278" }}>{Math.round((1 - mix) * 100)} %</span>
            <span className="text-xs text-gray-400 self-center">Ø {fmt(basis.umsatzTermin, 2)} € / Termin</span>
            <span className="font-bold text-base" style={{ color: "#3D5278" }}>{Math.round(mix * 100)} %</span>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#f4f6f9" }}>
          <div className="text-xs text-gray-500 mb-1">Einnahmen {modeLabel}</div>
          <div className="text-2xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
            {anzeige(basis.einnahmen)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {calcMode === "monat"
              ? `${termine} Termine × ${fmt(basis.umsatzTermin, 2)} €`
              : `${fmt(basis.umsatzTermin, 2)} € Umsatz je Termin`}
          </div>
        </div>
      </div>
    </div>,

    // ── 2: Mitarbeiter + Raum ────────────────────────────────────────────────
    <div key="s2" className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Mitarbeiter & Raum</h2>
        <p className="text-xs text-gray-400 mt-1">Deine laufenden Kostenblöcke</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8">
        <SliderRow label="Bruttogehalt / Monat" value={gehalt} min={2000} max={4500} step={100}
          display={`${gehalt.toLocaleString("de-DE")} €`} onChange={setGehalt}
          hint="Nur anteiliger Zeitaufwand für Fittings wird berechnet" />

        <SliderRow label="Raummiete / m²" value={raumkosten} min={8} max={30} step={1}
          display={`${raumkosten} €`} onChange={setRaumkosten}
          hint="Annahme: 10 m² Messfläche" />

        <div className="rounded-2xl p-4" style={{ background: "#f4f6f9" }}>
          <div className="text-xs text-gray-500 mb-2">Kosten {modeLabel}</div>
          <div className="space-y-1.5 text-sm">
            {[
              ["Mitarbeiter (anteilig)", anzeige(gehalt * 1.2 * (termine * 1.25 / 172))],
              ["Raummiete",             anzeige(raumkosten * 10)],
              ["Lizenz + Ersatzteile",  anzeige(ANNAHMEN.lizenzMonat + ANNAHMEN.ersatzfolieGesamt / 36)],
              ["ISCO-Kurs",             anzeige(ANNAHMEN.iscoJahr / 12)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-gray-600">
                <span>{k}</span><span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // ── 3: Investition ───────────────────────────────────────────────────────
    <div key="s3" className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Investition Technologie</h2>
        <p className="text-xs text-gray-400 mt-1">Wähle dein Paket oder gib einen eigenen Betrag ein</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {STUFEN.map((s, i) => (
            <button key={i} onClick={() => handleStufe(i)}
              className="py-4 rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center gap-1"
              style={{
                borderColor: stufeIdx === i ? "#3D5278" : "#e5e7eb",
                background:  stufeIdx === i ? "#3D5278" : "white",
              }}>
              <span className="text-xs font-bold"
                style={{ color: stufeIdx === i ? "#AADD00" : "#9ca3af", fontFamily: "var(--font-heading)" }}>
                {s.label}
              </span>
              <span className="font-bold text-base leading-tight"
                style={{ color: stufeIdx === i ? "white" : "#1f2937", fontFamily: "var(--font-body)" }}>
                {s.betrag.toLocaleString("de-DE")} €
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
            style={{ fontFamily: "var(--font-heading)" }}>Eigener Betrag</div>
          <div className="flex items-center gap-2">
            <input type="text" value={investInput}
              onChange={e => handleInvestInput(e.target.value)}
              onFocus={() => setStufeIdx(null)}
              className="flex-1 border-2 rounded-xl px-4 py-3 text-right text-xl font-bold focus:outline-none"
              style={{ borderColor: stufeIdx === null ? "#3D5278" : "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}
              placeholder="z. B. 6.500" />
            <span className="text-gray-400 font-semibold text-lg">€</span>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#f4f6f9" }}>
          <div className="text-xs text-gray-500 mb-1">Abschreibung (36 Monate)</div>
          <div className="text-xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
            {fmt(investition / 36, 2)} € / Monat
          </div>
          <div className="text-xs text-gray-400 mt-0.5">linear über 3 Jahre</div>
        </div>
      </div>
    </div>,

    // ── 4: Auswertung ────────────────────────────────────────────────────────
    <div key="s4" className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Auswertung</h2>
        <p className="text-xs text-gray-400 mt-1">
          {calcMode === "monat" ? "Monatliche Rentabilität auf einen Blick" : "Rentabilität je Termin"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-2">

        {/* Highlight-Card */}
        <div className="rounded-2xl p-5 mb-4 text-white" style={{ background: "#3D5278" }}>
          <div className="text-xs uppercase tracking-wide mb-1 opacity-70">
            Überschuss {modeLabel}
          </div>
          <div className="text-4xl font-black leading-tight" style={{ color: "#AADD00", fontFamily: "var(--font-body)" }}>
            {anzeige(basis.ueberschuss)}
          </div>
          <div className="text-sm mt-2 opacity-70">
            {basis.ueberschuss > 0
              ? `Amortisation in ${fmt(basis.breakEvenMonate, 1)} Monaten`
              : "Termine erhöhen für positive Rentabilität"}
          </div>
        </div>

        {/* Detail-Liste */}
        <div className="bg-white rounded-2xl px-4 mb-4 shadow-sm">
          <ResultRow
            label={`Einnahmen ${modeLabel}`}
            value={anzeige(basis.einnahmen)}
            sub={calcMode === "monat"
              ? `${termine} Termine × ${fmt(basis.umsatzTermin, 2)} €`
              : `${fmt(basis.umsatzTermin, 2)} € Umsatz / Termin`} />
          <ResultRow
            label={`Kosten ${modeLabel}`}
            value={anzeige(basis.ausgaben)}
            sub="inkl. Abschreibung, Gehalt, Raum" />
          <ResultRow
            label="Break-Even"
            value={basis.breakEvenMonate < Infinity ? `${fmt(basis.breakEvenMonate, 1)} Monate` : "–"}
            sub={`ab ${fmt(basis.breakEvenTermine, 0)} Terminen / Monat`} />
        </div>

        {/* Jahreskennzahl */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#f4f6f9" }}>
          <div className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}>Jahr 1 auf einen Blick</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Jahresgewinn",  `${fmt(basis.ueberschuss * 12)} €`],
              ["ROI (Jahr 1)",  `${fmt(investition > 0 ? (basis.ueberschuss * 12 / investition) * 100 : 0, 0)} %`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl p-3 bg-white">
                <div className="text-xs text-gray-400 mb-1">{k}</div>
                <div className="font-bold text-lg" style={{ color: "#3D5278" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // ── 5: 3-Jahres-Prognose ─────────────────────────────────────────────────
    <div key="s5" className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>3-Jahres-Prognose</h2>
        <p className="text-xs text-gray-400 mt-1">Konstant vs. Wachstum (+10 % / +20 % Termine)</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">

        {/* Starr */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#e8edf5" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#3D5278" }} />
            <span className="text-sm font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Starr — {termine} Termine / Monat konstant
            </span>
          </div>
          <div className="bg-white px-4 divide-y divide-gray-100">
            {[starr, starr, starr].map((j, i) => (
              <div key={i} className="py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Jahr {i + 1}</div>
                  <div className="text-xs text-gray-400">{termine} Termine / Mo. · {fmt(j.einnahmen * 12)} € Einnahmen</div>
                </div>
                <div className="font-bold text-lg" style={{ color: "#3D5278" }}>{fmt(j.ueberschuss * 12)} €</div>
              </div>
            ))}
            <div className="py-3 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">Gesamt 3 Jahre</span>
              <span className="font-bold text-lg" style={{ color: "#3D5278" }}>
                {fmt(starr.ueberschuss * 36)} €
              </span>
            </div>
          </div>
        </div>

        {/* Variabel */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#3D5278" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#AADD00" }} />
            <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Wachstum · +10 % J2 · +20 % J3
            </span>
          </div>
          <div className="bg-white px-4 divide-y divide-gray-100">
            {[
              { j: starr,  t: termine,                    tag: null      },
              { j: variJ2, t: Math.round(termine * 1.10), tag: "+10 %"  },
              { j: variJ3, t: Math.round(termine * 1.20), tag: "+20 %"  },
            ].map(({ j, t, tag }, i) => (
              <div key={i} className="py-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">Jahr {i + 1}</span>
                    {tag && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(170,221,0,0.15)", color: "#3D5278" }}>
                        {tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{t} Termine / Mo. · {fmt(j.einnahmen * 12)} € Einnahmen</div>
                </div>
                <div className="font-bold text-lg" style={{ color: "#3D5278" }}>{fmt(j.ueberschuss * 12)} €</div>
              </div>
            ))}
            <div className="py-3 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">Gesamt 3 Jahre</span>
              <div className="text-right">
                <div className="font-bold text-lg" style={{ color: "#AADD00" }}>
                  {fmt((starr.ueberschuss + variJ2.ueberschuss + variJ3.ueberschuss) * 12)} €
                </div>
                <div className="text-xs text-gray-400">
                  ROI {fmt(investition > 0
                    ? ((starr.ueberschuss + variJ2.ueberschuss + variJ3.ueberschuss) * 12 / investition) * 100
                    : 0, 0)} %
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reset */}
        <button onClick={() => setScreen(0)}
          className="w-full py-3 rounded-2xl border-2 text-sm font-semibold transition-all"
          style={{ borderColor: "#3D5278", color: "#3D5278", fontFamily: "var(--font-body)" }}>
          Neue Berechnung starten
        </button>
      </div>
    </div>,
  ];

  const isStart    = screen === 0;
  const isLast     = screen === TOTAL_SCREENS - 1;
  const wizardStep = screen - 1;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative"
      style={{ background: isStart ? "#3D5278" : "#f4f6f9" }}>

      {/* Settings Panel (Portal-ähnlich, über allem) */}
      {settingsPanel}

      {/* Header */}
      {!isStart ? (
        <div className="flex-none px-5 pt-safe pt-4 pb-3" style={{ background: "#3D5278" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>
              gebioMized
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50">{wizardStep} / 5</span>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
                aria-label="Einstellungen">
                <GearIcon />
              </button>
            </div>
          </div>
          <ProgressDots current={wizardStep - 1} total={5} />
        </div>
      ) : (
        /* Gear auf Start-Screen */
        <div className="absolute top-5 right-5 z-10">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            aria-label="Einstellungen">
            <GearIcon />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {screens[screen]}
      </div>

      {/* Footer Navigation */}
      {!isStart && (
        <div className="flex-none px-5 pb-safe pb-5 pt-3 flex gap-3"
          style={{ background: screen >= 4 ? "#f4f6f9" : "white", borderTop: "1px solid #f0f0f0" }}>
          {screen > 1 && (
            <button onClick={() => navigate(-1)}
              className="flex-none px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: "#e8edf5", color: "#3D5278", fontFamily: "var(--font-body)" }}>
              ← Zurück
            </button>
          )}
          {!isLast && (
            <button onClick={() => navigate(1)}
              className="flex-1 py-3.5 rounded-2xl font-bold text-base transition-all active:scale-95"
              style={{ background: "#3D5278", color: "white", fontFamily: "var(--font-heading)" }}>
              Weiter →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
