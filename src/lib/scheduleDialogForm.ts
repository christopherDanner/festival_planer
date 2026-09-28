/** Die Regeln der drei Ablaufplan-Dialoge (#124) als reine Logik: Eintrag, Tag
und Phase — was ein leeres Blatt zeigt, was ein bestehender Satz hineinträgt,
wann gespeichert werden darf und was dabei abgegeben wird. Die Optik liegt im
`ScheduleEntryZettel` und den beiden kleinen Dialogen, das Öffnen in
`ScheduleView`.

Die Werte stehen im Formular als **Text**, so wie sie im Feld stehen; erst die
`…Payload`- und `…Update`-Fassungen machen daraus `null`, wo die Datenbank
Leere erwartet. */

import type { ScheduleDay, ScheduleEntry, SchedulePhase } from '@/lib/scheduleService';

/** Die zwei Arten eines Ablauf-Eintrags (CONTEXT.md, *Ablauf-Eintrag*). */
export type EntryType = 'task' | 'program';

/** Sentinel des Phasen-Felds: „ohne Phase" ist der Normalfall (ADR 0007) und
steht **oben** in der Liste — Radix kennt keinen leeren Wert. */
export const OHNE_PHASE = '__ohne_phase__';

/** Sentinel des Verantwortlichen-Felds; dieselbe Schreibweise wie am
Station-Zettel (#106). */
export const KEIN_VERANTWORTLICHER = '__keiner__';

export interface ScheduleEntryForm {
	title: string;
	type: EntryType;
	/** Der Tag ist die einzige Pflichtebene (ADR 0007). */
	schedule_day_id: string;
	/** `''` heißt „ohne Phase". */
	schedule_phase_id: string;
	start_time: string;
	/** Optional — ein Eintrag darf nur einen Anfang haben. */
	end_time: string;
	/** `''` heißt „kein Verantwortlicher"; gilt nur für Aufgaben. */
	responsible_helper_id: string;
	description: string;
}

/** Der fertige Eintrag, wie ihn der Dialog abliefert — das, was der Service
anlegt oder aktualisiert. */
export interface ScheduleEntryPayload {
	schedule_day_id: string;
	schedule_phase_id: string | null;
	festival_id: string;
	title: string;
	type: EntryType;
	start_time: string | null;
	end_time: string | null;
	responsible_helper_id: string | null;
	status: 'open' | 'done' | null;
	description: string | null;
}

export interface EntryPayloadContext {
	festivalId: string;
	/** Der gespeicherte Status des Eintrags; `null` bei einem neuen. Er steht
	nicht im Formular — abgehakt wird in der Werkliste, nicht im Dialog. */
	status: 'open' | 'done' | null;
}

/** Was der Griff schon weiß, bevor der Dialog aufgeht: „+ AUFGABE" der
Werkzeugleiste bringt die Art mit, das ⋮ eines Tages zusätzlich den Tag. Die
Phase bringt keiner mit — sie ist der optionale Feinschnitt (ADR 0007). */
export interface EntryPrefill {
	type: EntryType;
	schedule_day_id: string;
}

/** Die Datenbank führt Zeiten als „08:00:00"; das `<input type="time">` kennt
die Sekunde nicht. Dieselbe Kürzung wie in der Werkliste. */
const toFieldTime = (time: string | null): string => (time ? time.slice(0, 5) : '');

export function emptyEntryForm(prefill: EntryPrefill): ScheduleEntryForm {
	return {
		title: '',
		type: prefill.type,
		schedule_day_id: prefill.schedule_day_id,
		schedule_phase_id: '',
		start_time: '',
		end_time: '',
		responsible_helper_id: '',
		description: ''
	};
}

export function entryFormFrom(entry: ScheduleEntry): ScheduleEntryForm {
	return {
		title: entry.title,
		type: entry.type,
		schedule_day_id: entry.schedule_day_id,
		schedule_phase_id: entry.schedule_phase_id || '',
		start_time: toFieldTime(entry.start_time),
		end_time: toFieldTime(entry.end_time),
		responsible_helper_id: entry.responsible_helper_id || '',
		description: entry.description || ''
	};
}

/**
 * Was ein Tageswechsel am Formular ändert. Die Phase gehört ihrem Tag
 * (ADR 0007): zieht der Eintrag auf einen anderen, lässt er sie zurück, statt
 * unter einem fremden Zwischentitel zu hängen.
 *
 * Gibt einen Flicken zurück wie jedes andere Feld des Zettels — nur betrifft
 * dieser zwei auf einmal.
 */
export function changeDay(
	form: ScheduleEntryForm,
	scheduleDayId: string
): Partial<ScheduleEntryForm> {
	return {
		schedule_day_id: scheduleDayId,
		schedule_phase_id: scheduleDayId === form.schedule_day_id ? form.schedule_phase_id : ''
	};
}

/** Zur Wahl stehen nur die Phasen des gewählten Tages — eine fremde Phase wäre
ein Eintrag, der in der Gruppierung unter seinen Tag zurückfällt. */
export function phasesOfDay(
	days: Array<Pick<ScheduleDay, 'id'> & { phases?: SchedulePhase[] }>,
	scheduleDayId: string
): SchedulePhase[] {
	return days.find((day) => day.id === scheduleDayId)?.phases ?? [];
}

/**
 * Was an den Zeiten nicht stimmt, im Klartext — `null`, wenn es passt. Der Satz
 * steht neben der Regel, damit ein gesperrter Speichern-Knopf nicht wortlos
 * bleibt (wie `endDateProblem` im Schichtplan). Zeiten vergleichen sich als
 * Text, solange beide „HH:MM" sind.
 */
export function timeProblem(form: ScheduleEntryForm): string | null {
	if (!form.start_time || !form.end_time || form.start_time < form.end_time) return null;
	return 'Die Startzeit muss vor der Endzeit liegen.';
}

/** Titel und Tag genügen: eine Aufgabe entsteht, ohne vorher eine Phase zu
erfinden (ADR 0007). */
export function canSaveEntry(form: ScheduleEntryForm): boolean {
	return form.title.trim() !== '' && form.schedule_day_id !== '' && timeProblem(form) === null;
}

/** Der Verantwortliche hängt nur an Aufgaben — ein Programmpunkt steht auf dem
Zettel, der weder Haken noch Namen zeigt (ADR 0007). */
export function showsResponsible(form: ScheduleEntryForm): boolean {
	return form.type === 'task';
}

/**
 * Was der Dialog abgibt. Beim **Programmpunkt** fallen Status und
 * Verantwortlicher auf `null` — auch wenn der Eintrag eben noch eine abgehakte
 * Aufgabe war (ADR 0007). Die Felder stehen dann nicht mehr im Blatt, also darf
 * ihr alter Inhalt auch nicht stehen bleiben.
 */
export function entryPayload(
	form: ScheduleEntryForm,
	context: EntryPayloadContext
): ScheduleEntryPayload {
	const istAufgabe = form.type === 'task';
	return {
		schedule_day_id: form.schedule_day_id,
		schedule_phase_id: form.schedule_phase_id || null,
		festival_id: context.festivalId,
		title: form.title.trim(),
		type: form.type,
		start_time: form.start_time || null,
		end_time: form.end_time || null,
		responsible_helper_id: istAufgabe ? form.responsible_helper_id || null : null,
		status: istAufgabe ? context.status || 'open' : null,
		description: form.description.trim() || null
	};
}

// --- Der Tag-Dialog ---

export interface ScheduleDayForm {
	date: string;
	/** Freies Label („Aufbau", „Nachbereitung"); leer ist erlaubt. */
	label: string;
}

/** Datum und Label, wie das Ändern sie schreibt. */
export interface ScheduleDayUpdate {
	date: string;
	label: string | null;
}

export interface ScheduleDayPayload extends ScheduleDayUpdate {
	festival_id: string;
	/** Nur die Festtage entstehen automatisch (`initializeScheduleDays`); was
	durch diesen Dialog geht, hat der Nutzer von Hand angelegt. */
	is_auto_generated: boolean;
	sort_order: number;
}

export function emptyDayForm(): ScheduleDayForm {
	return { date: '', label: '' };
}

export function dayFormFrom(day: Pick<ScheduleDay, 'date' | 'label'>): ScheduleDayForm {
	return { date: day.date, label: day.label || '' };
}

/**
 * Ein Ablauf-Tag braucht ein Datum, sonst nichts. **Beliebige Daten sind
 * erlaubt**, auch vor und nach dem Fest: die Festtage entstehen automatisch,
 * alles andere legt der Nutzer selbst an (CONTEXT.md, *Ablauf-Tag*) — es gibt
 * hier also keine Grenze zu prüfen.
 */
export function canSaveDay(form: ScheduleDayForm): boolean {
	return form.date !== '';
}

export function dayUpdate(form: ScheduleDayForm): ScheduleDayUpdate {
	return { date: form.date, label: form.label.trim() || null };
}

export function dayPayload(
	form: ScheduleDayForm,
	context: { festivalId: string; sortOrder: number }
): ScheduleDayPayload {
	return {
		...dayUpdate(form),
		festival_id: context.festivalId,
		is_auto_generated: false,
		sort_order: context.sortOrder
	};
}

// --- Der Phasen-Dialog ---

export interface SchedulePhaseForm {
	name: string;
}

/** Der Name, wie das Umbenennen ihn schreibt. Die Reihenfolge fasst der Dialog
nicht an — sie liegt im ⋮-Menü (`schedulePhaseOrder`). */
export interface SchedulePhaseUpdate {
	name: string;
}

export interface SchedulePhasePayload extends SchedulePhaseUpdate {
	schedule_day_id: string;
	festival_id: string;
	sort_order: number;
}

export function emptyPhaseForm(): SchedulePhaseForm {
	return { name: '' };
}

export function phaseFormFrom(phase: Pick<SchedulePhase, 'name'>): SchedulePhaseForm {
	return { name: phase.name };
}

export function canSavePhase(form: SchedulePhaseForm): boolean {
	return form.name.trim() !== '';
}

export function phaseUpdate(form: SchedulePhaseForm): SchedulePhaseUpdate {
	return { name: form.name.trim() };
}

export function phasePayload(
	form: SchedulePhaseForm,
	context: { festivalId: string; scheduleDayId: string; sortOrder: number }
): SchedulePhasePayload {
	return {
		...phaseUpdate(form),
		schedule_day_id: context.scheduleDayId,
		festival_id: context.festivalId,
		sort_order: context.sortOrder
	};
}
