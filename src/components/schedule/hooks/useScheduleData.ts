import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getScheduleDays } from '@/lib/scheduleService';
import { getHelpers } from '@/lib/helperService';

export const useScheduleData = (festivalId: string) => {
	const queryClient = useQueryClient();

	const daysQuery = useQuery({
		queryKey: ['scheduleDays', festivalId],
		queryFn: () => getScheduleDays(festivalId)
	});

	// Die Verantwortlichen des Ablaufplans sind die Helfer dieses Fests (ADR 0005).
	const helpersQuery = useQuery({
		queryKey: ['helpers', festivalId],
		queryFn: () => getHelpers(festivalId)
	});

	const isLoading = daysQuery.isLoading || helpersQuery.isLoading;

	const refetchAll = () => {
		queryClient.invalidateQueries({ queryKey: ['scheduleDays', festivalId] });
	};

	return {
		days: daysQuery.data || [],
		helpers: helpersQuery.data || [],
		isLoading,
		refetchAll
	};
};
