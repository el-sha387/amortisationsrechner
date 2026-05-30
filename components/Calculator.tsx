"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

// AiRO CI
const AIRO_BLACK  = "#0d0d0d";
const AIRO_GOLD   = "#F5A800";
const AIRO_GOLD2  = "#c98b00";   // dunkleres Gold für Hover/Borders

// ─── Typen ────────────────────────────────────────────────────────────────────

interface SessionTyp {
  id: string;
  name: string;
  dauerMin: number;
  preisNetto: number;
}

interface Paket {
  id: "starter" | "pro";
  name: string;
  twinsJahr: number;
  kostenProTwin: number;
  jahreslizenz: number;
}

interface Annahmen {
  raumQm: number;
  iscoJahr: number;
  arbeitszeitPuffer: number;
  lohnNebenkosten: number;
  vollzeitStunden: number;
}

// ─── Stammdaten ───────────────────────────────────────────────────────────────

const SESSION_TYPEN: SessionTyp[] = [
  { id: "helm",      name: "Helmberatung",         dauerMin: 60,  preisNetto: 167.23 },
  { id: "addon",     name: "AiRO als Aero Add-On", dauerMin: 30,  preisNetto: 83.19  },
  { id: "aero",      name: "Aero Fit Potential",   dauerMin: 60,  preisNetto: 167.23 },
  { id: "windkanal", name: "Digitaler Windkanal",  dauerMin: 150, preisNetto: 411.76 },
];

const PAKETE: Paket[] = [
  { id: "starter", name: "Starter", twinsJahr: 50,  kostenProTwin: 50, jahreslizenz: 2500 },
  { id: "pro",     name: "PRO",     twinsJahr: 100, kostenProTwin: 35, jahreslizenz: 3500 },
];

const DEFAULT_ANNAHMEN: Annahmen = {
  raumQm: 10,
  iscoJahr: 348,
  arbeitszeitPuffer: 15,
  lohnNebenkosten: 20,
  vollzeitStunden: 172,
};

const DEFAULT_MENGEN: Record<string, number> = {
  helm: 4, addon: 8, aero: 4, windkanal: 2,
};

// ─── Berechnung ───────────────────────────────────────────────────────────────

function berechne(
  mengen: Record<string, number>,
  paket: Paket,
  gehalt: number,
  raumkosten: number,
  a: Annahmen,
) {
  const sessionsMonat = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id], 0);
  const einnahmen = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id] * t.preisNetto, 0);
  const lizenzkosten = sessionsMonat * paket.kostenProTwin;
  const totalDauerMin = SESSION_TYPEN.reduce((s, t) => s + mengen[t.id] * t.dauerMin, 0);
  const stundenGesamt = sessionsMonat > 0
    ? (totalDauerMin + sessionsMonat * a.arbeitszeitPuffer) / 60
    : 0;
  const personalkosten = gehalt * (1 + a.lohnNebenkosten / 100) * stundenGesamt / a.vollzeitStunden;
  const raumMonat = raumkosten * a.raumQm;
  const iscoMonat = a.iscoJahr / 12;
  const fixKosten = raumMonat + iscoMonat;
  const ausgaben = lizenzkosten + personalkosten + fixKosten;
  const ueberschuss = einnahmen - ausgaben;
  const umsatzProSession = sessionsMonat > 0 ? einnahmen / sessionsMonat : 0;
  const margeProSession = umsatzProSession - paket.kostenProTwin;
  const sessionsJahr = sessionsMonat * 12;
  const twinsUeberschuss = sessionsJahr - paket.twinsJahr;
  const sparenMitPro = paket.id === "starter"
    ? Math.max(0,
        sessionsJahr * (PAKETE[0].kostenProTwin - PAKETE[1].kostenProTwin)
        - (PAKETE[1].jahreslizenz - PAKETE[0].jahreslizenz)
      )
    : 0;
  const jahresgewinn = ueberschuss * 12;

  return { sessionsMonat, einnahmen, lizenzkosten, personalkosten, fixKosten,
           ausgaben, ueberschuss, umsatzProSession, margeProSession,
           sessionsJahr, twinsUeberschuss, sparenMitPro, jahresgewinn };
}

function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

// ─── Sub-Komponenten ─────────────────────────────────────────────────────────

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

function NumInput({ label, value, onChange, suffix = "", step = 1, min = 0, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; min?: number; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>{label}</label>
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

// ─── Print-Report ─────────────────────────────────────────────────────────────

function PrintReport({ mengen, paket, gehalt, raumkosten, ergebnis, annahmen,
  kundenName, printedAt }: {
  mengen: Record<string, number>; paket: Paket; gehalt: number;
  raumkosten: number;
  ergebnis: ReturnType<typeof berechne>;
  annahmen: Annahmen; kundenName: string; printedAt: Date;
}) {
  const navy = "#0d0d0d";
  const lime = "#F5A800";
  const fs   = 11;
  const sH: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1, color: navy, marginBottom: 6, marginTop: 0,
  };
  const row = (label: string, value: string, bold = false, accent = false) => (
    <div style={{ display: "flex", justifyContent: "space-between",
      padding: "3px 0", borderBottom: "1px solid #f3f4f6", fontSize: fs }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: accent ? navy : "#1f2937" }}>{value}</span>
    </div>
  );
  const totalRow = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between",
      marginTop: 5, paddingTop: 5, borderTop: `2px solid ${navy}`,
      fontWeight: 700, color: navy, fontSize: fs }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div id="print-report" className="print-only">
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1f2937", background: "white",
      padding: "20px 28px", fontSize: fs }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 10, marginBottom: kundenName ? 8 : 14, borderBottom: `3px solid ${lime}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/airo-logo.png" alt="AiRO" style={{ height: 32, objectFit: "contain" }}/>
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 8 }}>
            Aerodynamik-Fitting
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: navy }}>Rentabilitätsanalyse</div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>
            {printedAt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {kundenName && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "#1f2937" }}>Analyse für </span>
          <strong style={{ fontSize: 13, color: navy }}>{kundenName}</strong>
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 8 }}>
            · Individuelle Berechnung auf Basis Ihrer Angaben
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 16, marginBottom: 12 }}>

        {/* Spalte 1: Sessions */}
        <div>
          <h3 style={sH}>Session-Mix — {paket.name} ({paket.kostenProTwin} €/Twin)</h3>
          {SESSION_TYPEN.map(t => mengen[t.id] > 0 ? (
            <div key={t.id} style={{ padding: "3px 0", borderBottom: "1px solid #f3f4f6",
              display: "flex", justifyContent: "space-between", fontSize: fs }}>
              <span style={{ color: "#374151" }}>{t.name}</span>
              <span style={{ fontWeight: 600 }}>{mengen[t.id]} × {fmt(t.preisNetto, 2)} €</span>
            </div>
          ) : null)}
          {totalRow(`${ergebnis.sessionsMonat} Sessions / Mo.`, `${fmt(ergebnis.einnahmen, 0)} €`)}
          <div style={{ fontSize: 9, color: "#d97706", marginTop: 3 }}>
            {ergebnis.sessionsJahr} Twins / Jahr · Paket: {paket.twinsJahr} inkl.
          </div>
        </div>

        {/* Spalte 2: Kosten */}
        <div>
          <h3 style={sH}>Monatl. Kosten (Jahr 1)</h3>
          {row(`AiRO-Lizenz (${paket.kostenProTwin} €/Twin)`, `${fmt(ergebnis.lizenzkosten, 0)} €`)}
          {row("Mitarbeiter", `${fmt(ergebnis.personalkosten, 0)} €`)}
          {row("Raum", `${fmt(raumkosten * annahmen.raumQm, 0)} €`)}
          {row("ISCO", `${fmt(annahmen.iscoJahr / 12, 0)} €`)}
          {totalRow("Kosten gesamt", `${fmt(ergebnis.ausgaben, 0)} €`)}
        </div>

        {/* Spalte 3: Ergebnis */}
        <div>
          <h3 style={sH}>Einnahmen & Ergebnis</h3>
          {row("Ø Umsatz / Session", `${fmt(ergebnis.umsatzProSession, 2)} €`, true)}
          {row("Lizenzkosten / Session", `${paket.kostenProTwin} €`)}
          {row("Ø Marge / Session", `${fmt(ergebnis.margeProSession, 2)} €`, true, true)}
          {row("Sessions / Monat", `${ergebnis.sessionsMonat}`)}
          {row("Einnahmen / Monat", `${fmt(ergebnis.einnahmen, 0)} €`, true)}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 3 }}/>
          {row("Überschuss / Monat", `${fmt(ergebnis.ueberschuss, 0)} €`, true, ergebnis.ueberschuss > 0)}
        </div>
      </div>

      {/* Highlight-Banner */}
      <div style={{ background: navy, borderRadius: 8, padding: "10px 18px",
        display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr",
        alignItems: "center", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Jahresgewinn",    value: `${fmt(ergebnis.jahresgewinn)} €`,          color: lime,    big: true  },
          { label: "Überschuss / Mo.", value: `${fmt(ergebnis.ueberschuss)} €`,          color: "white", big: true  },
          { label: "Marge / Session", value: `${fmt(ergebnis.margeProSession, 2)} €`,    color: lime,    big: false },
        ].flatMap((item, i) => [
          i > 0 ? <div key={`d${i}`} style={{ width: 1, height: 36, background: "rgba(255,255,255,0.15)", justifySelf: "center" }}/> : null,
          <div key={i} style={{ textAlign: i === 2 ? "right" : i === 1 ? "center" : "left" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: item.big ? 20 : 15, fontWeight: 900, color: item.color, lineHeight: 1 }}>
              {item.value}
            </div>
          </div>,
        ])}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1.5 }}>
          Alle Beträge netto · AiRO {paket.name}: {paket.kostenProTwin} €/Twin · Unverbindliche Modellrechnung
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gebioMized-logo.png" alt="gebioMized" style={{ height: 20, objectFit: "contain", filter: "invert(1)" }}/>
          <span style={{ fontSize: 9, color: "#9ca3af" }}>www.gebioMized.com</span>
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<"rechner" | "annahmen">("rechner");
  const [paketId, setPaketId] = useState<"starter" | "pro">("starter");
  const [mengen, setMengen] = useState<Record<string, number>>(DEFAULT_MENGEN);
  const [gehalt, setGehalt] = useState(2600);
  const [raumkosten, setRaumkosten] = useState(14);
  const [annahmen, setAnnahmen] = useState<Annahmen>(DEFAULT_ANNAHMEN);
  const [kundenName, setKundenName] = useState("");
  const [printedAt, setPrintedAt] = useState(() => new Date());

  const paket = PAKETE.find(p => p.id === paketId)!;

  function setA<K extends keyof Annahmen>(key: K, val: Annahmen[K]) {
    setAnnahmen(prev => ({ ...prev, [key]: val }));
  }

  const ergebnis = useMemo(
    () => berechne(mengen, paket, gehalt, raumkosten, annahmen),
    [mengen, paket, gehalt, raumkosten, annahmen]
  );

  const positiv = ergebnis.ueberschuss > 0;

  async function handlePrint() {
    setPrintedAt(new Date());
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && navigator.share) {
      await navigator.share({ title: "AiRO Rentabilitätsanalyse", url: window.location.href });
    } else {
      setTimeout(() => window.print(), 50);
    }
  }

  const tabs = [
    { id: "rechner",  label: "Rechner"  },
    { id: "annahmen", label: "Annahmen" },
  ] as const;

  return (
    <>
    <div className="no-print max-w-5xl mx-auto px-4 py-6">

      {/* Header + Tabs */}
      <div className="rounded-2xl mb-5 overflow-hidden shadow-md" style={{ background: "#0d0d0d" }}>
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Image src="/airo-logo.png" alt="AiRO Logo" width={100} height={50}
              style={{ objectFit: "contain" }}/>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Rentabilitätsrechner
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "#F5A800", fontFamily: "var(--font-body)" }}>
                Aerodynamik-Fitting · powered by gebioMized · Deine Sessions in Zahlen
              </p>
            </div>
          </div>
          <Image src="/gebioMized-logo.png" alt="gebioMized Logo" width={110} height={40}
            style={{ objectFit: "contain", filter: "invert(1)" }}/>
        </div>
        <div className="flex px-6 gap-1 pb-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all"
              style={{
                background: activeTab === tab.id ? "#f4f6f9" : "transparent",
                color:      activeTab === tab.id ? "#0d0d0d" : "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-body)",
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Rechner ── */}
      {activeTab === "rechner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Linke Spalte */}
          <div className="space-y-4">

            {/* Paket-Auswahl */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>AiRO Paket</h2>
              <div className="grid grid-cols-2 gap-3">
                {PAKETE.map(p => (
                  <button key={p.id} onClick={() => setPaketId(p.id)}
                    className="rounded-xl border-2 p-4 text-left transition-all"
                    style={{
                      borderColor: paketId === p.id ? "#0d0d0d" : "#e5e7eb",
                      background:  paketId === p.id ? "#0d0d0d" : "white",
                    }}>
                    <div className="font-bold text-base mb-0.5"
                      style={{ color: paketId === p.id ? "#F5A800" : "#1f2937", fontFamily: "var(--font-heading)" }}>
                      {p.name}
                    </div>
                    <div className="text-xs font-semibold"
                      style={{ color: paketId === p.id ? "rgba(255,255,255,0.8)" : "#6b7280" }}>
                      {p.kostenProTwin} € / Twin · {p.twinsJahr} Twins / Jahr
                    </div>
                    <div className="text-xs mt-1"
                      style={{ color: paketId === p.id ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>
                      {p.jahreslizenz.toLocaleString("de-DE")} € / Jahr
                    </div>
                  </button>
                ))}
              </div>

              {paketId === "starter" && ergebnis.sparenMitPro > 0 && (
                <div className="mt-3 rounded-xl px-4 py-3 text-xs font-semibold"
                  style={{ background: "#fef9c3", color: "#854d0e" }}>
                  💡 Mit PRO würdest du bei deinem Volumen {fmt(ergebnis.sparenMitPro)} € / Jahr sparen
                </div>
              )}

              {ergebnis.twinsUeberschuss > 0 && (
                <div className="mt-3 rounded-xl px-4 py-3 text-xs font-semibold"
                  style={{ background: "#fef2f2", color: "#991b1b" }}>
                  ⚠️ Du planst {ergebnis.sessionsJahr} Twins / Jahr — {ergebnis.twinsUeberschuss} über dem Paket-Limit
                </div>
              )}
            </div>

            {/* Session-Mix */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>
                Sessions / Monat
              </h2>
              <div className="space-y-4">
                {SESSION_TYPEN.map(t => (
                  <div key={t.id}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: "#1f2937" }}>{t.name}</div>
                        <div className="text-xs text-gray-400">
                          {t.dauerMin} Min · {fmt(t.preisNetto, 2)} € netto ·{" "}
                          <span className="font-semibold" style={{ color: "#0d0d0d" }}>
                            Marge {fmt(t.preisNetto - paket.kostenProTwin, 2)} €
                          </span>
                        </div>
                      </div>
                      <input
                        type="number" min={0} step={1} value={mengen[t.id]}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          setMengen(prev => ({ ...prev, [t.id]: isNaN(v) || v < 0 ? 0 : v }));
                        }}
                        className="w-16 border-2 rounded-xl px-2 py-2 text-center font-bold focus:outline-none text-sm"
                        style={{ borderColor: "#e5e7eb", color: "#0d0d0d", fontFamily: "var(--font-body)" }}/>
                      <span className="text-xs text-gray-400 w-8">/ Mo.</span>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-bold"
                  style={{ color: "#0d0d0d" }}>
                  <span>Gesamt</span>
                  <span>{ergebnis.sessionsMonat} Sessions · {ergebnis.sessionsJahr} Twins / Jahr</span>
                </div>
              </div>
            </div>

            {/* Gehalt */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>
                Mitarbeiter Bruttogehalt / Monat
              </h2>
              <div className="flex items-center gap-3">
                <input type="range" min={2000} max={4000} step={100} value={gehalt}
                  onChange={e => setGehalt(Number(e.target.value))}/>
                <span className="font-bold text-lg w-20 text-right"
                  style={{ color: "#0d0d0d", fontFamily: "var(--font-body)" }}>
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
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>Raummiete / m²</h2>
              <div className="flex items-center gap-3">
                <input type="range" min={8} max={25} step={1} value={raumkosten}
                  onChange={e => setRaumkosten(Number(e.target.value))}/>
                <span className="font-bold text-lg w-16 text-right"
                  style={{ color: "#0d0d0d", fontFamily: "var(--font-body)" }}>{raumkosten} €</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Fläche: {annahmen.raumQm} m²</div>
            </div>

          </div>

          {/* Rechte Spalte */}
          <div className="space-y-4">

            {/* Metriken */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Einnahmen / Monat"
                value={`${fmt(ergebnis.einnahmen)} €`}
                sub={`Ø ${fmt(ergebnis.umsatzProSession, 2)} € / Session`}
                accent="#F5A800"/>
              <MetricCard
                label="Kosten / Monat"
                value={`${fmt(ergebnis.ausgaben)} €`}
                sub={`davon Lizenz ${fmt(ergebnis.lizenzkosten)} €`}
                accent="#e5e7eb"/>
              <MetricCard
                label="Überschuss / Monat"
                value={`${positiv ? "" : "–"}${fmt(Math.abs(ergebnis.ueberschuss))} €`}
                sub={positiv ? "Monatlicher Gewinn" : "Noch nicht rentabel"}
                accent={positiv ? "#0d0d0d" : "#ef4444"} highlight/>
              <MetricCard
                label="Ø Marge / Session"
                value={`${fmt(ergebnis.margeProSession, 2)} €`}
                sub={`nach ${paket.kostenProTwin} € Lizenz/Twin`}
                accent="#0d0d0d"/>
            </div>

            {/* Kostenaufschlüsselung */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="font-bold text-sm uppercase tracking-wide mb-3"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>
                Kostenaufschlüsselung / Monat
              </div>
              {[
                { label: `AiRO-Lizenz (${ergebnis.sessionsMonat} × ${paket.kostenProTwin} €)`, val: ergebnis.lizenzkosten, accent: true },
                { label: "Personalkosten",   val: ergebnis.personalkosten },
                { label: "Raumkosten",       val: raumkosten * annahmen.raumQm },
                { label: "ISCO / Sonstiges", val: annahmen.iscoJahr / 12 },
              ].map(({ label, val, accent }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 text-sm last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold" style={{ color: accent ? "#0d0d0d" : "#1f2937" }}>
                    {fmt(val)} €
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-1 border-t-2 text-sm font-bold"
                style={{ borderColor: "#0d0d0d", color: "#0d0d0d" }}>
                <span>Gesamt</span>
                <span>{fmt(ergebnis.ausgaben)} €</span>
              </div>
            </div>

            {/* Jahreszusammenfassung */}
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#0d0d0d" }}>
              <div className="px-5 pt-4 pb-2">
                <span className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: "#F5A800", fontFamily: "var(--font-heading)" }}>Jahresübersicht</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 pb-4">
                {[
                  { label: "Einnahmen p.a.", value: `${fmt(ergebnis.einnahmen * 12)} €` },
                  { label: "Kosten p.a.",    value: `${fmt(ergebnis.ausgaben * 12)} €`  },
                  { label: "Gewinn p.a.",    value: `${fmt(ergebnis.jahresgewinn)} €`, highlight: true },
                ].map((item, i) => (
                  <div key={i} className="px-4 py-4 text-center">
                    <div className="text-xs font-bold uppercase tracking-wide mb-2 opacity-60 text-white">
                      {item.label}
                    </div>
                    <div className="font-bold text-xl leading-tight"
                      style={{ color: item.highlight ? "#F5A800" : "white" }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>
                Report erstellen
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Kundenname (optional)</label>
                <input
                  type="text"
                  placeholder="z. B. Radsport Schneider GmbH"
                  value={kundenName}
                  onChange={e => setKundenName(e.target.value)}
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                  style={{ borderColor: "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}/>
              </div>
              <button onClick={handlePrint}
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "#0d0d0d", color: "white", fontFamily: "var(--font-body)" }}>
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

      {/* ── Tab: Annahmen ── */}
      {activeTab === "annahmen" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>Session-Preise (netto)</h2>
              <div className="space-y-2 text-sm text-gray-500">
                {SESSION_TYPEN.map(t => (
                  <div key={t.id} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span>{t.name} ({t.dauerMin} Min)</span>
                    <span className="font-semibold text-gray-700">{fmt(t.preisNetto, 2)} € netto</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">
                  Netto-Preise aus UVP zurückgerechnet (÷ 1,19).
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>Raum & Betrieb</h2>
              <div className="space-y-4">
                <NumInput label="Raumgröße" value={annahmen.raumQm}
                  onChange={v => setA("raumQm", v)} suffix="m²" step={1} min={5}/>
                <NumInput label="ISCO-Kurs / Jahr" value={annahmen.iscoJahr}
                  onChange={v => setA("iscoJahr", v)} suffix="€" step={10}/>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide mb-4"
                style={{ color: "#0d0d0d", fontFamily: "var(--font-heading)" }}>Mitarbeiter</h2>
              <div className="space-y-4">
                <NumInput label="Pufferzeit pro Session" value={annahmen.arbeitszeitPuffer}
                  onChange={v => setA("arbeitszeitPuffer", v)} suffix="Min" step={5} min={0}
                  hint="Admin, Vor- & Nachbereitung zusätzlich zur Session-Dauer"/>
                <NumInput label="Lohn-Nebenkosten" value={annahmen.lohnNebenkosten}
                  onChange={v => setA("lohnNebenkosten", v)} suffix="%" step={1}/>
                <NumInput label="Vollzeit-Stunden / Monat" value={annahmen.vollzeitStunden}
                  onChange={v => setA("vollzeitStunden", v)} suffix="Std." step={1} min={100}/>
              </div>
            </div>
          </div>
          <button onClick={() => setAnnahmen(DEFAULT_ANNAHMEN)}
            className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all"
            style={{ borderColor: "#0d0d0d", color: "#0d0d0d", fontFamily: "var(--font-body)" }}>
            Standardwerte zurücksetzen
          </button>
        </div>
      )}
    </div>

    <PrintReport
      mengen={mengen} paket={paket} gehalt={gehalt} raumkosten={raumkosten}
      ergebnis={ergebnis} annahmen={annahmen}
      kundenName={kundenName} printedAt={printedAt}/>
    </>
  );
}
