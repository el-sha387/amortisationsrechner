"use client";

import { useState, useMemo } from "react";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Produkt {
  id: string; name: string; preis: number;
  lizenzJahr1?: number;    // jährliche Lizenz Jahr 1
  lizenzJahrFolge?: number; // jährliche Lizenz ab Jahr 2
}
interface Option  { name: string; produktIds: string[]; }

interface Dienstleistung {
  name: string;
  uvpLabel: string;
  dlNetto: number;
  sattelAnteil: number;
  sattelUvp: number;
  sattelEK: number;
}

interface Einstellungen {
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

const DEFAULT_PRODUKTE: Produkt[] = [
  { id: "sattel-app",        name: "Sattel-Druck App",                    preis: 2490, lizenzJahr1: 490, lizenzJahrFolge: 490 },
  { id: "sattel-map",        name: "Sattel-Druckmessung",                 preis: 4990 },
  { id: "lenker-map",        name: "Lenkerdruckmessung",                  preis: 3900 },
  { id: "fuss-map",          name: "Fußdruckmessung",                     preis: 4990 },
  { id: "bundle-sf",         name: "Bundle Sattel + Fuß",                 preis: 7990 },
  { id: "velogic-ess",       name: "Velogic Essentials (1 Kamera)",       preis: 1849, lizenzJahr1: 2800, lizenzJahrFolge: 1150 },
  { id: "velogic-pro",       name: "Velogic PRO (2 Kameras)",             preis: 2990, lizenzJahr1: 4200, lizenzJahrFolge: 1700 },
  { id: "advantage360",      name: "Advantage 360 (jährl.)",              preis:  490 },
  { id: "kit-sattel-crmo",   name: "Starter Kit Sättel 5× CrMo (EK)",    preis: Math.round(5  * 52.92) },
  { id: "kit-sattel-titan",  name: "Starter Kit Sättel 10× Titan (EK)",  preis: Math.round(10 * 92.60) },
  { id: "kit-push-einlagen", name: "Starter Kit PUSH Einlagen 9 Paar",   preis: Math.round(9  * 68.80) },
];

const DEFAULT_OPTIONEN: Option[] = [
  { name: "Option 1", produktIds: ["sattel-app"] },
  { name: "Option 2", produktIds: ["sattel-map", "velogic-ess"] },
  { name: "Option 3", produktIds: ["sattel-map", "lenker-map", "velogic-pro"] },
];

const DEFAULT_EINSTELLUNGEN: Einstellungen = {
  d1: {
    name: "Sattel-Analyse", uvpLabel: "99 € UVP",
    dlNetto: 83.20, sattelAnteil: 70, sattelUvp: 88.60, sattelEK: 0,
  },
  d2: {
    name: "Bikefitting Basis", uvpLabel: "149 € UVP",
    dlNetto: 125.21, sattelAnteil: 50, sattelUvp: 77.62, sattelEK: 0,
  },
};

const DEFAULT_ANNAHMEN: Annahmen = {
  abschreibungMonate: 36, lizenzMonat: 25, ersatzfolieGesamt: 749,
  raumQm: 10, iscoJahr: 348, arbeitszeitTermin: 1.25,
  lohnNebenkosten: 20, vollzeitStunden: 172,
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getOptionPreis(opt: Option, produkte: Produkt[]): number {
  return opt.produktIds.reduce((sum, pid) => {
    return sum + (produkte.find(p => p.id === pid)?.preis ?? 0);
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

function berechneMonat(
  investition: number, termine: number, gehalt: number,
  raumkosten: number, mixAnteil: number, a: Annahmen, e: Einstellungen,
  velogicLizenzMonat = 0
) {
  const d1Umsatz = e.d1.dlNetto + (e.d1.sattelAnteil / 100) * ((e.d1.sattelUvp - e.d1.sattelEK) / 1.19);
  const d2Umsatz = e.d2.dlNetto + (e.d2.sattelAnteil / 100) * ((e.d2.sattelUvp - e.d2.sattelEK) / 1.19);
  const abschreibungMonat = investition / a.abschreibungMonate;
  const technikLaufend    = a.lizenzMonat + a.ersatzfolieGesamt / a.abschreibungMonate + velogicLizenzMonat;
  const mitarbeiter       = gehalt * (1 + a.lohnNebenkosten / 100) *
                            ((termine * a.arbeitszeitTermin) / a.vollzeitStunden);
  const raum    = raumkosten * a.raumQm;
  const isco    = a.iscoJahr / 12;
  const ausgaben = abschreibungMonat + technikLaufend + mitarbeiter + raum + isco;
  const umsatzTermin = (1 - mixAnteil) * d1Umsatz + mixAnteil * d2Umsatz;
  const einnahmen    = termine * umsatzTermin;
  const ueberschuss  = einnahmen - ausgaben;
  const cashGewinn   = ueberschuss + abschreibungMonat;
  return { ausgaben, einnahmen, ueberschuss, cashGewinn, umsatzTermin,
           d1Umsatz, d2Umsatz, abschreibungMonat };
}

function berechne(
  investition: number, termine: number, gehalt: number, raumkosten: number,
  mixAnteil: number, wachstum: number, a: Annahmen, e: Einstellungen,
  velogicLizenzJahr1 = 0, velogicLizenzJahrFolge = 0
) {
  const liz1 = velogicLizenzJahr1 / 12;
  const lizF = velogicLizenzJahrFolge / 12;
  const j1 = berechneMonat(investition, termine,                             gehalt, raumkosten, mixAnteil, a, e, liz1);
  const j2 = berechneMonat(investition, termine * (1 + wachstum / 100),      gehalt, raumkosten, mixAnteil, a, e, lizF);
  const j3 = berechneMonat(investition, termine * (1 + wachstum / 100) ** 2, gehalt, raumkosten, mixAnteil, a, e, lizF);
  const breakEvenMonate  = j1.cashGewinn > 0 ? investition / j1.cashGewinn : Infinity;
  const breakEvenTermine = j1.ueberschuss > 0
    ? j1.ausgaben / (j1.umsatzTermin - j1.ausgaben / termine) : Infinity;
  const jahre = [
    { termine: Math.round(termine),                             gewinn: j1.ueberschuss * 12, einnahmen: j1.einnahmen * 12, ausgaben: j1.ausgaben * 12 },
    { termine: Math.round(termine * (1 + wachstum / 100)),      gewinn: j2.ueberschuss * 12, einnahmen: j2.einnahmen * 12, ausgaben: j2.ausgaben * 12 },
    { termine: Math.round(termine * (1 + wachstum / 100) ** 2), gewinn: j3.ueberschuss * 12, einnahmen: j3.einnahmen * 12, ausgaben: j3.ausgaben * 12 },
  ];
  const gewinnGesamt3J = jahre.reduce((s, j) => s + j.gewinn, 0);
  const roiJahr3       = investition > 0 ? (gewinnGesamt3J / investition) * 100 : 0;
  return { ausgaben: j1.ausgaben, einnahmen: j1.einnahmen, ueberschuss: j1.ueberschuss,
           cashGewinn: j1.cashGewinn, umsatzTermin: j1.umsatzTermin,
           d1Umsatz: j1.d1Umsatz, d2Umsatz: j1.d2Umsatz,
           breakEvenMonate, breakEvenTermine, jahre, gewinnGesamt3J, roiJahr3 };
}

function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

// ─── Eingabe-Komponenten ──────────────────────────────────────────────────────

function NumInput({ label, value, onChange, suffix = "", step = 1, min = 0, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; min?: number; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="number" step={step} min={min} value={value}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= min) onChange(v); }}
          className="w-full border-2 rounded-xl px-3 py-2 text-right font-semibold focus:outline-none text-sm"
          style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
        {suffix && <span className="text-sm text-gray-400 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function TextInput({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full border-2 rounded-xl px-3 py-2 font-semibold focus:outline-none text-sm"
        style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function MetricCard({ label, value, sub, accent, highlight }: {
  label: string; value: string; sub: string; accent: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 shadow-sm"
      style={{ background: highlight ? accent : "white",
               borderLeft: highlight ? "none" : `4px solid ${accent}` }}>
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

// ─── Print-Report ─────────────────────────────────────────────────────────────

function PrintReport({ termine, mix, gehalt, raumkosten, investition, optionName,
  optionModule, ergebnis, annahmen, einstellungen, printedAt, wachstum,
  kundenName, velogicLiz }: {
  termine: number; mix: number; gehalt: number; raumkosten: number;
  investition: number; optionName: string; wachstum: number;
  optionModule: Produkt[];
  ergebnis: ReturnType<typeof berechne>;
  annahmen: Annahmen; einstellungen: Einstellungen;
  printedAt: Date; kundenName: string;
  velogicLiz: { jahr1: number; jahrFolge: number };
}) {
  const s = {
    page:      { fontFamily: "Arial, sans-serif", color: "#1f2937", background: "white",
                 padding: "36px 44px", maxWidth: 780, margin: "0 auto", fontSize: 13 } as React.CSSProperties,
    navy:      "#3D5278" as const,
    lime:      "#AADD00" as const,
    label:     { fontSize: 11, color: "#6b7280", marginBottom: 3 } as React.CSSProperties,
    sectionH:  { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
                 letterSpacing: 1, color: "#3D5278", marginBottom: 10, marginTop: 0 },
    divider:   { borderTop: "1px solid #e5e7eb", margin: "18px 0" } as React.CSSProperties,
  };

  const row = (label: string, value: string, bold = false, accent = false) => (
    <div style={{ display: "flex", justifyContent: "space-between",
      padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400,
        color: accent ? s.navy : "#1f2937" }}>{value}</span>
    </div>
  );

  const lizenzTotal3J = velogicLiz.jahr1 + velogicLiz.jahrFolge * 2;
  const abschreibungMonat = investition / annahmen.abschreibungMonate;
  const technikMonat = annahmen.lizenzMonat + annahmen.ersatzfolieGesamt / annahmen.abschreibungMonate;
  const mitarbeiterMonat = gehalt * (1 + annahmen.lohnNebenkosten / 100) *
    ((termine * annahmen.arbeitszeitTermin) / annahmen.vollzeitStunden);
  const raumMonat = raumkosten * annahmen.raumQm;
  const iscoMonat = annahmen.iscoJahr / 12;
  const velogicMonat1 = velogicLiz.jahr1 / 12;

  return (
    <div id="print-report" style={{ display: "none" }}>
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        paddingBottom: 16, marginBottom: 20, borderBottom: `4px solid ${s.lime}` }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: s.navy, letterSpacing: 2,
            textTransform: "uppercase" }}>gebioMized</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, letterSpacing: 1 }}>
            Bikefitting-Technologie · SnM gebioMized GmbH
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: s.navy }}>Rentabilitätsanalyse</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            {printedAt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* ── Anrede ── */}
      {kundenName && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: "#1f2937" }}>
            Rentabilitätsanalyse für <strong style={{ color: s.navy }}>{kundenName}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
            Individuelle Berechnung auf Basis Ihrer Angaben
          </div>
        </div>
      )}

      {/* ── 2-Spalten: Investition + Kosten/Monat ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 20 }}>

        {/* Investitionsübersicht */}
        <div>
          <h3 style={s.sectionH}>Investitionsübersicht — {optionName}</h3>
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
            paddingTop: 8, borderTop: `2px solid ${s.navy}`, fontWeight: 700, color: s.navy }}>
            <span>Hardware gesamt</span>
            <span>{investition.toLocaleString("de-DE")} €</span>
          </div>
          {lizenzTotal3J > 0 && (
            <div style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>
              Lizenzkosten 3 Jahre gesamt: ca. {lizenzTotal3J.toLocaleString("de-DE")} €
            </div>
          )}
        </div>

        {/* Monatliche Kosten */}
        <div>
          <h3 style={s.sectionH}>Monatliche Kosten (Jahr 1)</h3>
          {row("Abschreibung Hardware", `${fmt(abschreibungMonat, 0)} €`)}
          {row("Technik & Lizenz (gebioM)", `${fmt(technikMonat, 0)} €`)}
          {velogicMonat1 > 0 && row("Velogic-Lizenz (Jahr 1)", `${fmt(velogicMonat1, 0)} €`)}
          {row("Mitarbeiter (anteilig)", `${fmt(mitarbeiterMonat, 0)} €`)}
          {row("Raum", `${fmt(raumMonat, 0)} €`)}
          {row("ISCO / Weiterbildung", `${fmt(iscoMonat, 0)} €`)}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
            paddingTop: 8, borderTop: `2px solid ${s.navy}`, fontWeight: 700, color: s.navy }}>
            <span>Kosten gesamt</span>
            <span>{fmt(ergebnis.ausgaben, 0)} €</span>
          </div>
        </div>
      </div>

      <div style={s.divider}/>

      {/* ── Einnahmen & Ergebnis ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 20 }}>
        <div>
          <h3 style={s.sectionH}>Monatliche Einnahmen</h3>
          {row(`${einstellungen.d1.name} (${Math.round((1-mix)*100)} %)`,
            `${fmt(ergebnis.d1Umsatz, 2)} € / Termin`)}
          {row(`${einstellungen.d2.name} (${Math.round(mix*100)} %)`,
            `${fmt(ergebnis.d2Umsatz, 2)} € / Termin`)}
          {row("Ø Umsatz / Termin", `${fmt(ergebnis.umsatzTermin, 2)} €`, true)}
          {row("Termine / Monat", `${termine}`)}
          {row("Einnahmen gesamt", `${fmt(ergebnis.einnahmen, 0)} €`, true, true)}
        </div>
        <div>
          <h3 style={s.sectionH}>Monatliches Ergebnis</h3>
          {row("Einnahmen", `${fmt(ergebnis.einnahmen, 0)} €`)}
          {row("Kosten", `– ${fmt(ergebnis.ausgaben, 0)} €`)}
          {row("Überschuss / Monat", `${fmt(ergebnis.ueberschuss, 0)} €`, true, ergebnis.ueberschuss > 0)}
          {row("Jahresgewinn (Jahr 1)", `${fmt(ergebnis.ueberschuss * 12, 0)} €`, true)}
          {row("Break-Even",
            ergebnis.breakEvenMonate < Infinity
              ? `${fmt(ergebnis.breakEvenMonate, 1)} Monate`
              : "Termine erhöhen")}
          {row("Rentabilitätsschwelle", ergebnis.breakEvenTermine < Infinity
            ? `ab ${fmt(ergebnis.breakEvenTermine, 0)} Terminen / Mo.` : "–")}
        </div>
      </div>

      {/* ── Highlight-Banner ── */}
      <div style={{ background: s.navy, borderRadius: 10, padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Jahresgewinn Jahr 1</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: s.lime, lineHeight: 1 }}>
            {fmt(ergebnis.ueberschuss * 12)} €
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.15)" }}/>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Break-Even</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>
            {ergebnis.breakEvenMonate < Infinity ? `${fmt(ergebnis.breakEvenMonate, 1)} Mo.` : "–"}
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.15)" }}/>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>ROI über 3 Jahre</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1 }}>
            {fmt(ergebnis.roiJahr3, 0)} %
          </div>
          <div style={{ fontSize: 11, color: s.lime }}>
            Gewinn 3 J.: {fmt(ergebnis.gewinnGesamt3J)} €
          </div>
        </div>
      </div>

      {/* ── 3-Jahres-Prognose ── */}
      <h3 style={s.sectionH}>3-Jahres-Prognose
        {wachstum > 0 ? ` (+ ${wachstum} % Terminwachstum p.a.)` : " (konstante Terminanzahl)"}
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f4f6f9" }}>
            {["Jahr", "Termine / Mo.", "Einnahmen p.a.", "Kosten p.a.", "Gewinn p.a."].map(h => (
              <th key={h} style={{ textAlign: h === "Jahr" ? "left" : "right",
                padding: "8px 10px", color: s.navy, fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ergebnis.jahre.map((j, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f0f0f0",
              background: i % 2 === 0 ? "white" : "#fafafa" }}>
              <td style={{ padding: "7px 10px", fontWeight: 600 }}>Jahr {i + 1}</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>{j.termine}</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>{fmt(j.einnahmen)} €</td>
              <td style={{ textAlign: "right", padding: "7px 10px" }}>{fmt(j.ausgaben)} €</td>
              <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 700,
                color: j.gewinn >= 0 ? s.navy : "#ef4444" }}>
                {fmt(j.gewinn)} €
              </td>
            </tr>
          ))}
          <tr style={{ background: s.navy }}>
            <td colSpan={3} style={{ padding: "8px 10px", color: "white", fontWeight: 700 }}>
              Gesamt 3 Jahre
            </td>
            <td style={{ padding: "8px 10px" }}/>
            <td style={{ textAlign: "right", padding: "8px 10px",
              fontWeight: 900, color: s.lime, fontSize: 14 }}>
              {fmt(ergebnis.gewinnGesamt3J)} €
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12,
        display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.6 }}>
          Alle Beträge netto (ohne MwSt.) · Abschreibung linear über {annahmen.abschreibungMonate} Monate
          · Sattel-Marge abzgl. 19 % MwSt. · Unverbindliche Modellrechnung
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: s.navy }}>gebioMized</div>
          <div>www.gebioMized.com</div>
        </div>
      </div>

    </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<"rechner" | "annahmen" | "einstellungen">("rechner");

  // Rechner-Inputs
  const [optionIdx, setOptionIdx]             = useState<number | null>(0);
  const [investition, setInvestition]         = useState(2490);
  const [investitionInput, setInvestitionInput] = useState("2.490");
  const [termine, setTermine]                 = useState(20);
  const [gehalt, setGehalt]                   = useState(2600);
  const [raumkosten, setRaumkosten]           = useState(14);
  const [mix, setMix]                         = useState(0.5);
  const [wachstum, setWachstum]               = useState(10);
  const [calcMode, setCalcMode]               = useState<"monat" | "termin">("monat");
  const [printedAt, setPrintedAt]             = useState(() => new Date());
  const [kundenName, setKundenName]           = useState("");

  // Konfiguration
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(DEFAULT_EINSTELLUNGEN);
  const [annahmen, setAnnahmen]           = useState<Annahmen>(DEFAULT_ANNAHMEN);
  const [produkte, setProdukte]           = useState<Produkt[]>(DEFAULT_PRODUKTE);
  const [optionen, setOptionen]           = useState<Option[]>(DEFAULT_OPTIONEN);

  function setD(dl: "d1" | "d2", patch: Partial<Dienstleistung>) {
    setEinstellungen(prev => ({ ...prev, [dl]: { ...prev[dl], ...patch } }));
  }
  function setA<K extends keyof Annahmen>(key: K, val: Annahmen[K]) {
    setAnnahmen(prev => ({ ...prev, [key]: val }));
  }

  const velogicLiz = useMemo(
    () => getVelogicLizenzen(optionIdx, optionen, produkte),
    [optionIdx, optionen, produkte]
  );

  const ergebnis = useMemo(
    () => berechne(investition, termine, gehalt, raumkosten, mix, wachstum, annahmen, einstellungen,
                   velogicLiz.jahr1, velogicLiz.jahrFolge),
    [investition, termine, gehalt, raumkosten, mix, wachstum, annahmen, einstellungen, velogicLiz]
  );

  function handleOptionKlick(idx: number) {
    setOptionIdx(idx);
    const betrag = getOptionPreis(optionen[idx], produkte);
    setInvestition(betrag);
    setInvestitionInput(betrag.toLocaleString("de-DE"));
  }

  function handleInvestitionInput(raw: string) {
    setInvestitionInput(raw);
    const parsed = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 500) {
      setInvestition(parsed);
      setOptionIdx(null);
    }
  }

  function handlePrint() {
    setPrintedAt(new Date());
    setTimeout(() => window.print(), 50);
  }

  // Darstellung je Modus
  function anzeige(monatswert: number, digits = 0) {
    if (calcMode === "monat") return `${fmt(monatswert, digits)} €`;
    return `${fmt(termine > 0 ? monatswert / termine : 0, 2)} €`;
  }
  const modeLabel = calcMode === "monat" ? "/ Monat" : "/ Termin";

  const positiv           = ergebnis.ueberschuss > 0;
  const currentOptionName = optionIdx !== null ? optionen[optionIdx].name : "Eigene Eingabe";

  const tabs = [
    { id: "rechner",       label: "Rechner"       },
    { id: "annahmen",      label: "Annahmen"       },
    { id: "einstellungen", label: "Einstellungen"  },
  ] as const;

  return (
    <>
    <div className="no-print max-w-5xl mx-auto px-4 py-6">

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

      {/* ── Tab: Rechner ──────────────────────────────────────────────────────── */}
      {activeTab === "rechner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ─ Linke Spalte: Inputs ─ */}
          <div className="space-y-4">

            {/* Investition */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Investition</h2>

              {/* Options-Buttons */}
              <div className="flex gap-2 mb-3">
                {optionen.map((opt, i) => {
                  const preis = getOptionPreis(opt, produkte);
                  return (
                    <button key={i} onClick={() => handleOptionKlick(i)}
                      className="flex-1 py-2 px-2 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={{
                        borderColor: optionIdx === i ? "#3D5278" : "#e5e7eb",
                        background:  optionIdx === i ? "#3D5278" : "white",
                        color:       optionIdx === i ? "white"   : "#374151",
                        fontFamily:  "var(--font-body)",
                      }}>
                      <div>{opt.name}</div>
                      <div className="text-xs font-normal opacity-80">
                        {preis > 0 ? preis.toLocaleString("de-DE") : "–"} €
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Enthaltene Module */}
              {optionIdx !== null && (() => {
                const module = getOptionModule(optionen[optionIdx], produkte);
                if (module.length === 0) return null;
                return (
                  <div className="rounded-xl border border-gray-100 px-3 py-2.5 mb-3 bg-gray-50">
                    <div className="text-xs font-bold uppercase tracking-wide mb-1.5"
                      style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                      Enthaltene Module
                    </div>
                    <ul className="space-y-1">
                      {module.map(m => (
                        <li key={m.id} className="flex flex-col text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full flex-none"
                              style={{ background: "#AADD00" }}/>
                            <span className="flex-1">{m.name}</span>
                            <span className="text-gray-400">{m.preis.toLocaleString("de-DE")} €</span>
                          </div>
                          {(m.lizenzJahr1 ?? 0) > 0 && (
                            <div className="ml-3.5 mt-0.5 text-orange-500 font-medium">
                              + Lizenz: {m.lizenzJahr1!.toLocaleString("de-DE")} € / Jahr 1,
                              ab Jahr 2: {m.lizenzJahrFolge!.toLocaleString("de-DE")} € / Jahr
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Freifeld */}
              <div className="flex items-center gap-2">
                <input type="text"
                  className="flex-1 border-2 rounded-xl px-3 py-2 text-right font-semibold focus:outline-none"
                  style={{ borderColor: optionIdx === null ? "#3D5278" : "#e5e7eb", fontFamily: "var(--font-body)" }}
                  value={investitionInput}
                  onChange={e => handleInvestitionInput(e.target.value)}
                  onFocus={() => setOptionIdx(null)}/>
                <span className="text-gray-500 font-medium">€</span>
              </div>
            </div>

            {/* Termine */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Geplante Termine / Monat
              </h2>
              <div className="flex items-center gap-3">
                <input type="range" min={5} max={80} step={5} value={termine}
                  onChange={e => setTermine(Number(e.target.value))}/>
                <span className="font-bold text-xl w-10 text-right"
                  style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{termine}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span><span>40 (realistisch)</span><span>80</span>
              </div>
            </div>

            {/* Gehalt */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Mitarbeiter Bruttogehalt / Monat
              </h2>
              <div className="flex items-center gap-3">
                <input type="range" min={2000} max={4000} step={100} value={gehalt}
                  onChange={e => setGehalt(Number(e.target.value))}/>
                <span className="font-bold text-lg w-20 text-right"
                  style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
                  {gehalt.toLocaleString("de-DE")} €
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2.000 €</span><span>4.000 €</span>
              </div>
            </div>

            {/* Raumkosten */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Raummiete / m²</h2>
              <div className="flex items-center gap-3">
                <input type="range" min={8} max={25} step={1} value={raumkosten}
                  onChange={e => setRaumkosten(Number(e.target.value))}/>
                <span className="font-bold text-lg w-16 text-right"
                  style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{raumkosten} €</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Messfläche: {annahmen.raumQm} m²</div>
            </div>

            {/* Mix */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-1"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Leistungs-Mix</h2>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{einstellungen.d1.name} ({einstellungen.d1.uvpLabel})</span>
                <span>{einstellungen.d2.name} ({einstellungen.d2.uvpLabel})</span>
              </div>
              <input type="range" min={0} max={1} step={0.1} value={mix}
                onChange={e => setMix(Number(e.target.value))}/>
              <div className="flex justify-between mt-1">
                <span className="text-sm font-semibold"
                  style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
                  {Math.round((1 - mix) * 100)} %
                </span>
                <span className="text-xs text-gray-400 self-center">
                  Ø {fmt(ergebnis.umsatzTermin, 2)} € / Termin
                </span>
                <span className="text-sm font-semibold"
                  style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
                  {Math.round(mix * 100)} %
                </span>
              </div>
            </div>

            {/* Wachstum */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-1"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Terminwachstum Jahr 2 / 3
              </h2>
              <p className="text-xs text-gray-400 mb-3">Erwartete Steigerung der Terminanzahl pro Jahr</p>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={50} step={5} value={wachstum}
                  onChange={e => setWachstum(Number(e.target.value))}/>
                <span className="font-bold text-xl w-12 text-right"
                  style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>{wachstum} %</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 % (konstant)</span><span>25 %</span><span>50 %</span>
              </div>
            </div>
          </div>

          {/* ─ Rechte Spalte: Ergebnisse ─ */}
          <div className="space-y-4">

            {/* Ansicht-Toggle + Metriken */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400"
                  style={{ fontFamily: "var(--font-heading)" }}>Ergebnisse</span>
                <div className="flex rounded-xl overflow-hidden border-2 text-xs"
                  style={{ borderColor: "#e5e7eb" }}>
                  {(["monat", "termin"] as const).map(mode => (
                    <button key={mode} onClick={() => setCalcMode(mode)}
                      className="px-3 py-1.5 font-semibold transition-all"
                      style={{
                        background: calcMode === mode ? "#3D5278" : "white",
                        color:      calcMode === mode ? "white"   : "#6b7280",
                        fontFamily: "var(--font-body)",
                      }}>
                      {mode === "monat" ? "pro Monat" : "pro Termin"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label={`Einnahmen ${modeLabel}`}
                  value={anzeige(ergebnis.einnahmen)}
                  sub={`${fmt(ergebnis.umsatzTermin, 2)} € / Termin`}
                  accent="#AADD00"/>
                <MetricCard
                  label={`Kosten ${modeLabel}`}
                  value={anzeige(ergebnis.ausgaben)}
                  sub="inkl. Abschreibung & Gehalt"
                  accent="#e5e7eb"/>
                <MetricCard
                  label={`Überschuss ${modeLabel}`}
                  value={`${positiv ? "" : "–"}${anzeige(Math.abs(ergebnis.ueberschuss))}`}
                  sub={positiv ? (calcMode === "monat" ? "Monatlicher Gewinn" : "Gewinn je Termin") : "Noch nicht rentabel"}
                  accent={positiv ? "#3D5278" : "#ef4444"} highlight/>
                <MetricCard
                  label="Break-Even"
                  value={positiv ? `${fmt(ergebnis.breakEvenMonate, 1)} Monate` : "–"}
                  sub={positiv ? `${fmt(ergebnis.breakEvenTermine, 0)} Termine / Monat kostendeckend` : "Termine erhöhen"}
                  accent="#3D5278"/>
              </div>
            </div>

            {/* Jahresvergleich */}
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#3D5278" }}>
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>Jahresvergleich</span>
                <span className="text-xs text-white/60">
                  {wachstum > 0 ? `+${wachstum} % Terminwachstum p.a.` : "Konstante Terminanzahl"}
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10">
                {ergebnis.jahre.map((j, i) => {
                  const vorjahr = i > 0 ? ergebnis.jahre[i - 1].gewinn : null;
                  const delta   = vorjahr !== null && vorjahr !== 0
                    ? ((j.gewinn - vorjahr) / Math.abs(vorjahr)) * 100 : null;
                  return (
                    <div key={i} className="px-4 py-4 text-center">
                      <div className="text-xs font-bold uppercase tracking-wide mb-2 opacity-60 text-white">
                        Jahr {i + 1}
                      </div>
                      <div className="text-xs text-white/50 mb-0.5">{j.termine} Termine / Mo.</div>
                      <div className="font-bold text-xl text-white leading-tight">{fmt(j.gewinn)} €</div>
                      <div className="text-xs mt-1" style={{ color: "#AADD00" }}>
                        {delta !== null
                          ? `▲ +${fmt(delta, 0)} % ggü. Vorjahr`
                          : <span className="opacity-0">–</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mx-4 mb-4 mt-1 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <span className="text-sm text-white/70">Gesamt 3 Jahre</span>
                <div className="text-right">
                  <span className="font-bold text-lg text-white">{fmt(ergebnis.gewinnGesamt3J)} €</span>
                  <span className="text-xs ml-3" style={{ color: "#AADD00" }}>
                    ROI {fmt(ergebnis.roiJahr3, 0)} %
                  </span>
                </div>
              </div>
            </div>

            {/* Berechnungsgrundlagen */}
            <div className="bg-white rounded-2xl p-5 shadow-sm text-xs text-gray-500 space-y-1">
              <div className="font-semibold text-gray-700 mb-2">Berechnungsgrundlagen</div>
              <div>· Messtechnik linear auf {annahmen.abschreibungMonate} Monate abgeschrieben</div>
              {velogicLiz.jahr1 > 0 && (
                <div className="font-semibold" style={{ color: "#3D5278" }}>
                  · Velogic-Lizenz: {velogicLiz.jahr1.toLocaleString("de-DE")} € / Jahr 1 &middot; ab Jahr 2: {velogicLiz.jahrFolge.toLocaleString("de-DE")} € / Jahr (in Kosten enthalten)
                </div>
              )}
              <div>· Sattelverkauf: {einstellungen.d1.name} {einstellungen.d1.sattelAnteil} % | {einstellungen.d2.name} {einstellungen.d2.sattelAnteil} %</div>
              <div>· Sattel-Marge abzgl. 19 % MwSt.</div>
              <div>· {annahmen.arbeitszeitTermin} Std. Arbeitszeit pro Termin (inkl. Admin & Report)</div>
              <div>· Raumgröße: {annahmen.raumQm} m² · ISCO-Jahreskurs: {annahmen.iscoJahr} €</div>
              <div>· Alle Beträge netto (ohne MwSt.)</div>
            </div>

            {/* PDF — Kundenname + Button */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                Report erstellen
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Kundenname (optional)</label>
                <input
                  type="text"
                  placeholder="z. B. Fahrrad Müller GmbH"
                  value={kundenName}
                  onChange={e => setKundenName(e.target.value)}
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
              </div>
              <button onClick={handlePrint}
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "#3D5278", color: "white", fontFamily: "var(--font-body)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Als PDF speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Annahmen ─────────────────────────────────────────────────────── */}
      {activeTab === "annahmen" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Technik & Lizenz</h2>
              <div className="space-y-4">
                <NumInput label="Abschreibungszeitraum" value={annahmen.abschreibungMonate}
                  onChange={v => setA("abschreibungMonate", v)} suffix="Monate" step={6} min={12}
                  hint="Standard: 36 Monate (linear)"/>
                <NumInput label="Jahreslizenz" value={annahmen.lizenzMonat}
                  onChange={v => setA("lizenzMonat", v)} suffix="€ / Monat" step={1}/>
                <NumInput label="Ersatzfolie (Gesamtkosten)" value={annahmen.ersatzfolieGesamt}
                  onChange={v => setA("ersatzfolieGesamt", v)} suffix="€" step={50}
                  hint="Wird auf Abschreibungszeitraum verteilt"/>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Raum & Betrieb</h2>
              <div className="space-y-4">
                <NumInput label="Raumgröße Messfläche" value={annahmen.raumQm}
                  onChange={v => setA("raumQm", v)} suffix="m²" step={1} min={5}/>
                <NumInput label="ISCO-Kurs / Jahr" value={annahmen.iscoJahr}
                  onChange={v => setA("iscoJahr", v)} suffix="€" step={10}
                  hint="Tageskurs oder Online-Kurs"/>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Mitarbeiter</h2>
              <div className="space-y-4">
                <NumInput label="Arbeitszeit pro Termin" value={annahmen.arbeitszeitTermin}
                  onChange={v => setA("arbeitszeitTermin", v)} suffix="Std." step={0.25} min={0.5}
                  hint="Inkl. Terminabsprache & Kurzreport"/>
                <NumInput label="Lohn-Nebenkosten" value={annahmen.lohnNebenkosten}
                  onChange={v => setA("lohnNebenkosten", v)} suffix="%" step={1}
                  hint="Aufschlag auf Bruttogehalt"/>
                <NumInput label="Vollzeit-Stunden / Monat" value={annahmen.vollzeitStunden}
                  onChange={v => setA("vollzeitStunden", v)} suffix="Std." step={1} min={100}/>
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

      {/* ── Tab: Einstellungen ────────────────────────────────────────────────── */}
      {activeTab === "einstellungen" && (
        <div className="space-y-5">

          {/* Produktkatalog Messtechnik */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
              style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Produktkatalog Messtechnik
            </h2>
            <div className="space-y-2">
              {produkte.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <input type="text" value={p.name}
                    onChange={e => setProdukte(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="flex-1 border-2 rounded-xl px-3 py-1.5 text-sm font-semibold focus:outline-none"
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
                          setInvestitionInput(np.toLocaleString("de-DE"));
                        }
                      }
                    }}
                    className="w-28 border-2 rounded-xl px-3 py-1.5 text-right text-sm font-semibold focus:outline-none"
                    style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
                  <span className="text-sm text-gray-400 w-4">€</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optionen konfigurieren */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
              style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
              Optionen konfigurieren
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {optionen.map((opt, oi) => (
                <div key={oi} className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: "#e5e7eb" }}>
                  <input type="text" value={opt.name}
                    onChange={e => setOptionen(prev => prev.map((x, j) => j === oi ? { ...x, name: e.target.value } : x))}
                    className="w-full border-2 rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none"
                    style={{ borderColor: "#e5e7eb", color: "#3D5278", fontFamily: "var(--font-heading)" }}/>
                  <div className="space-y-1.5">
                    {produkte.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
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
                              setInvestitionInput(np.toLocaleString("de-DE"));
                            }
                          }}
                          style={{ accentColor: "#AADD00" }}/>
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-gray-400 shrink-0">{p.preis.toLocaleString("de-DE")} €</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-right pt-2 border-t border-gray-100"
                    style={{ color: "#3D5278" }}>
                    Gesamt: {getOptionPreis(opt, produkte).toLocaleString("de-DE")} €
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dienstleistungen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(["d1", "d2"] as const).map(dl => {
              const d = einstellungen[dl];
              const umsatz = d.dlNetto + (d.sattelAnteil / 100) * ((d.sattelUvp - d.sattelEK) / 1.19);
              return (
                <div key={dl} className="bg-white rounded-2xl p-5 shadow-sm">
                  <h2 className="font-bold text-sm uppercase tracking-wide mb-1"
                    style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                    {dl === "d1" ? "Dienstleistung 1" : "Dienstleistung 2"}
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Einnahmen / Termin (berechnet):{" "}
                    <strong style={{ color: "#3D5278" }}>{fmt(umsatz, 2)} € netto</strong>
                  </p>
                  <div className="space-y-3">
                    <TextInput label="Anzeigename (Mix-Slider)" value={d.name}
                      onChange={v => setD(dl, { name: v })}/>
                    <TextInput label="UVP-Label (Hinweistext)" value={d.uvpLabel}
                      onChange={v => setD(dl, { uvpLabel: v })}
                      hint={`Wird im Slider angezeigt, z. B. "99 € UVP"`}/>
                    <NumInput label="Dienstleistungspreis (netto)" value={d.dlNetto}
                      onChange={v => setD(dl, { dlNetto: v })} suffix="€" step={0.5} min={0}/>
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs font-bold uppercase tracking-wide mb-3"
                        style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>
                        Sattelverkauf
                      </div>
                      <div className="space-y-3">
                        <NumInput label="Anteil Termine mit Sattelverkauf" value={d.sattelAnteil}
                          onChange={v => setD(dl, { sattelAnteil: Math.min(100, Math.max(0, v)) })}
                          suffix="%" step={5} min={0}/>
                        <NumInput label="UVP Sattel (netto)" value={d.sattelUvp}
                          onChange={v => setD(dl, { sattelUvp: v })} suffix="€" step={1} min={0}/>
                        <NumInput label="Händler EK (netto)" value={d.sattelEK}
                          onChange={v => setD(dl, { sattelEK: v })} suffix="€" step={1} min={0}
                          hint={`Marge netto (abzgl. MwSt): ${fmt((d.sattelUvp - d.sattelEK) / 1.19, 2)} €`}/>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => {
            setEinstellungen(DEFAULT_EINSTELLUNGEN);
            setProdukte(DEFAULT_PRODUKTE);
            setOptionen(DEFAULT_OPTIONEN);
            setOptionIdx(0);
            const rp = getOptionPreis(DEFAULT_OPTIONEN[0], DEFAULT_PRODUKTE);
            setInvestition(rp);
            setInvestitionInput(rp.toLocaleString("de-DE"));
          }}
            className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all"
            style={{ borderColor: "#3D5278", color: "#3D5278", fontFamily: "var(--font-body)" }}>
            Standardwerte zurücksetzen
          </button>
        </div>
      )}
    </div>

    {/* Print Report */}
    <PrintReport
      termine={termine} mix={mix} gehalt={gehalt} raumkosten={raumkosten}
      investition={investition} optionName={currentOptionName} wachstum={wachstum}
      optionModule={optionIdx !== null ? getOptionModule(optionen[optionIdx], produkte) : []}
      ergebnis={ergebnis} annahmen={annahmen} einstellungen={einstellungen}
      printedAt={printedAt} kundenName={kundenName} velogicLiz={velogicLiz}/>
    </>
  );
}
