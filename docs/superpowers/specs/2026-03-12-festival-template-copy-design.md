# Festival aus Vorlage erstellen — Design Spec

## Zusammenfassung

Erweitert den Festival-Wizard um die Möglichkeit, ein bestehendes Fest als Vorlage zu verwenden. Der User wählt optional ein Quell-Fest, konfiguriert im zweiten Schritt welche Stationen und Materialien übernommen werden, und erstellt daraus ein neues Fest mit kopierten Daten.

## Wizard Flow

### Schritt 1 — Basisdaten

Bestehende Felder bleiben unverändert:
- **Name** (Pflicht)
- **Startdatum** (Pflicht)
- **Enddatum** (optional)

Neues Feld:
- **Dropdown "Bestehendes Fest als Vorlage"** (optional) — listet alle Feste des Users via `getUserFestivals()` (bestehende Sortierung nach `created_at` absteigend). Standard: "Keine Vorlage".

Verhalten:
- Ohne Vorlage → Button "Fest erstellen" (direkter Abschluss, wie bisher)
- Mit Vorlage → Button "Weiter" führt zu Schritt 2

### Schritt 2 — Übernahme konfigurieren

Nur erreichbar wenn in Schritt 1 eine Vorlage gewählt wurde. Zwei Bereiche untereinander.

**Navigation:** "Zurück" Button führt zu Schritt 1. Gewählte Checkboxen in Schritt 2 bleiben erhalten wenn man zurück und wieder vorwärts geht. Wird in Schritt 1 eine andere Vorlage gewählt, wird Schritt 2 zurückgesetzt.

#### Stationen-Bereich

- **"Alle/Keine" Toggle** — wählt alle Stationen an/ab
- **Liste aller Stationen** des Quell-Festes als Checkboxen
  - Jede Zeile zeigt: Stationsname + `required_people` Personen
  - Schichten der Station werden implizit mit übernommen
- **Globale Checkbox "Zuweisungen übernehmen"**
  - Wenn aktiv: Stations-Mitglieder und Schicht-Zuweisungen werden für alle gewählten Stationen mit kopiert
  - Wenn inaktiv: nur die Stationen/Schichten-Struktur wird kopiert, ohne Personen

#### Materialien-Bereich

- **Radio-Buttons:** "Bestellmenge übernehmen" / "Tatsächliche Menge übernehmen"
  - Bestimmt welcher Wert als `ordered_quantity` im neuen Fest gesetzt wird
- **Gruppen-Toggles** zum schnellen An-/Abwählen:
  - Nach **Kategorie** (Getränke, Lebensmittel, Dekoration, etc.)
  - Nach **Lieferant** (alle vorhandenen Lieferanten)
  - Nach **Station** (alle Stationen + "Ohne Station")
- **"Alle/Keine" Toggle** — wählt alle Materialien an/ab
- **Einzelne Materialien** per Checkbox an-/abwählbar
  - Jede Zeile zeigt: Name, Kategorie, Menge (je nach Radio-Auswahl)

Gruppen-Toggle Logik:
- Gruppe abwählen → alle zugehörigen Materialien werden abgewählt
- Gruppe anwählen → alle zugehörigen Materialien werden angewählt
- Wenn ein Material manuell abgewählt wird, bleibt der Gruppen-Toggle in einem "partial" State (Indeterminate-Checkbox)

**Button:** "Fest erstellen" → erstellt Festival und kopiert gewählte Daten. Button zeigt Loading-State während der Kopieroperation.

## Kopierlogik

### Stationen

Kopierte Felder pro Station:
- `name`
- `description`
- `required_people`
- `responsible_member_id` (nur wenn "Zuweisungen übernehmen" aktiv UND das Mitglied existiert)

Kopierte Felder pro Schicht (für jede gewählte Station):
- `name`
- `start_time`, `end_time`
- `start_date` — wird relativ zum neuen Fest-Startdatum berechnet: der Offset (in Tagen) zwischen dem Quell-Fest-Startdatum und dem Schicht-Startdatum wird auf das neue Fest-Startdatum addiert.
- `end_date` — gleiche Offset-Logik. Wenn `end_date` im Quell-Shift `null` ist, bleibt es `null`.
- `required_people`

### Zuweisungen (optional)

Wenn "Zuweisungen übernehmen" aktiv:
- `station_members` — kopiert mit: `member_id`, neue `station_id`, neue `festival_id` (Ziel-Fest). Übersprungen wenn das Mitglied nicht mehr existiert.
- `shift_assignments` — kopiert mit: `member_id`, neue `station_shift_id`, neue `station_id` (per ID-Mapping), neue `festival_id` (Ziel-Fest), `position` wird übernommen. Übersprungen wenn das Mitglied nicht mehr existiert.

Hinweis: `festival_member_preferences` werden NICHT kopiert (out of scope).

### Materialien

Kopierte Felder pro Material:
- `name`, `category`, `supplier`, `unit`, `packaging_unit`, `amount_per_packaging`, `unit_price`, `notes`
- `ordered_quantity` — wird je nach Radio-Auswahl aus `ordered_quantity` oder `actual_quantity` des Quell-Materials gesetzt. Wenn der Quellwert `null` ist, wird 0 verwendet.
- `actual_quantity` — wird auf `null` gesetzt (neues Fest, noch kein Verbrauch)
- `station_id` — wird per ID-Mapping (alt → neu) auf die neue Station gemappt, falls die Station ebenfalls kopiert wurde. Sonst `null`.

## Technische Architektur

### Neue/geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/components/FestivalWizard.tsx` | Step-State hinzufügen, Vorlage-Dropdown, "Weiter"/"Zurück" Navigation |
| `src/components/festival-wizard/TemplateSelectionStep.tsx` | **Neu** — Schritt 2 Komponente mit Stationen- und Materialien-Auswahl |
| `src/lib/festivalService.ts` | Neue Funktion `copyFestivalData(sourceFestivalId, targetFestivalId, options)` |
| `src/lib/shiftService.ts` | Neue Bulk-Funktionen: `createStationsBulk`, `createStationShiftsBulk` |
| `src/lib/materialService.ts` | `createMaterialsBulk` existiert bereits, ggf. kleinere Anpassung |

### Service-Funktion `copyFestivalData`

```typescript
interface CopyFestivalOptions {
  stationIds: string[];           // gewählte Quell-Station-IDs
  copyAssignments: boolean;       // Zuweisungen übernehmen
  materialIds: string[];          // gewählte Quell-Material-IDs
  materialQuantitySource: 'ordered' | 'actual';  // Mengenbasis
  sourceFestivalStartDate: string; // für Schichtdaten-Offset
  targetFestivalStartDate: string;
}

async function copyFestivalData(
  sourceFestivalId: string,
  targetFestivalId: string,
  options: CopyFestivalOptions
): Promise<void>
```

Ablauf:
1. Gewählte Stationen aus Quell-Fest laden
2. Stationen im Ziel-Fest per Bulk-Insert erstellen → ID-Mapping (alt → neu) merken
3. Schichten pro Station laden und mit neuem Datum per Bulk-Insert erstellen → ID-Mapping merken
4. Wenn `copyAssignments`: Station-Members und Shift-Assignments kopieren mit neuen IDs (Mitglieder die nicht existieren überspringen)
5. Gewählte Materialien laden und per `createMaterialsBulk` mit neuen Station-IDs (per ID-Mapping) erstellen

Fehlerbehandlung: Bei einem Fehler in einem der Schritte wird der Fehler angezeigt. Bereits erstellte Daten bleiben bestehen (kein Rollback). Da das gesamte Ziel-Fest neu ist, kann der User es im Fehlerfall einfach löschen und neu versuchen.

### Daten laden für Schritt 2

Beim Wählen einer Vorlage in Schritt 1 werden geladen:
- Stationen des Quell-Festes (mit `required_people`)
- Schichten pro Station (für Anzeige-Info)
- Materialien des Quell-Festes (mit Kategorie, Lieferant, Station, Mengen)

Dafür reichen die bestehenden Service-Funktionen:
- `getStations(festivalId)` aus `shiftService.ts`
- `getStationShifts(festivalId)` aus `shiftService.ts`
- `getMaterials(festivalId)` aus `materialService.ts`

## Edge Cases

- **Quell-Fest hat keine Stationen/Materialien:** Bereiche werden leer angezeigt mit Hinweis "Keine Stationen/Materialien vorhanden"
- **Material verweist auf Station die nicht kopiert wird:** `station_id` wird auf `null` gesetzt
- **`actual_quantity` ist null beim Quell-Material und "Tatsächliche Menge" gewählt:** `ordered_quantity` wird auf 0 gesetzt
- **Mehrere Stationen mit gleichem Namen:** ID-Mapping funktioniert per Erstellungsreihenfolge (alt-ID → neu-ID), nicht per Name
- **Mitglied existiert nicht mehr (bei Zuweisungen):** Zuweisung wird übersprungen
- **Neues Fest hat kein Enddatum aber Quell-Fest geht über mehrere Tage:** Schichten werden trotzdem mit Offset erstellt, das ist kein Problem
- **Fehler während Kopiervorgang:** Kein Rollback, User kann Ziel-Fest löschen und neu versuchen
