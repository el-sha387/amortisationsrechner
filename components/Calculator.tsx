"use client";

import { useState, useMemo } from "react";
import AmortizationChart from "./AmortizationChart";

const INVESTITIONS_STUFEN = [
  { label: "Stufe 1", betrag: 4900, beschreibung: "Sattel-Analyse Einsteiger" },
  { label: "Stufe 2", betrag: 8150, beschreibung: "Bikefitting Komplett" },
  { label: "Stufe 3", betrag: 12000, beschreibung: "Premium Studio" },
];

const LIZENZ_MONAT = 25;
const ERSATZFOLIE_MONAT = 749 / 36;
const RAUM_QM = 10;
const ISCO_MONAT = 29;
const ARBEITSZEIT_TERMIN = 1.25;
const VOLLZEIT_STUNDEN = 172;
const LOHN_NEBENKOSTEN = 0.2;
const D1_UMSATZ = 163.39; // Sattel-Analyse inkl. Sattelverkauf
const D2_UMSATZ = 171.78; // Bikefitting Basis inkl. Sattelverkauf

function berechne(investition: number, termine: number, gehalt: number, raumkosten: number, mixAnteil: number) {
  const technik = investition / 36 + LIZENZ_MONAT + ERSATZFOLIE_MONAT;
  const mitarbeiter = gehalt * (1 + LOHN_NEBENKOSTEN) * ((termine * ARBEITSZEIT_TERMIN) / VOLLZEIT_STUNDEN);
  const raum = raumkosten * RAUM_QM;
  const ausgaben = technik + mitarbeiter + raum + ISCO_MONAT;

  const umsatzTermin = mixAnteil * D1_UMSATZ + (1 - mixAnteil) * D2_UMSATZ;
  const einnahmen = termine * umsatzTermin;
  const ueberschuss = einnahmen - ausgaben;

  const breakEvenMonate = ueberschuss > 0 ? investition / ueberschuss : Infinity;
  const breakEvenTermine = ueberschuss > 0 ? (ausgaben / (umsatzTermin - ausgaben / termine)) : Infinity;

  const gewinnJahr1 = ueberschuss * 12;
  const gewinnJahr3 = ueberschuss * 36 - investition;
  const roiJahr3 = investition > 0 ? (gewinnJahr3 / investition) * 100 : 0;

  return {
    ausgaben,
    einnahmen,
    ueberschuss,
    breakEvenMonate,
    breakEvenTermine,
    gewinnJahr1,
    gewinnJahr3,
    roiJahr3,
    umsatzTermin,
  };
}

function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function Calculator() {
  const [stufe, setStufe] = useState<number | null>(0);
  const [investition, setInvestition] = useState(4900);
  const [investitionInput, setInvestitionInput] = useState("4.900");
  const [termine, setTermine] = useState(20);
  const [gehalt, setGehalt] = useState(2600);
  const [raumkosten, setRaumkosten] = useState(14);
  const [mix, setMix] = useState(0.8);

  const ergebnis = useMemo(
    () => berechne(investition, termine, gehalt, raumkosten, mix),
    [investition, termine, gehalt, raumkosten, mix]
  );

  function handleStufe(idx: number) {
    setStufe(idx);
    const betrag = INVESTITIONS_STUFEN[idx].betrag;
    setInvestition(betrag);
    setInvestitionInput(betrag.toLocaleString("de-DE"));
  }

  function handleInvestitionInput(raw: string) {
    setInvestitionInput(raw);
    const parsed = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 1000) {
      setInvestition(parsed);
      setStufe(null);
    }
  }

  const positiv = ergebnis.ueberschuss > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="rounded-2xl mb-6 overflow-hidden shadow-md" style={{ background: "#3D5278" }}>
        <div className="px-6 py-5 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              Rentabilitätsrechner
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#AADD00" }}>
              gebioMized Bikefitting-Technologie · Deine Investition in Zahlen
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          {/* Investition */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278" }}>
              Investition
            </h2>
            <div className="flex gap-2 mb-3">
              {INVESTITIONS_STUFEN.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleStufe(i)}
                  className="flex-1 py-2 px-2 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: stufe === i ? "#3D5278" : "#e5e7eb",
                    background: stufe === i ? "#3D5278" : "white",
                    color: stufe === i ? "white" : "#374151",
                  }}
                >
                  <div>{s.label}</div>
                  <div className="text-xs font-normal opacity-80">{s.betrag.toLocaleString("de-DE")} €</div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 border-2 rounded-xl px-3 py-2 text-right font-semibold focus:outline-none"
                style={{ borderColor: stufe === null ? "#3D5278" : "#e5e7eb" }}
                value={investitionInput}
                onChange={(e) => handleInvestitionInput(e.target.value)}
                onFocus={() => setStufe(null)}
              />
              <span className="text-gray-500 font-medium">€</span>
            </div>
          </div>

          {/* Termine */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278" }}>
              Geplante Termine / Monat
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={80}
                step={5}
                value={termine}
                onChange={(e) => setTermine(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-bold text-xl w-10 text-right" style={{ color: "#3D5278" }}>{termine}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5</span>
              <span>40 (realistisch)</span>
              <span>80</span>
            </div>
          </div>

          {/* Gehalt */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278" }}>
              Mitarbeiter Bruttogehalt / Monat
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2000}
                max={4000}
                step={100}
                value={gehalt}
                onChange={(e) => setGehalt(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-bold text-lg w-20 text-right" style={{ color: "#3D5278" }}>
                {gehalt.toLocaleString("de-DE")} €
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2.000 €</span>
              <span>4.000 €</span>
            </div>
          </div>

          {/* Raumkosten */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-3" style={{ color: "#3D5278" }}>
              Raummiete / m²
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={8}
                max={25}
                step={1}
                value={raumkosten}
                onChange={(e) => setRaumkosten(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-bold text-lg w-16 text-right" style={{ color: "#3D5278" }}>
                {raumkosten} €
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Annahme: 10 m² Messfläche</div>
          </div>

          {/* Mix */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm uppercase tracking-wide mb-1" style={{ color: "#3D5278" }}>
              Leistungs-Mix
            </h2>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Sattel-Analyse (89 € UVP)</span>
              <span>Bikefitting Basis (149 € UVP)</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={mix}
              onChange={(e) => setMix(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm font-semibold mt-1" style={{ color: "#3D5278" }}>
              <span>{Math.round(mix * 100)} %</span>
              <span>{Math.round((1 - mix) * 100)} %</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Einnahmen / Monat"
              value={`${fmt(ergebnis.einnahmen)} €`}
              sub={`${fmt(ergebnis.umsatzTermin, 2)} € / Termin`}
              accent="#AADD00"
            />
            <MetricCard
              label="Kosten / Monat"
              value={`${fmt(ergebnis.ausgaben)} €`}
              sub="inkl. Abschreibung & Gehalt"
              accent="#e5e7eb"
            />
            <MetricCard
              label="Überschuss / Monat"
              value={`${positiv ? "" : "–"}${fmt(Math.abs(ergebnis.ueberschuss))} €`}
              sub={positiv ? "Monatlicher Gewinn" : "Noch nicht rentabel"}
              accent={positiv ? "#3D5278" : "#ef4444"}
              highlight
            />
            <MetricCard
              label="Break-Even"
              value={positiv ? `${fmt(ergebnis.breakEvenMonate, 1)} Monate` : "–"}
              sub={positiv ? `${fmt(ergebnis.breakEvenTermine, 0)} Termine gesamt` : "Termine erhöhen"}
              accent="#3D5278"
            />
          </div>

          {/* ROI box */}
          <div className="rounded-2xl p-5 shadow-sm text-white" style={{ background: "#3D5278" }}>
            <div className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#AADD00" }}>
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
                <div className="font-bold text-lg" style={{ color: "#AADD00" }}>
                  {fmt(ergebnis.roiJahr3, 0)} %
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#3D5278" }}>
              Amortisationsverlauf (36 Monate)
            </h3>
            <AmortizationChart
              investition={investition}
              ueberschussMonat={ergebnis.ueberschuss}
              breakEvenMonate={ergebnis.breakEvenMonate}
            />
          </div>

          {/* Hinweise */}
          <div className="bg-white rounded-2xl p-5 shadow-sm text-xs text-gray-500 space-y-1">
            <div className="font-semibold text-gray-700 mb-2">Berechnungsgrundlagen</div>
            <div>· Messtechnik linear auf 36 Monate abgeschrieben</div>
            <div>· In 90 % der Termine: Sattelverkauf (anteilig einkalkuliert)</div>
            <div>· 1,25 Std. Arbeitszeit pro Termin (inkl. Admin & Report)</div>
            <div>· Raumgröße: 10 m² · ISCO-Jahreskurs: 348 € / Jahr</div>
            <div>· Alle Beträge netto (ohne MwSt.)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, sub, accent, highlight,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 shadow-sm"
      style={{ background: highlight ? accent : "white", borderLeft: highlight ? "none" : `4px solid ${accent}` }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: highlight ? "white" : "#6b7280" }}>
        {label}
      </div>
      <div className="font-bold text-xl leading-tight" style={{ color: highlight ? "white" : "#1f2937" }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: highlight ? "rgba(255,255,255,0.75)" : "#9ca3af" }}>
        {sub}
      </div>
    </div>
  );
}
