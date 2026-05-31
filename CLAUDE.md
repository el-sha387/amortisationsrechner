@AGENTS.md

# AiRO Rentabilitätsrechner — Projekt-Kontext

## Was ist das?
Ein Sales-Tool für den gebioMized-Außendienst. Zeigt Bikefitting-Studios, ob sich die Investition in AiRO (Aerodynamik-Messtechnologie) rentiert. Wird im Kundengespräch eingesetzt — mobil auf dem iPhone, Desktop im Browser.

**Live-URLs:**
- Desktop: https://amortisationsrechner-orcin.vercel.app
- Mobile:  https://amortisationsrechner-orcin.vercel.app/mobile
- GitHub:  https://github.com/el-sha387/amortisationsrechner

**Abgrenzung:** Dieses Projekt = AiRO Aerodynamik. Das gebioMized Bikefitting-Projekt liegt unter `OneDrive/Claude/amortisationsrechner/` → GitHub `el-sha387/gebioMized-bikefitting-rechner`

## CI / Farben
```
AIRO_BLACK = "#0d0d0d"   // Hintergrund überall
AIRO_GOLD  = "#F5A800"   // Primärfarbe, Highlights, CTAs
```

## Dateistruktur
```
app/
  page.tsx              → Desktop-Rechner (Route: /)
  mobile/page.tsx       → Mobile-Rechner  (Route: /mobile)
  layout.tsx            → PWA-Manifest, Theme-Color schwarz, Titel "AiRO"
components/
  Calculator.tsx        → Desktop-Komponente (2-Spalten, Print-Report)
  MobileCalculator.tsx  → Mobile 5-Screen Wizard (mit PDF + Share)
lib/
  i18n.ts               → DE/EN Übersetzungen für alle Strings
public/
  airo-logo.png / .svg  → AiRO-Logo (gold/orange, kein Filter auf schwarz)
  gebioMized-logo.png   → Bikefit-Logo (navy auf weiß)
                          Desktop-Header: filter "invert(1) grayscale(1) brightness(2)" → weiß
                          Mobile Splash:  gleicher Filter, opacity 0.6
  icon.svg / -192.png / -512.png → App-Icons (schwarz + gold "AiRO")
  manifest.json         → PWA-Manifest (short_name: "AiRO")
```

## Session-Typen & Preise
```
Helmberatung        60 Min   167,23 € netto
Aero Add-On         30 Min    83,19 € netto
Aero Fit Potential  60 Min   167,23 € netto
Digitaler Windkanal 150 Min  411,76 € netto
```

## AiRO Pakete
```
Starter  50 €/Twin   50 Twins/Jahr   2.500 €/Jahr
PRO      35 €/Twin  100 Twins/Jahr   3.500 €/Jahr
```

**Paket-Automatik:** Wählt der Nutzer Starter, plant aber >50 Sessions/Jahr → automatisch PRO-Kosten verwenden + Hinweis anzeigen.

## Berechnungslogik
```
sessionsMonat   = Summe aller Session-Mengen
einnahmen       = Summe(Menge × Preis) je Typ
lizenzkosten    = sessionsMonat × effektivPaket.kostenProTwin
personalkosten  = gehalt × 1.20 × gesamtStunden / vollzeitStunden
gesamtStunden   = (totalDauerMin + sessions × puffer) / 60
fixKosten       = raumkosten × 10 m² + 348 € / 12
ausgaben        = lizenzkosten + personalkosten + fixKosten
ueberschuss     = einnahmen - ausgaben
```

**Break-even (ehrlich):**
```
personalProSession   = gehalt × 1.20 × avgDauerMitPuffer / (60 × 172)
echteMargeProSession = umsatz/Session − lizenz/Session − personal/Session
breakEvenSessions    = ceil(fixKosten / echteMargeProSession)
```
Wichtig: Personalkosten sind in der Marge eingerechnet → Break-even ist die echte Kostendeckungsgrenze.

## Annahmen (konstant)
```
raumQm = 10, iscoJahr = 348 €, arbeitszeitPuffer = 15 Min
lohnNebenkosten = 20%, vollzeitStunden = 172
```

## Default-Werte (beide Plattformen)
```
Paket:     PRO
Sessions:  alle Typen = 2
Gehalt:    3.000 €
Raummiete: 15 €/m²
```

## Mobile Wizard — 5 Screens
```
0  Splash    Logo + Titel + DE/EN Toggle + "powered by gebioMized" Logo
1  Paket     Starter vs. PRO, Live-Margen je Session-Typ
2  Sessions  +/− Buttons je Session-Typ
3  Kosten    Gehalt-Slider + Raummiete-Slider + Aufschlüsselung
4  Auswertung Jahresgewinn, 3 KPIs, Kosten, Jahresübersicht, PDF-Export
```

**Design-Prinzip:** Header immer gleich hoch (nur Screens 1-4), Content `overflow-y-auto` mit `background: BLACK`, Footer immer gleich (← Zurück + Weiter/Neue Berechnung).

## Sprachen (DE/EN)
Alle Strings in `lib/i18n.ts` → `T.de` / `T.en`. Toggle auf Splash + in Header (Screens 1–4). Sprachauswahl steuert auch QR-Code-URLs im PDF.

## PDF-Report (mobil, Screen 4)
Generiert clientseitig mit `jsPDF` + `qrcode`. Workflow:
1. Kundenname eingeben (optional)
2. „PDF erstellen & teilen" → iOS Share-Sheet oder Download
3. Dateiname: `AIRO_gebioMized_Rentabilitaet_fuer_[Name].pdf`

**PDF-Layout:**
- Gold-Header "AiRO + Titel"
- Rechts: gebioMized-Logo + Adresse (SnM gebioMized GmbH, Wilhelm-Schickard-Str. 12, 48149 Münster)
- Links: Kundenname + Datum
- Jahresgewinn-Highlight (schwarz/gold)
- 3 KPI-Cards mit Gold-Akzentbalken
- Zwei-Spalten: Kosten | Ergebnis (getrennte Y-Variablen!)
- Jahresübersicht (3 Cards, Gewinn schwarz/gold)
- Footer: `gebiomized.de` + QR-Code zum Webshop-Artikel

**QR-Code URLs (paket- & sprachabhängig):**
```
DE Starter: https://gebiomized.de/B2B/AiRO.app-Twin-Paket-Starter-50-digital-twins/803458
DE PRO:     https://gebiomized.de/B2B/AiRO.app-Twin-Paket-PRO-100-digital-twins/803459
EN Starter: https://gebiomized.de/B2B/EN/AiRO.app-Twin-Package-starter-package-50-digital-twins/803458
EN PRO:     https://gebiomized.de/B2B/EN/AiRO.app-Twin-Package-pro-package-100-digital-twins/803459
```

## Desktop (Calculator.tsx)
- `max-w-7xl`, 2-Spalten-Grid
- Linke Spalte: Paket-Auswahl, Session-Mix, Mitarbeiter/Raum
- Rechte Spalte: Metriken (inkl. Break-even), Kostenaufschlüsselung, Jahresübersicht, Print-Report
- Header: AiRO-Logo links, gebioMized-Logo rechts (weiß via CSS-Filter)
- Print-Report: `window.print()` mit CSS `.print-only` / `.no-print`

## Deploy
```bash
npx vercel --prod --yes
```
Vercel ist mit GitHub `el-sha387/amortisationsrechner` verbunden → Push auf `master` triggert automatischen Deploy.

## Bekannte Eigenheiten
- `lib/i18n.ts` muss bei neuen Strings in BEIDEN Sprachen gepflegt werden
- Logo-Filter Desktop-Header: `filter: "invert(1) grayscale(1) brightness(2)"` macht navy→weiß, weiß→schwarz
- PDF: Zwei-Spalten immer mit separaten `yL`/`yR` Variablen — nie `y` teilen!
- OneDrive-Sync kann Git-Konflikte erzeugen → bei Merge-Fehler: `git stash` → `git pull --rebase` → `git stash pop`
