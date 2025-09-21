import { supabase } from "@/integrations/supabase/client";
import { generateFestivalPlan, FestivalData } from "./festivalPlanGenerator";

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

export interface ChecklistItem {
  id: string;
  festival_id: string;
  task: string;
  completed: boolean;
  due_date: string;
  category: string;
  priority: 'green' | 'yellow' | 'red';
}

export interface StationAssignment {
  id: string;
  festival_id: string;
  bereich: string;
  zeit: string;
  personen: string[];
  bedarf: number;
  status: 'complete' | 'incomplete';
  priority: 'green' | 'yellow' | 'red';
}

export interface Resource {
  id: string;
  festival_id: string;
  item: string;
  menge: string;
  einheit: string;
  status: 'bestellt' | 'offen';
  lieferant: string;
  kosten: string;
  priority: 'green' | 'yellow' | 'red';
}

export async function createFestival(festivalData: FestivalData, userId: string): Promise<string> {
  // Get user's members for shift generation
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Create festival record
  const { data: festival, error: festivalError } = await supabase
    .from('festivals')
    .insert({
      user_id: userId,
      type: festivalData.type || 'general',
      start_date: festivalData.startDate,
      end_date: festivalData.endDate,
      visitor_count: festivalData.visitorCount,
      name: festivalData.name
    })
    .select()
    .single();

  if (festivalError || !festival) {
    throw new Error('Fehler beim Erstellen des Festes');
  }

  // Generate plan data with members
  const plan = generateFestivalPlan(festivalData, members || []);

  // Insert checklist items
  const checklistInserts = plan.checklist.map(item => ({
    festival_id: festival.id,
    task: item.task,
    due_date: item.dueDate,
    category: item.category,
    priority: item.priority,
    completed: false
  }));

  const { error: checklistError } = await supabase
    .from('checklist_items')
    .insert(checklistInserts);

  if (checklistError) {
    throw new Error('Fehler beim Erstellen der Checkliste');
  }

  // Insert shifts
  const shiftInserts = plan.shifts.map(shift => ({
    festival_id: festival.id,
    name: shift.name,
    start_date: shift.start_date,
    start_time: shift.start_time,
    end_time: shift.end_time
  }));

  const { data: insertedShifts, error: shiftError } = await supabase
    .from('shifts')
    .insert(shiftInserts)
    .select();

  if (shiftError) {
    throw new Error('Fehler beim Erstellen der Schichten');
  }

  // Insert stations  
  const stationInserts = plan.shiftStations.map(station => ({
    festival_id: festival.id,
    name: station.name,
    required_people: station.required_people,
    description: station.description
  }));

  const { data: insertedStations, error: stationError } = await supabase
    .from('stations')
    .insert(stationInserts)
    .select();

  if (stationError) {
    throw new Error('Fehler beim Erstellen der Stationen');
  }

  // Create shift assignments for each shift-station combination
  const assignmentInserts: any[] = [];
  if (insertedShifts && insertedStations) {
    for (const shift of insertedShifts) {
      for (const station of insertedStations) {
        // Create empty assignments for each required position
        for (let position = 1; position <= station.required_people; position++) {
          assignmentInserts.push({
            festival_id: festival.id,
            shift_id: shift.id,
            station_id: station.id,
            position: position,
            member_id: null // Initially no member assigned
          });
        }
      }
    }

    const { error: assignmentError } = await supabase
      .from('shift_assignments')
      .insert(assignmentInserts);

    if (assignmentError) {
      throw new Error('Fehler beim Erstellen der Schichtzuordnungen');
    }
  }

  // Insert resources
  const resourceInserts = plan.resources.map(resource => ({
    festival_id: festival.id,
    item: resource.item,
    menge: resource.menge,
    einheit: resource.einheit,
    status: resource.status,
    lieferant: resource.lieferant,
    kosten: resource.kosten,
    priority: resource.priority
  }));

  const { error: resourceError } = await supabase
    .from('resources')
    .insert(resourceInserts);

  if (resourceError) {
    throw new Error('Fehler beim Erstellen der Ressourcen');
  }

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

export async function getFestivalChecklist(festivalId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('festival_id', festivalId)
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error('Fehler beim Laden der Checkliste');
  }

  return (data || []) as ChecklistItem[];
}

export async function getFestivalStations(festivalId: string): Promise<StationAssignment[]> {
  const { data, error } = await supabase
    .from('station_assignments')
    .select('*')
    .eq('festival_id', festivalId);

  if (error) {
    throw new Error('Fehler beim Laden der Stationen');
  }

  return (data || []) as StationAssignment[];
}

export async function getFestivalResources(festivalId: string): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('festival_id', festivalId);

  if (error) {
    throw new Error('Fehler beim Laden der Ressourcen');
  }

  return (data || []) as Resource[];
}

export async function updateChecklistItem(itemId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update({ completed })
    .eq('id', itemId);

  if (error) {
    throw new Error('Fehler beim Aktualisieren der Checkliste');
  }
}

export async function updateStationAssignment(stationId: string, updates: Partial<StationAssignment>): Promise<void> {
  const { error } = await supabase
    .from('station_assignments')
    .update(updates)
    .eq('id', stationId);

  if (error) {
    throw new Error('Fehler beim Aktualisieren der Station');
  }
}

export async function updateResource(resourceId: string, updates: Partial<Resource>): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', resourceId);

  if (error) {
    throw new Error('Fehler beim Aktualisieren der Ressource');
  }
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

  // 2. Delete shifts
  const { error: shiftError } = await supabase
    .from('shifts')
    .delete()
    .eq('festival_id', festivalId);

  if (shiftError) {
    throw new Error('Fehler beim Löschen der Schichten');
  }

  // 3. Delete stations
  const { error: stationError } = await supabase
    .from('stations')
    .delete()
    .eq('festival_id', festivalId);

  if (stationError) {
    throw new Error('Fehler beim Löschen der Stationen');
  }

  // 4. Delete checklist items
  const { error: checklistError } = await supabase
    .from('checklist_items')
    .delete()
    .eq('festival_id', festivalId);

  if (checklistError) {
    throw new Error('Fehler beim Löschen der Checkliste');
  }

  // 5. Delete resources
  const { error: resourceError } = await supabase
    .from('resources')
    .delete()
    .eq('festival_id', festivalId);

  if (resourceError) {
    throw new Error('Fehler beim Löschen der Ressourcen');
  }

  // 6. Delete station assignments (old system)
  const { error: stationAssignmentError } = await supabase
    .from('station_assignments')
    .delete()
    .eq('festival_id', festivalId);

  if (stationAssignmentError) {
    throw new Error('Fehler beim Löschen der Stationszuordnungen');
  }

  // 7. Finally delete the festival
  const { error: festivalError } = await supabase
    .from('festivals')
    .delete()
    .eq('id', festivalId);

  if (festivalError) {
    throw new Error('Fehler beim Löschen des Festes');
  }
}

function getFestivalTypeName(type: string): string {
  const names: { [key: string]: string } = {
    feuerwehr: 'Feuerwehrfest',
    musik: 'Musikfest',
    kirtag: 'Kirtag',
    wein: 'Weinfest',
    weihnachten: 'Weihnachtsmarkt'
  };
  return names[type] || 'Fest';
}