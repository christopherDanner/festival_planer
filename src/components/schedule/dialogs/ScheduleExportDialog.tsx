import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileDown } from 'lucide-react';
import { exportScheduleToPdf } from '@/lib/scheduleExportService';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';

interface ScheduleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  festivalName: string;
  days: ScheduleDayWithPhases[];
}

export default function ScheduleExportDialog({
  open,
  onOpenChange,
  festivalName,
  days,
}: ScheduleExportDialogProps) {
  const [selectedDayIds, setSelectedDayIds] = useState<Set<string>>(new Set());
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<Set<string>>(new Set());
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'task' | 'program'>('all');

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDayIds(new Set(days.map(d => d.id)));
      setSelectedPhaseIds(new Set(days.flatMap(d => d.phases.map(p => p.id))));
      setEntryTypeFilter('all');
    }
  }, [open, days]);

  const toggleDay = (dayId: string, checked: boolean) => {
    const nextDays = new Set(selectedDayIds);
    const day = days.find(d => d.id === dayId);
    const nextPhases = new Set(selectedPhaseIds);

    if (checked) {
      nextDays.add(dayId);
      // Also check all phases of this day
      if (day) {
        for (const phase of day.phases) {
          nextPhases.add(phase.id);
        }
      }
    } else {
      nextDays.delete(dayId);
      // Also uncheck all phases of this day
      if (day) {
        for (const phase of day.phases) {
          nextPhases.delete(phase.id);
        }
      }
    }

    setSelectedDayIds(nextDays);
    setSelectedPhaseIds(nextPhases);
  };

  const togglePhase = (phaseId: string, checked: boolean) => {
    const next = new Set(selectedPhaseIds);
    if (checked) {
      next.add(phaseId);
    } else {
      next.delete(phaseId);
    }
    setSelectedPhaseIds(next);
  };

  const selectAllDays = () => {
    setSelectedDayIds(new Set(days.map(d => d.id)));
    setSelectedPhaseIds(new Set(days.flatMap(d => d.phases.map(p => p.id))));
  };

  const selectNoDays = () => {
    setSelectedDayIds(new Set());
    setSelectedPhaseIds(new Set());
  };

  const handleExport = () => {
    exportScheduleToPdf({
      festivalName,
      days,
      selectedDayIds,
      selectedPhaseIds,
      entryTypeFilter,
    });
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-AT', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const hasSelection = selectedDayIds.size > 0 && selectedPhaseIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ablaufplan exportieren</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-6 py-2">
          {/* Day & Phase selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Tage & Phasen ausw&auml;hlen</h4>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllDays}>
                  Alle
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectNoDays}>
                  Keine
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {days.map(day => {
                const dayChecked = selectedDayIds.has(day.id);
                const dateLabel = day.label
                  ? `${formatDate(day.date)} (${day.label})`
                  : formatDate(day.date);

                return (
                  <div key={day.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day.id}`}
                        checked={dayChecked}
                        onCheckedChange={(checked) => toggleDay(day.id, !!checked)}
                      />
                      <Label htmlFor={`day-${day.id}`} className="text-sm font-medium cursor-pointer">
                        {dateLabel}
                      </Label>
                    </div>

                    {/* Phases for this day (only if day is selected) */}
                    {dayChecked && day.phases.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {day.phases.map(phase => (
                          <div key={phase.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`phase-${phase.id}`}
                              checked={selectedPhaseIds.has(phase.id)}
                              onCheckedChange={(checked) => togglePhase(phase.id, !!checked)}
                            />
                            <Label htmlFor={`phase-${phase.id}`} className="text-sm cursor-pointer text-muted-foreground">
                              {phase.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entry type filter */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Eintr&auml;ge filtern</h4>
            <RadioGroup
              value={entryTypeFilter}
              onValueChange={(val) => setEntryTypeFilter(val as 'all' | 'task' | 'program')}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="filter-all" />
                <Label htmlFor="filter-all" className="text-sm cursor-pointer">Beides</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="task" id="filter-task" />
                <Label htmlFor="filter-task" className="text-sm cursor-pointer">Nur Aufgaben</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="program" id="filter-program" />
                <Label htmlFor="filter-program" className="text-sm cursor-pointer">Nur Programmpunkte</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={!hasSelection} className="gap-1.5">
            <FileDown className="h-4 w-4" />
            PDF exportieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
