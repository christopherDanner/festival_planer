import { supabase } from '@/integrations/supabase/client';

export interface Station {
	id: string;
	festival_id: string;
	name: string;
	required_people: number;
	description?: string;
	responsible_member_id?: string | null;
	responsible_member?: { id: string; first_name: string; last_name: string } | null;
	created_at: string;
	updated_at: string;
}

export interface StationMember {
	id: string;
	festival_id: string;
	station_id: string;
	member_id: string;
	created_at: string;
}

export interface StationMemberWithDetails extends StationMember {
	member?: { id: string; first_name: string; last_name: string };
}

export interface ShiftAssignment {
	id: string;
	festival_id: string;
	station_shift_id: string;
	station_id: string;
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
}

export interface StationShift {
	id: string;
	festival_id: string;
	station_id: string;
	name: string;
	start_date: string;
	start_time: string;
	end_date?: string;
	end_time: string;
	required_people: number;
	created_at: string;
	updated_at: string;
}

// Station functions
export const getStations = async (festivalId: string): Promise<Station[]> => {
	const { data, error } = await supabase
		.from('stations')
		.select('*, responsible_member:members!responsible_member_id(id, first_name, last_name)')
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
      member:members(id, first_name, last_name)
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

// Station Shift functions
export const getStationShifts = async (festivalId: string): Promise<StationShift[]> => {
	const { data, error } = await supabase
		.from('station_shifts')
		.select('*')
		.eq('festival_id', festivalId)
		.order('start_date', { ascending: true })
		.order('start_time', { ascending: true });

	if (error) throw error;
	return data || [];
};

export const createStationShift = async (
	stationShiftData: Omit<StationShift, 'id' | 'created_at' | 'updated_at'>
): Promise<StationShift> => {
	// Only include end_date if it has a value
	const insertData: any = { ...stationShiftData };
	if (!insertData.end_date || insertData.end_date === '') {
		delete insertData.end_date;
	}

	const { data, error } = await supabase
		.from('station_shifts')
		.insert(insertData)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const updateStationShift = async (
	id: string,
	updates: Partial<StationShift>
): Promise<StationShift> => {
	// Only include end_date if it has a value
	const updateData: any = { ...updates };
	if (updateData.end_date === '') {
		updateData.end_date = null;
	}

	const { data, error } = await supabase
		.from('station_shifts')
		.update(updateData)
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

// Station Shift Assignment functions
export const assignMemberToStationShift = async (
	festivalId: string,
	stationShiftId: string,
	memberId: string,
	position: number = 1
): Promise<ShiftAssignment> => {
	// Get the station shift to get the station_id
	const { data: stationShift, error: shiftError } = await supabase
		.from('station_shifts')
		.select('station_id')
		.eq('id', stationShiftId)
		.single();

	if (shiftError || !stationShift) {
		throw new Error('Station shift not found');
	}

	// Check if member is already assigned to this station shift
	const { data: existingMemberAssignment, error: memberCheckError } = await supabase
		.from('shift_assignments')
		.select('*')
		.eq('festival_id', festivalId)
		.eq('station_shift_id', stationShiftId)
		.eq('station_id', stationShift.station_id)
		.eq('member_id', memberId)
		.maybeSingle();

	if (memberCheckError) {
		throw memberCheckError;
	}

	if (existingMemberAssignment) {
		// Member is already assigned, update the position
		return updateAssignment(existingMemberAssignment.id, { position });
	}

	// Check if position is already taken by another member
	const { data: existingPositionAssignment, error: positionCheckError } = await supabase
		.from('shift_assignments')
		.select('*')
		.eq('festival_id', festivalId)
		.eq('station_shift_id', stationShiftId)
		.eq('station_id', stationShift.station_id)
		.eq('position', position)
		.maybeSingle();

	if (positionCheckError) {
		throw positionCheckError;
	}

	if (existingPositionAssignment) {
		// Position is taken, create new assignment with next available position
		const { data: allAssignments, error: allAssignmentsError } = await supabase
			.from('shift_assignments')
			.select('position')
			.eq('festival_id', festivalId)
			.eq('station_shift_id', stationShiftId)
			.eq('station_id', stationShift.station_id)
			.order('position');

		if (allAssignmentsError) {
			throw allAssignmentsError;
		}

		const usedPositions = allAssignments?.map((a) => a.position) || [];
		let nextPosition = 1;
		for (const pos of usedPositions) {
			if (nextPosition === pos) {
				nextPosition++;
			} else {
				break;
			}
		}

		return createAssignment({
			festival_id: festivalId,
			station_shift_id: stationShiftId,
			station_id: stationShift.station_id,
			member_id: memberId,
			position: nextPosition
		});
	} else {
		// Position is free, create new assignment
		return createAssignment({
			festival_id: festivalId,
			station_shift_id: stationShiftId,
			station_id: stationShift.station_id,
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
	// Get the station shift to get the station_id
	const { data: stationShift, error: shiftError } = await supabase
		.from('station_shifts')
		.select('station_id')
		.eq('id', stationShiftId)
		.single();

	if (shiftError || !stationShift) {
		throw new Error('Station shift not found');
	}

	const { error } = await supabase
		.from('shift_assignments')
		.delete()
		.eq('festival_id', festivalId)
		.eq('station_shift_id', stationShiftId)
		.eq('station_id', stationShift.station_id)
		.eq('member_id', memberId);

	if (error) throw error;
};

// Station Member functions (direct assignment without shift)
export const getStationMembers = async (
	festivalId: string
): Promise<StationMemberWithDetails[]> => {
	const { data, error } = await supabase
		.from('station_members')
		.select('*, member:members(id, first_name, last_name)')
		.eq('festival_id', festivalId);

	if (error) throw error;
	return data || [];
};

export const assignMemberToStation = async (
	festivalId: string,
	stationId: string,
	memberId: string
): Promise<StationMember> => {
	const { data, error } = await supabase
		.from('station_members')
		.insert({ festival_id: festivalId, station_id: stationId, member_id: memberId })
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const removeMemberFromStation = async (
	stationId: string,
	memberId: string
): Promise<void> => {
	const { error } = await supabase
		.from('station_members')
		.delete()
		.eq('station_id', stationId)
		.eq('member_id', memberId);

	if (error) throw error;
};
