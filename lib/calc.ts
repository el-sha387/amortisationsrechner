// Gemeinsame Berechnungslogik für Desktop- und Mobile-Version

export const DEFAULTS = {
  lizenzMonat: 25,
  ersatzfolieGesamt: 749,
  abschreibungMonate: 36,
  raumQm: 10,
  iscoJahr: 348,
  arbeitszeitTermin: 1.25,
  vollzeitStunden: 172,
  lohnNebenkosten: 0.20,
  d1DlNetto: 83.20,
  d1SattelPreis: 88.60,
  d1SattelAnteil: 1.0,
  d2DlNetto: 125.21,
  d2SattelPreis: 77.62,
  d2SattelAnteil: 0.60,
};

export function calcMonth(
  investition: number,
  termine: number,
  gehalt: number,
  raumkosten: number,
  mixAnteil: number  // 1 = 100% D1, 0 = 100% D2
) {
  const { lizenzMonat, ersatzfolieGesamt, abschreibungMonate, raumQm,
          iscoJahr, arbeitszeitTermin, vollzeitStunden, lohnNebenkosten,
          d1DlNetto, d1SattelPreis, d1SattelAnteil,
          d2DlNetto, d2SattelPreis, d2SattelAnteil } = DEFAULTS;

  const d1Umsatz = d1DlNetto + d1SattelAnteil * d1SattelPreis;
  const d2Umsatz = d2DlNetto + d2SattelAnteil * d2SattelPreis;

  const abschreibung   = investition / abschreibungMonate;
  const technikLaufend = lizenzMonat + ersatzfolieGesamt / abschreibungMonate;
  const mitarbeiter    = gehalt * (1 + lohnNebenkosten) *
                         ((termine * arbeitszeitTermin) / vollzeitStunden);
  const raum    = raumkosten * raumQm;
  const isco    = iscoJahr / 12;
  const ausgaben = abschreibung + technikLaufend + mitarbeiter + raum + isco;

  const umsatzTermin = mixAnteil * d1Umsatz + (1 - mixAnteil) * d2Umsatz;
  const einnahmen    = termine * umsatzTermin;
  const ueberschuss  = einnahmen - ausgaben;
  const cashGewinn   = ueberschuss + abschreibung;

  const breakEvenMonate  = cashGewinn > 0 ? investition / cashGewinn : Infinity;
  const breakEvenTermine = ueberschuss > 0
    ? ausgaben / (umsatzTermin - ausgaben / termine)
    : Infinity;

  return { ausgaben, einnahmen, ueberschuss, cashGewinn,
           umsatzTermin, breakEvenMonate, breakEvenTermine };
}

export function fmt(val: number, digits = 0) {
  return val.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
