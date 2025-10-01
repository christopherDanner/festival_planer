import { supabase } from '@/integrations/supabase/client';

export interface Member {
	id: string;
	user_id: string;
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

export interface MemberImportData {
	first_name: string;
	last_name: string;
	phone?: string;
	email?: string;
	notes?: string;
}

// Get all members for the current user
export const getMembers = async (): Promise<Member[]> => {
	const { data, error } = await supabase
		.from('members')
		.select('*')
		.order('last_name', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
};

// Create a new member
export const createMember = async (
	memberData: Omit<Member, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<string> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('User not authenticated');

	const { data, error } = await supabase
		.from('members')
		.insert({
			...memberData,
			user_id: user.id
		})
		.select('id')
		.single();

	if (error) {
		throw new Error(error.message);
	}

	return data.id;
};

// Update a member
export const updateMember = async (memberId: string, updates: Partial<Member>): Promise<void> => {
	const { error } = await supabase.from('members').update(updates).eq('id', memberId);

	if (error) {
		throw new Error(error.message);
	}
};

// Delete a member
export const deleteMember = async (memberId: string): Promise<void> => {
	const { error } = await supabase.from('members').delete().eq('id', memberId);

	if (error) {
		throw new Error(error.message);
	}
};

// Bulk import members
export const importMembers = async (members: MemberImportData[]): Promise<void> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('User not authenticated');

	const membersWithUserId = members.map((member) => ({
		...member,
		user_id: user.id
	}));

	const { error } = await supabase.from('members').insert(membersWithUserId);

	if (error) {
		throw new Error(error.message);
	}
};

// Get available members (not assigned to specific station)
export const getAvailableMembers = async (stationId?: string): Promise<Member[]> => {
	let query = supabase.from('members').select('*').eq('is_active', true);

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

// Update member station preferences for a specific festival
export const updateMemberStationPreferences = async (
	festivalId: string,
	memberId: string,
	stationPreferences: string[]
): Promise<void> => {
	// Use upsert with proper conflict resolution
	const { error } = await (supabase as any).from('festival_member_preferences').upsert(
		{
			festival_id: festivalId,
			member_id: memberId,
			station_preferences: stationPreferences
		},
		{
			onConflict: 'festival_id,member_id'
		}
	);

	if (error) {
		throw new Error(error.message);
	}
};

// Update member shift preferences for a specific festival
export const updateMemberShiftPreferences = async (
	festivalId: string,
	memberId: string,
	shiftPreferences: string[]
): Promise<void> => {
	// Use upsert with proper conflict resolution
	const { error } = await (supabase as any).from('festival_member_preferences').upsert(
		{
			festival_id: festivalId,
			member_id: memberId,
			shift_preferences: shiftPreferences
		},
		{
			onConflict: 'festival_id,member_id'
		}
	);

	if (error) {
		throw new Error(error.message);
	}
};

// Update both station and shift preferences
export const updateMemberPreferences = async (
	festivalId: string,
	memberId: string,
	stationPreferences: string[],
	shiftPreferences: string[]
): Promise<void> => {
	// Use upsert with proper conflict resolution
	const { error } = await (supabase as any).from('festival_member_preferences').upsert(
		{
			festival_id: festivalId,
			member_id: memberId,
			station_preferences: stationPreferences,
			shift_preferences: shiftPreferences
		},
		{
			onConflict: 'festival_id,member_id'
		}
	);

	if (error) {
		throw new Error(error.message);
	}
};

// Get member station preferences for a specific festival
export const getMemberStationPreferences = async (
	festivalId: string,
	memberId: string
): Promise<string[]> => {
	const { data, error } = await (supabase as any)
		.from('festival_member_preferences')
		.select('station_preferences')
		.eq('festival_id', festivalId)
		.eq('member_id', memberId)
		.single();

	if (error && error.code !== 'PGRST116') {
		// PGRST116 = no rows found
		throw new Error(error.message);
	}

	return data?.station_preferences || [];
};

// Get member shift preferences for a specific festival
export const getMemberShiftPreferences = async (
	festivalId: string,
	memberId: string
): Promise<string[]> => {
	const { data, error } = await (supabase as any)
		.from('festival_member_preferences')
		.select('shift_preferences')
		.eq('festival_id', festivalId)
		.eq('member_id', memberId)
		.single();

	if (error && error.code !== 'PGRST116') {
		// PGRST116 = no rows found
		throw new Error(error.message);
	}

	return data?.shift_preferences || [];
};

// Get all member station preferences for a festival
export const getAllFestivalMemberPreferences = async (
	festivalId: string
): Promise<Record<string, string[]>> => {
	const { data, error } = await (supabase as any)
		.from('festival_member_preferences')
		.select('member_id, station_preferences')
		.eq('festival_id', festivalId);

	if (error) {
		throw new Error(error.message);
	}

	const preferences: Record<string, string[]> = {};
	data?.forEach((item: any) => {
		preferences[item.member_id] = item.station_preferences || [];
	});

	return preferences;
};

// Get all member preferences (both station and shift) for a festival in one request
export const getAllFestivalMemberPreferencesComplete = async (
	festivalId: string
): Promise<{
	stationPreferences: Record<string, string[]>;
	shiftPreferences: Record<string, string[]>;
}> => {
	// Use the existing function for station preferences
	const stationPreferences = await getAllFestivalMemberPreferences(festivalId);

	// For shift preferences, we'll need to make individual calls for now
	// This is still better than the previous approach as we're not doing it in a loop
	const shiftPreferences: Record<string, string[]> = {};

	// Get all members first to know which ones to check
	const { data: members, error: membersError } = await (supabase as any)
		.from('members')
		.select('id')
		.eq('is_active', true);

	if (membersError) {
		throw new Error(membersError.message);
	}

	// Load shift preferences for all members in parallel
	const shiftPrefPromises = members.map(async (member) => {
		try {
			const prefs = await getMemberShiftPreferences(festivalId, member.id);
			return { memberId: member.id, preferences: prefs };
		} catch (error) {
			return { memberId: member.id, preferences: [] };
		}
	});

	const shiftPrefResults = await Promise.all(shiftPrefPromises);
	shiftPrefResults.forEach(({ memberId, preferences }) => {
		shiftPreferences[memberId] = preferences;
	});

	return { stationPreferences, shiftPreferences };
};
