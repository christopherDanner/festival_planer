import { supabase } from "@/integrations/supabase/client";

export interface Shift {
  id: string;
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

export interface ShiftAssignment {
  id: string;
  festival_id: string;
  shift_id: string;
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
    tags: string[];
  };
}

// Shift functions
export const getShifts = async (festivalId: string): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('festival_id', festivalId)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createShift = async (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>): Promise<Shift> => {
  const { data, error } = await supabase
    .from('shifts')
    .insert(shiftData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateShift = async (id: string, updates: Partial<Shift>): Promise<Shift> => {
  const { data, error } = await supabase
    .from('shifts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteShift = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id);

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

export const createStation = async (stationData: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> => {
  const { data, error } = await supabase
    .from('stations')
    .insert(stationData)
    .select()
    .single();

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
  const { error } = await supabase
    .from('stations')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Assignment functions
export const getShiftAssignments = async (festivalId: string): Promise<ShiftAssignmentWithMember[]> => {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select(`
      *,
      member:members(id, first_name, last_name, tags)
    `)
    .eq('festival_id', festivalId);

  if (error) throw error;
  return data || [];
};

export const createAssignment = async (assignmentData: Omit<ShiftAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<ShiftAssignment> => {
  const { data, error } = await supabase
    .from('shift_assignments')
    .insert(assignmentData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAssignment = async (id: string, updates: Partial<ShiftAssignment>): Promise<ShiftAssignment> => {
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
  const { error } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const assignMemberToShift = async (
  festivalId: string,
  shiftId: string,
  stationId: string,
  memberId: string,
  position: number = 1
): Promise<ShiftAssignment> => {
  // Check if assignment already exists for this position
  const { data: existing } = await supabase
    .from('shift_assignments')
    .select('*')
    .eq('festival_id', festivalId)
    .eq('shift_id', shiftId)
    .eq('station_id', stationId)
    .eq('position', position)
    .single();

  if (existing) {
    // Update existing assignment
    return updateAssignment(existing.id, { member_id: memberId });
  } else {
    // Create new assignment
    return createAssignment({
      festival_id: festivalId,
      shift_id: shiftId,
      station_id: stationId,
      member_id: memberId,
      position
    });
  }
};

export const removeMemberFromShift = async (
  festivalId: string,
  shiftId: string,
  stationId: string,
  memberId: string
): Promise<void> => {
  const { error } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('festival_id', festivalId)
    .eq('shift_id', shiftId)
    .eq('station_id', stationId)
    .eq('member_id', memberId);

  if (error) throw error;
};