@AGENTS.md

# AiRO Rentabilitätsrechner — Projekt-Kontext

## Was ist das?
Ein Sales-Tool für gebioMized-Vertrieb. Zeigt Bikefitting-Studios, ob sich die Investition in AiRO (Aerodynamik-Messtechnologie) rentiert. Wird von gebioMized-Außendienst im Kundengespräch eingesetzt.

**Live-URLs:**
- Desktop: https://amortisationsrechner-orcin.vercel.app
- Mobile/Tablet: https://amortisationsrechner-orcin.vercel.app/mobile
- GitHub: https://github.com/el-sha387/amortisationsrechner

## CI / Farben
```
AIRO_BLACK = "#0d0d0d"   // Hintergrund überall
AIRO_GOLD  = "#F5A800"   // Primärfarbe, Highlights, CTAs
```
Kein Weiß als Hintergrund. Schwarzes App-Icon mit goldenem "AiRO"-Schriftzug.

## Dateistruktur
```
app/
  page.tsx              → Desktop-Rechner (Route: /)
  mobile/page.tsx       → Mobile-Rechner  (Route: /mobile)
  layout.tsx            → PWA-Manifest, Theme-Color, Titel
components/
  Calculator.tsx        → Desktop-Komponente (vollständige Ansicht)
  MobileCalculator.tsx  → Mobile-Komponente  (5-Screen Wizard)
public/
  airo-logo.png / .svg  → AiRO-Logo (gold/orange, kein Filter nötig auf schwarz)
  gebioMized-logo.png   → gebioMized Bikefit-Logo (filter: invert(1) für weißes Logo)
  icon.svg / -192.png / -512.png → App-Icons (schwarz + gold "AiRO")
  manifest.json         → PWA-Manifest
```

## Berechnungslogik (beide Komponenten identisch)

### Stammdaten — Session-Typen
| ID | Name | Dauer | Preis netto |
|----|------|-------|-------------|
| helm | Helmberatung | 60 Min | 167,23 € |
| addon | AiRO als Aero Add-On | 30 Min | 83,19 € |
| aero | Aero Fit Potential | 60 Min | 167,23 € |
| windkanal | Digitaler Windkanal | 150 Min | 411,76 € |

### Stammdaten — Pakete
| ID | Name | Twins/Jahr | Kosten/Twin | Jahreslizenz |
|----|------|-----------|-------------|--------------|
| starter | Starter | 50 | 50 € | 2.500 € |
| pro | PRO | 100 | 35 € | 3.500 € |

**Paket-Automatik:** Wählt der Nutzer Starter, plant aber >50 Sessions/Jahr, rechnet der Rechner automatisch mit PRO-Kosten (35 €/Twin) und zeigt einen Hinweis.

### Kostenformel (monatlich)
```
lizenzkosten    = sessionsMonat × effektivPaket.kostenProTwin
personalkosten  = gehalt × 1.20 × (gesamtStunden / vollzeitStunden)
gesamtStunden   = (summe Dauern + sessions × arbeitszeitPuffer_min) / 60
fixKosten       = raumkosten × raumQm + iscoJahr / 12
ausgaben        = lizenzkosten + personalkosten + fixKosten
ueberschuss     = einnahmen - ausgaben
```

### Annahmen (konstant, nicht editierbar)
```
raumQm = 10           // Messfläche in m²
iscoJahr = 348 €      // ISCO-Kurs pro Jahr
arbeitszeitPuffer = 15 Min  // Vor-/Nachbereitungszeit je Session
lohnNebenkosten = 20 %
vollzeitStunden = 172  // Arbeitsstunden/Monat
```

## Mobile Wizard — 5 Screens
0. **Splash** — Logo + "Jetzt berechnen"
1. **Paket** — Starter vs. PRO, Live-Margen je Session-Typ
2. **Sessions** — +/−-Buttons je Session-Typ (Default: alle auf 2)
3. **Kosten** — Gehalt-Slider (2k–4k), Raummiete-Slider (8–25 €/m²)
4. **Auswertung** — Jahresgewinn groß, Break-even, Marge/Session, Jahresübersicht

**Design-Prinzip aller Screens:** Gold-Highlight-Card oben (Hauptzahl groß), darunter Dark-Cards mit `rgba(255,255,255,0.06)` Hintergrund. Kein h2/Titel im Content-Bereich — Header ist immer gleich hoch.

## Deploy
```bash
npx vercel --prod --yes
```
Vercel ist mit dem GitHub-Repo verbunden — Push auf `master` triggert automatischen Deploy.

## Wichtige Design-Entscheidungen
- `gebioMized-logo.png` im Desktop-Header mit `filter: invert(1)` → weißes Logo auf Schwarz
- `airo-logo.png` ohne Filter — ist bereits gold/orange, passt auf schwarzem Hintergrund
- Desktop-Komponente hat Print-Report (A4 PDF über `window.print()`)
- Mobile hat keinen Print — stattdessen volle Sales-Optimierung auf Bildschirm
