# Der Ablauf-Eintrag gehört dem Tag, die Phase ist optional, die Uhrzeit reiht

Der Ablaufplan war dreistufig: `schedule_days → schedule_phases → schedule_entries`, jeder Eintrag mit `schedule_phase_id NOT NULL`. Wer eine Aufgabe notieren wollte, musste vorher eine Phase erfinden — zwei Dialoge vor dem ersten Wort. Die abgenommene Design-Vision (§5, Variante C „Schreibtisch") kannte umgekehrt **gar keine** Phase mehr und gruppierte die Aufgaben quer über alle Tage nach Vorbereitung / Festtage / Nachbereitung.

Beides wurde verworfen. Entschieden (Wayfinder-Ticket #67, am Entscheid-Prototyp `design-vision/entscheid-ablaufplan-phasen.html` mit realen Mengen gemessen):

- Ein Ablauf-Eintrag **gehört dem Tag** (`schedule_day_id NOT NULL`). Der Tag ist die einzige Pflichtebene.
- Die **Phase ist ein optionaler Feinschnitt** (`schedule_phase_id` nullable). Man trägt sofort ein und gruppiert später; Einträge ohne Phase stehen direkt unter ihrem Tag.
- Die Phase ist **nur auf der Aufgaben-Werkliste sichtbar**, nicht auf dem Programmzettel — sie ist ein Planungsbegriff („Aufbau Zelt & Technik"), kein Publikumsbegriff.
- Die **Uhrzeit reiht**, nicht die Hand: sortiert wird nach `start_time`, bei Gleichstand nach `created_at`, Einträge ohne Zeit ans Ende ihrer Gruppe. `schedule_entries.sort_order` und das Drag & Drop darauf entfallen.

## Considered Options

- **Phasen ersatzlos streichen** (die Vision) — verworfen. Ein Festtag zerfällt fachlich in Blöcke („Anlieferung", „Frühschoppen", „Abendprogramm"); ohne sie wird die Werkliste eine Langliste ohne Tagesgrenzen.
- **Phase auf beiden Papieren** — verworfen am gemessenen Bild: der Aushang bekäme 120 px Zwischentitel, die teils einen einzigen Programmpunkt überdachen, in einer Sprache, die Gäste nicht kennen.
- **Phase Pflicht lassen und beim Anlegen eines Tages automatisch eine Default-Phase erzeugen** — verworfen. Löst die Eingabehürde nur, indem es überall leere „Allgemein"-Phasen hinterlässt.
- **Manuelle Reihenfolge behalten** (`sort_order` + Drag & Drop) — verworfen. Es gab schon zwei Wahrheiten: beim Anlegen wurde nach Uhrzeit einsortiert, danach entschied die Hand — und das Dashboard (`programBoard.ts`) sortierte ohnehin allein nach Zeit. Ein Ablaufplan, dessen Zeilen der Uhrzeit widersprechen, ist als Aushang wertlos.

## Consequences

- Die Phase bleibt eine **eigene Tabelle mit eigener Reihenfolge** (`schedule_phases.sort_order` bleibt, denn eine Phase trägt keine Uhrzeit) und wird weiter benannt, umbenannt und sortiert.
- **Phase löschen nimmt ihre Einträge mit** (`ON DELETE CASCADE`, mit Rückfrage) — bewusst beibehalten, obwohl das Ungruppieren technisch möglich wäre: die Geste heißt „dieser Block fällt aus".
- Der **Verantwortliche** eines Ablauf-Eintrags zeigt auf `festival_helpers` (`responsible_helper_id`), nicht mehr auf die globale `members`-Tabelle — dieselbe Konsequenz aus ADR 0005 wie bei `stations.responsible_helper_id`. Er hängt nur an **Aufgaben**; ein Programmpunkt trägt weder Status noch Verantwortlichen, weil er auf keinem Papier steht, das beides zeigt.
- Die gelesene Form ändert sich von `ScheduleDayWithPhases` (Einträge hängen unter Phasen) auf **Einträge am Tag, Phasen als Gruppen-Metadaten**. Die schon ausgelieferten Dashboard-Bausteine `programBoard.ts`, `gapBoard.ts` und `Festplakat.tsx` lesen heute `day.phases[].entries` und werden mitgezogen — samt ihrer Tests.
- Zwei Papiere, zwei Exporte: der **Programmzettel** in Plakat-Optik als Aushang und die **Aufgabenliste** als interne Kopie dessen, was gerade gefiltert am Bildschirm steht. Der bisherige Auswahl-Dialog (Häkchen über Tage und Phasen) entfällt.
