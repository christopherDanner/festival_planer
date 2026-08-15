import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import MaterialStep, { type MaterialStepProps } from './MaterialStep';
import type { CopyableMaterial } from './materialChoice';

function material(over: Partial<CopyableMaterial> = {}): CopyableMaterial {
	return {
		id: 'm-bier',
		name: 'Bier',
		category: 'Getränke',
		supplier: 'Metro',
		unit: 'Liter',
		station_id: 's-ausschank',
		station: { id: 's-ausschank', name: 'Ausschank' },
		ordered_quantity: 100,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		...over
	};
}

const bier = material();
const kohle = material({
	id: 'm-kohle',
	name: 'Grillkohle',
	category: 'Brennstoff',
	supplier: 'Lagerhaus',
	unit: 'Sack',
	station_id: 's-grill',
	station: { id: 's-grill', name: 'Grill' }
});
const funk = material({
	id: 'm-funk',
	name: 'Funkgerät',
	category: null,
	supplier: null,
	unit: 'Stück',
	station_id: null,
	station: null
});

const render = (over: Partial<MaterialStepProps> = {}) => {
	const materials = over.materials ?? [bier, kohle, funk];
	return renderToStaticMarkup(
		<MaterialStep
			selectedStationIds={new Set(['s-ausschank', 's-grill'])}
			selectedMaterialIds={new Set(materials.map((m) => m.id))}
			quantitySource="ordered"
			saving={false}
			onQuantitySourceChange={() => {}}
			onSelectionChange={() => {}}
			onBack={() => {}}
			onSubmit={() => {}}
			{...over}
			materials={materials}
		/>
	);
};

/** Das Markup einer Positionszeile — Radix schreibt den Zustand ihrer Checkbox hinein. */
const rowOf = (html: string, id: string) => {
	const row = html.split(`data-position="${id}"`)[1];
	if (row === undefined) throw new Error(`Keine Zeile für ${id}`);
	return row.split('data-position="')[0];
};

describe('MaterialStep — Mengenquelle', () => {
	it('fragt sie als Segment-Schalter, nicht als Radio-Liste', () => {
		const html = render();

		expect(html).toContain('role="radiogroup"');
		expect(html).toContain('aria-label="Mengenquelle"');
		expect(html).toContain('Bestellmenge');
		expect(html).toContain('Tatsächliche Menge');
	});

	it('hinterlegt die gewählte Quelle gelb', () => {
		const [ordered, actual] = render({ quantitySource: 'actual' })
			.split('role="radio"')
			.slice(1);

		expect(ordered).not.toContain('bg-gelb');
		expect(actual).toContain('bg-gelb');
	});

	it('zeigt je Position die Menge der gewählten Quelle', () => {
		const positions = [material({ ordered_quantity: 100, actual_quantity: 84 })];

		expect(render({ materials: positions })).toContain('100 Liter');
		expect(render({ materials: positions, quantitySource: 'actual' })).toContain('84 Liter');
	});
});

describe('MaterialStep — Gruppen-Chips', () => {
	it('bietet Kategorie, Lieferant und Station samt „Ohne Station"', () => {
		const html = render();

		expect(html).toContain('KATEGORIE');
		expect(html).toContain('LIEFERANT');
		expect(html).toContain('STATION');
		expect(html).toContain('Ohne Station');
	});

	it('schreibt an jeden Chip, wie voll er gewählt ist', () => {
		// „Ausschank" hängt allein an Bier (ganz gewählt), „Grill" allein an
		// Grillkohle (gar nicht).
		const html = render({ selectedMaterialIds: new Set(['m-bier']) });
		const stateOf = (chip: string) =>
			html.split(`data-chip="${chip}"`)[1]?.match(/data-chip-state="(\w+)"/)?.[1];

		expect(stateOf('station:s-ausschank')).toBe('all');
		expect(stateOf('station:s-grill')).toBe('none');
	});

	it('kennt den Zwischenzustand, wenn nur ein Teil einer Gruppe gewählt ist', () => {
		// Zwei Getränke, nur eines gewählt — der Chip steht dazwischen.
		const most = material({ id: 'm-most', name: 'Most', supplier: 'Winzer' });
		const html = render({
			materials: [bier, most, kohle],
			selectedMaterialIds: new Set(['m-bier'])
		});

		expect(html.split('data-chip="category:Getränke"')[1]).toContain('data-chip-state="some"');
	});
});

describe('MaterialStep — Positions-Liste', () => {
	it('trägt je Zeile Name, Kategorie und Menge mit Einheit', () => {
		const row = rowOf(render(), 'm-kohle');

		expect(row).toContain('Grillkohle');
		expect(row).toContain('Brennstoff');
		expect(row).toContain('100 Sack');
	});

	it('zählt die Auswahl mit', () => {
		expect(render({ selectedMaterialIds: new Set(['m-bier', 'm-kohle']) })).toContain(
			'2/3 gewählt'
		);
	});

	it('hakt genau die gewählten Positionen ab', () => {
		const html = render({ selectedMaterialIds: new Set(['m-bier']) });

		expect(rowOf(html, 'm-bier')).toContain('data-state="checked"');
		expect(rowOf(html, 'm-kohle')).toContain('data-state="unchecked"');
	});
});

describe('MaterialStep — Warnung „ohne Station"', () => {
	const ohneGrill = { selectedStationIds: new Set(['s-ausschank']) };

	it('zählt die betroffenen Positionen über der Liste zusammen', () => {
		expect(render(ohneGrill)).toContain(
			'1 Position kommt ohne Station an, weil ihre Station nicht mitkopiert wird.'
		);
	});

	it('markiert die Zeile rot und gestrichelt', () => {
		const html = render(ohneGrill);
		const row = rowOf(html, 'm-kohle');

		expect(row).toContain('ohne Station');
		expect(row).toContain('border-dashed');
		expect(row).toContain('text-rot');
		expect(rowOf(html, 'm-bier')).not.toContain('border-dashed');
	});

	// Der Entscheid aus #64: sichtbar warnen, nicht heimlich abwählen.
	it('lässt die betroffene Position gewählt', () => {
		expect(rowOf(render(ohneGrill), 'm-kohle')).toContain('data-state="checked"');
	});

	it('schweigt, solange alle Stationen mitkommen', () => {
		expect(render()).not.toContain('ohne Station an');
	});
});

describe('MaterialStep — Leerzustand und Fußzeile', () => {
	it('führt zurück zu den Stationen und legt das Fest an', () => {
		const html = render();

		expect(html).toContain('← Stationen &amp; Schichten');
		expect(html).toContain('FEST ANLEGEN');
	});

	it('sperrt den Knopf, während das Fest entsteht', () => {
		expect(render({ saving: true })).toContain('disabled=""');
		expect(render()).not.toContain('disabled=""');
	});

	it('bleibt ohne Material überspringbar', () => {
		const html = render({ materials: [], selectedMaterialIds: new Set() });

		expect(html).toContain('border-dashed');
		expect(html).toContain('KEIN MATERIAL');
		expect(html).toContain('FEST ANLEGEN');
		expect(html).not.toContain('disabled=""');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render()).not.toMatch(/rounded-/);
	});
});
