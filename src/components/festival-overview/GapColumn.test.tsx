import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import GapColumn from './GapColumn';

function station(over: Partial<Station> = {}): Station {
	return { id: 's1', festival_id: 'f1', name: 'Bar', required_people: 0, created_at: '', updated_at: '', ...over };
}
function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: 'Schicht',
		start_date: '2026-07-25',
		start_time: '15:00:00',
		end_time: '19:00:00',
		required_people: 1,
		created_at: '',
		updated_at: '',
		...over
	};
}
function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: null,
		name: 'Becher',
		category: null,
		supplier: null,
		unit: 'Stk',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}
function dayWithOpenTask(): ScheduleDayWithPhases {
	return {
		id: 'd1',
		festival_id: 'f1',
		date: '2026-07-25',
		label: null,
		is_auto_generated: false,
		sort_order: 0,
		created_at: '',
		updated_at: '',
		phases: [
			{
				id: 'p1',
				schedule_day_id: 'd1',
				festival_id: 'f1',
				name: 'Phase',
				sort_order: 0,
				created_at: '',
				updated_at: '',
				entries: [
					{
						id: 't1',
						schedule_phase_id: 'p1',
						festival_id: 'f1',
						title: 'AKM melden',
						type: 'task',
						start_time: '09:00:00',
						end_time: null,
						responsible_member_id: null,
						status: 'open',
						description: null,
						sort_order: 0,
						created_at: '',
						updated_at: ''
					}
				]
			}
		]
	};
}

const NONE = {
	stations: [] as Station[],
	shifts: [] as StationShift[],
	assignments: [] as ShiftAssignmentWithMember[],
	stationMembers: [] as StationMemberWithDetails[],
	scheduleDays: [] as ScheduleDayWithPhases[],
	materials: [] as FestivalMaterialWithStation[]
};

const render = (props: Partial<typeof NONE> = {}) =>
	renderToStaticMarkup(<GapColumn {...NONE} {...props} onTabChange={() => {}} />);

describe('GapColumn', () => {
	it('zeigt bei fehlenden Lücken einen Erledigt-Stempel', () => {
		const html = render();
		expect(html).toContain('Alles erledigt');
	});

	it('rendert je unterbesetzter Station einen Kasten mit Name, roter Zahl und Absprung', () => {
		const html = render({
			stations: [station({ id: 's1', name: 'Kassa' })],
			shifts: [shift({ id: 'sh1', station_id: 's1', required_people: 3 })]
		});
		expect(html).toContain('Kassa');
		expect(html).toContain('3 Personen');
		expect(html).toContain('Sa 15–19 +3');
		expect(html).toContain('Besetzen');
	});

	it('rendert den Aufgaben-Kasten mit nächster Frist', () => {
		const html = render({ scheduleDays: [dayWithOpenTask()] });
		expect(html).toContain('Aufgaben offen');
		expect(html).toContain('Nächste Frist: Sa 25.7., 09:00');
		expect(html).toContain('Ablaufplan');
	});

	it('rendert den Material-Kasten nur bei Positionen ohne Preis', () => {
		const html = render({ materials: [material({ unit_price: null })] });
		expect(html).toContain('Material ohne Preis');
		expect(html).toContain('Material');
	});

	it('begrenzt auf Top-Stationen und bietet „+ n weitere"', () => {
		const stations = Array.from({ length: 6 }, (_, i) =>
			station({ id: `s${i}`, name: `Station ${i}`, required_people: i + 1 })
		);
		const html = render({ stations });
		// 4 gezeigt, 2 versteckt
		expect(html).toContain('+ 2 weitere');
	});
});
