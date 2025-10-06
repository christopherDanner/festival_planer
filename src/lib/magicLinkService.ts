import { supabase } from '@/integrations/supabase/client';
// import { sendEmail } from './emailService';

export interface MagicLink {
	id: string;
	festival_id: string;
	member_id: string;
	token: string;
	expires_at: string;
	used_at?: string;
	created_at: string;
	created_by?: string;
}

export interface MemberPreference {
	id: string;
	festival_id: string;
	member_id: string;
	magic_link_id?: string;
	station_preferences: string[];
	shift_preferences: string[];
	min_shifts: number;
	max_shifts: number;
	availability_notes?: string;
	submitted_at: string;
	updated_at: string;
}

export interface PreferenceFormData {
	station_preferences: string[];
	shift_preferences: string[];
	min_shifts: number;
	max_shifts: number;
	availability_notes?: string;
}

// Generate a secure random token
const generateToken = (): string => {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Create magic link for a member
export const createMagicLink = async (
	festivalId: string,
	memberId: string,
	createdBy?: string,
	expiresInHours: number = 168 // 7 days default
): Promise<MagicLink> => {
	const token = generateToken();
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + expiresInHours);

	const { data, error } = await supabase
		.from('magic_links' as any)
		.insert({
			festival_id: festivalId,
			member_id: memberId,
			token,
			expires_at: expiresAt.toISOString(),
			created_by: createdBy
		})
		.select()
		.single();

	if (error) throw error;
	return data as any;
};

// Get magic link by token
export const getMagicLinkByToken = async (token: string): Promise<MagicLink | null> => {
	const { data, error } = await supabase
		.from('magic_links' as any)
		.select('*')
		.eq('token', token)
		.single();

	if (error) return null;
	return data as any;
};

// Get magic link ID by token
export const getMagicLinkIdByToken = async (token: string): Promise<string | null> => {
	const { data, error } = await supabase
		.from('magic_links' as any)
		.select('id')
		.eq('token', token)
		.single();

	if (error) return null;
	return (data as any).id;
};

// Validate magic link (check if exists and not expired)
export const validateMagicLink = async (
	token: string
): Promise<{ valid: boolean; link?: MagicLink; error?: string }> => {
	const link = await getMagicLinkByToken(token);

	if (!link) {
		return { valid: false, error: 'Invalid link' };
	}

	if (link.used_at) {
		return { valid: false, error: 'Link has already been used' };
	}

	if (new Date() > new Date(link.expires_at)) {
		return { valid: false, error: 'Link has expired' };
	}

	return { valid: true, link };
};

// Mark magic link as used
export const markMagicLinkAsUsed = async (token: string): Promise<void> => {
	const { error } = await supabase
		.from('magic_links' as any)
		.update({ used_at: new Date().toISOString() })
		.eq('token', token);

	if (error) throw error;
};

// Get member info for magic link
export const getMemberInfoForMagicLink = async (token: string) => {
	const { data, error } = await supabase
		.from('magic_links' as any)
		.select(
			`
			*,
			members!magic_links_member_id_fkey(
				id,
				first_name,
				last_name,
				email,
				phone
			),
			festivals!magic_links_festival_id_fkey(
				id,
				name,
				start_date,
				end_date
			)
		`
		)
		.eq('token', token)
		.single();

	if (error) throw error;
	return data as any;
};

// Get available stations for preferences
export const getAvailableStations = async (festivalId: string) => {
	const { data, error } = await supabase
		.from('stations')
		.select('*')
		.eq('festival_id', festivalId)
		.order('name');

	if (error) throw error;
	return data as any;
};

// Get available shifts for preferences
export const getAvailableShifts = async (festivalId: string) => {
	const { data, error } = await supabase
		.from('station_shifts' as any)
		.select(
			`
			*,
			stations!station_shifts_station_id_fkey(
				id,
				name
			)
		`
		)
		.eq('festival_id', festivalId)
		.order('start_date, start_time');

	if (error) throw error;
	return data as any;
};

// Save member preferences
export const saveMemberPreferences = async (
	festivalId: string,
	memberId: string,
	preferences: PreferenceFormData,
	magicLinkId?: string
): Promise<MemberPreference> => {
	// Check for overlapping shifts
	const overlappingShifts = await checkShiftOverlaps(preferences.shift_preferences);
	if (overlappingShifts.length > 0) {
		throw new Error(`Die folgenden Schichten überschneiden sich: ${overlappingShifts.join(', ')}`);
	}

	// Validate minimum shifts
	if (preferences.min_shifts > preferences.max_shifts) {
		throw new Error(
			'Die minimale Anzahl Schichten darf nicht größer sein als die maximale Anzahl.'
		);
	}

	const { data, error } = await supabase
		.from('member_preferences' as any)
		.upsert({
			festival_id: festivalId,
			member_id: memberId,
			magic_link_id: magicLinkId || null,
			station_preferences: preferences.station_preferences,
			shift_preferences: preferences.shift_preferences,
			min_shifts: preferences.min_shifts,
			max_shifts: preferences.max_shifts,
			availability_notes: preferences.availability_notes,
			updated_at: new Date().toISOString()
		})
		.select()
		.single();

	if (error) throw error;
	return data as any;
};

// Check for shift overlaps
const checkShiftOverlaps = async (shiftIds: string[]): Promise<string[]> => {
	if (shiftIds.length < 2) return [];

	const { data: shifts, error } = await supabase
		.from('station_shifts' as any)
		.select('id, name, start_date, start_time, end_date, end_time')
		.in('id', shiftIds);

	if (error) throw error;

	const overlapping: string[] = [];

	for (let i = 0; i < shifts.length; i++) {
		for (let j = i + 1; j < shifts.length; j++) {
			if (shiftsOverlap(shifts[i], shifts[j])) {
				overlapping.push(`${(shifts[i] as any).name} & ${(shifts[j] as any).name}`);
			}
		}
	}

	return overlapping;
};

// Check if two shifts overlap
const shiftsOverlap = (shift1: any, shift2: any): boolean => {
	const start1 = new Date(`${shift1.start_date}T${shift1.start_time}`);
	const end1 = new Date(`${shift1.end_date || shift1.start_date}T${shift1.end_time}`);
	const start2 = new Date(`${shift2.start_date}T${shift2.start_time}`);
	const end2 = new Date(`${shift2.end_date || shift2.start_date}T${shift2.end_time}`);

	return start1 < end2 && start2 < end1;
};

// Get all magic links for a festival
export const getMagicLinksForFestival = async (festivalId: string): Promise<MagicLink[]> => {
	const { data, error } = await supabase
		.from('magic_links' as any)
		.select(
			`
			*,
			members!magic_links_member_id_fkey(
				id,
				first_name,
				last_name,
				email
			)
		`
		)
		.eq('festival_id', festivalId)
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data as any;
};

// Get member preferences for a festival
export const getMemberPreferencesForFestival = async (
	festivalId: string
): Promise<MemberPreference[]> => {
	const { data, error } = await supabase
		.from('member_preferences' as any)
		.select(
			`
			*,
			members!member_preferences_member_id_fkey(
				id,
				first_name,
				last_name,
				email
			)
		`
		)
		.eq('festival_id', festivalId)
		.order('submitted_at', { ascending: false });

	if (error) throw error;
	return data as any;
};

// Send magic link via email
export const sendMagicLinkEmail = async (
	magicLink: MagicLink,
	memberName: string,
	festivalName: string,
	baseUrl: string
): Promise<void> => {
	const link = `${baseUrl}/preferences/${magicLink.token}`;

	const emailContent = `
		<h2>Schichtplan-Präferenzen für ${festivalName}</h2>
		<p>Hallo ${memberName},</p>
		<p>Sie wurden eingeladen, Ihre Präferenzen für das Festival "${festivalName}" abzugeben.</p>
		<p>Klicken Sie auf den folgenden Link, um Ihre Stations- und Schichtwünsche anzugeben:</p>
		<p><a href="${link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Präferenzen abgeben</a></p>
		<p>Der Link ist 7 Tage gültig.</p>
		<p>Falls der Button nicht funktioniert, kopieren Sie diesen Link: ${link}</p>
		<p>Vielen Dank!</p>
	`;

	// await sendEmail({
	// 	to: memberName, // This would need the actual email address
	// 	subject: `Schichtplan-Präferenzen für ${festivalName}`,
	// 	html: emailContent
	// });
	console.log('Email would be sent:', {
		to: memberName,
		subject: `Schichtplan-Präferenzen für ${festivalName}`,
		html: emailContent
	});
};

// Delete magic link
export const deleteMagicLink = async (id: string): Promise<void> => {
	const { error } = await supabase
		.from('magic_links' as any)
		.delete()
		.eq('id', id);

	if (error) throw error;
};
