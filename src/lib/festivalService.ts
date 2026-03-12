import { supabase } from '@/integrations/supabase/client';

export interface Festival {
	id: string;
	user_id: string;
	type: string;
	start_date: string;
	end_date?: string;
	visitor_count: string;
	name?: string;
	created_at: string;
	updated_at: string;
}

export interface FestivalData {
	name: string;
	location: string;
	startDate: string;
	endDate?: string;
	type?: string;
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
			type: festivalData.type || 'general',
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
		.maybeSingle();

	if (error) {
		throw new Error('Fehler beim Laden des Festes');
	}

	return data;
}

export async function getUserFestivals(): Promise<Festival[]> {
	const { data, error } = await supabase
		.from('festivals')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error('Fehler beim Laden der Feste');
	}

	return data || [];
}

export async function deleteFestival(festivalId: string): Promise<void> {
	// Delete all related data in correct order (children first, then parent)
	// 1. Delete shift assignments
	const { error: assignmentError } = await supabase
		.from('shift_assignments')
		.delete()
		.eq('festival_id', festivalId);

	if (assignmentError) {
		throw new Error('Fehler beim Löschen der Schichtzuordnungen');
	}

	// 2. Delete station shifts
	const { error: shiftError } = await supabase
		.from('station_shifts')
		.delete()
		.eq('festival_id', festivalId);

	if (shiftError) {
		throw new Error('Fehler beim Löschen der Schichten');
	}

	// 2b. Delete station members
	const { error: stationMemberError } = await supabase
		.from('station_members')
		.delete()
		.eq('festival_id', festivalId);

	if (stationMemberError) {
		throw new Error('Fehler beim Löschen der Stationsmitglieder');
	}

	// 3. Delete materials (before stations due to station_id FK)
	const { error: materialError } = await (supabase as any)
		.from('festival_materials')
		.delete()
		.eq('festival_id', festivalId);

	if (materialError) {
		throw new Error('Fehler beim Löschen der Materialien');
	}

	// 4. Delete stations
	const { error: stationError } = await supabase
		.from('stations')
		.delete()
		.eq('festival_id', festivalId);

	if (stationError) {
		throw new Error('Fehler beim Löschen der Stationen');
	}

	// 5. Finally delete the festival
	const { error: festivalError } = await supabase.from('festivals').delete().eq('id', festivalId);

	if (festivalError) {
		throw new Error('Fehler beim Löschen des Festes');
	}
}
