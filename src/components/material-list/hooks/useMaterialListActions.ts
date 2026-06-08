import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
	createMaterial,
	updateMaterial,
	deleteMaterial,
	type FestivalMaterial
} from '@/lib/materialService';
import { createStation, type Station } from '@/lib/shiftService';

export const useMaterialListActions = (festivalId: string) => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ['materials', festivalId] });
	};

	const createMaterialMutation = useMutation({
		mutationFn: (data: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>) =>
			createMaterial(data),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Material wurde hinzugefügt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Material konnte nicht hinzugefügt werden.',
				variant: 'destructive'
			});
		}
	});

	const updateMaterialMutation = useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<FestivalMaterial> }) =>
			updateMaterial(id, updates),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Material wurde aktualisiert.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Material konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	});

	const deleteMaterialMutation = useMutation({
		mutationFn: (id: string) => deleteMaterial(id),
		onSuccess: () => {
			invalidateAll();
			toast({ title: 'Erfolg', description: 'Material wurde gelöscht.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Material konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	});

	const createStationMutation = useMutation({
		mutationFn: (name: string): Promise<Station> =>
			createStation({ festival_id: festivalId, name, required_people: 1 }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stations', festivalId] });
			toast({ title: 'Erfolg', description: 'Station wurde angelegt.' });
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht angelegt werden.',
				variant: 'destructive'
			});
		}
	});

	return {
		createMaterial: createMaterialMutation,
		updateMaterial: updateMaterialMutation,
		deleteMaterial: deleteMaterialMutation,
		createStation: createStationMutation
	};
};
