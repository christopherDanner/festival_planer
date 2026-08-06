import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MaterialTable, { MaterialMobileCard } from './MaterialTable';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

const noop = () => {};

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
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

const renderTable = (materials: FestivalMaterialWithStation[], showStation?: boolean) =>
	renderToStaticMarkup(
		<MaterialTable
			materials={materials}
			showStation={showStation}
			onEdit={noop}
			onDelete={noop}
			onCopy={noop}
			onUpdateField={noop}
			onUpdateFields={noop}
		/>
	);

const renderCard = (material: FestivalMaterialWithStation, showStation: boolean) =>
	renderToStaticMarkup(
		<MaterialMobileCard
			material={material}
			showStation={showStation}
			onEdit={noop}
			onDelete={noop}
			onCopy={noop}
			onUpdateField={noop}
			onUpdateFields={noop}
		/>
	);

describe('MaterialTable — Station-Spalte', () => {
	const rows = [material({ station: { id: 's1', name: 'Ausschank' } })];

	it('zeigt die Station, solange die Arbeitsliste nicht nach Station gruppiert', () => {
		expect(renderTable(rows, true)).toContain('Ausschank');
	});

	it('lässt die Spalte im Stations-Kasten weg — dort wäre sie redundant', () => {
		const html = renderTable(rows, false);
		expect(html).not.toContain('Ausschank');
		expect(html).not.toContain('>Station<');
	});

	it('lässt die Station auch auf der Handy-Karte weg', () => {
		const card = renderCard(rows[0], false);
		expect(card).not.toContain('Ausschank');
		expect(renderCard(rows[0], true)).toContain('Ausschank');
	});
});

describe('MaterialTable — Zwischensumme im Fuß', () => {
	it('nennt den Fuß „Zwischensumme (gefiltert)" — er summiert die sichtbaren Zeilen', () => {
		const html = renderTable([material({ unit_price: 10, ordered_quantity: 2 })]);
		expect(html).toContain('Zwischensumme (gefiltert)');
		expect(html).not.toContain('Gesamtkosten');
	});
});

describe('MaterialTable — Gesamtkosten', () => {
	it('summiert brutto über die übergebenen (gefilterten) Positionen', () => {
		const html = renderTable([
			material({ id: 'a', unit_price: 2, tax_rate: 20, price_is_net: true, ordered_quantity: 10 }),
			material({ id: 'b', unit_price: 3, ordered_quantity: 5 })
		]);
		expect(html).toContain('39.00 €'); // 2 netto → 2,40 brutto × 10, plus 3 × 5
	});

	it('läuft nicht gegen die Zeilensummen auseinander (drei Positionen à 0,105 €)', () => {
		const html = renderTable([
			material({ id: 'a', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'b', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'c', unit_price: 0.105, ordered_quantity: 1 })
		]);
		expect(html.match(/0\.11 €/g)).toHaveLength(3); // je Zeile die gerundete Zeilensumme
		expect(html).toContain('0.33 €'); // Gesamtkosten = Σ der Zeilen, kein Cent Abweichung
	});
});
