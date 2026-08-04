import { supabase } from '@/integrations/supabase/client';

export interface Festival {
	id: string;
	user_id: string;
	type: string;
	start_date: string;
	end_date?: string;
	visitor_count: string;
	name?: string;
	location?: string;
	created_at: string;
	updated_at: string;
	deleted_at?: string | null;
}

export interface FestivalData {
	name: string;
	location: string;
	startDate: string;
	endDate?: string;
	visitorCount: string;
}

export async function createFestival(festivalData: FestivalData, userId?: string): Promise<string> {
	// Get user ID from auth if not provided
	let actualUserId = userId;
	if (!actualUserId) {
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) {
			throw new Error('User not authenticated');
		}
		actualUserId = user.id;
	}

	// Create festival record
	const { data: festival, error: festivalError } = await supabase
		.from('festivals')
		.insert({
			user_id: actualUserId,
			type: 'kirtag',
			start_date: festivalData.startDate,
			end_date: festivalData.endDate,
			visitor_count: festivalData.visitorCount,
			name: festivalData.name,
			location: festivalData.location
		})
		.select()
		.single();

	if (festivalError || !festival) {
		throw new Error('Fehler beim Erstellen des Festes');
	}

	// For simplified wizard, don't create stations and shifts automatically
	// Let users add them manually in the shift plan
	return festival.id;
}

export async function getFestival(festivalId: string): Promise<Festival | null> {
	const { data, error } = await supabase
		.from('festivals')
		.select('*')
		.eq('id', festivalId)
		.is('deleted_at', null)
		.maybeSingle();

	if (error) {
		throw new Error('Fehler beim Laden des Festes');
	}

	return data;
}

/**
 * Die Felder des Bearbeiten-Dialogs. `null` heißt „Feld leeren" — darum nullable
 * und nicht optional: `undefined` fiele aus dem Update heraus und das Leeren
 * würde stillschweigend nichts tun.
 */
export interface FestivalEdits {
	name: string;
	start_date: string;
	end_date: string | null;
	location: string | null;
}

export async function updateFestival(id: string, updates: Partial<FestivalEdits>): Promise<Festival> {
	const { data, error } = await supabase
		.from('festivals')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function getUserFestivals(): Promise<Festival[]> {
	const { data, error } = await supabase
		.from('festivals')
		.select('*')
		.is('deleted_at', null)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error('Fehler beim Laden der Feste');
	}

	return data || [];
}

export async function deleteFestival(festivalId: string): Promise<void> {
	const { error } = await supabase
		.from('festivals')
		.update({ deleted_at: new Date().toISOString() })
		.eq('id', festivalId);

	if (error) {
		throw new Error('Fehler beim Löschen des Festes');
	}
}
