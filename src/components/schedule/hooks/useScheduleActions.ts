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
	reorderScheduleEntries,
	reorderSchedulePhases,
	type ScheduleDay,
	type SchedulePhase,
	type ScheduleEntry
} from '@/lib/scheduleService';

export const useScheduleActions = (festivalId: string) => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ['scheduleDays', festivalId] });
	};

	// --- Day mutations ---

	const createDayMutation = useMutation({
		mutationFn: (data: Omit<ScheduleDay, 'id' | 'created_at' | 'updated_at'>) =>
			createScheduleDay(data),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Tag wurde hinzugefügt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Tag konnte nicht hinzugefügt werden.',
				variant: 'destructive'
			});
		}
	});

	const editDayMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleDay> }) =>
			updateScheduleDay(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Tag wurde aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Tag konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	});

	const removeDayMutation = useMutation({
		mutationFn: (id: string) => deleteScheduleDay(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Tag wurde gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Tag konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	// --- Phase mutations ---

	const createPhaseMutation = useMutation({
		mutationFn: (data: Omit<SchedulePhase, 'id' | 'created_at' | 'updated_at'>) =>
			createSchedulePhase(data),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Phase wurde hinzugefügt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Phase konnte nicht hinzugefügt werden.',
				variant: 'destructive'
			});
		}
	});

	const editPhaseMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<SchedulePhase> }) =>
			updateSchedulePhase(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Phase wurde aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Phase konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	});

	const removePhaseMutation = useMutation({
		mutationFn: (id: string) => deleteSchedulePhase(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Phase wurde gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Phase konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	// --- Entry mutations ---

	const createEntryMutation = useMutation({
		mutationFn: (data: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>) =>
			createScheduleEntry(data),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Eintrag wurde hinzugefügt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Eintrag konnte nicht hinzugefügt werden.',
				variant: 'destructive'
			});
		}
	});

	const editEntryMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleEntry> }) =>
			updateScheduleEntry(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Eintrag wurde aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Eintrag konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	});

	const removeEntryMutation = useMutation({
		mutationFn: (id: string) => deleteScheduleEntry(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Eintrag wurde gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Eintrag konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	// --- Init mutation ---

	const initDaysMutation = useMutation({
		mutationFn: ({ startDate, endDate }: { startDate: string; endDate?: string }) =>
			initializeScheduleDays(festivalId, startDate, endDate),
		onSuccess: () => {
			invalidateAll();
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Tage konnten nicht generiert werden.',
				variant: 'destructive'
			});
		}
	});

	// --- Reorder mutations ---

	const reorderPhasesMutation = useMutation({
		mutationFn: (items: { id: string; sort_order: number }[]) => reorderSchedulePhases(items),
		onSuccess: () => { invalidateAll(); },
		onError: () => {
			toast({ title: 'Fehler', description: 'Reihenfolge konnte nicht gespeichert werden.', variant: 'destructive' });
		}
	});

	const reorderEntriesMutation = useMutation({
		mutationFn: (items: { id: string; sort_order: number }[]) => reorderScheduleEntries(items),
		onSuccess: () => { invalidateAll(); },
		onError: () => {
			toast({ title: 'Fehler', description: 'Reihenfolge konnte nicht gespeichert werden.', variant: 'destructive' });
		}
	});

	return {
		createDay: createDayMutation,
		editDay: editDayMutation,
		removeDay: removeDayMutation,
		createPhase: createPhaseMutation,
		editPhase: editPhaseMutation,
		removePhase: removePhaseMutation,
		createEntry: createEntryMutation,
		editEntry: editEntryMutation,
		removeEntry: removeEntryMutation,
		initDays: initDaysMutation,
		reorderPhases: reorderPhasesMutation,
		reorderEntries: reorderEntriesMutation,
	};
};
