# Festival aus Vorlage erstellen — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "copy from existing festival" option to the festival creation wizard, allowing users to selectively copy stations, shifts, assignments, and materials.

**Architecture:** Two-step wizard (step 1: basic data + optional template selection, step 2: configure what to copy). Copy logic lives in `festivalService.ts` as a single orchestrating function. Bulk insert helpers added to `shiftService.ts`.

**Tech Stack:** React 18, TypeScript, Supabase, shadcn-ui (Checkbox, RadioGroup, Select, Label, Button, Card)

**Spec:** `docs/superpowers/specs/2026-03-12-festival-template-copy-design.md`

---

## File Structure

| File | Role |
|---|---|
| `src/lib/festivalCopyService.ts` | **New** — `copyFestivalData()` orchestrator + `CopyFestivalOptions` type |
| `src/lib/shiftService.ts` | **Modify** — add `createStationsBulk`, `createStationShiftsBulk` |
| `src/components/FestivalWizard.tsx` | **Modify** — add step state, template dropdown, step navigation |
| `src/components/festival-wizard/TemplateSelectionStep.tsx` | **New** — step 2 UI with station/material selection |

---

## Task 1: Add bulk insert helpers to shiftService.ts

**Files:**
- Modify: `src/lib/shiftService.ts`

- [ ] **Step 1: Add `createStationsBulk` function**

Add at the end of `shiftService.ts`, before exports (following existing patterns — `Omit<Station, 'id' | 'created_at' | 'updated_at'>` as input, returns `Station[]`):

```typescript
export async function createStationsBulk(
  stations: Omit<Station, 'id' | 'created_at' | 'updated_at' | 'responsible_member'>[]
): Promise<Station[]> {
  const { data, error } = await supabase
    .from('stations')
    .insert(stations)
    .select('*, responsible_member:members!stations_responsible_member_id_fkey(id, first_name, last_name)');
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Add `createStationShiftsBulk` function**

```typescript
export async function createStationShiftsBulk(
  shifts: Omit<StationShift, 'id' | 'created_at' | 'updated_at'>[]
): Promise<StationShift[]> {
  // Filter out empty end_date values (same pattern as createStationShift)
  const cleaned = shifts.map(s => {
    const copy = { ...s };
    if (!copy.end_date) delete (copy as any).end_date;
    return copy;
  });
  const { data, error } = await supabase
    .from('station_shifts')
    .insert(cleaned)
    .select();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shiftService.ts
git commit -m "feat: add bulk insert helpers for stations and station shifts"
```

---

## Task 2: Create festivalCopyService.ts

**Files:**
- Create: `src/lib/festivalCopyService.ts`

- [ ] **Step 1: Create the copy service file**

```typescript
import { getStations, getStationShifts, getStationMembers, getShiftAssignments,
  createStationsBulk, createStationShiftsBulk, assignMemberToStation, assignMemberToStationShift
} from '@/lib/shiftService';
import { getMaterials, createMaterialsBulk } from '@/lib/materialService';
import { supabase } from '@/integrations/supabase/client';
import type { Station, StationShift } from '@/lib/shiftService';

export interface CopyFestivalOptions {
  stationIds: string[];
  copyAssignments: boolean;
  materialIds: string[];
  materialQuantitySource: 'ordered' | 'actual';
  sourceFestivalStartDate: string;
  targetFestivalStartDate: string;
}

function computeDateOffset(sourceStart: string, shiftDate: string, targetStart: string): string {
  const source = new Date(sourceStart);
  const shift = new Date(shiftDate);
  const target = new Date(targetStart);
  const offsetMs = shift.getTime() - source.getTime();
  const result = new Date(target.getTime() + offsetMs);
  return result.toISOString().split('T')[0];
}

export async function copyFestivalData(
  sourceFestivalId: string,
  targetFestivalId: string,
  options: CopyFestivalOptions
): Promise<void> {
  const stationIdMap: Record<string, string> = {};
  const shiftIdMap: Record<string, string> = {};

  // Step 1: Copy stations
  if (options.stationIds.length > 0) {
    const allStations = await getStations(sourceFestivalId);
    const selectedStations = allStations.filter(s => options.stationIds.includes(s.id));

    const stationsToInsert = selectedStations.map(s => ({
      festival_id: targetFestivalId,
      name: s.name,
      description: s.description || undefined,
      required_people: s.required_people,
      responsible_member_id: options.copyAssignments ? (s.responsible_member_id || undefined) : undefined,
    }));

    const created = await createStationsBulk(stationsToInsert);
    selectedStations.forEach((old, i) => {
      stationIdMap[old.id] = created[i].id;
    });

    // Step 2: Copy shifts for selected stations
    const allShifts = await getStationShifts(sourceFestivalId);
    const selectedShifts = allShifts.filter(s => stationIdMap[s.station_id]);

    if (selectedShifts.length > 0) {
      const shiftsToInsert = selectedShifts.map(s => ({
        festival_id: targetFestivalId,
        station_id: stationIdMap[s.station_id],
        name: s.name,
        start_date: computeDateOffset(options.sourceFestivalStartDate, s.start_date, options.targetFestivalStartDate),
        end_date: s.end_date
          ? computeDateOffset(options.sourceFestivalStartDate, s.end_date, options.targetFestivalStartDate)
          : undefined,
        start_time: s.start_time,
        end_time: s.end_time,
        required_people: s.required_people,
      }));

      const createdShifts = await createStationShiftsBulk(shiftsToInsert);
      selectedShifts.forEach((old, i) => {
        shiftIdMap[old.id] = createdShifts[i].id;
      });
    }

    // Step 3: Copy assignments if requested
    if (options.copyAssignments) {
      // Verify which members still exist
      const { data: existingMembers } = await supabase
        .from('members')
        .select('id');
      const existingMemberIds = new Set((existingMembers || []).map(m => m.id));

      // Station members
      const allStationMembers = await getStationMembers(sourceFestivalId);
      const selectedStationMembers = allStationMembers.filter(
        sm => stationIdMap[sm.station_id] && existingMemberIds.has(sm.member_id)
      );
      for (const sm of selectedStationMembers) {
        await assignMemberToStation(targetFestivalId, stationIdMap[sm.station_id], sm.member_id);
      }

      // Shift assignments
      const allAssignments = await getShiftAssignments(sourceFestivalId);
      const selectedAssignments = allAssignments.filter(
        a => a.member_id && shiftIdMap[a.station_shift_id] && existingMemberIds.has(a.member_id)
      );
      for (const a of selectedAssignments) {
        await assignMemberToStationShift(
          targetFestivalId,
          shiftIdMap[a.station_shift_id],
          a.member_id!,
          a.position
        );
      }
    }
  }

  // Step 4: Copy materials
  if (options.materialIds.length > 0) {
    const allMaterials = await getMaterials(sourceFestivalId);
    const selectedMaterials = allMaterials.filter(m => options.materialIds.includes(m.id));

    const materialsToInsert = selectedMaterials.map(m => ({
      festival_id: targetFestivalId,
      name: m.name,
      category: m.category,
      supplier: m.supplier,
      unit: m.unit,
      packaging_unit: m.packaging_unit,
      amount_per_packaging: m.amount_per_packaging,
      ordered_quantity: options.materialQuantitySource === 'actual'
        ? (m.actual_quantity ?? 0)
        : (m.ordered_quantity ?? 0),
      actual_quantity: null,
      unit_price: m.unit_price,
      notes: m.notes,
      station_id: m.station_id && stationIdMap[m.station_id]
        ? stationIdMap[m.station_id]
        : null,
    }));

    await createMaterialsBulk(materialsToInsert);
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/festivalCopyService.ts
git commit -m "feat: add festival copy service with station, shift, assignment, material copying"
```

---

## Task 3: Create TemplateSelectionStep component

**Files:**
- Create: `src/components/festival-wizard/TemplateSelectionStep.tsx`

This is the step 2 UI. It receives the source festival data (stations, shifts, materials) and lets the user configure what to copy. It manages selection state internally and calls back with the final options.

- [ ] **Step 1: Create the component**

```typescript
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import type { Station, StationShift } from '@/lib/shiftService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { CopyFestivalOptions } from '@/lib/festivalCopyService';

interface TemplateSelectionStepProps {
  stations: Station[];
  shifts: StationShift[];
  materials: FestivalMaterialWithStation[];
  sourceFestivalStartDate: string;
  targetFestivalStartDate: string;
  loading: boolean;
  onBack: () => void;
  onSubmit: (options: Omit<CopyFestivalOptions, 'sourceFestivalStartDate' | 'targetFestivalStartDate'>) => void;
}

export default function TemplateSelectionStep({
  stations, shifts, materials, sourceFestivalStartDate, targetFestivalStartDate,
  loading, onBack, onSubmit,
}: TemplateSelectionStepProps) {
  // Station selection
  const [selectedStationIds, setSelectedStationIds] = useState<Set<string>>(new Set(stations.map(s => s.id)));
  const [copyAssignments, setCopyAssignments] = useState(false);

  // Material selection
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set(materials.map(m => m.id)));
  const [quantitySource, setQuantitySource] = useState<'ordered' | 'actual'>('ordered');

  // Derived group data for materials
  const categories = useMemo(() => [...new Set(materials.map(m => m.category).filter(Boolean))], [materials]);
  const suppliers = useMemo(() => [...new Set(materials.map(m => m.supplier).filter(Boolean))], [materials]);
  const materialStations = useMemo(() => {
    const names = [...new Set(materials.filter(m => m.station).map(m => m.station!.name))];
    return names;
  }, [materials]);

  // Station toggles
  const allStationsSelected = stations.length > 0 && selectedStationIds.size === stations.length;
  const noStationsSelected = selectedStationIds.size === 0;

  const toggleAllStations = () => {
    if (allStationsSelected) {
      setSelectedStationIds(new Set());
    } else {
      setSelectedStationIds(new Set(stations.map(s => s.id)));
    }
  };

  const toggleStation = (id: string) => {
    const next = new Set(selectedStationIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedStationIds(next);
  };

  // Material toggles
  const allMaterialsSelected = materials.length > 0 && selectedMaterialIds.size === materials.length;

  const toggleAllMaterials = () => {
    if (allMaterialsSelected) {
      setSelectedMaterialIds(new Set());
    } else {
      setSelectedMaterialIds(new Set(materials.map(m => m.id)));
    }
  };

  const toggleMaterial = (id: string) => {
    const next = new Set(selectedMaterialIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMaterialIds(next);
  };

  // Group toggles for materials
  const toggleGroup = (filterFn: (m: FestivalMaterialWithStation) => boolean) => {
    const groupIds = materials.filter(filterFn).map(m => m.id);
    const allSelected = groupIds.every(id => selectedMaterialIds.has(id));
    const next = new Set(selectedMaterialIds);
    if (allSelected) {
      groupIds.forEach(id => next.delete(id));
    } else {
      groupIds.forEach(id => next.add(id));
    }
    setSelectedMaterialIds(next);
  };

  const getGroupState = (filterFn: (m: FestivalMaterialWithStation) => boolean): boolean | 'indeterminate' => {
    const groupIds = materials.filter(filterFn).map(m => m.id);
    const selectedCount = groupIds.filter(id => selectedMaterialIds.has(id)).length;
    if (selectedCount === 0) return false;
    if (selectedCount === groupIds.length) return true;
    return 'indeterminate';
  };

  const handleSubmit = () => {
    onSubmit({
      stationIds: [...selectedStationIds],
      copyAssignments,
      materialIds: [...selectedMaterialIds],
      materialQuantitySource: quantitySource,
    });
  };

  const shiftsPerStation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of shifts) {
      map[s.station_id] = (map[s.station_id] || 0) + 1;
    }
    return map;
  }, [shifts]);

  return (
    <div className="space-y-6">
      {/* Stations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Stationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Stationen vorhanden</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-stations"
                  checked={allStationsSelected ? true : noStationsSelected ? false : 'indeterminate'}
                  onCheckedChange={toggleAllStations}
                />
                <Label htmlFor="all-stations" className="text-sm font-medium">Alle Stationen</Label>
              </div>
              <div className="border rounded-md divide-y max-h-[240px] overflow-y-auto">
                {stations.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                    <Checkbox
                      checked={selectedStationIds.has(s.id)}
                      onCheckedChange={() => toggleStation(s.id)}
                    />
                    <span className="text-sm flex-1">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.required_people} Pers. · {shiftsPerStation[s.id] || 0} Schichten
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="copy-assignments"
                  checked={copyAssignments}
                  onCheckedChange={(v) => setCopyAssignments(!!v)}
                />
                <Label htmlFor="copy-assignments" className="text-sm">Zuweisungen übernehmen</Label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Materialien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Materialien vorhanden</p>
          ) : (
            <>
              {/* Quantity source */}
              <RadioGroup value={quantitySource} onValueChange={(v) => setQuantitySource(v as 'ordered' | 'actual')}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ordered" id="qty-ordered" />
                    <Label htmlFor="qty-ordered" className="text-sm">Bestellmenge</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="actual" id="qty-actual" />
                    <Label htmlFor="qty-actual" className="text-sm">Tatsächliche Menge</Label>
                  </div>
                </div>
              </RadioGroup>

              {/* Group toggles */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gruppen</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={`cat-${cat}`}
                      type="button"
                      onClick={() => toggleGroup(m => m.category === cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        getGroupState(m => m.category === cat) === true
                          ? 'bg-primary text-primary-foreground border-primary'
                          : getGroupState(m => m.category === cat) === 'indeterminate'
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}>
                      {cat}
                    </button>
                  ))}
                  {suppliers.map(sup => (
                    <button
                      key={`sup-${sup}`}
                      type="button"
                      onClick={() => toggleGroup(m => m.supplier === sup)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        getGroupState(m => m.supplier === sup) === true
                          ? 'bg-primary text-primary-foreground border-primary'
                          : getGroupState(m => m.supplier === sup) === 'indeterminate'
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}>
                      {sup}
                    </button>
                  ))}
                  {materialStations.map(st => (
                    <button
                      key={`st-${st}`}
                      type="button"
                      onClick={() => toggleGroup(m => m.station?.name === st)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        getGroupState(m => m.station?.name === st) === true
                          ? 'bg-primary text-primary-foreground border-primary'
                          : getGroupState(m => m.station?.name === st) === 'indeterminate'
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}>
                      {st}
                    </button>
                  ))}
                  {materials.some(m => !m.station_id) && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(m => !m.station_id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        getGroupState(m => !m.station_id) === true
                          ? 'bg-primary text-primary-foreground border-primary'
                          : getGroupState(m => !m.station_id) === 'indeterminate'
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}>
                      Ohne Station
                    </button>
                  )}
                </div>
              </div>

              {/* All/None + material list */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-materials"
                  checked={allMaterialsSelected ? true : selectedMaterialIds.size === 0 ? false : 'indeterminate'}
                  onCheckedChange={toggleAllMaterials}
                />
                <Label htmlFor="all-materials" className="text-sm font-medium">Alle Materialien</Label>
                <span className="text-xs text-muted-foreground ml-auto">
                  {selectedMaterialIds.size}/{materials.length} gewählt
                </span>
              </div>
              <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                {materials.map(m => (
                  <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                    <Checkbox
                      checked={selectedMaterialIds.has(m.id)}
                      onCheckedChange={() => toggleMaterial(m.id)}
                    />
                    <span className="text-sm flex-1 truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {m.category || '–'}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {quantitySource === 'actual' ? (m.actual_quantity ?? 0) : m.ordered_quantity} {m.unit}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
          {loading ? 'Erstelle Fest...' : 'Fest erstellen'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (component not yet used, but should compile).

- [ ] **Step 3: Commit**

```bash
git add src/components/festival-wizard/TemplateSelectionStep.tsx
git commit -m "feat: add TemplateSelectionStep component for festival copy wizard"
```

---

## Task 4: Modify FestivalWizard with step logic and template integration

**Files:**
- Modify: `src/components/FestivalWizard.tsx`

- [ ] **Step 1: Rewrite FestivalWizard with two-step flow**

The wizard gets: step state (1 or 2), template festival dropdown, data loading when template is selected, and calls `copyFestivalData` after creating the festival.

See spec section "Wizard Flow" for the full behavior. Key points:
- Step 1: existing fields + template dropdown using `getUserFestivals()`
- Without template: "Fest erstellen" button (same as before)
- With template: "Weiter" button → step 2
- Step 2: `TemplateSelectionStep` component
- On submit: `createFestival()` then `copyFestivalData()` then navigate
- Back button preserves step 2 state; changing template resets step 2

Full replacement of `FestivalWizard.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createFestival, getUserFestivals } from '@/lib/festivalService';
import { getStations, getStationShifts } from '@/lib/shiftService';
import { getMaterials } from '@/lib/materialService';
import { copyFestivalData } from '@/lib/festivalCopyService';
import type { CopyFestivalOptions } from '@/lib/festivalCopyService';
import type { Festival } from '@/lib/festivalService';
import type { Station, StationShift } from '@/lib/shiftService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import TemplateSelectionStep from '@/components/festival-wizard/TemplateSelectionStep';
import { Calendar } from 'lucide-react';

interface FestivalWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function FestivalWizard({ onClose, onComplete }: FestivalWizardProps) {
  const [step, setStep] = useState(1);
  const [festivalName, setFestivalName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Template state
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [templateData, setTemplateData] = useState<{
    stations: Station[];
    shifts: StationShift[];
    materials: FestivalMaterialWithStation[];
  } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Load festivals for dropdown
  useEffect(() => {
    getUserFestivals().then(setFestivals).catch(() => {});
  }, []);

  // Load template data when template changes
  useEffect(() => {
    if (!templateId) {
      setTemplateData(null);
      return;
    }
    setLoadingTemplate(true);
    Promise.all([
      getStations(templateId),
      getStationShifts(templateId),
      getMaterials(templateId),
    ]).then(([stations, shifts, materials]) => {
      setTemplateData({ stations, shifts, materials });
    }).catch(() => {
      toast({ title: 'Fehler beim Laden der Vorlagen-Daten', variant: 'destructive' });
      setTemplateId('');
    }).finally(() => setLoadingTemplate(false));
  }, [templateId, toast]);

  const selectedFestival = festivals.find(f => f.id === templateId);

  const handleStep1Submit = () => {
    if (!festivalName || !startDate) return;
    if (templateId && templateData) {
      setStep(2);
    } else {
      handleCreateFestival();
    }
  };

  const handleCreateFestival = async (copyOptions?: Omit<CopyFestivalOptions, 'sourceFestivalStartDate' | 'targetFestivalStartDate'>) => {
    if (!user || !festivalName || !startDate) return;
    setLoading(true);

    try {
      const festivalId = await createFestival({
        name: festivalName,
        location: '',
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        type: 'kirtag',
        visitorCount: 'medium',
      });

      if (copyOptions && templateId && selectedFestival) {
        await copyFestivalData(templateId, festivalId, {
          ...copyOptions,
          sourceFestivalStartDate: selectedFestival.start_date,
          targetFestivalStartDate: startDate,
        });
      }

      toast({
        title: 'Fest erstellt',
        description: copyOptions
          ? 'Fest wurde aus der Vorlage erstellt.'
          : 'Ihr Fest wurde erfolgreich erstellt.',
      });

      navigate('/festival-results', { state: { festivalId } });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Fest konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (value: string) => {
    setTemplateId(value === 'none' ? '' : value);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Neues Fest erstellen</h1>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
        </div>

        <div className="max-w-lg mx-auto">
          {step === 1 && (
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Neues Fest erstellen
                </CardTitle>
                <CardDescription>Geben Sie den Namen und das Datum Ihres Festes ein</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="festivalName">Name des Festes *</Label>
                    <Input
                      id="festivalName"
                      type="text"
                      placeholder="z.B. Sommerfest 2026"
                      value={festivalName}
                      onChange={(e) => setFestivalName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Startdatum *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Enddatum (optional)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Template dropdown */}
                  {festivals.length > 0 && (
                    <div>
                      <Label>Bestehendes Fest als Vorlage (optional)</Label>
                      <Select value={templateId || 'none'} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Keine Vorlage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keine Vorlage</SelectItem>
                          {festivals.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name || 'Unbenanntes Fest'} ({new Date(f.start_date).toLocaleDateString('de-AT')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleStep1Submit}
                    className="flex-1"
                    disabled={!festivalName || !startDate || loading || loadingTemplate}>
                    {loadingTemplate
                      ? 'Lade Vorlage...'
                      : templateId
                        ? 'Weiter'
                        : loading
                          ? 'Erstelle Fest...'
                          : 'Fest erstellen'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && templateData && (
            <TemplateSelectionStep
              stations={templateData.stations}
              shifts={templateData.shifts}
              materials={templateData.materials}
              sourceFestivalStartDate={selectedFestival?.start_date || ''}
              targetFestivalStartDate={startDate}
              loading={loading}
              onBack={() => setStep(1)}
              onSubmit={(options) => handleCreateFestival(options)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Test:
1. Go to Dashboard → "Neues Fest erstellen"
2. Verify existing flow still works (no template → "Fest erstellen")
3. Select a template → "Weiter" → step 2 loads with stations/materials
4. Toggle stations and materials, use group toggles
5. Click "Fest erstellen" → verify new fest is created with copied data
6. Check the new fest has the correct stations, shifts, and materials

- [ ] **Step 4: Commit**

```bash
git add src/components/FestivalWizard.tsx
git commit -m "feat: integrate template selection into festival wizard with two-step flow"
```
