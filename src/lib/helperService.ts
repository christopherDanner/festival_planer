import { supabase } from '@/integrations/supabase/client';

/**
 * Ein Helfer gehört dem Fest, in dem er steht (ADR 0005) — es gibt keinen
 * festübergreifenden Personenbestand und keine Helfer-Stammdatenseite. Darum
 * nennt jede Abfrage hier ein Fest, und seine Wünsche stehen als zwei Arrays
 * auf seiner eigenen Zeile statt in einer Verknüpfungstabelle.
 *
 * Bewusst nicht dabei (beide mit ADR 0005 gestrichen):
 *   * `user_id` — im gemeinsamen Arbeitsbereich ohne Bedeutung (ADR 0001).
 *   * `is_active` — wer nicht mitmacht, steht gar nicht erst in der
 *     Helferliste des Fests.
 */
export interface Helper {
	id: string;
	festival_id: string;
	first_name: string;
	last_name: string;
	phone?: string | null;
	email?: string | null;
	notes?: string | null;
	station_preferences: string[];
	shift_preferences: string[];
	created_at: string;
	updated_at: string;
}

/** Die Felder, die die Helferliste beim Anlegen und Bearbeiten schreibt. */
export type HelperInput = Pick<Helper, 'first_name' | 'last_name'> &
	Partial<Pick<Helper, 'phone' | 'email' | 'notes'>>;

/** Die Helfer eines Fests. */
export const getHelpers = async (festivalId: string): Promise<Helper[]> => {
	const { data, error } = await supabase
		.from('festival_helpers')
		.select('*')
		.eq('festival_id', festivalId)
		.order('last_name', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
};

export const createHelper = async (festivalId: string, helper: HelperInput): Promise<string> => {
	const { data, error } = await supabase
		.from('festival_helpers')
		.insert({ ...helper, festival_id: festivalId })
		.select('id')
		.single();

	if (error) {
		throw new Error(error.message);
	}

	return data.id;
};

export const updateHelper = async (
	festivalId: string,
	helperId: string,
	updates: Partial<HelperInput>
): Promise<void> => {
	const { error } = await supabase
		.from('festival_helpers')
		.update(updates)
		.eq('id', helperId)
		.eq('festival_id', festivalId);

	if (error) {
		throw new Error(error.message);
	}
};

/**
 * Entfernt den Helfer vollständig aus dem Fest. Seine Zuteilungen gehen per
 * `ON DELETE CASCADE` mit, der Verantwortliche-Verweis einer Station wird
 * vergessen (`ON DELETE SET NULL`) — siehe Migration 20260804000001.
 */
export const deleteHelper = async (festivalId: string, helperId: string): Promise<void> => {
	const { error } = await supabase
		.from('festival_helpers')
		.delete()
		.eq('id', helperId)
		.eq('festival_id', festivalId);

	if (error) {
		throw new Error(error.message);
	}
};

/**
 * Beide Wunsch-Arrays in einem Zug. Weil der Helfer ohnehin pro Fest lebt,
 * braucht das kein Upsert auf eine zweite Tabelle mehr, sondern genau ein
 * Update auf seine Zeile.
 */
export const updateHelperPreferences = async (
	festivalId: string,
	helperId: string,
	stationPreferences: string[],
	shiftPreferences: string[]
): Promise<void> => {
	const { error } = await supabase
		.from('festival_helpers')
		.update({
			station_preferences: stationPreferences,
			shift_preferences: shiftPreferences
		})
		.eq('id', helperId)
		.eq('festival_id', festivalId);

	if (error) {
		throw new Error(error.message);
	}
};

/**
 * Die Wünsche von den Helfer-Zeilen in die zwei Maps, die Helferliste,
 * Wunsch-Dialog und Auto-Zuteilung schon lesen.
 */
export const derivePreferenceMaps = (
	helpers: Helper[]
): { stationPreferences: Record<string, string[]>; shiftPreferences: Record<string, string[]> } => {
	const stationPreferences: Record<string, string[]> = {};
	const shiftPreferences: Record<string, string[]> = {};

	for (const helper of helpers) {
		stationPreferences[helper.id] = helper.station_preferences || [];
		shiftPreferences[helper.id] = helper.shift_preferences || [];
	}

	return { stationPreferences, shiftPreferences };
};

/**
 * Text der Sicherheitsabfrage am `×` der Helfer-Marke. Die Geste löscht jetzt
 * statt nur zu deaktivieren (ADR 0005), also muss die Frage die Folge nennen.
 */
export const removeHelperMessage = (helper: Pick<Helper, 'first_name' | 'last_name'>): string =>
	`${helper.last_name} ${helper.first_name} wird samt allen Zuteilungen aus diesem Fest entfernt. Fortfahren?`;
