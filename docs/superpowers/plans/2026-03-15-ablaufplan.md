# Ablaufplan Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Ablaufplan" (schedule) tab to the festival detail page with a three-tier hierarchy: Days > Phases > Entries.

**Architecture:** New Supabase tables (`schedule_days`, `schedule_phases`, `schedule_entries`) with RLS. Service layer (`scheduleService.ts`) handles CRUD. React Query hooks for data/mutations. Akkordeon UI with tables for entries. Follows the exact same patterns as the material-list feature.

**Tech Stack:** React 18, TypeScript, Supabase, React Query, shadcn-ui (Radix), Tailwind CSS, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-03-14-ablaufplan-design.md`

**Note:** No test suite is configured in this project. Steps focus on implementation and manual verification via `npm run build`.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260315000001_create_schedule_tables.sql` | DB migration: 3 tables, RLS, indexes, constraints |
| `src/lib/scheduleService.ts` | CRUD for schedule_days, schedule_phases, schedule_entries |
| `src/components/schedule/hooks/useScheduleData.ts` | React Query data fetching |
| `src/components/schedule/hooks/useScheduleActions.ts` | React Query mutations |
| `src/components/schedule/ScheduleView.tsx` | Orchestrator: state, dialogs, data wiring |
| `src/components/schedule/ScheduleHeader.tsx` | Title bar + action buttons |
| `src/components/schedule/ScheduleDayAccordion.tsx` | Collapsible day with phase list |
| `src/components/schedule/SchedulePhaseSection.tsx` | Collapsible phase with entry table |
| `src/components/schedule/ScheduleEntryTable.tsx` | Desktop table for entries |
| `src/components/schedule/ScheduleEntryRow.tsx` | Single table row (desktop) |
| `src/components/schedule/ScheduleEntryCard.tsx` | Card layout (mobile) |
| `src/components/schedule/dialogs/ScheduleDayDialog.tsx` | Add/edit day |
| `src/components/schedule/dialogs/SchedulePhaseDialog.tsx` | Add/edit phase |
| `src/components/schedule/dialogs/ScheduleEntryDialog.tsx` | Add/edit entry |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/FestivalResults.tsx` | Add third tab "Ablaufplan" (desktop + mobile) |
| `src/lib/festivalService.ts` | Add cascade deletion for schedule tables in `deleteFestival()` |

---

## Chunk 1: Database & Service Layer

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260315000001_create_schedule_tables.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Create schedule tables for festival timeline planning

-- 1. Schedule Days
CREATE TABLE IF NOT EXISTS schedule_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  label TEXT,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(festival_id, date)
);

ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule days"
  ON schedule_days
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_schedule_days_festival_id ON schedule_days(festival_id);

-- 2. Schedule Phases
CREATE TABLE IF NOT EXISTS schedule_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_day_id UUID NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedule_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule phases"
  ON schedule_phases
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_schedule_phases_schedule_day_id ON schedule_phases(schedule_day_id);
CREATE INDEX idx_schedule_phases_festival_id ON schedule_phases(festival_id);

-- 3. Schedule Entries
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_phase_id UUID NOT NULL REFERENCES schedule_phases(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'program')),
  start_time TIME,
  end_time TIME,
  responsible_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('open', 'done') OR status IS NULL),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule entries"
  ON schedule_entries
  FOR ALL
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_schedule_entries_schedule_phase_id ON schedule_entries(schedule_phase_id);
CREATE INDEX idx_schedule_entries_festival_id ON schedule_entries(festival_id);
CREATE INDEX idx_schedule_entries_responsible_member_id ON schedule_entries(responsible_member_id);
```

- [ ] **Step 2: Run migration against Supabase**

Run the migration SQL in the Supabase SQL editor or via CLI.

---

### Task 2: Service Layer

**Files:**
- Create: `src/lib/scheduleService.ts`

- [ ] **Step 1: Create interfaces**

```typescript
import { supabase } from '@/integrations/supabase/client';

// Types
export interface ScheduleDay {
  id: string;
  festival_id: string;
  date: string;
  label: string | null;
  is_auto_generated: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SchedulePhase {
  id: string;
  schedule_day_id: string;
  festival_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  id: string;
  schedule_phase_id: string;
  festival_id: string;
  title: string;
  type: 'task' | 'program';
  start_time: string | null;
  end_time: string | null;
  responsible_member_id: string | null;
  status: 'open' | 'done' | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntryWithMember extends ScheduleEntry {
  responsible_member?: { id: string; first_name: string; last_name: string } | null;
}

export interface SchedulePhaseWithEntries extends SchedulePhase {
  entries: ScheduleEntryWithMember[];
}

export interface ScheduleDayWithPhases extends ScheduleDay {
  phases: SchedulePhaseWithEntries[];
}
```

- [ ] **Step 2: Create `getScheduleDays` with nested select**

```typescript
export const getScheduleDays = async (festivalId: string): Promise<ScheduleDayWithPhases[]> => {
  const { data, error } = await (supabase as any)
    .from('schedule_days')
    .select('*, phases:schedule_phases(*, entries:schedule_entries(*, responsible_member:members(id, first_name, last_name)))')
    .eq('festival_id', festivalId)
    .order('sort_order')
    .order('sort_order', { foreignTable: 'schedule_phases' })
    .order('sort_order', { foreignTable: 'schedule_phases.schedule_entries' });

  if (error) throw error;
  return data || [];
};
```

- [ ] **Step 3: Create `initializeScheduleDays`**

```typescript
export const initializeScheduleDays = async (
  festivalId: string,
  startDate: string,
  endDate?: string
): Promise<void> => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const days: { festival_id: string; date: string; label: string; is_auto_generated: boolean; sort_order: number }[] = [];

  const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  let sortOrder = 0;
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    days.push({
      festival_id: festivalId,
      date: dateStr,
      label: weekdayNames[current.getDay()],
      is_auto_generated: true,
      sort_order: sortOrder++,
    });
    current.setDate(current.getDate() + 1);
  }

  if (days.length === 0) return;

  // Use upsert with ON CONFLICT DO NOTHING pattern
  const { error } = await (supabase as any)
    .from('schedule_days')
    .upsert(days, { onConflict: 'festival_id,date', ignoreDuplicates: true });

  if (error) throw error;
};
```

- [ ] **Step 4: Create Day CRUD**

```typescript
export const createScheduleDay = async (
  data: Omit<ScheduleDay, 'id' | 'created_at' | 'updated_at'>
): Promise<ScheduleDay> => {
  const { data: result, error } = await (supabase as any)
    .from('schedule_days')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
};

export const updateScheduleDay = async (
  id: string,
  updates: Partial<ScheduleDay>
): Promise<ScheduleDay> => {
  const { data, error } = await (supabase as any)
    .from('schedule_days')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteScheduleDay = async (id: string): Promise<void> => {
  const { error } = await (supabase as any)
    .from('schedule_days')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
```

- [ ] **Step 5: Create Phase CRUD**

```typescript
export const createSchedulePhase = async (
  data: Omit<SchedulePhase, 'id' | 'created_at' | 'updated_at'>
): Promise<SchedulePhase> => {
  const { data: result, error } = await (supabase as any)
    .from('schedule_phases')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
};

export const updateSchedulePhase = async (
  id: string,
  updates: Partial<SchedulePhase>
): Promise<SchedulePhase> => {
  const { data, error } = await (supabase as any)
    .from('schedule_phases')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteSchedulePhase = async (id: string): Promise<void> => {
  const { error } = await (supabase as any)
    .from('schedule_phases')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
```

- [ ] **Step 6: Create Entry CRUD + reorder**

```typescript
export const createScheduleEntry = async (
  data: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<ScheduleEntry> => {
  const { data: result, error } = await (supabase as any)
    .from('schedule_entries')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
};

export const updateScheduleEntry = async (
  id: string,
  updates: Partial<ScheduleEntry>
): Promise<ScheduleEntry> => {
  const { data, error } = await (supabase as any)
    .from('schedule_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteScheduleEntry = async (id: string): Promise<void> => {
  const { error } = await (supabase as any)
    .from('schedule_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const reorderScheduleEntries = async (
  entries: { id: string; sort_order: number }[]
): Promise<void> => {
  for (const entry of entries) {
    const { error } = await (supabase as any)
      .from('schedule_entries')
      .update({ sort_order: entry.sort_order, updated_at: new Date().toISOString() })
      .eq('id', entry.id);
    if (error) throw error;
  }
};
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

---

### Task 3: Update Festival Cascade Deletion

**Files:**
- Modify: `src/lib/festivalService.ts:88-146`

- [ ] **Step 1: Add schedule table deletions before existing deletions**

Insert the following BEFORE the existing shift_assignments deletion (after line 89), using `(supabase as any)`:

```typescript
	// Delete schedule data
	const { error: scheduleEntryError } = await (supabase as any)
		.from('schedule_entries')
		.delete()
		.eq('festival_id', festivalId);

	if (scheduleEntryError) {
		throw new Error('Fehler beim Löschen der Ablaufplan-Einträge');
	}

	const { error: schedulePhaseError } = await (supabase as any)
		.from('schedule_phases')
		.delete()
		.eq('festival_id', festivalId);

	if (schedulePhaseError) {
		throw new Error('Fehler beim Löschen der Ablaufplan-Phasen');
	}

	const { error: scheduleDayError } = await (supabase as any)
		.from('schedule_days')
		.delete()
		.eq('festival_id', festivalId);

	if (scheduleDayError) {
		throw new Error('Fehler beim Löschen der Ablaufplan-Tage');
	}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

## Chunk 2: React Query Hooks

### Task 4: Data Hook

**Files:**
- Create: `src/components/schedule/hooks/useScheduleData.ts`

- [ ] **Step 1: Create useScheduleData hook**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getScheduleDays } from '@/lib/scheduleService';
import { getMembers } from '@/lib/memberService';

export function useScheduleData(festivalId: string) {
  const queryClient = useQueryClient();

  const daysQuery = useQuery({
    queryKey: ['scheduleDays', festivalId],
    queryFn: () => getScheduleDays(festivalId),
  });

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduleDays', festivalId] });
  };

  return {
    days: daysQuery.data || [],
    members: membersQuery.data || [],
    isLoading: daysQuery.isLoading || membersQuery.isLoading,
    refetchAll,
  };
}
```

---

### Task 5: Actions Hook

**Files:**
- Create: `src/components/schedule/hooks/useScheduleActions.ts`

- [ ] **Step 1: Create useScheduleActions hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createScheduleDay,
  updateScheduleDay,
  deleteScheduleDay,
  createSchedulePhase,
  updateSchedulePhase,
  deleteSchedulePhase,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  initializeScheduleDays,
  type ScheduleDay,
  type SchedulePhase,
  type ScheduleEntry,
} from '@/lib/scheduleService';

export function useScheduleActions(festivalId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduleDays', festivalId] });
  };

  // Day mutations
  const createDay = useMutation({
    mutationFn: (data: Omit<ScheduleDay, 'id' | 'created_at' | 'updated_at'>) => createScheduleDay(data),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Tag wurde hinzugefügt.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Tag konnte nicht hinzugefügt werden.', variant: 'destructive' }); },
  });

  const editDay = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleDay> }) => updateScheduleDay(id, updates),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Tag wurde aktualisiert.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Tag konnte nicht aktualisiert werden.', variant: 'destructive' }); },
  });

  const removeDay = useMutation({
    mutationFn: (id: string) => deleteScheduleDay(id),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Tag wurde gelöscht.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Tag konnte nicht gelöscht werden.', variant: 'destructive' }); },
  });

  // Phase mutations
  const createPhase = useMutation({
    mutationFn: (data: Omit<SchedulePhase, 'id' | 'created_at' | 'updated_at'>) => createSchedulePhase(data),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Phase wurde hinzugefügt.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Phase konnte nicht hinzugefügt werden.', variant: 'destructive' }); },
  });

  const editPhase = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SchedulePhase> }) => updateSchedulePhase(id, updates),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Phase wurde aktualisiert.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Phase konnte nicht aktualisiert werden.', variant: 'destructive' }); },
  });

  const removePhase = useMutation({
    mutationFn: (id: string) => deleteSchedulePhase(id),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Phase wurde gelöscht.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Phase konnte nicht gelöscht werden.', variant: 'destructive' }); },
  });

  // Entry mutations
  const createEntry = useMutation({
    mutationFn: (data: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>) => createScheduleEntry(data),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Eintrag wurde hinzugefügt.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Eintrag konnte nicht hinzugefügt werden.', variant: 'destructive' }); },
  });

  const editEntry = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleEntry> }) => updateScheduleEntry(id, updates),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Eintrag wurde aktualisiert.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Eintrag konnte nicht aktualisiert werden.', variant: 'destructive' }); },
  });

  const removeEntry = useMutation({
    mutationFn: (id: string) => deleteScheduleEntry(id),
    onSuccess: () => { invalidateAll(); toast({ title: 'Erfolg', description: 'Eintrag wurde gelöscht.' }); },
    onError: () => { toast({ title: 'Fehler', description: 'Eintrag konnte nicht gelöscht werden.', variant: 'destructive' }); },
  });

  // Initialize days from festival dates
  const initDays = useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate?: string }) =>
      initializeScheduleDays(festivalId, startDate, endDate),
    onSuccess: () => { invalidateAll(); },
    onError: () => { toast({ title: 'Fehler', description: 'Tage konnten nicht generiert werden.', variant: 'destructive' }); },
  });

  return {
    createDay, editDay, removeDay,
    createPhase, editPhase, removePhase,
    createEntry, editEntry, removeEntry,
    initDays,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

## Chunk 3: Dialogs

### Task 6: Day Dialog

**Files:**
- Create: `src/components/schedule/dialogs/ScheduleDayDialog.tsx`

- [ ] **Step 1: Create dialog**

Props: `{ open, onOpenChange, day?: ScheduleDayWithPhases | null, festivalId, onSave }`

Form fields:
- `date` — Date input (required)
- `label` — Text input (optional, e.g. "Aufbautag")

Pattern: Same as MaterialDialog — useState for form, useEffect to populate on edit, simple validation (date required). Title: "Tag hinzufügen" / "Tag bearbeiten". Button: "Hinzufügen" / "Aktualisieren".

The `onSave` callback receives: `{ festival_id, date, label, is_auto_generated: false, sort_order }`.

---

### Task 7: Phase Dialog

**Files:**
- Create: `src/components/schedule/dialogs/SchedulePhaseDialog.tsx`

- [ ] **Step 1: Create dialog**

Props: `{ open, onOpenChange, phase?: SchedulePhaseWithEntries | null, scheduleDayId, festivalId, onSave }`

Form fields:
- `name` — Text input (required, e.g. "Aufbau", "Abendprogramm")

Pattern: Same as MaterialDialog. Title: "Phase hinzufügen" / "Phase bearbeiten". Button: "Hinzufügen" / "Aktualisieren".

The `onSave` callback receives: `{ schedule_day_id, festival_id, name, sort_order }`.

---

### Task 8: Entry Dialog

**Files:**
- Create: `src/components/schedule/dialogs/ScheduleEntryDialog.tsx`

- [ ] **Step 1: Create dialog**

Props: `{ open, onOpenChange, entry?: ScheduleEntryWithMember | null, schedulePhaseId, festivalId, members, onSave }`

Form fields:
- `title` — Text input (required)
- `type` — Select: "Aufgabe" / "Programmpunkt" (default: "task")
- `start_time` — Time input (optional)
- `end_time` — Time input (optional)
- `responsible_member_id` — Select from members list (optional, with "__none__" sentinel)
- `description` — Textarea (optional)

Validation:
- `title` required
- If both `start_time` and `end_time` are set, `start_time` must be before `end_time`
- `status` is auto-set: if type='task' → 'open', if type='program' → null

Title: "Eintrag hinzufügen" / "Eintrag bearbeiten". Button: "Hinzufügen" / "Aktualisieren".

Grid layout: Title full width. Type + times in 2-col grid. Member select full width. Description full width.

The `onSave` callback receives the full `Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

## Chunk 4: UI Components

### Task 9: Entry Row (Desktop) & Entry Card (Mobile)

**Files:**
- Create: `src/components/schedule/ScheduleEntryRow.tsx`
- Create: `src/components/schedule/ScheduleEntryCard.tsx`

- [ ] **Step 1: Create ScheduleEntryRow**

Props: `{ entry: ScheduleEntryWithMember, onEdit, onDelete, onToggleStatus }`

Table row with cells:
1. **Zeit** — `start_time` formatted as HH:MM, or "—" if null. If end_time also set: "HH:MM – HH:MM"
2. **Typ** — Badge: green "Aufgabe" or purple "Programm"
3. **Eintrag** — Title text, truncated. If description exists, show small info icon
4. **Verantwortlich** — "Nachname Vorname" (memory: always Lastname Firstname), or "—"
5. **Status** — Checkbox for tasks (toggling calls `onToggleStatus`), "—" for program

Row actions: Edit (Pencil icon) and Delete (Trash icon) buttons, small, ghost variant.

- [ ] **Step 2: Create ScheduleEntryCard**

Props: same as ScheduleEntryRow.

Card layout for mobile with:
- Top line: Type badge + time (if set)
- Title (bold)
- Bottom line: Responsible member (if set) + status checkbox (if task)
- Edit/Delete as icon buttons

---

### Task 10: Entry Table

**Files:**
- Create: `src/components/schedule/ScheduleEntryTable.tsx`

- [ ] **Step 1: Create table component**

Props: `{ entries: ScheduleEntryWithMember[], onEdit, onDelete, onToggleStatus, onAddEntry, isMobile }`

Desktop: HTML table with thead (Zeit, Typ, Eintrag, Verantwortlich, Status, Aktionen) and tbody mapping entries to ScheduleEntryRow.

Mobile: Div list mapping entries to ScheduleEntryCard.

Empty state: "Ersten Eintrag hinzufügen" button (centered, muted text + outline button).

At the bottom: "+ Eintrag" button (small, ghost variant with Plus icon).

---

### Task 11: Phase Section

**Files:**
- Create: `src/components/schedule/SchedulePhaseSection.tsx`

- [ ] **Step 1: Create collapsible phase component**

Props: `{ phase: SchedulePhaseWithEntries, onEditPhase, onDeletePhase, onEditEntry, onDeleteEntry, onToggleEntryStatus, onAddEntry, isMobile }`

Uses shadcn Collapsible (from Radix):
- **Header:** Clickable row with collapse arrow + phase name + progress badge (e.g. "2/5 erledigt", only if phase has tasks) + Edit/Delete buttons (small, ghost)
- **Content:** ScheduleEntryTable with the phase's entries

Progress calculation: Count entries where type='task' and status='done' vs total tasks.

---

### Task 12: Day Accordion

**Files:**
- Create: `src/components/schedule/ScheduleDayAccordion.tsx`

- [ ] **Step 1: Create collapsible day component**

Props: `{ day: ScheduleDayWithPhases, onEditDay, onDeleteDay, onEditPhase, onDeletePhase, onAddPhase, onEditEntry, onDeleteEntry, onToggleEntryStatus, onAddEntry, isMobile, defaultOpen?: boolean }`

Uses shadcn Collapsible:
- **Header:** Clickable row with collapse arrow + formatted date (e.g. "Freitag, 15. August 2026") + label (if set) + summary badge (e.g. "3 Phasen · 9 Einträge") + Edit/Delete buttons
- **Content:** List of SchedulePhaseSection components + "+ Phase hinzufügen" button at the bottom

Date formatting: Use `toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })`.

Empty state (no phases): "Phase hinzufügen, um mit der Planung zu beginnen" with button.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

---

## Chunk 5: Orchestrator & Tab Integration

### Task 13: Schedule Header

**Files:**
- Create: `src/components/schedule/ScheduleHeader.tsx`

- [ ] **Step 1: Create header**

Props: `{ onAddDay: () => void }`

Simple header with responsive layout (like MaterialListHeader):
- "+" Tag hinzufügen button

---

### Task 14: Schedule View (Orchestrator)

**Files:**
- Create: `src/components/schedule/ScheduleView.tsx`

- [ ] **Step 1: Create orchestrator component**

Props: `{ festivalId: string; festivalStartDate?: string; festivalEndDate?: string }`

**Dialog State (discriminated union):**
```typescript
type DialogState =
  | { type: null }
  | { type: 'day'; day?: ScheduleDayWithPhases }
  | { type: 'phase'; phase?: SchedulePhaseWithEntries; scheduleDayId: string }
  | { type: 'entry'; entry?: ScheduleEntryWithMember; schedulePhaseId: string };
```

**Auto-initialization logic:**
```typescript
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  if (!initialized && !isLoading && days.length === 0 && festivalStartDate) {
    actions.initDays.mutate(
      { startDate: festivalStartDate, endDate: festivalEndDate },
      { onSuccess: () => setInitialized(true) }
    );
  } else {
    setInitialized(true);
  }
}, [isLoading, days.length, festivalStartDate]);
```

**Sort order calculation for new entries:**
```typescript
const calculateSortOrder = (entries: ScheduleEntryWithMember[], startTime: string | null): number => {
  if (!startTime || entries.length === 0) {
    return entries.length > 0 ? Math.max(...entries.map(e => e.sort_order)) + 1 : 0;
  }
  // Find position based on time
  const timeMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i].start_time) continue;
    const entryMinutes = parseInt(entries[i].start_time!.split(':')[0]) * 60 + parseInt(entries[i].start_time!.split(':')[1]);
    if (timeMinutes < entryMinutes) return entries[i].sort_order;
  }
  return entries.length > 0 ? Math.max(...entries.map(e => e.sort_order)) + 1 : 0;
};
```

**Handler functions:**
- `handleSaveDay` — create or update day
- `handleSavePhase` — create or update phase (sort_order = existing phases count)
- `handleSaveEntry` — create or update entry (sort_order calculated from time)
- `handleDeleteDay/Phase/Entry` — call respective remove mutations
- `handleToggleEntryStatus` — toggle between 'open' and 'done'

**Loading state:** Skeleton animation (pulsing rectangles).

**Empty state (no festival date):** "Bitte zuerst Start- und Enddatum des Festes festlegen."

**Render:** ScheduleHeader + list of ScheduleDayAccordion (first day defaultOpen) + Dialogs.

---

### Task 15: Tab Integration

**Files:**
- Modify: `src/pages/FestivalResults.tsx`

- [ ] **Step 1: Add imports**

Add to imports:
```typescript
import ScheduleView from '@/components/schedule/ScheduleView';
import { CalendarClock } from 'lucide-react';
```

- [ ] **Step 2: Add desktop tab trigger**

After the "Materialliste" TabsTrigger (line 118), add:
```tsx
<TabsTrigger value="schedule" className="gap-2">
  <CalendarClock className="h-4 w-4" />
  Ablaufplan
</TabsTrigger>
```

- [ ] **Step 3: Add tab content**

After the "materials" TabsContent (line 134), add:
```tsx
<TabsContent value="schedule" className={isMobile ? 'mt-0' : 'mt-0'}>
  <ScheduleView
    festivalId={festivalId}
    festivalStartDate={festival.start_date}
    festivalEndDate={festival.end_date}
  />
</TabsContent>
```

- [ ] **Step 4: Add mobile tab trigger**

After the "Materialliste" mobile TabsTrigger (around line 152), add:
```tsx
<TabsTrigger
  value="schedule"
  className="flex-1 h-full rounded-none gap-1.5 flex-col text-[11px] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
  <CalendarClock className="h-5 w-5" />
  Ablaufplan
</TabsTrigger>
```

- [ ] **Step 5: Final build verification**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`
- Navigate to a festival detail page
- Verify the "Ablaufplan" tab appears (desktop and mobile)
- Verify auto-generated days appear
- Test: Add a phase to a day
- Test: Add an entry (task + program) to a phase
- Test: Toggle task status
- Test: Edit and delete entries/phases/days
