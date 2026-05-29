"use client";

import { useState, useMemo } from "react";
import AmortizationChart from "./AmortizationChart";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Stufe {
  label: string;
  betrag: number;
  beschreibung: string;
}

interface Dienstleistung {
  name: string;       // Anzeigename im Mix-Slider
  uvpLabel: string;   // Text unter dem Button / Slider, z. B. "89 € UVP"
  dlNetto: number;    // Netto-DL-Preis für die Berechnung
  sattelAnteil: number; // Anteil Termine mit Sattelverkauf (0–100 %)
  sattelPreis: number;  // Netto-Sattelpreis
}

interface Einstellungen {
  stufen: [Stufe, Stufe, Stufe];
  d1: Dienstleistung;
  d2: Dienstleistung;
}

interface Annahmen {
  abschreibungMonate: number;
  lizenzMonat: number;
  ersatzfolieGesamt: number;
  raumQm: number;
  iscoJahr: number;
  arbeitszeitTermin: number;
  lohnNebenkosten: number;
  vollzeitStunden: number;
}

// ─── Standardwerte ────────────────────────────────────────────────────────────

const DEFAULT_EINSTELLUNGEN: Einstellungen = {
  stufen: [
    { label: "Stufe 1", betrag: 4900,  beschreibung: "Sattel-Analyse Einsteiger" },
    { label: "Stufe 2", betrag: 8150,  beschreibung: "Bikefitting Komplett"      },
    { label: "Stufe 3", betrag: 12000, beschreibung: "Premium Studio"            },
  ],
  d1: {
    name: "Sattel-Analyse",
    uvpLabel: "89 € UVP",
    dlNetto: 74.79,
    sattelAnteil: 100,
    sattelPreis: 88.60,
  },
  d2: {
    name: "Bikefitting Basis",
    uvpLabel: "149 € UVP",
    dlNetto: 125.21,
    sattelAnteil: 60,
    sattelPreis: 77.62,
  },
};

const DEFAULT_ANNAHMEN: Annahmen = {
  abschreibungMonate: 36,
  lizenzMonat: 25,
  ersatzfolieGesamt: 749,
  raumQm: 10,
  iscoJahr: 348,
  arbeitszeitTermin: 1.25,
  lohnNebenkosten: 20,
  vollzeitStunden: 172,
};

// ─── Berechnung ───────────────────────────────────────────────────────────────

function berechne(
  investition: number,
  termine: number,
  gehalt: number,
  raumkosten: number,
  mixAnteil: number,
  a: Annahmen,
  e: Einstellungen
) {
  const d1Umsatz = e.d1.dlNetto + (e.d1.sattelAnteil / 100) * e.d1.sattelPreis;
  const d2Umsatz = e.d2.dlNetto + (e.d2.sattelAnteil / 100) * e.d2.sattelPreis;

  const abschreibungMonat = investition / a.abschreibungMonate;
  const technikLaufend = a.lizenzMonat + a.ersatzfolieGesamt / a.abschreibungMonate;
  const mitarbeiter =
    gehalt * (1 + a.lohnNebenkosten / 100) *
    ((termine * a.arbeitszeitTermin) / a.vollzeitStunden);
  const raum   = raumkosten * a.raumQm;
  const isco   = a.iscoJahr / 12;
  const ausgaben = abschreibungMonat + technikLaufend + mitarbeiter + raum + isco;

  const umsatzTermin = mixAnteil * d1Umsatz + (1 - mixAnteil) * d2Umsatz;
  const einnahmen    = termine * umsatzTermin;
  const ueberschuss  = einnahmen - ausgaben;

  // Cash-Gewinn (vor Abschreibung) für Amortisationskurve
  const cashGewinn = ueberschuss + abschreibungMonat;

  const breakEvenMonate  = cashGewinn > 0 ? investition / cashGewinn : Infinity;
  const breakEvenTermine = ueberschuss > 0
    ? ausgaben / (umsatzTermin - ausgaben / termine)
    : Infinity;

  const gewinnJahr1 = ueberschuss * 12;
  const gewinnJahr3 = ueberschuss * 36;
  const roiJahr3    = investition > 0 ? (gewinnJahr3 / investition) * 100 : 0;

  return { ausgaben, einnahmen, ueberschuss, cashGewinn, breakEvenMonate,
           breakEvenTermine, gewinnJahr1, gewinnJahr3, roiJahr3, umsatzTermin,
           d1Umsatz, d2Umsatz };
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// ─── Eingabe-Komponenten ──────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, suffix = "", step = 1, min = 0, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; min?: number; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number" step={step} min={min} value={value}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= min) onChange(v); }}
          className="w-full border-2 rounded-xl px-3 py-2 text-right font-semibold focus:outline-none text-sm"
          style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}
        />
        {suffix && <span className="text-sm text-gray-400 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function TextInput({
  label, value, onChange, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
        {label}
      </label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 rounded-xl px-3 py-2 font-semibold focus:outline-none text-sm"
        style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function MetricCard({
  label, value, sub, accent, highlight,
}: {
  label: string; value: string; sub: string; accent: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 shadow-sm"
      style={{ background: highlight ? accent : "white", borderLeft: highlight ? "none" : `4px solid ${accent}` }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: highlight ? "white" : "#6b7280", fontFamily: "var(--font-heading)" }}>
        {label}
      </div>
      <div className="font-bold text-xl leading-tight"
        style={{ color: highlight ? "white" : "#1f2937", fontFamily: "var(--font-body)" }}>
        {value}
      </div>
      <div className="text-xs mt-0.5"
        style={{ color: highlight ? "rgba(255,255,255,0.75)" : "#9ca3af" }}>
        {sub}
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<"rechner" | "annahmen" | "einstellungen">("rechner");

  // Rechner-Inputs
  const [stufeIdx, setStufeIdx]               = useState<number | null>(0);
  const [investition, setInvestition]         = useState(4900);
  const [investitionInput, setInvestitionInput] = useState("4.900");
  const [termine, setTermine]                 = useState(20);
  const [gehalt, setGehalt]                   = useState(2600);
  const [raumkosten, setRaumkosten]           = useState(14);
  const [mix, setMix]                         = useState(0.8);

  // Konfiguration
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(DEFAULT_EINSTELLUNGEN);
  const [annahmen, setAnnahmen]           = useState<Annahmen>(DEFAULT_ANNAHMEN);

  // Helfer zum Patchen von Einstellungen
  function setStufe(idx: 0 | 1 | 2, patch: Partial<Stufe>) {
    setEinstellungen(prev => {
      const stufen = [...prev.stufen] as [Stufe, Stufe, Stufe];
      stufen[idx] = { ...stufen[idx], ...patch };
      return { ...prev, stufen };
    });
  }
  function setD(dl: "d1" | "d2", patch: Partial<Dienstleistung>) {
    setEinstellungen(prev => ({ ...prev, [dl]: { ...prev[dl], ...patch } }));
  }
  function setA<K extends keyof Annahmen>(key: K, val: Annahmen[K]) {
    setAnnahmen(prev => ({ ...prev, [key]: val }));
  }

  const ergebnis = useMemo(
    () => berechne(investition, termine, gehalt, raumkosten, mix, annahmen, einstellungen),
    [investition, termine, gehalt, raumkosten, mix, annahmen, einstellungen]
  );

  function handleStufeKlick(idx: number) {
    setStufeIdx(idx);
    const betrag = einstellungen.stufen[idx].betrag;
    setInvestition(betrag);
    setInvestitionInput(betrag.toLocaleString("de-DE"));
  }

  function handleInvestitionInput(raw: string) {
    setInvestitionInput(raw);
    const parsed = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 1000) {
      setInvestition(parsed);
      setStufeIdx(null);
    }
  }

  const positiv = ergebnis.ueberschuss > 0;

  const tabs = [
    { id: "rechner",       label: "Rechner"      },
    { id: "annahmen",      label: "Annahmen"     },
    { id: "einstellungen", label: "Einstellungen" },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Header + Tabs */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-md" style={{ background: "#3D5278" }}>
        <div className="px-6 py-5">
          <h1 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Rentabilitätsrechner
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#AADD00", fontFamily: "var(--font-body)" }}>
            gebioMized Bikefitting-Technologie · Deine Investition in Zahlen
          </p>
        </div>
        <div className="flex px-6 gap-1 pb-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all"
              style={{
                background: activeTab === tab.id ? "#f4f6f9" : "transparent",
                color:      activeTab === tab.id ? "#3D5278" : "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-body)",
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Rechner ────────────────────────────────────────────────────── */}
      {activeTab === "rechner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Inputs */}
          <div className="space-y-4">

            {/* Investition */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Investition
              </h2>
              <div className="flex gap-2 mb-3">
                {einstellungen.stufen.map((s, i) => (
                  <button key={i} onClick={() => handleStufeKlick(i)}
                    className="flex-1 py-2 px-2 rounded-xl text-sm font-semibold border-2 transition-all"
                    style={{
                      borderColor: stufeIdx === i ? "#3D5278" : "#e5e7eb",
                      background:  stufeIdx === i ? "#3D5278" : "white",
                      color:       stufeIdx === i ? "white"   : "#374151",
                      fontFamily:  "var(--font-body)",
                    }}>
                    <div>{s.label}</div>
                    <div className="text-xs font-normal opacity-80">{s.betrag.toLocaleString("de-DE")} €</div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="text"
                  className="flex-1 border-2 rounded-xl px-3 py-2 text-right font-semibold focus:outline-none"
                  style={{ borderColor: stufeIdx === null ? "#3D5278" : "#e5e7eb", fontFamily: "var(--font-body)" }}
                  value={investitionInput}
                  onChange={e => handleInvestitionInput(e.target.value)}
                  onFocus={() => setStufeIdx(null)}
                />
                <span className="text-gray-500 font-medium">€</span>
              </div>
            </div>

            {/* Termine */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Geplante Termine / Monat
              </h2>
              <div className="flex items-center gap-3">
                <input type="range" min={5} max={80} step={5} value={termine} onChange={e => setTermine(Number(e.target.value))} />
                <span className="font-bold text-xl w-10 text-right" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{termine}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span><span>40 (realistisch)</span><span>80</span>
              </div>
            </div>

            {/* Gehalt */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Mitarbeiter Bruttogehalt / Monat
              </h2>
              <div className="flex items-center gap-3">
                <input type="range" min={2000} max={4000} step={100} value={gehalt} onChange={e => setGehalt(Number(e.target.value))} />
                <span className="font-bold text-lg w-20 text-right" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
                  {gehalt.toLocaleString("de-DE")} €
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2.000 €</span><span>4.000 €</span>
              </div>
            </div>

            {/* Raumkosten */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Raummiete / m²
              </h2>
              <div className="flex items-center gap-3">
                <input type="range" min={8} max={25} step={1} value={raumkosten} onChange={e => setRaumkosten(Number(e.target.value))} />
                <span className="font-bold text-lg w-16 text-right" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
                  {raumkosten} €
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Messfläche: {annahmen.raumQm} m²</div>
            </div>

            {/* Mix */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-1" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Leistungs-Mix
              </h2>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{einstellungen.d1.name} ({einstellungen.d1.uvpLabel})</span>
                <span>{einstellungen.d2.name} ({einstellungen.d2.uvpLabel})</span>
              </div>
              <input type="range" min={0} max={1} step={0.1} value={mix} onChange={e => setMix(Number(e.target.value))} />
              <div className="flex justify-between mt-1">
                <span className="text-sm font-semibold" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{Math.round(mix * 100)} %</span>
                <span className="text-xs text-gray-400 self-center">
                  Ø {fmt(ergebnis.umsatzTermin, 2)} € / Termin
                </span>
                <span className="text-sm font-semibold" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{Math.round((1 - mix) * 100)} %</span>
              </div>
            </div>
          </div>

          {/* Ergebnisse */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Einnahmen / Monat" value={`${fmt(ergebnis.einnahmen)} €`}
                sub={`${fmt(ergebnis.umsatzTermin, 2)} € / Termin`} accent="#AADD00" />
              <MetricCard label="Kosten / Monat" value={`${fmt(ergebnis.ausgaben)} €`}
                sub="inkl. Abschreibung & Gehalt" accent="#e5e7eb" />
              <MetricCard label="Überschuss / Monat"
                value={`${positiv ? "" : "–"}${fmt(Math.abs(ergebnis.ueberschuss))} €`}
                sub={positiv ? "Monatlicher Gewinn" : "Noch nicht rentabel"}
                accent={positiv ? "#3D5278" : "#ef4444"} highlight />
              <MetricCard label="Break-Even"
                value={positiv ? `${fmt(ergebnis.breakEvenMonate, 1)} Monate` : "–"}
                sub={positiv ? `${fmt(ergebnis.breakEvenTermine, 0)} Termine / Monat kostendeckend` : "Termine erhöhen"}
                accent="#3D5278" />
            </div>

            <div className="rounded-2xl p-5 shadow-sm text-white" style={{ background: "#3D5278" }}>
              <div className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>
                3-Jahres-Perspektive
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs opacity-70 mb-1">Gewinn Jahr 1</div>
                  <div className="font-bold text-lg">{fmt(ergebnis.gewinnJahr1)} €</div>
                </div>
                <div className="border-x border-white/20">
                  <div className="text-xs opacity-70 mb-1">Gewinn 3 Jahre</div>
                  <div className="font-bold text-lg">{fmt(ergebnis.gewinnJahr3)} €</div>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">ROI (3 Jahre)</div>
                  <div className="font-bold text-lg" style={{ color: "#AADD00" }}>{fmt(ergebnis.roiJahr3, 0)} %</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Amortisationsverlauf (36 Monate)
              </h3>
              <AmortizationChart
                investition={investition}
                cashGewinnMonat={ergebnis.cashGewinn}
                breakEvenMonate={ergebnis.breakEvenMonate}
              />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm text-xs text-gray-500 space-y-1">
              <div className="font-semibold text-gray-700 mb-2">Berechnungsgrundlagen</div>
              <div>· Messtechnik linear auf {annahmen.abschreibungMonate} Monate abgeschrieben</div>
              <div>· Sattelverkauf: {einstellungen.d1.name} {einstellungen.d1.sattelAnteil} % | {einstellungen.d2.name} {einstellungen.d2.sattelAnteil} %</div>
              <div>· {annahmen.arbeitszeitTermin} Std. Arbeitszeit pro Termin (inkl. Admin & Report)</div>
              <div>· Raumgröße: {annahmen.raumQm} m² · ISCO-Jahreskurs: {annahmen.iscoJahr} €</div>
              <div>· Alle Beträge netto (ohne MwSt.)</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Annahmen ───────────────────────────────────────────────────── */}
      {activeTab === "annahmen" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Technik & Lizenz
              </h2>
              <div className="space-y-4">
                <NumInput label="Abschreibungszeitraum" value={annahmen.abschreibungMonate} onChange={v => setA("abschreibungMonate", v)}
                  suffix="Monate" step={6} min={12} hint="Standard: 36 Monate (linear)" />
                <NumInput label="Jahreslizenz" value={annahmen.lizenzMonat} onChange={v => setA("lizenzMonat", v)}
                  suffix="€ / Monat" step={1} />
                <NumInput label="Ersatzfolie (Gesamtkosten)" value={annahmen.ersatzfolieGesamt} onChange={v => setA("ersatzfolieGesamt", v)}
                  suffix="€" step={50} hint="Wird auf Abschreibungszeitraum verteilt" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Raum & Betrieb
              </h2>
              <div className="space-y-4">
                <NumInput label="Raumgröße Messfläche" value={annahmen.raumQm} onChange={v => setA("raumQm", v)}
                  suffix="m²" step={1} min={5} />
                <NumInput label="ISCO-Kurs / Jahr" value={annahmen.iscoJahr} onChange={v => setA("iscoJahr", v)}
                  suffix="€" step={10} hint="Tageskurs oder Online-Kurs" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Mitarbeiter
              </h2>
              <div className="space-y-4">
                <NumInput label="Arbeitszeit pro Termin" value={annahmen.arbeitszeitTermin} onChange={v => setA("arbeitszeitTermin", v)}
                  suffix="Std." step={0.25} min={0.5} hint="Inkl. Terminabsprache & Kurzreport" />
                <NumInput label="Lohn-Nebenkosten" value={annahmen.lohnNebenkosten} onChange={v => setA("lohnNebenkosten", v)}
                  suffix="%" step={1} hint="Aufschlag auf Bruttogehalt" />
                <NumInput label="Vollzeit-Stunden / Monat" value={annahmen.vollzeitStunden} onChange={v => setA("vollzeitStunden", v)}
                  suffix="Std." step={1} min={100} />
              </div>
            </div>
          </div>
          <button onClick={() => setAnnahmen(DEFAULT_ANNAHMEN)}
            className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all"
            style={{ borderColor: "#3D5278", color: "#3D5278", fontFamily: "var(--font-body)" }}>
            Standardwerte zurücksetzen
          </button>
        </div>
      )}

      {/* ── Tab: Einstellungen ──────────────────────────────────────────────── */}
      {activeTab === "einstellungen" && (
        <div className="space-y-5">

          {/* Investitionsstufen */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Investitionsstufen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {einstellungen.stufen.map((s, i) => (
                <div key={i} className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: "#e5e7eb" }}>
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                    Stufe {i + 1}
                  </div>
                  <TextInput label="Button-Label" value={s.label}
                    onChange={v => setStufe(i as 0|1|2, { label: v })} />
                  <NumInput label="Investitionsbetrag" value={s.betrag}
                    onChange={v => setStufe(i as 0|1|2, { betrag: v })}
                    suffix="€" step={100} min={500} />
                  <TextInput label="Beschreibung" value={s.beschreibung}
                    onChange={v => setStufe(i as 0|1|2, { beschreibung: v })}
                    hint="Kurzer Untertitel (optional)" />
                </div>
              ))}
            </div>
          </div>

          {/* Dienstleistungen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(["d1", "d2"] as const).map(dl => {
              const d = einstellungen[dl];
              const umsatz = d.dlNetto + (d.sattelAnteil / 100) * d.sattelPreis;
              return (
                <div key={dl} className="bg-white rounded-2xl p-5 shadow-sm">
                  <h2 className="font-bold text-sm uppercase tracking-wide mb-1" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                    {dl === "d1" ? "Dienstleistung 1" : "Dienstleistung 2"}
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Einnahmen / Termin (berechnet): <strong style={{ color: "#3D5278" }}>{fmt(umsatz, 2)} € netto</strong>
                  </p>
                  <div className="space-y-3">
                    <TextInput label="Anzeigename (Mix-Slider)" value={d.name}
                      onChange={v => setD(dl, { name: v })} />
                    <TextInput label="UVP-Label (Hinweistext)" value={d.uvpLabel}
                      onChange={v => setD(dl, { uvpLabel: v })}
                      hint={`Wird im Slider angezeigt, z. B. "89 € UVP"`} />
                    <NumInput label="Dienstleistungspreis (netto)" value={d.dlNetto}
                      onChange={v => setD(dl, { dlNetto: v })}
                      suffix="€" step={0.5} min={0} />
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                        Sattelverkauf
                      </div>
                      <div className="space-y-3">
                        <NumInput label="Anteil Termine mit Sattelverkauf" value={d.sattelAnteil}
                          onChange={v => setD(dl, { sattelAnteil: Math.min(100, Math.max(0, v)) })}
                          suffix="%" step={5} min={0} />
                        <NumInput label="Sattelpreis (netto)" value={d.sattelPreis}
                          onChange={v => setD(dl, { sattelPreis: v })}
                          suffix="€" step={1} min={0} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => setEinstellungen(DEFAULT_EINSTELLUNGEN)}
            className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all"
            style={{ borderColor: "#3D5278", color: "#3D5278", fontFamily: "var(--font-body)" }}>
            Standardwerte zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}
