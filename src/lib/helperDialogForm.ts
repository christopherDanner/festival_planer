/** Die Regeln des **einen** Helfer-Blatts (#107): was ein leeres Blatt zeigt,
was ein bestehender Helfer hineinträgt, wann gespeichert werden darf, was dabei
abgegeben wird — und welche Wunsch-Marken der Zettel zeichnet. Reine Logik ohne
React; die Optik liegt im `HelperZettel`, das Öffnen im `HelperDialog`.

Stammdaten und Wünsche stehen hier zusammen, weil sie seit ADR 0005 **eine
Zeile** sind: die Wünsche sind zwei `uuid[]`-Spalten auf dem Helfer, keine
zweite Tabelle mehr. Zwei Formulare dafür wären ab hier reiner Ballast. */

import { formatFestDateRange } from '@/lib/festDates';
import { shiftTimeLabel } from '@/lib/shiftBoard';
import type { Helper } from '@/lib/helperService';
import type { Station, StationShift } from '@/lib/shiftService';

/** Die beiden Wunsch-Arrays für sich — das, woran die Marken drehen. */
export interface HelperWishes {
	station_preferences: string[];
	shift_preferences: string[];
}

export interface HelperForm extends HelperWishes {
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	notes: string;
}

/** Was das Blatt abgibt. `is_active` und `user_id` gibt es nicht — beide sind
mit ADR 0005 aus dem Schema verschwunden. */
export interface HelperPayload extends HelperWishes {
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	notes: string;
}

/** Stationen und Schichten des Fests — woran die Wunsch-Marken hängen. */
export interface WishSource {
	stations: Station[];
	stationShifts: StationShift[];
}

/** Eine anklickbare Wunsch-Schicht. */
export interface WishShift {
	id: string;
	/** „Sa 25. Juli · Frühschoppen" — ohne Namen nur der Tag. */
	label: string;
	/** Die Zeit-Aufschrift des Fokus-Kastens: `11–15`, `23–02 +1`. */
	time: string;
	selected: boolean;
}

/** Eine anklickbare Wunsch-Station samt ihren Schichten. */
export interface WishStation {
	id: string;
	name: string;
	selected: boolean;
	shifts: WishShift[];
}

export function emptyHelperForm(): HelperForm {
	return {
		first_name: '',
		last_name: '',
		email: '',
		phone: '',
		notes: '',
		station_preferences: [],
		shift_preferences: []
	};
}

/**
 * Trägt einen bestehenden Helfer auf das Blatt. **Unbekannte IDs fallen dabei
 * weg**: die Wunsch-Arrays haben keine Fremdschlüssel (ADR 0005), eine
 * gelöschte Station bleibt als Karteileiche darin stehen. Gefiltert wird beim
 * Lesen — so zeigt das Blatt, was es beim Speichern auch schreibt, statt
 * unsichtbare Reste weiterzureichen.
 */
export function helperFormFrom(helper: Helper, source: WishSource): HelperForm {
	const stationIds = new Set(source.stations.map((s) => s.id));
	const shiftIds = new Set(source.stationShifts.map((s) => s.id));

	return {
		first_name: helper.first_name,
		last_name: helper.last_name,
		email: helper.email || '',
		phone: helper.phone || '',
		notes: helper.notes || '',
		station_preferences: (helper.station_preferences ?? []).filter((id) => stationIds.has(id)),
		shift_preferences: (helper.shift_preferences ?? []).filter((id) => shiftIds.has(id))
	};
}

/** Ein Helfer braucht beide Namen — die Helferliste schreibt „Hochauer Franz",
und eine halbe Marke wäre in ihr nicht wiederzufinden. */
export function canSaveHelper(form: HelperForm): boolean {
	return form.first_name.trim() !== '' && form.last_name.trim() !== '';
}

export function helperPayload(form: HelperForm): HelperPayload {
	return {
		first_name: form.first_name.trim(),
		last_name: form.last_name.trim(),
		email: form.email.trim(),
		phone: form.phone.trim(),
		notes: form.notes,
		station_preferences: form.station_preferences,
		shift_preferences: form.shift_preferences
	};
}

/**
 * Wunsch-Station an oder aus. Beim Abwählen gehen die Schichtwünsche **dieser**
 * Station mit: ein Schichtwunsch an einer Station, die man gar nicht will, wäre
 * ein Widerspruch auf demselben Blatt.
 */
export function toggleStationWish(
	wishes: HelperWishes,
	stationId: string,
	stationShifts: StationShift[]
): HelperWishes {
	if (!wishes.station_preferences.includes(stationId)) {
		return {
			station_preferences: [...wishes.station_preferences, stationId],
			shift_preferences: wishes.shift_preferences
		};
	}

	const ihre = new Set(
		stationShifts.filter((s) => s.station_id === stationId).map((s) => s.id)
	);
	return {
		station_preferences: wishes.station_preferences.filter((id) => id !== stationId),
		shift_preferences: wishes.shift_preferences.filter((id) => !ihre.has(id))
	};
}

/**
 * Wunsch-Schicht an oder aus. Beim Anwählen kommt ihre Station mit — die
 * Gegenrichtung derselben Regel. Beim Abwählen bleibt die Station stehen: wer
 * eine von drei Schichten streicht, will die Station noch.
 */
export function toggleShiftWish(
	wishes: HelperWishes,
	shiftId: string,
	stationShifts: StationShift[]
): HelperWishes {
	if (wishes.shift_preferences.includes(shiftId)) {
		return {
			station_preferences: wishes.station_preferences,
			shift_preferences: wishes.shift_preferences.filter((id) => id !== shiftId)
		};
	}

	const stationId = stationShifts.find((s) => s.id === shiftId)?.station_id;
	const braucht = stationId && !wishes.station_preferences.includes(stationId);
	return {
		station_preferences: braucht
			? [...wishes.station_preferences, stationId]
			: wishes.station_preferences,
		shift_preferences: [...wishes.shift_preferences, shiftId]
	};
}

/** „Sa 25. Juli · Frühschoppen" — Tag zuerst, weil zwei Schichten derselben
Station oft denselben Namen an verschiedenen Tagen tragen. */
function wishShiftLabel(shift: StationShift): string {
	const tag = formatFestDateRange(shift.start_date);
	return shift.name ? `${tag} · ${shift.name}` : tag;
}

/**
 * Die Wunsch-Marken des Blatts: jede Station des Fests, darunter ihre
 * Schichten. Eine Station ohne Schichten steht trotzdem da — sie ist als
 * Wunsch-Station wählbar, auch wenn es an ihr nichts feiner zu wünschen gibt.
 */
export function buildWishBoard(wishes: HelperWishes, source: WishSource): WishStation[] {
	return source.stations.map((station) => ({
		id: station.id,
		name: station.name,
		selected: wishes.station_preferences.includes(station.id),
		shifts: source.stationShifts
			.filter((shift) => shift.station_id === station.id)
			.map((shift) => ({
				id: shift.id,
				label: wishShiftLabel(shift),
				time: shiftTimeLabel(shift),
				selected: wishes.shift_preferences.includes(shift.id)
			}))
	}));
}
