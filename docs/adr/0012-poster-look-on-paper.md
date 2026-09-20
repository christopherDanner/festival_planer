# 0012 — Plakat-Optik auf Papier: eigene Zeichen-Bausteine für die PDF-Exporte

Status: Accepted
Datum: 2026-08-05
Kontext-Doku: `design-vision/DESIGN-VISION.md` (§3 Signature, §4 Handschrift), ADR 0003, Umsetzungs-Issue #110

## Kontext

Die Werkzeug-Plakat-Handschrift kommt aus der Druckgrafik (§3: Siebdruck-Plakat, harte Rahmen, Halftone), endete aber am Bildschirmrand: die drei druckbaren Papiere — Schichtplan, Ablaufplan und Sponsoring-Übersicht — waren `jsPDF` + `autoTable` in Helvetica.

ADR 0003 §2 regelt, wo Design-CSS lebt: Grafik-Rezepte (Halftone-Kachel, Maßband-Skala, Punktraster-Trenner, Stempel-Rotation) sind globale Klassen in `src/toolkit.css`, jede von genau einer Komponente in `src/components/toolkit/` referenziert. Für Papier greift diese Regel nicht: jsPDF kennt kein CSS, keine OKLCH-Farben und keine `background-image`-Kacheln. Es kennt RGB, Linien, Rechtecke, Kreise und Text.

## Entscheidung

**Ein Papier-Zwilling zum Toolkit, an genau einer Stelle.**

- `src/lib/pdfPoster.ts` hält die Zeichen-Bausteine für Papier: grüner Halftone-Kopf, harte Rahmen, Maßband, Stempel, Sektionszeile, `autoTable`-Stilbündel, getönte Fußzeile. Kein Export zeichnet Halftone-Punkte oder Stempel-Rahmen selbst — dieselbe Regel wie „Seiten kennen nur `<Ruler />`" aus ADR 0003.
- `src/lib/pdfFonts/` hält die eingebetteten Schriften (Public Sans 400/700, Oswald 600) als base64-TTF fürs jsPDF-VFS, samt Erzeugungsskript. Latin-Subset genügt (Research #53); die Icon-Glyphen der Vision (♛ ♪ ✓) sind darin nicht enthalten und haben auf Papier nichts zu suchen.
- **Die Farbrollen sind zweimal notiert** — als OKLCH-Tokens in `src/index.css` und als sRGB-Tripel in `POSTER_COLOR`. Das ist bewusst in Kauf genommen: eine Umrechnung zur Laufzeit bräuchte einen OKLCH→sRGB-Konverter plus das Auslesen von CSS-Variablen, die es beim Papierdruck gar nicht gibt. Wer an den Tokens dreht, dreht die Tripel mit; ein Kommentar an `POSTER_COLOR` sagt das.
- Ebenso doppelt notiert sind die Rahmenstärken — auf dem Schirm px, auf Papier mm (`POSTER_LINE`, bei 96 dpi umgerechnet).

## Konsequenzen

- Ein neues druckbares Papier baut auf `pdfPoster.ts` auf und bringt keine eigene Grafik mit.
- Eine Token-Änderung ist eine Änderung an zwei Dateien. Das ist die Kröte, die diese Entscheidung schluckt.
- Die Bausteine werden über ihre Zeichenaufrufe geprüft (Grün, Tinte-Rahmen, Versalien, Akzentschrift), nicht über Rasterbilder — Pixelvergleiche brauchten einen PDF-Renderer im Testlauf.
- Halftone kostet tausende Zeichenbefehle. `createPosterDoc` setzt darum `precision: 2` und `compress: true`; ohne das wächst ein Plakat auf über ein halbes MB und ist als WhatsApp-Aushang unbrauchbar.

## Verworfene Alternativen

- **HTML drucken statt PDF bauen** (`window.print` auf eine Druck-Ansicht) — bekäme die Handschrift gratis aus dem CSS, gibt aber Seitenumbrüche, Ränder und Dateinamen an den Browser ab; die Exporte sind Downloads, die per WhatsApp weitergehen.
- **`html2canvas` in jsPDF** — rastert die Schrift, ein gerastertes Plakat ist kein druckfertiges.
- **Die Grafik pro Export nachbauen** — dreimal dieselbe Kachel, dreimal anders falsch.
- **Farben zur Laufzeit aus den CSS-Variablen lesen** — im Export gibt es kein Element, an dem die Variablen hängen; im Test erst recht nicht.
