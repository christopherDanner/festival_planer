/** Die Regeln von Station- und Schicht-Dialog (#106): was ein leeres Blatt
zeigt, was ein bestehender Satz hineinträgt, wann gespeichert werden darf und
was dabei abgegeben wird. Reine Logik ohne React — die Optik liegt in
`StationZettel` / `ShiftZettel`, das Öffnen in den beiden Dialog-Rahmen.

Zahlenfelder stehen im Formular als **Text**. Ein `number` müsste beim Leeren
des Felds sofort auf einen Ersatzwert springen; dann kann man die vorhandene
Zahl nicht mehr wegtippen, um eine neue einzugeben. */

import type { Station, StationShift } from '@/lib/shiftService';

export interface StationForm {
	name: string;
	/** Der **Ort** der Station („Zelt Nord"). Die Spalte heißt aus der Frühzeit
	 * `description`; beschriftet ist das Feld seit #106 als Ort, weil genau das
	 * auch im grünen Stationskopf steht. */
	description: string;
	required_people: string;
	/** Leer heißt „kein Verantwortlicher" — in der Datenbank `null`. */
	responsible_helper_id: string;
}

export interface ShiftForm {
	name: string;
	start_date: string;
	start_time: string;
	/** Nur für die Schicht über Mitternacht; sonst leer. */
	end_date: string;
	end_time: string;
	required_people: string;
}

export interface StationPayload {
	name: string;
	description: string;
	required_people: number;
	responsible_helper_id: string | null;
}

export interface ShiftPayload {
	name: string;
	start_date: string;
	start_time: string;
	end_date: string | null;
	end_time: string;
	required_people: number;
}

/** Mindestens eine Person; Unsinn und Leere fallen auf eins zurück. */
function sollPersonen(value: string): number {
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) && n > 0 ? n : 1;
}

export function emptyStationForm(): StationForm {
	return { name: '', description: '', required_people: '1', responsible_helper_id: '' };
}

export function stationFormFrom(station: Station): StationForm {
	return {
		name: station.name,
		description: station.description || '',
		required_people: String(station.required_people ?? 1),
		responsible_helper_id: station.responsible_helper_id || ''
	};
}

/** Eine Station braucht einen Namen — Ort, Soll und Verantwortlicher sind
optional, weil eine frisch angelegte Station beides noch nicht kennt. */
export function canSaveStation(form: StationForm): boolean {
	return form.name.trim() !== '';
}

export function stationPayload(form: StationForm): StationPayload {
	return {
		name: form.name.trim(),
		description: form.description,
		required_people: sollPersonen(form.required_people),
		responsible_helper_id: form.responsible_helper_id || null
	};
}

/** Eine neue Schicht erbt das Soll ihrer Station: die Zahl stimmt meistens
schon, und wo nicht, ist sie ein besserer Ausgangspunkt als eins. */
export function emptyShiftForm(station: Station | null): ShiftForm {
	return {
		name: '',
		start_date: '',
		start_time: '',
		end_date: '',
		end_time: '',
		required_people: String(station?.required_people || 1)
	};
}

export function shiftFormFrom(shift: StationShift): ShiftForm {
	return {
		name: shift.name || '',
		start_date: shift.start_date,
		start_time: shift.start_time,
		end_date: shift.end_date || '',
		end_time: shift.end_time,
		required_people: String(shift.required_people ?? 1)
	};
}

/**
 * Ob die Schicht über Mitternacht läuft — dieselbe Regel wie im Fokus-Kasten
 * (`shiftBoard`): ein Enddatum, das vom Startdatum abweicht. Derselbe Tag noch
 * einmal eingetragen ist keine Nachtschicht, sondern eine Wiederholung.
 */
export function crossesMidnight(form: ShiftForm): boolean {
	return form.end_date !== '' && form.end_date !== form.start_date;
}

/**
 * Was am Enddatum nicht stimmt, im Klartext — `null`, wenn es passt. Ein
 * Enddatum vor dem Start wäre keine Schicht, sondern eine kaputte Zeile im
 * Fokus-Kasten. Der Satz steht hier neben der Regel, damit ein gesperrter
 * Speichern-Knopf nicht wortlos bleibt. (ISO-Daten vergleichen sich als Text.)
 */
export function endDateProblem(form: ShiftForm): string | null {
	if (form.end_date === '' || form.end_date >= form.start_date) return null;
	return 'Das Enddatum liegt vor dem Startdatum.';
}

export function canSaveShift(form: ShiftForm): boolean {
	const gefuellt =
		form.name.trim() !== '' &&
		form.start_date !== '' &&
		form.start_time !== '' &&
		form.end_time !== '';
	return gefuellt && endDateProblem(form) === null;
}

export function shiftPayload(form: ShiftForm): ShiftPayload {
	return {
		name: form.name.trim(),
		start_date: form.start_date,
		start_time: form.start_time,
		end_date: form.end_date || null,
		end_time: form.end_time,
		required_people: sollPersonen(form.required_people)
	};
}
