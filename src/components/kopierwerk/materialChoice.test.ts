import { describe, expect, it } from 'vitest';

import {
	QUANTITY_SOURCES,
	chipState,
	materialChipSections,
	sourceQuantity,
	stationLoss,
	toggleChip,
	type CopyableMaterial
} from './materialChoice';

function material(over: Partial<CopyableMaterial> = {}): CopyableMaterial {
	return {
		id: 'm1',
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Metro',
		unit: 'Liter',
		station: { id: 's1', name: 'Ausschank' },
		ordered_quantity: 100,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		...over
	};
}

describe('Mengenquelle', () => {
	it('bietet Bestellmenge und tatsächliche Menge in dieser Reihenfolge', () => {
		expect(QUANTITY_SOURCES.map((source) => source.value)).toEqual(['ordered', 'actual']);
		expect(QUANTITY_SOURCES.map((source) => source.label)).toEqual([
			'Bestellmenge',
			'Tatsächliche Menge'
		]);
	});

	it('nennt je Quelle die Menge, die ins neue Fest wandert', () => {
		const position = material({ ordered_quantity: 100, actual_quantity: 84 });

		expect(sourceQuantity(position, 'ordered')).toBe(100);
		expect(sourceQuantity(position, 'actual')).toBe(84);
	});

	// `copyFestivalData` schreibt `actual_quantity ?? 0` in die Bestellmenge des
	// neuen Fests — die angezeigte Menge muss dasselbe sagen.
	it('zählt eine nie erfasste Verbrauchsmenge als 0', () => {
		expect(sourceQuantity(material({ actual_quantity: null }), 'actual')).toBe(0);
	});
});

/**
 * Die Kante des Tickets: `copyFestivalData` setzt `station_id` auf `null`,
 * sobald die Station der Position nicht mitkopiert wird. Das Verhalten bleibt —
 * sichtbar wird es hier.
 */
describe('Positionen, die ohne Station ankommen', () => {
	const ausschank = material({
		id: 'm-bier',
		station: { id: 's-ausschank', name: 'Ausschank' }
	});
	const grill = material({ id: 'm-kohle', station: { id: 's-grill', name: 'Grill' } });
	const ohneStation = material({ id: 'm-funk', station: null });
	const alle = [ausschank, grill, ohneStation];
	const alleIds = new Set(alle.map((m) => m.id));

	it('trifft genau die Positionen abgewählter Stationen', () => {
		const loss = stationLoss(alle, new Set(['s-ausschank']), alleIds);

		expect([...loss.ids]).toEqual(['m-kohle']);
	});

	// Sie hat vorher keine Station gehabt und bekommt auch keine — daran ändert
	// die Auswahl in Schritt 2 nichts, es gibt also nichts zu warnen.
	it('lässt eine Position, die nie an einer Station hing, in Ruhe', () => {
		const loss = stationLoss(alle, new Set<string>(), alleIds);

		expect(loss.ids.has('m-funk')).toBe(false);
		expect(loss.ids.has('m-bier')).toBe(true);
	});

	// Abgewählt heißt: kommt gar nicht an. Marke und Satz führen dieselbe Menge,
	// sonst stünden drei rote Zeilen über dem Satz „1 Position kommt …".
	it('nimmt nur die Positionen auf, die auch wirklich kopiert werden', () => {
		const loss = stationLoss(alle, new Set<string>(), new Set(['m-bier']));

		expect([...loss.ids]).toEqual(['m-bier']);
		expect(loss.notice).toBe(
			'1 Position kommt ohne Station an, weil ihre Station nicht mitkopiert wird.'
		);
	});

	it('schreibt den Satz aus dem Ticket, sobald mehrere betroffen sind', () => {
		const loss = stationLoss(alle, new Set<string>(), alleIds);

		expect(loss.ids.size).toBe(2);
		expect(loss.notice).toBe(
			'2 Positionen kommen ohne Station an, weil deren Station nicht mitkopiert wird.'
		);
	});

	it('schweigt, solange alle Stationen mitkommen', () => {
		const loss = stationLoss(alle, new Set(['s-ausschank', 's-grill']), alleIds);

		expect(loss.ids.size).toBe(0);
		expect(loss.notice).toBeNull();
	});

	it('schweigt, wenn keine der betroffenen Positionen gewählt ist', () => {
		const loss = stationLoss(alle, new Set<string>(), new Set(['m-funk']));

		expect(loss.ids.size).toBe(0);
		expect(loss.notice).toBeNull();
	});
});

describe('Gruppen-Chips', () => {
	const bier = material({ id: 'm-bier', category: 'Getränke', supplier: 'Metro' });
	const wein = material({
		id: 'm-wein',
		category: 'Getränke',
		supplier: 'Winzer',
		station: { id: 's-weinlaube', name: 'Weinlaube' }
	});
	const funk = material({ id: 'm-funk', category: null, supplier: 'Metro', station: null });
	const alle = [bier, wein, funk];

	const section = (axis: string) => {
		const found = materialChipSections(alle).find((s) => s.axis === axis);
		if (!found) throw new Error(`Keine Chip-Reihe für ${axis}`);
		return found;
	};

	it('reiht Kategorie, Lieferant und Station in dieser Folge', () => {
		expect(materialChipSections(alle).map((s) => s.axis)).toEqual([
			'category',
			'supplier',
			'station'
		]);
		expect(materialChipSections(alle).map((s) => s.label)).toEqual([
			'KATEGORIE',
			'LIEFERANT',
			'STATION'
		]);
	});

	it('stellt die Positionen ohne Zuordnung ans Ende der Reihe', () => {
		expect(section('station').chips.map((chip) => chip.label)).toEqual([
			'Ausschank',
			'Weinlaube',
			'Ohne Station'
		]);
		expect(section('category').chips.map((chip) => chip.label)).toEqual([
			'Getränke',
			'Ohne Kategorie'
		]);
	});

	it('hängt an jedem Chip die Positionen, die er umschaltet', () => {
		const [metro] = section('supplier').chips;

		expect(metro.label).toBe('Metro');
		expect(metro.materialIds).toEqual(['m-bier', 'm-funk']);
	});

	// Ein einziger Chip schaltet dieselbe Menge wie „Alle/Keine" darüber.
	it('lässt eine Reihe weg, in der alle Positionen denselben Chip trügen', () => {
		const einerlei = [
			bier,
			material({
				id: 'm-most',
				category: 'Getränke',
				supplier: 'Metro',
				station: { id: 's-weinlaube', name: 'Weinlaube' }
			})
		];

		// Beide Positionen sind „Getränke" von „Metro" — nur die Stationen
		// unterscheiden sie, also bleibt genau diese Reihe stehen.
		expect(materialChipSections(einerlei).map((s) => s.axis)).toEqual(['station']);
	});

	it('kennt die drei Zustände alle, teilweise und keine', () => {
		const [getraenke] = section('category').chips;

		expect(chipState(getraenke, new Set(['m-bier', 'm-wein']))).toBe('all');
		expect(chipState(getraenke, new Set(['m-bier']))).toBe('some');
		expect(chipState(getraenke, new Set(['m-funk']))).toBe('none');
	});

	it('nimmt einen ganz gewählten Chip heraus und schaltet ihn sonst voll dazu', () => {
		const [getraenke] = section('category').chips;

		expect([...toggleChip(new Set(['m-bier', 'm-wein', 'm-funk']), getraenke)]).toEqual(['m-funk']);
		expect([...toggleChip(new Set(['m-bier']), getraenke)].sort()).toEqual(['m-bier', 'm-wein']);
	});
});
