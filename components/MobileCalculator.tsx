"use client";

import { useState, useMemo } from "react";
import { calcMonth, fmt } from "@/lib/calc";

// ─── Konstanten ───────────────────────────────────────────────────────────────

const STUFEN = [
  { label: "Stufe 1", betrag: 2500 },
  { label: "Stufe 2", betrag: 5000 },
  { label: "Stufe 3", betrag: 8000 },
];

const TOTAL_SCREENS = 6; // 0=Start, 1–5=Wizard

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

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

function ResultRow({ label, value, sub, lime }: { label: string; value: string; sub?: string; lime?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm text-gray-500" style={{ fontFamily: "var(--font-body)" }}>{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <div className="font-bold text-lg text-right" style={{ color: lime ? "#AADD00" : "#3D5278", fontFamily: "var(--font-body)" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function MobileCalculator() {
  const [screen, setScreen]           = useState(0);
  const [direction, setDirection]     = useState<1 | -1>(1);

  // Eingaben
  const [termine, setTermine]         = useState(20);
  const [mix, setMix]                 = useState(0.8);
  const [gehalt, setGehalt]           = useState(2600);
  const [raumkosten, setRaumkosten]   = useState(14);
  const [stufeIdx, setStufeIdx]       = useState<number | null>(0);
  const [investition, setInvestition] = useState(2500);
  const [investInput, setInvestInput] = useState("2.500");

  function navigate(delta: 1 | -1) {
    setDirection(delta);
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
    () => calcMonth(investition, termine, gehalt, raumkosten, mix),
    [investition, termine, gehalt, raumkosten, mix]
  );

  // Screen 5: Jahresprognosen
  const starr = useMemo(() => ({
    j1: calcMonth(investition, termine,        gehalt, raumkosten, mix),
    j2: calcMonth(investition, termine,        gehalt, raumkosten, mix),
    j3: calcMonth(investition, termine,        gehalt, raumkosten, mix),
  }), [investition, termine, gehalt, raumkosten, mix]);

  const variabel = useMemo(() => ({
    j1: calcMonth(investition, termine,        gehalt, raumkosten, mix),
    j2: calcMonth(investition, termine * 1.10, gehalt, raumkosten, mix),
    j3: calcMonth(investition, termine * 1.20, gehalt, raumkosten, mix),
  }), [investition, termine, gehalt, raumkosten, mix]);

  const screens = [
    // ── 0: Start ─────────────────────────────────────────────────────────────
    <div key="start" className="flex flex-col items-center justify-center h-full px-8 text-center gap-8">
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-2"
          style={{ background: "rgba(170,221,0,0.15)" }}>
          <span className="text-4xl font-black" style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>g</span>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>
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
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-gray-600" style={{ fontFamily: "var(--font-heading)" }}>
              Leistungs-Mix
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Sattel-Analyse<br/><span className="text-gray-400">99 € UVP</span></span>
            <span className="text-right">Bikefitting Basis<br/><span className="text-gray-400">149 € UVP</span></span>
          </div>
          <input type="range" min={0} max={1} step={0.1} value={mix}
            onChange={e => setMix(Number(e.target.value))} />
          <div className="flex justify-between">
            <span className="font-bold text-base" style={{ color: "#3D5278" }}>{Math.round(mix * 100)} %</span>
            <span className="text-xs text-gray-400 self-center">Ø {fmt(basis.umsatzTermin, 2)} € / Termin</span>
            <span className="font-bold text-base" style={{ color: "#3D5278" }}>{Math.round((1 - mix) * 100)} %</span>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#f4f6f9" }}>
          <div className="text-xs text-gray-500 mb-1">Monatliche Einnahmen (Basis)</div>
          <div className="text-2xl font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-body)" }}>
            {fmt(basis.einnahmen)} €
          </div>
          <div className="text-xs text-gray-400 mt-0.5">bei {termine} Terminen × {fmt(basis.umsatzTermin, 2)} €</div>
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
          <div className="text-xs text-gray-500 mb-2">Laufende Kosten / Monat</div>
          <div className="space-y-1.5 text-sm">
            {[
              ["Mitarbeiter (anteilig)", `${fmt(gehalt * 1.2 * (termine * 1.25 / 172))} €`],
              ["Raummiete", `${fmt(raumkosten * 10)} €`],
              ["Lizenz + Ersatzteile", "46 €"],
              ["ISCO-Kurs", "29 €"],
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
              <span className="text-xs font-bold" style={{ color: stufeIdx === i ? "#AADD00" : "#9ca3af", fontFamily: "var(--font-heading)" }}>
                {s.label}
              </span>
              <span className="font-bold text-base leading-tight" style={{ color: stufeIdx === i ? "white" : "#1f2937", fontFamily: "var(--font-body)" }}>
                {s.betrag.toLocaleString("de-DE")} €
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Eigener Betrag
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={investInput}
              onChange={e => handleInvestInput(e.target.value)}
              onFocus={() => setStufeIdx(null)}
              className="flex-1 border-2 rounded-xl px-4 py-3 text-right text-xl font-bold focus:outline-none"
              style={{ borderColor: stufeIdx === null ? "#3D5278" : "#e5e7eb", color: "#1f2937", fontFamily: "var(--font-body)" }}
              placeholder="z. B. 6.500"
            />
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
        <p className="text-xs text-gray-400 mt-1">Deine monatliche Rentabilität auf einen Blick</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {/* Highlight-Card */}
        <div className="rounded-2xl p-5 mb-4 text-white" style={{ background: "#3D5278" }}>
          <div className="text-xs uppercase tracking-wide mb-1 opacity-70">Monatlicher Überschuss</div>
          <div className="text-4xl font-black leading-tight" style={{ color: "#AADD00", fontFamily: "var(--font-body)" }}>
            {fmt(basis.ueberschuss)} €
          </div>
          <div className="text-sm mt-2 opacity-70">
            {basis.ueberschuss > 0
              ? `Investition amortisiert in ${fmt(basis.breakEvenMonate, 1)} Monaten`
              : "Termine erhöhen für positive Rentabilität"}
          </div>
        </div>

        {/* Detail-Liste */}
        <div className="bg-white rounded-2xl px-4 mb-4 shadow-sm">
          <ResultRow label="Einnahmen / Monat" value={`${fmt(basis.einnahmen)} €`}
            sub={`${termine} Termine × ${fmt(basis.umsatzTermin, 2)} €`} />
          <ResultRow label="Kosten / Monat" value={`${fmt(basis.ausgaben)} €`}
            sub="inkl. Abschreibung, Gehalt, Raum" />
          <ResultRow label="Break-Even" value={basis.breakEvenMonate < Infinity ? `${fmt(basis.breakEvenMonate, 1)} Monate` : "–"}
            sub={`${fmt(basis.breakEvenTermine, 0)} Termine / Monat kostendeckend`} />
        </div>

        {/* Jahreskennzahl */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#f4f6f9" }}>
          <div className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>Jahr 1 auf einen Blick</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Jahresgewinn", `${fmt(basis.ueberschuss * 12)} €`],
              ["ROI (Jahr 1)", `${fmt(investition > 0 ? (basis.ueberschuss * 12 / investition) * 100 : 0, 0)} %`],
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
            <span className="text-sm font-bold" style={{ color: "#3D5278", fontFamily: "var(--font-heading)" }}>Starr — {termine} Termine / Monat konstant</span>
          </div>
          <div className="bg-white px-4 divide-y divide-gray-100">
            {[starr.j1, starr.j2, starr.j3].map((j, i) => (
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
                {fmt((starr.j1.ueberschuss + starr.j2.ueberschuss + starr.j3.ueberschuss) * 12)} €
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
              { j: variabel.j1, t: termine,             wachstum: null },
              { j: variabel.j2, t: Math.round(termine * 1.10), wachstum: "+10 %" },
              { j: variabel.j3, t: Math.round(termine * 1.20), wachstum: "+20 %" },
            ].map(({ j, t, wachstum }, i) => (
              <div key={i} className="py-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">Jahr {i + 1}</span>
                    {wachstum && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(170,221,0,0.15)", color: "#3D5278" }}>
                        {wachstum}
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
                  {fmt((variabel.j1.ueberschuss + variabel.j2.ueberschuss + variabel.j3.ueberschuss) * 12)} €
                </div>
                <div className="text-xs text-gray-400">
                  ROI {fmt(investition > 0 ? ((variabel.j1.ueberschuss + variabel.j2.ueberschuss + variabel.j3.ueberschuss) * 12 / investition) * 100 : 0, 0)} %
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
  const wizardStep = screen - 1; // 0–4

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto" style={{ background: isStart ? "#3D5278" : "#f4f6f9" }}>

      {/* Header */}
      {!isStart && (
        <div className="flex-none px-5 pt-safe pt-4 pb-3" style={{ background: "#3D5278" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#AADD00", fontFamily: "var(--font-heading)" }}>
              gebioMized
            </span>
            <span className="text-xs text-white/50">{wizardStep} / 5</span>
          </div>
          <ProgressDots current={wizardStep - 1} total={5} />
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
          {!isLast ? (
            <button onClick={() => navigate(1)}
              className="flex-1 py-3.5 rounded-2xl font-bold text-base transition-all active:scale-95"
              style={{ background: "#3D5278", color: "white", fontFamily: "var(--font-heading)" }}>
              Weiter →
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
