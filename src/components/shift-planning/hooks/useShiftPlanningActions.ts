import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
	createStation,
	updateStation,
	deleteStation,
	createStationShift,
	updateStationShift,
	deleteStationShift,
	assignMemberToStationShift,
	removeMemberFromStationShift,
	assignMemberToStation,
	removeMemberFromStation,
	type Station,
	type StationShift
} from '@/lib/shiftService';
import {
	createMember,
	updateMember,
	deleteMember,
	updateMemberPreferences
} from '@/lib/memberService';
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
		queryClient.invalidateQueries({ queryKey: ['stationMembers', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['members'] });
		queryClient.invalidateQueries({ queryKey: ['preferences', festivalId] });
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

	const assignMemberMutation = useMutation({
		mutationFn: ({
			stationShiftId,
			memberId,
			position
		}: {
			stationShiftId: string;
			memberId: string;
			position?: number;
		}) => assignMemberToStationShift(festivalId, stationShiftId, memberId, position),
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

	const removeMemberMutation = useMutation({
		mutationFn: ({ stationShiftId, memberId }: { stationShiftId: string; memberId: string }) =>
			removeMemberFromStationShift(festivalId, stationShiftId, memberId),
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

	const createMemberMutation = useMutation({
		mutationFn: (data: Parameters<typeof createMember>[0]) => createMember(data),
		onSuccess: (_data, variables) => {
			invalidateAll();
			toast({
				title: 'Mitglied hinzugefügt',
				description: `${variables.last_name} ${variables.first_name} wurde erfolgreich hinzugefügt.`
			});
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Mitglied konnte nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	});

	const updateMemberMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateMember>[1] }) =>
			updateMember(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Mitglied aktualisiert', description: 'Mitglied wurde erfolgreich aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Mitglied konnte nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	});

	const deleteMemberMutation = useMutation({
		mutationFn: (id: string) => deleteMember(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Mitglied gelöscht', description: 'Mitglied wurde erfolgreich gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Mitglied konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	const autoAssignMutation = useMutation({
		mutationFn: ({
			stationShifts,
			stations,
			members,
			config,
			stationPreferences
		}: {
			stationShifts: StationShift[];
			stations: Station[];
			members: Parameters<typeof performAutomaticAssignment>[3];
			config: AutoAssignmentConfig;
			stationPreferences: Record<string, string[]>;
		}) =>
			performAutomaticAssignment(
				festivalId,
				stationShifts,
				stations,
				members,
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
			memberId,
			stationPrefs,
			shiftPrefs
		}: {
			memberId: string;
			stationPrefs: string[];
			shiftPrefs: string[];
		}) => updateMemberPreferences(festivalId, memberId, stationPrefs, shiftPrefs),
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

	const assignMemberToStationMutation = useMutation({
		mutationFn: ({ stationId, memberId }: { stationId: string; memberId: string }) =>
			assignMemberToStation(festivalId, stationId, memberId),
		onSuccess: () => {
			invalidateAll();
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Mitglied konnte nicht zur Station zugewiesen werden.',
				variant: 'destructive'
			});
		}
	});

	const removeMemberFromStationMutation = useMutation({
		mutationFn: ({ stationId, memberId }: { stationId: string; memberId: string }) =>
			removeMemberFromStation(stationId, memberId),
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
		assignMember: assignMemberMutation,
		removeMember: removeMemberMutation,
		assignMemberToStation: assignMemberToStationMutation,
		removeMemberFromStation: removeMemberFromStationMutation,
		createMember: createMemberMutation,
		updateMember: updateMemberMutation,
		deleteMember: deleteMemberMutation,
		autoAssign: autoAssignMutation,
		clearAssignments: clearAssignmentsMutation,
		savePreferences: savePreferencesMutation
	};
};
