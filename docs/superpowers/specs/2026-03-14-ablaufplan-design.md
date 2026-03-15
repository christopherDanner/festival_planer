# Ablaufplan — Design Spec

## Zusammenfassung

Neuer Tab "Ablaufplan" innerhalb der Festival-Detail-Seite (`/festival-results?id=X`). Ermoeglicht das Erstellen eines detaillierten, chronologischen Ablaufplans fuer ein Fest — von Aufbau ueber Programm bis Abbau. Dient sowohl als Planungswerkzeug als auch als uebersichtliche Referenz waehrend des Festes. Spaeter als PDF exportierbar.

## Datenmodell

### Neue Tabellen

#### `schedule_days`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | UUID, PK | |
| `festival_id` | UUID, FK → festivals, ON DELETE CASCADE | |
| `date` | DATE | Datum des Tages |
| `label` | TEXT, nullable | Optionaler Name (z.B. "Aufbautag", "Hauptfesttag") |
| `is_auto_generated` | BOOLEAN, default false | true fuer Tage aus Festdatum |
| `sort_order` | INTEGER | Reihenfolge |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Constraints:
- UNIQUE(`festival_id`, `date`) — verhindert doppelte Tage bei Race Conditions
- Index auf `festival_id`

RLS: `FOR ALL` Policy — User kann nur Tage seiner eigenen Festivals verwalten (ueber `festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid())`). Gleicher Ansatz wie `festival_materials`.

#### `schedule_phases`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | UUID, PK | |
| `schedule_day_id` | UUID, FK → schedule_days, ON DELETE CASCADE | |
| `festival_id` | UUID, FK → festivals, ON DELETE CASCADE | Fuer einfacheres Querying |
| `name` | TEXT | Phasenname (z.B. "Aufbau", "Abendprogramm") |
| `sort_order` | INTEGER | Reihenfolge innerhalb des Tages |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Constraints:
- Index auf `schedule_day_id`, `festival_id`

RLS: Wie schedule_days (`FOR ALL`, Sub-Query ueber `festival_id`).

#### `schedule_entries`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | UUID, PK | |
| `schedule_phase_id` | UUID, FK → schedule_phases, ON DELETE CASCADE | |
| `festival_id` | UUID, FK → festivals, ON DELETE CASCADE | Fuer einfacheres Querying |
| `title` | TEXT | Titel des Eintrags (Pflicht) |
| `type` | TEXT | `'task'` oder `'program'` |
| `start_time` | TIME, nullable | Startzeit (optional) |
| `end_time` | TIME, nullable | Endzeit (optional) |
| `responsible_member_id` | UUID, FK → members, ON DELETE SET NULL, nullable | Verantwortliche Person |
| `status` | TEXT, nullable | `'open'` oder `'done'` (nur bei type='task') |
| `description` | TEXT, nullable | Freitext-Notizen |
| `sort_order` | INTEGER | Reihenfolge innerhalb der Phase |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Constraints:
- `CHECK (type IN ('task', 'program'))`
- `CHECK (status IN ('open', 'done') OR status IS NULL)`
- Index auf `schedule_phase_id`, `festival_id`, `responsible_member_id`

RLS: Wie schedule_days (`FOR ALL`, Sub-Query ueber `festival_id`).

### Sortierung

- `sort_order` bestimmt die Reihenfolge in allen drei Ebenen
- Beim Erstellen eines Eintrags MIT Uhrzeit: `sort_order` wird automatisch basierend auf der Startzeit berechnet (Eintraege mit frueherer Uhrzeit bekommen niedrigere sort_order)
- Eintraege OHNE Uhrzeit: `sort_order` wird ans Ende der Phase gesetzt
- Manuelle Umsortierung: Aktualisiert `sort_order` der betroffenen Eintraege

### Migration

- Alle FKs verwenden `ON DELETE CASCADE` (ausser `responsible_member_id` → `ON DELETE SET NULL`)
- Indexes auf allen FK-Spalten (wie in bestehenden Migrations)
- `updated_at` wird im Service-Layer manuell gesetzt (wie in `materialService.ts`)
- Tagesgenerierung nutzt `INSERT ... ON CONFLICT (festival_id, date) DO NOTHING` um Race Conditions zu vermeiden
- Nach Migration: Supabase-Typen mit `(supabase as any)` Muster wie bei `festival_materials` verwenden

### Cascade-Deletion

Die `ON DELETE CASCADE` FKs uebernehmen das Loeschen automatisch. Zusaetzlich in `festivalService.ts` bei `deleteFestival()` als defensive Fallback-Loesung ergaenzen (wie bei bestehenden Tabellen):
1. `schedule_entries` (zuerst)
2. `schedule_phases`
3. `schedule_days`

## Validierung

- `title` ist Pflichtfeld (min. 1 Zeichen)
- `start_time` muss vor `end_time` liegen, wenn beide gesetzt sind
- `date` bei schedule_days ist NICHT auf den Festival-Datumsbereich beschraenkt (Aufbau-/Abbautage)
- `status` darf nur bei `type = 'task'` gesetzt werden
- Validierung via React Hook Form + Zod in den Dialogen

## UI-Architektur

### Tab-Integration

Neuer Tab "Ablaufplan" in `FestivalResults.tsx`, neben den bestehenden Tabs "Schichtplan" und "Materialliste". Icon: `CalendarClock` (lucide-react).

### Komponentenstruktur

```
src/components/schedule/
  ScheduleView.tsx              — Orchestrator (analog zu ShiftPlanningView)
  ScheduleHeader.tsx            — Titel + Action-Buttons (Tag hinzufuegen, Phase hinzufuegen, Eintrag hinzufuegen)
  ScheduleDayAccordion.tsx      — Akkordeon fuer einen Tag (Header + Phasen)
  SchedulePhaseSection.tsx      — Akkordeon fuer eine Phase (Header + Tabelle)
  ScheduleEntryTable.tsx        — Tabelle mit Eintraegen einer Phase
  ScheduleEntryRow.tsx          — Einzelne Tabellenzeile (Desktop)
  ScheduleEntryCard.tsx         — Karten-Darstellung (Mobile)
  dialogs/
    ScheduleDayDialog.tsx       — Tag hinzufuegen/bearbeiten
    SchedulePhaseDialog.tsx     — Phase hinzufuegen/bearbeiten
    ScheduleEntryDialog.tsx     — Eintrag hinzufuegen/bearbeiten
  hooks/
    useScheduleData.ts          — React Query: Tage, Phasen, Eintraege laden
    useScheduleActions.ts       — React Query Mutations mit Cache-Invalidierung
```

### Props

`ScheduleView` erhaelt: `{ festivalId: string; festivalStartDate?: string; festivalEndDate?: string }` — Start-/Enddatum wird fuer die automatische Tagesgenerierung benoetigt.

### Service-Layer

```
src/lib/scheduleService.ts
```

CRUD-Operationen fuer alle drei Tabellen:
- `getScheduleDays(festivalId)` — Alle Tage mit Phasen und Eintraegen (nested Supabase select: `*, phases:schedule_phases(*, entries:schedule_entries(*, responsible_member:members(id, first_name, last_name)))`)
- `createScheduleDay(data)` / `updateScheduleDay(id, updates)` / `deleteScheduleDay(id)`
- `createSchedulePhase(data)` / `updateSchedulePhase(id, updates)` / `deleteSchedulePhase(id)`
- `createScheduleEntry(data)` / `updateScheduleEntry(id, updates)` / `deleteScheduleEntry(id)`
- `reorderScheduleEntries(phaseId, orderedIds[])` — Manuelle Umsortierung
- `initializeScheduleDays(festivalId, startDate, endDate)` — Automatische Tagesgenerierung aus Festdatum (mit ON CONFLICT DO NOTHING)

### Layout

**Desktop:**
- Akkordeon-Liste: Tage als aeussere Ebene, Phasen als innere Ebene
- Innerhalb jeder Phase: Tabelle mit Spalten (Zeit, Typ, Eintrag, Verantwortlich, Status/Aktionen)
- Typ-Badge: Gruen fuer Aufgabe, Lila fuer Programm
- Status: Checkbox fuer Aufgaben (offen/erledigt), kein Status fuer Programmpunkte
- Fortschrittsanzeige pro Phase (z.B. "2/5 erledigt") — nur wenn Phase Aufgaben enthaelt
- Zusammenfassung im zugeklappten Tag-Header (z.B. "3 Phasen · 9 Eintraege")

**Mobile:**
- Gleiche Akkordeon-Struktur
- Statt Tabelle: Karten-Layout pro Eintrag
- Inline-Actions per Swipe oder Kontextmenue

### Lade- und Leerzustaende

**Ladezustand:** Skeleton-Animation analog zu MaterialListView.

**Leerzustaende:**
- Kein Festival-Datum gesetzt: Hinweis "Bitte zuerst Start- und Enddatum des Festes festlegen."
- Tag ohne Phasen: Prompt "Phase hinzufuegen, um mit der Planung zu beginnen" mit Button
- Phase ohne Eintraege: Prompt "Ersten Eintrag hinzufuegen" mit Button

### Tagesgenerierung

Beim erstmaligen Oeffnen des Ablaufplan-Tabs:
1. Pruefen ob bereits `schedule_days` fuer dieses Festival existieren
2. Falls nein: Automatisch Tage aus `festivals.start_date` bis `festivals.end_date` generieren (mit `ON CONFLICT DO NOTHING`)
3. Jeder generierte Tag bekommt `is_auto_generated = true` und ein Label basierend auf dem Wochentag
4. User kann zusaetzliche Tage vor dem ersten oder nach dem letzten Tag hinzufuegen (Aufbau-/Abbautage)

### Interaktionen

- **Tag hinzufuegen:** Button im Header, Datumsauswahl + optionaler Name
- **Phase hinzufuegen:** Button im Tag-Header oder am Ende eines Tages
- **Eintrag hinzufuegen:** Button am Ende einer Phase oder im Phase-Header
- **Bearbeiten:** Klick auf Eintrag oeffnet Dialog, oder Inline-Edit fuer schnelle Aenderungen (Status-Toggle)
- **Loeschen:** Bestaetigung erforderlich, kaskadiert (Tag loescht Phasen und Eintraege)
- **Status-Toggle:** Direkt in der Tabelle per Checkbox (nur bei Aufgaben)
- **Umsortieren:** Drag & Drop innerhalb einer Phase (spaeter, nicht im MVP)

## Abgrenzung / Nicht im Scope

- **PDF-Export:** Wird spaeter als eigenes Feature ergaenzt
- **Drag & Drop Umsortierung:** Spaeter, MVP nutzt Pfeiltasten oder Kontextmenue
- **Vorlagen:** Keine Ablaufplan-Vorlagen im MVP
- **AI-generierte Vorschlaege:** Nicht im MVP
- **Benachrichtigungen/Erinnerungen:** Nicht im MVP
