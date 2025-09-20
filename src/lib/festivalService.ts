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
  // Create festival record
  const { data: festival, error: festivalError } = await supabase
    .from('festivals')
    .insert({
      user_id: userId,
      type: festivalData.type,
      start_date: festivalData.startDate,
      end_date: festivalData.endDate,
      visitor_count: festivalData.visitorCount,
      name: `${getFestivalTypeName(festivalData.type)} ${new Date(festivalData.startDate).toLocaleDateString('de-AT')}`
    })
    .select()
    .single();

  if (festivalError || !festival) {
    throw new Error('Fehler beim Erstellen des Festes');
  }

  // Generate plan data
  const plan = generateFestivalPlan(festivalData);

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

  // Insert station assignments
  const stationInserts = plan.stations.map(station => ({
    festival_id: festival.id,
    bereich: station.bereich,
    zeit: station.zeit,
    personen: station.personen,
    bedarf: station.bedarf,
    status: station.status,
    priority: station.priority
  }));

  const { error: stationError } = await supabase
    .from('station_assignments')
    .insert(stationInserts);

  if (stationError) {
    throw new Error('Fehler beim Erstellen der Stationen');
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