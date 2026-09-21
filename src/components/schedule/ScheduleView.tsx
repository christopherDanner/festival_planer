import React, { useState, useEffect } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useScheduleActions } from './hooks/useScheduleActions';
import { useIsMobile } from '@/hooks/use-mobile';
import ScheduleHeader from './ScheduleHeader';
import ScheduleDayAccordion from './ScheduleDayAccordion';
import ScheduleDayDialog from './dialogs/ScheduleDayDialog';
import SchedulePhaseDialog from './dialogs/SchedulePhaseDialog';
import ScheduleEntryDialog from './dialogs/ScheduleEntryDialog';
import ScheduleExportDialog from './dialogs/ScheduleExportDialog';
import type {
  ScheduleDayWithEntries,
  SchedulePhase,
  ScheduleEntryWithHelper,
} from '@/lib/scheduleService';

// `type: 'none'` statt `null`: das Projekt kompiliert ohne strictNullChecks,
// dort trägt `null` keine Unterscheidungskraft und die Fallunterscheidung unten
// würde still nichts verengen.
type DialogState =
  | { type: 'none' }
  | { type: 'day'; day?: ScheduleDayWithEntries }
  | { type: 'phase'; phase?: SchedulePhase; scheduleDayId: string }
  | { type: 'entry'; entry?: ScheduleEntryWithHelper; scheduleDayId: string; schedulePhaseId: string | null }
  | { type: 'export' };

const CLOSED: DialogState = { type: 'none' };

interface ScheduleViewProps {
  festivalId: string;
  festivalName?: string;
  festivalStartDate?: string;
  festivalEndDate?: string;
}

export default function ScheduleView({ festivalId, festivalName, festivalStartDate, festivalEndDate }: ScheduleViewProps) {
  const { days, helpers, isLoading } = useScheduleData(festivalId);
  const actions = useScheduleActions(festivalId);
  const isMobile = useIsMobile();
  const [dialogState, setDialogState] = useState<DialogState>(CLOSED);
  const [initialized, setInitialized] = useState(false);

  // Auto-initialize days from festival dates on first load
  useEffect(() => {
    if (!initialized && !isLoading && days.length === 0 && festivalStartDate) {
      actions.initDays.mutate(
        { startDate: festivalStartDate, endDate: festivalEndDate },
        { onSuccess: () => setInitialized(true) }
      );
    } else if (!initialized) {
      setInitialized(true);
    }
  }, [isLoading, days.length, festivalStartDate]);

  // Handlers
  const handleSaveDay = (data: any) => {
    if (dialogState.type === 'day' && dialogState.day) {
      actions.editDay.mutate({ id: dialogState.day.id, updates: { date: data.date, label: data.label } });
    } else {
      actions.createDay.mutate(data);
    }
  };

  const handleSavePhase = (data: any) => {
    if (dialogState.type === 'phase' && dialogState.phase) {
      actions.editPhase.mutate({ id: dialogState.phase.id, updates: { name: data.name } });
    } else {
      actions.createPhase.mutate(data);
    }
  };

  const handleSaveEntry = (data: any) => {
    if (dialogState.type === 'entry' && dialogState.entry) {
      actions.editEntry.mutate({
        id: dialogState.entry.id,
        updates: {
          title: data.title,
          type: data.type,
          start_time: data.start_time,
          end_time: data.end_time,
          responsible_helper_id: data.responsible_helper_id,
          status: data.status,
          description: data.description,
        }
      });
    } else {
      // Die Uhrzeit reiht (ADR 0007) — beim Anlegen ist nichts einzusortieren.
      actions.createEntry.mutate(data);
    }
  };

  const handleToggleEntryStatus = (entry: ScheduleEntryWithHelper) => {
    if (entry.type !== 'task') return;
    actions.editEntry.mutate({
      id: entry.id,
      updates: { status: entry.status === 'done' ? 'open' : 'done' }
    });
  };

  const handleReorderPhases = (dayId: string, orderedIds: string[]) => {
    const items = orderedIds.map((id, index) => ({ id, sort_order: index }));
    actions.reorderPhases.mutate(items);
  };

  const handleDeleteDay = (id: string) => {
    if (!window.confirm('Tag und alle zugehörigen Phasen und Einträge wirklich löschen?')) return;
    actions.removeDay.mutate(id);
  };

  const handleDeletePhase = (id: string) => {
    if (!window.confirm('Phase und alle zugehörigen Einträge wirklich löschen?')) return;
    actions.removePhase.mutate(id);
  };

  const handleDeleteEntry = (id: string) => {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    actions.removeEntry.mutate(id);
  };

  // Loading state
  if (isLoading || !initialized) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/50 rounded animate-pulse" />
        <div className="h-16 bg-muted/50 rounded animate-pulse" />
        <div className="h-16 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  // No festival dates set
  if (!festivalStartDate) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Bitte zuerst Start- und Enddatum des Festes festlegen.
      </div>
    );
  }

  return (
    <div>
      <ScheduleHeader
        onAddDay={() => setDialogState({ type: 'day' })}
        onExport={() => setDialogState({ type: 'export' })}
        hasData={days.length > 0}
      />

      {days.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Keine Tage vorhanden. Füge einen Tag hinzu, um mit der Planung zu beginnen.
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <ScheduleDayAccordion
              key={day.id}
              day={day}
              onEditDay={(d) => setDialogState({ type: 'day', day: d })}
              onDeleteDay={handleDeleteDay}
              onEditPhase={(p) => setDialogState({ type: 'phase', phase: p, scheduleDayId: p.schedule_day_id })}
              onDeletePhase={handleDeletePhase}
              onAddPhase={(dayId) => setDialogState({ type: 'phase', scheduleDayId: dayId })}
              onEditEntry={(e) => setDialogState({
                type: 'entry',
                entry: e,
                scheduleDayId: e.schedule_day_id,
                schedulePhaseId: e.schedule_phase_id,
              })}
              onDeleteEntry={handleDeleteEntry}
              onToggleEntryStatus={handleToggleEntryStatus}
              onAddEntry={(dayId, phaseId) => setDialogState({ type: 'entry', scheduleDayId: dayId, schedulePhaseId: phaseId })}
              onReorderPhases={handleReorderPhases}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* Day Dialog */}
      <ScheduleDayDialog
        open={dialogState.type === 'day'}
        onOpenChange={(open) => { if (!open) setDialogState(CLOSED); }}
        day={dialogState.type === 'day' ? dialogState.day : null}
        festivalId={festivalId}
        existingDaysCount={days.length}
        onSave={handleSaveDay}
      />

      {/* Phase Dialog */}
      <SchedulePhaseDialog
        open={dialogState.type === 'phase'}
        onOpenChange={(open) => { if (!open) setDialogState(CLOSED); }}
        phase={dialogState.type === 'phase' ? dialogState.phase : null}
        scheduleDayId={dialogState.type === 'phase' ? dialogState.scheduleDayId : ''}
        festivalId={festivalId}
        existingPhasesCount={
          dialogState.type === 'phase'
            ? (days.find(d => d.id === dialogState.scheduleDayId)?.phases.length ?? 0)
            : 0
        }
        onSave={handleSavePhase}
      />

      {/* Entry Dialog */}
      <ScheduleEntryDialog
        open={dialogState.type === 'entry'}
        onOpenChange={(open) => { if (!open) setDialogState(CLOSED); }}
        entry={dialogState.type === 'entry' ? dialogState.entry : null}
        scheduleDayId={dialogState.type === 'entry' ? dialogState.scheduleDayId : ''}
        schedulePhaseId={dialogState.type === 'entry' ? dialogState.schedulePhaseId : null}
        festivalId={festivalId}
        helpers={helpers}
        onSave={handleSaveEntry}
      />

      {/* Export Dialog */}
      <ScheduleExportDialog
        open={dialogState.type === 'export'}
        onOpenChange={(open) => { if (!open) setDialogState(CLOSED); }}
        festivalName={festivalName || ''}
        days={days}
      />
    </div>
  );
}
