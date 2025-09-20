import { supabase } from "@/integrations/supabase/client";

export interface Member {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  tags: string[];
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
  tags: string[];
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
export const createMember = async (memberData: Omit<Member, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('members')
    .insert({
      ...memberData,
      user_id: user.id,
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
  const { error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId);

  if (error) {
    throw new Error(error.message);
  }
};

// Delete a member
export const deleteMember = async (memberId: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId);

  if (error) {
    throw new Error(error.message);
  }
};

// Bulk import members
export const importMembers = async (members: MemberImportData[]): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const membersWithUserId = members.map(member => ({
    ...member,
    user_id: user.id,
  }));

  const { error } = await supabase
    .from('members')
    .insert(membersWithUserId);

  if (error) {
    throw new Error(error.message);
  }
};

// Get members by tags
export const getMembersByTags = async (tags: string[]): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .contains('tags', tags)
    .eq('is_active', true)
    .order('last_name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

// Get available members (not assigned to specific station)
export const getAvailableMembers = async (stationId?: string): Promise<Member[]> => {
  let query = supabase
    .from('members')
    .select('*')
    .eq('is_active', true);

  if (stationId) {
    // Get members not assigned to this specific station
    const { data: assignedMembers } = await supabase
      .from('station_member_assignments')
      .select('member_id')
      .eq('station_id', stationId);
    
    const assignedIds = assignedMembers?.map(a => a.member_id) || [];
    
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