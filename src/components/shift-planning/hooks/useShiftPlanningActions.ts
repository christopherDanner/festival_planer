import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
	createStation,
	updateStation,
	deleteStation,
	createStationShift,
	updateStationShift,
	deleteStationShift,
	assignHelperToStationShift,
	removeHelperFromStationShift,
	assignHelperToStation,
	removeHelperFromStation,
	type Station,
	type StationShift
} from '@/lib/shiftService';
import {
	createHelper,
	updateHelper,
	deleteHelper,
	updateHelperPreferences,
	type HelperInput
} from '@/lib/helperService';
import {
	performAutomaticAssignment,
	clearAllAssignments,
	type AutoAssignmentConfig
} from '@/lib/automaticAssignmentService';

export const useShiftPlanningActions = (festivalId: string) => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ['stations', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stationShifts', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['assignments', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stationHelpers', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['helpers', festivalId] });
	};

	const createStationMutation = useMutation({
		mutationFn: (data: Omit<Station, 'id' | 'created_at' | 'updated_at'>) => createStation(data),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Station wurde erstellt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht erstellt werden.',
				variant: 'destructive'
			});
		}
	});

	const updateStationMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<Station> }) =>
			updateStation(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Station wurde aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	});

	const deleteStationMutation = useMutation({
		mutationFn: (id: string) => deleteStation(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Station wurde gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	const createStationShiftMutation = useMutation({
		mutationFn: (data: Omit<StationShift, 'id' | 'created_at' | 'updated_at'>) =>
			createStationShift(data),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Schicht wurde erstellt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Schicht konnte nicht erstellt werden.',
				variant: 'destructive'
			});
		}
	});

	const updateStationShiftMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<StationShift> }) =>
			updateStationShift(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Schicht wurde aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Schicht konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	});

	const deleteStationShiftMutation = useMutation({
		mutationFn: (id: string) => deleteStationShift(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Schicht wurde gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Schicht konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	const assignHelperMutation = useMutation({
		mutationFn: ({
			stationShiftId,
			helperId,
			position
		}: {
			stationShiftId: string;
			helperId: string;
			position?: number;
		}) => assignHelperToStationShift(festivalId, stationShiftId, helperId, position),
		onSuccess: () => {
			invalidateAll();
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Zuweisung konnte nicht erstellt werden.',
				variant: 'destructive'
			});
		}
	});

	const removeHelperMutation = useMutation({
		mutationFn: ({ stationShiftId, helperId }: { stationShiftId: string; helperId: string }) =>
			removeHelperFromStationShift(festivalId, stationShiftId, helperId),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Zuweisung wurde entfernt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Zuweisung konnte nicht entfernt werden.',
				variant: 'destructive'
			});
		}
	});

	// Der Helfer wird im Fest angelegt (ADR 0005) — die Helferliste des
	// Schichtplans ist nach dem Wegfall der Mitglieder-Seite der einzige Weg.
	const createHelperMutation = useMutation({
		mutationFn: (data: HelperInput) => createHelper(festivalId, data),
		onSuccess: (_data, variables) => {
			invalidateAll();
			toast({
				title: 'Helfer hinzugefügt',
				description: `${variables.last_name} ${variables.first_name} wurde erfolgreich hinzugefügt.`
			});
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Helfer konnte nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	});

	const updateHelperMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<HelperInput> }) =>
			updateHelper(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Helfer aktualisiert', description: 'Helfer wurde erfolgreich aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Helfer konnte nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	});

	const deleteHelperMutation = useMutation({
		mutationFn: (id: string) => deleteHelper(id),
		onSuccess: () => {
			invalidateAll();
			toast({
				title: 'Helfer entfernt',
				description: 'Der Helfer wurde samt seinen Zuteilungen aus dem Fest entfernt.'
			});
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Helfer konnte nicht entfernt werden.',
				variant: 'destructive'
			});
		}
	});

	const autoAssignMutation = useMutation({
		mutationFn: ({
			stationShifts,
			stations,
			helpers,
			config,
			stationPreferences
		}: {
			stationShifts: StationShift[];
			stations: Station[];
			helpers: Parameters<typeof performAutomaticAssignment>[3];
			config: AutoAssignmentConfig;
			stationPreferences: Record<string, string[]>;
		}) =>
			performAutomaticAssignment(
				festivalId,
				stationShifts,
				stations,
				helpers,
				config,
				stationPreferences
			),
		onSuccess: (result) => {
			invalidateAll();
			let message = `${result.assignmentsCreated} Zuweisungen erstellt.`;
			if (result.unfilledPositions.length > 0) {
				message += ` ${result.unfilledPositions.length} Positionen konnten nicht besetzt werden.`;
			}
			toast({ title: 'Automatische Zuteilung abgeschlossen', description: message });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Die automatische Zuteilung ist fehlgeschlagen.',
				variant: 'destructive'
			});
		}
	});

	const clearAssignmentsMutation = useMutation({
		mutationFn: () => clearAllAssignments(festivalId),
		onSuccess: (success) => {
			if (success) {
				invalidateAll();
				toast({ title: 'Erfolg', description: 'Alle Zuweisungen wurden gelöscht.' });
			}
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Zuweisungen konnten nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	const savePreferencesMutation = useMutation({
		mutationFn: ({
			helperId,
			stationPrefs,
			shiftPrefs
		}: {
			helperId: string;
			stationPrefs: string[];
			shiftPrefs: string[];
		}) => updateHelperPreferences(helperId, stationPrefs, shiftPrefs),
		onSuccess: () => {
			invalidateAll();
			toast({
				title: 'Präferenzen gespeichert',
				description: 'Station- und Schichtwünsche wurden erfolgreich gespeichert.'
			});
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Präferenzen konnten nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	});

	const assignHelperToStationMutation = useMutation({
		mutationFn: ({ stationId, helperId }: { stationId: string; helperId: string }) =>
			assignHelperToStation(festivalId, stationId, helperId),
		onSuccess: () => {
			invalidateAll();
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Helfer konnte nicht zur Station zugewiesen werden.',
				variant: 'destructive'
			});
		}
	});

	const removeHelperFromStationMutation = useMutation({
		mutationFn: ({ stationId, helperId }: { stationId: string; helperId: string }) =>
			removeHelperFromStation(stationId, helperId),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Zuweisung wurde entfernt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Zuweisung konnte nicht entfernt werden.',
				variant: 'destructive'
			});
		}
	});

	return {
		createStation: createStationMutation,
		updateStation: updateStationMutation,
		deleteStation: deleteStationMutation,
		createStationShift: createStationShiftMutation,
		updateStationShift: updateStationShiftMutation,
		deleteStationShift: deleteStationShiftMutation,
		assignHelper: assignHelperMutation,
		removeHelper: removeHelperMutation,
		assignHelperToStation: assignHelperToStationMutation,
		removeHelperFromStation: removeHelperFromStationMutation,
		createHelper: createHelperMutation,
		updateHelper: updateHelperMutation,
		deleteHelper: deleteHelperMutation,
		autoAssign: autoAssignMutation,
		clearAssignments: clearAssignmentsMutation,
		savePreferences: savePreferencesMutation
	};
};
