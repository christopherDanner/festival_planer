import { describe, it, expect } from 'vitest';
import { buildOrderList, planOrderListExport, buildOrderListFilename } from '../orderList';
import type { FestivalMaterialWithStation } from '../materialService';

let idCounter = 0;
function nextId(): string {
	idCounter += 1;
	return `m-${idCounter}`;
}

interface MakeOpts {
	name: string;
	ordered?: number;
	unit?: string;
	supplier?: string | null;
	station?: string | null; // station name; null => no station
}

function make(opts: MakeOpts): FestivalMaterialWithStation {
	const stationName = opts.station === undefined ? null : opts.station;
	return {
		id: nextId(),
		festival_id: 'f1',
		station_id: stationName ? `s-${stationName}` : null,
		name: opts.name,
		category: null,
		supplier: opts.supplier === undefined ? null : opts.supplier,
		unit: opts.unit ?? 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: opts.ordered ?? 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		station: stationName ? { id: `s-${stationName}`, name: stationName } : null,
	};
}

describe('buildOrderList — supplier axis', () => {
	it('nimmt nur Positionen mit ordered_quantity > 0 auf und reduziert auf Bezeichnung/Menge/Einheit', () => {
		const materials = [
			make({ name: 'Bier', ordered: 10, unit: 'Kiste', supplier: 'Huber' }),
			make({ name: 'Wein', ordered: 0, supplier: 'Huber' }),
		];

		const groups = buildOrderList(materials, 'supplier');

		expect(groups).toHaveLength(1);
		expect(groups[0].rows).toEqual([{ name: 'Bier', quantity: 10, unit: 'Kiste' }]);
	});

	it('gruppiert nach Lieferant und sortiert die Positionen alphabetisch nach Bezeichnung', () => {
		const materials = [
			make({ name: 'Zucker', ordered: 5, supplier: 'Huber' }),
			make({ name: 'Apfel', ordered: 3, supplier: 'Huber' }),
			make({ name: 'Limo', ordered: 2, supplier: 'Maier' }),
		];

		const groups = buildOrderList(materials, 'supplier');

		const huber = groups.find((g) => g.name === 'Huber');
		const maier = groups.find((g) => g.name === 'Maier');
		expect(huber?.rows.map((r) => r.name)).toEqual(['Apfel', 'Zucker']);
		expect(maier?.rows.map((r) => r.name)).toEqual(['Limo']);
	});

	it('bündelt Positionen ohne Lieferant in der Gruppe "Kein Lieferant" und sortiert sie ans Ende', () => {
		const materials = [
			make({ name: 'Salz', ordered: 1, supplier: null }),
			make({ name: 'Bier', ordered: 1, supplier: '   ' }),
			make({ name: 'Limo', ordered: 1, supplier: 'Maier' }),
			make({ name: 'Apfel', ordered: 1, supplier: 'Huber' }),
		];

		const groups = buildOrderList(materials, 'supplier');

		expect(groups.map((g) => g.name)).toEqual(['Huber', 'Maier', 'Kein Lieferant']);
		const none = groups[groups.length - 1];
		expect(none.key).toBe('');
		expect(none.rows.map((r) => r.name)).toEqual(['Bier', 'Salz']);
	});
});

describe('buildOrderList — station axis', () => {
	it('gruppiert nach Station und bündelt Positionen ohne Station in "Keine Station"', () => {
		const materials = [
			make({ name: 'Glaeser', ordered: 20, station: 'Bar' }),
			make({ name: 'Teller', ordered: 5, station: 'Küche' }),
			make({ name: 'Klebeband', ordered: 2, station: null }),
			make({ name: 'Bier', ordered: 0, station: 'Bar' }), // gefiltert
		];

		const groups = buildOrderList(materials, 'station');

		expect(groups.map((g) => g.name)).toEqual(['Bar', 'Küche', 'Keine Station']);
		const bar = groups.find((g) => g.name === 'Bar');
		expect(bar?.rows).toEqual([{ name: 'Glaeser', quantity: 20, unit: 'Stück' }]);
		const none = groups[groups.length - 1];
		expect(none.key).toBe('');
		expect(none.rows.map((r) => r.name)).toEqual(['Klebeband']);
	});
});

describe('planOrderListExport', () => {
	const materials = [
		make({ name: 'Apfel', ordered: 1, supplier: 'Huber' }),
		make({ name: 'Limo', ordered: 1, supplier: 'Maier' }),
		make({ name: 'Salz', ordered: 1, supplier: null }),
	];

	it('erzeugt bei bestimmtem Lieferant genau eine Einzeldatei und kein Sammeldokument', () => {
		const plan = planOrderListExport(materials, 'supplier', 'Huber');

		expect(plan.collection).toBeNull();
		expect(plan.individual.map((g) => g.name)).toEqual(['Huber']);
		expect(plan.individual[0].rows.map((r) => r.name)).toEqual(['Apfel']);
	});

	it('wählt bei Auswahl "Kein Lieferant" die none-Gruppe als einzelne Datei', () => {
		const plan = planOrderListExport(materials, 'supplier', '');

		expect(plan.collection).toBeNull();
		expect(plan.individual.map((g) => g.name)).toEqual(['Kein Lieferant']);
		expect(plan.individual[0].rows.map((r) => r.name)).toEqual(['Salz']);
	});

	it('erzeugt ohne bestimmte Auswahl je Lieferant eine Einzeldatei plus ein Sammeldokument', () => {
		const plan = planOrderListExport(materials, 'supplier', null);

		expect(plan.individual.map((g) => g.name)).toEqual(['Huber', 'Maier', 'Kein Lieferant']);
		expect(plan.collection?.map((g) => g.name)).toEqual(['Huber', 'Maier', 'Kein Lieferant']);
	});

	it('funktioniert identisch auf der Stations-Achse', () => {
		const stationMaterials = [
			make({ name: 'Glaeser', ordered: 1, station: 'Bar' }),
			make({ name: 'Klebeband', ordered: 1, station: null }),
		];

		const all = planOrderListExport(stationMaterials, 'station', null);
		expect(all.individual.map((g) => g.name)).toEqual(['Bar', 'Keine Station']);
		expect(all.collection?.map((g) => g.name)).toEqual(['Bar', 'Keine Station']);

		const single = planOrderListExport(stationMaterials, 'station', '');
		expect(single.collection).toBeNull();
		expect(single.individual.map((g) => g.name)).toEqual(['Keine Station']);
	});
});

describe('buildOrderListFilename', () => {
	it('benennt eine Einzeldatei nach Fest, "Bestellliste" und Gruppenname', () => {
		const [group] = buildOrderList([make({ name: 'Apfel', ordered: 1, supplier: 'Getränke Huber' })], 'supplier');
		expect(buildOrderListFilename('Stadlfest 2026', 'pdf', 'supplier', group)).toBe(
			'Stadlfest 2026_Bestellliste_Getränke Huber.pdf'
		);
	});

	it('benennt das Sammeldokument je Achse "Alle Lieferanten" bzw. "Alle Stationen"', () => {
		expect(buildOrderListFilename('Fest', 'xlsx', 'supplier', null)).toBe('Fest_Bestellliste_Alle Lieferanten.xlsx');
		expect(buildOrderListFilename('Fest', 'pdf', 'station', null)).toBe('Fest_Bestellliste_Alle Stationen.pdf');
	});
});
