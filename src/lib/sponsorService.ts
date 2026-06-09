import { supabase } from '@/integrations/supabase/client';

export interface Sponsor {
	id: string;
	user_id: string;
	company_name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	website: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Filter sponsors by company name (case-insensitive, trimmed substring match).
export const filterSponsors = (sponsors: Sponsor[], searchTerm: string): Sponsor[] => {
	const term = searchTerm.trim().toLowerCase();
	if (!term) return sponsors;
	return sponsors.filter((s) => s.company_name.toLowerCase().includes(term));
};

// Parse a user-entered category value, accepting German decimal comma
// ("200,50") as well as plain numbers ("200", "200.50"). Returns null for
// blank or non-numeric input so callers can store NULL instead of a value.
export const parseCategoryValue = (input: string): number | null => {
	const normalized = input.trim().replace(',', '.');
	if (normalized === '') return null;
	const value = Number(normalized);
	if (!Number.isFinite(value) || value < 0) return null;
	return value;
};

// Get all sponsors (global, shared workspace).
export const getSponsors = async (): Promise<Sponsor[]> => {
	const { data, error } = await supabase
		.from('sponsors')
		.select('*')
		.order('company_name', { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
};

// Create a sponsor, stamping the authenticated user as creator (ADR 0001).
export const createSponsor = async (
	sponsorData: Partial<Omit<Sponsor, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
		company_name: string;
	}
): Promise<string> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('User not authenticated');

	const { data, error } = await supabase
		.from('sponsors')
		.insert({ ...sponsorData, user_id: user.id })
		.select('id')
		.single();

	if (error) throw new Error(error.message);
	return data.id;
};

// Update a sponsor.
export const updateSponsor = async (
	sponsorId: string,
	updates: Partial<Sponsor>
): Promise<void> => {
	const { error } = await supabase.from('sponsors').update(updates).eq('id', sponsorId);
	if (error) throw new Error(error.message);
};

// Delete a sponsor (RLS restricts this to the creator).
export const deleteSponsor = async (sponsorId: string): Promise<void> => {
	const { error } = await supabase.from('sponsors').delete().eq('id', sponsorId);
	if (error) throw new Error(error.message);
};

// --- Sponsoring categories (per festival) -------------------------------

export interface SponsoringCategory {
	id: string;
	festival_id: string;
	name: string;
	value: number | null;
	created_at: string;
	updated_at: string;
}

// Get the sponsoring categories defined for a festival.
export const getCategories = async (festivalId: string): Promise<SponsoringCategory[]> => {
	const { data, error } = await supabase
		.from('sponsoring_categories')
		.select('*')
		.eq('festival_id', festivalId)
		.order('name', { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
};

// Create a sponsoring category for a festival.
export const createCategory = async (
	festivalId: string,
	name: string,
	value: number | null
): Promise<string> => {
	const { data, error } = await supabase
		.from('sponsoring_categories')
		.insert({ festival_id: festivalId, name, value })
		.select('id')
		.single();

	if (error) throw new Error(error.message);
	return data.id;
};

// Update a sponsoring category.
export const updateCategory = async (
	categoryId: string,
	updates: Partial<Pick<SponsoringCategory, 'name' | 'value'>>
): Promise<void> => {
	const { error } = await supabase
		.from('sponsoring_categories')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', categoryId);

	if (error) throw new Error(error.message);
};

// Delete a sponsoring category (RLS restricts this to the festival creator).
export const deleteCategory = async (categoryId: string): Promise<void> => {
	const { error } = await supabase.from('sponsoring_categories').delete().eq('id', categoryId);
	if (error) throw new Error(error.message);
};
