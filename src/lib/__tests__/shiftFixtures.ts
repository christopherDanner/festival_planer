/** Die vier Listen eines Schichtplans als Test-Fixture (#109).

Station, Schicht, Zuteilung und Stationsmitglied tragen zusammen 30 Felder, von
denen ein Test höchstens drei interessieren. Papier, Text und Dialog leiten alle
aus denselben vier Listen ab — der Rest steht darum hier einmal. */

import type {
	ShiftAssignmentWithHelper,
	Station,
	StationHelperWithDetails,
	StationShift
} from '@/lib/shiftService';
import type { Helper } from '@/lib/helperService';

const STAMPS = { created_at: '2026-01-01T10:00:00Z', updated_at: '2026-01-01T10:00:00Z' };

export function station(over: Partial<Station> = {}): Station {
	return { id: 's1', festival_id: 'f1', name: 'Ausschank', required_people: 0, ...STAMPS, ...over };
}

export function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: '',
		start_date: '2026-07-25',
		start_time: '11:00',
		end_time: '15:00',
		required_people: 0,
		...STAMPS,
		...over
	};
}

export function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: 'h1',
		position: 1,
		helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' },
		...STAMPS,
		...over
	};
}

export function stationHelper(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'h9',
		created_at: STAMPS.created_at,
		helper: { id: 'h9', first_name: 'Roman', last_name: 'Aigner' },
		...over
	};
}

export function helper(over: Partial<Helper> = {}): Helper {
	return {
		id: 'h1',
		festival_id: 'f1',
		first_name: 'Franz',
		last_name: 'Hochauer',
		station_preferences: [],
		shift_preferences: [],
		...STAMPS,
		...over
	};
}
