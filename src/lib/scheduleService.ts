import { supabase } from '@/integrations/supabase/client';

export interface ScheduleDay {
	id: string;
	festival_id: string;
	date: string;
	label: string | null;
	is_auto_generated: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface SchedulePhase {
	id: string;
	schedule_day_id: string;
	festival_id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

/**
 * Ein Ablauf-Eintrag gehört dem Tag; die Phase ist ein optionaler Feinschnitt
 * (ADR 0007). Darum `schedule_day_id` pflicht und `schedule_phase_id` nullable —
 * und kein `sort_order` mehr: gereiht wird nach Startzeit, nicht von Hand.
 */
export interface ScheduleEntry {
	id: string;
	schedule_day_id: string;
	schedule_phase_id: string | null;
	festival_id: string;
	title: string;
	type: 'task' | 'program';
	start_time: string | null;
	end_time: string | null;
	responsible_helper_id: string | null;
	status: 'open' | 'done' | null;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface ScheduleEntryWithHelper extends ScheduleEntry {
	responsible_helper?: { id: string; first_name: string; last_name: string } | null;
}

/**
 * Die gelesene Form des Ablaufplans: alle Einträge des Tages nebeneinander, die
 * Phasen nur als Gruppen-Metadaten. Die Gruppierung Tag → Phase macht die
 * Ansicht ({@link groupEntriesByPhase}), nicht die Abfrage — ein Eintrag ohne
 * Phase hätte in einer verschachtelten Form keinen Platz.
 */
export interface ScheduleDayWithEntries extends ScheduleDay {
	phases: SchedulePhase[];
	entries: ScheduleEntryWithHelper[];
}

// --- Schedule Days ---

export const getScheduleDays = async (festivalId: string): Promise<ScheduleDayWithEntries[]> => {
	const { data, error } = await (supabase as any)
		.from('schedule_days')
		.select('*, phases:schedule_phases(*), entries:schedule_entries(*, responsible_helper:festival_helpers!responsible_helper_id(id, first_name, last_name))')
		.eq('festival_id', festivalId)
		.order('date')
		.order('sort_order', { referencedTable: 'phases' })
		// Die Uhrzeit reiht, bei Gleichstand das Anlegedatum; ohne Zeit ans Ende
		// (ADR 0007). `sort_order` der Einträge wird nicht mehr gelesen.
		.order('start_time', { referencedTable: 'entries', nullsFirst: false })
		.order('created_at', { referencedTable: 'entries' });

	if (error) throw error;
	return data || [];
};

const GERMAN_WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export const initializeScheduleDays = async (
	festivalId: string,
	startDate: string,
	endDate?: string
): Promise<ScheduleDay[]> => {
	const start = new Date(startDate);
	const end = endDate ? new Date(endDate) : start;
	const days: { festival_id: string; date: string; label: string; is_auto_generated: boolean; sort_order: number }[] = [];

	let current = new Date(start);
	let sortOrder = 0;
	while (current <= end) {
		const weekday = GERMAN_WEEKDAYS[current.getDay()];
		const dateStr = current.toISOString().split('T')[0];
		days.push({
			festival_id: festivalId,
			date: dateStr,
			label: weekday,
			is_auto_generated: true,
			sort_order: sortOrder,
		});
		current.setDate(current.getDate() + 1);
		sortOrder++;
	}

	if (days.length === 0) return [];

	const { data, error } = await (supabase as any)
		.from('schedule_days')
		.upsert(days, { onConflict: 'festival_id,date', ignoreDuplicates: true })
		.select();

	if (error) throw error;
	return data || [];
};

export const createScheduleDay = async (
	data: Omit<ScheduleDay, 'id' | 'created_at' | 'updated_at'>
): Promise<ScheduleDay> => {
	const { data: result, error } = await (supabase as any)
		.from('schedule_days')
		.insert(data)
		.select()
		.single();

	if (error) throw error;
	return result;
};

export const updateScheduleDay = async (
	id: string,
	updates: Partial<ScheduleDay>
): Promise<ScheduleDay> => {
	const { data, error } = await (supabase as any)
		.from('schedule_days')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const deleteScheduleDay = async (id: string): Promise<void> => {
	const { error } = await (supabase as any)
		.from('schedule_days')
		.delete()
		.eq('id', id);

	if (error) throw error;
};

// --- Schedule Phases ---

export const createSchedulePhase = async (
	data: Omit<SchedulePhase, 'id' | 'created_at' | 'updated_at'>
): Promise<SchedulePhase> => {
	const { data: result, error } = await (supabase as any)
		.from('schedule_phases')
		.insert(data)
		.select()
		.single();

	if (error) throw error;
	return result;
};

export const updateSchedulePhase = async (
	id: string,
	updates: Partial<SchedulePhase>
): Promise<SchedulePhase> => {
	const { data, error } = await (supabase as any)
		.from('schedule_phases')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const deleteSchedulePhase = async (id: string): Promise<void> => {
	const { error } = await (supabase as any)
		.from('schedule_phases')
		.delete()
		.eq('id', id);

	if (error) throw error;
};

// --- Schedule Entries ---

export const createScheduleEntry = async (
	data: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<ScheduleEntry> => {
	const { data: result, error } = await (supabase as any)
		.from('schedule_entries')
		.insert(data)
		.select()
		.single();

	if (error) throw error;
	return result;
};

export const updateScheduleEntry = async (
	id: string,
	updates: Partial<ScheduleEntry>
): Promise<ScheduleEntry> => {
	const { data, error } = await (supabase as any)
		.from('schedule_entries')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
};

export const deleteScheduleEntry = async (id: string): Promise<void> => {
	const { error } = await (supabase as any)
		.from('schedule_entries')
		.delete()
		.eq('id', id);

	if (error) throw error;
};

/**
 * Nur die Phasen werden von Hand gereiht — sie tragen keine Uhrzeit. Das
 * Gegenstück für Einträge entfällt mit ADR 0007.
 */
export const reorderSchedulePhases = async (
	phases: { id: string; sort_order: number }[]
): Promise<void> => {
	for (const phase of phases) {
		const { error } = await (supabase as any)
			.from('schedule_phases')
			.update({ sort_order: phase.sort_order, updated_at: new Date().toISOString() })
			.eq('id', phase.id);
		if (error) throw error;
	}
};
