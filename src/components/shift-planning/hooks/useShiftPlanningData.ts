import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStations, getStationShifts, getShiftAssignments, getStationMembers } from '@/lib/shiftService';
import { getMembers, getAllFestivalMemberPreferencesComplete } from '@/lib/memberService';

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

	const membersQuery = useQuery({
		queryKey: ['members'],
		queryFn: getMembers,
		select: (data) => data.filter((m) => m.is_active)
	});

	const stationMembersQuery = useQuery({
		queryKey: ['stationMembers', festivalId],
		queryFn: () => getStationMembers(festivalId)
	});

	const preferencesQuery = useQuery({
		queryKey: ['preferences', festivalId],
		queryFn: () => getAllFestivalMemberPreferencesComplete(festivalId)
	});

	const isLoading =
		stationsQuery.isLoading ||
		stationShiftsQuery.isLoading ||
		assignmentsQuery.isLoading ||
		membersQuery.isLoading ||
		stationMembersQuery.isLoading ||
		preferencesQuery.isLoading;

	const refetchAll = () => {
		queryClient.invalidateQueries({ queryKey: ['stations', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stationShifts', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['assignments', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stationMembers', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['members'] });
		queryClient.invalidateQueries({ queryKey: ['preferences', festivalId] });
	};

	return {
		stations: stationsQuery.data || [],
		stationShifts: stationShiftsQuery.data || [],
		assignments: assignmentsQuery.data || [],
		stationMembers: stationMembersQuery.data || [],
		members: membersQuery.data || [],
		stationPreferences: preferencesQuery.data?.stationPreferences || {},
		shiftPreferences: preferencesQuery.data?.shiftPreferences || {},
		isLoading,
		refetchAll
	};
};
