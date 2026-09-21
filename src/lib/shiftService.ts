import { supabase } from '@/integrations/supabase/client';

/** Kurzform eines Helfers, wie ihn die Verknüpfungs-Abfragen mitbringen. */
export interface HelperRef {
	id: string;
	first_name: string;
	last_name: string;
}

const HELPER_REF = 'id, first_name, last_name';

export interface Station {
	id: string;
	festival_id: string;
	name: string;
	required_people: number;
	description?: string;
	responsible_helper_id?: string | null;
	responsible_helper?: HelperRef | null;
	created_at: string;
	updated_at: string;
}

/** Ein Helfer, der einer Station ohne bestimmte Schicht zugeteilt ist. */
export interface StationHelper {
	id: string;
	festival_id: string;
	station_id: string;
	helper_id: string;
	created_at: string;
}

export interface StationHelperWithDetails extends StationHelper {
	helper?: HelperRef;
}

export interface ShiftAssignment {
	id: string;
	festival_id: string;
	station_shift_id: string;
	station_id: string;
	helper_id?: string;
	position: number;
	created_at: string;
	updated_at: string;
}

export interface ShiftAssignmentWithHelper extends ShiftAssignment {
	helper?: HelperRef;
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
		.select(`*, responsible_helper:festival_helpers!responsible_helper_id(${HELPER_REF})`)
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
): Promise<ShiftAssignmentWithHelper[]> => {
	const { data, error } = await supabase
		.from('shift_assignments')
		.select(`*, helper:festival_helpers!helper_id(${HELPER_REF})`)
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
export const assignHelperToStationShift = async (
	festivalId: string,
	stationShiftId: string,
	helperId: string,
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

	// Check if the helper is already assigned to this station shift
	const { data: existingHelperAssignment, error: helperCheckError } = await supabase
		.from('shift_assignments')
		.select('*')
		.eq('festival_id', festivalId)
		.eq('station_shift_id', stationShiftId)
		.eq('station_id', stationShift.station_id)
		.eq('helper_id', helperId)
		.maybeSingle();

	if (helperCheckError) {
		throw helperCheckError;
	}

	if (existingHelperAssignment) {
		// Helper is already assigned, update the position
		return updateAssignment(existingHelperAssignment.id, { position });
	}

	// Check if position is already taken by another helper
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
			helper_id: helperId,
			position: nextPosition
		});
	} else {
		// Position is free, create new assignment
		return createAssignment({
			festival_id: festivalId,
			station_shift_id: stationShiftId,
			station_id: stationShift.station_id,
			helper_id: helperId,
			position
		});
	}
};

export const removeHelperFromStationShift = async (
	festivalId: string,
	stationShiftId: string,
	helperId: string
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
		.eq('helper_id', helperId);

	if (error) throw error;
};

// Station Helper functions (direct assignment without shift)
export const getStationHelpers = async (
	festivalId: string
): Promise<StationHelperWithDetails[]> => {
	const { data, error } = await supabase
		.from('station_members')
		.select(`*, helper:festival_helpers!helper_id(${HELPER_REF})`)
		.eq('festival_id', festivalId);

	if (error) throw error;
	return data || [];
};

export const assignHelperToStation = async (
	festivalId: string,
	stationId: string,
	helperId: string
): Promise<StationHelper> => {
	const { data, error } = await supabase
		.from('station_members')
		.insert({ festival_id: festivalId, station_id: stationId, helper_id: helperId })
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const removeHelperFromStation = async (
	stationId: string,
	helperId: string
): Promise<void> => {
	const { error } = await supabase
		.from('station_members')
		.delete()
		.eq('station_id', stationId)
		.eq('helper_id', helperId);

	if (error) throw error;
};

// Bulk insert helpers
export const createStationsBulk = async (
	stations: Omit<Station, 'id' | 'created_at' | 'updated_at' | 'responsible_helper'>[]
): Promise<Station[]> => {
	const { data, error } = await supabase
		.from('stations')
		.insert(stations)
		.select(`*, responsible_helper:festival_helpers!responsible_helper_id(${HELPER_REF})`);
	if (error) throw error;
	return data || [];
};

export const createStationShiftsBulk = async (
	shifts: Omit<StationShift, 'id' | 'created_at' | 'updated_at'>[]
): Promise<StationShift[]> => {
	const cleaned = shifts.map(s => {
		const copy: any = { ...s };
		if (!copy.end_date) delete copy.end_date;
		return copy;
	});
	const { data, error } = await supabase
		.from('station_shifts')
		.insert(cleaned)
		.select();
	if (error) throw error;
	return data || [];
};
