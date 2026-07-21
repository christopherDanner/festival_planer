# DESIGN-VISION — Festmeister

> Basis der Implementierung. Konkrete Werte hierin sind vom Nutzer am
> Prototyp abgenommen und verbindlich. Lebende Referenz:
> `design-vision-prototyp.html` (daneben in diesem Ordner).

## 1. Thema & Stimmung

- **Thema im Kern / erzählenswert:** Festmeister ist die Werkzeug-App für
  ehrenamtliche Fest-Organisatoren — Schichten, Material, Ablauf, Sponsoring
  eines Vereinsfests in einer Hand. Erzählenswert ist der jährliche
  Zeitspar-Moment: das Vorjahr als Vorlage, nur Mengen und Leute anpassen.
- **Publikum & Kontext (Gerät):** Kernteam von 3–10 ehrenamtlichen
  Organisatoren (Obmann, Festleitung, Schriftführer). Keine Software-Profis,
  aber regelmäßige Nutzer. Planung am Desktop (primär, dicht und
  werkzeughaft), Nachschlagen/kleine Korrekturen am Handy während des Fests
  (solide, per Antippen statt Drag & Drop).
- **Stimmung (abgenommen):** Aufgeräumter Werkraum des Vereins — handfest,
  warm, verlässlich. Hell mit warmer Tonung und spürbarer
  Materialität/Textur. Gebaut von Leuten, die wissen, wie ein Fest
  funktioniert.
- **Kernaktion des Besuchers:** Lücken sehen und schließen — Personen in
  Schichten, Mengen in die Materialliste, Häkchen in den Ablaufplan.
- **Anti-Referenzen:** Kein steriles SaaS-Einerlei (weiße Karten auf Grau,
  blauer Primärbutton). Kein Vereinsmeier-Bastellook (Comic-Schrift,
  Clipart). Keine dekorativen Animationen — Bewegung nur mit Funktion.
- **Markenvorgaben & No-Gos:** Name „Festmeister" fix; Logo/Farben/Schrift
  frei aus der Stimmung entstanden (diese Vision definiert sie).

## 2. Format & Aufbau

- **Format & Begründung:** Applikation mit zwei Ebenen: (1) **Meine Feste**
  (Plakatwand + Fest anlegen), (2) **Fest-Arbeitsbereich** mit fixem Kopf
  (Mast + Tab-Leiste) und fünf Tabs. Eine App-Shell, kein Marketing-Auftritt
  — das Design dient der Arbeit.
- **Seiten / Sektionen:** Meine Feste → Dashboard (Standard-Einstieg im
  Fest) · Schichtplan · Material · Ablaufplan · Sponsoring.
  **Kein Mitglieder-Bereich** (Entscheidung 20.07.2026): Helfer leben pro
  Fest und werden direkt in der Helferliste des Schichtplans
  angelegt/entfernt. (Abweichung vom aktuellen App-Datenmodell `members`
  global — bewusste Vereinfachung, Umbau in der Implementierung nötig.)
- **Navigationsprinzip:** Mast (grüne Kopfleiste mit Wordmark, Festname,
  Countdown) + angedockte Tab-Leiste. Klick auf den FESTMEISTER-Wordmark
  führt zur Festliste. Dashboard-Absprünge („BESETZEN →") springen direkt in
  die Bereichs-Tabs. Mobile: Tabs scrollen horizontal (Implementierung darf
  alternativ die Bottom-Tab-Bar der echten App beibehalten).

## 3. Signature

- **Der Kern:** **Werkzeug-Plakat** — die Druckgrafik-Sprache eines
  Siebdruck-Plakats (harte schwarze Rahmen, satte Grün/Gelb-Flächen,
  Halftone-Raster) verschmolzen mit Instrumenten-Details: **Maßband-Lineale
  als Fortschrittsanzeigen**, Stempel, Wertmarken, Frachtbrief. Alles
  Zählbare wird als bedrucktes Werkzeug dargestellt.
- **Warum er dieses Thema trägt:** Vereinsfeste leben von Plakaten,
  Bierdeckeln, Laufzetteln und Klemmbrettern — die App spricht die visuelle
  Sprache, in der Feste wirklich organisiert werden. Das Maßband macht den
  zentralen Arbeitsmodus (Soll/Ist/fehlt) zur unverwechselbaren Form.

## 4. Handschrift — verbindlich

- **Typografie:**
  - Arbeitsschrift: **Public Sans** (400/500/600/700/800), Google Fonts.
  - Akzentschrift: **Oswald** (600, Variable), Google Fonts — NUR für Stationsnamen,
    Uhrzeiten, KPI-Werte, Jahreszahlen, Plakat-Titel. Nie für Fließtext.
  - Sektionsüberschriften: Public Sans 700, 14px, Versalien,
    letter-spacing .08em. Zahlen überall `font-variant-numeric: tabular-nums`.
- **Farben (OKLCH, Rollen):**
  - Papier (App-Hintergrund): `oklch(0.97 0.008 95)`
  - Tinte (Text/Rahmen): `oklch(0.24 0.02 145)` · Tinte-soft (Sekundärtext):
    `oklch(0.44 0.02 145)`
  - Grün (Marke, Köpfe, positiv): `oklch(0.4 0.1 160)` · Grün-tief:
    `oklch(0.33 0.09 160)`
  - Gelb (Primäraktion, aktiver Tab, Auswahl): `oklch(0.86 0.15 92)`
  - Rot (Warnung, fehlt, Fristen): `oklch(0.55 0.18 30)`
  - Linie (Trennlinien): `oklch(0.87 0.012 100)`
  - Kontraststrategie: Tinte auf Papier/Weiß für alles Lesbare; Weiß/Gelb
    nur auf Grün; Rot nie als Fläche hinter Text außer Badges mit Weiß.
- **Strukturen & Texturen:** Halftone-Punktraster (14px-SVG-Kachel, weiße
  Punkte 12 % Deckung) auf allen grünen Kopf-Flächen. Sektionstrenner:
  Punktraster-Linie (radial-gradient, 8px-Raster) hinter Überschriften.
  Bereiche wechseln fürs Auge über: grüner Halftone-Kopf → weiße
  Werkzeugfläche → getönte Fußzeile `oklch(0.955 0.01 100)`.
- **Layout & Grid:** max-width 1180px, zentriert; Rahmen 2.5px (Container)
  und 2px (Karten) in Tinte, 1px/1.5px Linie innen. Keine runden Ecken,
  keine weichen Schatten — Auswahl-Hervorhebung stattdessen als harter
  Versatz-Schatten `4px 4px 0` Tinte (gewählte Reiter/Karten).
- **Bildsprache:** Keine Fotos. Grafik entsteht aus Typografie, Flächen,
  Maßbändern, Stempeln, Wertmarken. Icons sparsam (♛ Verantwortlicher,
  ♪ Programmpunkt, × entfernen, ✓ erledigt).
- **Motion & Interaktion:** Bewegung nur mit Funktion: hover = Flächenton
  `oklch(0.94–0.955)`, Ablehnung = 0.5s Rot-Puls (inset box-shadow), sonst
  keine Animationen. Drag & Drop am Desktop, Antippen (Marke wählen → Platz
  wählen) am Handy.
- **Tonalität der Texte:** Deutsch, direkt, werkstatt-knapp, österreichisches
  Vokabular (Kassa, Brathendl, Frühschoppen). Zähler sprechen Klartext:
  „3 FEHLEN", „11 offen — Ausschank Sa-Abend kritisch", „voll besetzt".

### Wiederkehrende Bausteine (Querschnitt, ohne eigenen Fächer)

- **Maßband-Ruler:** 18–20px hoch, 1.5px Tinte-Rahmen, Skala aus
  repeating-linear-gradients (Zehntel-Striche + Tinte-Marken alle 50px),
  Füllung Gelb 55 % Deckung, Ist-Marke als 2.5px Tinte-Strich. Kleine
  Variante (10–12px) für Karten.
- **Namens-Marke (.mchip):** getönte Fläche `oklch(0.94 0.015 110)`,
  Stanzloch-Punkt links, optional ×.
- **Freier Platz:** gestrichelte rote Outline (1.5px dashed), rote
  Versalien-Beschriftung („+1 OFFEN", „HIER EINTRAGEN").
- **Ampel-Logik (echte App-Regel):** leer = Rot, teilbesetzt = Gelb,
  voll = Grün — als 4px-Linkskante, Balkenfüllung oder Badge.
- **Wertmarke (.kat):** 1.5px grüner Rahmen, Kategoriename + Oswald-Wert;
  überschriebener Wert Rot; „ohne Kategorie"/Sachleistung gestrichelt grau.
- **Stempel:** Oswald-Versalien in Rahmenfarbe, leicht rotiert
  („ERLEDIGT", „VOLL BESETZT", Status-Stempel „✓ GESPEICHERT",
  „WIRD NEU ANGELEGT").
- **Formulare/Dialoge:** Inputs 2px Tinte-Rahmen, Labels 10.5px
  Versalien-grau; Segment-Schalter (.seg) mit gelbem Aktiv-Zustand;
  Modus-Umschalter (.modeseg) invertiert (Tinte-Fläche, gelbe Schrift).
  Leerzustände: gestrichelter Rahmen + roter Stempel-Ton + ein Satz.

## 5. Bereiche — abgenommene Fächer-Entscheidungen

### Fest-Einstieg („Meine Feste")

- **Abgenommene Variante:** A „Plakatwand" + C „Kopierwerk"
  (bereich-festeinstieg-faecher.html).
- **Layout Festliste (A):** Nächstes Fest als großes grünes Plakat
  (Countdown-Stempel, Kennzahlen, „FEST ÖFFNEN →"), vergangene Feste als
  kleinere getönte Plakate mit rotiertem „ERLEDIGT"-Stempel und
  „ALS VORLAGE"-Knopf.
- **Layout Kopier-Flow (C):** „Als Vorlage"/„+ Neues Fest" führt auf eine
  **eigene Kopierwerk-Seite** (eigener Mast „Neues Fest anlegen · Vorlage:
  X · ABBRECHEN ×"): links die Stempelkarte mit 4 Schritten (✓ Name &
  Datum → 2 Stationen & Schichten → 3 Material → 4 Sponsoring, aktiver
  Schritt gelb), rechts der aktuelle Schritt in voller Tiefe — Stationen
  mit Checkbox und aufklappbaren Schichten, jede Schicht mit ihrem neuen
  Termin („Sa 11–15 → Sa 24.07.2027"), darunter die
  Zuweisungen-Checkbox, Fußzeile Zurück/Weiter.
- **Interaktion & Funktionsumfang (= echte App, Entscheidung Nutzer):**
  Stationen einzeln wählbar, „Zuweisungen übernehmen" optional,
  Material-Schritt mit Mengenquelle-Radio (Bestellmenge/Tatsächliche
  Menge) + Gruppen-/Einzelauswahl, automatischer Datums-Offset (gleicher
  Wochentags-Abstand) — erweitert um Schritt 4: Sponsorings + Kategorien
  mitkopieren.

### Dashboard (Standard-Einstieg im Fest)

- **Abgenommene Variante:** C „Festplakat" (bereich-dashboard-faecher.html).
- **Layout:** Drei Spalten — links „Da fehlt noch was" (Lücken-Kästen:
  Stationen mit konkreten Schichten + Personenzahl, Aufgaben mit nächster
  Frist, Material ohne Preis — je mit Absprung-Link), Mitte das grüne
  **Festplakat** (Eckdaten, Countdown, Programm als druckfertiger Aushang),
  rechts „Zahlen"-Kästen mit Mini-Maßband (Schichten, Material bestellt-€,
  verbraucht-€, Sponsoring, Helfer).
- **Interaktion:** Jeder Absprung („BESETZEN →", Pfeile) wechselt in den
  jeweiligen Tab. Mobile: Plakat zuerst, dann Lücken, dann Zahlen.

### Schichtplan

- **Abgenommene Variante:** E „Fokus-Werkbank"
  (bereich-schichtplan-faecher.html) + Nutzer-Auflage: Soll/Ist/Fehlt auf
  JEDER Ebene sichtbar; Drag & Drop aus der Helferliste.
- **Layout:** Oben Ampel-Reiter aller Stationen (Oswald-Name, `11/14`,
  „3 FEHLEN" rot bzw. „✓ VOLL BESETZT" grün, Mini-Maßband; aktiver Reiter
  gelb mit Versatz-Schatten). Darunter EINE Station im Fokus: grüner
  Halftone-Kopf (Ort, ♛ Verantwortlicher, „14 Plätze gesamt · 3 offen",
  „NUR DIESE STATION AUTO-FÜLLEN"), Schicht-Zeilen mit Oswald-Zeit,
  Platz-Slots (nummeriert) und Status `3/4 · 1 OFFEN`. Fußzeile:
  Stationsmitglieder ohne Schicht. Rechts die Helferliste: Suche, Filter
  Alle/Frei/Zugeteilt mit Zählern, gruppiert nach „Wünschen sich diese
  Station" / „Weitere".
- **Interaktion:** Drag & Drop Marke → Schicht (Desktop), Antippen →
  freien Platz antippen (Mobil). Volle Schicht/Doppelzuweisung lehnt mit
  Rot-Puls ab (echte App-Regeln). Alle Zähler (Reiter, KPI-Maßband,
  Schicht-Status) rechnen live. **Helfer-Verwaltung lebt hier**: „Neuen
  Helfer anlegen …" unten in der Liste, × an der Marke entfernt aus dem
  Fest (inkl. seiner Zuteilungen).

### Materialliste

- **Abgenommene Variante:** B „Stationskästen" + Übernahme als eigener
  Modus aus C „Zwei Feste" (bereich-material-faecher.html). Nutzer-Vorgabe:
  Tabelle = Hauptansicht, Übernahme = zweite Hauptfunktion, starkes
  Filtern/Suchen; Import/Abgleich/Export bleiben Dialoge.
- **Layout:** Modus-Umschalter ARBEITSLISTE ⇄ ÜBERNAHME + globale Suche in
  der Werkzeugleiste. Arbeitsliste: Stations-Reiter (Positionszahl, Kosten,
  „n ohne Preis" rot) als Navigation; darunter der Kasten der Station:
  grüner Kopf mit Zwischensumme + „+ POSITION FÜR X", Kategorie-Chips,
  Tabelle (Material mit Kategorie/MwSt-Subzeile, Lieferant, Gebinde,
  Bestellt, Verbraucht, Δ farbig, Netto, Gesamt), Fuß mit Zwischensumme.
  „Preis fehlt" als rote gestrichelte Warnzelle.
- **Interaktion:** Reiter/Chips/Suche filtern live (Suche zählt Treffer in
  den Reitern mit, Summen rechnen gefiltert). Übernahme-Modus: Quellfest →
  Zielfest, Vorjahr als getönte Referenzspalten (Bestellt/Verbraucht),
  Wunschmenge als Input mit Auto-Save-Stempel („✓ GESPEICHERT",
  „WIRD NEU ANGELEGT" grün, „NICHT ÜBERNEHMEN" gestrichelt).

### Ablaufplan

- **Abgenommene Variante:** C „Schreibtisch"
  (bereich-ablaufplan-faecher.html) + Nutzer-Auflage: Uhrzeiten prominent.
- **Layout:** Links die **Aufgaben-Werkliste** über alle Tage, gruppiert
  nach Vorbereitung / Festtage / Nachbereitung (je Gruppenkopf mit
  Offen-Zähler): jede Aufgabe mit Checkbox, **fester Oswald-Zeitspalte
  (Uhrzeit groß, Tag klein darunter, bündig)**, Titel + Subzeile,
  Verantwortlichem. Filter: Alle/Offen/Erledigt + Verantwortlicher.
  Rechts der **Programmzettel** als druckfertiges Plakat (grüner Kopf,
  Tage als grüne Oswald-Zwischentitel, Zeit + Punkt).
- **Interaktion:** Abhaken wirkt sofort auf KPI-Maßband, Gruppen- und
  Filterzähler. Der Programmzettel ist Aushang/WhatsApp-tauglich gedacht
  (Export). Aufgaben vs. Programmpunkte sind zwei Papiere — Programm hat
  keine Checkboxen.

### Sponsoring

- **Abgenommene Variante:** C „Paket-Matrix"
  (bereich-sponsoring-faecher.html) + Nutzer-Wunsch Sachleistungen.
- **Layout:** Matrix Sponsoren × Kategorien: Kategorien als Spaltenköpfe
  mit Oswald-Standardwert; Zellen = gewählt (grüne Wertmarke; abweichender
  Wert rot) oder leer (gestrichelt „+"). Spalten Freibetrag,
  **Sachleistung** (z. B. „Geschenkkorb Tombola (€ 80)" — gestrichelte
  graue Marke) und Gesamt. Fußzeile: Σ je Kategorie, Σ Freibeträge,
  „+ € x Sachwert", Gesamtsumme in Oswald.
- **Interaktion:** Klick in leere Zelle weist die Kategorie zum
  Standardwert zu, Klick auf volle entfernt sie; alle Summen live.
  Sachleistungs-Schätzwert zählt NICHT in die Geldsumme (separat
  ausgewiesen). Kein Status/Pipeline (bewusst, wie echte App). Das
  Jahresgedächtnis entsteht über die Fest-Kopie (Frachtbrief).

## 6. Responsive & Zugänglichkeit

- **Mobil-Verhalten:** Ein Breakpoint bei 900px. Grids fallen auf eine
  Spalte (`minmax(0, 1fr)` — wichtig, sonst sprengen Tabellen das Grid),
  Sidebars werden zu Blöcken (Helferliste unter den Fokus, Programmzettel
  unter die Werkliste, Plakat im Dashboard nach oben). Tabellen scrollen
  horizontal im eigenen Rahmen (`.tablewrap`), nie die Seite. Drag & Drop
  → Antippen-Paar. Tab-Leiste scrollt horizontal.
- **Barrierefreiheit:** Text-Kontraste über Tinte-auf-Papier durchgängig
  hoch; Gelb nie als Textfarbe auf Weiß; interaktive Ziele ≥ 40px am
  Handy (Slots, Checkboxen mit Padding). Fokus-Zustände in der
  Implementierung als 2px-Tinte-Outline mit Versatz ergänzen (im Prototyp
  nur teilweise). Keine Animationen, die Motion-Reduktion erfordern.

## 7. Prototyp-Referenz

- **Pfad Master-Prototyp:** `festmeister/design-vision-prototyp.html`
  (alle 6 Ansichten klickbar, datengetrieben; Fächer als
  `bereich-*-faecher.html` daneben, Gesamt-Fächer:
  `gesamt-vision-faecher.html` Variante F).
- **Verbindlich daraus:** Farben, Schriften, Rahmenstärken, Maßband-/
  Stempel-/Marken-Bausteine, Layout je Bereich, Interaktionsregeln
  (Ampel, Ablehnung, Live-Zähler, Modus-/Ebenen-Wechsel), Texttonalität.
- **Platzhalter (nicht verbindlich):** alle Beispieldaten („Musikfest
  Steinbach 2026", Namen, Mengen, Beträge), die statischen Zahlen im
  Dashboard, Dialog-Inhalte hinter Knöpfen (Import, Abgleich, Export,
  Präferenzen, + Station, + Kategorie), „EINZELN WÄHLEN"-Aufklapper im
  Frachtbrief (nur in Fächer-Variante C ausgeführt).

## 8. Libraries & Komponenten

- **Fonts:** Public Sans (SIL OFL) + Oswald (SIL OFL), beide via Google
  Fonts (`fonts.googleapis.com/css2?family=Oswald:wght@600&family=Public+Sans:wght@400;500;600;700;800`).
  Für die Implementierung: self-hosten.
- **CSS-/JS-Libraries im Prototyp:** keine — pures HTML/CSS/Vanilla-JS.
  Texturen als Inline-SVG-Data-URIs, Maßbänder als CSS-Gradients.
- **Komponenten / Patterns:** siehe Querschnitts-Bausteine in §4; alle im
  Master-Prototyp als CSS-Klassen ausgeführt (.ruler, .mchip, .kat,
  .stab/.reg (Reiter), .seg, .modeseg, .planbar, .mast, .tabs, .stable,
  .mtable, .brief/.frach, .plakat, .todo-Stempel).

## 9. Technische Konsequenz

- **Was die Umsetzung können muss:** klassische SPA-Fähigkeiten — kein 3D,
  keine Scroll-Engine. Nötig: Drag & Drop + Touch-Fallback (Antippen-Paar),
  live mitrechnende Ableitungen (Ampeln, Maßbänder, Summen), Fest-Kopie
  mit Datums-Offset (Wochentags-Abstand) inkl. Sponsorings,
  Auto-Save-Muster mit Status-Stempeln (Übernahme), PDF-/Text-Exporte
  (Einsatzplan, Programmzettel, Sponsoring-Übersicht), OKLCH-Farben
  (Fallbacks für alte Browser prüfen).
- **Bestehender Stack (Fakteninventar):** React 18 + Vite + Supabase +
  shadcn/Tailwind. Die Vision ersetzt die shadcn-Optik vollständig durch
  die Werkzeug-Plakat-Handschrift; Datenmodell passt bis auf zwei
  Abweichungen (s. u.).
- **Offen für die Tech-Session:**
  - Mitglieder: global (`members`) → Helfer pro Fest (Migration/Scoping).
  - Sponsoring: Sachleistungs-Feld existiert noch nicht
    (`sponsorings` + Text/Schätzwert); Fest-Kopie um Sponsorings erweitern.
  - Tab-Navigation vs. bestehende Mobile-Bottom-Bar.
  - Font-Self-Hosting, OKLCH-Fallback-Strategie.

## 10. Offene Punkte

- Logo/Wortmarke: bisher nur der gelbe Oswald-Schriftzug FESTMEISTER —
  reicht als Marke, eigenes Zeichen optional später.
- Dialog-Feinschliff (Import, Rechnungsabgleich, Präferenzen, Teilen) —
  Bausteine aus §4 anwenden, kein eigener Fächer nötig.
- Zählweise „Frei/Zugeteilt" bei Stationsmitgliedern ohne Schicht
  (im Prototyp zählt nur die Schicht-Zuteilung) — fachlich klären.
- Sachwert der Sachleistungen: aktuell separat ausgewiesen, nicht in der
  Geldsumme — bestätigt lassen, wenn die ersten echten Daten da sind.
