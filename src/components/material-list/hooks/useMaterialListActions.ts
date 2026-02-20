import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
	createMaterial,
	createMaterialsBulk,
	updateMaterial,
	deleteMaterial,
	type FestivalMaterial
} from '@/lib/materialService';

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

	const bulkCreateMaterialsMutation = useMutation({
		mutationFn: (materials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[]) =>
			createMaterialsBulk(materials),
		onSuccess: (data) => {
			invalidateAll();
			toast({
				title: 'Erfolg',
				description: `${data.length} Materialien wurden importiert.`
			});
		},
		onError: () => {
			toast({
				title: 'Fehler',
				description: 'Materialien konnten nicht importiert werden.',
				variant: 'destructive'
			});
		}
	});

	return {
		createMaterial: createMaterialMutation,
		updateMaterial: updateMaterialMutation,
		deleteMaterial: deleteMaterialMutation,
		bulkCreateMaterials: bulkCreateMaterialsMutation
	};
};
