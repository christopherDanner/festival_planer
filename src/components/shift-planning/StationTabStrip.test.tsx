import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import StationTabStrip from './StationTabStrip';
import { buildStationTabs } from '@/lib/shiftBoard';
import type { Station, StationShift, ShiftAssignmentWithHelper } from '@/lib/shiftService';

/**
 * Der Ampel-Reiter-Streifen (#102, Entscheid 3 aus #68). Er ist nach dem
 * Wechsel auf die Fokus-Werkbank die **einzige** Gesamtübersicht — was er nicht
 * zeigt, sieht niemand mehr. Darum bricht er um, statt zu scrollen.
 */

const noop = () => {};

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 0,
		created_at: '2026-01-01T00:00:00Z',
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

function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: 'h1',
		position: 1,
		created_at: '',
		updated_at: '',
		...over
	};
}

const render = (
	stations: Station[],
	shifts: StationShift[] = [],
	assignments: ShiftAssignmentWithHelper[] = [],
	activeIndex = 0
) => {
	const tabs = buildStationTabs(stations, shifts, assignments, []);
	return renderToStaticMarkup(
		<StationTabStrip
			tabs={tabs}
			activeStationId={tabs[activeIndex]?.station.id ?? null}
			onSelect={noop}
		/>
	);
};

describe('StationTabStrip — was ein Reiter trägt', () => {
	it('zeigt Stationsname und Zähler', () => {
		const html = render(
			[station({ id: 's1', name: 'Ausschank' })],
			[shift({ id: 'sh1', station_id: 's1', required_people: 14 })],
			Array.from({ length: 11 }, (_, i) => assignment({ id: `a${i}`, helper_id: `h${i}` }))
		);

		expect(html).toContain('Ausschank');
		expect(html).toMatch(/tabular-nums[^>]*>11\/14</);
	});

	it('kürzt lange Stationsnamen, statt den Reiter zu sprengen', () => {
		expect(render([station({ name: 'Weinlaube hinter dem Zelt' })])).toContain('truncate');
	});

	it('färbt das Mini-Maßband leer rot, teil gelb, voll grün', () => {
		// Der zweite Reiter trägt den Fall und ist nicht der aktive — sonst käme
		// das Gelb vom aktiven Reiter, nicht von der Ampel.
		const ampelDes2 = (shifts: StationShift[], assignments: ShiftAssignmentWithHelper[]) =>
			render(
				[
					station({ id: 's1', created_at: '2026-01-01T00:00:00Z' }),
					station({ id: 's2', name: 'Grill', created_at: '2026-01-02T00:00:00Z', required_people: 3 })
				],
				shifts,
				assignments
			)
				.split('<button')[2];

		expect(ampelDes2([], [])).toContain('bg-rot');
		expect(
			ampelDes2([shift({ id: 'sh2', station_id: 's2', required_people: 2 })], [
				assignment({ station_shift_id: 'sh2' })
			])
		).toContain('bg-gelb');
		expect(
			ampelDes2([shift({ id: 'sh2', station_id: 's2', required_people: 1 })], [
				assignment({ station_shift_id: 'sh2' })
			])
		).toContain('bg-gruen');
	});
});

describe('StationTabStrip — der Streifen', () => {
	const drei = [
		station({ id: 's1', name: 'Ausschank', created_at: '2026-01-01T00:00:00Z' }),
		station({ id: 's2', name: 'Grill', created_at: '2026-01-02T00:00:00Z' }),
		station({ id: 's3', name: 'Einlass', created_at: '2026-01-03T00:00:00Z' })
	];

	it('bricht um und scrollt nicht — sonst liegt eine Station hinter dem Rand', () => {
		const html = render(drei);

		expect(html).toContain('minmax(210px,1fr)');
		expect(html).not.toContain('overflow-x-auto');
	});

	it('zeigt bei 14 Stationen alle 14 Reiter', () => {
		const viele = Array.from({ length: 14 }, (_, i) =>
			station({
				id: `s${i}`,
				name: `Station ${i}`,
				created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`
			})
		);
		const html = render(viele);

		expect(html.split('<button').length - 1).toBe(14);
		expect(html).toContain('Station 13');
	});

	it('hebt den aktiven Reiter gelb mit Versatz-Schatten hervor', () => {
		const reiter = render(drei, [], [], 1).split('<button').slice(1);

		expect(reiter[0]).not.toContain('bg-gelb');
		expect(reiter[1]).toContain('bg-gelb');
		expect(reiter[1]).toContain('shadow-versatz');
		expect(reiter[1]).toContain('aria-checked="true"');
	});

	it('reiht nach Anlage-Reihenfolge, nicht alphabetisch', () => {
		const html = render(drei);

		expect(html.indexOf('Grill')).toBeLessThan(html.indexOf('Einlass'));
	});

	it('rendert nichts, wenn das Fest keine Stationen hat', () => {
		expect(render([])).toBe('');
	});
});
