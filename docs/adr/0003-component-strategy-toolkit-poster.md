# 0003 — Komponentenstrategie: shadcn restylen + eigenes Toolkit für die Werkzeug-Plakat-Handschrift

Status: Accepted
Datum: 2026-07-21
Kontext-Doku: `design-vision/DESIGN-VISION.md` (§4 Bausteine, §8 Komponenten, §9 Technische Konsequenz), Wayfinder-Ticket #55

## Kontext

Die Design-Vision ersetzt die shadcn-Optik vollständig durch die Werkzeug-Plakat-Handschrift (keine runden Ecken, keine weichen Schatten, 2–2.5px Tinte-Rahmen, harter Versatz-Schatten `4px 4px 0`, OKLCH-Farbrollen Papier/Tinte/Grün/Gelb/Rot). Die App nutzt real 22 von 49 shadcn/Radix-Komponenten unter `src/components/ui/` (Schwergewichte: button 42×, input/dialog 19×, label 17×, select 13×, badge 11×). Radix-Verhalten (Fokus-Traps, A11y, Positionierung) steckt in dialog, alert-dialog, select, dropdown-menu, tooltip, radio-group, checkbox, switch, drawer, creatable-combobox. Rollout-Entscheidung der Karte #51: Bereiche einzeln auf main, Misch-Optik akzeptiert.

## Entscheidung

**1. Mischform mit klarer Trennlinie**

- **Tokens + Basis global umstellen** (Fundament-Schnitt): OKLCH-Farbrollen, `--radius: 0`, Schriften (Public Sans + Anton via Fontsource, ADR-los per Research #53 entschieden), weiche Schatten raus. Misch-Optik während des Übergangs ist abgenommen.
- **shadcn-Komponenten mit unersetzlichem Radix-Verhalten behalten, nur Optik überschreiben:** Dialog/AlertDialog, Select, DropdownMenu, Tooltip, Checkbox, RadioGroup, Drawer, Combobox. Verhalten/A11y wird nicht neu gebaut.
- **Wo die Vision eigene Patterns definiert, ersetzt das Toolkit die shadcn-Komponente ganz:** Ampel-Reiter statt tabs, `SegmentedControl` statt switch.
- **button/card/badge/input bleiben als Hülle**, bekommen Werkzeug-Varianten (z. B. Versatz-Schatten als `variant`), keine Sonder-CSS pro Seite.
- **Eigene Werkzeug-Bausteine** ohne shadcn-Gegenstück leben in `src/components/toolkit/`.
- **Die 27 ungenutzten `ui/`-Dateien werden gelöscht.**

**2. Wo das Design-CSS lebt — Regel**

- **Tokens** (Farben, Fonts, Versatz-Schatten, Rahmenstärken 1.5/2.5px) → Tailwind-Theme (Kanaltripel-Muster, `oklch(var(--token))`, vgl. Research #52).
- **Grafik-Rezepte** (Halftone-Kachel, Maßband-Skala aus repeating-linear-gradients, Punktraster-Trenner, Stempel-Rotation) → globale Klassen in `@layer components` (`src/toolkit.css`), aber **jede Klasse wird von genau einer Toolkit-Komponente referenziert**. Taucht `.ruler` & Co. in Seiten-Code auf, ist das ein Review-Fehler — Seiten kennen nur `<Ruler />`.
- **Alles andere** (Layout, Spacing, Zustände) → Tailwind-Utilities in den Komponenten.

**3. Stil-Brüche via Token + Komponenten-Edit, nicht brachial-global**

- `--radius: 0` (shadcn leitet lg/md/sm ab), `boxShadow.versatz: 4px 4px 0 <tinte>`, Theme-Einträge `borderWidth: 1.5 / 2.5`.
- Alte Tokens `gradient-hero`, `gradient-card`, `shadow-festival`, `shadow-card` werden beim Fundament-Schnitt **gelöscht**; die ~29 Altstellen in 13 Seiten-Dateien werden dabei mechanisch auf neutrale Ersatzwerte umgestellt (nicht-kaputt, kein Redesign — das kommt pro Bereich).
- Hartkodierte `rounded-full`/`shadow-sm` in den 22 genutzten `ui/`-Dateien werden beim Restyling rauseditiert.
- Ausnahme-Regel: Rundungen nur als bewusstes Grafik-Detail **innerhalb** von Toolkit-Komponenten (Stanzloch der NameChip, Ampel-Punkt), nie als Container-Radius.

**4. Naming: sauber Englisch, Mapping zur Vision**

Ordner `src/components/toolkit/`, CSS `src/toolkit.css`. CSS-Klassen folgen den englischen Komponentennamen; Prototyp-Klassennamen sind Referenz, keine Vorgabe.

| Vision/Prototyp | Komponente |
|---|---|
| Maßband-Ruler (.ruler) | `<Ruler>` |
| Namens-Marke (.mchip) | `<NameChip>` |
| Wertmarke (.kat) | `<ValueTag>` |
| Stempel | `<Stamp>` |
| Segment-Schalter (.seg) | `<SegmentedControl>` |
| Modus-Umschalter (.modeseg) | `<ModeToggle>` |
| Ampel-Logik | `<StatusBar>` / Helper `statusColor()` |
| Freier Platz | `<OpenSlot>` |

## Konsequenzen

- Der Fundament-Schnitt (eigenes Umsetzungs-Issue) umfasst: Token-Umstellung auf OKLCH-Rollen, Radius 0, Font-Setup, Löschen der 27 toten ui-Dateien, Restyling der 22 genutzten ui-Dateien, `toolkit/`-Grundstock, mechanische Bereinigung der 29 Altstellen.
- Bereiche bauen danach nur noch auf Toolkit + restyltem shadcn auf; neue Optik pro Seite entsteht ohne Sonder-CSS.
- Die Grenze Verhalten (ui/) vs. Handschrift (toolkit/) ist im Dateisystem sichtbar.

## Verworfene Alternativen

- **Alles Tailwind-Utilities** — Grafik-Rezepte (gestackte Gradients, SVG-Data-URIs) werden als Klassen-Salat unlesbar.
- **Globales CSS 1:1 wie im Prototyp** — zweites Styling-System quer durch die App, tote-CSS-Gefahr, keine Kapselung.
- **Radix-Verhalten neu bauen** — Verschwendung; Fokus-Traps/A11y sind gelöst.
- **Brachial-global `* { border-radius: 0 !important }`** — kämpft gegen jede Komponente, macht legitime Rundungen (Stanzloch) zum Hack.
- **Alte Bereiche bis zum Umbau pixelgleich lassen** — verworfen, Misch-Optik ist abgenommen; globaler Token-Kipp ist billiger.
