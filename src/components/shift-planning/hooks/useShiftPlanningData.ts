import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStations, getStationShifts, getShiftAssignments, getStationHelpers } from '@/lib/shiftService';
import { getHelpers, deriveStationPreferences } from '@/lib/helperService';

export const useShiftPlanningData = (festivalId: string) => {
	const queryClient = useQueryClient();

	const stationsQuery = useQuery({
		queryKey: ['stations', festivalId],
		queryFn: () => getStations(festivalId)
	});

	const stationShiftsQuery = useQuery({
		queryKey: ['stationShifts', festivalId],
		queryFn: () => getStationShifts(festivalId)
	});

	const assignmentsQuery = useQuery({
		queryKey: ['assignments', festivalId],
		queryFn: () => getShiftAssignments(festivalId)
	});

	// Helfer gehören dem Fest (ADR 0005) — die Abfrage ist fest-gebunden, und es
	// gibt keinen Aktiv-Filter mehr, den sie anwenden müsste.
	const helpersQuery = useQuery({
		queryKey: ['helpers', festivalId],
		queryFn: () => getHelpers(festivalId)
	});

	const stationHelpersQuery = useQuery({
		queryKey: ['stationHelpers', festivalId],
		queryFn: () => getStationHelpers(festivalId)
	});

	const isLoading =
		stationsQuery.isLoading ||
		stationShiftsQuery.isLoading ||
		assignmentsQuery.isLoading ||
		helpersQuery.isLoading ||
		stationHelpersQuery.isLoading;

	const refetchAll = () => {
		queryClient.invalidateQueries({ queryKey: ['stations', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stationShifts', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['assignments', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stationHelpers', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['helpers', festivalId] });
	};

	const helpers = helpersQuery.data || [];
	// Die Wünsche stehen auf der Helfer-Zeile; eine eigene Abfrage dafür gibt es
	// nicht mehr (festival_member_preferences ist weg, ADR 0005). Als Map braucht
	// sie nur noch die Auto-Zuteilung — das Helfer-Blatt (#107) liest sie direkt
	// von dem Helfer, den es gerade bearbeitet.
	const stationPreferences = deriveStationPreferences(helpers);

	return {
		stations: stationsQuery.data || [],
		stationShifts: stationShiftsQuery.data || [],
		assignments: assignmentsQuery.data || [],
		stationHelpers: stationHelpersQuery.data || [],
		helpers,
		stationPreferences,
		isLoading,
		refetchAll
	};
};
