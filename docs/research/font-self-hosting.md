# Research: Font-Self-Hosting — Public Sans + Anton in Vite

Beantwortet GitHub-Issue #53 (Teil der Wayfinder-Karte #51).
Kontext: `design-vision/DESIGN-VISION.md` §8 verlangt Public Sans (400–800) + Anton (400) self-gehostet; der Prototyp lädt aktuell Inter via Google Fonts (`index.html`), `tailwind.config.ts` hat noch kein `fontFamily`.

Alle Quellen abgerufen am **2026-07-21**.

---

## TL;DR — Empfehlung

```bash
npm install @fontsource-variable/public-sans @fontsource/anton
```

```ts
// src/main.tsx (vor allen anderen Styles)
import "@fontsource-variable/public-sans/wght.css"; // ein Variable-File, wght 100–900
import "@fontsource/anton/400.css";                 // statisch, nur 400
```

```ts
// tailwind.config.ts → theme.extend
fontFamily: {
  sans: ['"Public Sans Variable"', "system-ui", "sans-serif"],
  display: ["Anton", '"Public Sans Variable"', "sans-serif"],
},
```

- Google-Fonts-`<link>`s + preconnects aus `index.html` entfernen.
- Subsetting: **latin reicht** (Umlaute + € enthalten), Fontsource liefert es automatisch per `unicode-range`.
- `font-display: swap` (Fontsource-Default) beibehalten; **kein Preload nötig**, optional nur das latin-File von Public Sans via Vite-`?url` preloaden.
- SIL OFL: Self-Hosting ist erlaubt und ausdrücklich vorgesehen; Lizenz-/Copyright-Hinweis muss die Fonts begleiten — die woff2-Metadaten + eine mitgelieferte `OFL.txt`/Attribution erfüllen das (Details unten).

---

## Frage 1: `@fontsource` vs. manuelle woff2 + `@font-face`?

**Antwort: `@fontsource`-Pakete.** Konkret `@fontsource-variable/public-sans` (Variable Font, ein woff2 pro Subset für alle Gewichte 100–900) und `@fontsource/anton` (statisch, 400).

Begründung:

- **Vite-nativ:** Fontsource wird als npm-Paket installiert und per CSS-Import eingebunden; Vite verarbeitet die CSS-Imports und die referenzierten woff2-Dateien automatisch (Hashing, Bundling), keine TS-/Config-Anpassung nötig.
  Quelle: https://fontsource.org/docs/getting-started/install (abgerufen 2026-07-21)
- **Granular importierbar:** pro Gewicht (`@fontsource/anton/400.css`) bzw. pro Achse beim Variable-Paket (`wght.css`) — nur das Genutzte landet im Build.
  Quelle: https://fontsource.org/docs/getting-started/install, https://fontsource.org/docs/getting-started/variable (abgerufen 2026-07-21)
- **Variable Font statt 5 statischer Files:** `@fontsource-variable/public-sans/wght.css` liefert **ein** woff2 (`format('woff2-variations')`, `font-weight: 100 900`) pro Subset; der gesamte `files/`-Ordner des Pakets ist ~109 kB. Fünf statische Gewichte wären fünf separate Requests/Dateien. Fontsource nennt als Vorteil ausdrücklich „smaller file sizes".
  Quellen: https://unpkg.com/@fontsource-variable/public-sans/wght.css, https://app.unpkg.com/@fontsource-variable/public-sans, https://fontsource.org/docs/getting-started/variable (abgerufen 2026-07-21)
- **Versioniert + Lizenz im Paket:** Fontsource-Pakete sind über npm versioniert und enthalten die LICENSE-Datei (OFL) direkt im Paket — Updates und Lizenznachweis ohne Handarbeit.
  Quelle: https://app.unpkg.com/@fontsource-variable/public-sans (abgerufen 2026-07-21)
- **Manuelle woff2 + eigenes `@font-face`** bringt hier keinen Vorteil: gleiche Dateien, aber selbst subsetten (Rename-Pflicht der OFL beachten, siehe Frage 4), selbst `unicode-range` pflegen, keine Versionierung. Nur sinnvoll, wenn man aggressiver subsetten will als Fontsource (hier unnötig, s. Frage 2).

Wichtig fürs Tailwind-Setup: Der Variable-Font heißt in CSS **`"Public Sans Variable"`** (Fontsource-Namenskonvention mit „Variable"-Suffix).
Quelle: https://fontsource.org/docs/getting-started/variable, bestätigt im generierten CSS https://unpkg.com/@fontsource-variable/public-sans/wght.css (abgerufen 2026-07-21)

## Frage 2: Subsetting und benötigte Gewichte

**Antwort: `latin` reicht für Österreich/Deutsch.** Gewichte: Public Sans als Variable Font (deckt 400–800 mit einem File ab), Anton nur 400 (mehr gibt es nicht).

Belege:

- Das **latin-Subset** beider Fonts deckt `U+0000-00FF` (also ä ö ü ß Ä Ö Ü im Latin-1-Supplement), `U+20AC` (€), `U+2000-206F` (typografische Zeichen wie – „ ") ab. Vollständige `unicode-range` des latin-Subsets:
  `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`
  Quellen: https://api.fontsource.org/v1/fonts/public-sans, https://api.fontsource.org/v1/fonts/anton, https://unpkg.com/@fontsource-variable/public-sans/wght.css (abgerufen 2026-07-21)
- **latin-ext ist NICHT nötig** für Deutsch: es enthält `U+0100-02BA` etc. (osteuropäische Sprachen, z. B. č ő ł). Umlaute liegen im latin-Kern. Da Fontsource alle Subsets mit `unicode-range` deklariert, lädt der Browser latin-ext ohnehin nur, wenn solche Zeichen auf der Seite vorkommen — die Dateien liegen dann zwar im Build, kosten aber keine Ladezeit. Wer den Build minimal halten will, importiert gezielt `@fontsource-variable/public-sans/wght.css` (enthält latin, latin-ext, vietnamese als getrennte Files mit unicode-range; effektiv geladen wird nur latin).
- **Gewichte Public Sans:** verfügbar 100–900 (+ Italic); die Vision braucht 400/500/600/700/800. Mit dem Variable-Paket ist die Frage obsolet — ein File deckt `font-weight: 100 900` ab, alle fünf Gewichte (und Zwischenwerte) kommen aus einem Request. Kein Italic-Import nötig, solange die Vision kein Italic vorsieht (Italic ist ein separates File/Import).
  Quellen: https://api.fontsource.org/v1/fonts/public-sans, https://fontsource.org/docs/getting-started/install („importing a normal style does not include its italic variant") (abgerufen 2026-07-21)
- **Anton:** existiert nur als 400 normal, kein Variable Font, keine Italics. `@fontsource/anton/400.css` ist alles, was es gibt und braucht.
  Quelle: https://api.fontsource.org/v1/fonts/anton (abgerufen 2026-07-21)

## Frage 3: `font-display` und Preload

**Antwort: `font-display: swap` (Fontsource-Default) beibehalten. Preload sparsam: gar keiner oder nur das latin-woff2 von Public Sans Variable via `?url`.**

- Fontsource-CSS setzt in allen `@font-face`-Regeln **`font-display: swap`**.
  Quelle: https://unpkg.com/@fontsource-variable/public-sans/wght.css (abgerufen 2026-07-21)
- web.dev empfiehlt: `swap` wenn Text sofort sichtbar sein und der Webfont sicher erscheinen soll (unser Fall — Anton ist markenprägend für Stationsnamen/Stempel, `optional` würde ihn bei langsamer Verbindung ganz weglassen); `optional` nur wenn Performance über allem steht. „`font-display: swap` delays text render the least."
  Quelle: https://web.dev/articles/font-best-practices (abgerufen 2026-07-21)
- **Swap-FOUT minimieren statt preloaden:** Da die Fonts self-gehostet vom selben Origin kommen (kein preconnect/DNS-Handshake zu fonts.gstatic.com mehr) und Vite das Font-CSS ins gebündelte Stylesheet inlined, startet der Font-Download früh — der Hauptgewinn des Self-Hostings. web.dev warnt, Preload „bypasses content negotiation (like unicode-range)" und kann Core Web Vitals verschlechtern, wenn zu viel preloaded wird.
  Quellen: https://web.dev/articles/font-best-practices, https://fontsource.org/docs/getting-started/preload (abgerufen 2026-07-21)
- **Wenn preloaden, dann so:** Fontsource dokumentiert für Vite explizit den `?url`-Import, weil Dateinamen gehasht werden:
  ```ts
  import publicSansLatin from "@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2?url";
  // → <link rel="preload" as="font" type="font/woff2" href={publicSansLatin} crossorigin="anonymous" />
  ```
  und rät: „Avoid preloading all font files … focus on critical fonts and subsets, such as the latin subset only." In einer React-SPA ohne SSR ist der praktische Nutzen gering (das Preload-Tag müsste ins statische `index.html`, die gehashte URL kennt man dort nicht ohne Plugin) — daher: **zunächst ohne Preload ausliefern**, nur bei messbarem FOUT-Problem nachrüsten (dann Public Sans latin, ggf. Anton latin; nie mehr als diese zwei).
  Quelle: https://fontsource.org/docs/getting-started/preload (abgerufen 2026-07-21)
- Gegen Layout-Shift beim Swap empfiehlt web.dev `size-adjust`-Fallback-Metriken — optionales Feintuning, v. a. für Anton (sehr schmal-hohe Letterform vs. System-Fallback).
  Quelle: https://web.dev/articles/font-best-practices (abgerufen 2026-07-21)

## Frage 4: SIL-OFL-Pflichten beim Self-Hosting

**Antwort: Self-Hosting ist ausdrücklich erlaubt; Copyright-Hinweis + Lizenz müssen die Font-Dateien begleiten — Metadaten in den woff2-Files genügen, zusätzlich `OFL.txt` mitliefern ist die saubere Best Practice. Nichts umbenennen, nichts weiter nötig.**

- **Self-Hosting = Distribution, und erlaubt:** OFL-FAQ 2.1: Fonts können „on the same server as other site assets" gehostet werden — „This is recommended and explicitly allowed by the licensing model because it is distribution."
  Quelle: https://openfontlicense.org/ofl-faq/ (abgerufen 2026-07-21)
- **Begleitpflicht:** OFL 1.1, Bedingung 1: jede Kopie muss Copyright-Notice + Lizenz enthalten — „either as stand-alone text files, human-readable headers or in the appropriate machine-readable metadata fields." FAQ 1.11: Distribution „needs to be accompanied by any copyright notices and licensing information available in OFL.txt".
  → Die woff2-Dateien von Fontsource/Google behalten die Lizenz-Metadaten im Font (name table); das erfüllt die Bedingung formal. **Empfehlung:** zusätzlich die `LICENSE`-Dateien aus den Fontsource-Paketen (liegen in jedem Paket, ~4,5 kB) als `public/OFL-public-sans.txt` / `public/OFL-anton.txt` mit ausliefern oder in einer Attribution-/Impressum-Notiz verlinken — kostenlos, unstrittig, auditierbar.
  Quellen: https://openfontlicense.org/open-font-license-official-text/, https://openfontlicense.org/ofl-faq/, https://app.unpkg.com/@fontsource-variable/public-sans (abgerufen 2026-07-21)
- **Nicht einzeln verkaufen:** „Neither the Font Software nor any of its individual components … may be sold by itself." Bundling mit der App/Website ist ausdrücklich okay. Für uns irrelevant, aber gut zu wissen.
  Quelle: https://openfontlicense.org/open-font-license-official-text/ (abgerufen 2026-07-21)
- **Reserved Font Names / Umbenennen:** Nur relevant bei **Modifikation**. FAQ 2.2.1: eine WOFF-Version ohne Namensänderung ist nur erlaubt, „if the original font data remains unchanged except for WOFF compression" — d. h. **selbst subsetten = Modifikation = Rename-Pflicht** (falls Reserved Font Names deklariert sind). Fontsource-Pakete unverändert zu nutzen umgeht dieses Thema komplett; noch ein Grund für Frage-1-Empfehlung.
  Quelle: https://openfontlicense.org/ofl-faq/ (abgerufen 2026-07-21)
- Beide Fonts sind OFL-1.1-lizenziert (Public Sans v21, Anton v27 laut Fontsource-Metadaten).
  Quellen: https://api.fontsource.org/v1/fonts/public-sans, https://api.fontsource.org/v1/fonts/anton (abgerufen 2026-07-21)

---

## Konkrete Umsetzungs-Checkliste (für die Implementierungs-Karte)

1. `npm install @fontsource-variable/public-sans @fontsource/anton`
2. In `src/main.tsx` ganz oben: `import "@fontsource-variable/public-sans/wght.css";` und `import "@fontsource/anton/400.css";`
3. In `index.html`: die drei Google-Fonts-Zeilen (2× preconnect, 1× stylesheet für Inter) löschen.
4. `tailwind.config.ts` → `theme.extend.fontFamily`: `sans: ['"Public Sans Variable"', "system-ui", "sans-serif"]`, `display: ["Anton", "sans-serif"]`.
5. OFL-Lizenztexte aus den Paketen nach `public/` kopieren (oder Attribution-Hinweis) — siehe Frage 4.
6. Kein Preload initial; bei sichtbarem FOUT: latin-woff2 via `?url`-Import + `<link rel="preload">` nachrüsten (Frage 3).
