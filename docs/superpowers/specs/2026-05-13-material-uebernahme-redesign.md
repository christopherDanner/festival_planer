# PRD — Material-Übernahme Redesign

**Datum:** 2026-05-13
**Status:** ready-for-agent
**Ersetzt:** bestehender `MaterialTransferDialog` + Workflow aus `2026-03-30-material-transfer-design.md`

---

## Problem Statement

Beim Planen eines neuen Festes will der Veranstalter die Bestellmengen aller Material-Positionen festlegen. Die bestehende "Material übernehmen"-Funktion ist quellfestzentriert: Sie listet die Positionen des Quellfests und fragt "Welche übernehmen?". Das passt nicht zum tatsächlichen Workflow.

Konkret im aktuellen Fall: Das Zielfest (Stadlfest 2026) ist bereits angelegt mit 147 Positionen, davon 142 mit gesetzter Bestellmenge. Das Quellfest (Stadlfest 2024) hat 145 Positionen, davon 128 mit gepflegter Verbraucht-Menge. Name-Matches zwischen beiden gibt es nur bei 74 Positionen. Mit dem bestehenden Dialog:

- Vorhandene Positionen sind per Default abgewählt und gedämpft — also genau die, die der Veranstalter pflegen will, sind versteckt.
- Positionen die nur im Zielfest existieren (70) tauchen im Dialog gar nicht auf — der Veranstalter müsste danach in der normalen Material-Liste nachpflegen.
- Eingaben werden alle am Ende per Bulk-Submit gespeichert. Bei 215 zu prüfenden Zeilen ist ein einziger Fehler kurz vor dem Klick katastrophal.
- Duplicate Names über mehrere Stationen (z.B. "Kühlschrank" an Bar und Weinbar) sind nicht sichtbar als Gruppe.

## Solution

Ein eigenes Vollbild-Werkzeug zur **Material-Übernahme** ([[material-uebernahme]] in CONTEXT.md), das vom Zielfest aus arbeitet. Es zeigt **alle Material-Positionen des Zielfests** plus die **Material-Positionen aus dem Quellfest, die im Zielfest fehlen** — gruppiert nach Station des Zielfests. Pro Position sieht der Veranstalter sofort die historischen Werte aus dem Quellfest (Bestellt-Menge, Verbraucht-Menge) und kann die Wunschmenge direkt eingeben.

Die Eingabe wird **pro Position einzeln gespeichert** beim Verlassen des Felds (Tab oder Klick). Visuelles Feedback pro Zeile zeigt Speicherstatus (gespeichert, läuft, Fehler). Bei Fehler bleibt der Wert im Feld, ein Klick aufs Fehlericon retryt — kein Datenverlust durch einen Crash mitten in der Bearbeitung.

## User Stories

1. Als Veranstalter, der ein neues Fest plant, möchte ich alle Positionen meines Zielfests neben den Referenzwerten aus dem Quellfest sehen, damit ich Position für Position die Wunschmenge für das neue Fest festlegen kann.
2. Als Veranstalter möchte ich ein Quellfest aus meinen vergangenen Festen wählen, damit ich entscheide, welches als Referenz dient.
3. Als Veranstalter möchte ich auch Positionen sehen, die nur im Quellfest existieren und im Zielfest noch fehlen, damit ich sie ggf. ins Zielfest übernehmen kann.
4. Als Veranstalter möchte ich auch Positionen sehen, die nur im Zielfest existieren (keine Quell-Referenz), damit ich beim Durchgehen keine Position übersehe.
5. Als Veranstalter möchte ich Positionen nach Station gruppiert sehen, weil ich mental in Stationen denke und stationsweise plane.
6. Als Veranstalter möchte ich Stations-Sektionen einklappen können, damit ich mich auf einen Bereich konzentrieren kann.
7. Als Veranstalter möchte ich die Tabelle ohne horizontalen Scroll lesen können, damit der Überblick erhalten bleibt.
8. Als Veranstalter möchte ich für jede Position Name, Lieferant, Einheit, Verpackungseinheit und Menge-pro-Verpackungseinheit auf einen Blick sehen, damit ich die richtige Bestellgröße einschätzen kann.
9. Als Veranstalter möchte ich pro Position die Bestellt-Menge und Verbraucht-Menge aus dem Quellfest sehen, damit ich aus der Erfahrung des Vorjahrs ableiten kann.
10. Als Veranstalter möchte ich pro Position ein Eingabefeld für die Wunschmenge haben, damit ich die Bestellmenge für das Zielfest direkt eintragen kann.
11. Als Veranstalter möchte ich, dass das Wunschmenge-Feld mit der bereits im Zielfest gespeicherten Bestellmenge vorbefüllt ist (falls vorhanden), damit ich den aktuellen Stand sehe und gezielt überschreiben kann.
12. Als Veranstalter möchte ich, dass das Wunschmenge-Feld bei "neu anlegen"-Positionen immer leer ist, damit ich bewusst eintragen muss, ob ich die Position übernehmen will.
13. Als Veranstalter möchte ich, dass ein leeres Feld nichts speichert und die ggf. bestehende Bestellmenge im Zielfest unverändert lässt, damit ich nicht versehentlich Daten lösche.
14. Als Veranstalter möchte ich, dass eine eingegebene 0 ignoriert wird (kein Save), damit keine Pseudo-Positionen mit Bestellmenge 0 angelegt werden.
15. Als Veranstalter möchte ich, dass jede Position einzeln gespeichert wird beim Verlassen des Feldes (Tab oder Klick), damit ich nicht riskiere durch einen Fehler am Ende alle Eingaben zu verlieren.
16. Als Veranstalter möchte ich auch mit der Enter-Taste das Feld bestätigen und damit speichern, damit ich ohne Maus arbeiten kann.
17. Als Veranstalter möchte ich pro Zeile sehen, ob das Speichern läuft, erfolgreich war, oder fehlgeschlagen ist, damit ich Fortschritt und Probleme erkenne.
18. Als Veranstalter möchte ich bei einem Speicher-Fehler den eingegebenen Wert im Feld behalten, damit ich nichts neu eintippen muss.
19. Als Veranstalter möchte ich bei einem Speicher-Fehler per Klick aufs Fehler-Icon erneut speichern können, damit ich nach einem kurzen Glitch ohne Workaround weiterarbeiten kann.
20. Als Veranstalter möchte ich am Bildschirm-Ende sehen, wie viele Positionen schon gespeichert sind, wie viele offen, wie viele gerade speichern, wie viele Fehler haben, damit ich den Gesamtfortschritt einschätzen kann.
21. Als Veranstalter möchte ich Positionen die unter dem gleichen Namen mehrfach vorkommen (z.B. an mehreren Stationen) als zusammengehörig erkennen, damit ich die Gesamtmenge nicht übersehe.
22. Als Veranstalter möchte ich bei Mehrfach-Vorkommen die Gesamtsumme der Bestell- und Verbraucht-Mengen aus dem Quellfest auf einen Blick sehen, damit ich die Größenordnung einschätzen kann.
23. Als Veranstalter möchte ich für Mehrfach-Vorkommen ein detailliertes Tooltip mit der Aufschlüsselung pro Station sehen, damit ich nachvollziehen kann, woher die Gesamtsumme kommt.
24. Als Veranstalter möchte ich Positionen, die nur im Quellfest existieren und im Zielfest neu angelegt würden, visuell hervorgehoben sehen (Border + Badge), damit ich die "anlegen"-Aktion bewusst erkenne.
25. Als Veranstalter möchte ich Quell- und Zielfest in der Reihenfolge "Quelle links, Ziel rechts" wählen, weil das der natürlichen Lese- und Datenflussrichtung entspricht.
26. Als Veranstalter möchte ich die Tabelle nach Freitext durchsuchen können (Name oder Lieferant), damit ich gezielt eine bestimmte Position oder Lieferantengruppe finde.
27. Als Veranstalter möchte ich nach Station filtern können, damit ich mich auf eine einzelne Station konzentrieren kann.
28. Als Veranstalter möchte ich nach Lieferant filtern können, damit ich alle Positionen eines Lieferanten am Stück bearbeiten kann.
29. Als Veranstalter möchte ich Filter mit einem Klick zurücksetzen können, damit ich schnell zurück zur Gesamtsicht komme.
30. Als Veranstalter möchte ich beim Match zwischen Quell- und Zielfest, dass primär die Kombination (Name + Station) verglichen wird und sekundär nur der Name, damit eine an mehreren Stationen geführte Position pro Station 1:1 zuordbar bleibt.
31. Als Veranstalter möchte ich, dass die Station einer neuen Position (Nur-Quell) beim Anlegen ins Zielfest automatisch per Namensvergleich auf die Zielfest-Station gemappt wird, damit ich nicht für jede neue Position die Station manuell wählen muss.
32. Als Veranstalter möchte ich, dass beim Anlegen einer neuen Position alle übernehmbaren Eigenschaften (Name, Kategorie, Lieferant, Einheit, Verpackungseinheit, Menge pro Verpackungseinheit, Notizen) aus dem Quellfest übernommen werden, damit ich diese nicht erneut eingeben muss.
33. Als Veranstalter möchte ich, dass beim Anlegen einer neuen Position die Preisfelder (Stückpreis, MwSt, Netto/Brutto, Preis pro Einheit/Verpackung) NICHT aus dem Quellfest übernommen werden, damit veraltete Preise nicht versehentlich übernommen werden.
34. Als Veranstalter möchte ich, dass beim Anlegen einer neuen Position die Verbraucht-Menge des Quellfests NICHT in die Verbraucht-Menge des Zielfests übernommen wird (bleibt null), damit die Spalte "Verbraucht" semantisch sauber bleibt.
35. Als Veranstalter möchte ich, dass eine Position, die ich gerade neu angelegt habe, bei einer späteren Änderung ihrer Wunschmenge in derselben Sitzung als Update behandelt wird (nicht erneut angelegt), damit keine Duplikate entstehen.
36. Als Veranstalter möchte ich eine Eingabe, die exakt dem vorbefüllten Wert entspricht (also unverändert), NICHT als Speicher-Aktion verursachen, damit unnötige Schreibzugriffe vermieden werden.
37. Als Veranstalter möchte ich, dass das Werkzeug eine eigene Route ist (kein Modal), damit ich Vollbild arbeiten kann und nicht durch enge Dialog-Constraints behindert werde.

## Implementation Decisions

### Routing
- Eigene Route `/festivals/:festivalId/material-uebernahme` ersetzt das bestehende `MaterialTransferDialog`. Das Modal wird entfernt.
- Aufruf erfolgt über einen Button in der `MaterialListHeader` (vormals "Übernehmen") — der `setDialogState({ type: 'transfer' })`-Aufruf wird durch einen Navigations-Link ersetzt.

### Modul: MaterialMatcher (deep, pure)
- Reine Funktion mit Signatur etwa: `matchMaterials(src: FestivalMaterial[], tgt: FestivalMaterial[]): MatchResult`.
- `MatchResult` enthält eine geordnete Row-Liste sowie eine Map mit Gruppen-Aggregaten pro Name (für das `n× · Σ`-Badge).
- Die Match-Strategie läuft in drei Pässen:
  1. **Pass 1 — (Name + Station) exakt:** Jedes Ziel-Material wird mit höchstens einem Quell-Material verknüpft, wenn beide den gleichen normalisierten Namen und Stationsnamen tragen. Verbraucht den Quell-Eintrag.
  2. **Pass 2 — Name only mit Aggregation:** Für Ziel-Materialien ohne Pass-1-Treffer werden alle verbliebenen Quell-Materialien mit gleichem Namen zugeordnet und ihre Mengen aggregiert.
  3. **Pass 3 — Rest als Nur-Quell:** Übrige Quell-Materialien werden als separate "neu anlegen"-Rows ausgegeben.
- Normalisierung: Name → trim+lowercase. Station → trim+lowercase, null und leer-String sind äquivalent.
- Output pro Row enthält: identifizierende Felder, Status (`match` / `only-source` / `only-target`), aggregierte Quell-Werte (Bestellt-Summe, Verbraucht-Summe oder null wenn alle null), Anzahl aggregierter Quell-Einträge, Details-Liste für Tooltip, sowie den aktuell im Zielfest gespeicherten Wert der Bestellt-Menge (für Pre-fill).
- Aus dem Prototyp validiert: die Reihenfolge der Pässe ist semantisch korrekt — Station-Match löst die "Kühlschrank an 2 Stationen"-Doppelzählung, ohne den "Position wurde zwischen Festen umstationiert"-Fall zu zerstören.

### Modul: SaveOrchestrator (deep)
- Verwaltet den Save-State pro Row-Key. State Maschine:
  ```
  idle ──(blur mit veränderter, gültiger Eingabe)──→ saving
  saving ──(success)──→ saved ──(nach ~1.5s)──→ idle
  saving ──(error)──→ error ──(retry)──→ saving
  ```
- "Veränderte Eingabe" heißt: geparster numerischer Wert ≠ zuletzt erfolgreich gespeicherter Wert (`committed[key]`).
- "Gültige Eingabe" heißt: nicht leer, parsbar, > 0.
- Action-Entscheidung pro Save:
  - Status `only-source` und noch keine DB-ID aus früherem Create in dieser Sitzung → `create`
  - Sonst → `update`
- Nach erfolgreichem `create` wird die zurückgegebene DB-ID gemerkt; weitere Saves derselben Row gehen automatisch in den `update`-Pfad.
- Beim Wechsel des Quell- oder Zielfests werden alle Save-States, committed-Werte und Create-IDs zurückgesetzt.
- Hook-Form: `useSaveOrchestrator({ rows, inputs, onCreate, onUpdate })` liefert `{ saveRow, retry, statesByKey, stats }`. `onCreate`/`onUpdate` sind injectable für Tests.

### Modul: MaterialUebernahmeView (UI)
- Lädt Festivals via `getUserFestivals`, Materialien via `getMaterials(sourceId)` + `getMaterials(targetId)` (React Query).
- Defaults beim Mount: jüngstes Fest als Ziel, zweitjüngstes als Quelle. User kann beide ändern.
- Festival-Auswahl: zwei Selects, Quelle links, Ziel rechts. Beide schließen das jeweils andere als Option aus.
- Tabelle:
  - Spalten (8): Name, Lieferant, Einheit, Verpackungseinheit, Menge pro Verpackungseinheit, Bestellt (Quelle), Verbraucht (Quelle), Wunschmenge.
  - Station NICHT als Spalte — steht im Sektions-Header.
  - Gruppen-Header pro Station, Anzahl Positionen daneben, klickbar zum Ein-/Ausklappen.
  - Rows innerhalb einer Sektion alphabetisch nach Name.
  - Sektions-Reihenfolge alphabetisch nach Stationsname.
- Pre-fill-Logik: Wunschmenge-Feld bekommt initial den `ordered_quantity`-Wert der Zielfest-Position, wenn > 0. Bei `only-source` und sonst leerem Zielwert: leer.
- Statusindikator pro Zeile am rechten Rand des Wunschmenge-Felds:
  - `saving`: Loader-Icon
  - `saved`: Check-Icon (grün, fade)
  - `error`: AlertCircle-Icon (rot, klickbar = retry, Tooltip mit Fehlermeldung), Input bekommt rote Border
- Nur-Quell-Zeilen: grüner Border-Left + Badge "neu anlegen" neben dem Namen.
- Gesamt-Aggregat-Badge bei Mehrfach-Vorkommen: neben dem Namen Badge `n× · Σ<orderedTotal>`. Tooltip mit Pro-Station-Aufschlüsselung sowie Quellfest-Gesamtsummen (Bestellt + Verbraucht).
- Filter-Leiste sticky oben: Freitextsuche (Name/Lieferant), Station-Filter, Lieferant-Filter, Reset, Counter "x von y Zeilen".
- Status-Leiste sticky unten: Counter für `gespeichert`, `speichern…`, `offen`, `Fehler`. Kein Submit-Button mehr (Save passiert pro Zeile).
- Keine horizontale Scrollbar: Spaltenproportionen so gewählt, dass die 8 Spalten auf üblichen Desktop-Breiten bündig passen. Bei kleineren Viewports wird der Container scrollbar, die Tabelle selbst nicht.

### Service-Layer
- Keine neuen Bulk-Operationen nötig. `createMaterial` und `updateMaterial` aus `materialService.ts` werden direkt verwendet.
- Beim Anlegen einer Nur-Quell-Position werden folgende Felder aus dem Quell-Material übernommen: `name`, `category`, `supplier`, `unit`, `packaging_unit`, `amount_per_packaging`, `notes`. Felder die NICHT übernommen werden: `actual_quantity` (= null), `unit_price` (= null), `tax_rate` (= null), `price_is_net` (= true Default), `price_per` (= 'unit' Default). `station_id` wird per Namensvergleich auf eine Zielfest-Station gemappt; ohne Treffer null.
- `ordered_quantity` ist der einzige Feldwert, der bei `update` geschrieben wird.

### Cleanup
- Datei `MaterialTransferDialog.tsx` wird entfernt.
- `DialogState` in `MaterialListView.tsx` verliert den `transfer`-Typ.
- Aufrufstelle (`onTransfer` in `MaterialListHeader`) navigiert via `useNavigate` zur neuen Route.
- Der Prototyp `MaterialUebernahmePrototype.tsx` + Route `/prototype/material-uebernahme` wird gelöscht, sobald das echte Feature steht.

## Testing Decisions

Gute Tests prüfen externes Verhalten — also: gegebene Eingabe → erwartete Ausgabe / Aufrufe — nicht interne Implementierungsdetails. Test-Code soll die Logik nicht spiegeln, sondern beobachten.

### MaterialMatcher (Vitest, reine Funktion)
Test-Fixtures mit synthetischen `FestivalMaterial`-Listen. Tests decken folgende Szenarien:
- Leere Quelle: alle Ziel-Materialien werden zu `only-target`-Rows.
- Leeres Ziel: alle Quell-Materialien werden zu `only-source`-Rows.
- Sauberer 1:1-Match per (Name + Station): jede Match-Row trägt genau einen Quell-Eintrag, keine Aggregation.
- Gleicher Name, unterschiedliche Station, je 1× auf jeder Seite: Pass-2 greift, 1:1-Zuordnung über Stations-Grenze.
- Quelle hat 2 Einträge mit gleichem Namen an unterschiedlichen Stationen, Ziel hat 1 davon: Pass 1 nimmt die passende Station, Pass 3 macht aus dem Rest eine `only-source`-Row.
- Quelle hat 2 Einträge mit gleichem Namen, Ziel hat 1 Eintrag mit selbem Namen aber unbekannter Station: Pass-2 aggregiert beide Quell-Einträge auf die eine Ziel-Row; `srcAggregateCount === 2`.
- Quelle und Ziel haben je 2 Einträge mit gleichem Namen, beide Stations-Paare identisch: zwei saubere 1:1-Matches per Pass 1.
- Verbraucht-Menge null-Handling: wenn alle aggregierten Quell-Einträge `actual_quantity = null` haben, ist das Aggregat null. Wenn mindestens einer gefüllt ist, ist das Aggregat die Summe der nicht-null-Werte.
- Name-Normalisierung: case-insensitiv, Whitespace-getrimmt — "Bier 0,5l" matcht "BIER 0,5L ".
- Stations-Normalisierung: null und leer-String werden als identisch behandelt.
- Gruppen-Aggregation: bei N gleichbenannten Ziel-Rows ist `groupByName.rowCount === N` und `srcOrderedTotal` = Summe über alle zugeordneten Quell-Einträge.

### SaveOrchestrator (Vitest, gemockter Service)
Tests injizieren Fake-`onCreate`/`onUpdate`-Funktionen mit kontrollierten Resolve/Reject-Promises. Szenarien:
- Save-Call passiert nicht, wenn das Feld leer ist.
- Save-Call passiert nicht, wenn der Wert dem `committed`-Wert entspricht (Pre-fill unverändert).
- Save-Call passiert nicht, wenn der eingegebene Wert ≤ 0 ist.
- Bei `only-source`-Row wird `onCreate` aufgerufen, bei `match`/`only-target` wird `onUpdate` aufgerufen.
- Nach erfolgreichem `create` wird die DB-ID intern verknüpft, sodass ein zweiter Save derselben Row `onUpdate` (nicht `onCreate`) aufruft.
- State-Übergang `idle → saving → saved`: nach Auflösen des Promises liegt der State auf `saved`.
- State-Übergang `saving → error`: nach Reject liegt der State auf `error` und die Fehlermeldung wird festgehalten.
- Retry: ein erneuter `saveRow`-Aufruf nach Fehler löst einen weiteren Save-Call aus.
- Beim Reset (Festival-Wechsel) werden alle Stati zurückgesetzt.

### Prior Art im Repo
Aktuell existieren noch keine Unit-Tests; das Repo hat Vitest noch nicht im `package.json`. Die Einrichtung von Vitest gehört in den Scope dieser Implementierung — minimal-Setup mit `npm i -D vitest`, `vitest.config.ts` analog zu `vite.config.ts` mit JSDOM-Environment. Tests landen in `src/lib/__tests__/materialMatcher.test.ts` bzw. `src/hooks/__tests__/useSaveOrchestrator.test.ts`.

### Keine Tests für
- `MaterialUebernahmeView` (UI-Smoke nicht im Scope — niedriger Testwert relativ zu Aufwand).
- Services `getMaterials` / `createMaterial` / `updateMaterial` — sind dünne Supabase-Wrapper, kein Eigenwert für Mock-Tests.

## Out of Scope

- Mehrere Quellfeste als Referenz gleichzeitig (z.B. Durchschnitt aus 3 Vorjahren). Quellfest bleibt 1.
- Drag-&-Drop oder Reorder von Positionen.
- Editieren anderer Felder (Lieferant, Einheit, etc.) im Übernahme-Werkzeug — dafür bleibt die normale Material-Liste zuständig.
- Quick-Fill-Buttons "Verbraucht-Menge übernehmen". Bewusst nicht im Scope (User-Entscheidung: bewusstes Eintippen pro Position).
- Bulk-Aktionen "alle markierten anlegen/aktualisieren".
- Konflikt-Anzeige bei abweichender Quell-Station/Lieferant/Einheit (User-Entscheidung: keine Konflikt-Markierung).
- Quellpreise mit in das Zielfest übernehmen.
- Re-Import von ausgefüllten Excel-Listen.
- Eine Pseudo-Position mit `ordered_quantity = 0` anlegen.
- Schreib-Operation aus der Übernahme-Maske heraus, die `ordered_quantity` auf null setzt (= Löschen der Bestellmenge). Dafür bleibt die normale Material-Liste zuständig.
- Offline-Modus / lokale Persistierung der Eingaben.

## Further Notes

- Prototyp unter `/prototype/material-uebernahme` (Datei `src/pages/MaterialUebernahmePrototype.tsx`) hat das Layout und die Save-Mechanik validiert; bei der Umsetzung als echtes Feature dient er als Vorlage, wird danach gelöscht.
- Im Prototyp ist eine ~7%ige künstliche Mock-Fehlerquote eingebaut, damit der Retry-Flow demonstriert ist. Diese ist Prototyp-only und gehört nicht ins echte Feature.
- Bestehende Spec `docs/superpowers/specs/2026-03-30-material-transfer-design.md` ist mit dieser PRD obsolet; die Modal-Variante wird ersetzt.
- Die fachlichen Begriffe (`Quellfest`, `Zielfest`, `Wunschmenge`, `Material-Position`, `Bestellt-Menge`, `Verbraucht-Menge`) sind in `CONTEXT.md` definiert.
