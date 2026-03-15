import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getScheduleDays } from '@/lib/scheduleService';
import { getMembers } from '@/lib/memberService';

export const useScheduleData = (festivalId: string) => {
	const queryClient = useQueryClient();

	const daysQuery = useQuery({
		queryKey: ['scheduleDays', festivalId],
		queryFn: () => getScheduleDays(festivalId)
	});

	const membersQuery = useQuery({
		queryKey: ['members'],
		queryFn: () => getMembers()
	});

	const isLoading = daysQuery.isLoading || membersQuery.isLoading;

	const refetchAll = () => {
		queryClient.invalidateQueries({ queryKey: ['scheduleDays', festivalId] });
	};

	return {
		days: daysQuery.data || [],
		members: membersQuery.data || [],
		isLoading,
		refetchAll
	};
};
