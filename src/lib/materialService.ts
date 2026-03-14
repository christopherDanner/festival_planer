import { supabase } from '@/integrations/supabase/client';

export interface FestivalMaterial {
	id: string;
	festival_id: string;
	station_id: string | null;
	name: string;
	category: string | null;
	supplier: string | null;
	unit: string;
	packaging_unit: string | null;
	amount_per_packaging: number | null;
	ordered_quantity: number;
	actual_quantity: number | null;
	unit_price: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface FestivalMaterialWithStation extends FestivalMaterial {
	station?: { id: string; name: string } | null;
}

export const getMaterials = async (festivalId: string): Promise<FestivalMaterialWithStation[]> => {
	const { data, error } = await (supabase as any)
		.from('festival_materials')
		.select('*, station:stations(id, name)')
		.eq('festival_id', festivalId)
		.order('name');

	if (error) throw error;
	return data || [];
};

export const createMaterial = async (
	data: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>
): Promise<FestivalMaterial> => {
	const { data: result, error } = await (supabase as any)
		.from('festival_materials')
		.insert(data)
		.select()
		.single();

	if (error) throw error;
	return result;
};

export const updateMaterial = async (
	id: string,
	updates: Partial<FestivalMaterial>
): Promise<FestivalMaterial> => {
	const { data, error } = await (supabase as any)
		.from('festival_materials')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const createMaterialsBulk = async (
	materials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[]
): Promise<FestivalMaterial[]> => {
	const { data, error } = await (supabase as any)
		.from('festival_materials')
		.insert(materials)
		.select();

	if (error) throw error;
	return data || [];
};

export const updateMaterialsBulk = async (
	updates: { id: string; actual_quantity: number; unit_price?: number | null }[]
): Promise<void> => {
	for (const u of updates) {
		const { error } = await (supabase as any)
			.from('festival_materials')
			.update({ actual_quantity: u.actual_quantity, ...(u.unit_price !== undefined && { unit_price: u.unit_price }), updated_at: new Date().toISOString() })
			.eq('id', u.id);
		if (error) throw error;
	}
};

export const deleteMaterial = async (id: string): Promise<void> => {
	const { error } = await (supabase as any)
		.from('festival_materials')
		.delete()
		.eq('id', id);

	if (error) throw error;
};
