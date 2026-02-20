import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMaterials } from '@/lib/materialService';
import { getStations } from '@/lib/shiftService';

export const useMaterialListData = (festivalId: string) => {
	const queryClient = useQueryClient();

	const materialsQuery = useQuery({
		queryKey: ['materials', festivalId],
		queryFn: () => getMaterials(festivalId)
	});

	const stationsQuery = useQuery({
		queryKey: ['stations', festivalId],
		queryFn: () => getStations(festivalId)
	});

	const isLoading = materialsQuery.isLoading || stationsQuery.isLoading;

	const refetchAll = () => {
		queryClient.invalidateQueries({ queryKey: ['materials', festivalId] });
		queryClient.invalidateQueries({ queryKey: ['stations', festivalId] });
	};

	return {
		materials: materialsQuery.data || [],
		stations: stationsQuery.data || [],
		isLoading,
		refetchAll
	};
};
