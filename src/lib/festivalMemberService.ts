import { supabase } from '@/integrations/supabase/client';
import { Member, MemberImportData } from './memberService';

export interface FestivalMember {
	id: string;
	festival_id: string;
	first_name: string;
	last_name: string;
	phone?: string;
	email?: string;
	station_preferences?: string[];
	is_active: boolean;
	notes?: string;
	created_at: string;
	updated_at: string;
}

// Get all members for a specific festival
export const getFestivalMembers = async (festivalId: string): Promise<FestivalMember[]> => {
	const { data, error } = await supabase
		.from('festival_members')
		.select('*')
		.eq('festival_id', festivalId)
		.order('last_name', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
};

// Create a new festival member
export const createFestivalMember = async (
	festivalId: string,
	memberData: Omit<FestivalMember, 'id' | 'festival_id' | 'created_at' | 'updated_at'>
): Promise<string> => {
	const { data, error } = await supabase
		.from('festival_members')
		.insert({
			...memberData,
			festival_id: festivalId
		})
		.select('id')
		.single();

	if (error) {
		throw new Error(error.message);
	}

	return data.id;
};

// Update a festival member
export const updateFestivalMember = async (
	memberId: string, 
	updates: Partial<FestivalMember>
): Promise<void> => {
	const { error } = await supabase
		.from('festival_members')
		.update(updates)
		.eq('id', memberId);

	if (error) {
		throw new Error(error.message);
	}
};

// Delete a festival member
export const deleteFestivalMember = async (memberId: string): Promise<void> => {
	const { error } = await supabase
		.from('festival_members')
		.delete()
		.eq('id', memberId);

	if (error) {
		throw new Error(error.message);
	}
};

// Copy global members to festival (used when creating a new festival)
export const copyGlobalMembersToFestival = async (
	festivalId: string, 
	globalMembers: Member[]
): Promise<void> => {
	const festivalMembers = globalMembers.map(member => ({
		festival_id: festivalId,
		first_name: member.first_name,
		last_name: member.last_name,
		phone: member.phone,
		email: member.email,
		station_preferences: member.station_preferences || [],
		is_active: member.is_active,
		notes: member.notes
	}));

	const { error } = await supabase
		.from('festival_members')
		.insert(festivalMembers);

	if (error) {
		throw new Error(error.message);
	}
};

// Bulk import festival members
export const importFestivalMembers = async (
	festivalId: string,
	members: MemberImportData[]
): Promise<void> => {
	const membersWithFestivalId = members.map((member) => ({
		...member,
		festival_id: festivalId
	}));

	const { error } = await supabase
		.from('festival_members')
		.insert(membersWithFestivalId);

	if (error) {
		throw new Error(error.message);
	}
};

// Get available festival members (not assigned to specific station)
export const getAvailableFestivalMembers = async (
	festivalId: string,
	stationId?: string
): Promise<FestivalMember[]> => {
	let query = supabase
		.from('festival_members')
		.select('*')
		.eq('festival_id', festivalId)
		.eq('is_active', true);

	if (stationId) {
		// Get members not assigned to this specific station
		const { data: assignedMembers } = await supabase
			.from('station_member_assignments')
			.select('festival_member_id')
			.eq('station_id', stationId);

		const assignedIds = assignedMembers?.map((a) => a.festival_member_id) || [];

		if (assignedIds.length > 0) {
			query = query.not('id', 'in', `(${assignedIds.join(',')})`);
		}
	}

	const { data, error } = await query.order('last_name', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
};

// Update festival member station preferences
export const updateFestivalMemberStationPreferences = async (
	memberId: string,
	stationPreferences: string[]
): Promise<void> => {
	const { error } = await supabase
		.from('festival_members')
		.update({ station_preferences: stationPreferences })
		.eq('id', memberId);

	if (error) {
		throw new Error(error.message);
	}
};