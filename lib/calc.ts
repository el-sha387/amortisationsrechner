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
  d1DlNetto:      83.20,
  d1SattelUvp:    88.60,   // UVP netto (Verkaufspreis)
  d1SattelEK:      0,      // Händler-Einkaufspreis
  d1SattelAnteil:  0.70,
  d2DlNetto:      125.21,
  d2SattelUvp:    77.62,
  d2SattelEK:      0,
  d2SattelAnteil:  0.50,
};

export function calcMonth(
  investition: number,
  termine: number,
  gehalt: number,
  raumkosten: number,
  mixAnteil: number  // 0 = 100% D1, 1 = 100% D2
) {
  const { lizenzMonat, ersatzfolieGesamt, abschreibungMonate, raumQm,
          iscoJahr, arbeitszeitTermin, vollzeitStunden, lohnNebenkosten,
          d1DlNetto, d1SattelUvp, d1SattelEK, d1SattelAnteil,
          d2DlNetto, d2SattelUvp, d2SattelEK, d2SattelAnteil } = DEFAULTS;

  // Marge = VK − EK; bei EK=0 fließt der volle VK ein
  const d1Umsatz = d1DlNetto + d1SattelAnteil * (d1SattelUvp - d1SattelEK);
  const d2Umsatz = d2DlNetto + d2SattelAnteil * (d2SattelUvp - d2SattelEK);

  const abschreibung   = investition / abschreibungMonate;
  const technikLaufend = lizenzMonat + ersatzfolieGesamt / abschreibungMonate;
  const mitarbeiter    = gehalt * (1 + lohnNebenkosten) *
                         ((termine * arbeitszeitTermin) / vollzeitStunden);
  const raum    = raumkosten * raumQm;
  const isco    = iscoJahr / 12;
  const ausgaben = abschreibung + technikLaufend + mitarbeiter + raum + isco;

  const umsatzTermin = (1 - mixAnteil) * d1Umsatz + mixAnteil * d2Umsatz;
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
