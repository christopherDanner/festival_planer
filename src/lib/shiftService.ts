import { supabase } from '@/integrations/supabase/client';

export interface StationShift {
	id: string;
	station_id: string;
	festival_id: string;
	name: string;
	start_date: string;
	start_time: string;
	end_time: string;
	created_at: string;
	updated_at: string;
}

export interface Station {
	id: string;
	festival_id: string;
	name: string;
	required_people: number;
	description?: string;
	created_at: string;
	updated_at: string;
}

export interface StationShiftWithStation extends StationShift {
	station?: Station;
}

export interface ShiftAssignment {
	id: string;
	festival_id: string;
	station_shift_id: string;
	member_id?: string;
	position: number;
	created_at: string;
	updated_at: string;
}

export interface ShiftAssignmentWithMember extends ShiftAssignment {
	member?: {
		id: string;
		first_name: string;
		last_name: string;
	};
	station_shift?: StationShift;
}

// Station Shift functions
export const getStationShifts = async (festivalId: string): Promise<StationShiftWithStation[]> => {
	const { data, error } = await supabase
		.from('station_shifts')
		.select(`
			*,
			station:stations(*)
		`)
		.eq('festival_id', festivalId)
		.order('start_date', { ascending: true })
		.order('start_time', { ascending: true });

	if (error) throw error;
	return data || [];
};

export const getStationShiftsByStation = async (stationId: string): Promise<StationShift[]> => {
	const { data, error } = await supabase
		.from('station_shifts')
		.select('*')
		.eq('station_id', stationId)
		.order('start_date', { ascending: true })
		.order('start_time', { ascending: true });

	if (error) throw error;
	return data || [];
};

export const createStationShift = async (
	shiftData: Omit<StationShift, 'id' | 'created_at' | 'updated_at'>
): Promise<StationShift> => {
	const { data, error } = await supabase.from('station_shifts').insert(shiftData).select().single();

	if (error) throw error;
	return data;
};

export const updateStationShift = async (id: string, updates: Partial<StationShift>): Promise<StationShift> => {
	const { data, error } = await supabase
		.from('station_shifts')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const deleteStationShift = async (id: string): Promise<void> => {
	const { error } = await supabase.from('station_shifts').delete().eq('id', id);

	if (error) throw error;
};

// Station functions
export const getStations = async (festivalId: string): Promise<Station[]> => {
	const { data, error } = await supabase
		.from('stations')
		.select('*')
		.eq('festival_id', festivalId)
		.order('name');

	if (error) throw error;
	return data || [];
};

export const createStation = async (
	stationData: Omit<Station, 'id' | 'created_at' | 'updated_at'>
): Promise<Station> => {
	const { data, error } = await supabase.from('stations').insert(stationData).select().single();

	if (error) throw error;
	return data;
};

export const updateStation = async (id: string, updates: Partial<Station>): Promise<Station> => {
	const { data, error } = await supabase
		.from('stations')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const deleteStation = async (id: string): Promise<void> => {
	const { error } = await supabase.from('stations').delete().eq('id', id);

	if (error) throw error;
};

// Assignment functions
export const getShiftAssignments = async (
	festivalId: string
): Promise<ShiftAssignmentWithMember[]> => {
	const { data, error } = await supabase
		.from('shift_assignments')
		.select(
			`
      *,
      member:members(id, first_name, last_name),
      station_shift:station_shifts(*)
    `
		)
		.eq('festival_id', festivalId);

	if (error) throw error;
	return data || [];
};

export const createAssignment = async (
	assignmentData: Omit<ShiftAssignment, 'id' | 'created_at' | 'updated_at'>
): Promise<ShiftAssignment> => {
	const { data, error } = await supabase
		.from('shift_assignments')
		.insert(assignmentData)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const updateAssignment = async (
	id: string,
	updates: Partial<ShiftAssignment>
): Promise<ShiftAssignment> => {
	const { data, error } = await supabase
		.from('shift_assignments')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const deleteAssignment = async (id: string): Promise<void> => {
	const { error } = await supabase.from('shift_assignments').delete().eq('id', id);

	if (error) throw error;
};

export const assignMemberToStationShift = async (
	festivalId: string,
	stationShiftId: string,
	memberId: string,
	position: number = 1
): Promise<ShiftAssignment> => {
	// Check if assignment already exists for this position
	const { data: existing, error } = await supabase
		.from('shift_assignments')
		.select('*')
		.eq('festival_id', festivalId)
		.eq('station_shift_id', stationShiftId)
		.eq('position', position)
		.maybeSingle();

	if (existing) {
		// Update existing assignment
		return updateAssignment(existing.id, { member_id: memberId });
	} else {
		// Create new assignment
		return createAssignment({
			festival_id: festivalId,
			station_shift_id: stationShiftId,
			member_id: memberId,
			position
		});
	}
};

export const removeMemberFromStationShift = async (
	festivalId: string,
	stationShiftId: string,
	memberId: string
): Promise<void> => {
	const { error } = await supabase
		.from('shift_assignments')
		.delete()
		.eq('festival_id', festivalId)
		.eq('station_shift_id', stationShiftId)
		.eq('member_id', memberId);

	if (error) throw error;
};
