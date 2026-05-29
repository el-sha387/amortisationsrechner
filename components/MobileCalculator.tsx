"use client";

import { useState, useMemo, useEffect } from "react";
import { fmt } from "@/lib/calc";

// ─── Interfaces & Daten ──────────────────────────────────────────────────────

interface Produkt {
  id: string; name: string; preis: number;
  lizenzJahr1?: number;
  lizenzJahrFolge?: number;
}
interface Option  { name: string; produktIds: string[]; }

interface DL {
  name: string; uvp: string;
  dlNetto: number; sattelAnteil: number;
  sattelUvp: number; sattelEK: number;
}

const DEFAULT_PRODUKTE: Produkt[] = [
  // Messtechnik
  { id: "sattel-app",        name: "Sattel-Druck App",                    preis: 2490, lizenzJahr1: 490, lizenzJahrFolge: 490 },
  { id: "sattel-map",        name: "Sattel-Druckmessung",                 preis: 4990 },
  { id: "lenker-map",        name: "Lenkerdruckmessung",                  preis: 3900 },
  { id: "fuss-map",          name: "Fußdruckmessung",                     preis: 4990 },
  { id: "bundle-sf",         name: "Bundle Sattel + Fuß",                 preis: 7990 },
  { id: "velogic-ess",       name: "Velogic Essentials (1 Kamera)",       preis: 1849, lizenzJahr1: 2800, lizenzJahrFolge: 1150 },
  { id: "velogic-pro",       name: "Velogic PRO (2 Kameras)",             preis: 2990, lizenzJahr1: 4200, lizenzJahrFolge: 1700 },
  { id: "advantage360",      name: "Advantage 360 (jährl.)",              preis:  490 },
  // Starter Kits Komponenten
  { id: "kit-sattel-crmo",   name: "Starter Kit Sättel 5× CrMo (EK)",      preis: Math.round(5  * 52.92) },
  { id: "kit-sattel-titan",  name: "Starter Kit Sättel 10× Titan (EK)",     preis: Math.round(10 * 92.60) },
  { id: "kit-push-einlagen", name: "Starter Kit PUSH Einlagen 9 Paar (EK)", preis: Math.round(9  * 68.80) },
];

const DEFAULT_OPTIONEN: Option[] = [
  { name: "Option 1", produktIds: ["sattel-app"] },
  { name: "Option 2", produktIds: ["sattel-map", "velogic-ess"] },
  { name: "Option 3", produktIds: ["sattel-map", "lenker-map", "velogic-pro"] },
];

const DEFAULT_D1: DL = {
  name: "Sattel-Analyse", uvp: "99 € UVP",
  dlNetto: 83.20, sattelAnteil: 70, sattelUvp: 88.60, sattelEK: 0,
};
const DEFAULT_D2: DL = {
  name: "Bikefitting Basis", uvp: "149 € UVP",
  dlNetto: 125.21, sattelAnteil: 50, sattelUvp: 77.62, sattelEK: 0,
};

const ANNAHMEN = {
  lizenzMonat: 25, ersatzfolieGesamt: 749, abschreibungMonate: 36,
  raumQm: 10, iscoJahr: 348, arbeitszeitTermin: 1.25,
  vollzeitStunden: 172, lohnNebenkosten: 0.20,
};

const TOTAL_SCREENS = 6;

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getOptionPreis(opt: Option, produkte: Produkt[]): number {
  return opt.produktIds.reduce((sum, pid) => {
    const p = produkte.find(x => x.id === pid);
    return sum + (p ? p.preis : 0);
  }, 0);
}

function getOptionModule(opt: Option, produkte: Produkt[]): Produkt[] {
  return opt.produktIds.map(pid => produkte.find(p => p.id === pid)).filter(Boolean) as Produkt[];
}

function getVelogicLizenzen(optionIdx: number | null, optionen: Option[], produkte: Produkt[]) {
  if (optionIdx === null) return { jahr1: 0, jahrFolge: 0 };
  return optionen[optionIdx].produktIds.reduce(
    (acc, pid) => {
      const p = produkte.find(x => x.id === pid);
      return p ? { jahr1: acc.jahr1 + (p.lizenzJahr1 ?? 0), jahrFolge: acc.jahrFolge + (p.lizenzJahrFolge ?? 0) } : acc;
    },
    { jahr1: 0, jahrFolge: 0 }
  );
}

function sattelMarge(uvp: number, ek: number) {
  // UVP = Brutto-Endkundenpreis (inkl. 19% MwSt.)
  // EK  = Netto-Einkaufspreis (ohne MwSt., B2B)
  return uvp / 1.19 - ek;
}

function berechne(
  investition: number, termine: number, gehalt: number,
  raumkosten: number, mix: number, d1: DL, d2: DL,
  velogicLizenzMonat = 0
) {
  const d1Umsatz = d1.dlNetto + (d1.sattelAnteil / 100) * sattelMarge(d1.sattelUvp, d1.sattelEK);
  const d2Umsatz = d2.dlNetto + (d2.sattelAnteil / 100) * sattelMarge(d2.sattelUvp, d2.sattelEK);
  const abschreibung       = investition / ANNAHMEN.abschreibungMonate;
  const technikLaufend     = ANNAHMEN.lizenzMonat + ANNAHMEN.ersatzfolieGesamt / ANNAHMEN.abschreibungMonate + velogicLizenzMonat;
  const variableKostenSatz = gehalt * (1 + ANNAHMEN.lohnNebenkosten) * ANNAHMEN.arbeitszeitTermin / ANNAHMEN.vollzeitStunden;
  const mitarbeiter        = variableKostenSatz * termine;
  const raum    = raumkosten * ANNAHMEN.raumQm;
  const isco    = ANNAHMEN.iscoJahr / 12;
  const fixeKosten = abschreibung + technikLaufend + raum + isco;
  const ausgaben   = fixeKosten + mitarbeiter;
  const umsatzTermin = (1 - mix) * d1Umsatz + mix * d2Umsatz;
  const einnahmen    = termine * umsatzTermin;
  const ueberschuss  = einnahmen - ausgaben;
  const cashGewinn   = ueberschuss + abschreibung;
  const breakEvenMonate  = cashGewinn > 0 ? investition / cashGewinn : Infinity;
  // Break-Even Termine: nur fixe Kosten / (Umsatz je Termin − variable Kosten je Termin)
  const breakEvenTermine = umsatzTermin > variableKostenSatz
    ? fixeKosten / (umsatzTermin - variableKostenSatz) : Infinity;
  return { ausgaben, einnahmen, ueberschuss, cashGewinn,
           umsatzTermin, breakEvenMonate, breakEvenTermine, abschreibung };
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300" style={{
          width: i === current ? 20 : 7, height: 7,
          background: i === current ? "#AADD00" : "rgba(255,255,255,0.3)",
        }}/>
      ))}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, display, onChange, hint, tablet }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void; hint?: string; tablet?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className={`font-semibold text-gray-600 ${tablet ? "text-base" : "text-sm"}`}
          style={{ fontFamily: "var(--font-heading)" }}>{label}</span>
        <span className={`font-bold ${tablet ? "text-3xl" : "text-2xl"}`}
          style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}/>
      {hint && <p className={`text-gray-400 ${tablet ? "text-sm" : "text-xs"}`}>{hint}</p>}
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
        style={{ color: lime ? "#AADD00" : "#3D5278", fontFamily: "var(--font-body)" }}>{value}</div>
    </div>
  );
}

function SettingsInput({ label, value, onChange, suffix, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="number" value={value} step={step} min={0}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) onChange(v); }}
          className="w-24 border-2 rounded-xl px-2 py-1.5 text-right font-semibold text-sm focus:outline-none"
          style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
        {suffix && <span className="text-xs text-gray-400 w-5">{suffix}</span>}
      </div>
    </div>
  );
}

function SettingsInputHint({ label, value, onChange, suffix, step = 1, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; hint?: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 flex-1">{label}</span>
        <div className="flex items-center gap-1.5">
          <input type="number" value={value} step={step} min={0}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) onChange(v); }}
            className="w-24 border-2 rounded-xl px-2 py-1.5 text-right font-semibold text-sm focus:outline-none"
            style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
          {suffix && <span className="text-xs text-gray-400 w-5">{suffix}</span>}
        </div>
      </div>
      {hint && <div className="text-xs mt-1 font-semibold" style={{ color: "#AADD00" }}>↳ {hint}</div>}
    </div>
  );
}

// ─── Print-Report Komponente ──────────────────────────────────────────────────

function PrintReport({ termine, mix, gehalt, raumkosten, investition, optionName,
  optionModule, basis, variJ2, variJ3, d1, d2, printedAt, kundenName, velogicLiz }: {
  termine: number; mix: number; gehalt: number; raumkosten: number;
  investition: number; optionName: string;
  optionModule: Produkt[];
  basis: ReturnType<typeof berechne>;
  variJ2: ReturnType<typeof berechne>;
  variJ3: ReturnType<typeof berechne>;
  d1: DL; d2: DL;
  printedAt: Date; kundenName: string;
  velogicLiz: { jahr1: number; jahrFolge: number };
}) {
  const navy = "#3D5278";
  const lime = "#AADD00";
  const sH: React.CSSProperties = { fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1, color: navy, marginBottom: 10, marginTop: 0 };
  const row = (label: string, value: string, bold = false, accent = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0",
      borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: accent ? navy : "#1f2937" }}>{value}</span>
    </div>
  );

  const lizenzTotal3J = velogicLiz.jahr1 + velogicLiz.jahrFolge * 2;
  const abschreibung  = investition / ANNAHMEN.abschreibungMonate;
  const technik       = ANNAHMEN.lizenzMonat + ANNAHMEN.ersatzfolieGesamt / ANNAHMEN.abschreibungMonate;
  const mitarbeiter   = gehalt * (1 + ANNAHMEN.lohnNebenkosten) *
    ((termine * ANNAHMEN.arbeitszeitTermin) / ANNAHMEN.vollzeitStunden);
  const raum          = raumkosten * ANNAHMEN.raumQm;
  const isco          = ANNAHMEN.iscoJahr / 12;
  const roiJahr3      = investition > 0
    ? ((basis.ueberschuss + variJ2.ueberschuss + variJ3.ueberschuss) * 12 / investition) * 100 : 0;

  return (
    <div id="print-report" style={{ display: "none" }}>
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1f2937", background: "white",
      padding: "36px 44px", maxWidth: 780, margin: "0 auto", fontSize: 13 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        paddingBottom: 16, marginBottom: 20, borderBottom: `4px solid ${lime}` }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: navy, letterSpacing: 2,
            textTransform: "uppercase" }}>gebioMized</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, letterSpacing: 1 }}>
            Bikefitting-Technologie · SnM gebioMized GmbH
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: navy }}>Rentabilitätsanalyse</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            {printedAt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Anrede */}
      {kundenName && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: "#1f2937" }}>
            Rentabilitätsanalyse für <strong style={{ color: navy }}>{kundenName}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
            Individuelle Berechnung auf Basis Ihrer Angaben
          </div>
        </div>
      )}

      {/* 2-Spalten: Investition + Kosten */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 20 }}>
        <div>
          <h3 style={sH}>Investitionsübersicht — {optionName}</h3>
          {optionModule.map(m => (
            <div key={m.id} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#374151" }}>{m.name}</span>
                <span style={{ fontWeight: 600 }}>{m.preis.toLocaleString("de-DE")} €</span>
              </div>
              {(m.lizenzJahr1 ?? 0) > 0 && (
                <div style={{ fontSize: 11, color: "#d97706", marginTop: 1 }}>
                  Lizenz: {m.lizenzJahr1!.toLocaleString("de-DE")} € / Jahr 1
                  &nbsp;·&nbsp; ab Jahr 2: {m.lizenzJahrFolge!.toLocaleString("de-DE")} € / Jahr
                </div>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
            paddingTop: 8, borderTop: `2px solid ${navy}`, fontWeight: 700, color: navy }}>
            <span>Hardware gesamt</span>
            <span>{investition.toLocaleString("de-DE")} €</span>
          </div>
          {lizenzTotal3J > 0 && (
            <div style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>
              Lizenzkosten 3 Jahre gesamt: ca. {lizenzTotal3J.toLocaleString("de-DE")} €
            </div>
          )}
        </div>
        <div>
          <h3 style={sH}>Monatliche Kosten (Jahr 1)</h3>
          {row("Abschreibung Hardware", `${fmt(abschreibung, 0)} €`)}
          {row("Technik & Lizenz (gebioM)", `${fmt(technik, 0)} €`)}
          {velogicLiz.jahr1 > 0 && row("Velogic-Lizenz (Jahr 1)", `${fmt(velogicLiz.jahr1 / 12, 0)} €`)}
          {row("Mitarbeiter (anteilig)", `${fmt(mitarbeiter, 0)} €`)}
          {row("Raum", `${fmt(raum, 0)} €`)}
          {row("ISCO / Weiterbildung", `${fmt(isco, 0)} €`)}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
            paddingTop: 8, borderTop: `2px solid ${navy}`, fontWeight: 700, color: navy }}>
            <span>Kosten gesamt</span>
            <span>{fmt(basis.ausgaben, 0)} €</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", margin: "18px 0" }}/>

      {/* 2-Spalten: Einnahmen + Ergebnis */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 20 }}>
        <div>
          <h3 style={sH}>Monatliche Einnahmen</h3>
          {row(`${d1.name} (${Math.round((1-mix)*100)} %)`,
            `${fmt(basis.umsatzTermin, 2)} € / Termin (Ø)`)}
          {row("Termine / Monat", `${termine}`)}
          {row("Einnahmen gesamt", `${fmt(basis.einnahmen, 0)} €`, true, true)}
        </div>
        <div>
          <h3 style={sH}>Monatliches Ergebnis</h3>
          {row("Einnahmen", `${fmt(basis.einnahmen, 0)} €`)}
          {row("Kosten", `– ${fmt(basis.ausgaben, 0)} €`)}
          {row("Überschuss / Monat", `${fmt(basis.ueberschuss, 0)} €`, true, basis.ueberschuss > 0)}
          {row("Jahresgewinn (Jahr 1)", `${fmt(basis.ueberschuss * 12, 0)} €`, true)}
          {row("Break-Even", basis.breakEvenMonate < Infinity
            ? `${fmt(basis.breakEvenMonate, 1)} Monate` : "Termine erhöhen")}
        </div>
      </div>

      {/* Highlight-Banner */}
      <div style={{ background: navy, borderRadius: 10, padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Jahresgewinn Jahr 1</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: lime, lineHeight: 1 }}>
            {fmt(basis.ueberschuss * 12)} €
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.15)" }}/>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Break-Even</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>
            {basis.breakEvenMonate < Infinity ? `${fmt(basis.breakEvenMonate, 1)} Mo.` : "–"}
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.15)" }}/>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>ROI über 3 Jahre</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1 }}>
            {fmt(roiJahr3, 0)} %
          </div>
          <div style={{ fontSize: 11, color: lime }}>
            Gewinn 3 J.: {fmt((basis.ueberschuss + variJ2.ueberschuss + variJ3.ueberschuss) * 12)} €
          </div>
        </div>
      </div>

      {/* 3-Jahres-Prognose */}
      <h3 style={sH}>3-Jahres-Prognose (+10 % Terminwachstum p.a.)</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f4f6f9" }}>
            {["Jahr", "Termine / Mo.", "Einnahmen p.a.", "Kosten p.a.", "Gewinn p.a."].map(h => (
              <th key={h} style={{ textAlign: h === "Jahr" ? "left" : "right",
                padding: "8px 10px", color: navy, fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { j: basis,  t: termine,                    label: "Jahr 1" },
            { j: variJ2, t: Math.round(termine * 1.10), label: "Jahr 2 (+10 %)" },
            { j: variJ3, t: Math.round(termine * 1.20), label: "Jahr 3 (+20 %)" },
          ].map(({ j, t, label }, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f0f0f0",
              background: i % 2 === 0 ? "white" : "#fafafa" }}>
              <td style={{ padding: "7px 10px", fontWeight: 600 }}>{label}</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>{t}</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>{fmt(j.einnahmen * 12)} €</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>{fmt(j.ausgaben * 12)} €</td>
              <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 700,
                color: j.ueberschuss >= 0 ? navy : "#ef4444" }}>
                {fmt(j.ueberschuss * 12)} €
              </td>
            </tr>
          ))}
          <tr style={{ background: navy }}>
            <td colSpan={4} style={{ padding: "8px 10px", color: "white", fontWeight: 700 }}>
              Gesamt 3 Jahre
            </td>
            <td style={{ textAlign: "right", padding: "8px 10px",
              fontWeight: 900, color: lime, fontSize: 14 }}>
              {fmt((basis.ueberschuss + variJ2.ueberschuss + variJ3.ueberschuss) * 12)} €
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12,
        display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.6 }}>
          Alle Beträge netto (ohne MwSt.) · Abschreibung linear über 36 Monate
          · Sattel-Marge abzgl. 19 % MwSt. · Unverbindliche Modellrechnung
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: navy }}>gebioMized</div>
          <div>www.gebioMized.com</div>
        </div>
      </div>

    </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function MobileCalculator() {
  const [screen, setScreen]           = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTablet, setIsTablet]       = useState(false);
  const [printedAt, setPrintedAt]     = useState(() => new Date());
  const [kundenName, setKundenName]   = useState("");

  // Eingaben
  const [termine, setTermine]         = useState(20);
  const [mix, setMix]                 = useState(0.5);
  const [gehalt, setGehalt]           = useState(2600);
  const [raumkosten, setRaumkosten]   = useState(14);
  const [optionIdx, setOptionIdx]     = useState<number | null>(0);
  const [investition, setInvestition] = useState(2490);
  const [investInput, setInvestInput] = useState("2.490");

  // Settings
  const [calcMode, setCalcMode]   = useState<"monat" | "termin">("monat");
  const [d1, setD1]               = useState<DL>(DEFAULT_D1);
  const [d2, setD2]               = useState<DL>(DEFAULT_D2);
  const [produkte, setProdukte]   = useState<Produkt[]>(DEFAULT_PRODUKTE);
  const [optionen, setOptionen]   = useState<Option[]>(DEFAULT_OPTIONEN);

  // Tablet-Erkennung
  useEffect(() => {
    function check() { setIsTablet(window.innerWidth >= 640); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Tablet-Größen
  const sz = isTablet
    ? { h: "text-2xl", p: "text-sm", px: "px-8", py: "py-6", gap: "space-y-10",
        btn: "py-5 text-lg", card: "p-6", label: "text-base" }
    : { h: "text-xl",  p: "text-xs", px: "px-5", py: "py-4", gap: "space-y-8",
        btn: "py-3.5 text-base", card: "p-4", label: "text-sm" };

  function navigate(delta: 1 | -1) {
    setScreen(s => Math.max(0, Math.min(TOTAL_SCREENS - 1, s + delta)));
  }

  function handleOption(idx: number) {
    setOptionIdx(idx);
    const preis = getOptionPreis(optionen[idx], produkte);
    setInvestition(preis);
    setInvestInput(preis.toLocaleString("de-DE"));
  }

  function handleInvestInput(raw: string) {
    setInvestInput(raw);
    setOptionIdx(null);
    const parsed = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 500) setInvestition(parsed);
  }

  function handlePrint() {
    setPrintedAt(new Date());
    setTimeout(() => window.print(), 50);
  }

  // Velogic-Lizenzen (Jahr 1 vs. Folgejahre)
  const velogicLiz = useMemo(
    () => getVelogicLizenzen(optionIdx, optionen, produkte),
    [optionIdx, optionen, produkte]
  );

  // Berechnungen — Jahr 1 mit lizenzJahr1, Folgejahre mit lizenzJahrFolge
  const basis      = useMemo(() => berechne(investition, termine,        gehalt, raumkosten, mix, d1, d2, velogicLiz.jahr1    / 12), [investition, termine, gehalt, raumkosten, mix, d1, d2, velogicLiz]);
  const starrFolge = useMemo(() => berechne(investition, termine,        gehalt, raumkosten, mix, d1, d2, velogicLiz.jahrFolge / 12), [investition, termine, gehalt, raumkosten, mix, d1, d2, velogicLiz]);
  const variJ2     = useMemo(() => berechne(investition, termine * 1.10, gehalt, raumkosten, mix, d1, d2, velogicLiz.jahrFolge / 12), [investition, termine, gehalt, raumkosten, mix, d1, d2, velogicLiz]);
  const variJ3     = useMemo(() => berechne(investition, termine * 1.20, gehalt, raumkosten, mix, d1, d2, velogicLiz.jahrFolge / 12), [investition, termine, gehalt, raumkosten, mix, d1, d2, velogicLiz]);
  // starr = alias für basis (Jahr 1, gleiche Termine) — wird für Abwärtskompatibilität behalten
  const starr = basis;

  function anzeige(monatsWert: number) {
    if (calcMode === "monat") return `${fmt(monatsWert)} €`;
    return `${fmt(termine > 0 ? monatsWert / termine : 0, 2)} €`;
  }
  const modeLabel = calcMode === "monat" ? "/ Monat" : "/ Termin";

  const currentOptionName = optionIdx !== null ? optionen[optionIdx].name : "Eigene Eingabe";

  // ── Settings-Panel ──────────────────────────────────────────────────────────

  const settingsPanel = settingsOpen && (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}/>
      <div className={`fixed bottom-0 left-0 right-0 z-50 mx-auto rounded-t-3xl overflow-hidden ${isTablet ? "max-w-2xl" : "max-w-md"}`}
        style={{ background: "white", maxHeight: "88vh" }}>
        {/* Handle + Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4"/>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Einstellungen
            </h3>
            <button onClick={() => setSettingsOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400"
              style={{ background: "#f4f6f9" }}>✕</button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(88vh - 80px)" }}>
          <div className="px-5 py-4 space-y-6">

            {/* Ansicht */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Ansicht</div>
              <div className="flex rounded-xl overflow-hidden border-2" style={{ borderColor: "#e5e7eb" }}>
                {(["monat", "termin"] as const).map(mode => (
                  <button key={mode} onClick={() => setCalcMode(mode)}
                    className="flex-1 py-3 text-sm font-semibold transition-all"
                    style={{ background: calcMode === mode ? "#3D5278" : "white",
                      color: calcMode === mode ? "white" : "#6b7280", fontFamily: "var(--font-body)" }}>
                    {mode === "monat" ? "pro Monat" : "pro Termin"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {calcMode === "monat" ? "Alle Ergebnisse als monatliche Summe" : "Alle Ergebnisse je Einzeltermin"}
              </p>
            </div>

            {/* D1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "#AADD00" }}/>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                  {d1.name}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  Ø {fmt(d1.dlNetto + (d1.sattelAnteil / 100) * sattelMarge(d1.sattelUvp, d1.sattelEK), 2)} € / Termin
                </span>
              </div>
              <div className="rounded-2xl border border-gray-100 px-4 py-1 divide-y divide-gray-50">
                <SettingsInput label="DL-Preis netto" value={d1.dlNetto} onChange={v => setD1(p => ({ ...p, dlNetto: v }))} suffix="€" step={0.5}/>
                <SettingsInput label="Sattelanteil" value={d1.sattelAnteil} onChange={v => setD1(p => ({ ...p, sattelAnteil: Math.min(100, v) }))} suffix="%" step={5}/>
                <SettingsInput label="UVP Sattel (brutto)" value={d1.sattelUvp} onChange={v => setD1(p => ({ ...p, sattelUvp: v }))} suffix="€" step={1}/>
                <SettingsInputHint label="Händler EK (netto, B2B)" value={d1.sattelEK} onChange={v => setD1(p => ({ ...p, sattelEK: v }))} suffix="€" step={1}
                  hint={`Netto-Marge: ${fmt(sattelMarge(d1.sattelUvp, d1.sattelEK), 2)} € (UVP ${fmt(d1.sattelUvp / 1.19, 2)} € netto − EK ${fmt(d1.sattelEK, 2)} €)`}/>
              </div>
            </div>

            {/* D2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "#3D5278" }}/>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                  {d2.name}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  Ø {fmt(d2.dlNetto + (d2.sattelAnteil / 100) * sattelMarge(d2.sattelUvp, d2.sattelEK), 2)} € / Termin
                </span>
              </div>
              <div className="rounded-2xl border border-gray-100 px-4 py-1 divide-y divide-gray-50">
                <SettingsInput label="DL-Preis netto" value={d2.dlNetto} onChange={v => setD2(p => ({ ...p, dlNetto: v }))} suffix="€" step={0.5}/>
                <SettingsInput label="Sattelanteil" value={d2.sattelAnteil} onChange={v => setD2(p => ({ ...p, sattelAnteil: Math.min(100, v) }))} suffix="%" step={5}/>
                <SettingsInput label="UVP Sattel (brutto)" value={d2.sattelUvp} onChange={v => setD2(p => ({ ...p, sattelUvp: v }))} suffix="€" step={1}/>
                <SettingsInputHint label="Händler EK (netto, B2B)" value={d2.sattelEK} onChange={v => setD2(p => ({ ...p, sattelEK: v }))} suffix="€" step={1}
                  hint={`Netto-Marge: ${fmt(sattelMarge(d2.sattelUvp, d2.sattelEK), 2)} € (UVP ${fmt(d2.sattelUvp / 1.19, 2)} € netto − EK ${fmt(d2.sattelEK, 2)} €)`}/>
              </div>
            </div>

            {/* Produktkatalog */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Produktkatalog Messtechnik</div>
              <div className="rounded-2xl border border-gray-100 px-4 py-1 divide-y divide-gray-50">
                {produkte.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 py-2">
                    <input type="text" value={p.name}
                      onChange={e => setProdukte(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none"
                      style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
                    <input type="number" value={p.preis} min={0} step={10}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 0) {
                          const next = produkte.map((x, j) => j === i ? { ...x, preis: v } : x);
                          setProdukte(next);
                          if (optionIdx !== null) {
                            const np = getOptionPreis(optionen[optionIdx], next);
                            setInvestition(np);
                            setInvestInput(np.toLocaleString("de-DE"));
                          }
                        }
                      }}
                      className="w-20 border-2 rounded-xl px-2 py-1 text-right font-semibold text-sm focus:outline-none"
                      style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
                    <span className="text-xs text-gray-400">€</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optionen konfigurieren */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Optionen konfigurieren</div>
              {optionen.map((opt, oi) => (
                <div key={oi} className="rounded-2xl border border-gray-100 px-4 py-3 mb-3">
                  <input type="text" value={opt.name}
                    onChange={e => setOptionen(prev => prev.map((x, j) => j === oi ? { ...x, name: e.target.value } : x))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm font-semibold mb-3 focus:outline-none"
                    style={{ borderColor: "#e5e7eb", color: "#3D5278", fontFamily: "var(--font-heading)" }}/>
                  <div className="space-y-2">
                    {produkte.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox"
                          checked={opt.produktIds.includes(p.id)}
                          onChange={e => {
                            const next = optionen.map((x, j) => j !== oi ? x : {
                              ...x,
                              produktIds: e.target.checked
                                ? [...x.produktIds, p.id]
                                : x.produktIds.filter(id => id !== p.id),
                            });
                            setOptionen(next);
                            if (optionIdx === oi) {
                              const np = getOptionPreis(next[oi], produkte);
                              setInvestition(np);
                              setInvestInput(np.toLocaleString("de-DE"));
                            }
                          }}
                          className="rounded"
                          style={{ accentColor: "#AADD00" }}/>
                        <span className="flex-1">{p.name}</span>
                        <span className="text-gray-400 text-xs">{p.preis.toLocaleString("de-DE")} €</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs font-bold mt-3 text-right" style={{ color: "#3D5278" }}>
                    Gesamt: {getOptionPreis(opt, produkte).toLocaleString("de-DE")} €
                  </div>
                </div>
              ))}
            </div>

            {/* Reset */}
            <button onClick={() => {
              setD1(DEFAULT_D1); setD2(DEFAULT_D2); setCalcMode("monat");
              setProdukte(DEFAULT_PRODUKTE); setOptionen(DEFAULT_OPTIONEN);
              setOptionIdx(0);
              const rp = getOptionPreis(DEFAULT_OPTIONEN[0], DEFAULT_PRODUKTE);
              setInvestition(rp); setInvestInput(rp.toLocaleString("de-DE"));
            }} className="w-full py-3 rounded-2xl border-2 text-sm font-semibold"
              style={{ borderColor: "#e5e7eb", color: "#9ca3af", fontFamily: "var(--font-body)" }}>
              Standardwerte zurücksetzen
            </button>
            <div className="h-4"/>
          </div>
        </div>
      </div>
    </>
  );

  // ── Screens ─────────────────────────────────────────────────────────────────

  const screens = [

    // ── 0: Start ───────────────────────────────────────────────────────────────
    <div key="start" className={`flex flex-col items-center justify-center h-full text-center gap-8 ${isTablet ? "px-16" : "px-8"}`}>
      <div className="space-y-3">
        <div className={`inline-flex items-center justify-center rounded-2xl mb-2 ${isTablet ? "w-28 h-28" : "w-20 h-20"}`}
          style={{ background: "rgba(170,221,0,0.15)" }}>
          <span className={`font-black ${isTablet ? "text-6xl" : "text-4xl"}`}
            style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>g</span>
        </div>
        <div>
          <div className={`font-semibold tracking-widest uppercase mb-1 ${isTablet ? "text-base" : "text-sm"}`}
            style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>gebioMized</div>
          <h1 className={`font-bold text-white leading-tight ${isTablet ? "text-4xl" : "text-3xl"}`}
            style={{ fontFamily: "var(--font-heading)" }}>
            Rentabilitäts&shy;rechner
          </h1>
        </div>
        <p className={`text-white/60 leading-relaxed ${isTablet ? "text-base" : "text-sm"}`}
          style={{ fontFamily: "var(--font-body)" }}>
          Berechne in 4 Schritten, wie schnell sich deine Bikefitting-Investition auszahlt.
        </p>
      </div>
      <button onClick={() => navigate(1)}
        className={`w-full rounded-2xl font-bold transition-all active:scale-95 ${sz.btn}`}
        style={{ background: "#AADD00", color: "#3D5278", fontFamily: "var(--font-heading)" }}>
        Jetzt berechnen →
      </button>
    </div>,

    // ── 1: Termine + Mix ───────────────────────────────────────────────────────
    <div key="s1" className="flex flex-col h-full">
      <div className={`${sz.px} pt-4 pb-2`}>
        <h2 className={`font-bold ${sz.h}`} style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
          Termine & Leistungs-Mix
        </h2>
        <p className={`text-gray-400 mt-1 ${sz.p}`}>Wie viele Termine planst du pro Monat?</p>
      </div>
      <div className={`flex-1 overflow-y-auto ${sz.px} py-4 ${sz.gap}`}>
        <SliderRow label="Termine / Monat" value={termine} min={5} max={80} step={5}
          display={`${termine}`} onChange={setTermine}
          hint="Realistisch: 20–40 Termine/Monat" tablet={isTablet}/>

        <div className="space-y-3">
          <span className={`font-semibold text-gray-600 ${sz.label}`}
            style={{ fontFamily: "var(--font-heading)" }}>Leistungs-Mix</span>
          <div className={`flex justify-between text-gray-500 mt-2 ${sz.p}`}>
            <span>{d1.name}<br/><span className="text-gray-400">{d1.uvp}</span></span>
            <span className="text-right">{d2.name}<br/><span className="text-gray-400">{d2.uvp}</span></span>
          </div>
          <input type="range" min={0} max={1} step={0.1} value={mix}
            onChange={e => setMix(Number(e.target.value))}/>
          <div className="flex justify-between">
            <span className={`font-bold ${isTablet ? "text-lg" : "text-base"}`}
              style={{ color: "#3D5278" }}>{Math.round((1 - mix) * 100)} %</span>
            <span className={`text-gray-400 self-center ${sz.p}`}>
              Ø {fmt(basis.umsatzTermin, 2)} € / Termin
            </span>
            <span className={`font-bold ${isTablet ? "text-lg" : "text-base"}`}
              style={{ color: "#3D5278" }}>{Math.round(mix * 100)} %</span>
          </div>
        </div>

        <div className={`rounded-2xl ${sz.card}`} style={{ background: "#f4f6f9" }}>
          <div className={`text-gray-500 mb-1 ${sz.p}`}>Einnahmen {modeLabel}</div>
          <div className={`font-bold ${isTablet ? "text-3xl" : "text-2xl"}`}
            style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
            {anzeige(basis.einnahmen)}
          </div>
          <div className={`text-gray-400 mt-0.5 ${sz.p}`}>
            {calcMode === "monat"
              ? `${termine} Termine × ${fmt(basis.umsatzTermin, 2)} €`
              : `${fmt(basis.umsatzTermin, 2)} € Umsatz je Termin`}
          </div>
        </div>
      </div>
    </div>,

    // ── 2: Mitarbeiter + Raum ──────────────────────────────────────────────────
    <div key="s2" className="flex flex-col h-full">
      <div className={`${sz.px} pt-4 pb-2`}>
        <h2 className={`font-bold ${sz.h}`} style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
          Mitarbeiter & Raum
        </h2>
        <p className={`text-gray-400 mt-1 ${sz.p}`}>Deine laufenden Kostenblöcke</p>
      </div>
      <div className={`flex-1 overflow-y-auto ${sz.px} py-4 ${sz.gap}`}>
        <SliderRow label="Bruttogehalt / Monat" value={gehalt} min={2000} max={4500} step={100}
          display={`${gehalt.toLocaleString("de-DE")} €`} onChange={setGehalt}
          hint="Nur anteiliger Zeitaufwand für Fittings wird berechnet" tablet={isTablet}/>
        <SliderRow label="Raummiete / m²" value={raumkosten} min={8} max={30} step={1}
          display={`${raumkosten} €`} onChange={setRaumkosten}
          hint="Annahme: 10 m² Messfläche" tablet={isTablet}/>

        <div className={`rounded-2xl ${sz.card}`} style={{ background: "#f4f6f9" }}>
          <div className={`text-gray-500 mb-2 ${sz.p}`}>Kosten {modeLabel}</div>
          <div className={`space-y-1.5 ${isTablet ? "text-base" : "text-sm"}`}>
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

    // ── 3: Investition Technologie ─────────────────────────────────────────────
    <div key="s3" className="flex flex-col h-full">
      <div className={`${sz.px} pt-4 pb-2`}>
        <h2 className={`font-bold ${sz.h}`} style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
          Investition Technologie
        </h2>
        <p className={`text-gray-400 mt-1 ${sz.p}`}>Wähle eine Option oder gib einen eigenen Betrag ein</p>
      </div>
      <div className={`flex-1 overflow-y-auto ${sz.px} py-4 space-y-4`}>

        {/* Options-Buttons */}
        <div className="grid grid-cols-3 gap-3">
          {optionen.map((opt, i) => {
            const preis = getOptionPreis(opt, produkte);
            return (
              <button key={i} onClick={() => handleOption(i)}
                className={`rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center gap-1 ${isTablet ? "py-5" : "py-4"}`}
                style={{ borderColor: optionIdx === i ? "#3D5278" : "#e5e7eb",
                  background: optionIdx === i ? "#3D5278" : "white" }}>
                <span className="text-xs font-bold"
                  style={{ color: optionIdx === i ? "#AADD00" : "#9ca3af", fontFamily: "var(--font-heading)" }}>
                  {opt.name}
                </span>
                <span className={`font-bold leading-tight ${isTablet ? "text-lg" : "text-base"}`}
                  style={{ color: optionIdx === i ? "white" : "#1f2937", fontFamily: "var(--font-body)" }}>
                  {preis > 0 ? preis.toLocaleString("de-DE") : "–"} €
                </span>
              </button>
            );
          })}
        </div>

        {/* Enthaltene Module */}
        {optionIdx !== null && (() => {
          const module = getOptionModule(optionen[optionIdx], produkte);
          if (module.length === 0) return null;
          return (
            <div className="rounded-2xl border-2 px-4 py-3 bg-white"
              style={{ borderColor: "#e8edf5" }}>
              <div className="text-xs font-bold uppercase tracking-wide mb-2"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Enthaltene Module
              </div>
              <ul className="space-y-1.5">
                {module.map(m => (
                  <li key={m.id} className={`text-gray-700 ${isTablet ? "text-base" : "text-sm"}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full flex-none"
                        style={{ background: "#AADD00" }}/>
                      {m.name}
                      <span className="ml-auto text-xs text-gray-400">
                        {m.preis.toLocaleString("de-DE")} €
                      </span>
                    </div>
                    {(m.lizenzJahr1 ?? 0) > 0 && (
                      <div className="ml-3.5 mt-0.5 text-xs font-medium" style={{ color: "#e07b00" }}>
                        + Lizenz Jahr 1: {m.lizenzJahr1!.toLocaleString("de-DE")} € · ab Jahr 2: {m.lizenzJahrFolge!.toLocaleString("de-DE")} € / Jahr
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Eigener Betrag */}
        <div>
          <div className={`font-semibold text-gray-500 uppercase tracking-wide mb-2 ${sz.p}`}
            style={{ fontFamily: "var(--font-heading)" }}>Eigener Betrag</div>
          <div className="flex items-center gap-2">
            <input type="text" value={investInput}
              onChange={e => handleInvestInput(e.target.value)}
              onFocus={() => setOptionIdx(null)}
              className={`flex-1 border-2 rounded-xl px-4 text-right font-bold focus:outline-none ${isTablet ? "py-4 text-2xl" : "py-3 text-xl"}`}
              style={{ borderColor: optionIdx === null ? "#3D5278" : "#e5e7eb",
                color: "#1f2937", fontFamily: "var(--font-body)" }}
              placeholder="z. B. 6.500"/>
            <span className="text-gray-400 font-semibold text-lg">€</span>
          </div>
        </div>

        <div className={`rounded-2xl ${sz.card}`} style={{ background: "#f4f6f9" }}>
          <div className={`text-gray-500 mb-1 ${sz.p}`}>Abschreibung (36 Monate)</div>
          <div className={`font-bold ${isTablet ? "text-2xl" : "text-xl"}`}
            style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
            {fmt(investition / 36, 2)} € / Monat
          </div>
          <div className={`text-gray-400 mt-0.5 ${sz.p}`}>linear über 3 Jahre</div>
        </div>
      </div>
    </div>,

    // ── 4: Auswertung ──────────────────────────────────────────────────────────
    <div key="s4" className="flex flex-col h-full">
      <div className={`${sz.px} pt-4 pb-2`}>
        <h2 className={`font-bold ${sz.h}`} style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
          Auswertung
        </h2>
        <p className={`text-gray-400 mt-1 ${sz.p}`}>
          {calcMode === "monat" ? "Monatliche Rentabilität auf einen Blick" : "Rentabilität je Termin"}
        </p>
      </div>
      <div className={`flex-1 overflow-y-auto ${sz.px} py-2 space-y-4`}>
        {/* Highlight-Card */}
        <div className={`rounded-2xl text-white ${sz.card}`} style={{ background: "#3D5278" }}>
          <div className={`uppercase tracking-wide mb-1 opacity-70 ${sz.p}`}>Überschuss {modeLabel}</div>
          <div className={`font-black leading-tight ${isTablet ? "text-5xl" : "text-4xl"}`}
            style={{ color: "#AADD00", fontFamily: "var(--font-body)" }}>
            {anzeige(basis.ueberschuss)}
          </div>
          <div className={`mt-2 opacity-70 ${isTablet ? "text-base" : "text-sm"}`}>
            {basis.ueberschuss > 0
              ? `Amortisation in ${fmt(basis.breakEvenMonate, 1)} Monaten`
              : "Termine erhöhen für positive Rentabilität"}
          </div>
        </div>

        {/* Detail-Liste */}
        <div className="bg-white rounded-2xl px-4 shadow-sm">
          <ResultRow label={`Einnahmen ${modeLabel}`} value={anzeige(basis.einnahmen)}
            sub={calcMode === "monat"
              ? `${termine} Termine × ${fmt(basis.umsatzTermin, 2)} €`
              : `${fmt(basis.umsatzTermin, 2)} € Umsatz / Termin`}/>
          <ResultRow label={`Kosten ${modeLabel}`} value={anzeige(basis.ausgaben)}
            sub="inkl. Abschreibung, Gehalt, Raum"/>
          <ResultRow label="Amortisation Investition"
            value={basis.breakEvenMonate < Infinity ? `${fmt(basis.breakEvenMonate, 1)} Monate` : "–"}
            sub="Zeitraum bis Investition zurückgeflossen"/>
          <ResultRow label="Kostendeckung ab"
            value={basis.breakEvenTermine < Infinity ? `${fmt(basis.breakEvenTermine, 0)} Termine / Mo.` : "–"}
            sub={`Du planst ${termine} Termine → ${termine >= Math.ceil(basis.breakEvenTermine) ? "✓ rentabel" : "noch nicht kostendeckend"}`}/>
        </div>

        {/* Jahreskennzahl */}
        <div className={`rounded-2xl ${sz.card}`} style={{ background: "#f4f6f9" }}>
          <div className={`text-gray-500 mb-3 font-semibold uppercase tracking-wide ${sz.p}`}
            style={{ fontFamily: "var(--font-heading)" }}>Jahr 1 auf einen Blick</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Jahresgewinn",  `${fmt(basis.ueberschuss * 12)} €`],
              ["ROI (Jahr 1)",  `${fmt(investition > 0 ? (basis.ueberschuss * 12 / investition) * 100 : 0, 0)} %`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl p-3 bg-white">
                <div className="text-xs text-gray-400 mb-1">{k}</div>
                <div className={`font-bold ${isTablet ? "text-xl" : "text-lg"}`}
                  style={{ color: "#3D5278" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Button */}
        <button onClick={handlePrint}
          className={`w-full rounded-2xl border-2 font-semibold flex items-center justify-center gap-2 ${isTablet ? "py-4 text-base" : "py-3 text-sm"}`}
          style={{ borderColor: "#3D5278", color: "#3D5278", fontFamily: "var(--font-body)" }}>
          <PrintIcon/> Als PDF speichern
        </button>
      </div>
    </div>,

    // ── 5: 3-Jahres-Prognose ───────────────────────────────────────────────────
    <div key="s5" className="flex flex-col h-full">
      <div className={`${sz.px} pt-4 pb-2`}>
        <h2 className={`font-bold ${sz.h}`} style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
          3-Jahres-Prognose
        </h2>
        <p className={`text-gray-400 mt-1 ${sz.p}`}>Konstant vs. Wachstum (+10 % / +20 % Termine)</p>
      </div>
      <div className={`flex-1 overflow-y-auto ${sz.px} py-3 space-y-4`}>

        {/* Starr */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#e8edf5" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#3D5278" }}/>
            <span className={`font-bold ${sz.p === "text-xs" ? "text-sm" : "text-base"}`}
              style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Starr — {termine} Termine / Monat konstant
            </span>
          </div>
          <div className="bg-white px-4 divide-y divide-gray-100">
            {([basis, starrFolge, starrFolge] as const).map((j, i) => (
              <div key={i} className="py-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-gray-700 ${isTablet ? "text-base" : "text-sm"}`}>
                      Jahr {i + 1}
                    </span>
                    {i > 0 && velogicLiz.jahrFolge < velogicLiz.jahr1 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(170,221,0,0.15)", color: "#3D5278" }}>
                        Lizenz ↓
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{termine} Termine / Mo. · {fmt(j.einnahmen * 12)} € Einnahmen</div>
                </div>
                <div className={`font-bold ${isTablet ? "text-xl" : "text-lg"}`}
                  style={{ color: "#3D5278" }}>{fmt(j.ueberschuss * 12)} €</div>
              </div>
            ))}
            <div className="py-3 flex justify-between items-center">
              <span className={`font-bold text-gray-700 ${isTablet ? "text-base" : "text-sm"}`}>Gesamt 3 Jahre</span>
              <span className={`font-bold ${isTablet ? "text-xl" : "text-lg"}`}
                style={{ color: "#3D5278" }}>
                {fmt((basis.ueberschuss + starrFolge.ueberschuss * 2) * 12)} €
              </span>
            </div>
          </div>
        </div>

        {/* Variabel */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#3D5278" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#AADD00" }}/>
            <span className={`font-bold text-white ${sz.p === "text-xs" ? "text-sm" : "text-base"}`}
              style={{ fontFamily: "var(--font-heading)" }}>
              Wachstum · +10 % J2 · +20 % J3
            </span>
          </div>
          <div className="bg-white px-4 divide-y divide-gray-100">
            {[
              { j: starr,  t: termine,                    tag: null    },
              { j: variJ2, t: Math.round(termine * 1.10), tag: "+10 %" },
              { j: variJ3, t: Math.round(termine * 1.20), tag: "+20 %" },
            ].map(({ j, t, tag }, i) => (
              <div key={i} className="py-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-gray-700 ${isTablet ? "text-base" : "text-sm"}`}>
                      Jahr {i + 1}
                    </span>
                    {tag && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(170,221,0,0.15)", color: "#3D5278" }}>{tag}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{t} Termine / Mo. · {fmt(j.einnahmen * 12)} € Einnahmen</div>
                </div>
                <div className={`font-bold ${isTablet ? "text-xl" : "text-lg"}`}
                  style={{ color: "#3D5278" }}>{fmt(j.ueberschuss * 12)} €</div>
              </div>
            ))}
            <div className="py-3 flex justify-between items-center">
              <span className={`font-bold text-gray-700 ${isTablet ? "text-base" : "text-sm"}`}>Gesamt 3 Jahre</span>
              <div className="text-right">
                <div className={`font-bold ${isTablet ? "text-xl" : "text-lg"}`} style={{ color: "#AADD00" }}>
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

        {/* Kundenname + PDF-Button */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Kundenname (optional, erscheint im Report)"
            value={kundenName}
            onChange={e => setKundenName(e.target.value)}
            className={`w-full border-2 rounded-2xl px-4 font-semibold focus:outline-none ${isTablet ? "py-3.5 text-base" : "py-3 text-sm"}`}
            style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
          <button onClick={handlePrint}
            className={`w-full rounded-2xl font-semibold flex items-center justify-center gap-2 ${isTablet ? "py-4 text-base" : "py-3 text-sm"}`}
            style={{ background: "#3D5278", color: "white", fontFamily: "var(--font-body)" }}>
            <PrintIcon/> Als PDF speichern
          </button>
        </div>
        <button onClick={() => setScreen(0)}
          className={`w-full rounded-2xl border-2 font-semibold ${isTablet ? "py-4 text-base" : "py-3 text-sm"}`}
          style={{ borderColor: "#e5e7eb", color: "#9ca3af", fontFamily: "var(--font-body)" }}>
          Neue Berechnung starten
        </button>
      </div>
    </div>,
  ];

  const isStart    = screen === 0;
  const isLast     = screen === TOTAL_SCREENS - 1;
  const wizardStep = screen - 1;

  return (
    <div id="wizard-app"
      className={`no-print flex flex-col h-screen mx-auto relative ${isTablet ? "max-w-2xl" : "max-w-md"}`}
      style={{ background: isStart ? "#3D5278" : "#f4f6f9" }}>

      {settingsPanel}

      {/* Header */}
      {!isStart ? (
        <div className={`flex-none ${sz.px} pt-safe pt-4 pb-3`} style={{ background: "#3D5278" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>gebioMized</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50">{wizardStep} / 5</span>
              <button onClick={() => setSettingsOpen(true)}
                className={`flex items-center justify-center rounded-xl transition-all active:scale-90 ${isTablet ? "w-10 h-10" : "w-8 h-8"}`}
                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
                <GearIcon/>
              </button>
            </div>
          </div>
          <ProgressDots current={wizardStep - 1} total={5}/>
        </div>
      ) : (
        <div className="absolute top-5 right-5 z-10">
          <button onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            <GearIcon/>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">{screens[screen]}</div>

      {/* Footer */}
      {!isStart && (
        <div className={`flex-none ${sz.px} pb-safe pb-5 pt-3 flex gap-3`}
          style={{ background: screen >= 4 ? "#f4f6f9" : "white", borderTop: "1px solid #f0f0f0" }}>
          {screen > 1 && (
            <button onClick={() => navigate(-1)}
              className={`flex-none px-5 rounded-2xl font-semibold transition-all active:scale-95 ${sz.btn}`}
              style={{ background: "#e8edf5", color: "#3D5278", fontFamily: "var(--font-body)" }}>
              ← Zurück
            </button>
          )}
          {!isLast && (
            <button onClick={() => navigate(1)}
              className={`flex-1 rounded-2xl font-bold transition-all active:scale-95 ${sz.btn}`}
              style={{ background: "#3D5278", color: "white", fontFamily: "var(--font-heading)" }}>
              Weiter →
            </button>
          )}
        </div>
      )}

      {/* Print Report (nur beim Drucken sichtbar) */}
      <PrintReport
        termine={termine} mix={mix} gehalt={gehalt} raumkosten={raumkosten}
        investition={investition} optionName={currentOptionName}
        optionModule={optionIdx !== null ? getOptionModule(optionen[optionIdx], produkte) : []}
        basis={basis} variJ2={variJ2} variJ3={variJ3}
        d1={d1} d2={d2} printedAt={printedAt}
        kundenName={kundenName} velogicLiz={velogicLiz}/>
    </div>
  );
}
