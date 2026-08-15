import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import ShiftPlanningToolbar from './ShiftPlanningToolbar';
import { deriveShiftsMetric } from '@/lib/staffing';
import type { Station, StationShift, ShiftAssignment } from '@/lib/shiftService';

/**
 * Die Werkzeugleiste des Schichtplans (#102): KPI-Maßband über **alle**
 * Stationen und die drei verbliebenen Griffe. Vollbild, „+ Mitglied" und
 * „Präferenzen" sind hier ersatzlos weg (Entscheide 9 aus #68).
 */

const noop = () => {};

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: '',
		start_date: '2026-07-25',
		start_time: '11:00',
		end_time: '15:00',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function assignment(over: Partial<ShiftAssignment> = {}): ShiftAssignment {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		position: 1,
		created_at: '',
		updated_at: '',
		...over
	};
}

/** Ein Fest mit `assigned` von `required` besetzten Plätzen. */
const render = (assigned: number, required: number) => {
	const shifts = [shift({ required_people: required })];
	const assignments = Array.from({ length: assigned }, (_, i) => assignment({ id: `a${i}` }));
	return renderToStaticMarkup(
		<ShiftPlanningToolbar
			metric={deriveShiftsMetric([station()], shifts, assignments, [])}
			onAddStation={noop}
			onAutoAssign={noop}
			onShare={noop}
		/>
	);
};

describe('ShiftPlanningToolbar — KPI-Maßband', () => {
	it('nennt die Besetzung über alle Stationen', () => {
		const html = render(41, 52);

		// Versalien setzt die Schrift, nicht der Text (`uppercase`).
		expect(html).toMatch(/uppercase[^>]*>Besetzt</);
		expect(html).toContain('41/52');
	});

	it('schreibt den Wert rot, solange Plätze fehlen', () => {
		expect(render(41, 52)).toMatch(/text-rot[^>]*>41\/52/);
	});

	it('schreibt ihn grün, wenn alles besetzt ist', () => {
		expect(render(52, 52)).toMatch(/text-gruen[^>]*>52\/52/);
	});

	it('stellt das Maßband auf dieselben Zahlen', () => {
		const html = render(41, 52);

		expect(html).toContain('aria-valuenow="41"');
		expect(html).toContain('aria-valuemax="52"');
	});
});

describe('ShiftPlanningToolbar — Griffe', () => {
	it('trägt Station anlegen, Auto-Zuteilung und Teilen / Export', () => {
		const html = render(1, 2);

		expect(html).toContain('+ STATION');
		expect(html).toContain('AUTO-ZUTEILUNG');
		expect(html).toContain('Teilen / Export');
	});

	it('kennt weder Vollbild noch „+ Mitglied" noch Präferenzen', () => {
		const html = render(1, 2);

		expect(html).not.toContain('Vollbild');
		expect(html).not.toContain('Mitglied');
		expect(html).not.toContain('Präferenzen');
	});
});
