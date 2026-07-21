# Research: OKLCH-Farbstrategie — Browser-Support & Fallbacks (Tailwind 3 + Vite)

Beantwortet Issue [#52](https://github.com/christopherDanner/festival_planer/issues/52), Teil der Wayfinder-Karte #51.
Stack laut Repo: Tailwind CSS 3.4.17, Vite 5.4, PostCSS 8.5, Autoprefixer (`package.json`); Tokens als HSL-Kanaltripel in `src/index.css`, konsumiert via `hsl(var(--token))` in `tailwind.config.ts`. Ziel-Farben: `design-vision/DESIGN-VISION.md` §4 (OKLCH).

Alle Quellen abgerufen am **2026-07-21**.

---

## TL;DR-Empfehlung

**OKLCH-only, ohne Build-Time-Fallback.** Das bestehende Kanaltripel-Muster beibehalten und nur die Funktion tauschen: Tokens als OKLCH-Tripel (`--primary: 0.4 0.1 160;`), in `tailwind.config.ts` `oklch(var(--primary) / <alpha-value>)` statt `hsl(var(--primary))`. Opacity-Modifier (`bg-primary/50`) funktionieren unverändert (lokal mit Tailwind 3.4.17 verifiziert). Ein PostCSS-Fallback-Plugin bringt bei diesem Muster nichts, weil es `var()`-haltige Werte nicht konvertieren kann (lokal mit `@csstools/postcss-oklab-function` 5.0.6 verifiziert) — und ist 2026 auch nicht mehr nötig: `oklch()` ist seit 2025-11-09 **Baseline Widely Available**. Als Mini-Versicherung: eine statische Doppel-Deklaration für `body`-Hintergrund/-Textfarbe in `index.css` (4 Zeilen), damit Uralt-Browser eine lesbare Seite statt Browserdefaults bekommen. Relative Color Syntax (`oklch(from …)`) und Gradient-Interpolation (`in oklch`) vermeiden — die sind erst Baseline *Newly* Available.

---

## Frage 1: Wie gut ist OKLCH heute unterstützt?

**Antwort: Sehr gut — Baseline Widely Available seit 2025-11-09.** Die Unterstützungs-Untergrenze liegt bei Browsern von 2022/2023; auch ältere Handys von Ehrenamtlichen sind praktisch abgedeckt.

Erste unterstützende Versionen (identisch laut caniuse und webstatus.dev/web-features):

| Browser | Version | Release |
|---|---|---|
| Safari / Safari iOS | 15.4 | 2022-03-14 |
| Chrome / Chrome Android | 111 | 2023-03-07 |
| Edge | 111 | 2023-03-13 |
| Firefox (Desktop + Android) | 113 | 2023-05-09 |
| Samsung Internet | 22 | 2023 |

- Baseline-Status (web-features, Feature „oklab-oklch"): `low_date` (Newly) **2023-05-09**, `high_date` (Widely) **2025-11-09** — d. h. seit Nov. 2025 gilt offiziell „works across many devices and browser versions". MDN zeigt das Widely-Available-Badge.
- caniuse: **91,56 %** globale Nutzung. Der Rest sind großteils nicht mehr aktualisierbare Altgeräte (iOS < 15.4, sehr alte Android-Browser) und untracked traffic — kein DACH-Desktop-Publikum.
- Für die Zielgruppe „ältere Handys von Ehrenamtlichen" konkret: **iOS 15.4 läuft auf iPhone 6s (2015) und neuer**; auf Android aktualisiert sich Chrome/WebView unabhängig vom OS (ab Android 7, 2016) selbst. Real ausgeschlossen sind nur Geräte, die seit ≥ 3–4 Jahren keine Browser-Updates mehr bekommen (iPhone 6 und älter, Android ≤ 6).
- **Achtung, zwei verwandte Features sind NICHT so breit verfügbar** (webstatus.dev):
  - Relative Color Syntax (`oklch(from green l c h)`): Baseline Newly erst seit **2024-09-16** (Safari 18).
  - Gradient-Interpolation (`linear-gradient(in oklch, …)`): Baseline Newly seit **2024-06-11** (Firefox 127).
  - Statische `oklch()`-Farben *innerhalb* von Gradients (wie in DESIGN-VISION §4) sind unkritisch — die brauchen nur die oklch()-Unterstützung selbst.

Belege:
- caniuse „oklch() color function": https://caniuse.com/mdn-css_types_color_oklch (abgerufen 2026-07-21)
- MDN `oklch()`: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch (abgerufen 2026-07-21)
- webstatus.dev-API (Baseline-Daten oklab-oklch, relative-color, gradient-interpolation): https://api.webstatus.dev/v1/features?q=oklch (abgerufen 2026-07-21)

## Frage 2: Wie integriert man OKLCH-Tokens in das Tailwind-3-Setup?

**Antwort: Exakt das bestehende Muster beibehalten, nur `hsl(` → `oklch(` tauschen.** Tailwind 3 dokumentiert das Kanaltripel-Muster („Don't include the color space function or opacity modifiers won't work") mit `rgb`/`hsl` als Beispielen; `<alpha-value>` ist reine String-Substitution und funktioniert mit jeder Farbfunktion, die space-separated Kanäle + `/ alpha` akzeptiert — also auch `oklch()`.

1. `src/index.css` — Tokens als OKLCH-Tripel **ohne** Funktion (Werte aus DESIGN-VISION §4, nicht die HSL-Zahlen wiederverwenden — OKLCH-Hue ist anders skaliert, Rot ≈ 30, nicht 0):

   ```css
   :root {
     --background: 0.97 0.008 95;   /* Papier */
     --foreground: 0.24 0.02 145;   /* Tinte */
     --primary: 0.4 0.1 160;        /* Grün (Marke) */
     --accent: 0.86 0.15 92;        /* Gelb (Primäraktion) */
     --destructive: 0.55 0.18 30;   /* Rot */
     /* … */
   }
   ```

2. `tailwind.config.ts` — Wrapper tauschen, `<alpha-value>` ergänzen (war bisher implizit weggelassen):

   ```ts
   colors: {
     background: "oklch(var(--background) / <alpha-value>)",
     primary: { DEFAULT: "oklch(var(--primary) / <alpha-value>)", … },
   }
   ```

3. Zusammengesetzte Werte (Gradients, Shadows) in `index.css` direkt als volle `oklch()`-Farben schreiben: `--shadow-festival: 0 10px 30px -10px oklch(0.4 0.1 160 / 0.2);`

4. Der Kommentar `All colors MUST be HSL.` in `src/index.css` (Z. 5–7) muss mit umgestellt werden.

**Lokal verifiziert** (Tailwind 3.4.17, Scratchpad-Build): `theme.colors.primary = "oklch(var(--primary) / <alpha-value>)"` erzeugt korrekt

```css
.bg-primary    { background-color: oklch(var(--primary) / var(--tw-bg-opacity, 1)) }
.bg-primary\/50 { background-color: oklch(var(--primary) / 0.5) }
```

→ Opacity-Modifier bleiben voll funktionsfähig, kein Tailwind-4-Upgrade nötig.

Belege:
- Tailwind v3 „Using CSS variables" (Kanaltripel + `<alpha-value>`): https://v3.tailwindcss.com/docs/customizing-colors#using-css-variables (abgerufen 2026-07-21)
- Eigener Build-Test mit tailwindcss@3.4.17 (2026-07-21, Output oben)
- MDN oklch-Syntax (space-separated + `/ alpha`, Hue-Skala): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch (abgerufen 2026-07-21)

## Frage 3: Welche Fallback-Strategie — und ist überhaupt noch eine nötig?

**Antwort: Kein Build-Time-Fallback. Er ist (a) nicht mehr nötig und (b) mit dem var()-Token-Muster technisch wirkungslos.**

- **(a) Nicht mehr nötig:** `oklch()` ist seit 2025-11-09 Baseline Widely Available (s. Frage 1). Die verbleibende Lücke sind Geräte ohne Browser-Updates seit ≥ 3 Jahren — für eine Vereins-Planungs-App vertretbar.
- **(b) Wirkungslos:** `@csstools/postcss-oklab-function` (5.0.6, lokal getestet) konvertiert nur **statische** Werte. Ergebnis des Tests:
  - `color: oklch(0.4 0.1 160)` → rgb-Fallback + display-p3 + Original (Doppel-Deklaration) ✔
  - `--brand: oklch(0.4 0.1 160)` → rgb-Fallback + `@supports`-gestaffelte Originale ✔
  - `color: oklch(var(--primary))` und `oklch(var(--primary) / 0.5)` → **unverändert, kein Fallback** ✘
  
  Da nach Frage 2 *alle* Utility-Farben die Form `oklch(var(--token) / …)` haben, hätte das Plugin auf 95 % des CSS keinen Effekt. Die Kanaltripel-Tokens selbst (`--primary: 0.4 0.1 160`) erkennt es ebenfalls nicht als Farben.
- **Alternative „volle Farb-Tokens + Plugin"** (`--primary: oklch(…)`, Tailwind `var(--primary)`): würde Build-Fallbacks ermöglichen, **verliert aber die Opacity-Modifier** (`bg-primary/50`), weil `<alpha-value>` nicht in einen opaken `var()` injiziert werden kann; der Ausweg über Relative Color Syntax (`rgb(from var(--primary) r g b / <alpha-value>)`) hat *schlechteren* Support (Baseline Newly 2024-09-16) als oklch selbst. Nicht empfohlen.
- **Alternative „doppelte Token-Sätze + @supports"** (HSL-Tripel als Default, OKLCH-Tripel im `@supports (color: oklch(0 0 0))`-Block): funktioniert nicht, weil die Wrapper-Funktion in `tailwind.config.ts` fest eingebrannt ist — man müsste hsl- UND oklch-Wrapper parallel pflegen (doppelte Utilities, doppelte Pflege aller Paletten). Aufwand steht in keinem Verhältnis zur Restlücke.
- **Empfohlene Mini-Versicherung** (optional, 4 Zeilen): statische Doppel-Deklaration nur für die Grundfläche in `index.css`, damit ein Uralt-Browser Text auf Papierfarbe statt Schwarz-auf-Weiß-Defaults ohne jede Token-Farbe zeigt:

  ```css
  body {
    background-color: #f7f6f1;              /* Fallback ≈ Papier */
    background-color: oklch(0.97 0.008 95);
    color: #29332b;                          /* Fallback ≈ Tinte */
    color: oklch(0.24 0.02 145);
  }
  ```

  (Klassisches CSS-Fallback-Verhalten: Browser ignorieren Deklarationen mit unbekannten Werten und behalten die vorige.)

Belege:
- `@csstools/postcss-oklab-function` README (Fallback-Erzeugung, `preserve`, `enableProgressiveCustomProperties`): https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-oklab-function (abgerufen 2026-07-21)
- Eigener Plugin-Test mit @csstools/postcss-oklab-function@5.0.6 + postcss@8 (2026-07-21, Output oben)
- webstatus.dev-API, Feature „relative-color" (Baseline Newly 2024-09-16): https://api.webstatus.dev/v1/features?q=oklch (abgerufen 2026-07-21)

---

## Konsequenzen für die Umsetzung

1. Token-Migration in einem PR: `src/index.css` (Tripel-Werte aus DESIGN-VISION §4 + Kommentar Z. 5–7 anpassen) + `tailwind.config.ts` (`hsl(` → `oklch(`, `<alpha-value>` ergänzen).
2. Kein neues PostCSS-Plugin, keine `@supports`-Token-Doppelung.
3. Optional die 4-zeilige body-Versicherung.
4. Verbot in Code-Review: keine Relative Color Syntax, kein `in oklch` in Gradients, solange nicht Baseline Widely.
