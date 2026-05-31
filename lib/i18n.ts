export type Lang = "de" | "en";

export const T = {
  de: {
    // Splash
    splashTitle:    "Rentabilitätsrechner",
    splashSub:      "Berechne in 3 Schritten, ob sich AiRO für dein Studio lohnt.",
    splashCta:      "Jetzt berechnen →",
    poweredBy:      "powered by gebioMized",

    // Header-Chip
    stepOf:         (s: number, t: number) => `${s} / ${t}`,

    // Screen 1
    paketTitle:     "Gewähltes Paket",
    paketSub:       "Die Lizenzkosten pro Twin bestimmen deine Marge.",
    proTwin:        "pro Twin",
    twinsYear:      "Twins / Jahr",
    margePerSession:"Marge pro Session",

    // Screen 2
    sessionsTitle:  "Sessions / Monat",
    sessionsSub:    "Wie viele Sessions planst du pro Typ?",
    anzahlProTyp:   "Anzahl pro Typ",
    gesamt:         "Gesamt",
    twins:          "Twins / Jahr",
    einnahmen:      "Einnahmen",
    monat:          "/ Mo.",
    hinweisProHinweis: (h: string) => `💡 ${h}`,
    autoProHinweis: "Kosten berechnet mit PRO (automatisch wegen Volumen)",
    autoProHinweisEn:"Costs calculated with PRO (auto due to volume)",
    ueberLimit:     (n: number) => `⚠️ ${n} Twins über Paket-Limit`,
    sparenMitPro:   (n: string) => `💡 Mit PRO sparst du ${n} € / Jahr`,

    // Screen 3
    kostenTitle:    "Kosten / Monat",
    kostenSub:      (liz: string, per: string) => `davon Lizenz ${liz} € · Personal ${per} €`,
    gehalt:         "Bruttogehalt / Monat",
    raummiete:      "Raummiete / m²",
    flaeche:        (qm: number) => `Fläche ${qm} m²`,
    aufschluesselung:"Aufschlüsselung",
    airoLizenz:     (n: number, k: number) => `AiRO-Lizenz (${n} × ${k} €)`,
    personal:       "Personalkosten",
    raumkosten:     "Raumkosten",
    isco:           "ISCO / Sonstiges",

    // Screen 4
    jahresgewinn:   "Dein Jahresgewinn",
    proMonat:       (m: string, s: number) => `= ${m} € pro Monat · ${s} Sessions / Mo.`,
    sessionsErhoehen:"Sessions erhöhen für positive Rentabilität",
    margeSession:   "Marge / Session",
    nachLizenz:     "nach Lizenz",
    kostenGedecktAb:"Kosten gedeckt ab",
    breakEven:      "Break-even",
    lizenzKostet:   "Lizenz kostet",
    einnahmenJahr:  "Einnahmen p.a.",
    kostenJahr:     "Kosten p.a.",
    gewinnJahr:     "Gewinn p.a.",
    neueBerechnung: "Neue Berechnung",

    // PDF
    pdfKundenname:  "Kundenname (optional, erscheint im Report)",
    pdfButton:      "PDF erstellen & teilen",
    pdfErstellt:    "PDF wird erstellt…",
    pdfFehler:      "PDF-Fehler – bitte erneut versuchen",
    pdfTitel:       "AiRO Rentabilitätsanalyse",
    pdfUntertitel:  "Individuelle Berechnung auf Basis Ihrer Angaben",
    pdfFirma:       "SnM gebioMized GmbH · www.gebioMized.com",
    pdfDatum:       "Datum",
    pdfInvestition: "Investition / Paket",
    pdfKosten:      "Kosten / Monat",
    pdfErgebnis:    "Ergebnis",
    pdfHinweis:     "Alle Beträge netto · Unverbindliche Modellrechnung",

    // Desktop header
    desktopTitle:   "AiRO Rentabilitätsrechner",
    langToggle:     "EN",
  },
  en: {
    splashTitle:    "Profitability Calculator",
    splashSub:      "Calculate in 3 steps whether AiRO pays off for your studio.",
    splashCta:      "Calculate now →",
    poweredBy:      "powered by gebioMized",

    stepOf:         (s: number, t: number) => `${s} / ${t}`,

    paketTitle:     "Selected Package",
    paketSub:       "License cost per twin determines your margin.",
    proTwin:        "per twin",
    twinsYear:      "twins / year",
    margePerSession:"Margin per session",

    sessionsTitle:  "Sessions / Month",
    sessionsSub:    "How many sessions do you plan per type?",
    anzahlProTyp:   "Count per type",
    gesamt:         "Total",
    twins:          "twins / year",
    einnahmen:      "Revenue",
    monat:          "/ mo.",
    hinweisProHinweis: (h: string) => `💡 ${h}`,
    autoProHinweis: "Costs calculated with PRO (auto due to volume)",
    autoProHinweisEn:"Costs calculated with PRO (auto due to volume)",
    ueberLimit:     (n: number) => `⚠️ ${n} twins over package limit`,
    sparenMitPro:   (n: string) => `💡 With PRO you save ${n} € / year`,

    kostenTitle:    "Costs / Month",
    kostenSub:      (liz: string, per: string) => `of which license ${liz} € · staff ${per} €`,
    gehalt:         "Gross salary / month",
    raummiete:      "Room rent / m²",
    flaeche:        (qm: number) => `Area ${qm} m²`,
    aufschluesselung:"Breakdown",
    airoLizenz:     (n: number, k: number) => `AiRO license (${n} × ${k} €)`,
    personal:       "Staff costs",
    raumkosten:     "Room costs",
    isco:           "ISCO / Other",

    jahresgewinn:   "Your Annual Profit",
    proMonat:       (m: string, s: number) => `= ${m} € per month · ${s} sessions / mo.`,
    sessionsErhoehen:"Increase sessions for positive profitability",
    margeSession:   "Margin / session",
    nachLizenz:     "after license",
    kostenGedecktAb:"Costs covered from",
    breakEven:      "Break-even",
    lizenzKostet:   "License costs",
    einnahmenJahr:  "Revenue p.a.",
    kostenJahr:     "Costs p.a.",
    gewinnJahr:     "Profit p.a.",
    neueBerechnung: "New Calculation",

    pdfKundenname:  "Customer name (optional, shown in report)",
    pdfButton:      "Create & share PDF",
    pdfErstellt:    "Creating PDF…",
    pdfFehler:      "PDF error – please try again",
    pdfTitel:       "AiRO Profitability Analysis",
    pdfUntertitel:  "Individual calculation based on your data",
    pdfFirma:       "SnM gebioMized GmbH · www.gebioMized.com",
    pdfDatum:       "Date",
    pdfInvestition: "Investment / Package",
    pdfKosten:      "Costs / month",
    pdfErgebnis:    "Result",
    pdfHinweis:     "All amounts net · Non-binding model calculation",

    desktopTitle:   "AiRO Profitability Calculator",
    langToggle:     "DE",
  },
} as const;

export type Translations = typeof T.de;
