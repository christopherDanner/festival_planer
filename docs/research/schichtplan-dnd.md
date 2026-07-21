# Research: Drag & Drop + Antippen-Fallback im Schichtplan

- **Issue:** [#54](https://github.com/christopherDanner/festival_planer/issues/54) (Wayfinder-Karte #51)
- **Bezug:** `design-vision/DESIGN-VISION.md` §5 (Schichtplan) und §9
- **Abrufdatum aller Quellen:** 2026-07-21

## TL;DR / Empfehlung

**Natives HTML5 Drag & Drop beibehalten und härten — keine Bibliothek einführen.**
Das Antippen-Paar (existiert bereits) wird zum universellen Fallback: auch am
Desktop aktiviert und per Tastatur bedienbar gemacht. Bundle-Kosten: **0 kB**.

Begründung in einem Satz: dnd-kits zentraler Daseinsgrund ist, dass die
HTML5-DnD-API weder Touch noch Tastatur kann — beide Fälle deckt bei uns aber
per Design-Auflage das Antippen-Paar ab, und der verbleibende Desktop-Maus-Fall
(eine Marke → ein Slot, kein Sortieren, keine Achsen-Locks) ist genau das, was
die native API problemlos leistet und was im Code heute schon funktioniert.

---

## Frage 1: Wie ist die Zuweisung heute gelöst? Gibt es schon DnD?

**Ja — beides existiert bereits.** Der Schichtplan hat heute zwei vollständige
Zuweisungspfade:

### Desktop: natives HTML5 Drag & Drop

- `src/components/shift-planning/MemberCard.tsx` (Z. 52–54): Karte ist
  `draggable={!onTapSelect}` mit `onDragStart`/`onDragEnd`.
- `src/components/shift-planning/StationShiftCard.tsx` (Z. 57–58) und
  `StationCard.tsx` (Z. 125–126): Drop-Zonen mit
  `onDragOver={(e) => e.preventDefault()}` + `onDrop`.
- `src/components/shift-planning/ShiftPlanningView.tsx`: Payload läuft **nicht**
  über `dataTransfer`, sondern über React-State `draggedMember` (Z. 47);
  `handleDrop` (Z. 116) und `handleDropOnStation` (Z. 165) validieren
  (Schicht voll, Doppelzuweisung), berechnen die nächste freie Position und
  mutieren via `useShiftPlanningActions` (TanStack Query → Supabase).

### Mobil: Antippen-Paar (bereits implementiert)

- `ShiftPlanningView.tsx`: `handleTapSelect` (Z. 53) setzt `selectedMember`,
  zeigt Banner „… tippe auf eine Station/Schicht" (Z. 239–248);
  `handleTapAssignToShift` (Z. 62) / `handleTapAssignToStation` (Z. 94) führen
  die Zuweisung aus. Slots bekommen bei aktiver Auswahl Ring-Highlight +
  `cursor-pointer` (`StationShiftCard.tsx` Z. 106).
- Der Tap-Pfad ist an `useIsMobile()` gekoppelt: nur die Drawer-Variante der
  `MemberSidebar` reicht `onTapSelect` durch (Z. 375); am Desktop gibt es
  ihn nicht.

### Lücken gegenüber Design-Vision §5/§9 und Technik-Schulden

1. **Kein `dataTransfer.setData()` in `dragstart`.** Firefox brach Drags von
   `draggable=true`-Elementen ohne gesetzte Daten historisch ab
   (Bugzilla #1352852, inzwischen per Dummy-Daten-Workaround im Browser
   gefixt); `setData` bleibt Best Practice und robuster als reiner
   React-State.
2. **Ablehnung = destruktiver Toast, nicht Rot-Puls.** Vision §Motion:
   „Ablehnung = 0.5s Rot-Puls (inset box-shadow)".
3. **Kein visuelles Dragover-Feedback** auf dem Slot (Vision: hover =
   Flächenton).
4. **Validierung dupliziert:** volle Schicht / Doppelzuweisung / nächste
   Position sind in Drop- und Tap-Pfad je zweimal ausprogrammiert
   (`handleDrop` vs. `handleTapAssignToShift`, `handleDropOnStation` vs.
   `handleTapAssignToStation`).
5. **Keine Tastatur-Alternative** (siehe Frage 3).
6. `package.json`: **keine DnD-Bibliothek installiert** — kein dnd-kit, kein
   react-dnd.

## Frage 2: dnd-kit vs. native HTML5-DnD vs. Pointer-Events-Eigenbau

**Empfehlung: native HTML5-DnD beibehalten und härten.**

### Warum die Auflage „Touch ≠ DnD" die Entscheidung dreht

dnd-kit begründet selbst, warum es die HTML5-API meidet: „The HTML5 Drag and
drop API has some severe limitations. It does not support touch devices or
using the keyboard to drag items […] It also doesn't support common use-cases
such as locking dragging to a specific axis or to the bounds of a container,
custom collision detection strategies, or even customizing the preview of the
dragged item." ([dnd-kit README](https://github.com/clauderic/dnd-kit))

Auf unseren Fall gemappt:

| dnd-kit-Vorteil | Relevanz hier |
| --- | --- |
| Touch-Sensoren | **Entfällt** — Touch ist per Auflage das Antippen-Paar, kein DnD |
| Keyboard-Sensor (Drag per Pfeiltasten) | **Entfällt** — Tastatur-Alternative ist das Antippen-Paar als echte Buttons (Frage 3); Pfeiltasten-Drag wäre sogar die umständlichere Bedienung |
| Achsen-Lock, Container-Bounds, Sortier-Strategien | Nicht gebraucht: eine Marke → ein Slot, keine Umsortierung |
| Custom Collision Detection | Nicht gebraucht: Drop-Ziel = das DOM-Element unterm Zeiger, genau das native Modell |
| `DragOverlay` (frei gestylte Drag-Vorschau) | Nice-to-have; nativ erzeugt der Browser automatisch ein transluzentes Abbild der Marke ([MDN Drag operations](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations): „a translucent image is generated from the source node, and follows the user's pointer during the drag"), anpassbar via `setDragImage()` |

Der einzige echte native Nachteil laut dnd-kit — kein Drag zwischen Fenstern /
vom Desktop — ist für uns irrelevant bzw. spricht sogar **für** nativ (wir
brauchen ihn nicht, verlieren also nichts).

### Was „härten" konkret heißt (Umsetzungshinweise)

1. `dragstart`: `e.dataTransfer.setData('text/plain', member.id)` +
   `effectAllowed = 'copy'` (MDN: `dragstart` ist der einzige Zeitpunkt, an dem
   `dataTransfer` modifiziert werden darf; Drop-Zone braucht weiterhin
   `preventDefault()` im `dragover`).
2. Dragover-Feedback: Flächenton (Vision §Motion `oklch(0.94–0.955)`) via
   `onDragEnter`/`onDragLeave`-Zähler oder `pointer-events: none` auf
   Slot-Kindern (dragleave feuert sonst beim Überfahren von Kind-Elementen).
3. Ablehnung: gemeinsamer Validator (`canAssign(member, stationShift)`), von
   Drop- UND Tap-Pfad genutzt (räumt Duplikation aus Frage 1 auf); bei
   Ablehnung 0.5s Rot-Puls-Klasse (inset box-shadow, `animation`) auf dem
   Slot statt Toast.
4. Antippen-Paar auch am Desktop anbieten (Klick-Paar), nicht nur
   `isMobile` — siehe Frage 3.

### Warum nicht Pointer-Events-Eigenbau

Ein Eigenbau (pointerdown → `setPointerCapture` → pointermove → Treffer-Test →
pointerup) müsste Ghost-Element, Autoscroll beim horizontalen Stationen-Scroll,
Drop-Ziel-Ermittlung (`elementFromPoint`) und Abbruch-Logik selbst nachbauen —
alles Dinge, die die native API oder dnd-kit mitbringen. Er lohnt nur, wenn
man Touch-DnD ohne Bibliothek bräuchte (Pointer Events vereinheitlichen Maus/
Touch/Stift, [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)) —
genau der Fall, der per Auflage wegfällt. Höchster Aufwand, kein Mehrwert.

### Wann die Entscheidung revidieren

dnd-kit (oder Atlassians auf der nativen API aufsetzendes
[pragmatic-drag-and-drop](https://github.com/atlassian/pragmatic-drag-and-drop))
wird interessant, sobald die Anforderungen wachsen: Umsortieren von Helfern
innerhalb/zwischen Slots per Drag, animierte Drag-Vorschau als gestylte
React-Komponente, Multi-Drag. Nichts davon steht in der Design-Vision §5.

## Frage 3: Accessibility-Anforderungen und Bundle-Kosten

### Accessibility

- **WCAG 2.5.7 Dragging Movements (Level AA, WCAG 2.2):** „All functionality
  that uses a dragging movement for operation can be achieved by a single
  pointer without dragging, unless dragging is essential …" Als anerkannte
  Alternative nennt das Understanding-Dokument explizit sequenzielles
  Klicken: „click/tap on one item in the first column, then click/tap on an
  item in the second column" — **das ist exakt unser Antippen-Paar.**
  Konsequenz: Das Antippen-Paar muss auch am Desktop verfügbar sein (heute
  `isMobile`-gebunden), dann ist 2.5.7 erfüllt.
  ([W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html))
- **WCAG 2.1.1 Keyboard (Level A):** „All functionality of the content is
  operable through a keyboard interface …" Konsequenz: Helfer-Marke und
  Slot als echte `<button>`-Elemente (fokussierbar, Enter/Space) — dann
  bedient dieselbe Antippen-Paar-Logik auch die Tastatur: Tab zur Marke,
  Enter = auswählen, Tab zum Slot, Enter = zuweisen, Escape = abbrechen.
  Heute sind Marke (`div` mit `onClick`) und Slot-Zone (`div` mit `onClick`)
  nicht fokussierbar.
  ([W3C Understanding 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html))
- **Screenreader:** Auswahl-/Zuweisungs-/Ablehnungs-Status per
  `aria-live`-Region ansagen (der Rot-Puls allein ist rein visuell);
  `aria-pressed` auf der ausgewählten Marke. **Nicht** `aria-grabbed`/
  `aria-dropeffect` verwenden — beide sind seit ARIA 1.1 deprecated
  („[Deprecated in ARIA 1.1]", [W3C WAI-ARIA 1.1](https://www.w3.org/TR/wai-aria-1.1/)).
- Design-Vision §9 verlangt zusätzlich interaktive Ziele ≥ 40 px — Slots und
  Marken entsprechend dimensionieren.

Randnotiz: dnd-kit bringt Keyboard-Sensor, ARIA-Defaults und Live-Region-
Announcements mit ([dnd-kit Accessibility Guide](https://dndkit.com/legacy/guides/accessibility/)) —
die Announcements sind aber englisch und müssten übersetzt werden; das
button-basierte Antippen-Paar liefert dieselbe Zugänglichkeit einfacher und
auf Deutsch.

### Bundle-Kosten

| Option | Kosten |
| --- | --- |
| **Empfehlung: native HTML5-DnD + Antippen-Paar** | **0 kB** (Browser-API, Code existiert) |
| dnd-kit `@dnd-kit/core` 6.3.1 | 43,7 kB minified / **14,2 kB gzip**, 3 Dependencies (`tslib`, `@dnd-kit/accessibility`, `@dnd-kit/utilities`); Peer: React ≥ 16.8 → React 18.3 kompatibel ([Bundlephobia](https://bundlephobia.com/package/@dnd-kit/core), [npm-Registry](https://registry.npmjs.org/@dnd-kit/core/latest)); Selbstauskunft README: Core „around 10kb minified", zero external dependencies ([README](https://github.com/clauderic/dnd-kit)) |
| Pointer-Events-Eigenbau | 0 kB Dependencies, aber höchster Eigencode-Aufwand |

## Quellen (alle abgerufen 2026-07-21)

1. dnd-kit README (Architektur-Begründung gegen HTML5-DnD-API, Bundle-Größe, Features): https://github.com/clauderic/dnd-kit
2. dnd-kit Accessibility Guide (Keyboard-Sensor, Screenreader-Instructions/Announcements): https://dndkit.com/legacy/guides/accessibility/
3. `@dnd-kit/core` Paketdaten (v6.3.1, Peer-Deps React ≥ 16.8): https://registry.npmjs.org/@dnd-kit/core/latest
4. Bundlephobia `@dnd-kit/core` 6.3.1 (43,7 kB min / 14,2 kB gzip): https://bundlephobia.com/package/@dnd-kit/core
5. MDN — Drag operations (setData nur in `dragstart`, automatisches transluzentes Drag-Bild, `setDragImage`, `dragover`-`preventDefault`): https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations
6. Mozilla Bugzilla #1352852 (Firefox brach Drag ohne `setData` ab; Fix via Dummy-Daten): https://bugzilla.mozilla.org/show_bug.cgi?id=1352852
7. W3C — Understanding WCAG 2.5.7 Dragging Movements (Level AA, sequenzielles Klicken als Alternative): https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
8. W3C — Understanding WCAG 2.1.1 Keyboard (Level A): https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html
9. W3C — WAI-ARIA 1.1 (`aria-grabbed`/`aria-dropeffect` „Deprecated in ARIA 1.1"): https://www.w3.org/TR/wai-aria-1.1/
10. MDN — Pointer events (Einordnung Eigenbau-Option): https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
